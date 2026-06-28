import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useGameContext } from '../../context/GameContext';
import { ROUTES } from '../../constants/routes';
import TopBar from '../../components/game/TopBar';
import Board, { type BoardHandle } from '../../components/game/Board';
import LetterRack from '../../components/game/LetterRack';
import ActionBar from '../../components/game/ActionBar';
import ScorePanel from '../../components/game/ScorePanel';
import ResultCard from '../../components/game/ResultCard';
import WordDetailModal from '../../components/word/WordDetailModal';
import { SkeletonText, SkeletonRect } from '../../components/ui/Skeleton';
import styles from './Game.module.css';

interface WordDefinition {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
}

const Game: React.FC = () => {
  const navigate = useNavigate();
  const { playerName, gameMode, gameVariant, aiDifficulty, addToast, updateBestScore, incrementGamesPlayed,
    wordBook, addWordToBook, removeWordFromBook } =
    useAppContext();
  const {
    gameState,
    pendingPlacements,
    selectedTileIndex,
    isSubmitting,
    isAiThinking,
    showScorePanel,
    lastMoveResult,
    showResult,
    errorMessage,
    turnSeconds,
    hintsRemaining,
    isPaused,
    initGame,
    selectTile,
    placeTile,
    removePlacement,
    recallLast,
    useHint,
    togglePause,
    submitMove,
    skipTurn,
    closeScorePanel,
    resetGame,
    closeResult,
    clearError,
  } = useGameContext();

  const boardRef = useRef<BoardHandle>(null);
  const [initialized, setInitialized] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [detailWord, setDetailWord] = useState<string | null>(null);
  const [wordDefinition, setWordDefinition] = useState<WordDefinition | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // Initialize game on mount
  useEffect(() => {
    if (!initialized) {
      if (gameState && gameState.phase === 'PLAYING') {
        setShowContinuePrompt(true);
        setInitialized(true);
      } else {
        setInitialized(true);
        initGame(playerName, gameMode, aiDifficulty, gameVariant);
      }
    }
  }, [initialized, gameState, initGame, playerName, gameMode, aiDifficulty, gameVariant]);

  // Handle continue/restart from prompt
  const handleContinueGame = useCallback(() => {
    setShowContinuePrompt(false);
    // Game state already loaded, just unpause if paused
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

  const handleRestartGame = useCallback(() => {
    setShowContinuePrompt(false);
    resetGame();
    setTimeout(() => {
      initGame(playerName, gameMode, aiDifficulty, gameVariant);
    }, 50);
  }, [resetGame, initGame, playerName, gameMode, aiDifficulty, gameVariant]);

  // Show error as toast
  useEffect(() => {
    if (errorMessage) {
      addToast('error', errorMessage);
      clearError();
    }
  }, [errorMessage, addToast, clearError]);

  // Handle cell click
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.phase !== 'PLAYING' || isAiThinking || isPaused) return;
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.isAI) return;
      const key = `${row},${col}`;
      if (pendingPlacements.has(key)) { removePlacement(row, col); return; }
      if (selectedTileIndex === null) return;
      if (gameState.board[row][col].tile !== null) { addToast('warning', '该位置已有字母块'); return; }
      placeTile(row, col);
    },
    [gameState, isAiThinking, isPaused, pendingPlacements, selectedTileIndex, placeTile, removePlacement, addToast]
  );

  // Handle tile selection in rack
  const handleTileClick = useCallback(
    (index: number) => {
      if (!gameState || gameState.phase !== 'PLAYING' || isAiThinking || isPaused) return;
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.isAI) return;
      if (selectedTileIndex === index) { selectTile(null); } else { selectTile(index); }
    },
    [gameState, isAiThinking, isPaused, selectedTileIndex, selectTile]
  );

  const handleSubmit = useCallback(() => {
    if (!gameState || isSubmitting) return;
    submitMove();
  }, [gameState, isSubmitting, submitMove]);

  const handleRecall = useCallback(() => { recallLast(); }, [recallLast]);
  const handleSkip = useCallback(() => { skipTurn(); }, [skipTurn]);
  const handleHint = useCallback(() => { useHint(); }, [useHint]);
  const handleTogglePause = useCallback(() => { togglePause(); }, [togglePause]);
  const handleCloseScorePanel = useCallback(() => { closeScorePanel(); }, [closeScorePanel]);

  // Word click — fetch dictionary and show detail modal
  const handleWordClick = useCallback((word: string) => {
    setDetailWord(word);
    setWordDefinition(null);
    setDetailError(null);
    setDetailLoading(true);
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`单词 "${word}" 未找到`);
        return res.json();
      })
      .then((data: WordDefinition[]) => {
        if (!data || data.length === 0) throw new Error(`单词 "${word}" 未找到`);
        setWordDefinition(data[0]);
        setDetailLoading(false);
      })
      .catch((err) => {
        setDetailError(err instanceof Error ? err.message : '查询失败');
        setDetailLoading(false);
      });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailWord(null);
    setWordDefinition(null);
    setDetailError(null);
    setDetailLoading(false);
    setSpeaking(false);
  }, []);

  const handleSaveWord = useCallback(() => {
    if (!detailWord || !wordDefinition) return;
    const isSaved = wordBook.some(e => e.word === detailWord);
    if (isSaved) {
      removeWordFromBook(detailWord);
      addToast('info', `已移除 "${detailWord}"`);
    } else {
      const firstDef = wordDefinition.meanings[0]?.definitions[0]?.definition ?? '';
      addWordToBook(detailWord, firstDef);
      addToast('success', `已收藏 "${detailWord}"`);
    }
  }, [detailWord, wordDefinition, wordBook, removeWordFromBook, addWordToBook, addToast]);

  const handlePronounce = useCallback((word: string) => {
    if (speaking) return;
    if (!window.speechSynthesis) { addToast('warning', '浏览器不支持语音功能'); return; }
    setSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => { setSpeaking(false); addToast('error', '发音失败'); };
    window.speechSynthesis.speak(utterance);
  }, [speaking, addToast]);

  // Handle play again
  const handlePlayAgain = useCallback(() => {
    closeResult();
    if (gameState) {
      const player = gameState.players[0];
      updateBestScore(player.score);
      incrementGamesPlayed();
    }
    initGame(playerName, gameMode, aiDifficulty, gameVariant);
  }, [closeResult, gameState, updateBestScore, incrementGamesPlayed, initGame, playerName, gameMode, aiDifficulty, gameVariant]);

  // Handle quit
  const handleQuit = useCallback(() => {
    if (gameState) {
      const player = gameState.players[0];
      updateBestScore(player.score);
      incrementGamesPlayed();
    }
    navigate(ROUTES.HOME);
  }, [gameState, navigate, updateBestScore, incrementGamesPlayed]);

  // Screenshot download
  const handleDownloadScreenshot = useCallback(() => {
    const canvas = boardRef.current?.getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scrabble-board.png';
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', '棋盘截图已保存');
    });
  }, [addToast]);

  // Continue/restart prompt
  if (showContinuePrompt) {
    return (
      <div className={styles.page}>
        <div className={styles.continueOverlay}>
          <div className={styles.continueCard}>
            <img src={`${import.meta.env.BASE_URL}owl.svg`} alt="猫头鹰" className={styles.continueOwl} />
            <h2 className={styles.continueTitle}>检测到未完成的游戏</h2>
            <p className={styles.continueDesc}>是否继续上次的对局？</p>
            <div className={styles.continueActions}>
              <button className={styles.continueBtn} onClick={handleContinueGame}>
                继续游戏
              </button>
              <button className={styles.restartBtn} onClick={handleRestartGame}>
                重新开始
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!gameState) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <SkeletonText lines={1} />
          <SkeletonRect width={320} height={320} />
          <SkeletonText lines={2} />
        </div>
        <p className={styles.loadingText}>正在初始化游戏...</p>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isPlayerTurn = !currentPlayer.isAI && gameState.phase === 'PLAYING';
  const player = gameState.players[0];
  const aiPlayer = gameState.players[1];
  const canSubmit = pendingPlacements.size > 0 && isPlayerTurn && !isPaused;
  const hasPlacedTiles = pendingPlacements.size > 0;

  let resultWinner: 'player' | 'ai' | 'draw' = 'draw';
  if (player.score > aiPlayer.score) { resultWinner = 'player'; }
  else if (aiPlayer.score > player.score) { resultWinner = 'ai'; }

  const wordsPlayed = gameState.wordsHistory || [];

  const isDetailSaved = detailWord ? wordBook.some(e => e.word === detailWord) : false;

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <TopBar
        playerInfo={{ name: player.name }}
        opponentInfo={{ name: aiPlayer.name }}
        playerScore={player.score}
        opponentScore={aiPlayer.score}
        turnSeconds={turnSeconds}
        isPlayerTurn={isPlayerTurn}
        isPaused={isPaused}
        onQuit={handleQuit}
        onTogglePause={handleTogglePause}
      />

      {/* Pause overlay */}
      {isPaused && (
        <div className={styles.pauseOverlay}>
          <div className={styles.pauseCard}>
            <span className={styles.pauseIcon}>⏸</span>
            <span className={styles.pauseText}>游戏已暂停</span>
            <button className={styles.pauseResumeBtn} onClick={handleTogglePause}>
              继续游戏
            </button>
          </div>
        </div>
      )}

      <div className={styles.gameArea}>
        {/* Board */}
        <div className={styles.boardWrapper}>
          <Board
            ref={boardRef}
            board={gameState.board}
            placedTiles={pendingPlacements}
            onCellClick={handleCellClick}
            hasSelectedTile={selectedTileIndex !== null}
            disabled={!isPlayerTurn || isAiThinking || isPaused}
          />
        </div>

        {/* AI thinking indicator */}
        {isAiThinking && (
          <div className={styles.aiThinking}>
            <span className={styles.aiDot} />
            <span className={styles.aiDot} />
            <span className={styles.aiDot} />
            <span className={styles.aiLabel}>AI 思考中...</span>
          </div>
        )}

        {/* Letter rack */}
        <div className={styles.rackWrapper}>
          <LetterRack
            tiles={currentPlayer.isAI ? [] : currentPlayer.rack}
            selectedIndex={selectedTileIndex}
            onTileClick={handleTileClick}
            disabled={!isPlayerTurn || isAiThinking || isPaused}
          />
        </div>

        {/* Action bar */}
        <ActionBar
          onRecall={handleRecall}
          onSubmit={handleSubmit}
          onSkip={handleSkip}
          onHint={handleHint}
          canSubmit={canSubmit}
          hasPlacedTiles={hasPlacedTiles}
          isPlayerTurn={isPlayerTurn && !isPaused}
          hintsRemaining={hintsRemaining}
          loading={isSubmitting}
        />
      </div>

      {/* Score panel overlay */}
      <ScorePanel
        words={lastMoveResult?.words ?? []}
        score={lastMoveResult?.score ?? 0}
        isBingo={lastMoveResult?.isBingo ?? false}
        visible={showScorePanel}
        onClose={handleCloseScorePanel}
        onWordClick={handleWordClick}
      />

      {/* Word detail modal (in-game dictionary) */}
      <WordDetailModal
        word={detailWord ?? ''}
        definition={wordDefinition}
        loading={detailLoading}
        error={detailError}
        visible={detailWord !== null}
        onClose={handleCloseDetail}
        onSave={handleSaveWord}
        isSaved={isDetailSaved}
        onPronounce={handlePronounce}
        speaking={speaking}
      />

      {/* Result card overlay */}
      {showResult && (
        <ResultCard
          winner={resultWinner}
          playerScore={player.score}
          opponentScore={aiPlayer.score}
          wordsPlayed={wordsPlayed}
          bingoCount={lastMoveResult?.isBingo ? 1 : 0}
          onPlayAgain={handlePlayAgain}
          onShare={handleDownloadScreenshot}
          onHome={handleQuit}
        />
      )}
    </div>
  );
};

export default Game;
