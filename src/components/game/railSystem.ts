/**
 * Rail System - Railway tracks with proper connections, curves, and spurs
 * Handles rail rendering with 2 tracks per tile
 */

import { Tile } from '@/types/game';
import { TILE_WIDTH, TILE_HEIGHT, CarDirection } from './types';

// ============================================================================
// Types
// ============================================================================

/** Rail adjacency - which directions have connected rails */
export interface RailAdjacency {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

/** Rail connection pattern for rendering */
export type RailPattern = 
  | 'straight_ns'      // North-South straight
  | 'straight_ew'      // East-West straight
  | 'curve_ne'         // Curve from North to East
  | 'curve_se'         // Curve from South to East
  | 'curve_sw'         // Curve from South to West
  | 'curve_nw'         // Curve from North to West
  | 'spur_n'           // Spur to North (dead end)
  | 'spur_e'           // Spur to East (dead end)
  | 'spur_s'           // Spur to South (dead end)
  | 'spur_w'           // Spur to West (dead end)
  | 'three_way_ne'     // Three-way: North, East, South
  | 'three_way_se'     // Three-way: South, East, West
  | 'three_way_sw'     // Three-way: South, West, North
  | 'three_way_nw'     // Three-way: North, West, East
  | 'four_way'          // Four-way intersection
  | 'crossing';         // Crossing (two tracks crossing)

// ============================================================================
// Constants
// ============================================================================

/** Rail rendering constants */
export const RAIL_CONFIG = {
  TRACK_WIDTH: 0.08,        // Width ratio for each track
  TRACK_SPACING: 0.12,     // Spacing between the two tracks
  TIE_WIDTH: 0.06,         // Width of ties (perpendicular to tracks)
  TIE_SPACING: 0.15,       // Spacing between ties along tracks
};

/** Colors for rail rendering */
export const RAIL_COLORS = {
  TRACK: '#2a2a2a',        // Dark gray for rails
  TIE: '#4a3a2a',          // Brown for wooden ties
  BALLAST: '#5a5a5a',      // Gravel/ballast color
  BALLAST_DARK: '#4a4a4a', // Darker ballast
};

// ============================================================================
// Rail Analysis Functions
// ============================================================================

/**
 * Check if a tile is a rail
 */
function isRail(grid: Tile[][], gridSize: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return false;
  return grid[y][x].building.type === 'rail';
}

/**
 * Get adjacent rail info for a tile
 */
export function getAdjacentRails(
  grid: Tile[][],
  gridSize: number,
  x: number,
  y: number
): RailAdjacency {
  return {
    north: isRail(grid, gridSize, x - 1, y),
    east: isRail(grid, gridSize, x, y - 1),
    south: isRail(grid, gridSize, x + 1, y),
    west: isRail(grid, gridSize, x, y + 1),
  };
}

/**
 * Determine rail pattern based on adjacency
 */
export function getRailPattern(adj: RailAdjacency): RailPattern {
  const connections = [adj.north, adj.east, adj.south, adj.west].filter(Boolean).length;
  
  if (connections === 0) {
    // Isolated rail - show as straight NS
    return 'straight_ns';
  }
  
  if (connections === 1) {
    // Dead end (spur)
    if (adj.north) return 'spur_n';
    if (adj.east) return 'spur_e';
    if (adj.south) return 'spur_s';
    if (adj.west) return 'spur_w';
  }
  
  if (connections === 2) {
    // Straight or curve
    if (adj.north && adj.south) return 'straight_ns';
    if (adj.east && adj.west) return 'straight_ew';
    if (adj.north && adj.east) return 'curve_ne';
    if (adj.south && adj.east) return 'curve_se';
    if (adj.south && adj.west) return 'curve_sw';
    if (adj.north && adj.west) return 'curve_nw';
  }
  
  if (connections === 3) {
    // Three-way junction
    if (!adj.north) return 'three_way_se';
    if (!adj.east) return 'three_way_sw';
    if (!adj.south) return 'three_way_nw';
    if (!adj.west) return 'three_way_ne';
  }
  
  if (connections === 4) {
    // Four-way intersection
    return 'four_way';
  }
  
  // Default to straight NS
  return 'straight_ns';
}

// ============================================================================
// Rail Drawing Functions
// ============================================================================

/**
 * Draw a single rail track segment
 */
function drawTrackSegment(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  trackWidth: number
): void {
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy);
  const dirX = dx / len;
  const dirY = dy / len;
  const perpX = -dirY;
  const perpY = dirX;
  
