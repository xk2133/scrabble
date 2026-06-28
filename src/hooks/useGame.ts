import { useState, useCallback, useRef } from 'react';
import type { BoardState } from '../types/board';
import type { Tile } from '../types/tile';
import type { PlacedTileInput } from '../types/game';
import type { Trie } from '../engine/trie';
import { createEmptyBoard, cloneBoard, placeTilesOnBoard, canPlaceTile } from '../engine/boardUtils';
import { TileBag } from '../engine/tileBag';
import { validateWords } from '../engine/wordValidator';
import { calculateMoveScore } from '../engine/scoreCalculator';

export type CurrentPlayer = 'player' | 'ai';

interface UseGameReturn {
  board: BoardState;
  playerRack: Tile[];
  currentPlayer: CurrentPlayer;
  phase: 'WAITING' | 'PLAYING' | 'ENDED';
  scores: { player: number; ai: number };
  selectedTileIndex: number | null;
  placedTiles: Map<string, PlacedTileInput>;
  error: string | null;
  lastMoveWords: string[];
  lastMoveScore: number;
  tileBagRemaining: number;
  turnMessage: string;
  selectTile: (index: number) => void;
  placeTile: (row: number, col: number) => void;
  removeTile: (row: number, col: number) => void;
  recallAll: () => void;
  submitMove: () => void;
  skipTurn: () => void;
  resetGame: () => void;
}

