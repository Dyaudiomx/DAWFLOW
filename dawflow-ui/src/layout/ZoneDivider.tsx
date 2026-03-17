import React, { useCallback, useRef } from 'react';
import styles from './ZoneDivider.module.css';

interface ZoneDividerProps {
  orientation: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
}

export const ZoneDivider: React.FC<ZoneDividerProps> = ({ orientation, onResize }) => {
  const startPos = useRef(0);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startPos.current = orientation === 'vertical' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const currentPos = orientation === 'vertical' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [orientation, onResize]);

  return (
    <div
      className={`${styles.divider} ${styles[orientation]}`}
      onMouseDown={handleMouseDown}
    />
  );
};
