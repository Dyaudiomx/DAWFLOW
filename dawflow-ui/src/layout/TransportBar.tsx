import React from 'react';
import { useTransportStore } from '../stores/transport';
import { useSessionStore } from '../stores/session';
import { useConnectionStore } from '../stores/connection';
import { useUIStore } from '../stores/ui';
import { useVideoStore } from '../stores/video';
import { ipc } from '../services/ipc';
import { ProjectSettingsDialog } from '../dialogs/ProjectSettingsDialog';
import styles from './TransportBar.module.css';

/**
 * Activity indicators (MI MO AI AO) — blink when connected.
 * Once the engine pushes real activity events, the store booleans will
 * drive the blink. For now we simulate a gentle pulse while connected.
 */
const ActivityIndicators: React.FC = () => {
  const mi = useTransportStore((s) => s.midiInActivity);
  const mo = useTransportStore((s) => s.midiOutActivity);
  const ai = useTransportStore((s) => s.audioInActivity);
  const ao = useTransportStore((s) => s.audioOutActivity);
  const connected = useConnectionStore((s) => s.wsConnected);

  const dot = (label: string, active: boolean) => {
    let cls = styles.actDot;
    if (active) {
      cls += ' ' + styles.actDotActive;
    } else if (connected) {
      cls += ' ' + styles.actDotPulse;
    }
    return (
      <span key={label} className={cls} title={label}>
        {label}
      </span>
    );
  };

  return (
    <div className={styles.activityGroup}>
      {dot('MI', mi)}
      {dot('MO', mo)}
      {dot('AI', ai)}
      {dot('AO', ao)}
    </div>
  );
};

// Tap tempo state — kept outside component to survive re-renders
const tapTimestamps: number[] = [];
const TAP_TIMEOUT = 2000; // reset if gap > 2s

type TimeFormat = 'bbt' | 'seconds' | 'samples' | 'timecode';
const TIME_FORMATS: TimeFormat[] = ['bbt', 'seconds', 'samples', 'timecode'];
const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  bbt: 'BBT',
  seconds: 'SEC',
  samples: 'SMP',
  timecode: 'TC',
};

function formatPosition(
  positionDisplay: string,
  positionSeconds: number,
  format: TimeFormat,
  sampleRate: number,
): string {
  switch (format) {
    case 'bbt':
      return positionDisplay || '1.1.000';
    case 'seconds': {
      const mins = Math.floor(positionSeconds / 60);
      const secs = positionSeconds % 60;
      return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
    }
    case 'samples':
      return Math.round(positionSeconds * sampleRate).toLocaleString();
    case 'timecode': {
      const fps = 24;
      const totalFrames = Math.round(positionSeconds * fps);
      const h = Math.floor(totalFrames / (fps * 3600));
      const m = Math.floor((totalFrames % (fps * 3600)) / (fps * 60));
      const s = Math.floor((totalFrames % (fps * 60)) / fps);
      const f = totalFrames % fps;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
    }
    default:
      return positionDisplay || '0.000';
  }
}

/** SMPTE timecode display — only visible when a video is loaded */
const VideoFrameCounter: React.FC = () => {
  const videoFile = useVideoStore((s) => s.videoFile);
  const fps = useVideoStore((s) => s.fps);
  const position = useTransportStore((s) => s.position);

  if (!videoFile) return null;

  const totalFrames = Math.floor(position * fps);
  const ff = totalFrames % Math.round(fps);
  const totalSeconds = Math.floor(position);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const timecode = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;

  return (
    <div
      className={styles.videoTimecode}
      title={`Video timecode @ ${fps} fps`}
    >
      <span className={styles.videoTimecodeLabel}>TC</span>
      <span className={styles.videoTimecodeValue}>{timecode}</span>
    </div>
  );
};

