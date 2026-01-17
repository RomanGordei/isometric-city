'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface FinancePanelProps {
  cash: number;
  entranceRevenue: number;
  entranceFee: number;
  rideRevenue: number;
  shopRevenue: number;
  income: number;
  expenses: number;
  loan: number;
  onEntranceFeeChange: (fee: number) => void;
  onClose: () => void;
}

export default function FinancePanel({
  cash,
  entranceRevenue,
  entranceFee,
  rideRevenue,
  shopRevenue,
  income,
  expenses,
  loan,
  onEntranceFeeChange,
  onClose,
}: FinancePanelProps) {
  return (
    <div className="absolute top-20 right-6 z-50 w-72">
      <Card className="bg-card/95 border-border/70 shadow-xl">
        <div className="flex items-start justify-between p-4 border-b border-border/60">
          <div>
            <div className="text-sm text-muted-foreground uppercase tracking-[0.2em]">Finance</div>
            <div className="text-lg font-semibold">Park Ledger</div>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close finance panel">
            ✕
          </Button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span>Cash on Hand</span>
            <span className="font-semibold">${cash.toLocaleString()}</span>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Income</div>
            <div className="flex items-center justify-between">
              <span>Admissions</span>
              <span>${entranceRevenue.toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Entrance Fee</span>
                <span>${entranceFee}</span>
              </div>
              <Slider
                value={[entranceFee]}
                min={0}
                max={20}
                step={1}
                onValueChange={(value) => onEntranceFeeChange(value[0])}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Ride Tickets</span>
              <span>${rideRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shops & Stalls</span>
              <span>${shopRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Total Income</span>
              <span>${income.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Expenses</div>
            <div className="flex items-center justify-between font-semibold">
              <span>Total Expenses</span>
              <span>${expenses.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Outstanding Loan</span>
            <span>${loan.toLocaleString()}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
