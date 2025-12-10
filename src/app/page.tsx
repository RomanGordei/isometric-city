'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GameProvider } from '@/context/GameContext';
import Game from '@/components/Game';
import { useMobile } from '@/hooks/useMobile';
import { getSpritePack, getSpriteCoords, DEFAULT_SPRITE_PACK_ID } from '@/lib/renderConfig';
import { SavedCityMeta } from '@/types/game';
import { Building2, Train, Plane, Users, Zap, TreePine } from 'lucide-react';

const STORAGE_KEY = 'isocity-game-state';
const SAVED_CITIES_INDEX_KEY = 'isocity-saved-cities-index';

// Background color to filter from sprite sheets (red)
const BACKGROUND_COLOR = { r: 255, g: 0, b: 0 };
const COLOR_THRESHOLD = 155;

// Filter red background from sprite sheet
function filterBackgroundColor(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const distance = Math.sqrt(
      Math.pow(r - BACKGROUND_COLOR.r, 2) +
      Math.pow(g - BACKGROUND_COLOR.g, 2) +
      Math.pow(b - BACKGROUND_COLOR.b, 2)
    );
    
    if (distance <= COLOR_THRESHOLD) {
      data[i + 3] = 0; // Make transparent
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if there's a saved game in localStorage
function hasSavedGame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.grid && parsed.gridSize && parsed.stats;
    }
  } catch {
    return false;
  }
  return false;
}

// Load saved cities index from localStorage
function loadSavedCities(): SavedCityMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(SAVED_CITIES_INDEX_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed as SavedCityMeta[];
      }
    }
  } catch {
    return [];
  }
  return [];
}

// Feature highlights data
const FEATURES = [
  { icon: Building2, label: 'Build', color: 'text-blue-400' },
  { icon: Users, label: 'Grow', color: 'text-green-400' },
  { icon: Train, label: 'Connect', color: 'text-amber-400' },
  { icon: Plane, label: 'Expand', color: 'text-purple-400' },
  { icon: Zap, label: 'Power', color: 'text-yellow-400' },
  { icon: TreePine, label: 'Sustain', color: 'text-emerald-400' },
];

// Floating Sprite component - individual sprite that floats
function FloatingSprite({ 
  spriteKey, 
  coords, 
  filteredSheet, 
  size = 80,
  delay = 0,
  duration = 4,
}: { 
  spriteKey: string;
  coords: { sx: number; sy: number; sw: number; sh: number };
  filteredSheet: HTMLCanvasElement;
  size?: number;
  delay?: number;
  duration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !filteredSheet) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const padding = 8;
    
    // Calculate destination size preserving aspect ratio
    const maxSize = size - padding * 2;
    const aspectRatio = coords.sh / coords.sw;
    let destWidth = maxSize;
    let destHeight = destWidth * aspectRatio;
    
    if (destHeight > maxSize) {
      destHeight = maxSize;
      destWidth = destHeight / aspectRatio;
    }
    
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    
    // Center sprite in canvas
    const drawX = (size - destWidth) / 2;
    const drawY = (size - destHeight) / 2 + destHeight * 0.1;
    
    ctx.drawImage(
      filteredSheet,
      coords.sx, coords.sy, coords.sw, coords.sh,
      Math.round(drawX), Math.round(drawY),
      Math.round(destWidth), Math.round(destHeight)
    );
  }, [filteredSheet, coords, size]);
  
  return (
    <canvas
      ref={canvasRef}
      className="transition-all duration-300 hover:scale-110"
      style={{ 
        imageRendering: 'pixelated',
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
      title={spriteKey}
    />
  );
}

// Animated Sprite Gallery with floating sprites
function AnimatedSpriteGallery({ count = 12, isMobile = false }: { count?: number; isMobile?: boolean }) {
  const [filteredSheet, setFilteredSheet] = useState<HTMLCanvasElement | null>(null);
  const spritePack = useMemo(() => getSpritePack(DEFAULT_SPRITE_PACK_ID), []);
  
  // Get random sprite keys from the sprite order, pre-validated to have valid coords
  const randomSpriteKeys = useMemo(() => {
    const validSpriteKeys = spritePack.spriteOrder.filter(spriteKey => {
      const hasBuildingMapping = Object.values(spritePack.buildingToSprite).includes(spriteKey);
      return hasBuildingMapping;
    });
    const shuffled = shuffleArray([...validSpriteKeys]);
    return shuffled.slice(0, count);
  }, [spritePack.spriteOrder, spritePack.buildingToSprite, count]);
  
  // Load and filter sprite sheet
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const filtered = filterBackgroundColor(img);
      setFilteredSheet(filtered);
    };
    img.src = spritePack.src;
  }, [spritePack.src]);
  
  // Pre-compute sprite data with valid coords
  const spriteData = useMemo(() => {
    if (!filteredSheet) return [];
    
    const sheetWidth = filteredSheet.width;
    const sheetHeight = filteredSheet.height;
    
    return randomSpriteKeys.map((spriteKey, index) => {
      const buildingType = Object.entries(spritePack.buildingToSprite).find(
        ([, value]) => value === spriteKey
      )?.[0] || spriteKey;
      
      const coords = getSpriteCoords(buildingType, sheetWidth, sheetHeight, spritePack);
      return coords ? { 
        spriteKey, 
        coords,
        delay: (index * 0.3) % 3,
        duration: 3 + (index % 3),
      } : null;
    }).filter((item): item is { 
      spriteKey: string; 
      coords: { sx: number; sy: number; sw: number; sh: number };
      delay: number;
      duration: number;
    } => item !== null);
  }, [filteredSheet, randomSpriteKeys, spritePack]);
  
  if (!filteredSheet) return null;
  
  const spriteSize = isMobile ? 64 : 90;
  const cols = isMobile ? 3 : 4;
  
  return (
    <div 
      className="grid gap-2 opacity-90"
      style={{ 
        gridTemplateColumns: `repeat(${cols}, ${spriteSize}px)`,
      }}
    >
      {spriteData.map(({ spriteKey, coords, delay, duration }, index) => (
        <div 
          key={`${spriteKey}-${index}`}
          className="flex items-center justify-center"
        >
          <FloatingSprite
            spriteKey={spriteKey}
            coords={coords}
            filteredSheet={filteredSheet}
            size={spriteSize}
            delay={delay}
            duration={duration}
          />
        </div>
      ))}
    </div>
  );
}

