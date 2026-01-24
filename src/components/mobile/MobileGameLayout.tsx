'use client';

import React from 'react';

interface MobileGameLayoutProps {
  topBar: React.ReactNode;
  bottomBar: React.ReactNode;
  children: React.ReactNode;
  topPadding?: number;
  bottomPadding?: number;
}

export function MobileGameLayout({
  topBar,
  bottomBar,
  children,
  topPadding = 72,
  bottomPadding = 76,
}: MobileGameLayoutProps) {
  return (
    <div className="w-full h-full overflow-hidden bg-background flex flex-col">
      {topBar}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }}
      >
        {children}
      </div>
      {bottomBar}
    </div>
  );
}

export default MobileGameLayout;
