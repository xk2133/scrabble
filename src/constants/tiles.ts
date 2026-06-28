/** Configuration entry for tile distribution */
export interface TileBagConfig {
  letter: string;
  count: number;
  points: number;
}

import type { GameVariant } from '../types/game';

/**
 * Fast-play variant tile distribution.
 * 60 tiles total: 59 letters + 1 blank.
 * Scaled proportionally from the standard 100-tile set.
 */
export const FAST_TILE_DISTRIBUTION: TileBagConfig[] = [
  { letter: 'A', count: 5, points: 1 },
  { letter: 'B', count: 1, points: 3 },
  { letter: 'C', count: 1, points: 3 },
  { letter: 'D', count: 2, points: 2 },
  { letter: 'E', count: 8, points: 1 },
  { letter: 'F', count: 1, points: 4 },
  { letter: 'G', count: 2, points: 2 },
  { letter: 'H', count: 1, points: 4 },
  { letter: 'I', count: 5, points: 1 },
  { letter: 'J', count: 1, points: 8 },
  { letter: 'K', count: 1, points: 5 },
  { letter: 'L', count: 2, points: 1 },
  { letter: 'M', count: 1, points: 3 },
  { letter: 'N', count: 4, points: 1 },
  { letter: 'O', count: 5, points: 1 },
  { letter: 'P', count: 1, points: 3 },
  { letter: 'Q', count: 1, points: 10 },
  { letter: 'R', count: 4, points: 1 },
  { letter: 'S', count: 2, points: 1 },
  { letter: 'T', count: 4, points: 1 },
  { letter: 'U', count: 2, points: 1 },
  { letter: 'V', count: 1, points: 4 },
  { letter: 'W', count: 1, points: 4 },
  { letter: 'X', count: 1, points: 8 },
  { letter: 'Y', count: 1, points: 4 },
  { letter: 'Z', count: 1, points: 10 },
  { letter: '', count: 1, points: 0 },
];

/**
 * Standard English Scrabble tile distribution.
 * 100 tiles total: 98 letters + 2 blanks.
 */
export const STANDARD_TILE_DISTRIBUTION: TileBagConfig[] = [
  { letter: 'A', count: 9, points: 1 },
  { letter: 'B', count: 2, points: 3 },
  { letter: 'C', count: 2, points: 3 },
  { letter: 'D', count: 4, points: 2 },
  { letter: 'E', count: 12, points: 1 },
  { letter: 'F', count: 2, points: 4 },
  { letter: 'G', count: 3, points: 2 },
  { letter: 'H', count: 2, points: 4 },
  { letter: 'I', count: 9, points: 1 },
  { letter: 'J', count: 1, points: 8 },
  { letter: 'K', count: 1, points: 5 },
  { letter: 'L', count: 4, points: 1 },
  { letter: 'M', count: 2, points: 3 },
  { letter: 'N', count: 6, points: 1 },
  { letter: 'O', count: 8, points: 1 },
  { letter: 'P', count: 2, points: 3 },
  { letter: 'Q', count: 1, points: 10 },
  { letter: 'R', count: 6, points: 1 },
  { letter: 'S', count: 4, points: 1 },
  { letter: 'T', count: 6, points: 1 },
  { letter: 'U', count: 4, points: 1 },
  { letter: 'V', count: 2, points: 4 },
  { letter: 'W', count: 2, points: 4 },
  { letter: 'X', count: 1, points: 8 },
  { letter: 'Y', count: 2, points: 4 },
  { letter: 'Z', count: 1, points: 10 },
  { letter: '', count: 2, points: 0 },
];

/**
 * Backward-compatible alias: defaults to fast-play distribution.
 */
export const TILE_DISTRIBUTION = FAST_TILE_DISTRIBUTION;

/**
 * Select tile distribution by game variant.
 */
export function getTileDistribution(variant: GameVariant): TileBagConfig[] {
  return variant === 'FAST' ? FAST_TILE_DISTRIBUTION : STANDARD_TILE_DISTRIBUTION;
}

/**
 * Quick letter-to-points lookup.
 */
export const LETTER_POINTS: Record<string, number> = {};
for (const { letter, points } of STANDARD_TILE_DISTRIBUTION) {
  if (letter !== '') {
    LETTER_POINTS[letter] = points;
  }
}
