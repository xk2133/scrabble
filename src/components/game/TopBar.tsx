import React, { useEffect, useRef, useState } from 'react';
import Avatar from '../ui/Avatar';
import styles from './TopBar.module.css';

interface PlayerInfo {
  name: string;
  avatar?: string;
}

interface TopBarProps {
  playerInfo: PlayerInfo;
  opponentInfo: PlayerInfo;
  playerScore: number;
  opponentScore: number;
  onQuit?: () => void;
  className?: string;
}

const AnimatedScore: React.FC<{ score: number }> = ({ score }) => {
  const [animating, setAnimating] = useState(false);
  const prevScore = useRef(score);

  useEffect(() => {
    if (score !== prevScore.current) {
      setAnimating(true);
      prevScore.current = score;
      const t = setTimeout(() => setAnimating(false), 600);
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <span className={`${styles.scoreValue} ${animating ? styles.scorePop : ''}`}>
      {score}
    </span>
  );
};

const TopBar: React.FC<TopBarProps> = ({
  playerInfo,
  opponentInfo,
  playerScore,
  opponentScore,
  onQuit,
  className,
}) => {
  return (
    <div className={[styles.topBar, className].filter(Boolean).join(' ')}>
      {/* Left: opponent avatar + nickname + score */}
      <div className={styles.left}>
        <Avatar name={opponentInfo.name} src={opponentInfo.avatar} size="md" />
        <div className={styles.playerMeta}>
          <span className={styles.nickname}>{opponentInfo.name}</span>
          <AnimatedScore score={opponentScore} />
        </div>
      </div>

      {/* Center spacer */}
      <div className={styles.center} />

      {/* Right: self score + nickname + avatar + quit */}
      <div className={styles.right}>
        <div className={styles.playerMeta}>
          <span className={styles.nickname}>{playerInfo.name}</span>
          <AnimatedScore score={playerScore} />
        </div>
        <Avatar name={playerInfo.name} src={playerInfo.avatar} size="md" />
        {onQuit && (
          <button className={styles.quitBtn} onClick={onQuit} title="退出游戏">
            ←
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBar;
