import React, { useState, useCallback } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { ipc } from '../services/ipc';
import styles from './AddTrackDialog.module.css';

type TrackType = 'audio' | 'midi' | 'bus';

const PLACEHOLDERS: Record<TrackType, string> = {
  audio: 'Audio Track',
  midi: 'MIDI Track',
  bus: 'Bus',
};

export const AddTrackDialog: React.FC = () => {
  const open = useUIStore((s) => s.addTrackDialogOpen);
  const close = useUIStore((s) => s.closeAddTrackDialog);

  const [trackType, setTrackType] = useState<TrackType>('audio');
  const [name, setName] = useState('');
  const [count, setCount] = useState(1);
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const addFn =
        trackType === 'audio' ? ipc.addAudioTrack
        : trackType === 'midi' ? ipc.addMidiTrack
        : ipc.addBus;

      const trackName = name.trim() || undefined;
      for (let i = 0; i < count; i++) {
        await addFn(trackName);
      }
      await useSessionStore.getState().fetchFromEngine();
      // Reset form
      setName('');
      setCount(1);
      setTrackType('audio');
      close();
    } finally {
      setCreating(false);
    }
  }, [trackType, name, count, creating, close]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  }, [close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && !creating) handleCreate();
  }, [close, creating, handleCreate]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.title}>Add Track</span>
          <button className={styles.closeBtn} onClick={close} title="Close">&times;</button>
        </div>

        <div className={styles.body}>
          {/* Track type */}
          <div className={styles.fieldGroup}>
            <span className={styles.label}>Type</span>
            <div className={styles.typeSelector}>
              {(['audio', 'midi', 'bus'] as TrackType[]).map((t) => (
                <button
                  key={t}
                  className={`${styles.typeBtn} ${trackType === t ? styles.typeBtnActive : ''}`}
                  onClick={() => setTrackType(t)}
                >
                  {t === 'midi' ? 'MIDI' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className={styles.fieldGroup}>
            <span className={styles.label}>Name</span>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={PLACEHOLDERS[trackType]}
              autoFocus
            />
          </div>

          {/* Count */}
          <div className={styles.fieldGroup}>
            <span className={styles.label}>Count</span>
            <input
              className={`${styles.input} ${styles.countInput}`}
              type="number"
              min={1}
              max={32}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(32, Number(e.target.value) || 1)))}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={close}>Cancel</button>
          <button className={styles.addBtn} onClick={handleCreate} disabled={creating}>
            {creating ? 'Adding...' : 'Add Track'}
          </button>
        </div>
      </div>
    </div>
  );
};
