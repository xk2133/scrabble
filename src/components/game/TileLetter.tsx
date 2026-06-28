import React from 'react';
import styles from './TileLetter.module.css';

type TileSize = 'rack' | 'board' | 'result';
type TileState = 'default' | 'hover' | 'selected' | 'dragging' | 'placed';

interface TileLetterProps {
  letter: string;
  points: number;
  size?: TileSize;
  state?: TileState;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const TileLetter: React.FC<TileLetterProps> = ({
  letter,
  points,
  size = 'rack',
  state = 'default',
  onClick,
  disabled = false,
  className,
}) => {
  const classes = [
    styles.tile,
    styles[size],
    styles[state],
    disabled ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const displayLetter = letter || '';

  return (
    <div
      className={classes}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`字母 ${displayLetter || '空白'}，${points} 分${state === 'selected' ? '，已选中' : ''}`}
      aria-disabled={disabled}
    >
      <span className={styles.letter}>{displayLetter}</span>
      <span className={styles.points}>{points}</span>
    </div>
  );
};

export default TileLetter;
