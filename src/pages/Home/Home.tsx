import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ROUTES } from '../../constants/routes';
import type { GameMode, AIDifficulty, GameVariant } from '../../types/game';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import MatchButton from '../../components/lobby/MatchButton';
import AIDifficultyPanel from '../../components/lobby/AIDifficultyPanel';
import RoomPanel from '../../components/lobby/RoomPanel';
import TabBar from '../../components/layout/TabBar';
import styles from './Home.module.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    playerName,
    setPlayerName,
    gameMode,
    setGameMode,
    gameVariant,
    setGameVariant,
    aiDifficulty,
    setAIDifficulty,
    gamesPlayed,
    bestScore,
    addToast,
  } = useAppContext();

  const [nameInput, setNameInput] = useState(playerName);
  const [isStarting, setIsStarting] = useState(false);

  const handleSetName = useCallback(() => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      addToast('warning', '请输入你的名字');
      return;
    }
    setPlayerName(trimmed);
    addToast('success', `欢迎，${trimmed}！`);
  }, [nameInput, setPlayerName, addToast]);

  const handleStartGame = useCallback(() => {
    if (!playerName.trim()) {
      addToast('warning', '请先设置你的名字');
      return;
    }
    setIsStarting(true);
    setTimeout(() => {
      setIsStarting(false);
      navigate(ROUTES.GAME);
    }, 400);
  }, [playerName, navigate, addToast]);

  const handleModeChange = useCallback(
    (mode: GameMode) => {
      setGameMode(mode);
    },
    [setGameMode]
  );

  const handleVariantChange = useCallback(
    (variant: GameVariant) => {
      setGameVariant(variant);
    },
    [setGameVariant]
  );

  const handleDifficultyChange = useCallback(
    (d: AIDifficulty) => {
      setAIDifficulty(d);
    },
    [setAIDifficulty]
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Hero Title */}
        <div className={styles.hero}>
          <div className={styles.titleRow}>
            <img src="/owl.svg" alt="猫头鹰" className={styles.owlImg} />
            <h1 className={styles.title}>Scrabble</h1>
          </div>
        </div>

        {/* Player Name Section */}
        <section className={styles.nameSection}>
          {!playerName ? (
            <div className={styles.nameSetup}>
              <Input
                label="你的名字"
                placeholder="输入你的名字..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleSetName}
                fullWidth
              >
                确认
              </Button>
            </div>
          ) : (
            <div className={styles.greeting}>
              <Avatar name={playerName} size="md" online />
              <span className={styles.greetingText}>
                欢迎, {playerName}!
              </span>
            </div>
          )}
        </section>

        {/* Game Mode Tabs */}
        <section className={styles.modeSection}>
          <div className={styles.modeTabs}>
            <button
              className={`${styles.modeTab} ${gameMode === 'AI' ? styles.modeTabActive : ''}`}
              onClick={() => handleModeChange('AI')}
              type="button"
            >
              AI对战
              {gameMode === 'AI' && <span className={styles.modeCheck}>✓</span>}
            </button>
            <button
              className={`${styles.modeTab} ${gameMode === 'PVP' ? styles.modeTabActive : ''}`}
              onClick={() => handleModeChange('PVP')}
              type="button"
            >
              玩家对战
              {gameMode === 'PVP' && <span className={styles.modeCheck}>✓</span>}
            </button>
          </div>

          {/* AI Difficulty / Room Panel */}
          <div className={styles.modeContent}>
            {gameMode === 'AI' ? (
              <AIDifficultyPanel
                selected={aiDifficulty}
                onSelect={handleDifficultyChange}
              />
            ) : (
              <RoomPanel disabled />
            )}
          </div>
        </section>

        {/* Game Variant Selector */}
        <section className={styles.variantSection}>
          <div className={styles.variantTabs}>
            <button
              className={`${styles.variantTab} ${gameVariant === 'FAST' ? styles.variantTabActive : ''}`}
              onClick={() => handleVariantChange('FAST')}
              type="button"
            >
              <span className={styles.variantIcon}>🚀</span>
              <span className={styles.variantTitle}>快速对战</span>
              <span className={styles.variantDesc}>60字母 · 150分获胜</span>
              {gameVariant === 'FAST' && <span className={styles.variantCheck}>✓</span>}
            </button>
            <button
              className={`${styles.variantTab} ${gameVariant === 'STANDARD' ? styles.variantTabActive : ''}`}
              onClick={() => handleVariantChange('STANDARD')}
              type="button"
            >
              <span className={styles.variantIcon}>📜</span>
              <span className={styles.variantTitle}>标准对战</span>
              <span className={styles.variantDesc}>100字母 · 经典规则</span>
              {gameVariant === 'STANDARD' && <span className={styles.variantCheck}>✓</span>}
            </button>
          </div>
        </section>

        {/* Start Game Button */}
        <section className={styles.startSection}>
          <MatchButton
            state={isStarting ? 'matching' : 'idle'}
            onMatch={handleStartGame}
          />
        </section>

        {/* Quick Stats */}
        <section className={styles.statsSection}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{gamesPlayed}</span>
            <span className={styles.statLabel}>对战次数</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{bestScore}</span>
            <span className={styles.statLabel}>最高分</span>
          </div>
        </section>
      </main>

      <TabBar currentPath={location.pathname} onNavigate={(path) => navigate(path)} />
    </div>
  );
};

export default Home;
