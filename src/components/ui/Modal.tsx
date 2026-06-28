// ===== Modal Component =====

import { useEffect, useCallback, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Optional action buttons rendered in the header alongside the close button */
  headerActions?: ReactNode;
  /** 'drawer' renders a bottom sheet on mobile, modal on desktop */
  variant?: 'modal' | 'drawer';
  size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  headerActions,
  variant = 'modal',
  size = 'md',
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const isDrawer = variant === 'drawer';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={`${styles.panel} ${isDrawer ? styles.drawer : styles.modal} ${styles[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <div className={styles.headerRight}>
            {headerActions}
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="关闭弹窗"
            >
              ×
            </button>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
