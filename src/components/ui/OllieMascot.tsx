import React from 'react';
import styles from './OllieMascot.module.css';

type OllieExpression = 'smile' | 'happy' | 'thinking' | 'encourage' | 'confused' | 'surprised';

interface OllieMascotProps {
  expression?: OllieExpression;
  size?: number;
  message?: string;
  headOnly?: boolean;
  className?: string;
}

const EXPRESSION_EMOJI: Record<OllieExpression, string> = {
  smile: '🦉',
  happy: '🦉',
  thinking: '🦉',
  encourage: '🦉',
  confused: '🦉',
  surprised: '🦉',
};

const OllieMascot: React.FC<OllieMascotProps> = ({
  expression = 'smile',
  size = 80,
  message,
  headOnly = false,
  className = '',
}) => {
  return (
    <div
      className={`${styles.container} ${className}`}
      style={{ '--ollie-size': `${size}px` } as React.CSSProperties}
    >
      {message && (
        <div className={styles.bubble}>
          <span className={styles.bubbleText}>{message}</span>
        </div>
      )}
      <div className={`${styles.ollie} ${headOnly ? styles.headOnly : ''} ${styles[expression] || styles.smile}`}>
        {/* Ears */}
        <div className={`${styles.ear} ${styles.earLeft}`} />
        <div className={`${styles.ear} ${styles.earRight}`} />

        {/* Eyes */}
        <div className={`${styles.eye} ${styles.eyeLeft}`}>
          <div className={styles.pupil} />
        </div>
        <div className={`${styles.eye} ${styles.eyeRight}`}>
          <div className={styles.pupil} />
        </div>

        {/* Beak */}
        <div className={styles.beak} />

        {/* Expression modifiers - eyebrows for emotion */}
        <div className={`${styles.brow} ${styles.browLeft}`} />
        <div className={`${styles.brow} ${styles.browRight}`} />

        {!headOnly && (
          <>
            <div className={`${styles.wing} ${styles.wingLeft}`} />
            <div className={`${styles.wing} ${styles.wingRight}`} />
            <span className={styles.emoji}>{EXPRESSION_EMOJI[expression]}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OllieMascot;
