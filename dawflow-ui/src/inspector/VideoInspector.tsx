import React, { useCallback, useEffect, useState } from 'react';
import { useVideoStore } from '../stores/video';
import { useSessionStore } from '../stores/session';
import { ipc } from '../services/ipc';
import styles from './VideoInspector.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract just the filename from a full path */
function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

/** Format seconds as MM:SS */
function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format aspect ratio (e.g. 1.778 -> "16:9") */
function formatAspectRatio(ratio: number): string {
  if (!ratio || ratio <= 0) return '--';
  // Check common ratios
  const common: [number, string][] = [
    [16 / 9,  '16:9'],
    [4 / 3,   '4:3'],
    [21 / 9,  '21:9'],
    [1,       '1:1'],
    [2.35,    '2.35:1'],
    [2.39,    '2.39:1'],
    [1.85,    '1.85:1'],
  ];
  for (const [val, label] of common) {
    if (Math.abs(ratio - val) < 0.02) return label;
  }
  return ratio.toFixed(3);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const VideoInspector: React.FC = () => {
  const videoFile = useVideoStore((s) => s.videoFile);
  const fps = useVideoStore((s) => s.fps);
  const duration = useVideoStore((s) => s.duration);
  const aspectRatio = useVideoStore((s) => s.aspectRatio);
  const syncEnabled = useVideoStore((s) => s.syncEnabled);
  const pullup = useVideoStore((s) => s.pullup);
  const offsetSamples = useVideoStore((s) => s.offsetSamples);
  const offsetNegative = useVideoStore((s) => s.offsetNegative);
  const offsetLocked = useVideoStore((s) => s.offsetLocked);

  const setSyncEnabled = useVideoStore((s) => s.setSyncEnabled);
  const setPullup = useVideoStore((s) => s.setPullup);
  const setOffset = useVideoStore((s) => s.setOffset);
  const setOffsetLocked = useVideoStore((s) => s.setOffsetLocked);
  const setVideoFile = useVideoStore((s) => s.setVideoFile);

  const sampleRate = useSessionStore((s) => s.sampleRate);

  // Local editing state for pullup field (allows typing partial values)
  const [pullupEdit, setPullupEdit] = useState(pullup.toFixed(3));
  const [offsetEdit, setOffsetEdit] = useState('0.000');

  // Keep local edit state in sync with store
  useEffect(() => {
    setPullupEdit(pullup.toFixed(3));
  }, [pullup]);

  useEffect(() => {
    const sec = sampleRate > 0 ? offsetSamples / sampleRate : 0;
    setOffsetEdit(sec.toFixed(3));
  }, [offsetSamples, sampleRate]);

  // ---- Fetch current video state on mount ----

  useEffect(() => {
    ipc.call<{ enabled?: boolean }>('daw.video.get_sync_enabled')
      .then((data) => {
        if (typeof data?.enabled === 'boolean') {
          setSyncEnabled(data.enabled);
        }
      })
      .catch(() => {});

    ipc.call<{ pullup?: number }>('daw.video.get_pullup')
      .then((data) => {
        if (typeof data?.pullup === 'number') {
          setPullup(data.pullup);
        }
      })
      .catch(() => {});

    ipc.call<{ offset_samples?: number; negative?: boolean }>('daw.video.get_offset')
      .then((data) => {
        if (typeof data?.offset_samples === 'number') {
          setOffset(data.offset_samples, data.negative ?? false);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Handlers ----

  const handleSyncToggle = useCallback(() => {
    const next = !syncEnabled;
    setSyncEnabled(next);
    ipc.call('daw.video.set_sync_enabled', { enabled: next }).catch(() => {});
  }, [syncEnabled, setSyncEnabled]);

  const handlePullupCommit = useCallback(() => {
    const val = parseFloat(pullupEdit);
    if (isNaN(val) || val <= 0) {
      setPullupEdit(pullup.toFixed(3));
      return;
    }
    setPullup(val);
    ipc.call('daw.video.set_pullup', { pullup: val }).catch(() => {});
  }, [pullupEdit, pullup, setPullup]);

  const handlePullupKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handlePullupCommit();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setPullupEdit(pullup.toFixed(3));
        (e.target as HTMLInputElement).blur();
      }
    },
    [handlePullupCommit, pullup],
  );

  const handleOffsetCommit = useCallback(() => {
    if (offsetLocked) return;
    const sec = parseFloat(offsetEdit);
    if (isNaN(sec)) {
      const current = sampleRate > 0 ? offsetSamples / sampleRate : 0;
      setOffsetEdit(current.toFixed(3));
      return;
    }
    const samples = Math.round(Math.abs(sec) * sampleRate);
    const negative = sec < 0 ? true : offsetNegative;
    setOffset(samples, negative);
    ipc.call('daw.video.set_offset', { offset_samples: samples, negative }).catch(() => {});
  }, [offsetEdit, offsetLocked, offsetNegative, offsetSamples, sampleRate, setOffset]);

  const handleOffsetKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleOffsetCommit();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        const current = sampleRate > 0 ? offsetSamples / sampleRate : 0;
        setOffsetEdit(current.toFixed(3));
        (e.target as HTMLInputElement).blur();
      }
    },
    [handleOffsetCommit, offsetSamples, sampleRate],
  );

  const handleNegativeToggle = useCallback(() => {
    if (offsetLocked) return;
    const next = !offsetNegative;
    setOffset(offsetSamples, next);
    ipc.call('daw.video.set_offset', { offset_samples: offsetSamples, negative: next }).catch(() => {});
  }, [offsetLocked, offsetNegative, offsetSamples, setOffset]);

  const handleLockToggle = useCallback(() => {
    setOffsetLocked(!offsetLocked);
  }, [offsetLocked, setOffsetLocked]);

  const handleOpenMonitor = useCallback(() => {
    ipc.call('daw.video.open_monitor', {}).catch(() => {});
  }, []);

  const handleImportVideo = useCallback(() => {
    ipc.call<{ path?: string }>('daw.video.import', {})
      .then((data) => {
        if (data?.path) {
          setVideoFile(data.path);
        }
      })
      .catch(() => {});
  }, [setVideoFile]);

  const handleRemoveVideo = useCallback(() => {
    ipc.call('daw.video.remove', {}).catch(() => {});
    useVideoStore.getState().setVideoFile(null);
  }, []);

  // ---- Computed values ----

  const hasVideo = videoFile !== null;
  const filename = videoFile ? basename(videoFile) : '';
  const offsetSec = sampleRate > 0 ? offsetSamples / sampleRate : 0;

  // ===========================================================================
  // No video loaded — minimal empty state
  // ===========================================================================

  if (!hasVideo) {
    return (
      <div className={styles.videoInspector}>
        <div className={styles.panelHeader}>
          <span className={styles.panelIcon}>{'\uD83C\uDFAC'}</span>
          <span className={styles.panelTitle}>Video</span>
        </div>

        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>{'\uD83C\uDFAC'}</span>
          <span className={styles.emptyText}>No video loaded</span>
          <button className={styles.actionBtn} onClick={handleImportVideo}>
            <span className={styles.actionBtnIcon}>{'\uD83D\uDCC2'}</span>
            Import Video...
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Video loaded — full inspector
  // ===========================================================================

  return (
    <div className={styles.videoInspector}>
      {/* Panel header */}
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon}>{'\uD83C\uDFAC'}</span>
        <span className={styles.panelTitle}>Video</span>
      </div>

      {/* ---- File Info ---- */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>File Info</span>
      </div>
      <div className={styles.sectionBody}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Filename</span>
          <span className={styles.infoFilename} title={videoFile || ''}>{filename}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>FPS</span>
          <span className={styles.infoValue}>{fps.toFixed(2)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Duration</span>
          <span className={styles.infoValue}>{formatDuration(duration)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Aspect Ratio</span>
          <span className={styles.infoValue}>{formatAspectRatio(aspectRatio)}</span>
        </div>
      </div>

      {/* ---- Sync Controls ---- */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Sync</span>
      </div>
      <div className={styles.sectionBody}>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Enable</span>
          <div
            className={`${styles.toggle} ${syncEnabled ? styles.toggleActive : ''}`}
            onClick={handleSyncToggle}
            role="switch"
            aria-checked={syncEnabled}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleSyncToggle(); }}
          >
            <div className={styles.toggleKnob} />
          </div>
          <span className={styles.toggleLabel}>{syncEnabled ? 'On' : 'Off'}</span>
        </div>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Pullup</span>
          <input
            className={styles.inputField}
            type="text"
            value={pullupEdit}
            onChange={(e) => setPullupEdit(e.target.value)}
            onBlur={handlePullupCommit}
            onKeyDown={handlePullupKeyDown}
            spellCheck={false}
          />
        </div>
      </div>

      {/* ---- Offset Controls ---- */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Offset</span>
      </div>
      <div className={styles.sectionBody}>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Offset</span>
          <div className={styles.offsetControls}>
            <button
              className={`${styles.negBtn} ${offsetNegative ? styles.negBtnActive : ''}`}
              onClick={handleNegativeToggle}
              title={offsetNegative ? 'Offset is negative' : 'Offset is positive'}
              disabled={offsetLocked}
            >
              {offsetNegative ? '\u2212' : '+'}
            </button>
            <input
              className={`${styles.inputField} ${styles.inputWide}`}
              type="text"
              value={offsetEdit}
              onChange={(e) => setOffsetEdit(e.target.value)}
              onBlur={handleOffsetCommit}
              onKeyDown={handleOffsetKeyDown}
              disabled={offsetLocked}
              spellCheck={false}
            />
            <span className={styles.inputUnit}>sec</span>
            <button
              className={`${styles.lockBtn} ${offsetLocked ? styles.lockBtnActive : ''}`}
              onClick={handleLockToggle}
              title={offsetLocked ? 'Unlock offset' : 'Lock offset'}
            >
              {offsetLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}
            </button>
          </div>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Samples</span>
          <span className={styles.infoValue}>
            {offsetNegative ? '\u2212' : ''}{offsetSamples.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ---- Actions ---- */}
      <div className={styles.actionsSection}>
        <button className={styles.actionBtn} onClick={handleOpenMonitor}>
          <span className={styles.actionBtnIcon}>{'\uD83D\uDCFA'}</span>
          Open Video Monitor
        </button>
        <button className={styles.actionBtn} onClick={handleImportVideo}>
          <span className={styles.actionBtnIcon}>{'\uD83D\uDCC2'}</span>
          Import Video...
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={handleRemoveVideo}
        >
          <span className={styles.actionBtnIcon}>{'\u2715'}</span>
          Remove Video
        </button>
      </div>
    </div>
  );
};
