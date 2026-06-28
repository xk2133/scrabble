// ===== 英语棋 Score Calculator =====
import type { BoardState, CellType } from '../types/board';
import type { PlacedTileInput } from '../types/game';
import { BOARD_SIZE } from '../constants/board';
import { placeTilesOnBoard } from './boardUtils';

interface WordScore {
  word: string;
  score: number;
}

interface ScoreResult {
  totalScore: number;
  wordScores: WordScore[];
  isBingo: boolean;
}

const BINGO_BONUS = 50;

function getCellMultiplier(cellType: CellType): { letterMult: number; wordMult: number } {
  switch (cellType) {
    case 'DL': return { letterMult: 2, wordMult: 1 };
    case 'TL': return { letterMult: 3, wordMult: 1 };
    case 'DW': return { letterMult: 1, wordMult: 2 };
    case 'TW': return { letterMult: 1, wordMult: 3 };
    case 'CENTER': return { letterMult: 1, wordMult: 2 };
    default: return { letterMult: 1, wordMult: 1 };
  }
}

function extractFullWord(
  board: BoardState,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  newlyPlaced: Set<string>
): { word: string; cells: Array<{ row: number; col: number; isNew: boolean }> } {
  const cells: Array<{ row: number; col: number; isNew: boolean }> = [];
  let r = row;
  let c = col;

  // Backtrack to start
  while (r - dRow >= 0 && c - dCol >= 0 && r - dRow < BOARD_SIZE && c - dCol < BOARD_SIZE) {
    if (board[r - dRow]?.[c - dCol]?.tile) {
      r -= dRow;
      c -= dCol;
    } else {
      break;
    }
  }

  // Read forward
  const chars: string[] = [];
  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE) {
    const cell = board[r]?.[c];
    if (cell?.tile) {
      chars.push(cell.tile.letter);
      const key = `${r},${c}`;
      cells.push({ row: r, col: c, isNew: newlyPlaced.has(key) });
    } else {
      break;
    }
    r += dRow;
    c += dCol;
  }

  return { word: chars.join(''), cells };
}

export function calculateMoveScore(
  placedTiles: PlacedTileInput[],
  board: BoardState
): ScoreResult {
  if (placedTiles.length === 0) {
    return { totalScore: 0, wordScores: [], isBingo: false };
  }

  const tempBoard = placeTilesOnBoard(board, placedTiles);
  const newlyPlaced = new Set(placedTiles.map(p => `${p.row},${p.col}`));

  // Track which words we've already scored to avoid duplicates
  const scoredWords = new Set<string>();
  const wordScores: WordScore[] = [];

  for (const tile of placedTiles) {
    // Check horizontal word
    const hResult = extractFullWord(tempBoard, tile.row, tile.col, 0, 1, newlyPlaced);
    if (hResult.word.length >= 2 && !scoredWords.has(`H:${hResult.word}`)) {
      scoredWords.add(`H:${hResult.word}`);

      let wordScore = 0;
      let wordMultiplier = 1;
      for (const cell of hResult.cells) {
        if (cell.isNew) {
          const cellType = board[cell.row][cell.col].type;
          const { letterMult, wordMult } = getCellMultiplier(cellType);
          wordScore += (tile.points || 0) * letterMult;
          // Find which placedTile corresponds to this cell
          const pt = placedTiles.find(p => p.row === cell.row && p.col === cell.col);
          if (pt) {
            wordScore = wordScore - (tile.points || 0) * letterMult + (pt.points || 0) * letterMult;
          }
          wordMultiplier *= wordMult;
        } else {
          const boardCell = board[cell.row][cell.col];
          if (boardCell.tile) {
            wordScore += boardCell.tile.points;
          }
        }
      }
      // Recalculate with proper letter points per cell
      wordScore = 0;
      wordMultiplier = 1;
      for (const cell of hResult.cells) {
        if (cell.isNew) {
          const cellType = board[cell.row][cell.col].type;
          const { letterMult, wordMult } = getCellMultiplier(cellType);
          const pt = placedTiles.find(p => p.row === cell.row && p.col === cell.col);
          const points = pt ? pt.points : 0;
          wordScore += points * letterMult;
          wordMultiplier *= wordMult;
        } else {
          const boardCell = board[cell.row][cell.col];
          if (boardCell?.tile) {
            wordScore += boardCell.tile.points;
          }
        }
      }
      wordScore *= wordMultiplier;
      wordScores.push({ word: hResult.word, score: wordScore });
    }

    // Check vertical word
    const vResult = extractFullWord(tempBoard, tile.row, tile.col, 1, 0, newlyPlaced);
    if (vResult.word.length >= 2 && !scoredWords.has(`V:${vResult.word}`)) {
      scoredWords.add(`V:${vResult.word}`);

      let wordScore = 0;
      let wordMultiplier = 1;
      for (const cell of vResult.cells) {
        if (cell.isNew) {
          const cellType = board[cell.row][cell.col].type;
          const { letterMult, wordMult } = getCellMultiplier(cellType);
          const pt = placedTiles.find(p => p.row === cell.row && p.col === cell.col);
          const points = pt ? pt.points : 0;
          wordScore += points * letterMult;
          wordMultiplier *= wordMult;
        } else {
          const boardCell = board[cell.row][cell.col];
          if (boardCell?.tile) {
            wordScore += boardCell.tile.points;
          }
        }
      }
      wordScore *= wordMultiplier;
      wordScores.push({ word: vResult.word, score: wordScore });
    }
  }

  const totalScore = wordScores.reduce((sum, ws) => sum + ws.score, 0);
  const isBingo = placedTiles.length === 7;

  return {
    totalScore: totalScore + (isBingo ? BINGO_BONUS : 0),
    wordScores,
    isBingo,
  };
}
