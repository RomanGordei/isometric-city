/**
 * Rise of Nations - Settings Panel
 * 
 * Compact settings menu with export/import and debug sprite viewer.
 * Styled to match IsoCity's settings panel.
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AGE_ORDER, Age, AGE_INFO } from '../types/ages';
import { AGE_SPRITE_PACKS } from '../lib/renderConfig';
import { loadSpriteImage, getCachedImage } from '@/components/game/shared';
import { useRoN } from '../context/RoNContext';

interface RoNSettingsPanelProps {
  onClose: () => void;
}

export function RoNSettingsPanel({ onClose }: RoNSettingsPanelProps) {
  const { state, exportState, loadState, resetGame } = useRoN();
  const [activeTab, setActiveTab] = useState<'settings' | 'sprites'>('settings');
  const [loadedAges, setLoadedAges] = useState<Set<Age>>(new Set());
  const canvasRefs = useRef<Map<Age, HTMLCanvasElement>>(new Map());
  
  // Export/Import state
  const [exportCopied, setExportCopied] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Load all age sprite sheets (only when sprites tab is active)
  useEffect(() => {
    if (activeTab !== 'sprites') return;
    
    const loadAllSprites = async () => {
      for (const age of AGE_ORDER) {
        const pack = AGE_SPRITE_PACKS[age];
        try {
          await loadSpriteImage(pack.src, true);
          setLoadedAges(prev => new Set([...prev, age]));
        } catch (error) {
          console.error(`Failed to load ${age} sprites:`, error);
        }
      }
    };
    loadAllSprites();
  }, [activeTab]);
  
  // Render sprites to canvases when loaded
  useEffect(() => {
    if (activeTab !== 'sprites') return;
    
    loadedAges.forEach(age => {
      const canvas = canvasRefs.current.get(age);
      if (!canvas) return;
      
      const pack = AGE_SPRITE_PACKS[age];
      const sprite = getCachedImage(pack.src, true);
      if (!sprite) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Tiny sprite display - scaled way down for compact view
      const tileWidth = sprite.width / pack.cols;
      const tileHeight = sprite.height / pack.rows;
      const displayScale = 0.2; // Very small for overview
      const padding = 1;
      const labelHeight = 6;
      
      canvas.width = (tileWidth * displayScale + padding) * pack.cols + padding;
      canvas.height = (tileHeight * displayScale + padding + labelHeight) * pack.rows + padding;
      
      // Clear canvas
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw each sprite with labels
      for (let row = 0; row < pack.rows; row++) {
        for (let col = 0; col < pack.cols; col++) {
          const sx = col * tileWidth;
          const sy = row * tileHeight;
          
          const dx = padding + col * (tileWidth * displayScale + padding);
          const dy = padding + row * (tileHeight * displayScale + padding + labelHeight);
          
          // Draw sprite
          ctx.drawImage(
            sprite,
            sx, sy, tileWidth, tileHeight,
            dx, dy + labelHeight, tileWidth * displayScale, tileHeight * displayScale
          );
          
          // Draw label (tiny)
          ctx.fillStyle = '#9ca3af';
          ctx.font = '5px monospace';
          ctx.fillText(`${row},${col}`, dx, dy + 5);
          
          // Draw border
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(dx, dy + labelHeight, tileWidth * displayScale, tileHeight * displayScale);
        }
      }
    });
  }, [loadedAges, activeTab]);
  
  const setCanvasRef = (age: Age) => (el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(age, el);
    }
  };
  
  const handleCopyExport = async () => {
    const exported = exportState();
    await navigator.clipboard.writeText(exported);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };
  
  const handleImport = () => {
    setImportError(false);
    setImportSuccess(false);
    if (importValue.trim()) {
      const success = loadState(importValue.trim());
      if (success) {
        setImportSuccess(true);
        setImportValue('');
        setTimeout(() => {
          setImportSuccess(false);
          onClose();
        }, 1000);
      } else {
        setImportError(true);
      }
    }
  };
  
  const handleReset = () => {
    resetGame();
    setShowResetConfirm(false);
    onClose();
  };
  
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        {/* Tab buttons */}
        <div className="flex border-b border-border -mx-6 px-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Game
          </button>
          <button
            onClick={() => setActiveTab('sprites')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sprites'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Sprites
          </button>
        </div>
        
        <div className="space-y-6">
          {activeTab === 'settings' && (
            <>
              {/* Game Info */}
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Game Information</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Grid Size</span>
                    <span className="text-foreground">{state.gridSize} × {state.gridSize}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tick</span>
                    <span className="text-foreground">{state.tick}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Current Age</span>
                    <span className="text-foreground">
                      {state.players.find(p => p.id === state.currentPlayerId)?.age || 'classical'}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Auto-Save</span>
                    <span className="text-green-400">Enabled</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Export */}
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Export Game</div>
                <p className="text-muted-foreground text-xs mb-2">Copy your game state to share or backup</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopyExport}
                >
                  {exportCopied ? '✓ Copied!' : 'Copy Game State'}
                </Button>
              </div>
              
              {/* Import */}
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Import Game</div>
                <p className="text-muted-foreground text-xs mb-2">Paste a game state to load it</p>
                <textarea
                  className="w-full h-20 bg-background border border-border rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Paste game state here..."
                  value={importValue}
                  onChange={(e) => {
                    setImportValue(e.target.value);
                    setImportError(false);
                    setImportSuccess(false);
                  }}
                />
                {importError && (
                  <p className="text-red-400 text-xs mt-1">Invalid game state. Please check and try again.</p>
                )}
                {importSuccess && (
                  <p className="text-green-400 text-xs mt-1">Game loaded successfully!</p>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleImport}
                  disabled={!importValue.trim()}
                >
                  Load Game State
                </Button>
              </div>
              
              <Separator />
              
              {/* Reset */}
              {!showResetConfirm ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowResetConfirm(true)}
                >
                  Start New Game
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm text-center">Are you sure? This will reset all progress.</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'sprites' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Building sprites from each age. Format: row,col
              </p>
              
              {AGE_ORDER.map(age => {
                const pack = AGE_SPRITE_PACKS[age];
                const ageInfo = AGE_INFO[age];
                const isLoaded = loadedAges.has(age);
                
                return (
                  <div key={age} className="space-y-1">
                    <h3 className="text-xs font-bold" style={{ color: ageInfo.color }}>
                      {ageInfo.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {pack.cols}×{pack.rows} sprites
                    </p>
                    
                    {isLoaded ? (
                      <div className="overflow-x-auto border rounded bg-slate-900 p-1">
                        <canvas
                          ref={setCanvasRef(age)}
                          className="block"
                        />
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center border rounded bg-slate-900">
                        <span className="text-muted-foreground text-xs">Loading...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
