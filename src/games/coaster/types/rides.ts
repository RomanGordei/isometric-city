/**
 * Coaster Tycoon Ride Types
 * Defines track pieces, ride instances, and ride mechanics
 */

import { msg } from 'gt-next';
import { RideType, CoasterType, RideCategory, RIDE_DEFINITIONS } from './buildings';

// =============================================================================
// TRACK PIECE TYPES
// =============================================================================

export type TrackPieceType =
  // Flat pieces
  | 'flat_straight'
  | 'flat_turn_left'
  | 'flat_turn_right'
  | 'flat_s_bend_left'
  | 'flat_s_bend_right'
  
  // Slopes
  | 'slope_up_25'
  | 'slope_up_60'
  | 'slope_up_90'
  | 'slope_down_25'
  | 'slope_down_60'
  | 'slope_down_90'
  
  // Slope transitions
  | 'flat_to_slope_up_25'
  | 'slope_up_25_to_flat'
  | 'slope_up_25_to_60'
  | 'slope_up_60_to_25'
  | 'flat_to_slope_down_25'
  | 'slope_down_25_to_flat'
  
  // Banked turns
  | 'banked_turn_left'
  | 'banked_turn_right'
  | 'banked_helix_left_small'
  | 'banked_helix_right_small'
  | 'banked_helix_left_large'
  | 'banked_helix_right_large'
  
  // Special elements
  | 'chain_lift'
  | 'station'
  | 'block_brakes'
  | 'brakes'
  | 'on_ride_photo'
  | 'booster'
  
  // Inversions
  | 'vertical_loop'
  | 'corkscrew_left'
  | 'corkscrew_right'
  | 'barrel_roll_left'
  | 'barrel_roll_right'
  | 'half_loop_up'
  | 'half_loop_down'
  | 'cobra_roll'
  | 'heartline_roll'
  | 'zero_g_roll'
  | 'inline_twist'
  
  // Drops
  | 'vertical_drop'
  | 'beyond_vertical_drop'
  | 'dive_loop'
  | 'immelmann';

// =============================================================================
// TRACK ELEMENT
// =============================================================================

export interface TrackElement {
  type: TrackPieceType;
  
  // Position in grid
  x: number;
  y: number;
  height: number;        // Height level (0-255, each unit = ~1m)
  
  // Orientation
  direction: 0 | 1 | 2 | 3;  // N, E, S, W (multiplied by 90 degrees)
  
  // Physics
  chainSpeed?: number;   // For chain lifts
  brakeSpeed?: number;   // For brakes
  boostSpeed?: number;   // For boosters
  
  // Flags
  isStation?: boolean;
  stationIndex?: number; // For multi-station rides
}

// =============================================================================
// RIDE STATS (Calculated from layout)
// =============================================================================

export interface RideStats {
  // Main ratings (0.00 - 10.00+, displayed to 2 decimals)
  excitement: number;
  intensity: number;
  nausea: number;
  
  // Physical measurements
  maxSpeed: number;           // km/h
  averageSpeed: number;       // km/h
  rideTime: number;           // seconds
  rideLength: number;         // meters
  maxPositiveGs: number;
  maxNegativeGs: number;
  maxLateralGs: number;
  
  // Element counts
  totalAirTime: number;       // seconds
  drops: number;
  highestDropHeight: number;  // meters
  inversions: number;
  
  // Breakdown stats
  reliability: number;        // 0-100%
  breakdownRate: number;      // Average hours between breakdowns
}

// =============================================================================
// COASTER TRAIN
// =============================================================================

export interface CoasterCar {
  // Position along track (0.0 - trackLength)
  trackPosition: number;
  
  // Calculated world position (for rendering)
  worldX: number;
  worldY: number;
  worldZ: number;
  
  // Rotation
  pitch: number;    // Forward/back tilt
  yaw: number;      // Left/right direction
  roll: number;     // Banking/inversion
  
  // Physics
  velocity: number; // Current speed in m/s
}

export interface CoasterTrain {
  id: number;
  cars: CoasterCar[];
  
  // Status
  status: 'in_station' | 'loading' | 'departing' | 'running' | 'approaching' | 'braking' | 'broken';
  currentStation: number;
  
  // Guests on this train
  guestIds: number[];
  
  // Timing
  departureTimer: number;  // Countdown to departure
}

// =============================================================================
// RIDE INSTANCE
// =============================================================================

