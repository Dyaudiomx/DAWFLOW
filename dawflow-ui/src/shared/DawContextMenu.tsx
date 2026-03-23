import React, { useEffect, useRef, useCallback, useState } from 'react';
import styles from './DawContextMenu.module.css';

export interface MenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
}

export interface DawContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Submenu item — shows a nested menu on hover                       */
/* ------------------------------------------------------------------ */

const SubmenuItem: React.FC<{
  item: MenuItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subPos, setSubPos] = useState<{ left: number; top: number } | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Calculate fixed position for submenu when it opens
  useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      let left = rect.right;
      let top = rect.top - 4;
      // Flip left if it would overflow the viewport
      if (left + 200 > window.innerWidth) {
        left = rect.left - 200;
      }
      if (top < 8) top = 8;
      setSubPos({ left, top });
    }
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className={styles.submenuWrapper}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className={`${styles.item} ${item.disabled ? styles.itemDisabled : ''}`}>
        {item.icon && <span className={styles.icon}>{item.icon}</span>}
        <span className={styles.label}>{item.label}</span>
        <span className={styles.submenuArrow}>{'\u203A'}</span>
      </div>
      {open && item.submenu && item.submenu.length > 0 && subPos && (
        <div
          className={styles.submenuFixed}
          style={{ left: subPos.left, top: subPos.top }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {renderItems(item.submenu, onClose)}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Render a list of MenuItems (used by both root and submenus)       */
/* ------------------------------------------------------------------ */

function renderItems(items: MenuItem[], onClose: () => void): React.ReactNode {
  return items.map((item, i) => {
    // Separator row
    if (item.separator) {
      return <div key={`sep-${i}`} className={styles.separator} />;
    }

    // Item with a nested submenu
    if (item.submenu && item.submenu.length > 0) {
      return <SubmenuItem key={i} item={item} onClose={onClose} />;
    }

    // Regular clickable item
    return (
      <div
        key={i}
        className={`${styles.item} ${item.disabled ? styles.itemDisabled : ''}`}
        onClick={() => {
          if (item.disabled) return;
          item.onClick();
          onClose();
        }}
      >
        {item.icon && <span className={styles.icon}>{item.icon}</span>}
        <span className={styles.label}>{item.label}</span>
        {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
      </div>
    );
  });
}

/* ------------------------------------------------------------------ */
/*  DawContextMenu — the positioned popup                             */
/* ------------------------------------------------------------------ */

export const DawContextMenu: React.FC<DawContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Reposition so the menu stays within the viewport
  const adjustPosition = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (left + rect.width > vw - 8) left = vw - rect.width - 8;
    if (top + rect.height > vh - 8) top = vh - rect.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }, [x, y]);

  useEffect(() => {
    adjustPosition();
  }, [adjustPosition]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        ref={menuRef}
        className={styles.menu}
        style={{ left: x, top: y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {renderItems(items, onClose)}
      </div>
    </div>
  );
};
