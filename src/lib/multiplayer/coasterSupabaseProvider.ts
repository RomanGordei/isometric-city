// Supabase Realtime multiplayer provider for IsoCoaster

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  CoasterGameAction,
  CoasterGameActionInput,
  Player,
  generatePlayerId,
  generatePlayerColor,
  generatePlayerName,
} from './coasterTypes';
import {
  createCoasterGameRoom,
  loadCoasterGameRoom,
  updateCoasterGameRoom,
  updateCoasterPlayerCount,
  ParkSizeLimitError,
} from './coasterDatabase';
import { GameState } from '@/games/coaster/types';
import { msg } from 'gt-next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Lazy init: only create client when Supabase is configured
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Throttle state saves to avoid excessive database writes
const STATE_SAVE_INTERVAL = 3000; // Save state every 3 seconds max

export interface CoasterMultiplayerProviderOptions {
  roomCode: string;
  parkName: string;
  playerName?: string;
  initialGameState?: GameState;
  onConnectionChange?: (connected: boolean, peerCount: number) => void;
  onPlayersChange?: (players: Player[]) => void;
  onAction?: (action: CoasterGameAction) => void;
  onStateReceived?: (state: GameState) => void;
  onError?: (error: string) => void;
}

export class CoasterMultiplayerProvider {
  public readonly roomCode: string;
  public readonly peerId: string;
  public readonly isCreator: boolean;

  private channel: RealtimeChannel;
  private player: Player;
  private options: CoasterMultiplayerProviderOptions;
  private players: Map<string, Player> = new Map();
  private gameState: GameState | null = null;
  private destroyed = false;
  private hasReceivedInitialState = false;
  
