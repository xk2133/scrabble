export const WORD_BOOK_KEY = 'scrabble_word_book';
export const SETTINGS_KEY = 'scrabble_settings';
export const BEST_SCORE_KEY = 'scrabble_best_score';

export function getItem<T>(key: string, defaultValue: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : defaultValue; }
  catch { return defaultValue; }
}
export function setItem<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
export function removeItem(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}
