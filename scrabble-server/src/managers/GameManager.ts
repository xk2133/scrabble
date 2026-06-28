import { Room, Player, TilePlacement, RackTile, AIDifficulty } from '../types/game';
import { config } from '../config';
import { roomManager } from './RoomManager';
import { placeTiles } from '../engine/boardUtils';
import { canSubmitWord, isGameOver, calculateFinalScores, determineFirstPlayer } from '../engine/gameRules';
import { drawTiles, swapTiles, refillRack, remainingCount } from '../engine/tileBag';
import { calculateScore } from '../engine/scoreCalculator';
import { computeAIMove } from '../ai';
import { Server as SocketIOServer } from 'socket.io';
import { ServerMessage } from '../types/socket';

/**
 * Game Manager: controls game flow, turn processing, and victory conditions.
 */
class GameManager {
  private io: SocketIOServer | null = null;

  setIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Start a game in the given room.
   */
  startGame(room: Room): void {
    if (room.players.length < 2) {
      console.error(`[GameManager] Cannot start game: room ${room.roomCode} has ${room.players.length} players`);
      return;
    }

    // Initialize game state
    const gameState = roomManager.initGameState(room);
    if (!gameState) return;

    room.phase = 'playing';
    room.firstMove = true;
    room.consecutivePasses = 0;
    gameState.turnNumber = 1;

    // Determine first player
    room.currentPlayerId = determineFirstPlayer(room.players);

    console.log(`[GameManager] Game started in room ${room.roomCode}. First player: ${room.currentPlayerId}`);

    // Notify all players
    room.players.forEach(player => {
      const playerId = player.id;
      const socketId = roomManager.getPlayerSocket(room.roomCode, playerId);
      if (socketId && this.io) {
        const opponent = room.players.find(p => p.id !== playerId);

        const message: ServerMessage = {
          type: 'GAME_START',
          payload: {
            roomCode: room.roomCode,
            players: room.players.map(p => ({
              id: p.id,
              name: p.name,
              rack: [], // hide other's rack
              score: p.score,
              status: p.status,
              isAI: p.isAI,
              aiDifficulty: p.aiDifficulty,
              missedTurns: p.missedTurns,
            })),
            board: gameState.board,
            currentPlayerId: room.currentPlayerId!,
            yourPlayerId: playerId,
            yourRack: player.rack,
            turnNumber: gameState.turnNumber,
          },
        };

        this.io.to(socketId).emit(message.type, message.payload);
      }
    });

    // Start turn timer
    this.startTurnTimer(room);

    // If current player is AI, trigger AI move
    const currentPlayer = room.players.find(p => p.id === room.currentPlayerId);
    if (currentPlayer?.isAI) {
      this.triggerAIMove(room, currentPlayer);
    }
  }

  /**
   * Start the turn countdown timer.
   * If time expires, auto-skip the turn.
   */
  private startTurnTimer(room: Room): void {
    if (room.turnTimeout) {
      clearTimeout(room.turnTimeout);
    }

    room.turnTimeout = setTimeout(() => {
      console.log(`[GameManager] Turn timeout for room ${room.roomCode}, player ${room.currentPlayerId}`);
      this.skipTurn(room.roomCode, room.currentPlayerId!, true);
    }, config.turnTimeoutMs);
  }

  /**
   * Process a turn action (submit word, swap, skip).
   */
  processTurn(roomCode: string, playerId: string, action: 'submit' | 'swap' | 'skip', data?: any): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Validate it's the player's turn
    if (room.currentPlayerId !== playerId) {
      const socketId = roomManager.getPlayerSocket(roomCode, playerId);
      if (socketId && this.io) {
        const errorMsg: ServerMessage = {
          type: 'ERROR',
          payload: { code: 'NOT_YOUR_TURN', message: '现在不是你的回合' },
        };
        this.io.to(socketId).emit('ERROR', errorMsg.payload);
      }
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    switch (action) {
      case 'submit':
        this.submitWord(room, player, data?.placements || []);
        break;
      case 'swap':
        this.processSwap(room, player, data?.tiles || []);
        break;
      case 'skip':
        this.skipTurn(roomCode, playerId, false);
        break;
    }
  }

