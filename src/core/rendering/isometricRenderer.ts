/**
 * Core Isometric Rendering - Shared rendering utilities for isometric games
 * 
 * This module provides the foundational rendering functions that all game modes share.
 */

import { TILE_WIDTH, TILE_HEIGHT, GridPosition, ScreenPosition } from '../types/grid';
import { Viewport, ViewportBounds, SpriteCoords } from '../types/rendering';

// ============================================================================
// Coordinate Conversion
// ============================================================================

/**
 * Convert grid coordinates to screen (isometric) coordinates
 * 
 * @param gridX - X position on the grid
 * @param gridY - Y position on the grid
 * @param offset - Current viewport offset
 * @param zoom - Current zoom level
 * @returns Screen position in pixels
 */
export function gridToScreen(
  gridX: number,
  gridY: number,
  offset: { x: number; y: number },
  zoom: number
): ScreenPosition {
  const screenX = (gridX - gridY) * (TILE_WIDTH / 2) * zoom + offset.x;
  const screenY = (gridX + gridY) * (TILE_HEIGHT / 2) * zoom + offset.y;
  return { x: screenX, y: screenY };
}

/**
 * Convert screen coordinates to grid coordinates
 * 
 * @param screenX - X position on screen in pixels
 * @param screenY - Y position on screen in pixels
 * @param offset - Current viewport offset
 * @param zoom - Current zoom level
 * @returns Grid position (may be fractional, use floor for tile position)
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  offset: { x: number; y: number },
  zoom: number
): GridPosition {
  const relX = (screenX - offset.x) / zoom;
  const relY = (screenY - offset.y) / zoom;
  
  const gridX = (relX / (TILE_WIDTH / 2) + relY / (TILE_HEIGHT / 2)) / 2;
  const gridY = (relY / (TILE_HEIGHT / 2) - relX / (TILE_WIDTH / 2)) / 2;
  
  return { x: gridX, y: gridY };
}

/**
 * Get the grid tile at a screen position
 */
export function getTileAtScreen(
  screenX: number,
  screenY: number,
  offset: { x: number; y: number },
  zoom: number
): GridPosition {
  const { x, y } = screenToGrid(screenX, screenY, offset, zoom);
  return { x: Math.floor(x), y: Math.floor(y) };
}

// ============================================================================
// Viewport Calculations
// ============================================================================

/**
 * Calculate visible grid bounds from viewport state
 */
export function getVisibleBounds(viewport: Viewport, gridSize: number): ViewportBounds {
  const { offset, zoom, canvasSize } = viewport;
  const padding = 5; // Extra tiles to render beyond visible area
  
  // Calculate corners in grid space
  const topLeft = screenToGrid(0, 0, offset, zoom);
  const topRight = screenToGrid(canvasSize.width, 0, offset, zoom);
  const bottomLeft = screenToGrid(0, canvasSize.height, offset, zoom);
  const bottomRight = screenToGrid(canvasSize.width, canvasSize.height, offset, zoom);
  
  // Find min/max bounds
  const minX = Math.max(0, Math.floor(Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) - padding);
  const maxX = Math.min(gridSize - 1, Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) + padding);
  const minY = Math.max(0, Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) - padding);
  const maxY = Math.min(gridSize - 1, Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) + padding);
  
  return { minX, maxX, minY, maxY };
}

/**
 * Check if a tile is visible in the current viewport
 */
export function isTileVisible(
  tileX: number,
  tileY: number,
  viewport: Viewport,
  margin: number = 100
): boolean {
  const { x, y } = gridToScreen(tileX, tileY, viewport.offset, viewport.zoom);
  const { width, height } = viewport.canvasSize;
  
  return x >= -margin && x <= width + margin && y >= -margin && y <= height + margin;
}

/**
 * Calculate viewport center in grid coordinates
 */
export function getViewportCenter(viewport: Viewport): GridPosition {
  const centerX = viewport.canvasSize.width / 2;
  const centerY = viewport.canvasSize.height / 2;
  return screenToGrid(centerX, centerY, viewport.offset, viewport.zoom);
}

