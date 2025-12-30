import { createNoise2D } from 'simplex-noise';
import { mulberry32 } from './seededRandom';

export type Noise2D = (x: number, y: number) => number;

// Lazily created, seeded deterministic noise for RoN terrain.
let _noise2D: Noise2D | null = null;

function getNoise2D(): Noise2D {
  if (_noise2D) return _noise2D;
  const rand = mulberry32(0x52_4f_4e_31); // "RON1"
  const simplex2 = createNoise2D(rand);
  _noise2D = (x: number, y: number) => simplex2(x, y);
  return _noise2D;
}

/**
 * Fractal Brownian Motion (fBm) using simplex noise.
 * Output is roughly in [-1, 1], with more structure than a single octave.
 */
export function fbm2(x: number, y: number, opts?: { octaves?: number; lacunarity?: number; gain?: number }): number {
  const n2 = getNoise2D();
  const octaves = opts?.octaves ?? 5;
  const lacunarity = opts?.lacunarity ?? 2.0;
  const gain = opts?.gain ?? 0.5;

  let amp = 0.5;
  let freq = 1.0;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * n2(x * freq, y * freq);
    norm += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return norm > 0 ? sum / norm : sum;
}

