import React from 'react';
import OllieMascot from '../ui/OllieMascot';
import styles from './ResultCard.module.css';

interface ResultCardProps {
  winner: 'player' | 'ai' | 'draw';
  playerScore: number;
  opponentScore: number;
  wordsPlayed: string[];
  bingoCount: number;
  onPlayAgain: () => void;
  onShare: () => void;
  onHome?: () => void;
  className?: string;
}

const RESULT_CONFIG = {
  player: {
    title: '恭喜你赢了！',
    expression: 'happy' as const,
    message: '太棒了！',
  },
  ai: {
    title: '你输了',
    expression: 'confused' as const,
    message: '再接再厉！',
  },
  draw: {
    title: '平局！',
    expression: 'surprised' as const,
    message: '势均力敌！',
  },
};

function getLongestWord(words: string[]): string {
  if (words.length === 0) return '—';
  let longest = words[0];
  for (const w of words) {
    if (w.length > longest.length) longest = w;
  }
  return longest;
}

const ResultCard: React.FC<ResultCardProps> = ({
  winner,
  playerScore,
  opponentScore,
  wordsPlayed,
  bingoCount,
  onPlayAgain,
  onShare,
  onHome,
  className,
}) => {
  const config = RESULT_CONFIG[winner];
  const longestWord = getLongestWord(wordsPlayed);

  return (
    <div className={[styles.overlay, className].filter(Boolean).join(' ')}>
      <div className={styles.card}>
        {/* Ollie mascot with expression */}
        <OllieMascot
          expression={config.expression}
          size={96}
          message={config.message}
        />

        <h2 className={`${styles.title} ${styles[`title${winner.charAt(0).toUpperCase() + winner.slice(1)}`] || ''}`}>
          {config.title}
        </h2>

        {/* Score comparison */}
        <div className={styles.scores}>
          <div className={styles.scoreBlock}>
            <span className={styles.scoreLabel}>你的分数</span>
            <span className={styles.scoreValue}>{playerScore}</span>
          </div>
          <span className={styles.vs}>VS</span>
          <div className={styles.scoreBlock}>
            <span className={styles.scoreLabel}>AI 分数</span>
            <span className={styles.scoreValue}>{opponentScore}</span>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>单词数</span>
            <span className={styles.statValue}>{wordsPlayed.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>最长单词</span>
            <span className={styles.statValue}>{longestWord}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Bingo</span>
            <span className={styles.statValue}>{bingoCount}</span>
          </div>
        </div>

        {/* Word list */}
        {wordsPlayed.length > 0 && (
          <div className={styles.wordsSection}>
            <h3 className={styles.wordsTitle}>本局单词</h3>
            <div className={styles.wordsList}>
              {wordsPlayed.map((word) => (
                <span key={word} className={styles.wordTag}>
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={onPlayAgain}>
            再来一局
          </button>
          <button className={styles.btnShare} onClick={onShare}>
            下载棋盘截图
          </button>
        </div>

        {onHome && (
          <button className={styles.btnHome} onClick={onHome}>
            返回首页
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultCard;
