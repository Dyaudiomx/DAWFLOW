import React, { useEffect, useRef, useCallback } from 'react';
import styles from './ContextMenu.module.css';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  dividerAfter?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  submenu?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute position that stays within viewport
  const getPosition = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return { left: x, top: y };

    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    // Flip horizontally if too close to right edge
    if (left + rect.width > vw - 8) {
      left = vw - rect.width - 8;
    }

    // Flip vertically if too close to bottom edge
    if (top + rect.height > vh - 8) {
      top = vh - rect.height - 8;
    }

    // Clamp to viewport
    if (left < 8) left = 8;
    if (top < 8) top = 8;

    return { left, top };
  }, [x, y]);

  // Adjust position after render
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const pos = getPosition();
    menu.style.left = `${pos.left}px`;
    menu.style.top = `${pos.top}px`;
  }, [getPosition]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        ref={menuRef}
        className={styles.menu}
        style={{ left: x, top: y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <div
              className={`${styles.item} ${item.disabled ? styles.itemDisabled : ''} ${item.danger ? styles.itemDanger : ''}`}
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                if (!item.submenu) onClose();
              }}
            >
              <span className={styles.icon}>{item.icon || ''}</span>
              <span className={styles.label}>{item.label}</span>
              {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
              {item.submenu && <span className={styles.submenuArrow}>&#9654;</span>}
            </div>
            {item.dividerAfter && <div className={styles.divider} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
