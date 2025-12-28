/**
 * Core Sprite Pack System - Manages themed sprite packs
 * 
 * This module provides the infrastructure for loading and managing sprite packs.
 * Each game mode can define its own sprite packs that extend the base interface.
 */

import { BaseSpritePack, SpriteCoords, SpriteOffset } from '../types/rendering';

// ============================================================================
// Sprite Pack State
// ============================================================================

/** Currently active sprite pack (set by game context) */
let _activeSpritePack: BaseSpritePack | null = null;

/**
 * Set the active sprite pack
 */
export function setActiveSpritePack<T extends BaseSpritePack>(pack: T): void {
  _activeSpritePack = pack;
}

/**
 * Get the active sprite pack
 */
export function getActiveSpritePack<T extends BaseSpritePack>(): T | null {
  return _activeSpritePack as T | null;
}

// ============================================================================
// Sprite Coordinate Calculations
// ============================================================================

/**
 * Get sprite index from sprite order list
 */
export function getSpriteIndex(spriteKey: string, spriteOrder: readonly string[]): number {
  return spriteOrder.indexOf(spriteKey);
}

/**
 * Calculate row and column from sprite index
 */
export function getGridPositionFromIndex(
  index: number,
  cols: number,
  rows: number,
  layout: 'row' | 'column'
): { row: number; col: number } {
  if (layout === 'column') {
    return {
      col: Math.floor(index / rows),
      row: index % rows,
    };
  } else {
    return {
      col: index % cols,
      row: Math.floor(index / cols),
    };
  }
}

/**
 * Calculate sprite coordinates from a sprite pack
 */
export function getSpriteCoords<T extends BaseSpritePack>(
  buildingType: string,
  spriteSheetWidth: number,
  spriteSheetHeight: number,
  pack: T
): SpriteCoords | null {
  // Map building type to sprite key
  const spriteKey = pack.buildingToSprite[buildingType];
  if (!spriteKey) return null;
  
  // Find index in sprite order
  const index = getSpriteIndex(spriteKey, pack.spriteOrder);
  if (index === -1) return null;
  
  // Calculate tile dimensions
  const tileWidth = Math.floor(spriteSheetWidth / pack.cols);
  const tileHeight = Math.floor(spriteSheetHeight / pack.rows);
  
  // Get grid position
  const { row, col } = getGridPositionFromIndex(index, pack.cols, pack.rows, pack.layout);
  
  return {
    sx: col * tileWidth,
    sy: row * tileHeight,
    sw: tileWidth,
    sh: tileHeight,
  };
}

/**
 * Get sprite offsets for a building type
 */
export function getSpriteOffsets<T extends BaseSpritePack>(
  buildingType: string,
  pack: T
): SpriteOffset {
  const spriteKey = pack.buildingToSprite[buildingType];
  
  return {
    vertical: spriteKey ? (pack.verticalOffsets[spriteKey] ?? 0) : 0,
    horizontal: spriteKey ? (pack.horizontalOffsets[spriteKey] ?? 0) : 0,
  };
}

// ============================================================================
// Sprite Pack Registry
// ============================================================================

/**
 * Registry for sprite packs across all game modes
 */
class SpritePackRegistry<T extends BaseSpritePack> {
  private packs: Map<string, T> = new Map();
  private defaultPackId: string | null = null;
  
  /**
   * Register a sprite pack
   */
  register(pack: T): void {
    this.packs.set(pack.id, pack);
  }
  
  /**
   * Set the default pack ID
   */
  setDefault(packId: string): void {
    if (this.packs.has(packId)) {
      this.defaultPackId = packId;
    }
  }
  
  /**
   * Get a sprite pack by ID
   */
  get(packId: string): T | null {
    return this.packs.get(packId) ?? null;
  }
  
  /**
   * Get the default sprite pack
   */
  getDefault(): T | null {
    if (this.defaultPackId) {
      return this.get(this.defaultPackId);
    }
    // Return first registered pack if no default
    const first = this.packs.values().next();
    return first.done ? null : first.value;
  }
  
  /**
   * Get all registered packs
   */
  getAll(): T[] {
    return Array.from(this.packs.values());
  }
  
  /**
   * Get all pack IDs
   */
  getIds(): string[] {
    return Array.from(this.packs.keys());
  }
}

/**
 * Global sprite pack registry
 * Game modes should create their own typed instances
 */
export function createSpritePackRegistry<T extends BaseSpritePack>(): SpritePackRegistry<T> {
  return new SpritePackRegistry<T>();
}

// ============================================================================
// Sprite Sheet Loading
// ============================================================================

/**
 * Load a sprite sheet image with optional caching
 */
export async function loadSpriteSheet(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${src}`));
    img.src = src;
  });
}

/**
 * Preload all sprite sheets for a pack
 */
export async function preloadSpritePack<T extends BaseSpritePack>(
  pack: T,
  additionalSrcs?: string[]
): Promise<Map<string, HTMLImageElement>> {
  const images = new Map<string, HTMLImageElement>();
  const srcsToLoad = [pack.src, ...(additionalSrcs ?? [])];
  
  await Promise.all(
    srcsToLoad.map(async (src) => {
      try {
        const img = await loadSpriteSheet(src);
        images.set(src, img);
      } catch (error) {
        console.error(`Failed to preload: ${src}`, error);
      }
    })
  );
  
  return images;
}
