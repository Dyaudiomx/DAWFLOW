import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './FloatingWindow.module.css';

export interface FloatingWindowProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  minWidth?: number;
  minHeight?: number;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title,
  children,
  onClose,
  defaultWidth = 800,
  defaultHeight = 500,
  defaultX,
  defaultY,
  minWidth = 400,
  minHeight = 300,
}) => {
  const [pos, setPos] = useState({
    x: defaultX ?? Math.round((window.innerWidth - defaultWidth) / 2),
    y: defaultY ?? Math.round((window.innerHeight - defaultHeight) / 2),
  });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [maximized, setMaximized] = useState(false);
  const preMaxRef = useRef({ pos: { x: 0, y: 0 }, size: { w: 0, h: 0 } });
  const isDragging = useRef(false);

  // Drag title bar
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (maximized) return;
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      setPos({ x: me.clientX - startX, y: Math.max(0, me.clientY - startY) });
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos, maximized]);

  // Resize from bottom-right corner
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (maximized) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.w;
    const startH = size.h;
    const onMove = (me: MouseEvent) => {
      setSize({
        w: Math.max(minWidth, startW + (me.clientX - startX)),
        h: Math.max(minHeight, startH + (me.clientY - startY)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size, maximized, minWidth, minHeight]);

  // Maximize / restore
  const toggleMaximize = useCallback(() => {
    if (maximized) {
      setPos(preMaxRef.current.pos);
      setSize(preMaxRef.current.size);
      setMaximized(false);
    } else {
      preMaxRef.current = { pos: { ...pos }, size: { ...size } };
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
      setMaximized(true);
    }
  }, [maximized, pos, size]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={styles.window}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
    >
      {/* Title bar */}
      <div className={styles.titleBar} onMouseDown={handleDragStart} onDoubleClick={toggleMaximize}>
        <span className={styles.title}>{title}</span>
        <div className={styles.titleButtons}>
          <button className={styles.titleBtn} onClick={toggleMaximize} title={maximized ? 'Restore' : 'Maximize'}>
            {maximized ? '\u25A1' : '\u25A1'}
          </button>
          <button className={`${styles.titleBtn} ${styles.closeBtn}`} onClick={onClose} title="Close">
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {children}
      </div>

      {/* Resize handle */}
      {!maximized && (
        <div className={styles.resizeHandle} onMouseDown={handleResizeStart} />
      )}
    </div>
  );
};
