import { Cell, RackTile, AIMove, TilePlacement } from '../types/game';
import { generateMovesOptimized } from './moveGenerator';
import { placeTiles, createEmptyBoard } from '../engine/boardUtils';
import { LETTER_POINTS } from '../types/game';

/**
 * Minimax AI (Medium/Hard difficulty).
 * Uses Minimax search with Alpha-Beta pruning at depth 2-3.
 * Branching factor is limited to top N moves at each level.
 */
interface SearchNode {
  board: Cell[][];
  aiRack: RackTile[];
  opponentRack: RackTile[];
  score: number;
  depth: number;
  isMaximizing: boolean;
}

const MAX_DEPTH = 3;
const BRANCH_LIMIT = 15;
const RACK_PENALTY_WEIGHT = 3; // penalty per tile left in rack

/**
 * Select the best move using Minimax with Alpha-Beta pruning.
 * Limited to top N moves for performance.
 */
export function selectMove(
  board: Cell[][],
  rack: RackTile[],
  dictionary: Set<string>
): AIMove {
  // Generate candidate moves for the AI
  const candidateMoves = generateMovesOptimized(board, rack, dictionary, BRANCH_LIMIT);

  if (candidateMoves.length === 0) {
    // No valid placement — swap tiles
    return createSwapMove(rack);
  }

  let bestMove = candidateMoves[0];
  let bestScore = -Infinity;

  // Evaluate each candidate with minimax lookahead
  for (const move of candidateMoves.slice(0, BRANCH_LIMIT)) {
    // Apply the move to the board
    const newBoard = placeTiles(board, move.placements);

    // Remove used tiles from rack
    const usedLetters = move.placements.map(p => p.letter);
    const newRack = removeFromRack(rack, usedLetters);

    // Evaluate this branch using minimax
    const moveScore = minimax(
      newBoard,
      newRack,
      newRack, // simplified opponent rack (same as ours for estimation)
      1,
      false,
      -Infinity,
      Infinity,
      dictionary
    );

    const totalScore = move.score + moveScore;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  board: Cell[][],
  aiRack: RackTile[],
  opponentRack: RackTile[],
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  dictionary: Set<string>
): number {
  // Terminal condition
  if (depth >= MAX_DEPTH) {
    return evaluate(board, aiRack, opponentRack);
  }

  const currentRack = isMaximizing ? aiRack : opponentRack;
  const moves = generateMovesOptimized(board, currentRack, dictionary, BRANCH_LIMIT);

  if (moves.length === 0) {
    return evaluate(board, aiRack, opponentRack);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves.slice(0, BRANCH_LIMIT)) {
      const newBoard = placeTiles(board, move.placements);
      const usedLetters = move.placements.map(p => p.letter);
      const newRack = removeFromRack(aiRack, usedLetters);

      const evalScore = move.score + minimax(
        newBoard, newRack, opponentRack,
        depth + 1, false, alpha, beta, dictionary
      );

      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves.slice(0, BRANCH_LIMIT)) {
      const newBoard = placeTiles(board, move.placements);
      const usedLetters = move.placements.map(p => p.letter);
      const newRack = removeFromRack(opponentRack, usedLetters);

      const evalScore = -move.score + minimax(
        newBoard, aiRack, newRack,
        depth + 1, true, alpha, beta, dictionary
      );

      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Evaluation function: score the board position.
 * Higher score = better for the AI.
 * Considers: immediate score advantage and rack quality.
 */
function evaluate(
  _board: Cell[][],
  aiRack: RackTile[],
  opponentRack: RackTile[]
): number {
  // Rack quality — fewer tiles is better (more likely to go out)
  const aiRackPenalty = aiRack.length * RACK_PENALTY_WEIGHT;
  const oppRackPenalty = opponentRack.length * RACK_PENALTY_WEIGHT;

  // Rack tile value — higher point tiles are good but we prefer to keep balanced
  const aiRackValue = aiRack.reduce((sum, t) => sum + t.points, 0);
  const oppRackValue = opponentRack.reduce((sum, t) => sum + t.points, 0);

  // We want: opponent having higher penalty (more tiles), AI having fewer tiles
  return (oppRackPenalty - aiRackPenalty) + (oppRackValue - aiRackValue);
}

function removeFromRack(rack: RackTile[], letters: string[]): RackTile[] {
  const newRack = [...rack];
  for (const letter of letters) {
    const idx = newRack.findIndex(t => t.letter === letter);
    if (idx !== -1) {
      newRack.splice(idx, 1);
    }
  }
  return newRack;
}

function createSwapMove(rack: RackTile[]): AIMove {
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
