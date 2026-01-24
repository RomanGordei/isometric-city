'use client';

import { Tool } from '@/games/coaster/types';

export const COASTER_MENU_CATEGORIES = [
  { key: 'tools', label: 'Tools' },
  { key: 'paths', label: 'Paths' },
  { key: 'terrain', label: 'Terrain' },
  { key: 'coasters', label: 'Coasters' },
  { key: 'trees', label: 'Trees' },
  { key: 'flowers', label: 'Flowers' },
  { key: 'furniture', label: 'Furniture' },
  { key: 'fountains', label: 'Fountains' },
  { key: 'food', label: 'Food & Drink' },
  { key: 'shops', label: 'Shops & Services' },
  { key: 'rides_small', label: 'Small Rides' },
  { key: 'rides_large', label: 'Large Rides' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'panels', label: 'Panels' },
] as const;

export const COASTER_CATEGORY_LABELS = COASTER_MENU_CATEGORIES.reduce<Record<string, string>>((acc, category) => {
  acc[category.key] = category.label;
  return acc;
}, {});

export const COASTER_TYPE_TOOL_MAP: Record<string, string> = {
  coaster_type_wooden_classic: 'wooden_classic',
  coaster_type_wooden_twister: 'wooden_twister',
  coaster_type_steel_sit_down: 'steel_sit_down',
  coaster_type_steel_standup: 'steel_standup',
  coaster_type_steel_inverted: 'steel_inverted',
  coaster_type_steel_floorless: 'steel_floorless',
  coaster_type_steel_wing: 'steel_wing',
  coaster_type_steel_flying: 'steel_flying',
  coaster_type_steel_4d: 'steel_4d',
  coaster_type_steel_spinning: 'steel_spinning',
  coaster_type_launch_coaster: 'launch_coaster',
  coaster_type_hyper_coaster: 'hyper_coaster',
  coaster_type_giga_coaster: 'giga_coaster',
  coaster_type_water_coaster: 'water_coaster',
  coaster_type_mine_train: 'mine_train',
  coaster_type_bobsled: 'bobsled',
  coaster_type_suspended: 'suspended',
};

export const COASTER_TRACK_TOOLS: Tool[] = [
  'coaster_build',
  'coaster_track',
  'coaster_turn_left',
  'coaster_turn_right',
  'coaster_slope_up',
  'coaster_slope_down',
  'coaster_loop',
  'coaster_station',
];

export const COASTER_TYPE_TOOLS: Tool[] = [
  'coaster_type_wooden_classic',
  'coaster_type_wooden_twister',
  'coaster_type_steel_sit_down',
  'coaster_type_steel_standup',
  'coaster_type_steel_inverted',
  'coaster_type_steel_floorless',
  'coaster_type_steel_wing',
  'coaster_type_steel_flying',
  'coaster_type_steel_4d',
  'coaster_type_steel_spinning',
  'coaster_type_launch_coaster',
  'coaster_type_hyper_coaster',
  'coaster_type_giga_coaster',
  'coaster_type_water_coaster',
  'coaster_type_mine_train',
  'coaster_type_bobsled',
  'coaster_type_suspended',
];
