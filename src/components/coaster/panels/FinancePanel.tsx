'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { T, Currency, useGT } from 'gt-next';

interface FinancePanelProps {
  cash: number;
  entranceRevenue: number;
  entranceFee: number;
  rideRevenue: number;
  shopRevenue: number;
  income: number;
  expenses: number;
  staffCost: number;
  maintenanceCost: number;
  researchCost: number;
  loanInterestCost: number;
  loan: number;
  onLoanChange: (amount: number, action: 'take' | 'repay') => void;
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
  staffCost,
  maintenanceCost,
  researchCost,
  loanInterestCost,
  loan,
  onLoanChange,
  onEntranceFeeChange,
  onClose,
}: FinancePanelProps) {
  const gt = useGT();
  const [loanAmount, setLoanAmount] = React.useState(2000);

  const handleLoanAmountChange = (value: number) => {
    setLoanAmount(value);
  };

  return (
    <div className="absolute top-20 right-6 z-50 w-72">
      <Card className="bg-card/95 border-border/70 shadow-xl">
        <div className="flex items-start justify-between p-4 border-b border-border/60">
          <div>
            <div className="text-sm text-muted-foreground uppercase tracking-[0.2em]"><T>Finance</T></div>
            <div className="text-lg font-semibold"><T>Park Ledger</T></div>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label={gt('Close finance panel')}>
            ✕
          </Button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span><T>Cash on Hand</T></span>
            <span className="font-semibold"><Currency currency="USD">{cash}</Currency></span>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground"><T>Income</T></div>
            <div className="flex items-center justify-between">
              <span><T>Admissions</T></span>
              <span><Currency currency="USD">{entranceRevenue}</Currency></span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span><T>Entrance Fee</T></span>
                <span><Currency currency="USD">{entranceFee}</Currency></span>
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
              <span><T>Ride Tickets</T></span>
              <span><Currency currency="USD">{rideRevenue}</Currency></span>
            </div>
            <div className="flex items-center justify-between">
              <span><T>Shops & Stalls</T></span>
              <span><Currency currency="USD">{shopRevenue}</Currency></span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span><T>Total Income</T></span>
              <span><Currency currency="USD">{income}</Currency></span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground"><T>Expenses</T></div>
            <div className="flex items-center justify-between">
              <span><T>Staff Wages</T></span>
              <span><Currency currency="USD">{staffCost}</Currency></span>
            </div>
            <div className="flex items-center justify-between">
              <span><T>Maintenance</T></span>
              <span><Currency currency="USD">{maintenanceCost}</Currency></span>
            </div>
            <div className="flex items-center justify-between">
              <span><T>Research</T></span>
              <span><Currency currency="USD">{researchCost}</Currency></span>
            </div>
            <div className="flex items-center justify-between">
              <span><T>Loan Interest</T></span>
              <span><Currency currency="USD">{loanInterestCost}</Currency></span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span><T>Total Expenses</T></span>
              <span><Currency currency="USD">{expenses}</Currency></span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span><T>Outstanding Loan</T></span>
            <span><Currency currency="USD">{loan}</Currency></span>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground"><T>Loans</T></div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span><T>Loan Amount</T></span>
              <span><Currency currency="USD">{loanAmount}</Currency></span>
            </div>
            <Slider
              value={[loanAmount]}
              min={500}
              max={10000}
              step={500}
              onValueChange={(value) => handleLoanAmountChange(value[0])}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onLoanChange(loanAmount, 'take')}
              >
                <T>Take Loan</T>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={loan === 0}
                onClick={() => onLoanChange(loanAmount, 'repay')}
              >
                <T>Repay</T>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
