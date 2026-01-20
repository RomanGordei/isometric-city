'use client';

import React, { useState, useCallback } from 'react';
import { useCoaster } from '@/context/CoasterContext';
import { Tool, TOOL_INFO } from '@/games/coaster/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// =============================================================================
// TOOL CATEGORIES
// =============================================================================

const TOOL_CATEGORIES: Record<string, Tool[]> = {
  'Tools': ['select', 'bulldoze'],
  'Paths': ['path', 'queue'],
  'Trees': [
    'tree_oak', 'tree_maple', 'tree_pine', 'tree_palm', 'tree_cherry',
    'bush_hedge', 'bush_flowering', 'topiary_ball',
  ],
  'Flowers': ['flowers_bed', 'flowers_planter', 'flowers_wild', 'ground_cover'],
  'Furniture': [
    'bench_wooden', 'bench_metal', 'bench_ornate',
    'lamp_victorian', 'lamp_modern', 'lamp_pathway',
    'trash_can_basic', 'trash_can_fancy',
  ],
  'Fountains': [
    'fountain_small_1', 'fountain_small_2', 'fountain_small_3',
    'fountain_medium_1', 'fountain_medium_2', 'fountain_medium_3',
    'fountain_large_1', 'fountain_large_2', 'fountain_large_3',
    'pond_small', 'pond_medium', 'pond_koi',
    'splash_pad', 'water_jets', 'dancing_fountain',
  ],
  'Food': [
    // American
    'food_hotdog', 'food_burger', 'food_fries', 'food_corndog', 'food_pretzel',
    // Sweet Treats
    'food_icecream', 'food_cotton_candy', 'food_candy_apple', 'food_churros', 'food_funnel_cake',
    // Drinks
    'drink_soda', 'drink_lemonade', 'drink_smoothie', 'drink_coffee', 'drink_slushie',
    // Snacks
    'snack_popcorn', 'snack_nachos', 'snack_pizza', 'snack_cookies', 'snack_donuts',
    // International
    'food_tacos', 'food_noodles', 'food_kebab', 'food_crepes', 'food_waffles',
    // Themed
    'cart_pirate', 'cart_space', 'cart_medieval', 'cart_western', 'cart_tropical',
  ],
  'Shops': [
    // Gift shops
    'shop_souvenir', 'shop_emporium', 'shop_photo', 'shop_ticket', 'shop_collectibles',
    // Toy shops
    'shop_toys', 'shop_plush', 'shop_apparel', 'shop_bricks', 'shop_rc',
    // Candy
    'shop_candy', 'shop_fudge', 'shop_jewelry', 'shop_popcorn_shop', 'shop_soda_fountain',
    // Games
    'game_ring_toss', 'game_balloon', 'game_shooting', 'game_darts', 'game_basketball',
    // Entertainment
    'arcade_building', 'vr_experience', 'photo_booth', 'caricature', 'face_paint',
    // Services
    'restroom', 'first_aid', 'lockers', 'stroller_rental', 'atm',
  ],
  'Rides': [
    // Kiddie
    'ride_kiddie_coaster', 'ride_kiddie_train', 'ride_kiddie_planes', 'ride_kiddie_boats', 'ride_kiddie_cars',
    // Spinning
    'ride_teacups', 'ride_scrambler', 'ride_tilt_a_whirl', 'ride_spinning_apples', 'ride_whirlwind',
    // Classic
    'ride_carousel', 'ride_antique_cars', 'ride_monorail_car', 'ride_sky_ride_car', 'ride_train_car',
    // Theater
    'ride_bumper_cars', 'ride_go_karts', 'ride_simulator', 'ride_motion_theater', 'ride_4d_theater',
    // Water
    'ride_bumper_boats', 'ride_paddle_boats', 'ride_lazy_river', 'ride_water_play', 'ride_splash_zone',
    // Dark Rides
    'ride_haunted_house', 'ride_ghost_train', 'ride_dark_ride', 'ride_tunnel', 'ride_themed_facade',
    // Ferris Wheels
    'ride_ferris_classic', 'ride_ferris_modern', 'ride_ferris_observation', 'ride_ferris_double', 'ride_ferris_led',
    // Drop/Tower
    'ride_drop_tower', 'ride_space_shot', 'ride_observation_tower', 'ride_sky_swing', 'ride_star_flyer',
    // Swing
    'ride_swing_ride', 'ride_wave_swinger', 'ride_flying_scooters', 'ride_enterprise', 'ride_loop_o_plane',
    // Thrill
    'ride_top_spin', 'ride_frisbee', 'ride_afterburner', 'ride_inversion', 'ride_meteorite',
    // Transport/Water
    'ride_log_flume', 'ride_rapids', 'ride_train_station', 'ride_monorail_station', 'ride_chairlift',
    // Shows
    'show_4d', 'show_stunt', 'show_dolphin', 'show_amphitheater', 'show_parade_float',
  ],
  'Coasters': [
    'coaster_build',
    'coaster_track',
    'coaster_turn_left',
    'coaster_turn_right',
    'coaster_slope_up',
    'coaster_slope_down',
    'coaster_loop',
    'coaster_station',
  ],
  'Infrastructure': ['park_entrance', 'staff_building'],
};

