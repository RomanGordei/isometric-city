'use client';

import React from 'react';
import { ResourcePool } from '@/games/rise/types';
import { AGE_CONFIGS } from '@/games/rise/constants';

const LABELS: Record<keyof ResourcePool, string> = {
  food: 'Food',
  wood: 'Wood',
  metal: 'Metal',
  oil: 'Oil',
  wealth: 'Wealth',
  knowledge: 'Knowledge',
  population: 'Pop',
  popCap: 'Cap',
};

const ORDER: (keyof ResourcePool)[] = ['food', 'wood', 'metal', 'oil', 'wealth', 'knowledge', 'population', 'popCap'];

export function TopStats({ resources, ageId }: { resources: ResourcePool; ageId: string }) {
  const ageLabel = AGE_CONFIGS.find(a => a.id === ageId)?.label ?? ageId;
  const popPct = Math.max(0, Math.min(1, resources.popCap === 0 ? 0 : resources.population / resources.popCap));
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 text-sm border border-slate-700 rounded-lg shadow-lg">
      <div className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700">
        <div className="text-[10px] uppercase text-slate-400">Age</div>
        <div className="font-semibold text-slate-100">{ageLabel}</div>
      </div>
      {ORDER.map(key => (
        <div key={key} className="flex items-center gap-1 text-slate-100">
          <span className="text-[10px] uppercase text-slate-400">{LABELS[key]}</span>
          <span className="font-semibold">
            {key === 'population' || key === 'popCap'
              ? Math.floor(resources[key])
              : Math.floor(resources[key])}
          </span>
        </div>
      ))}
      <div className="min-w-[140px] text-xs text-slate-200">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Population</span>
          <span className="font-semibold text-slate-200">
            {Math.floor(resources.population)} / {Math.floor(resources.popCap)}
          </span>
        </div>
        <div className="mt-1 h-2 rounded bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${Math.round(popPct * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
