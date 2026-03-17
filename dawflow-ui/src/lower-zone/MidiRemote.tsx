import React from 'react';
import styles from './MidiRemote.module.css';

const MAPPING_SLOTS = [
  { id: 1, type: 'knob' as const, label: 'CC 1' },
  { id: 2, type: 'knob' as const, label: 'CC 2' },
  { id: 3, type: 'knob' as const, label: 'CC 3' },
  { id: 4, type: 'knob' as const, label: 'CC 4' },
  { id: 5, type: 'fader' as const, label: 'Fader 1' },
  { id: 6, type: 'fader' as const, label: 'Fader 2' },
  { id: 7, type: 'fader' as const, label: 'Fader 3' },
  { id: 8, type: 'fader' as const, label: 'Fader 4' },
];

export const MidiRemote: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>MIDI Remote</span>
        <span className={styles.status}>Disconnected</span>
      </div>
      <div className={styles.body}>
        <span className={styles.message}>No MIDI Controller Connected</span>
        <div className={styles.mappingGrid}>
          {MAPPING_SLOTS.map((slot) => (
            <div key={slot.id} className={styles.mappingSlot}>
              {slot.type === 'knob' ? (
                <div className={styles.slotKnobHint} />
              ) : (
                <div className={styles.slotFaderHint} />
              )}
              <span className={styles.slotLabel}>{slot.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
