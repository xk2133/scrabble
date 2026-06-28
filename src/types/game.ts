// ===== 英语棋 Game Types =====

import type { BoardState } from './board';
import type { Tile } from './tile';

/** Current phase of the game */
export type GamePhase = 'WAITING' | 'PLAYING' | 'ENDED';

/** Game mode: against AI or another player */
export type GameMode = 'AI' | 'PVP';

/** AI difficulty levels */
export type AIDifficulty = 'EASY' | 'MEDIUM';

/** Game variant: fast-play (60 tiles, 150-pt target) or standard (100 tiles) */
export type GameVariant = 'FAST' | 'STANDARD';

/** A player in the game */
export interface Player {
  id: string;
  name: string;
  score: number;
  rack: Tile[];
  isAI: boolean;
}

/** Result of a move validation */
export interface MoveResult {
  valid: boolean;
  score: number;
  wordsFormed: string[];
  errorMessage?: string;
}

/** Full game state */
export interface GameState {
  board: BoardState;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  mode: GameMode;
  variant: GameVariant;
  aiDifficulty?: AIDifficulty;
  turnNumber: number;
  lastMoveWords?: string[];
  lastMoveScore?: number;
  tileBagRemaining: number;
  wordsHistory: string[];
}

/** Input data for placing a tile on the board */
export interface PlacedTileInput {
  row: number;
  col: number;
  letter: string;
  points: number;
  isBlank?: boolean;
}

/** Number of tiles each player starts with */
export const RACK_SIZE = 7;

/** Bingo bonus: using all 7 tiles in one move */
export const BINGO_BONUS = 50;

/** Target score for fast-play variant: first player to reach this wins */
export const WINNING_SCORE = 150;

/** Turn timer in seconds */
export const TURN_TIME_SECONDS = 60;
