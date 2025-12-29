'use server';

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_DIR = '/tmp/ron-ai-debug';

// This endpoint boosts the AI's resources by writing to a boost file
// The game simulation should read this file and apply the boost
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { food = 100, wood = 100, metal = 100, gold = 100 } = body;

    // Ensure debug directory exists
    if (!fs.existsSync(DEBUG_DIR)) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
    }

    // Write boost request to file
    const boostFile = path.join(DEBUG_DIR, 'ai-boost.json');
    const boostData = {
      timestamp: Date.now(),
      boost: { food, wood, metal, gold },
      applied: false,
    };
    
    fs.writeFileSync(boostFile, JSON.stringify(boostData, null, 2));
    
    console.log(`[AI BOOST] Written boost request: +${food} food, +${wood} wood, +${metal} metal, +${gold} gold`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Boost request written: +${food} food, +${wood} wood, +${metal} metal, +${gold} gold`,
      boostFile 
    });
  } catch (error) {
    console.error('[AI BOOST] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  // Check if there's a pending boost
  const boostFile = path.join(DEBUG_DIR, 'ai-boost.json');
  if (fs.existsSync(boostFile)) {
    const data = JSON.parse(fs.readFileSync(boostFile, 'utf-8'));
    return NextResponse.json(data);
  }
  return NextResponse.json({ pending: false });
}
