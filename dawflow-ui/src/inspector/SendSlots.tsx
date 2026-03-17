import React, { useState, useCallback } from 'react';
import { Fader } from '../shared/Fader';
import { Knob } from '../shared/Knob';
import styles from './SendSlots.module.css';

interface SendSlotData {
  index: number;
  destination: string | null;
  level: number;
  pan: number;
  active: boolean;
  preFader: boolean;
}

const EMPTY_SENDS: SendSlotData[] = Array.from({ length: 8 }, (_, i) => ({
  index: i + 1,
  destination: null,
  level: 0,
  pan: 0,
  active: false,
  preFader: true,
}));

export const SendSlots: React.FC = () => {
  const [sends, setSends] = useState<SendSlotData[]>(EMPTY_SENDS);

  const togglePrePost = useCallback((index: number) => {
    setSends((prev) =>
      prev.map((s) =>
        s.index === index ? { ...s, preFader: !s.preFader } : s,
      ),
    );
  }, []);

  const setLevel = useCallback((index: number, level: number) => {
    setSends((prev) =>
      prev.map((s) => (s.index === index ? { ...s, level } : s)),
    );
  }, []);

  const setPan = useCallback((index: number, pan: number) => {
    setSends((prev) =>
      prev.map((s) => (s.index === index ? { ...s, pan } : s)),
    );
  }, []);

  return (
    <div className={styles.sendSlots}>
      {sends.map((slot) => (
        <div key={slot.index} className={styles.slot}>
          <span
            className={`${styles.activeDot} ${
              slot.destination ? styles.activeDotOn : ''
            }`}
          />
          <span className={styles.slotIndex}>{slot.index}</span>
          <span
            className={`${styles.destination} ${
              slot.destination ? styles.destinationActive : ''
            }`}
          >
            {slot.destination || 'empty'}
          </span>
          <div className={styles.levelWrap}>
            <Fader
              value={slot.level}
              onChange={(v) => setLevel(slot.index, v)}
              orientation="horizontal"
              height={36}
            />
          </div>
          <div className={styles.panWrap}>
            <Knob
              value={slot.pan}
              onChange={(v) => setPan(slot.index, v)}
              size={16}
              bipolar
            />
          </div>
          <button
            className={`${styles.prePostBtn} ${
              !slot.preFader ? styles.prePostActive : ''
            }`}
            onClick={() => togglePrePost(slot.index)}
            title={slot.preFader ? 'Pre-Fader' : 'Post-Fader'}
          >
            {slot.preFader ? 'Pre' : 'Pst'}
          </button>
        </div>
      ))}
    </div>
  );
};
