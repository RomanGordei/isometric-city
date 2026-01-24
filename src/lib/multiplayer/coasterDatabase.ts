// Supabase database functions for IsoCoaster multiplayer game state persistence
// Uses the same game_rooms table as IsoCity but with coaster-specific state

import { createClient } from '@supabase/supabase-js';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { GameState } from '@/games/coaster/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Lazy init: only create client when Supabase is configured
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Maximum park size limit for Supabase storage (20MB)
const MAX_PARK_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export class ParkSizeLimitError extends Error {
  public readonly sizeBytes: number;
  public readonly limitBytes: number;
  
  constructor(sizeBytes: number, limitBytes: number = MAX_PARK_SIZE_BYTES) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    const limitMB = (limitBytes / (1024 * 1024)).toFixed(0);
    super(`Park size (${sizeMB}MB) exceeds maximum allowed size (${limitMB}MB)`);
    this.name = 'ParkSizeLimitError';
    this.sizeBytes = sizeBytes;
    this.limitBytes = limitBytes;
  }
}

/**
 * Check if compressed data exceeds the size limit
 * @throws ParkSizeLimitError if size exceeds limit
 */
function checkParkSize(compressed: string): void {
  const sizeBytes = compressed.length;
  if (sizeBytes > MAX_PARK_SIZE_BYTES) {
    throw new ParkSizeLimitError(sizeBytes);
  }
}

/**
 * Compress state for database storage
 * Uses synchronous compression (worker-based compression can be added later if needed)
 */
function compressState(state: GameState): string {
  const json = JSON.stringify(state);
  return compressToEncodedURIComponent(json);
}

export interface CoasterGameRoomRow {
  room_code: string;
  city_name: string; // Using city_name for compatibility with existing table
  game_state: string; // Compressed
  created_at: string;
  updated_at: string;
  player_count: number;
}

/**
 * Create a new coaster game room in the database
 * @throws ParkSizeLimitError if the park size exceeds the maximum allowed size
 */
export async function createCoasterGameRoom(
  roomCode: string,
  parkName: string,
  gameState: GameState
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const compressed = compressState(gameState);
    
    // Check if park size exceeds limit before saving
    checkParkSize(compressed);
    
    const { error } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode.toUpperCase(),
        city_name: parkName, // Re-using city_name column for park name
        game_state: compressed,
        player_count: 1,
      });

    if (error) {
      console.error('[Coaster Database] Failed to create room:', error);
      return false;
    }

    return true;
  } catch (e) {
    if (e instanceof ParkSizeLimitError) {
      throw e;
    }
    console.error('[Coaster Database] Error creating room:', e);
    return false;
  }
}

/**
 * Load coaster game state from a room
 */
export async function loadCoasterGameRoom(
  roomCode: string
): Promise<{ gameState: GameState; parkName: string } | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('game_state, city_name')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (error || !data) {
      console.error('[Coaster Database] Failed to load room:', error);
      return null;
    }

    const decompressed = decompressFromEncodedURIComponent(data.game_state);
    if (!decompressed) {
      console.error('[Coaster Database] Failed to decompress state');
      return null;
    }

    const gameState = JSON.parse(decompressed) as GameState;
    return { gameState, parkName: data.city_name };
  } catch (e) {
    console.error('[Coaster Database] Error loading room:', e);
    return null;
  }
}

/**
 * Update coaster game state in a room
 * @throws ParkSizeLimitError if the park size exceeds the maximum allowed size
 */
export async function updateCoasterGameRoom(
  roomCode: string,
  gameState: GameState
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const compressed = compressState(gameState);
    
    // Check if park size exceeds limit before saving
    checkParkSize(compressed);
    
    const { error } = await supabase
      .from('game_rooms')
      .update({ game_state: compressed })
      .eq('room_code', roomCode.toUpperCase());

    if (error) {
      console.error('[Coaster Database] Failed to update room:', error);
      return false;
    }

    return true;
  } catch (e) {
    if (e instanceof ParkSizeLimitError) {
      throw e;
    }
    console.error('[Coaster Database] Error updating room:', e);
    return false;
  }
}

/**
 * Update player count for a coaster room
 */
export async function updateCoasterPlayerCount(
  roomCode: string,
  count: number
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('game_rooms')
      .update({ player_count: count })
      .eq('room_code', roomCode.toUpperCase());
  } catch (e) {
    console.error('[Coaster Database] Error updating player count:', e);
  }
}
