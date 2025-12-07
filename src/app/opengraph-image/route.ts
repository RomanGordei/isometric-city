import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Use a fixed image for static generation
const DEFAULT_IMAGE = 'IMG_6902.PNG';

export async function GET() {
  try {
    // Serve the default image for static generation
    const imagePath = path.join(process.cwd(), 'public', 'games', DEFAULT_IMAGE);
    const imageBuffer = await readFile(imagePath);
    
    // Return the image directly with proper headers for social media crawlers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error serving OG image:', error);
    
    // Fallback to the static og-image.png
    try {
      const fallbackPath = path.join(process.cwd(), 'public', 'og-image.png');
      const fallbackBuffer = await readFile(fallbackPath);
      
      return new NextResponse(fallbackBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': fallbackBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    } catch {
      return new NextResponse('Image not found', { status: 404 });
    }
  }
}