// =============================================================================
// EXIT DIALOG
// =============================================================================

function ExitDialog({
  open,
  onOpenChange,
  onSaveAndExit,
  onExitWithoutSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndExit: () => void;
  onExitWithoutSaving: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exit to Menu</DialogTitle>
          <DialogDescription>
            Would you like to save your park before exiting?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onExitWithoutSaving}
            className="w-full sm:w-auto"
          >
            Exit Without Saving
          </Button>
          <Button onClick={onSaveAndExit} className="w-full sm:w-auto">
            Save & Exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

interface SidebarProps {
  onExit?: () => void;
}

export function Sidebar({ onExit }: SidebarProps) {
  const { state, setTool, saveGame } = useCoaster();
  const { selectedTool, finances } = state;
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Tools');
  
  const handleSaveAndExit = useCallback(() => {
    saveGame();
    setShowExitDialog(false);
    onExit?.();
  }, [saveGame, onExit]);
  
  const handleExitWithoutSaving = useCallback(() => {
    setShowExitDialog(false);
    onExit?.();
  }, [onExit]);
  
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategory(prev => prev === category ? null : category);
  }, []);
  
  return (
    <div className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Header */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <span className="text-sidebar-foreground font-bold tracking-tight">
            ISOCOASTER
          </span>
          {onExit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowExitDialog(true)}
              title="Exit to Menu"
              className="h-7 w-7 text-muted-foreground hover:text-sidebar-foreground"
            >
              <svg
                className="w-4 h-4 -scale-x-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
      
      {/* Tool Categories */}
      <ScrollArea className="flex-1 py-2">
        {Object.entries(TOOL_CATEGORIES).map(([category, tools]) => (
          <div key={category} className="mb-1">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className={`w-full px-4 py-2 text-left text-xs font-bold tracking-widest uppercase transition-colors ${
                expandedCategory === category
                  ? 'text-white bg-white/5'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{category}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    expandedCategory === category ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>
            
            {/* Tools in category */}
            {expandedCategory === category && (
              <div className="px-2 py-1 flex flex-col gap-0.5">
                {tools.map(tool => {
                  const info = TOOL_INFO[tool];
                  if (!info) return null;
                  
                  const isSelected = selectedTool === tool;
                  const canAfford = finances.cash >= info.cost;
                  
                  return (
                    <Button
                      key={tool}
                      onClick={() => setTool(tool)}
                      disabled={!canAfford && info.cost > 0}
                      variant={isSelected ? 'default' : 'ghost'}
                      className={`w-full justify-start gap-2 px-3 py-2 h-auto text-sm ${
                        isSelected ? 'bg-primary text-primary-foreground' : ''
                      }`}
                      title={`${info.description}${info.cost > 0 ? ` - $${info.cost}` : ''}`}
                    >
                      <span className="flex-1 text-left truncate">{info.name}</span>
                      {info.cost > 0 && (
                        <span className={`text-xs ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                          ${info.cost}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
      
      {/* Bottom panel buttons */}
      <div className="border-t border-sidebar-border p-2">
        <div className="text-xs text-muted-foreground text-center">
          ${finances.cash.toLocaleString()}
        </div>
      </div>
      
      {/* Exit dialog */}
      <ExitDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onSaveAndExit={handleSaveAndExit}
        onExitWithoutSaving={handleExitWithoutSaving}
      />
    </div>
  );
}

export default Sidebar;
