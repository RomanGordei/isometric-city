import { EmergencyVehicle, WorldRenderState } from '../types';
import { TILE_WIDTH, TILE_HEIGHT, DIRECTION_META } from '../constants';
import { gridToScreen } from '../utils';

export function drawEmergencyVehicles(
  ctx: CanvasRenderingContext2D,
  vehicles: EmergencyVehicle[],
  worldState: WorldRenderState
) {
  const { offset: currentOffset, zoom: currentZoom, grid: currentGrid, gridSize: currentGridSize } = worldState;
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  
  // Early exit if no emergency vehicles
  if (!currentGrid || currentGridSize <= 0 || vehicles.length === 0) {
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
  
  // Helper function to check if a vehicle is behind a building
  const isVehicleBehindBuilding = (tileX: number, tileY: number): boolean => {
    const vehicleDepth = tileX + tileY;
    
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const checkX = tileX + dx;
        const checkY = tileY + dy;
        
        if (checkX < 0 || checkY < 0 || checkX >= currentGridSize || checkY >= currentGridSize) {
          continue;
        }
        
        const tile = currentGrid[checkY]?.[checkX];
        if (!tile) continue;
        
        const buildingType = tile.building.type;
        const skipTypes: string[] = ['road', 'grass', 'empty', 'water', 'tree'];
        if (skipTypes.includes(buildingType)) {
          continue;
        }
        
        const buildingDepth = checkX + checkY;
        if (buildingDepth > vehicleDepth) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  vehicles.forEach(vehicle => {
    const { screenX, screenY } = gridToScreen(vehicle.tileX, vehicle.tileY, 0, 0);
    const centerX = screenX + TILE_WIDTH / 2;
    const centerY = screenY + TILE_HEIGHT / 2;
    const meta = DIRECTION_META[vehicle.direction];
    const vehicleX = centerX + meta.vec.dx * vehicle.progress + meta.normal.nx * vehicle.laneOffset;
    const vehicleY = centerY + meta.vec.dy * vehicle.progress + meta.normal.ny * vehicle.laneOffset;
    
    // View culling
    if (vehicleX < viewLeft - 40 || vehicleX > viewRight + 40 || vehicleY < viewTop - 60 || vehicleY > viewBottom + 60) {
      return;
    }
    
    ctx.save();
    ctx.translate(vehicleX, vehicleY);
    ctx.rotate(meta.angle);
    
    const scale = 0.6; // Smaller emergency vehicles
    
    // Vehicle body color
    const bodyColor = vehicle.type === 'fire_truck' ? '#dc2626' : '#1e40af';
    
    // Draw vehicle body (longer for fire trucks)
    const length = vehicle.type === 'fire_truck' ? 14 : 11;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-length * scale, -5 * scale);
    ctx.lineTo(length * scale, -5 * scale);
    ctx.lineTo((length + 2) * scale, 0);
    ctx.lineTo(length * scale, 5 * scale);
    ctx.lineTo(-length * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Draw stripe/accent
    ctx.fillStyle = vehicle.type === 'fire_truck' ? '#fbbf24' : '#ffffff';
    ctx.fillRect(-length * scale * 0.5, -3 * scale, length * scale, 6 * scale * 0.3);
    
    // Draw windshield
    ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
    ctx.fillRect(-2 * scale, -3 * scale, 5 * scale, 6 * scale);
    
    // Draw emergency lights (flashing)
    const flashOn = Math.sin(vehicle.flashTimer) > 0;
    const flashOn2 = Math.sin(vehicle.flashTimer + Math.PI) > 0;
    
    // Light bar on top
    if (vehicle.type === 'fire_truck') {
      // Fire truck has red lights
      ctx.fillStyle = flashOn ? '#ff0000' : '#880000';
      ctx.fillRect(-6 * scale, -7 * scale, 3 * scale, 3 * scale);
      ctx.fillStyle = flashOn2 ? '#ff0000' : '#880000';
      ctx.fillRect(3 * scale, -7 * scale, 3 * scale, 3 * scale);
      
      // Glow effect
      if (flashOn || flashOn2) {
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(-8 * scale, -8 * scale, 16 * scale, 4 * scale);
        ctx.shadowBlur = 0;
      }
    } else {
      // Police car has red and blue lights
      ctx.fillStyle = flashOn ? '#ff0000' : '#880000';
      ctx.fillRect(-5 * scale, -7 * scale, 3 * scale, 3 * scale);
      ctx.fillStyle = flashOn2 ? '#0066ff' : '#003388';
      ctx.fillRect(2 * scale, -7 * scale, 3 * scale, 3 * scale);
      
      // Glow effect
      if (flashOn || flashOn2) {
        ctx.shadowColor = flashOn ? '#ff0000' : '#0066ff';
        ctx.shadowBlur = 6;
        ctx.fillStyle = flashOn ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 100, 255, 0.4)';
        ctx.fillRect(-7 * scale, -8 * scale, 14 * scale, 4 * scale);
        ctx.shadowBlur = 0;
      }
    }
    
    // Draw rear wheels/details
    ctx.fillStyle = '#111827';
    ctx.fillRect(-length * scale, -4 * scale, 2 * scale, 8 * scale);
    
    ctx.restore();
  });
  
  ctx.restore();
}
