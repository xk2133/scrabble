// ===== 英语棋 Minimax AI (Medium Difficulty) =====
// Uses Minimax search with Alpha-Beta pruning at depth 2-3.
// Evaluates board position based on score advantage and rack quality.

import type { BoardState } from '../types/board';
import type { Tile } from '../types/tile';
import type { AIMove } from './aiTypes';
import type { Trie } from './trie';
import { generateMovesOptimized } from './moveGenerator';
import { placeTilesOnBoard } from './boardUtils';

const MAX_DEPTH = 3;
const BRANCH_LIMIT = 15;
const RACK_PENALTY_WEIGHT = 3;

/**
 * Select the best move using Minimax with Alpha-Beta pruning.
 */
export function selectMove(
  board: BoardState,
  rack: Tile[],
  trie: Trie
): AIMove {
  const candidateMoves = generateMovesOptimized(board, rack, trie, BRANCH_LIMIT);

  if (candidateMoves.length === 0) {
    return createSwapMove(rack);
  }

  let bestMove = candidateMoves[0];
  let bestScore = -Infinity;

  // Evaluate each candidate with minimax lookahead
  for (const move of candidateMoves.slice(0, BRANCH_LIMIT)) {
    const newBoard = placeTilesOnBoard(board, move.placements);
    const usedLetters = move.placements.map(p => p.letter);
    const newRack = removeFromRack(rack, usedLetters);

    const lookaheadScore = minimax(
      newBoard, newRack, newRack,
      1, false, -Infinity, Infinity,
      trie
    );

    const totalScore = move.score + lookaheadScore;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  board: BoardState,
  aiRack: Tile[],
  opponentRack: Tile[],
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  trie: Trie
): number {
  if (depth >= MAX_DEPTH) {
    return evaluate(aiRack, opponentRack);
  }

  const currentRack = isMaximizing ? aiRack : opponentRack;
  const moves = generateMovesOptimized(board, currentRack, trie, BRANCH_LIMIT);

  if (moves.length === 0) {
    return evaluate(aiRack, opponentRack);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves.slice(0, BRANCH_LIMIT)) {
      const newBoard = placeTilesOnBoard(board, move.placements);
      const usedLetters = move.placements.map(p => p.letter);
      const newRack = removeFromRack(aiRack, usedLetters);

      const evalScore = move.score + minimax(
        newBoard, newRack, opponentRack,
        depth + 1, false, alpha, beta, trie
      );

      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves.slice(0, BRANCH_LIMIT)) {
      const newBoard = placeTilesOnBoard(board, move.placements);
      const usedLetters = move.placements.map(p => p.letter);
      const newRack = removeFromRack(opponentRack, usedLetters);

      const evalScore = -move.score + minimax(
        newBoard, aiRack, newRack,
        depth + 1, true, alpha, beta, trie
      );

      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Evaluation function: estimate how favorable the position is for AI.
 * Lower opponent rack penalty + higher opponent rack value = better for AI.
 */
function evaluate(aiRack: Tile[], opponentRack: Tile[]): number {
  const aiPenalty = aiRack.length * RACK_PENALTY_WEIGHT;
  const oppPenalty = opponentRack.length * RACK_PENALTY_WEIGHT;
  const aiRackValue = aiRack.reduce((sum, t) => sum + t.points, 0);
  const oppRackValue = opponentRack.reduce((sum, t) => sum + t.points, 0);

  // Prefer: opponent has more tiles (higher penalty), AI has fewer tiles
  return (oppPenalty - aiPenalty) + (oppRackValue - aiRackValue);
}

function removeFromRack(rack: Tile[], letters: string[]): Tile[] {
  const newRack = [...rack];
  for (const letter of letters) {
    const idx = newRack.findIndex(t => t.letter === letter);
    if (idx !== -1) {
      newRack.splice(idx, 1);
    }
  }
  return newRack;
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
