// ===== 英语棋 Game Context =====
// Manages full game lifecycle: board, racks, turns, scoring, and AI opponent.
// Word validation uses a Trie built from the 7,062-word ENABLE dictionary.
// AI engine uses anchor-based DFS move generation with prefix pruning.

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type { BoardState, CellType } from '../types/board';
import type { Tile } from '../types/tile';
import type { GameState, GameMode, AIDifficulty, GameVariant, Player, PlacedTileInput } from '../types/game';
import { WINNING_SCORE } from '../types/game';
import { BOARD_SIZE, SPECIAL_CELLS, CENTER_INDEX } from '../constants/board';
import { getTileDistribution } from '../constants/tiles';
import type { TileBagConfig } from '../constants/tiles';
import { Trie, createTrie } from '../engine/trie';
import { computeAIMove } from '../engine/aiEngine';
import type { AIMove } from '../engine/aiTypes';
import { selectMove as greedySelectMove } from '../engine/greedyAI';

const TURN_SECONDS = 60;

// Lazy-load word list (same pattern as useTrie)
let cachedTrie: Trie | null = null;
let trieLoadPromise: Promise<Trie> | null = null;

function getTrie(): Promise<Trie> {
  if (cachedTrie) return Promise.resolve(cachedTrie);
  if (!trieLoadPromise) {
    trieLoadPromise = import('../data/wordList').then(m => {
      cachedTrie = createTrie(m.WORD_LIST);
      return cachedTrie;
    });
  }
  return trieLoadPromise;
}

// ---- Types ----

interface LastMoveResult {
  words: string[];
  score: number;
  isBingo: boolean;
}

interface GameContextType {
  gameState: GameState | null;
  pendingPlacements: Map<string, PlacedTileInput>;
  selectedTileIndex: number | null;
  isSubmitting: boolean;
  isAiThinking: boolean;
  showScorePanel: boolean;
  lastMoveResult: LastMoveResult | null;
  showResult: boolean;
  errorMessage: string | null;
  turnSeconds: number;
  hintsRemaining: number;
  isPaused: boolean;
  initGame: (playerName: string, mode: GameMode, difficulty?: AIDifficulty, variant?: GameVariant) => void;
  selectTile: (index: number | null) => void;
  placeTile: (row: number, col: number) => void;
  removePlacement: (row: number, col: number) => void;
  recallAll: () => void;
  recallLast: () => void;
  useHint: () => void;
  togglePause: () => void;
  submitMove: () => void;
  skipTurn: () => void;
  closeScorePanel: () => void;
  resetGame: () => void;
  closeResult: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// ---- Helpers ----

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildTileBag(distribution: TileBagConfig[]): Tile[] {
  const tiles: Tile[] = [];
  let idCounter = 0;
  for (const config of distribution) {
    for (let i = 0; i < config.count; i++) {
      tiles.push({
        id: `tile_${idCounter++}`,
        letter: config.letter,
        points: config.points,
        isBlank: config.letter === '',
      });
    }
  }
  return shuffleArray(tiles);
}

function buildBoard(): BoardState {
  const board: BoardState = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const key = `${row},${col}`;
      const cellType: CellType = (SPECIAL_CELLS[key] as CellType) || 'NORMAL';
      rowCells.push({ row, col, type: cellType, tile: null });
    }
    board.push(rowCells);
  }
  return board;
}

function drawTiles(tileBag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = tileBag.slice(0, count);
  const remaining = tileBag.slice(count);
  return { drawn, remaining };
}

function getCellMultiplier(cellType: CellType): { letterMult: number; wordMult: number } {
  switch (cellType) {
    case 'DL': return { letterMult: 2, wordMult: 1 };
    case 'TL': return { letterMult: 3, wordMult: 1 };
    case 'DW': return { letterMult: 1, wordMult: 2 };
    case 'TW': return { letterMult: 1, wordMult: 3 };
    case 'CENTER': return { letterMult: 1, wordMult: 2 };
    default: return { letterMult: 1, wordMult: 1 };
  }
}

