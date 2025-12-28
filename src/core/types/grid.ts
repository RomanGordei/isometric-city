/**
 * Core Grid Types - Shared between all game modes
 * 
 * This module defines the fundamental types for isometric grid-based games.
 * These types are game-mode agnostic and can be used by SimCity, Rise of Nations, or any future game mode.
 */

// ============================================================================
// Tile Dimensions
// ============================================================================

/** Base tile width in pixels for isometric rendering */
export const TILE_WIDTH = 64;

/** Height ratio for isometric projection (determines tile "flatness") */
export const HEIGHT_RATIO = 0.60;

/** Calculated tile height */
export const TILE_HEIGHT = TILE_WIDTH * HEIGHT_RATIO;

// ============================================================================
// Grid Position Types
// ============================================================================

/** A position on the isometric grid */
export interface GridPosition {
  x: number;
  y: number;
}

/** A screen position in pixels */
export interface ScreenPosition {
  x: number;
  y: number;
}

/** Bounds defining a rectangular area on the grid */
export interface GridBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ============================================================================
// Base Tile Types
// ============================================================================

/**
 * Base tile interface - the minimal tile structure shared by all game modes.
 * Game-specific tiles extend this with additional properties.
 */
export interface BaseTile {
  x: number;
  y: number;
  /** Base terrain type (grass, water, desert, etc.) */
  terrain: TerrainType;
  /** Land value affects building growth and desirability */
  landValue: number;
}

/** Core terrain types shared by all game modes */
export type TerrainType = 
  | 'grass'
  | 'water'
  | 'sand'     // Beach/desert terrain
  | 'dirt'     // Unpaved/bare ground
  | 'rock';    // Mountain/rocky terrain

// ============================================================================
// Base Building Types
// ============================================================================

/**
 * Base building interface - common properties for all buildings across game modes.
 * SimCity and RoN will extend this with game-specific building types.
 */
export interface BaseBuilding {
  /** Building type identifier (game-specific) */
  type: string;
  /** Construction progress 0-100 (100 = complete) */
  constructionProgress: number;
  /** Age in game ticks (for wear/upgrade mechanics) */
  age: number;
  /** Owner/city ID for multi-player or multi-city scenarios */
  ownerId?: string;
}

// ============================================================================
// Grid State Types
// ============================================================================

/**
 * Base grid state - minimal state needed to render and interact with a grid.
 * Game modes extend this with simulation-specific state.
 */
export interface BaseGridState<T extends BaseTile> {
  /** The 2D grid of tiles [y][x] */
  grid: T[][];
  /** Grid dimensions (grid is gridSize x gridSize) */
  gridSize: number;
  /** Unique identifier for this game/save */
  id: string;
}

// ============================================================================
// Direction Types (for entities/movement)
// ============================================================================

/** Cardinal directions for entity movement */
export type CardinalDirection = 'north' | 'east' | 'south' | 'west';

/** Includes diagonal directions for more complex movement */
export type Direction8 = CardinalDirection | 'northeast' | 'northwest' | 'southeast' | 'southwest';

/** Direction metadata for movement calculations */
export interface DirectionMeta {
  /** Grid step in this direction */
  step: GridPosition;
  /** Screen vector for this direction */
  vec: { dx: number; dy: number };
  /** Angle in radians */
  angle: number;
  /** Normal vector for perpendicular calculations */
  normal: { nx: number; ny: number };
}

/** Direction metadata lookup */
export const DIRECTION_META: Record<CardinalDirection, DirectionMeta> = {
  north: { step: { x: 0, y: -1 }, vec: { dx: 1, dy: -0.5 }, angle: -Math.PI / 4, normal: { nx: 0.5, ny: 1 } },
  east:  { step: { x: 1, y: 0 },  vec: { dx: 1, dy: 0.5 },  angle: Math.PI / 4,  normal: { nx: -0.5, ny: 1 } },
  south: { step: { x: 0, y: 1 },  vec: { dx: -1, dy: 0.5 }, angle: 3 * Math.PI / 4, normal: { nx: -0.5, ny: -1 } },
  west:  { step: { x: -1, y: 0 }, vec: { dx: -1, dy: -0.5 }, angle: -3 * Math.PI / 4, normal: { nx: 0.5, ny: -1 } },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a grid position is within bounds
 */
export function isInBounds(x: number, y: number, gridSize: number): boolean {
  return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

// Note: gridToScreen and screenToGrid are in core/rendering/isometricRenderer.ts

/**
 * Get all adjacent tiles (4-directional)
 */
export function getAdjacentPositions(x: number, y: number): GridPosition[] {
  return [
    { x: x, y: y - 1 },  // north
    { x: x + 1, y: y },  // east
    { x: x, y: y + 1 },  // south
    { x: x - 1, y: y },  // west
  ];
}

/**
 * Get all adjacent tiles (8-directional, includes diagonals)
 */
export function getAdjacentPositions8(x: number, y: number): GridPosition[] {
  return [
    { x: x, y: y - 1 },      // north
    { x: x + 1, y: y - 1 },  // northeast
    { x: x + 1, y: y },      // east
    { x: x + 1, y: y + 1 },  // southeast
    { x: x, y: y + 1 },      // south
    { x: x - 1, y: y + 1 },  // southwest
    { x: x - 1, y: y },      // west
    { x: x - 1, y: y - 1 },  // northwest
  ];
}

/**
 * Calculate Manhattan distance between two grid positions
 */
export function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Calculate Euclidean distance between two grid positions
 */
export function euclideanDistance(a: GridPosition, b: GridPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
