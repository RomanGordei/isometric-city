/**
 * Rise of Nations - Enhanced (Realistic) Graphics System
 *
 * Goal: replace cartoon-y flat/gradient tiles with a realistic, polished material look:
 * - Muted, natural grass/soil palettes with texture detail and micro-variation
 * - Depth/foam-based animated water with shoreline shimmer
 * - Wet/dry beaches with grain + foam
 * - Forests and mountains rendered as believable materials (not neon/flat)
 *
 * This module is RoN-only (won't affect IsoCity).
 */
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { TILE_WIDTH, TILE_HEIGHT } from '@/components/game/shared';

// =============================================================================
// Noise (lazy singletons)
// =============================================================================

let nBase: NoiseFunction2D | null = null;
let nDetail: NoiseFunction2D | null = null;
let nWater: NoiseFunction2D | null = null;
let nCloud: NoiseFunction2D | null = null;

function noiseBase(): NoiseFunction2D {
  if (!nBase) nBase = createNoise2D();
  return nBase;
}
function noiseDetail(): NoiseFunction2D {
  if (!nDetail) nDetail = createNoise2D();
  return nDetail;
}
function noiseWater(): NoiseFunction2D {
  if (!nWater) nWater = createNoise2D();
  return nWater;
}
function noiseCloud(): NoiseFunction2D {
  if (!nCloud) nCloud = createNoise2D();
  return nCloud;
}

// =============================================================================
// Color helpers
// =============================================================================

type RGB = { r: number; g: number; b: number };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function rgb(r: number, g: number, b: number, a = 1): string {
  const rr = Math.round(Math.max(0, Math.min(255, r)));
  const gg = Math.round(Math.max(0, Math.min(255, g)));
  const bb = Math.round(Math.max(0, Math.min(255, b)));
  return a >= 1 ? `rgb(${rr}, ${gg}, ${bb})` : `rgba(${rr}, ${gg}, ${bb}, ${a})`;
}

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

export function mutedTeamColor(hex: string, amount = 0.55): string {
  const c = hexToRgb(hex);
  if (!c) return hex;
  const neutral: RGB = { r: 120, g: 124, b: 132 };
  const mixed = mixRGB(c, neutral, amount);
  // Slightly darken to avoid neon accents on terrain
  return rgb(mixed.r * 0.92, mixed.g * 0.92, mixed.b * 0.92, 1);
}

// =============================================================================
// Small procedural patterns (cached) - gives realism without per-pixel per-tile cost.
// =============================================================================

let grassPattern: CanvasPattern | null = null;
let sandPattern: CanvasPattern | null = null;
let rockPattern: CanvasPattern | null = null;

function makePattern(
  ctx: CanvasRenderingContext2D,
  kind: 'grass' | 'sand' | 'rock'
): CanvasPattern | null {
  const size = 128;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  if (!octx) return null;

  const nb = noiseBase();
  const nd = noiseDetail();

  const img = octx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const b = nb(u * 2.2, v * 2.2) * 0.5 + 0.5;
      const d = nd(u * 9.0, v * 9.0) * 0.5 + 0.5;

      let base: RGB;
      if (kind === 'grass') {
        // Muted natural greens with soil flecks
        const grassA: RGB = { r: 72, g: 92, b: 58 };
        const grassB: RGB = { r: 92, g: 108, b: 66 };
        const soil: RGB = { r: 92, g: 78, b: 60 };
        const t = smoothstep(0.15, 0.85, b);
        base = mixRGB(grassA, grassB, t);
        // Soil flecks (sparse)
        const fleck = smoothstep(0.82, 0.92, d) * smoothstep(0.35, 0.75, 1 - b);
        base = mixRGB(base, soil, fleck * 0.75);
      } else if (kind === 'sand') {
        const dry: RGB = { r: 190, g: 170, b: 135 };
        const warm: RGB = { r: 206, g: 184, b: 144 };
        base = mixRGB(dry, warm, smoothstep(0.2, 0.9, b));
        // Tiny darker grains
        const grain = smoothstep(0.85, 0.95, d) * 0.35;
        base = mixRGB(base, { r: 150, g: 132, b: 104 }, grain);
      } else {
        // rock
        const r1: RGB = { r: 108, g: 112, b: 118 };
        const r2: RGB = { r: 136, g: 140, b: 148 };
        base = mixRGB(r1, r2, smoothstep(0.25, 0.9, b));
        const crack = smoothstep(0.05, 0.1, 1 - d) * 0.55;
        base = mixRGB(base, { r: 58, g: 60, b: 68 }, crack);
      }

      const idx = (y * size + x) * 4;
      img.data[idx + 0] = Math.round(base.r);
      img.data[idx + 1] = Math.round(base.g);
      img.data[idx + 2] = Math.round(base.b);
      img.data[idx + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);

  const pat = ctx.createPattern(off, 'repeat');
  return pat;
}

