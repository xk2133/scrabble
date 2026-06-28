import {
  Cell,
  TilePlacement,
  RackTile,
  AIMove,
  PlacedTile,
} from '../types/game';
import { config } from '../config';
import { isValidPrefix, isValidWord } from '../engine/wordValidator';
import { calculateScore } from '../engine/scoreCalculator';
import { placeTiles } from '../engine/boardUtils';
import { LETTER_POINTS } from '../types/game';

const SIZE = config.boardSize;

/**
 * Generate all valid moves for a given rack and board.
 * Returns moves sorted by score descending.
 */
export function generateMoves(
  board: Cell[][],
  rack: RackTile[],
  maxMoves: number = 500
): AIMove[] {
  const moves: AIMove[] = [];
  const rackLetters = rack.map(t => t.letter);
  const isFirstMove = isBoardEmpty(board);

  if (isFirstMove) {
    // First move: only need to cross center. Generate all horizontal/vertical words crossing center.
    generateFirstMoves(board, rack, moves);
  } else {
    // Find anchor positions: empty cells adjacent to existing tiles
    const anchors = findAnchors(board);

    for (const anchor of anchors) {
      // Try horizontal placements
      generateAnchorMoves(board, rack, anchor, 'horizontal', moves, maxMoves);
      // Try vertical placements
      generateAnchorMoves(board, rack, anchor, 'vertical', moves, maxMoves);

      if (moves.length >= maxMoves * 2) break;
    }
  }

  // Deduplicate moves (same placements but different order)
  const uniqueMoves = deduplicateMoves(moves);

  // Sort by score descending
  uniqueMoves.sort((a, b) => b.score - a.score);

  return uniqueMoves.slice(0, maxMoves);
}

function isBoardEmpty(board: Cell[][]): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col].tile !== null) return false;
    }
  }
  return true;
}

/** Find anchor positions: empty cells that are adjacent to any existing tile */
function findAnchors(board: Cell[][]): Array<{ row: number; col: number }> {
  const anchors: Array<{ row: number; col: number }> = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col].tile !== null) continue; // must be empty

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

/** Generate moves for the first turn — must cross center */
function generateFirstMoves(
  board: Cell[][],
  rack: RackTile[],
  moves: AIMove[]
): void {
  const center = 7;
  const rackLetters = rack.map(t => t.letter);

  // Generate all subsets of rack letters, find valid words
  const subsets = generateLetterCombinations(rackLetters);

  for (const subset of subsets) {
    if (subset.length < 2) continue;

    // Try to form a word from this subset that crosses center
    const perms = getPermutations(subset);

    for (const perm of perms) {
      const word = perm.join('');
      if (!isValidWord(word)) continue;

      // Place this word crossing center horizontally
      for (let startCol = center - perm.length + 1; startCol <= center; startCol++) {
        if (startCol < 0 || startCol + perm.length > SIZE) continue;

        const placements: TilePlacement[] = [];
        let coversCenter = false;

        for (let i = 0; i < perm.length; i++) {
          const col = startCol + i;
          if (col === center && center === 7) coversCenter = true;
          placements.push({
            row: center,
            col,
            letter: perm[i],
            points: LETTER_POINTS[perm[i]] ?? 0,
          });
        }

        if (coversCenter) {
          const scoreResult = calculateScore(board, placements);
          moves.push({
            type: 'place',
            playerId: '',
            placements,
            score: scoreResult.totalScore,
            words: scoreResult.wordScores.map(ws => ws.word),
          });
        }
      }

      // Place vertically crossing center
      for (let startRow = center - perm.length + 1; startRow <= center; startRow++) {
        if (startRow < 0 || startRow + perm.length > SIZE) continue;

        const placements: TilePlacement[] = [];
        let coversCenter = false;

        for (let i = 0; i < perm.length; i++) {
          const row = startRow + i;
          if (row === center && center === 7) coversCenter = true;
          placements.push({
            row,
            col: center,
            letter: perm[i],
            points: LETTER_POINTS[perm[i]] ?? 0,
          });
        }

        if (coversCenter) {
          const scoreResult = calculateScore(board, placements);
          moves.push({
            type: 'place',
            playerId: '',
            placements,
            score: scoreResult.totalScore,
            words: scoreResult.wordScores.map(ws => ws.word),
          });
        }
      }
    }
  }
}

