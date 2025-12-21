/**
 * Military System for Competitive RTS Mode
 * 
 * Manages:
 * - Military unit creation and spawning
 * - Unit movement and pathfinding
 * - Combat and attacking buildings
 * - Unit selection and control
 */

import { MilitaryUnit, MilitaryUnitType, PlayerId, MILITARY_UNIT_STATS, Tile, GameMode } from '@/types/game';
import { TILE_WIDTH, TILE_HEIGHT, CarDirection } from './types';
import { gridToScreen, findPathOnRoads } from './utils';

// Player colors for units
export const PLAYER_COLORS: Record<PlayerId, string> = {
  0: '#3b82f6', // Blue - player
  1: '#ef4444', // Red - AI 1
  2: '#22c55e', // Green - AI 2
  3: '#f59e0b', // Orange - AI 3
};

/**
 * Create a new military unit
 */
export function createMilitaryUnit(
  id: number,
  type: MilitaryUnitType,
  owner: PlayerId,
  x: number,
  y: number
): MilitaryUnit {
  const stats = MILITARY_UNIT_STATS[type];
  return {
    id,
    type,
    owner,
    x,
    y,
    targetX: null,
    targetY: null,
    attackTargetX: null,
    attackTargetY: null,
    health: stats.health,
    maxHealth: stats.health,
    damage: stats.damage,
    speed: stats.speed,
    range: stats.range,
    attackCooldown: 0,
    attackSpeed: stats.attackSpeed,
    selected: false,
    direction: Math.PI / 4, // Default facing SE
    animationTimer: Math.random() * Math.PI * 2,
  };
}

/**
 * Update all military units (movement, combat, etc.)
 */
export function updateMilitaryUnits(
  units: MilitaryUnit[],
  grid: Tile[][],
  gridSize: number,
  delta: number,
  speedMultiplier: number,
  gameMode: GameMode
): { updatedUnits: MilitaryUnit[]; buildingsAttacked: { x: number; y: number; damage: number; attacker: PlayerId }[] } {
  if (gameMode !== 'competitive') {
    return { updatedUnits: units, buildingsAttacked: [] };
  }

  const buildingsAttacked: { x: number; y: number; damage: number; attacker: PlayerId }[] = [];
  const updatedUnits: MilitaryUnit[] = [];

  for (const unit of units) {
    // Skip dead units
    if (unit.health <= 0) continue;

    // Update animation timer
    unit.animationTimer += delta * 4;

    // Update attack cooldown
    if (unit.attackCooldown > 0) {
      unit.attackCooldown -= delta * speedMultiplier;
    }

    // Check if we have an attack target
    if (unit.attackTargetX !== null && unit.attackTargetY !== null) {
      const targetTile = grid[unit.attackTargetY]?.[unit.attackTargetX];
      
      // Check if target still exists and is valid
      if (!targetTile || targetTile.building.type === 'grass' || targetTile.building.type === 'water' || targetTile.building.type === 'empty') {
        // Target destroyed or invalid
        unit.attackTargetX = null;
        unit.attackTargetY = null;
      } else {
        // Calculate distance to target
        const dx = unit.attackTargetX - unit.x;
        const dy = unit.attackTargetY - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= unit.range) {
          // In range - attack!
          if (unit.attackCooldown <= 0) {
            buildingsAttacked.push({
              x: unit.attackTargetX,
              y: unit.attackTargetY,
              damage: unit.damage,
              attacker: unit.owner,
            });
            unit.attackCooldown = 1 / unit.attackSpeed;
          }
          // Face the target
          unit.direction = Math.atan2(dy, dx);
          // Stop moving when attacking
          unit.targetX = null;
          unit.targetY = null;
        } else {
          // Move toward target
          unit.targetX = unit.attackTargetX;
          unit.targetY = unit.attackTargetY;
        }
      }
    }

    // Handle movement
    if (unit.targetX !== null && unit.targetY !== null) {
      const dx = unit.targetX - unit.x;
      const dy = unit.targetY - unit.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.1) {
        // Calculate movement
        const moveSpeed = unit.speed * delta * speedMultiplier;
        const moveDistance = Math.min(moveSpeed, distance);
        
        unit.x += (dx / distance) * moveDistance;
        unit.y += (dy / distance) * moveDistance;
        unit.direction = Math.atan2(dy, dx);
      } else {
        // Arrived at destination
        unit.x = unit.targetX;
        unit.y = unit.targetY;
        unit.targetX = null;
        unit.targetY = null;
      }
    }

    // Keep unit in bounds
    unit.x = Math.max(0, Math.min(gridSize - 1, unit.x));
    unit.y = Math.max(0, Math.min(gridSize - 1, unit.y));

    updatedUnits.push(unit);
  }

  return { updatedUnits, buildingsAttacked };
}

/**
 * Apply damage to buildings from attacks
 */