function ensurePatterns(ctx: CanvasRenderingContext2D): void {
  if (!grassPattern) grassPattern = makePattern(ctx, 'grass');
  if (!sandPattern) sandPattern = makePattern(ctx, 'sand');
  if (!rockPattern) rockPattern = makePattern(ctx, 'rock');
}

// =============================================================================
// Geometry helpers
// =============================================================================

function clipDiamond(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(x + w, cy);
  ctx.lineTo(cx, y + h);
  ctx.lineTo(x, cy);
  ctx.closePath();
  ctx.clip();
}

// =============================================================================
// Enhanced sky
// =============================================================================

export function drawEnhancedSky(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  timeOfDay: 'day' | 'dusk' | 'night',
  t: number
): void {
  // Base gradient
  const w = canvas.width;
  const h = canvas.height;

  let top = { r: 22, g: 45, b: 80 };
  let mid = { r: 70, g: 110, b: 150 };
  let bot = { r: 170, g: 190, b: 200 };
  if (timeOfDay === 'dusk') {
    top = { r: 35, g: 25, b: 55 };
    mid = { r: 110, g: 80, b: 90 };
    bot = { r: 210, g: 150, b: 120 };
  } else if (timeOfDay === 'night') {
    top = { r: 6, g: 10, b: 20 };
    mid = { r: 10, g: 18, b: 32 };
    bot = { r: 20, g: 28, b: 46 };
  }

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgb(top.r, top.g, top.b));
  g.addColorStop(0.55, rgb(mid.r, mid.g, mid.b));
  g.addColorStop(1, rgb(bot.r, bot.g, bot.b));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft sun glow (subtle)
  if (timeOfDay !== 'night') {
    const sx = w * 0.72;
    const sy = h * 0.18;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.min(w, h) * 0.45);
    sun.addColorStop(0, 'rgba(255, 245, 220, 0.18)');
    sun.addColorStop(0.35, 'rgba(255, 210, 160, 0.08)');
    sun.addColorStop(1, 'rgba(255, 210, 160, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
  }

  // Clouds: cheap noise-based alpha at top half (no expensive per-pixel each frame)
  // We draw a handful of large translucent blobs and modulate opacity using noise.
  const nc = noiseCloud();
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = timeOfDay === 'night' ? 0.04 : 0.10;
  for (let i = 0; i < 9; i++) {
    const px = (i * 0.13 + (t * 0.004)) % 1;
    const py = 0.10 + ((i * 0.21) % 0.35);
    const nx = nc(px * 1.8, py * 1.8);
    const alpha = smoothstep(-0.2, 0.6, nx);
    const cx = w * px;
    const cy = h * py;
    const rx = w * (0.12 + (i % 3) * 0.05);
    const ry = h * 0.06;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    cg.addColorStop(0, `rgba(255,255,255,${0.35 * alpha})`);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// =============================================================================
// Enhanced grass / ground
// =============================================================================

export function drawEnhancedGrassTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  zoom: number,
  options: { highlight?: boolean; selected?: boolean } = {}
): void {
  ensurePatterns(ctx);
  const nb = noiseBase();
  const nd = noiseDetail();

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  const n = nb(gridX * 0.06, gridY * 0.06) * 0.5 + 0.5;
  const moisture = nb(gridX * 0.04 + 100, gridY * 0.04 - 100) * 0.5 + 0.5;
  const dirt = smoothstep(0.55, 0.9, 1 - moisture) * smoothstep(0.45, 0.85, n);

  // Directional lighting across the tile (fixed sun direction)
  const lightG = ctx.createLinearGradient(screenX, screenY + h * 0.15, screenX + w, screenY + h * 0.85);
  lightG.addColorStop(0, 'rgba(255,255,255,0.08)');
  lightG.addColorStop(1, 'rgba(0,0,0,0.10)');

  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  // Base grass texture pattern
  if (grassPattern) {
    // Animate subtly via fractional translation to avoid static look
    ctx.save();
    const tx = ((gridX * 17 + gridY * 7) % 64) + (performance.now() * 0.002);
    const ty = ((gridX * 5 + gridY * 19) % 64) + (performance.now() * 0.001);
    ctx.translate(-tx, -ty);
    ctx.fillStyle = grassPattern;
    ctx.fillRect(screenX + tx, screenY + ty, w, h);
    ctx.restore();
  }

  // Soil patches blended in
  if (dirt > 0.02) {
    const soilA = { r: 92, g: 78, b: 60 };
    const soilB = { r: 112, g: 94, b: 70 };
    const s = mixRGB(soilA, soilB, smoothstep(0.1, 0.9, n));
    ctx.globalAlpha = 0.55 * dirt;
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.6);
    sg.addColorStop(0, rgb(s.r, s.g, s.b, 1));
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(screenX, screenY, w, h);
    ctx.globalAlpha = 1;
  }

  // Lighting overlay
  ctx.fillStyle = lightG;
  ctx.fillRect(screenX, screenY, w, h);

  // Micro-specular + mottling when zoomed in
  if (zoom >= 0.85) {
    const dots = 10;
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < dots; i++) {
      const seed = (gridX * 92821 + gridY * 68917 + i * 1013) | 0;
      const fx = ((seed & 1023) / 1023 - 0.5) * w * 0.8;
      const fy = (((seed >> 10) & 1023) / 1023 - 0.5) * h * 0.8;
      const dn = nd((gridX + i) * 0.8, (gridY - i) * 0.8) * 0.5 + 0.5;
      ctx.fillStyle = dn > 0.65 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)';
      ctx.beginPath();
      ctx.arc(cx + fx, cy + fy, dn > 0.65 ? 0.8 : 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Subtle edge definition (no cartoony hard outlines)
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = zoom >= 0.8 ? 0.75 : 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, screenY);
  ctx.lineTo(screenX + w, cy);
  ctx.lineTo(cx, screenY + h);
  ctx.lineTo(screenX, cy);
  ctx.closePath();
  ctx.stroke();

  if (options.highlight || options.selected) {
    const a = options.selected ? 0.22 : 0.14;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = options.selected ? 2 : 1.5;
    ctx.stroke();
  }
}

