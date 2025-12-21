/**
 * AI Player System for Competitive RTS Mode
 * 
 * Controls AI players:
 * - Building cities (placing zones, buildings, roads)
 * - Creating military units
 * - Attacking enemy players
 * - Managing resources
 */

import { GameState, Player, PlayerId, MilitaryUnit, MilitaryUnitType, Tile, MILITARY_UNIT_STATS } from '@/types/game';
import { createMilitaryUnit } from './militarySystem';

// AI decision intervals (in seconds)
const AI_BUILD_INTERVAL = 3;
const AI_MILITARY_INTERVAL = 5;
const AI_ATTACK_INTERVAL = 10;

// AI state tracking
interface AIState {
  buildTimer: number;
  militaryTimer: number;
  attackTimer: number;
  lastDecision: number;
}

const aiStates: Map<PlayerId, AIState> = new Map();

/**
 * Initialize AI state for a player
 */
function initAIState(playerId: PlayerId): AIState {
  return {
    buildTimer: Math.random() * AI_BUILD_INTERVAL,
    militaryTimer: Math.random() * AI_MILITARY_INTERVAL,
    attackTimer: Math.random() * AI_ATTACK_INTERVAL,
    lastDecision: 0,
  };
}

/**
 * Get or create AI state for a player
 */
function getAIState(playerId: PlayerId): AIState {
  let state = aiStates.get(playerId);
  if (!state) {
    state = initAIState(playerId);
    aiStates.set(playerId, state);
  }
  return state;
}

/**
 * Update all AI players
 */
export function updateAIPlayers(
  state: GameState,
  delta: number,
  speedMultiplier: number
): {
  newUnits: MilitaryUnit[];
  unitCommands: { unitId: number; targetX: number; targetY: number; isAttack: boolean }[];
  moneyChanges: { playerId: PlayerId; amount: number }[];
} {
  if (state.gameMode !== 'competitive') {
    return { newUnits: [], unitCommands: [], moneyChanges: [] };
  }

  const newUnits: MilitaryUnit[] = [];
  const unitCommands: { unitId: number; targetX: number; targetY: number; isAttack: boolean }[] = [];
  const moneyChanges: { playerId: PlayerId; amount: number }[] = [];

  // Process each AI player
  for (const player of state.players) {
    if (!player.isAI || player.eliminated) continue;

    const aiState = getAIState(player.id);
    
    // Update timers
    aiState.buildTimer -= delta * speedMultiplier;
    aiState.militaryTimer -= delta * speedMultiplier;
    aiState.attackTimer -= delta * speedMultiplier;

    // Building decisions
    if (aiState.buildTimer <= 0) {
      aiState.buildTimer = AI_BUILD_INTERVAL + Math.random() * 2;
      // AI earns passive income based on owned tiles
      const ownedTiles = countOwnedTiles(state.grid, state.gridSize, player.id);
      const passiveIncome = Math.floor(ownedTiles * 10);
      if (passiveIncome > 0) {
        moneyChanges.push({ playerId: player.id, amount: passiveIncome });
      }
    }

    // Military unit production
    if (aiState.militaryTimer <= 0) {
      aiState.militaryTimer = AI_MILITARY_INTERVAL + Math.random() * 3;
      
      const playerUnits = state.militaryUnits.filter(u => u.owner === player.id);
      const maxUnits = 10 + Math.floor(countOwnedTiles(state.grid, state.gridSize, player.id) / 10);
      
      if (playerUnits.length < maxUnits && player.money >= MILITARY_UNIT_STATS.infantry.cost) {
        // Decide unit type based on army composition
        const infantryCount = playerUnits.filter(u => u.type === 'infantry').length;
        const tankCount = playerUnits.filter(u => u.type === 'tank').length;
        const heliCount = playerUnits.filter(u => u.type === 'military_helicopter').length;
        
        let unitType: MilitaryUnitType = 'infantry';
        const rand = Math.random();
        
        if (player.money >= MILITARY_UNIT_STATS.tank.cost && tankCount < infantryCount / 3) {
          unitType = rand < 0.4 ? 'tank' : 'infantry';
        } else if (player.money >= MILITARY_UNIT_STATS.military_helicopter.cost && heliCount < infantryCount / 4) {
          unitType = rand < 0.2 ? 'military_helicopter' : 'infantry';
        }
        
        const cost = MILITARY_UNIT_STATS[unitType].cost;
        if (player.money >= cost) {
          // Create unit near player's city center
          const spawnOffset = 2 + Math.random() * 3;
          const angle = Math.random() * Math.PI * 2;
          const unit = createMilitaryUnit(
            state.militaryIdCounter + newUnits.length,
            unitType,
            player.id,
            player.startX + Math.cos(angle) * spawnOffset,
            player.startY + Math.sin(angle) * spawnOffset
          );
          newUnits.push(unit);
          moneyChanges.push({ playerId: player.id, amount: -cost });
        }
      }
    }

    // Attack decisions
    if (aiState.attackTimer <= 0) {
      aiState.attackTimer = AI_ATTACK_INTERVAL + Math.random() * 5;
      
      const playerUnits = state.militaryUnits.filter(u => u.owner === player.id && !u.attackTargetX);
      
      if (playerUnits.length >= 3) {
        // Find nearest enemy player city
        const enemies = state.players.filter(p => !p.isAI ? true : p.id !== player.id && !p.eliminated);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          
          // Attack with some units
          const attackForce = playerUnits.slice(0, Math.ceil(playerUnits.length * 0.6));
          for (const unit of attackForce) {
            // Add some randomness to target
            const offsetX = (Math.random() - 0.5) * 10;
            const offsetY = (Math.random() - 0.5) * 10;
            unitCommands.push({
              unitId: unit.id,
              targetX: Math.max(0, Math.min(state.gridSize - 1, target.startX + offsetX)),
              targetY: Math.max(0, Math.min(state.gridSize - 1, target.startY + offsetY)),
              isAttack: true,
            });
          }
        }
      }
    }
  }

  return { newUnits, unitCommands, moneyChanges };
}

