import React, { useState, useCallback } from 'react';
import styles from './ResultCard.module.css';

interface WordBookEntry {
  word: string;
  definition: string;
}

interface WordDefState {
  loading: boolean;
  definition: string;
  error: boolean;
}

interface ResultCardProps {
  winner: 'player' | 'ai' | 'draw';
  playerName: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  wordsPlayed: string[];
  bingoCount: number;
  wordBook: WordBookEntry[];
  onPlayAgain: () => void;
  onShare: () => void;
  onHome?: () => void;
  onSaveWord: (word: string, definition: string) => void;
  onRemoveWord: (word: string) => void;
  onPronounce: (word: string) => void;
  className?: string;
}

const RESULT_CONFIG = {
  player: { title: '恭喜你赢了！', cls: 'player' },
  ai: { title: '你输了', cls: 'ai' },
  draw: { title: '平局！', cls: 'draw' },
};

function getLongestWord(words: string[]): string {
  if (words.length === 0) return '—';
  let longest = words[0];
  for (const w of words) {
    if (w.length > longest.length) longest = w;
  }
  return longest;
}

const ResultCard: React.FC<ResultCardProps> = ({
  winner,
  playerName,
  opponentName,
  playerScore,
  opponentScore,
  wordsPlayed,
  bingoCount,
  wordBook,
  onPlayAgain,
  onShare,
  onHome,
  onSaveWord,
  onRemoveWord,
  onPronounce,
  className,
}) => {
  const config = RESULT_CONFIG[winner];
  const longestWord = getLongestWord(wordsPlayed);
  const [showWordList, setShowWordList] = useState(false);
  const [wordDefs, setWordDefs] = useState<Record<string, WordDefState>>({});

  const isWordSaved = useCallback(
    (word: string) => wordBook.some((e) => e.word === word),
    [wordBook],
  );

  const handleToggleWordList = useCallback(() => {
    if (showWordList) {
      setShowWordList(false);
      return;
    }
    setShowWordList(true);

    // Fetch definitions for words that haven't been fetched yet
    const toFetch = wordsPlayed.filter((w) => !wordDefs[w]);
    if (toFetch.length === 0) return;

    toFetch.forEach((word) => {
      setWordDefs((prev) => ({ ...prev, [word]: { loading: true, definition: '', error: false } }));
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
        .then((res) => {
          if (!res.ok) throw new Error('not found');
          return res.json();
        })
        .then((data: any[]) => {
          const def = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ?? '';
          setWordDefs((prev) => ({ ...prev, [word]: { loading: false, definition: def, error: false } }));
        })
        .catch(() => {
          setWordDefs((prev) => ({ ...prev, [word]: { loading: false, definition: '', error: true } }));
        });
    });
  }, [showWordList, wordsPlayed, wordDefs]);

  const handleSaveToggle = useCallback(
    (word: string) => {
      if (isWordSaved(word)) {
        onRemoveWord(word);
      } else {
        const def = wordDefs[word]?.definition || '';
        onSaveWord(word, def);
      }
    },
    [isWordSaved, wordDefs, onSaveWord, onRemoveWord],
  );

  return (
    <div className={[styles.overlay, className].filter(Boolean).join(' ')}>
      <div className={[styles.container, showWordList ? styles.hasWordList : ''].filter(Boolean).join(' ')}>
        {/* Title */}
        <h2 className={`${styles.title} ${styles[`title${config.cls.charAt(0).toUpperCase() + config.cls.slice(1)}`] || ''}`}>
          {config.title}
        </h2>

        {/* Score comparison */}
        <div className={styles.scores}>
          <div className={styles.scoreBlock}>
            <span className={styles.scoreLabel}>{playerName}</span>
            <span className={styles.scoreValue}>{playerScore}</span>
          </div>
          <span className={styles.vs}>VS</span>
          <div className={styles.scoreBlock}>
            <span className={styles.scoreLabel}>{opponentName}</span>
            <span className={styles.scoreValue}>{opponentScore}</span>
          </div>
        </div>

        {/* Stats — side by side */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>单词数</span>
            <span className={styles.statValue}>{wordsPlayed.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>最长单词</span>
            <span className={styles.statValue}>{longestWord}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Bingo</span>
            <span className={styles.statValue}>{bingoCount}</span>
          </div>
        </div>

        {/* Word list toggle button */}
        <button className={styles.wordListBtn} onClick={handleToggleWordList}>
          {showWordList ? '收起单词表' : `查看本局单词 (${wordsPlayed.length})`}
        </button>

        {/* Word table */}
        {showWordList && (
          <div className={styles.wordTableWrap}>
            <table className={styles.wordTable}>
              <thead>
                <tr>
                  <th className={styles.colWord}>英文</th>
                  <th className={styles.colDef}>释义</th>
                  <th className={styles.colSave}>收藏</th>
                </tr>
              </thead>
              <tbody>
                {wordsPlayed.map((word) => {
                  const def = wordDefs[word];
                  const saved = isWordSaved(word);
                  return (
                    <tr key={word}>
                      <td className={styles.colWord}>
                        <button
                          className={styles.wordBtn}
                          onClick={() => onPronounce(word)}
                          title="点击发音"
                        >
                          {word}
                        </button>
                      </td>
                      <td className={styles.colDef}>
                        {def ? (
                          def.loading ? (
                            <span className={styles.defLoading}>加载中...</span>
                          ) : def.error ? (
                            <span className={styles.defError}>—</span>
                          ) : (
                            <span className={styles.defText}>{def.definition}</span>
                          )
                        ) : (
                          <span className={styles.defLoading}>加载中...</span>
                        )}
                      </td>
                      <td className={styles.colSave}>
                        <button
                          className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
                          onClick={() => handleSaveToggle(word)}
                          title={saved ? '取消收藏' : '收藏单词'}
                        >
                          {saved ? '★' : '☆'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={onPlayAgain}>
            再来一局
          </button>
          <button className={styles.btnShare} onClick={onShare}>
            下载棋盘截图
          </button>
        </div>

        {onHome && (
          <button className={styles.btnHome} onClick={onHome}>
            返回首页
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultCard;
