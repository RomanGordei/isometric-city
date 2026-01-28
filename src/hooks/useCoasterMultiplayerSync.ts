'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useCoaster } from '@/context/CoasterContext';
import { useCoasterMultiplayerOptional } from '@/context/CoasterMultiplayerContext';
import { CoasterAction, CoasterActionInput } from '@/lib/multiplayer/coasterTypes';
import { ParkSettings, Tool } from '@/games/coaster/types';
import { updateSavedParksIndexForRoom } from '@/games/coaster/saveUtils';

const BATCH_FLUSH_INTERVAL = 100;
const BATCH_MAX_SIZE = 100;

export function useCoasterMultiplayerSync() {
  const multiplayer = useCoasterMultiplayerOptional();
  const coaster = useCoaster();
  const lastActionRef = useRef<string | null>(null);
  const initialStateLoadedRef = useRef(false);
  const lastInitialStateRef = useRef<string | null>(null);

  const placementBufferRef = useRef<Array<{ x: number; y: number; tool: Tool }>>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const multiplayerRef = useRef(multiplayer);

  useEffect(() => {
    multiplayerRef.current = multiplayer;
  }, [multiplayer]);

  useEffect(() => {
    if (!multiplayer || !multiplayer.initialState) return;

    const stateKey = JSON.stringify(multiplayer.initialState.tick || 0);
    if (lastInitialStateRef.current === stateKey && initialStateLoadedRef.current) return;

    const stateString = JSON.stringify(multiplayer.initialState);
    const success = coaster.loadState(stateString);
    if (success) {
      initialStateLoadedRef.current = true;
      lastInitialStateRef.current = stateKey;
    }
  }, [multiplayer?.initialState, coaster]);

  const applyRemoteAction = useCallback((action: CoasterAction) => {
    if (!action || !action.type) {
      console.warn('[useCoasterMultiplayerSync] Received invalid action:', action);
      return;
    }

    switch (action.type) {
      case 'place': {
        const currentTool = coaster.latestStateRef.current.selectedTool;
        coaster.setTool(action.tool);
        coaster.placeAtTile(action.x, action.y, true);
        coaster.setTool(currentTool);
        break;
      }
      case 'placeBatch': {
        const currentTool = coaster.latestStateRef.current.selectedTool;
        for (const placement of action.placements) {
          coaster.setTool(placement.tool);
          coaster.placeAtTile(placement.x, placement.y, true);
        }
        coaster.setTool(currentTool);
        break;
      }
      case 'bulldoze': {
        coaster.bulldozeTile(action.x, action.y, true);
        break;
      }
      case 'startCoasterBuild': {
        coaster.startCoasterBuild(action.coasterType, action.coasterId, true);
        break;
      }
      case 'finishCoasterBuild': {
        coaster.finishCoasterBuild(true);
        break;
      }
      case 'cancelCoasterBuild': {
        coaster.cancelCoasterBuild(true);
        break;
      }
      case 'setSpeed': {
        coaster.setSpeed(action.speed);
        break;
      }
      case 'setParkSettings': {
        coaster.setParkSettings(action.settings);
        break;
      }
      default:
        break;
    }
  }, [coaster]);

  useEffect(() => {
    if (!multiplayer) return;

    multiplayer.setOnRemoteAction((action) => {
      applyRemoteAction(action as CoasterAction);
    });

    return () => {
      multiplayer.setOnRemoteAction(null);
    };
  }, [multiplayer, applyRemoteAction]);

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

  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') {
      coaster.setPlaceCallback(null);
      coaster.setBulldozeCallback(null);
      coaster.setCoasterBuildCallback(null);

      if (placementBufferRef.current.length > 0) {
        placementBufferRef.current = [];
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      return;
    }

    coaster.setPlaceCallback(({ x, y, tool }) => {
      if (tool === 'bulldoze' || tool === 'select') return;

      placementBufferRef.current.push({ x, y, tool });

      if (placementBufferRef.current.length >= BATCH_MAX_SIZE) {
        flushPlacements();
      } else if (!flushTimeoutRef.current) {
        flushTimeoutRef.current = setTimeout(() => {
          flushTimeoutRef.current = null;
          flushPlacements();
        }, BATCH_FLUSH_INTERVAL);
      }
    });

    coaster.setBulldozeCallback(({ x, y }) => {
      flushPlacements();
      multiplayer.dispatchAction({ type: 'bulldoze', x, y });
    });

    coaster.setCoasterBuildCallback((action) => {
      if (action.type === 'start') {
        multiplayer.dispatchAction({
          type: 'startCoasterBuild',
          coasterType: action.coasterType,
          coasterId: action.coasterId,
        });
      } else if (action.type === 'finish') {
        multiplayer.dispatchAction({ type: 'finishCoasterBuild' });
      } else if (action.type === 'cancel') {
        multiplayer.dispatchAction({ type: 'cancelCoasterBuild' });
      }
    });

    return () => {
      flushPlacements();
      coaster.setPlaceCallback(null);
      coaster.setBulldozeCallback(null);
      coaster.setCoasterBuildCallback(null);
    };
  }, [multiplayer, multiplayer?.connectionState, coaster, flushPlacements]);

  const lastUpdateRef = useRef<number>(0);
  const lastIndexUpdateRef = useRef<number>(0);
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) return;
    lastUpdateRef.current = now;

    multiplayer.updateGameState(coaster.state);

    if (multiplayer.roomCode && now - lastIndexUpdateRef.current > 10000) {
      lastIndexUpdateRef.current = now;
      updateSavedParksIndexForRoom(coaster.state, multiplayer.roomCode);
    }
  }, [multiplayer, coaster.state]);

  const broadcastAction = useCallback((action: CoasterActionInput) => {
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

  const broadcastSpeed = useCallback((speed: 0 | 1 | 2 | 3) => {
    broadcastAction({ type: 'setSpeed', speed });
  }, [broadcastAction]);

  const broadcastParkSettings = useCallback((settings: Partial<ParkSettings>) => {
    broadcastAction({ type: 'setParkSettings', settings });
  }, [broadcastAction]);

  const isMultiplayer = multiplayer?.connectionState === 'connected';
  const isHost = multiplayer?.isHost ?? false;
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
    broadcastSpeed,
    broadcastParkSettings,
    leaveRoom: multiplayer?.leaveRoom ?? (() => {}),
  };
}
