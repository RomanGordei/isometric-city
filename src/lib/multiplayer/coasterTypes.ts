// Multiplayer types for co-op gameplay - IsoCoaster

import { Tool, GameState } from '@/games/coaster/types';

// Base action properties
interface BaseAction {
  timestamp: number;
  playerId: string;
}

// Coaster game actions that get synced via Supabase Realtime
export type CoasterGameAction =
  | (BaseAction & { type: 'place'; x: number; y: number; tool: Tool })
  | (BaseAction & { type: 'placeBatch'; placements: Array<{ x: number; y: number; tool: Tool }> })
  | (BaseAction & { type: 'bulldoze'; x: number; y: number })
  | (BaseAction & { type: 'setSpeed'; speed: 0 | 1 | 2 | 3 })
  | (BaseAction & { type: 'setParkSettings'; settings: Partial<GameState['settings']> })
  | (BaseAction & { type: 'placeTrackLine'; tiles: { x: number; y: number }[] })
  | (BaseAction & { type: 'fullState'; state: GameState });

// Action input types (without timestamp and playerId, which are added automatically)
export type PlaceAction = { type: 'place'; x: number; y: number; tool: Tool };
export type PlaceBatchAction = { type: 'placeBatch'; placements: Array<{ x: number; y: number; tool: Tool }> };
export type BulldozeAction = { type: 'bulldoze'; x: number; y: number };
export type SetSpeedAction = { type: 'setSpeed'; speed: 0 | 1 | 2 | 3 };
export type SetParkSettingsAction = { type: 'setParkSettings'; settings: Partial<GameState['settings']> };
export type PlaceTrackLineAction = { type: 'placeTrackLine'; tiles: { x: number; y: number }[] };
export type FullStateAction = { type: 'fullState'; state: GameState };

export type CoasterGameActionInput = 
  | PlaceAction
  | PlaceBatchAction
  | BulldozeAction
  | SetSpeedAction
  | SetParkSettingsAction
  | PlaceTrackLineAction
  | FullStateAction;

// Re-export shared types from main multiplayer types
export {
  generatePlayerName,
  generatePlayerColor,
  generateRoomCode,
  generatePlayerId,
} from './types';

export type { ConnectionState, PlayerRole, Player, RoomData, AwarenessState } from './types';
