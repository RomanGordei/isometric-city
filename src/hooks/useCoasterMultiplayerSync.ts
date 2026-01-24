'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useCoasterMultiplayerOptional } from '@/context/CoasterMultiplayerContext';
import { useCoaster } from '@/context/CoasterContext';
import { CoasterGameAction, CoasterGameActionInput } from '@/lib/multiplayer/coasterTypes';
import { Tool, GameState } from '@/games/coaster/types';
import { SavedParkMeta, readSavedParksIndex, writeSavedParksIndex } from '@/games/coaster/saveUtils';

// Batch placement buffer for reducing message count during drags
const BATCH_FLUSH_INTERVAL = 100; // ms - flush every 100ms during drag
const BATCH_MAX_SIZE = 100; // Max placements before force flush

// Storage key for saved parks index
const SAVED_PARKS_INDEX_KEY = 'coaster-saved-parks-index';

// Extended type for multiplayer parks (includes roomCode)
interface MultiplayerParkMeta extends SavedParkMeta {
  roomCode?: string;
}

// Update the saved parks index with the current multiplayer park state
function updateSavedParksIndex(state: GameState, roomCode: string): void {
  if (typeof window === 'undefined') return;
  try {
    // Load existing parks
    const parks = readSavedParksIndex() as MultiplayerParkMeta[];
    
    // Create updated park meta with roomCode
    const parkMeta: MultiplayerParkMeta = {
      id: state.id || `park-${Date.now()}`,
      name: state.settings?.name || 'Co-op Park',
      guests: state.stats?.guestsInPark || 0,
      rating: state.stats?.parkRating || 0,
      cash: state.finances?.cash || 0,
      gridSize: state.gridSize || 60,
      year: state.year || 1,
      month: state.month || 1,
      day: state.day || 1,
      savedAt: Date.now(),
      roomCode: roomCode,
    };
    
    // Find and update or add
    const existingIndex = parks.findIndex((p) => p.roomCode === roomCode);
    if (existingIndex >= 0) {
      parks[existingIndex] = parkMeta;
    } else {
      parks.unshift(parkMeta);
    }
    
    // Keep only the last 20 parks and save
    writeSavedParksIndex(parks.slice(0, 20));
  } catch (e) {
    console.error('Failed to update saved parks index:', e);
  }
}

/**
 * Hook to sync coaster game actions with multiplayer.
 * 
 * When in multiplayer mode:
 * - Local actions are broadcast to peers
 * - Remote actions are applied to local state
 */