export function useGame(trie: Trie | null): UseGameReturn {
  const [board, setBoard] = useState<BoardState>(createEmptyBoard);
  const [playerRack, setPlayerRack] = useState<Tile[]>([]);
  const [aiRack, setAiRack] = useState<Tile[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer>('player');
  const [phase, setPhase] = useState<'WAITING' | 'PLAYING' | 'ENDED'>('WAITING');
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [placedTiles, setPlacedTiles] = useState<Map<string, PlacedTileInput>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [lastMoveWords, setLastMoveWords] = useState<string[]>([]);
  const [lastMoveScore, setLastMoveScore] = useState(0);
  const [turnMessage, setTurnMessage] = useState('');

  const tileBagRef = useRef(new TileBag());
  const passesInRowRef = useRef(0);
  const initializedRef = useRef(false);

  const initGame = useCallback(() => {
    const bag = new TileBag();
    tileBagRef.current = bag;
    setPlayerRack(bag.draw(7));
    setAiRack(bag.draw(7));
    setBoard(createEmptyBoard());
    setCurrentPlayer('player');
    setPhase('PLAYING');
    setScores({ player: 0, ai: 0 });
    setSelectedTileIndex(null);
    setPlacedTiles(new Map());
    setError(null);
    setLastMoveWords([]);
    setLastMoveScore(0);
    setTurnMessage('你的回合');
    passesInRowRef.current = 0;
  }, []);

  if (!initializedRef.current) {
    initializedRef.current = true;
    setTimeout(() => initGame(), 0);
  }

  const selectTile = useCallback((index: number) => {
    if (currentPlayer !== 'player' || phase !== 'PLAYING') return;
    setSelectedTileIndex(prev => (prev === index ? null : index));
  }, [currentPlayer, phase]);

  const placeTile = useCallback((row: number, col: number) => {
    if (currentPlayer !== 'player' || phase !== 'PLAYING' || selectedTileIndex === null) return;
    const key = `${row},${col}`;
    if (placedTiles.has(key) || !canPlaceTile(row, col, board)) return;
    const tile = playerRack[selectedTileIndex];
    if (!tile) return;
    setPlacedTiles(prev => {
      const next = new Map(prev);
      next.set(key, { row, col, letter: tile.letter, points: tile.points, isBlank: false });
      return next;
    });
    setSelectedTileIndex(null);
    setError(null);
  }, [currentPlayer, phase, selectedTileIndex, board, playerRack, placedTiles]);

  const removeTile = useCallback((row: number, col: number) => {
    if (currentPlayer !== 'player' || phase !== 'PLAYING') return;
    setPlacedTiles(prev => {
      const next = new Map(prev);
      next.delete(`${row},${col}`);
      return next;
    });
  }, [currentPlayer, phase]);

  const recallAll = useCallback(() => {
    setPlacedTiles(new Map());
    setSelectedTileIndex(null);
    setError(null);
  }, []);

  const submitMove = useCallback(() => {
    if (currentPlayer !== 'player' || phase !== 'PLAYING') return;
    if (!trie) { setError('词典未加载完成'); return; }
    if (placedTiles.size === 0) { setError('请先在棋盘上放置字母'); return; }

    const tiles = Array.from(placedTiles.values());
    const result = validateWords(tiles, board, trie);
    if (!result.valid) { setError(result.errorMessage || '无效的单词'); return; }

    const scoreResult = calculateMoveScore(tiles, board);
    const newBoard = placeTilesOnBoard(cloneBoard(board), tiles);

    setScores(prev => ({ ...prev, player: prev.player + scoreResult.totalScore }));
    setBoard(newBoard);
    setPlacedTiles(new Map());
    setSelectedTileIndex(null);
    setError(null);
    setLastMoveWords(result.words);
    setLastMoveScore(scoreResult.totalScore);
    passesInRowRef.current = 0;

    // Redraw tiles
    const usedKeys = new Set(tiles.map(t => `${t.letter}-${t.points}`));
    const kept = playerRack.filter((t, i) => {
      if (selectedTileIndex === i) return false;
      const key = `${t.letter}-${t.points}`;
      if (usedKeys.has(key)) { usedKeys.delete(key); return false; }
      return true;
    });
    const drawn = tileBagRef.current.draw(7 - kept.length);
    setPlayerRack([...kept, ...drawn]);

    if (tileBagRef.current.isEmpty() && kept.length + drawn.length === 0) {
      setPhase('ENDED');
      return;
    }

    // AI turn
    setCurrentPlayer('ai');
    setTurnMessage('AI 思考中...');
    setTimeout(() => {
      const bag = tileBagRef.current;
      const aRack = aiRack;
      let moved = false;
      const bEmpty = newBoard.every(r => r.every(c => !c.tile));

      if (bEmpty && aRack.length > 0 && trie) {
        const word = aRack.slice(0, Math.min(3, aRack.length)).map(t => t.letter).join('');
        if (trie.search(word)) {
          const aiTiles: PlacedTileInput[] = aRack.slice(0, word.length).map((t, i) => ({
            row: 7, col: 7 - Math.floor(word.length / 2) + i, letter: t.letter, points: t.points,
          }));
          const sc = calculateMoveScore(aiTiles, newBoard);
          const nb = placeTilesOnBoard(cloneBoard(newBoard), aiTiles);
          setBoard(nb);
          setScores(prev => ({ ...prev, ai: prev.ai + sc.totalScore }));
          setLastMoveWords([word]);
          setLastMoveScore(sc.totalScore);
          const rem = aRack.slice(word.length);
          setAiRack([...rem, ...bag.draw(7 - rem.length)]);
          moved = true;
        }
      }

      if (!moved) {
        for (let r = 0; r < 15 && !moved; r++) {
          for (let c = 0; c < 15 && !moved; c++) {
            if (!newBoard[r][c].tile) continue;
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            for (const [dr, dc] of dirs) {
              const nr = r + dr, nc = c + dc;
              if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15 || newBoard[nr][nc].tile) continue;
              for (let ti = 0; ti < aRack.length && !moved; ti++) {
                const at: PlacedTileInput = { row: nr, col: nc, letter: aRack[ti].letter, points: aRack[ti].points };
                const sc = calculateMoveScore([at], newBoard);
                const nb2 = placeTilesOnBoard(cloneBoard(newBoard), [at]);
                setBoard(nb2);
                setScores(prev => ({ ...prev, ai: prev.ai + sc.totalScore }));
                setLastMoveWords([aRack[ti].letter]);
                setLastMoveScore(sc.totalScore);
                const rem2 = aRack.filter((_, i2) => i2 !== ti);
                setAiRack([...rem2, ...bag.draw(7 - rem2.length)]);
                moved = true;
              }
            }
          }
        }
      }

      if (!moved) {
        if (bag.remaining() > 0) {
          const sw = aRack.slice(1);
          setAiRack([...sw, ...bag.draw(1)]);
        }
        passesInRowRef.current++;
      }

      setCurrentPlayer('player');
      setTurnMessage('你的回合');
    }, 1200);
  }, [currentPlayer, phase, trie, placedTiles, board, playerRack, aiRack]);

  const skipTurn = useCallback(() => {
    if (currentPlayer !== 'player' || phase !== 'PLAYING') return;
    passesInRowRef.current++;
    setPlacedTiles(new Map());
    setSelectedTileIndex(null);
    setError(null);
    setCurrentPlayer('ai');
    setTurnMessage('AI 思考中...');
    setTimeout(() => {
      setCurrentPlayer('player');
      setTurnMessage('你的回合');
    }, 800);
  }, [currentPlayer, phase]);

  const resetGame = useCallback(() => {
    initializedRef.current = false;
    initGame();
  }, [initGame]);

  return {
    board, playerRack, currentPlayer, phase, scores,
    selectedTileIndex, placedTiles, error, lastMoveWords, lastMoveScore,
    tileBagRemaining: tileBagRef.current.remaining(), turnMessage,
    selectTile, placeTile, removeTile, recallAll, submitMove, skipTurn, resetGame,
  };
}
