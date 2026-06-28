import React from 'react';
import Modal from '../ui/Modal';
import Skeleton from '../ui/Skeleton';
import PronunciationButton from './PronunciationButton';
import styles from './WordDetailModal.module.css';

interface WordDefinition {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
}

interface WordDetailModalProps {
  word: string;
  definition: WordDefinition | null;
  loading: boolean;
  error: string | null;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaved: boolean;
  onPronounce: (word: string) => void;
  speaking: boolean;
}

function getPrimaryPhonetic(definition: WordDefinition): string {
  if (definition.phonetic) return definition.phonetic;
  for (const p of definition.phonetics) {
    if (p.text) return p.text;
  }
  return '';
}

const PART_SPEECH_LABELS: Record<string, string> = {
  noun: '名词', verb: '动词', adjective: '形容词', adverb: '副词',
  pronoun: '代词', preposition: '介词', conjunction: '连词', interjection: '感叹词',
};

function translatePos(pos: string): string {
  return PART_SPEECH_LABELS[pos.toLowerCase()] ?? pos;
}

const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  definition,
  loading,
  error,
  visible,
  onClose,
  onSave,
  isSaved,
  onPronounce,
  speaking,
}) => {
  const renderSaveBtn = () => (
    <button
      className={`${styles.favBtn} ${isSaved ? styles.faved : ''}`}
      onClick={onSave}
      type="button"
      aria-label={isSaved ? '取消收藏' : '收藏单词'}
    >
      <span className={styles.heartIcon}>
        {isSaved ? '♥' : '♡'}
      </span>
      <span>{isSaved ? '已收藏' : '收藏单词'}</span>
    </button>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <Skeleton.Rect width={180} height={28} />
          <div className={styles.loadingGap} />
          <Skeleton.Text lines={4} />
        </div>
      );
    }

    if (error || (!loading && !definition)) {
      return (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📖</span>
          <p className={styles.emptyText}>暂无释义数据</p>
        </div>
      );
    }

    if (!definition) return null;

    const phonetic = getPrimaryPhonetic(definition);

    return (
      <div className={styles.success}>
        {/* Word + TTS */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.wordTitle}>{definition.word}</span>
            <PronunciationButton
              word={definition.word}
              speaking={speaking}
              onPronounce={onPronounce}
              size="md"
            />
          </div>
          {phonetic && <span className={styles.phonetic}>{phonetic}</span>}
        </div>

        {/* Meanings */}
        <div className={styles.meanings}>
          {definition.meanings.map((meaning, mi) => (
            <div key={mi} className={styles.meaningBlock}>
              <span className={styles.posBadge}>
                {translatePos(meaning.partOfSpeech)}
              </span>
              <ol className={styles.defList}>
                {meaning.definitions.map((def, di) => (
                  <li key={di} className={styles.defItem}>
                    <span className={styles.defText}>{def.definition}</span>
                    {def.example && (
                      <span className={styles.defExample}>"{def.example}"</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title={word || '单词详情'}
      variant="drawer"
      size="sm"
      headerActions={!loading && definition ? renderSaveBtn() : undefined}
    >
      <div className={styles.content}>
        {renderContent()}
      </div>
    </Modal>
  );
};

export default WordDetailModal;