export type RideStatus = 
  | 'building'     // Under construction
  | 'testing'      // Test runs
  | 'open'         // Open to guests
  | 'closed'       // Closed but operational
  | 'broken'       // Broken down
  | 'maintenance'; // Being inspected/repaired

export interface Ride {
  id: string;
  type: RideType;
  name: string;
  customName: boolean;  // Has player renamed it?
  
  // Location
  entranceX: number;
  entranceY: number;
  exitX: number;
  exitY: number;
  
  // Track (for tracked rides)
  track: TrackElement[];
  
  // Flat ride footprint (for non-tracked rides)
  tiles: { x: number; y: number }[];
  
  // Status
  status: RideStatus;
  operatingMode: 'normal' | 'continuous_circuit' | 'shuttle' | 'race';
  
  // Trains (for tracked rides)
  trains: CoasterTrain[];
  numTrains: number;
  carsPerTrain: number;
  
  // Queue
  queuePath: { x: number; y: number }[];
  queueLength: number;          // Current queue length (guests)
  maxQueueLength: number;       // Max capacity
  guestsInQueue: number[];      // Guest IDs in queue
  
  // Guests currently on ride
  guestsOnRide: number[];

  // Ride cycle state
  cycleTimer: number;            // Ticks remaining in current cycle
  isRunning: boolean;
  
  // Stats (calculated from track/type)
  stats: RideStats;
  
  // Operations
  price: number;                // Ticket price
  minWaitTime: number;          // Seconds between dispatches
  maxWaitTime: number;
  inspectionInterval: number;   // Minutes between inspections
  lastInspection: number;       // Timestamp
  
  // Financials
  totalRiders: number;
  totalRevenue: number;
  buildCost: number;
  age: number;                  // Months since opening
  
  // Reliability
  reliability: number;          // 0-100
  downtime: number;             // Total downtime in hours
  breakdowns: number;           // Total breakdowns
  
  // Music/theme
  musicType?: string;
  lightingMode?: 'on' | 'off' | 'automatic';
}

// =============================================================================
// RIDE CALCULATION HELPERS
// =============================================================================

/**
 * Calculate base excitement from track elements
 */
export function calculateTrackExcitement(track: TrackElement[], rideType: CoasterType): number {
  const def = RIDE_DEFINITIONS[rideType];
  let excitement = def.excitementBase;
  
  // Bonus for length
  excitement += Math.min(track.length * 0.02, 2.0);
  
  // Bonus for drops
  const drops = track.filter(t => 
    t.type.includes('slope_down') || 
    t.type.includes('vertical_drop')
  ).length;
  excitement += Math.min(drops * 0.15, 1.5);
  
  // Bonus for inversions
  const inversions = track.filter(t =>
    t.type.includes('loop') ||
    t.type.includes('corkscrew') ||
    t.type.includes('roll') ||
    t.type.includes('twist')
  ).length;
  excitement += Math.min(inversions * 0.2, 2.0);
  
  // Bonus for height variation
  const heights = track.map(t => t.height);
  const maxHeight = Math.max(...heights);
  const minHeight = Math.min(...heights);
  excitement += Math.min((maxHeight - minHeight) * 0.03, 1.5);
  
  return Math.round(excitement * 100) / 100;
}

/**
 * Calculate base intensity from track elements
 */
export function calculateTrackIntensity(track: TrackElement[], rideType: CoasterType): number {
  const def = RIDE_DEFINITIONS[rideType];
  let intensity = def.intensityBase;
  
  // Steep slopes increase intensity
  const steepElements = track.filter(t =>
    t.type.includes('60') ||
    t.type.includes('90') ||
    t.type.includes('vertical')
  ).length;
  intensity += steepElements * 0.1;
  
  // Inversions increase intensity
  const inversions = track.filter(t =>
    t.type.includes('loop') ||
    t.type.includes('corkscrew') ||
    t.type.includes('roll')
  ).length;
  intensity += inversions * 0.25;
  
  // Chain lifts add suspense
  const chainLifts = track.filter(t => t.type === 'chain_lift').length;
  intensity += chainLifts * 0.1;
  
  return Math.round(intensity * 100) / 100;
}

/**
 * Calculate base nausea from track elements
 */
