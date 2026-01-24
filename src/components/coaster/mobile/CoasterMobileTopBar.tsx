'use client';

import React, { useCallback, useState } from 'react';
import { msg, useMessages } from 'gt-next';
import { useCoaster } from '@/context/CoasterContext';
import { Tile } from '@/games/coaster/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MobileSpeedControls } from '@/components/mobile/MobileSpeedControls';
import { CloseIcon, MoneyIcon, PopulationIcon, TrophyIcon, HappyIcon } from '@/components/ui/Icons';

const UI_LABELS = {
  cash: msg('Cash'),
  guests: msg('Guests'),
  rating: msg('Rating'),
  demand: msg('Demand'),
  ticket: msg('Ticket'),
  ticketPrice: msg('Ticket Price'),
  monthlyProfit: msg('Monthly Profit'),
  avgHappiness: msg('Avg Happiness'),
  parkValue: msg('Park Value'),
  exitToMainMenu: msg('Exit to Main Menu'),
  exitDialogTitle: msg('Exit to Main Menu'),
  exitDialogDescription: msg('Would you like to save your park before exiting?'),
  exitWithoutSaving: msg('Exit Without Saving'),
  saveAndExit: msg('Save & Exit'),
  emptyTile: msg('Empty Tile'),
  path: msg('Path'),
  queue: msg('Queue'),
  track: msg('Track'),
};

function formatCompactCurrency(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

function TicketDemandBar({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const color =
    clamped >= 70 ? 'bg-green-500' : clamped >= 45 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] font-bold text-muted-foreground w-10">{label}</span>
      <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-[9px] text-muted-foreground">{clamped}%</span>
    </div>
  );
}

