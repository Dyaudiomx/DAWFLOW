/**
 * AudioEditor — Cubase 15 Pro Sample Editor (Lower Zone)
 *
 * Detailed waveform viewer/editor for audio regions:
 *  - Toolbar: Select, Range, Zoom tools + Normalize, Reverse, Fade In/Out
 *  - Ruler: time markers (seconds), click to seek
 *  - Waveform: HTML Canvas, symmetric min/max peaks, fade overlays
 *  - Info bar: region name, start, length, gain (editable), peak level
 *
 * Communication: IPC commands for region editing; peaks fetched on mount.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './AudioEditor.module.css';
import { ipc } from '../services/ipc';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 64;
const DEFAULT_ZOOM = 1; // pixels per sample at zoom=1 is computed from canvas width

type AudioTool = 'select' | 'range' | 'zoom';

interface RegionInfo {
  name: string;
  start: number;       // samples
  length: number;      // samples
  gain: number;        // linear (1.0 = 0 dB)
  fadeInLength: number; // samples
  fadeOutLength: number; // samples
}

interface AudioEditorProps {
  regionId: string;
  trackId: string;
  trackColor: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert linear gain to dB. */
function linearToDb(gain: number): number {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}

/** Convert dB to linear gain. */
function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/** Format sample count as time string (M:SS.mmm). */
function samplesToTime(samples: number, sampleRate: number): string {
  if (sampleRate <= 0) return '0:00.000';
  const totalSeconds = samples / sampleRate;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds - mins * 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
}

/** Format dB value for display. */
function formatDb(db: number): string {
  if (!isFinite(db)) return '-inf';
  return db.toFixed(1);
}

