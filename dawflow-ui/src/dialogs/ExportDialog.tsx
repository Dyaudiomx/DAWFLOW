import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useUIStore } from '../stores/ui';
import { useVideoStore } from '../stores/video';
import { ipc } from '../services/ipc';
import styles from './ExportDialog.module.css';

// ── Types & constants ────────────────────────────────────────

type ExportFormat = 'WAV' | 'FLAC' | 'MP3' | 'OGG' | 'AIFF';
type SampleRate = 44100 | 48000 | 88200 | 96000 | 192000;
type BitDepth = 16 | 24 | 32;
type DitherType = 'none' | 'rectangular' | 'triangular' | 'shaped';
type RangeType = 'session' | 'locators' | 'selection';
type NormType = 'peak' | 'lufs';

type VideoCodec = 'h264' | 'prores422' | 'prores4444' | 'dnxhd';
type VideoResolution = 'source' | '4k' | '1080p' | '720p';
type VideoContainer = 'mp4' | 'mov' | 'mkv';

const FORMATS: ExportFormat[] = ['WAV', 'FLAC', 'MP3', 'OGG', 'AIFF'];
const SAMPLE_RATES: SampleRate[] = [44100, 48000, 88200, 96000, 192000];
const BIT_DEPTHS: BitDepth[] = [16, 24, 32];
const DITHER_TYPES: { value: DitherType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'triangular', label: 'Triangular' },
  { value: 'shaped', label: 'Shaped' },
];

const VIDEO_CODECS: { value: VideoCodec; label: string }[] = [
  { value: 'h264', label: 'H.264' },
  { value: 'prores422', label: 'ProRes 422' },
  { value: 'prores4444', label: 'ProRes 4444' },
  { value: 'dnxhd', label: 'DNxHD' },
];

const VIDEO_RESOLUTIONS: { value: VideoResolution; label: string }[] = [
  { value: 'source', label: 'Same as source' },
  { value: '4k', label: '4K (3840x2160)' },
  { value: '1080p', label: '1080p (1920x1080)' },
  { value: '720p', label: '720p (1280x720)' },
];

const VIDEO_CONTAINERS: { value: VideoContainer; label: string }[] = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mov', label: 'MOV' },
  { value: 'mkv', label: 'MKV' },
];

// ── Component ────────────────────────────────────────────────