/** Generate horizontal moves anchored at the given position */
function generateHorizontalMoves(
  board: Cell[][],
  rack: RackTile[],
  anchor: { row: number; col: number },
  moves: AIMove[]
): void {
  const { row, col } = anchor;

  // Find the leftmost empty cell that's part of the candidate word span
  // by scanning left until we hit a gap or board edge (keeping existing tiles)
  let leftLimit = col;
  while (leftLimit > 0 && board[row][leftLimit - 1].tile === null) {
    // Check if the cell to the left is also an anchor or has a tile above/below
    const hasAboveBelow = hasAdjacentVertical(board, row, leftLimit - 1);
    if (hasAboveBelow && leftLimit - 1 !== col) {
      // This is also an anchor; keep going but limit
      leftLimit--;
    } else if (leftLimit - 1 === col - 1) {
      leftLimit--;
    } else {
      break;
    }
  }

  // Actually, a simpler approach: at each anchor, try placing the anchor tile
  // and building left/right using remaining rack letters
  const rackLetters = rack.map(t => t.letter);

  // For each possible rack letter to place at this anchor
  for (const tile of rack) {
    const remainingRack = rackLetters.filter((_, i) => rackLetters[i] !== tile.letter || rackLetters.indexOf(tile.letter) !== i);
    // Simplified: use backtracking

    // Backtrack to build words left-right from this anchor
    backtrackHorizontal(board, rack, anchor, [], col, col, moves);
  }
}

function backtrackHorizontal(
  board: Cell[][],
  rack: RackTile[],
  anchor: { row: number; col: number },
  usedIndices: number[],
  leftPos: number,
  rightPos: number,
  moves: AIMove[]
): void {
  const { row } = anchor;

  // Try to finalize: if we have at least 2 letters (including anchor) and formed valid words
  if (usedIndices.length >= 1) {
    tryFinalizeHorizontal(board, rack, usedIndices, row, anchor.col, moves);
  }

  // Extend left
  if (leftPos > 0 && board[row][leftPos - 1].tile === null) {
    for (let i = 0; i < rack.length; i++) {
      if (usedIndices.includes(i)) continue;
      backtrackHorizontal(board, rack, anchor, [...usedIndices, i], leftPos - 1, rightPos, moves);
    }
  }

  // Extend right
  if (rightPos < SIZE - 1 && board[row][rightPos + 1].tile === null) {
    for (let i = 0; i < rack.length; i++) {
      if (usedIndices.includes(i)) continue;
      backtrackHorizontal(board, rack, anchor, [...usedIndices, i], leftPos, rightPos + 1, moves);
    }
  }
}

function tryFinalizeHorizontal(
  board: Cell[][],
  rack: RackTile[],
  usedIndices: number[],
  row: number,
  anchorCol: number,
  moves: AIMove[]
): void {
  // Build the word by determining the full span including existing tiles
  // This is a simplified version — full implementation needs prefix checking

  // For efficiency, we use a different approach below
  // This is a stub that will be enhanced
}

/**
 * Core word-building algorithm using prefix pruning.
 * For each anchor, try placing each rack letter, then extend left/right
 * using remaining rack letters. Check prefix validity at each step.
 */
function generateWordsAtAnchor(
  board: Cell[][],
  rack: RackTile[],
  anchor: { row: number; col: number },
  direction: 'horizontal' | 'vertical',
  moves: AIMove[]
): void {
  const { row, col } = anchor;
  const isHorizontal = direction === 'horizontal';

  // Find existing tiles to the left/up that constrain the word start
  let existingPrefix = '';
  let existingStart = isHorizontal ? col : row;
  const min = 0;
  const max = SIZE - 1;

  // Scan backwards for existing tiles
  let scanPos = existingStart - 1;
  while (scanPos >= min) {
    const cell = isHorizontal ? board[row][scanPos] : board[scanPos][col];
    if (cell.tile) {
      existingPrefix = cell.tile.letter + existingPrefix;
      existingStart = scanPos;
      scanPos--;
    } else {
      break;
    }
  }

  // If there's an existing prefix, we must form a word that starts before it
  // Now do DFS from each possible starting position
  const rackLetters = rack.map((t, i) => ({ letter: t.letter, index: i, points: t.points }));
  const usedSet = new Set<number>();

  // Try placing tiles starting from existingStart-1 going left, and extending right
  tryPlaceTiles(
    board, rack, anchor, direction,
    existingPrefix, existingStart, col, [], usedSet, moves
  );
}

