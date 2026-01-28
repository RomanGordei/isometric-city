'use client';

import React, { useState, useRef } from 'react';
import { CoasterProvider } from '@/context/CoasterContext';
import { CoasterMultiplayerContextProvider } from '@/context/CoasterMultiplayerContext';
import CoasterGame from '@/components/coaster/Game';
import { CoasterCoopModal } from '@/components/coaster/multiplayer/CoasterCoopModal';
import { GameState } from '@/games/coaster/types';
import { compressToUTF16 } from 'lz-string';
import { useParams, useRouter } from 'next/navigation';
import {
  COASTER_AUTOSAVE_KEY,
  saveCoasterStateToStorage,
  readSavedParksIndex,
  writeSavedParksIndex,
  SavedParkMeta,
} from '@/games/coaster/saveUtils';

// Save a park to the saved parks index (for multiplayer parks)
function saveParkToIndex(state: GameState, roomCode?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const parks = readSavedParksIndex();
    
    const parkMeta: SavedParkMeta = {
      id: state.id || `park-${Date.now()}`,
      name: state.settings?.name || 'Co-op Park',
      cash: state.finances?.cash ?? 0,
      guests: state.stats?.guestsInPark ?? 0,
      rating: state.stats?.parkRating ?? 0,
      gridSize: state.gridSize ?? 60,
      year: state.year ?? 1,
      month: state.month ?? 1,
      day: state.day ?? 1,
      savedAt: Date.now(),
      roomCode: roomCode,
    };
    
    const existingIndex = parks.findIndex((p: SavedParkMeta) => 
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

export default function CoasterCoopPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string)?.toUpperCase();
  
  const [showGame, setShowGame] = useState(false);
  const [showCoopModal, setShowCoopModal] = useState(true);
  const [startFreshGame, setStartFreshGame] = useState(false);
  
  // Ref to track that we're intentionally starting the game (not closing to go home)
  const isStartingGameRef = useRef(false);

  // Handle exit from game - navigate back to coaster homepage
  const handleExitGame = () => {
    router.push('/coaster');
  };

  // Handle co-op game start
  const handleCoopStart = (isHost: boolean, initialState?: GameState, code?: string) => {
    // Mark that we're intentionally starting the game (not closing to go home)
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

  // Handle modal close - go back to coaster homepage if not connected
  const handleModalClose = (open: boolean) => {
    // Don't redirect if we're intentionally starting the game
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

  // Show the coop modal with the room code pre-filled
  return (
    <CoasterMultiplayerContextProvider>
      <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-950 flex items-center justify-center">
        <CoasterCoopModal
          open={showCoopModal}
          onOpenChange={handleModalClose}
          onStartGame={handleCoopStart}
          pendingRoomCode={roomCode}
        />
      </main>
    </CoasterMultiplayerContextProvider>
  );
}
