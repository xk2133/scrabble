// ===== 英语棋 App Context =====
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { GameMode, AIDifficulty, GameVariant } from '../types/game';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface WordEntry {
  word: string;
  definition: string;
  dateAdded: string;
}

interface AppContextType {
  playerName: string;
  setPlayerName: (name: string) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  gameVariant: GameVariant;
  setGameVariant: (v: GameVariant) => void;
  aiDifficulty: AIDifficulty;
  setAIDifficulty: (d: AIDifficulty) => void;
  wordBook: WordEntry[];
  addWordToBook: (word: string, definition: string) => void;
  removeWordFromBook: (word: string) => void;
  gamesPlayed: number;
  bestScore: number;
  updateBestScore: (score: number) => void;
  incrementGamesPlayed: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerNameState] = useState<string>(() =>
    localStorage.getItem('ewc_playerName') || ''
  );
  const [gameMode, setGameModeState] = useState<GameMode>('AI');
  const [gameVariant, setGameVariantState] = useState<GameVariant>('FAST');
  const [aiDifficulty, setAIDifficultyState] = useState<AIDifficulty>('EASY');
  const [wordBook, setWordBook] = useState<WordEntry[]>(() =>
    loadJSON<WordEntry[]>('ewc_wordBook', [])
  );
  const [gamesPlayed, setGamesPlayed] = useState<number>(() =>
    parseInt(localStorage.getItem('ewc_gamesPlayed') || '0', 10)
  );
  const [bestScore, setBestScore] = useState<number>(() =>
    parseInt(localStorage.getItem('ewc_bestScore') || '0', 10)
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    localStorage.setItem('ewc_playerName', name);
  }, []);

  const setGameMode = useCallback((mode: GameMode) => {
    setGameModeState(mode);
  }, []);

  const setGameVariant = useCallback((v: GameVariant) => {
    setGameVariantState(v);
  }, []);

  const setAIDifficulty = useCallback((d: AIDifficulty) => {
    setAIDifficultyState(d);
  }, []);

  const addWordToBook = useCallback((word: string, definition: string) => {
    setWordBook((prev) => {
      if (prev.some((w) => w.word === word)) return prev;
      const entry: WordEntry = {
        word,
        definition,
        dateAdded: new Date().toLocaleDateString('zh-CN'),
      };
      const updated = [...prev, entry];
      localStorage.setItem('ewc_wordBook', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeWordFromBook = useCallback((word: string) => {
    setWordBook((prev) => {
      const updated = prev.filter((w) => w.word !== word);
      localStorage.setItem('ewc_wordBook', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateBestScore = useCallback((score: number) => {
    setBestScore((prev) => {
      if (score > prev) {
        localStorage.setItem('ewc_bestScore', String(score));
        return score;
      }
      return prev;
    });
  }, []);

  const incrementGamesPlayed = useCallback(() => {
    setGamesPlayed((prev) => {
      const next = prev + 1;
      localStorage.setItem('ewc_gamesPlayed', String(next));
      return next;
    });
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  const value: AppContextType = {
    playerName,
    setPlayerName,
    gameMode,
    setGameMode,
    gameVariant,
    setGameVariant,
    aiDifficulty,
    setAIDifficulty,
    wordBook,
    addWordToBook,
    removeWordFromBook,
    gamesPlayed,
    bestScore,
    updateBestScore,
    incrementGamesPlayed,
    soundEnabled,
    setSoundEnabled,
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (ctx === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
