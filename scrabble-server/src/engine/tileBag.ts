import { RackTile, TILE_DISTRIBUTION, LETTER_POINTS } from '../types/game';

/**
 * Create a new shuffled tile bag with standard English Scrabble distribution (100 tiles).
 */
export function createTileBag(): RackTile[] {
  const tiles: RackTile[] = [];

  for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      tiles.push({
        letter,
        points: LETTER_POINTS[letter] ?? 0,
      });
    }
  }

  // Fisher-Yates shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  return tiles;
}

/** Draw `count` tiles from the bag. Returns the drawn tiles and mutates the bag. */
export function drawTiles(bag: RackTile[], count: number): RackTile[] {
  const drawn: RackTile[] = [];
  const available = Math.min(count, bag.length);
  for (let i = 0; i < available; i++) {
    drawn.push(bag.pop()!);
  }
  return drawn;
}

/** Return tiles to the bag and shuffle, then draw same number of new tiles. */
export function swapTiles(bag: RackTile[], returned: RackTile[]): RackTile[] {
  // Put returned tiles back
  for (const tile of returned) {
    bag.push(tile);
  }
  // Shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  // Draw new tiles
  return drawTiles(bag, returned.length);
}

/** Refill a player's rack to the configured size */
export function refillRack(bag: RackTile[], rack: RackTile[], rackSize: number): RackTile[] {
  const needed = rackSize - rack.length;
  if (needed > 0) {
    const drawn = drawTiles(bag, needed);
    rack.push(...drawn);
  }
  return rack;
}

/** Get remaining tile count */
export function remainingCount(bag: RackTile[]): number {
  return bag.length;
}
