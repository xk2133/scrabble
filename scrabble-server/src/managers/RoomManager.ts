import { Room, Player, GamePhase, GameState, AIDifficulty } from '../types/game';
import { config } from '../config';
import { roomStore } from '../data/roomStore';
import { createEmptyBoard } from '../engine/boardUtils';
import { createTileBag, drawTiles } from '../engine/tileBag';

/**
 * Room Manager: handles room lifecycle, player joining/leaving, and cleanup.
 */
class RoomManager {
  /**
   * Generate a unique 6-character room code.
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // Ensure uniqueness
    if (roomStore.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  /**
   * Create a new room.
   */
  createRoom(): { roomCode: string } {
    const roomCode = this.generateRoomCode();
    const room: Room = {
      roomCode,
      players: [],
      gameState: null,
      phase: 'lobby',
      createdAt: Date.now(),
      playerSockets: new Map(),
      currentPlayerId: null,
      turnTimeout: null,
      roomTimeout: null,
      firstMove: true,
      consecutivePasses: 0,
    };

    roomStore.set(roomCode, room);

    // Set timeout for empty room cleanup
    room.roomTimeout = setTimeout(() => {
      const existing = roomStore.get(roomCode);
      if (existing && existing.players.length === 0) {
        this.removeRoom(roomCode);
        console.log(`[RoomManager] Room ${roomCode} cleaned up (timeout, no players)`);
      }
    }, config.roomTimeoutMs);

    console.log(`[RoomManager] Room ${roomCode} created`);
    return { roomCode };
  }

  /**
   * Add a player to a room by room code.
   */
  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
    socketId: string,
    isAI: boolean = false,
    aiDifficulty?: AIDifficulty
  ): { success: boolean; message: string; player?: Player } {
    const room = roomStore.get(roomCode);

    if (!room) {
      return { success: false, message: '房间不存在或已关闭' };
    }

    if (room.phase !== 'lobby') {
      return { success: false, message: '游戏已开始，无法加入' };
    }

    if (room.players.length >= config.maxPlayersPerRoom) {
      return { success: false, message: '房间已满' };
    }

    if (room.players.some(p => p.name === playerName)) {
      return { success: false, message: '房间内已有同名玩家' };
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      rack: [],
      score: 0,
      status: 'online',
      isAI,
      aiDifficulty,
      missedTurns: 0,
    };

    room.players.push(player);
    room.playerSockets.set(playerId, socketId);

    // Clear room cleanup timeout
    if (room.roomTimeout) {
      clearTimeout(room.roomTimeout);
      room.roomTimeout = null;
    }

    console.log(`[RoomManager] Player ${playerName} (${playerId}) joined room ${roomCode}`);
    return { success: true, message: '加入成功', player };
  }

  /**
   * Get a room by code.
   */
  getRoom(roomCode: string): Room | null {
    return roomStore.get(roomCode) ?? null;
  }

  /**
   * Remove a room and cleanup resources.
   */
  removeRoom(roomCode: string): void {
    const room = roomStore.get(roomCode);
    if (room) {
      if (room.turnTimeout) clearTimeout(room.turnTimeout);
      if (room.roomTimeout) clearTimeout(room.roomTimeout);
      roomStore.delete(roomCode);
      console.log(`[RoomManager] Room ${roomCode} removed`);
    }
  }

  /**
   * Remove a player from a room. If room becomes empty, destroy it.
   */
  leaveRoom(roomCode: string, playerId: string): Room | null {
    const room = roomStore.get(roomCode);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);
    room.playerSockets.delete(playerId);

    console.log(`[RoomManager] Player ${playerId} left room ${roomCode}`);

    if (room.players.length === 0) {
      this.removeRoom(roomCode);
      return null;
    }

    return room;
  }

  /**
   * Update a player's socket ID (for reconnection).
   */
  updateSocketId(roomCode: string, playerId: string, socketId: string): void {
    const room = roomStore.get(roomCode);
    if (room) {
      room.playerSockets.set(playerId, socketId);
    }
  }

  /**
   * Check if a player is in any room and return the room.
   */
  findRoomByPlayer(playerId: string): Room | null {
    for (const [_, room] of roomStore) {
      if (room.players.some(p => p.id === playerId)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Get the socket ID for a player in a room.
   */
  getPlayerSocket(roomCode: string, playerId: string): string | null {
    const room = roomStore.get(roomCode);
    return room?.playerSockets.get(playerId) ?? null;
  }

  /**
   * Initialize game state for a room (distribute tiles, set up board).
   */
  initGameState(room: Room): GameState {
    const bag = createTileBag();
    const board = createEmptyBoard();

    // Deal initial tiles to each player
    for (const player of room.players) {
      player.rack = drawTiles(bag, config.rackSize);
    }

    const gameState: GameState = {
      board,
      tileBag: bag,
      moveHistory: [],
      turnNumber: 0,
      lastMove: null,
    };

    room.gameState = gameState;
    return gameState;
  }

  /**
   * Get list of rooms (for debugging).
   */
  getActiveRoomCount(): number {
    return roomStore.size;
  }
}

export const roomManager = new RoomManager();
