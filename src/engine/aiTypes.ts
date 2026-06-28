// ===== 英语棋 AI Types =====
import type { PlacedTileInput } from '../types/game';
import type { Tile } from '../types/tile';

/** A move computed by the AI engine */
export interface AIMove {
  type: 'place' | 'swap' | 'skip';
  placements: PlacedTileInput[];
  score: number;
  words: string[];
  returnedTiles?: Tile[];
}
