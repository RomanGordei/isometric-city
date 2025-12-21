'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MilitaryUnitType, MILITARY_UNIT_STATS } from '@/types/game';

const UNIT_ICONS: Record<MilitaryUnitType, string> = {
  infantry: '🪖',
  tank: '🛡️',
  military_helicopter: '🚁',
};

export function MilitaryPanel() {
  const { state, setActivePanel, trainMilitaryUnit, cancelProduction } = useGame();
  const { players, currentPlayerId, productionQueue, stats, gameMode } = state;
  
  // Don't show in sandbox mode
  if (gameMode !== 'competitive') {
    return (
      <Dialog open={true} onOpenChange={() => setActivePanel('none')}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Military</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            Military units are only available in Competitive mode.
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const playerQueue = productionQueue.filter(item => item.owner === currentPlayerId);
  
  const unitTypes: MilitaryUnitType[] = ['infantry', 'tank', 'military_helicopter'];
  
  return (
    <Dialog open={true} onOpenChange={() => setActivePanel('none')}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚔️ Military Command
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Resources */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded">
            <span className="text-sm text-muted-foreground">Available Funds</span>
            <span className="font-mono text-lg">${stats.money.toLocaleString()}</span>
          </div>
          
          {/* Unit Training */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Train Units
            </h3>
            
            <div className="grid gap-3">
              {unitTypes.map(unitType => {
                const unitStats = MILITARY_UNIT_STATS[unitType];
                const canAfford = stats.money >= unitStats.cost;
                
                return (
                  <div
                    key={unitType}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
                  >
                    <span className="text-2xl">{UNIT_ICONS[unitType]}</span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {unitType.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-mono text-amber-500">
                          ${unitStats.cost}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {unitStats.description}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>HP: {unitStats.health}</span>
                        <span>DMG: {unitStats.damage}</span>
                        <span>Time: {unitStats.buildTime}s</span>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      disabled={!canAfford}
                      onClick={() => trainMilitaryUnit(unitType)}
                      className="shrink-0"
                    >
                      Train
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Production Queue */}
          {playerQueue.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Production Queue ({playerQueue.length})
              </h3>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {playerQueue.map((item, index) => {
                  const unitStats = MILITARY_UNIT_STATS[item.unitType];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded"
                    >
                      <span className="text-lg">{UNIT_ICONS[item.unitType]}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{item.unitType.replace('_', ' ')}</span>
                          <span className="text-muted-foreground">
                            {Math.floor(item.progress)}%
                          </span>
                        </div>
                        <Progress value={item.progress} className="h-1.5 mt-1" />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => cancelProduction(item.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Unit Count Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Your Army
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {unitTypes.map(unitType => {
                const count = state.militaryUnits.filter(
                  u => u.owner === currentPlayerId && u.type === unitType
                ).length;
                return (
                  <div key={unitType} className="text-center p-2 bg-muted/30 rounded">
                    <span className="text-xl">{UNIT_ICONS[unitType]}</span>
                    <div className="text-lg font-mono">{count}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {unitType.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
