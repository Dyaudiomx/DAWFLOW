import React from 'react';
import { useSessionStore } from '../stores/session';
import { useUIStore } from '../stores/ui';
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
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useUIStore((s) => s.setSelectedTrackId);
  const setTrackMute = useSessionStore((s) => s.setTrackMute);
  const setTrackSolo = useSessionStore((s) => s.setTrackSolo);
  const setTrackRecord = useSessionStore((s) => s.setTrackRecord);

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
                {track.type === 'audio' && (
                  <div
                    className={styles.audioEvent}
                    style={{
                      left: `${3 + (parseInt(track.id) * 7) % 12}%`,
                      width: `${25 + (parseInt(track.id) * 13) % 35}%`,
                    }}
                  >
                    <div className={styles.eventTop} style={{ background: track.color }}>
                      <span className={styles.eventLabel}>{track.name}</span>
                    </div>
                    <div className={styles.eventBody} style={{ background: track.color }}>
                      <svg className={styles.waveform} viewBox="0 0 200 30" preserveAspectRatio="none">
                        <path
                          d={generateWaveformPath(parseInt(track.id))}
                          fill="none"
                          stroke="rgba(0,0,0,0.4)"
                          strokeWidth="1"
                        />
                        <path
                          d={generateWaveformPath(parseInt(track.id), true)}
                          fill="none"
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth="1"
                        />
                      </svg>
                    </div>
                  </div>
                )}
                {(track.type === 'instrument' || track.type === 'midi') && (
                  <div
                    className={styles.midiEvent}
                    style={{
                      left: `${3 + (parseInt(track.id) * 11) % 15}%`,
                      width: `${20 + (parseInt(track.id) * 17) % 30}%`,
                    }}
                  >
                    <div className={styles.eventTop} style={{ background: track.color }}>
                      <span className={styles.eventLabel}>{track.name}</span>
                    </div>
                    <div className={styles.eventBody} style={{ background: track.color }}>
                      <div className={styles.midiNotesContainer}>
                        {generateMidiNotes(parseInt(track.id)).map((note, i) => (
                          <div
                            key={i}
                            className={styles.miniNote}
                            style={{
                              left: `${note.x}%`,
                              top: `${note.y}%`,
                              width: `${note.w}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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

function generateWaveformPath(seed: number, mirror = false): string {
  const points: string[] = [];
  const mid = mirror ? 20 : 15;
  for (let x = 0; x <= 200; x += 2) {
    const amp = (Math.sin(x * 0.15 + seed) * 4 + Math.sin(x * 0.08 + seed * 2) * 6 + Math.sin(x * 0.3 + seed * 0.5) * 2) * (mirror ? -1 : 1);
    points.push(`${x === 0 ? 'M' : 'L'}${x},${mid + amp}`);
  }
  return points.join(' ');
}

function generateMidiNotes(seed: number): { x: number; y: number; w: number }[] {
  const notes = [];
  for (let i = 0; i < 16; i++) {
    notes.push({
      x: (i * 6 + ((seed * 3 + i * 7) % 4)) % 95,
      y: 10 + ((seed * 7 + i * 13) % 70),
      w: 3 + ((seed + i * 3) % 5),
    });
  }
  return notes;
}
