// ===== 英语棋 AI Move Generator =====
// Ported from backend AI, adapted for frontend types and Trie-based dictionary.
//
// Algorithm: anchor-based DFS with prefix pruning.
// For each anchor point (empty cell adjacent to existing tiles),
// generates all valid horizontal and vertical word placements.

import type { BoardState } from '../types/board';
import type { Tile } from '../types/tile';
import type { PlacedTileInput } from '../types/game';
import type { AIMove } from './aiTypes';
import type { Trie } from './trie';
import { BOARD_SIZE, CENTER_INDEX } from '../constants/board';
import { LETTER_POINTS } from '../constants/tiles';
import { isBoardEmpty } from './boardUtils';
import { calculateMoveScore } from './scoreCalculator';

const SIZE = BOARD_SIZE;

/**
 * Generate all valid moves for the given rack and board.
 * Returns moves sorted by score descending.
 */
export function generateMovesOptimized(
  board: BoardState,
  rack: Tile[],
  trie: Trie,
  maxMoves: number = 300
): AIMove[] {
  const moves: AIMove[] = [];

  if (isBoardEmpty(board)) {
    return generateFirstMoveWords(rack, board, trie, maxMoves);
  }

  const anchors = findAnchors(board);

  for (const anchor of anchors) {
    if (moves.length >= maxMoves) break;
    generateAnchorMoves(board, rack, anchor, 'horizontal', trie, moves, maxMoves);
    if (moves.length >= maxMoves) break;
    generateAnchorMoves(board, rack, anchor, 'vertical', trie, moves, maxMoves);
  }

  const uniqueMoves = deduplicateMoves(moves);
  uniqueMoves.sort((a, b) => b.score - a.score);
  return uniqueMoves.slice(0, maxMoves);
}

/** Find anchor positions: empty cells adjacent to any existing tile */
function findAnchors(board: BoardState): Array<{ row: number; col: number }> {
  const anchors: Array<{ row: number; col: number }> = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col].tile !== null) continue;

      let adjacent = false;
      for (const [dr, dc] of dirs) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c].tile !== null) {
          adjacent = true;
          break;
        }
      }

      if (adjacent) {
        anchors.push({ row, col });
      }
    }
  }

  return anchors;
}

/** Generate moves for the first turn — word must cross center star */
function generateFirstMoveWords(
  rack: Tile[],
  board: BoardState,
  trie: Trie,
  maxMoves: number
): AIMove[] {
  const moves: AIMove[] = [];
  const letters = rack.map(t => t.letter);
  const center = CENTER_INDEX;

  // Generate all combinations of rack letters (subsets from 2 to rack.length)
  for (let len = 2; len <= letters.length; len++) {
    const combos = getCombinations(letters, len);
    for (const combo of combos) {
      const perms = getPermutations(combo);
      for (const perm of perms) {
        const word = perm.join('');
        if (!trie.search(word)) continue;

        // Try horizontal placement crossing center
        for (let startCol = center - word.length + 1; startCol <= center; startCol++) {
          if (startCol < 0 || startCol + word.length > SIZE) continue;
          if (center < startCol || center >= startCol + word.length) continue;

          const placements: PlacedTileInput[] = [];
          for (let i = 0; i < word.length; i++) {
            placements.push({
              row: center,
              col: startCol + i,
              letter: word[i],
              points: LETTER_POINTS[word[i]] ?? 0,
            });
          }
          const scoreResult = calculateMoveScore(placements, board);
          moves.push({
            type: 'place',
            placements,
            score: scoreResult.totalScore,
            words: scoreResult.wordScores.map(ws => ws.word),
          });
        }

        // Try vertical placement crossing center
        for (let startRow = center - word.length + 1; startRow <= center; startRow++) {
          if (startRow < 0 || startRow + word.length > SIZE) continue;
          if (center < startRow || center >= startRow + word.length) continue;

          const placements: PlacedTileInput[] = [];
          for (let i = 0; i < word.length; i++) {
            placements.push({
              row: startRow + i,
              col: center,
              letter: word[i],
              points: LETTER_POINTS[word[i]] ?? 0,
            });
          }
          const scoreResult = calculateMoveScore(placements, board);
          moves.push({
            type: 'place',
            placements,
            score: scoreResult.totalScore,
            words: scoreResult.wordScores.map(ws => ws.word),
          });
        }
      }
    }
  }

  moves.sort((a, b) => b.score - a.score);
  return moves.slice(0, maxMoves);
}

