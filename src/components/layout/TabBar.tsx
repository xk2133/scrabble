import React from 'react';
import styles from './TabBar.module.css';

interface Tab {
  path: string;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { path: '/', label: '大厅', icon: '🏠' },
  { path: '/wordbook', label: '单词本', icon: '📖' },
  { path: '/help', label: '帮助', icon: '❓' },
];

interface TabBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

const TabBar: React.FC<TabBarProps> = ({
  currentPath,
  onNavigate,
  className = '',
}) => {
  return (
    <nav className={`${styles.tabBar} ${className}`}>
      {tabs.map((tab) => {
        const isActive = currentPath === tab.path;
        return (
          <button
            key={tab.path}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onNavigate(tab.path)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default TabBar;
