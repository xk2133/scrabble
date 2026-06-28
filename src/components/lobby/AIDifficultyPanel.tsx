import React from 'react';
import type { AIDifficulty } from '../../types/game';
import styles from './AIDifficultyPanel.module.css';

interface AIDifficultyPanelProps {
  selected: AIDifficulty;
  onSelect: (d: AIDifficulty) => void;
  disabled?: boolean;
  className?: string;
}

interface DifficultyOption {
  value: AIDifficulty;
  title: string;
  stars: string;
  description: string;
}

const OPTIONS: DifficultyOption[] = [
  { value: 'EASY', title: '初级', stars: '⭐', description: '适合新手入门' },
  { value: 'MEDIUM', title: '中级', stars: '⭐⭐', description: '有一定挑战性' },
];

const AIDifficultyPanel: React.FC<AIDifficultyPanelProps> = ({
  selected,
  onSelect,
  disabled = false,
  className,
}) => {
  return (
    <div className={[styles.panel, className].filter(Boolean).join(' ')}>
      <div className={styles.cards}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          const cardClasses = [
            styles.card,
            isSelected ? styles.selected : '',
            disabled ? styles.disabledCard : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={opt.value}
              className={cardClasses}
              onClick={() => onSelect(opt.value)}
              disabled={disabled}
              type="button"
              aria-pressed={isSelected}
            >
              <span className={styles.headerRow}>
                <span className={styles.stars}>{opt.stars}</span>
                <span className={styles.title}>{opt.title}</span>
              </span>
              <span className={styles.desc}>{opt.description}</span>
              {isSelected && <span className={styles.check}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AIDifficultyPanel;
