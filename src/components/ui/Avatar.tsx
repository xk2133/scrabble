import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  online = false,
  className = '',
}) => {
  const initials = getInitials(name);

  const classes = [styles.avatar, styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} title={name}>
      {src ? (
        <img className={styles.image} src={src} alt={name} />
      ) : (
        <span className={styles.initials}>{initials}</span>
      )}
      {online && <span className={styles.onlineDot} />}
    </div>
  );
};

export default Avatar;
