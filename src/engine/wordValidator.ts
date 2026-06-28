// ===== 英语棋 Word Validator (with Trie) =====
import type { BoardState } from '../types/board';
import type { PlacedTileInput } from '../types/game';
import type { Trie } from './trie';
import { BOARD_SIZE, CENTER_INDEX } from '../constants/board';
import { isBoardEmpty, placeTilesOnBoard } from './boardUtils';

export interface ValidationResult {
  valid: boolean;
  words: string[];
  errorMessage?: string;
}

function coversCenter(placements: PlacedTileInput[]): boolean {
  return placements.some(p => p.row === CENTER_INDEX && p.col === CENTER_INDEX);
}

function isAdjacentToExisting(
  board: BoardState,
  placements: PlacedTileInput[]
): boolean {
  for (const p of placements) {
    const neighbors = [
      [p.row - 1, p.col], [p.row + 1, p.col],
      [p.row, p.col - 1], [p.row, p.col + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc].tile && !placements.some(pp => pp.row === nr && pp.col === nc)) {
          return true;
        }
      }
    }
  }
  return false;
}

function extractWordFromBoard(
  board: BoardState,
  row: number,
  col: number,
  dRow: number,
  dCol: number
): string {
  const chars: string[] = [];
  let r = row;
  let c = col;
  // Go to start
  while (r - dRow >= 0 && c - dCol >= 0 && r - dRow < BOARD_SIZE && c - dCol < BOARD_SIZE) {
    const cell = board[r - dRow]?.[c - dCol];
    if (cell?.tile) {
      r -= dRow;
      c -= dCol;
    } else {
      break;
    }
  }
  // Read forward
  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE) {
    const cell = board[r]?.[c];
    if (cell?.tile) {
      chars.push(cell.tile.letter);
    } else {
      break;
    }
    r += dRow;
    c += dCol;
  }
  return chars.join('');
}

export function validateWords(
  placedTiles: PlacedTileInput[],
  board: BoardState,
  trie: Trie
): ValidationResult {
  if (placedTiles.length === 0) {
    return { valid: false, words: [], errorMessage: '请先在棋盘上放置字母' };
  }

  // Check collinearity (same row or same column)
  if (placedTiles.length > 1) {
    const rows = new Set(placedTiles.map(p => p.row));
    const cols = new Set(placedTiles.map(p => p.col));
    if (rows.size > 1 && cols.size > 1) {
      return { valid: false, words: [], errorMessage: '字母块必须在同一行或同一列上' };
    }
  }

  // Check consecutiveness (with board tiles filling gaps)
  if (placedTiles.length > 1) {
    const sameRow = new Set(placedTiles.map(p => p.row)).size === 1;
    if (sameRow) {
      const rowStart = Math.min(...placedTiles.map(p => p.col));
      const rowEnd = Math.max(...placedTiles.map(p => p.col));
      const row = placedTiles[0].row;
      for (let c = rowStart; c <= rowEnd; c++) {
        const hasPlaced = placedTiles.some(p => p.col === c);
        const hasBoard = board[row]?.[c]?.tile;
        if (!hasPlaced && !hasBoard) {
          return { valid: false, words: [], errorMessage: '字母块必须连续放置，中间不能有空隙' };
        }
      }
    } else {
      const colStart = Math.min(...placedTiles.map(p => p.row));
      const colEnd = Math.max(...placedTiles.map(p => p.row));
      const col = placedTiles[0].col;
      for (let r = colStart; r <= colEnd; r++) {
        const hasPlaced = placedTiles.some(p => p.row === r);
        const hasBoard = board[r]?.[col]?.tile;
        if (!hasPlaced && !hasBoard) {
          return { valid: false, words: [], errorMessage: '字母块必须连续放置，中间不能有空隙' };
        }
      }
    }
  }

  // First move must cover center
  if (isBoardEmpty(board) && !coversCenter(placedTiles)) {
    return { valid: false, words: [], errorMessage: '第一个单词必须经过中心星形格子 (8H)' };
  }

  // Must be adjacent to existing tiles (after first move)
  if (!isBoardEmpty(board) && !isAdjacentToExisting(board, placedTiles)) {
    return { valid: false, words: [], errorMessage: '字母块必须与已有单词相连' };
  }

  // Create temp board with placed tiles
  const tempBoard = placeTilesOnBoard(board, placedTiles);

  // Find all words formed
  const wordsFormed = new Set<string>();
  for (const tile of placedTiles) {
    const hWord = extractWordFromBoard(tempBoard, tile.row, tile.col, 0, 1);
    if (hWord.length >= 2) wordsFormed.add(hWord);
    const vWord = extractWordFromBoard(tempBoard, tile.row, tile.col, 1, 0);
    if (vWord.length >= 2) wordsFormed.add(vWord);
  }

  if (wordsFormed.size === 0) {
    return { valid: false, words: [], errorMessage: '未形成有效单词，请尝试不同的放置方式' };
  }

  // Validate each word against trie
  const invalidWords: string[] = [];
  for (const word of wordsFormed) {
    if (!trie.search(word)) {
      invalidWords.push(word);
    }
  }

  if (invalidWords.length > 0) {
    return {
      valid: false,
      words: [],
      errorMessage: `"${invalidWords.join('", "')}" 不是有效的英语单词`,
    };
  }

  return { valid: true, words: Array.from(wordsFormed) };
}
