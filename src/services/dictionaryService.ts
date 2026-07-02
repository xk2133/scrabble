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

const CACHE = new Map<string, WordDefinition>();

async function fetchDict(word: string): Promise<any> {
  const url = `/api/dict?word=${encodeURIComponent(word)}`;
  const res = await fetch(url);
  if (res.ok) return res.json();
  return null;
}

export async function lookupWord(word: string): Promise<WordDefinition | null> {
  const key = word.toLowerCase().trim();
  if (!key || !/^[a-zA-Z]+$/.test(key)) return null;
  if (CACHE.has(key)) return CACHE.get(key)!;

  try {
    const raw = await fetchDict(key);
    if (!raw) return null;

    // 音标
    const simpleWord = raw.simple?.word?.[0];
    const usPhonetic = simpleWord?.usphone || '';
    const ukPhonetic = simpleWord?.ukphone || '';
    const parts: string[] = [];
    if (usPhonetic) parts.push(`美 ${usPhonetic}`);
    if (ukPhonetic && ukPhonetic !== usPhonetic) parts.push(`英 ${ukPhonetic}`);
    const phoneticText = parts.join('  ') || '';

    // 词性+释义 (ec)
    const ecWord = raw.ec?.word?.[0];
    const trs = ecWord?.trs || [];
    const allDefs: { partOfSpeech: string; definitions: string[] }[] = [];

    for (const trGroup of trs) {
      const trList = trGroup.tr || [];
      for (const tr of trList) {
        const items = tr.l?.i || [];
        for (const item of items) {
          const posMatch = item.match(
            /^([a-z]+\.|adj\.|adv\.|n\.|v\.|prep\.|conj\.|pron\.|int\.|art\.|num\.|det\.|aux\.)\s*(.+)/i,
          );
          if (posMatch) {
            const pos = posMatch[1];
            const rawDefs = posMatch[2] || '';
            const defTexts = rawDefs.split(/；|;/).map((s: string) => s.trim()).filter(Boolean);
            allDefs.push({ partOfSpeech: pos, definitions: defTexts });
          } else if (item.trim()) {
            const existing = allDefs.find((m) => m.partOfSpeech === '');
            if (existing) {
              existing.definitions.push(item.trim());
            } else {
              allDefs.push({ partOfSpeech: '', definitions: [item.trim()] });
            }
          }
        }
      }
    }

    // 合并同词性
    const posMap = new Map<string, string[]>();
    const posOrder: string[] = [];
    for (const d of allDefs) {
      if (!posMap.has(d.partOfSpeech)) {
        posMap.set(d.partOfSpeech, []);
        posOrder.push(d.partOfSpeech);
      }
      posMap.get(d.partOfSpeech)!.push(...d.definitions);
    }

    const meanings = posOrder.map((pos) => ({
      partOfSpeech: pos,
      definitions: posMap.get(pos)!.map((d) => ({ definition: d, example: '' })),
    }));

    // 例句
    const sentsPart = raw.blng_sents_part;
    const sentencePairs = sentsPart?.['sentence-pair'] || [];
    const examples = sentencePairs.map((sp: any) => ({
      english: (sp['sentence-eng'] || sp.sentence || '').replace(/<[^>]+>/g, ''),
      chinese: sp['sentence-translation'] || '',
    }));

    // 考试等级
    const examTypes = ecWord?.exam_type || [];

    const result: WordDefinition = {
      word: key,
      phonetic: phoneticText,
      phonetics: phoneticText ? [{ text: phoneticText }] : [],
      meanings: meanings.length > 0
        ? meanings
        : [{ partOfSpeech: '', definitions: [{ definition: '暂无详细释义', example: '' }] }],
      examples,
      examTypes,
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
