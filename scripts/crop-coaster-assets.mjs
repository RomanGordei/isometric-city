#!/usr/bin/env node
/**
 * Crop Coaster Assets Script
 * 
 * Removes thin border lines (1-2px) from coaster sprite sheets that have
 * incorrect cropping artifacts around their edges.
 * 
 * Affected assets identified through visual review:
 * - food.png (1px border on all sides)
 * - infrastructure.png (1-2px border on all sides)
 * - path_furniture.png (1px border on all sides)
 * - rides_small.png (1-2px border on all sides)
 * - stations.png (1px border on top and left)
 * - theme_classic.png (1-2px border on all sides)
 * - theme_modern.png (1-2px border on all sides)
 * - trees.png (1-2px border on all sides)
 * 
 * Usage: node scripts/crop-coaster-assets.mjs
 */

import sharp from 'sharp';
import { stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const COASTER_DIR = path.join(ROOT_DIR, 'public', 'assets', 'coaster');

// WebP compression quality (matching compress-images.mjs)
const WEBP_QUALITY = 80;

// Assets that need cropping and their crop amounts (left, top, right, bottom)
// Based on visual review findings
const ASSETS_TO_CROP = {
  'food.png': { left: 1, top: 1, right: 1, bottom: 1 },
  'infrastructure.png': { left: 1, top: 1, right: 1, bottom: 1 },
  'path_furniture.png': { left: 1, top: 1, right: 1, bottom: 1 },
  'rides_small.png': { left: 1, top: 1, right: 1, bottom: 1 },
  'stations.png': { left: 1, top: 1, right: 0, bottom: 0 },
  'theme_classic.png': { left: 1, top: 1, right: 1, bottom: 1 },
  'theme_modern.png': { left: 1, top: 1, right: 1, bottom: 1 },
  'trees.png': { left: 1, top: 1, right: 1, bottom: 1 },
};

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Crop a PNG file and regenerate its WebP version
 */
async function cropAsset(filename, crop) {
  const pngPath = path.join(COASTER_DIR, filename);
  const webpPath = pngPath.replace(/\.png$/, '.webp');
  
  if (!existsSync(pngPath)) {
    console.log(`❌ File not found: ${filename}`);
    return { error: true, filename };
  }
  
  try {
    // Get original image metadata
    const metadata = await sharp(pngPath).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    
    // Calculate new dimensions after crop
    const newWidth = originalWidth - crop.left - crop.right;
    const newHeight = originalHeight - crop.top - crop.bottom;
    
    console.log(`\n📐 ${filename}`);
    console.log(`   Original: ${originalWidth}x${originalHeight}`);
    console.log(`   Crop: left=${crop.left}, top=${crop.top}, right=${crop.right}, bottom=${crop.bottom}`);
    console.log(`   New: ${newWidth}x${newHeight}`);
    
    // Read the original image into a buffer
    const imageBuffer = await sharp(pngPath)
      .extract({
        left: crop.left,
        top: crop.top,
        width: newWidth,
        height: newHeight
      })
      .png()
      .toBuffer();
    
    // Get original file size
    const originalPngStats = await stat(pngPath);
    const originalPngSize = originalPngStats.size;
    
    // Write cropped PNG
    await sharp(imageBuffer).png().toFile(pngPath);
    
    // Get new PNG file size
    const newPngStats = await stat(pngPath);
    const newPngSize = newPngStats.size;
    
    console.log(`   PNG: ${formatBytes(originalPngSize)} → ${formatBytes(newPngSize)}`);
    
    // Regenerate WebP
    await sharp(pngPath)
      .webp({ quality: WEBP_QUALITY, lossless: false })
      .toFile(webpPath);
    
    const webpStats = await stat(webpPath);
    console.log(`   WebP: ${formatBytes(webpStats.size)}`);
    
    return {
      success: true,
      filename,
      originalDimensions: { width: originalWidth, height: originalHeight },
      newDimensions: { width: newWidth, height: newHeight }
    };
  } catch (error) {
    console.log(`❌ Error processing ${filename}: ${error.message}`);
    return { error: true, filename, message: error.message };
  }
}

async function main() {
  console.log('🎢 Coaster Asset Cropping Script');
  console.log('================================');
  console.log(`📁 Directory: ${COASTER_DIR}\n`);
  
  if (!existsSync(COASTER_DIR)) {
    console.error(`Coaster assets directory not found: ${COASTER_DIR}`);
    process.exit(1);
  }
  
  const assetNames = Object.keys(ASSETS_TO_CROP);
  console.log(`📄 Assets to crop: ${assetNames.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const [filename, crop] of Object.entries(ASSETS_TO_CROP)) {
    const result = await cropAsset(filename, crop);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log('\n================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully cropped: ${successCount} files`);
  console.log(`   ❌ Errors: ${errorCount} files`);
  console.log('\n✨ Done!');
}

main().catch(console.error);
