import styles from './Skeleton.module.css';

interface SkeletonBaseProps {
  className?: string;
}

interface SkeletonTextProps extends SkeletonBaseProps {
  lines?: number;
}

interface SkeletonCircleProps extends SkeletonBaseProps {
  diameter?: number;
}

interface SkeletonRectProps extends SkeletonBaseProps {
  width?: string | number;
  height?: string | number;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`${styles.textBlock} ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${styles.line} ${i === lines - 1 ? styles.lineLast : ''}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ diameter = 48, className = '' }: SkeletonCircleProps) {
  return (
    <div
      className={`${styles.circle} ${styles.pulse} ${className}`}
      style={{ width: diameter, height: diameter }}
    />
  );
}

export function SkeletonRect({ width = '100%', height = 100, className = '' }: SkeletonRectProps) {
  return (
    <div
      className={`${styles.rect} ${styles.pulse} ${className}`}
      style={{ width, height }}
    />
  );
}

const Skeleton = {
  Text: SkeletonText,
  Circle: SkeletonCircle,
  Rect: SkeletonRect,
};

export default Skeleton;
