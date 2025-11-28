import { Car, WorldRenderState } from '../types';
import { TILE_WIDTH, TILE_HEIGHT, DIRECTION_META } from '../constants';
import { gridToScreen } from '../utils';
import { BuildingType } from '@/types/game';

export function drawCars(
  ctx: CanvasRenderingContext2D,
  cars: Car[],
  worldState: WorldRenderState
) {
  const { offset: currentOffset, zoom: currentZoom, grid: currentGrid, gridSize: currentGridSize } = worldState;
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Early exit if no grid data
  if (!currentGrid || currentGridSize <= 0 || cars.length === 0) {
    return;
  }
  
  ctx.save();
  ctx.scale(dpr * currentZoom, dpr * currentZoom);
  ctx.translate(currentOffset.x / currentZoom, currentOffset.y / currentZoom);
  
  const viewWidth = canvas.width / (dpr * currentZoom);
  const viewHeight = canvas.height / (dpr * currentZoom);
  const viewLeft = -currentOffset.x / currentZoom - TILE_WIDTH;
  const viewTop = -currentOffset.y / currentZoom - TILE_HEIGHT * 2;
  const viewRight = viewWidth - currentOffset.x / currentZoom + TILE_WIDTH;
  const viewBottom = viewHeight - currentOffset.y / currentZoom + TILE_HEIGHT * 2;
  
  // Helper function to check if a car is behind a building
  const isCarBehindBuilding = (carTileX: number, carTileY: number): boolean => {
    // Only check tiles directly in front (higher depth means drawn later/on top)
    const carDepth = carTileX + carTileY;
    
    // Check a small area - just tiles that could visually cover the car
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip the car's own tile
        
        const checkX = carTileX + dx;
        const checkY = carTileY + dy;
        
        // Skip if out of bounds
        if (checkX < 0 || checkY < 0 || checkX >= currentGridSize || checkY >= currentGridSize) {
          continue;
        }
        
        const tile = currentGrid[checkY]?.[checkX];
        if (!tile) continue;
        
        const buildingType = tile.building.type;
        
        // Skip roads, grass, empty, water, and trees (these don't hide cars)
        const skipTypes: BuildingType[] = ['road', 'grass', 'empty', 'water', 'tree'];
        if (skipTypes.includes(buildingType)) {
          continue;
        }
        
        // Check if this building tile has higher depth (drawn after/on top)
        const buildingDepth = checkX + checkY;
        
        // Only hide if building is strictly in front (higher depth)
        if (buildingDepth > carDepth) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  cars.forEach(car => {
    const { screenX, screenY } = gridToScreen(car.tileX, car.tileY, 0, 0);
    const centerX = screenX + TILE_WIDTH / 2;
    const centerY = screenY + TILE_HEIGHT / 2;
    const meta = DIRECTION_META[car.direction];
    const carX = centerX + meta.vec.dx * car.progress + meta.normal.nx * car.laneOffset;
    const carY = centerY + meta.vec.dy * car.progress + meta.normal.ny * car.laneOffset;
    
    if (carX < viewLeft - 40 || carX > viewRight + 40 || carY < viewTop - 60 || carY > viewBottom + 60) {
      return;
    }
    
    // Check if car is behind a building - if so, skip drawing
    if (isCarBehindBuilding(car.tileX, car.tileY)) {
      return;
    }
    
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(meta.angle);
    
    // Scale down by 30% (multiply by 0.7)
    const scale = 0.7;
    
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.moveTo(-10 * scale, -5 * scale);
    ctx.lineTo(10 * scale, -5 * scale);
    ctx.lineTo(12 * scale, 0);
    ctx.lineTo(10 * scale, 5 * scale);
    ctx.lineTo(-10 * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Windshield
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(-4 * scale, -2.8 * scale, 7 * scale, 5.6 * scale);
    
    // Rear
    ctx.fillStyle = '#111827';
    ctx.fillRect(-10 * scale, -4 * scale, 2.4 * scale, 8 * scale);
    
    ctx.restore();
  });
  
  ctx.restore();
}
