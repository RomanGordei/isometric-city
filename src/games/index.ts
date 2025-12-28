/**
 * Games Module Index
 * 
 * This module provides access to game-specific modules.
 * Currently supports:
 * - SimCity: City building sandbox
 * 
 * The architecture is designed to support additional game modes in the future
 * that can share the core isometric rendering engine.
 */

// Game modules
export * as SimCity from './simcity';

// Game mode identifier (extensible for future game modes)
export type GameMode = 'simcity';

/** Game mode display names */
export const GAME_MODE_NAMES: Record<GameMode, string> = {
  simcity: 'IsoCity',
};

/** Game mode descriptions */
export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  simcity: 'Build and manage your own city. Zone areas, build infrastructure, and watch your city grow.',
};
