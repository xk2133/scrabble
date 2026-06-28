// ===== Board & Tiles =====

/** Cell on the 15x15 board */
export interface Cell {
  row: number;
  col: number;
  tile: PlacedTile | null;
  /** Special square multiplier: 2L, 3L, 2W, 3W, or null for normal */
  bonus: BonusType | null;
}

export type BonusType = '2L' | '3L' | '2W' | '3W' | 'star';

export interface PlacedTile {
  letter: string;
  points: number;
  /** Which player placed this tile */
  playerId: string;
}

export interface RackTile {
  letter: string;
  points: number;
}

// ===== Player =====

export type PlayerStatus = 'online' | 'offline' | 'disconnected';

export interface Player {
  id: string;
  name: string;
  rack: RackTile[];
  score: number;
  status: PlayerStatus;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  /** Number of turns missed (for auto-skip tracking) */
  missedTurns: number;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

// ===== Game Phase =====

export type GamePhase =
  | 'lobby'           // waiting for players
  | 'playing'         // active game
  | 'finished';       // game over

// ===== Placement =====

/** A placement action: put a tile at a specific board position */
export interface TilePlacement {
  row: number;
  col: number;
  letter: string;
  points: number;
}

export interface ScoredWord {
  word: string;
  score: number;
  cells: Array<{ row: number; col: number }>;
}

export interface ScoreResult {
  totalScore: number;
  wordScores: ScoredWord[];
  isBingo: boolean;
}

// ===== Move =====

export type MoveType = 'place' | 'swap' | 'skip';

export interface Move {
  type: MoveType;
  playerId: string;
  placements: TilePlacement[];
  /** Tiles returned to bag (for swap moves) */
  returnedTiles?: RackTile[];
  /** Computed after validation */
  score?: number;
  words?: string[];
}

export interface AIMove extends Move {
  /** Score used for ranking moves */
  score: number;
  /** Words formed by this move */
  words: string[];
}

// ===== Room & Game State =====

export interface Room {
  roomCode: string;
  players: Player[];
  gameState: GameState | null;
  phase: GamePhase;
  createdAt: number;
  /** Socket IDs mapped to player IDs */
  playerSockets: Map<string, string>;
  /** Player ID whose turn it is */
  currentPlayerId: string | null;
  /** Timeout handle for turn timer */
  turnTimeout: NodeJS.Timeout | null;
  /** Timeout handle for room cleanup */
  roomTimeout: NodeJS.Timeout | null;
  /** First move flag (no center-star constraint after first move) */
  firstMove: boolean;
  /** Consecutive skip/pass counter (6 = game over) */
  consecutivePasses: number;
}

export interface GameState {
  board: Cell[][];
  tileBag: RackTile[];
  /** History of moves for undo/validation */
  moveHistory: Move[];
  turnNumber: number;
  lastMove: Move | null;
}

// ===== Standard Scrabble Constants =====

/** Letter point values (English Scrabble) */
export const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

/** Standard tile distribution (100 tiles) */
export const TILE_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9,
  J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6,
  S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
};

/** Premium square layout (15x15). null = normal, or bonus type. */
export const BOARD_BONUS_LAYOUT: Array<Array<BonusType | null>> = [
  // Row 0
  ['3W', null, null, '2L', null, null, null, '3W', null, null, null, '2L', null, null, '3W'],
  // Row 1
  [null, '2W', null, null, null, '3L', null, null, null, '3L', null, null, null, '2W', null],
  // Row 2
  [null, null, '2W', null, null, null, '2L', null, '2L', null, null, null, '2W', null, null],
  // Row 3
  ['2L', null, null, '2W', null, null, null, '2L', null, null, null, '2W', null, null, '2L'],
  // Row 4
  [null, null, null, null, '2W', null, null, null, null, null, '2W', null, null, null, null],
  // Row 5
  [null, '3L', null, null, null, '3L', null, null, null, '3L', null, null, null, '3L', null],
  // Row 6
  [null, null, '2L', null, null, null, '2L', null, '2L', null, null, null, '2L', null, null],
  // Row 7
  ['3W', null, null, '2L', null, null, null, 'star', null, null, null, '2L', null, null, '3W'],
  // Row 8
  [null, null, '2L', null, null, null, '2L', null, '2L', null, null, null, '2L', null, null],
  // Row 9
  [null, '3L', null, null, null, '3L', null, null, null, '3L', null, null, null, '3L', null],
  // Row 10
  [null, null, null, null, '2W', null, null, null, null, null, '2W', null, null, null, null],
  // Row 11
  ['2L', null, null, '2W', null, null, null, '2L', null, null, null, '2W', null, null, '2L'],
  // Row 12
  [null, null, '2W', null, null, null, '2L', null, '2L', null, null, null, '2W', null, null],
  // Row 13
  [null, '2W', null, null, null, '3L', null, null, null, '3L', null, null, null, '2W', null],
  // Row 14
  ['3W', null, null, '2L', null, null, null, '3W', null, null, null, '2L', null, null, '3W'],
];

/** Off-board sentinel for anchor detection */
export const OFF_BOARD = -1;
