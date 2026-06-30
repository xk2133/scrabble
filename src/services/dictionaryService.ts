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

    // 将例句分配到对应释义中（简单按语义匹配）
    const rawMeanings = data.meanings || [];
    const rawExamples = data.examples || [];

    const meanings = rawMeanings.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.map((d) => {
        // 尝试把例句匹配到释义（含词性关键词的例句优先）
        const matched = rawExamples.find(
          (ex) =>
            ex.chinese.includes(m.partOfSpeech.replace('.', '')) ||
            ex.chinese.includes(d.definition.substring(0, 3)),
        );
        return {
          definition: d.definition,
          example: matched ? `${matched.english} — ${matched.chinese}` : '',
        };
      }),
    }));

    const result: WordDefinition = {
      word: data.word || key,
      phonetic: phoneticText,
      phonetics: phoneticText ? [{ text: phoneticText }] : [],
      meanings,
      examples: rawExamples,
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