/** Parse a hex color to {r, g, b} (0-255). */
function parseColor(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16) || 0,
    g: parseInt(c.substring(2, 4), 16) || 0,
    b: parseInt(c.substring(4, 6), 16) || 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AudioEditor: React.FC<AudioEditorProps> = ({ regionId, trackId, trackColor }) => {
  // ---- State ----
  const [peaks, setPeaks] = useState<number[]>([]);
  const [regionInfo, setRegionInfo] = useState<RegionInfo>({
    name: '',
    start: 0,
    length: 0,
    gain: 1.0,
    fadeInLength: 0,
    fadeOutLength: 0,
  });
  const [sampleRate, setSampleRate] = useState(48000);
  const [tool, setTool] = useState<AudioTool>('select');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [scrollX, setScrollX] = useState(0);
  const [gainInputValue, setGainInputValue] = useState('0.0');
  const [peakDb, setPeakDb] = useState<number>(-Infinity);
  const [fadeInActive, setFadeInActive] = useState(false);
  const [fadeOutActive, setFadeOutActive] = useState(false);
  const [snapMode, setSnapMode] = useState<'samples' | 'seconds' | 'bars'>('seconds');

  // ---- Analysis state ----
  interface AnalysisResult {
    peakDbFS: string;
    rmsDb: string;
    lufs: string;
    key: string;
    bpm: string;
  }
  const [analysisCache, setAnalysisCache] = useState<Record<string, AnalysisResult>>({});
  const [analyzing, setAnalyzing] = useState(false);

  const currentAnalysis = analysisCache[regionId] ?? null;

  const handleAnalyze = useCallback(async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const [loudness, keyResult] = await Promise.all([
        ipc.call('daw.analyze_region_loudness', { region_id: regionId }) as Promise<{
          peak_dBFS?: number;
          rms_dB?: number;
          integrated_lufs?: number;
        }>,
        ipc.call('daw.detect_region_key', { region_id: regionId }) as Promise<{
          key?: string;
          scale?: string;
          confidence?: number;
        }>,
      ]);

      const result: AnalysisResult = {
        peakDbFS: loudness.peak_dBFS != null ? loudness.peak_dBFS.toFixed(1) : '\u2014',
        rmsDb: loudness.rms_dB != null ? loudness.rms_dB.toFixed(1) : '\u2014',
        lufs: loudness.integrated_lufs != null ? loudness.integrated_lufs.toFixed(1) : '\u2014',
        key: keyResult.key ? `${keyResult.key}${keyResult.scale === 'minor' ? 'm' : ''}` : '\u2014',
        bpm: '\u2014', // BPM detection not yet wired
      };
      setAnalysisCache(prev => ({ ...prev, [regionId]: result }));
    } catch {
      // If IPC fails, populate with dashes
      setAnalysisCache(prev => ({
        ...prev,
        [regionId]: { peakDbFS: '\u2014', rmsDb: '\u2014', lufs: '\u2014', key: '\u2014', bpm: '\u2014' },
      }));
    } finally {
      setAnalyzing(false);
    }
  }, [regionId, analyzing]);

  // Refs
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const rulerCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // ---- Derived ----

  // ---- Fetch peaks + region info on mount / region change ----
  useEffect(() => {
    // Get session sample rate
    ipc.getSessionInfo().then((info) => {
      if (info.sample_rate) setSampleRate(info.sample_rate);
    }).catch(() => {});

    // Get audio peaks
    const fetchWidth = Math.min(4000, Math.max(800, window.innerWidth));
    ipc.getAudioPeaks(regionId, fetchWidth).then((data) => {
      const p = data?.peaks || [];
      setPeaks(p);

      // Compute peak dB from the peaks data
      if (p.length > 0) {
        const maxAbs = Math.max(...p.map(Math.abs));
        setPeakDb(linearToDb(maxAbs));
      }
    }).catch(() => {
      setPeaks([]);
    });

    // Get region details
    ipc.getRegionDetails(trackId, regionId).then((data: any) => {
      const info: RegionInfo = {
        name: data.name || '',
        start: data.position_samples ?? data.position ?? data.start ?? 0,
        length: data.length_samples ?? data.length ?? 0,
        gain: data.gain ?? 1.0,
        fadeInLength: data.fade_in_length ?? 0,
        fadeOutLength: data.fade_out_length ?? 0,
      };
      setRegionInfo(info);
      setGainInputValue(formatDb(linearToDb(info.gain)));
      setFadeInActive((data.fade_in_length ?? 0) > 0);
      setFadeOutActive((data.fade_out_length ?? 0) > 0);
    }).catch(() => {});
  }, [regionId, trackId]);

  // ---- Draw waveform ----
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;

    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, w, h);

    const centerY = h / 2;

    // Draw zero crossing line
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // Draw faint horizontal guide lines at 50%
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY - h * 0.25);
    ctx.lineTo(w, centerY - h * 0.25);
    ctx.moveTo(0, centerY + h * 0.25);
    ctx.lineTo(w, centerY + h * 0.25);
    ctx.stroke();

    if (peaks.length === 0) return;

    // Compute visible range with zoom + scroll
    const startIdx = Math.max(0, Math.floor(scrollX / zoom));
    const endIdx = Math.min(peaks.length, Math.ceil((scrollX + w) / zoom));
    const visibleCount = endIdx - startIdx;

    if (visibleCount <= 0) return;

    const color = parseColor(trackColor);

    // Draw waveform fill (symmetric around center)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`;
    ctx.beginPath();

    // Top half (positive)
    for (let i = 0; i < visibleCount; i++) {
      const peakIdx = startIdx + i;
      const x = (peakIdx * zoom) - scrollX;
      const val = Math.abs(peaks[peakIdx] || 0);
      const amplitude = val * (h * 0.45); // leave small margin
      if (i === 0) {
        ctx.moveTo(x, centerY - amplitude);
      } else {
        ctx.lineTo(x, centerY - amplitude);
      }
    }

    // Bottom half (mirror, going back)
    for (let i = visibleCount - 1; i >= 0; i--) {
      const peakIdx = startIdx + i;
      const x = (peakIdx * zoom) - scrollX;
      const val = Math.abs(peaks[peakIdx] || 0);
      const amplitude = val * (h * 0.45);
      ctx.lineTo(x, centerY + amplitude);
    }

    ctx.closePath();
    ctx.fill();

    // Draw waveform outline (top edge only for clarity)
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < visibleCount; i++) {
      const peakIdx = startIdx + i;
      const x = (peakIdx * zoom) - scrollX;
      const val = Math.abs(peaks[peakIdx] || 0);
      const amplitude = val * (h * 0.45);
      if (i === 0) {
        ctx.moveTo(x, centerY - amplitude);
      } else {
        ctx.lineTo(x, centerY - amplitude);
      }
    }
    ctx.stroke();

    // Mirror outline (bottom)
    ctx.beginPath();
    for (let i = 0; i < visibleCount; i++) {
      const peakIdx = startIdx + i;
      const x = (peakIdx * zoom) - scrollX;
      const val = Math.abs(peaks[peakIdx] || 0);
      const amplitude = val * (h * 0.45);
      if (i === 0) {
        ctx.moveTo(x, centerY + amplitude);
      } else {
        ctx.lineTo(x, centerY + amplitude);
      }
    }
    ctx.stroke();

    // ---- Fade overlays ----
    const fadeInPixels = regionInfo.fadeInLength > 0 && regionInfo.length > 0
      ? (regionInfo.fadeInLength / regionInfo.length) * peaks.length * zoom
      : 0;
    const fadeOutPixels = regionInfo.fadeOutLength > 0 && regionInfo.length > 0
      ? (regionInfo.fadeOutLength / regionInfo.length) * peaks.length * zoom
      : 0;

    // Fade-in: gradient from opaque black to transparent (left side)
    if (fadeInPixels > 0) {
      const fadeStart = -scrollX;
      const fadeEnd = fadeInPixels - scrollX;
      if (fadeEnd > 0 && fadeStart < w) {
        const grad = ctx.createLinearGradient(
          Math.max(0, fadeStart), 0,
          Math.min(w, fadeEnd), 0
        );
        grad.addColorStop(0, 'rgba(30, 30, 30, 0.7)');
        grad.addColorStop(1, 'rgba(30, 30, 30, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(Math.max(0, fadeStart), 0, Math.min(w, fadeEnd) - Math.max(0, fadeStart), h);

        // Fade-in line
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, fadeStart), h);
        ctx.lineTo(Math.min(w, fadeEnd), 0);
        ctx.stroke();
      }
    }

    // Fade-out: gradient from transparent to opaque black (right side)
    if (fadeOutPixels > 0) {
      const totalWidth = peaks.length * zoom;
      const fadeStart = totalWidth - fadeOutPixels - scrollX;
      const fadeEnd = totalWidth - scrollX;
      if (fadeEnd > 0 && fadeStart < w) {
        const grad = ctx.createLinearGradient(
          Math.max(0, fadeStart), 0,
          Math.min(w, fadeEnd), 0
        );
        grad.addColorStop(0, 'rgba(30, 30, 30, 0)');
        grad.addColorStop(1, 'rgba(30, 30, 30, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(Math.max(0, fadeStart), 0, Math.min(w, fadeEnd) - Math.max(0, fadeStart), h);

        // Fade-out line
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, fadeStart), 0);
        ctx.lineTo(Math.min(w, fadeEnd), h);
        ctx.stroke();
      }
    }
  }, [peaks, zoom, scrollX, trackColor, regionInfo]);

  // ---- Draw ruler ----
  const drawRuler = useCallback(() => {
    const canvas = rulerCanvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#252525';
    ctx.fillRect(0, 0, w, h);

    if (peaks.length === 0 || regionInfo.length <= 0) return;

    // Compute time intervals
    const samplesPerPixel = regionInfo.length / (peaks.length * zoom);
    const secondsPerPixel = samplesPerPixel / sampleRate;
    const viewStartSeconds = (scrollX * samplesPerPixel) / sampleRate;
    const viewEndSeconds = viewStartSeconds + (w * secondsPerPixel);

    // Choose interval: aim for ~80px between major ticks
    const targetInterval = secondsPerPixel * 80;
    const intervals = [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600];
    let interval = intervals[intervals.length - 1];
    for (const iv of intervals) {
      if (iv >= targetInterval) {
        interval = iv;
        break;
      }
    }

    const startTick = Math.floor(viewStartSeconds / interval) * interval;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '9px system-ui, -apple-system, sans-serif';

    for (let t = startTick; t <= viewEndSeconds + interval; t += interval) {
      const x = ((t * sampleRate) / samplesPerPixel - scrollX);
      if (x < -20 || x > w + 20) continue;

      // Major tick line
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 14);
      ctx.lineTo(Math.round(x) + 0.5, h);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#888';
      const label = t >= 60
        ? `${Math.floor(t / 60)}:${(t % 60).toFixed(interval < 1 ? 2 : 0).padStart(interval < 1 ? 5 : 2, '0')}`
        : t < 1
          ? `${(t * 1000).toFixed(0)}ms`
          : `${t.toFixed(interval < 1 ? 2 : 0)}s`;
      ctx.fillText(label, Math.round(x) + 3, 8);

      // Minor ticks (4 subdivisions)
      const subInterval = interval / 4;
      ctx.strokeStyle = '#333';
      for (let s = 1; s < 4; s++) {
        const sx = x + (s * subInterval * sampleRate) / samplesPerPixel;
        if (sx < 0 || sx > w) continue;
        ctx.beginPath();
        ctx.moveTo(Math.round(sx) + 0.5, 17);
        ctx.lineTo(Math.round(sx) + 0.5, h);
        ctx.stroke();
      }
    }
  }, [peaks, zoom, scrollX, regionInfo, sampleRate]);

  // ---- Redraw on state change ----
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      drawWaveform();
      drawRuler();
    });
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawWaveform, drawRuler]);

  // ---- Resize observer ----
  useEffect(() => {
    const container = waveformContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        drawWaveform();
        drawRuler();
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawWaveform, drawRuler]);

  // ---- Scroll / Zoom via wheel ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const factor = e.deltaY > 0 ? 0.85 : 1.18;
      setZoom(prev => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor));
        // Adjust scrollX to keep the mouse position stable
        const container = waveformContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const ratio = next / prev;
          setScrollX(prevScroll => Math.max(0, (prevScroll + mouseX) * ratio - mouseX));
        }
        return next;
      });
    } else if (e.shiftKey) {
      // Horizontal scroll
      setScrollX(prev => Math.max(0, prev + e.deltaY));
    } else {
      // Default: horizontal scroll
      setScrollX(prev => Math.max(0, prev + e.deltaX + e.deltaY));
    }
  }, []);

  // ---- Zoom buttons ----
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev * 1.3));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev * 0.77));
  }, []);

  // ---- Ruler click to seek ----
  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    const canvas = rulerCanvasRef.current;
    if (!canvas || peaks.length === 0 || regionInfo.length <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const samplesPerPixel = regionInfo.length / (peaks.length * zoom);
    const samplePos = Math.round(x * samplesPerPixel) + regionInfo.start;

    ipc.setPlayheadPosition(Math.max(0, samplePos)).catch(() => {});
  }, [peaks, zoom, scrollX, regionInfo, sampleRate]);

  // ---- Toolbar actions ----
  const handleNormalize = useCallback(() => {
    ipc.call('daw.editor.normalize_region', { region_id: regionId }).catch(() => {
      // Fallback to the typed wrapper
      ipc.normalizeRegion(trackId, regionId).catch(() => {});
    });
  }, [regionId, trackId]);

  const handleReverse = useCallback(() => {
    ipc.reverseRegion(regionId).catch(() => {});
  }, [regionId]);

  const handleFadeIn = useCallback(() => {
    const next = !fadeInActive;
    setFadeInActive(next);
    if (next) {
      // Default fade-in: 10% of region length
      const fadeLen = Math.round(regionInfo.length * 0.1);
      ipc.setRegionFadeIn(trackId, regionId, fadeLen).catch(() => {});
      setRegionInfo(prev => ({ ...prev, fadeInLength: fadeLen }));
    } else {
      ipc.setRegionFadeIn(trackId, regionId, 0).catch(() => {});
      setRegionInfo(prev => ({ ...prev, fadeInLength: 0 }));
    }
  }, [fadeInActive, regionId, trackId, regionInfo.length]);

  const handleFadeOut = useCallback(() => {
    const next = !fadeOutActive;
    setFadeOutActive(next);
    if (next) {
      const fadeLen = Math.round(regionInfo.length * 0.1);
      ipc.setRegionFadeOut(trackId, regionId, fadeLen).catch(() => {});
      setRegionInfo(prev => ({ ...prev, fadeOutLength: fadeLen }));
    } else {
      ipc.setRegionFadeOut(trackId, regionId, 0).catch(() => {});
      setRegionInfo(prev => ({ ...prev, fadeOutLength: 0 }));
    }
  }, [fadeOutActive, regionId, trackId, regionInfo.length]);

  // ---- Gain editing ----
  const handleGainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGainInputValue(e.target.value);
  }, []);

  const handleGainCommit = useCallback(() => {
    const db = parseFloat(gainInputValue);
    if (isNaN(db)) {
      // Reset to current
      setGainInputValue(formatDb(linearToDb(regionInfo.gain)));
      return;
    }
    const linear = dbToLinear(db);
    setRegionInfo(prev => ({ ...prev, gain: linear }));
    ipc.call('daw.editor.adjust_region_gain', { region_id: regionId, gain_db: db }).catch(() => {});
  }, [gainInputValue, regionId, regionInfo.gain]);

  const handleGainKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGainCommit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setGainInputValue(formatDb(linearToDb(regionInfo.gain)));
      (e.target as HTMLInputElement).blur();
    }
  }, [handleGainCommit, regionInfo.gain]);

  // ---- Render ----
  return (
    <div className={styles.container}>
      {/* ---- Toolbar ---- */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <button
            className={`${styles.toolBtn} ${tool === 'select' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('select')}
            title="Select"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 1L2 10L5 7L8 10L8.5 9.5L5.5 6.5L10 6L2 1Z" fill="currentColor" />
            </svg>
          </button>
          <button
            className={`${styles.toolBtn} ${tool === 'range' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('range')}
            title="Range"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3" y="2" width="6" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
            </svg>
          </button>
          <button
            className={`${styles.toolBtn} ${tool === 'zoom' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('zoom')}
            title="Zoom"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <line x1="8" y1="8" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className={styles.separator} />

        <span className={styles.toolLabel}>Snap</span>
        <select
          className={styles.selectDropdown}
          value={snapMode}
          onChange={(e) => setSnapMode(e.target.value as 'samples' | 'seconds' | 'bars')}
        >
          <option value="samples">Samples</option>
          <option value="seconds">Seconds</option>
          <option value="bars">Bars</option>
        </select>

        <div className={styles.separator} />

        <div className={styles.actionGroup}>
          <button className={styles.toolBtn} onClick={handleNormalize} title="Normalize region">
            Normalize
          </button>
          <button className={styles.toolBtn} onClick={handleReverse} title="Reverse region">
            Reverse
          </button>
          <button
            className={`${styles.toolBtn} ${fadeInActive ? styles.toolBtnActive : ''}`}
            onClick={handleFadeIn}
            title="Toggle fade in"
          >
            Fade In
          </button>
          <button
            className={`${styles.toolBtn} ${fadeOutActive ? styles.toolBtnActive : ''}`}
            onClick={handleFadeOut}
            title="Toggle fade out"
          >
            Fade Out
          </button>
        </div>

        <div className={styles.zoomGroup}>
          <button className={styles.zoomBtn} onClick={zoomOut} title="Zoom out">-</button>
          <button className={styles.zoomBtn} onClick={zoomIn} title="Zoom in">+</button>
        </div>
      </div>

      {/* ---- Analysis Bar ---- */}
      <div className={styles.analysisBar}>
        <button
          className={styles.analyzeBtn}
          onClick={handleAnalyze}
          disabled={analyzing}
          title="Analyze selected region"
        >
          {analyzing ? 'Analyzing\u2026' : 'Analyze'}
        </button>
        <div className={styles.analysisSeparator} />
        <span className={styles.analysisStat}>
          <span className={styles.analysisLabel}>Peak:</span>{' '}
          {currentAnalysis?.peakDbFS ?? '\u2014'}{currentAnalysis?.peakDbFS && currentAnalysis.peakDbFS !== '\u2014' ? ' dBFS' : ''}
        </span>
        <span className={styles.analysisDivider}>|</span>
        <span className={styles.analysisStat}>
          <span className={styles.analysisLabel}>RMS:</span>{' '}
          {currentAnalysis?.rmsDb ?? '\u2014'}{currentAnalysis?.rmsDb && currentAnalysis.rmsDb !== '\u2014' ? ' dB' : ''}
        </span>
        <span className={styles.analysisDivider}>|</span>
        <span className={styles.analysisStat}>
          <span className={styles.analysisLabel}>LUFS:</span>{' '}
          {currentAnalysis?.lufs ?? '\u2014'}
        </span>
        <span className={styles.analysisDivider}>|</span>
        <span className={styles.analysisStat}>
          <span className={styles.analysisLabel}>Key:</span>{' '}
          {currentAnalysis?.key ?? '\u2014'}
        </span>
        <span className={styles.analysisDivider}>|</span>
        <span className={styles.analysisStat}>
          <span className={styles.analysisLabel}>BPM:</span>{' '}
          {currentAnalysis?.bpm ?? '\u2014'}
        </span>
      </div>

      {/* ---- Ruler ---- */}
      <div className={styles.ruler} onClick={handleRulerClick}>
        <canvas ref={rulerCanvasRef} className={styles.rulerCanvas} />
      </div>

      {/* ---- Waveform Display ---- */}
      <div
        ref={waveformContainerRef}
        className={styles.waveformArea}
        onWheel={handleWheel}
      >
        <canvas ref={waveformCanvasRef} className={styles.waveformCanvas} />
        {peaks.length === 0 && (
          <div className={styles.emptyState}>
            No waveform data available
          </div>
        )}
      </div>

      {/* ---- Info Bar ---- */}
      <div className={styles.infoBar}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Region:</span>
          <span className={styles.infoValue}>{regionInfo.name || 'Untitled'}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Start:</span>
          <span className={styles.infoValue}>
            {samplesToTime(regionInfo.start, sampleRate)}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Length:</span>
          <span className={styles.infoValue}>
            {samplesToTime(regionInfo.length, sampleRate)}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Gain:</span>
          <input
            className={styles.infoInput}
            value={gainInputValue}
            onChange={handleGainChange}
            onBlur={handleGainCommit}
            onKeyDown={handleGainKeyDown}
            title="Region gain (dB)"
          />
          <span className={styles.infoValue}>dB</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Peak:</span>
          <span className={styles.infoValue}>{formatDb(peakDb)} dB</span>
        </div>
      </div>
    </div>
  );
};

export default AudioEditor;
