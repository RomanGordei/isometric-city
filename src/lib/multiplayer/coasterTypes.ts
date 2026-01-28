import { CoasterType, ParkSettings, Tool } from '@/games/coaster/types';
import { MultiplayerAction } from '@/lib/multiplayer/types';

export type CoasterActionInput =
  | { type: 'place'; x: number; y: number; tool: Tool }
  | { type: 'placeBatch'; placements: Array<{ x: number; y: number; tool: Tool }> }
  | { type: 'bulldoze'; x: number; y: number }
  | { type: 'startCoasterBuild'; coasterType: CoasterType; coasterId: string }
  | { type: 'finishCoasterBuild' }
  | { type: 'cancelCoasterBuild' }
  | { type: 'setSpeed'; speed: 0 | 1 | 2 | 3 }
  | { type: 'setParkSettings'; settings: Partial<ParkSettings> };

export type CoasterAction = MultiplayerAction<CoasterActionInput>;
