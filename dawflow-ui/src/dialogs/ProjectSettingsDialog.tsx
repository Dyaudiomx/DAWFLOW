import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { useRegionStore } from '../stores/regions';
import { ipc } from '../services/ipc';
import styles from './ProjectSettingsDialog.module.css';

// ── Types ────────────────────────────────────────────────────

type SettingsTab = 'audio' | 'metadata' | 'info';

type BufferSize = 32 | 64 | 128 | 256 | 512 | 1024 | 2048;
const BUFFER_SIZES: BufferSize[] = [32, 64, 128, 256, 512, 1024, 2048];

const METADATA_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'genre', label: 'Genre' },
  { key: 'year', label: 'Year' },
  { key: 'composer', label: 'Composer' },
  { key: 'arranger', label: 'Arranger' },
  { key: 'copyright', label: 'Copyright' },
  { key: 'isrc', label: 'ISRC' },
] as const;

// ── Component ────────────────────────────────────────────────

export const ProjectSettingsDialog: React.FC = () => {
  const open = useUIStore((s) => s.projectSettingsDialogOpen);
  const setOpen = useUIStore((s) => s.setProjectSettingsDialogOpen);

  const [activeTab, setActiveTab] = useState<SettingsTab>('audio');

  // Audio Setup state
  const sampleRate = useSessionStore((s) => s.sampleRate);
  const [bufferSize, setBufferSize] = useState<BufferSize>(512);
  const [audioBackend, setAudioBackend] = useState('—');
  const [inputDevice, setInputDevice] = useState('—');
  const [outputDevice, setOutputDevice] = useState('—');
  const [inputLatency, setInputLatency] = useState('—');
  const [outputLatency, setOutputLatency] = useState('—');
  const [roundtripLatency, setRoundtripLatency] = useState('—');

  // Metadata state
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Project Info state
  const sessionName = useSessionStore((s) => s.sessionName);
  const bitDepth = useSessionStore((s) => s.bitDepth);
  const trackCount = useSessionStore((s) => s.tracks.length);
  const regionsByTrack = useRegionStore((s) => s.regionsByTrack);
  const [sessionPath, setSessionPath] = useState('—');
  const [sessionLength, setSessionLength] = useState('—');
  const [undoDepth, setUndoDepth] = useState(0);

  // ── Fetch data on open ──────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    // Fetch engine info (audio setup)
    ipc.call<Record<string, unknown>>('daw.get_engine_info').then((info) => {
      if (info && typeof info === 'object') {
        if (typeof info.buffer_size === 'number') setBufferSize(info.buffer_size as BufferSize);
        if (typeof info.backend === 'string') setAudioBackend(info.backend);
        if (typeof info.input_device === 'string') setInputDevice(info.input_device);
        if (typeof info.output_device === 'string') setOutputDevice(info.output_device);
        if (typeof info.input_latency === 'number') setInputLatency(`${info.input_latency} samples`);
        if (typeof info.output_latency === 'number') setOutputLatency(`${info.output_latency} samples`);
        if (typeof info.input_latency === 'number' && typeof info.output_latency === 'number') {
          const rt = (info.input_latency as number) + (info.output_latency as number);
          const ms = sampleRate > 0 ? ((rt / sampleRate) * 1000).toFixed(1) : '—';
          setRoundtripLatency(`${rt} samples (${ms} ms)`);
        }
      }
    }).catch(() => {});

    // Fetch session info (project info tab)
    ipc.call<Record<string, unknown>>('daw.get_session_info').then((info) => {
      if (info && typeof info === 'object') {
        if (typeof info.path === 'string') setSessionPath(info.path);
        if (typeof info.length === 'number') {
          const secs = (info.length as number) / (sampleRate || 48000);
          const mins = Math.floor(secs / 60);
          const s = (secs % 60).toFixed(1);
          setSessionLength(`${mins}m ${s}s`);
        } else if (typeof info.end === 'number') {
          const secs = (info.end as number) / (sampleRate || 48000);
          const mins = Math.floor(secs / 60);
          const s = (secs % 60).toFixed(1);
          setSessionLength(`${mins}m ${s}s`);
        }
      }
    }).catch(() => {});

    // Fetch undo history
    ipc.getUndoHistory().then((history) => {
      if (history && Array.isArray(history.undo)) {
        setUndoDepth(history.undo.length);
      }
    }).catch(() => {});

    // Fetch metadata fields via single bulk command
    const fetchMetadata = async () => {
      const result: Record<string, string> = {};
      try {
        const meta = await ipc.call<Record<string, string>>('daw.get_session_metadata');
        if (meta && typeof meta === 'object') {
          for (const field of METADATA_FIELDS) {
            result[field.key] = typeof meta[field.key] === 'string' ? meta[field.key] : '';
          }
        }
      } catch {
        // If metadata command fails, leave all fields empty
        for (const field of METADATA_FIELDS) {
          result[field.key] = '';
        }
      }
      // Fetch description separately
      try {
        const desc = await ipc.call<{ description?: string }>('daw.get_session_description');
        result.description = (desc && typeof desc === 'object' && typeof desc.description === 'string') ? desc.description : '';
      } catch {
        result.description = '';
      }
      setMetadata(result);
    };
    fetchMetadata();
  }, [open, sampleRate]);

  // ── Cleanup debounce timers ──────────────────────────────────

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────

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
    },
    [handleClose],
  );

  const handleBufferSizeChange = useCallback((size: BufferSize) => {
    setBufferSize(size);
    ipc.call('daw.set_buffer_size', { buffer_size: size }).catch((err) =>
      console.warn('[DAWFLOW] Failed to set buffer size:', err),
    );
  }, []);

  const handleMetadataChange = useCallback((field: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));

    // Debounce IPC call
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field]);
    }
    debounceTimers.current[field] = setTimeout(() => {
      if (field === 'description') {
        // Description has its own dedicated command
        ipc.call('daw.set_session_description', { description: value }).catch((err) =>
          console.warn(`[DAWFLOW] Failed to set description:`, err),
        );
      } else {
        // All other metadata fields use the bulk setter
        ipc.call('daw.set_session_metadata', { [field]: value }).catch((err) =>
          console.warn(`[DAWFLOW] Failed to set metadata ${field}:`, err),
        );
      }
    }, 500);
  }, []);

  const handleSaveSession = useCallback(async () => {
    setSaving(true);
    try {
      await ipc.saveSession();
    } catch (err) {
      console.error('[DAWFLOW] Failed to save session:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Derived values ───────────────────────────────────────────

  const regionCount = Object.values(regionsByTrack).reduce(
    (sum, regions) => sum + regions.length,
    0,
  );

  const sampleRateDisplay = sampleRate >= 1000
    ? `${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz`
    : `${sampleRate} Hz`;

  // ── Render ───────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className={styles.dialog} role="dialog" aria-label="Project Settings">

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Project Settings</span>
          <button className={styles.closeBtn} onClick={handleClose} title="Close">
            &times;
          </button>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'audio' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            Audio Setup
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'metadata' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('metadata')}
          >
            Metadata
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Project Info
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* ──── Audio Setup Tab ──── */}
          {activeTab === 'audio' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Audio Engine</div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Sample Rate</span>
                  <div className={styles.fieldControl}>
                    <span className={styles.readOnlyValue}>{sampleRateDisplay}</span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Buffer Size</span>
                  <div className={styles.fieldControl}>
                    <select
                      className={styles.select}
                      value={bufferSize}
                      onChange={(e) => handleBufferSizeChange(Number(e.target.value) as BufferSize)}
                    >
                      {BUFFER_SIZES.map((s) => (
                        <option key={s} value={s}>{s} samples</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Audio Backend</span>
                  <div className={styles.fieldControl}>
                    <span className={styles.readOnlyValue}>{audioBackend}</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>Devices</div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Input Device</span>
                  <div className={styles.fieldControl}>
                    <span className={styles.readOnlyValue}>{inputDevice}</span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Output Device</span>
                  <div className={styles.fieldControl}>
                    <span className={styles.readOnlyValue}>{outputDevice}</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>Latency</div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Input Latency</span>
                  <div className={styles.fieldControl}>
                    <span className={styles.readOnlyValue}>{inputLatency}</span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Output Latency</span>
                  <div className={styles.fieldControl}>
                    <span className={styles.readOnlyValue}>{outputLatency}</span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Round-trip</span>
                  <div className={styles.fieldControl}>
                    <span className={styles.readOnlyValue}>{roundtripLatency}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ──── Metadata Tab ──── */}
          {activeTab === 'metadata' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Session Metadata</div>

              <div className={styles.metadataGrid}>
                {METADATA_FIELDS.map((field) => (
                  <div key={field.key} className={styles.metadataField}>
                    <span className={styles.metadataLabel}>{field.label}</span>
                    <input
                      className={styles.metadataInput}
                      type="text"
                      value={metadata[field.key] || ''}
                      onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                      placeholder={field.label}
                    />
                  </div>
                ))}

                <div className={styles.metadataFieldFull}>
                  <span className={styles.metadataLabel}>Description</span>
                  <textarea
                    className={styles.metadataTextarea}
                    value={metadata.description || ''}
                    onChange={(e) => handleMetadataChange('description', e.target.value)}
                    placeholder="Project description"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ──── Project Info Tab ──── */}
          {activeTab === 'info' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Session Details</div>

              <div className={styles.infoTable}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Session Name</span>
                  <span className={styles.infoValue}>{sessionName}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Session Path</span>
                  <span className={styles.infoValue}>{sessionPath}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Sample Rate</span>
                  <span className={styles.infoValue}>{sampleRateDisplay}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Bit Depth</span>
                  <span className={styles.infoValue}>{bitDepth}-bit</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Track Count</span>
                  <span className={styles.infoValue}>{trackCount}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Region Count</span>
                  <span className={styles.infoValue}>{regionCount}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Session Length</span>
                  <span className={styles.infoValue}>{sessionLength}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Undo History</span>
                  <span className={styles.infoValue}>{undoDepth} step{undoDepth !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {activeTab === 'metadata' && (
            <button className={styles.saveBtn} onClick={handleSaveSession} disabled={saving}>
              {saving ? 'Saving...' : 'Save Session'}
            </button>
          )}
          <button className={styles.closeFooterBtn} onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
