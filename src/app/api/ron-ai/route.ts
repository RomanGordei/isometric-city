/**
 * Rise of Nations - Agentic AI API Route
 * 
 * This API route handles the agentic AI processing.
 * It receives the game state, runs the AI turn, and returns the updated state.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { RoNGameState } from '@/games/ron/types/game';
import {
  AI_TOOLS,
  ToolResult,
  generateCondensedGameState,
  executeBuildBuilding,
  executeCreateUnit,
  executeSendUnits,
  executeAdvanceAge,
  executeAssignIdleWorkers,
} from '@/games/ron/lib/aiTools';
import {
  logGameState,
  logAIAction,
  logAITurnSummary,
} from '@/games/ron/lib/debugLogger';

/**
 * System prompt for the AI
 */
const SYSTEM_PROMPT = `You are an advanced AI opponent in a Rise of Nations-style real-time strategy game. You are playing against a VERY SKILLED human player, so you must play strategically and aggressively.

## Your Goal
Win the game by either:
1. Destroying all enemy city centers and buildings
2. Achieving military dominance and forcing surrender

## Game Mechanics Overview
- You control units and buildings on an isometric tile-based map
- Resources: Food, Wood, Metal, Gold, Knowledge, Oil
- Ages: Classical → Medieval → Enlightenment → Industrial → Modern
- Buildings produce resources ONLY when workers are assigned to them!
- Units can gather resources, build, or fight

## CRITICAL: Economy Management
YOUR ECONOMY IS THE KEY TO VICTORY! Every turn, you MUST:

1. **FIRST: Call assign_idle_workers** - This automatically assigns all idle/moving citizens to farms and other economic buildings. If resourceRates.food is 0, you have NO workers on farms!
2. Check your resourceRates - if any are 0, you need more workers there
3. Build more farms if food production is low
4. Train more citizens to work (they cost 50 food, built at city_center)

Resource gathering works like this:
- Citizens sent to a FARM with "gather_food" task will produce food
- Citizens sent to a WOODCUTTERS_CAMP with "gather_wood" task will produce wood
- Each building has limited worker capacity (usually 3-5 workers)
- The assign_idle_workers tool handles all this automatically!

## Strategy Priorities (in order)
1. **ALWAYS call assign_idle_workers first** - Keep your economy running!
2. **Check population cap** - If population = populationCap, you can't train more units
3. **Train citizens** - More workers = more resources = bigger army
4. **Build military** - Barracks for infantry, stables for cavalry
5. **Scout and attack** - Find the enemy and destroy them

## Available Actions
- **assign_idle_workers**: CALL THIS EVERY TURN! Auto-assigns idle citizens to economy
- build_building: Construct buildings (farms, barracks, etc.)
- create_unit: Queue units at production buildings  
- send_units: Move units, attack, or assign gathering tasks
- send_message: Communicate with opponent (DO THIS FREQUENTLY!)
- advance_age: Advance to next age when you have resources
- wait_ticks: Wait for economy/production (use sparingly, max 20 ticks)

## Debugging Your Economy
Look at your myPlayer.resourceRates in the game state:
- If food rate is 0, NO workers are on farms - use assign_idle_workers!
- If wood rate is 0, NO workers are at woodcutters_camps
- Having 33 farms means nothing if no workers are assigned!

## Population Cap - CRITICAL!
When population = populationCap, you CANNOT train more units! This blocks all growth!
**FIX: Build a small_city** - costs 200 food, 150 wood, **100 metal**
- If you have 0 metal: Build a MINE first! (costs 100 wood, 50 gold)
- Use emptyTerritoryTiles from state to find valid build locations
- Multiple small_cities = bigger army potential

## Metal Production
- Build a MINE anywhere in your territory (costs 80 wood, 50 gold)
- Mines don't need to be on metal deposits - build on emptyTerritoryTiles!
- After building, assign citizens with gather_metal (or assign_idle_workers)
- Metal is CRITICAL for small_city and advanced units!

## Communication
SEND MESSAGES FREQUENTLY! Taunt, bluff, react. Make the game fun!

Remember: Economy FIRST, military SECOND. An army without resources is useless!`;

interface AIRequestBody {
  gameState: RoNGameState;
  aiPlayerId: string;
  previousResponseId?: string;
}

interface AIResponseBody {
  newState: RoNGameState;
  messages: string[];
  responseId?: string;
  error?: string;
  thoughts?: string;
  waitTicks?: number; // AI-requested wait via wait_ticks tool
}

/**
 * Process a tool call from the AI
 */
function processToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>,
  gameState: RoNGameState,
  aiPlayerId: string,
  messages: string[]
): { newState: RoNGameState; result: ToolResult; waitTicks?: number } {
  switch (toolName) {
    case 'refresh_game_state':
    case 'read_game_state': {
      const condensed = generateCondensedGameState(gameState, aiPlayerId);
      return {
        newState: gameState,
        result: {
          success: true,
          message: 'Game state retrieved successfully',
          data: condensed,
        },
      };
    }

    case 'build_building': {
      const { building_type, x, y } = toolArgs as { building_type: string; x: number; y: number };
      return executeBuildBuilding(gameState, aiPlayerId, building_type, Math.floor(x), Math.floor(y));
    }

    case 'create_unit': {
      const { unit_type, building_x, building_y } = toolArgs as { unit_type: string; building_x: number; building_y: number };
      return executeCreateUnit(gameState, aiPlayerId, unit_type, Math.floor(building_x), Math.floor(building_y));
    }

    case 'send_units': {
      const { unit_ids, target_x, target_y, task } = toolArgs as {
        unit_ids: string[];
        target_x: number;
        target_y: number;
        task: string;
      };
      return executeSendUnits(gameState, aiPlayerId, unit_ids, target_x, target_y, task);
    }

    case 'send_message': {
      const { message } = toolArgs as { message: string };
      messages.push(message);
      return {
        newState: gameState,
        result: { success: true, message: `Message sent: "${message}"` },
      };
    }

    case 'advance_age': {
      return executeAdvanceAge(gameState, aiPlayerId);
    }

    case 'wait_ticks': {
      const { ticks } = toolArgs as { ticks: number };
      const clampedTicks = Math.min(100, Math.max(1, ticks));
      return {
        newState: gameState,
        result: { success: true, message: `Waiting ${clampedTicks} ticks` },
        waitTicks: clampedTicks,
      };
    }

    case 'assign_idle_workers': {
      return executeAssignIdleWorkers(gameState, aiPlayerId);
    }

    default:
      return {
        newState: gameState,
        result: { success: false, message: `Unknown tool: ${toolName}` },
      };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AIResponseBody>> {
  console.log('[Agentic AI] POST request received');
  
  try {
    const body: AIRequestBody = await request.json();
    const { gameState, aiPlayerId, previousResponseId } = body;

    console.log('[Agentic AI] Request parsed:', {
      tick: gameState?.tick,
      aiPlayerId,
      hasPreviousResponse: !!previousResponseId,
    });

    if (!gameState || !aiPlayerId) {
      console.error('[Agentic AI] Missing gameState or aiPlayerId');
      return NextResponse.json({
        newState: gameState,
        messages: [],
        error: 'Missing gameState or aiPlayerId',
      }, { status: 400 });
    }

    // Check if AI player exists and isn't defeated
    const aiPlayer = gameState.players.find(p => p.id === aiPlayerId);
    if (!aiPlayer || aiPlayer.isDefeated) {
      return NextResponse.json({
        newState: gameState,
        messages: [],
        error: 'AI player not found or defeated',
      });
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        newState: gameState,
        messages: [],
        error: 'OPENAI_API_KEY not configured',
      }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    const messages: string[] = [];

    // Generate initial game state for context
    const condensedState = generateCondensedGameState(gameState, aiPlayerId);
    
    // Log the state for debugging
    logGameState(gameState.tick, condensedState, 'state');
    
    // Analyze state for recommendations
    const population = condensedState.myPlayer.population;
    const popCap = condensedState.myPlayer.populationCap;
    const isAtPopCap = population >= popCap;
    const foodRate = condensedState.myPlayer.resourceRates.food;
    const metalRate = condensedState.myPlayer.resourceRates.metal;
    const metal = condensedState.myPlayer.resources.metal;
    const idleWorkers = condensedState.myUnits.filter(u => u.type === 'citizen' && (u.task === 'idle' || u.task === 'move')).length;
    const hasMine = condensedState.myBuildings.some(b => b.type === 'mine');
    
    // Find empty tiles for building suggestions
    const emptyTerritory = condensedState.emptyTerritoryTiles?.slice(0, 5) || [];
    const metalDeposits = condensedState.resourceTiles.metalDeposits.slice(0, 3);
    
    // Build the prompt with analysis
    const userMessage = `Current game state (tick ${gameState.tick}):
${JSON.stringify(condensedState, null, 2)}

## IMMEDIATE PRIORITIES:
${isAtPopCap && metal < 100 && !hasMine ? `🚨 NO MINE! Build a MINE at one of these EMPTY tiles: ${emptyTerritory.slice(0, 3).map(t => `(${t.x},${t.y})`).join(', ')} (costs 80 wood, 50 gold)` : ''}
${isAtPopCap && metal >= 100 ? `🚨 POP CAPPED (${population}/${popCap})! Build small_city NOW at: ${emptyTerritory.slice(0, 2).map(t => `(${t.x},${t.y})`).join(', ')}` : ''}
${isAtPopCap && metal < 100 && hasMine ? `⚠️ MINE exists but metal=${metal}/100. Use assign_idle_workers to send workers!` : ''}
${idleWorkers > 0 ? `⚠️ ${idleWorkers} IDLE! Call assign_idle_workers NOW!` : ''}
${metalRate === 0 && hasMine ? '⚠️ MINE but no workers! Use assign_idle_workers!' : ''}

Take action! Use assign_idle_workers, build mine if no metal, taunt opponent!`;

    console.log('[Agentic AI] Calling OpenAI Responses API...');
    
    // Create the response using OpenAI Responses API
    let response = await client.responses.create({
      model: 'gpt-5-mini-2025-08-07',
      instructions: SYSTEM_PROMPT,
      input: userMessage,
      tools: AI_TOOLS,
      tool_choice: 'auto',
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
    });
    
    console.log('[Agentic AI] Initial response received, output items:', response.output?.length || 0);

    let currentState = gameState;
    const maxIterations = 15; // Prevent infinite loops
    let iterations = 0;
    let thoughts = '';
    let aiRequestedWaitTicks = 0; // Track AI's wait_ticks request
    const toolCallLog: Array<{ name: string; success: boolean }> = []; // For logging

    // Process tool calls in a loop
    while (response.output && iterations < maxIterations) {
      iterations++;
      
      const toolCalls = response.output.filter(
        (item): item is OpenAI.Responses.ResponseFunctionToolCall => 
          item.type === 'function_call'
      );

      // Collect any text thoughts (from message type outputs)
      const messageOutputs = response.output.filter(
        (item): item is OpenAI.Responses.ResponseOutputMessage => 
          item.type === 'message'
      );
      if (messageOutputs.length > 0) {
        const textContent = messageOutputs
          .flatMap(m => m.content)
          .filter((c): c is OpenAI.Responses.ResponseOutputText => c.type === 'output_text')
          .map(t => t.text)
          .join('\n');
        if (textContent) {
          thoughts += textContent;
        }
      }

      if (toolCalls.length === 0) {
        // No more tool calls, AI is done
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
        
        console.log(`[Agentic AI] Tool call: ${toolCall.name}`, args);
        
        const { newState, result, waitTicks } = processToolCall(
          toolCall.name,
          args,
          currentState,
          aiPlayerId,
          messages
        );
        
        // Track AI's wait request
        if (waitTicks && waitTicks > 0) {
          aiRequestedWaitTicks = Math.max(aiRequestedWaitTicks, waitTicks);
        }
        
        console.log(`[Agentic AI] Tool result: ${result.success ? '✓' : '✗'} ${result.message}`);
        
        // Log for debugging
        toolCallLog.push({ name: toolCall.name, success: result.success });
        logAIAction(currentState.tick, {
          toolName: toolCall.name,
          args,
          result: { success: result.success, message: result.message },
        });
        
        currentState = newState;
        
        toolResults.push({
          call_id: toolCall.call_id,
          output: JSON.stringify(result),
        });
      }

      // Continue the conversation with tool results
      response = await client.responses.create({
        model: 'gpt-5-mini-2025-08-07',
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
    }

    // Collect final thoughts (from message type outputs)
    const finalMessageOutputs = response.output?.filter(
      (item): item is OpenAI.Responses.ResponseOutputMessage => 
        item.type === 'message'
    ) || [];
    if (finalMessageOutputs.length > 0) {
      const finalTextContent = finalMessageOutputs
        .flatMap(m => m.content)
        .filter((c): c is OpenAI.Responses.ResponseOutputText => c.type === 'output_text')
        .map(t => t.text)
        .join('\n');
      if (finalTextContent) {
        thoughts += '\n' + finalTextContent;
      }
    }

    console.log('[Agentic AI] Turn complete:', {
      iterations,
      messagesCount: messages.length,
      hasThoughts: !!thoughts.trim(),
      waitTicks: aiRequestedWaitTicks,
    });
    
    // Log turn summary for debugging
    logAITurnSummary(gameState.tick, {
      iterations,
      toolCalls: toolCallLog,
      messages,
      thoughts: thoughts.trim(),
      waitTicks: aiRequestedWaitTicks,
    });
    
    return NextResponse.json({
      newState: currentState,
      messages,
      responseId: response.id,
      thoughts: thoughts.trim() || undefined,
      waitTicks: aiRequestedWaitTicks > 0 ? aiRequestedWaitTicks : undefined,
    });

  } catch (error) {
    console.error('[Agentic AI Error]', error);
    
    const body = await request.json().catch(() => ({})) as { gameState?: RoNGameState };
    
    return NextResponse.json({
      newState: body.gameState || ({} as RoNGameState),
      messages: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
