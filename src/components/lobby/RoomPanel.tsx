import React, { useState, useCallback } from 'react';
import styles from './RoomPanel.module.css';

interface RoomPanelProps {
  onCreateRoom?: (code: string) => void;
  onJoinRoom?: (code: string) => void;
  disabled?: boolean;
  className?: string;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

const RoomPanel: React.FC<RoomPanelProps> = ({
  onCreateRoom,
  onJoinRoom,
  disabled = false,
  className,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = useCallback(() => {
    if (disabled) return;
    const code = generateRoomCode();
    setRoomCode(code);

    // Auto copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});

    onCreateRoom?.(code);
  }, [disabled, onCreateRoom]);

  const handleCopy = useCallback(async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [roomCode]);

  const handleJoinInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
      setJoinInput(val);
    },
    [],
  );

  const handleJoin = useCallback(() => {
    if (joinInput.length === 6) {
      onJoinRoom?.(joinInput);
    }
  }, [joinInput, onJoinRoom]);

  return (
    <div className={[styles.panel, className].filter(Boolean).join(' ')}>
      {/* Tab switcher */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${mode === 'create' ? styles.activeTab : ''}`}
          onClick={() => setMode('create')}
          type="button"
        >
          创建房间
        </button>
        <button
          className={`${styles.tab} ${mode === 'join' ? styles.activeTab : ''}`}
          onClick={() => setMode('join')}
          type="button"
        >
          加入房间
        </button>
      </div>

      <div className={styles.content}>
        {mode === 'create' ? (
          <div className={styles.tabContent}>
            {!roomCode ? (
              <button
                className={styles.createBtn}
                onClick={handleCreate}
                disabled={disabled}
                type="button"
              >
                创建房间
              </button>
            ) : (
              <>
                <div className={styles.codeDisplay}>
                  <span className={styles.code}>{roomCode}</span>
                  <button
                    className={styles.copyBtn}
                    onClick={handleCopy}
                    type="button"
                  >
                    {copied ? '✓ 已复制' : '复制'}
                  </button>
                </div>
                <p className={styles.hint}>等待对手加入...</p>
              </>
            )}
          </div>
        ) : (
          <div className={styles.tabContent}>
            <label className={styles.label} htmlFor="room-code-input">
              输入6位房间号
            </label>
            <div className={styles.joinRow}>
              <input
                id="room-code-input"
                className={styles.codeInput}
                type="text"
                inputMode="text"
                maxLength={6}
                value={joinInput}
                onChange={handleJoinInput}
                placeholder="大写字母+数字"
                disabled={disabled}
                autoComplete="off"
              />
              <button
                className={styles.joinBtn}
                disabled={disabled || joinInput.length < 6}
                onClick={handleJoin}
                type="button"
              >
                加入房间
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPanel;
