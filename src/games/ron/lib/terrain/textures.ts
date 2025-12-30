import { fbm2 } from './noise';
import { clamp01, hash2i, mulberry32 } from './seededRandom';
import { clampRgb, lerpRgb, rgb, type RGB } from './color';

export type TerrainMaterial = 'grassland' | 'forestFloor' | 'wetlands' | 'sand' | 'rock' | 'mud';

type TextureKey = `${TerrainMaterial}:${number}`;

export type TerrainTextureCache = Map<TextureKey, HTMLCanvasElement | OffscreenCanvas>;

function createCanvas(size: number): HTMLCanvasElement | OffscreenCanvas | null {
  // Keep DOM usage lazy. RoNCanvas is a client component, but modules may still load during SSR.
  if (typeof window === 'undefined') return null;
  if ('OffscreenCanvas' in window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (window as any).OffscreenCanvas(size, size) as OffscreenCanvas;
  }
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function getCtx2D(c: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (c as any).getContext('2d');
}

function putImageData(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  img: ImageData,
): void {
  // OffscreenCanvasRenderingContext2D supports putImageData too.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).putImageData(img, 0, 0);
}

function materialPalette(material: TerrainMaterial): { baseA: RGB; baseB: RGB; speckA: RGB; speckB: RGB } {
  // Deliberately muted, “earthy”, less cartoon-saturated.
  switch (material) {
    case 'grassland':
      return {
        baseA: rgb(68, 92, 54),   // olive green
        baseB: rgb(94, 104, 62),  // dry grass
        speckA: rgb(60, 74, 48),  // dark tufts
        speckB: rgb(126, 118, 78), // straw
      };
    case 'forestFloor':
      return {
        baseA: rgb(55, 74, 46),
        baseB: rgb(72, 82, 52),
        speckA: rgb(45, 56, 36),
        speckB: rgb(112, 98, 68),
      };
    case 'wetlands':
      return {
        baseA: rgb(56, 74, 56),
        baseB: rgb(84, 92, 70),
        speckA: rgb(38, 54, 44),
        speckB: rgb(120, 112, 86),
      };
    case 'sand':
      return {
        baseA: rgb(186, 162, 120),
        baseB: rgb(210, 188, 142),
        speckA: rgb(160, 136, 98),
        speckB: rgb(230, 216, 178),
      };
    case 'mud':
      return {
        baseA: rgb(92, 78, 58),
        baseB: rgb(112, 92, 68),
        speckA: rgb(70, 58, 42),
        speckB: rgb(146, 118, 86),
      };
    case 'rock':
    default:
      return {
        baseA: rgb(108, 110, 110),
        baseB: rgb(134, 128, 118),
        speckA: rgb(76, 78, 82),
        speckB: rgb(170, 164, 150),
      };
  }
}

export function getTerrainTexture(
  cache: TerrainTextureCache,
  material: TerrainMaterial,
  variant: number,
  size: number = 128,
): HTMLCanvasElement | OffscreenCanvas | null {
  const key: TextureKey = `${material}:${variant}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const canvas = createCanvas(size);
  if (!canvas) return null;

  const ctx = getCtx2D(canvas);
  if (!ctx) return null;

  const { baseA, baseB, speckA, speckB } = materialPalette(material);
  const rand = mulberry32(hash2i(variant, size, 0x9e3779b9));

  // Base fill.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).fillStyle = `rgb(${baseA.r}, ${baseA.g}, ${baseA.b})`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).fillRect(0, 0, size, size);

  const img = new ImageData(size, size);
  const data = img.data;

  // A low-frequency “albedo” noise + higher-frequency micro-variation.
  const scale1 = 1 / (size * 0.9);
  const scale2 = 1 / (size * 0.22);
  const scale3 = 1 / (size * 0.08);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x * scale1;
      const v = y * scale1;

      const n1 = fbm2(u + variant * 11.3, v - variant * 7.1, { octaves: 4, gain: 0.55 });
      const n2 = fbm2(x * scale2 + variant * 3.9, y * scale2 - variant * 2.1, { octaves: 3, gain: 0.6 });
      const n3 = fbm2(x * scale3, y * scale3, { octaves: 2, gain: 0.5 });

      const t = clamp01(0.5 + n1 * 0.55);
      let c = lerpRgb(baseA, baseB, t);

      // Micro contrast (very subtle; keeps realism without “salt pepper” noise).
      const micro = (n2 * 0.08 + n3 * 0.05);
      c = clampRgb({ r: c.r * (1 + micro), g: c.g * (1 + micro), b: c.b * (1 + micro) });

      // Speckles/pebbles density depends on material.
      const speckChance =
        material === 'rock' ? 0.006 :
        material === 'sand' ? 0.004 :
        material === 'mud' ? 0.005 :
        material === 'forestFloor' ? 0.004 :
        0.003;

      // Deterministic speckle using a cheap hash from pixel coord.
      const ph = hash2i(x + variant * 97, y - variant * 131, 0xdeadbeef);
      if ((ph & 0xffff) / 0xffff < speckChance) {
        const st = ((ph >>> 16) & 0xffff) / 0xffff;
        const sCol = lerpRgb(speckA, speckB, st);
        // Blend speckle into base.
        c = lerpRgb(c, sCol, 0.55);
      }

      // A tiny “fiber” directional streak for grass/sand (subtle).
      if (material === 'grassland' || material === 'sand' || material === 'forestFloor') {
        const streak = fbm2((x + variant * 17) * (1 / (size * 0.05)), (y - variant * 13) * (1 / (size * 0.25)), { octaves: 2, gain: 0.5 });
        const s = clamp01(0.5 + streak * 0.55);
        const k = (s - 0.5) * 0.06; // extremely subtle
        c = clampRgb({ r: c.r * (1 + k), g: c.g * (1 + k), b: c.b * (1 + k) });
      }

      const i = (y * size + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }

  putImageData(ctx, img);

  // A few larger pebble dots for rock/sand.
  if (material === 'rock' || material === 'sand' || material === 'mud') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c2 = ctx as any as CanvasRenderingContext2D;
    c2.save();
    c2.globalAlpha = 0.18;
    for (let i = 0; i < 140; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const r = (material === 'rock' ? 1.3 : 1.0) + rand() * 1.6;
      const shade = 0.55 + rand() * 0.45;
      const peb = lerpRgb(speckA, speckB, shade);
      c2.fillStyle = `rgb(${peb.r | 0}, ${peb.g | 0}, ${peb.b | 0})`;
      c2.beginPath();
      c2.arc(px, py, r, 0, Math.PI * 2);
      c2.fill();
    }
    c2.restore();
  }

  cache.set(key, canvas);
  return canvas;
}

export function chooseMaterialForTile(opts: {
  isWater: boolean;
  isMountain: boolean;
  forestDensity: number;
  nearWater: boolean;
  elevation: number; // [0..1]
}): TerrainMaterial {
  if (opts.isWater) return 'wetlands'; // unused for water; placeholder
  if (opts.isMountain) return 'rock';
  if (opts.forestDensity > 0) return 'forestFloor';
  if (opts.nearWater && opts.elevation < 0.42) return 'wetlands';
  return 'grassland';
}

export function beachMaterial(elevation: number): TerrainMaterial {
  // Slightly darker “wet sand” for lower elevations.
  return elevation < 0.35 ? 'mud' : 'sand';
}

export function clampElevation01(e: number): number {
  return clamp01(e);
}

