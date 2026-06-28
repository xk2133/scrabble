import React from 'react';
import styles from './PronunciationButton.module.css';

interface PronunciationButtonProps {
  word: string;
  speaking: boolean;
  onPronounce: (word: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS: Record<string, string> = {
  sm: styles.sm,
  md: styles.md,
};

const PronunciationButton: React.FC<PronunciationButtonProps> = ({
  word,
  speaking,
  onPronounce,
  size = 'md',
  className,
}) => {
  const btnClasses = [
    styles.button,
    SIZE_CLASS[size],
    speaking && styles.speaking,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrapper}>
      <button
        className={btnClasses}
        onClick={() => onPronounce(word)}
        aria-label={speaking ? '正在发音' : `听 ${word} 的发音`}
        type="button"
      >
        <span className={styles.icon}>{speaking ? '🔊' : '🔈'}</span>
      </button>
      {speaking && (
        <>
          <span className={styles.ring1} />
          <span className={styles.ring2} />
          <span className={styles.ring3} />
        </>
      )}
    </div>
  );
};

export default PronunciationButton;
