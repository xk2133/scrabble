// ===== 英语棋 AI Engine Entry Point =====
// Routes to the appropriate AI strategy based on difficulty.
// Includes timeout protection and simulated thinking delay.

import type { BoardState } from '../types/board';
import type { Tile } from '../types/tile';
import type { AIDifficulty } from '../types/game';
import type { AIMove } from './aiTypes';
import type { Trie } from './trie';
import { selectMove as greedySelect } from './greedyAI';
import { selectMove as minimaxSelect } from './minimaxAI';

const AI_MOVE_TIMEOUT_MS = 10000; // 10s safety timeout
const AI_MOVE_DELAY_MS = 800;     // simulate "thinking" delay

/**
 * Compute an AI move based on the difficulty level.
 * - EASY: Greedy algorithm (highest-scoring move)
 * - MEDIUM: Minimax with Alpha-Beta pruning (lookahead depth 3)
 */
export async function computeAIMove(
  board: BoardState,
  rack: Tile[],
  difficulty: AIDifficulty,
  trie: Trie
): Promise<AIMove> {
  const startTime = Date.now();

  try {
    let move: AIMove;

    if (difficulty === 'EASY') {
      move = await withTimeout(() => greedySelect(board, rack, trie), AI_MOVE_TIMEOUT_MS);
    } else {
      move = await withTimeout(() => minimaxSelect(board, rack, trie), AI_MOVE_TIMEOUT_MS);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[AI] ${difficulty} move: ${move.type}, score=${move.score}, words=[${move.words.join(', ')}], ${elapsed}ms`);

    // Add delay so it doesn't feel instant
    const remainingDelay = AI_MOVE_DELAY_MS - elapsed;
    if (remainingDelay > 0) {
      await sleep(remainingDelay);
    }

    return move;
  } catch (err) {
    console.error('[AI] Move computation failed:', err);

    // Fallback: skip turn
    return {
      type: 'skip',
      placements: [],
      score: 0,
      words: [],
    };
  }
}

function withTimeout<T>(fn: () => T, timeoutMs: number): Promise<T> {
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
