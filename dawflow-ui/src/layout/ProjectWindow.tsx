import React, { useCallback } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { useConnectionStore } from '../stores/connection';
import { useTransportStore } from '../stores/transport';
import { useRegionStore } from '../stores/regions';
import { ipc } from '../services/ipc';
import { Toolbar } from './Toolbar';
import { LeftZone } from './LeftZone';
import { CenterZone } from './CenterZone';
import { RightZone } from './RightZone';
import { LowerZone } from './LowerZone';
import { TransportBar } from './TransportBar';
import { ZoneDivider } from './ZoneDivider';
import { ExportDialog } from '../dialogs/ExportDialog';
import { PluginEditorDialog } from '../dialogs/PluginEditorDialog';
import { UndoHistoryPanel } from '../components/UndoHistoryPanel';
import styles from './ProjectWindow.module.css';

// ---- Info Line sub-component (reactive to selection) ----
const InfoLine: React.FC = () => {
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const selectedRegionId = useUIStore((s) => s.selectedRegionId);
  const track = useSessionStore((s) => selectedTrackId ? s.tracks.find((t) => t.id === selectedTrackId) : undefined);
  const regionsByTrack = useRegionStore((s) => s.regionsByTrack);
  const sampleRate = useSessionStore((s) => s.sampleRate) || 48000;

  let regionObj: { name: string; position: number; length: number; start: number } | undefined;
  if (selectedTrackId && selectedRegionId) {
    const regions = regionsByTrack[selectedTrackId];
    regionObj = regions?.find((r) => r.id === selectedRegionId);
  }

  const samplesToDisplay = (samples: number) => {
    const secs = samples / sampleRate;
    const mins = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(2);
    return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
  };

  const displayName = regionObj?.name || track?.name || 'No Object Selected';
  const start = regionObj ? samplesToDisplay(regionObj.position) : '-';
  const end = regionObj ? samplesToDisplay(regionObj.position + regionObj.length) : '-';
  const length = regionObj ? samplesToDisplay(regionObj.length) : '-';
  const offset = regionObj ? samplesToDisplay(regionObj.start) : '-';
  const mute = track ? (track.muted ? 'On' : 'Off') : '-';
  const lock = track ? (track.locked ? 'On' : 'Off') : '-';

  return (
    <div className={styles.infoLine}>
      <div className={styles.infoField}>
        <span className={styles.infoLabel}>Name</span>
        <span className={styles.infoValue}>{displayName}</span>
      </div>
      <div className={styles.infoField}>
        <span className={styles.infoLabel}>Start</span>
        <span className={styles.infoValue}>{start}</span>
      </div>
      <div className={styles.infoField}>
        <span className={styles.infoLabel}>End</span>
        <span className={styles.infoValue}>{end}</span>
      </div>
      <div className={styles.infoField}>
        <span className={styles.infoLabel}>Length</span>
        <span className={styles.infoValue}>{length}</span>
      </div>
      <div className={styles.infoField}>
        <span className={styles.infoLabel}>Offset</span>
        <span className={styles.infoValue}>{offset}</span>
      </div>
      <div className={styles.infoField}>
        <span className={styles.infoLabel}>Mute</span>
        <span className={styles.infoValue}>{mute}</span>
      </div>
      <div className={styles.infoField}>
        <span className={styles.infoLabel}>Lock</span>
        <span className={styles.infoValue}>{lock}</span>
      </div>
    </div>
  );
};

// ---- Status Line sub-component (reactive to connection / session) ----
const StatusLine: React.FC = () => {
  const wsConnected = useConnectionStore((s) => s.wsConnected);
  const ipcConnected = useConnectionStore((s) => s.ipcConnected);
  const sampleRate = useSessionStore((s) => s.sampleRate);
  const bitDepth = useSessionStore((s) => s.bitDepth);
  const bufferSize = useTransportStore((s) => s.bufferSize);

  const audioStatus = wsConnected || ipcConnected ? 'Connected' : 'Disconnected';
  const statusClass = wsConnected || ipcConnected ? styles.statusConnected : styles.statusDisabled;
  const rateDisplay = `${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz - ${bitDepth} bit`;

  return (
    <div className={styles.statusLine}>
      <span>Audio Inputs</span><span className={statusClass}>{audioStatus}</span>
      <span>Audio Outputs</span><span className={statusClass}>{audioStatus}</span>
      <span>Control Room</span><span className={styles.statusDisabled}>Disabled</span>
      <span>Max. Record Time</span><span>1188 hours 38 mins</span>
      <span>Record Format</span><span>{rateDisplay}</span>
      <span>Project Frame Rate</span><span>24 fps</span>
      <span>Buffer Size</span><span>{bufferSize}</span>
    </div>
  );
};