export function useCoasterMultiplayerSync() {
  const multiplayer = useCoasterMultiplayerOptional();
  const game = useCoaster();
  const lastActionRef = useRef<string | null>(null);
  const initialStateLoadedRef = useRef(false);
  
  // Batching for placements
  const placementBufferRef = useRef<Array<{ x: number; y: number; tool: Tool }>>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const multiplayerRef = useRef(multiplayer);
  
  // Keep multiplayer ref updated
  useEffect(() => {
    multiplayerRef.current = multiplayer;
  }, [multiplayer]);

  // Load initial state when joining a room
  const lastInitialStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!multiplayer || !multiplayer.initialState) return;
    
    const stateKey = JSON.stringify(multiplayer.initialState.tick || 0);
    if (lastInitialStateRef.current === stateKey && initialStateLoadedRef.current) return;
    
    console.log('[useCoasterMultiplayerSync] Received initial state from network, loading...');
    
    const stateString = JSON.stringify(multiplayer.initialState);
    const success = game.loadState(stateString);
    
    if (success) {
      initialStateLoadedRef.current = true;
      lastInitialStateRef.current = stateKey;
    }
  }, [multiplayer?.initialState, game]);

  // Apply a remote action to the local game state
  const applyRemoteAction = useCallback((action: CoasterGameAction) => {
    if (!action || !action.type) {
      console.warn('[useCoasterMultiplayerSync] Received invalid action:', action);
      return;
    }
    
    switch (action.type) {
      case 'place':
        // Save current tool, apply placement, restore tool
        const currentTool = game.state.selectedTool;
        game.setTool(action.tool);
        game.placeAtTile(action.x, action.y, true); // isRemote = true
        game.setTool(currentTool);
        break;
        
      case 'placeBatch':
        // Apply multiple placements from a single message
        const originalTool = game.state.selectedTool;
        for (const placement of action.placements) {
          game.setTool(placement.tool);
          game.placeAtTile(placement.x, placement.y, true); // isRemote = true
        }
        game.setTool(originalTool);
        break;
        
      case 'bulldoze':
        game.bulldozeTile(action.x, action.y, true); // isRemote = true
        break;
        
      case 'setSpeed':
        game.setSpeed(action.speed);
        break;
        
      case 'setParkSettings':
        game.setParkSettings(action.settings, true); // isRemote = true
        break;
        
      case 'placeTrackLine':
        game.placeTrackLine(action.tiles, true); // isRemote = true
        break;
        
      case 'fullState':
        // Ignore - full state sync is handled separately via state-sync event
        break;
    }
  }, [game]);

  // Register callback to receive remote actions
  useEffect(() => {
    if (!multiplayer) return;

    multiplayer.setOnRemoteAction((action: CoasterGameAction) => {
      applyRemoteAction(action);
    });

    return () => {
      multiplayer.setOnRemoteAction(null);
    };
  }, [multiplayer, applyRemoteAction]);
  
  // Flush batched placements
  const flushPlacements = useCallback(() => {
    const mp = multiplayerRef.current;
    if (!mp || placementBufferRef.current.length === 0) return;
    
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    
    const placements = [...placementBufferRef.current];
    placementBufferRef.current = [];
    
    if (placements.length === 1) {
      const p = placements[0];
      mp.dispatchAction({ type: 'place', x: p.x, y: p.y, tool: p.tool });
    } else {
      mp.dispatchAction({ type: 'placeBatch', placements });
    }
  }, []);
  
  // Register callback to broadcast local placements (with batching)
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') {
      game.setPlaceCallback(null);
      if (placementBufferRef.current.length > 0) {
        placementBufferRef.current = [];
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      return;
    }
    
    game.setPlaceCallback(({ x, y, tool }: { x: number; y: number; tool: Tool }) => {
      if (tool === 'bulldoze') {
        flushPlacements();
        multiplayer.dispatchAction({ type: 'bulldoze', x, y });
      } else if (tool !== 'select') {
        placementBufferRef.current.push({ x, y, tool });
        
        if (placementBufferRef.current.length >= BATCH_MAX_SIZE) {
          flushPlacements();
        } else if (!flushTimeoutRef.current) {
          flushTimeoutRef.current = setTimeout(() => {
            flushTimeoutRef.current = null;
            flushPlacements();
          }, BATCH_FLUSH_INTERVAL);
        }
      }
    });
    
    return () => {
      flushPlacements();
      game.setPlaceCallback(null);
    };
  }, [multiplayer, multiplayer?.connectionState, game, flushPlacements]);

  // Register callback to broadcast track line placements
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') {
      game.setTrackLineCallback(null);
      return;
    }
    
    game.setTrackLineCallback(({ tiles }) => {
      multiplayer.dispatchAction({ type: 'placeTrackLine', tiles });
    });
    
    return () => {
      game.setTrackLineCallback(null);
    };
  }, [multiplayer, multiplayer?.connectionState, game]);

  // Keep the game state synced with the Supabase database
  const lastUpdateRef = useRef<number>(0);
  const lastIndexUpdateRef = useRef<number>(0);
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) return;
    lastUpdateRef.current = now;
    
    multiplayer.updateGameState(game.state);
    
    if (multiplayer.roomCode && now - lastIndexUpdateRef.current > 10000) {
      lastIndexUpdateRef.current = now;
      updateSavedParksIndex(game.state, multiplayer.roomCode);
    }
  }, [multiplayer, game.state]);

  // Broadcast a local action to peers
  const broadcastAction = useCallback((action: CoasterGameActionInput) => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') return;
    
    const actionKey = JSON.stringify(action);
    if (lastActionRef.current === actionKey) return;
    lastActionRef.current = actionKey;
    
    setTimeout(() => {
      if (lastActionRef.current === actionKey) {
        lastActionRef.current = null;
      }
    }, 100);
    
    multiplayer.dispatchAction(action);
  }, [multiplayer]);

  // Helper to broadcast a placement action
  const broadcastPlace = useCallback(({ x, y, tool }: { x: number; y: number; tool: Tool }) => {
    if (tool === 'bulldoze') {
      broadcastAction({ type: 'bulldoze', x, y });
    } else if (tool !== 'select') {
      broadcastAction({ type: 'place', x, y, tool });
    }
  }, [broadcastAction]);

  // Helper to broadcast speed change
  const broadcastSpeed = useCallback((speed: 0 | 1 | 2 | 3) => {
    broadcastAction({ type: 'setSpeed', speed });
  }, [broadcastAction]);

  // Check if we're in multiplayer mode
  const isMultiplayer = multiplayer?.connectionState === 'connected';
  const isHost = false; // No host concept in peer-to-peer
  const playerCount = multiplayer?.players.length ?? 0;
  const roomCode = multiplayer?.roomCode ?? null;
  const connectionState = multiplayer?.connectionState ?? 'disconnected';

  return {
    isMultiplayer,
    isHost,
    playerCount,
    roomCode,
    connectionState,
    players: multiplayer?.players ?? [],
    broadcastPlace,
    broadcastSpeed,
    broadcastAction,
    leaveRoom: multiplayer?.leaveRoom ?? (() => {}),
  };
}
