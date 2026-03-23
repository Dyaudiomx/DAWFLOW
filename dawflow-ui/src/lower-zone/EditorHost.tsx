import React, { useState } from 'react';
import styles from './EditorHost.module.css';
import MidiEditor from './MidiEditor';
import AudioEditor from './AudioEditor';
import DrumEditor from './DrumEditor';
import { useUIStore } from '../stores/ui';
import { useRegionStore } from '../stores/regions';

export const EditorHost: React.FC = () => {
  const selectedRegionId = useUIStore(s => s.selectedRegionId);
  const selectedTrackId = useUIStore(s => s.selectedTrackId);
  const regionsByTrack = useRegionStore(s => s.regionsByTrack);
  const [drumMode, setDrumMode] = useState(false);

  // Find the selected region
  let selectedRegion = null;
  if (selectedRegionId && selectedTrackId) {
    const regions = regionsByTrack[selectedTrackId] || [];
    selectedRegion = regions.find(r => r.id === selectedRegionId) ?? null;
  }

  // Resolve track color for the selected track
  const trackColor = '#e05070'; // fallback; could be pulled from track store in the future

  // MIDI region selected: show Piano Roll or Drum Editor
  if (selectedRegion && selectedRegion.type === 'midi' && selectedTrackId) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className={styles.editorToggleBar}>
          <button
            className={`${styles.editorToggleBtn} ${!drumMode ? styles.editorToggleBtnActive : ''}`}
            onClick={() => setDrumMode(false)}
          >
            Piano Roll
          </button>
          <button
            className={`${styles.editorToggleBtn} ${drumMode ? styles.editorToggleBtnActive : ''}`}
            onClick={() => setDrumMode(true)}
          >
            Drum Editor
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {drumMode
            ? <DrumEditor regionId={selectedRegion.id} trackId={selectedTrackId} trackColor={trackColor} />
            : <MidiEditor regionId={selectedRegion.id} trackId={selectedTrackId} trackColor={trackColor} />
          }
        </div>
      </div>
    );
  }

  // Audio region selected: show the Sample Editor
  if (selectedRegion && selectedRegion.type === 'audio' && selectedTrackId) {
    return <AudioEditor regionId={selectedRegion.id} trackId={selectedTrackId} trackColor={trackColor} />;
  }

  // Placeholder: no selection
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
