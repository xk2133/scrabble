import { useState, useCallback } from 'react';
import { lookupWord, WordDefinition } from '../services/dictionaryService';

export function useDictionary() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WordDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (word: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await lookupWord(word);
      if (result) {
        setData(result);
      } else {
        setError('未找到该单词的定义');
      }
    } catch {
      setError('查询单词时发生错误');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { lookup, data, loading, error, clearData };
}
