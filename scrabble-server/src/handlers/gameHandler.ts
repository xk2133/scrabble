import { Socket } from 'socket.io';
import { ClientMessage, ServerMessage } from '../types/socket';
import { roomManager } from '../managers/RoomManager';
import { gameManager } from '../managers/GameManager';
import { TilePlacement, RackTile } from '../types/game';

/**
 * Register all game-related socket event handlers.
 */
export function registerGameHandlers(socket: Socket): void {
  /**
   * PLACE_TILE — client wants to place tiles on the board (tentative).
   * The board state is managed server-side, so this just acknowledges.
   */
  socket.on('PLACE_TILE', (payload: { roomCode: string; placements: TilePlacement[] }) => {
    const { roomCode, placements } = payload;

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      sendError(socket, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (!playerId) {
      sendError(socket, 'NOT_IN_ROOM', '你不在该房间中');
      return;
    }

    if (room.currentPlayerId !== playerId) {
      sendError(socket, 'NOT_YOUR_TURN', '现在不是你的回合');
      return;
    }

    // PLACE_TILE is for tentative board placement in the UI.
    // Server just acknowledges — actual validation happens on SUBMIT_WORD.
    // We broadcast the placements to the opponent so they can see.
    room.players.forEach(p => {
      if (p.id !== playerId) {
        const oppSocketId = roomManager.getPlayerSocket(roomCode, p.id);
        if (oppSocketId) {
          socket.to(oppSocketId).emit('OPPONENT_PLACEMENT', { playerId, placements });
        }
      }
    });
  });

  /**
   * SUBMIT_WORD — client confirms word submission.
   */
  socket.on('SUBMIT_WORD', (payload: { roomCode: string; placements: TilePlacement[] }) => {
    const { roomCode, placements } = payload;

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      sendError(socket, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (!playerId) {
      sendError(socket, 'NOT_IN_ROOM', '你不在该房间中');
      return;
    }

    gameManager.processTurn(roomCode, playerId, 'submit', { placements });
  });

  /**
   * SWAP_TILES — player swaps tiles from rack.
   */
  socket.on('SWAP_TILES', (payload: { roomCode: string; tiles: RackTile[] }) => {
    const { roomCode, tiles } = payload;

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      sendError(socket, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (!playerId) {
      sendError(socket, 'NOT_IN_ROOM', '你不在该房间中');
      return;
    }

    gameManager.processTurn(roomCode, playerId, 'swap', { tiles });
  });

  /**
   * SKIP_TURN — player skips their turn.
   */
  socket.on('SKIP_TURN', (payload: { roomCode: string }) => {
    const { roomCode } = payload;

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      sendError(socket, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (!playerId) {
      sendError(socket, 'NOT_IN_ROOM', '你不在该房间中');
      return;
    }

    gameManager.processTurn(roomCode, playerId, 'skip');
  });
}

/**
 * Get the player ID associated with this socket in the given room.
 */
function getPlayerIdFromSocket(room: ReturnType<typeof roomManager.getRoom>, socketId: string): string | null {
  if (!room) return null;
  for (const [playerId, sid] of room.playerSockets) {
    if (sid === socketId) return playerId;
  }
  return null;
}

function sendError(socket: Socket, code: string, message: string): void {
  const errorMsg: ServerMessage = {
    type: 'ERROR',
    payload: { code, message },
  };
  socket.emit('ERROR', errorMsg.payload);
}
