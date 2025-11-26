'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GameProvider } from '@/context/GameContext';
import Game from '@/components/Game';

// Art Deco Decorative Corner Component
function DecoCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotations = {
    tl: 'rotate-0',
    tr: 'rotate-90',
    br: 'rotate-180',
    bl: '-rotate-90'
  };
  const positions = {
    tl: 'top-0 left-0',
    tr: 'top-0 right-0',
    bl: 'bottom-0 left-0',
    br: 'bottom-0 right-0'
  };
  
  return (
    <svg 
      className={`absolute w-12 h-12 text-primary/40 ${positions[position]} ${rotations[position]}`}
      viewBox="0 0 48 48" 
      fill="none"
    >
      <path d="M0 0 L24 0 L24 4 L4 4 L4 24 L0 24 Z" fill="currentColor" />
      <path d="M8 8 L16 8 L16 10 L10 10 L10 16 L8 16 Z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// Art Deco Sunburst Element
function Sunburst({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full opacity-10">
        <defs>
          <radialGradient id="sunburstGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(43, 74%, 49%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(43, 74%, 49%)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 24 }, (_, i) => (
          <line
            key={i}
            x1="100"
            y1="100"
            x2="100"
            y2="0"
            stroke="url(#sunburstGrad)"
            strokeWidth="2"
            transform={`rotate(${i * 15} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="20" fill="hsl(43, 74%, 49%)" opacity="0.3" />
      </svg>
    </div>
  );
}

// Art Deco Divider
function DecoDivider() {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary/60 rotate-45" />
        <div className="w-3 h-3 bg-primary rotate-45" />
        <div className="w-2 h-2 bg-primary/60 rotate-45" />
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}

// Isometric building SVG for hero - Updated with Art Deco style
function IsometricCity() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}>
      <defs>
        <linearGradient id="grass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2d4a3f" />
          <stop offset="100%" stopColor="#1d3634" />
        </linearGradient>
        <linearGradient id="residential" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="commercial" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(173, 58%, 50%)" />
          <stop offset="100%" stopColor="hsl(173, 58%, 39%)" />
        </linearGradient>
        <linearGradient id="industrial" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(43, 74%, 55%)" />
          <stop offset="100%" stopColor="hsl(43, 74%, 40%)" />
        </linearGradient>
        <linearGradient id="goldShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(43, 74%, 65%)" />
          <stop offset="50%" stopColor="hsl(48, 90%, 70%)" />
          <stop offset="100%" stopColor="hsl(43, 74%, 45%)" />
        </linearGradient>
      </defs>
      
      {/* Ground tiles */}
      <polygon points="200,250 280,210 200,170 120,210" fill="url(#grass)" />
      <polygon points="280,210 360,170 280,130 200,170" fill="url(#grass)" />
      <polygon points="120,210 200,170 120,130 40,170" fill="url(#grass)" />
      <polygon points="200,170 280,130 200,90 120,130" fill="url(#grass)" />
      
      {/* Residential building */}
      <g transform="translate(40, 100)">
        <polygon points="40,70 80,50 80,20 40,40" fill="#22c55e" />
        <polygon points="0,50 40,70 40,40 0,20" fill="#16a34a" />
        <polygon points="0,20 40,40 80,20 40,0" fill="#4ade80" />
        <rect x="10" y="25" width="8" height="8" fill="#fef08a" opacity="0.8" />
        <rect x="25" y="25" width="8" height="8" fill="#fef08a" opacity="0.8" />
        <rect x="10" y="38" width="8" height="8" fill="#fef08a" opacity="0.8" />
      </g>
      
      {/* Art Deco Commercial building (tall with gold accents) */}
      <g transform="translate(200, 30)">
        <polygon points="40,140 80,120 80,30 40,50" fill="hsl(173, 58%, 40%)" />
        <polygon points="0,120 40,140 40,50 0,30" fill="hsl(173, 58%, 35%)" />
        <polygon points="0,30 40,50 80,30 40,10" fill="hsl(173, 58%, 50%)" />
        {/* Gold Art Deco accent lines */}
        <line x1="0" y1="30" x2="40" y2="50" stroke="hsl(43, 74%, 55%)" strokeWidth="2" />
        <line x1="40" y1="50" x2="80" y2="30" stroke="hsl(43, 74%, 55%)" strokeWidth="2" />
        <line x1="40" y1="10" x2="40" y2="50" stroke="hsl(43, 74%, 55%)" strokeWidth="1" />
        {/* Windows */}
        {[0, 20, 40, 60, 80].map((y, i) => (
          <g key={i}>
            <rect x="48" y={40 + y} width="6" height="8" fill="#c9e6ff" opacity="0.9" />
            <rect x="60" y={40 + y} width="6" height="8" fill="#c9e6ff" opacity="0.9" />
          </g>
        ))}
        {/* Gold spire */}
        <polygon points="40,10 44,10 42,0" fill="url(#goldShine)" />
      </g>
      
      {/* Industrial building with gold accents */}
      <g transform="translate(280, 80)">
        <polygon points="30,80 60,65 60,35 30,50" fill="hsl(43, 74%, 45%)" />
        <polygon points="0,65 30,80 30,50 0,35" fill="hsl(38, 70%, 35%)" />
        <polygon points="0,35 30,50 60,35 30,20" fill="hsl(43, 74%, 55%)" />
        {/* Smokestack */}
        <rect x="40" y="5" width="8" height="30" fill="#4a5568" />
        <ellipse cx="44" cy="5" rx="4" ry="2" fill="#718096" />
        {/* Smoke */}
        <ellipse cx="44" cy="-5" rx="6" ry="4" fill="#a0aec0" opacity="0.5">
          <animate attributeName="cy" values="-5;-15;-5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
        </ellipse>
      </g>
      
      {/* Trees */}
      <g transform="translate(100, 170)">
        <rect x="8" y="15" width="4" height="10" fill="#78350f" />
        <ellipse cx="10" cy="12" rx="8" ry="10" fill="#22c55e" />
      </g>
      <g transform="translate(300, 180)">
        <rect x="8" y="15" width="4" height="10" fill="#78350f" />
        <ellipse cx="10" cy="12" rx="8" ry="10" fill="#16a34a" />
      </g>
      
      {/* Roads with gold lane markers */}
      <polygon points="200,250 220,240 200,230 180,240" fill="#374151" />
      <line x1="200" y1="235" x2="200" y2="245" stroke="hsl(43, 74%, 55%)" strokeWidth="1" strokeDasharray="3,3" />
    </svg>
  );
}

// Animated stats display with Art Deco styling
function AnimatedStat({ label, value, color, delay = 0 }: { label: string; value: string; color: string; delay?: number }) {
  return (
    <div 
      className="text-center relative animate-fadeIn"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`text-4xl font-display font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-2 uppercase tracking-[0.2em]">{label}</div>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </div>
  );
}

// Feature card component with Art Deco styling
function FeatureCard({ icon, title, description, delay = 0 }: { icon: React.ReactNode; title: string; description: string; delay?: number }) {
  return (
    <div 
      className="relative group animate-fadeIn"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card className="h-full transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 overflow-visible">
        <DecoCorner position="tl" />
        <DecoCorner position="br" />
        <CardHeader className="relative z-10">
          <div className="w-14 h-14 mb-3 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/10 rotate-45 group-hover:bg-primary/20 transition-colors" />
            <span className="relative text-primary">{icon}</span>
          </div>
          <CardTitle className="text-lg font-display">{title}</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

// Icons for features
function ZoneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function SimulationIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" />
      <path d="M18 9l-5 5-4-4-5 5" />
    </svg>
  );
}

const STORAGE_KEY = 'isocity-game-state';

// Check if there's a saved game in localStorage
function hasSavedGame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.grid && parsed.gridSize && parsed.stats;
    }
  } catch (e) {
    return false;
  }
  return false;
}

