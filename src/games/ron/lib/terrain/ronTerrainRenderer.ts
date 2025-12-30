import { TILE_HEIGHT, TILE_WIDTH, getCachedImage, WATER_ASSET_PATH } from '@/components/game/shared';
import type { RoNTile } from '@/games/ron/types/game';
import { fbm2 } from './noise';
import { beachMaterial, chooseMaterialForTile, getTerrainTexture, type TerrainTextureCache } from './textures';
import { clamp01, hash2i } from './seededRandom';
import { lerpRgb, rgb, rgbToCss, type RGB } from './color';

type Adjacent = { north: boolean; east: boolean; south: boolean; west: boolean };

export interface RoNTerrainRenderer {
  drawTile: (args: {
    ctx: CanvasRenderingContext2D;
    screenX: number;
    screenY: number;
    gridX: number;
    gridY: number;
    tile: RoNTile;
    grid: RoNTile[][];
    gridSize: number;
    timeSeconds: number;
    zoom: number;
    // Used for age-gated visuals like oil deposits.
    showOil: boolean;
    /**
     * Optional override for “water-ness” per tile (e.g. dock footprints rendered as water).
     * If provided, all adjacency and water checks will use this instead of `tile.terrain`.
     */
    isWaterTile?: (x: number, y: number) => boolean;
  }) => void;
}

type TextureCache = TerrainTextureCache;

function clipDiamond(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  ctx.beginPath();
  ctx.moveTo(screenX + w / 2, screenY);
  ctx.lineTo(screenX + w, screenY + h / 2);
  ctx.lineTo(screenX + w / 2, screenY + h);
  ctx.lineTo(screenX, screenY + h / 2);
  ctx.closePath();
  ctx.clip();
}

function getAdjacentWater(
  grid: RoNTile[][],
  gridX: number,
  gridY: number,
  gridSize: number,
  isWaterTile?: (x: number, y: number) => boolean,
): Adjacent {
  const isWaterAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
    if (isWaterTile) return isWaterTile(x, y);
    return grid[y]?.[x]?.terrain === 'water';
  };
  return {
    north: isWaterAt(gridX - 1, gridY),
    east: isWaterAt(gridX, gridY - 1),
    south: isWaterAt(gridX + 1, gridY),
    west: isWaterAt(gridX, gridY + 1),
  };
}

function getAdjacentLand(
  grid: RoNTile[][],
  gridX: number,
  gridY: number,
  gridSize: number,
  isWaterTile?: (x: number, y: number) => boolean,
): Adjacent {
  const isWaterAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
    if (isWaterTile) return isWaterTile(x, y);
    return grid[y]?.[x]?.terrain === 'water';
  };
  return {
    north: !isWaterAt(gridX - 1, gridY),
    east: !isWaterAt(gridX, gridY - 1),
    south: !isWaterAt(gridX + 1, gridY),
    west: !isWaterAt(gridX, gridY + 1),
  };
}

function elevationAt(gridX: number, gridY: number): number {
  // A synthetic elevation field (deterministic) that yields believable shading and regional variation.
  // This does not change gameplay; purely visual.
  const nx = gridX * 0.055;
  const ny = gridY * 0.055;

  // Large-scale hills + medium detail.
  const h1 = fbm2(nx, ny, { octaves: 5, gain: 0.55 });
  const h2 = fbm2(nx * 2.4 + 11.7, ny * 2.4 - 9.2, { octaves: 3, gain: 0.6 });
  const h = 0.68 * h1 + 0.32 * h2;
  return clamp01(0.5 + h * 0.5);
}

function slopeNormal(gridX: number, gridY: number): { nx: number; ny: number; nz: number } {
  // Estimate gradient with a small epsilon in grid space.
  const e = 0.85;
  const hC = elevationAt(gridX, gridY);
  const hX = elevationAt(gridX + e, gridY);
  const hY = elevationAt(gridX, gridY + e);

  const dx = (hX - hC) / e;
  const dy = (hY - hC) / e;

  // “Up” is z. Scale gradient to exaggerate a bit for readability.
  const sx = -dx * 1.8;
  const sy = -dy * 1.8;
  const sz = 1.0;
  const len = Math.hypot(sx, sy, sz) || 1;
  return { nx: sx / len, ny: sy / len, nz: sz / len };
}