  const halfWidth = trackWidth * 0.5;
  
  // Draw ballast (base)
  ctx.fillStyle = RAIL_COLORS.BALLAST;
  ctx.beginPath();
  ctx.moveTo(startX + perpX * halfWidth * 1.5, startY + perpY * halfWidth * 1.5);
  ctx.lineTo(endX + perpX * halfWidth * 1.5, endY + perpY * halfWidth * 1.5);
  ctx.lineTo(endX - perpX * halfWidth * 1.5, endY - perpY * halfWidth * 1.5);
  ctx.lineTo(startX - perpX * halfWidth * 1.5, startY - perpY * halfWidth * 1.5);
  ctx.closePath();
  ctx.fill();
  
  // Draw ties (perpendicular to track)
  const tieCount = Math.floor(len / (TILE_WIDTH * RAIL_CONFIG.TIE_SPACING));
  ctx.fillStyle = RAIL_COLORS.TIE;
  for (let i = 0; i <= tieCount; i++) {
    const t = i / Math.max(1, tieCount);
    const tieX = startX + dx * t;
    const tieY = startY + dy * t;
    const tieLen = trackWidth * 1.8;
    
    ctx.fillRect(
      tieX - perpX * tieLen * 0.5,
      tieY - perpY * tieLen * 0.5,
      perpX * tieLen,
      perpY * tieLen
    );
  }
  
  // Draw rails (two parallel lines)
  ctx.strokeStyle = RAIL_COLORS.TRACK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX + perpX * halfWidth, startY + perpY * halfWidth);
  ctx.lineTo(endX + perpX * halfWidth, endY + perpY * halfWidth);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(startX - perpX * halfWidth, startY - perpY * halfWidth);
  ctx.lineTo(endX - perpX * halfWidth, endY - perpY * halfWidth);
  ctx.stroke();
}

/**
 * Draw rail tracks for a tile
 */
