// ===== 英语棋 Board Types =====

/** Type of premium cell on the board */
export type CellType = 'NORMAL' | 'DW' | 'TW' | 'DL' | 'TL' | 'CENTER';

/** A tile that has been placed on the board */
export interface PlacedTile {
  letter: string;
  points: number;
  isBlank: boolean;
}

/** A single cell on the 15x15 game board */
export interface Cell {
  row: number;
  col: number;
  type: CellType;
  tile: PlacedTile | null;
}

/** The full board is a 15x15 grid of cells */
export type BoardState = Cell[][];

/** Standard board size */
export const BOARD_SIZE = 15;

/** Center position on the 15x15 board (0-indexed) */
export const CENTER_POSITION = { row: 7, col: 7 };

/**
 * Letter point values in standard English Scrabble
 */
export const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10,
  R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

/**
 * Letter distribution (tile count) in standard Scrabble
 */
export const LETTER_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2,
  I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2,
  Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1,
  Y: 2, Z: 1,
};

/** Number of blank tiles in the bag */
export const BLANK_COUNT = 2;

/**
 * Premium cell positions for a standard 15x15 Scrabble board.
 */
const TW_CELLS: [number, number][] = [
  [0, 0], [0, 7], [0, 14],
  [7, 0], [7, 14],
  [14, 0], [14, 7], [14, 14],
];

const DW_CELLS: [number, number][] = [
  [1, 1], [2, 2], [3, 3], [4, 4],
  [1, 13], [2, 12], [3, 11], [4, 10],
  [10, 4], [11, 3], [12, 2], [13, 1],
  [10, 10], [11, 11], [12, 12], [13, 13],
];

const TL_CELLS: [number, number][] = [
  [1, 5], [1, 9],
  [5, 1], [5, 5], [5, 9], [5, 13],
  [9, 1], [9, 5], [9, 9], [9, 13],
  [13, 5], [13, 9],
];

const DL_CELLS: [number, number][] = [
  [0, 3], [0, 11],
  [2, 6], [2, 8],
  [3, 0], [3, 7], [3, 14],
  [6, 2], [6, 6], [6, 8], [6, 12],
  [7, 3], [7, 11],
  [8, 2], [8, 6], [8, 8], [8, 12],
  [11, 0], [11, 7], [11, 14],
  [12, 6], [12, 8],
  [14, 3], [14, 11],
];

function buildPremiumMap(): Map<string, CellType> {
  const map = new Map<string, CellType>();
  for (const [r, c] of TW_CELLS) map.set(`${r},${c}`, 'TW');
  for (const [r, c] of DW_CELLS) map.set(`${r},${c}`, 'DW');
  for (const [r, c] of TL_CELLS) map.set(`${r},${c}`, 'TL');
  for (const [r, c] of DL_CELLS) map.set(`${r},${c}`, 'DL');
  map.set(`${CENTER_POSITION.row},${CENTER_POSITION.col}`, 'CENTER');
  return map;
}

const premiumMap = buildPremiumMap();

/** Get the cell type for a given position */
export function getCellType(row: number, col: number): CellType {
  return premiumMap.get(`${row},${col}`) ?? 'NORMAL';
}

/** Create an empty board with premium cells */
export function createBoard(): BoardState {
  const board: BoardState = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      rowCells.push({
        row,
        col,
        type: getCellType(row, col),
        tile: null,
      });
    }
    board.push(rowCells);
  }
  return board;
}
