import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  wordListPath: path.join(__dirname, '..', 'data', 'words.txt'),
  boardSize: 15,
  rackSize: 7,
  turnTimeoutMs: 60_000,       // 60 seconds per turn
  roomTimeoutMs: 5 * 60_000,   // 5 minutes before empty room cleanup
  aiMoveDelayMs: 1500,         // simulate thinking delay for AI
  aiMoveTimeoutMs: 10_000,     // max time for AI to compute
  bingoBonus: 50,
  maxPlayersPerRoom: 2,
} as const;
