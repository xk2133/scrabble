import React from 'react';
import PronunciationButton from './PronunciationButton';
import styles from './WordCard.module.css';

interface WordCardProps {
  word: string;
  definition: string;
  dateAdded?: string;
  isSaved?: boolean;
  speaking?: boolean;
  onPronounce?: (word: string) => void;
  onToggleSave?: () => void;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

const WordCard: React.FC<WordCardProps> = ({
  word,
  definition,
  dateAdded,
  isSaved = false,
  speaking = false,
  onPronounce,
  onToggleSave,
  onRemove,
  onClick,
  className,
}) => {
  return (
    <div
      className={[styles.card, onClick ? styles.clickable : '', className].filter(Boolean).join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.body}>
        <span className={styles.word}>{word}</span>
        <span className={styles.definition}>{definition}</span>
        {dateAdded && <span className={styles.date}>{dateAdded}</span>}
      </div>

      <div className={styles.actions}>
        {onPronounce && (
          <PronunciationButton
            word={word}
            speaking={speaking}
            onPronounce={onPronounce}
            size="sm"
          />
        )}
        {onToggleSave && (
          <button
            className={`${styles.favBtn} ${isSaved ? styles.faved : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            aria-label={isSaved ? '取消收藏' : '收藏'}
            type="button"
          >
            {isSaved ? '♥' : '♡'}
          </button>
        )}
        {onRemove && (
          <button
            className={styles.removeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="移除"
            type="button"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default WordCard;
