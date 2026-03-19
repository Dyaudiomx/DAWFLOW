import React from 'react';
import { useSessionStore } from '../stores/session';
import { useUIStore } from '../stores/ui';
import { useTransportStore } from '../stores/transport';
import { useRegionStore } from '../stores/regions';
import { ipc } from '../services/ipc';
import { ContextMenu } from '../shared/ContextMenu';
import type { ContextMenuItem } from '../shared/ContextMenu';
import { WaveformDisplay } from '../shared/WaveformDisplay';
import { MidiNoteDisplay } from '../shared/MidiNoteDisplay';
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
  const activeTool = useUIStore((s) => s.activeTool);
  const position = useTransportStore((s) => s.position);
  const recording = useTransportStore((s) => s.recording);
  const leftLocator = useTransportStore((s) => s.leftLocator);
  const rightLocator = useTransportStore((s) => s.rightLocator);

  // Track where recording started (for the growing region visual)
  const [recordStartPos, setRecordStartPos] = React.useState<number>(0);
  React.useEffect(() => {
    if (recording) setRecordStartPos(position);
  }, [recording]);

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{x: number; y: number; trackId?: string} | null>(null);

  // Tool cursor — use data attribute (CSS module class names are hashed)

  // Track rename state
  const [editingTrackId, setEditingTrackId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const openAddTrack = useUIStore((s) => s.openAddTrackDialog);

  // Drag state for region move (select tool)
  const [draggingRegion, setDraggingRegion] = React.useState<{
    trackId: string; regionId: string; startX: number; origPosition: number;
  } | null>(null);

  // Build Cubase-style context menu items
  const buildContextMenuItems = React.useCallback((): ContextMenuItem[] => {
    const trackItems: ContextMenuItem[] = [
      { label: 'Add Audio Track', icon: '\u266B', shortcut: 'Shift+A', onClick: () => openAddTrack('audio') },
      { label: 'Add Instrument Track', icon: '\u2161\u2161\u2161', shortcut: '\u21E7\u2318T', onClick: () => openAddTrack('instrument') },
      { label: 'Add Sampler Track', icon: '\u266A', onClick: () => openAddTrack('sampler') },
      { label: 'Add Drum Track', icon: '\u7530', onClick: () => openAddTrack('drum') },
      { label: 'Add MIDI Track', icon: '\u25CF', dividerAfter: true, onClick: () => openAddTrack('midi') },
      { label: 'Add Effect Track', icon: 'FX', onClick: () => openAddTrack('effect') },
      { label: 'Add Group Track', icon: '\u03C8', onClick: () => openAddTrack('group') },
      { label: 'Add VCA Track', icon: '\u25B6\u25A0', dividerAfter: true, onClick: () => openAddTrack('vca') },
      { label: 'Add Folder Track', icon: '\uD83D\uDCC1', onClick: () => openAddTrack('group') },
      { label: 'Add Marker Track', icon: '\u2193', onClick: () => openAddTrack('audio') },
      { label: 'Add Ruler Track', icon: '\uD83C\uDFB9', dividerAfter: true, onClick: () => openAddTrack('audio') },
      { label: 'Using Track Preset...', icon: '\uD83C\uDF10', submenu: true, dividerAfter: true, onClick: () => openAddTrack() },
      { label: 'Add Arranger Track', icon: '\u21BB', onClick: () => openAddTrack('audio') },
      { label: 'Add Chord Track', icon: '\u2261', onClick: () => openAddTrack('midi') },
      { label: 'Add Signature Track', icon: '=', onClick: () => openAddTrack('midi') },
      { label: 'Add Tempo Track', icon: '\u2669', onClick: () => openAddTrack('midi') },
      { label: 'Add Transpose Track', icon: '\u266A', onClick: () => openAddTrack('midi') },
      { label: 'Add Video Track', icon: '\uD83C\uDFAC', dividerAfter: true, onClick: () => openAddTrack('audio') },
      { label: 'Show All Used Automation', onClick: () => {} },
      { label: 'Hide All Automation', onClick: () => {} },
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
        <div className={styles.rulerTimeline} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetPx = e.clientX - rect.left;
          const seconds = offsetPx / PIXELS_PER_SECOND;
          const samples = Math.floor(seconds * sampleRate);
          ipc.transportLocate(samples).catch((e) => console.warn('[IPC]', e));
          useTransportStore.getState().setPosition(seconds);
        }}>
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
        data-tool={activeTool}
        style={{ position: 'relative' }}
        onClick={(e) => {
          if (draggingRegion) return; // Don't seek while dragging
          // Only seek if clicking on empty space (not on a track control)
          if ((e.target as HTMLElement).closest(`.${styles.trackHeader}`)) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetPx = e.clientX - rect.left - 250; // 250px is track header width
          if (offsetPx < 0) return;
          const seconds = offsetPx / PIXELS_PER_SECOND;
          const samples = Math.floor(seconds * sampleRate);
          ipc.transportLocate(samples).catch((e) => console.warn('[IPC]', e));
          useTransportStore.getState().setPosition(seconds);
        }}
        onMouseMove={(e) => {
          if (!draggingRegion) return;
          const deltaPx = e.clientX - draggingRegion.startX;
          const deltaSamples = Math.floor((deltaPx / PIXELS_PER_SECOND) * sampleRate);
          const newPos = Math.max(0, draggingRegion.origPosition + deltaSamples);
          // Live preview: update local region position
          const store = useRegionStore.getState();
          const regions = store.regionsByTrack[draggingRegion.trackId] || [];
          const updated = regions.map(r =>
            r.id === draggingRegion.regionId ? { ...r, position: newPos } : r
          );
          useRegionStore.setState({
            regionsByTrack: { ...store.regionsByTrack, [draggingRegion.trackId]: updated }
          });
        }}
        onMouseUp={() => {
          if (!draggingRegion) return;
          const regions = useRegionStore.getState().regionsByTrack[draggingRegion.trackId] || [];
          const region = regions.find(r => r.id === draggingRegion.regionId);
          if (region && region.position !== draggingRegion.origPosition) {
            ipc.call('daw.move_region', {
              track_id: draggingRegion.trackId,
              region_id: draggingRegion.regionId,
              position_samples: region.position,
            }).then(() => useSessionStore.getState().fetchFromEngine());
          }
          setDraggingRegion(null);
        }}
        onMouseLeave={() => {
          if (draggingRegion) setDraggingRegion(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          const files = e.dataTransfer.files;
          if (files.length === 0) return;

          // Find which track the drop landed on
          const trackEl = (e.target as HTMLElement).closest('[data-track-id]');
          const trackId = trackEl?.getAttribute('data-track-id') || '';

          // Calculate position from drop X coordinate
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetPx = e.clientX - rect.left - 250; // 250px track header width
          const seconds = Math.max(0, offsetPx / PIXELS_PER_SECOND);
          const positionSamples = Math.floor(seconds * sampleRate);

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // WKWebView may provide path via webkitRelativePath or name
            const filepath = (file as any).path || file.name;
            ipc.call('daw.import_audio', {
              filepath,
              track_id: trackId || undefined,
              position_samples: positionSamples,
            }).then(() => {
              setTimeout(() => useSessionStore.getState().fetchFromEngine(), 500);
            }).catch((err: unknown) => console.error('[DAWFLOW] Import failed:', err));
          }
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
              data-track-id={track.id}
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
                  {editingTrackId === track.id ? (
                    <input
                      autoFocus
                      className={styles.trackNameInput}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        if (editingName.trim()) {
                          ipc.renameTrack(track.id, editingName.trim()).then(() =>
                            useSessionStore.getState().fetchFromEngine()
                          );
                        }
                        setEditingTrackId(null);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingTrackId(null);
                      }}
                    />
                  ) : (
                    <span
                      className={styles.trackName}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingTrackId(track.id);
                        setEditingName(track.name);
                      }}
                    >
                      {track.name}
                    </span>
                  )}
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
                {/* Recording region visual (grows in real-time) */}
                {recording && track.recordEnabled && (
                  <div
                    className={styles.regionBlock}
                    style={{
                      left: `${recordStartPos * PIXELS_PER_SECOND}px`,
                      width: `${Math.max(4, (position - recordStartPos) * PIXELS_PER_SECOND)}px`,
                      opacity: 0.7,
                    }}
                  >
                    <div className={styles.eventTop} style={{ background: '#C43030' }}>
                      <span className={styles.eventLabel}>Recording...</span>
                    </div>
                    <div className={styles.eventBody} style={{ background: '#C43030', opacity: 0.4 }} />
                  </div>
                )}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'split') {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickOffsetPx = e.clientX - rect.left;
                          const clickFraction = clickOffsetPx / widthPx;
                          const splitSample = Math.floor(region.position + clickFraction * region.length);
                          ipc.call('daw.split_region', {
                            track_id: track.id,
                            region_id: region.id,
                            position_samples: splitSample,
                          }).then(() => useSessionStore.getState().fetchFromEngine());
                        } else if (activeTool === 'erase') {
                          ipc.call('daw.delete_region', {
                            track_id: track.id,
                            region_id: region.id,
                          }).then(() => useSessionStore.getState().fetchFromEngine());
                        }
                      }}
                      onMouseDown={(e) => {
                        if (activeTool !== 'select') return;
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggingRegion({
                          trackId: track.id,
                          regionId: region.id,
                          startX: e.clientX,
                          origPosition: region.position,
                        });
                      }}
                    >
                      <div className={styles.eventTop} style={{ background: track.color }}>
                        <span className={styles.eventLabel}>{region.name}</span>
                      </div>
                      <div className={styles.eventBody} style={{ background: track.color, opacity: 0.6 }}>
                        {track.type === 'audio' && (
                          <WaveformDisplay
                            trackId={track.id}
                            regionId={region.id}
                            color={track.color}
                            width={widthPx}
                            height={track.height - 20}
                          />
                        )}
                        {track.type === 'midi' && (
                          <MidiNoteDisplay
                            trackId={track.id}
                            regionId={region.id}
                            color={track.color}
                            width={widthPx}
                            height={track.height - 20}
                            regionLengthSamples={region.length}
                            sampleRate={sampleRate}
                            tempo={useTransportStore.getState().tempo}
                          />
                        )}
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