export function calculateTrackNausea(track: TrackElement[], rideType: CoasterType): number {
  const def = RIDE_DEFINITIONS[rideType];
  let nausea = def.nauseaBase;
  
  // Inversions increase nausea
  const inversions = track.filter(t =>
    t.type.includes('loop') ||
    t.type.includes('corkscrew') ||
    t.type.includes('roll') ||
    t.type.includes('twist')
  ).length;
  nausea += inversions * 0.3;
  
  // Helixes increase nausea
  const helixes = track.filter(t => t.type.includes('helix')).length;
  nausea += helixes * 0.25;
  
  // Multiple inversions in sequence is worse
  if (inversions >= 5) {
    nausea += 0.5;
  }
  
  return Math.round(nausea * 100) / 100;
}

/**
 * Get ride category from type
 */
export function getRideCategory(rideType: RideType): RideCategory {
  const def = RIDE_DEFINITIONS[rideType];
  return def.category;
}

/**
 * Check if a ride type uses a track
 */
export function isTrackedRide(rideType: RideType): boolean {
  const def = RIDE_DEFINITIONS[rideType];
  return def.isTracked;
}

/**
 * Calculate ride reliability over time
 */
export function calculateReliability(age: number, breakdowns: number, inspections: number): number {
  // Base reliability decreases with age
  let reliability = 100 - (age * 0.5);
  
  // Each breakdown reduces reliability
  reliability -= breakdowns * 2;
  
  // Recent inspections improve reliability
  reliability += Math.min(inspections * 0.5, 10);
  
  return Math.max(0, Math.min(100, reliability));
}

/**
 * Create empty ride stats
 */
export function createEmptyStats(): RideStats {
  return {
    excitement: 0,
    intensity: 0,
    nausea: 0,
    maxSpeed: 0,
    averageSpeed: 0,
    rideTime: 0,
    rideLength: 0,
    maxPositiveGs: 0,
    maxNegativeGs: 0,
    maxLateralGs: 0,
    totalAirTime: 0,
    drops: 0,
    highestDropHeight: 0,
    inversions: 0,
    reliability: 100,
    breakdownRate: 168, // Weekly default
  };
}

/**
 * Generate a unique ride ID
 */
