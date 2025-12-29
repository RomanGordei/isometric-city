#!/usr/bin/env node
/**
 * Sprite Extraction Script for Rise of Nations
 * 
 * Usage: node scripts/extract-sprite.mjs <building_name> <age>
 * Example: node scripts/extract-sprite.mjs farm classical
 * 
 * Outputs: A PNG image of the extracted sprite to scripts/sprite-output/
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Age sprite pack configuration (matching renderConfig.ts)
const AGE_SPRITE_PACKS = {
  classical: {
    src: 'public/assets/ages/classics.png',
    cols: 5,
    rows: 6,
  },
  medieval: {
    src: 'public/assets/ages/medeival.png',
    cols: 5,
    rows: 6,
  },
  enlightenment: {
    src: 'public/assets/ages/enlightenment.png',
    cols: 5,
    rows: 6,
  },
  industrial: {
    src: 'public/assets/ages/industrial.png',
    cols: 5,
    rows: 6,
  },
  modern: {
    src: 'public/assets/ages/modern.png',
    cols: 5,
    rows: 6,
  },
};

// Building sprite map (matching renderConfig.ts)
const BUILDING_SPRITE_MAP = {
  // City buildings
  city_center: { row: 5, col: 2 },
  small_city: { row: 5, col: 2 },
  large_city: { row: 5, col: 2 },
  major_city: { row: 5, col: 2 },

  // Economic buildings
  farm: { row: 5, col: 0 },
  woodcutters_camp: { row: 3, col: 4 },
  granary: { row: 4, col: 0 },
  lumber_mill: { row: 4, col: 2 },
  mine: { row: 4, col: 2 },
  smelter: { row: 4, col: 3 },
  market: { row: 1, col: 3 },
  oil_well: { row: 4, col: 3 },
  refinery: { row: 4, col: 3 },

  // Knowledge buildings
  library: { row: 0, col: 1 },
  university: { row: 2, col: 0 },
  temple: { row: 5, col: 3 },
  senate: { row: 0, col: 0 },

  // Military buildings
  barracks: { row: 2, col: 0 },
  stable: { row: 3, col: 4 },
  siege_factory: { row: 4, col: 2 },
  dock: { row: 4, col: 4 },
  auto_plant: { row: 4, col: 3 },
  factory: { row: 4, col: 3 },
  airbase: { row: 3, col: 3 },

  // Defensive buildings
  tower: { row: 1, col: 0 },
  fort: { row: 2, col: 2 },
  castle: { row: 0, col: 2 },
  stockade: { row: 1, col: 0 },
  fortress: { row: 2, col: 2 },
  bunker: { row: 2, col: 2 },

  // Entertainment
  amphitheater: { row: 5, col: 4 },

  // Roads
  road: { row: 3, col: 2 },
};

// Building sizes (for multi-tile buildings)
const BUILDING_SIZES = {
  city_center: { width: 3, height: 3 },
  small_city: { width: 3, height: 3 },
  large_city: { width: 3, height: 3 },
  major_city: { width: 3, height: 3 },
  university: { width: 2, height: 2 },
  market: { width: 2, height: 2 },
  library: { width: 2, height: 2 },
  senate: { width: 2, height: 2 },
  barracks: { width: 2, height: 2 },
  stable: { width: 2, height: 2 },
  smelter: { width: 2, height: 2 },
  refinery: { width: 2, height: 2 },
  dock: { width: 2, height: 2 },
  fort: { width: 2, height: 2 },
  fortress: { width: 2, height: 2 },
  castle: { width: 2, height: 2 },
  amphitheater: { width: 2, height: 2 },
};

async function extractSprite(buildingName, age) {
  const pack = AGE_SPRITE_PACKS[age];
  if (!pack) {
    console.error(`Unknown age: ${age}`);
    console.error(`Available ages: ${Object.keys(AGE_SPRITE_PACKS).join(', ')}`);
    process.exit(1);
  }

  const spritePos = BUILDING_SPRITE_MAP[buildingName];
  if (!spritePos) {
    console.error(`Unknown building: ${buildingName}`);
    console.error(`Available buildings: ${Object.keys(BUILDING_SPRITE_MAP).join(', ')}`);
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  const imagePath = path.join(projectRoot, pack.src);

  if (!fs.existsSync(imagePath)) {
    console.error(`Sprite sheet not found: ${imagePath}`);
    process.exit(1);
  }

  console.log(`Loading sprite sheet: ${imagePath}`);
  const image = await loadImage(imagePath);
  
  const tileWidth = Math.floor(image.width / pack.cols);
  const tileHeight = Math.floor(image.height / pack.rows);
  
  console.log(`Sheet dimensions: ${image.width}x${image.height}`);
  console.log(`Tile dimensions: ${tileWidth}x${tileHeight}`);
  console.log(`Extracting position: row=${spritePos.row}, col=${spritePos.col}`);

  // Create canvas for extraction
  const canvas = createCanvas(tileWidth, tileHeight);
  const ctx = canvas.getContext('2d');

  // Extract the sprite
  const sx = spritePos.col * tileWidth;
  const sy = spritePos.row * tileHeight;

  ctx.drawImage(
    image,
    sx, sy, tileWidth, tileHeight,
    0, 0, tileWidth, tileHeight
  );

  // Create output directory
  const outputDir = path.join(projectRoot, 'scripts', 'sprite-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save the sprite
  const outputPath = path.join(outputDir, `${buildingName}_${age}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`\nSprite saved to: ${outputPath}`);
  console.log(`\nSprite Info:`);
  console.log(`  Building: ${buildingName}`);
  console.log(`  Age: ${age}`);
  console.log(`  Source position: (${sx}, ${sy})`);
  console.log(`  Size: ${tileWidth}x${tileHeight}`);
  
  const size = BUILDING_SIZES[buildingName];
  if (size) {
    console.log(`  Building size: ${size.width}x${size.height} tiles`);
  } else {
    console.log(`  Building size: 1x1 tiles`);
  }

  return outputPath;
}

// List all sprites in a grid for an age
async function listAllSprites(age) {
  const pack = AGE_SPRITE_PACKS[age];
  if (!pack) {
    console.error(`Unknown age: ${age}`);
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  const imagePath = path.join(projectRoot, pack.src);
  const image = await loadImage(imagePath);
  
  const tileWidth = Math.floor(image.width / pack.cols);
  const tileHeight = Math.floor(image.height / pack.rows);

  console.log(`\n${age.toUpperCase()} AGE SPRITE GRID (${pack.cols}x${pack.rows}):`);
  console.log(`Tile size: ${tileWidth}x${tileHeight}`);
  console.log(`\nGrid Layout:`);

  // Create a lookup of what's at each position
  const positionLookup = {};
  for (const [building, pos] of Object.entries(BUILDING_SPRITE_MAP)) {
    const key = `${pos.row},${pos.col}`;
    if (!positionLookup[key]) {
      positionLookup[key] = [];
    }
    positionLookup[key].push(building);
  }

  for (let row = 0; row < pack.rows; row++) {
    let rowStr = `Row ${row}: `;
    for (let col = 0; col < pack.cols; col++) {
      const key = `${row},${col}`;
      const buildings = positionLookup[key] || ['(empty)'];
      rowStr += `[${col}:${buildings.join('/')}] `;
    }
    console.log(rowStr);
  }
}

// Extract all buildings for all ages
async function extractAll() {
  const projectRoot = path.resolve(__dirname, '..');
  const outputDir = path.join(projectRoot, 'scripts', 'sprite-output');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = [];
  
  for (const age of Object.keys(AGE_SPRITE_PACKS)) {
    console.log(`\n=== Processing ${age.toUpperCase()} AGE ===`);
    
    for (const building of Object.keys(BUILDING_SPRITE_MAP)) {
      try {
        const outputPath = await extractSprite(building, age);
        results.push({ building, age, path: outputPath, status: 'ok' });
      } catch (err) {
        results.push({ building, age, error: err.message, status: 'error' });
        console.error(`  Error extracting ${building}: ${err.message}`);
      }
    }
  }

  // Write summary
  const summaryPath = path.join(outputDir, 'extraction-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\nSummary written to: ${summaryPath}`);
  
  return results;
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node scripts/extract-sprite.mjs <building_name> <age>');
  console.log('  node scripts/extract-sprite.mjs --list <age>');
  console.log('  node scripts/extract-sprite.mjs --all');
  console.log('\nExamples:');
  console.log('  node scripts/extract-sprite.mjs farm classical');
  console.log('  node scripts/extract-sprite.mjs --list medieval');
  console.log('  node scripts/extract-sprite.mjs --all');
  console.log('\nAvailable ages:', Object.keys(AGE_SPRITE_PACKS).join(', '));
  console.log('Available buildings:', Object.keys(BUILDING_SPRITE_MAP).join(', '));
  process.exit(0);
}

if (args[0] === '--list' && args[1]) {
  listAllSprites(args[1]).catch(console.error);
} else if (args[0] === '--all') {
  extractAll().catch(console.error);
} else if (args.length >= 2) {
  extractSprite(args[0], args[1]).catch(console.error);
} else {
  console.error('Invalid arguments. Run without arguments for usage.');
  process.exit(1);
}
