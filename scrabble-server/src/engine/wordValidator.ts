import { loadWordList } from '../data/wordList';

let dictionary: Set<string> = new Set();

/** Initialize the word validator by loading the dictionary */
export async function initValidator(): Promise<void> {
  dictionary = await loadWordList();
  console.log(`[WordValidator] Dictionary loaded with ${dictionary.size} words`);
}

/** Check if a word exists in the dictionary (case-insensitive) */
export function isValidWord(word: string): boolean {
  return dictionary.has(word.toUpperCase());
}

/** Check if all words in an array are valid */
export function areValidWords(words: string[]): boolean {
  return words.every(w => isValidWord(w));
}

/** Get the dictionary size */
export function getDictionarySize(): number {
  return dictionary.size;
}

/** Check if a string could be a prefix of any word in the dictionary */
const prefixSet: Set<string> = new Set();

export function buildPrefixSet(): void {
  prefixSet.clear();
  for (const word of dictionary) {
    for (let i = 1; i <= word.length; i++) {
      prefixSet.add(word.substring(0, i));
    }
  }
  console.log(`[WordValidator] Prefix set built with ${prefixSet.size} entries`);
}

export function isValidPrefix(prefix: string): boolean {
  return prefixSet.has(prefix.toUpperCase());
}