export default function HomePage() {
  const [showGame, setShowGame] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);
  const [cityName, setCityName] = useState('New City');
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing game on mount and auto-load if exists
  useEffect(() => {
    if (hasSavedGame()) {
      // Auto-load into game if there's a saved state
      setShowGame(true);
    }
    setIsLoading(false);
  }, []);

  // Animated population counter
  const [animatedPop, setAnimatedPop] = useState(0);
  useEffect(() => {
    if (showGame || isLoading) return; // Don't animate if showing game or loading
    const target = 1000000;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedPop(target);
        clearInterval(timer);
      } else {
        setAnimatedPop(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [showGame, isLoading]);

  // Show loading state briefly
  if (isLoading) {
    return (
      <main className="min-h-screen hero-gradient flex items-center justify-center geo-pattern">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-primary/20 rotate-45 animate-pulse" />
            <div className="absolute inset-2 bg-gradient-to-br from-primary to-primary/70 rotate-45 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground -rotate-45">
                <polygon points="12,2 22,8 12,14 2,8" />
                <polygon points="2,8 12,14 12,22 2,16" opacity="0.7" />
                <polygon points="22,8 12,14 12,22 22,16" opacity="0.4" />
              </svg>
            </div>
          </div>
          <p className="text-muted-foreground uppercase tracking-[0.3em] text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  if (showGame) {
    return (
      <GameProvider>
        <main className="h-screen w-screen overflow-hidden">
          <Game />
        </main>
      </GameProvider>
    );
  }

  return (
    <main className="min-h-screen hero-gradient overflow-hidden relative">
      {/* Art Deco Background Elements */}
      <div className="absolute inset-0 geo-pattern opacity-50" />
      <Sunburst className="-top-20 -left-20 w-96 h-96" />
      <Sunburst className="-bottom-32 -right-32 w-[500px] h-[500px]" />
      
      {/* Decorative Gold Lines */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Header */}
      <header className="relative z-10 py-6 px-8 border-b border-primary/20">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary to-primary/70 rotate-45 flex items-center justify-center shadow-lg shadow-primary/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground -rotate-45">
                <polygon points="12,2 22,8 12,14 2,8" />
                <polygon points="2,8 12,14 12,22 2,16" opacity="0.7" />
                <polygon points="22,8 12,14 12,22 22,16" opacity="0.4" />
              </svg>
            </div>
            <span className="text-2xl font-display font-bold tracking-[0.15em] text-gold">ISOCITY</span>
          </div>
          <div className="flex items-center gap-6">
            <Badge className="bg-primary/20 text-primary border border-primary/30 font-display tracking-wider">
              v1.0
            </Badge>
            <Button variant="ghost" onClick={() => setShowGame(true)} className="font-display">
              Continue Game
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Text */}
          <div className="space-y-10">
            <div className="space-y-6">
              <Badge className="bg-primary/10 text-primary border border-primary/20 uppercase tracking-[0.25em] text-xs py-1.5 px-4">
                Isometric City Builder
              </Badge>
              <h1 className="text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1]">
                Build Your
                <br />
                <span className="text-gold">Metropolis</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Zone districts, manage resources, and watch your gleaming city rise in this elegant isometric builder. 
                Balance budgets, provide services, and create prosperity.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button 
                variant="gold"
                size="xl"
                className="font-display"
                onClick={() => setShowNewGame(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-3">
                  <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                </svg>
                New City
              </Button>
              <Button 
                size="xl" 
                variant="outline" 
                className="font-display"
                onClick={() => setShowGame(true)}
              >
                Continue Playing
              </Button>
            </div>

            {/* Quick stats with Art Deco styling */}
            <div className="pt-10">
              <div className="deco-divider mb-8" />
              <div className="grid grid-cols-3 gap-8">
                <AnimatedStat label="Max Population" value={animatedPop.toLocaleString()} color="text-green-400" delay={0} />
                <AnimatedStat label="Building Types" value="25+" color="text-accent" delay={100} />
                <AnimatedStat label="Achievements" value="10" color="text-primary" delay={200} />
              </div>
            </div>
          </div>

          {/* Right - Isometric illustration */}
          <div className="relative">
            <div className="absolute inset-0 -m-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
            </div>
            <div className="relative animate-float">
              <IsometricCity />
            </div>
            {/* Decorative frame */}
            <div className="absolute -inset-8 border border-primary/10 pointer-events-none">
              <DecoCorner position="tl" />
              <DecoCorner position="tr" />
              <DecoCorner position="bl" />
              <DecoCorner position="br" />
            </div>
          </div>
        </div>
      </section>

      <DecoDivider />

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4 text-gold">City Building Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build and manage a thriving metropolis
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<ZoneIcon />}
            title="Zoning System"
            description="Zone residential, commercial, and industrial areas. Watch buildings grow based on demand."
            delay={0}
          />
          <FeatureCard
            icon={<SimulationIcon />}
            title="Live Simulation"
            description="Dynamic simulation with population growth, job markets, and evolving buildings."
            delay={100}
          />
          <FeatureCard
            icon={<ServiceIcon />}
            title="City Services"
            description="Build police, fire, hospitals, and schools. Manage coverage to keep citizens safe."
            delay={200}
          />
          <FeatureCard
            icon={<ChartIcon />}
            title="Economy & Stats"
            description="Balance budgets, adjust taxes, and track historical statistics and achievements."
            delay={300}
          />
        </div>
      </section>

      {/* Zone types showcase with Art Deco styling */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { color: 'green', name: 'Residential', description: 'Houses and apartments for your citizens. From small homes to towering high-rises.' },
            { color: 'teal', name: 'Commercial', description: 'Shops, offices, and malls providing jobs and services. Essential for a thriving economy.' },
            { color: 'amber', name: 'Industrial', description: 'Factories and warehouses creating jobs. Be mindful of pollution affecting nearby areas.' },
          ].map((zone, i) => (
            <Card 
              key={zone.name}
              className={`group transition-all duration-300 hover:scale-[1.02] animate-fadeIn border-${zone.color === 'teal' ? 'accent' : zone.color}-500/30 hover:border-${zone.color === 'teal' ? 'accent' : zone.color}-500/50`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rotate-45 ${
                    zone.color === 'green' ? 'bg-green-500' : 
                    zone.color === 'teal' ? 'bg-accent' : 
                    'bg-amber-500'
                  } shadow-lg ${
                    zone.color === 'green' ? 'shadow-green-500/30' : 
                    zone.color === 'teal' ? 'shadow-accent/30' : 
                    'shadow-amber-500/30'
                  }`} />
                  <CardTitle className={`font-display ${
                    zone.color === 'green' ? 'text-green-400' : 
                    zone.color === 'teal' ? 'text-accent' : 
                    'text-amber-400'
                  }`}>{zone.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {zone.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-8 border-t border-primary/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="font-display tracking-wider">Built with Next.js, React & TypeScript</div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-primary/50 rotate-45" />
            <span>Drag to place • Alt+Drag to pan • Scroll to zoom</span>
            <span className="w-1 h-1 bg-primary/50 rotate-45" />
          </div>
        </div>
      </footer>

      {/* New Game Dialog with Art Deco styling */}
      <Dialog open={showNewGame} onOpenChange={setShowNewGame}>
        <DialogContent className="sm:max-w-[450px] border-primary/30">
          <div className="absolute inset-0 geo-pattern opacity-30 pointer-events-none" />
          <DecoCorner position="tl" />
          <DecoCorner position="br" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-display text-gold">Start New City</DialogTitle>
            <DialogDescription>
              Configure your new city and begin building your metropolis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6 relative z-10">
            <div className="space-y-3">
              <Label htmlFor="cityName" className="uppercase tracking-wider text-xs">City Name</Label>
              <Input
                id="cityName"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Enter city name..."
                className="h-12 font-display text-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 relative z-10">
            <Button variant="outline" onClick={() => setShowNewGame(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={() => {
              setShowNewGame(false);
              setShowGame(true);
            }}>
              Start Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