function tryPlaceTiles(
  board: Cell[][],
  rack: RackTile[],
  anchor: { row: number; col: number },
  direction: 'horizontal' | 'vertical',
  prefixSoFar: string,
  startPos: number,
  anchorPos: number,
  placements: TilePlacement[],
  usedIndices: Set<number>,
  moves: AIMove[]
): void {
  // Check prefix validity for pruning
  if (prefixSoFar.length > 0 && !isValidPrefix(prefixSoFar)) {
    return;
  }

  // If we've placed at least one tile and prefix becomes a valid word, record the move
  // But we also need to check cross-words formed
  if (prefixSoFar.length >= 2 && placements.length > 0 && isValidWord(prefixSoFar)) {
    // We have a potential word — need to verify cross-words
    const hasCrossWordConflict = checkCrossWords(board, placements, direction);
    if (!hasCrossWordConflict) {
      const scoreResult = calculateScore(board, placements);
      if (scoreResult.wordScores.every(ws => isValidWord(ws.word))) {
        moves.push({
          type: 'place',
          playerId: '',
          placements: [...placements],
          score: scoreResult.totalScore,
          words: scoreResult.wordScores.map(ws => ws.word),
        });
      }
    }
  }

  // Try extending right/down
  const { row, col } = anchor;
  const isHorizontal = direction === 'horizontal';
  const nextPos = isHorizontal ? col + placements.length + 1 : row + placements.length + 1;
  // Simplified — actual implementation more complex
}

/**
 * Optimized move generator: works by iterating each anchor point,
 * trying to build a word that includes the anchor.
 */
export function generateMovesOptimized(
  board: Cell[][],
  rack: RackTile[],
  dictionary: Set<string>,
  maxMoves: number = 300
): AIMove[] {
  const moves: AIMove[] = [];
  const rackLetters = rack.map(t => t.letter);

  if (isBoardEmpty(board)) {
    // First move: generate all possible words from rack that contain center
    return generateFirstMoveWords(rack, board, moves);
  }

  const anchors = findAnchors(board);

  for (const anchor of anchors) {
    // Try horizontal
    generateAnchorMoves(board, rack, anchor, 'horizontal', moves, maxMoves);
    if (moves.length >= maxMoves) break;

    // Try vertical
    generateAnchorMoves(board, rack, anchor, 'vertical', moves, maxMoves);
    if (moves.length >= maxMoves) break;
  }

  // Deduplicate
  const uniqueMoves = deduplicateMoves(moves);
  uniqueMoves.sort((a, b) => b.score - a.score);
  return uniqueMoves.slice(0, maxMoves);
}

function generateFirstMoveWords(rack: RackTile[], board: Cell[][], moves: AIMove[]): AIMove[] {
  const letters = rack.map(t => t.letter);
  const center = 7;

  // Generate all combinations of rack letters (subsets from 2 to rack.length)
  for (let len = 2; len <= letters.length; len++) {
    const combos = getCombinations(letters, len);
    for (const combo of combos) {
      const perms = getPermutations(combo);
      for (const perm of perms) {
        const word = perm.join('');
        if (!isValidWord(word)) continue;

        // Try placing horizontally across center
        for (let startCol = center - word.length + 1; startCol <= center; startCol++) {
          if (startCol < 0 || startCol + word.length > SIZE) continue;
          if (center < startCol || center >= startCol + word.length) continue;

          const placements: TilePlacement[] = [];
          for (let i = 0; i < word.length; i++) {
            placements.push({
              row: center,
              col: startCol + i,
              letter: word[i],
              points: LETTER_POINTS[word[i]] ?? 0,
            });
          }
          const scoreResult = calculateScore(board, placements);
          moves.push({
            type: 'place', playerId: '',
            placements, score: scoreResult.totalScore,
            words: scoreResult.wordScores.map(ws => ws.word),
          });
        }

        // Try placing vertically across center
        for (let startRow = center - word.length + 1; startRow <= center; startRow++) {
          if (startRow < 0 || startRow + word.length > SIZE) continue;
          if (center < startRow || center >= startRow + word.length) continue;

          const placements: TilePlacement[] = [];
          for (let i = 0; i < word.length; i++) {
            placements.push({
              row: startRow + i,
              col: center,
              letter: word[i],
              points: LETTER_POINTS[word[i]] ?? 0,
            });
          }
          const scoreResult = calculateScore(board, placements);
          moves.push({
            type: 'place', playerId: '',
            placements, score: scoreResult.totalScore,
            words: scoreResult.wordScores.map(ws => ws.word),
          });
        }
      }
    }
  }
  return moves;
}

