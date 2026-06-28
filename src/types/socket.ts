// ===== 英语棋 Socket Event Types =====

import type { GameState, MoveResult } from './game';

/** Events the server emits to the client */
export interface ServerToClientEvents {
  /** Full game state update */
  gameState: (state: GameState) => void;
  /** Result of a submitted move */
  moveResult: (result: MoveResult) => void;
  /** Room created successfully */
  roomCreated: (roomCode: string) => void;
  /** Successfully joined a room */
  roomJoined: (state: GameState) => void;
  /** Opponent has disconnected */
  opponentDisconnected: () => void;
  /** Error message from server */
  error: (message: string) => void;
  /** Found a match in quick match queue */
  matchFound: (roomCode: string) => void;
}

/** Events the client emits to the server */
export interface ClientToServerEvents {
  /** Create a new game room */
  createRoom: (playerName: string) => void;
  /** Join an existing room by code */
  joinRoom: (roomCode: string, playerName: string) => void;
  /** Submit tiles for the current move */
  submitMove: (tiles: PlacedTileInput[]) => void;
  /** Skip the current turn */
  skipTurn: () => void;
  /** Join the quick match queue */
  quickMatch: (playerName: string) => void;
  /** Leave the current room */
  leaveRoom: () => void;
}

import type { PlacedTileInput } from './game';
