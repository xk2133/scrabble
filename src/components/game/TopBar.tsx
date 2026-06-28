import React, { useEffect, useRef, useState } from 'react';
import Avatar from '../ui/Avatar';
import Timer from './Timer';
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
  turnSeconds: number;
  isPlayerTurn: boolean;
  isPaused: boolean;
  onQuit?: () => void;
  onTogglePause?: () => void;
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
  turnSeconds,
  isPlayerTurn,
  isPaused,
  onQuit,
  onTogglePause,
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

      {/* Center: timer + pause */}
      <div className={styles.center}>
        <Timer
          seconds={turnSeconds}
          isRunning={isPlayerTurn && !isPaused}
          warning={turnSeconds <= 10}
        />
        {onTogglePause && (
          <button
            className={styles.pauseBtn}
            onClick={onTogglePause}
            title={isPaused ? '继续' : '暂停'}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        )}
      </div>

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