/** Apply Scrabble final scoring: subtract unplayed tiles, add to opponent */
function applyFinalScoring(state: GameState): GameState {
  const players = state.players.map((p) => {
    const rackPenalty = p.rack.reduce((sum, t) => sum + t.points, 0);
    return { ...p, score: p.score - rackPenalty };
  });

  // If one player emptied their rack, add opponent's penalty to them
  for (let i = 0; i < players.length; i++) {
    const other = players[(i + 1) % players.length];
    if (players[i].rack.length === 0 && other.rack.length > 0) {
      const otherPenalty = other.rack.reduce((sum, t) => sum + t.points, 0);
      players[i] = { ...players[i], score: players[i].score + otherPenalty };
    }
  }

  return { ...state, players, phase: 'ENDED' as const };
}

function isEmptyBoard(board: BoardState): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].tile !== null) return false;
    }
  }
  return true;
}

function coversCenter(placements: PlacedTileInput[]): boolean {
  return placements.some((p) => p.row === CENTER_INDEX && p.col === CENTER_INDEX);
}

function isAdjacentToExisting(board: BoardState, placements: PlacedTileInput[]): boolean {
  for (const p of placements) {
    const { row, col } = p;
    if (row > 0 && board[row - 1][col].tile && !placements.some((pp) => pp.row === row - 1 && pp.col === col)) return true;
    if (row < BOARD_SIZE - 1 && board[row + 1][col].tile && !placements.some((pp) => pp.row === row + 1 && pp.col === col)) return true;
    if (col > 0 && board[row][col - 1].tile && !placements.some((pp) => pp.row === row && pp.col === col - 1)) return true;
    if (col < BOARD_SIZE - 1 && board[row][col + 1].tile && !placements.some((pp) => pp.row === row && pp.col === col + 1)) return true;
  }
  return false;
}

function getPlacedTilesAsInputs(placements: Map<string, PlacedTileInput>): PlacedTileInput[] {
  return Array.from(placements.values());
}

// Expand a contiguous line from a starting cell
function expandWord(
  board: BoardState,
  placements: Map<string, PlacedTileInput>,
  startRow: number,
  startCol: number,
  dRow: number,
  dCol: number
): { word: string; cells: Array<{ row: number; col: number; isNew: boolean }> } {
  let word = '';
  const cells: Array<{ row: number; col: number; isNew: boolean }> = [];

  // Track backwards
  let r = startRow;
  let c = startCol;
  let ch = '';
  do {
    const key = `${r},${c}`;
    const boardTile = board[r]?.[c]?.tile;
    const placedTile = placements.get(key);
    if (boardTile) {
      ch = boardTile.letter || ' ';
      cells.unshift({ row: r, col: c, isNew: false });
    } else if (placedTile) {
      ch = placedTile.letter || ' ';
      cells.unshift({ row: r, col: c, isNew: true });
    } else {
      break;
    }
    word = ch + word;
    r -= dRow;
    c -= dCol;
  } while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE);

  // Track forwards from start+1
  r = startRow + dRow;
  c = startCol + dCol;
  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE) {
    const key = `${r},${c}`;
    const boardTile = board[r]?.[c]?.tile;
    const placedTile = placements.get(key);
    if (boardTile) {
      word += boardTile.letter || '';
      cells.push({ row: r, col: c, isNew: false });
    } else if (placedTile) {
      word += placedTile.letter || '';
      cells.push({ row: r, col: c, isNew: true });
    } else {
      break;
    }
    r += dRow;
    c += dCol;
  }

  return { word, cells };
}