function generateAnchorMoves(
  board: Cell[][],
  rack: RackTile[],
  anchor: { row: number; col: number },
  direction: 'horizontal' | 'vertical',
  moves: AIMove[],
  maxMoves: number
): void {
  const { row, col } = anchor;
  const isHorizontal = direction === 'horizontal';

  // Find the leftmost/uppermost extent of the candidate word area
  // including existing tiles that must be part of the word
  let leftLimit = isHorizontal ? col : row;
  let rightLimit = isHorizontal ? col : row;

  // Scan left/up to find existing tiles that form a prefix
  while (leftLimit > 0) {
    const r = isHorizontal ? row : leftLimit - 1;
    const c = isHorizontal ? leftLimit - 1 : col;
    if (board[r][c].tile) {
      leftLimit--;
    } else {
      break;
    }
  }

  // Scan right/down for existing suffix
  const maxIdx = SIZE - 1;
  while (rightLimit < maxIdx) {
    const r = isHorizontal ? row : rightLimit + 1;
    const c = isHorizontal ? rightLimit + 1 : col;
    if (board[r][c].tile) {
      rightLimit++;
    } else {
      break;
    }
  }

  // The anchor must be part of the range
  // Try every possible word length (2 to 15) that covers the anchor
  const existingStr = readExistingString(board, row, col, isHorizontal, leftLimit, rightLimit);
  const anchorOffset = (isHorizontal ? col : row) - leftLimit;

  // For each possible total word length
  for (let totalLen = 2; totalLen <= SIZE; totalLen++) {
    // For each possible start position
    for (let start = Math.max(0, (isHorizontal ? col : row) - totalLen + 1);
         start <= (isHorizontal ? col : row);
         start++) {
      const end = start + totalLen - 1;
      if (end >= SIZE) continue;

      // Check if anchor is covered
      const anchorIdx = isHorizontal ? col : row;
      if (anchorIdx < start || anchorIdx > end) continue;

      // Check compatibility with existing tiles
      if (!isCompatible(board, row, col, isHorizontal, start, end)) continue;

      // Get the pattern of letters we need
      const neededLetters = getNeededLetters(board, row, col, isHorizontal, start, end);
      if (neededLetters.length === 0) continue; // no new tiles needed

      // Get remaining rack letters
      const rackLetters = rack.map(t => t.letter);
      const availableCounts = countLetters(rackLetters);

      // Check if we have the needed letters
      if (!canSupply(neededLetters, availableCounts)) continue;

      // Try to fill in with rack letters to form valid words
      fillAndCheck(board, rack, row, col, isHorizontal, start, end, moves, maxMoves);
    }
  }
}

function readExistingString(
  board: Cell[][],
  row: number, col: number,
  isHorizontal: boolean,
  left: number, right: number
): string {
  let s = '';
  for (let i = left; i <= right; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    if (board[r][c].tile) {
      s += board[r][c].tile!.letter;
    } else {
      s += '_';
    }
  }
  return s;
}

function isCompatible(
  board: Cell[][],
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number
): boolean {
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    if (i < 0 || i >= SIZE) return false;
    // No conflict — empty cells are fine as long as we can fill them
  }
  return true;
}

function getNeededLetters(
  board: Cell[][],
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number
): string[] {
  const needed: string[] = [];
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    if (!board[r][c].tile) {
      needed.push('?'); // placeholder
    }
  }
  return needed;
}

function countLetters(letters: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const l of letters) {
    counts[l] = (counts[l] || 0) + 1;
  }
  return counts;
}

function canSupply(needed: string[], available: Record<string, number>): boolean {
  const count = needed.length;
  const totalAvail = Object.values(available).reduce((a, b) => a + b, 0);
  return count <= totalAvail;
}

function fillAndCheck(
  board: Cell[][],
  rack: RackTile[],
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number,
  moves: AIMove[],
  maxMoves: number
): void {
  if (moves.length >= maxMoves) return;

  // Identify empty positions
  const emptyPositions: number[] = [];
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    if (!board[r][c].tile) {
      emptyPositions.push(i);
    }
  }

  if (emptyPositions.length === 0) return;

  // Generate all combinations of rack letters for the empty positions
  const rackLetters = rack.map(t => ({ letter: t.letter, idx: t.letter + '_' + Math.random() }));

  // Use recursive filling to try letters
  recursiveFill(
    board, rack, row, col, isHorizontal, start, end,
    emptyPositions, 0, [], new Set<number>(), moves, maxMoves
  );
}

