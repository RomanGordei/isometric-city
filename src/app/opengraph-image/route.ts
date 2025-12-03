import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Static list of game screenshots
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

export async function GET(request: NextRequest) {
  try {
    // Pick a random image (or use a consistent one for better caching)
    // Using a consistent image for better social media caching
    const imageFile = GAME_IMAGES[0]; // Using first image for consistency
    
    // Read the image file from the public directory
    const imagePath = join(process.cwd(), 'public', 'games', imageFile);
    const imageBuffer = await readFile(imagePath);
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving OG image:', error);
    // Fallback: try to serve the static og-image.png if it exists
    try {
      const fallbackPath = join(process.cwd(), 'public', 'og-image.png');
      const fallbackBuffer = await readFile(fallbackPath);
      return new NextResponse(fallbackBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fallbackError) {
      return new NextResponse('Image not found', { status: 404 });
    }
  }
}
