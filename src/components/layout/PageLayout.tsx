import React from 'react';
import TabBar from './TabBar';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  showTabBar?: boolean;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  children: React.ReactNode;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  showBack = false,
  onBack,
  showTabBar = true,
  currentPath = '/',
  onNavigate,
  children,
  className = '',
}) => {
  return (
    <div className={`${styles.layout} ${className}`}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {showBack && (
              <button
                className={styles.backBtn}
                onClick={onBack}
                aria-label="返回"
              >
                ←
              </button>
            )}
          </div>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.headerRight} />
        </header>

        {/* Main content */}
        <main
          className={styles.main}
          style={{
            paddingBottom: showTabBar
              ? 'calc(var(--space-7) + var(--space-3) + env(safe-area-inset-bottom, 0px))'
              : undefined,
          }}
        >
          {children}
        </main>

        {/* Tab bar */}
        {showTabBar && onNavigate && (
          <TabBar currentPath={currentPath} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
};

export default PageLayout;