export const TransportBar: React.FC = () => {
  const transport = useTransportStore();
  const sessionSampleRate = useSessionStore((s) => s.sampleRate) || 48000;
  const [timeFormat, setTimeFormat] = React.useState<TimeFormat>('bbt');

  const cycleTimeFormat = React.useCallback(() => {
    setTimeFormat((prev) => {
      const idx = TIME_FORMATS.indexOf(prev);
      return TIME_FORMATS[(idx + 1) % TIME_FORMATS.length];
    });
  }, []);

  const handleTapTempo = React.useCallback(() => {
    const now = performance.now();
    // Reset if gap since last tap is too large
    if (tapTimestamps.length > 0 && now - tapTimestamps[tapTimestamps.length - 1] > TAP_TIMEOUT) {
      tapTimestamps.length = 0;
    }
    tapTimestamps.push(now);
    // Keep at most 8 taps
    if (tapTimestamps.length > 8) tapTimestamps.shift();
    // Need at least 2 taps to compute BPM
    if (tapTimestamps.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < tapTimestamps.length; i++) {
        totalInterval += tapTimestamps[i] - tapTimestamps[i - 1];
      }
      const avgInterval = totalInterval / (tapTimestamps.length - 1);
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 20 && bpm <= 300) {
        useTransportStore.getState().setTempo(bpm);
      }
    }
  }, []);

  return (
    <div className={styles.bar}>
      {/* ===== LEFT ZONE (flex: 1, aligns right toward center) ===== */}
      <div className={styles.leftZone}>
        {/* Small utility icons */}
        <div className={styles.utilIcons}>
          <button className={styles.utilBtn} title="Settings" onClick={() => useUIStore.getState().setProjectSettingsDialogOpen(true)}>⚙</button>
          <button className={styles.utilBtn} title="Performance — Coming soon" onClick={() => {}}>⊙</button>
          <button className={styles.utilBtn} title="Audio Connections — Coming soon" onClick={() => {}}>⇆</button>
          <button className={styles.utilBtn} title="MIDI Filter — Coming soon" onClick={() => {}}>♪</button>
          <button className={styles.utilBtn} title="Auto Quantize — Coming soon" onClick={() => {}}>AQ</button>
        </div>

        <div className={styles.sep} />

        {/* ASIO / Disk */}
        <div className={styles.section}>
          <div className={styles.perfGroup}>
            <span className={styles.perfLabel}>ASIO</span>
            <div className={styles.perfBar}>
              <div className={styles.perfFill} style={{ width: `${transport.cpuLoad}%` }} />
            </div>
          </div>
          <div className={styles.perfGroup}>
            <span className={styles.perfLabel}>DISK</span>
            <div className={styles.perfBar}>
              <div className={styles.perfFill} style={{ width: `${transport.diskLoad}%` }} />
            </div>
          </div>
        </div>

        <div className={styles.sep} />

        {/* Record Mode */}
        <select className={styles.select} value={transport.recordMode} onChange={(e) => {
          const mode = e.target.value as 'non_layered' | 'layered' | 'sound_on_sound';
          useTransportStore.setState({ recordMode: mode });
          ipc.setRecordMode(mode).catch((err) => console.warn('[IPC]', err));
        }}>
          <option value="non_layered">Normal</option>
          <option value="layered">Layered</option>
          <option value="sound_on_sound">Sound on Sound</option>
        </select>

        {/* Punch In / Punch Out / Precount */}
        <div className={styles.section}>
          <button
            className={`${styles.utilBtn} ${transport.punchIn ? styles.clickActive : ''}`}
            title="Punch In"
            onClick={transport.togglePunchIn}
            style={{ width: 'auto', borderRadius: 3, padding: '0 5px', fontSize: 9 }}
          >I</button>
          <button
            className={`${styles.utilBtn} ${transport.punchOut ? styles.clickActive : ''}`}
            title="Punch Out"
            onClick={transport.togglePunchOut}
            style={{ width: 'auto', borderRadius: 3, padding: '0 5px', fontSize: 9 }}
          >O</button>
          <button
            className={`${styles.utilBtn} ${transport.precountEnabled ? styles.clickActive : ''}`}
            title="Precount (Count-in)"
            onClick={transport.togglePrecount}
            style={{ width: 'auto', borderRadius: 3, padding: '0 5px', fontSize: 9 }}
          >1-2</button>
        </div>

        <div className={styles.sep} />

        {/* Left Locators */}
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>L</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.leftLocatorDisplay}
            key={`L-${transport.leftLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setLeftLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>R</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.rightLocatorDisplay}
            key={`R-${transport.rightLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setRightLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      </div>

      {/* ===== CENTER: Transport Buttons (fixed, always centered) ===== */}
      <div className={styles.transportCluster}>
        <button className={styles.tBtn} title="Go to Start" onClick={() => { ipc.transportLocate(0).catch((e) => console.warn('[IPC]', e)); transport.setPosition(0); }}>
          <span className={styles.iconSkipBack}><span className={styles.iconLine}/><span className={styles.iconTriLeft}/></span>
        </button>
        <button className={styles.tBtn} title="Rewind" onClick={() => {
          const pos = useTransportStore.getState().position;
          const sr = useSessionStore.getState().sampleRate || 48000;
          const newPos = Math.max(0, pos - 5);
          ipc.transportLocate(Math.floor(newPos * sr)).catch((e) => console.warn('[IPC]', e));
          useTransportStore.getState().setPosition(newPos);
        }}>
          <span className={styles.iconRewind}><span className={styles.iconTriLeft}/><span className={styles.iconTriLeft}/></span>
        </button>
        <button className={`${styles.tBtn} ${transport.looping ? styles.loopActive : ''}`} title="Cycle" onClick={transport.toggleLoop}>
          <span className={styles.iconLoop} />
        </button>
        <button className={styles.tBtn} title="Return to Zero" onClick={() => { ipc.transportLocate(0).catch((e) => console.warn('[IPC]', e)); transport.setPosition(0); }}>
          <span className={styles.iconReturnZero}><span className={styles.iconTriLeft}/><span className={styles.iconLine}/></span>
        </button>
        <button className={`${styles.tBtnBig} ${!transport.playing ? styles.stopActive : ''}`} title="Stop" onClick={transport.stop}>
          <span className={styles.iconStop} />
        </button>
        <button className={`${styles.tBtnBig} ${transport.playing && !transport.recording ? styles.playActive : ''}`} title="Play" onClick={transport.play}>
          <span className={styles.iconPlay} />
        </button>
        <button className={`${styles.tBtnBig} ${transport.recording ? styles.recordActive : ''}`} title="Record" onClick={transport.record}>
          <span className={styles.iconRecord} />
        </button>
        <button className={styles.tBtn} title="Forward" onClick={() => {
          const pos = useTransportStore.getState().position;
          const sr = useSessionStore.getState().sampleRate || 48000;
          const newPos = pos + 5;
          ipc.transportLocate(Math.floor(newPos * sr)).catch((e) => console.warn('[IPC]', e));
          useTransportStore.getState().setPosition(newPos);
        }}>
          <span className={styles.iconForward}><span className={styles.iconTriRight}/><span className={styles.iconTriRight}/></span>
        </button>
        <button className={styles.tBtn} title="Go to End"
          onClick={() => ipc.call('daw.transport_goto_end').catch((e) => console.warn('[IPC]', e))}>
          <span className={styles.iconSkipFwd}><span className={styles.iconTriRight}/><span className={styles.iconLine}/></span>
        </button>
      </div>

      {/* ===== RIGHT ZONE (flex: 1, aligns left away from center) ===== */}
      <div className={styles.rightZone}>
        {/* Right Locators */}
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>&#9834;</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.leftLocatorDisplay}
            key={`L2-${transport.leftLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setLeftLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>R</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.rightLocatorDisplay}
            key={`R2-${transport.rightLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setRightLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>

        <div className={styles.sep} />

        {/* Time display — click to cycle: BBT → SEC → SMP → TC */}
        <div
          className={styles.timeDisplay}
          onClick={cycleTimeFormat}
          title={`Time format: ${TIME_FORMAT_LABELS[timeFormat]} (click to change)`}
          style={{ cursor: 'pointer', flexDirection: 'column', gap: 0, padding: '2px 8px' }}
        >
          <span style={{ lineHeight: 1.1 }}>
            {formatPosition(transport.positionDisplay, transport.position, timeFormat, sessionSampleRate)}
          </span>
          <span style={{ fontSize: 7, color: '#777', letterSpacing: '0.5px', lineHeight: 1 }}>
            {TIME_FORMAT_LABELS[timeFormat]}
          </span>
        </div>

        <VideoFrameCounter />

        <div className={styles.sep} />

        {/* Tempo + Tap + Time Sig + Click */}
        <div className={styles.section}>
          <div className={styles.tempoField}>
            <input
              type="text"
              className={styles.tempoVal}
              defaultValue={transport.tempo.toFixed(2)}
              key={Math.round(transport.tempo * 100)}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (v >= 20 && v <= 300) transport.setTempo(v);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
            <span className={styles.tempoUpDown}>
              <button className={styles.tempoArrow} onClick={() => transport.setTempo(Math.min(300, transport.tempo + 1))}>▲</button>
              <button className={styles.tempoArrow} onClick={() => transport.setTempo(Math.max(20, transport.tempo - 1))}>▼</button>
            </span>
          </div>
          <button className={styles.tapBtn} onClick={handleTapTempo}>Tap</button>
          <div className={styles.timeSigField}>
            {transport.timeSignatureNumerator}/{transport.timeSignatureDenominator}
          </div>
          <button
            className={`${styles.clickBtn} ${transport.metronomeEnabled ? styles.clickActive : ''}`}
            onClick={transport.toggleMetronome}
            title="Click/Metronome"
          >
            <span className={styles.iconMetronome} />
          </button>
        </div>

        <div className={styles.sep} />

        <ActivityIndicators />
      </div>

      <ProjectSettingsDialog />
    </div>
  );
};
