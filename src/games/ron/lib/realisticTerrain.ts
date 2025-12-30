/**
 * Rise of Nations - Realistic terrain renderer
 *
 * Goals:
 * - Replace flat/cartoon green diamonds with believable grass/soil micro-texture
 * - Add physically-inspired lighting (sun direction) + subtle ambient occlusion
 * - Upgrade water with depth tint, animated surface, and shoreline foam
 *
 * Notes:
 * - Designed to be RoN-specific to avoid changing IsoCity visuals.
 * - Uses cached CanvasPatterns for performance.
 */
import { createNoise2D } from 'simplex-noise';
import { TILE_HEIGHT, TILE_WIDTH, WATER_ASSET_PATH, getCachedImage } from '@/components/game/shared';
import type { RoNGraphicsSettings } from '../context/RoNContext';

export type AdjacentCardinal = { north: boolean; east: boolean; south: boolean; west: boolean };

type Rgb = { r: number; g: number; b: number };

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

function rgbToCss(c: Rgb, alpha?: number): string {
  const r = Math.round(clamp255(c.r));
  const g = Math.round(clamp255(c.g));
  const b = Math.round(clamp255(c.b));
  if (alpha === undefined) return `rgb(${r} ${g} ${b})`;
  return `rgb(${r} ${g} ${b} / ${clamp01(alpha)})`;
}