function getAllWordsFormed(
  board: BoardState,
  placements: Map<string, PlacedTileInput>
): Array<{ word: string; cells: Array<{ row: number; col: number; isNew: boolean }> }> {
  const words: Array<{ word: string; cells: Array<{ row: number; col: number; isNew: boolean }> }> = [];
  const processedCells = new Set<string>();

  for (const key of placements.keys()) {
    const [rowStr, colStr] = key.split(',');
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    const hKey = `H:${key}`;
    if (!processedCells.has(hKey)) {
      const hWord = expandWord(board, placements, row, col, 0, 1);
      if (hWord.word.length >= 2) {
        words.push(hWord);
        for (const cell of hWord.cells) {
          processedCells.add(`H:${cell.row},${cell.col}`);
        }
      }
    }

    const vKey = `V:${key}`;
    if (!processedCells.has(vKey)) {
      const vWord = expandWord(board, placements, row, col, 1, 0);
      if (vWord.word.length >= 2) {
        words.push(vWord);
        for (const cell of vWord.cells) {
          processedCells.add(`V:${cell.row},${cell.col}`);
        }
      }
    }
  }

  return words.filter((w) => w.word.length >= 2);
}

function validatePlacement(
  board: BoardState,
  placements: Map<string, PlacedTileInput>,
  trie: Trie
): { score: number; wordsFormed: Array<{ word: string; cells: Array<{ row: number; col: number; isNew: boolean }> }>; valid: boolean; errorMessage?: string } {
  const placementsList = getPlacedTilesAsInputs(placements);
  if (placementsList.length === 0) {
    return { score: 0, wordsFormed: [], valid: false, errorMessage: '请先在棋盘上放置字母' };
  }

  // Check collinearity
  const rows = new Set(placementsList.map((p) => p.row));
  const cols = new Set(placementsList.map((p) => p.col));
  const sameRow = rows.size === 1;
  const sameCol = cols.size === 1;

  if (!sameRow && !sameCol && placementsList.length > 1) {
    return { score: 0, wordsFormed: [], valid: false, errorMessage: '字母块必须在同一行或同一列上' };
  }

  // Check contiguity (gaps must be filled by existing board tiles)
  if (sameRow && placementsList.length > 1) {
    const rowNums = placementsList.map((p) => p.col).sort((a, b) => a - b);
    for (let i = 1; i < rowNums.length; i++) {
      if (rowNums[i] - rowNums[i - 1] !== 1) {
        const r = placementsList[0].row;
        let gapFilled = true;
        for (let c = rowNums[i - 1] + 1; c < rowNums[i]; c++) {
          if (!board[r] || !board[r][c] || !board[r][c].tile) {
            gapFilled = false;
            break;
          }
        }
        if (!gapFilled) {
          return { score: 0, wordsFormed: [], valid: false, errorMessage: '字母块必须连续放置，中间不能有空隙' };
        }
      }
    }
  }

  if (sameCol && placementsList.length > 1) {
    const colNums = placementsList.map((p) => p.row).sort((a, b) => a - b);
    for (let i = 1; i < colNums.length; i++) {
      if (colNums[i] - colNums[i - 1] !== 1) {
        const c = placementsList[0].col;
        let gapFilled = true;
        for (let r = colNums[i - 1] + 1; r < colNums[i]; r++) {
          if (!board[r] || !board[r][c] || !board[r][c].tile) {
            gapFilled = false;
            break;
          }
        }
        if (!gapFilled) {
          return { score: 0, wordsFormed: [], valid: false, errorMessage: '字母块必须连续放置，中间不能有空隙' };
        }
      }
    }
  }

  const isFirst = isEmptyBoard(board);

  // First move must cover center
  if (isFirst && !coversCenter(placementsList)) {
    return { score: 0, wordsFormed: [], valid: false, errorMessage: '第一个单词必须经过中心星形格子 (8H)' };
  }

  // Must be adjacent to existing tiles
  if (!isFirst && !isAdjacentToExisting(board, placementsList)) {
    return { score: 0, wordsFormed: [], valid: false, errorMessage: '字母块必须与已有单词相连' };
  }

  // Get all words formed
  const wordsFormed = getAllWordsFormed(board, placements);

  // Validate each word against the Trie
  for (const wf of wordsFormed) {
    if (!trie.search(wf.word.toUpperCase())) {
      return { score: 0, wordsFormed: [], valid: false, errorMessage: `"${wf.word}" 不是有效的英语单词` };
    }
  }

  if (wordsFormed.length === 0) {
    return { score: 0, wordsFormed: [], valid: false, errorMessage: '未形成有效单词，请尝试不同的放置方式' };
  }

  // Calculate score
  let totalScore = 0;
  for (const wf of wordsFormed) {
    let wordScore = 0;
    let wordMultiplier = 1;
    for (const cell of wf.cells) {
      if (cell.isNew) {
        const boardCell = board[cell.row]?.[cell.col];
        const cellType = boardCell?.type || 'NORMAL';
        const { letterMult, wordMult } = getCellMultiplier(cellType);
        const key = `${cell.row},${cell.col}`;
        const placedTile = placements.get(key);
        const points = placedTile?.points ?? 0;
        wordScore += points * letterMult;
        wordMultiplier *= wordMult;
      } else {
        const boardTile = board[cell.row]?.[cell.col]?.tile;
        if (boardTile) {
          wordScore += boardTile.points;
        }
      }
    }
    wordScore *= wordMultiplier;
    totalScore += wordScore;
  }

  // Bingo bonus
  const isBingo = placementsList.length === 7;
  if (isBingo) totalScore += 50;

  return { score: totalScore, wordsFormed, valid: true };
}

