import React, { useState, useCallback } from 'react';
import styles from './InspectorSection.module.css';

interface InspectorSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: string;
}

export const InspectorSection: React.FC<InspectorSectionProps> = ({
  title,
  defaultOpen = false,
  children,
  icon,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <div className={styles.section}>
      <button className={styles.header} onClick={handleToggle}>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          ▸
        </span>
        <span className={styles.title}>{title}</span>
        {icon && <span className={styles.headerIcon}>{icon}</span>}
      </button>
      <div className={`${styles.content} ${open ? styles.contentOpen : ''}`}>
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
};
