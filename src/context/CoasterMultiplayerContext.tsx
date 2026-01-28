'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  MultiplayerProvider,
  createMultiplayerProvider,
} from '@/lib/multiplayer/supabaseProvider';
import {
  ConnectionState,
  Player,
  RoomData,
  generateRoomCode,
} from '@/lib/multiplayer/types';
import { CoasterActionInput } from '@/lib/multiplayer/coasterTypes';
import { GameState } from '@/games/coaster/types';
import { useGT } from 'gt-next';

interface CoasterMultiplayerContextValue {
  connectionState: ConnectionState;
  roomCode: string | null;
  players: Player[];
  error: string | null;

  createRoom: (parkName: string, initialState: GameState) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<RoomData>;
  leaveRoom: () => void;

  dispatchAction: (action: CoasterActionInput) => void;

  initialState: GameState | null;

  onRemoteAction: ((action: CoasterActionInput & { timestamp: number; playerId: string }) => void) | null;
  setOnRemoteAction: (callback: ((action: CoasterActionInput & { timestamp: number; playerId: string }) => void) | null) => void;

  updateGameState: (state: GameState) => void;

  provider: MultiplayerProvider<GameState, CoasterActionInput> | null;
  isHost: boolean;
}

const CoasterMultiplayerContext = createContext<CoasterMultiplayerContextValue | null>(null);

export function CoasterMultiplayerContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const gt = useGT();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const [provider, setProvider] = useState<MultiplayerProvider<GameState, CoasterActionInput> | null>(null);
  const [onRemoteAction, setOnRemoteAction] = useState<
    ((action: CoasterActionInput & { timestamp: number; playerId: string }) => void) | null
  >(null);

  const providerRef = useRef<MultiplayerProvider<GameState, CoasterActionInput> | null>(null);
  const onRemoteActionRef = useRef<
    ((action: CoasterActionInput & { timestamp: number; playerId: string }) => void) | null
  >(null);

  const handleSetOnRemoteAction = useCallback(
    (callback: ((action: CoasterActionInput & { timestamp: number; playerId: string }) => void) | null) => {
      onRemoteActionRef.current = callback;
      setOnRemoteAction(callback);
    },
    []
  );

  const createRoom = useCallback(
    async (parkName: string, gameState: GameState): Promise<string> => {
      setConnectionState('connecting');
      setError(null);

      try {
        const newRoomCode = generateRoomCode();

        const provider = await createMultiplayerProvider<GameState, CoasterActionInput>({
          roomCode: newRoomCode,
          cityName: parkName,
          initialGameState: gameState,
          onConnectionChange: (connected) => {
            setConnectionState(connected ? 'connected' : 'disconnected');
          },
          onPlayersChange: (newPlayers) => {
            setPlayers(newPlayers);
          },
          onAction: (action) => {
            if (onRemoteActionRef.current) {
              onRemoteActionRef.current(action);
            }
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            setConnectionState('error');
          },
        });

        providerRef.current = provider;
        setProvider(provider);
        setRoomCode(newRoomCode);
        setConnectionState('connected');

        return newRoomCode;
      } catch (err) {
        setConnectionState('error');
        setError(err instanceof Error ? err.message : gt('Failed to create room'));
        throw err;
      }
    },
    [gt]
  );

  const joinRoom = useCallback(
    async (code: string): Promise<RoomData> => {
      setConnectionState('connecting');
      setError(null);

      try {
        const normalizedCode = code.toUpperCase();

        const provider = await createMultiplayerProvider<GameState, CoasterActionInput>({
          roomCode: normalizedCode,
          cityName: gt('Co-op Park'),
          onConnectionChange: (connected) => {
            setConnectionState(connected ? 'connected' : 'disconnected');
          },
          onPlayersChange: (newPlayers) => {
            setPlayers(newPlayers);
          },
          onAction: (action) => {
            if (onRemoteActionRef.current) {
              onRemoteActionRef.current(action);
            }
          },
          onStateReceived: (state) => {
            setInitialState(state);
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            setConnectionState('error');
          },
        });

        providerRef.current = provider;
        setProvider(provider);
        setRoomCode(normalizedCode);
        setConnectionState('connected');

        const room: RoomData = {
          code: normalizedCode,
          hostId: '',
          cityName: gt('Co-op Park'),
          createdAt: Date.now(),
          playerCount: 1,
        };

        return room;
      } catch (err) {
        setConnectionState('error');
        setError(err instanceof Error ? err.message : gt('Failed to join room'));
        throw err;
      }
    },
    [gt]
  );

  const leaveRoom = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }

    setProvider(null);
    setConnectionState('disconnected');
    setRoomCode(null);
    setPlayers([]);
    setError(null);
    setInitialState(null);
  }, []);

  const dispatchAction = useCallback((action: CoasterActionInput) => {
    if (providerRef.current) {
      providerRef.current.dispatchAction(action);
    }
  }, []);

  const updateGameState = useCallback((state: GameState) => {
    if (providerRef.current) {
      providerRef.current.updateGameState(state);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  }, []);

  const value: CoasterMultiplayerContextValue = {
    connectionState,
    roomCode,
    players,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    dispatchAction,
    initialState,
    onRemoteAction,
    setOnRemoteAction: handleSetOnRemoteAction,
    updateGameState,
    provider,
    isHost: false,
  };

  return (
    <CoasterMultiplayerContext.Provider value={value}>
      {children}
    </CoasterMultiplayerContext.Provider>
  );
}

export function useCoasterMultiplayer() {
  const context = useContext(CoasterMultiplayerContext);
  if (!context) {
    throw new Error('useCoasterMultiplayer must be used within a CoasterMultiplayerContextProvider');
  }
  return context;
}

export function useCoasterMultiplayerOptional() {
  return useContext(CoasterMultiplayerContext);
}
