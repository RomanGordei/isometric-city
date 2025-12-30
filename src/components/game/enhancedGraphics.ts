/**
 * Enhanced Graphics System - High-Fidelity Terrain and Visual Effects
 * 
 * This module provides photorealistic terrain rendering with:
 * - Procedural noise-based textures for natural-looking grass, dirt, and terrain
 * - Advanced animated water with caustics, reflections, depth-based colors
 * - Realistic beach/shore transitions with animated foam and wet sand
 * - Dynamic shadows and ambient occlusion for sprites
 * - Particle systems for environmental effects
 * 
 * Avoids the cartoon-y gradient-based look in favor of realistic textures.
 */

import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { TILE_WIDTH, TILE_HEIGHT } from './types';
import { getDiamondCorners } from './drawing';
import type { Tile } from '@/types/game';

// ============================================================================
// NOISE GENERATORS (lazily initialized for performance)
// ============================================================================

let terrainNoise: NoiseFunction2D | null = null;
let grassDetailNoise: NoiseFunction2D | null = null;
let waterNoise: NoiseFunction2D | null = null;
let waveNoise: NoiseFunction2D | null = null;
let foamNoise: NoiseFunction2D | null = null;
let sandNoise: NoiseFunction2D | null = null;
let causticsNoise: NoiseFunction2D | null = null;

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

function getFoamNoise(): NoiseFunction2D {
  if (!foamNoise) foamNoise = createNoise2D();
  return foamNoise;
}

function getSandNoise(): NoiseFunction2D {
  if (!sandNoise) sandNoise = createNoise2D();
  return sandNoise;
}

function getCausticsNoise(): NoiseFunction2D {
  if (!causticsNoise) causticsNoise = createNoise2D();
  return causticsNoise;
}

// ============================================================================
// REALISTIC COLOR PALETTES
// ============================================================================

/** Photorealistic grass colors - earth tones, not cartoon green */
export const REALISTIC_GRASS_COLORS = {
  // Primary grass tones (earthy, natural)
  base: { r: 85, g: 107, b: 47 },      // Dark olive green
  light: { r: 124, g: 152, b: 75 },    // Light olive
  dark: { r: 55, g: 75, b: 33 },       // Deep forest green
  dry: { r: 140, g: 130, b: 70 },      // Dry grass/hay
  lush: { r: 75, g: 115, b: 55 },      // Lush grass
  shadow: { r: 45, g: 60, b: 30 },     // Shadowed grass
  // Dirt patches
  dirt: { r: 110, g: 85, b: 55 },      // Brown dirt
  dirtDark: { r: 80, g: 60, b: 40 },   // Dark soil
};

/** Realistic water colors with depth variation */
export const REALISTIC_WATER_COLORS = {
  // Depth-based colors
  deep: { r: 20, g: 50, b: 80 },       // Deep ocean blue
  mid: { r: 35, g: 85, b: 120 },       // Mid depth
  shallow: { r: 70, g: 130, b: 150 },  // Shallow turquoise
  shore: { r: 95, g: 160, b: 170 },    // Near shore
  // Surface effects
  reflection: { r: 180, g: 210, b: 230 }, // Sky reflection
  sparkle: { r: 255, g: 255, b: 255 },    // Sun sparkle
  foam: { r: 240, g: 245, b: 250 },       // White foam
  // Caustics (underwater light patterns)
  causticLight: { r: 100, g: 180, b: 200 },
  causticDark: { r: 30, g: 70, b: 100 },
};

/** Realistic beach/sand colors */
export const REALISTIC_BEACH_COLORS = {
  drySand: { r: 220, g: 200, b: 160 },    // Dry beach sand
  wetSand: { r: 160, g: 140, b: 100 },    // Wet sand near water
  darkSand: { r: 130, g: 110, b: 80 },    // Dark wet sand
  foam: { r: 250, g: 252, b: 255 },       // Wave foam
  foamFade: { r: 200, g: 220, b: 235 },   // Dissipating foam
  pebbles: { r: 100, g: 90, b: 75 },      // Small pebbles
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Convert RGB to CSS color string */
function rgb(r: number, g: number, b: number, a = 1): string {
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Lerp between two values */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** Lerp between two colors */
function lerpColor(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }, t: number): { r: number; g: number; b: number } {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  };
}

