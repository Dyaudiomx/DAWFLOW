import React, { useState, useCallback } from 'react';
import styles from './DawSection.module.css';

export interface DawSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const DawSection: React.FC<DawSectionProps> = ({
  title,
  icon,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <div className={`${styles.dawSection} ${open ? styles.open : ''}`}>
      <button className={styles.header} onClick={handleToggle}>
        <span className={styles.chevron}>{'\u25B6'}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
      </button>
      <div className={styles.content}>
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
};
