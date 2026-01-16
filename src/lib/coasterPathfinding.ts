import { GridPosition } from '@/core/types';
import { CoasterTile } from '@/games/coaster/types';

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

function key(pos: GridPosition) {
  return `${pos.x},${pos.y}`;
}

export function findPath(
  start: GridPosition,
  end: GridPosition,
  grid: CoasterTile[][]
): GridPosition[] | null {
  const startTile = grid[start.y]?.[start.x];
  const endTile = grid[end.y]?.[end.x];
  if (!startTile?.path || !endTile) {
    return null;
  }
  const endWalkable = Boolean(endTile.path || endTile.rideId || endTile.building);
  if (!endWalkable) {
    return null;
  }

  const queue: GridPosition[] = [start];
  const cameFrom = new Map<string, GridPosition | null>();
  cameFrom.set(key(start), null);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.x === end.x && current.y === end.y) {
      const path: GridPosition[] = [];
      let step: GridPosition | null = current;
      while (step) {
        path.unshift(step);
        step = cameFrom.get(key(step)) ?? null;
      }
      return path;
    }

    for (const dir of DIRECTIONS) {
      const next = { x: current.x + dir.dx, y: current.y + dir.dy };
      const isEnd = next.x === end.x && next.y === end.y;
      if (!grid[next.y]?.[next.x]?.path && !isEnd) continue;
      const nextKey = key(next);
      if (cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, current);
      queue.push(next);
    }
  }

  return null;
}
