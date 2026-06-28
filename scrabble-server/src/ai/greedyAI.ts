import { Cell, RackTile, AIMove, TilePlacement } from '../types/game';
import { generateMovesOptimized } from './moveGenerator';
import { isValidWord } from '../engine/wordValidator';
import { LETTER_POINTS } from '../types/game';

/**
 * Greedy AI (Easy difficulty).
 * Selects the highest-scoring move from all valid moves.
 * If no valid placement exists, swaps tiles or skips.
 */
export function selectMove(
  board: Cell[][],
  rack: RackTile[],
  dictionary: Set<string>
): AIMove {
  const moves = generateMovesOptimized(board, rack, dictionary, 100);

  if (moves.length > 0) {
    // Return highest scoring move
    return moves[0];
  }

  // No valid placement — try swapping
  if (rack.length > 0) {
    // Swap lowest-value tiles (up to all of them if bag allows)
    return createSwapMove(rack);
  }

  // Can't do anything — skip
  return {
    type: 'skip',
    playerId: '',
    placements: [],
    score: 0,
    words: [],
  };
}

function createSwapMove(rack: RackTile[]): AIMove {
  // Swap tiles with lowest point value first
  const sorted = [...rack].sort((a, b) => a.points - b.points);
  const swapCount = Math.min(sorted.length, Math.ceil(sorted.length / 2));
  const toSwap = sorted.slice(0, swapCount);

  return {
    type: 'swap',
    playerId: '',
    placements: [],
    returnedTiles: toSwap,
    score: 0,
    words: [],
  };
}
