#!/usr/bin/env node
/**
 * IsoCity Sprite Extraction Script
 * 
 * Extracts sprites from IsoCity sprite sheets.
 * These can be used to provide better sprites for RoN buildings.
 * 
 * Usage: 
 *   node scripts/extract-isocity-sprite.mjs <sheet_name> <row> <col>
 *   node scripts/extract-isocity-sprite.mjs --list
 *   node scripts/extract-isocity-sprite.mjs --preview <sheet_name>
 * 
 * Examples:
 *   node scripts/extract-isocity-sprite.mjs farm 0 0  # First crop tile
 *   node scripts/extract-isocity-sprite.mjs farm 1 0  # Dairy barn
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// IsoCity sprite sheet configurations
const ISOCITY_SHEETS = {
  // Main sprite sheets
  main: {
    src: 'public/assets/sprites_red_water_new.png',
    cols: 5,
    rows: 6,
    description: 'Main buildings (residential, commercial, industrial)',
  },
  farm: {
    src: 'public/assets/sprites_red_water_new_farm.png',
    cols: 5,
    rows: 6,
    description: 'Farm buildings, crops, and agricultural structures',
  },
  parks: {
    src: 'public/assets/sprites_red_water_new_parks.png',
    cols: 5,
    rows: 6,
    description: 'Parks, recreation, and green spaces',
  },
  shops: {
    src: 'public/assets/sprites_red_water_new_shops.png',
    cols: 5,
    rows: 6,
    description: 'Commercial shops and stores',
  },
  stations: {
    src: 'public/assets/sprites_red_water_new_stations.png',
    cols: 5,
    rows: 6,
    description: 'Train stations and transit',
  },
  modern: {
    src: 'public/assets/sprites_red_water_new_modern.png',
    cols: 5,
    rows: 6,
    description: 'Modern/contemporary buildings',
  },
  dense: {
    src: 'public/assets/sprites_red_water_new_dense.png',
    cols: 5,
    rows: 6,
    description: 'Dense urban buildings',
  },
  harry: {
    src: 'public/assets/sprites_red_water_new_harry.png',
    cols: 5,
    rows: 6,
    description: 'Harry Potter themed buildings',
  },
  construction: {
    src: 'public/assets/sprites_red_water_new_construction.png',
    cols: 5,
    rows: 6,
    description: 'Construction phases and scaffolding',
  },
  planes: {
    src: 'public/assets/sprites_red_water_new_planes.png',
    cols: 5,
    rows: 6,
    description: 'Aircraft and aviation',
  },
  // Individual building sheets
  airport: {
    src: 'public/assets/buildings/airport.png',
    cols: 1,
    rows: 1,
    description: 'Airport terminal',
  },
  commercial: {
    src: 'public/assets/buildings/commercial.png',
    cols: 1,
    rows: 1,
    description: 'Commercial building',
  },
  industrial: {
    src: 'public/assets/buildings/industrial.png',
    cols: 1,
    rows: 1,
    description: 'Industrial building',
  },
  hospital: {
    src: 'public/assets/buildings/hospital.png',
    cols: 1,
    rows: 1,
    description: 'Hospital',
  },
  police_station: {
    src: 'public/assets/buildings/police_station.png',
    cols: 1,
    rows: 1,
    description: 'Police station',
  },
  fire_station: {
    src: 'public/assets/buildings/fire_station.png',
    cols: 1,
    rows: 1,
    description: 'Fire station',
  },
  school: {
    src: 'public/assets/buildings/school.png',
    cols: 1,
    rows: 1,
    description: 'School building',
  },
  university: {
    src: 'public/assets/buildings/university.png',
    cols: 1,
    rows: 1,
    description: 'University building',
  },
  stadium: {
    src: 'public/assets/buildings/stadium.png',
    cols: 1,
    rows: 1,
    description: 'Sports stadium',
  },
  warehouse: {
    src: 'public/assets/buildings/warehouse.png',
    cols: 1,
    rows: 1,
    description: 'Warehouse',
  },
  powerplant: {
    src: 'public/assets/buildings/powerplant.png',
    cols: 1,
    rows: 1,
    description: 'Power plant',
  },
};

// Descriptive labels for farm sheet positions
const FARM_SHEET_LABELS = {
  '0,0': 'Corn field',
  '0,1': 'Wheat field',
  '0,2': 'Sunflowers',
  '0,3': 'Pumpkin patch',
  '0,4': 'Apple orchard',
  '1,0': 'Dairy barn with cows',
  '1,1': 'Chicken coop',
  '1,2': 'Sheep pen',
  '1,3': 'Pig farm',
  '1,4': 'Horse stable',
  '2,0': 'Farmhouse',
  '2,1': 'Grain silo',
  '2,2': 'Barn',
  '2,3': 'Tractor shed',
  '2,4': 'Windmill',
  '3,0': 'Fruit orchard',
  '3,1': 'Vineyard',
  '3,2': 'Hay bales',
  '3,3': 'Farm pond',
  '3,4': 'Greenhouse',
  '4,0': 'Dairy factory',
  '4,1': 'Watermill',
  '4,2': 'Grain storage',
  '4,3': 'Red barn',
  '4,4': 'Farm market',
  '5,0': 'Tractor',
  '5,1': 'Combine harvester',
  '5,2': 'Farm truck',
  '5,3': 'Water tower',
  '5,4': 'Tool shed',
};

async function extractSprite(sheetName, row, col) {
  const sheet = ISOCITY_SHEETS[sheetName];
  if (!sheet) {
    console.error(`Unknown sheet: ${sheetName}`);
    console.error(`Available sheets: ${Object.keys(ISOCITY_SHEETS).join(', ')}`);
    process.exit(1);
  }

  const imagePath = path.join(projectRoot, sheet.src);
  if (!fs.existsSync(imagePath)) {
    console.error(`Sheet not found: ${imagePath}`);
    process.exit(1);
  }

  console.log(`Loading sheet: ${sheetName} - ${sheet.description}`);
  const image = await loadImage(imagePath);

  const tileWidth = Math.floor(image.width / sheet.cols);
  const tileHeight = Math.floor(image.height / sheet.rows);

  if (row >= sheet.rows || col >= sheet.cols) {
    console.error(`Invalid position (${row}, ${col}). Sheet is ${sheet.rows}x${sheet.cols}`);
    process.exit(1);
  }

  const canvas = createCanvas(tileWidth, tileHeight);
  const ctx = canvas.getContext('2d');

  const sx = col * tileWidth;
  const sy = row * tileHeight;

  ctx.drawImage(image, sx, sy, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);

  // Output
  const outputDir = path.join(projectRoot, 'scripts', 'sprite-output', 'isocity');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const label = FARM_SHEET_LABELS[`${row},${col}`] || `${sheetName}_${row}_${col}`;
  const safeName = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const outputPath = path.join(outputDir, `${sheetName}_${row}_${col}_${safeName}.png`);

  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));

  console.log(`\nExtracted: ${outputPath}`);
  console.log(`  Sheet: ${sheetName}`);
  console.log(`  Position: row=${row}, col=${col}`);
  console.log(`  Size: ${tileWidth}x${tileHeight}`);
  if (FARM_SHEET_LABELS[`${row},${col}`]) {
    console.log(`  Label: ${FARM_SHEET_LABELS[`${row},${col}`]}`);
  }

  return outputPath;
}

async function previewSheet(sheetName) {
  const sheet = ISOCITY_SHEETS[sheetName];
  if (!sheet) {
    console.error(`Unknown sheet: ${sheetName}`);
    process.exit(1);
  }

  const imagePath = path.join(projectRoot, sheet.src);
  if (!fs.existsSync(imagePath)) {
    console.error(`Sheet not found: ${imagePath}`);
    process.exit(1);
  }

  const image = await loadImage(imagePath);
  const tileWidth = Math.floor(image.width / sheet.cols);
  const tileHeight = Math.floor(image.height / sheet.rows);

  console.log(`\n${sheetName.toUpperCase()} SHEET PREVIEW`);
  console.log(`Description: ${sheet.description}`);
  console.log(`Dimensions: ${image.width}x${image.height}`);
  console.log(`Grid: ${sheet.cols}x${sheet.rows}`);
  console.log(`Tile size: ${tileWidth}x${tileHeight}`);
  console.log(`\nPositions:`);

  for (let row = 0; row < sheet.rows; row++) {
    let rowStr = `  Row ${row}: `;
    for (let col = 0; col < sheet.cols; col++) {
      const label = FARM_SHEET_LABELS[`${row},${col}`] || '?';
      rowStr += `[${col}:${label.substring(0, 10)}] `;
    }
    console.log(rowStr);
  }
}

function listSheets() {
  console.log('\nAvailable IsoCity Sprite Sheets:\n');
  for (const [name, sheet] of Object.entries(ISOCITY_SHEETS)) {
    const exists = fs.existsSync(path.join(projectRoot, sheet.src));
    const status = exists ? '✓' : '✗';
    console.log(`  ${status} ${name.padEnd(15)} - ${sheet.description}`);
    console.log(`    Grid: ${sheet.cols}x${sheet.rows}, Source: ${sheet.src}`);
  }
}

async function extractFarmRecommendations() {
  console.log('\nExtracting recommended farm sprites for RoN...\n');

  const recommendations = [
    { row: 0, col: 0, age: 'classical', desc: 'Corn - basic crop' },
    { row: 0, col: 1, age: 'classical', desc: 'Wheat - basic crop' },
    { row: 1, col: 0, age: 'medieval', desc: 'Dairy barn' },
    { row: 2, col: 4, age: 'medieval', desc: 'Windmill' },
    { row: 2, col: 0, age: 'enlightenment', desc: 'Farmhouse' },
    { row: 5, col: 0, age: 'industrial', desc: 'Tractor' },
    { row: 5, col: 1, age: 'modern', desc: 'Combine harvester' },
  ];

  for (const rec of recommendations) {
    console.log(`Extracting ${rec.desc} for ${rec.age} age...`);
    await extractSprite('farm', rec.row, rec.col);
  }

  console.log('\nDone! Farm sprites extracted to scripts/sprite-output/isocity/');
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log('IsoCity Sprite Extraction Tool');
  console.log('\nUsage:');
  console.log('  node scripts/extract-isocity-sprite.mjs <sheet> <row> <col>');
  console.log('  node scripts/extract-isocity-sprite.mjs --list');
  console.log('  node scripts/extract-isocity-sprite.mjs --preview <sheet>');
  console.log('  node scripts/extract-isocity-sprite.mjs --farm-recommendations');
  console.log('\nExamples:');
  console.log('  node scripts/extract-isocity-sprite.mjs farm 0 0     # Corn field');
  console.log('  node scripts/extract-isocity-sprite.mjs farm 2 4     # Windmill');
  console.log('  node scripts/extract-isocity-sprite.mjs airport 0 0  # Airport building');
  process.exit(0);
}

if (args[0] === '--list') {
  listSheets();
} else if (args[0] === '--preview' && args[1]) {
  previewSheet(args[1]).catch(console.error);
} else if (args[0] === '--farm-recommendations') {
  extractFarmRecommendations().catch(console.error);
} else if (args.length >= 3) {
  const [sheet, row, col] = args;
  extractSprite(sheet, parseInt(row), parseInt(col)).catch(console.error);
} else {
  console.error('Invalid arguments. Use --help for usage.');
  process.exit(1);
}
