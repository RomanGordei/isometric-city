/**
 * Shared Speed Control Component
 * 
 * Used by both IsoCity and Rise of Nations for game speed control.
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayIcon, PauseIcon } from '@/components/ui/Icons';

interface SpeedControlProps {
  speed: 0 | 1 | 2 | 3;
  onSpeedChange: (speed: 0 | 1 | 2 | 3) => void;
  className?: string;
}

export function SpeedControl({ speed, onSpeedChange, className = '' }: SpeedControlProps) {
  return (
    <div className={`flex items-center gap-0 bg-secondary rounded-md p-0 ${className}`}>
      {[0, 1, 2, 3].map(s => (
        <Button
          key={s}
          onClick={() => onSpeedChange(s as 0 | 1 | 2 | 3)}
          variant={speed === s ? 'default' : 'ghost'}
          size="icon-sm"
          className="h-7 w-7 p-0 m-0"
          title={s === 0 ? 'Pause' : s === 1 ? 'Normal' : s === 2 ? 'Fast' : 'Very Fast'}
        >
          {s === 0 ? <PauseIcon size={12} /> :
           s === 1 ? <PlayIcon size={12} /> :
           s === 2 ? (
             <div className="flex items-center -space-x-[5px]">
               <PlayIcon size={12} />
               <PlayIcon size={12} />
             </div>
           ) :
           <div className="flex items-center -space-x-[7px]">
             <PlayIcon size={12} />
             <PlayIcon size={12} />
             <PlayIcon size={12} />
           </div>}
        </Button>
      ))}
    </div>
  );
}
