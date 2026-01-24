'use client';

import React from 'react';
import { PauseIcon, PlayIcon } from '@/components/ui/Icons';

interface MobileSpeedControlsProps {
  speed: 0 | 1 | 2 | 3;
  onChange: (speed: 0 | 1 | 2 | 3) => void;
}

export function MobileSpeedControls({ speed, onChange }: MobileSpeedControlsProps) {
  return (
    <div className="flex items-center gap-0 bg-secondary rounded-sm h-6 overflow-hidden p-0 m-0">
      <button
        onClick={() => onChange(0)}
        className={`h-6 w-6 min-w-6 p-0 m-0 flex items-center justify-center rounded-none ${
          speed === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/20'
        }`}
        title="Pause"
      >
        <PauseIcon size={12} />
      </button>
      <button
        onClick={() => onChange(1)}
        className={`h-6 w-6 min-w-6 p-0 m-0 flex items-center justify-center rounded-none ${
          speed === 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/20'
        }`}
        title="Normal speed"
      >
        <PlayIcon size={12} />
      </button>
      <button
        onClick={() => onChange(2)}
        className={`h-6 w-6 min-w-6 p-0 m-0 flex items-center justify-center rounded-none ${
          speed === 2 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/20'
        }`}
        title="2x speed"
      >
        <div className="flex items-center -space-x-[5px]">
          <PlayIcon size={12} />
          <PlayIcon size={12} />
        </div>
      </button>
      <button
        onClick={() => onChange(3)}
        className={`h-6 w-6 min-w-6 p-0 m-0 flex items-center justify-center rounded-none ${
          speed === 3 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/20'
        }`}
        title="3x speed"
      >
        <div className="flex items-center -space-x-[7px]">
          <PlayIcon size={12} />
          <PlayIcon size={12} />
          <PlayIcon size={12} />
        </div>
      </button>
    </div>
  );
}

export default MobileSpeedControls;
