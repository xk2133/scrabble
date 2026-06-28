import { Cell, RackTile, AIMove, AIDifficulty } from '../types/game';
import { selectMove as greedySelect } from './greedyAI';
import { selectMove as minimaxSelect } from './minimaxAI';
import { config } from '../config';

/**
 * Compute an AI move based on the difficulty level.
 * Routes to greedyAI for 'easy', minimaxAI for 'medium' and 'hard'.
 * Has a timeout protection to prevent hanging.
 */
export async function computeAIMove(
  board: Cell[][],
  rack: RackTile[],
  difficulty: AIDifficulty,
  dictionary: Set<string>
): Promise<AIMove> {
  // Note: dictionary Set isn't directly used by moveGenerator (it uses isValidWord/isValidPrefix),
  // but kept for future optimization where a direct Set lookup could be faster.

  const startTime = Date.now();
  const timeoutMs = config.aiMoveTimeoutMs;

  try {
    let move: AIMove;

    if (difficulty === 'easy') {
      move = await withTimeout(() => greedySelect(board, rack, dictionary), timeoutMs);
    } else {
      // medium and hard both use minimax (hard could use depth 4 in future)
      move = await withTimeout(() => minimaxSelect(board, rack, dictionary), timeoutMs);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[AI] ${difficulty} AI move computed in ${elapsed}ms: ${move.type}, score=${move.score}`);

    // Simulate thinking delay so it doesn't feel instant
    const remainingDelay = config.aiMoveDelayMs - elapsed;
    if (remainingDelay > 0) {
      await sleep(remainingDelay);
    }

    return move;
  } catch (err) {
    console.error(`[AI] AI move computation timed out or failed:`, err);

    // Fallback: skip or swap
    return {
      type: 'skip',
      playerId: '',
      placements: [],
      score: 0,
      words: [],
    };
  }
}

async function withTimeout<T>(fn: () => T, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI timeout')), timeoutMs);
    try {
      const result = fn();
      clearTimeout(timer);
      resolve(result);
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
