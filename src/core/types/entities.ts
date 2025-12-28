/**
 * Core Entity Types - Base types for movable entities (vehicles, units, etc.)
 * 
 * These types define the foundation for any movable entity in the game.
 * Both SimCity vehicles and RoN military units will extend these base types.
 */

import { CardinalDirection, GridPosition, ScreenPosition } from './grid';

// ============================================================================
// Base Entity Types
// ============================================================================

/**
 * Base entity interface - common properties for all movable entities
 */
export interface BaseEntity {
  /** Unique identifier */
  id: number;
  /** Current grid position */
  tileX: number;
  tileY: number;
  /** Movement direction */
  direction: CardinalDirection;
  /** Progress through current tile (0-1) */
  progress: number;
  /** Movement speed (tiles per second) */
  speed: number;
  /** Age in game ticks */
  age: number;
  /** Maximum age before despawn (-1 for permanent) */
  maxAge: number;
}

/**
 * Path-following entity - entities that follow a predetermined path
 */
export interface PathFollowingEntity extends BaseEntity {
  /** Path of grid positions to follow */
  path: GridPosition[];
  /** Current index in the path */
  pathIndex: number;
}

/**
 * Screen-positioned entity - for entities that move in screen space (aircraft, projectiles)
 */
export interface ScreenEntity {
  /** Unique identifier */
  id: number;
  /** Screen position */
  x: number;
  y: number;
  /** Movement angle in radians */
  angle: number;
  /** Target angle for smooth turning */
  targetAngle?: number;
  /** Movement speed in pixels per second */
  speed: number;
}

// ============================================================================
// Particle Types (for trails, effects)
// ============================================================================

/**
 * Base particle type for trails, smoke, wake, etc.
 */
export interface BaseParticle {
  x: number;
  y: number;
  age: number;
  opacity: number;
}

/**
 * Moving particle with velocity
 */
export interface MovingParticle extends BaseParticle {
  vx: number;
  vy: number;
  maxAge: number;
  size: number;
}

/**
 * Contrail particle for aircraft
 */
export interface ContrailParticle extends BaseParticle {}

/**
 * Wake particle for boats/watercraft
 */
export interface WakeParticle extends BaseParticle {}

/**
 * Smoke particle for factories, trains
 */
export interface SmokeParticle extends MovingParticle {}

// ============================================================================
// Entity State Types
// ============================================================================

/**
 * Generic entity state for state machines
 */
export type EntityState = string;

/**
 * Entity with state machine
 */
export interface StatefulEntity<S extends EntityState> extends BaseEntity {
  /** Current state */
  state: S;
  /** Progress through current state (0-1) */
  stateProgress: number;
}

// ============================================================================
// Entity Collection Types
// ============================================================================

/**
 * Reference container for entity arrays (for React refs)
 */
export interface EntityRefs<T extends BaseEntity> {
  entities: React.MutableRefObject<T[]>;
  nextId: React.MutableRefObject<number>;
  spawnTimer: React.MutableRefObject<number>;
}

// ============================================================================
// Entity Rendering Helpers
// ============================================================================

/**
 * Calculate interpolated screen position for a moving entity
 */
export function getEntityScreenPosition(
  entity: BaseEntity,
  gridToScreenFn: (x: number, y: number) => ScreenPosition,
  directionMeta: { vec: { dx: number; dy: number } }
): ScreenPosition {
  const basePos = gridToScreenFn(entity.tileX, entity.tileY);
  const offset = entity.progress * 64; // TILE_WIDTH
  
  return {
    x: basePos.x + directionMeta.vec.dx * offset,
    y: basePos.y + directionMeta.vec.dy * offset,
  };
}

/**
 * Check if an entity is visible within the viewport
 */
export function isEntityVisible(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 100
): boolean {
  return (
    screenX >= -margin &&
    screenX <= canvasWidth + margin &&
    screenY >= -margin &&
    screenY <= canvasHeight + margin
  );
}
