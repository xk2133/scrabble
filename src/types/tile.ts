// ===== 英语棋 Tile Types =====

/** A tile in a player's rack or in the tile bag */
export interface Tile {
  /** Unique identifier for tracking */
  id: string;
  /** The letter (A-Z) or empty string for blanks */
  letter: string;
  /** Point value of the tile */
  points: number;
  /** Whether this is a blank (wildcard) tile */
  isBlank: boolean;
}

let tileIdCounter = 0;

/** Generate a unique tile ID */
export function generateTileId(): string {
  tileIdCounter += 1;
  return `tile-${tileIdCounter}-${Date.now()}`;
}

/** Reset tile ID counter (for new games) */
export function resetTileIdCounter(): void {
  tileIdCounter = 0;
}
