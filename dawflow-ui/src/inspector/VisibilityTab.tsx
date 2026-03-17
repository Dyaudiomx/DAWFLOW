import React, { useState, useCallback, useMemo } from 'react';
import { useSessionStore } from '../stores/session';
import type { TrackType } from '../types/track';
import styles from './VisibilityTab.module.css';

/* ---- Track type icon map ---- */

const TYPE_ICONS: Record<string, string> = {
  audio: '\uD83D\uDD0A',
  instrument: '\uD83C\uDFB9',
  midi: '\u266A',
  sampler: '\u2B50',
  group: '\uD83D\uDCC1',
  fx: '\u2728',
  vca: '\u25B2',
  folder: '\uD83D\uDCC2',
  chord: '\u266B',
  marker: '\uD83C\uDFF3',
  ruler: '\u23F1',
  tempo: '\u23F1',
  signature: '\u266F',
  transpose: '\u2191',
  arranger: '\u2630',
  video: '\uD83C\uDFA5',
};

const TYPE_COLORS: Record<string, string> = {
  audio: 'var(--track-audio)',
  instrument: 'var(--track-instrument)',
  midi: 'var(--track-midi)',
  sampler: 'var(--track-sampler)',
  group: 'var(--track-group)',
  fx: 'var(--track-fx)',
  vca: 'var(--track-vca)',
  folder: 'var(--track-folder)',
  chord: 'var(--track-chord)',
  marker: 'var(--track-marker)',
  ruler: 'var(--track-ruler)',
  tempo: 'var(--track-tempo)',
  signature: 'var(--track-signature)',
  transpose: 'var(--track-transpose)',
  arranger: 'var(--track-arranger)',
  video: 'var(--track-video)',
};

const FILTER_TYPES: { type: TrackType; label: string }[] = [
  { type: 'audio', label: 'Audio' },
  { type: 'instrument', label: 'Inst' },
  { type: 'midi', label: 'MIDI' },
  { type: 'group', label: 'Grp' },
  { type: 'fx', label: 'FX' },
];

export const VisibilityTab: React.FC = () => {
  const tracks = useSessionStore((s) => s.tracks);
  const updateTracks = useSessionStore((s) => s.updateTracks);

  const [activeFilters, setActiveFilters] = useState<Set<TrackType>>(new Set());

  const toggleFilter = useCallback((type: TrackType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const filteredTracks = useMemo(() => {
    if (activeFilters.size === 0) return tracks;
    return tracks.filter((t) => activeFilters.has(t.type));
  }, [tracks, activeFilters]);

  const toggleVisibility = useCallback(
    (id: string) => {
      const updated = tracks.map((t) =>
        t.id === id ? { ...t, visible: !t.visible } : t,
      );
      updateTracks(updated);
    },
    [tracks, updateTracks],
  );

  const showAll = useCallback(() => {
    const updated = tracks.map((t) => ({ ...t, visible: true }));
    updateTracks(updated);
  }, [tracks, updateTracks]);

  const hideAll = useCallback(() => {
    const updated = tracks.map((t) => ({ ...t, visible: false }));
    updateTracks(updated);
  }, [tracks, updateTracks]);

  return (
    <div className={styles.visibilityTab}>
      {/* ---- Filter + action bar ---- */}
      <div className={styles.toolbar}>
        {FILTER_TYPES.map((f) => (
          <button
            key={f.type}
            className={`${styles.filterBtn} ${
              activeFilters.has(f.type) ? styles.filterBtnActive : ''
            }`}
            onClick={() => toggleFilter(f.type)}
            title={`Filter: ${f.label}`}
          >
            {f.label}
          </button>
        ))}
        <span className={styles.spacer} />
        <button className={styles.actionBtn} onClick={showAll}>
          Show All
        </button>
        <button className={styles.actionBtn} onClick={hideAll}>
          Hide All
        </button>
      </div>

      {/* ---- Track list ---- */}
      <div className={styles.trackList}>
        {filteredTracks.map((track) => (
          <div key={track.id} className={styles.trackRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={track.visible}
              onChange={() => toggleVisibility(track.id)}
            />
            <span
              className={styles.typeIcon}
              style={{ backgroundColor: TYPE_COLORS[track.type] || 'var(--border-medium)' }}
            >
              {TYPE_ICONS[track.type] || '?'}
            </span>
            <span
              className={`${styles.trackName} ${
                !track.visible ? styles.trackNameHidden : ''
              }`}
            >
              {track.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
