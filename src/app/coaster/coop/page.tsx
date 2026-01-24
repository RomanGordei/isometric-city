'use client';

import React, { useState, useRef } from 'react';
import { CoasterProvider } from '@/context/CoasterContext';
import { CoasterMultiplayerContextProvider } from '@/context/CoasterMultiplayerContext';
import CoasterGame from '@/components/coaster/Game';
import { CoasterCoopModal } from '@/components/multiplayer/CoasterCoopModal';
import { GameState } from '@/games/coaster/types';
import { useRouter } from 'next/navigation';
import {
  COASTER_AUTOSAVE_KEY,
  saveCoasterStateToStorage,
  buildSavedParkMeta,
  readSavedParksIndex,
  writeSavedParksIndex,
} from '@/games/coaster/saveUtils';

// Save a park to the saved parks index (for multiplayer parks)
function saveParkToIndex(state: GameState, roomCode?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const parks = readSavedParksIndex();
    const parkMeta = {
      ...buildSavedParkMeta(state),
      roomCode: roomCode,
    };
    
    const existingIndex = parks.findIndex((p: { id: string; roomCode?: string }) => 
      p.id === parkMeta.id || (roomCode && p.roomCode === roomCode)
    );
    
    if (existingIndex >= 0) {
      parks[existingIndex] = parkMeta;
    } else {
      parks.unshift(parkMeta);
    }
    
    writeSavedParksIndex(parks.slice(0, 20));
  } catch (e) {
    console.error('Failed to save park to index:', e);
  }
}

export default function CoasterCoopNewPage() {
  const router = useRouter();
  
  const [showGame, setShowGame] = useState(false);
  const [showCoopModal, setShowCoopModal] = useState(true);
  const [startFreshGame, setStartFreshGame] = useState(false);
  
  const isStartingGameRef = useRef(false);

  const handleExitGame = () => {
    router.push('/coaster');
  };

  const handleCoopStart = (isHost: boolean, initialState?: GameState, code?: string) => {
    isStartingGameRef.current = true;
    
    if (isHost && initialState) {
      try {
        saveCoasterStateToStorage(COASTER_AUTOSAVE_KEY, initialState);
        if (code) {
          saveParkToIndex(initialState, code);
        }
      } catch (e) {
        console.error('Failed to save co-op state:', e);
      }
      setStartFreshGame(false);
    } else if (isHost) {
      setStartFreshGame(true);
    } else if (initialState) {
      try {
        saveCoasterStateToStorage(COASTER_AUTOSAVE_KEY, initialState);
        if (code) {
          saveParkToIndex(initialState, code);
        }
      } catch (e) {
        console.error('Failed to save co-op state:', e);
      }
      setStartFreshGame(false);
    } else {
      setStartFreshGame(true);
    }
    
    setShowGame(true);
    setShowCoopModal(false);
  };

  const handleModalClose = (open: boolean) => {
    if (!open && !showGame && !isStartingGameRef.current) {
      router.push('/coaster');
    }
    setShowCoopModal(open);
  };

  if (showGame) {
    return (
      <CoasterMultiplayerContextProvider>
        <CoasterProvider startFresh={startFreshGame}>
          <main className="h-screen w-screen overflow-hidden">
            <CoasterGame onExit={handleExitGame} />
          </main>
        </CoasterProvider>
      </CoasterMultiplayerContextProvider>
    );
  }

  return (
    <CoasterMultiplayerContextProvider>
      <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-950 flex items-center justify-center">
        <CoasterCoopModal
          open={showCoopModal}
          onOpenChange={handleModalClose}
          onStartGame={handleCoopStart}
          pendingRoomCode={null}
        />
      </main>
    </CoasterMultiplayerContextProvider>
  );
}
