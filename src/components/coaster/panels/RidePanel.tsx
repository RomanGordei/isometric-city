'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Ride } from '@/games/coaster/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { T, Var, Num, Currency, Branch, useGT } from 'gt-next';

interface RidePanelProps {
  ride: Ride;
  onClose: () => void;
  onToggleStatus: () => void;
  onPriceChange: (price: number) => void;
}

export default function RidePanel({ ride, onClose, onToggleStatus, onPriceChange }: RidePanelProps) {
  const gt = useGT();
  const [price, setPrice] = useState(ride.price);

  useEffect(() => {
    setPrice(ride.price);
  }, [ride.price]);

  const queueLength = ride.queue.guestIds.length;
  const rideTimeMinutes = Math.max(1, Math.round(ride.stats.rideTime / 60));
  const estimatedWait = ride.stats.capacity > 0
    ? Math.round((queueLength / ride.stats.capacity) * rideTimeMinutes)
    : 0;

  const statusLabel = useMemo(() => {
    switch (ride.status) {
      case 'open':
        return gt('Open');
      case 'closed':
        return gt('Closed');
      case 'broken':
        return gt('Broken');
      case 'testing':
        return gt('Testing');
      default:
        return gt('Building');
    }
  }, [ride.status, gt]);

  return (
    <div className="absolute top-20 right-6 z-50 w-72">
      <Card className="bg-card/95 border-border/70 shadow-xl">
        <div className="flex items-start justify-between p-4 border-b border-border/60">
          <div>
            <T>
              <div className="text-sm text-muted-foreground uppercase tracking-[0.2em]">Ride</div>
            </T>
            <div className="text-lg font-semibold">{ride.name}</div>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label={gt('Close ride panel')}>
            ✕
          </Button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <T>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className={`text-xs font-semibold uppercase tracking-[0.15em] ${ride.status === 'open' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <Var>{statusLabel}</Var>
              </span>
            </div>
          </T>
          <T>
            <div className="flex items-center justify-between">
              <span>Queue</span>
              <span><Num>{queueLength}</Num> guests</span>
            </div>
          </T>
          <T>
            <div className="flex items-center justify-between">
              <span>Estimated Wait</span>
              <span><Num>{estimatedWait}</Num> min</span>
            </div>
          </T>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <T>
              <div>
                <div className="text-muted-foreground">Excitement</div>
                <div className="font-semibold"><Num>{ride.excitement}</Num></div>
              </div>
            </T>
            <T>
              <div>
                <div className="text-muted-foreground">Intensity</div>
                <div className="font-semibold"><Num>{ride.intensity}</Num></div>
              </div>
            </T>
            <T>
              <div>
                <div className="text-muted-foreground">Nausea</div>
                <div className="font-semibold"><Num>{ride.nausea}</Num></div>
              </div>
            </T>
          </div>
          <div className="space-y-2">
            <T>
              <div className="flex items-center justify-between">
                <span>Ticket Price</span>
                <span><Currency currency="USD">{price}</Currency></span>
              </div>
            </T>
            <Slider
              value={[price]}
              min={0}
              max={10}
              step={1}
              onValueChange={(value) => setPrice(value[0])}
              onValueCommit={(value) => onPriceChange(value[0])}
            />
          </div>
          <T>
            <Branch
              branch={ride.status}
              open={
                <Button className="w-full" variant="outline" onClick={onToggleStatus}>
                  Close Ride
                </Button>
              }
            >
              <Button className="w-full" variant="default" onClick={onToggleStatus}>
                Open Ride
              </Button>
            </Branch>
          </T>
        </div>
      </Card>
    </div>
  );
}