// =============================================================================
// Enhanced water
// =============================================================================

export type Adjacent = { north: boolean; east: boolean; south: boolean; west: boolean };

export function drawEnhancedWaterTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  t: number,
  zoom: number,
  adjacentWater: Adjacent,
  options: { sparkle?: boolean } = {}
): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  // Approximate "depth": more adjacent water = deeper
  const adj = (adjacentWater.north ? 1 : 0) + (adjacentWater.east ? 1 : 0) + (adjacentWater.south ? 1 : 0) + (adjacentWater.west ? 1 : 0);
  const depth = adj / 4; // 0 = shore, 1 = deep

  const nw = noiseWater();
  const wave = nw(gridX * 0.12 + t * 0.22, gridY * 0.12 - t * 0.18) * 0.5 + 0.5;
  const ripples = nw(gridX * 0.45 + t * 0.75, gridY * 0.45 + t * 0.6) * 0.5 + 0.5;

  // Realistic-ish water palette: deep navy -> teal -> pale shore
  const deepC: RGB = { r: 18, g: 45, b: 72 };
  const midC: RGB = { r: 24, g: 86, b: 112 };
  const shC: RGB = { r: 80, g: 150, b: 160 };

  const base = mixRGB(mixRGB(shC, midC, depth), deepC, depth * 0.55);
  // Add wave lighting
  const lit = lerp(-10, 10, wave);

  const c0 = rgb(base.r + lit - 10, base.g + lit - 8, base.b + lit - 5);
  const c1 = rgb(base.r + lit, base.g + lit, base.b + lit);

  // Surface gradient (gives form, not flat tiles)
  const g = ctx.createLinearGradient(screenX, screenY, screenX + w, screenY + h);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);

  ctx.save();
  clipDiamond(ctx, screenX, screenY);
  ctx.fillStyle = g;
  ctx.fillRect(screenX, screenY, w, h);

  // Animated specular streaks (subtle)
  if (zoom >= 0.5) {
    ctx.globalAlpha = 0.12 + 0.08 * ripples;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.9 + (gridX + gridY) * 0.12 + i * 0.7);
      const x0 = cx + Math.sin(phase) * w * 0.28;
      const y0 = cy + Math.cos(phase * 1.1) * h * 0.18;
      ctx.beginPath();
      ctx.ellipse(x0, y0, w * 0.18, h * 0.05, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Shore foam where neighbor isn't water
  const foamAlpha = (1 - depth) * 0.65;
  if (foamAlpha > 0.02) {
    const drawFoamEdge = (edge: keyof Adjacent) => {
      // Edge line endpoints in screen space
      const top = { x: cx, y: screenY };
      const right = { x: screenX + w, y: cy };
      const bottom = { x: cx, y: screenY + h };
      const left = { x: screenX, y: cy };

      let a: { x: number; y: number };
      let b: { x: number; y: number };
      let inward: { x: number; y: number };
      if (edge === 'north') {
        a = left; b = top; inward = { x: 0.65, y: 0.65 };
      } else if (edge === 'east') {
        a = top; b = right; inward = { x: -0.65, y: 0.65 };
      } else if (edge === 'south') {
        a = right; b = bottom; inward = { x: -0.65, y: -0.65 };
      } else {
        a = bottom; b = left; inward = { x: 0.65, y: -0.65 };
      }

      const width = 6 + (1 - depth) * 10;
      const grad = ctx.createLinearGradient(a.x, a.y, a.x + inward.x * width, a.y + inward.y * width);
      grad.addColorStop(0, `rgba(245,250,255,${0.55 * foamAlpha})`);
      grad.addColorStop(1, 'rgba(245,250,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';

      // Modulate with noise for natural foam breakup
      const jitter = (noiseWater()(gridX * 0.4 + t * 0.6, gridY * 0.4 - t * 0.6) * 0.5 + 0.5) * 2 - 1;
      ctx.globalAlpha = 0.85 + jitter * 0.08;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + jitter * 1.2, b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    if (!adjacentWater.north) drawFoamEdge('north');
    if (!adjacentWater.east) drawFoamEdge('east');
    if (!adjacentWater.south) drawFoamEdge('south');
    if (!adjacentWater.west) drawFoamEdge('west');
  }

  // Sparkles (only when requested and zoomed enough)
  if (options.sparkle && zoom >= 0.7) {
    const s = noiseWater()(gridX * 0.9 + t * 1.4, gridY * 0.9 - t * 1.2) * 0.5 + 0.5;
    if (s > 0.78) {
      ctx.globalAlpha = 0.12 + (s - 0.78) * 0.6;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx + (s - 0.5) * 10, cy + (0.5 - s) * 6, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();

  // Minimal edge definition
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = zoom >= 0.8 ? 0.75 : 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, screenY);
  ctx.lineTo(screenX + w, cy);
  ctx.lineTo(cx, screenY + h);
  ctx.lineTo(screenX, cy);
  ctx.closePath();
  ctx.stroke();
}

// =============================================================================
// Enhanced beach (drawn ON water tiles adjacent to land)
// =============================================================================

export function drawEnhancedBeach(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  t: number,
  zoom: number,
  adjacentLand: Adjacent
): void {
  ensurePatterns(ctx);
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;
  const nd = noiseDetail();

  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  // Sand fill near edges (a band that fades inward)
  const drawBand = (edge: keyof Adjacent) => {
    // endpoints for that edge (same mapping as foam above)
    const top = { x: cx, y: screenY };
    const right = { x: screenX + w, y: cy };
    const bottom = { x: cx, y: screenY + h };
    const left = { x: screenX, y: cy };

    let a: { x: number; y: number };
    let b: { x: number; y: number };
    let inward: { x: number; y: number };
    if (edge === 'north') { a = left; b = top; inward = { x: 0.65, y: 0.65 }; }
    else if (edge === 'east') { a = top; b = right; inward = { x: -0.65, y: 0.65 }; }
    else if (edge === 'south') { a = right; b = bottom; inward = { x: -0.65, y: -0.65 }; }
    else { a = bottom; b = left; inward = { x: 0.65, y: -0.65 }; }

    const width = 10;
    const grad = ctx.createLinearGradient(a.x, a.y, a.x + inward.x * width, a.y + inward.y * width);
    // Wet sand at the waterline -> dry sand inward
    grad.addColorStop(0, 'rgba(150, 132, 104, 0.75)');
    grad.addColorStop(0.55, 'rgba(196, 176, 138, 0.55)');
    grad.addColorStop(1, 'rgba(210, 190, 150, 0)');

    // Use sand pattern + gradient by drawing pattern then masking with gradient via composite
    if (sandPattern) {
      ctx.save();
      // Paint pattern
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = sandPattern;
      ctx.fillRect(screenX, screenY, w, h);
      // Mask to edge band
      ctx.globalCompositeOperation = 'destination-in';
      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      const jitter = (nd(gridX * 0.8 + t * 0.3, gridY * 0.8 - t * 0.25) * 0.5 + 0.5) * 2 - 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + jitter * 1.2, b.x, b.y);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Foam highlight at the shoreline
    if (zoom >= 0.55) {
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = 'rgba(245, 250, 255, 1)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  if (adjacentLand.north) drawBand('north');
  if (adjacentLand.east) drawBand('east');
  if (adjacentLand.south) drawBand('south');
  if (adjacentLand.west) drawBand('west');

  ctx.restore();
}

// =============================================================================
// Enhanced forest
// =============================================================================

export function drawEnhancedForest(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  forestDensity: number,
  t: number,
  zoom: number
): void {
  // Draw ground base first
  drawEnhancedGrassTile(ctx, screenX, screenY, gridX, gridY, zoom);

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  const nb = noiseBase();
  const wind = Math.sin(t * 0.9 + (gridX + gridY) * 0.15) * 0.6;

  // Density -> number of canopies (bounded for performance)
  const count = Math.max(4, Math.min(9, Math.floor(4 + (forestDensity / 100) * 6)));

  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  // Ground shadow tint under canopy
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(15, 24, 18, 1)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.05, w * 0.38, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (let i = 0; i < count; i++) {
    const seed = (gridX * 92821 + gridY * 68917 + i * 151) | 0;
    const rx = ((seed & 1023) / 1023 - 0.5) * w * 0.75;
    const ry = (((seed >> 10) & 1023) / 1023 - 0.5) * h * 0.65;
    const px = cx + rx;
    const py = cy + ry;
    const n = nb((gridX + i) * 0.25, (gridY - i) * 0.25) * 0.5 + 0.5;
    const r = (6 + n * 6) * (zoom >= 0.75 ? 1 : 0.95);
    const sway = wind * (0.8 + n * 0.4);

    // Soft shadow
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.ellipse(px, py + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Canopy gradient
    const can = ctx.createRadialGradient(px - r * 0.25, py - r * 0.35, 0, px, py, r * 1.25);
    can.addColorStop(0, 'rgba(120, 150, 95, 0.95)');
    can.addColorStop(0.45, 'rgba(55, 88, 52, 0.95)');
    can.addColorStop(1, 'rgba(18, 34, 24, 0)');
    ctx.fillStyle = can;
    ctx.beginPath();
    ctx.ellipse(px + sway, py - r * 0.25, r * 1.0, r * 0.85, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Trunk hint when zoomed in
    if (zoom >= 0.9 && i < Math.min(3, count)) {
      ctx.strokeStyle = 'rgba(70, 52, 34, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + sway * 0.6, py + r * 0.1);
      ctx.lineTo(px + sway * 0.2, py + r * 0.85);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// =============================================================================
// Enhanced mountain / ore
// =============================================================================

export function drawEnhancedMountain(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  gridX: number,
  gridY: number,
  t: number,
  zoom: number
): void {
  ensurePatterns(ctx);
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  // Rocky base
  if (rockPattern) {
    ctx.save();
    ctx.translate(-gridX * 9, -gridY * 9);
    ctx.fillStyle = rockPattern;
    ctx.fillRect(screenX + gridX * 9, screenY + gridY * 9, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = rgb(120, 125, 132);
    ctx.fillRect(screenX, screenY, w, h);
  }

  // Subtle lighting
  const lg = ctx.createLinearGradient(screenX, screenY, screenX + w, screenY + h);
  lg.addColorStop(0, 'rgba(255,255,255,0.10)');
  lg.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = lg;
  ctx.fillRect(screenX, screenY, w, h);

  // Peaks
  const nb = noiseBase();
  const peaks = 4 + Math.floor((nb(gridX * 0.3, gridY * 0.3) * 0.5 + 0.5) * 3);
  for (let i = 0; i < peaks; i++) {
    const n = nb(gridX * 0.6 + i * 13.1, gridY * 0.6 - i * 9.7) * 0.5 + 0.5;
    const px = cx + (n - 0.5) * w * 0.55;
    const py = cy + (0.15 + (i % 3) * 0.08) * h;
    const pw = 10 + n * 12;
    const ph = 12 + n * 18;

    // Shadow face
    ctx.fillStyle = 'rgba(50,55,66,0.85)';
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px - pw * 0.55, py - ph * 0.35);
    ctx.lineTo(px - pw * 0.65, py);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    // Lit face
    ctx.fillStyle = 'rgba(155,160,168,0.85)';
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px + pw * 0.45, py - ph * 0.35);
    ctx.lineTo(px + pw * 0.65, py);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    // Snow cap on tallest
    if (zoom >= 0.65 && ph > 22) {
      ctx.fillStyle = 'rgba(245,247,250,0.85)';
      ctx.beginPath();
      ctx.moveTo(px, py - ph);
      ctx.lineTo(px - pw * 0.18, py - ph * 0.75);
      ctx.lineTo(px + pw * 0.2, py - ph * 0.75);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Ore glints (subtle, not glitter)
  if (zoom >= 0.75) {
    const nd = noiseDetail();
    for (let i = 0; i < 4; i++) {
      const n = nd(gridX * 1.1 + i * 7.7, gridY * 1.1 - i * 5.3) * 0.5 + 0.5;
      if (n < 0.75) continue;
      const px = cx + (n - 0.5) * w * 0.55;
      const py = cy + (0.35 + (i * 0.08)) * h;
      ctx.globalAlpha = 0.18 + (n - 0.75) * 0.5;
      ctx.fillStyle = 'rgba(255, 220, 170, 1)';
      ctx.fillRect(px, py, 1.2, 1.2);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();

  // Edge definition
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = zoom >= 0.8 ? 0.75 : 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, screenY);
  ctx.lineTo(screenX + w, cy);
  ctx.lineTo(cx, screenY + h);
  ctx.lineTo(screenX, cy);
  ctx.closePath();
  ctx.stroke();
}