export function applyBuildingDamage(
  grid: Tile[][],
  attacks: { x: number; y: number; damage: number; attacker: PlayerId }[]
): Tile[][] {
  if (attacks.length === 0) return grid;

  // Clone grid for immutability
  const newGrid = grid.map(row => row.map(tile => ({ ...tile, building: { ...tile.building } })));

  for (const attack of attacks) {
    const tile = newGrid[attack.y]?.[attack.x];
    if (!tile) continue;

    // Check if building belongs to a different player
    if (tile.owner === attack.attacker) continue;

    // Set building on fire if not already
    if (!tile.building.onFire && tile.building.type !== 'grass' && tile.building.type !== 'water') {
      tile.building.onFire = true;
      tile.building.fireProgress = 0;
    }

    // Accelerate fire progress based on damage
    if (tile.building.onFire) {
      tile.building.fireProgress += attack.damage * 0.5;
    }
  }

  return newGrid;
}

/**
 * Get units in a selection rectangle
 */
export function getUnitsInRect(
  units: MilitaryUnit[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  playerId: PlayerId
): MilitaryUnit[] {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);

  return units.filter(unit => 
    unit.owner === playerId &&
    unit.x >= minX && unit.x <= maxX &&
    unit.y >= minY && unit.y <= maxY
  );
}

/**
 * Select/deselect units
 */
export function selectUnits(
  units: MilitaryUnit[],
  selectedIds: number[]
): MilitaryUnit[] {
  return units.map(unit => ({
    ...unit,
    selected: selectedIds.includes(unit.id),
  }));
}

/**
 * Command selected units to move or attack
 */
export function commandUnits(
  units: MilitaryUnit[],
  targetX: number,
  targetY: number,
  isAttack: boolean,
  playerId: PlayerId
): MilitaryUnit[] {
  const selectedUnits = units.filter(u => u.selected && u.owner === playerId);
  
  if (selectedUnits.length === 0) return units;

  // Formation offset calculation for multiple units
  const formationSpacing = 1.2; // Tiles between units
  const unitsPerRow = Math.ceil(Math.sqrt(selectedUnits.length));

  return units.map((unit, index) => {
    if (!unit.selected || unit.owner !== playerId) return unit;

    // Calculate formation offset
    const selectedIndex = selectedUnits.findIndex(u => u.id === unit.id);
    const row = Math.floor(selectedIndex / unitsPerRow);
    const col = selectedIndex % unitsPerRow;
    const offsetX = (col - (unitsPerRow - 1) / 2) * formationSpacing;
    const offsetY = (row - (Math.ceil(selectedUnits.length / unitsPerRow) - 1) / 2) * formationSpacing;

    if (isAttack) {
      return {
        ...unit,
        attackTargetX: targetX,
        attackTargetY: targetY,
        targetX: null,
        targetY: null,
      };
    } else {
      return {
        ...unit,
        targetX: targetX + offsetX,
        targetY: targetY + offsetY,
        attackTargetX: null,
        attackTargetY: null,
      };
    }
  });
}

/**
 * Draw military units on canvas
 */