export function drawRail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  gridX: number,
  gridY: number,
  grid: Tile[][],
  gridSize: number,
  zoom: number
): void {
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = x + w / 2;
  const cy = y + h / 2;
  
  const adj = getAdjacentRails(grid, gridSize, gridX, gridY);
  const pattern = getRailPattern(adj);
  
  // Edge midpoints (where tracks connect)
  const northEdgeX = x + w * 0.25;
  const northEdgeY = y + h * 0.25;
  const eastEdgeX = x + w * 0.75;
  const eastEdgeY = y + h * 0.25;
  const southEdgeX = x + w * 0.75;
  const southEdgeY = y + h * 0.75;
  const westEdgeX = x + w * 0.25;
  const westEdgeY = y + h * 0.75;
  
  const trackWidth = w * RAIL_CONFIG.TRACK_WIDTH;
  const trackSpacing = w * RAIL_CONFIG.TRACK_SPACING;
  
  // Helper to draw two parallel tracks
  const drawTwoTracks = (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const dirX = dx / len;
    const dirY = dy / len;
    const perpX = -dirY;
    const perpY = dirX;
    
    // Draw track 1 (left/outer)
    const offset1 = -trackSpacing * 0.5;
    drawTrackSegment(
      ctx,
      startX + perpX * offset1,
      startY + perpY * offset1,
      endX + perpX * offset1,
      endY + perpY * offset1,
      trackWidth
    );
    
    // Draw track 2 (right/inner)
    const offset2 = trackSpacing * 0.5;
    drawTrackSegment(
      ctx,
      startX + perpX * offset2,
      startY + perpY * offset2,
      endX + perpX * offset2,
      endY + perpY * offset2,
      trackWidth
    );
  };
  
  // Draw based on pattern
  switch (pattern) {
    case 'straight_ns':
      drawTwoTracks(northEdgeX, northEdgeY, southEdgeX, southEdgeY);
      break;
      
    case 'straight_ew':
      drawTwoTracks(eastEdgeX, eastEdgeY, westEdgeX, westEdgeY);
      break;
      
    case 'curve_ne':
      // Curve from North to East
      drawCurvedTracks(ctx, northEdgeX, northEdgeY, eastEdgeX, eastEdgeY, cx, cy, trackWidth, trackSpacing);
      break;
      
    case 'curve_se':
      // Curve from South to East
      drawCurvedTracks(ctx, southEdgeX, southEdgeY, eastEdgeX, eastEdgeY, cx, cy, trackWidth, trackSpacing);
      break;
      
    case 'curve_sw':
      // Curve from South to West
      drawCurvedTracks(ctx, southEdgeX, southEdgeY, westEdgeX, westEdgeY, cx, cy, trackWidth, trackSpacing);
      break;
      
    case 'curve_nw':
      // Curve from North to West
      drawCurvedTracks(ctx, northEdgeX, northEdgeY, westEdgeX, westEdgeY, cx, cy, trackWidth, trackSpacing);
      break;
      
    case 'spur_n':
      drawTwoTracks(cx, cy, northEdgeX, northEdgeY);
      break;
      
    case 'spur_e':
      drawTwoTracks(cx, cy, eastEdgeX, eastEdgeY);
      break;
      
    case 'spur_s':
      drawTwoTracks(cx, cy, southEdgeX, southEdgeY);
      break;
      
    case 'spur_w':
      drawTwoTracks(cx, cy, westEdgeX, westEdgeY);
      break;
      
    case 'three_way_ne':
      // North, East, South
      drawTwoTracks(northEdgeX, northEdgeY, cx, cy);
      drawTwoTracks(cx, cy, eastEdgeX, eastEdgeY);
      drawTwoTracks(cx, cy, southEdgeX, southEdgeY);
      break;
      
    case 'three_way_se':
      // South, East, West
      drawTwoTracks(southEdgeX, southEdgeY, cx, cy);
      drawTwoTracks(cx, cy, eastEdgeX, eastEdgeY);
      drawTwoTracks(cx, cy, westEdgeX, westEdgeY);
      break;
      
    case 'three_way_sw':
      // South, West, North
      drawTwoTracks(southEdgeX, southEdgeY, cx, cy);
      drawTwoTracks(cx, cy, westEdgeX, westEdgeY);
      drawTwoTracks(cx, cy, northEdgeX, northEdgeY);
      break;
      
    case 'three_way_nw':
      // North, West, East
      drawTwoTracks(northEdgeX, northEdgeY, cx, cy);
      drawTwoTracks(cx, cy, westEdgeX, westEdgeY);
      drawTwoTracks(cx, cy, eastEdgeX, eastEdgeY);
      break;
      
    case 'four_way':
      // All four directions
      drawTwoTracks(northEdgeX, northEdgeY, cx, cy);
      drawTwoTracks(eastEdgeX, eastEdgeY, cx, cy);
      drawTwoTracks(southEdgeX, southEdgeY, cx, cy);
      drawTwoTracks(westEdgeX, westEdgeY, cx, cy);
      break;
      
    case 'crossing':
      // Two tracks crossing (rare case)
      drawTwoTracks(northEdgeX, northEdgeY, southEdgeX, southEdgeY);
      drawTwoTracks(eastEdgeX, eastEdgeY, westEdgeX, westEdgeY);
      break;
  }
}

/**
 * Draw curved tracks (for curves)
 */