export function CoasterMobileTopBar({
  selectedTile,
  onCloseTileAction,
  onExitAction,
}: {
  selectedTile: Tile | null;
  onCloseTileAction: () => void;
  onExitAction?: () => void;
}) {
  const { state, setSpeed, setParkSettings, saveGame } = useCoaster();
  const { settings, stats, finances, year, month, day, hour, minute, speed } = state;
  const [showDetails, setShowDetails] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showTicketSlider, setShowTicketSlider] = useState(false);
  const m = useMessages();

  const handleSaveAndExit = useCallback(() => {
    saveGame();
    setShowExitDialog(false);
    onExitAction?.();
  }, [saveGame, onExitAction]);

  const handleExitWithoutSaving = useCallback(() => {
    setShowExitDialog(false);
    onExitAction?.();
  }, [onExitAction]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const displayMinute = Math.floor(minute);
  const timeString = `${hour.toString().padStart(2, '0')}:${displayMinute.toString().padStart(2, '0')}`;
  const dateString = `${monthNames[(month - 1) % 12]} ${day}, Year ${year}`;

  const ticketPrice = settings.entranceFee;
  const demandPercent = Math.max(30, Math.round(100 * Math.exp(-ticketPrice / 80)));

  const tileLabel = selectedTile
    ? selectedTile.building.type === 'empty'
      ? m(UI_LABELS.emptyTile)
      : selectedTile.building.type.replace(/_/g, ' ')
    : '';

  const tileBadges = selectedTile
    ? [
        selectedTile.path ? m(UI_LABELS.path) : null,
        selectedTile.queue ? m(UI_LABELS.queue) : null,
        selectedTile.hasCoasterTrack ? m(UI_LABELS.track) : null,
      ].filter(Boolean)
    : [];

  return (
    <>
      <Card className="fixed top-0 left-0 right-0 z-40 rounded-none border-x-0 border-t-0 bg-card/95 backdrop-blur-sm safe-area-top">
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            className="flex items-center gap-3 min-w-0 active:opacity-70 p-0 m-0 mr-auto"
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="flex flex-col items-start">
              <span className="text-foreground font-semibold text-xs truncate max-w-[90px]">
                {settings.name}
              </span>
              <span className="text-muted-foreground text-[10px] font-mono">
                {dateString} • {timeString}
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono font-semibold text-foreground">
                {formatCompactCurrency(finances.cash)}
              </span>
              <span className="text-[9px] text-muted-foreground">{m(UI_LABELS.cash)}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono font-semibold text-foreground">
                {stats.guestsInPark}
              </span>
              <span className="text-[9px] text-muted-foreground">{m(UI_LABELS.guests)}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono font-semibold text-foreground">
                {stats.parkRating}
              </span>
              <span className="text-[9px] text-muted-foreground">{m(UI_LABELS.rating)}</span>
            </div>
          </button>

          <div className="flex items-center gap-1">
            <MobileSpeedControls speed={speed} onChange={setSpeed} />

            {onExitAction && (
              <button
                onClick={() => setShowExitDialog(true)}
                className="h-6 w-6 p-0 m-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
                title={String(m(UI_LABELS.exitToMainMenu))}
              >
                <svg
                  className="w-3 h-3 -scale-x-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-1 border-t border-sidebar-border/50 bg-secondary/30">
          <TicketDemandBar percent={demandPercent} label={String(m(UI_LABELS.demand))} />

          <button
            className="flex items-center gap-1 active:opacity-70"
            onClick={() => {
              const next = !showTicketSlider;
              setShowTicketSlider(next);
              if (next && selectedTile) {
                onCloseTileAction();
              }
            }}
          >
            <span className="text-[9px] text-muted-foreground">{m(UI_LABELS.ticket)}</span>
            <span className="text-[10px] font-mono text-foreground">${ticketPrice}</span>
          </button>

          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-mono ${finances.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {finances.profit >= 0 ? '+' : ''}{formatCompactCurrency(finances.profit)}/mo
            </span>
          </div>
        </div>

        {showTicketSlider && !selectedTile && (
          <div className="border-t border-sidebar-border/50 bg-secondary/30 px-3 py-0.5 flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground whitespace-nowrap">{m(UI_LABELS.ticketPrice)}</span>
            <Slider
              value={[ticketPrice]}
              onValueChange={(value) => setParkSettings({ entranceFee: value[0] })}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="font-mono text-foreground w-8 text-right shrink-0">${ticketPrice}</span>
            <button
              onClick={() => setShowTicketSlider(false)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        )}

        {selectedTile && (
          <div className="border-t border-sidebar-border/50 bg-gradient-to-b from-secondary/60 to-secondary/20 px-3 py-0.5 flex items-center gap-2 text-[10px]">
            <span className="text-xs font-medium text-foreground capitalize">
              {tileLabel}
            </span>

            {tileBadges.length > 0 && (
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                {tileBadges.map((badge) => (
                  <span key={String(badge)} className="px-1 py-0.5 bg-secondary/70 rounded">
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1" />
            <button
              onClick={onCloseTileAction}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        )}
      </Card>

      {showDetails && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm pt-[72px]"
          onClick={() => setShowDetails(false)}
        >
          <Card
            className="mx-2 mt-2 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 grid grid-cols-4 gap-3">
              <StatItem icon={<MoneyIcon size={16} />} label={String(m(UI_LABELS.cash))} value={formatCompactCurrency(finances.cash)} />
              <StatItem icon={<PopulationIcon size={16} />} label={String(m(UI_LABELS.guests))} value={stats.guestsInPark.toLocaleString()} />
              <StatItem icon={<TrophyIcon size={16} />} label={String(m(UI_LABELS.rating))} value={stats.parkRating.toLocaleString()} />
              <StatItem icon={<HappyIcon size={16} />} label={String(m(UI_LABELS.avgHappiness))} value={`${Math.round(stats.averageHappiness)}%`} />
            </div>

            <Separator />

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{m(UI_LABELS.parkValue)}</span>
                <span className="text-sm font-mono text-foreground">{formatCompactCurrency(stats.parkValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{m(msg('Monthly Income'))}</span>
                <span className="text-sm font-mono text-green-400">{formatCompactCurrency(finances.incomeTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{m(msg('Monthly Expenses'))}</span>
                <span className="text-sm font-mono text-red-400">{formatCompactCurrency(finances.expenseTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{m(UI_LABELS.monthlyProfit)}</span>
                <span className={`text-sm font-mono ${finances.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCompactCurrency(finances.profit)}
                </span>
              </div>
            </div>

            <Separator />

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{m(UI_LABELS.ticketPrice)}</span>
                <span className="text-sm font-mono text-foreground">${ticketPrice}</span>
              </div>
              <Slider
                value={[ticketPrice]}
                onValueChange={(value) => setParkSettings({ entranceFee: value[0] })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>$0</span>
                <span>$100</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m(UI_LABELS.exitDialogTitle)}</DialogTitle>
            <DialogDescription>
              {m(UI_LABELS.exitDialogDescription)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExitWithoutSaving} className="w-full sm:w-auto">
              {m(UI_LABELS.exitWithoutSaving)}
            </Button>
            <Button onClick={handleSaveAndExit} className="w-full sm:w-auto">
              {m(UI_LABELS.saveAndExit)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-mono font-semibold text-foreground">{value}</span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

export default CoasterMobileTopBar;
