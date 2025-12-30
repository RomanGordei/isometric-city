/**
 * Enhanced Graphics System for Isometric City Builder
 * 
 * Provides high-fidelity terrain, water, lighting, and effects rendering.
 * Uses procedural noise for natural-looking textures and modern canvas techniques
 * for beautiful, realistic visuals.
 * 
 * Key Features:
 * - Procedural terrain with noise-based grass textures
 * - Animated water with depth, waves, reflections, and caustics
 * - Realistic beaches with sand gradients, foam, and wave lines
 * - Enhanced forest rendering with procedural trees
 * - Mountain terrain with rock textures and snow caps
 * - Dynamic particle systems for environmental effects
 * - Ambient occlusion and shadow rendering
 */

import { createNoise2D, NoiseFunction2D } from 'simplex-noise';
import { TILE_WIDTH, TILE_HEIGHT } from './types';

// ============================================================================
// NOISE GENERATORS (initialized lazily for performance)
// ============================================================================

let terrainNoise: NoiseFunction2D | null = null;
let grassDetailNoise: NoiseFunction2D | null = null;
let waterNoise: NoiseFunction2D | null = null;
let waveNoise: NoiseFunction2D | null = null;
let sandNoise: NoiseFunction2D | null = null;
let rockNoise: NoiseFunction2D | null = null;
let foliageNoise: NoiseFunction2D | null = null;

function getTerrainNoise(): NoiseFunction2D {
  if (!terrainNoise) terrainNoise = createNoise2D();
  return terrainNoise;
}

function getGrassDetailNoise(): NoiseFunction2D {
  if (!grassDetailNoise) grassDetailNoise = createNoise2D();
  return grassDetailNoise;
}

function getWaterNoise(): NoiseFunction2D {
  if (!waterNoise) waterNoise = createNoise2D();
  return waterNoise;
}

function getWaveNoise(): NoiseFunction2D {
  if (!waveNoise) waveNoise = createNoise2D();
  return waveNoise;
}

function getSandNoise(): NoiseFunction2D {
  if (!sandNoise) sandNoise = createNoise2D();
  return sandNoise;
}

function getRockNoise(): NoiseFunction2D {
  if (!rockNoise) rockNoise = createNoise2D();
  return rockNoise;
}

function getFoliageNoise(): NoiseFunction2D {
  if (!foliageNoise) foliageNoise = createNoise2D();
  return foliageNoise;
}

// ============================================================================
// REALISTIC COLOR PALETTES
// ============================================================================

/** Realistic grass colors - natural earth tones, not cartoon green */
export const REALISTIC_GRASS_PALETTE = {
  // Base grass colors - natural olive/sage greens
  base: { h: 85, s: 32, l: 42 },
  light: { h: 78, s: 35, l: 52 },
  dark: { h: 92, s: 28, l: 32 },
  warmAccent: { h: 65, s: 38, l: 48 }, // Warm yellow-green patches
  coolAccent: { h: 110, s: 25, l: 38 }, // Cool blue-green areas
  // Dirt/earth showing through
  dirt: { h: 35, s: 30, l: 35 },
  // Dry grass patches
  dryGrass: { h: 50, s: 40, l: 55 },
  // Stroke colors for tile edges
  stroke: 'rgba(40, 50, 30, 0.2)',
  strokeDark: 'rgba(30, 40, 20, 0.35)',
};

/** Realistic water colors - natural blues with depth variation */
export const REALISTIC_WATER_PALETTE = {
  // Deep ocean water
  deep: { h: 205, s: 55, l: 28 },
  // Mid-depth water
  mid: { h: 198, s: 50, l: 42 },
  // Shallow water near shores
  shallow: { h: 188, s: 42, l: 55 },
  // Very shallow/sandy bottom visible
  veryShallow: { h: 180, s: 35, l: 62 },
  // Sun reflections/highlights
  highlight: { h: 195, s: 15, l: 85 },
  // Sparkles
  sparkle: '#ffffff',
  // Foam/whitecaps
  foam: { h: 195, s: 10, l: 92 },
  // Wave shadows
  waveShadow: { h: 210, s: 40, l: 22 },
  // Caustic light patterns (underwater light)
  caustic: { h: 185, s: 30, l: 70 },
};

/** Realistic sand/beach colors */
export const REALISTIC_SAND_PALETTE = {
  // Dry sand
  dry: { h: 40, s: 35, l: 72 },
  // Wet sand near water
  wet: { h: 35, s: 38, l: 48 },
  // Dark wet sand
  darkWet: { h: 30, s: 30, l: 38 },
  // Sandy underwater
  underwater: { h: 42, s: 30, l: 55 },
  // Foam on wet sand
  foam: { h: 45, s: 8, l: 90 },
  // Shell/debris specks
  shell: { h: 32, s: 20, l: 78 },
};

