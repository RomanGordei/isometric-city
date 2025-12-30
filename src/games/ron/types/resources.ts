/**
 * Rise of Nations - Resource System Types
 * 
 * Resources are the core economy of the game.
 * Different resources are gathered from different sources.
 */

export type ResourceType = 
  | 'food'      // From farms, fishing
  | 'wood'      // From lumber mills, forests  
  | 'metal'     // From mines
  | 'gold'      // From markets, trade
  | 'knowledge' // From libraries, universities
  | 'oil';      // From oil wells (industrial+ only)

export interface Resources {
  food: number;
  wood: number;
  metal: number;
  gold: number;
  knowledge: number;
  oil: number;
}

export interface ResourceRates {
  food: number;
  wood: number;
  metal: number;
  gold: number;
  knowledge: number;
  oil: number;
}

export const INITIAL_RESOURCES: Resources = {
  food: 200,   // Enough for 2-3 citizens
  wood: 150,   // Can build a few buildings
  metal: 0,
  gold: 75,    // Some starting gold
  knowledge: 0,
  oil: 0,
};

// Resource gathering rates per worker per tick (hard economy)
export const BASE_GATHER_RATES: Record<ResourceType, number> = {
  food: 0.08,      // 6x slower than original
  wood: 0.06,      // 6x slower than original
  metal: 0.05,     // 6x slower than original
  gold: 0.03,      // 6x slower than original
  knowledge: 0.025,// 6x slower than original
  oil: 0.04,       // 6x slower than original
};

// Storage limits - set high enough to allow all age advancements
// Modern age requires: food 1500, wood 1000, metal 1200, gold 2000, knowledge 1000, oil 500
export const BASE_STORAGE_LIMITS: Resources = {
  food: 2000,
  wood: 1500,
  metal: 1500,
  gold: 2500,
  knowledge: 1500,
  oil: 1000,
};

// Resource display information (using text symbols instead of emojis)
export const RESOURCE_INFO: Record<ResourceType, { name: string; icon: string; color: string }> = {
  food: { name: 'Food', icon: 'F', color: '#22c55e' },
  wood: { name: 'Wood', icon: 'W', color: '#a16207' },
  metal: { name: 'Metal', icon: 'M', color: '#6b7280' },
  gold: { name: 'Gold', icon: '$', color: '#eab308' },
  knowledge: { name: 'Knowledge', icon: 'K', color: '#3b82f6' },
  oil: { name: 'Oil', icon: 'O', color: '#1f2937' },
};

// Oil spawn configuration
export const OIL_DEPOSIT_CHANCE = 0.02; // Chance per grass tile to have oil deposit
export const OIL_DEPOSIT_MIN_DISTANCE = 5; // Minimum distance between deposits
