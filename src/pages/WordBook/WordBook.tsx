import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ROUTES } from '../../constants/routes';
import WordCard from '../../components/word/WordCard';
import WordDetailModal from '../../components/word/WordDetailModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TabBar from '../../components/layout/TabBar';
import { lookupWord, type WordDefinition } from '../../services/dictionaryService';
import styles from './WordBook.module.css';

const WordBook: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wordBook, addWordToBook, removeWordFromBook, addToast } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'alpha'>('date');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDetail, setWordDetail] = useState<WordDefinition | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // Filter and sort words
  const filteredWords = useMemo(() => {
    let list = [...wordBook];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter((entry) => entry.word.toUpperCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
      return a.word.localeCompare(b.word);
    });
    return list;
  }, [wordBook, searchQuery, sortBy]);

  // Check if a word is saved
  const isWordSaved = useCallback(
    (word: string): boolean => wordBook.some((e) => e.word === word),
    [wordBook]
  );

  // Handle word card click — open detail modal
  const handleWordClick = useCallback((word: string) => {
    setSelectedWord(word);
    setWordDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    lookupWord(word)
      .then((result) => {
        if (!result) throw new Error(`单词 "${word}" 未找到`);
        setWordDetail(result);
        setDetailLoading(false);
      })
      .catch((err) => {
        setDetailError(err instanceof Error ? err.message : '查询失败，请重试');
        setDetailLoading(false);
      });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedWord(null);
    setWordDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    setSpeaking(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedWord || !wordDetail) return;
    if (isWordSaved(selectedWord)) {
      removeWordFromBook(selectedWord);
      addToast('info', `已移除 "${selectedWord}"`);
    } else {
      const firstDef = wordDetail.meanings[0]?.definitions[0]?.definition ?? '';
      addWordToBook(selectedWord, firstDef);
      addToast('success', `已收藏 "${selectedWord}"`);
    }
  }, [selectedWord, wordDetail, isWordSaved, removeWordFromBook, addWordToBook, addToast]);

  const handlePronounce = useCallback((word: string) => {
    if (speaking) return;
    if (!window.speechSynthesis) {
      addToast('warning', '浏览器不支持语音功能');
      return;
    }
    setSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      addToast('error', '发音失败');
    };
    window.speechSynthesis.speak(utterance);
  }, [speaking, addToast]);

  const handleRemove = useCallback(
    (word: string) => {
      removeWordFromBook(word);
      addToast('info', `已移除 "${word}"`);
    },
    [removeWordFromBook, addToast]
  );

  // ---- Export to Markdown ----
  const handleExportMarkdown = useCallback(() => {
    if (wordBook.length === 0) {
      addToast('warning', '单词本为空，无法导出');
      return;
    }

    const now = new Date().toLocaleDateString('zh-CN');
    const sorted = [...wordBook].sort((a, b) => a.word.localeCompare(b.word));

    let md = `# 📖 我的英语单词本\n\n`;
    md += `> 导出日期：${now}  |  共 ${sorted.length} 个单词\n\n`;
    md += `---\n\n`;
    md += `| 序号 | 单词 | 释义 | 收藏日期 |\n`;
    md += `|:----:|------|------|:--------:|\n`;

    sorted.forEach((entry, idx) => {
      md += `| ${idx + 1} | **${entry.word}** | ${entry.definition || '-'} | ${entry.dateAdded} |\n`;
    });

    md += `\n---\n\n`;
    md += `### 📝 单词列表（纯文本）\n\n`;

    sorted.forEach((entry, idx) => {
      md += `${idx + 1}. **${entry.word}** — ${entry.definition || '（暂无释义）'}\n`;
    });

    md += `\n---\n*由「英语棋 English Word Chess」自动生成*\n`;

    // Trigger download
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `英语单词本_${now.replace(/\//g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast('success', `已导出 ${sorted.length} 个单词到 Markdown 文件`);
  }, [wordBook, addToast]);

  // Empty state
  if (wordBook.length === 0) {
    return (
      <div className={styles.page}>
        <main className={styles.emptyState}>
          <img src={`${import.meta.env.BASE_URL}owl.svg`} alt="猫头鹰" className={styles.owlImg} />
          <p className={styles.emptyText}>还没有收藏单词，去对战吧！</p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(ROUTES.GAME)}
          >
            去对战
          </Button>
        </main>
        <TabBar currentPath={location.pathname} onNavigate={(path) => navigate(path)} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>我的单词本</h1>
          <div className={styles.headerActions}>
            <span className={styles.countBadge}>{wordBook.length} 个单词</span>
            <button
              className={styles.exportBtn}
              onClick={handleExportMarkdown}
              type="button"
              title="导出为 Markdown 文件"
            >
              📥 导出
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索单词..."
            />
          </div>
          <div className={styles.sortToggle}>
            <button
              className={`${styles.sortBtn} ${sortBy === 'date' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortBy('date')}
              type="button"
            >
              按时间排序
            </button>
            <button
              className={`${styles.sortBtn} ${sortBy === 'alpha' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortBy('alpha')}
              type="button"
            >
              按字母排序
            </button>
          </div>
        </div>

        {/* Word List */}
        <div className={styles.wordList}>
          {filteredWords.length === 0 ? (
            <p className={styles.noResults}>
              {searchQuery ? `没有找到匹配 "${searchQuery}" 的单词` : '暂无单词'}
            </p>
          ) : (
            filteredWords.map((entry) => (
              <WordCard
                key={entry.word}
                word={entry.word}
                definition={entry.definition}
                dateAdded={entry.dateAdded}
                onClick={() => handleWordClick(entry.word)}
                onRemove={() => handleRemove(entry.word)}
              />
            ))
          )}
        </div>
      </main>

      {/* Word Detail Modal */}
      <WordDetailModal
        word={selectedWord ?? ''}
        definition={wordDetail}
        loading={detailLoading}
        error={detailError}
        visible={selectedWord !== null}
        onClose={handleCloseModal}
        onSave={handleSave}
        isSaved={selectedWord ? isWordSaved(selectedWord) : false}
        onPronounce={handlePronounce}
        speaking={speaking}
      />

      <TabBar currentPath={location.pathname} onNavigate={(path) => navigate(path)} />
    </div>
  );
};

export default WordBook;
