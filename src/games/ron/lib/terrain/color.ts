import { clamp01 } from './seededRandom';

export type RGB = { r: number; g: number; b: number };

export function rgb(r: number, g: number, b: number): RGB {
  return { r, g, b };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

export function rgbToCss(c: RGB, a: number = 1): string {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  if (a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${clamp01(a)})`;
}

export function mulRgb(c: RGB, m: number): RGB {
  return { r: c.r * m, g: c.g * m, b: c.b * m };
}

export function addRgb(c: RGB, a: RGB): RGB {
  return { r: c.r + a.r, g: c.g + a.g, b: c.b + a.b };
}

export function clampRgb(c: RGB): RGB {
  return {
    r: Math.max(0, Math.min(255, c.r)),
    g: Math.max(0, Math.min(255, c.g)),
    b: Math.max(0, Math.min(255, c.b)),
  };
}

// Basic (sRGB-ish) luma for shading decisions.
export function luma(c: RGB): number {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

