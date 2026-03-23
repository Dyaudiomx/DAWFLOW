import React, { useState, useCallback, useRef } from 'react';
import { useUIStore } from '../stores/ui';
import { useVideoStore } from '../stores/video';
import { useSessionStore } from '../stores/session';
import { ipc } from '../services/ipc';
import styles from './VideoImportDialog.module.css';

const VIDEO_ACCEPT = '.mp4,.mov,.avi,.mkv,.webm,.m4v,.wmv,.flv';

// ── Component ────────────────────────────────────────────────

export const VideoImportDialog: React.FC = () => {
  const open = useUIStore((s) => s.videoImportDialogOpen);
  const setOpen = useUIStore((s) => s.setVideoImportDialogOpen);

  const [filePath, setFilePath] = useState('');
  const [autoFps, setAutoFps] = useState(true);
  const [startAtSessionStart, setStartAtSessionStart] = useState(true);
  const [offsetSeconds, setOffsetSeconds] = useState(0);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'Enter' && filePath.trim()) handleImport();
    },
    [filePath], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // In native WebView, (file as any).path gives the full filesystem path.
    // In a browser, file.name is all we get — user can edit the path manually.
    const fullPath = (file as any).path || file.name;
    setFilePath(fullPath);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleImport = useCallback(async () => {
    const trimmed = filePath.trim();
    if (!trimmed) return;

    // Tell the engine to register the video file
    await ipc.call('daw.import_video', { file_path: trimmed }).catch(() => {});

    // Try to get metadata from engine
    let detectedFps = 24;
    let detectedDuration = 0;
    try {
      const meta = await ipc.call<Record<string, unknown>>('daw.video.get_metadata', { file_path: trimmed });
      if (meta?.fps) detectedFps = Number(meta.fps);
      detectedDuration = Number(meta?.duration_seconds ?? 0);
    } catch { /* use defaults */ }

    // Update video store
    const videoStore = useVideoStore.getState();
    videoStore.setVideoFile(trimmed, detectedFps, detectedDuration);

    const sampleRate = useSessionStore.getState().sampleRate || 48000;
    const offSamples = startAtSessionStart ? 0 : Math.round(offsetSeconds * sampleRate);
    videoStore.setOffset(Math.abs(offSamples), offsetSeconds < 0);

    // Check if harvid is running
    try {
      const resp = await fetch('http://localhost:5080/status');
      if (resp.ok) videoStore.setHarvidAvailable(true);
    } catch { /* harvid not available */ }

    // Set video sync if auto-FPS is checked
    if (autoFps) {
      await ipc.call('daw.video.set_sync_enabled', { enabled: true }).catch(() => {});
    }

    // Set video offset if not starting at session start
    if (!startAtSessionStart && offsetSeconds !== 0) {
      await ipc.call('daw.video.set_offset', {
        offset_samples: Math.abs(offSamples),
        negative: offsetSeconds < 0,
      }).catch(() => {});
    }

    // Reset form and close
    setFilePath('');
    setOffsetSeconds(0);
    setAutoFps(true);
    setStartAtSessionStart(true);
    setOpen(false);
  }, [filePath, autoFps, startAtSessionStart, offsetSeconds, setOpen]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
      <div className={styles.dialog} role="dialog" aria-label="Import Video">

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Import Video</span>
          <button className={styles.closeBtn} onClick={handleClose} title="Close">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* File path */}
          <div className={styles.fieldRow}>
            <span className={styles.label}>File</span>
            <div className={styles.fieldControl}>
              <input
                className={styles.input}
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/path/to/video.mp4"
                autoFocus
              />
              <button
                className={styles.browseBtn}
                onClick={handleBrowse}
                title="Browse for video file"
              >
                Browse...
              </button>
            </div>
          </div>

          <div className={styles.separator} />

          {/* Auto-set session FPS */}
          <div className={styles.fieldRow}>
            <span className={styles.label} />
            <div className={styles.fieldControl}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={autoFps}
                  onChange={(e) => setAutoFps(e.target.checked)}
                />
                Auto-set session FPS to video FPS
              </label>
            </div>
          </div>

          {/* Start video at session start */}
          <div className={styles.fieldRow}>
            <span className={styles.label} />
            <div className={styles.fieldControl}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={startAtSessionStart}
                  onChange={(e) => setStartAtSessionStart(e.target.checked)}
                />
                Start video at session start
              </label>
            </div>
          </div>

          {/* Video offset */}
          {!startAtSessionStart && (
            <div className={styles.fieldRow}>
              <span className={styles.label}>Video Offset</span>
              <div className={styles.fieldControl}>
                <input
                  className={styles.numberInput}
                  type="number"
                  step={0.1}
                  value={offsetSeconds}
                  onChange={(e) => setOffsetSeconds(parseFloat(e.target.value) || 0)}
                />
                <span className={styles.unitSuffix}>seconds</span>
              </div>
            </div>
          )}

          <div className={styles.separator} />

          {/* Info text */}
          <div className={styles.infoText}>
            Supported: MP4, MOV, AVI, MKV, WebM
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose}>
            Cancel
          </button>
          <button
            className={styles.importBtn}
            onClick={handleImport}
            disabled={!filePath.trim()}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};
