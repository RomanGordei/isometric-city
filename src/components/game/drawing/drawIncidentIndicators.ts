import { WorldRenderState } from '../types';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants';
import { gridToScreen } from '../utils';
import { Tile } from '@/types/game';

export function drawIncidentIndicators(
  ctx: CanvasRenderingContext2D,
  delta: number,
  animTime: number,
  worldState: WorldRenderState,
  activeCrimeIncidents: Map<string, { x: number; y: number; type: 'robbery' | 'burglary' | 'disturbance' | 'traffic'; timeRemaining: number }>
) {
  const { offset: currentOffset, zoom: currentZoom, grid: currentGrid, gridSize: currentGridSize } = worldState;
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  
  if (!currentGrid || currentGridSize <= 0) return;
  
  ctx.save();
  ctx.scale(dpr * currentZoom, dpr * currentZoom);
  ctx.translate(currentOffset.x / currentZoom, currentOffset.y / currentZoom);
  
  const viewWidth = canvas.width / (dpr * currentZoom);
  const viewHeight = canvas.height / (dpr * currentZoom);
  const viewLeft = -currentOffset.x / currentZoom - TILE_WIDTH * 2;
  const viewTop = -currentOffset.y / currentZoom - TILE_HEIGHT * 4;
  const viewRight = viewWidth - currentOffset.x / currentZoom + TILE_WIDTH * 2;
  const viewBottom = viewHeight - currentOffset.y / currentZoom + TILE_HEIGHT * 4;
  
  // Draw crime incident indicators
  activeCrimeIncidents.forEach((crime) => {
    const { screenX, screenY } = gridToScreen(crime.x, crime.y, 0, 0);
    const centerX = screenX + TILE_WIDTH / 2;
    const centerY = screenY + TILE_HEIGHT / 2;
    
    // View culling
    if (centerX < viewLeft || centerX > viewRight || centerY < viewTop || centerY > viewBottom) {
      return;
    }
    
    // Pulsing effect
    const pulse = Math.sin(animTime * 4) * 0.3 + 0.7;
    const outerPulse = Math.sin(animTime * 3) * 0.5 + 0.5;
    
    // Outer glow ring (expanding pulse) - smaller
    ctx.beginPath();
    ctx.arc(centerX, centerY - 8, 18 + outerPulse * 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(59, 130, 246, ${0.25 * (1 - outerPulse)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner pulsing glow (smaller)
    const gradient = ctx.createRadialGradient(centerX, centerY - 8, 0, centerX, centerY - 8, 14 * pulse);
    gradient.addColorStop(0, `rgba(59, 130, 246, ${0.5 * pulse})`);
    gradient.addColorStop(0.5, `rgba(59, 130, 246, ${0.2 * pulse})`);
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.beginPath();
    ctx.arc(centerX, centerY - 8, 14 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Crime icon (small shield with exclamation)
    ctx.save();
    ctx.translate(centerX, centerY - 12);
    
    // Shield background (smaller)
    ctx.fillStyle = `rgba(30, 64, 175, ${0.9 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, -4);
    ctx.lineTo(6, 2);
    ctx.quadraticCurveTo(0, 8, 0, 8);
    ctx.quadraticCurveTo(0, 8, -6, 2);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    
    // Shield border
    ctx.strokeStyle = `rgba(147, 197, 253, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Exclamation mark (smaller)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -4, 2, 5);
    ctx.beginPath();
    ctx.arc(0, 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });
  
  // Draw fire indicators (for tiles on fire without visual fire effect already)
  for (let y = 0; y < currentGridSize; y++) {
    for (let x = 0; x < currentGridSize; x++) {
      const tile = currentGrid[y][x];
      if (!tile.building.onFire) continue;
      
      const { screenX, screenY } = gridToScreen(x, y, 0, 0);
      const centerX = screenX + TILE_WIDTH / 2;
      const centerY = screenY + TILE_HEIGHT / 2;
      
      // View culling
      if (centerX < viewLeft || centerX > viewRight || centerY < viewTop || centerY > viewBottom) {
        continue;
      }
      
      // Pulsing effect for fire (faster)
      const pulse = Math.sin(animTime * 6) * 0.3 + 0.7;
      const outerPulse = Math.sin(animTime * 4) * 0.5 + 0.5;
      
      // Outer glow ring (expanding pulse) - red/orange
      ctx.beginPath();
      ctx.arc(centerX, centerY - 12, 22 + outerPulse * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 * (1 - outerPulse)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Inner danger icon (smaller)
      ctx.save();
      ctx.translate(centerX, centerY - 15);
      
      // Warning triangle background (smaller)
      ctx.fillStyle = `rgba(220, 38, 38, ${0.9 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 5);
      ctx.lineTo(-8, 5);
      ctx.closePath();
      ctx.fill();
      
      // Triangle border
      ctx.strokeStyle = `rgba(252, 165, 165, ${pulse})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Fire flame icon inside (smaller)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(2.5, 0, 2, 2.5);
      ctx.quadraticCurveTo(0.5, 1.5, 0, 2.5);
      ctx.quadraticCurveTo(-0.5, 1.5, -2, 2.5);
      ctx.quadraticCurveTo(-2.5, 0, 0, -3);
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  ctx.restore();
}
