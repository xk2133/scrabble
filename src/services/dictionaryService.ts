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
const TRANS_CACHE = new Map<string, string>();

/** Translate English text to Chinese via MyMemory free API */
async function translateToChinese(text: string): Promise<string> {
  if (!text) return text;
  const trimmed = text.trim();
  if (TRANS_CACHE.has(trimmed)) return TRANS_CACHE.get(trimmed)!;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|zh`,
    );
    if (!res.ok) return text;
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText || text;
    TRANS_CACHE.set(trimmed, translated);
    return translated;
  } catch {
    return text; // fallback to English
  }
}

export async function lookupWord(word: string): Promise<WordDefinition | null> {
  const key = word.toLowerCase().trim();
  if (CACHE.has(key)) return CACHE.get(key)!;

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const def = data[0] as WordDefinition;

    // Translate each definition to Chinese
    for (const meaning of def.meanings) {
      for (const d of meaning.definitions) {
        d.definition = await translateToChinese(d.definition);
        if (d.example) {
          d.example = await translateToChinese(d.example);
        }
      }
    }

    CACHE.set(key, def);
    return def;
  } catch {
    return null;
  }
}

export function getCacheSize(): number {
  return CACHE.size;
}
export function clearCache(): void {
  CACHE.clear();
  TRANS_CACHE.clear();
}
