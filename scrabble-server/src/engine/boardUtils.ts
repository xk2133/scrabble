import {
  Cell,
  TilePlacement,
  BOARD_BONUS_LAYOUT,
} from '../types/game';
import { config } from '../config';

const SIZE = config.boardSize;

/** Create an empty 15x15 board with premium squares */
export function createEmptyBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let row = 0; row < SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < SIZE; col++) {
      board[row][col] = {
        row,
        col,
        tile: null,
        bonus: BOARD_BONUS_LAYOUT[row]?.[col] ?? null,
      };
    }
  }
  return board;
}

/** Place tiles on a deep-copied board and return the new board */
export function placeTiles(board: Cell[][], placements: TilePlacement[]): Cell[][] {
  const newBoard = cloneBoard(board);
  for (const p of placements) {
    newBoard[p.row][p.col].tile = {
      letter: p.letter,
      points: p.points,
      playerId: '', // set by caller
    };
    // Clear bonus after first use
    newBoard[p.row][p.col].bonus = null;
  }
  return newBoard;
}

/** Deep-clone the board */
export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map(row =>
    row.map(cell => ({
      ...cell,
      tile: cell.tile ? { ...cell.tile } : null,
    }))
  );
}

/**
 * Check if placements are valid:
 * 1. All tiles must be in the same row or same column
 * 2. Tiles must be contiguous (no gaps between placed tiles that land on empty cells)
 * 3. Must connect to existing tiles on board (or include center on first move)
 * 4. No overlapping existing tiles
 */
export function isValidPlacement(board: Cell[][], placements: TilePlacement[]): { valid: boolean; reason?: string } {
  if (placements.length === 0) {
    return { valid: false, reason: 'No tiles placed' };
  }

  // Check no overlapping existing tiles
  for (const p of placements) {
    if (p.row < 0 || p.row >= SIZE || p.col < 0 || p.col >= SIZE) {
      return { valid: false, reason: `Position (${p.row},${p.col}) is out of bounds` };
    }
    if (board[p.row][p.col].tile !== null) {
      return { valid: false, reason: `Position (${p.row},${p.col}) already has a tile` };
    }
  }

  // Check same row or same column
  const rows = new Set(placements.map(p => p.row));
  const cols = new Set(placements.map(p => p.col));
  const isHorizontal = rows.size === 1;
  const isVertical = cols.size === 1;

  if (!isHorizontal && !isVertical) {
    return { valid: false, reason: 'Tiles must be placed in the same row or same column' };
  }

  // Check contiguity: all cells between the min and max must have tiles (existing or new)
  if (isHorizontal) {
    const row = placements[0].row;
    const minCol = Math.min(...placements.map(p => p.col));
    const maxCol = Math.max(...placements.map(p => p.col));
    for (let c = minCol; c <= maxCol; c++) {
      const isPlaced = placements.some(p => p.col === c);
      const hasExistingTile = board[row][c].tile !== null;
      if (!isPlaced && !hasExistingTile) {
        return { valid: false, reason: 'Tiles must be placed contiguously without gaps' };
      }
    }
  } else {
    const col = placements[0].col;
    const minRow = Math.min(...placements.map(p => p.row));
    const maxRow = Math.max(...placements.map(p => p.row));
    for (let r = minRow; r <= maxRow; r++) {
      const isPlaced = placements.some(p => p.row === r);
      const hasExistingTile = board[r][col].tile !== null;
      if (!isPlaced && !hasExistingTile) {
        return { valid: false, reason: 'Tiles must be placed contiguously without gaps' };
      }
    }
  }

  // Check connection to existing tiles or center on first move
  const isFirstMove = isBoardEmpty(board);
  if (isFirstMove) {
    const coversCenter = placements.some(p => p.row === 7 && p.col === 7);
    if (!coversCenter) {
      return { valid: false, reason: 'First move must cover the center star (row 7, col 7)' };
    }
  } else {
    const isConnected = placements.some(p => hasAdjacentTile(board, p.row, p.col));
    if (!isConnected) {
      return { valid: false, reason: 'Placements must connect to existing tiles on the board' };
    }
  }

  return { valid: true };
}

/** Check if the board has any tiles placed */
export function isBoardEmpty(board: Cell[][]): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col].tile !== null) {
        return false;
      }
    }
  }
  return true;
}

/** Check if a cell is adjacent (horizontally or vertically) to an existing tile */
function hasAdjacentTile(board: Cell[][], row: number, col: number): boolean {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c].tile !== null) {
      return true;
    }
  }
  return false;
}

/**
 * Build a string representation of the board state for debugging.
 */
export function boardToString(board: Cell[][]): string {
  const lines: string[] = [];
  for (let row = 0; row < SIZE; row++) {
    const line = board[row]
      .map(cell => (cell.tile ? cell.tile.letter : '.'))
      .join(' ');
    lines.push(`${String(row).padStart(2)} ${line}`);
  }
  return lines.join('\n');
}
