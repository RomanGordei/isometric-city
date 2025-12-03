import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

const GAME_IMAGES = [
  'IMG_6902.PNG',
  'IMG_6903.PNG',
  'IMG_6904.PNG',
  'IMG_6906.PNG',
  'IMG_6907.PNG',
  'IMG_6908.PNG',
  'IMG_6909.PNG',
  'IMG_6910.PNG',
  'IMG_6911.PNG',
];

const FALLBACK_IMAGE = 'og-image.png';
const imageCache = new Map<string, Buffer>();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const randomFile = GAME_IMAGES[Math.floor(Math.random() * GAME_IMAGES.length)];

  try {
    const buffer = await loadImage(`games/${randomFile}`);
    return buildImageResponse(buffer);
  } catch (error) {
    console.error('Failed to load OG image, falling back to default image.', error);

    try {
      const fallbackBuffer = await loadImage(FALLBACK_IMAGE);
      return buildImageResponse(fallbackBuffer);
    } catch {
      return new NextResponse('Unable to load Open Graph image.', { status: 500 });
    }
  }
}

async function loadImage(relativePath: string) {
  const cached = imageCache.get(relativePath);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), 'public', relativePath);
  const buffer = await fs.readFile(filePath);
  imageCache.set(relativePath, buffer);
  return buffer;
}

function buildImageResponse(buffer: Buffer) {
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