function lightIntensity(normal: { nx: number; ny: number; nz: number }): number {
  // Light from top-left-ish (isometric-friendly).
  const lx = -0.55;
  const ly = -0.35;
  const lz = 0.75;
  const lLen = Math.hypot(lx, ly, lz) || 1;
  const lxn = lx / lLen;
  const lyn = ly / lLen;
  const lzn = lz / lLen;
  const ndotl = normal.nx * lxn + normal.ny * lyn + normal.nz * lzn;
  return clamp01(0.35 + ndotl * 0.75);
}

function drawTexturedDiamond(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, texture: HTMLCanvasElement | OffscreenCanvas, variantJitter: number): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  // Slight per-tile jitter in texture sampling to avoid looking tiled.
  const jx = ((variantJitter & 0xff) / 255 - 0.5) * w * 0.18;
  const jy = (((variantJitter >>> 8) & 0xff) / 255 - 0.5) * h * 0.25;

  const destW = w * 1.35;
  const destH = h * 2.15;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srcW = (texture as any).width ?? 128;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srcH = (texture as any).height ?? 128;

  // Draw centered.
  ctx.globalAlpha = 1;
  ctx.drawImage(
    texture as unknown as CanvasImageSource,
    0,
    0,
    srcW,
    srcH,
    cx - destW / 2 + jx,
    cy - destH / 2 + jy,
    destW,
    destH,
  );

  ctx.restore();
}

function overlayShading(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, intensity: number): void {
  // A subtle, non-cartoon shading pass.
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;

  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  // Directional shade.
  const shade = 1 - intensity; // 0 bright -> 1 dark
  ctx.globalAlpha = 0.28 * shade;
  ctx.fillStyle = '#000000';
  ctx.fillRect(screenX, screenY, w, h);

  // Gentle vignette to reduce “flat tile” perception.
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.20)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(screenX, screenY, w, h);

  ctx.restore();
}

function drawRockStrata(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, gridX: number, gridY: number): void {
  // Subtle rock striations across mountain tiles.
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  ctx.save();
  clipDiamond(ctx, screenX, screenY);
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1;
  const seed = hash2i(gridX, gridY, 0x51f3);
  const tilt = ((seed & 0xff) / 255 - 0.5) * 0.45;
  const baseY = screenY + h * 0.15;
  ctx.strokeStyle = 'rgba(30, 30, 30, 0.55)';
  for (let i = 0; i < 6; i++) {
    const yy = baseY + i * (h * 0.14);
    ctx.beginPath();
    ctx.moveTo(screenX - w * 0.1, yy);
    ctx.quadraticCurveTo(screenX + w * 0.5, yy + tilt * h, screenX + w * 1.1, yy + tilt * h * 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOreVeins(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, gridX: number, gridY: number): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  const seed = hash2i(gridX, gridY, 0x0a11);
  const angle = ((seed & 0xffff) / 0xffff) * Math.PI;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cx, -cy);

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = 'rgba(30, 30, 35, 0.85)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const y0 = screenY + h * (0.25 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(screenX - w * 0.2, y0);
    ctx.bezierCurveTo(screenX + w * 0.2, y0 + h * 0.05, screenX + w * 0.55, y0 - h * 0.08, screenX + w * 1.2, y0);
    ctx.stroke();
  }

  // Tiny specular glints.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = 'rgba(220, 220, 230, 0.8)';
  for (let i = 0; i < 5; i++) {
    const px = screenX + w * (0.25 + (((seed >>> (i * 3)) & 0xff) / 255) * 0.5);
    const py = screenY + h * (0.25 + (((seed >>> (i * 5)) & 0xff) / 255) * 0.5);
    ctx.fillRect(px, py, 1.2, 1.2);
  }

  ctx.restore();
}

