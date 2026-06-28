import React from 'react';
import type { Tile } from '../../types/tile';
import TileLetter from './TileLetter';
import styles from './LetterRack.module.css';

interface LetterRackProps {
  tiles: Tile[];
  selectedIndex: number | null;
  onTileClick: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

const MAX_SLOTS = 7;

const LetterRack: React.FC<LetterRackProps> = ({
  tiles,
  selectedIndex,
  onTileClick,
  disabled = false,
  className,
}) => {
  const slots: (Tile | null)[] = Array.from(
    { length: MAX_SLOTS },
    (_, i) => tiles[i] ?? null,
  );

  return (
    <div className={[styles.rack, className].filter(Boolean).join(' ')}>
      <div className={styles.slotList}>
        {slots.map((tile, index) =>
          tile ? (
            <TileLetter
              key={tile.id}
              letter={tile.letter}
              points={tile.points}
              size="rack"
              state={selectedIndex === index ? 'selected' : 'default'}
              onClick={() => onTileClick(index)}
              disabled={disabled}
            />
          ) : (
            <div
              key={`empty-${index}`}
              className={styles.emptySlot}
              aria-label="空位"
            />
          ),
        )}
      </div>
    </div>
  );
};

export default LetterRack;
