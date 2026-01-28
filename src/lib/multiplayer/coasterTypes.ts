// Multiplayer types for IsoCoaster co-op gameplay

import { Tool, GameState } from '@/games/coaster/types';

// Base action properties
interface BaseAction {
  timestamp: number;
  playerId: string;
}

// Game actions that get synced via Supabase Realtime
export type CoasterAction =
  | (BaseAction & { type: 'place'; x: number; y: number; tool: Tool })
  | (BaseAction & { type: 'placeBatch'; placements: Array<{ x: number; y: number; tool: Tool }> })
  | (BaseAction & { type: 'bulldoze'; x: number; y: number })
  | (BaseAction & { type: 'setSpeed'; speed: 0 | 1 | 2 | 3 })
  | (BaseAction & { type: 'setSettings'; settings: Partial<GameState['settings']> })
  | (BaseAction & { type: 'addMoney'; amount: number })
  | (BaseAction & { type: 'startCoasterBuild'; coasterType: string })
  | (BaseAction & { type: 'addCoasterTrack'; x: number; y: number })
  | (BaseAction & { type: 'finishCoasterBuild' })
  | (BaseAction & { type: 'cancelCoasterBuild' })
  | (BaseAction & { type: 'placeTrackLine'; tiles: Array<{ x: number; y: number }> })
  | (BaseAction & { type: 'fullState'; state: GameState });

// Action input types (without timestamp and playerId, which are added automatically)
export type PlaceAction = { type: 'place'; x: number; y: number; tool: Tool };
export type PlaceBatchAction = { type: 'placeBatch'; placements: Array<{ x: number; y: number; tool: Tool }> };
export type BulldozeAction = { type: 'bulldoze'; x: number; y: number };
export type SetSpeedAction = { type: 'setSpeed'; speed: 0 | 1 | 2 | 3 };
export type SetSettingsAction = { type: 'setSettings'; settings: Partial<GameState['settings']> };
export type AddMoneyAction = { type: 'addMoney'; amount: number };
export type StartCoasterBuildAction = { type: 'startCoasterBuild'; coasterType: string };
export type AddCoasterTrackAction = { type: 'addCoasterTrack'; x: number; y: number };
export type FinishCoasterBuildAction = { type: 'finishCoasterBuild' };
export type CancelCoasterBuildAction = { type: 'cancelCoasterBuild' };
export type PlaceTrackLineAction = { type: 'placeTrackLine'; tiles: Array<{ x: number; y: number }> };
export type FullStateAction = { type: 'fullState'; state: GameState };

export type CoasterActionInput = 
  | PlaceAction
  | PlaceBatchAction
  | BulldozeAction
  | SetSpeedAction
  | SetSettingsAction
  | AddMoneyAction
  | StartCoasterBuildAction
  | AddCoasterTrackAction
  | FinishCoasterBuildAction
  | CancelCoasterBuildAction
  | PlaceTrackLineAction
  | FullStateAction;

// Re-export common types from the main types file
export type { 
  ConnectionState, 
  Player, 
  RoomData,
} from './types';

export { 
  generatePlayerName, 
  generatePlayerColor, 
  generateRoomCode, 
  generatePlayerId 
} from './types';