/** Generate moves at a specific anchor point in the given direction */
function generateAnchorMoves(
  board: BoardState,
  rack: Tile[],
  anchor: { row: number; col: number },
  direction: 'horizontal' | 'vertical',
  trie: Trie,
  moves: AIMove[],
  maxMoves: number
): void {
  const { row, col } = anchor;
  const isHorizontal = direction === 'horizontal';

  // Find the left/up extent including existing connected tiles
  let leftLimit = col;
  let rightLimit = col;
  if (isHorizontal) {
    // Scan left for existing tiles
    while (leftLimit > 0 && board[row][leftLimit - 1].tile) {
      leftLimit--;
    }
    // Scan right for existing tiles
    while (rightLimit < SIZE - 1 && board[row][rightLimit + 1].tile) {
      rightLimit++;
    }
  } else {
    // Scan up for existing tiles
    while (leftLimit > 0 && board[leftLimit - 1][col].tile) {
      leftLimit--;
    }
    // Scan down for existing tiles
    while (rightLimit < SIZE - 1 && board[rightLimit + 1][col].tile) {
      rightLimit++;
    }
  }

  // Try every possible word length (2 to 15) that covers the anchor
  for (let totalLen = 2; totalLen <= SIZE; totalLen++) {
    // For each possible start position
    const anchorIdx = isHorizontal ? col : row;

    for (let start = Math.max(0, anchorIdx - totalLen + 1);
         start <= anchorIdx;
         start++) {
      const end = start + totalLen - 1;
      if (end >= SIZE) continue;

      // Check anchor is covered
      if (anchorIdx < start || anchorIdx > end) continue;

      // Check compatibility with existing tiles
      if (!isCompatibleWithExisting(board, row, col, isHorizontal, start, end)) continue;

      // Count empty positions that need filling
      const emptyPositions: number[] = [];
      for (let i = start; i <= end; i++) {
        const r = isHorizontal ? row : i;
        const c = isHorizontal ? i : col;
        if (!board[r][c].tile) {
          emptyPositions.push(i);
        }
      }

      if (emptyPositions.length === 0 || emptyPositions.length > rack.length) continue;

      // Try to fill empty positions with rack tiles
      fillAndValidate(
        board, rack, row, col, isHorizontal,
        start, end, emptyPositions, 0,
        [], new Set<number>(),
        trie, moves, maxMoves
      );

      if (moves.length >= maxMoves) return;
    }
  }
}

/** Check that proposed word span doesn't conflict with existing tiles */
function isCompatibleWithExisting(
  _board: BoardState,
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number
): boolean {
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
  }
  return true;
}

/** Recursively fill empty positions with rack tiles, validate at each step */
function fillAndValidate(
  board: BoardState,
  rack: Tile[],
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number,
  emptyPositions: number[],
  posIdx: number,
  placements: PlacedTileInput[],
  usedRackIndices: Set<number>,
  trie: Trie,
  moves: AIMove[],
  maxMoves: number
): void {
  if (moves.length >= maxMoves) return;

  if (posIdx === emptyPositions.length) {
    // All empty positions filled — validate complete word
    const word = buildWordFromSpan(board, row, col, isHorizontal, start, end, placements);
    if (word && word.length >= 2 && trie.search(word)) {
      // Verify cross-words are valid
      if (!hasInvalidCrossWords(board, placements, isHorizontal ? 'horizontal' : 'vertical', trie)) {
        const scoreResult = calculateMoveScore(placements, board);
        // Double-check all scored words are valid
        const allWordsValid = scoreResult.wordScores.every(ws => trie.search(ws.word));
        if (allWordsValid) {
          moves.push({
            type: 'place',
            placements: [...placements],
            score: scoreResult.totalScore,
            words: scoreResult.wordScores.map(ws => ws.word),
          });
        }
      }
    }
    return;
  }

  const pos = emptyPositions[posIdx];
  const r = isHorizontal ? row : pos;
  const c = isHorizontal ? pos : col;

  // Try each available rack tile
  for (let i = 0; i < rack.length; i++) {
    if (usedRackIndices.has(i)) continue;

    const tile = rack[i];
    if (!tile.letter) continue; // skip blanks for now (AI doesn't handle blanks optimally)

    const newPlacement: PlacedTileInput = {
      row: r, col: c,
      letter: tile.letter,
      points: tile.points,
    };
    const newPlacements = [...placements, newPlacement];

    // Prefix pruning: build partial word and check if it's a valid prefix
    const partialWord = buildPartialWord(board, row, col, isHorizontal, start, end, newPlacements);
    if (partialWord && partialWord.length > 0 && !trie.startsWith(partialWord)) continue;

    const newUsed = new Set(usedRackIndices);
    newUsed.add(i);

    fillAndValidate(board, rack, row, col, isHorizontal, start, end,
      emptyPositions, posIdx + 1, newPlacements, newUsed, trie, moves, maxMoves);
  }
}

