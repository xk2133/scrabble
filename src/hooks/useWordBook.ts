import { useState, useCallback, useEffect } from 'react';
import { getItem, setItem, WORD_BOOK_KEY } from '../services/storageService';

export interface WordEntry {
  word: string;
  definition: string;
  dateAdded: string;
}

export function useWordBook() {
  const [savedWords, setSavedWords] = useState<WordEntry[]>([]);

  useEffect(() => {
    setSavedWords(getItem<WordEntry[]>(WORD_BOOK_KEY, []));
  }, []);

  const addWord = useCallback((word: string, definition: string) => {
    setSavedWords(prev => {
      if (prev.some(w => w.word === word)) return prev;
      const updated = [{ word, definition, dateAdded: new Date().toISOString() }, ...prev];
      setItem(WORD_BOOK_KEY, updated);
      return updated;
    });
  }, []);

  const removeWord = useCallback((word: string) => {
    setSavedWords(prev => {
      const updated = prev.filter(w => w.word !== word);
      setItem(WORD_BOOK_KEY, updated);
      return updated;
    });
  }, []);

  const isSaved = useCallback((word: string) => {
    return savedWords.some(w => w.word === word);
  }, [savedWords]);

  const clearAll = useCallback(() => {
    setSavedWords([]);
    setItem(WORD_BOOK_KEY, []);
  }, []);

  return { savedWords, addWord, removeWord, isSaved, clearAll };
}
