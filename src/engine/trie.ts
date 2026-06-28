// ===== 英语棋 Trie Data Structure =====

/** A node in the Trie */
class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}

/**
 * Trie (prefix tree) data structure for efficient word lookups.
 * Used to validate words placed on the Scrabble board.
 */
export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  /** Insert a word into the trie */
  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEndOfWord = true;
  }

  /** Check if the exact word exists in the trie */
  search(word: string): boolean {
    const node = this.traverse(word);
    return node !== null && node.isEndOfWord;
  }

  /** Check if any word in the trie starts with the given prefix */
  startsWith(prefix: string): boolean {
    return this.traverse(prefix) !== null;
  }

  /** Traverse to the node representing the given prefix */
  private traverse(prefix: string): TrieNode | null {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }
    return node;
  }

  /** Get the number of words in the trie */
  getWordCount(): number {
    return this.countWords(this.root);
  }

  private countWords(node: TrieNode): number {
    let count = node.isEndOfWord ? 1 : 0;
    for (const child of node.children.values()) {
      count += this.countWords(child);
    }
    return count;
  }
}

/** Factory function to create a Trie from a word list */
export function createTrie(words: string[]): Trie {
  const trie = new Trie();
  for (const word of words) {
    const trimmed = word.trim().toUpperCase();
    if (trimmed.length > 0) {
      trie.insert(trimmed);
    }
  }
  return trie;
}
