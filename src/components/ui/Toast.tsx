import { useState, useCallback } from 'react';
import styles from './Toast.module.css';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const iconMap: Record<ToastItem['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'i',
  warning: '⚠',
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.icon}>{iconMap[t.type]}</span>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => onDismiss(t.id)} aria-label="关闭">×</button>
        </div>
      ))}
    </div>
  );
}