  private lastStateSave = 0;
  private pendingStateSave: GameState | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: CoasterMultiplayerProviderOptions) {
    if (!supabase) {
      throw new Error('Multiplayer requires Supabase configuration');
    }
    this.options = options;
    this.roomCode = options.roomCode;
    this.peerId = generatePlayerId();
    this.gameState = options.initialGameState || null;
    this.isCreator = !!options.initialGameState;

    this.player = {
      id: this.peerId,
      name: options.playerName || generatePlayerName(),
      color: generatePlayerColor(),
      joinedAt: Date.now(),
      isHost: false,
    };

    this.players.set(this.peerId, this.player);

    // Use a different channel prefix to avoid collision with IsoCity rooms
    this.channel = supabase.channel(`coaster-room-${options.roomCode}`, {
      config: {
        presence: { key: this.peerId },
        broadcast: { self: false },
      },
    });
  }

  async connect(): Promise<void> {
    if (this.destroyed) return;

    if (this.isCreator && this.gameState) {
      this.hasReceivedInitialState = true;
      try {
        const success = await createCoasterGameRoom(
          this.roomCode,
          this.options.parkName,
          this.gameState
        );
        if (!success) {
          this.options.onError?.(msg('Failed to create room in database'));
          throw new Error(msg('Failed to create room in database'));
        }
      } catch (e) {
        if (e instanceof ParkSizeLimitError) {
          this.options.onError?.(e.message);
          throw e;
        }
        throw e;
      }
    } else {
      const roomData = await loadCoasterGameRoom(this.roomCode);
      if (!roomData) {
        this.options.onError?.(msg('Room not found'));
        throw new Error(msg('Room not found'));
      }
      this.gameState = roomData.gameState;
      this.options.onStateReceived?.(roomData.gameState);
    }

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        this.players.clear();
        this.players.set(this.peerId, this.player);

        Object.entries(state).forEach(([key, presences]) => {
          if (key !== this.peerId && presences.length > 0) {
            const presence = presences[0] as unknown as { player: Player };
            if (presence.player) {
              this.players.set(key, presence.player);
            }
          }
        });

        this.notifyPlayersChange();
        this.updateConnectionStatus();
        updateCoasterPlayerCount(this.roomCode, this.players.size);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== this.peerId && newPresences.length > 0) {
          const presence = newPresences[0] as unknown as { player: Player };
          if (presence.player) {
            this.players.set(key, presence.player);
            this.notifyPlayersChange();
            this.updateConnectionStatus();
            
            if (this.gameState) {
              setTimeout(() => {
                if (!this.destroyed && this.gameState) {
                  this.channel.send({
                    type: 'broadcast',
                    event: 'state-sync',
                    payload: { 
                      state: this.gameState, 
                      to: key, 
                      from: this.peerId 
                    },
                  });
                }
              }, Math.random() * 200);
            }
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        this.players.delete(key);
        this.notifyPlayersChange();
        this.updateConnectionStatus();
        updateCoasterPlayerCount(this.roomCode, this.players.size);
      })
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        const action = payload as CoasterGameAction;
        if (!action || !action.type || !action.playerId) {
          console.warn('[Coaster Multiplayer] Received invalid action payload:', payload);
          return;
        }
        if (action.playerId !== this.peerId && this.options.onAction) {
          this.options.onAction(action);
        }
      })
      .on('broadcast', { event: 'state-sync' }, ({ payload }) => {
        const { state, to, from } = payload as { state: GameState; to: string; from: string };
        if (to === this.peerId && !this.isCreator && !this.hasReceivedInitialState && from !== this.peerId && state && this.options.onStateReceived) {
          this.hasReceivedInitialState = true;
          this.gameState = state;
          this.options.onStateReceived(state);
        }
      });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({ player: this.player });
        
        if (this.options.onConnectionChange) {
          this.options.onConnectionChange(true, this.players.size);
        }
        this.notifyPlayersChange();
      }
    });
  }

  dispatchAction(action: CoasterGameActionInput): void {
    if (this.destroyed) return;

    const fullAction: CoasterGameAction = {
      ...action,
      timestamp: Date.now(),
      playerId: this.peerId,
    } as CoasterGameAction;

    this.channel.send({
      type: 'broadcast',
      event: 'action',
      payload: fullAction,
    });
  }

  updateGameState(state: GameState): void {
    this.gameState = state;
    
    const now = Date.now();
    const timeSinceLastSave = now - this.lastStateSave;
    
    if (timeSinceLastSave >= STATE_SAVE_INTERVAL) {
      this.saveStateToDatabase(state);
    } else {
      this.pendingStateSave = state;
      
      if (!this.saveTimeout) {
        this.saveTimeout = setTimeout(() => {
          this.saveTimeout = null;
          if (this.pendingStateSave && !this.destroyed) {
            this.saveStateToDatabase(this.pendingStateSave);
            this.pendingStateSave = null;
          }
        }, STATE_SAVE_INTERVAL - timeSinceLastSave);
      }
    }
  }

  private saveStateToDatabase(state: GameState): void {
    this.lastStateSave = Date.now();
    updateCoasterGameRoom(this.roomCode, state).catch((e) => {
      if (e instanceof ParkSizeLimitError) {
        console.warn('[Coaster Multiplayer] Park too large to save:', e.message);
        this.options.onError?.(e.message);
      } else {
        console.error('[Coaster Multiplayer] Failed to save state to database:', e);
      }
    });
  }

  private updateConnectionStatus(): void {
    if (this.options.onConnectionChange) {
      this.options.onConnectionChange(true, this.players.size);
    }
  }

  private notifyPlayersChange(): void {
    if (this.options.onPlayersChange) {
      this.options.onPlayersChange(Array.from(this.players.values()));
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    
    if (this.pendingStateSave) {
      this.saveStateToDatabase(this.pendingStateSave);
      this.pendingStateSave = null;
    }
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    this.channel.unsubscribe();
    supabase?.removeChannel(this.channel);
  }
}

export async function createCoasterMultiplayerProvider(
  options: CoasterMultiplayerProviderOptions
): Promise<CoasterMultiplayerProvider> {
  const provider = new CoasterMultiplayerProvider(options);
  await provider.connect();
  return provider;
}
