import React, { useEffect, useRef, useState } from 'react';
import styles from './ScorePanel.module.css';

interface ScorePanelProps {
  words: string[];
  score: number;
  isBingo: boolean;
  visible: boolean;
  onClose: () => void;
  onWordClick?: (word: string) => void;
  className?: string;
}

const AnimatedScore: React.FC<{ score: number }> = ({ score }) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = display;
    const end = score;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out bounce
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return <span className={styles.scoreValue}>{display}</span>;
};

const ScorePanel: React.FC<ScorePanelProps> = ({
  words,
  score,
  isBingo,
  visible,
  onClose,
  onWordClick,
  className,
}) => {
  if (!visible) return null;

  return (
    <div className={[styles.overlay, className].filter(Boolean).join(' ')}>
      <div className={styles.panel}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
          ×
        </button>

        <div className={styles.scoreSummary}>
          <span className={styles.scoreLabel}>本轮得分</span>
          <AnimatedScore score={score} />
        </div>

        {isBingo && (
          <div className={styles.bingoBadge}>
            <span className={styles.bingoSparkle} />
            🎉 宾果！+50分奖励！
            <span className={styles.bingoSparkle} />
          </div>
        )}

        <ul className={styles.wordList}>
          {words.map((word) => (
            <li
              key={word}
              className={styles.wordItem}
              onClick={() => onWordClick?.(word)}
              role={onWordClick ? 'button' : undefined}
              tabIndex={onWordClick ? 0 : undefined}
            >
              <span className={styles.checkmark}>✓</span>
              <span className={styles.wordText}>{word}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ScorePanel;
