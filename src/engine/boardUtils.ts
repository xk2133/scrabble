import type { BoardState, Cell, CellType } from '../types/board';
import type { PlacedTileInput } from '../types/game';
import { BOARD_SIZE, SPECIAL_CELLS } from '../constants/board';

export function createEmptyBoard(): BoardState {
  const board: BoardState = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const key = `${row},${col}`;
      const type: CellType = (SPECIAL_CELLS[key] as CellType) || 'NORMAL';
      rowCells.push({ row, col, type, tile: null });
    }
    board.push(rowCells);
  }
  return board;
}

export function getCellType(row: number, col: number): CellType {
  const key = `${row},${col}`;
  return (SPECIAL_CELLS[key] as CellType) || 'NORMAL';
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map(row =>
    row.map(cell => ({
      ...cell,
      tile: cell.tile ? { ...cell.tile } : null,
    }))
  );
}

export function placeTilesOnBoard(board: BoardState, tiles: PlacedTileInput[]): BoardState {
  const newBoard = cloneBoard(board);
  for (const tile of tiles) {
    if (newBoard[tile.row]?.[tile.col]) {
      newBoard[tile.row][tile.col].tile = {
        letter: tile.letter,
        points: tile.points,
        isBlank: tile.isBlank || false,
      };
    }
  }
  return newBoard;
}

export function canPlaceTile(row: number, col: number, board: BoardState): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  return board[row][col].tile === null;
}

export function isBoardEmpty(board: BoardState): boolean {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c].tile !== null) return false;
  return true;
}

export function getAdjacentCells(row: number, col: number, board: BoardState): Cell[] {
  const adjacent: Cell[] = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE)
      adjacent.push(board[nr][nc]);
  }
  return adjacent;
}
