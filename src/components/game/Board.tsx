import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type { BoardState, CellType } from '../../types/board';
import type { PlacedTileInput } from '../../types/game';
import { BOARD_SIZE } from '../../constants/board';
import styles from './Board.module.css';

export interface BoardHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

interface BoardProps {
  board: BoardState;
  placedTiles: Map<string, PlacedTileInput>;
  onCellClick: (row: number, col: number) => void;
  hasSelectedTile: boolean;
  disabled?: boolean;
  className?: string;
}

const LABEL_OFFSET = 1;
const TOTAL_CELLS = BOARD_SIZE + 2;
const MAX_CELL_SIZE_DESKTOP = 42;
const MAX_CELL_SIZE_BOARD = 600;
const SIDE_PADDING = 32;

const CELL_FILL: Record<CellType, string> = {
  NORMAL: '#FDF6E3',
  DW: '#FFD23F',
  TW: '#F4A261',
  DL: '#2EC4B6',
  TL: '#FF6E61',
  CENTER: '#FFD23F',
};

const CELL_LABEL: Record<CellType, string> = {
  NORMAL: '',
  DW: 'DW',
  TW: 'TW',
  DL: 'DL',
  TL: 'TL',
  CENTER: '★',
};

const LABEL_DARK = new Set<CellType>(['DW', 'TW', 'CENTER']);
const LABEL_LIGHT = new Set<CellType>(['DL', 'TL']);

const CELL_TOOLTIP: Record<CellType, string> = {
  NORMAL: '',
  DL: '🔤 字母分数 ×2',
  TL: '🔤 字母分数 ×3',
  DW: '📖 单词分数 ×2',
  TW: '📖 单词分数 ×3',
  CENTER: '⭐ 中心格 — 单词分数 ×2（首回合必过）',
};

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
): void {
  const spikes = 5;
  const path = new Path2D();
  for (let i = 0; i < spikes; i++) {
    const outerAngle = ((i * 72 - 90) * Math.PI) / 180;
    const innerAngle = ((i * 72 + 36 - 90) * Math.PI) / 180;
    const ox = cx + Math.cos(outerAngle) * outerR;
    const oy = cy + Math.sin(outerAngle) * outerR;
    const ix = cx + Math.cos(innerAngle) * innerR;
    const iy = cy + Math.sin(innerAngle) * innerR;
    if (i === 0) path.moveTo(ox, oy);
    else path.lineTo(ox, oy);
    path.lineTo(ix, iy);
  }
  path.closePath();
  ctx.fillStyle = '#6B4E3D';
  ctx.fill(path);
}

function drawClayTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  letter: string,
  points: number,
  highlight: boolean,
): void {
  const margin = 2;
  const tx = x + margin;
  const ty = y + margin;
  const ts = size - margin * 2;
  const radius = 4;

  ctx.beginPath();
  ctx.moveTo(tx + radius, ty);
  ctx.lineTo(tx + ts - radius, ty);
  ctx.quadraticCurveTo(tx + ts, ty, tx + ts, ty + radius);
  ctx.lineTo(tx + ts, ty + ts - radius);
  ctx.quadraticCurveTo(tx + ts, ty + ts, tx + ts - radius, ty + ts);
  ctx.lineTo(tx + radius, ty + ts);
  ctx.quadraticCurveTo(tx, ty + ts, tx, ty + ts - radius);
  ctx.lineTo(tx, ty + radius);
  ctx.quadraticCurveTo(tx, ty, tx + radius, ty);
  ctx.closePath();

  ctx.fillStyle = '#FFFEF9';
  ctx.fill();

  ctx.strokeStyle = highlight ? '#FFD23F' : 'rgba(107,78,61,0.18)';
  ctx.lineWidth = highlight ? 3 : 1;
  ctx.stroke();

  // Clay highlight (inner top-left)
  ctx.beginPath();
  ctx.moveTo(tx + 2, ty + 2);
  ctx.lineTo(tx + ts - 2, ty + 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Letter
  const fontSize = Math.max(10, size * 0.45);
  ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = '#6B4E3D';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, x + size / 2, y + size / 2);

  // Points badge
  const ptsSize = Math.max(7, size * 0.22);
  ctx.font = `${ptsSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
  ctx.fillStyle = '#6B4E3D';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(String(points), x + size - 3, y + size - 2);
}

function calcCellSize(): number {
  if (typeof window === 'undefined') return MAX_CELL_SIZE_DESKTOP;
  const availableW = Math.min(window.innerWidth - SIDE_PADDING, MAX_CELL_SIZE_BOARD);
  // Reserve space for TopBar (48px) + rack + action bar + padding (~160px)
  const availableH = window.innerHeight - 200;
  const available = Math.min(availableW, availableH);
  return Math.floor(available / TOTAL_CELLS);
}

const Board = forwardRef<BoardHandle, BoardProps>(({
  board,
  placedTiles,
  onCellClick,
  hasSelectedTile: _hasSelectedTile,
  disabled = false,
  className,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; left: number; top: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Canvas not supported — show fallback
      if (containerRef.current) {
        containerRef.current.innerHTML =
          '<div style="padding:24px;text-align:center;color:#6B4E3D;">您的浏览器不支持 Canvas，无法渲染棋盘。</div>';
      }
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const cellSize = calcCellSize();
    const canvasSize = TOTAL_CELLS * cellSize;

    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw cells
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const x = (LABEL_OFFSET + c) * cellSize;
        const y = (LABEL_OFFSET + r) * cellSize;
        const cell = board[r]?.[c];
        const cellType: CellType = cell?.type ?? 'NORMAL';

        // Fill
        ctx.fillStyle = CELL_FILL[cellType];
        ctx.fillRect(x, y, cellSize, cellSize);

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

        // Label for special cells
        const label = CELL_LABEL[cellType];
        if (label && cellType !== 'CENTER') {
          const ls = Math.max(8, cellSize * 0.22);
          ctx.font = `bold ${ls}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = LABEL_DARK.has(cellType)
            ? '#1B4965'
            : LABEL_LIGHT.has(cellType)
              ? '#FFFFFF'
              : '#1B4965';
          ctx.fillText(label, x + cellSize / 2, y + cellSize / 2);
        }

        // Center star
        if (cellType === 'CENTER') {
          drawStar(
            ctx,
            x + cellSize / 2,
            y + cellSize / 2,
            cellSize * 0.2,
            cellSize * 0.08,
          );
        }

        // Existing board tile
        const boardTile = cell?.tile;
        if (boardTile) {
          const isPending = placedTiles.has(`${r},${c}`);
          drawClayTile(ctx, x, y, cellSize, boardTile.letter, boardTile.points, isPending);
        }

        // Pending tile on empty cell
        const pendingTile = placedTiles.get(`${r},${c}`);
        if (pendingTile && !boardTile) {
          drawClayTile(ctx, x, y, cellSize, pendingTile.letter, pendingTile.points, true);
        }
      }
    }

    // Row labels (1-15)
    for (let r = 0; r < BOARD_SIZE; r++) {
      const ls = Math.max(8, cellSize * 0.22);
      ctx.font = `${ls}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
      ctx.fillStyle = '#6B4E3D';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        String(r + 1),
        cellSize / 2,
        (LABEL_OFFSET + r) * cellSize + cellSize / 2,
      );
    }

    // Column labels (A-O)
    for (let c = 0; c < BOARD_SIZE; c++) {
      const ls = Math.max(8, cellSize * 0.22);
      ctx.font = `${ls}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
      ctx.fillStyle = '#6B4E3D';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        String.fromCharCode(65 + c),
        (LABEL_OFFSET + c) * cellSize + cellSize / 2,
        cellSize / 2,
      );
    }
  }, [board, placedTiles]);

  const getCellFromEvent = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cellSize = calcCellSize();
      // Use CSS-pixel coordinates directly (drawing handles DPR internally via setTransform)
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const col = Math.floor(mx / cellSize) - LABEL_OFFSET;
      const row = Math.floor(my / cellSize) - LABEL_OFFSET;
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
      return { row, col };
    },
    [],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const pos = getCellFromEvent(e.clientX, e.clientY);
      if (pos) onCellClick(pos.row, pos.col);
    },
    [disabled, getCellFromEvent, onCellClick],
  );

  const handleTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const pos = getCellFromEvent(touch.clientX, touch.clientY);
      if (pos) onCellClick(pos.row, pos.col);
    },
    [disabled, getCellFromEvent, onCellClick],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCellFromEvent(e.clientX, e.clientY);
      if (pos) {
        const cell = board[pos.row]?.[pos.col];
        const cellType: CellType = cell?.type ?? 'NORMAL';
        const text = CELL_TOOLTIP[cellType];
        if (text) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const canvasX = (e.clientX - rect.left);
            const canvasY = (e.clientY - rect.top);
            setTooltip({
              text,
              left: canvasX + 12,
              top: canvasY - 36,
            });
          }
          return;
        }
      }
      setTooltip(null);
    },
    [getCellFromEvent, board],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className={[styles.boardContainer, className].filter(Boolean).join(' ')}
      style={{ position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        className={[styles.canvas, disabled ? styles.cursorDefault : styles.cursorPointer].join(' ')}
        onClick={handleClick}
        onTouchStart={handleTouch}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
});

Board.displayName = 'Board';
export default Board;
