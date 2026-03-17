import React from 'react';
import styles from './InsertSlots.module.css';

interface InsertSlotData {
  index: number;
  pluginName: string | null;
  bypassed: boolean;
  isPreFader: boolean;
}

const EMPTY_SLOTS: InsertSlotData[] = Array.from({ length: 8 }, (_, i) => ({
  index: i + 1,
  pluginName: null,
  bypassed: false,
  isPreFader: i < 6,
}));

export const InsertSlots: React.FC = () => {
  return (
    <div className={styles.insertSlots}>
      <span className={styles.sectionLabel}>Pre-Fader</span>

      {EMPTY_SLOTS.map((slot) => (
        <React.Fragment key={slot.index}>
          {/* Separator between slot 6 (pre) and slot 7 (post) */}
          {slot.index === 7 && (
            <>
              <div className={styles.separator} />
              <span className={styles.sectionLabel}>Post-Fader</span>
            </>
          )}

          <div className={styles.slot}>
            <span
              className={`${styles.bypassDot} ${
                slot.pluginName && !slot.bypassed ? styles.bypassDotActive : ''
              }`}
            />
            <span className={styles.slotIndex}>{slot.index}</span>
            <span
              className={`${styles.pluginName} ${
                slot.pluginName ? styles.pluginNameLoaded : ''
              }`}
            >
              {slot.pluginName || 'empty'}
            </span>
            <button className={styles.editBtn} title="Edit Plugin">
              e
            </button>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
