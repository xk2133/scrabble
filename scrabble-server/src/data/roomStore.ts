import { Room } from '../types/game';

/**
 * In-memory room store.
 * Map of roomCode -> Room.
 */
export const roomStore: Map<string, Room> = new Map();
