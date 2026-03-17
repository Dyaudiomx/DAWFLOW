import React, { useState, useCallback } from 'react';
import styles from './Accordion.module.css';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onToggle?: (open: boolean) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  defaultOpen = true,
  children,
  onToggle,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  }, [open, onToggle]);

  return (
    <div className={`${styles.accordion} ${open ? styles.open : ''}`}>
      <button className={styles.header} onClick={handleToggle}>
        <span className={styles.chevron}>{open ? '\u2304' : '\u203A'}</span>
        <span className={styles.title}>{title}</span>
      </button>
      <div className={styles.content}>
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
};
