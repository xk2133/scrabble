export interface WordDefinition {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

const CACHE = new Map<string, WordDefinition>();

export async function lookupWord(word: string): Promise<WordDefinition | null> {
  const key = word.toLowerCase().trim();
  if (CACHE.has(key)) return CACHE.get(key)!;
  try {
    const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(key));
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const def = data[0] as WordDefinition;
    CACHE.set(key, def);
    return def;
  } catch {
    return null;
  }
}

export function getCacheSize(): number { return CACHE.size; }
export function clearCache(): void { CACHE.clear(); }
