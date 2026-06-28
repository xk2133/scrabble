import React from 'react';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  onSkip: () => void;
  onSubmit: () => void;
  onRecall: () => void;
  onHint: () => void;
  canSubmit: boolean;
  hasPlacedTiles: boolean;
  isPlayerTurn: boolean;
  hintsRemaining: number;
  loading?: boolean;
  className?: string;
}

const ActionBar: React.FC<ActionBarProps> = ({
  onSkip,
  onSubmit,
  onRecall,
  onHint,
  canSubmit,
  hasPlacedTiles,
  isPlayerTurn,
  hintsRemaining,
  loading = false,
  className,
}) => {
  const turnDisabled = !isPlayerTurn;

  return (
    <div className={[styles.actionBar, className].filter(Boolean).join(' ')}>
      {/* Recall */}
      <button
        className={`${styles.btn} ${styles.btnRecall}`}
        onClick={onRecall}
        disabled={turnDisabled || !hasPlacedTiles}
      >
        撤回
      </button>

      {/* Skip */}
      <button
        className={`${styles.btn} ${styles.btnSkip}`}
        onClick={onSkip}
        disabled={turnDisabled}
      >
        跳过
      </button>

      {/* Hint */}
      <button
        className={`${styles.btn} ${styles.btnHint}`}
        onClick={onHint}
        disabled={turnDisabled || hintsRemaining <= 0}
      >
        提示({hintsRemaining})
      </button>

      {/* Submit */}
      <button
        className={`${styles.btn} ${styles.btnSubmit}`}
        onClick={onSubmit}
        disabled={turnDisabled || !canSubmit || !hasPlacedTiles || loading}
      >
        {loading ? '提交中...' : '提交'}
      </button>
    </div>
  );
};

export default ActionBar;