function hash2i(x: number, y: number): number {
  // Deterministic 32-bit hash from two ints
  let h = (x | 0) * 374761393 + (y | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function fbm2(noise2D: (x: number, y: number) => number, x: number, y: number, octaves: number): number {
  let amp = 0.5;
  let freq = 1.0;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2D(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  // noise2D is roughly [-1,1]; remap to [0,1]
  return clamp01(sum / norm * 0.5 + 0.5);
}

function clipDiamond(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
  ctx.beginPath();
  ctx.moveTo(screenX + TILE_WIDTH / 2, screenY);
  ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
  ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
  ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
  ctx.closePath();
  ctx.clip();
}

export class RoNRealisticTerrainRenderer {
  private readonly noise2D: (x: number, y: number) => number;
  private readonly patterns = new Map<string, CanvasPattern>();
  private readonly patternSources = new Map<string, HTMLCanvasElement>();

  constructor(seed: string = 'ron-realistic-v1') {
    // Hash seed string into 32-bit number
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const rng = mulberry32(h >>> 0);
    this.noise2D = createNoise2D(rng);
  }

  private getPatternSize(quality: RoNGraphicsSettings['quality']): number {
    switch (quality) {
      case 'low':
        return 128;
      case 'medium':
        return 192;
      default:
        return 256;
    }
  }

  private getPattern(key: string, quality: RoNGraphicsSettings['quality'], build: (size: number) => ImageData): CanvasPattern {
    const cacheKey = `${key}:${quality}`;
    const existing = this.patterns.get(cacheKey);
    if (existing) return existing;

    const size = this.getPatternSize(quality);
    let canvas = this.patternSources.get(cacheKey);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      this.patternSources.set(cacheKey, canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Should never happen in browser; fall back to a dummy pattern-like fill.
      // @ts-expect-error - returning null is fine; caller will guard via fillStyle assignment.
      return null;
    }
    const img = build(size);
    ctx.putImageData(img, 0, 0);
    const pattern = ctx.createPattern(canvas, 'repeat');
    if (!pattern) {
      // @ts-expect-error - returning null is fine; caller will guard via fillStyle assignment.
      return null;
    }
    this.patterns.set(cacheKey, pattern);
    return pattern;
  }

  private buildGrassImage(size: number): ImageData {
    const img = new ImageData(size, size);
    // Natural, less-saturated grass/earth palette (avoid neon greens)
    const grassDark: Rgb = { r: 40, g: 62, b: 34 };
    const grassMid: Rgb = { r: 54, g: 82, b: 42 };
    const grassLight: Rgb = { r: 76, g: 102, b: 52 };
    const soil: Rgb = { r: 88, g: 74, b: 48 };
    const straw: Rgb = { r: 122, g: 116, b: 80 };

    const inv = 1 / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x * inv;
        const ny = y * inv;

        // Multi-scale noise: fine blades + macro dryness
        const fine = fbm2(this.noise2D, nx * 18, ny * 18, 4);
        const mid = fbm2(this.noise2D, nx * 6, ny * 6, 3);
        const macro = fbm2(this.noise2D, nx * 2, ny * 2, 2);

        // Base grass tone
        let c = mixRgb(grassDark, grassLight, fine);
        c = mixRgb(c, grassMid, mid * 0.6);

        // Dry patches / soil showing through
        const dryness = clamp01((macro - 0.52) * 2.2); // 0..1
        const soilAmt = clamp01(dryness * 0.55 + (mid - 0.5) * 0.15);
        c = mixRgb(c, soil, soilAmt);

        // A few straw highlights (tiny bright flecks)
        const fleck = fbm2(this.noise2D, nx * 45, ny * 45, 2);
        const strawAmt = clamp01((fleck - 0.78) * 8) * 0.25;
        c = mixRgb(c, straw, strawAmt);

        const idx = (y * size + x) * 4;
        img.data[idx + 0] = clamp255(c.r);
        img.data[idx + 1] = clamp255(c.g);
        img.data[idx + 2] = clamp255(c.b);
        img.data[idx + 3] = 255;
      }
    }
    return img;
  }

  private buildSandImage(size: number): ImageData {
    const img = new ImageData(size, size);
    const sandDark: Rgb = { r: 146, g: 126, b: 86 };
    const sandMid: Rgb = { r: 174, g: 156, b: 112 };
    const sandLight: Rgb = { r: 206, g: 192, b: 150 };
    const inv = 1 / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x * inv;
        const ny = y * inv;
        const fine = fbm2(this.noise2D, nx * 22, ny * 22, 3);
        const mid = fbm2(this.noise2D, nx * 5, ny * 5, 3);
        let c = mixRgb(sandDark, sandLight, fine);
        c = mixRgb(c, sandMid, mid * 0.65);

        // Slight darker specks
        const speck = fbm2(this.noise2D, nx * 60, ny * 60, 2);
        const speckAmt = clamp01((speck - 0.82) * 10) * 0.2;
        c = mixRgb(c, sandDark, speckAmt);

        const idx = (y * size + x) * 4;
        img.data[idx + 0] = clamp255(c.r);
        img.data[idx + 1] = clamp255(c.g);
        img.data[idx + 2] = clamp255(c.b);
        img.data[idx + 3] = 255;
      }
    }
    return img;
  }

  private buildRockImage(size: number): ImageData {
    const img = new ImageData(size, size);
    // Cooler rock palette with slight brown contamination (more natural than pure grey)
    const rockDark: Rgb = { r: 52, g: 54, b: 58 };
    const rockMid: Rgb = { r: 86, g: 89, b: 94 };
    const rockLight: Rgb = { r: 138, g: 142, b: 150 };
    const dirt: Rgb = { r: 92, g: 78, b: 58 };

    const inv = 1 / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x * inv;
        const ny = y * inv;
        const fine = fbm2(this.noise2D, nx * 18, ny * 18, 4);
        const mid = fbm2(this.noise2D, nx * 6, ny * 6, 3);
        const cracks = fbm2(this.noise2D, nx * 2.5 + ny * 1.4, ny * 2.5, 2);

        let c = mixRgb(rockDark, rockLight, fine);
        c = mixRgb(c, rockMid, mid * 0.6);

        // Dirt in crevices
        const dirtAmt = clamp01((cracks - 0.55) * 2.1) * 0.35;
        c = mixRgb(c, dirt, dirtAmt);

        // Small bright mineral flecks
        const fleck = fbm2(this.noise2D, nx * 55, ny * 55, 2);
        const fleckAmt = clamp01((fleck - 0.84) * 10) * 0.22;
        c = mixRgb(c, rockLight, fleckAmt);

        const idx = (y * size + x) * 4;
        img.data[idx + 0] = clamp255(c.r);
        img.data[idx + 1] = clamp255(c.g);
        img.data[idx + 2] = clamp255(c.b);
        img.data[idx + 3] = 255;
      }
    }
    return img;
  }

  private buildWaterOverlay(size: number): ImageData {
    const img = new ImageData(size, size);
    // This is an alpha-only overlay (stored in RGB too) used as subtle wave highlights.
    const inv = 1 / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x * inv;
        const ny = y * inv;
        const waves = fbm2(this.noise2D, nx * 10, ny * 10, 3);
        const streaks = fbm2(this.noise2D, nx * 3 + ny * 1.2, ny * 3, 2);
        const v = clamp01((waves * 0.65 + streaks * 0.35 - 0.55) * 2.2);
        const a = Math.round(clamp01(v) * 255);
        const idx = (y * size + x) * 4;
        img.data[idx + 0] = 255;
        img.data[idx + 1] = 255;
        img.data[idx + 2] = 255;
        img.data[idx + 3] = a;
      }
    }
    return img;
  }

  private applyGroundLighting(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, lightDir: { x: number; y: number }): void {
    // Light gradient across tile (sunlight), very subtle
    const cx = screenX + TILE_WIDTH / 2;
    const cy = screenY + TILE_HEIGHT / 2;
    const lx = cx - lightDir.x * TILE_WIDTH * 0.35;
    const ly = cy - lightDir.y * TILE_HEIGHT * 0.35;
    const gx = cx + lightDir.x * TILE_WIDTH * 0.35;
    const gy = cy + lightDir.y * TILE_HEIGHT * 0.35;
    const grad = ctx.createLinearGradient(lx, ly, gx, gy);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.00)');
    grad.addColorStop(1, 'rgba(0,0,0,0.10)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(screenX - 2, screenY - 2, TILE_WIDTH + 4, TILE_HEIGHT + 4);
    ctx.globalCompositeOperation = 'source-over';
  }

  private applyTileAO(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, strength: number): void {
    // Ambient occlusion-ish vignette to break the flat diamond look.
    const cx = screenX + TILE_WIDTH / 2;
    const cy = screenY + TILE_HEIGHT / 2;
    const r = Math.max(TILE_WIDTH, TILE_HEIGHT) * 0.62;
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, `rgba(0,0,0,${0.0})`);
    g.addColorStop(1, `rgba(0,0,0,${clamp01(strength)})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(screenX - 2, screenY - 2, TILE_WIDTH + 4, TILE_HEIGHT + 4);
    ctx.globalCompositeOperation = 'source-over';
  }

  getSunLight(timeOfDay: RoNGraphicsSettings['timeOfDay'], t: number): { dir: { x: number; y: number }; warm: number } {
    // Provide a consistent sun direction + warmth value for shading.
    // t is seconds.
    const phase = timeOfDay === 'auto' ? (t * 0.03) % (Math.PI * 2) : 0;
    const baseAngle =
      timeOfDay === 'dawn' ? -0.65 :
      timeOfDay === 'dusk' ? 2.55 :
      timeOfDay === 'night' ? 3.14 :
      timeOfDay === 'auto' ? phase :
      0.85; // day
    const dir = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) * 0.65 };
    const warm =
      timeOfDay === 'dawn' || timeOfDay === 'dusk' ? 0.45 :
      timeOfDay === 'night' ? 0.0 :
      0.12;
    return { dir, warm };
  }

  drawGrassTile(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    gridX: number,
    gridY: number,
    graphics: RoNGraphicsSettings,
    tSeconds: number
  ): void {
    const { dir } = this.getSunLight(graphics.timeOfDay, tSeconds);
    const grassPattern = this.getPattern('grass', graphics.quality, (size) => this.buildGrassImage(size));

    ctx.save();
    clipDiamond(ctx, screenX, screenY);

    // Slightly different alignment per tile to avoid obvious repeats.
    // (Patterns are in screen-space; shifting by grid coords reduces uniformity.)
    const j = hash2i(gridX, gridY);
    const shiftX = ((j & 255) - 128) * 0.12;
    const shiftY = (((j >>> 8) & 255) - 128) * 0.08;
    ctx.translate(shiftX, shiftY);
    ctx.fillStyle = grassPattern;
    ctx.fillRect(screenX - shiftX - 4, screenY - shiftY - 4, TILE_WIDTH + 8, TILE_HEIGHT + 8);
    ctx.translate(-shiftX, -shiftY);

    // Macro soil patch overlay (very subtle)
    const macro = fbm2(this.noise2D, gridX * 0.07, gridY * 0.07, 3);
    const patch = clamp01((macro - 0.58) * 2.2);
    if (patch > 0.02) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(90, 78, 55, ${patch * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(screenX + TILE_WIDTH * 0.5, screenY + TILE_HEIGHT * 0.62, TILE_WIDTH * 0.22, TILE_HEIGHT * 0.16, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    this.applyGroundLighting(ctx, screenX, screenY, dir);
    this.applyTileAO(ctx, screenX, screenY, graphics.quality === 'low' ? 0.10 : 0.12);

    ctx.restore();
  }

  drawRockTile(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    gridX: number,
    gridY: number,
    graphics: RoNGraphicsSettings,
    tSeconds: number
  ): void {
    const { dir } = this.getSunLight(graphics.timeOfDay, tSeconds);
    const rockPattern = this.getPattern('rock', graphics.quality, (size) => this.buildRockImage(size));

    ctx.save();
    clipDiamond(ctx, screenX, screenY);

    const j = hash2i(gridX, gridY);
    const shiftX = ((j & 255) - 128) * 0.10;
    const shiftY = (((j >>> 8) & 255) - 128) * 0.08;
    ctx.translate(shiftX, shiftY);
    ctx.fillStyle = rockPattern;
    ctx.fillRect(screenX - shiftX - 4, screenY - shiftY - 4, TILE_WIDTH + 8, TILE_HEIGHT + 8);
    ctx.translate(-shiftX, -shiftY);

    this.applyGroundLighting(ctx, screenX, screenY, dir);
    this.applyTileAO(ctx, screenX, screenY, graphics.quality === 'low' ? 0.14 : 0.16);

    ctx.restore();
  }

  drawWaterTile(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    gridX: number,
    gridY: number,
    _adjacentWater: AdjacentCardinal,
    adjacentLand: AdjacentCardinal,
    graphics: RoNGraphicsSettings,
    tSeconds: number
  ): void {
    const waterImage = getCachedImage(WATER_ASSET_PATH);
    const wavePattern = this.getPattern('waterWaves', graphics.quality, (size) => this.buildWaterOverlay(size));

    const { dir, warm } = this.getSunLight(graphics.timeOfDay, tSeconds);

    ctx.save();
    clipDiamond(ctx, screenX, screenY);

    // Base water texture crop (like IsoCity), but we'll add depth tint and animated highlights on top.
    if (waterImage) {
      const imgW = waterImage.naturalWidth || waterImage.width;
      const imgH = waterImage.naturalHeight || waterImage.height;
      const seedX = ((gridX * 7919 + gridY * 6271) % 1000) / 1000;
      const seedY = ((gridX * 4177 + gridY * 9311) % 1000) / 1000;
      const cropScale = 0.38;
      const cropW = imgW * cropScale;
      const cropH = imgH * cropScale;
      const srcX = seedX * (imgW - cropW);
      const srcY = seedY * (imgH - cropH);

      const tileCenterX = screenX + TILE_WIDTH / 2;
      const tileCenterY = screenY + TILE_HEIGHT / 2;
      const aspect = cropH / cropW;
      const destW = TILE_WIDTH * 1.2;
      const destH = destW * aspect;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(
        waterImage,
        srcX,
        srcY,
        cropW,
        cropH,
        Math.round(tileCenterX - destW / 2),
        Math.round(tileCenterY - destH / 2),
        Math.round(destW),
        Math.round(destH)
      );
      ctx.globalAlpha = 1;
    } else {
      // Fallback base color
      ctx.fillStyle = '#0b3b5a';
      ctx.fillRect(screenX - 4, screenY - 4, TILE_WIDTH + 8, TILE_HEIGHT + 8);
    }

    // Depth tint: shallow near shore, deeper offshore.
    const shoreFactor =
      (adjacentLand.north ? 1 : 0) +
      (adjacentLand.east ? 1 : 0) +
      (adjacentLand.south ? 1 : 0) +
      (adjacentLand.west ? 1 : 0);
    const shallow = clamp01(shoreFactor / 3);
    const deepColor: Rgb = { r: 8, g: 44, b: 70 };
    const shallowColor: Rgb = { r: 18, g: 84, b: 92 };
    const tint = mixRgb(deepColor, shallowColor, shallow);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgbToCss(tint, 0.55);
    ctx.fillRect(screenX - 4, screenY - 4, TILE_WIDTH + 8, TILE_HEIGHT + 8);
    ctx.globalCompositeOperation = 'source-over';

    // Animated wave highlights (screen-space drift)
    const driftX = (tSeconds * 14 + gridX * 3) % 256;
    const driftY = (tSeconds * 9 + gridY * 5) % 256;
    ctx.save();
    ctx.translate(-driftX, -driftY);
    ctx.globalAlpha = graphics.quality === 'low' ? 0.18 : 0.22;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = wavePattern;
    ctx.fillRect(screenX + driftX - 10, screenY + driftY - 10, TILE_WIDTH + 20, TILE_HEIGHT + 20);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Specular-ish sunlight streak (subtle, warmer at dawn/dusk)
    const cx = screenX + TILE_WIDTH / 2;
    const cy = screenY + TILE_HEIGHT / 2;
    const sx = cx - dir.x * TILE_WIDTH * 0.25;
    const sy = cy - dir.y * TILE_HEIGHT * 0.25;
    const ex = cx + dir.x * TILE_WIDTH * 0.25;
    const ey = cy + dir.y * TILE_HEIGHT * 0.25;
    const spec = ctx.createLinearGradient(sx, sy, ex, ey);
    const warmTint = warm > 0 ? `rgba(255, 220, 170, ${0.10 * warm})` : 'rgba(255,255,255,0.03)';
    spec.addColorStop(0, 'rgba(255,255,255,0)');
    spec.addColorStop(0.5, warmTint);
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = spec;
    ctx.fillRect(screenX - 4, screenY - 4, TILE_WIDTH + 8, TILE_HEIGHT + 8);
    ctx.globalCompositeOperation = 'source-over';

    // Shoreline foam (only where land is adjacent)
    const foamStrength = graphics.quality === 'low' ? 0.35 : 0.45;
    const foamPhase = tSeconds * 2.2 + (gridX + gridY) * 0.4;
    const foamJitter = (Math.sin(foamPhase) * 0.5 + 0.5) * 2;
    ctx.strokeStyle = `rgba(255,255,255,${foamStrength})`;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';

    // Helper: draw a foamy edge segment along a diamond side.
    const drawFoamEdge = (edge: 'north' | 'east' | 'south' | 'west') => {
      const top = { x: screenX + TILE_WIDTH / 2, y: screenY };
      const right = { x: screenX + TILE_WIDTH, y: screenY + TILE_HEIGHT / 2 };
      const bottom = { x: screenX + TILE_WIDTH / 2, y: screenY + TILE_HEIGHT };
      const left = { x: screenX, y: screenY + TILE_HEIGHT / 2 };
      const inward = 2.5 + foamJitter;

      const jitterAlong = (a: number, b: number, t: number) => lerp(a, b, t) + (Math.sin(foamPhase + t * 12) * 0.6);

      ctx.beginPath();
      if (edge === 'north') {
        const ax = jitterAlong(left.x, top.x, 0.15);
        const ay = jitterAlong(left.y, top.y, 0.15) + inward;
        const bx = jitterAlong(top.x, right.x, 0.85);
        const by = jitterAlong(top.y, right.y, 0.85) + inward;
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(top.x, top.y + inward, bx, by);
      } else if (edge === 'east') {
        const ax = jitterAlong(top.x, right.x, 0.15) - inward;
        const ay = jitterAlong(top.y, right.y, 0.15);
        const bx = jitterAlong(right.x, bottom.x, 0.85) - inward;
        const by = jitterAlong(right.y, bottom.y, 0.85);
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(right.x - inward, right.y, bx, by);
      } else if (edge === 'south') {
        const ax = jitterAlong(right.x, bottom.x, 0.15);
        const ay = jitterAlong(right.y, bottom.y, 0.15) - inward;
        const bx = jitterAlong(bottom.x, left.x, 0.85);
        const by = jitterAlong(bottom.y, left.y, 0.85) - inward;
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(bottom.x, bottom.y - inward, bx, by);
      } else {
        const ax = jitterAlong(bottom.x, left.x, 0.15) + inward;
        const ay = jitterAlong(bottom.y, left.y, 0.15);
        const bx = jitterAlong(left.x, top.x, 0.85) + inward;
        const by = jitterAlong(left.y, top.y, 0.85);
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(left.x + inward, left.y, bx, by);
      }
      ctx.stroke();
    };

    if (adjacentLand.north) drawFoamEdge('north');
    if (adjacentLand.east) drawFoamEdge('east');
    if (adjacentLand.south) drawFoamEdge('south');
    if (adjacentLand.west) drawFoamEdge('west');

    // Slight vignette to give water body depth
    this.applyTileAO(ctx, screenX, screenY, graphics.quality === 'low' ? 0.08 : 0.10);

    ctx.restore();
  }

  drawBeachOverlay(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    gridX: number,
    gridY: number,
    adjacentLand: AdjacentCardinal,
    graphics: RoNGraphicsSettings,
    tSeconds: number
  ): void {
    const sandPattern = this.getPattern('sand', graphics.quality, (size) => this.buildSandImage(size));
    const foamPhase = tSeconds * 2.2 + (gridX + gridY) * 0.35;

    ctx.save();
    clipDiamond(ctx, screenX, screenY);

    // Sand underlay at shoreline edges only
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = sandPattern;
    ctx.globalAlpha = 0.85;

    const paintEdge = (edge: 'north' | 'east' | 'south' | 'west') => {
      const inset = 8;
      ctx.beginPath();
      if (edge === 'north') {
        ctx.moveTo(screenX + TILE_WIDTH / 2, screenY);
        ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
        ctx.lineTo(screenX + TILE_WIDTH - inset, screenY + TILE_HEIGHT / 2 + inset);
        ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + inset);
        ctx.lineTo(screenX + inset, screenY + TILE_HEIGHT / 2 + inset);
        ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
      } else if (edge === 'east') {
        ctx.moveTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
        ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
        ctx.lineTo(screenX + TILE_WIDTH / 2 - inset, screenY + TILE_HEIGHT - inset);
        ctx.lineTo(screenX + TILE_WIDTH - inset, screenY + TILE_HEIGHT / 2);
      } else if (edge === 'south') {
        ctx.moveTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
        ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
        ctx.lineTo(screenX + inset, screenY + TILE_HEIGHT / 2 - inset);
        ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT - inset);
        ctx.lineTo(screenX + TILE_WIDTH - inset, screenY + TILE_HEIGHT / 2 - inset);
        ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
      } else {
        ctx.moveTo(screenX, screenY + TILE_HEIGHT / 2);
        ctx.lineTo(screenX + TILE_WIDTH / 2, screenY);
        ctx.lineTo(screenX + TILE_WIDTH / 2 + inset, screenY + inset);
        ctx.lineTo(screenX + inset, screenY + TILE_HEIGHT / 2);
      }
      ctx.closePath();
      ctx.fill();
    };

    if (adjacentLand.north) paintEdge('north');
    if (adjacentLand.east) paintEdge('east');
    if (adjacentLand.south) paintEdge('south');
    if (adjacentLand.west) paintEdge('west');

    ctx.globalAlpha = 1;

    // Wet-sand darkening + foam flicker at the waterline
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(120, 112, 84, 0.18)';
    if (adjacentLand.north) paintEdge('north');
    if (adjacentLand.east) paintEdge('east');
    if (adjacentLand.south) paintEdge('south');
    if (adjacentLand.west) paintEdge('west');
    ctx.globalCompositeOperation = 'source-over';

    // Foam sparkle (thin white strokes)
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + (Math.sin(foamPhase) * 0.5 + 0.5) * 0.18})`;
    ctx.lineWidth = 1;
    const cx = screenX + TILE_WIDTH / 2;
    const cy = screenY + TILE_HEIGHT / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, TILE_WIDTH * 0.18, TILE_HEIGHT * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

