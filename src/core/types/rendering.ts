/**
 * Core Rendering Types - Types for sprite/canvas rendering
 * 
 * Shared rendering configuration types used by all game modes.
 */

// ============================================================================
// Viewport Types
// ============================================================================

/** Current viewport state */
export interface Viewport {
  /** Offset from origin in screen pixels */
  offset: { x: number; y: number };
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Canvas dimensions */
  canvasSize: { width: number; height: number };
}

/** Viewport bounds in grid coordinates */
export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ============================================================================
// Sprite Types
// ============================================================================

/** Sprite sheet source coordinates */
export interface SpriteCoords {
  /** Source X position in sprite sheet */
  sx: number;
  /** Source Y position in sprite sheet */
  sy: number;
  /** Source width */
  sw: number;
  /** Source height */
  sh: number;
}

/** Sprite position in a grid-based sprite sheet */
export interface SpriteGridPosition {
  row: number;
  col: number;
}

/** Sprite offset adjustments */
export interface SpriteOffset {
  vertical: number;
  horizontal: number;
}

// ============================================================================
// Sprite Pack Configuration
// ============================================================================

/**
 * Base sprite pack interface - defines the structure for themed sprite packs.
 * This is the minimal interface; game-specific packs can extend with additional sheets.
 */
export interface BaseSpritePack {
  /** Unique identifier for this sprite pack */
  id: string;
  /** Display name for UI */
  name: string;
  /** Path to the main sprite sheet image */
  src: string;
  /** Number of columns in the sprite sheet */
  cols: number;
  /** Number of rows in the sprite sheet */
  rows: number;
  /** Layout order: 'row' = left-to-right, top-to-bottom */
  layout: 'row' | 'column';
  /** Order of sprites in the sheet */
  spriteOrder: readonly string[];
  /** Per-sprite vertical offset adjustments (multiplied by tile height) */
  verticalOffsets: Record<string, number>;
  /** Per-sprite horizontal offset adjustments (multiplied by tile width) */
  horizontalOffsets: Record<string, number>;
  /** Maps building types to sprite keys in spriteOrder */
  buildingToSprite: Record<string, string>;
  /** Optional global scale multiplier for all sprites */
  globalScale?: number;
}

// ============================================================================
// Canvas Layer Types
// ============================================================================

/** Layer identifiers for multi-canvas rendering */
export type CanvasLayer = 
  | 'terrain'      // Ground tiles, water, terrain
  | 'roads'        // Roads, rails, bridges
  | 'buildings'    // Buildings, structures
  | 'entities'     // Vehicles, units, pedestrians
  | 'air'          // Aircraft, effects above buildings
  | 'overlay'      // Service coverage, zone overlays
  | 'ui'           // Selection highlights, hover effects
  | 'lighting';    // Day/night lighting overlay

/** Canvas layer configuration */
export interface CanvasLayerConfig {
  /** Layer identifier */
  id: CanvasLayer;
  /** Z-order (higher = on top) */
  zIndex: number;
  /** Whether this layer needs to redraw every frame */
  dynamic: boolean;
}

/** Default layer configuration */
export const DEFAULT_CANVAS_LAYERS: CanvasLayerConfig[] = [
  { id: 'terrain', zIndex: 0, dynamic: false },
  { id: 'roads', zIndex: 1, dynamic: false },
  { id: 'buildings', zIndex: 2, dynamic: false },
  { id: 'entities', zIndex: 3, dynamic: true },
  { id: 'air', zIndex: 4, dynamic: true },
  { id: 'overlay', zIndex: 5, dynamic: false },
  { id: 'ui', zIndex: 6, dynamic: true },
  { id: 'lighting', zIndex: 7, dynamic: true },
];

// ============================================================================
// Rendering State
// ============================================================================

/**
 * World render state - passed to rendering functions
 */
export interface WorldRenderState {
  /** Grid data */
  grid: unknown[][]; // Game-specific tile type
  /** Grid size */
  gridSize: number;
  /** Current viewport offset */
  offset: { x: number; y: number };
  /** Current zoom level */
  zoom: number;
  /** Game speed (0 = paused) */
  speed: number;
  /** Canvas dimensions */
  canvasSize: { width: number; height: number };
}

// ============================================================================
// Overlay Types
// ============================================================================

/** Base overlay mode type (game modes can extend) */
export type BaseOverlayMode = 'none';

/** Overlay color configuration */
export interface OverlayColorConfig {
  /** Fill color for overlay tiles */
  fillColor: string;
  /** Stroke color for overlay boundaries */
  strokeColor?: string;
  /** Opacity (0-1) */
  opacity: number;
}

// ============================================================================
// Zoom Configuration
// ============================================================================

/** Zoom level constraints */
export const ZOOM_CONFIG = {
  MIN: 0.25,
  MAX: 2.5,
  DEFAULT: 1.0,
  DEFAULT_MOBILE: 0.6,
  /** Zoom level below which to skip rendering small details */
  SKIP_DETAILS_THRESHOLD: 0.5,
} as const;

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * Calculate visible grid bounds from viewport
 */
export function calculateVisibleBounds(
  viewport: Viewport,
  gridSize: number,
  tileWidth: number,
  tileHeight: number
): ViewportBounds {
  const { offset, zoom, canvasSize } = viewport;
  
  // Add padding for sprites that extend beyond tile bounds
  const padding = 5;
  
  // Calculate approximate visible bounds
  const minX = Math.max(0, Math.floor(-offset.x / (tileWidth * zoom)) - padding);
  const maxX = Math.min(gridSize - 1, Math.ceil((canvasSize.width - offset.x) / (tileWidth * zoom)) + padding);
  const minY = Math.max(0, Math.floor(-offset.y / (tileHeight * zoom)) - padding);
  const maxY = Math.min(gridSize - 1, Math.ceil((canvasSize.height - offset.y) / (tileHeight * zoom)) + padding);
  
  return { minX, maxX, minY, maxY };
}

/**
 * Check if a zoom level should skip rendering small details
 */
export function shouldSkipDetails(zoom: number): boolean {
  return zoom < ZOOM_CONFIG.SKIP_DETAILS_THRESHOLD;
}