// ---- Provider ----

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingPlacements, setPendingPlacements] = useState<Map<string, PlacedTileInput>>(new Map());
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showScorePanel, setShowScorePanel] = useState(false);
  const [lastMoveResult, setLastMoveResult] = useState<LastMoveResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnSeconds, setTurnSeconds] = useState(TURN_SECONDS);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [isPaused, setIsPaused] = useState(false);

  const tileBagRef = useRef<Tile[]>([]);
  const placementSourceRef = useRef<Map<string, number>>(new Map());
  const placementOrderRef = useRef<string[]>([]);
  const trieRef = useRef<Trie | null>(null);
  const trieReadyRef = useRef<boolean>(false);
  const consecutiveSkipsRef = useRef(0);
  const pendingAITriggerRef = useRef<GameState | null>(null);

  // ---- Timer Countdown ----
  const timerSkipRef = useRef<() => void>(() => {});
  const executeAIMoveRef = useRef<(state: GameState) => void>(() => {});
  timerSkipRef.current = () => {
    if (!gameState || gameState.phase !== 'PLAYING') return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isAI) return;
    // Clear placements & skip to next player
    setPendingPlacements(new Map());
    placementSourceRef.current = new Map();
    placementOrderRef.current = [];
    setSelectedTileIndex(null);
    const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const newState: GameState = {
      ...gameState,
      currentPlayerIndex: nextIndex,
      turnNumber: gameState.turnNumber + 1,
    };
    setTurnSeconds(TURN_SECONDS);
    setGameState(newState);
    if (gameState.players[nextIndex]?.isAI) {
      executeAIMoveRef.current(newState);
    }
  };

  useEffect(() => {
    if (!gameState || gameState.phase !== 'PLAYING') return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isAI || isAiThinking || isPaused) return;

    let timedOut = false;
    const interval = setInterval(() => {
      setTurnSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!timedOut) {
            timedOut = true;
            setTimeout(() => timerSkipRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(interval); };
  }, [gameState?.currentPlayerIndex, gameState?.phase, isAiThinking, isPaused]);

  // Reset timer when turn changes
  const prevTurnRef = useRef(gameState?.currentPlayerIndex);
  useEffect(() => {
    const idx = gameState?.currentPlayerIndex;
    if (idx !== undefined && idx !== prevTurnRef.current) {
      prevTurnRef.current = idx;
      setTurnSeconds(TURN_SECONDS);
    }
  }, [gameState?.currentPlayerIndex]);

  // Ensure Trie is loaded
  const ensureTrie = useCallback(async (): Promise<Trie> => {
    if (trieRef.current && trieReadyRef.current) return trieRef.current;
    const t = await getTrie();
    trieRef.current = t;
    trieReadyRef.current = true;
    return t;
  }, []);

  const initGame = useCallback((playerName: string, mode: GameMode, difficulty?: AIDifficulty, variant?: GameVariant) => {
    const gameVariant: GameVariant = variant || 'FAST';
    const distribution = getTileDistribution(gameVariant);
    const bag = buildTileBag(distribution);
    const board = buildBoard();
    const playerDraw = drawTiles(bag, 7);
    const aiDraw = drawTiles(playerDraw.remaining, 7);

    const players: Player[] = [
      {
        id: 'player_1',
        name: playerName || '玩家',
        score: 0,
        rack: playerDraw.drawn,
        isAI: false,
      },
      {
        id: mode === 'AI' ? 'ai_1' : 'player_2',
        name: mode === 'AI' ? 'AI' : '对手',
        score: 0,
        rack: aiDraw.drawn,
        isAI: mode === 'AI',
      },
    ];

    tileBagRef.current = aiDraw.remaining;

    const state: GameState = {
      board,
      players,
      currentPlayerIndex: 0,
      phase: 'PLAYING',
      mode,
      variant: gameVariant,
      aiDifficulty: difficulty,
      turnNumber: 1,
      tileBagRemaining: aiDraw.remaining.length,
      wordsHistory: [],
    };

    setGameState(state);
    setPendingPlacements(new Map());
    setSelectedTileIndex(null);
    setIsSubmitting(false);
    setIsAiThinking(false);
    setShowScorePanel(false);
    setLastMoveResult(null);
    setShowResult(false);
    setErrorMessage(null);
    setTurnSeconds(TURN_SECONDS);
    setHintsRemaining(3);
    setIsPaused(false);
    consecutiveSkipsRef.current = 0;
    pendingAITriggerRef.current = null;
    placementSourceRef.current = new Map();
    placementOrderRef.current = [];

    // Pre-load the Trie
    ensureTrie();
  }, [ensureTrie]);

  const selectTile = useCallback((index: number | null) => {
    setSelectedTileIndex(index);
  }, []);

  const placeTile = useCallback((row: number, col: number) => {
    if (selectedTileIndex === null || !gameState) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.isAI) return;

    const tile = player.rack[selectedTileIndex];
    if (!tile) return;

    const key = `${row},${col}`;
    if (pendingPlacements.has(key)) return;
    if (gameState.board[row]?.[col]?.tile) return;

    const newPlacements = new Map(pendingPlacements);
    newPlacements.set(key, {
      row, col,
      letter: tile.letter || '',
      points: tile.points,
      isBlank: tile.letter === '',
    });
    setPendingPlacements(newPlacements);

    const newSourceMap = new Map(placementSourceRef.current);
    newSourceMap.set(key, selectedTileIndex);
    placementSourceRef.current = newSourceMap;

    const newOrder = [...placementOrderRef.current, key];
    placementOrderRef.current = newOrder;

    setSelectedTileIndex(null);
  }, [selectedTileIndex, gameState, pendingPlacements]);

  const removePlacement = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    const newPlacements = new Map(pendingPlacements);
    newPlacements.delete(key);
    setPendingPlacements(newPlacements);

    const newSourceMap = new Map(placementSourceRef.current);
    newSourceMap.delete(key);
    placementSourceRef.current = newSourceMap;

    placementOrderRef.current = placementOrderRef.current.filter(k => k !== key);
  }, [pendingPlacements]);

  const recallAll = useCallback(() => {
    setPendingPlacements(new Map());
    setSelectedTileIndex(null);
    placementSourceRef.current = new Map();
    placementOrderRef.current = [];
  }, []);

  const recallLast = useCallback(() => {
    if (placementOrderRef.current.length === 0) return;
    const lastKey = placementOrderRef.current[placementOrderRef.current.length - 1];
    const [rowStr, colStr] = lastKey.split(',');
    removePlacement(parseInt(rowStr, 10), parseInt(colStr, 10));
  }, [removePlacement]);

  // ---- Pause ----
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // ---- Hint System ----
  const useHint = useCallback(async () => {
    if (!gameState || hintsRemaining <= 0) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isAI) return;

    // Clear existing placements
    setPendingPlacements(new Map());
    placementSourceRef.current = new Map();
    placementOrderRef.current = [];
    setSelectedTileIndex(null);

    const trie = await ensureTrie();

    // Use greedy AI to find best move (instant, no simulated delay)
    const move = greedySelectMove(gameState.board, currentPlayer.rack, trie);

    if (move.type === 'place' && move.placements.length > 0) {
      const newPlacements = new Map<string, PlacedTileInput>();
      const newSources = new Map<string, number>();
      const newOrder: string[] = [];

      // Track which rack tiles we've used
      const usedRackIndices = new Set<number>();

      for (const p of move.placements) {
        // Find matching unused tile in rack
        const rackIdx = currentPlayer.rack.findIndex(
          (t, i) => t.letter === p.letter && !usedRackIndices.has(i)
        );
        if (rackIdx === -1) continue;

        usedRackIndices.add(rackIdx);
        const key = `${p.row},${p.col}`;
        newPlacements.set(key, {
          row: p.row,
          col: p.col,
          letter: p.letter,
          points: p.points,
          isBlank: false,
        });
        newSources.set(key, rackIdx);
        newOrder.push(key);
      }

      setPendingPlacements(newPlacements);
      placementSourceRef.current = newSources;
      placementOrderRef.current = newOrder;
      setHintsRemaining(h => h - 1);
    } else if (move.type === 'swap') {
      const swapLetters = move.returnedTiles?.map(t => t.letter).join(', ') || '';
      setErrorMessage(`💡 建议交换字母: ${swapLetters}`);
      setHintsRemaining(h => h - 1);
    } else {
      setErrorMessage('暂无有效提示，请尝试自行放置');
    }
  }, [gameState, hintsRemaining, ensureTrie]);

  // ---- AI Move Execution ----
  const executeAIMove = useCallback(async (state: GameState) => {
    setIsAiThinking(true);

    try {
      const trie = await ensureTrie();
      const aiPlayer = state.players[state.currentPlayerIndex];
      if (!aiPlayer?.isAI) { setIsAiThinking(false); return; }

      // Convert AI rack tiles to the format expected by AI engine
      const rack: Tile[] = aiPlayer.rack;

      const aiMove: AIMove = await computeAIMove(
        state.board,
        rack,
        state.aiDifficulty || 'EASY',
        trie
      );

      const updatedPlayers = [...state.players];
      let newBoard = state.board;

      if (aiMove.type === 'place' && aiMove.placements.length > 0) {
        // Place tiles on board
        newBoard = state.board.map(row => row.map(cell => ({ ...cell, tile: cell.tile ? { ...cell.tile } : null })));
        for (const p of aiMove.placements) {
          if (newBoard[p.row]?.[p.col]) {
            newBoard[p.row][p.col] = {
              ...newBoard[p.row][p.col],
              tile: { letter: p.letter, points: p.points, isBlank: p.isBlank || false },
            };
          }
        }

        // Remove used tiles from rack
        const usedLetters = aiMove.placements.map(p => p.letter);
        let newRack = [...aiPlayer.rack];
        for (const letter of usedLetters) {
          const idx = newRack.findIndex(t => t.letter === letter);
          if (idx !== -1) newRack.splice(idx, 1);
        }

        // Draw replacement tiles
        const tilesNeeded = Math.min(7 - newRack.length, tileBagRef.current.length);
        const { drawn, remaining } = drawTiles(tileBagRef.current, tilesNeeded);
        tileBagRef.current = remaining;
        newRack = [...newRack, ...drawn];

        updatedPlayers[state.currentPlayerIndex] = {
          ...aiPlayer,
          rack: newRack,
          score: aiPlayer.score + aiMove.score,
        };
      } else if (aiMove.type === 'swap' && aiMove.returnedTiles && aiMove.returnedTiles.length > 0) {
        // Swap tiles: return some to bag, draw replacements
        const swapIds = new Set(aiMove.returnedTiles.map(t => t.id));
        let newRack = aiPlayer.rack.filter(t => !swapIds.has(t.id));

        // Return swapped tiles to bag and shuffle
        const returned = aiPlayer.rack.filter(t => swapIds.has(t.id));
        tileBagRef.current = shuffleArray([...tileBagRef.current, ...returned]);

        // Draw replacements
        const { drawn, remaining } = drawTiles(tileBagRef.current, aiMove.returnedTiles.length);
        tileBagRef.current = remaining;
        newRack = [...newRack, ...drawn];

        updatedPlayers[state.currentPlayerIndex] = {
          ...aiPlayer,
          rack: newRack,
        };
      }
      // else: skip — no changes to board or rack

      // Advance to next player
      const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
      const newState: GameState = {
        ...state,
        board: newBoard,
        players: updatedPlayers,
        currentPlayerIndex: nextIdx,
        turnNumber: state.turnNumber + 1,
        tileBagRemaining: tileBagRef.current.length,
        lastMoveWords: aiMove.words,
        lastMoveScore: aiMove.score,
        wordsHistory: [...(state.wordsHistory || []), ...aiMove.words],
      };

      // Reset consecutive skips on valid move
      consecutiveSkipsRef.current = 0;

      // Check end conditions: bag+rack empty, turn limit, or score target (fast mode)
      const currentPlayerRack = updatedPlayers[state.currentPlayerIndex]?.rack;
      const fastWin = state.variant === 'FAST' && updatedPlayers.some(p => p.score >= WINNING_SCORE);
      if ((tileBagRef.current.length === 0 && currentPlayerRack && currentPlayerRack.length === 0) ||
          newState.turnNumber > 100 ||
          fastWin) {
        const finalState = applyFinalScoring(newState);
        setGameState(finalState);
        setIsAiThinking(false);
        setLastMoveResult({ words: aiMove.words, score: aiMove.score, isBingo: aiMove.placements.length === 7 });
        setShowResult(true);
        return;
      }

      setGameState(newState);
      setIsAiThinking(false);

      if (aiMove.words.length > 0) {
        setLastMoveResult({ words: aiMove.words, score: aiMove.score, isBingo: aiMove.placements.length === 7 });
        setShowScorePanel(true);
      }
    } catch (err) {
      console.error('[GameContext] AI move error:', err);
      setIsAiThinking(false);

      // Skip turn on error
      const nextIdx = (state.currentPlayerIndex + 1) % state.players.length;
      setGameState({
        ...state,
        currentPlayerIndex: nextIdx,
        turnNumber: state.turnNumber + 1,
      });
    }
  }, [ensureTrie]);

  executeAIMoveRef.current = executeAIMove;

  // ---- Player Actions ----

  const skipTurn = useCallback(() => {
    if (!gameState || gameState.phase !== 'PLAYING') return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isAI) return;

    recallAll();

    // Track consecutive skips (both players skipping = 6 consecutive)
    consecutiveSkipsRef.current += 1;
    if (consecutiveSkipsRef.current >= 6) {
      const finalState = applyFinalScoring({ ...gameState, phase: 'ENDED' as const });
      setGameState(finalState);
      setShowResult(true);
      return;
    }

    const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const newState: GameState = {
      ...gameState,
      currentPlayerIndex: nextIndex,
      turnNumber: gameState.turnNumber + 1,
    };
    setGameState(newState);

    // Trigger AI if next player is AI
    if (gameState.players[nextIndex]?.isAI) {
      executeAIMove(newState);
    }
  }, [gameState, recallAll, executeAIMove]);

  const submitMove = useCallback(async () => {
    if (!gameState || gameState.phase !== 'PLAYING') return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isAI) return;

    setIsSubmitting(true);

    // Ensure Trie is ready for validation
    const trie = await ensureTrie();

    const result = validatePlacement(gameState.board, pendingPlacements, trie);

    if (!result.valid) {
      setErrorMessage(result.errorMessage || '无效的放置');
      setIsSubmitting(false);
      return;
    }

    // Commit to board
    const newBoard = gameState.board.map(row => row.map(cell => ({ ...cell, tile: cell.tile ? { ...cell.tile } : null })));
    for (const [key, input] of pendingPlacements) {
      const [row, col] = key.split(',').map(Number);
      if (newBoard[row] && newBoard[row][col]) {
        newBoard[row][col] = {
          ...newBoard[row][col],
          tile: { letter: input.letter, points: input.points, isBlank: input.isBlank || false },
        };
      }
    }

    // Remove used tiles from rack
    const usedIndices = new Set(placementSourceRef.current.values());
    const newRack = currentPlayer.rack.filter((_tile, idx) => !usedIndices.has(idx));

    // Draw new tiles
    const tilesNeeded = Math.min(7 - newRack.length, tileBagRef.current.length);
    const { drawn, remaining } = drawTiles(tileBagRef.current, tilesNeeded);
    tileBagRef.current = remaining;
    const finalRack = [...newRack, ...drawn];

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === currentPlayer.id) {
        return { ...p, rack: finalRack, score: p.score + result.score };
      }
      return p;
    });

    const wordStrings = result.wordsFormed.map(wf => wf.word);
    const isBingo = pendingPlacements.size === 7;

    setLastMoveResult({ words: wordStrings, score: result.score, isBingo });
    setShowScorePanel(true);

    setPendingPlacements(new Map());
    placementSourceRef.current = new Map();
    placementOrderRef.current = [];
    setSelectedTileIndex(null);

    const nextIdx = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const newState: GameState = {
      ...gameState,
      board: newBoard,
      players: updatedPlayers,
      currentPlayerIndex: nextIdx,
      turnNumber: gameState.turnNumber + 1,
      tileBagRemaining: tileBagRef.current.length,
      lastMoveWords: wordStrings,
      lastMoveScore: result.score,
      wordsHistory: [...(gameState.wordsHistory || []), ...wordStrings],
    };

    // Reset consecutive skips on valid move
    consecutiveSkipsRef.current = 0;

    // Check end conditions: bag+rack empty, turn limit, or score target (fast mode)
    const fastWin = gameState.variant === 'FAST' && updatedPlayers.some(p => p.score >= WINNING_SCORE);
    if ((tileBagRef.current.length === 0 && finalRack.length === 0) ||
        newState.turnNumber > 100 ||
        fastWin) {
      // Apply final scoring
      const finalState = applyFinalScoring(newState);
      setGameState(finalState);
      setIsSubmitting(false);
      setShowResult(true);
      return;
    }

    setGameState(newState);
    setIsSubmitting(false);

    // Defer AI trigger — user reviews score first, AI moves after closing panel
    const nextPlayer = updatedPlayers[nextIdx];
    if (nextPlayer?.isAI) {
      pendingAITriggerRef.current = newState;
    }
  }, [gameState, pendingPlacements, ensureTrie, executeAIMove]);

  const closeScorePanel = useCallback(() => {
    setShowScorePanel(false);
    // Trigger deferred AI move after player has reviewed score
    const pendingState = pendingAITriggerRef.current;
    if (pendingState) {
      pendingAITriggerRef.current = null;
      executeAIMove(pendingState);
    }
  }, [executeAIMove]);
  const resetGame = useCallback(() => {
    setGameState(null);
    setPendingPlacements(new Map());
    setSelectedTileIndex(null);
    setIsSubmitting(false);
    setIsAiThinking(false);
    setShowScorePanel(false);
    setLastMoveResult(null);
    setShowResult(false);
    setErrorMessage(null);
    setTurnSeconds(TURN_SECONDS);
    setHintsRemaining(3);
    setIsPaused(false);
    consecutiveSkipsRef.current = 0;
    pendingAITriggerRef.current = null;
    placementSourceRef.current = new Map();
    placementOrderRef.current = [];
    tileBagRef.current = [];
  }, []);
  const closeResult = useCallback(() => setShowResult(false), []);
  const clearError = useCallback(() => setErrorMessage(null), []);

  const value: GameContextType = {
    gameState, pendingPlacements, selectedTileIndex,
    isSubmitting, isAiThinking, showScorePanel,
    lastMoveResult, showResult, errorMessage,
    turnSeconds, hintsRemaining, isPaused,
    initGame, selectTile, placeTile, removePlacement,
    recallAll, recallLast, useHint, togglePause, submitMove, skipTurn,
    resetGame, closeScorePanel, closeResult, clearError,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextType {
  const ctx = useContext(GameContext);
  if (ctx === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return ctx;
}
