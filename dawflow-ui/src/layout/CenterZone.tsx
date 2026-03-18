import React from 'react';
import { useSessionStore } from '../stores/session';
import { useUIStore } from '../stores/ui';
import { useTransportStore } from '../stores/transport';
import { useRegionStore } from '../stores/regions';
import { ipc } from '../services/ipc';
import { ContextMenu } from '../shared/ContextMenu';
import type { ContextMenuItem } from '../shared/ContextMenu';
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
  const position = useTransportStore((s) => s.position);
  const leftLocator = useTransportStore((s) => s.leftLocator);
  const rightLocator = useTransportStore((s) => s.rightLocator);

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{x: number; y: number; trackId?: string} | null>(null);

  const openAddTrack = useUIStore((s) => s.openAddTrackDialog);

  // Build Cubase-style context menu items
  const buildContextMenuItems = React.useCallback((): ContextMenuItem[] => {
    const trackItems: ContextMenuItem[] = [
      { label: 'Add Audio Track', icon: '\u266B', shortcut: 'Shift+A', onClick: () => openAddTrack() },
      { label: 'Add Instrument Track', icon: '\u2161\u2161\u2161', shortcut: '\u21E7\u2318T', onClick: () => openAddTrack() },
      { label: 'Add Sampler Track', icon: '\u266A', onClick: () => console.log('[DAWFLOW] Add Sampler Track') },
      { label: 'Add Drum Track', icon: '\u7530', onClick: () => console.log('[DAWFLOW] Add Drum Track') },
      { label: 'Add MIDI Track', icon: '\u25CF', dividerAfter: true, onClick: () => openAddTrack() },
      { label: 'Add Effect Track', icon: 'FX', onClick: () => console.log('[DAWFLOW] Add Effect Track') },
      { label: 'Add Group Track', icon: '\u03C8', onClick: () => console.log('[DAWFLOW] Add Group Track') },
      { label: 'Add VCA Track', icon: '\u25B6\u25A0', dividerAfter: true, onClick: () => console.log('[DAWFLOW] Add VCA Track') },
      { label: 'Add Folder Track', icon: '\uD83D\uDCC1', onClick: () => console.log('[DAWFLOW] Add Folder Track') },
      { label: 'Add Marker Track', icon: '\u2193', onClick: () => console.log('[DAWFLOW] Add Marker Track') },
      { label: 'Add Ruler Track', icon: '\uD83C\uDFB9', dividerAfter: true, onClick: () => console.log('[DAWFLOW] Add Ruler Track') },
      { label: 'Using Track Preset...', icon: '\uD83C\uDF10', submenu: true, dividerAfter: true, onClick: () => console.log('[DAWFLOW] Track Preset') },
      { label: 'Add Arranger Track', icon: '\u21BB', onClick: () => console.log('[DAWFLOW] Add Arranger Track') },
      { label: 'Add Chord Track', icon: '\u2261', onClick: () => console.log('[DAWFLOW] Add Chord Track') },
      { label: 'Add Signature Track', icon: '=', onClick: () => console.log('[DAWFLOW] Add Signature Track') },
      { label: 'Add Tempo Track', icon: '\u2669', onClick: () => console.log('[DAWFLOW] Add Tempo Track') },
      { label: 'Add Transpose Track', icon: '\u266A', onClick: () => console.log('[DAWFLOW] Add Transpose Track') },
      { label: 'Add Video Track', icon: '\uD83C\uDFAC', dividerAfter: true, onClick: () => console.log('[DAWFLOW] Add Video Track') },
      { label: 'Show All Used Automation', onClick: () => console.log('[DAWFLOW] Show All Used Automation') },
      { label: 'Hide All Automation', onClick: () => console.log('[DAWFLOW] Hide All Automation') },
    ];

    // If right-clicked on a track, prepend track-specific items
    if (contextMenu?.trackId) {
      const tid = contextMenu.trackId;
      const trackSpecificItems: ContextMenuItem[] = [
        {
          label: 'Duplicate Track',
          onClick: () => {
            ipc.call('daw.duplicate_track', { track_id: tid });
            useSessionStore.getState().fetchFromEngine();
          },
        },
        {
          label: 'Remove Track',
          danger: true,
          dividerAfter: true,
          onClick: () => {
            ipc.removeTrack(tid).then(() => useSessionStore.getState().fetchFromEngine());
          },
        },
        {
          label: 'Toggle Mute',
          onClick: () => {
            setTrackMute(tid, !tracks.find(t => t.id === tid)?.muted);
          },
        },
        {
          label: 'Toggle Solo',
          dividerAfter: true,
          onClick: () => {
            setTrackSolo(tid, !tracks.find(t => t.id === tid)?.solo);
          },
        },
      ];
      return [...trackSpecificItems, ...trackItems];
    }

    return trackItems;
  }, [contextMenu, openAddTrack, setTrackMute, setTrackSolo, tracks]);

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
          {Array.from({ length: 200 }, (_, i) => {
            const isBar = i % 4 === 0;
            const isHalfBar = i % 2 === 0 && !isBar;
            return (
              <div
                key={i}
                className={`${styles.rulerMark} ${isBar ? styles.rulerMarkBar : ''} ${isHalfBar ? styles.rulerMarkHalfBar : ''}`}
              >
                {isBar && <span className={styles.barNumber}>{Math.floor(i / 4) + 1}</span>}
                <span className={`${styles.beatTick} ${isBar ? styles.barTick : ''} ${isHalfBar ? styles.halfBarTick : ''}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Track list + Event display */}
      <div
        className={styles.trackArea}
        style={{ position: 'relative' }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* Background grid — always visible even with no tracks */}
        <div className={styles.backgroundGrid}>
          {Array.from({ length: 200 }, (_, i) => (
            <div
              key={i}
              className={`${styles.gridLine} ${i % 4 === 0 ? styles.gridLineBar : ''}`}
              style={{ left: `${i * 30}px` }}
            />
          ))}
        </div>

        <div className={styles.trackList}>
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`${styles.trackRow} ${selectedTrackId === track.id ? styles.trackSelected : ''}`}
              style={{ height: track.height }}
              onClick={() => setSelectedTrackId(track.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, trackId: track.id });
              }}
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
                {Array.from({ length: 200 }, (_, i) => (
                  <div
                    key={i}
                    className={`${styles.gridLine} ${i % 4 === 0 ? styles.gridLineBar : ''}`}
                    style={{ left: `${i * 30}px` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Locator range overlay */}
        {rightLocator > leftLocator && (
          <div
            className={styles.locatorRange}
            style={{
              left: `${250 + leftLocator * PIXELS_PER_SECOND}px`,
              width: `${(rightLocator - leftLocator) * PIXELS_PER_SECOND}px`,
            }}
          />
        )}

        {/* Playhead */}
        <div
          className={styles.playhead}
          style={{ left: `${250 + position * PIXELS_PER_SECOND}px` }}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