export function generateRideId(): string {
  return `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a default ride name
 */
const COASTER_NAME_ADJECTIVES = [
  'Wild', 'Thunder', 'Steel', 'Screaming', 'Twisted', 'Flying',
  'Raging', 'Midnight', 'Crimson', 'Golden', 'Silver', 'Iron',
  'Electric', 'Cosmic', 'Phantom', 'Shadow', 'Blazing', 'Frozen',
];

const COASTER_NAME_NOUNS = [
  'Fury', 'Express', 'Dragon', 'Lightning', 'Viper', 'Falcon',
  'Tornado', 'Cyclone', 'Phoenix', 'Thunder', 'Storm', 'Blaze',
  'Comet', 'Rocket', 'Bullet', 'Arrow', 'Serpent', 'Eagle',
];

const COASTER_NAME_TEMPLATES: Record<string, Record<string, string>> = {
  'Wild': {
    'Fury': msg('Wild Fury'), 'Express': msg('Wild Express'), 'Dragon': msg('Wild Dragon'), 'Lightning': msg('Wild Lightning'), 'Viper': msg('Wild Viper'), 'Falcon': msg('Wild Falcon'),
    'Tornado': msg('Wild Tornado'), 'Cyclone': msg('Wild Cyclone'), 'Phoenix': msg('Wild Phoenix'), 'Thunder': msg('Wild Thunder'), 'Storm': msg('Wild Storm'), 'Blaze': msg('Wild Blaze'),
    'Comet': msg('Wild Comet'), 'Rocket': msg('Wild Rocket'), 'Bullet': msg('Wild Bullet'), 'Arrow': msg('Wild Arrow'), 'Serpent': msg('Wild Serpent'), 'Eagle': msg('Wild Eagle'),
  },
  'Thunder': {
    'Fury': msg('Thunder Fury'), 'Express': msg('Thunder Express'), 'Dragon': msg('Thunder Dragon'), 'Lightning': msg('Thunder Lightning'), 'Viper': msg('Thunder Viper'), 'Falcon': msg('Thunder Falcon'),
    'Tornado': msg('Thunder Tornado'), 'Cyclone': msg('Thunder Cyclone'), 'Phoenix': msg('Thunder Phoenix'), 'Thunder': msg('Thunder Thunder'), 'Storm': msg('Thunder Storm'), 'Blaze': msg('Thunder Blaze'),
    'Comet': msg('Thunder Comet'), 'Rocket': msg('Thunder Rocket'), 'Bullet': msg('Thunder Bullet'), 'Arrow': msg('Thunder Arrow'), 'Serpent': msg('Thunder Serpent'), 'Eagle': msg('Thunder Eagle'),
  },
  'Steel': {
    'Fury': msg('Steel Fury'), 'Express': msg('Steel Express'), 'Dragon': msg('Steel Dragon'), 'Lightning': msg('Steel Lightning'), 'Viper': msg('Steel Viper'), 'Falcon': msg('Steel Falcon'),
    'Tornado': msg('Steel Tornado'), 'Cyclone': msg('Steel Cyclone'), 'Phoenix': msg('Steel Phoenix'), 'Thunder': msg('Steel Thunder'), 'Storm': msg('Steel Storm'), 'Blaze': msg('Steel Blaze'),
    'Comet': msg('Steel Comet'), 'Rocket': msg('Steel Rocket'), 'Bullet': msg('Steel Bullet'), 'Arrow': msg('Steel Arrow'), 'Serpent': msg('Steel Serpent'), 'Eagle': msg('Steel Eagle'),
  },
  'Screaming': {
    'Fury': msg('Screaming Fury'), 'Express': msg('Screaming Express'), 'Dragon': msg('Screaming Dragon'), 'Lightning': msg('Screaming Lightning'), 'Viper': msg('Screaming Viper'), 'Falcon': msg('Screaming Falcon'),
    'Tornado': msg('Screaming Tornado'), 'Cyclone': msg('Screaming Cyclone'), 'Phoenix': msg('Screaming Phoenix'), 'Thunder': msg('Screaming Thunder'), 'Storm': msg('Screaming Storm'), 'Blaze': msg('Screaming Blaze'),
    'Comet': msg('Screaming Comet'), 'Rocket': msg('Screaming Rocket'), 'Bullet': msg('Screaming Bullet'), 'Arrow': msg('Screaming Arrow'), 'Serpent': msg('Screaming Serpent'), 'Eagle': msg('Screaming Eagle'),
  },
  'Twisted': {
    'Fury': msg('Twisted Fury'), 'Express': msg('Twisted Express'), 'Dragon': msg('Twisted Dragon'), 'Lightning': msg('Twisted Lightning'), 'Viper': msg('Twisted Viper'), 'Falcon': msg('Twisted Falcon'),
    'Tornado': msg('Twisted Tornado'), 'Cyclone': msg('Twisted Cyclone'), 'Phoenix': msg('Twisted Phoenix'), 'Thunder': msg('Twisted Thunder'), 'Storm': msg('Twisted Storm'), 'Blaze': msg('Twisted Blaze'),
    'Comet': msg('Twisted Comet'), 'Rocket': msg('Twisted Rocket'), 'Bullet': msg('Twisted Bullet'), 'Arrow': msg('Twisted Arrow'), 'Serpent': msg('Twisted Serpent'), 'Eagle': msg('Twisted Eagle'),
  },
  'Flying': {
    'Fury': msg('Flying Fury'), 'Express': msg('Flying Express'), 'Dragon': msg('Flying Dragon'), 'Lightning': msg('Flying Lightning'), 'Viper': msg('Flying Viper'), 'Falcon': msg('Flying Falcon'),
    'Tornado': msg('Flying Tornado'), 'Cyclone': msg('Flying Cyclone'), 'Phoenix': msg('Flying Phoenix'), 'Thunder': msg('Flying Thunder'), 'Storm': msg('Flying Storm'), 'Blaze': msg('Flying Blaze'),
    'Comet': msg('Flying Comet'), 'Rocket': msg('Flying Rocket'), 'Bullet': msg('Flying Bullet'), 'Arrow': msg('Flying Arrow'), 'Serpent': msg('Flying Serpent'), 'Eagle': msg('Flying Eagle'),
  },
  'Raging': {
    'Fury': msg('Raging Fury'), 'Express': msg('Raging Express'), 'Dragon': msg('Raging Dragon'), 'Lightning': msg('Raging Lightning'), 'Viper': msg('Raging Viper'), 'Falcon': msg('Raging Falcon'),
    'Tornado': msg('Raging Tornado'), 'Cyclone': msg('Raging Cyclone'), 'Phoenix': msg('Raging Phoenix'), 'Thunder': msg('Raging Thunder'), 'Storm': msg('Raging Storm'), 'Blaze': msg('Raging Blaze'),
    'Comet': msg('Raging Comet'), 'Rocket': msg('Raging Rocket'), 'Bullet': msg('Raging Bullet'), 'Arrow': msg('Raging Arrow'), 'Serpent': msg('Raging Serpent'), 'Eagle': msg('Raging Eagle'),
  },
  'Midnight': {
    'Fury': msg('Midnight Fury'), 'Express': msg('Midnight Express'), 'Dragon': msg('Midnight Dragon'), 'Lightning': msg('Midnight Lightning'), 'Viper': msg('Midnight Viper'), 'Falcon': msg('Midnight Falcon'),
    'Tornado': msg('Midnight Tornado'), 'Cyclone': msg('Midnight Cyclone'), 'Phoenix': msg('Midnight Phoenix'), 'Thunder': msg('Midnight Thunder'), 'Storm': msg('Midnight Storm'), 'Blaze': msg('Midnight Blaze'),
    'Comet': msg('Midnight Comet'), 'Rocket': msg('Midnight Rocket'), 'Bullet': msg('Midnight Bullet'), 'Arrow': msg('Midnight Arrow'), 'Serpent': msg('Midnight Serpent'), 'Eagle': msg('Midnight Eagle'),
  },
  'Crimson': {
    'Fury': msg('Crimson Fury'), 'Express': msg('Crimson Express'), 'Dragon': msg('Crimson Dragon'), 'Lightning': msg('Crimson Lightning'), 'Viper': msg('Crimson Viper'), 'Falcon': msg('Crimson Falcon'),
    'Tornado': msg('Crimson Tornado'), 'Cyclone': msg('Crimson Cyclone'), 'Phoenix': msg('Crimson Phoenix'), 'Thunder': msg('Crimson Thunder'), 'Storm': msg('Crimson Storm'), 'Blaze': msg('Crimson Blaze'),
    'Comet': msg('Crimson Comet'), 'Rocket': msg('Crimson Rocket'), 'Bullet': msg('Crimson Bullet'), 'Arrow': msg('Crimson Arrow'), 'Serpent': msg('Crimson Serpent'), 'Eagle': msg('Crimson Eagle'),
  },
  'Golden': {
    'Fury': msg('Golden Fury'), 'Express': msg('Golden Express'), 'Dragon': msg('Golden Dragon'), 'Lightning': msg('Golden Lightning'), 'Viper': msg('Golden Viper'), 'Falcon': msg('Golden Falcon'),
    'Tornado': msg('Golden Tornado'), 'Cyclone': msg('Golden Cyclone'), 'Phoenix': msg('Golden Phoenix'), 'Thunder': msg('Golden Thunder'), 'Storm': msg('Golden Storm'), 'Blaze': msg('Golden Blaze'),
    'Comet': msg('Golden Comet'), 'Rocket': msg('Golden Rocket'), 'Bullet': msg('Golden Bullet'), 'Arrow': msg('Golden Arrow'), 'Serpent': msg('Golden Serpent'), 'Eagle': msg('Golden Eagle'),
  },
  'Silver': {
    'Fury': msg('Silver Fury'), 'Express': msg('Silver Express'), 'Dragon': msg('Silver Dragon'), 'Lightning': msg('Silver Lightning'), 'Viper': msg('Silver Viper'), 'Falcon': msg('Silver Falcon'),
    'Tornado': msg('Silver Tornado'), 'Cyclone': msg('Silver Cyclone'), 'Phoenix': msg('Silver Phoenix'), 'Thunder': msg('Silver Thunder'), 'Storm': msg('Silver Storm'), 'Blaze': msg('Silver Blaze'),
    'Comet': msg('Silver Comet'), 'Rocket': msg('Silver Rocket'), 'Bullet': msg('Silver Bullet'), 'Arrow': msg('Silver Arrow'), 'Serpent': msg('Silver Serpent'), 'Eagle': msg('Silver Eagle'),
  },
  'Iron': {
    'Fury': msg('Iron Fury'), 'Express': msg('Iron Express'), 'Dragon': msg('Iron Dragon'), 'Lightning': msg('Iron Lightning'), 'Viper': msg('Iron Viper'), 'Falcon': msg('Iron Falcon'),
    'Tornado': msg('Iron Tornado'), 'Cyclone': msg('Iron Cyclone'), 'Phoenix': msg('Iron Phoenix'), 'Thunder': msg('Iron Thunder'), 'Storm': msg('Iron Storm'), 'Blaze': msg('Iron Blaze'),
    'Comet': msg('Iron Comet'), 'Rocket': msg('Iron Rocket'), 'Bullet': msg('Iron Bullet'), 'Arrow': msg('Iron Arrow'), 'Serpent': msg('Iron Serpent'), 'Eagle': msg('Iron Eagle'),
  },
  'Electric': {
    'Fury': msg('Electric Fury'), 'Express': msg('Electric Express'), 'Dragon': msg('Electric Dragon'), 'Lightning': msg('Electric Lightning'), 'Viper': msg('Electric Viper'), 'Falcon': msg('Electric Falcon'),
    'Tornado': msg('Electric Tornado'), 'Cyclone': msg('Electric Cyclone'), 'Phoenix': msg('Electric Phoenix'), 'Thunder': msg('Electric Thunder'), 'Storm': msg('Electric Storm'), 'Blaze': msg('Electric Blaze'),
    'Comet': msg('Electric Comet'), 'Rocket': msg('Electric Rocket'), 'Bullet': msg('Electric Bullet'), 'Arrow': msg('Electric Arrow'), 'Serpent': msg('Electric Serpent'), 'Eagle': msg('Electric Eagle'),
  },
  'Cosmic': {
    'Fury': msg('Cosmic Fury'), 'Express': msg('Cosmic Express'), 'Dragon': msg('Cosmic Dragon'), 'Lightning': msg('Cosmic Lightning'), 'Viper': msg('Cosmic Viper'), 'Falcon': msg('Cosmic Falcon'),
    'Tornado': msg('Cosmic Tornado'), 'Cyclone': msg('Cosmic Cyclone'), 'Phoenix': msg('Cosmic Phoenix'), 'Thunder': msg('Cosmic Thunder'), 'Storm': msg('Cosmic Storm'), 'Blaze': msg('Cosmic Blaze'),
    'Comet': msg('Cosmic Comet'), 'Rocket': msg('Cosmic Rocket'), 'Bullet': msg('Cosmic Bullet'), 'Arrow': msg('Cosmic Arrow'), 'Serpent': msg('Cosmic Serpent'), 'Eagle': msg('Cosmic Eagle'),
  },
  'Phantom': {
    'Fury': msg('Phantom Fury'), 'Express': msg('Phantom Express'), 'Dragon': msg('Phantom Dragon'), 'Lightning': msg('Phantom Lightning'), 'Viper': msg('Phantom Viper'), 'Falcon': msg('Phantom Falcon'),
    'Tornado': msg('Phantom Tornado'), 'Cyclone': msg('Phantom Cyclone'), 'Phoenix': msg('Phantom Phoenix'), 'Thunder': msg('Phantom Thunder'), 'Storm': msg('Phantom Storm'), 'Blaze': msg('Phantom Blaze'),
    'Comet': msg('Phantom Comet'), 'Rocket': msg('Phantom Rocket'), 'Bullet': msg('Phantom Bullet'), 'Arrow': msg('Phantom Arrow'), 'Serpent': msg('Phantom Serpent'), 'Eagle': msg('Phantom Eagle'),
  },
  'Shadow': {
    'Fury': msg('Shadow Fury'), 'Express': msg('Shadow Express'), 'Dragon': msg('Shadow Dragon'), 'Lightning': msg('Shadow Lightning'), 'Viper': msg('Shadow Viper'), 'Falcon': msg('Shadow Falcon'),
    'Tornado': msg('Shadow Tornado'), 'Cyclone': msg('Shadow Cyclone'), 'Phoenix': msg('Shadow Phoenix'), 'Thunder': msg('Shadow Thunder'), 'Storm': msg('Shadow Storm'), 'Blaze': msg('Shadow Blaze'),
    'Comet': msg('Shadow Comet'), 'Rocket': msg('Shadow Rocket'), 'Bullet': msg('Shadow Bullet'), 'Arrow': msg('Shadow Arrow'), 'Serpent': msg('Shadow Serpent'), 'Eagle': msg('Shadow Eagle'),
  },
  'Blazing': {
    'Fury': msg('Blazing Fury'), 'Express': msg('Blazing Express'), 'Dragon': msg('Blazing Dragon'), 'Lightning': msg('Blazing Lightning'), 'Viper': msg('Blazing Viper'), 'Falcon': msg('Blazing Falcon'),
    'Tornado': msg('Blazing Tornado'), 'Cyclone': msg('Blazing Cyclone'), 'Phoenix': msg('Blazing Phoenix'), 'Thunder': msg('Blazing Thunder'), 'Storm': msg('Blazing Storm'), 'Blaze': msg('Blazing Blaze'),
    'Comet': msg('Blazing Comet'), 'Rocket': msg('Blazing Rocket'), 'Bullet': msg('Blazing Bullet'), 'Arrow': msg('Blazing Arrow'), 'Serpent': msg('Blazing Serpent'), 'Eagle': msg('Blazing Eagle'),
  },
  'Frozen': {
    'Fury': msg('Frozen Fury'), 'Express': msg('Frozen Express'), 'Dragon': msg('Frozen Dragon'), 'Lightning': msg('Frozen Lightning'), 'Viper': msg('Frozen Viper'), 'Falcon': msg('Frozen Falcon'),
    'Tornado': msg('Frozen Tornado'), 'Cyclone': msg('Frozen Cyclone'), 'Phoenix': msg('Frozen Phoenix'), 'Thunder': msg('Frozen Thunder'), 'Storm': msg('Frozen Storm'), 'Blaze': msg('Frozen Blaze'),
    'Comet': msg('Frozen Comet'), 'Rocket': msg('Frozen Rocket'), 'Bullet': msg('Frozen Bullet'), 'Arrow': msg('Frozen Arrow'), 'Serpent': msg('Frozen Serpent'), 'Eagle': msg('Frozen Eagle'),
  },
};

const NON_COASTER_DEFAULT_NAMES: Record<string, string> = {
  // Gentle Rides
  carousel: msg('Carousel 1'),
  ferris_wheel: msg('Ferris Wheel 1'),
  observation_tower: msg('Observation Tower 1'),
  spiral_slide: msg('Spiral Slide 1'),
  merry_go_round: msg('Merry-Go-Round 1'),
  haunted_house: msg('Haunted House 1'),
  circus_show: msg('Circus Show 1'),
  mini_golf: msg('Mini Golf 1'),
  dodgems: msg('Bumper Cars 1'),
  flying_saucers: msg('Flying Saucers 1'),
  maze: msg('Hedge Maze 1'),
  mini_train: msg('Mini Train 1'),
  // Thrill Rides
  swinging_ship: msg('Swinging Ship 1'),
  swinging_inverter_ship: msg('Inverter Ship 1'),
  top_spin: msg('Top Spin 1'),
  twist: msg('Twist 1'),
  motion_simulator: msg('Motion Simulator 1'),
  go_karts: msg('Go Karts 1'),
  launched_freefall: msg('Drop Tower 1'),
  enterprise: msg('Enterprise 1'),
  roto_drop: msg('Roto-Drop 1'),
  scrambled_eggs: msg('Scrambler 1'),
  // Water Rides
  log_flume: msg('Log Flume 1'),
  river_rapids: msg('River Rapids 1'),
  splash_boats: msg('Splash Boats 1'),
  rowing_boats: msg('Rowing Boats 1'),
  canoes: msg('Canoes 1'),
  dinghy_slide: msg('Dinghy Slide 1'),
  water_coaster: msg('Water Coaster 1'),
  // Transport Rides
  miniature_railway: msg('Miniature Railway 1'),
  monorail: msg('Monorail 1'),
  suspended_monorail: msg('Suspended Monorail 1'),
  chairlift: msg('Chairlift 1'),
  elevator: msg('Elevator 1'),
};

export function generateRideName(rideType: RideType): string {
  const def = RIDE_DEFINITIONS[rideType];

  if (def.category === 'coaster') {
    const adj = COASTER_NAME_ADJECTIVES[Math.floor(Math.random() * COASTER_NAME_ADJECTIVES.length)];
    const noun = COASTER_NAME_NOUNS[Math.floor(Math.random() * COASTER_NAME_NOUNS.length)];
    return COASTER_NAME_TEMPLATES[adj][noun];
  }

  // For non-coasters, use the predefined default name
  return NON_COASTER_DEFAULT_NAMES[rideType] || `${rideType} 1`;
}
