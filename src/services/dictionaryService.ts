export interface WordDefinition {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

let dictPromise: Promise<Record<string, string>> | null = null;

/** 懒加载内置词典 JSON */
function loadDict(): Promise<Record<string, string>> {
  if (dictPromise) return dictPromise;
  dictPromise = fetch(`${import.meta.env.BASE_URL}dict.json`)
    .then((res) => {
      if (!res.ok) throw new Error('词典加载失败');
      return res.json();
    })
    .catch(() => {
      dictPromise = null;
      return {};
    });
  return dictPromise;
}

export async function lookupWord(word: string): Promise<WordDefinition | null> {
  const key = word.toLowerCase().trim();
  if (!key) return null;

  const dict = await loadDict();
  const translation = dict[key];
  if (!translation) return null;

  return {
    word: key,
    phonetic: '',
    phonetics: [],
    meanings: [
      {
        partOfSpeech: '',
        definitions: [{ definition: translation, example: '' }],
      },
    ],
  };
}

export function getCacheSize(): number {
  return dictPromise ? 1 : 0;
}

export function clearCache(): void {
  dictPromise = null;
}
