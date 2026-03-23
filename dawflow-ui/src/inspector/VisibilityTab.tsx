import React, { useState, useCallback, useMemo } from 'react';
import { useSessionStore, buildTrackTree } from '../stores/session';
import type { Track, TrackType } from '../types/track';
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
  const routeGroups = useSessionStore((s) => s.routeGroups);
  const collapsedFolders = useSessionStore((s) => s.collapsedFolders);
  const toggleFolderCollapsed = useSessionStore((s) => s.toggleFolderCollapsed);
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

  const treeTracks = useMemo(
    () => buildTrackTree(tracks, routeGroups),
    [tracks, routeGroups],
  );

  const filteredTracks = useMemo(() => {
    if (activeFilters.size === 0) return treeTracks;
    // When filtering, show folder tracks if any of their children match
    return treeTracks.filter((t) => {
      if (t.children && t.children.length > 0) {
        return t.children.some(c => activeFilters.has(c.type)) || activeFilters.has(t.type);
      }
      return activeFilters.has(t.type);
    });
  }, [treeTracks, activeFilters]);

  const toggleVisibility = useCallback(
    (id: string, children?: Track[]) => {
      const idsToToggle = new Set<string>([id]);
      // When toggling a folder, toggle all children too
      if (children) {
        children.forEach(c => idsToToggle.add(c.id));
      }
      const target = tracks.find(t => t.id === id);
      const newVisible = target ? !target.visible : true;
      const updated = tracks.map((t) =>
        idsToToggle.has(t.id) ? { ...t, visible: newVisible } : t,
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

  const renderTrackItem = (track: Track, depth: number = 0) => {
    const isFolder = track.children && track.children.length > 0;
    const isCollapsed = collapsedFolders.includes(track.id);

    // When filters active, filter children too
    const visibleChildren = isFolder
      ? (activeFilters.size === 0
          ? track.children!
          : track.children!.filter(c => activeFilters.has(c.type)))
      : [];

    return (
      <React.Fragment key={track.id}>
        <div className={styles.trackRow} style={{ paddingLeft: depth * 16 }}>
          {isFolder && (
            <span
              onClick={() => toggleFolderCollapsed(track.id)}
              style={{ cursor: 'pointer', marginRight: 4, fontSize: 10, userSelect: 'none' }}
            >
              {isCollapsed ? '\u25B6' : '\u25BC'}
            </span>
          )}
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={track.visible}
            onChange={() => toggleVisibility(track.id, isFolder ? track.children : undefined)}
          />
          <span
            className={styles.typeIcon}
            style={{ backgroundColor: TYPE_COLORS[track.type] || 'var(--border-medium)' }}
          >
            {isFolder ? '\uD83D\uDCC1' : (TYPE_ICONS[track.type] || '?')}
          </span>
          <span
            className={`${styles.trackName} ${
              !track.visible ? styles.trackNameHidden : ''
            }`}
          >
            {track.name}
          </span>
        </div>
        {isFolder && !isCollapsed && visibleChildren.map(child => renderTrackItem(child, depth + 1))}
      </React.Fragment>
    );
  };

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

      {/* ---- Track list (hierarchical) ---- */}
      <div className={styles.trackList}>
        {filteredTracks.map((track) => renderTrackItem(track))}
      </div>
    </div>
  );
};
