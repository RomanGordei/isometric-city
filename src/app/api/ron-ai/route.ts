/**
 * Rise of Nations - Agentic AI API Route
 * 
 * True agentic AI using OpenAI Responses API with tools.
 * The AI can call tools, see results, and continue reasoning.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import { RoNGameState, RoNTile, RoNPlayer } from '@/games/ron/types/game';
import { Unit } from '@/games/ron/types/units';
import {
  generateCondensedGameState,
  executeBuildBuilding,
  executeCreateUnit,
  executeSendUnits,
  executeAdvanceAge,
  executeAssignIdleWorkers,
} from '@/games/ron/lib/aiTools';

// ============================================================================
// AGENT LOGGING SYSTEM
// ============================================================================

interface AgentTurnLog {
  timestamp: string;
  tick: number;
  playerId: string;
  playerName: string;
  
  input: {
    systemPrompt: string;
    turnPrompt: string;
    gameStateSnapshot: {
      resources: Record<string, number>;
      population: string;
      militaryCount: number;
      barracksCount: number;
      age: string;
      enemyCities: Array<{ x: number; y: number; type: string }>;
      buildingCount: number;
    };
  };
  
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    result: string;
    success: boolean;
  }>;
  
  thinking: string[];
  
  output: {
    actions: Array<{ type: string; data: unknown }>;
    responseTimeMs: number;
    iterations: number;
  };
  
  errors: string[];
}

// Session tracking
let currentSessionId: string | null = null;
let sessionStartTick: number | null = null;

function getSessionId(tick: number): string {
  // Start a new session if none exists or if tick reset (new game)
  if (!currentSessionId || (sessionStartTick !== null && tick < sessionStartTick)) {
    currentSessionId = `session-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    sessionStartTick = tick;
  }
  return currentSessionId;
}

async function ensureLogDir(sessionId: string): Promise<string> {
  const logDir = path.join(process.cwd(), 'agent-logs', sessionId);
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch {
    // Directory might already exist
  }
  return logDir;
}

async function writeAgentLog(log: AgentTurnLog): Promise<void> {
  try {
    const sessionId = getSessionId(log.tick);
    const logDir = await ensureLogDir(sessionId);
    
    // Create filename with tick and player name (sanitized)
    const sanitizedName = log.playerName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `turn-${String(log.tick).padStart(6, '0')}-${sanitizedName}.json`;
    const filepath = path.join(logDir, filename);
    
    // Write the log
    await fs.writeFile(filepath, JSON.stringify(log, null, 2));
    
    // Also update session summary
    const summaryPath = path.join(logDir, 'session-summary.json');
    let summary: { 
      startTime: string; 
      lastTick: number; 
      players: string[];
      turnCount: number;
      errors: number;
    };
    
    try {
      const existing = await fs.readFile(summaryPath, 'utf-8');
      summary = JSON.parse(existing);
      summary.lastTick = log.tick;
      summary.turnCount++;
      if (log.errors.length > 0) summary.errors += log.errors.length;
      if (!summary.players.includes(log.playerName)) {
        summary.players.push(log.playerName);
      }
    } catch {
      summary = {
        startTime: log.timestamp,
        lastTick: log.tick,
        players: [log.playerName],
        turnCount: 1,
        errors: log.errors.length,
      };
    }
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error('[AGENT LOG] Failed to write log:', err);
  }
}

// Tool definitions for the Responses API
const AI_TOOLS: OpenAI.Responses.Tool[] = [
  {
    type: 'function',
    name: 'get_game_state',
    description: 'Get the current game state including resources, buildings, units, and enemy positions. Call this first to understand the situation.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [] as string[],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'assign_workers',
    description: 'Automatically assign idle workers to economic buildings. Also rebalances workers if wood/metal rate is 0. CALL THIS EVERY TURN!',
    strict: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [] as string[],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'build',
    description: 'Build a building. Costs: farm(50w), woodcutters_camp(30w), mine(80w+50g), barracks(100w), library(80w+50g), market(60w+30g), university(150w+100g), stable(150w+50m), small_city(400w+200g+100m,pop+20), large_city(600w+400g+200m,pop+35). Use tiles from game state!',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        building_type: {
          type: 'string',
          enum: [
            // Economy
            'farm', 'woodcutters_camp', 'mine', 'market', 'granary', 'lumber_mill', 'smelter',
            // Oil (industrial+)
            'oil_well', 'refinery',
            // Knowledge
            'library', 'university', 'temple', 'senate',
            // Military
            'barracks', 'stable', 'siege_factory', 'dock', 'factory', 'airbase',
            // Defense
            'tower', 'fort', 'fortress', 'castle',
            // Cities
            'small_city', 'large_city', 'major_city'
          ],
          description: 'Type of building to construct. Economic: farm, woodcutters_camp, mine, market (gold), library (knowledge), oil_well (oil). Military: barracks, stable, siege_factory, dock. Cities: small_city (pop+20), large_city (pop+35).',
        },
        x: { type: 'number', description: 'X coordinate (must be from buildable tiles in game state)' },
        y: { type: 'number', description: 'Y coordinate (must be from buildable tiles in game state)' },
      },
      required: ['building_type', 'x', 'y'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'train_unit',
    description: 'Train a unit at a building. Citizens at city_center (50 food). Militia at barracks (40 food, 20 wood). Hoplite at barracks (60 food, 40 metal).',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        unit_type: {
          type: 'string',
          enum: ['citizen', 'militia', 'hoplite', 'archer', 'cavalry'],
          description: 'Type of unit to train',
        },
        building_x: { type: 'number', description: 'X coordinate of production building' },
        building_y: { type: 'number', description: 'Y coordinate of production building' },
      },
      required: ['unit_type', 'building_x', 'building_y'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'send_units',
    description: 'Send military units to attack enemy OR patrol/move within your territory. Use task "attack" to attack enemies, or "move" to patrol and defend territory.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        unit_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of unit IDs to send',
        },
        target_x: { type: 'number', description: 'Target X coordinate' },
        target_y: { type: 'number', description: 'Target Y coordinate' },
        task: { 
          type: 'string', 
          enum: ['attack', 'move'],
          description: 'Task for units: "attack" to attack enemies, "move" to patrol/defend territory' 
        },
      },
      required: ['unit_ids', 'target_x', 'target_y', 'task'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'send_message',
    description: 'Send a taunting message to the opponent. Be creative and aggressive!',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to send' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
];

const SYSTEM_PROMPT = `RTS AI. Be CONCISE - short responses only. Multiple enemies exist - attack any!

COSTS: farm 50w, woodcutter 30w, mine 80w+50g, barracks 100w, market 60w+30g, small_city 400w+100m+200g
TRAIN: citizen 50f, militia 40f+20w (only if pop < popCap!)

RULES:
- Pop capped? Build small_city ONLY, save wood!
- Not capped? Train units, build economy, ATTACK!
- Industrial age? Build oil_well + refinery on oil deposits
- 5+ military? ATTACK enemy cities with send_units task="attack"!
- Destroy ALL enemy city_centers to win!

CRITICAL: ONLY use coordinates from "BUILDABLE TILES" section! Building outside your territory FAILS.

TURN: get_game_state → build/train if able → send_units to attack → assign_workers
Don't repeat failed actions. ATTACK to win!`;

interface AIAction {
  type: 'build' | 'unit_task' | 'train' | 'resource_update';
  data: Record<string, unknown>;
}

interface AIResponseBody {
  newState: RoNGameState;
  messages: string[];
  actions?: AIAction[];
  error?: string;
  responseId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AIResponseBody>> {
  try {
    const { gameState, aiPlayerId, previousResponseId } = await request.json();

    if (!gameState || !aiPlayerId) {
      return NextResponse.json({ newState: gameState, messages: [], error: 'Missing data' }, { status: 400 });
    }

    const aiPlayer = gameState.players.find((p: { id: string }) => p.id === aiPlayerId);
    if (!aiPlayer || aiPlayer.isDefeated) {
      return NextResponse.json({ newState: gameState, messages: [] });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ newState: gameState, messages: [], error: 'No API key' }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    let currentState = gameState;
    const messages: string[] = [];
    
    // Track explicit actions for frontend to apply directly
    const actions: Array<{
      type: 'build' | 'unit_task' | 'train' | 'resource_update';
      data: Record<string, unknown>;
    }> = [];

    console.log('\n' + '='.repeat(60));
    console.log(`[AGENT] Starting turn at tick ${gameState.tick}`);
    console.log('='.repeat(60));

    // Check for resource boost
    const boostFile = '/tmp/ron-ai-debug/ai-boost.json';
    try {
      const fs = await import('fs');
      if (fs.existsSync(boostFile)) {
        const boostData = JSON.parse(fs.readFileSync(boostFile, 'utf-8'));
        if (!boostData.applied) {
          const aiPlayer = currentState.players.find((p: { id: string }) => p.id === aiPlayerId);
          if (aiPlayer) {
            aiPlayer.resources.food += boostData.boost.food || 0;
            aiPlayer.resources.wood += boostData.boost.wood || 0;
            aiPlayer.resources.metal += boostData.boost.metal || 0;
            aiPlayer.resources.gold += boostData.boost.gold || 0;
            boostData.applied = true;
            fs.writeFileSync(boostFile, JSON.stringify(boostData, null, 2));
            console.log(`[AI BOOST] Applied: +${boostData.boost.food} food, +${boostData.boost.wood} wood, +${boostData.boost.metal} metal, +${boostData.boost.gold} gold`);
            
            // Add resource update action to sync to frontend
            actions.push({
              type: 'resource_update',
              data: { 
                playerId: aiPlayerId, 
                resources: { ...aiPlayer.resources } 
              }
            });
          }
        }
      }
    } catch (e) {
      // Ignore boost errors
    }

    // Compute key metrics for turn prompt
    const popCapped = aiPlayer.population >= aiPlayer.populationCap;
    const barracksCount = gameState.grid.flat().filter((t: RoNTile) => t.building?.type === 'barracks' && t.building?.ownerId === aiPlayerId).length;
    const militaryCount = gameState.units.filter((u: Unit) => u.ownerId === aiPlayerId && u.type !== 'citizen').length;
    const canAffordCity = aiPlayer.resources.wood >= 400 && aiPlayer.resources.metal >= 100 && aiPlayer.resources.gold >= 200;
    
    // Find enemy cities from ALL enemies (including other AIs) - prioritize city_center
    const enemyPlayers = gameState.players.filter((pl: RoNPlayer) => pl.id !== aiPlayerId && !pl.isDefeated);
    const allEnemyCities: { x: number; y: number; type: string; ownerId: string; ownerName: string }[] = [];
    
    for (const enemy of enemyPlayers) {
      for (let y = 0; y < gameState.gridSize; y++) {
        for (let x = 0; x < gameState.gridSize; x++) {
          const tile = gameState.grid[y]?.[x];
          if (tile?.building?.ownerId === enemy.id && 
              ['city_center', 'small_city', 'large_city', 'major_city'].includes(tile.building.type)) {
            allEnemyCities.push({ x, y, type: tile.building.type, ownerId: enemy.id, ownerName: enemy.name });
          }
        }
      }
    }
    
    // Sort: city_center first, then by distance from AI's city_center
    const aiCityCenter = gameState.grid.flat().find((t: RoNTile) => 
      t.building?.ownerId === aiPlayerId && t.building?.type === 'city_center'
    );
    const aiX = aiCityCenter?.x || 50;
    const aiY = aiCityCenter?.y || 50;
    
    allEnemyCities.sort((a, b) => {
      // Prioritize city_center
      if (a.type === 'city_center' && b.type !== 'city_center') return -1;
      if (b.type === 'city_center' && a.type !== 'city_center') return 1;
      // Then by distance
      const distA = Math.sqrt((a.x - aiX) ** 2 + (a.y - aiY) ** 2);
      const distB = Math.sqrt((b.x - aiX) ** 2 + (b.y - aiY) ** 2);
      return distA - distB;
    });
    
    const enemyCityPos = allEnemyCities[0] || null;
    if (enemyCityPos) {
      console.log(`[TARGETING] ${aiPlayer.name} targeting ${enemyCityPos.ownerName}'s ${enemyCityPos.type} at (${enemyCityPos.x}, ${enemyCityPos.y})`);
    }
    
    // Simple state summary - let the AI reason about what to do from system prompt
    const turnPrompt = `Turn ${gameState.tick}. You are ${aiPlayer.name}.
Resources: ${Math.round(aiPlayer.resources.food)}F / ${Math.round(aiPlayer.resources.wood)}W / ${Math.round(aiPlayer.resources.metal)}M / ${Math.round(aiPlayer.resources.gold)}G
Population: ${aiPlayer.population}/${aiPlayer.populationCap}${popCapped ? ' (CAPPED)' : ''}
Military: ${militaryCount} units | Barracks: ${barracksCount}
${enemyCityPos ? `Enemy city spotted at (${enemyCityPos.x},${enemyCityPos.y})` : 'No enemy cities visible'}
Age: ${aiPlayer.age}

Start by calling get_game_state to see full details, then take actions.`;

    // Log what we're sending to the agent
    console.log('\n' + '-'.repeat(60));
    console.log('[AGENT INPUT] Turn prompt:', turnPrompt);
    console.log('[AGENT INPUT] System prompt length:', SYSTEM_PROMPT.length, 'chars');
    console.log('[AGENT INPUT] Available tools:', AI_TOOLS.map(t => (t as { name?: string }).name).join(', '));
    console.log('-'.repeat(60));

    // Create initial response - always provide input, optionally use previous_response_id for context
    const startTime = Date.now();
    let response = await client.responses.create({
      model: 'gpt-5.1-2025-11-13',
      instructions: SYSTEM_PROMPT,
      input: turnPrompt,
      tools: AI_TOOLS,
      tool_choice: 'auto',
    });
    const responseTime = Date.now() - startTime;

    console.log(`[AGENT OUTPUT] Initial response in ${responseTime}ms, ${response.output?.length || 0} outputs`);
    console.log(`[AGENT OUTPUT] Response ID: ${response.id}`);

    // Process tool calls in a loop
    let iterations = 0;
    const maxIterations = 12; // More iterations for aggressive play
    
    // Track all tool calls for frontend display
    const allToolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }> = [];
    let lastThinking = '';

    while (response.output && iterations < maxIterations) {
      iterations++;

      // Find tool calls
      const toolCalls = response.output.filter(
        (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
          item.type === 'function_call'
      );

      // Check for text responses (agent thinking)
      const messageOutputs = response.output.filter(
        (item): item is OpenAI.Responses.ResponseOutputMessage =>
          item.type === 'message'
      );
      
      for (const msg of messageOutputs) {
        const textContent = msg.content
          .filter((c): c is OpenAI.Responses.ResponseOutputText => c.type === 'output_text')
          .map(t => t.text)
          .join('');
        if (textContent) {
          console.log(`[AGENT THINKING] ${textContent}`);
          lastThinking = textContent;
        }
      }

      if (toolCalls.length === 0) {
        console.log('[AGENT] No more tool calls, turn complete');
        break;
      }

      // Process each tool call
      const toolResults: Array<{ call_id: string; output: string }> = [];

      for (const toolCall of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.arguments || '{}');
        } catch {
          args = {};
        }

        console.log(`\n[TOOL CALL] ${toolCall.name}`);
        if (Object.keys(args).length > 0) {
          console.log(`[TOOL INPUT] ${JSON.stringify(args, null, 2)}`);
        }

        let result: { success: boolean; message: string; data?: unknown };

        switch (toolCall.name) {
          case 'get_game_state': {
            const condensed = generateCondensedGameState(currentState, aiPlayerId);
            // Debug: log what tiles are near forest/metal
            console.log('[AI DEBUG] tilesNearForest:', condensed.tilesNearForest?.map(t => `(${t.x},${t.y})`).join(', ') || 'EMPTY');
            console.log('[AI DEBUG] tilesNearMetal:', condensed.tilesNearMetal?.map(t => `(${t.x},${t.y})`).join(', ') || 'EMPTY');
            const p = condensed.myPlayer;
            
            // Format a readable game state
            const stateStr = `## YOUR RESOURCES:
Food: ${Math.round(p.resources.food)} (rate: ${p.resourceRates.food.toFixed(1)}/s)
Wood: ${Math.round(p.resources.wood)} (rate: ${p.resourceRates.wood.toFixed(1)}/s)${p.resourceRates.wood === 0 ? ' ⚠️ ZERO!' : ''}
Metal: ${Math.round(p.resources.metal)} (rate: ${p.resourceRates.metal.toFixed(1)}/s)
Gold: ${Math.round(p.resources.gold)} (rate: ${(p.resourceRates.gold || 0).toFixed(1)}/s)
Knowledge: ${Math.round(p.resources.knowledge || 0)} (rate: ${(p.resourceRates.knowledge || 0).toFixed(1)}/s) ${(p.resources.knowledge || 0) > 0 ? '📚' : '- need library!'}
Oil: ${Math.round(p.resources.oil || 0)} (rate: ${(p.resourceRates.oil || 0).toFixed(1)}/s) ${(p.resources.oil || 0) > 0 ? '🛢️' : '- need oil_well (industrial age)!'}

## POPULATION: ${p.population}/${p.populationCap}${p.population >= p.populationCap ? ' ⚠️ CAPPED!' : ''}

## YOUR BUILDINGS:
${condensed.myBuildings.map(b => `- ${b.type} at (${b.x},${b.y})`).join('\n') || '(none)'}

## YOUR UNITS:
- Citizens: ${condensed.myUnits.filter(u => u.type === 'citizen').length} (idle: ${condensed.myUnits.filter(u => u.type === 'citizen' && u.task === 'idle').length})
- Military: ${condensed.myUnits.filter(u => u.type !== 'citizen').map(u => `${u.type}[${u.id}]`).join(', ') || 'none'}

## YOUR TERRITORY (x: ${condensed.territoryBounds.minX}-${condensed.territoryBounds.maxX}, y: ${condensed.territoryBounds.minY}-${condensed.territoryBounds.maxY}):
⚠️ You can ONLY build within these coordinates! Building outside will FAIL.

## BUILDABLE TILES (all within your territory):
General: ${(condensed.emptyTerritoryTiles || []).slice(0, 5).map(t => `(${t.x},${t.y})`).join(', ') || 'NO VALID TILES'}
🌲 For woodcutters_camp (near forest): ${(condensed.tilesNearForest || []).slice(0, 4).map(t => `(${t.x},${t.y})`).join(', ') || 'none in territory'}
⛏️ For mine (near metal): ${(condensed.tilesNearMetal || []).slice(0, 4).map(t => `(${t.x},${t.y})`).join(', ') || 'none in territory'}

## ENEMY INFO:
Buildings: ${condensed.enemyBuildings.slice(0, 5).map(b => `${b.type}@(${b.x},${b.y})`).join(', ') || 'none visible'}
Units: ${condensed.enemyUnits.slice(0, 8).map(u => `${u.type}@(${Math.round(u.x)},${Math.round(u.y)})`).join(', ') || 'none visible'}
${(() => {
  // Detect if enemy units are near AI buildings (attack warning)
  const myBuildingPositions = condensed.myBuildings.map(b => ({ x: b.x, y: b.y, type: b.type }));
  const threats: string[] = [];
  for (const enemy of condensed.enemyUnits) {
    for (const building of myBuildingPositions) {
      const dist = Math.sqrt(Math.pow(enemy.x - building.x, 2) + Math.pow(enemy.y - building.y, 2));
      if (dist < 15) {
        threats.push(`⚠️ UNDER ATTACK! Enemy ${enemy.type} near your ${building.type} at (${building.x},${building.y})!`);
      }
    }
  }
  // Also check if enemy near AI units
  for (const enemy of condensed.enemyUnits) {
    for (const myUnit of condensed.myUnits) {
      const dist = Math.sqrt(Math.pow(enemy.x - myUnit.x, 2) + Math.pow(enemy.y - myUnit.y, 2));
      if (dist < 10 && myUnit.type === 'citizen') {
        threats.push(`⚠️ Your worker at (${Math.round(myUnit.x)},${Math.round(myUnit.y)}) is in danger from enemy ${enemy.type}!`);
      }
    }
  }
  return threats.length > 0 ? '\n🚨 THREATS:\n' + threats.slice(0, 3).join('\n') : '';
})()}

## WHAT YOU CAN DO RIGHT NOW:
${(() => {
  const popCapped = p.population >= p.populationCap;
  const canTrainCitizen = !popCapped && p.resources.food >= 50;
  const canTrainMilitia = !popCapped && p.resources.food >= 40 && p.resources.wood >= 20;
  const canBuildFarm = p.resources.wood >= 50;
  const canBuildWoodcutter = p.resources.wood >= 30;
  const canBuildMine = p.resources.wood >= 80 && p.resources.gold >= 50;
  const canBuildMarket = p.resources.wood >= 60 && p.resources.gold >= 30;
  const canBuildBarracks = p.resources.wood >= 100;
  const canBuildSmallCity = p.resources.wood >= 400 && p.resources.metal >= 100 && p.resources.gold >= 200;
  
  const cityTypes = ['city_center', 'small_city', 'large_city', 'major_city'];
  const cities = condensed.myBuildings.filter(b => cityTypes.includes(b.type));
  const barracks = condensed.myBuildings.filter(b => b.type === 'barracks');
  
  let result = '';
  
  if (popCapped) {
    result += `⛔ POPULATION CAPPED (${p.population}/${p.populationCap}) - CANNOT TRAIN UNITS!\n`;
    result += `   Your ONLY goal: Build small_city (need 400w+100m+200g)\n`;
    result += `   Have: ${Math.round(p.resources.wood)}w / ${Math.round(p.resources.metal)}m / ${Math.round(p.resources.gold)}g\n`;
    if (canBuildSmallCity) {
      result += `   ✅ YOU CAN BUILD small_city NOW! DO IT!\n`;
    } else {
      const need = [];
      if (p.resources.wood < 400) need.push(`${Math.round(400 - p.resources.wood)} more wood`);
      if (p.resources.metal < 100) need.push(`${Math.round(100 - p.resources.metal)} more metal`);
      if (p.resources.gold < 200) need.push(`${Math.round(200 - p.resources.gold)} more gold`);
      result += `   Need: ${need.join(', ')}\n`;
    }
  } else {
    result += `### TRAINING (pop ${p.population}/${p.populationCap}):\n`;
    if (canTrainCitizen && cities.length > 0) {
      result += `  ✅ Can train citizens at: ${cities.map(c => `(${c.x},${c.y})`).join(', ')}\n`;
    }
    if (canTrainMilitia && barracks.length > 0) {
      result += `  ✅ Can train militia at: ${barracks.map(b => `(${b.x},${b.y})`).join(', ')}\n`;
    }
    if (!canTrainCitizen) result += `  ❌ Cannot train citizen (need 50 food, have ${Math.round(p.resources.food)})\n`;
    if (!canTrainMilitia && barracks.length > 0) result += `  ❌ Cannot train militia (need 40f+20w)\n`;
  }
  
  result += `\n### BUILDINGS YOU CAN AFFORD:\n`;
  if (canBuildSmallCity) result += `  ✅ small_city (400w+100m+200g) - PRIORITY IF POP CAPPED!\n`;
  if (canBuildFarm) result += `  ✅ farm (50w)\n`;
  if (canBuildWoodcutter) result += `  ✅ woodcutters_camp (30w)\n`;
  if (canBuildMine) result += `  ✅ mine (80w+50g)\n`;
  if (canBuildMarket) result += `  ✅ market (60w+30g)\n`;
  if (canBuildBarracks) result += `  ✅ barracks (100w)\n`;
  
  // Industrial Age+ Oil buildings
  const isIndustrialPlus = ['industrial', 'modern'].includes(p.age);
  if (isIndustrialPlus) {
    const canBuildOilWell = p.resources.wood >= 200 && p.resources.metal >= 150 && p.resources.gold >= 100;
    const canBuildRefinery = p.resources.wood >= 250 && p.resources.metal >= 200 && p.resources.gold >= 150;
    const oilWells = condensed.myBuildings.filter(b => b.type === 'oil_well');
    const refineries = condensed.myBuildings.filter(b => b.type === 'refinery');
    const oilDeposits = condensed.resourceTiles.oilDeposits;
    
    result += `\n### 🛢️ OIL ECONOMY (Industrial Age+):\n`;
    result += `  Current oil: ${Math.round(p.resources.oil)} (rate: ${p.resourceRates.oil.toFixed(1)}/s)\n`;
    result += `  Oil wells: ${oilWells.length} | Refineries: ${refineries.length}\n`;
    
    if (oilWells.length === 0 && oilDeposits.length > 0) {
      result += `  ⚠️ NO OIL WELLS! Build oil_well NEAR oil deposits!\n`;
      result += `  📍 Oil deposits at: ${oilDeposits.map((d: { x: number; y: number }) => `(${d.x},${d.y})`).join(', ')}\n`;
    }
    if (refineries.length === 0 && oilWells.length > 0) {
      result += `  ⚠️ NO REFINERY! Build refinery to boost oil +50%!\n`;
    }
    
    if (canBuildOilWell) result += `  ✅ oil_well (200w+150m+100g) - build near oil deposit!\n`;
    if (canBuildRefinery) result += `  ✅ refinery (250w+200m+150g) - boosts oil gathering!\n`;
    
    if (oilWells.length > 0) {
      result += `  👷 Assign workers to oil_wells for oil income!\n`;
    }
  }
  
  if (!canBuildFarm && !canBuildWoodcutter) {
    result += `  ❌ Not enough wood for any buildings!\n`;
  }
  
  return result;
})()}

## 📊 STRATEGIC ASSESSMENT:
${(() => {
  const sa = condensed.strategicAssessment;
  // Provide factual strategic info - let AI reason about what to do
  const lines = [];
  
  // Military comparison
  lines.push(`Military Strength: You ${sa.myMilitaryStrength} vs Enemy ${sa.enemyMilitaryStrength} (${sa.strengthAdvantage})`);
  lines.push(`Your Forces: ${sa.myWorkerCount} workers, ${sa.myMilitaryCount} military`);
  lines.push(`Enemy Forces: ${sa.enemyMilitaryCount} military (nearest ${sa.nearestEnemyDistance} tiles away)`);
  lines.push(`Threat Level: ${sa.threatLevel}`);
  
  // Economy summary
  const marketCount = condensed.myBuildings.filter(b => b.type === 'market').length;
  lines.push(`Economy: ${sa.farmCount} farms, ${sa.woodcutterCount} woodcutters, ${sa.mineCount} mines, ${marketCount} markets, ${sa.barracksCount} barracks`);
  
  // Population status
  if (sa.isPopCapped) {
    const woodNeeded = Math.max(0, 400 - p.resources.wood);
    const metalNeeded = Math.max(0, 100 - p.resources.metal);
    const goldNeeded = Math.max(0, 200 - p.resources.gold);
    lines.push(`Population: CAPPED at ${p.population}/${p.populationCap}`);
    if (sa.canAffordSmallCity) {
      lines.push(`small_city cost: 400w/100m/200g - CAN AFFORD`);
    } else {
      lines.push(`small_city cost: 400w/100m/200g - Need ${woodNeeded > 0 ? `${woodNeeded}w ` : ''}${metalNeeded > 0 ? `${metalNeeded}m ` : ''}${goldNeeded > 0 ? `${goldNeeded}g` : ''}`);
    }
  }
  
  // Industrial Age oil info
  const isIndustrialPlus = ['industrial', 'modern'].includes(p.age);
  if (isIndustrialPlus) {
    const oilWells = condensed.myBuildings.filter(b => b.type === 'oil_well').length;
    const refineries = condensed.myBuildings.filter(b => b.type === 'refinery').length;
    lines.push(`Oil Economy: ${oilWells} oil wells, ${refineries} refineries, ${p.resourceRates.oil.toFixed(1)}/s oil rate`);
  }
  
  // Enemy targets - show all enemy cities (multiple AI opponents)
  const enemyCities = condensed.enemyBuildings.filter(b => 
    ['city_center', 'small_city', 'large_city', 'major_city'].includes(b.type)
  );
  if (enemyCities.length > 0) {
    // Sort: city_centers first
    enemyCities.sort((a, b) => (a.type === 'city_center' ? -1 : 1) - (b.type === 'city_center' ? -1 : 1));
    const targets = enemyCities.slice(0, 5).map(c => 
      `${c.type}@(${c.x},${c.y})${c.type === 'city_center' ? '!' : ''}`
    ).join(', ');
    lines.push(`Enemy Targets: ${targets}${enemyCities.length > 5 ? ` (+${enemyCities.length - 5} more)` : ''}`);
  }
  
  // Military unit IDs for send_units command
  const militaryUnits = condensed.myUnits.filter(u => u.type !== 'citizen');
  if (militaryUnits.length > 0) {
    lines.push(`Your Military IDs: ${militaryUnits.slice(0, 10).map(u => u.id).join(', ')}${militaryUnits.length > 10 ? ` (+${militaryUnits.length - 10} more)` : ''}`);
  }
  
  return lines.join('\n');
})()}

## AVAILABLE BUILD LOCATIONS:
${(() => {
  const cityTile = condensed.emptyTerritoryTiles?.[0];
  const forestTile = condensed.tilesNearForest?.[0];
  const metalTile = condensed.tilesNearMetal?.[0];
  const oilTiles = condensed.resourceTiles?.oilDeposits || [];
  
  const locations: string[] = [];
  if (cityTile) locations.push(`General: (${cityTile.x},${cityTile.y})`);
  if (forestTile) locations.push(`Near forest: (${forestTile.x},${forestTile.y})`);
  if (metalTile) locations.push(`Near metal: (${metalTile.x},${metalTile.y})`);
  if (oilTiles.length > 0) locations.push(`Oil deposits: ${oilTiles.slice(0,3).map((t: {x: number, y: number}) => `(${t.x},${t.y})`).join(', ')}`);
  
  return locations.join('\n') || 'No valid build locations in territory';
})()}

## TRAINING LOCATIONS:
${(() => {
  const cities = condensed.myBuildings.filter(b => ['city_center', 'small_city', 'large_city', 'major_city'].includes(b.type));
  const barracks = condensed.myBuildings.filter(b => b.type === 'barracks');
  
  const locs: string[] = [];
  if (cities.length > 0) locs.push(`Citizens at: ${cities.slice(0,5).map(c => `(${c.x},${c.y})`).join(', ')}`);
  if (barracks.length > 0) locs.push(`Militia at: ${barracks.slice(0,5).map(b => `(${b.x},${b.y})`).join(', ')}`);
  
  return locs.join('\n') || 'No training buildings';
})()}

## RESOURCE RATES:
Food: ${p.resourceRates.food.toFixed(1)}/s | Wood: ${p.resourceRates.wood.toFixed(1)}/s | Metal: ${p.resourceRates.metal.toFixed(1)}/s | Gold: ${p.resourceRates.gold.toFixed(1)}/s
${(() => {
  const warnings: string[] = [];
  if (p.resourceRates.food === 0) warnings.push('No food income');
  if (p.resourceRates.wood === 0) warnings.push('No wood income');
  if (p.resourceRates.metal === 0) warnings.push('No metal income');
  if (p.resourceRates.gold === 0) warnings.push('No gold income');
  return warnings.length > 0 ? `Note: ${warnings.join(', ')}` : '';
})()}

## IDLE WORKERS: ${condensed.myUnits.filter(u => u.type === 'citizen' && (u.task === 'idle' || !u.task)).length}
${condensed.myUnits.filter(u => u.type === 'citizen' && (u.task === 'idle' || !u.task)).length > 5 ? 'Note: Many idle workers! Build more farms/woodcutters/mines to employ them.' : ''}`;

            result = { success: true, message: stateStr };
            // Detailed logging
            console.log(`[TOOL OUTPUT] Game state retrieved (${stateStr.length} chars)`);
            console.log(`  [STATE] Tick: ${condensed.tick} | Pop: ${p.population}/${p.populationCap} | Military: ${condensed.myUnits.filter(u => u.type !== 'citizen').length}`);
            console.log(`  [STATE] Resources: Food ${Math.round(p.resources.food)} (${p.resourceRates.food}/s) | Wood ${Math.round(p.resources.wood)} (${p.resourceRates.wood}/s) | Metal ${Math.round(p.resources.metal)} (${p.resourceRates.metal}/s) | Gold ${Math.round(p.resources.gold)}`);
            console.log(`  [STATE] Buildings: ${condensed.myBuildings.map(b => b.type).join(', ')}`);
            console.log(`  [STATE] Citizens: ${condensed.myUnits.filter(u => u.type === 'citizen').length} | Idle: ${condensed.myUnits.filter(u => u.type === 'citizen' && (u.task === 'idle' || u.task === 'move')).length}`);
            // Log the full prompt going to AI (first 2000 chars)
            console.log(`\n[FULL PROMPT TO AI] (showing first 2500 chars):\n${'-'.repeat(50)}`);
            console.log(stateStr.substring(0, 2500));
            if (stateStr.length > 2500) console.log(`\n... (${stateStr.length - 2500} more chars)`);
            console.log('-'.repeat(50));
            break;
          }

          case 'assign_workers': {
            const res = executeAssignIdleWorkers(currentState, aiPlayerId);
            currentState = res.newState;
            result = res.result;
            console.log(`  → ${result.message}`);
            // Track unit task updates for frontend
            if (res.result.success && (res.result.data as { assigned?: number })?.assigned && (res.result.data as { assigned: number }).assigned > 0) {
              // Get all AI units with gather tasks
              const aiUnits = currentState.units.filter((u: { ownerId: string; task?: string }) => 
                u.ownerId === aiPlayerId && u.task?.startsWith('gather_')
              );
              aiUnits.forEach((u: { id: string; task: string; taskTarget?: unknown; targetX?: number; targetY?: number; isMoving?: boolean }) => {
                actions.push({
                  type: 'unit_task',
                  data: { 
                    unitId: u.id, 
                    task: u.task, 
                    taskTarget: u.taskTarget,
                    targetX: u.targetX,
                    targetY: u.targetY,
                    isMoving: u.isMoving
                  }
                });
              });
            }
            break;
          }

          case 'build': {
            const { building_type, x, y } = args as { building_type: string; x: number; y: number };
            const res = executeBuildBuilding(currentState, aiPlayerId, building_type, x, y);
            currentState = res.newState;
            result = res.result;
            console.log(`  → ${result.message}`);
            // Track action for frontend
            if (res.result.success) {
              const tile = currentState.grid[y]?.[x];
              if (tile?.building) {
                actions.push({
                  type: 'build',
                  data: { building: tile.building, x, y, ownerId: aiPlayerId }
                });
              }
            }
            break;
          }

          case 'train_unit': {
            const { unit_type, building_x, building_y } = args as { unit_type: string; building_x: number; building_y: number };
            const res = executeCreateUnit(currentState, aiPlayerId, unit_type, building_x, building_y);
            currentState = res.newState;
            result = res.result;
            console.log(`  → ${result.message}`);
            // Track action for frontend
            if (res.result.success) {
              actions.push({
                type: 'train',
                data: { unitType: unit_type, buildingX: building_x, buildingY: building_y }
              });
            }
            break;
          }

          case 'send_units': {
            const { unit_ids, target_x, target_y, task } = args as { unit_ids: string[]; target_x: number; target_y: number; task?: string };
            const unitTask = task === 'move' ? 'move' : 'attack'; // Default to attack if not specified
            const res = executeSendUnits(currentState, aiPlayerId, unit_ids, target_x, target_y, unitTask);
            currentState = res.newState;
            result = res.result;
            console.log(`  → ${result.message}`);
            
            // Push unit_task actions for each unit that was updated
            if (res.result.success) {
              // Find the units that were sent and push their updated state
              const normalizedIds = unit_ids.map((id: string) => {
                const match = id.match(/u\d+|unit-[a-z0-9-]+/i);
                return match ? match[0] : id;
              });
              const sentUnits = currentState.units.filter((u: Unit) => 
                normalizedIds.includes(u.id) && u.ownerId === aiPlayerId
              );
              sentUnits.forEach((u: Unit) => {
                actions.push({
                  type: 'unit_task',
                  data: {
                    unitId: u.id,
                    task: u.task,
                    taskTarget: u.taskTarget,
                    targetX: u.targetX,
                    targetY: u.targetY,
                    isMoving: u.isMoving
                  }
                });
              });
            }
            break;
          }

          case 'send_message': {
            const { message } = args as { message: string };
            messages.push(message);
            result = { success: true, message: `Message sent: "${message}"` };
            console.log(`  → Message: "${message}"`);
            break;
          }

          case 'advance_age': {
            const res = executeAdvanceAge(currentState, aiPlayerId);
            currentState = res.newState;
            result = res.result;
            console.log(`  → ${result.message}`);
            break;
          }

          default:
            result = { success: false, message: `Unknown tool: ${toolCall.name}` };
        }

        const outputStr = JSON.stringify(result);
        console.log(`[TOOL RESULT] ${toolCall.name}: ${result.success ? '✓' : '✗'} ${result.message.substring(0, 100)}${result.message.length > 100 ? '...' : ''}`);
        
        // Track tool call for frontend
        allToolCalls.push({
          name: toolCall.name,
          args: args,
          result: result.message,
        });
        
        toolResults.push({
          call_id: toolCall.call_id,
          output: outputStr,
        });
      }

      // Continue the conversation with tool results
      console.log(`\n[AGENT CONTINUE] Sending ${toolResults.length} tool results back to agent...`);
      try {
        const continueStart = Date.now();
        response = await client.responses.create({
          model: 'gpt-5.1-2025-11-13',
          instructions: SYSTEM_PROMPT,
          previous_response_id: response.id,
          input: toolResults.map(r => ({
            type: 'function_call_output' as const,
            call_id: r.call_id,
            output: r.output,
          })),
          tools: AI_TOOLS,
          tool_choice: 'auto',
        });
        const continueTime = Date.now() - continueStart;
        console.log(`[AGENT OUTPUT] Continuation response in ${continueTime}ms, ${response.output?.length || 0} outputs`);
      } catch (err) {
        if (err instanceof Error && (err.message.includes('429') || err.message.includes('rate'))) {
          console.log('[AGENT] Rate limited, stopping turn');
          break;
        }
        throw err;
      }
    }

    const totalTurnTime = Date.now() - startTime;
    console.log('\n' + '='.repeat(60));
    console.log(`[TURN SUMMARY] Completed in ${(totalTurnTime / 1000).toFixed(1)}s | ${iterations} iterations | ${actions.length} actions`);
    if (actions.length > 0) {
      console.log(`[TURN ACTIONS]:`);
      for (const action of actions) {
        console.log(`  - ${action.type}: ${JSON.stringify(action.data).slice(0, 80)}${JSON.stringify(action.data).length > 80 ? '...' : ''}`);
      }
    }
    console.log('='.repeat(60) + '\n');

    // ========================================================================
    // WRITE STRUCTURED AGENT LOG
    // ========================================================================
    const agentLog: AgentTurnLog = {
      timestamp: new Date().toISOString(),
      tick: gameState.tick,
      playerId: aiPlayerId,
      playerName: aiPlayer.name,
      
      input: {
        systemPrompt: SYSTEM_PROMPT,
        turnPrompt,
        gameStateSnapshot: {
          resources: {
            food: Math.round(aiPlayer.resources.food),
            wood: Math.round(aiPlayer.resources.wood),
            metal: Math.round(aiPlayer.resources.metal),
            gold: Math.round(aiPlayer.resources.gold),
            knowledge: Math.round(aiPlayer.resources.knowledge),
            oil: Math.round(aiPlayer.resources.oil),
          },
          population: `${aiPlayer.population}/${aiPlayer.populationCap}`,
          militaryCount,
          barracksCount,
          age: aiPlayer.age,
          enemyCities: allEnemyCities.slice(0, 10).map(c => ({ x: c.x, y: c.y, type: c.type })),
          buildingCount: gameState.grid.flat().filter((t: RoNTile) => t.building?.ownerId === aiPlayerId).length,
        },
      },
      
      toolCalls: allToolCalls.map(tc => ({
        name: tc.name,
        args: tc.args,
        result: tc.result.slice(0, 500), // Truncate long results
        success: !tc.result.includes('✗') && !tc.result.toLowerCase().includes('error'),
      })),
      
      thinking: lastThinking ? [lastThinking] : [],
      
      output: {
        actions,
        responseTimeMs: totalTurnTime,
        iterations,
      },
      
      errors: allToolCalls
        .filter(tc => tc.result.includes('✗') || tc.result.toLowerCase().includes('error'))
        .map(tc => `${tc.name}: ${tc.result.slice(0, 200)}`),
    };
    
    // Write log asynchronously (don't wait for it)
    writeAgentLog(agentLog).catch(err => console.error('[AGENT LOG] Write failed:', err));

    return NextResponse.json({
      newState: currentState,
      messages,
      actions, // Explicit actions for frontend to apply
      responseId: response.id,
      toolCalls: allToolCalls, // For frontend conversation display
      thinking: lastThinking, // Last AI reasoning
      turnPrompt, // The prompt sent to the agent
    });

  } catch (error) {
    console.error('[AGENT Error]', error);
    const body = await request.json().catch(() => ({})) as { gameState?: RoNGameState };
    return NextResponse.json({
      newState: body.gameState || ({} as RoNGameState),
      messages: [],
      error: error instanceof Error ? error.message : 'Error',
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
