/**
 * Games Module Index
 *
 * This module provides access to game-specific modules.
 * Currently supports:
 * - IsoCity: City building sandbox
 *
 * The architecture is designed to support additional game modes in the future
 * that can share the core isometric rendering engine.
 */

import { msg } from 'gt-next';

// Game modules
export * as IsoCity from './isocity';

// Game mode identifier (extensible for future game modes)
export type GameMode = 'isocity';

/** Game mode display names */
export const GAME_MODE_NAMES: Record<GameMode, string> = {
  isocity: msg('IsoCity'),
};

/** Game mode descriptions */
export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  isocity: msg('Build and manage your own city. Zone areas, build infrastructure, and watch your city grow.'),
};
