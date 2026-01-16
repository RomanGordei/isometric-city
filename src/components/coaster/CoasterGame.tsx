'use client';

import React, { useState } from 'react';
import { T, Var, Num } from 'gt-next';
import { Button } from '@/components/ui/button';
import { useCoaster } from '@/context/CoasterContext';
import CoasterCanvas from './CoasterCanvas';
import CoasterSidebar from './CoasterSidebar';
import CoasterMiniMap from './CoasterMiniMap';

export default function CoasterGame() {
  const { state, setSpeed, newGame } = useCoaster();
  const [navigationTarget, setNavigationTarget] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState<{ offset: { x: number; y: number }; zoom: number; canvasSize: { width: number; height: number } } | null>(null);

  return (
    <div className="w-full h-full flex bg-background text-foreground">
      <CoasterSidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-slate-900/70">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold tracking-wide">{state.parkName}</div>
            <div className="text-xs text-muted-foreground">
              <T>Year <Num>{state.year}</Num> · Day <Num>{state.day}</Num> · <Var>{state.hour.toString().padStart(2, '0')}</Var>:00</T>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div><T>Guests: <Num>{state.stats.guestsInPark}</Num></T></div>
            <div><T>Rating: <Num>{state.stats.rating}</Num></T></div>
            <div className="font-medium"><T>$<Num>{state.finance.cash}</Num></T></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={state.speed === 0 ? 'default' : 'ghost'} size="sm" onClick={() => setSpeed(0)}>
              <T>Pause</T>
            </Button>
            <Button variant={state.speed === 1 ? 'default' : 'ghost'} size="sm" onClick={() => setSpeed(1)}>
              <T>1x</T>
            </Button>
            <Button variant={state.speed === 2 ? 'default' : 'ghost'} size="sm" onClick={() => setSpeed(2)}>
              <T>2x</T>
            </Button>
            <Button variant={state.speed === 3 ? 'default' : 'ghost'} size="sm" onClick={() => setSpeed(3)}>
              <T>3x</T>
            </Button>
            <Button variant="outline" size="sm" onClick={() => newGame()}>
              <T>New Park</T>
            </Button>
          </div>
        </div>
        <div className="flex-1 relative">
          <CoasterCanvas
            navigationTarget={navigationTarget}
            onNavigationComplete={() => setNavigationTarget(null)}
            onViewportChange={setViewport}
          />
          <CoasterMiniMap onNavigate={(x, y) => setNavigationTarget({ x, y })} viewport={viewport} />
        </div>
      </div>
    </div>
  );
}
