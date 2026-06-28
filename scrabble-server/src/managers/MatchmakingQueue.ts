import { roomManager } from './RoomManager';
import { gameManager } from './GameManager';

interface QueueEntry {
  playerId: string;
  playerName: string;
  socketId: string;
  joinedAt: number;
}

/**
 * Matchmaking Queue: simple FIFO queue.
 * When 2 players are in queue, they are matched together in a new room.
 */
class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  /**
   * Add a player to the matchmaking queue.
   * If there are 2 players, match them immediately.
   * Returns the room code if matched, or null if waiting.
   */
  joinQueue(playerId: string, playerName: string, socketId: string): { matched: boolean; roomCode?: string; position?: number } {
    // Check if already in queue
    const existing = this.queue.find(e => e.playerId === playerId);
    if (existing) {
      return { matched: false, position: this.queue.indexOf(existing) + 1 };
    }

    const entry: QueueEntry = {
      playerId,
      playerName,
      socketId,
      joinedAt: Date.now(),
    };

    this.queue.push(entry);

    console.log(`[Matchmaking] Player ${playerName} (${playerId}) joined queue. Size: ${this.queue.length}`);

    // Check if we can form a match
    if (this.queue.length >= 2) {
      const player1 = this.queue.shift()!;
      const player2 = this.queue.shift()!;

      // Create a room and add both players
      const { roomCode } = roomManager.createRoom();

      const result1 = roomManager.joinRoom(roomCode, player1.playerId, player1.playerName, player1.socketId);
      const result2 = roomManager.joinRoom(roomCode, player2.playerId, player2.playerName, player2.socketId);

      if (result1.success && result2.success) {
        console.log(`[Matchmaking] Matched ${player1.playerName} vs ${player2.playerName} in room ${roomCode}`);

        // Return room info
        return { matched: true, roomCode };
      } else {
        console.error(`[Matchmaking] Failed to create match room`);
        roomManager.removeRoom(roomCode);
        return { matched: false, position: 1 };
      }
    }

    return { matched: false, position: this.queue.length };
  }

  /**
   * Remove a player from the matchmaking queue.
   */
  leaveQueue(playerId: string): boolean {
    const idx = this.queue.findIndex(e => e.playerId === playerId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      console.log(`[Matchmaking] Player ${playerId} left queue. Size: ${this.queue.length}`);
      return true;
    }
    return false;
  }

  /**
   * Get the current queue size.
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Remove stale entries (older than 5 minutes).
   */
  cleanupStale(): void {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const before = this.queue.length;
    this.queue = this.queue.filter(e => now - e.joinedAt < fiveMinutes);
    const removed = before - this.queue.length;
    if (removed > 0) {
      console.log(`[Matchmaking] Cleaned up ${removed} stale queue entries`);
    }
  }

  /**
   * Check if a player is in the queue.
   */
  isInQueue(playerId: string): boolean {
    return this.queue.some(e => e.playerId === playerId);
  }
}

export const matchmakingQueue = new MatchmakingQueue();
