import React, { useEffect, useRef, useState } from 'react';
import styles from './MatchButton.module.css';

type MatchState = 'idle' | 'matching' | 'matched' | 'timeout';

interface MatchButtonProps {
  state: MatchState;
  elapsedSeconds?: number;
  onMatch: () => void;
  className?: string;
}

const MatchButton: React.FC<MatchButtonProps> = ({
  state,
  elapsedSeconds = 0,
  onMatch,
  className,
}) => {
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (state === 'matching') {
      setDisplaySeconds(elapsedSeconds);
      intervalRef.current = setInterval(() => {
        setDisplaySeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setDisplaySeconds(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state, elapsedSeconds]);

  const handleClick = () => {
    if (state === 'idle' || state === 'timeout') {
      onMatch();
    }
  };

  const classes = [
    styles.button,
    styles[state],
    className,
  ].filter(Boolean).join(' ');

  const isClickable = state === 'idle' || state === 'timeout';

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <>
            <span className={styles.icon}>⚡</span>
            <span className={styles.label}>开始</span>
          </>
        );
      case 'matching':
        return (
          <>
            <span className={styles.spinner} />
            <span className={styles.label}>
              匹配中... 已等待 {displaySeconds} 秒
            </span>
          </>
        );
      case 'matched':
        return (
          <>
            <span className={styles.icon}>✅</span>
            <span className={styles.label}>匹配成功，正在进入...</span>
          </>
        );
      case 'timeout':
        return (
          <>
            <span className={styles.icon}>⏳</span>
            <span className={styles.label}>暂无在线玩家，点击重试</span>
          </>
        );
    }
  };

  return (
    <button
      className={classes}
      onClick={handleClick}
      disabled={!isClickable}
      type="button"
    >
      <span className={styles.inner}>
        {renderContent()}
      </span>
    </button>
  );
};

export default MatchButton;
