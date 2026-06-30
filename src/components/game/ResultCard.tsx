import React from 'react';
import styles from './ResultCard.module.css';

interface ResultCardProps {
  winner: 'player' | 'ai' | 'draw';
  playerName: string;
  opponentName: string;
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
  player: { title: '恭喜你赢了！', cls: 'player' },
  ai: { title: '你输了', cls: 'ai' },
  draw: { title: '平局！', cls: 'draw' },
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
  playerName,
  opponentName,
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
        {/* Owl image */}
        <img
          src={`${import.meta.env.BASE_URL}owl.svg`}
          alt="猫头鹰"
          className={styles.owlImg}
        />

        <h2 className={`${styles.title} ${styles[`title${config.cls.charAt(0).toUpperCase() + config.cls.slice(1)}`] || ''}`}>
          {config.title}
        </h2>

        {/* Score comparison */}
        <div className={styles.scores}>
          <div className={styles.scoreBlock}>
            <span className={styles.scoreLabel}>{playerName}</span>
            <span className={styles.scoreValue}>{playerScore}</span>
          </div>
          <span className={styles.vs}>VS</span>
          <div className={styles.scoreBlock}>
            <span className={styles.scoreLabel}>{opponentName}</span>
            <span className={styles.scoreValue}>{opponentScore}</span>
          </div>
        </div>

        {/* Stats — side by side */}
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