  /**
   * Submit a word for validation and scoring.
   */
  submitWord(room: Room, player: Player, placements: TilePlacement[]): void {
    const gameState = room.gameState;
    if (!gameState) return;

    // Validate the submission
    const result = canSubmitWord(gameState.board, placements);

    // Get player socket
    const socketId = roomManager.getPlayerSocket(room.roomCode, player.id);

    if (!result.valid || !result.score) {
      // Invalid word — notify only the submitting player
      if (socketId && this.io) {
        const errorMsg: ServerMessage = {
          type: 'ERROR',
          payload: { code: 'INVALID_WORD', message: result.reason || '无效的单词' },
        };
        this.io.to(socketId).emit('ERROR', errorMsg.payload);
      }
      return;
    }

    // Valid submission — apply to board
    for (const p of placements) {
      p.points = p.points || 0;
    }
    gameState.board = placeTiles(gameState.board, placements);

    // Update player's rack (remove used tiles)
    const usedLetters = placements.map(p => p.letter);
    player.rack = this.removeFromRack(player.rack, usedLetters);

    // Add score
    player.score += result.score;

    // Record move
    const move = {
      type: 'place' as const,
      playerId: player.id,
      placements,
      score: result.score,
      words: result.words || [],
    };
    gameState.moveHistory.push(move);
    gameState.lastMove = move;

    // Notify submitting player of success
    if (socketId && this.io) {
      const wordMsg: ServerMessage = {
        type: 'WORD_SUBMITTED',
        payload: {
          valid: true,
          words: result.wordScores,
          totalScore: result.score,
          playerId: player.id,
          newPlayerScore: player.score,
          board: gameState.board,
        },
      };
      this.io.to(socketId).emit('WORD_SUBMITTED', wordMsg.payload);
    }

    // Refill player's rack
    player.rack = refillRack(gameState.tileBag, player.rack, config.rackSize);

    // Reset consecutive passes
    room.consecutivePasses = 0;
    room.firstMove = false;

    // Check game over
    const gameOver = isGameOver(gameState.tileBag, room.players, room.consecutivePasses);
    if (gameOver.over) {
      this.endGame(room, gameOver.reason || 'all_tiles_used');
      return;
    }

    // Advance turn
    this.advanceTurn(room);
  }

  /**
   * Process a tile swap.
   */
  private processSwap(room: Room, player: Player, tiles: RackTile[]): void {
    const gameState = room.gameState;
    if (!gameState) return;

    if (remainingCount(gameState.tileBag) < tiles.length) {
      const socketId = roomManager.getPlayerSocket(room.roomCode, player.id);
      if (socketId && this.io) {
        const errorMsg: ServerMessage = {
          type: 'ERROR',
          payload: { code: 'NOT_ENOUGH_TILES', message: '字母袋中剩余字母不足，无法交换' },
        };
        this.io.to(socketId).emit('ERROR', errorMsg.payload);
      }
      return;
    }

    // Remove tiles from player's rack
    player.rack = this.removeFromRack(player.rack, tiles.map(t => t.letter));

    // Swap with bag
    const newTiles = swapTiles(gameState.tileBag, tiles);
    player.rack.push(...newTiles);

    // Record move
    gameState.moveHistory.push({
      type: 'swap',
      playerId: player.id,
      placements: [],
      returnedTiles: tiles,
    });

    // Notify player
    const socketId = roomManager.getPlayerSocket(room.roomCode, player.id);
    if (socketId && this.io) {
      const swapMsg: ServerMessage = {
        type: 'TILES_SWAPPED',
        payload: {
          playerId: player.id,
          tileCount: tiles.length,
          newRack: player.rack,
          tilesRemaining: remainingCount(gameState.tileBag),
        },
      };
      this.io.to(socketId).emit('TILES_SWAPPED', swapMsg.payload);
    }

    room.consecutivePasses++;

    // Check game over
    const gameOver = isGameOver(gameState.tileBag, room.players, room.consecutivePasses);
    if (gameOver.over) {
      this.endGame(room, gameOver.reason || 'consecutive_passes');
      return;
    }

    this.advanceTurn(room);
  }

  /**
   * Skip the current player's turn.
   */
  skipTurn(roomCode: string, playerId: string, isTimeout: boolean): void {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.gameState) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    const socketId = roomManager.getPlayerSocket(roomCode, playerId);
    if (socketId && this.io) {
      const skipMsg: ServerMessage = {
        type: 'TURN_SKIPPED',
        payload: {
          playerId,
          message: isTimeout ? '回合超时，自动跳过' : '主动跳过回合',
        },
      };
      this.io.to(socketId).emit('TURN_SKIPPED', skipMsg.payload);
    }

    // Broadcast to opponent
    room.players.forEach(p => {
      if (p.id !== playerId) {
        const oppSocketId = roomManager.getPlayerSocket(roomCode, p.id);
        if (oppSocketId && this.io) {
          this.io.to(oppSocketId).emit('TURN_SKIPPED', {
            playerId,
            message: `${player.name} 跳过了回合`,
          });
        }
      }
    });

    room.gameState.moveHistory.push({
      type: 'skip',
      playerId,
      placements: [],
    });

    room.consecutivePasses++;

    const gameOver = isGameOver(room.gameState.tileBag, room.players, room.consecutivePasses);
    if (gameOver.over) {
      this.endGame(room, gameOver.reason || 'consecutive_passes');
      return;
    }