/** Get octave noise for more natural patterns (fractal brownian motion) */
function fbm(
  noise: NoiseFunction2D,
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
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
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/** Smooth clamp for natural transitions */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Hash function for deterministic pseudo-random values */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// ============================================================================
// TERRAIN TEXTURE CACHE (performance optimization)
// ============================================================================

interface TerrainTextureCache {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  gridX: number;
  gridY: number;
}

const terrainTextureCache = new Map<string, TerrainTextureCache>();
const MAX_TERRAIN_CACHE_SIZE = 500;

function getTerrainCacheKey(gridX: number, gridY: number, type: string): string {
  return `${type}_${gridX}_${gridY}`;
}

function evictOldCacheEntries(): void {
  if (terrainTextureCache.size > MAX_TERRAIN_CACHE_SIZE) {
    const keysToDelete = Array.from(terrainTextureCache.keys()).slice(0, 100);
    keysToDelete.forEach(key => terrainTextureCache.delete(key));
  }
}

// ============================================================================
// ENHANCED GRASS RENDERING
// ============================================================================

/**
 * Draw an enhanced, realistic grass tile with procedural texturing
 * Uses noise-based color variation and subtle details for natural appearance
 */
export function drawEnhancedGrassTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  tile: Tile,
  zoom: number,
  time: number
): void {
  const noise = getTerrainNoise();
  const detailNoise = getGrassDetailNoise();
  const corners = getDiamondCorners(screenX, screenY);

  // ========== BASE TERRAIN COLOR ==========
  // Use multiple octaves of noise for natural-looking variation
  const largeScale = fbm(noise, gridX * 0.15, gridY * 0.15, 3, 0.5, 2.0, 1.0);
  const mediumScale = fbm(noise, gridX * 0.4, gridY * 0.4, 2, 0.6, 2.0, 1.0);
  const smallScale = fbm(detailNoise, gridX * 1.2, gridY * 1.2, 2, 0.5, 2.0, 1.0);

  // Blend multiple color influences
  const baseT = (largeScale + 1) * 0.5; // 0-1 range
  const detailT = (mediumScale + 1) * 0.5;
  const microT = (smallScale + 1) * 0.5;

  // Create base color with natural variation
  let baseColor = lerpColor(REALISTIC_GRASS_COLORS.dark, REALISTIC_GRASS_COLORS.base, baseT);
  baseColor = lerpColor(baseColor, REALISTIC_GRASS_COLORS.light, detailT * 0.4);
  
  // Add dry patches
  const dryPatchT = smoothstep(0.6, 0.8, microT);
  baseColor = lerpColor(baseColor, REALISTIC_GRASS_COLORS.dry, dryPatchT * 0.3);

  // Add lush patches (opposite of dry)
  const lushPatchT = smoothstep(0.2, 0.0, microT);
  baseColor = lerpColor(baseColor, REALISTIC_GRASS_COLORS.lush, lushPatchT * 0.25);

  // ========== DRAW BASE TILE ==========
  ctx.fillStyle = rgb(baseColor.r, baseColor.g, baseColor.b);
  ctx.beginPath();
  ctx.moveTo(corners.top.x, corners.top.y);
  ctx.lineTo(corners.right.x, corners.right.y);
  ctx.lineTo(corners.bottom.x, corners.bottom.y);
  ctx.lineTo(corners.left.x, corners.left.y);
  ctx.closePath();
  ctx.fill();

  // ========== ISOMETRIC SHADING (subtle 3D effect) ==========
  // Left side slightly darker (shadow)
  const shadowGradient = ctx.createLinearGradient(
    corners.left.x, corners.left.y,
    corners.bottom.x, corners.bottom.y
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.02)');
  ctx.fillStyle = shadowGradient;
  ctx.beginPath();
  ctx.moveTo(corners.top.x, corners.top.y);
  ctx.lineTo(corners.left.x, corners.left.y);
  ctx.lineTo(corners.bottom.x, corners.bottom.y);
  ctx.closePath();
  ctx.fill();

  // Right side slightly lighter (highlight)
  const highlightGradient = ctx.createLinearGradient(
    corners.right.x, corners.right.y,
    corners.bottom.x, corners.bottom.y
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.moveTo(corners.top.x, corners.top.y);
  ctx.lineTo(corners.right.x, corners.right.y);
  ctx.lineTo(corners.bottom.x, corners.bottom.y);
  ctx.closePath();
  ctx.fill();

  // ========== DETAIL TEXTURES (only when zoomed in) ==========
  if (zoom >= 0.5) {
    // Draw small dirt patches
    const dirtPatches = Math.floor(hash(gridX, gridY) * 3);
    if (dirtPatches > 0 && microT > 0.5) {
      for (let i = 0; i < dirtPatches; i++) {
        const px = lerp(corners.left.x + 10, corners.right.x - 10, hash(gridX + i * 7, gridY + i * 11));
        const py = lerp(corners.top.y + 5, corners.bottom.y - 5, hash(gridX + i * 13, gridY + i * 17));
        const patchSize = 2 + hash(gridX + i, gridY) * 3;
        
        const dirtColor = lerpColor(REALISTIC_GRASS_COLORS.dirt, REALISTIC_GRASS_COLORS.dirtDark, hash(gridX, gridY + i));
        ctx.fillStyle = rgb(dirtColor.r, dirtColor.g, dirtColor.b, 0.6);
        ctx.beginPath();
        ctx.ellipse(px, py, patchSize * 1.5, patchSize * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw grass blade details when very zoomed in
    if (zoom >= 0.8) {
      const numBlades = 6 + Math.floor(hash(gridX, gridY + 100) * 8);
      for (let i = 0; i < numBlades; i++) {
        const bx = lerp(corners.left.x + 5, corners.right.x - 5, hash(gridX + i * 3, gridY + i * 5));
        const by = lerp(corners.top.y + 3, corners.bottom.y - 3, hash(gridX + i * 7, gridY + i * 11));
        
        // Subtle wind sway animation
        const windOffset = Math.sin(time * 2 + gridX * 0.3 + gridY * 0.5 + i) * 1.5;
        
        const bladeColor = lerpColor(
          REALISTIC_GRASS_COLORS.base,
          REALISTIC_GRASS_COLORS.light,
          hash(gridX + i, gridY + i * 2)
        );
        
        ctx.strokeStyle = rgb(bladeColor.r, bladeColor.g, bladeColor.b, 0.7);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + windOffset, by - 3, bx + windOffset * 0.5, by - 5);
        ctx.stroke();
      }
    }
  }

  // ========== ZONE BORDER (if applicable) ==========
  if (tile.zone !== 'none' && zoom >= 0.9) {
    const zoneColors: Record<string, string> = {
      residential: 'rgba(34, 197, 94, 0.6)',
      commercial: 'rgba(59, 130, 246, 0.6)',
      industrial: 'rgba(245, 158, 11, 0.6)',
    };
    const borderColor = zoneColors[tile.zone] || 'transparent';
    
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(corners.top.x, corners.top.y);
    ctx.lineTo(corners.right.x, corners.right.y);
    ctx.lineTo(corners.bottom.x, corners.bottom.y);
    ctx.lineTo(corners.left.x, corners.left.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ============================================================================
// ENHANCED WATER RENDERING
// ============================================================================

/** Water animation state (updated externally) */
let waterTime = 0;

export function updateWaterTime(delta: number): void {
  waterTime += delta;
}

export function getWaterTime(): number {
  return waterTime;
}

/**
 * Draw enhanced, animated water tile with realistic effects
 * Includes depth-based coloring, caustics, waves, reflections, and foam
 */
export function drawEnhancedWaterTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  time: number,
  adjacentLand: { north: boolean; east: boolean; south: boolean; west: boolean },
  isEdgeTile: boolean
): void {
  const waterNoiseFn = getWaterNoise();
  const waveNoiseFn = getWaveNoise();
  const causticsNoiseFn = getCausticsNoise();
  const corners = getDiamondCorners(screenX, screenY);

  // ========== CALCULATE WATER DEPTH ==========
  // Edge tiles are shallower, center tiles are deeper
  const adjacentLandCount = [adjacentLand.north, adjacentLand.east, adjacentLand.south, adjacentLand.west]
    .filter(Boolean).length;
  let depth = 1.0 - (adjacentLandCount * 0.2); // 1.0 = deep, 0.2 = very shallow
  if (isEdgeTile) depth = Math.min(depth, 0.5);

  // ========== BASE WATER COLOR ==========
  // Depth-based color gradient
  let waterColor: { r: number; g: number; b: number };
  if (depth > 0.7) {
    waterColor = lerpColor(REALISTIC_WATER_COLORS.mid, REALISTIC_WATER_COLORS.deep, (depth - 0.7) / 0.3);
  } else if (depth > 0.4) {
    waterColor = lerpColor(REALISTIC_WATER_COLORS.shallow, REALISTIC_WATER_COLORS.mid, (depth - 0.4) / 0.3);
  } else {
    waterColor = lerpColor(REALISTIC_WATER_COLORS.shore, REALISTIC_WATER_COLORS.shallow, depth / 0.4);
  }

  // Add subtle noise variation
  const colorNoise = fbm(waterNoiseFn, gridX * 0.3 + time * 0.05, gridY * 0.3, 2, 0.5, 2.0, 1.0);
  waterColor = lerpColor(waterColor, REALISTIC_WATER_COLORS.mid, colorNoise * 0.15);

  // ========== DRAW BASE WATER ==========
  ctx.fillStyle = rgb(waterColor.r, waterColor.g, waterColor.b);
  ctx.beginPath();
  ctx.moveTo(corners.top.x, corners.top.y);
  ctx.lineTo(corners.right.x, corners.right.y);
  ctx.lineTo(corners.bottom.x, corners.bottom.y);
  ctx.lineTo(corners.left.x, corners.left.y);
  ctx.closePath();
  ctx.fill();

  // ========== CAUSTICS (underwater light patterns) ==========
  if (zoom >= 0.4 && depth > 0.3) {
    const causticsIntensity = 0.15 * depth;
    const cx = screenX + TILE_WIDTH / 2;
    const cy = screenY + TILE_HEIGHT / 2;
    
    // Animated caustics pattern
    const causticsOffset = time * 0.3;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + causticsOffset;
      const radius = 8 + Math.sin(time * 2 + i) * 3;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius * 0.5; // Flatten for isometric
      
      const causticsNoise = fbm(causticsNoiseFn, gridX + i + time * 0.1, gridY + i, 2, 0.5, 2.0, 1.0);
      const alpha = (causticsNoise + 1) * 0.5 * causticsIntensity;
      
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, 10);
      gradient.addColorStop(0, rgb(REALISTIC_WATER_COLORS.causticLight.r, REALISTIC_WATER_COLORS.causticLight.g, REALISTIC_WATER_COLORS.causticLight.b, alpha));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ========== WAVE PATTERNS ==========
  if (zoom >= 0.35) {
    const waveIntensity = 0.08;
    
    // Multiple wave layers for realism
    for (let layer = 0; layer < 3; layer++) {
      const waveScale = 0.15 + layer * 0.1;
      const waveSpeed = 0.5 + layer * 0.2;
      const wavePhase = fbm(waveNoiseFn, gridX * waveScale + time * waveSpeed, gridY * waveScale, 2, 0.5, 2.0, 1.0);
      
      const waveAlpha = waveIntensity * (1 - layer * 0.25);
      const waveColor = layer === 0 ? 'rgba(255, 255, 255,' : 'rgba(200, 220, 240,';
      
      // Draw wave lines
      const numWaves = 3 - layer;
      for (let w = 0; w < numWaves; w++) {
        const waveY = corners.top.y + (corners.bottom.y - corners.top.y) * (0.2 + w * 0.3 + wavePhase * 0.1);
        const waveWidth = (corners.right.x - corners.left.x) * (0.3 + hash(gridX, gridY + w) * 0.4);
        const waveX = corners.left.x + (corners.right.x - corners.left.x - waveWidth) * hash(gridX + w, gridY);
        
        ctx.strokeStyle = waveColor + (waveAlpha * (0.5 + wavePhase * 0.3)) + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(waveX, waveY);
        ctx.bezierCurveTo(
          waveX + waveWidth * 0.3, waveY - 2 - Math.sin(time * 3 + w) * 1,
          waveX + waveWidth * 0.7, waveY + 2 + Math.sin(time * 3 + w + 1) * 1,
          waveX + waveWidth, waveY
        );
        ctx.stroke();
      }
    }
  }

  // ========== SKY REFLECTION ==========
  if (zoom >= 0.5 && depth > 0.5) {
    const reflectionGradient = ctx.createLinearGradient(
      corners.top.x, corners.top.y,
      corners.bottom.x, corners.bottom.y
    );
    const reflectionAlpha = 0.08 * depth;
    reflectionGradient.addColorStop(0, rgb(REALISTIC_WATER_COLORS.reflection.r, REALISTIC_WATER_COLORS.reflection.g, REALISTIC_WATER_COLORS.reflection.b, reflectionAlpha));
    reflectionGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    reflectionGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = reflectionGradient;
    ctx.beginPath();
    ctx.moveTo(corners.top.x, corners.top.y);
    ctx.lineTo(corners.right.x, corners.right.y);
    ctx.lineTo(corners.bottom.x, corners.bottom.y);
    ctx.lineTo(corners.left.x, corners.left.y);
    ctx.closePath();
    ctx.fill();
  }

  // ========== SUN SPARKLES ==========
  if (zoom >= 0.6 && depth > 0.4) {
    const numSparkles = 2 + Math.floor(hash(gridX, gridY) * 3);
    for (let i = 0; i < numSparkles; i++) {
      // Animate sparkle visibility
      const sparklePhase = (time * 4 + gridX * 0.7 + gridY * 0.9 + i * 2.3) % (Math.PI * 2);
      const sparkleVisible = Math.sin(sparklePhase) > 0.7;
      
      if (sparkleVisible) {
        const sx = lerp(corners.left.x + 8, corners.right.x - 8, hash(gridX + i * 3, gridY + i * 5));
        const sy = lerp(corners.top.y + 4, corners.bottom.y - 4, hash(gridX + i * 7, gridY + i * 11));
        const sparkleSize = 1 + hash(gridX + i, gridY) * 1.5;
        const sparkleAlpha = 0.4 + Math.sin(sparklePhase) * 0.4;
        
        const sparkleGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, sparkleSize * 2);
        sparkleGradient.addColorStop(0, rgb(255, 255, 255, sparkleAlpha));
        sparkleGradient.addColorStop(0.5, rgb(255, 255, 255, sparkleAlpha * 0.3));
        sparkleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = sparkleGradient;
        ctx.beginPath();
        ctx.arc(sx, sy, sparkleSize * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ============================================================================
// ENHANCED BEACH/SHORE RENDERING
// ============================================================================

/**
 * Draw enhanced beach transition on water tiles adjacent to land
 * Creates realistic sand gradients with wet/dry zones and animated foam
 */
export function drawEnhancedBeach(
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

  const sandNoiseFn = getSandNoise();
  const foamNoiseFn = getFoamNoise();
  const corners = getDiamondCorners(screenX, screenY);
  const cx = screenX + TILE_WIDTH / 2;
  const cy = screenY + TILE_HEIGHT / 2;

  // Beach width as fraction of tile
  const beachWidth = TILE_WIDTH * 0.15;

  // ========== DRAW BEACH FOR EACH ADJACENT LAND EDGE ==========
  const edges: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    inward: { dx: number; dy: number };
    active: boolean;
  }> = [
    { start: corners.left, end: corners.top, inward: { dx: 0.707, dy: 0.707 }, active: north },
    { start: corners.top, end: corners.right, inward: { dx: -0.707, dy: 0.707 }, active: east },
    { start: corners.right, end: corners.bottom, inward: { dx: -0.707, dy: -0.707 }, active: south },
    { start: corners.bottom, end: corners.left, inward: { dx: 0.707, dy: -0.707 }, active: west },
  ];

  for (const edge of edges) {
    if (!edge.active) continue;

    // Calculate beach strip vertices
    const s1 = edge.start;
    const s2 = edge.end;
    const i1 = { x: s1.x + edge.inward.dx * beachWidth, y: s1.y + edge.inward.dy * beachWidth };
    const i2 = { x: s2.x + edge.inward.dx * beachWidth, y: s2.y + edge.inward.dy * beachWidth };

    // ========== DRY SAND (outer edge) ==========
    const dryWidth = beachWidth * 0.6;
    const d1 = { x: s1.x + edge.inward.dx * dryWidth, y: s1.y + edge.inward.dy * dryWidth };
    const d2 = { x: s2.x + edge.inward.dx * dryWidth, y: s2.y + edge.inward.dy * dryWidth };

    // Add noise variation to sand color
    const sandVariation = fbm(sandNoiseFn, gridX * 0.5, gridY * 0.5, 2, 0.5, 2.0, 1.0);
    const drySandColor = lerpColor(
      REALISTIC_BEACH_COLORS.drySand,
      { r: 200, g: 180, b: 140 },
      sandVariation * 0.3
    );

    ctx.fillStyle = rgb(drySandColor.r, drySandColor.g, drySandColor.b);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineTo(d2.x, d2.y);
    ctx.lineTo(d1.x, d1.y);
    ctx.closePath();
    ctx.fill();

    // ========== WET SAND (inner, near water) ==========
    const wetSandColor = lerpColor(
      REALISTIC_BEACH_COLORS.wetSand,
      REALISTIC_BEACH_COLORS.darkSand,
      sandVariation * 0.2
    );

    ctx.fillStyle = rgb(wetSandColor.r, wetSandColor.g, wetSandColor.b);
    ctx.beginPath();
    ctx.moveTo(d1.x, d1.y);
    ctx.lineTo(d2.x, d2.y);
    ctx.lineTo(i2.x, i2.y);
    ctx.lineTo(i1.x, i1.y);
    ctx.closePath();
    ctx.fill();

    // ========== ANIMATED FOAM LINE ==========
    if (zoom >= 0.4) {
      // Foam wave animation
      const foamPhase = (time * 1.5 + gridX * 0.5 + gridY * 0.7) % (Math.PI * 2);
      const foamOffset = Math.sin(foamPhase) * 3;
      const foamAlpha = 0.5 + Math.sin(foamPhase) * 0.3;

      // Draw foam line
      const foamY = lerp(d1.y, i1.y, 0.3) + foamOffset * 0.3;
      const foamWidth = beachWidth * 0.3;
      
      // Multiple foam segments for variation
      const numFoamSegments = 4;
      for (let seg = 0; seg < numFoamSegments; seg++) {
        const segStart = lerp(s1.x, s2.x, seg / numFoamSegments);
        const segEnd = lerp(s1.x, s2.x, (seg + 0.8) / numFoamSegments);
        const segY = foamY + (Math.sin(time * 2 + seg) * 2);
        
        const foamNoise = fbm(foamNoiseFn, gridX + seg + time * 0.2, gridY, 2, 0.5, 2.0, 1.0);
        if (foamNoise > -0.3) {
          ctx.strokeStyle = rgb(
            REALISTIC_BEACH_COLORS.foam.r,
            REALISTIC_BEACH_COLORS.foam.g,
            REALISTIC_BEACH_COLORS.foam.b,
            foamAlpha * (0.5 + foamNoise * 0.3)
          );
          ctx.lineWidth = 1.5 + foamNoise * 0.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(segStart + edge.inward.dx * foamWidth, segY);
          ctx.lineTo(segEnd + edge.inward.dx * foamWidth, segY + Math.sin(time * 3 + seg * 2) * 1);
          ctx.stroke();
        }
      }

      // Draw foam bubbles
      if (zoom >= 0.7) {
        const numBubbles = 3 + Math.floor(hash(gridX, gridY) * 4);
        for (let b = 0; b < numBubbles; b++) {
          const bubblePhase = (time * 2 + b * 1.7 + gridX + gridY) % (Math.PI * 2);
          if (Math.sin(bubblePhase) > 0.3) {
            const bx = lerp(d1.x, d2.x, hash(gridX + b, gridY + b * 3));
            const by = lerp(d1.y + 2, i1.y - 2, hash(gridX + b * 2, gridY + b)) + Math.sin(bubblePhase) * 2;
            const bubbleSize = 1 + hash(gridX + b, gridY) * 1.5;
            
            ctx.fillStyle = rgb(255, 255, 255, 0.3 + Math.sin(bubblePhase) * 0.2);
            ctx.beginPath();
            ctx.arc(bx, by, bubbleSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // ========== SMALL PEBBLES/DETAILS ==========
    if (zoom >= 0.8) {
      const numPebbles = 2 + Math.floor(hash(gridX, gridY + 50) * 4);
      for (let p = 0; p < numPebbles; p++) {
        const px = lerp(s1.x, s2.x, hash(gridX + p * 5, gridY + p * 7));
        const py = lerp(s1.y + 2, d1.y, hash(gridX + p * 11, gridY + p * 13));
        const pebbleSize = 0.8 + hash(gridX + p, gridY + p) * 1.2;
        
        ctx.fillStyle = rgb(
          REALISTIC_BEACH_COLORS.pebbles.r,
          REALISTIC_BEACH_COLORS.pebbles.g,
          REALISTIC_BEACH_COLORS.pebbles.b,
          0.5
        );
        ctx.beginPath();
        ctx.ellipse(px + edge.inward.dx * 5, py + edge.inward.dy * 5, pebbleSize * 1.2, pebbleSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ========== CORNER FILLS (where two beach edges meet) ==========
  const cornerPairs: Array<[boolean, boolean, { x: number; y: number }]> = [
    [north, east, corners.top],
    [east, south, corners.right],
    [south, west, corners.bottom],
    [west, north, corners.left],
  ];

  for (const [edge1Active, edge2Active, cornerPoint] of cornerPairs) {
    if (edge1Active && edge2Active) {
      const sandColor = lerpColor(REALISTIC_BEACH_COLORS.drySand, REALISTIC_BEACH_COLORS.wetSand, 0.5);
      ctx.fillStyle = rgb(sandColor.r, sandColor.g, sandColor.b);
      ctx.beginPath();
      ctx.moveTo(cornerPoint.x, cornerPoint.y);
      ctx.lineTo(cornerPoint.x + (cx - cornerPoint.x) * 0.3, cornerPoint.y + (cy - cornerPoint.y) * 0.3);
      ctx.lineTo(cornerPoint.x + (cx - cornerPoint.x) * 0.25, cornerPoint.y + (cy - cornerPoint.y) * 0.35);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ============================================================================
// SPRITE SHADOW SYSTEM
// ============================================================================

/**
 * Draw a dynamic shadow beneath a sprite
 * Creates isometric-projected shadow with soft edges
 */
export function drawSpriteShadow(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  spriteWidth: number,
  spriteHeight: number,
  shadowScale: number = 0.7,
  shadowOpacity: number = 0.3
): void {
  const shadowWidth = spriteWidth * shadowScale;
  const shadowHeight = spriteHeight * 0.25 * shadowScale;
  const shadowX = screenX + (spriteWidth - shadowWidth) / 2;
  const shadowY = screenY + spriteHeight - shadowHeight * 0.5;

  // Create elliptical shadow with gradient
  const gradient = ctx.createRadialGradient(
    shadowX + shadowWidth / 2, shadowY + shadowHeight / 2, 0,
    shadowX + shadowWidth / 2, shadowY + shadowHeight / 2, shadowWidth / 2
  );
  gradient.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
  gradient.addColorStop(0.6, `rgba(0, 0, 0, ${shadowOpacity * 0.5})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(
    shadowX + shadowWidth / 2,
    shadowY + shadowHeight / 2,
    shadowWidth / 2,
    shadowHeight / 2,
    0, 0, Math.PI * 2
  );
  ctx.fill();
}

/**
 * Draw ambient occlusion around buildings
 * Creates subtle darkening at the base of structures
 */
export function drawAmbientOcclusion(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tileWidth: number,
  tileHeight: number,
  intensity: number = 0.15
): void {
  const gradient = ctx.createLinearGradient(
    screenX, screenY + tileHeight,
    screenX, screenY + tileHeight * 0.5
  );
  gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(screenX + tileWidth / 2, screenY);
  ctx.lineTo(screenX + tileWidth, screenY + tileHeight / 2);
  ctx.lineTo(screenX + tileWidth / 2, screenY + tileHeight);
  ctx.lineTo(screenX, screenY + tileHeight / 2);
  ctx.closePath();
  ctx.fill();
}

// ============================================================================
// WEATHER EFFECTS
// ============================================================================

/** Rain particle */
export interface RainParticle {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

/** Rain state */
let rainParticles: RainParticle[] = [];
let isRaining = false;
let rainIntensity = 0;

export function setRaining(raining: boolean, intensity: number = 0.5): void {
  isRaining = raining;
  rainIntensity = Math.max(0, Math.min(1, intensity));
  
  if (!raining) {
    rainParticles = [];
  }
}

export function updateRain(delta: number, canvasWidth: number, canvasHeight: number): void {
  if (!isRaining) return;

  // Spawn new particles
  const spawnRate = 50 * rainIntensity;
  for (let i = 0; i < spawnRate * delta; i++) {
    rainParticles.push({
      x: Math.random() * canvasWidth,
      y: -10,
      speed: 400 + Math.random() * 200,
      length: 10 + Math.random() * 15,
      opacity: 0.2 + Math.random() * 0.3,
    });
  }

  // Update existing particles
  rainParticles = rainParticles.filter(p => {
    p.y += p.speed * delta;
    return p.y < canvasHeight + 20;
  });
}

export function drawRain(ctx: CanvasRenderingContext2D): void {
  if (!isRaining || rainParticles.length === 0) return;

  ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
  ctx.lineWidth = 1;

  for (const p of rainParticles) {
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 2, p.y + p.length);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Clear all caches (useful when changing graphics settings)
 */
export function clearGraphicsCaches(): void {
  terrainTextureCache.clear();
  rainParticles = [];
}

/**
 * Get graphics performance stats
 */
export function getGraphicsStats(): { terrainCacheSize: number; rainParticleCount: number } {
  return {
    terrainCacheSize: terrainTextureCache.size,
    rainParticleCount: rainParticles.length,
  };
}
