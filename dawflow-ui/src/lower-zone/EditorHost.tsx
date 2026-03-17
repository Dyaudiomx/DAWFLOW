import React from 'react';
import styles from './EditorHost.module.css';

export const EditorHost: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.placeholder}>
        <div className={styles.icon}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="8" width="26" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
            <line x1="3" y1="12" x2="29" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <line x1="3" y1="20" x2="29" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <rect x="8" y="11" width="3" height="4" rx="0.5" fill="currentColor" opacity="0.35" />
            <rect x="13" y="13" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.35" />
            <rect x="17" y="10" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.35" />
            <rect x="23" y="14" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.35" />
          </svg>
        </div>
        <div className={styles.message}>
          Select an audio or MIDI event to open the editor
        </div>
      </div>
    </div>
  );
};