/** Build the full word from the span including existing tiles and new placements */
function buildWordFromSpan(
  board: BoardState,
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number,
  placements: PlacedTileInput[]
): string | null {
  let word = '';
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    const existingTile = board[r]?.[c]?.tile;
    if (existingTile) {
      word += existingTile.letter;
    } else {
      const placement = placements.find(p => p.row === r && p.col === c);
      if (placement) {
        word += placement.letter;
      } else {
        return null; // unfilled gap
      }
    }
  }
  return word;
}

/** Build partial word up to the last filled position (for prefix pruning) */
function buildPartialWord(
  board: BoardState,
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number,
  placements: PlacedTileInput[]
): string | null {
  let word = '';
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    const existingTile = board[r]?.[c]?.tile;
    if (existingTile) {
      word += existingTile.letter;
    } else {
      const placement = placements.find(p => p.row === r && p.col === c);
      if (placement) {
        word += placement.letter;
      } else {
        break; // stop at first unfilled position
      }
    }
  }
  return word.length > 0 ? word : null;
}

/** Check if any cross-words formed would be invalid */
function hasInvalidCrossWords(
  board: BoardState,
  placements: PlacedTileInput[],
  mainDirection: 'horizontal' | 'vertical',
  trie: Trie
): boolean {
  for (const p of placements) {
    const isMainHorizontal = mainDirection === 'horizontal';
    const crossDir = isMainHorizontal ? 'vertical' : 'horizontal';
    let crossWord = '';
    let hasCross = false;

    if (crossDir === 'vertical') {
      // Scan up
      let r = p.row - 1;
      while (r >= 0 && board[r]?.[p.col]?.tile) {
        crossWord = board[r][p.col].tile!.letter + crossWord;
        hasCross = true;
        r--;
      }
      // Add current tile
      crossWord += p.letter;
      // Scan down
      r = p.row + 1;
      while (r < SIZE && board[r]?.[p.col]?.tile) {
        crossWord += board[r][p.col].tile!.letter;
        hasCross = true;
        r++;
      }
    } else {
      // Scan left
      let c = p.col - 1;
      while (c >= 0 && board[p.row]?.[c]?.tile) {
        crossWord = board[p.row][c].tile!.letter + crossWord;
        hasCross = true;
        c--;
      }
      crossWord += p.letter;
      // Scan right
      c = p.col + 1;
      while (c < SIZE && board[p.row]?.[c]?.tile) {
        crossWord += board[p.row][c].tile!.letter;
        hasCross = true;
        c++;
      }
    }

    if (hasCross && crossWord.length >= 2 && !trie.search(crossWord)) {
      return true; // invalid cross word found
    }
  }
  return false;
}

// ===== Combinatorics Utils =====

/** Generate all combinations of `len` elements from array */
function getCombinations(arr: string[], len: number): string[][] {
  const result: string[][] = [];
  function helper(start: number, current: string[]): void {
    if (current.length === len) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return result;
}

/** Generate all permutations of an array */
function getPermutations(arr: string[]): string[][] {
  if (arr.length <= 1) return [arr];
  const result: string[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/** Remove duplicate moves (same placements ordered differently) */
function deduplicateMoves(moves: AIMove[]): AIMove[] {
  const seen = new Set<string>();
  const unique: AIMove[] = [];

  for (const move of moves) {
    const key = move.placements
      .map(p => `${p.row},${p.col},${p.letter}`)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(move);
    }
  }

  return unique;
}