/**
 * Count tiles owned by a player
 */
function countOwnedTiles(grid: Tile[][], gridSize: number, playerId: PlayerId): number {
  let count = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x].owner === playerId) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Check if a player is eliminated (all buildings destroyed or no income)
 */
export function checkPlayerElimination(state: GameState): PlayerId[] {
  if (state.gameMode !== 'competitive') return [];

  const eliminated: PlayerId[] = [];
  
  for (const player of state.players) {
    if (player.eliminated) continue;
    
    // Check if player has any buildings left
    let hasBuildings = false;
    for (let y = 0; y < state.gridSize && !hasBuildings; y++) {
      for (let x = 0; x < state.gridSize && !hasBuildings; x++) {
        const tile = state.grid[y][x];
        if (tile.owner === player.id && 
            tile.building.type !== 'grass' && 
            tile.building.type !== 'water' &&
            tile.building.type !== 'road') {
          hasBuildings = true;
        }
      }
    }
    
    // Check if player has any units
    const hasUnits = state.militaryUnits.some(u => u.owner === player.id && u.health > 0);
    
    // Check if player has money
    const hasMoney = player.money > 0;
    
    // Player is eliminated if they have nothing
    if (!hasBuildings && !hasUnits && !hasMoney) {
      eliminated.push(player.id);
    }
  }
  
  return eliminated;
}

/**
 * Calculate player scores
 */
export function calculatePlayerScores(state: GameState): Map<PlayerId, number> {
  const scores = new Map<PlayerId, number>();
  
  if (state.gameMode !== 'competitive') return scores;
  
  for (const player of state.players) {
    let score = 0;
    
    // Score from owned tiles (10 points each)
    score += countOwnedTiles(state.grid, state.gridSize, player.id) * 10;
    
    // Score from buildings
    for (let y = 0; y < state.gridSize; y++) {
      for (let x = 0; x < state.gridSize; x++) {
        const tile = state.grid[y][x];
        if (tile.owner === player.id) {
          const buildingType = tile.building.type;
          if (buildingType === 'city_hall') score += 500;
          else if (buildingType === 'power_plant') score += 200;
          else if (buildingType.includes('factory')) score += 100;
          else if (buildingType.includes('office')) score += 150;
          else if (buildingType.includes('house') || buildingType.includes('apartment')) score += 50;
        }
      }
    }
    
    // Score from military units
    const playerUnits = state.militaryUnits.filter(u => u.owner === player.id);
    for (const unit of playerUnits) {
      score += MILITARY_UNIT_STATS[unit.type].cost;
    }
    
    // Score from money
    score += Math.floor(player.money / 10);
    
    scores.set(player.id, score);
  }
  
  return scores;
}

/**
 * Reset AI states (call when starting a new game)
 */
export function resetAIStates(): void {
  aiStates.clear();
}