// Feature Badge Component
function FeatureBadge({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 group">
      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
        <Icon className={`w-5 h-5 ${color} transition-transform duration-300 group-hover:scale-110`} />
      </div>
      <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}

// Saved City Card Component
function SavedCityCard({ city, onLoad }: { city: SavedCityMeta; onLoad: () => void }) {
  return (
    <button
      onClick={onLoad}
      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 group"
    >
      <h3 className="text-white font-medium truncate group-hover:text-white/90 text-sm">
        {city.cityName}
      </h3>
      <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
        <span>Pop: {city.population.toLocaleString()}</span>
        <span>${city.money.toLocaleString()}</span>
      </div>
    </button>
  );
}

const SAVED_CITY_PREFIX = 'isocity-city-';

export default function HomePage() {
  const [showGame, setShowGame] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [savedCities, setSavedCities] = useState<SavedCityMeta[]>([]);
  const { isMobileDevice, isSmallScreen } = useMobile();
  const isMobile = isMobileDevice || isSmallScreen;

  // Check for saved game after mount (client-side only)
  useEffect(() => {
    const checkSavedGame = () => {
      setIsChecking(false);
      setSavedCities(loadSavedCities());
      if (hasSavedGame()) {
        setShowGame(true);
      }
    };
    requestAnimationFrame(checkSavedGame);
  }, []);

  // Handle exit from game - refresh saved cities list
  const handleExitGame = () => {
    setShowGame(false);
    setSavedCities(loadSavedCities());
  };

  // Load a saved city
  const loadSavedCity = (cityId: string) => {
    try {
      const saved = localStorage.getItem(SAVED_CITY_PREFIX + cityId);
      if (saved) {
        localStorage.setItem(STORAGE_KEY, saved);
        setShowGame(true);
      }
    } catch {
      console.error('Failed to load saved city');
    }
  };

  // Start game handler
  const handleStart = useCallback(() => setShowGame(true), []);

  // Load example handler
  const handleLoadExample = useCallback(async () => {
    const { default: exampleState } = await import('@/resources/example_state_8.json');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exampleState));
    setShowGame(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showGame || isChecking) return;
      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStart();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGame, isChecking, handleStart]);

  if (isChecking) {
    return (
      <main className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <div className="text-white/40 text-sm tracking-wide">Loading...</div>
        </div>
      </main>
    );
  }

  if (showGame) {
    return (
      <GameProvider>
        <main className="h-screen w-screen overflow-hidden">
          <Game onExit={handleExitGame} />
        </main>
      </GameProvider>
    );
  }

  // Mobile landing page
  if (isMobile) {
    return (
      <main className="min-h-screen hero-gradient flex flex-col items-center justify-center p-4 safe-area-top safe-area-bottom overflow-y-auto">
        {/* Decorative top line */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-6" />
        
        {/* Title */}
        <h1 className="text-5xl font-display font-light tracking-wider text-white/90 mb-2">
          IsoCity
        </h1>
        <p className="text-white/40 text-sm tracking-widest uppercase mb-6">
          Build Your Metropolis
        </p>
        
        {/* Sprite Gallery */}
        <div className="mb-6">
          <AnimatedSpriteGallery count={9} isMobile={true} />
        </div>
        
        {/* Feature Badges */}
        <div className="flex gap-4 mb-6">
          {FEATURES.slice(0, 4).map((feature) => (
            <FeatureBadge key={feature.label} {...feature} />
          ))}
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={handleStart}
            className="w-full py-6 text-xl font-light tracking-wide bg-gradient-to-r from-blue-600/80 to-blue-500/80 hover:from-blue-500/90 hover:to-blue-400/90 text-white border border-blue-400/30 rounded-lg transition-all duration-300 btn-glow"
          >
            Start Building
          </Button>
          
          <Button 
            onClick={handleLoadExample}
            variant="outline"
            className="w-full py-5 text-lg font-light tracking-wide bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15 rounded-lg transition-all duration-300"
          >
            Explore Example City
          </Button>
        </div>
        
        {/* Keyboard hint */}
        <p className="text-white/20 text-xs mt-4 tracking-wide">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/40">Enter</kbd> to start
        </p>
        
        {/* Saved Cities */}
        {savedCities.length > 0 && (
          <div className="w-full max-w-xs mt-6">
            <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-4 h-px bg-white/20" />
              Saved Cities
              <span className="w-4 h-px bg-white/20" />
            </h2>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-hide">
              {savedCities.slice(0, 3).map((city) => (
                <SavedCityCard
                  key={city.id}
                  city={city}
                  onLoad={() => loadSavedCity(city.id)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Decorative bottom line */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mt-6" />
      </main>
    );
  }

  // Desktop landing page
  return (
    <main className="min-h-screen hero-gradient flex items-center justify-center p-8 geo-pattern">
      <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left - Title and Start Button */}
        <div className="flex flex-col items-center lg:items-start justify-center space-y-8 animate-slideInLeft">
          {/* Decorative line */}
          <div className="w-24 h-px bg-gradient-to-r from-blue-500/60 to-transparent hidden lg:block" />
          
          {/* Title Section */}
          <div className="text-center lg:text-left">
            <h1 className="text-8xl font-display font-light tracking-wider text-white/95 mb-3">
              IsoCity
            </h1>
            <p className="text-white/50 text-lg tracking-widest uppercase">
              Build Your Metropolis
            </p>
          </div>
          
          {/* Feature Badges */}
          <div className="flex gap-5 py-4">
            {FEATURES.map((feature) => (
              <FeatureBadge key={feature.label} {...feature} />
            ))}
          </div>
          
          {/* Decorative divider */}
          <div className="deco-divider w-64" />
          
          {/* Buttons */}
          <div className="flex flex-col gap-3 w-72">
            <Button 
              onClick={handleStart}
              className="w-full py-8 text-2xl font-light tracking-wide bg-gradient-to-r from-blue-600/80 to-blue-500/80 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400/30 rounded-lg transition-all duration-300 animate-pulseGlow"
            >
              Start Building
            </Button>
            <Button 
              onClick={handleLoadExample}
              variant="outline"
              className="w-full py-6 text-xl font-light tracking-wide bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/15 rounded-lg transition-all duration-300"
            >
              Explore Example City
            </Button>
          </div>
          
          {/* Keyboard hint */}
          <p className="text-white/25 text-sm tracking-wide">
            Press <kbd className="px-2 py-1 bg-white/10 rounded text-white/40 font-mono text-xs">Enter</kbd> or <kbd className="px-2 py-1 bg-white/10 rounded text-white/40 font-mono text-xs">Space</kbd> to start
          </p>
          
          {/* Saved Cities */}
          {savedCities.length > 0 && (
            <div className="w-72">
              <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-6 h-px bg-white/20" />
                Saved Cities
                <span className="flex-1 h-px bg-white/10" />
              </h2>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-hide">
                {savedCities.slice(0, 4).map((city) => (
                  <SavedCityCard
                    key={city.id}
                    city={city}
                    onLoad={() => loadSavedCity(city.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Animated Sprite Gallery */}
        <div className="flex flex-col items-center lg:items-end gap-6 animate-slideInRight">
          {/* Decorative corner */}
          <div className="hidden lg:flex items-center gap-3 self-end mb-4">
            <span className="text-white/20 text-xs tracking-widest uppercase">Preview</span>
            <div className="w-16 h-px bg-gradient-to-l from-blue-500/40 to-transparent" />
          </div>
          
          {/* Sprite Gallery with glow effect */}
          <div className="relative">
            {/* Glow backdrop */}
            <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
            
            {/* Gallery */}
            <div className="relative p-6 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm">
              <AnimatedSpriteGallery count={12} />
            </div>
          </div>
          
          {/* Decorative text */}
          <p className="text-white/20 text-xs tracking-widest uppercase">
            Cars • Trains • Planes • Citizens
          </p>
        </div>
      </div>
    </main>
  );
}
