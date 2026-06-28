import { Socket } from 'socket.io';
import { ServerMessage } from '../types/socket';
import { roomManager } from '../managers/RoomManager';
import { gameManager } from '../managers/GameManager';
import { matchmakingQueue } from '../managers/MatchmakingQueue';
import { AIDifficulty, Player } from '../types/game';
// Simple unique ID generator
function generateId(): string {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Register all room-related socket event handlers.
 */
export function registerRoomHandlers(socket: Socket): void {
  /**
   * CREATE_ROOM — create a new room.
   */
  socket.on('CREATE_ROOM', (payload: { playerName: string; isAI?: boolean; aiDifficulty?: AIDifficulty }) => {
    const { playerName, isAI = false, aiDifficulty } = payload;

    if (!playerName || playerName.trim().length === 0) {
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        payload: { code: 'INVALID_NAME', message: '请输入有效的玩家名称' },
      };
      socket.emit('ERROR', errorMsg.payload);
      return;
    }

    // Create room
    const { roomCode } = roomManager.createRoom();

    // Create the human player
    const playerId = generateId();

    const result = roomManager.joinRoom(roomCode, playerId, playerName.trim(), socket.id, false);

    if (!result.success) {
      roomManager.removeRoom(roomCode);
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        payload: { code: 'JOIN_FAILED', message: result.message },
      };
      socket.emit('ERROR', errorMsg.payload);
      return;
    }

    // If AI game, add AI opponent immediately
    if (isAI && aiDifficulty) {
      const aiId = generateId();
      const aiResult = roomManager.joinRoom(
        roomCode,
        aiId,
        `AI (${aiDifficulty === 'easy' ? '简单' : aiDifficulty === 'medium' ? '中等' : '困难'})`,
        'ai_' + aiId,
        true,
        aiDifficulty
      );

      if (aiResult.success) {
        console.log(`[RoomHandler] AI opponent added to room ${roomCode}`);
      }
    }

    // Notify creator
    const room = roomManager.getRoom(roomCode);
    const createdMsg: ServerMessage = {
      type: 'ROOM_CREATED',
      payload: {
        roomCode,
        playerId,
      },
    };
    socket.emit('ROOM_CREATED', createdMsg.payload);

    // Also send room update
    if (room) {
      const updateMsg: ServerMessage = {
        type: 'ROOM_UPDATE',
        payload: {
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            rack: [],
            score: p.score,
            status: p.status,
            isAI: p.isAI,
            aiDifficulty: p.aiDifficulty,
            missedTurns: p.missedTurns,
          })),
          phase: room.phase,
        },
      };
      socket.emit('ROOM_UPDATE', updateMsg.payload);

      // If room has 2 players, start the game
      if (room.players.length === 2) {
        // Small delay before starting
        setTimeout(() => {
          const currentRoom = roomManager.getRoom(roomCode);
          if (currentRoom && currentRoom.phase === 'lobby') {
            gameManager.startGame(currentRoom);
          }
        }, 1500);
      }
    }

    console.log(`[RoomHandler] Room ${roomCode} created by ${playerName}`);
  });

  /**
   * JOIN_ROOM — join an existing room by code.
   */
  socket.on('JOIN_ROOM', (payload: { roomCode: string; playerName: string }) => {
    const { roomCode, playerName } = payload;

    if (!playerName || playerName.trim().length === 0) {
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        payload: { code: 'INVALID_NAME', message: '请输入有效的玩家名称' },
      };
      socket.emit('ERROR', errorMsg.payload);
      return;
    }

    const cleanRoomCode = roomCode.trim().toUpperCase();
    const playerId = generateId();

    const result = roomManager.joinRoom(cleanRoomCode, playerId, playerName.trim(), socket.id);

    if (!result.success) {
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        payload: { code: 'JOIN_FAILED', message: result.message },
      };
      socket.emit('ERROR', errorMsg.payload);
      return;
    }

    const room = roomManager.getRoom(cleanRoomCode);
    if (!room) return;

    // Notify the joining player
    const joinedMsg: ServerMessage = {
      type: 'ROOM_JOINED',
      payload: {
        roomCode: cleanRoomCode,
        playerId,
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          rack: [],
          score: p.score,
          status: p.status,
          isAI: p.isAI,
          aiDifficulty: p.aiDifficulty,
          missedTurns: p.missedTurns,
        })),
        phase: room.phase,
      },
    };
    socket.emit('ROOM_JOINED', joinedMsg.payload);

    // Notify existing players in the room
    room.players.forEach(p => {
      if (p.id !== playerId) {
        const oppSocketId = roomManager.getPlayerSocket(cleanRoomCode, p.id);
        if (oppSocketId) {
          const updateMsg: ServerMessage = {
            type: 'ROOM_UPDATE',
            payload: {
              players: room.players.map(pp => ({
                id: pp.id,
                name: pp.name,
                rack: [],
                score: pp.score,
                status: pp.status,
                isAI: pp.isAI,
                aiDifficulty: pp.aiDifficulty,
                missedTurns: pp.missedTurns,
              })),
              phase: room.phase,
            },
          };
          socket.to(oppSocketId).emit('ROOM_UPDATE', updateMsg.payload);
        }
      }
    });

    // If room has 2 players, start the game
    if (room.players.length === 2) {
      setTimeout(() => {
        const currentRoom = roomManager.getRoom(cleanRoomCode);
        if (currentRoom && currentRoom.phase === 'lobby') {
          gameManager.startGame(currentRoom);
        }
      }, 1500);
    }

    console.log(`[RoomHandler] ${playerName} joined room ${cleanRoomCode}`);
  });

  /**
   * START_AI_GAME — start a game against AI (creates room + AI opponent).
   */
  socket.on('START_AI_GAME', (payload: { playerName: string; aiDifficulty: AIDifficulty }) => {
    const { playerName, aiDifficulty } = payload;

    if (!playerName || playerName.trim().length === 0) {
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        payload: { code: 'INVALID_NAME', message: '请输入有效的玩家名称' },
      };
      socket.emit('ERROR', errorMsg.payload);
      return;
    }

    // Re-use CREATE_ROOM with isAI flag
    socket.emit('CREATE_ROOM', {
      playerName: playerName.trim(),
      isAI: true,
      aiDifficulty,
    });
  });

  /**
   * QUICK_MATCH — join matchmaking queue.
   */
  socket.on('QUICK_MATCH', (payload: { playerName: string }) => {
    const { playerName } = payload;

    if (!playerName || playerName.trim().length === 0) {
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        payload: { code: 'INVALID_NAME', message: '请输入有效的玩家名称' },
      };
      socket.emit('ERROR', errorMsg.payload);
      return;
    }

    const playerId = generateId();
    const result = matchmakingQueue.joinQueue(playerId, playerName.trim(), socket.id);

    if (result.matched && result.roomCode) {
      // We got a match — the room has been created with both players
      // Now we need to update the socket associations
      const room = roomManager.getRoom(result.roomCode);
      if (!room) return;

      // The queue already created the room with both players
      // Update socket mapping for this player
      roomManager.updateSocketId(result.roomCode, playerId, socket.id);

      // Notify this player
      const opponent = room.players.find(p => p.id !== playerId);
      const matchMsg: ServerMessage = {
        type: 'MATCH_FOUND',
        payload: {
          roomCode: result.roomCode,
          opponent: opponent ? {
            id: opponent.id,
            name: opponent.name,
            rack: [],
            score: opponent.score,
            status: opponent.status,
            isAI: opponent.isAI,
            missedTurns: opponent.missedTurns,
          } : {} as Player,
          yourPlayerId: playerId,
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            rack: [],
            score: p.score,
            status: p.status,
            isAI: p.isAI,
            missedTurns: p.missedTurns,
          })),
        },
      };
      socket.emit('MATCH_FOUND', matchMsg.payload);

      // Notify opponent
      if (opponent) {
        const oppSocketId = roomManager.getPlayerSocket(result.roomCode, opponent.id);
        if (oppSocketId) {
          const oppMatchMsg: ServerMessage = {
            type: 'MATCH_FOUND',
            payload: {
              roomCode: result.roomCode,
              opponent: {
                id: playerId,
                name: playerName.trim(),
                rack: [],
                score: 0,
                status: 'online' as const,
                isAI: false,
                missedTurns: 0,
              },
              yourPlayerId: opponent.id,
              players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                rack: [],
                score: p.score,
                status: p.status,
                isAI: p.isAI,
                missedTurns: p.missedTurns,
              })),
            },
          };
          socket.to(oppSocketId).emit('MATCH_FOUND', oppMatchMsg.payload);
        }
      }

      // Start the game
      setTimeout(() => {
        const currentRoom = roomManager.getRoom(result.roomCode!);
        if (currentRoom && currentRoom.phase === 'lobby') {
          gameManager.startGame(currentRoom);
        }
      }, 2000);

    } else {
      // Waiting for opponent
      const queueMsg: ServerMessage = {
        type: 'QUEUE_STATUS',
        payload: { position: result.position || 1 },
      };
      socket.emit('QUEUE_STATUS', queueMsg.payload);
    }
  });
}

