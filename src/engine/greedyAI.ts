// ===== 英语棋 Greedy AI (Easy Difficulty) =====
// Selects the highest-scoring move from all valid moves.
// If no valid placement exists, swaps lowest-value tiles or skips.

import type { BoardState } from '../types/board';
import type { Tile } from '../types/tile';
import type { AIMove } from './aiTypes';
import type { Trie } from './trie';
import { generateMovesOptimized } from './moveGenerator';

/**
 * Select the best move using a simple greedy strategy.
 * Simply picks the highest-scoring valid placement.
 */
export function selectMove(
  board: BoardState,
  rack: Tile[],
  trie: Trie
): AIMove {
  const moves = generateMovesOptimized(board, rack, trie, 100);

  if (moves.length > 0) {
    return moves[0];
  }

  // No valid placement — try swapping lowest-value tiles
  if (rack.length > 0) {
    return createSwapMove(rack);
  }

  // Nothing to do — skip
  return {
    type: 'skip',
    placements: [],
    score: 0,
    words: [],
  };
}

function createSwapMove(rack: Tile[]): AIMove {
  const sorted = [...rack]
    .filter(t => t.letter !== '')
    .sort((a, b) => a.points - b.points);
  const swapCount = Math.min(sorted.length, Math.ceil(sorted.length / 2));
  const toSwap = sorted.slice(0, swapCount);

  return {
    type: 'swap',
    placements: [],
    returnedTiles: toSwap,
    score: 0,
    words: [],
  };
}
