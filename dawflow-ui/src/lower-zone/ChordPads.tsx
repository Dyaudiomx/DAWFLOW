import React, { useState, useCallback } from 'react';
import styles from './ChordPads.module.css';

interface ChordPad {
  id: number;
  chord: string;
  root: string;
  color: string;
}

const PADS: ChordPad[] = [
  { id: 0,  chord: 'Cmaj',  root: 'C',   color: '#5B7FA5' },
  { id: 1,  chord: 'Dm',    root: 'D',   color: '#3A8C8C' },
  { id: 2,  chord: 'Em',    root: 'E',   color: '#4CAF50' },
  { id: 3,  chord: 'F',     root: 'F',   color: '#B8963A' },
  { id: 4,  chord: 'G',     root: 'G',   color: '#D47B2E' },
  { id: 5,  chord: 'Am',    root: 'A',   color: '#AE6A8A' },
  { id: 6,  chord: 'Bdim',  root: 'B',   color: '#8A6AAE' },
  { id: 7,  chord: 'C7',    root: 'C',   color: '#5B7FA5' },
  { id: 8,  chord: 'Dm7',   root: 'D',   color: '#3A8C8C' },
  { id: 9,  chord: 'Em7',   root: 'E',   color: '#4CAF50' },
  { id: 10, chord: 'Fmaj7', root: 'F',   color: '#B8963A' },
  { id: 11, chord: 'G7',    root: 'G',   color: '#D47B2E' },
  { id: 12, chord: 'Am7',   root: 'A',   color: '#AE6A8A' },
  { id: 13, chord: 'Bm7b5', root: 'B',   color: '#8A6AAE' },
  { id: 14, chord: 'Csus4', root: 'C',   color: '#6A9FD4' },
  { id: 15, chord: 'Gsus4', root: 'G',   color: '#6A9FD4' },
];

/** Simplified piano keyboard showing C3-C5 range with pad assignments highlighted. */
const KEYBOARD_KEYS = [
  { note: 'C',  black: false, assigned: true },
  { note: 'C#', black: true,  assigned: false },
  { note: 'D',  black: false, assigned: true },
  { note: 'D#', black: true,  assigned: false },
  { note: 'E',  black: false, assigned: true },
  { note: 'F',  black: false, assigned: true },
  { note: 'F#', black: true,  assigned: false },
  { note: 'G',  black: false, assigned: true },
  { note: 'G#', black: true,  assigned: false },
  { note: 'A',  black: false, assigned: true },
  { note: 'A#', black: true,  assigned: false },
  { note: 'B',  black: false, assigned: true },
  { note: 'C',  black: false, assigned: true },
  { note: 'C#', black: true,  assigned: false },
  { note: 'D',  black: false, assigned: true },
  { note: 'D#', black: true,  assigned: false },
  { note: 'E',  black: false, assigned: true },
  { note: 'F',  black: false, assigned: true },
  { note: 'F#', black: true,  assigned: false },
  { note: 'G',  black: false, assigned: true },
  { note: 'G#', black: true,  assigned: false },
  { note: 'A',  black: false, assigned: false },
  { note: 'A#', black: true,  assigned: false },
  { note: 'B',  black: false, assigned: false },
  { note: 'C',  black: false, assigned: false },
];

export const ChordPads: React.FC = () => {
  const [activePad, setActivePad] = useState<number | null>(null);

  const handlePadDown = useCallback((id: number) => {
    setActivePad(id);
  }, []);

  const handlePadUp = useCallback(() => {
    setActivePad(null);
  }, []);

  return (
    <div className={styles.container}>
      {/* Simplified keyboard strip */}
      <div className={styles.keyboard}>
        {KEYBOARD_KEYS.map((key, i) => (
          <div
            key={i}
            className={`
              ${key.black ? styles.blackKey : styles.whiteKey}
              ${key.assigned ? styles.assignedKey : ''}
            `}
          />
        ))}
      </div>

      {/* 4x4 pad grid */}
      <div className={styles.grid}>
        {PADS.map((pad) => (
          <button
            key={pad.id}
            className={`${styles.pad} ${activePad === pad.id ? styles.padActive : ''}`}
            onPointerDown={() => handlePadDown(pad.id)}
            onPointerUp={handlePadUp}
            onPointerLeave={handlePadUp}
          >
            <div className={styles.padColor} style={{ backgroundColor: pad.color }} />
            <span className={styles.padChord}>{pad.chord}</span>
            <span className={styles.padRoot}>{pad.root}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