export const ExportDialog: React.FC = () => {
  const open = useUIStore((s) => s.exportDialogOpen);
  const close = useUIStore((s) => s.setExportDialogOpen);
  const videoFile = useVideoStore((s) => s.videoFile);

  // Format section
  const [format, setFormat] = useState<ExportFormat>('WAV');
  const [sampleRate, setSampleRate] = useState<SampleRate>(48000);
  const [bitDepth, setBitDepth] = useState<BitDepth>(24);
  const [dither, setDither] = useState<DitherType>('none');

  // Range section
  const [rangeType, setRangeType] = useState<RangeType>('session');

  // Normalization section
  const [normalize, setNormalize] = useState(false);
  const [normType, setNormType] = useState<NormType>('peak');
  const [normTarget, setNormTarget] = useState(-1.0);
  const [truePeakLimiter, setTruePeakLimiter] = useState(false);

  // Video export section
  const [includeVideo, setIncludeVideo] = useState(false);
  const [videoCodec, setVideoCodec] = useState<VideoCodec>('h264');
  const [videoBitrate, setVideoBitrate] = useState(8000);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>('source');
  const [videoContainer, setVideoContainer] = useState<VideoContainer>('mp4');

  // Output section
  const [filename, setFilename] = useState('mixdown');
  const [folder, setFolder] = useState('');
  const [openAfterExport, setOpenAfterExport] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch session path to pre-populate export folder
  useEffect(() => {
    if (!open) return;
    ipc.call<{ session_path?: string; path?: string }>('daw.get_session_path', {})
      .then((res) => {
        const sessionDir = res?.session_path || res?.path || '';
        if (sessionDir) {
          setFolder(`${sessionDir.replace(/\/$/, '')}/export/`);
        }
      })
      .catch(() => {
        // Fallback: try get_session_properties
        ipc.call<{ path?: string }>('daw.get_session_properties', {})
          .then((res) => {
            if (res?.path) setFolder(`${res.path.replace(/\/$/, '')}/export/`);
          })
          .catch(() => {});
      });
  }, [open]);

  // Reset dither when bit depth changes (dither only relevant for 16-bit)
  useEffect(() => {
    if (bitDepth !== 16) {
      setDither('none');
    }
  }, [bitDepth]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    if (!exporting) close(false);
  }, [close, exporting]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'Enter' && !exporting) handleExport();
    },
    [exporting], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleBrowseFolder = useCallback(async () => {
    try {
      const res = await ipc.call<{ path?: string }>('daw.browse_folder', {});
      if (res?.path) setFolder(res.path);
    } catch {
      // Engine may not support browse_folder — user can type path manually
      console.info('[DAWFLOW] Native folder picker not available; edit path manually.');
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    if (!folder) return;
    try {
      await ipc.call('daw.open_folder', { path: folder });
    } catch {
      // Fallback: not supported by engine, silently ignore
      console.info('[DAWFLOW] open_folder not available in engine.');
    }
  }, [folder]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setError(null);
    setProgress(0);

    try {
      // Configure format
      await ipc.setExportFormatType(format);
      await ipc.setExportSampleRate(sampleRate);
      await ipc.setExportBitDepth(bitDepth);
      if (bitDepth === 16 && dither !== 'none') {
        await ipc.call('daw.export.set_dither_type', { dither });
      }

      // Configure normalization
      await ipc.setExportNormalize(normalize);
      if (normalize) {
        if (normType === 'lufs') {
          await ipc.setExportNormalizeLufs(normTarget);
        } else {
          await ipc.setExportNormalizeDbfs(normTarget);
        }
        await ipc.setExportTpLimiter(truePeakLimiter);
      }

      // Configure output
      await ipc.setExportFilenameLabel(filename);
      await ipc.setExportFilenameFolder(folder);

      // Prepare and execute
      await ipc.prepareExport();

      // Start progress polling using daw.is_export_in_progress
      pollRef.current = setInterval(async () => {
        try {
          const status = await ipc.call<{ exporting?: boolean }>(
            'daw.is_export_in_progress',
          );
          if (status && typeof status === 'object') {
            // Engine only tells us if export is still running;
            // show indeterminate progress while active
            if (status.exporting === false) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              setProgress(100);
            }
          }
        } catch {
          // Polling errors are non-fatal
        }
      }, 250);

      const result = await ipc.executeExport();

      // Stop polling
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (result && typeof result === 'object' && (result as Record<string, unknown>).error) {
        throw new Error(String((result as Record<string, unknown>).error));
      }

      // Video export (after audio export succeeds)
      if (includeVideo && videoFile) {
        const exportPath = `${folder.replace(/\/$/, '')}/${filename}`;
        const ext = videoContainer === 'mkv' ? '.mkv' : videoContainer === 'mov' ? '.mov' : '.mp4';
        await ipc.call('daw.export_video', {
          output_path: exportPath.replace(/\.[^/.]+$/, '') + ext,
          codec: videoCodec,
          bitrate_kbps: videoBitrate,
          resolution: videoResolution,
          container: videoContainer,
        }).catch(err => console.warn('[DAWFLOW] Video export:', err));
      }

      setProgress(100);

      // Open folder if requested
      if (openAfterExport && folder) {
        ipc.call('daw.open_folder', { path: folder }).catch(() => {});
      }

      // Brief pause to show completion, then close
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
        close(false);
      }, 600);
    } catch (e) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[DAWFLOW] Export failed:', msg);
      setError(msg);
      setExporting(false);
    }
  }, [
    exporting, format, sampleRate, bitDepth, dither, normalize, normType,
    normTarget, truePeakLimiter, includeVideo, videoFile, videoCodec,
    videoBitrate, videoResolution, videoContainer, filename, folder,
    openAfterExport, close,
  ]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className={styles.dialog} role="dialog" aria-label="Export Audio Mixdown">

        {/* ── Header ── */}
        <div className={styles.header}>
          <span className={styles.title}>Export Audio Mixdown</span>
          <button className={styles.closeBtn} onClick={handleClose} title="Close">
            &times;
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* ──── Format Section ──── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Format</div>

            <div className={styles.fieldRow}>
              <span className={styles.label}>File Format</span>
              <div className={styles.fieldControl}>
                <select
                  className={styles.select}
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <span className={styles.label}>Sample Rate</span>
              <div className={styles.fieldControl}>
                <select
                  className={styles.select}
                  value={sampleRate}
                  onChange={(e) => setSampleRate(Number(e.target.value) as SampleRate)}
                >
                  {SAMPLE_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r >= 1000 ? `${(r / 1000).toFixed(r % 1000 === 0 ? 0 : 1)} kHz` : `${r} Hz`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <span className={styles.label}>Bit Depth</span>
              <div className={styles.fieldControl}>
                <select
                  className={styles.select}
                  value={bitDepth}
                  onChange={(e) => setBitDepth(Number(e.target.value) as BitDepth)}
                >
                  {BIT_DEPTHS.map((b) => (
                    <option key={b} value={b}>
                      {b === 32 ? '32 (float)' : String(b)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <span className={styles.label}>Dither</span>
              <div className={styles.fieldControl}>
                <select
                  className={styles.select}
                  value={dither}
                  onChange={(e) => setDither(e.target.value as DitherType)}
                  disabled={bitDepth !== 16}
                >
                  {DITHER_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ──── Range Section ──── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Range</div>

            <div className={styles.fieldRow}>
              <span className={styles.label}>Export Range</span>
              <div className={styles.fieldControl}>
                <div className={styles.radioGroup}>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      name="exportRange"
                      checked={rangeType === 'session'}
                      onChange={() => setRangeType('session')}
                    />
                    Entire Session
                  </label>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      name="exportRange"
                      checked={rangeType === 'locators'}
                      onChange={() => setRangeType('locators')}
                    />
                    Between Locators
                  </label>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      name="exportRange"
                      checked={rangeType === 'selection'}
                      onChange={() => setRangeType('selection')}
                    />
                    Selection
                  </label>
                </div>
              </div>
            </div>

            {rangeType !== 'session' && (
              <div className={styles.radioDetail}>
                {rangeType === 'locators'
                  ? 'Exports audio between the left and right locator positions.'
                  : 'Exports the currently selected time range.'}
              </div>
            )}
          </div>

          {/* ──── Normalization Section ──── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Normalization</div>

            <div className={styles.fieldRow}>
              <span className={styles.label} />
              <div className={styles.fieldControl}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                  />
                  Enable Normalization
                </label>
              </div>
            </div>

            {normalize && (
              <>
                <div className={styles.fieldRow}>
                  <span className={styles.label}>Type</span>
                  <div className={styles.fieldControl}>
                    <select
                      className={styles.select}
                      value={normType}
                      onChange={(e) => setNormType(e.target.value as NormType)}
                    >
                      <option value="peak">Peak</option>
                      <option value="lufs">LUFS</option>
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Target</span>
                  <div className={styles.fieldControl}>
                    <input
                      className={styles.numberInput}
                      type="number"
                      step={0.1}
                      value={normTarget}
                      onChange={(e) => setNormTarget(parseFloat(e.target.value) || 0)}
                    />
                    <span className={styles.unitSuffix}>
                      {normType === 'peak' ? 'dB' : 'LUFS'}
                    </span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label} />
                  <div className={styles.fieldControl}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={truePeakLimiter}
                        onChange={(e) => setTruePeakLimiter(e.target.checked)}
                      />
                      True Peak Limiter
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ──── Output Section ──── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Output</div>

            <div className={styles.fieldRow}>
              <span className={styles.label}>Filename</span>
              <div className={styles.fieldControl}>
                <input
                  className={styles.input}
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="mixdown"
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <span className={styles.label}>Folder</span>
              <div className={styles.fieldControl}>
                <input
                  className={styles.input}
                  type="text"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="/path/to/export/"
                  title={folder}
                />
                <button
                  className={styles.browseBtn}
                  onClick={handleBrowseFolder}
                  title="Browse for export folder"
                >
                  Browse...
                </button>
                <button
                  className={styles.browseBtn}
                  onClick={handleOpenFolder}
                  title="Open export folder in Finder"
                  style={{ padding: '5px 8px' }}
                >
                  Reveal
                </button>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <span className={styles.label} />
              <div className={styles.fieldControl}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={openAfterExport}
                    onChange={(e) => setOpenAfterExport(e.target.checked)}
                  />
                  Open folder after export
                </label>
              </div>
            </div>
          </div>

          {/* ──── Video Export Section ──── */}
          <div className={`${styles.section} ${styles.videoSection}`}>
            <div className={styles.sectionHeader}>Video</div>

            <div className={styles.fieldRow}>
              <span className={styles.label} />
              <div className={styles.fieldControl}>
                <label className={`${styles.checkbox} ${!videoFile ? styles.disabledLabel : ''}`}>
                  <input
                    type="checkbox"
                    checked={includeVideo}
                    onChange={(e) => setIncludeVideo(e.target.checked)}
                    disabled={!videoFile}
                  />
                  Include Video
                </label>
                {!videoFile && (
                  <span className={styles.videoHint}>No video loaded</span>
                )}
              </div>
            </div>

            {includeVideo && videoFile && (
              <>
                <div className={styles.fieldRow}>
                  <span className={styles.label}>Codec</span>
                  <div className={styles.fieldControl}>
                    <select
                      className={styles.select}
                      value={videoCodec}
                      onChange={(e) => setVideoCodec(e.target.value as VideoCodec)}
                    >
                      {VIDEO_CODECS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Bitrate</span>
                  <div className={styles.fieldControl}>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={500}
                      max={100000}
                      step={500}
                      value={videoBitrate}
                      onChange={(e) => setVideoBitrate(parseInt(e.target.value, 10) || 8000)}
                    />
                    <span className={styles.unitSuffix}>kbps</span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Resolution</span>
                  <div className={styles.fieldControl}>
                    <select
                      className={styles.select}
                      value={videoResolution}
                      onChange={(e) => setVideoResolution(e.target.value as VideoResolution)}
                    >
                      {VIDEO_RESOLUTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.label}>Container</span>
                  <div className={styles.fieldControl}>
                    <select
                      className={styles.select}
                      value={videoContainer}
                      onChange={(e) => setVideoContainer(e.target.value as VideoContainer)}
                    >
                      {VIDEO_CONTAINERS.map((ct) => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Progress bar (shown during export) ── */}
        {exporting && (
          <div className={styles.progressContainer}>
            <div className={styles.progressLabel}>
              Exporting... {progress}%
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && <div className={styles.error}>{error}</div>}

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose} disabled={exporting}>
            Cancel
          </button>
          <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};
