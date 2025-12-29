/**
 * Debug logger for AI development
 * Writes game state and AI decisions to /tmp for analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import { RoNGameState } from '../types/game';
import { CondensedGameState } from './aiTools';

const LOG_DIR = '/tmp/ron-ai-debug';
const MAX_LOG_FILES = 50; // Keep last 50 snapshots

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Clean old log files
function cleanOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(LOG_DIR, f),
        time: fs.statSync(path.join(LOG_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);
    
    // Remove files beyond MAX_LOG_FILES
    files.slice(MAX_LOG_FILES).forEach(f => {
      fs.unlinkSync(f.path);
    });
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Log a game state snapshot
 */
export function logGameState(
  tick: number,
  condensedState: CondensedGameState,
  label: string = 'state'
) {
  ensureLogDir();
  cleanOldLogs();
  
  const filename = `${String(tick).padStart(8, '0')}-${label}.json`;
  const filepath = path.join(LOG_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(condensedState, null, 2));
  console.log(`[Debug] Wrote state to ${filepath}`);
}

/**
 * Log AI decision/action
 */
export function logAIAction(
  tick: number,
  action: {
    toolName: string;
    args: Record<string, unknown>;
    result: { success: boolean; message: string };
  }
) {
  ensureLogDir();
  
  const logFile = path.join(LOG_DIR, 'actions.log');
  const line = `[${new Date().toISOString()}] tick=${tick} tool=${action.toolName} args=${JSON.stringify(action.args)} result=${action.result.success ? '✓' : '✗'} ${action.result.message}\n`;
  
  fs.appendFileSync(logFile, line);
}

/**
 * Log AI turn summary
 */
export function logAITurnSummary(
  tick: number,
  summary: {
    iterations: number;
    toolCalls: Array<{ name: string; success: boolean }>;
    messages: string[];
    thoughts: string;
    waitTicks?: number;
  }
) {
  ensureLogDir();
  
  const filename = `${String(tick).padStart(8, '0')}-turn-summary.json`;
  const filepath = path.join(LOG_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify({
    tick,
    timestamp: new Date().toISOString(),
    ...summary,
  }, null, 2));
}

/**
 * Get latest game state from logs (for debugging)
 */
export function getLatestLoggedState(): CondensedGameState | null {
  ensureLogDir();
  
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('-state.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) return null;
    
    const content = fs.readFileSync(path.join(LOG_DIR, files[0]), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write full game state (for deep debugging)
 */
export function logFullGameState(state: RoNGameState) {
  ensureLogDir();
  
  const filename = `full-state-${state.tick}.json`;
  const filepath = path.join(LOG_DIR, filename);
  
  // Create a simplified version (full state is too big)
  const simplified = {
    tick: state.tick,
    players: state.players.map(p => ({
      id: p.id,
      type: p.type,
      age: p.age,
      resources: p.resources,
      population: p.population,
      populationCap: p.populationCap,
      isDefeated: p.isDefeated,
    })),
    units: state.units.map(u => ({
      id: u.id,
      type: u.type,
      ownerId: u.ownerId,
      x: u.x,
      y: u.y,
      health: u.health,
      task: u.task,
    })),
    buildingCount: state.grid.flat().filter(t => t.building).length,
    gridSize: state.gridSize,
  };
  
  fs.writeFileSync(filepath, JSON.stringify(simplified, null, 2));
  console.log(`[Debug] Wrote full state to ${filepath}`);
}
