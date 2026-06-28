import {
  Cell,
  TilePlacement,
  ScoreResult,
  ScoredWord,
  LETTER_POINTS,
  BOARD_BONUS_LAYOUT,
  BonusType,
} from '../types/game';
import { config } from '../config';

/**
 * Calculate score for a set of tile placements on the board.
 * Handles premium squares and bingo bonus.
 */
export function calculateScore(
  board: Cell[][],
  placements: TilePlacement[]
): ScoreResult {
  const wordScores: ScoredWord[] = [];
  let totalScore = 0;
  let totalTilesPlaced = placements.length;

  // Find all words formed by these placements
  const words = findFormedWords(board, placements);

  for (const word of words) {
    let wordScore = 0;
    let wordMultiplier = 1;
    const cells: Array<{ row: number; col: number }> = [];

    for (const cell of word.cells) {
      const placement = placements.find(p => p.row === cell.row && p.col === cell.col);
      let letterPoints = cell.points;

      if (placement) {
        // This cell has a newly placed tile — check premium squares
        const bonus = getBonusAt(cell.row, cell.col);
        if (bonus === '2L') {
          letterPoints *= 2;
        } else if (bonus === '3L') {
          letterPoints *= 3;
        } else if (bonus === '2W') {
          wordMultiplier *= 2;
        } else if (bonus === '3W') {
          wordMultiplier *= 3;
        } else if (bonus === 'star') {
          // Center star: double word score on first move
          wordMultiplier *= 2;
        }
      }

      wordScore += letterPoints;
      cells.push({ row: cell.row, col: cell.col });
    }

    wordScore *= wordMultiplier;
    totalScore += wordScore;

    wordScores.push({
      word: word.text,
      score: wordScore,
      cells,
    });
  }

  // Check for Bingo (all 7 tiles used in one turn)
  const isBingo = totalTilesPlaced === 7;
  if (isBingo) {
    totalScore += config.bingoBonus;
  }

  return {
    totalScore,
    wordScores,
    isBingo,
  };
}

interface FormedWord {
  text: string;
  cells: Array<{ row: number; col: number; points: number }>;
}

/**
 * Find all new words formed by placing the given tiles.
 * A placement can form horizontal and vertical words simultaneously.
 */
function findFormedWords(
  board: Cell[][],
  placements: TilePlacement[]
): FormedWord[] {
  const words: FormedWord[] = [];
  const size = config.boardSize;

  // Determine direction: if all placements share the same row, it's horizontal;
  // if all share the same column, it's vertical.
  const rows = new Set(placements.map(p => p.row));
  const cols = new Set(placements.map(p => p.col));

  const isHorizontal = rows.size === 1;
  const isVertical = cols.size === 1;

  if (isHorizontal) {
    const row = placements[0].row;
    // Find the main word along this row
    const mainWord = extractWordAt(board, placements, row, null, 'horizontal');
    if (mainWord && mainWord.text.length >= 2) {
      words.push(mainWord);
    }
    // For each placement, check vertical cross-words
    for (const p of placements) {
      const crossWord = extractWordAt(board, placements, null, p.col, 'vertical');
      if (crossWord && crossWord.text.length >= 2) {
        words.push(crossWord);
      }
    }
  } else if (isVertical) {
    const col = placements[0].col;
    const mainWord = extractWordAt(board, placements, null, col, 'vertical');
    if (mainWord && mainWord.text.length >= 2) {
      words.push(mainWord);
    }
    for (const p of placements) {
      const crossWord = extractWordAt(board, placements, p.row, null, 'horizontal');
      if (crossWord && crossWord.text.length >= 2) {
        words.push(crossWord);
      }
    }
  }

  return words;
}

/**
 * Extract the full word formed along a given row or column.
 * Pass exactly one of `row` or `col`.
 */
function extractWordAt(
  board: Cell[][],
  placements: TilePlacement[],
  row: number | null,
  col: number | null,
  direction: 'horizontal' | 'vertical'
): FormedWord | null {
  const size = config.boardSize;

  // Build a temporary board with placements applied
  const tempBoard: Array<Array<{ letter: string; points: number } | null>> = Array.from(
    { length: size },
    (_, r) =>
      Array.from({ length: size }, (__, c) => {
        if (board[r][c].tile) {
          return { letter: board[r][c].tile!.letter, points: board[r][c].tile!.points };
        }
        return null;
      })
  );

  for (const p of placements) {
    tempBoard[p.row][p.col] = { letter: p.letter, points: p.points };
  }

  // Determine the anchor
  const anchorRow = row !== null ? row : (placements.length > 0 ? placements[0].row : 0);
  const anchorCol = col !== null ? col : (placements.length > 0 ? placements[0].col : 0);

  if (row !== null && direction === 'horizontal') {
    // Must be on the row where placements are
    if (!tempBoard[row][anchorCol]) return null;
  }

  let start = direction === 'horizontal' ? anchorCol : anchorRow;
  let end = start;

  // Scan left/up to find word start
  while (start > 0) {
    const prev = start - 1;
    const cell = direction === 'horizontal'
      ? tempBoard[anchorRow][prev]
      : tempBoard[prev][anchorCol];
    if (cell) {
      start = prev;
    } else {
      break;
    }
  }

  // Scan right/down to find word end
  const max = size - 1;
  while (end < max) {
    const next = end + 1;
    const cell = direction === 'horizontal'
      ? tempBoard[anchorRow][next]
      : tempBoard[next][anchorCol];
    if (cell) {
      end = next;
    } else {
      break;
    }
  }

  if (start === end) {
    return null; // single letter, not a word
  }

  // Build the word
  const cells: Array<{ row: number; col: number; points: number }> = [];
  let text = '';

  for (let i = start; i <= end; i++) {
    const r = direction === 'horizontal' ? anchorRow : i;
    const c = direction === 'horizontal' ? i : anchorCol;
    const cell = tempBoard[r][c];
    if (cell) {
      text += cell.letter;
      cells.push({ row: r, col: c, points: cell.points });
    }
  }

  return { text, cells };
}

function getBonusAt(row: number, col: number): BonusType | null {
  return BOARD_BONUS_LAYOUT[row]?.[col] ?? null;
}
