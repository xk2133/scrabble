export interface WordDefinition {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

interface YoudaoBasic {
  phonetic?: string;
  'us-phonetic'?: string;
  'uk-phonetic'?: string;
  explains?: string[];
  exam_type?: string[];
}

interface YoudaoResponse {
  errorCode: string;
  query?: string;
  translation?: string[];
  basic?: YoudaoBasic;
}

const CACHE = new Map<string, WordDefinition>();

export async function lookupWord(word: string): Promise<WordDefinition | null> {
  const key = word.toLowerCase().trim();
  if (!key || !/^[a-zA-Z]+$/.test(key)) return null;
  if (CACHE.has(key)) return CACHE.get(key)!;

  try {
    const res = await fetch(`/api/dict?word=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data: YoudaoResponse = await res.json();
    if (data.errorCode !== '0') return null;

    const basic = data.basic;
    const phonetic = basic?.phonetic || basic?.['us-phonetic'] || basic?.['uk-phonetic'] || '';
    const explains = basic?.explains || data.translation || [];
    // 按词性分组
    const defs = explains.map((exp) => {
      const match = exp.match(/^([a-z]+\.)\s*(.+)/i);
      return match
        ? { partOfSpeech: match[1], definition: match[2], example: '' }
        : { partOfSpeech: '', definition: exp, example: '' };
    });

    // 合并同词性释义
    const posMap = new Map<string, string[]>();
    const posOrder: string[] = [];
    for (const d of defs) {
      const pos = d.partOfSpeech || '释义';
      if (!posMap.has(pos)) {
        posMap.set(pos, []);
        posOrder.push(pos);
      }
      if (d.definition) posMap.get(pos)!.push(d.definition);
    }

    const meanings = posOrder.map((pos) => ({
      partOfSpeech: pos,
      definitions: posMap.get(pos)!.map((d) => ({ definition: d, example: '' })),
    }));

    const result: WordDefinition = {
      word: key,
      phonetic,
      phonetics: phonetic ? [{ text: phonetic }] : [],
      meanings: meanings.length > 0 ? meanings : [{ partOfSpeech: '', definitions: [{ definition: explains.join('；'), example: '' }] }],
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
