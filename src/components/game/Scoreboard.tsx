'use client';

import React, { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { calculatePlayerScores } from './aiSystem';
import { PLAYER_COLORS } from './militarySystem';

export function Scoreboard() {
  const { state } = useGame();
  const { players, gameMode, currentPlayerId } = state;
  
  // Calculate scores (always calculate, even if not showing)
  const scores = useMemo(() => calculatePlayerScores(state), [state]);
  
  // Sort players by score (descending)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const scoreA = scores.get(a.id) || 0;
      const scoreB = scores.get(b.id) || 0;
      return scoreB - scoreA;
    });
  }, [players, scores]);
  
  // Don't show in sandbox mode
  if (gameMode !== 'competitive') {
    return null;
  }
  
  return (
    <div className="absolute top-16 right-4 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg p-3 z-40 min-w-[180px]">
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
        ⚔️ Scoreboard
      </h3>
      
      <div className="space-y-1.5">
        {sortedPlayers.map((player, index) => {
          const score = scores.get(player.id) || 0;
          const isCurrentPlayer = player.id === currentPlayerId;
          const unitCount = state.militaryUnits.filter(u => u.owner === player.id).length;
          
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 p-1.5 rounded ${
                player.eliminated 
                  ? 'opacity-50 line-through' 
                  : isCurrentPlayer 
                    ? 'bg-white/10' 
                    : ''
              }`}
            >
              {/* Rank */}
              <span className="text-xs text-white/40 w-4">{index + 1}.</span>
              
              {/* Color indicator */}
              <div 
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: PLAYER_COLORS[player.id] }}
              />
              
              {/* Name and info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm truncate ${isCurrentPlayer ? 'font-bold text-white' : 'text-white/80'}`}>
                    {player.name}
                    {isCurrentPlayer && ' (You)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span>🪖 {unitCount}</span>
                  <span>${player.money >= 1000 ? `${(player.money / 1000).toFixed(1)}k` : player.money}</span>
                </div>
              </div>
              
              {/* Score */}
              <div className="text-right">
                <div className={`text-sm font-mono ${isCurrentPlayer ? 'text-yellow-400' : 'text-white/80'}`}>
                  {score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Eliminated count */}
      {players.filter(p => p.eliminated).length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/40">
          {players.filter(p => p.eliminated).length} player(s) eliminated
        </div>
      )}
    </div>
  );
}
