import { TilePlacement, RackTile, Player, GamePhase, AIDifficulty, Cell, ScoredWord } from './game';

// ===== Client-to-Server Messages =====

export interface PlaceTilePayload {
  roomCode: string;
  placements: TilePlacement[];
}

export interface SubmitWordPayload {
  roomCode: string;
}

export interface SwapTilesPayload {
  roomCode: string;
  tiles: RackTile[];
}

export interface SkipTurnPayload {
  roomCode: string;
}

export interface CreateRoomPayload {
  playerName: string;
  isAI?: boolean;
  aiDifficulty?: AIDifficulty;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface StartAIGamePayload {
  playerName: string;
  aiDifficulty: AIDifficulty;
}

export interface QuickMatchPayload {
  playerName: string;
}

export type ClientMessage =
  | { type: 'PLACE_TILE'; payload: PlaceTilePayload }
  | { type: 'SUBMIT_WORD'; payload: SubmitWordPayload }
  | { type: 'SWAP_TILES'; payload: SwapTilesPayload }
  | { type: 'SKIP_TURN'; payload: SkipTurnPayload }
  | { type: 'CREATE_ROOM'; payload: CreateRoomPayload }
  | { type: 'JOIN_ROOM'; payload: JoinRoomPayload }
  | { type: 'START_AI_GAME'; payload: StartAIGamePayload }
  | { type: 'QUICK_MATCH'; payload: QuickMatchPayload };

// ===== Server-to-Client Messages =====

export interface GameStartPayload {
  roomCode: string;
  players: Player[];
  board: Cell[][];
  currentPlayerId: string;
  yourPlayerId: string;
  yourRack: RackTile[];
  turnNumber: number;
}

export interface TurnChangePayload {
  currentPlayerId: string;
  turnNumber: number;
  /** Updated board state */
  board: Cell[][];
  /** Time remaining in seconds */
  turnTimeRemaining: number;
  /** Your updated rack */
  yourRack: RackTile[];
  /** Remaining tiles in bag */
  tilesRemaining: number;
  /** Last move made */
  lastMove?: {
    playerId: string;
    playerName: string;
    type: string;
    placements?: TilePlacement[];
    score?: number;
    words?: ScoredWord[];
  };
}

export interface WordSubmittedPayload {
  valid: boolean;
  words?: ScoredWord[];
  totalScore: number;
  playerId: string;
  newPlayerScore: number;
  board: Cell[][];
}

export interface TilesSwappedPayload {
  playerId: string;
  tileCount: number;
  newRack: RackTile[];
  tilesRemaining: number;
}

export interface TurnSkippedPayload {
  playerId: string;
  message: string;
}

export interface GameEndedPayload {
  reason: 'all_tiles_used' | 'consecutive_passes' | 'player_disconnected' | 'player_left';
  winnerId: string;
  winnerName?: string;
  finalScores: Array<{
    playerId: string;
    playerName: string;
    score: number;
  }>;
  board: Cell[][];
}

export interface PlayerLeftPayload {
  playerId: string;
  roomCode: string;
  message: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerId: string;
  players: Player[];
  phase: GamePhase;
}

export interface RoomUpdatePayload {
  players: Player[];
  phase: GamePhase;
}

export interface MatchFoundPayload {
  roomCode: string;
  opponent: Player;
  yourPlayerId: string;
  players: Player[];
}

export interface PlayerReconnectedPayload {
  playerId: string;
  roomCode: string;
  gameState: {
    board: Cell[][];
    currentPlayerId: string;
    yourRack: RackTile[];
    players: Player[];
    turnNumber: number;
  };
}

export type ServerMessage =
  | { type: 'GAME_START'; payload: GameStartPayload }
  | { type: 'TURN_CHANGE'; payload: TurnChangePayload }
  | { type: 'WORD_SUBMITTED'; payload: WordSubmittedPayload }
  | { type: 'TILES_SWAPPED'; payload: TilesSwappedPayload }
  | { type: 'TURN_SKIPPED'; payload: TurnSkippedPayload }
  | { type: 'GAME_ENDED'; payload: GameEndedPayload }
  | { type: 'PLAYER_LEFT'; payload: PlayerLeftPayload }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'ROOM_CREATED'; payload: RoomCreatedPayload }
  | { type: 'ROOM_JOINED'; payload: RoomJoinedPayload }
  | { type: 'ROOM_UPDATE'; payload: RoomUpdatePayload }
  | { type: 'MATCH_FOUND'; payload: MatchFoundPayload }
  | { type: 'PLAYER_RECONNECTED'; payload: PlayerReconnectedPayload }
  | { type: 'QUEUE_STATUS'; payload: { position: number } }
  | { type: 'OPPONENT_DISCONNECTED'; payload: { playerId: string; message: string } }
  | { type: 'OPPONENT_RECONNECTED'; payload: { playerId: string } };