export function drawMilitaryUnits(
  ctx: CanvasRenderingContext2D,
  units: MilitaryUnit[],
  offset: { x: number; y: number },
  zoom: number,
  playerId: PlayerId
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.scale(dpr * zoom, dpr * zoom);
  ctx.translate(offset.x / zoom, offset.y / zoom);

  for (const unit of units) {
    const { screenX, screenY } = gridToScreen(Math.floor(unit.x), Math.floor(unit.y), 0, 0);
    
    // Add fractional offset for smooth movement
    const fracX = unit.x - Math.floor(unit.x);
    const fracY = unit.y - Math.floor(unit.y);
    const unitScreenX = screenX + (fracX - fracY) * (TILE_WIDTH / 2);
    const unitScreenY = screenY + (fracX + fracY) * (TILE_HEIGHT / 2);

    const centerX = unitScreenX + TILE_WIDTH / 2;
    const centerY = unitScreenY + TILE_HEIGHT / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Draw selection circle
    if (unit.selected) {
      ctx.beginPath();
      ctx.arc(0, 8, 16, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 8, 15, 0, Math.PI * 2);
      ctx.strokeStyle = PLAYER_COLORS[unit.owner];
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw unit based on type
    const color = PLAYER_COLORS[unit.owner];
    
    switch (unit.type) {
      case 'infantry':
        drawInfantry(ctx, unit, color);
        break;
      case 'tank':
        drawTank(ctx, unit, color);
        break;
      case 'military_helicopter':
        drawMilitaryHelicopter(ctx, unit, color);
        break;
    }

    // Draw health bar
    if (unit.health < unit.maxHealth) {
      const barWidth = 20;
      const barHeight = 3;
      const healthPercent = unit.health / unit.maxHealth;
      
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(-barWidth / 2, -20, barWidth, barHeight);
      
      ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(-barWidth / 2, -20, barWidth * healthPercent, barHeight);
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawInfantry(ctx: CanvasRenderingContext2D, unit: MilitaryUnit, color: string): void {
  const walkOffset = Math.sin(unit.animationTimer) * 2;
  
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(0, -8 + walkOffset * 0.2, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.arc(0, -9 + walkOffset * 0.2, 4, Math.PI, Math.PI * 2);
  ctx.fill();
  
  // Legs (animated)
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-2, 6);
  ctx.lineTo(-2 + walkOffset, 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, 6);
  ctx.lineTo(2 - walkOffset, 12);
  ctx.stroke();
}

function drawTank(ctx: CanvasRenderingContext2D, unit: MilitaryUnit, color: string): void {
  ctx.save();
  ctx.rotate(unit.direction - Math.PI / 4);
  
  // Tracks
  ctx.fillStyle = '#374151';
  ctx.fillRect(-12, -8, 24, 6);
  ctx.fillRect(-12, 2, 24, 6);
  
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(-10, -6, 20, 12);
  
  // Turret
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Barrel
  ctx.fillStyle = '#374151';
  ctx.fillRect(4, -2, 14, 4);
  
  ctx.restore();
}

function drawMilitaryHelicopter(ctx: CanvasRenderingContext2D, unit: MilitaryUnit, color: string): void {
  const rotorAngle = unit.animationTimer * 10;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 15, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.save();
  ctx.translate(0, -10); // Helicopters float above ground
  
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail
  ctx.fillStyle = color;
  ctx.fillRect(-2, 5, 4, 10);
  
  // Tail rotor
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, 14);
  ctx.lineTo(4, 14);
  ctx.stroke();
  
  // Main rotor
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 2;
  ctx.save();
  ctx.rotate(rotorAngle);
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.restore();
  
  // Cockpit
  ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
  ctx.beginPath();
  ctx.ellipse(4, -2, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Draw fog of war overlay
 */
export function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  grid: Tile[][],
  gridSize: number,
  offset: { x: number; y: number },
  zoom: number,
  playerId: PlayerId
): void {
  const dpr = window.devicePixelRatio || 1;
  
  ctx.save();
  ctx.scale(dpr * zoom, dpr * zoom);
  ctx.translate(offset.x / zoom, offset.y / zoom);
  
  // Draw fog over unexplored tiles
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const tile = grid[y][x];
      const isExplored = tile.explored?.[playerId] ?? false;
      
      if (!isExplored) {
        const { screenX, screenY } = gridToScreen(x, y, 0, 0);
        
        // Draw fog as dark diamond shape
        ctx.fillStyle = 'rgba(10, 15, 30, 0.95)';
        ctx.beginPath();
        ctx.moveTo(screenX + TILE_WIDTH / 2, screenY);
        ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
        ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
        ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  
  ctx.restore();
}

/**
 * Draw player territory borders
 */
export function drawTerritoryBorders(
  ctx: CanvasRenderingContext2D,
  grid: Tile[][],
  gridSize: number,
  offset: { x: number; y: number },
  zoom: number,
  playerId: PlayerId
): void {
  const dpr = window.devicePixelRatio || 1;
  
  ctx.save();
  ctx.scale(dpr * zoom, dpr * zoom);
  ctx.translate(offset.x / zoom, offset.y / zoom);
  
  // Draw colored overlay for owned tiles
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const tile = grid[y][x];
      const owner = tile.owner;
      
      if (owner !== undefined) {
        const { screenX, screenY } = gridToScreen(x, y, 0, 0);
        const color = PLAYER_COLORS[owner];
        
        // Draw subtle colored border for territory
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(screenX + TILE_WIDTH / 2, screenY);
        ctx.lineTo(screenX + TILE_WIDTH, screenY + TILE_HEIGHT / 2);
        ctx.lineTo(screenX + TILE_WIDTH / 2, screenY + TILE_HEIGHT);
        ctx.lineTo(screenX, screenY + TILE_HEIGHT / 2);
        ctx.closePath();
        ctx.stroke();
        
        // Fill with very subtle color
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.05;
        ctx.fill();
      }
    }
  }
  
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draw selection rectangle
 */
export function drawSelectionRect(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  offset: { x: number; y: number },
  zoom: number
): void {
  const dpr = window.devicePixelRatio || 1;
  
  ctx.save();
  ctx.scale(dpr * zoom, dpr * zoom);
  ctx.translate(offset.x / zoom, offset.y / zoom);
  
  // Convert grid coordinates to screen coordinates
  const start = gridToScreen(startX, startY, 0, 0);
  const end = gridToScreen(endX, endY, 0, 0);
  
  const x = Math.min(start.screenX, end.screenX) + TILE_WIDTH / 2;
  const y = Math.min(start.screenY, end.screenY) + TILE_HEIGHT / 2;
  const width = Math.abs(end.screenX - start.screenX);
  const height = Math.abs(end.screenY - start.screenY);
  
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x, y, width, height);
  
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  ctx.fillRect(x, y, width, height);
  
  ctx.restore();
}