export const ProjectWindow: React.FC = () => {
  const sessionName = useSessionStore((s) => s.sessionName);

  React.useEffect(() => {
    document.title = `${sessionName} — DAWFLOW`;
  }, [sessionName]);

  // Fetch buffer size from engine on first connect
  const ipcConnected = useConnectionStore((s) => s.ipcConnected);
  React.useEffect(() => {
    if (!ipcConnected) return;
    ipc.call<Record<string, unknown>>('daw.get_engine_info').then((info) => {
      if (info && typeof info === 'object') {
        const bs = (info as Record<string, unknown>).buffer_size;
        if (typeof bs === 'number' && bs > 0) {
          useTransportStore.getState().setBufferSize(bs);
        }
        useTransportStore.getState().setEngineRunning(true);
      }
    }).catch(() => {
      // engine_info not available yet -- keep defaults
    });
  }, [ipcConnected]);

  const leftZoneVisible = useUIStore((s) => s.leftZoneVisible);
  const rightZoneVisible = useUIStore((s) => s.rightZoneVisible);
  const lowerZoneVisible = useUIStore((s) => s.lowerZoneVisible);
  const transportBarVisible = useUIStore((s) => s.transportBarVisible);
  const statusLineVisible = useUIStore((s) => s.statusLineVisible);
  const leftZoneWidth = useUIStore((s) => s.leftZoneWidth);
  const rightZoneWidth = useUIStore((s) => s.rightZoneWidth);
  const lowerZoneHeight = useUIStore((s) => s.lowerZoneHeight);

  // Use getState() inside callbacks to always get fresh values during drag
  const handleLeftResize = useCallback((delta: number) => {
    const current = useUIStore.getState().leftZoneWidth;
    useUIStore.getState().setLeftZoneWidth(current + delta);
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    const current = useUIStore.getState().rightZoneWidth;
    useUIStore.getState().setRightZoneWidth(current - delta);
  }, []);

  const handleLowerResize = useCallback((delta: number) => {
    const current = useUIStore.getState().lowerZoneHeight;
    useUIStore.getState().setLowerZoneHeight(current - delta);
  }, []);

  return (
    <div className={styles.window}>
      <Toolbar />

      {statusLineVisible && <StatusLine />}

      {/* Info Line — shows selected event properties (Cubase style) */}
      <InfoLine />

      <div className={styles.mainArea}>
        {leftZoneVisible && (
          <>
            <div className={styles.leftZone} style={{ width: leftZoneWidth }}>
              <LeftZone />
            </div>
            <ZoneDivider orientation="vertical" onResize={handleLeftResize} />
          </>
        )}

        <div className={styles.centerArea}>
          <div className={styles.centerZone}>
            <CenterZone />
          </div>

          {lowerZoneVisible && (
            <>
              <ZoneDivider orientation="horizontal" onResize={handleLowerResize} />
              <div className={styles.lowerZone} style={{ height: lowerZoneHeight }}>
                <LowerZone />
              </div>
            </>
          )}
        </div>

        {rightZoneVisible && (
          <>
            <ZoneDivider orientation="vertical" onResize={handleRightResize} />
            <div className={styles.rightZone} style={{ width: rightZoneWidth }}>
              <RightZone />
            </div>
          </>
        )}
      </div>

      {transportBarVisible && <TransportBar />}
      <ExportDialog />
      <PluginEditorDialog />
      <UndoHistoryPanel />
    </div>
  );
};