function recursiveFill(
  board: Cell[][],
  rack: RackTile[],
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number,
  emptyPositions: number[],
  posIdx: number,
  placements: TilePlacement[],
  usedRackIndices: Set<number>,
  moves: AIMove[],
  maxMoves: number
): void {
  if (moves.length >= maxMoves) return;

  if (posIdx === emptyPositions.length) {
    // All empty positions filled — validate the word and cross-words
    const word = buildWordFromBoard(board, row, col, isHorizontal, start, end, placements);
    if (word && isValidWord(word)) {
      // Check cross-words
      const hasInvalidCross = checkCrossWords(board, placements, isHorizontal ? 'horizontal' : 'vertical');
      if (!hasInvalidCross) {
        const scoreResult = calculateScore(board, placements);
        if (scoreResult.wordScores.every(ws => isValidWord(ws.word))) {
          moves.push({
            type: 'place',
            playerId: '',
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
    const newPlacements = [...placements, {
      row: r, col: c,
      letter: tile.letter,
      points: tile.points,
    }];

    // Prefix pruning: build the partial word so far
    const partialWord = buildPartialWord(board, row, col, isHorizontal, start, end, newPlacements);
    if (partialWord && !isValidPrefix(partialWord)) continue;

    const newUsed = new Set(usedRackIndices);
    newUsed.add(i);

    recursiveFill(board, rack, row, col, isHorizontal, start, end,
      emptyPositions, posIdx + 1, newPlacements, newUsed, moves, maxMoves);
  }
}

function buildWordFromBoard(
  board: Cell[][],
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number,
  placements: TilePlacement[]
): string | null {
  let word = '';
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    if (board[r][c].tile) {
      word += board[r][c].tile!.letter;
    } else {
      const placement = placements.find(p => p.row === r && p.col === c);
      if (placement) {
        word += placement.letter;
      } else {
        return null;
      }
    }
  }
  return word.length >= 2 ? word : null;
}

function buildPartialWord(
  board: Cell[][],
  row: number, col: number,
  isHorizontal: boolean,
  start: number, end: number,
  placements: TilePlacement[]
): string | null {
  let word = '';
  for (let i = start; i <= end; i++) {
    const r = isHorizontal ? row : i;
    const c = isHorizontal ? i : col;
    if (board[r][c].tile) {
      word += board[r][c].tile!.letter;
    } else {
      const placement = placements.find(p => p.row === r && p.col === c);
      if (placement) {
        word += placement.letter;
      } else {
        break; // stop at first unfilled
      }
    }
  }
  return word.length > 0 ? word : null;
}

function checkCrossWords(
  board: Cell[][],
  placements: TilePlacement[],
  mainDirection: 'horizontal' | 'vertical'
): boolean {
  // For each placement, check if it forms a cross word in the perpendicular direction
  for (const p of placements) {
    const isMainHorizontal = mainDirection === 'horizontal';

    // Check the perpendicular direction
    const crossDir = isMainHorizontal ? 'vertical' : 'horizontal';
    let crossWord = '';
    let hasCross = false;

    // Scan in the perpendicular direction
    if (crossDir === 'vertical') {
      // Scan up
      let r = p.row - 1;
      while (r >= 0 && board[r][p.col].tile) {
        crossWord = board[r][p.col].tile!.letter + crossWord;
        hasCross = true;
        r--;
      }
      // Add this tile
      crossWord += p.letter;
      // Scan down
      r = p.row + 1;
      while (r < SIZE && board[r][p.col].tile) {
        crossWord += board[r][p.col].tile!.letter;
        hasCross = true;
        r++;
      }
    } else {
      // Scan left
      let c = p.col - 1;
      while (c >= 0 && board[p.row][c].tile) {
        crossWord = board[p.row][c].tile!.letter + crossWord;
        hasCross = true;
        c--;
      }
      crossWord += p.letter;
      // Scan right
      c = p.col + 1;
      while (c < SIZE && board[p.row][c].tile) {
        crossWord += board[p.row][c].tile!.letter;
        hasCross = true;
        c++;
      }
    }

    if (hasCross && crossWord.length >= 2 && !isValidWord(crossWord)) {
      return true; // has invalid cross word
    }
  }
  return false;
}

function hasAdjacentVertical(board: Cell[][], row: number, col: number): boolean {
  if (row > 0 && board[row - 1][col].tile) return true;
  if (row < SIZE - 1 && board[row + 1][col].tile) return true;
  return false;
}

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

/** Generate letter combinations (subsets) from rack for first move */
function generateLetterCombinations(letters: string[]): string[][] {
  const result: string[][] = [];
  for (let len = 2; len <= letters.length; len++) {
    result.push(...getCombinations(letters, len));
  }
  return result;
}
