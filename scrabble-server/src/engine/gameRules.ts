import { Cell, TilePlacement, RackTile, Player } from '../types/game';
import { isValidPlacement } from './boardUtils';
import { calculateScore } from './scoreCalculator';
import { isValidWord } from './wordValidator';
import { remainingCount } from './tileBag';
import { config } from '../config';

export interface SubmitResult {
  valid: boolean;
  reason?: string;
  score?: number;
  words?: string[];
  wordScores?: Array<{ word: string; score: number; cells: Array<{ row: number; col: number }> }>;
}

/**
 * Validate a word submission:
 * - Placement validity (alignment, contiguity, connection)
 * - All formed words exist in dictionary
 */
export function canSubmitWord(
  board: Cell[][],
  placements: TilePlacement[]
): SubmitResult {
  const placementCheck = isValidPlacement(board, placements);
  if (!placementCheck.valid) {
    return { valid: false, reason: placementCheck.reason };
  }

  // Score calculation also extracts formed words
  const scoreResult = calculateScore(board, placements);

  // Validate all formed words
  const formedWords = scoreResult.wordScores.map(ws => ws.word);
  for (const word of formedWords) {
    if (!isValidWord(word)) {
      return { valid: false, reason: `"${word}" is not a valid word` };
    }
  }

  return {
    valid: true,
    score: scoreResult.totalScore,
    words: formedWords,
    wordScores: scoreResult.wordScores.map(ws => ({
      word: ws.word,
      score: ws.score,
      cells: ws.cells,
    })),
  };
}

/**
 * Check if the game is over.
 * Conditions:
 * 1. A player used all their tiles AND the bag is empty
 * 2. Six consecutive passes/skips
 */
export function isGameOver(
  bag: RackTile[],
  players: Player[],
  consecutivePasses: number
): { over: boolean; reason?: string } {
  if (consecutivePasses >= 6) {
    return { over: true, reason: 'consecutive_passes' };
  }

  const bagEmpty = remainingCount(bag) === 0;
  if (bagEmpty) {
    const anyPlayerEmpty = players.some(p => p.rack.length === 0);
    if (anyPlayerEmpty) {
      return { over: true, reason: 'all_tiles_used' };
    }
  }

  return { over: false };
}

/**
 * Calculate final scores with penalty for remaining tiles.
 * The player who finishes first gets the sum of opponent's remaining tile points added to their score.
 * The opponent has their remaining tile points subtracted.
 */
export function calculateFinalScores(players: Player[]): Player[] {
  return players.map(player => {
    // If a player emptied their rack, they get opponents' remaining points as bonus
    const opponent = players.find(p => p.id !== player.id);
    let adjustedScore = player.score;

    if (opponent && player.rack.length === 0) {
      // Player who went out: add opponent's remaining tile values
      const opponentRemaining = opponent.rack.reduce((sum, t) => sum + t.points, 0);
      adjustedScore += opponentRemaining;
    } else if (opponent && opponent.rack.length === 0) {
      // Opponent went out: subtract this player's remaining tile values
      const selfRemaining = player.rack.reduce((sum, t) => sum + t.points, 0);
      adjustedScore -= selfRemaining;
    }

    return { ...player, score: adjustedScore };
  });
}

/** Determine who goes first (closest to 'A' in rack, or random) */
export function determineFirstPlayer(players: Player[]): string {
  if (players.length === 0) return '';
  // Simple: player with letter closest to 'A' goes first
  // Draw a random tile approach — just pick randomly for simplicity
  const idx = Math.floor(Math.random() * players.length);
  return players[idx].id;
}
