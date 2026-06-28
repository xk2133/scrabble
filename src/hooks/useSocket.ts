import { useState, useEffect, useCallback } from 'react';
import { socket, connectSocket, disconnectSocket } from '../services/socketService';
import type { GameState, MoveResult, PlacedTileInput } from '../types/game';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [moveResult, setMoveResult] = useState<MoveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameState', setGameState);
    socket.on('moveResult', setMoveResult);
    socket.on('error', setError);
    socket.on('roomCreated', setRoomCode);
    socket.on('matchFound', setRoomCode);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameState', setGameState);
      socket.off('moveResult', setMoveResult);
      socket.off('error', setError);
      socket.off('roomCreated', setRoomCode);
      socket.off('matchFound', setRoomCode);
    };
  }, []);

  const connect = useCallback(() => connectSocket(), []);
  const disconnect = useCallback(() => disconnectSocket(), []);
  const createRoom = useCallback((name: string) => { socket.emit('createRoom', name); }, []);
  const joinRoom = useCallback((code: string, name: string) => { socket.emit('joinRoom', code, name); }, []);
  const submitMove = useCallback((tiles: PlacedTileInput[]) => { socket.emit('submitMove', tiles); }, []);
  const skipTurn = useCallback(() => { socket.emit('skipTurn'); }, []);
  const quickMatch = useCallback((name: string) => { socket.emit('quickMatch', name); }, []);
  const leaveRoom = useCallback(() => {
    socket.emit('leaveRoom');
    setRoomCode(null);
    setGameState(null);
  }, []);
  const clearError = useCallback(() => setError(null), []);
  const clearMoveResult = useCallback(() => setMoveResult(null), []);

  return {
    connected, gameState, moveResult, error, roomCode,
    connect, disconnect, createRoom, joinRoom, submitMove,
    skipTurn, quickMatch, leaveRoom, clearError, clearMoveResult,
  };
}