/** Forest/tree colors */
export const REALISTIC_FOREST_PALETTE = {
  // Tree canopy
  canopy: { h: 125, s: 40, l: 28 },
  canopyLight: { h: 115, s: 45, l: 38 },
  canopyShadow: { h: 135, s: 35, l: 18 },
  // Undergrowth
  undergrowth: { h: 95, s: 35, l: 32 },
  // Tree trunks
  trunk: { h: 25, s: 35, l: 28 },
  trunkShadow: { h: 22, s: 30, l: 18 },
};

/** Mountain/rock colors */
export const REALISTIC_MOUNTAIN_PALETTE = {
  // Rock faces
  rock: { h: 220, s: 8, l: 50 },
  rockLight: { h: 215, s: 6, l: 62 },
  rockDark: { h: 225, s: 12, l: 35 },
  // Snow caps
  snow: { h: 205, s: 8, l: 92 },
  snowShadow: { h: 210, s: 15, l: 78 },
  // Metal ore deposits
  ore: { h: 35, s: 50, l: 35 },
  oreShine: { h: 42, s: 55, l: 55 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Convert HSL to CSS color string */
function hsl(h: number, s: number, l: number, a = 1): string {
  return a === 1 ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

/** Lerp between two values */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** Smooth step interpolation */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Get octave noise for more natural patterns */
function octaveNoise(
  noise: NoiseFunction2D,
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  scale: number
): number {
  let total = 0;
  let frequency = scale;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

/** Seeded pseudo-random number generator */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999.9) * 99999;
  return x - Math.floor(x);
}

// ============================================================================
// ENHANCED TERRAIN RENDERING
// ============================================================================

/**
 * Render realistic grass terrain with procedural texturing
 */
export function drawRealisticGrassTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  time: number = 0,
  options: {
    ambient?: number;
    highlight?: boolean;
    selected?: boolean;
    zoneType?: 'none' | 'residential' | 'commercial' | 'industrial';
  } = {}
): void {
  const { ambient = 1.0, zoneType = 'none' } = options;
  const noise = getTerrainNoise();
  const detailNoise = getGrassDetailNoise();

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  // Get procedural color variation based on position
  const colorNoise = octaveNoise(noise, gridX * 0.3, gridY * 0.3, 3, 0.5, 0.08);
  const detailVal = octaveNoise(detailNoise, gridX * 1.5, gridY * 1.5, 2, 0.6, 0.2);
  const patchNoise = octaveNoise(noise, gridX * 0.8, gridY * 0.8, 2, 0.4, 0.15);

  // Calculate base HSL values with noise for natural variation
  const pal = REALISTIC_GRASS_PALETTE;
  
  // Mix between cool and warm grass tones
  const warmCoolMix = (colorNoise + 1) / 2;
  let baseH = lerp(pal.coolAccent.h, pal.warmAccent.h, warmCoolMix);
  let baseS = lerp(pal.dark.s, pal.light.s, (detailVal + 1) / 2);
  let baseL = lerp(pal.dark.l, pal.light.l, (colorNoise + 1) / 2);

  // Add dry grass patches where patchNoise is high
  if (patchNoise > 0.4) {
    const dryMix = smoothstep(0.4, 0.7, patchNoise);
    baseH = lerp(baseH, pal.dryGrass.h, dryMix * 0.4);
    baseS = lerp(baseS, pal.dryGrass.s, dryMix * 0.3);
    baseL = lerp(baseL, pal.dryGrass.l, dryMix * 0.25);
  }

  // Add dirt patches where noise is very low
  if (patchNoise < -0.35) {
    const dirtMix = smoothstep(-0.35, -0.6, patchNoise);
    baseH = lerp(baseH, pal.dirt.h, dirtMix * 0.35);
    baseS = lerp(baseS, pal.dirt.s, dirtMix * 0.4);
    baseL = lerp(baseL, pal.dirt.l, dirtMix * 0.3);
  }

  // Apply ambient lighting
  const finalL = baseL * ambient;

  // Create subtle gradient for depth
  const gradient = ctx.createLinearGradient(
    screenX, screenY + h * 0.3,
    screenX + w, screenY + h * 0.7
  );
  
  // Add subtle light direction (top-left to bottom-right)
  gradient.addColorStop(0, hsl(baseH + 3, baseS - 3, finalL + 4));
  gradient.addColorStop(0.5, hsl(baseH, baseS, finalL));
  gradient.addColorStop(1, hsl(baseH - 2, baseS + 2, finalL - 6));

  // Draw base tile
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(cx, screenY);
  ctx.lineTo(screenX + w, cy);
  ctx.lineTo(cx, screenY + h);
  ctx.lineTo(screenX, cy);
  ctx.closePath();
  ctx.fill();

  // Add texture details when zoomed in enough
  if (zoom >= 0.5) {
    // Draw subtle grass texture strokes
    const numStrokes = zoom >= 0.8 ? 12 : 6;
    ctx.save();
    
    // Clip to tile shape
    ctx.beginPath();
    ctx.moveTo(cx, screenY);
    ctx.lineTo(screenX + w, cy);
    ctx.lineTo(cx, screenY + h);
    ctx.lineTo(screenX, cy);
    ctx.closePath();
    ctx.clip();

    for (let i = 0; i < numStrokes; i++) {
      const seed = gridX * 127 + gridY * 311 + i * 17;
      const randX = seededRandom(seed) * 0.8 + 0.1;
      const randY = seededRandom(seed + 100) * 0.8 + 0.1;
      const randLen = seededRandom(seed + 200) * 4 + 2;
      const randAngle = seededRandom(seed + 300) * 0.6 - 0.3;
      
      const strokeX = screenX + w * randX;
      const strokeY = screenY + h * randY;
      
      // Draw a tiny grass blade
      ctx.strokeStyle = hsl(baseH + seededRandom(seed + 400) * 15 - 7, 
                            baseS - 5, 
                            finalL + seededRandom(seed + 500) * 10 - 5, 
                            0.4);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(strokeX, strokeY);
      ctx.lineTo(strokeX + Math.cos(randAngle - 1.57) * randLen, 
                 strokeY + Math.sin(randAngle - 1.57) * randLen * 0.5);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // Draw subtle tile edge shadow for depth when zoomed in
  if (zoom >= 0.6) {
    ctx.strokeStyle = pal.strokeDark;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, screenY);
    ctx.lineTo(screenX + w, cy);
    ctx.lineTo(cx, screenY + h);
    ctx.lineTo(screenX, cy);
    ctx.closePath();
    ctx.stroke();
  }

  // Draw zone indicator if applicable
  if (zoneType !== 'none' && zoom >= 0.8) {
    const zoneColors: Record<string, string> = {
      residential: 'rgba(34, 197, 94, 0.25)',
      commercial: 'rgba(59, 130, 246, 0.25)',
      industrial: 'rgba(245, 158, 11, 0.25)',
    };
    
    ctx.fillStyle = zoneColors[zoneType] || 'transparent';
    ctx.beginPath();
    ctx.moveTo(cx, screenY);
    ctx.lineTo(screenX + w, cy);
    ctx.lineTo(cx, screenY + h);
    ctx.lineTo(screenX, cy);
    ctx.closePath();
    ctx.fill();
  }
}

// ============================================================================
// ENHANCED WATER RENDERING
// ============================================================================

/**
 * Render realistic animated water with depth, waves, and reflections
 */
export function drawRealisticWaterTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  time: number,
  waterDepth: number = 0.5, // 0 = shallow, 1 = deep
  adjacentWater: { north: boolean; east: boolean; south: boolean; west: boolean } = { north: true, east: true, south: true, west: true }
): void {
  const waterNoiseFn = getWaterNoise();
  const waveNoiseFn = getWaveNoise();

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  const pal = REALISTIC_WATER_PALETTE;

  // Calculate depth-based base color
  const depthT = waterDepth;
  let baseH = lerp(pal.shallow.h, pal.deep.h, depthT);
  let baseS = lerp(pal.shallow.s, pal.deep.s, depthT);
  let baseL = lerp(pal.shallow.l, pal.deep.l, depthT);

  // Add wave motion
  const waveOffset = time * 0.5;
  const waveVal = octaveNoise(waveNoiseFn, gridX * 0.5 + waveOffset, gridY * 0.5 + waveOffset * 0.7, 2, 0.5, 0.1);
  
  // Wave affects lightness
  baseL += waveVal * 5;

  // Create radial gradient for depth effect
  const gradient = ctx.createRadialGradient(
    cx, cy, 0,
    cx, cy, w * 0.6
  );
  
  // Center is lighter (sun reflection), edges darker
  gradient.addColorStop(0, hsl(baseH - 5, baseS - 10, baseL + 8));
  gradient.addColorStop(0.5, hsl(baseH, baseS, baseL));
  gradient.addColorStop(1, hsl(baseH + 3, baseS + 5, baseL - 8));

  // Draw base water
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(cx, screenY);
  ctx.lineTo(screenX + w, cy);
  ctx.lineTo(cx, screenY + h);
  ctx.lineTo(screenX, cy);
  ctx.closePath();
  ctx.fill();

  // Add wave patterns when zoomed in
  if (zoom >= 0.4) {
    ctx.save();
    
    // Clip to tile
    ctx.beginPath();
    ctx.moveTo(cx, screenY);
    ctx.lineTo(screenX + w, cy);
    ctx.lineTo(cx, screenY + h);
    ctx.lineTo(screenX, cy);
    ctx.closePath();
    ctx.clip();

    // Draw animated wave lines
    const numWaves = zoom >= 0.7 ? 5 : 3;
    const waveSpacing = h / (numWaves + 1);
    
    for (let i = 0; i < numWaves; i++) {
      const waveY = screenY + waveSpacing * (i + 1);
      const wavePhase = time * 0.8 + gridX * 0.5 + gridY * 0.3 + i * 0.7;
      const waveAmplitude = 2 + Math.sin(wavePhase) * 1.5;
      
      ctx.strokeStyle = hsl(pal.highlight.h, pal.highlight.s, pal.highlight.l, 0.15 + Math.sin(wavePhase) * 0.05);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      
      for (let x = screenX; x <= screenX + w; x += 4) {
        const localPhase = wavePhase + (x - screenX) * 0.05;
        const yOffset = Math.sin(localPhase) * waveAmplitude;
        if (x === screenX) {
          ctx.moveTo(x, waveY + yOffset);
        } else {
          ctx.lineTo(x, waveY + yOffset);
        }
      }
      ctx.stroke();
    }

    // Add sparkle reflections when zoomed in
    if (zoom >= 0.6) {
      const numSparkles = Math.floor(3 + zoom * 2);
      
      for (let i = 0; i < numSparkles; i++) {
        const seed = gridX * 199 + gridY * 397 + i * 53;
        const sparklePhase = time * 2 + seededRandom(seed) * 10;
        const sparkleOpacity = Math.max(0, Math.sin(sparklePhase) * 0.6);
        
        if (sparkleOpacity > 0.1) {
          const sparkleX = screenX + seededRandom(seed + 1) * w;
          const sparkleY = screenY + seededRandom(seed + 2) * h;
          const sparkleSize = 1 + seededRandom(seed + 3) * 2;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${sparkleOpacity})`;
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw caustic light patterns underwater
    if (zoom >= 0.5) {
      const causticScale = 0.15;
      const causticTime = time * 0.3;
      
      for (let i = 0; i < 4; i++) {
        const seed = gridX * 137 + gridY * 251 + i * 31;
        const causticX = screenX + seededRandom(seed) * w;
        const causticY = screenY + seededRandom(seed + 1) * h;
        const causticNoise = octaveNoise(waterNoiseFn, causticX * causticScale + causticTime, causticY * causticScale + causticTime * 0.7, 2, 0.5, 0.1);
        
        if (causticNoise > 0.2) {
          const causticAlpha = (causticNoise - 0.2) * 0.3;
          const causticRadius = 4 + causticNoise * 6;
          
          ctx.fillStyle = hsl(pal.caustic.h, pal.caustic.s, pal.caustic.l, causticAlpha);
          ctx.beginPath();
          ctx.arc(causticX, causticY, causticRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // Draw subtle tile edge for visibility
  if (zoom >= 0.5) {
    ctx.strokeStyle = hsl(pal.deep.h, pal.deep.s, pal.deep.l - 10, 0.2);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, screenY);
    ctx.lineTo(screenX + w, cy);
    ctx.lineTo(cx, screenY + h);
    ctx.lineTo(screenX, cy);
    ctx.closePath();
    ctx.stroke();
  }
}

// ============================================================================
// ENHANCED BEACH RENDERING
// ============================================================================

/**
 * Draw realistic beach/shore on land tiles adjacent to water
 */
export function drawRealisticBeach(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  time: number,
  adjacentWater: { north: boolean; east: boolean; south: boolean; west: boolean }
): void {
  const { north, east, south, west } = adjacentWater;
  if (!north && !east && !south && !west) return;

  const sandNoiseFn = getSandNoise();
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const pal = REALISTIC_SAND_PALETTE;

  // Beach strip width
  const beachWidth = w * 0.15;
  
  // Get diamond corners
  const corners = {
    top: { x: screenX + w / 2, y: screenY },
    right: { x: screenX + w, y: screenY + h / 2 },
    bottom: { x: screenX + w / 2, y: screenY + h },
    left: { x: screenX, y: screenY + h / 2 },
  };

  ctx.save();

  // Draw beach strip for each edge facing water
  const drawBeachEdge = (
    startCorner: { x: number; y: number },
    endCorner: { x: number; y: number },
    inwardDx: number,
    inwardDy: number,
    edgeName: string
  ) => {
    // Create gradient from sand to grass
    const sandNoise = octaveNoise(sandNoiseFn, gridX + screenX * 0.01, gridY + screenY * 0.01, 2, 0.5, 0.1);
    
    const dryL = pal.dry.l + sandNoise * 5;
    const wetL = pal.wet.l + sandNoise * 3;
    
    // Create gradient perpendicular to edge
    const midX = (startCorner.x + endCorner.x) / 2;
    const midY = (startCorner.y + endCorner.y) / 2;
    const gradient = ctx.createLinearGradient(
      midX, midY,
      midX + inwardDx * beachWidth, midY + inwardDy * beachWidth
    );
    
    gradient.addColorStop(0, hsl(pal.wet.h, pal.wet.s, wetL));
    gradient.addColorStop(0.4, hsl(pal.dry.h, pal.dry.s, dryL));
    gradient.addColorStop(1, hsl(pal.dry.h, pal.dry.s - 10, dryL + 5, 0.5));

    // Draw the beach strip
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(startCorner.x, startCorner.y);
    ctx.lineTo(endCorner.x, endCorner.y);
    ctx.lineTo(endCorner.x + inwardDx * beachWidth, endCorner.y + inwardDy * beachWidth);
    ctx.lineTo(startCorner.x + inwardDx * beachWidth, startCorner.y + inwardDy * beachWidth);
    ctx.closePath();
    ctx.fill();

    // Add foam line near water edge when zoomed in
    if (zoom >= 0.5) {
      const foamPhase = time * 1.5 + gridX * 0.4 + gridY * 0.3;
      const foamWidth = 2 + Math.sin(foamPhase) * 0.8;
      
      ctx.strokeStyle = hsl(pal.foam.h, pal.foam.s, pal.foam.l, 0.6 + Math.sin(foamPhase) * 0.2);
      ctx.lineWidth = foamWidth;
      ctx.beginPath();
      ctx.moveTo(startCorner.x + inwardDx * 2, startCorner.y + inwardDy * 2);
      ctx.lineTo(endCorner.x + inwardDx * 2, endCorner.y + inwardDy * 2);
      ctx.stroke();
    }

    // Add sand texture when very zoomed in
    if (zoom >= 0.8) {
      const numGrains = 6;
      for (let i = 0; i < numGrains; i++) {
        const seed = gridX * 173 + gridY * 293 + i * 41 + edgeName.charCodeAt(0);
        const t = seededRandom(seed);
        const d = seededRandom(seed + 1) * beachWidth * 0.8;
        
        const grainX = lerp(startCorner.x, endCorner.x, t) + inwardDx * d;
        const grainY = lerp(startCorner.y, endCorner.y, t) + inwardDy * d;
        
        ctx.fillStyle = hsl(pal.shell.h, pal.shell.s, pal.shell.l, 0.4);
        ctx.beginPath();
        ctx.arc(grainX, grainY, 0.5 + seededRandom(seed + 2) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Inward direction vectors (pointing toward tile center)
  if (north) drawBeachEdge(corners.left, corners.top, 0.707, 0.707, 'north');
  if (east) drawBeachEdge(corners.top, corners.right, -0.707, 0.707, 'east');
  if (south) drawBeachEdge(corners.right, corners.bottom, -0.707, -0.707, 'south');
  if (west) drawBeachEdge(corners.bottom, corners.left, 0.707, -0.707, 'west');

  ctx.restore();
}

/**
 * Draw beach on water tiles (shore effect from water side)
 */
export function drawRealisticBeachOnWater(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  time: number,
  adjacentLand: { north: boolean; east: boolean; south: boolean; west: boolean }
): void {
  const { north, east, south, west } = adjacentLand;
  if (!north && !east && !south && !west) return;

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const pal = REALISTIC_SAND_PALETTE;
  const waterPal = REALISTIC_WATER_PALETTE;

  // Beach strip width from water side
  const beachWidth = w * 0.12;
  
  const corners = {
    top: { x: screenX + w / 2, y: screenY },
    right: { x: screenX + w, y: screenY + h / 2 },
    bottom: { x: screenX + w / 2, y: screenY + h },
    left: { x: screenX, y: screenY + h / 2 },
  };

  ctx.save();

  const drawShoreEdge = (
    startCorner: { x: number; y: number },
    endCorner: { x: number; y: number },
    inwardDx: number,
    inwardDy: number
  ) => {
    // Shallow water gradient transitioning to sandy shore
    const gradient = ctx.createLinearGradient(
      startCorner.x, startCorner.y,
      startCorner.x + inwardDx * beachWidth, startCorner.y + inwardDy * beachWidth
    );
    
    gradient.addColorStop(0, hsl(pal.underwater.h, pal.underwater.s, pal.underwater.l, 0.8));
    gradient.addColorStop(0.3, hsl(waterPal.veryShallow.h, waterPal.veryShallow.s, waterPal.veryShallow.l, 0.6));
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(startCorner.x, startCorner.y);
    ctx.lineTo(endCorner.x, endCorner.y);
    ctx.lineTo(endCorner.x + inwardDx * beachWidth, endCorner.y + inwardDy * beachWidth);
    ctx.lineTo(startCorner.x + inwardDx * beachWidth, startCorner.y + inwardDy * beachWidth);
    ctx.closePath();
    ctx.fill();

    // Animated foam line
    if (zoom >= 0.4) {
      const foamPhase = time * 2 + gridX * 0.5 + gridY * 0.4;
      const foamOffset = Math.sin(foamPhase) * 2 + 3;
      
      ctx.strokeStyle = hsl(waterPal.foam.h, waterPal.foam.s, waterPal.foam.l, 0.5 + Math.sin(foamPhase * 1.3) * 0.2);
      ctx.lineWidth = 1.5 + Math.sin(foamPhase) * 0.5;
      ctx.beginPath();
      ctx.moveTo(startCorner.x + inwardDx * foamOffset, startCorner.y + inwardDy * foamOffset);
      ctx.lineTo(endCorner.x + inwardDx * foamOffset, endCorner.y + inwardDy * foamOffset);
      ctx.stroke();
    }
  };

  // Inward direction vectors (pointing toward tile center from edge)
  if (north) drawShoreEdge(corners.left, corners.top, 0.707, 0.707);
  if (east) drawShoreEdge(corners.top, corners.right, -0.707, 0.707);
  if (south) drawShoreEdge(corners.right, corners.bottom, -0.707, -0.707);
  if (west) drawShoreEdge(corners.bottom, corners.left, 0.707, -0.707);

  ctx.restore();
}

// ============================================================================
// ENHANCED FOREST RENDERING
// ============================================================================

/**
 * Draw procedural trees on a forest tile
 */
export function drawRealisticForest(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  time: number,
  density: number = 1.0
): void {
  if (density <= 0) return;

  const foliageNoiseFn = getFoliageNoise();
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const pal = REALISTIC_FOREST_PALETTE;

  // Number of trees based on density and zoom
  const baseTrees = Math.floor(3 + density * 4);
  const numTrees = zoom >= 0.5 ? baseTrees : Math.max(1, Math.floor(baseTrees * 0.5));

  ctx.save();

  // Clip to tile shape
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;
  ctx.beginPath();
  ctx.moveTo(cx, screenY);
  ctx.lineTo(screenX + w, cy);
  ctx.lineTo(cx, screenY + h);
  ctx.lineTo(screenX, cy);
  ctx.closePath();
  ctx.clip();

  // Draw trees from back to front for proper layering
  const trees: Array<{ x: number; y: number; size: number; seed: number }> = [];
  
  for (let i = 0; i < numTrees; i++) {
    const seed = gridX * 157 + gridY * 283 + i * 37;
    const treeX = screenX + w * 0.15 + seededRandom(seed) * w * 0.7;
    const treeY = screenY + h * 0.2 + seededRandom(seed + 1) * h * 0.6;
    const treeSize = 8 + seededRandom(seed + 2) * 10;
    trees.push({ x: treeX, y: treeY, size: treeSize, seed });
  }

  // Sort by Y position for proper depth
  trees.sort((a, b) => a.y - b.y);

  for (const tree of trees) {
    const { x, y, size, seed } = tree;
    
    // Wind animation
    const windOffset = Math.sin(time * 1.5 + seed * 0.1) * 1.5;

    // Draw trunk
    const trunkHeight = size * 0.5;
    const trunkWidth = size * 0.15;
    ctx.fillStyle = hsl(pal.trunk.h, pal.trunk.s, pal.trunk.l);
    ctx.beginPath();
    ctx.moveTo(x - trunkWidth / 2, y);
    ctx.lineTo(x + trunkWidth / 2, y);
    ctx.lineTo(x + trunkWidth / 3, y - trunkHeight);
    ctx.lineTo(x - trunkWidth / 3, y - trunkHeight);
    ctx.closePath();
    ctx.fill();

    // Draw canopy layers
    const canopyLayers = zoom >= 0.6 ? 3 : 2;
    
    for (let layer = 0; layer < canopyLayers; layer++) {
      const layerY = y - trunkHeight - layer * size * 0.25;
      const layerSize = size * (1 - layer * 0.2);
      const layerOffset = windOffset * (layer + 1) * 0.3;

      // Foliage noise for shape variation
      const shapeNoise = octaveNoise(foliageNoiseFn, x * 0.05 + layer, y * 0.05, 2, 0.5, 0.1);
      
      const canopyH = lerp(pal.canopyShadow.h, pal.canopyLight.h, 0.3 + layer * 0.3);
      const canopyL = lerp(pal.canopyShadow.l, pal.canopyLight.l, 0.2 + layer * 0.35 + shapeNoise * 0.2);
      
      ctx.fillStyle = hsl(canopyH, pal.canopy.s, canopyL);
      ctx.beginPath();
      ctx.arc(x + layerOffset, layerY, layerSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight on top layer
    if (zoom >= 0.7) {
      const highlightY = y - trunkHeight - (canopyLayers - 1) * size * 0.25;
      ctx.fillStyle = hsl(pal.canopyLight.h, pal.canopyLight.s, pal.canopyLight.l, 0.4);
      ctx.beginPath();
      ctx.arc(x + windOffset * 0.5 - 2, highlightY - 2, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ============================================================================
// ENHANCED MOUNTAIN RENDERING
// ============================================================================

/**
 * Draw realistic mountain/metal deposit terrain
 */
export function drawRealisticMountain(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  hasOre: boolean = false
): void {
  const rockNoiseFn = getRockNoise();
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const pal = REALISTIC_MOUNTAIN_PALETTE;

  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  // Rock texture noise
  const rockNoise = octaveNoise(rockNoiseFn, gridX * 0.5, gridY * 0.5, 3, 0.6, 0.15);
  
  // Base rock color with noise variation
  const rockL = lerp(pal.rockDark.l, pal.rockLight.l, (rockNoise + 1) / 2);
  
  // Draw base with slight 3D elevation effect
  const gradient = ctx.createLinearGradient(
    screenX, screenY,
    screenX + w, screenY + h
  );
  gradient.addColorStop(0, hsl(pal.rock.h, pal.rock.s, rockL + 8)); // Light face
  gradient.addColorStop(0.4, hsl(pal.rock.h, pal.rock.s, rockL));
  gradient.addColorStop(1, hsl(pal.rock.h, pal.rock.s, rockL - 12)); // Shadow face

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(cx, screenY);
  ctx.lineTo(screenX + w, cy);
  ctx.lineTo(cx, screenY + h);
  ctx.lineTo(screenX, cy);
  ctx.closePath();
  ctx.fill();

  // Draw mountain peak
  const peakHeight = h * 0.4;
  const peakGradient = ctx.createLinearGradient(cx, cy - peakHeight, cx, cy);
  peakGradient.addColorStop(0, hsl(pal.rockLight.h, pal.rockLight.s, pal.rockLight.l));
  peakGradient.addColorStop(0.3, hsl(pal.rock.h, pal.rock.s, pal.rock.l));
  peakGradient.addColorStop(1, hsl(pal.rockDark.h, pal.rockDark.s, pal.rockDark.l));

  ctx.fillStyle = peakGradient;
  ctx.beginPath();
  ctx.moveTo(cx, cy - peakHeight);
  ctx.lineTo(cx + w * 0.25, cy);
  ctx.lineTo(cx - w * 0.25, cy);
  ctx.closePath();
  ctx.fill();

  // Snow cap on peak
  if (zoom >= 0.5) {
    ctx.fillStyle = hsl(pal.snow.h, pal.snow.s, pal.snow.l);
    ctx.beginPath();
    ctx.moveTo(cx, cy - peakHeight);
    ctx.lineTo(cx + w * 0.12, cy - peakHeight + h * 0.15);
    ctx.lineTo(cx - w * 0.1, cy - peakHeight + h * 0.12);
    ctx.closePath();
    ctx.fill();

    // Snow shadow
    ctx.fillStyle = hsl(pal.snowShadow.h, pal.snowShadow.s, pal.snowShadow.l, 0.5);
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.05, cy - peakHeight + h * 0.12);
    ctx.lineTo(cx + w * 0.12, cy - peakHeight + h * 0.15);
    ctx.lineTo(cx, cy - peakHeight + h * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  // Ore deposits
  if (hasOre && zoom >= 0.5) {
    const orePositions = [
      { x: cx - w * 0.2, y: cy + h * 0.1 },
      { x: cx + w * 0.15, y: cy + h * 0.15 },
      { x: cx, y: cy + h * 0.25 },
    ];

    for (let i = 0; i < orePositions.length; i++) {
      const { x, y } = orePositions[i];
      const oreSize = 4 + seededRandom(gridX * 127 + gridY * 257 + i * 19) * 4;
      
      // Ore vein
      ctx.fillStyle = hsl(pal.ore.h, pal.ore.s, pal.ore.l);
      ctx.beginPath();
      ctx.ellipse(x, y, oreSize, oreSize * 0.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Ore shine
      ctx.fillStyle = hsl(pal.oreShine.h, pal.oreShine.s, pal.oreShine.l, 0.5);
      ctx.beginPath();
      ctx.arc(x - oreSize * 0.2, y - oreSize * 0.2, oreSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Edge stroke
  if (zoom >= 0.6) {
    ctx.strokeStyle = hsl(pal.rockDark.h, pal.rockDark.s, pal.rockDark.l - 10, 0.3);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, screenY);
    ctx.lineTo(screenX + w, cy);
    ctx.lineTo(cx, screenY + h);
    ctx.lineTo(screenX, cy);
    ctx.closePath();
    ctx.stroke();
  }
}

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================

export interface EnvParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  opacity: number;
  type: 'dust' | 'leaf' | 'pollen' | 'splash' | 'spark';
  color: string;
}

/** Global particle pool for environmental effects */
let envParticles: EnvParticle[] = [];
const MAX_ENV_PARTICLES = 100;

/**
 * Update environmental particles
 */
export function updateEnvParticles(deltaTime: number): void {
  for (let i = envParticles.length - 1; i >= 0; i--) {
    const p = envParticles[i];
    p.age += deltaTime;
    
    if (p.age >= p.maxAge) {
      envParticles.splice(i, 1);
      continue;
    }

    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Gravity for some particles
    if (p.type === 'leaf' || p.type === 'splash') {
      p.vy += 20 * deltaTime;
    }
    
    // Wind drift for floating particles
    if (p.type === 'dust' || p.type === 'pollen') {
      p.vx += (Math.random() - 0.5) * 5 * deltaTime;
      p.vy -= 3 * deltaTime; // Slight upward drift
    }
    
    // Fade out near end of life
    const lifeRatio = p.age / p.maxAge;
    p.opacity = 1 - lifeRatio;
  }
}

/**
 * Spawn an environmental particle
 */
export function spawnEnvParticle(particle: Omit<EnvParticle, 'age'>): void {
  if (envParticles.length >= MAX_ENV_PARTICLES) return;
  envParticles.push({ ...particle, age: 0 });
}

/**
 * Draw all environmental particles
 */
export function drawEnvParticles(ctx: CanvasRenderingContext2D, offset: { x: number; y: number }, zoom: number): void {
  if (zoom < 0.5) return; // Don't draw particles when zoomed out

  ctx.save();

  for (const p of envParticles) {
    if (p.opacity <= 0) continue;

    ctx.globalAlpha = p.opacity * 0.7;
    ctx.fillStyle = p.color;

    switch (p.type) {
      case 'dust':
      case 'pollen':
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'leaf':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.age * 3);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        break;
      case 'splash':
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.age / p.maxAge), 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'spark':
        ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 50, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  ctx.restore();
}

/**
 * Clear all particles
 */
export function clearEnvParticles(): void {
  envParticles = [];
}

// ============================================================================
// AMBIENT EFFECTS
// ============================================================================

/**
 * Draw ambient light/shadow overlay for time of day
 */
export function drawAmbientOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeOfDay: number, // 0-24 hours
  zoom: number
): void {
  // Calculate ambient color based on time
  let overlayColor: string;
  let overlayOpacity: number;

  if (timeOfDay >= 6 && timeOfDay < 8) {
    // Dawn - warm orange tint
    const t = (timeOfDay - 6) / 2;
    overlayColor = `rgba(255, 200, 150, ${0.15 * (1 - t)})`;
    overlayOpacity = 0.15 * (1 - t);
  } else if (timeOfDay >= 8 && timeOfDay < 17) {
    // Day - no overlay
    overlayOpacity = 0;
    overlayColor = 'transparent';
  } else if (timeOfDay >= 17 && timeOfDay < 20) {
    // Sunset - warm golden tint
    const t = (timeOfDay - 17) / 3;
    overlayColor = `rgba(255, 180, 100, ${0.12 * t})`;
    overlayOpacity = 0.12 * t;
  } else {
    // Night - cool blue tint
    overlayColor = 'rgba(30, 50, 100, 0.25)';
    overlayOpacity = 0.25;
  }

  if (overlayOpacity > 0) {
    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Draw vignette effect for atmospheric depth
 */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number = 0.15
): void {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.8;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.6, 'transparent');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// ============================================================================
// SELECTION AND HIGHLIGHT EFFECTS
// ============================================================================

/**
 * Draw enhanced selection glow effect
 */
export function drawSelectionGlow(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  time: number,
  color: string = '#3b82f6'
): void {
  const w = width;
  const h = height;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  // Pulsing glow intensity
  const pulsePhase = time * 3;
  const pulseIntensity = 0.4 + Math.sin(pulsePhase) * 0.15;

  // Outer glow
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 15 + Math.sin(pulsePhase) * 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = pulseIntensity;

  ctx.beginPath();
  ctx.moveTo(cx, screenY - 2);
  ctx.lineTo(screenX + w + 2, cy);
  ctx.lineTo(cx, screenY + h + 2);
  ctx.lineTo(screenX - 2, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw unit shadow on ground
 */
export function drawUnitShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  altitude: number = 0
): void {
  // Shadow gets larger and more transparent with altitude
  const shadowScale = 1 + altitude * 0.3;
  const shadowOpacity = 0.25 - altitude * 0.1;
  const shadowOffsetY = altitude * 10;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y + shadowOffsetY,
    width * 0.4 * shadowScale,
    height * 0.2 * shadowScale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { lerp, smoothstep, hsl, seededRandom, octaveNoise };