// ============================================================================
// Tile Drawing Helpers
// ============================================================================

/**
 * Draw a flat diamond-shaped tile (for terrain, zones)
 */
export function drawFlatTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  zoom: number,
  fillStyle: string,
  strokeStyle?: string
): void {
  const w = TILE_WIDTH * zoom;
  const h = TILE_HEIGHT * zoom;
  
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + h / 2);          // Left point
  ctx.lineTo(screenX + w / 2, screenY);          // Top point
  ctx.lineTo(screenX + w, screenY + h / 2);      // Right point
  ctx.lineTo(screenX + w / 2, screenY + h);      // Bottom point
  ctx.closePath();
  
  ctx.fillStyle = fillStyle;
  ctx.fill();
  
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Draw a tile outline (for selection, hover effects)
 */
export function drawTileOutline(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  zoom: number,
  strokeStyle: string,
  lineWidth: number = 2
): void {
  const w = TILE_WIDTH * zoom;
  const h = TILE_HEIGHT * zoom;
  
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + h / 2);
  ctx.lineTo(screenX + w / 2, screenY);
  ctx.lineTo(screenX + w, screenY + h / 2);
  ctx.lineTo(screenX + w / 2, screenY + h);
  ctx.closePath();
  
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/**
 * Draw a multi-tile selection area
 */
export function drawSelectionArea(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  offset: { x: number; y: number },
  zoom: number,
  fillStyle: string,
  strokeStyle: string
): void {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const { x: sx, y: sy } = gridToScreen(x, y, offset, zoom);
      drawFlatTile(ctx, sx, sy, zoom, fillStyle, strokeStyle);
    }
  }
}

// ============================================================================
// Sprite Drawing
// ============================================================================

/**
 * Draw a sprite from a sprite sheet
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  coords: SpriteCoords,
  destX: number,
  destY: number,
  destWidth: number,
  destHeight: number,
  flipped: boolean = false
): void {
  if (flipped) {
    ctx.save();
    ctx.translate(destX + destWidth, destY);
    ctx.scale(-1, 1);
    ctx.drawImage(
      image,
      coords.sx, coords.sy, coords.sw, coords.sh,
      0, 0, destWidth, destHeight
    );
    ctx.restore();
  } else {
    ctx.drawImage(
      image,
      coords.sx, coords.sy, coords.sw, coords.sh,
      destX, destY, destWidth, destHeight
    );
  }
}

/**
 * Calculate sprite coordinates from grid position in sprite sheet
 */
export function getSpriteSheetCoords(
  row: number,
  col: number,
  cols: number,
  rows: number,
  sheetWidth: number,
  sheetHeight: number
): SpriteCoords {
  const tileWidth = sheetWidth / cols;
  const tileHeight = sheetHeight / rows;
  
  return {
    sx: col * tileWidth,
    sy: row * tileHeight,
    sw: tileWidth,
    sh: tileHeight,
  };
}

// ============================================================================
// Canvas Utilities
// ============================================================================

/**
 * Clear a canvas
 */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Set canvas size to match container with device pixel ratio
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  
  return ctx;
}

// ============================================================================
// Render Order
// ============================================================================

/**
 * Generate tile render order for proper isometric depth sorting.
 * Tiles are rendered back-to-front (painter's algorithm).
 */
export function* generateRenderOrder(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): Generator<GridPosition> {
  // Render in diagonal stripes from back to front
  for (let sum = minX + minY; sum <= maxX + maxY; sum++) {
    for (let x = Math.max(minX, sum - maxY); x <= Math.min(maxX, sum - minY); x++) {
      const y = sum - x;
      if (y >= minY && y <= maxY) {
        yield { x, y };
      }
    }
  }
}

/**
 * Get render order as array (for iteration without generator)
 */
export function getRenderOrder(bounds: ViewportBounds): GridPosition[] {
  const tiles: GridPosition[] = [];
  for (const pos of generateRenderOrder(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)) {
    tiles.push(pos);
  }
  return tiles;
}
