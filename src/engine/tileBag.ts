// ===== Tile Bag =====
import type { Tile } from '../types/tile';
import { TILE_DISTRIBUTION } from '../constants/tiles';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class TileBag {
  private tiles: Tile[];

  constructor() {
    this.tiles = this.buildBag();
  }

  private buildBag(): Tile[] {
    const tiles: Tile[] = [];
    let counter = 0;
    for (const config of TILE_DISTRIBUTION) {
      for (let i = 0; i < config.count; i++) {
        tiles.push({
          id: `tile_${counter++}`,
          letter: config.letter,
          points: config.points,
          isBlank: config.letter === '',
        });
      }
    }
    return shuffleArray(tiles);
  }

  draw(count: number): Tile[] {
    const drawn = this.tiles.splice(0, Math.min(count, this.tiles.length));
    return drawn;
  }

  swap(tiles: Tile[]): Tile[] {
    this.tiles.push(...tiles);
    this.tiles = shuffleArray(this.tiles);
    return this.draw(tiles.length);
  }

  remaining(): number {
    return this.tiles.length;
  }

  isEmpty(): boolean {
    return this.tiles.length === 0;
  }

  reset(): void {
    this.tiles = this.buildBag();
  }
}
