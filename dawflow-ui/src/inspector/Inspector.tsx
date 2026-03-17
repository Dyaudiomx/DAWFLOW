import React from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { TrackInspector } from './TrackInspector';
import styles from './Inspector.module.css';

export const Inspector: React.FC = () => {
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const tracks = useSessionStore((s) => s.tracks);
  const track = tracks.find((t) => t.id === selectedTrackId);

  if (!track) {
    return (
      <div className={styles.inspector}>
        <div className={styles.noSelection}>No Track Selected</div>
      </div>
    );
  }

  return (
    <div className={styles.inspector}>
      <TrackInspector track={track} />
    </div>
  );
};