function drawCurvedTracks(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  centerX: number,
  centerY: number,
  trackWidth: number,
  trackSpacing: number
): void {
  // Use quadratic curve for smooth rail curves
  const midX = centerX;
  const midY = centerY;
  
  const dx1 = startX - midX;
  const dy1 = startY - midY;
  const dx2 = endX - midX;
  const dy2 = endY - midY;
  const perp1X = -dy1 / Math.hypot(dx1, dy1);
  const perp1Y = dx1 / Math.hypot(dx1, dy1);
  const perp2X = -dy2 / Math.hypot(dx2, dy2);
  const perp2Y = dx2 / Math.hypot(dx2, dy2);
  
  // Draw two parallel curved tracks
  const offset1 = -trackSpacing * 0.5;
  const offset2 = trackSpacing * 0.5;
  
  // Track 1 (outer)
  drawCurvedTrackSegment(
    ctx,
    startX + perp1X * offset1,
    startY + perp1Y * offset1,
    endX + perp2X * offset1,
    endY + perp2Y * offset1,
    midX,
    midY,
    trackWidth
  );
  
  // Track 2 (inner)
  drawCurvedTrackSegment(
    ctx,
    startX + perp1X * offset2,
    startY + perp1Y * offset2,
    endX + perp2X * offset2,
    endY + perp2Y * offset2,
    midX,
    midY,
    trackWidth
  );
}

/**
 * Draw a single curved track segment
 */
function drawCurvedTrackSegment(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  controlX: number,
  controlY: number,
  trackWidth: number
): void {
  // Draw ballast along curve
  ctx.fillStyle = RAIL_COLORS.BALLAST;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(controlX, controlY, endX, endY);
  
  // Create parallel curve for ballast width
  const dx1 = startX - controlX;
  const dy1 = startY - controlY;
  const dx2 = endX - controlX;
  const dy2 = endY - controlY;
  const len1 = Math.hypot(dx1, dy1);
  const len2 = Math.hypot(dx2, dy2);
  const perp1X = -dy1 / len1;
  const perp1Y = dx1 / len1;
  const perp2X = -dy2 / len2;
  const perp2Y = dx2 / len2;
  
  const halfWidth = trackWidth * 0.75;
  const startX2 = startX + perp1X * halfWidth;
  const startY2 = startY + perp1Y * halfWidth;
  const endX2 = endX + perp2X * halfWidth;
  const endY2 = endY + perp2Y * halfWidth;
  const startX3 = startX - perp1X * halfWidth;
  const startY3 = startY - perp1Y * halfWidth;
  const endX3 = endX - perp2X * halfWidth;
  const endY3 = endY - perp2Y * halfWidth;
  
  ctx.lineTo(endX2, endY2);
  ctx.quadraticCurveTo(controlX, controlY, startX3, startY3);
  ctx.closePath();
  ctx.fill();
  
  // Draw ties along curve
  const numTies = 8;
  ctx.fillStyle = RAIL_COLORS.TIE;
  for (let i = 0; i <= numTies; i++) {
    const t = i / numTies;
    const tieX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
    const tieY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
    
    // Calculate perpendicular at this point
    const tangentX = 2 * (1 - t) * (controlX - startX) + 2 * t * (endX - controlX);
    const tangentY = 2 * (1 - t) * (controlY - startY) + 2 * t * (endY - controlY);
    const tangentLen = Math.hypot(tangentX, tangentY);
    const perpX = -tangentY / tangentLen;
    const perpY = tangentX / tangentLen;
    
    const tieLen = trackWidth * 1.8;
    ctx.fillRect(
      tieX - perpX * tieLen * 0.5,
      tieY - perpY * tieLen * 0.5,
      perpX * tieLen,
      perpY * tieLen
    );
  }
  
  // Draw rails (two parallel curves)
  ctx.strokeStyle = RAIL_COLORS.TRACK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(controlX, controlY, endX, endY);
  ctx.stroke();
  
  // Second rail (parallel)
  const railOffset = trackWidth * 0.4;
  ctx.beginPath();
  ctx.moveTo(startX + perp1X * railOffset, startY + perp1Y * railOffset);
  ctx.quadraticCurveTo(
    controlX + (perp1X + perp2X) * 0.5 * railOffset,
    controlY + (perp1Y + perp2Y) * 0.5 * railOffset,
    endX + perp2X * railOffset,
    endY + perp2Y * railOffset
  );
  ctx.stroke();
}
