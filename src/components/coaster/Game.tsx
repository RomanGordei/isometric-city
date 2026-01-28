'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCoaster } from '@/context/CoasterContext';
import { useMobile } from '@/hooks/useMobile';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CoasterGrid } from './CoasterGrid';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MiniMap } from './MiniMap';
import { Panels } from './panels/Panels';
import { CoasterCommandMenu } from '@/components/coaster/CommandMenu';
import { CoasterMobileTopBar, CoasterMobileToolbar } from './mobile';
import { useCoasterMultiplayerSync } from '@/hooks/useCoasterMultiplayerSync';
import { Copy, Check } from 'lucide-react';

interface GameProps {
  onExit?: () => void;
}

export default function CoasterGame({ onExit }: GameProps) {
  const { state, isStateReady, setTool, setSpeed, setActivePanel } = useCoaster();
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState<{
    offset: { x: number; y: number };
    zoom: number;
    canvasSize: { width: number; height: number };
  } | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<{ x: number; y: number } | null>(null);
  const { isMobileDevice, isSmallScreen } = useMobile();
  const isMobile = isMobileDevice || isSmallScreen;
  
  // Multiplayer sync
  const {
    isMultiplayer,
    roomCode,
    players,
    leaveRoom,
  } = useCoasterMultiplayerSync();
  
  // Copy room link state
  const [copiedRoomLink, setCopiedRoomLink] = useState(false);
  
  const handleCopyRoomLink = useCallback(() => {
    if (!roomCode) return;
    const url = `${window.location.origin}/coaster/coop/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedRoomLink(true);
    setTimeout(() => setCopiedRoomLink(false), 2000);
  }, [roomCode]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setTool('bulldoze');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setTool('select');
        setSelectedTile(null);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        // Toggle pause/unpause: if paused (speed 0), resume to normal (speed 1)
        // If running, pause (speed 0)
        setSpeed(state.speed === 0 ? 1 : 0);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, setSpeed, state.speed]);
  
  if (!isStateReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-950">
        <div className="text-white/60">Loading park...</div>
      </div>
    );
  }
  
  // Mobile layout
  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="w-full h-full overflow-hidden bg-background flex flex-col">
          {/* Mobile Top Bar */}
          <CoasterMobileTopBar 
            selectedTile={selectedTile ? state.grid[selectedTile.y][selectedTile.x] : null}
            onCloseTile={() => setSelectedTile(null)}
            onExit={onExit}
          />
          
          {/* Main canvas area - fills remaining space, with padding for top/bottom bars */}
          <div className="flex-1 relative overflow-hidden" style={{ paddingTop: '72px', paddingBottom: '76px' }}>
            <CoasterGrid
              selectedTile={selectedTile}
              setSelectedTile={setSelectedTile}
              isMobile={true}
            />
            
            {/* Multiplayer Players Indicator - Mobile */}
            {isMultiplayer && (
              <div className="absolute top-2 right-2 z-20">
                <div className="bg-emerald-950/90 border border-emerald-800 rounded-lg px-2 py-1.5 shadow-lg">
                  <div className="flex items-center gap-1.5 text-xs text-white">
                    {roomCode && (
                      <>
                        <span className="font-mono tracking-wider">{roomCode}</span>
                        <button
                          onClick={handleCopyRoomLink}
                          className="p-0.5 hover:bg-white/10 rounded transition-colors"
                          title="Copy invite link"
                        >
                          {copiedRoomLink ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-white/60" />
                          )}
                        </button>
                        <span className="text-white/40">•</span>
                      </>
                    )}
                    <div className="flex items-center gap-0.5">
                      {players.map((player, i) => (
                        <div
                          key={player.id}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: player.color }}
                          title={player.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Bottom Toolbar */}
          <CoasterMobileToolbar 
            onOpenPanel={(panel) => setActivePanel(panel)}
          />
          
          {/* Panels - render as fullscreen modals on mobile */}
          <Panels />
        </div>
      </TooltipProvider>
    );
  }

  // Desktop layout
  return (
    <TooltipProvider>
      <div className="w-full h-full min-h-[720px] overflow-hidden bg-background flex">
        {/* Sidebar */}
        <Sidebar onExit={onExit} />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col ml-56">
          {/* Top bar */}
          <TopBar />
          
          {/* Canvas area */}
          <div className="flex-1 relative overflow-visible">
            <CoasterGrid
              selectedTile={selectedTile}
              setSelectedTile={setSelectedTile}
              navigationTarget={navigationTarget}
              onNavigationComplete={() => setNavigationTarget(null)}
              onViewportChange={setViewport}
            />
            
            {/* Minimap */}
            <MiniMap
              onNavigate={(x, y) => setNavigationTarget({ x, y })}
              viewport={viewport}
            />
            
            {/* Multiplayer Players Indicator */}
            {isMultiplayer && (
              <div className="absolute top-4 right-4 z-20">
                <div className="bg-emerald-950/90 border border-emerald-800 rounded-lg px-3 py-2 shadow-lg min-w-[120px]">
                  <div className="flex items-center gap-2 text-sm text-white">
                    {roomCode && (
                      <>
                        <span className="font-mono font-medium tracking-wider">{roomCode}</span>
                        <button
                          onClick={handleCopyRoomLink}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Copy invite link"
                        >
                          {copiedRoomLink ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                        <span className="text-white/40">•</span>
                      </>
                    )}
                    <div className="flex items-center gap-1">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: player.color }}
                          title={player.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panels */}
            <Panels />
          </div>
        </div>
        <CoasterCommandMenu />
      </div>
    </TooltipProvider>
  );
}
