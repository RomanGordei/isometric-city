import { Tile, createEmptyBuilding } from '@/games/coaster/types';

function noise2D(x: number, y: number, seed: number = 42): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const corners =
    (noise2D(x - 1, y - 1, seed) +
      noise2D(x + 1, y - 1, seed) +
      noise2D(x - 1, y + 1, seed) +
      noise2D(x + 1, y + 1, seed)) /
    16;
  const sides =
    (noise2D(x - 1, y, seed) +
      noise2D(x + 1, y, seed) +
      noise2D(x, y - 1, seed) +
      noise2D(x, y + 1, seed)) /
    8;
  const center = noise2D(x, y, seed) / 4;
  return corners + sides + center;
}

function interpolatedNoise(x: number, y: number, seed: number): number {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const intY = Math.floor(y);
  const fracY = y - intY;

  const v1 = smoothNoise(intX, intY, seed);
  const v2 = smoothNoise(intX + 1, intY, seed);
  const v3 = smoothNoise(intX, intY + 1, seed);
  const v4 = smoothNoise(intX + 1, intY + 1, seed);

  const i1 = v1 * (1 - fracX) + v2 * fracX;
  const i2 = v3 * (1 - fracX) + v4 * fracX;

  return i1 * (1 - fracY) + i2 * fracY;
}

function perlinNoise(x: number, y: number, seed: number, octaves: number = 4): number {
  let total = 0;
  let frequency = 0.05;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += interpolatedNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / maxValue;
}

export function generateParkLakes(grid: Tile[][], size: number, seed: number): void {
  const lakeNoise = (x: number, y: number) => perlinNoise(x, y, seed + 1000, 3);
  const minDistFromEdge = Math.max(6, Math.floor(size * 0.12));
  const minDistBetweenLakes = Math.max(12, Math.floor(size * 0.25));

  const lakeCenters: { x: number; y: number; noise: number }[] = [];
  let threshold = 0.48;
  let attempts = 0;
  const maxAttempts = 3;

  while (lakeCenters.length < 2 && attempts < maxAttempts) {
    lakeCenters.length = 0;

    for (let y = minDistFromEdge; y < size - minDistFromEdge; y++) {
      for (let x = minDistFromEdge; x < size - minDistFromEdge; x++) {
        const noiseVal = lakeNoise(x, y);
        if (noiseVal < threshold) {
          let tooClose = false;
          for (const center of lakeCenters) {
            const dist = Math.hypot(x - center.x, y - center.y);
            if (dist < minDistBetweenLakes) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) {
            lakeCenters.push({ x, y, noise: noiseVal });
          }
        }
      }
    }

    if (lakeCenters.length >= 2) break;
    threshold += 0.1;
    attempts++;
  }

  if (lakeCenters.length === 0) {
    const safeZone = minDistFromEdge + 4;
    const quarter = Math.max(safeZone, Math.floor(size / 4));
    const threeQuarter = Math.min(size - safeZone, Math.floor((size * 3) / 4));
    lakeCenters.push(
      { x: quarter, y: quarter, noise: 0 },
      { x: threeQuarter, y: threeQuarter, noise: 0 }
    );
  } else if (lakeCenters.length === 1) {
    const existing = lakeCenters[0];
    const safeZone = minDistFromEdge + 4;
    const quarter = Math.max(safeZone, Math.floor(size / 4));
    const threeQuarter = Math.min(size - safeZone, Math.floor((size * 3) / 4));
    const newX = existing.x > size / 2 ? quarter : threeQuarter;
    const newY = existing.y > size / 2 ? quarter : threeQuarter;
    lakeCenters.push({ x: newX, y: newY, noise: 0 });
  }

  lakeCenters.sort((a, b) => a.noise - b.noise);
  const numLakes = 2 + Math.floor(Math.random() * 2);
  const selectedCenters = lakeCenters.slice(0, Math.min(numLakes, lakeCenters.length));

  for (const center of selectedCenters) {
    const targetSize = 30 + Math.floor(Math.random() * 31);
    const lakeTiles: { x: number; y: number }[] = [{ x: center.x, y: center.y }];
    const candidates: { x: number; y: number; dist: number; noise: number }[] = [];

    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    for (const [dx, dy] of directions) {
      const nx = center.x + dx;
      const ny = center.y + dy;
      if (nx >= minDistFromEdge && nx < size - minDistFromEdge &&
          ny >= minDistFromEdge && ny < size - minDistFromEdge) {
        candidates.push({
          x: nx,
          y: ny,
          dist: Math.hypot(dx, dy),
          noise: lakeNoise(nx, ny),
        });
      }
    }

    while (lakeTiles.length < targetSize && candidates.length > 0) {
      candidates.sort((a, b) => {
        if (Math.abs(a.dist - b.dist) < 0.5) {
          return a.noise - b.noise;
        }
        return a.dist - b.dist;
      });

      const pickIndex = Math.floor(Math.random() * Math.min(5, candidates.length));
      const picked = candidates.splice(pickIndex, 1)[0];

      if (lakeTiles.some(t => t.x === picked.x && t.y === picked.y)) continue;
      if (grid[picked.y]?.[picked.x]?.terrain === 'water') continue;

      lakeTiles.push({ x: picked.x, y: picked.y });

      for (const [dx, dy] of directions) {
        const nx = picked.x + dx;
        const ny = picked.y + dy;
        if (nx >= minDistFromEdge && nx < size - minDistFromEdge &&
            ny >= minDistFromEdge && ny < size - minDistFromEdge &&
            !lakeTiles.some(t => t.x === nx && t.y === ny) &&
            !candidates.some(c => c.x === nx && c.y === ny)) {
          candidates.push({
            x: nx,
            y: ny,
            dist: Math.hypot(nx - center.x, ny - center.y),
            noise: lakeNoise(nx, ny),
          });
        }
      }
    }

    for (const tile of lakeTiles) {
      const target = grid[tile.y]?.[tile.x];
      if (!target) continue;
      target.terrain = 'water';
      target.building = { ...createEmptyBuilding(), type: 'water' };
    }
  }
}
