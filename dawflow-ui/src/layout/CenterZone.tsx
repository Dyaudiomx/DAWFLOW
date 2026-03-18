import React from 'react';
import { useSessionStore } from '../stores/session';
import { useUIStore } from '../stores/ui';
import { useRegionStore } from '../stores/regions';
import styles from './CenterZone.module.css';

const TRACK_TYPE_ICONS: Record<string, string> = {
  audio: '♫',
  instrument: '♪',
  midi: '♪',
  sampler: '≋',
  group: '≡',
  fx: 'fx',
  vca: 'V',
  folder: '▸',
  chord: '♯',
  marker: '⚑',
  ruler: '┃',
  signature: '¾',
  tempo: '♩',
  transpose: '↕',
  arranger: '⇆',
  video: '▮',
};

export const CenterZone: React.FC = () => {
  const tracks = useSessionStore((s) => s.tracks);
  const sampleRate = useSessionStore((s) => s.sampleRate);
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useUIStore((s) => s.setSelectedTrackId);
  const setTrackMute = useSessionStore((s) => s.setTrackMute);
  const setTrackSolo = useSessionStore((s) => s.setTrackSolo);
  const setTrackRecord = useSessionStore((s) => s.setTrackRecord);
  const regionsByTrack = useRegionStore((s) => s.regionsByTrack);

  // Timeline constants: show ~30 seconds of audio at default zoom
  const PIXELS_PER_SECOND = 20;

  return (
    <div className={styles.container}>
      {/* Ruler */}
      <div className={styles.ruler}>
        <div className={styles.rulerTrackHeader}>
          <span className={styles.rulerLabel}>Bars+Beats</span>
        </div>
        <div className={styles.rulerTimeline}>
          {Array.from({ length: 64 }, (_, i) => (
            <div key={i} className={`${styles.rulerMark} ${i % 4 === 0 ? styles.rulerMarkBar : ''}`}>
              {i % 4 === 0 && <span className={styles.barNumber}>{Math.floor(i / 4) + 1}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Track list + Event display */}
      <div className={styles.trackArea}>
        <div className={styles.trackList}>
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`${styles.trackRow} ${selectedTrackId === track.id ? styles.trackSelected : ''}`}
              style={{ height: track.height }}
              onClick={() => setSelectedTrackId(track.id)}
            >
              {/* Track header */}
              <div className={styles.trackHeader}>
                <div className={styles.trackColorBar} style={{ background: track.color }} />
                <div className={styles.trackInfo}>
                  <span className={styles.trackIcon} style={{ color: track.color }}>
                    {TRACK_TYPE_ICONS[track.type] || '?'}
                  </span>
                  <span className={styles.trackName}>{track.name}</span>
                </div>
                <div className={styles.trackControls}>
                  <button
                    className={`${styles.trackBtn} ${track.muted ? styles.muteActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setTrackMute(track.id, !track.muted); }}
                  >M</button>
                  <button
                    className={`${styles.trackBtn} ${track.solo ? styles.soloActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setTrackSolo(track.id, !track.solo); }}
                  >S</button>
                  {(track.type === 'audio' || track.type === 'instrument' || track.type === 'midi') && (
                    <>
                      <button
                        className={`${styles.trackBtn} ${styles.trackBtnR} ${track.recordEnabled ? styles.recordActive : ''}`}
                        onClick={(e) => { e.stopPropagation(); setTrackRecord(track.id, !track.recordEnabled); }}
                      >R</button>
                      <button
                        className={`${styles.trackBtn} ${track.monitorEnabled ? styles.monitorActive : ''}`}
                      >⌂</button>
                    </>
                  )}
                </div>
              </div>

              {/* Event display area (timeline) */}
              <div className={styles.eventDisplay}>
                {/* Real regions from engine */}
                {(regionsByTrack[track.id] || []).map((region) => {
                  const startSec = region.position / sampleRate;
                  const lengthSec = region.length / sampleRate;
                  const leftPx = startSec * PIXELS_PER_SECOND;
                  const widthPx = Math.max(4, lengthSec * PIXELS_PER_SECOND);

                  return (
                    <div
                      key={region.id}
                      className={styles.regionBlock}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                      }}
                    >
                      <div className={styles.eventTop} style={{ background: track.color }}>
                        <span className={styles.eventLabel}>{region.name}</span>
                      </div>
                      <div className={styles.eventBody} style={{ background: track.color, opacity: 0.6 }}>
                        {/* Placeholder for waveform/MIDI visualization -- future task */}
                      </div>
                    </div>
                  );
                })}
                {/* Grid lines */}
                {Array.from({ length: 64 }, (_, i) => (
                  <div
                    key={i}
                    className={`${styles.gridLine} ${i % 4 === 0 ? styles.gridLineBar : ''}`}
                    style={{ left: `${(i / 64) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
