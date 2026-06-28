import React from 'react';
import styles from './Timer.module.css';

interface TimerProps {
  seconds: number;
  isRunning: boolean;
  warning?: boolean;
  className?: string;
}

const FULL_DASH = 2 * Math.PI * 18;
const SIZE = 44;
const CENTER = SIZE / 2;
const RADIUS = 18;

const Timer: React.FC<TimerProps> = ({
  seconds,
  isRunning,
  warning = false,
  className,
}) => {
  const clamped = Math.max(0, Math.min(seconds, 60));
  const progress = clamped / 60;
  const dashOffset = FULL_DASH * (1 - progress);
  const display = String(clamped).padStart(2, '0');

  const circleClasses = [
    styles.timer,
    isRunning && styles.running,
    warning && styles.warning,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={circleClasses}
      aria-label={`剩余 ${display} 秒`}
      role="timer"
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.svg}
      >
        {/* Background track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="rgba(27,73,101,0.1)"
          strokeWidth={3}
        />
        {/* Progress arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={FULL_DASH}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          className={styles.progressRing}
        />
      </svg>
      <span className={styles.time}>{display}</span>
    </div>
  );
};

export default Timer;