/**
 * Handle socket disconnection within room context.
 */
export function handleDisconnect(socket: Socket): void {
  // Check if in matchmaking queue
  matchmakingQueue.leaveQueue(socket.id);

  // Room cleanup on disconnect is handled in index.ts
  // since we need access to roomStore to iterate all rooms.

  console.log(`[RoomHandler] Socket disconnected: ${socket.id}`);
}

/**
 * Handle reconnection — check if the player was in a room.
 */
export function handleReconnect(socket: Socket, playerId: string): void {
  const room = roomManager.findRoomByPlayer(playerId);
  if (!room) return;

  // Update socket ID
  roomManager.updateSocketId(room.roomCode, playerId, socket.id);

  // Update player status
  const player = room.players.find(p => p.id === playerId);
  if (player) {
    player.status = 'online';
  }

  // If game is in progress, send current state
  if (room.phase === 'playing' && room.gameState) {
    const reconnectMsg: ServerMessage = {
      type: 'PLAYER_RECONNECTED',
      payload: {
        playerId,
        roomCode: room.roomCode,
        gameState: {
          board: room.gameState.board,
          currentPlayerId: room.currentPlayerId || '',
          yourRack: player?.rack || [],
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            rack: [],
            score: p.score,
            status: p.status,
            isAI: p.isAI,
            missedTurns: p.missedTurns,
          })),
          turnNumber: room.gameState.turnNumber,
        },
      },
    };
    socket.emit('PLAYER_RECONNECTED', reconnectMsg.payload);
  }

  // Notify opponent
  room.players.forEach(p => {
    if (p.id !== playerId) {
      const oppSocketId = roomManager.getPlayerSocket(room.roomCode, p.id);
      if (oppSocketId) {
        const oppReconnectMsg: ServerMessage = {
          type: 'OPPONENT_RECONNECTED',
          payload: { playerId },
        };
        socket.to(oppSocketId).emit('OPPONENT_RECONNECTED', oppReconnectMsg.payload);
      }
    }
  });

  console.log(`[RoomHandler] Player ${playerId} reconnected to room ${room.roomCode}`);
}
