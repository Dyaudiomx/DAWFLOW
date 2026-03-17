import React from 'react';
import styles from './SamplerControl.module.css';

export const SamplerControl: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerMessage}>No Sampler Track Selected</span>
      </div>
      <div className={styles.layout}>
        <div className={`${styles.placeholderBox} ${styles.waveform}`}>
          <span>Waveform Display</span>
        </div>
        <div className={styles.placeholderBox}>
          <span>Filter Section</span>
        </div>
        <div className={styles.placeholderBox}>
          <span>Amp Envelope</span>
        </div>
      </div>
    </div>
  );
};
