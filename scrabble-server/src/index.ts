import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import { initValidator, buildPrefixSet } from './engine/wordValidator';
import { registerGameHandlers } from './handlers/gameHandler';
import { registerRoomHandlers, handleReconnect } from './handlers/roomHandler';
import { roomManager } from './managers/RoomManager';
import { gameManager } from './managers/GameManager';
import { roomStore } from './data/roomStore';

const app = express();
const server = http.createServer(app);

// CORS: allow all origins for development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: roomManager.getActiveRoomCount(),
    timestamp: Date.now(),
  });
});

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Provide IO instance to GameManager
gameManager.setIO(io);

// ===== Socket Connection Handler =====

io.on('connection', (socket) => {
  console.log(`[Server] Client connected: ${socket.id}`);

  // Store player ID for this socket
  let currentPlayerId: string | null = null;
  let currentRoomCode: string | null = null;

  // Register event handlers
  registerRoomHandlers(socket);
  registerGameHandlers(socket);

  // Handle reconnection with existing player ID
  socket.on('RECONNECT', (payload: { playerId: string }) => {
    currentPlayerId = payload.playerId;
    handleReconnect(socket, payload.playerId);

    // Find which room this player is in
    const room = roomManager.findRoomByPlayer(payload.playerId);
    if (room) {
      currentRoomCode = room.roomCode;
      socket.join(room.roomCode);
    }

    console.log(`[Server] Player ${payload.playerId} reconnected on socket ${socket.id}`);
  });

  // Track room association (when client tells us they're in a room)
  socket.on('SET_ROOM', (payload: { roomCode: string; playerId: string }) => {
    currentRoomCode = payload.roomCode;
    currentPlayerId = payload.playerId;
    socket.join(payload.roomCode);
    roomManager.updateSocketId(payload.roomCode, payload.playerId, socket.id);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Server] Client disconnected: ${socket.id}`);

    if (currentRoomCode && currentPlayerId) {
      const room = roomManager.getRoom(currentRoomCode);
      if (room) {
        const player = room.players.find(p => p.id === currentPlayerId);
        if (player) {
          player.status = 'disconnected';

          // Notify opponent
          room.players.forEach(p => {
            if (p.id !== currentPlayerId) {
              const oppSocketId = roomManager.getPlayerSocket(currentRoomCode!, p.id);
              if (oppSocketId) {
                io.to(oppSocketId).emit('OPPONENT_DISCONNECTED', {
                  playerId: currentPlayerId,
                  message: '对手已断开连接',
                });
              }
            }
          });

          // If game is in progress, start a grace period
          if (room.phase === 'playing') {
            console.log(`[Server] Player ${currentPlayerId} disconnected during game. Starting grace period.`);

            // Give 60 seconds for reconnection, then end game
            setTimeout(() => {
              const currentRoom = roomManager.getRoom(currentRoomCode!);
              if (currentRoom && currentRoom.phase === 'playing') {
                const disconnectedPlayer = currentRoom.players.find(p => p.id === currentPlayerId && p.status === 'disconnected');
                if (disconnectedPlayer) {
                  gameManager.endGame(currentRoom, 'player_disconnected');
                }
              }
            }, 60000);
          } else if (room.phase === 'lobby') {
            // In lobby, remove the player and notify
            roomManager.leaveRoom(currentRoomCode!, currentPlayerId!);
            room.players.forEach(p => {
              const oppSocketId = roomManager.getPlayerSocket(currentRoomCode!, p.id);
              if (oppSocketId) {
                io.to(oppSocketId).emit('PLAYER_LEFT', {
                  playerId: currentPlayerId,
                  roomCode: currentRoomCode,
                  message: '对手已离开房间',
                });
              }
            });
          }
        }
      }
    }
  });
});

// ===== Server Startup =====

async function start(): Promise<void> {
  try {
    // Initialize word validator
    console.log('[Server] Initializing word dictionary...');
    await initValidator();
    buildPrefixSet();

    // Start listening
    server.listen(config.port, () => {
      console.log(`[Server] Scrabble server running on http://localhost:${config.port}`);
      console.log(`[Server] WebSocket ready for connections`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('[Server] Ready to accept game connections!');
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Server] Shutting down...');
  io.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');
  io.close();
  server.close();
  process.exit(0);
});

start();