function drawOilStain(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, gridX: number, gridY: number, timeSeconds: number): void {
  // Oil: dark, slightly iridescent puddles (subtle; not “cartoon blobs”).
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  const seed = hash2i(gridX, gridY, 0x0b1);
  const phase = timeSeconds * 0.6 + ((seed & 0xffff) / 0xffff) * Math.PI * 2;
  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  const puddles = 3 + (seed % 3);
  for (let i = 0; i < puddles; i++) {
    const k = (hash2i(seed, i, 0x22) & 0xffff) / 0xffff;
    const px = cx + (k - 0.5) * w * 0.55;
    const py = cy + (((hash2i(seed, i, 0x77) >>> 8) & 0xff) / 255 - 0.5) * h * 0.55;
    const rw = w * (0.08 + ((seed >>> (i * 3)) & 0xff) / 255 * 0.08);
    const rh = h * (0.10 + ((seed >>> (i * 5)) & 0xff) / 255 * 0.08);
    const a = ((seed >>> (i * 7)) & 0xff) / 255 * Math.PI;

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = 'rgba(8, 10, 14, 1)';
    ctx.beginPath();
    ctx.ellipse(px, py, rw, rh, a, 0, Math.PI * 2);
    ctx.fill();

    // Subtle iridescent sheen.
    const sheen = 0.12 + 0.10 * Math.sin(phase + i);
    ctx.globalAlpha = sheen;
    ctx.fillStyle = 'rgba(90, 120, 160, 0.8)';
    ctx.beginPath();
    ctx.ellipse(px - rw * 0.2, py - rh * 0.2, rw * 0.55, rh * 0.45, a, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawWater(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, gridX: number, gridY: number, timeSeconds: number): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const waterImage = getCachedImage(WATER_ASSET_PATH);

  if (!waterImage) {
    ctx.fillStyle = '#1e4b7a';
    ctx.beginPath();
    ctx.moveTo(screenX + w / 2, screenY);
    ctx.lineTo(screenX + w, screenY + h / 2);
    ctx.lineTo(screenX + w / 2, screenY + h);
    ctx.lineTo(screenX, screenY + h / 2);
    ctx.closePath();
    ctx.fill();
    return;
  }

  const imgW = waterImage.naturalWidth || waterImage.width;
  const imgH = waterImage.naturalHeight || waterImage.height;

  // Animate crop in a deterministic way (looks like subtle water flow).
  const seed = hash2i(gridX, gridY, 0x99);
  const baseU = ((seed & 0xffff) / 0xffff) * 0.6;
  const baseV = (((seed >>> 16) & 0xffff) / 0xffff) * 0.6;

  const flowU = (timeSeconds * 0.012) % 1;
  const flowV = (timeSeconds * 0.009) % 1;

  const cropScale = 0.34;
  const cropW = imgW * cropScale;
  const cropH = imgH * cropScale;
  const maxX = imgW - cropW;
  const maxY = imgH - cropH;

  const srcX = ((baseU + flowU) % 1) * maxX;
  const srcY = ((baseV + flowV) % 1) * maxY;

  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  const cx = screenX + w / 2;
  const cy = screenY + h / 2;

  const destW = w * 1.18;
  const destH = (destW * cropH) / cropW;
  ctx.globalAlpha = 0.98;
  ctx.drawImage(
    waterImage,
    srcX,
    srcY,
    cropW,
    cropH,
    cx - destW / 2,
    cy - destH / 2,
    destW,
    destH,
  );

  // Specular glints (move with time; gives “polished” feel without being noisy).
  const shimmer = fbm2(gridX * 0.3 + timeSeconds * 0.45, gridY * 0.3 - timeSeconds * 0.35, { octaves: 2, gain: 0.5 });
  const glint = clamp01(0.5 + shimmer * 0.75);
  const g = ctx.createRadialGradient(cx + w * 0.15, cy - h * 0.15, 0, cx + w * 0.15, cy - h * 0.15, w * 0.55);
  g.addColorStop(0, `rgba(255,255,255,${0.12 * glint})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(screenX, screenY, w, h);

  ctx.restore();
}

function drawShorelineFoam(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, adjacentLand: Adjacent, timeSeconds: number, seed: number): void {
  // Foam drawn on WATER tiles along edges touching land.
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  const t = timeSeconds * 1.4 + ((seed & 0xffff) / 0xffff) * 10;
  const pulse = 0.5 + 0.5 * Math.sin(t);

  ctx.globalAlpha = 0.22 + 0.10 * pulse;
  ctx.strokeStyle = 'rgba(245, 248, 252, 0.95)';
  ctx.lineWidth = 1.2;

  const top = { x: screenX + w / 2, y: screenY };
  const right = { x: screenX + w, y: screenY + h / 2 };
  const bottom = { x: screenX + w / 2, y: screenY + h };
  const left = { x: screenX, y: screenY + h / 2 };

  const drawEdge = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const wobble = (hash2i(seed, (mx * 3) | 0, 0x31) & 0xff) / 255 - 0.5;
    ctx.quadraticCurveTo(mx + wobble * 6, my + wobble * 3, b.x, b.y);
    ctx.stroke();
  };

  if (adjacentLand.north) drawEdge(left, top);
  if (adjacentLand.east) drawEdge(top, right);
  if (adjacentLand.south) drawEdge(right, bottom);
  if (adjacentLand.west) drawEdge(bottom, left);

  ctx.restore();
}

function drawBeachBandOnLand(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, adjacentWater: Adjacent, elevation: number, tex: HTMLCanvasElement | OffscreenCanvas, variant: number): void {
  // Wet sand band on LAND tiles adjacent to water (improves shoreline realism).
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  ctx.save();
  clipDiamond(ctx, screenX, screenY);

  const band = w * 0.085;
  const top = { x: screenX + w / 2, y: screenY };
  const right = { x: screenX + w, y: screenY + h / 2 };
  const bottom = { x: screenX + w / 2, y: screenY + h };
  const left = { x: screenX, y: screenY + h / 2 };

  const paintStrip = (a: { x: number; y: number }, b: { x: number; y: number }, inward: { dx: number; dy: number }) => {
    // Fill with sand texture + slight darkening for wetness.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x + inward.dx * band, b.y + inward.dy * band);
    ctx.lineTo(a.x + inward.dx * band, a.y + inward.dy * band);
    ctx.closePath();
    ctx.clip();

    // Draw the sand texture into this strip.
    const cx = screenX + w / 2;
    const cy = screenY + h / 2;
    const destW = w * 1.2;
    const destH = h * 2.0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srcW = (tex as any).width ?? 128;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srcH = (tex as any).height ?? 128;
    const j = hash2i(variant, (screenX * 7) | 0, 0x7a);
    const jx = ((j & 0xff) / 255 - 0.5) * w * 0.15;
    const jy = (((j >>> 8) & 0xff) / 255 - 0.5) * h * 0.2;
    ctx.drawImage(tex as unknown as CanvasImageSource, 0, 0, srcW, srcH, cx - destW / 2 + jx, cy - destH / 2 + jy, destW, destH);

    // Wetness overlay.
    ctx.globalAlpha = elevation < 0.42 ? 0.14 : 0.09;
    ctx.fillStyle = '#000000';
    ctx.fillRect(screenX, screenY, w, h);

    ctx.restore();
  };

  // Inward vectors toward diamond center.
  const inward = {
    north: { dx: 0.707, dy: 0.707 },
    east: { dx: -0.707, dy: 0.707 },
    south: { dx: -0.707, dy: -0.707 },
    west: { dx: 0.707, dy: -0.707 },
  } as const;

  if (adjacentWater.north) paintStrip(left, top, inward.north);
  if (adjacentWater.east) paintStrip(top, right, inward.east);
  if (adjacentWater.south) paintStrip(right, bottom, inward.south);
  if (adjacentWater.west) paintStrip(bottom, left, inward.west);

  ctx.restore();
}

export function createRoNTerrainRenderer(): RoNTerrainRenderer {
  const textureCache: TextureCache = new Map();

  return {
    drawTile: ({ ctx, screenX, screenY, gridX, gridY, tile, grid, gridSize, timeSeconds, zoom, showOil, isWaterTile }) => {
      const isWater = isWaterTile ? isWaterTile(gridX, gridY) : tile.terrain === 'water';
      const isMountain = tile.hasMetalDeposit || tile.terrain === 'mountain';
      const elevation = elevationAt(gridX, gridY);

      if (isWater) {
        drawWater(ctx, screenX, screenY, gridX, gridY, timeSeconds);

        const adjacentLand = getAdjacentLand(grid, gridX, gridY, gridSize, isWaterTile);
        if (adjacentLand.north || adjacentLand.east || adjacentLand.south || adjacentLand.west) {
          const seed = hash2i(gridX, gridY, 0x101);
          drawShorelineFoam(ctx, screenX, screenY, adjacentLand, timeSeconds, seed);
        }

        return;
      }

      const adjacentWater = getAdjacentWater(grid, gridX, gridY, gridSize, isWaterTile);
      const nearWater = adjacentWater.north || adjacentWater.east || adjacentWater.south || adjacentWater.west;

      // Choose base material and texture.
      const material = chooseMaterialForTile({
        isWater: false,
        isMountain,
        forestDensity: tile.forestDensity,
        nearWater,
        elevation,
      });

      const variant = hash2i(gridX, gridY, 0x1337) % 9;
      const tex = getTerrainTexture(textureCache, material, variant, 128);
      if (tex) {
        drawTexturedDiamond(ctx, screenX, screenY, tex, hash2i(gridX, gridY, 0x55));
      } else {
        // Fallback if texture creation unavailable.
        ctx.fillStyle = material === 'rock' ? '#7a7873' : '#516b3e';
        ctx.beginPath();
        ctx.moveTo(screenX + TILE_WIDTH / 2, screenY);
        ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
        ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
        ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
      }

      // Beach/wet-sand band on land near water.
      if (nearWater) {
        const beachMat = beachMaterial(elevation);
        const beachTex = getTerrainTexture(textureCache, beachMat, (variant + 4) % 9, 128);
        if (beachTex) {
          drawBeachBandOnLand(ctx, screenX, screenY, adjacentWater, elevation, beachTex, variant);
        }
      }

      // Lighting.
      const normal = slopeNormal(gridX, gridY);
      const li = lightIntensity(normal);
      overlayShading(ctx, screenX, screenY, li);

      // Mountain embellishments.
      if (isMountain) {
        drawRockStrata(ctx, screenX, screenY, gridX, gridY);
        drawOreVeins(ctx, screenX, screenY, gridX, gridY);

        // A bit of snow at high elevation.
        if (elevation > 0.74) {
          const w = TILE_WIDTH;
          const h = TILE_HEIGHT;
          ctx.save();
          clipDiamond(ctx, screenX, screenY);
          const snow = clamp01((elevation - 0.74) / 0.26);
          ctx.globalAlpha = 0.10 + snow * 0.18;
          const g = ctx.createLinearGradient(screenX, screenY, screenX + w, screenY + h);
          g.addColorStop(0, 'rgba(255,255,255,0.75)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(screenX, screenY, w, h);
          ctx.restore();
        }
      }

      // Oil deposits: show only when allowed (industrial+); keep subtle and realistic.
      if (showOil && tile.hasOilDeposit && !isMountain && tile.forestDensity <= 0) {
        drawOilStain(ctx, screenX, screenY, gridX, gridY, timeSeconds);
      }

      // Forest canopy overlay (kept subtle; existing sprite trees are currently very “gamey”).
      // For now, this only adds darker canopy mottling so forests don’t look like plain grass.
      if (tile.forestDensity > 0) {
        const w = TILE_WIDTH;
        const h = TILE_HEIGHT;
        ctx.save();
        clipDiamond(ctx, screenX, screenY);
        const d = clamp01(tile.forestDensity / 100);
        ctx.globalAlpha = 0.10 + 0.12 * d;
        ctx.fillStyle = 'rgba(10, 18, 12, 1)';
        // Soft mottling.
        for (let i = 0; i < 6; i++) {
          const s = hash2i(gridX, gridY, 0x500 + i);
          const px = screenX + w * (0.15 + ((s & 0xff) / 255) * 0.7);
          const py = screenY + h * (0.15 + (((s >>> 8) & 0xff) / 255) * 0.7);
          const rr = (2.5 + (((s >>> 16) & 0xff) / 255) * 6) * (0.7 + d * 0.6);
          ctx.beginPath();
          ctx.ellipse(px, py, rr * 1.2, rr * 0.8, 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // When zoomed in, add a very subtle “grass sparkle” micro highlight.
      if (!isMountain && tile.forestDensity <= 0 && zoom >= 1.35) {
        const w = TILE_WIDTH;
        const h = TILE_HEIGHT;
        const seed = hash2i(gridX, gridY, 0xabc);
        const phase = timeSeconds * 0.7 + ((seed & 0xffff) / 0xffff) * Math.PI * 2;
        const sparkle = 0.5 + 0.5 * Math.sin(phase);
        ctx.save();
        clipDiamond(ctx, screenX, screenY);
        ctx.globalAlpha = 0.06 * sparkle;
        const highlight: RGB = lerpRgb(rgb(220, 232, 210), rgb(245, 245, 235), sparkle);
        ctx.fillStyle = rgbToCss(highlight, 1);
        ctx.fillRect(screenX, screenY, w, h);
        ctx.restore();
      }
    },
  };
}