    this.advanceTurn(room);
  }

  /**
   * Advance to the next player's turn.
   */
  advanceTurn(room: Room): void {
    if (!room.gameState || !room.currentPlayerId) return;

    const currentIdx = room.players.findIndex(p => p.id === room.currentPlayerId);
    const nextIdx = (currentIdx + 1) % room.players.length;
    const nextPlayer = room.players[nextIdx];

    room.currentPlayerId = nextPlayer.id;
    room.gameState.turnNumber++;

    // Notify all players of turn change
    const tilesRemaining = remainingCount(room.gameState.tileBag);

    room.players.forEach(player => {
      const socketId = roomManager.getPlayerSocket(room.roomCode, player.id);
      if (socketId && this.io) {
        const lastMoveData = room.gameState?.lastMove;
        const turnMsg: ServerMessage = {
          type: 'TURN_CHANGE',
          payload: {
            currentPlayerId: nextPlayer.id,
            turnNumber: room.gameState!.turnNumber,
            board: room.gameState!.board,
            turnTimeRemaining: config.turnTimeoutMs / 1000,
            yourRack: player.rack,
            tilesRemaining,
            lastMove: lastMoveData ? {
              playerId: lastMoveData.playerId,
              playerName: room.players.find(p => p.id === lastMoveData.playerId)?.name || '',
              type: lastMoveData.type,
              placements: lastMoveData.placements,
              score: lastMoveData.score,
              words: undefined, // scored words from last submit
            } : undefined,
          },
        };
        this.io.to(socketId).emit('TURN_CHANGE', turnMsg.payload);
      }
    });

    // Start new turn timer
    this.startTurnTimer(room);

    // If next player is AI, trigger AI move
    if (nextPlayer.isAI && nextPlayer.aiDifficulty) {
      this.triggerAIMove(room, nextPlayer);
    }
  }

  /**
   * Trigger AI to compute and execute a move.
   */
  private async triggerAIMove(room: Room, aiPlayer: Player): Promise<void> {
    if (!room.gameState || !aiPlayer.aiDifficulty) return;

    console.log(`[GameManager] AI player ${aiPlayer.name} (${aiPlayer.aiDifficulty}) is thinking...`);

    // Get dictionary — wordValidator uses global state
    const { isValidWord } = require('../engine/wordValidator');

    // Create a temporary dictionary Set for AI
    // AI uses the global word validator functions, so we don't need to pass a Set

    try {
      const aiMove = await computeAIMove(
        room.gameState.board,
        aiPlayer.rack,
        aiPlayer.aiDifficulty,
        new Set() // placeholder — AI uses isValidWord/isValidPrefix globals
      );

      console.log(`[GameManager] AI move: type=${aiMove.type}, score=${aiMove.score}`);

      switch (aiMove.type) {
        case 'place':
          if (aiMove.placements.length > 0) {
            this.submitWord(room, aiPlayer, aiMove.placements);
          } else {
            this.skipTurn(room.roomCode, aiPlayer.id, false);
          }
          break;
        case 'swap':
          if (aiMove.returnedTiles && aiMove.returnedTiles.length > 0) {
            this.processSwap(room, aiPlayer, aiMove.returnedTiles);
          } else {
            this.skipTurn(room.roomCode, aiPlayer.id, false);
          }
          break;
        case 'skip':
        default:
          this.skipTurn(room.roomCode, aiPlayer.id, false);
          break;
      }
    } catch (err) {
      console.error(`[GameManager] AI error:`, err);
      this.skipTurn(room.roomCode, aiPlayer.id, false);
    }
  }

  /**
   * End the game and calculate final scores.
   */
  endGame(room: Room, reason: string): void {
    if (!room.gameState) return;

    room.phase = 'finished';

    // Clear turn timer
    if (room.turnTimeout) {
      clearTimeout(room.turnTimeout);
      room.turnTimeout = null;
    }

    // Calculate final scores
    const finalPlayers = calculateFinalScores(room.players);

    // Determine winner (highest adjusted score)
    let winner = finalPlayers[0];
    for (const p of finalPlayers) {
      if (p.score > winner.score) {
        winner = p;
      }
    }

    console.log(`[GameManager] Game ended in room ${room.roomCode}, reason: ${reason}, winner: ${winner.name}`);

    // Notify all players
    room.players.forEach(player => {
      const socketId = roomManager.getPlayerSocket(room.roomCode, player.id);
      if (socketId && this.io) {
        const endMsg: ServerMessage = {
          type: 'GAME_ENDED',
          payload: {
            reason: reason as any,
            winnerId: winner.id,
            winnerName: winner.name,
            finalScores: finalPlayers.map(p => ({
              playerId: p.id,
              playerName: p.name,
              score: p.score,
            })),
            board: room.gameState!.board,
          },
        };
        this.io.to(socketId).emit('GAME_ENDED', endMsg.payload);
      }
    });

    // Cleanup room after a delay
    setTimeout(() => {
      roomManager.removeRoom(room.roomCode);
    }, 60000); // 1 minute for players to see results
  }

  /**
   * Remove specific letters from a rack.
   */
  private removeFromRack(rack: RackTile[], letters: string[]): RackTile[] {
    const newRack = [...rack];
    for (const letter of letters) {
      const idx = newRack.findIndex(t => t.letter === letter);
      if (idx !== -1) {
        newRack.splice(idx, 1);
      }
    }
    return newRack;
  }
}

export const gameManager = new GameManager();
