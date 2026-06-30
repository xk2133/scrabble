export interface WordDefinition {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
  examples?: { english: string; chinese: string }[];
  examTypes?: string[];
}

interface DictResponse {
  errorCode: string;
  word?: string;
  phonetic?: string;
  ukPhonetic?: string;
  usPhonetic?: string;
  meanings?: { partOfSpeech: string; definitions: { definition: string }[] }[];
  examples?: { english: string; chinese: string }[];
  examTypes?: string[];
  _debug?: string;
}

const CACHE = new Map<string, WordDefinition>();

export async function lookupWord(word: string): Promise<WordDefinition | null> {
  const key = word.toLowerCase().trim();
  if (!key || !/^[a-zA-Z]+$/.test(key)) return null;
  if (CACHE.has(key)) return CACHE.get(key)!;

  try {
    const res = await fetch(`/api/dict?word=${encodeURIComponent(key)}`);
    if (!res.ok) {
      console.error(`[dict] HTTP ${res.status} for "${key}"`);
      return null;
    }
    const data: DictResponse = await res.json();
    if (data.errorCode !== '0') {
      console.error(`[dict] API error for "${key}":`, (data as any)._debug || data.errorCode);
      return null;
    }

    // 构建音标文本
    const parts: string[] = [];
    if (data.usPhonetic) parts.push(`美 ${data.usPhonetic}`);
    if (data.ukPhonetic && data.ukPhonetic !== data.usPhonetic) parts.push(`英 ${data.ukPhonetic}`);
    const phoneticText = parts.join('  ') || data.phonetic || '';

    const meanings = (data.meanings || []).map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.map((d) => ({
        definition: d.definition,
        example: '',
      })),
    }));

    const result: WordDefinition = {
      word: data.word || key,
      phonetic: phoneticText,
      phonetics: phoneticText ? [{ text: phoneticText }] : [],
      meanings,
      examples: data.examples || [],
      examTypes: data.examTypes,
    };

    CACHE.set(key, result);
    return result;
  } catch {
    return null;
  }
}

export function getCacheSize(): number {
  return CACHE.size;
}

export function clearCache(): void {
  CACHE.clear();
}
