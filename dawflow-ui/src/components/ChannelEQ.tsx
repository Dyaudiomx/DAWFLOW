import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { engine } from '../engine/registry';
import styles from './ChannelEQ.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EQBand {
  enabled: boolean;
  freq: number;
  gain: number;
  q: number;
  type: 'lowshelf' | 'parametric' | 'highshelf';
}

export interface EQState {
  bands: EQBand[];
  masterGain: number;
  globalEnabled: boolean;
  selectedBand: number | null;
}

interface Props {
  trackId: string;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAMPLE_RATE = 48000;
const DB_RANGE = 24;
const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const LOG_MIN = Math.log10(FREQ_MIN);
const LOG_MAX = Math.log10(FREQ_MAX);

const BAND_LABELS = ['L', '1', '2', '3', '4', 'H'];
const BAND_LONG_LABELS = ['LO', '1 LMF', '2 MF', '3 HMF', '4 HI', 'HI'];

const BAND_COLORS = [
  '#D4913A', // L — shelf orange
  '#4A90D9', // 1 — blue
  '#5BC0DE', // 2 — cyan
  '#8BC34A', // 3 — green
  '#AB47BC', // 4 — purple
  '#D4913A', // H — shelf orange
];

const DEFAULT_BANDS: EQBand[] = [
  { enabled: true, freq: 160,  gain: 0, q: 1.0, type: 'lowshelf' },
  { enabled: true, freq: 300,  gain: 0, q: 1.0, type: 'parametric' },
  { enabled: true, freq: 1000, gain: 0, q: 1.0, type: 'parametric' },
  { enabled: true, freq: 3000, gain: 0, q: 1.0, type: 'parametric' },
  { enabled: true, freq: 8000, gain: 0, q: 1.0, type: 'parametric' },
  { enabled: true, freq: 8000, gain: 0, q: 1.0, type: 'highshelf' },
];

/** a-EQ parameter index map (24 control params) */
const PARAM_MAP = {
  freqL: 0, gainL: 1,
  freq1: 2, gain1: 3, bw1: 4,
  freq2: 5, gain2: 6, bw2: 7,
  freq3: 8, gain3: 9, bw3: 10,
  freq4: 11, gain4: 12, bw4: 13,
  freqH: 14, gainH: 15,
  masterGain: 16,
  enableL: 17, enable1: 18, enable2: 19, enable3: 20, enable4: 21, enableH: 22,
  globalEnable: 23,
} as const;

// Frequency labels for the grid
const FREQ_LABELS = [
  { freq: 20, label: '20' },
  { freq: 50, label: '50' },
  { freq: 100, label: '100' },
  { freq: 200, label: '200' },
  { freq: 500, label: '500' },
  { freq: 1000, label: '1k' },
  { freq: 2000, label: '2k' },
  { freq: 5000, label: '5k' },
  { freq: 10000, label: '10k' },
  { freq: 20000, label: '20k' },
];

const DB_LABELS = [-24, -18, -12, -6, 0, 6, 12, 18, 24];

// ---------------------------------------------------------------------------
// Biquad Filter Math (Audio EQ Cookbook)
// ---------------------------------------------------------------------------

interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a0: number; a1: number; a2: number;
}

function peakingEQ(freq: number, gain: number, Q: number, sr: number): BiquadCoeffs {
  const A = Math.pow(10, gain / 40);
  const w0 = 2 * Math.PI * freq / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  return {
    b0: 1 + alpha * A,
    b1: -2 * Math.cos(w0),
    b2: 1 - alpha * A,
    a0: 1 + alpha / A,
    a1: -2 * Math.cos(w0),
    a2: 1 - alpha / A,
  };
}

function lowShelf(freq: number, gain: number, sr: number): BiquadCoeffs {
  const A = Math.pow(10, gain / 40);
  const w0 = 2 * Math.PI * freq / sr;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / 2 * Math.sqrt((A + 1 / A) * (1 / 1 - 1) + 2);
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha;
  return {
    b0: A * ((A + 1) - (A - 1) * cosw0 + sqrtA2alpha),
    b1: 2 * A * ((A - 1) - (A + 1) * cosw0),
    b2: A * ((A + 1) - (A - 1) * cosw0 - sqrtA2alpha),
    a0: (A + 1) + (A - 1) * cosw0 + sqrtA2alpha,
    a1: -2 * ((A - 1) + (A + 1) * cosw0),
    a2: (A + 1) + (A - 1) * cosw0 - sqrtA2alpha,
  };
}

function highShelf(freq: number, gain: number, sr: number): BiquadCoeffs {
  const A = Math.pow(10, gain / 40);
  const w0 = 2 * Math.PI * freq / sr;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / 2 * Math.sqrt((A + 1 / A) * (1 / 1 - 1) + 2);
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha;
  return {
    b0: A * ((A + 1) + (A - 1) * cosw0 + sqrtA2alpha),
    b1: -2 * A * ((A - 1) + (A + 1) * cosw0),
    b2: A * ((A + 1) + (A - 1) * cosw0 - sqrtA2alpha),
    a0: (A + 1) - (A - 1) * cosw0 + sqrtA2alpha,
    a1: 2 * ((A - 1) - (A + 1) * cosw0),
    a2: (A + 1) - (A - 1) * cosw0 - sqrtA2alpha,
  };
}

function getBiquadCoeffs(band: EQBand, sr: number): BiquadCoeffs {
  switch (band.type) {
    case 'lowshelf':  return lowShelf(band.freq, band.gain, sr);
    case 'highshelf': return highShelf(band.freq, band.gain, sr);
    default:          return peakingEQ(band.freq, band.gain, band.q, sr);
  }
}

function evaluateResponse(c: BiquadCoeffs, freq: number, sr: number): number {
  const w = 2 * Math.PI * freq / sr;
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cos2w = Math.cos(2 * w);
  const sin2w = Math.sin(2 * w);
  const numRe = c.b0 / c.a0 + (c.b1 / c.a0) * cosw + (c.b2 / c.a0) * cos2w;
  const numIm = -(c.b1 / c.a0) * sinw - (c.b2 / c.a0) * sin2w;
  const denRe = 1 + (c.a1 / c.a0) * cosw + (c.a2 / c.a0) * cos2w;
  const denIm = -(c.a1 / c.a0) * sinw - (c.a2 / c.a0) * sin2w;
  const magNum = Math.sqrt(numRe * numRe + numIm * numIm);
  const magDen = Math.sqrt(denRe * denRe + denIm * denIm);
  if (magDen === 0) return 0;
  return 20 * Math.log10(magNum / magDen);
}

// ---------------------------------------------------------------------------
// SVG Coordinate Helpers
// ---------------------------------------------------------------------------

function freqToX(freq: number, width: number): number {
  const logF = Math.log10(Math.max(FREQ_MIN, Math.min(FREQ_MAX, freq)));
  return ((logF - LOG_MIN) / (LOG_MAX - LOG_MIN)) * width;
}

function xToFreq(x: number, width: number): number {
  const logF = LOG_MIN + (x / width) * (LOG_MAX - LOG_MIN);
  return Math.pow(10, logF);
}

function dbToY(db: number, height: number): number {
  const clamped = Math.max(-DB_RANGE, Math.min(DB_RANGE, db));
  return (height / 2) - (clamped / DB_RANGE) * (height / 2);
}

function yToDb(y: number, height: number): number {
  return -((y - height / 2) / (height / 2)) * DB_RANGE;
}

// ---------------------------------------------------------------------------
// Build SVG path from bands
// ---------------------------------------------------------------------------

function buildCurvePath(
  bands: EQBand[],
  masterGain: number,
  width: number,
  height: number,
  sr: number,
  steps = 200,
): { curvePath: string; fillAbovePath: string; fillBelowPath: string } {
  const midY = height / 2;
  const points: Array<{ x: number; y: number }> = [];

  // Pre-compute coefficients for enabled bands
  const activeCoeffs = bands
    .filter(b => b.enabled && b.gain !== 0)
    .map(b => getBiquadCoeffs(b, sr));

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const freq = xToFreq(x, width);
    let totalDb = masterGain;
    for (const c of activeCoeffs) {
      totalDb += evaluateResponse(c, freq, sr);
    }
    const y = dbToY(totalDb, height);
    points.push({ x, y });
  }

  if (points.length === 0) {
    return { curvePath: `M0 ${midY} L${width} ${midY}`, fillAbovePath: '', fillBelowPath: '' };
  }

  const curvePath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');

  // Fill above 0dB line (positive area) — clip to midY
  const fillAbovePath = curvePath + ` L${width} ${midY} L0 ${midY} Z`;
  // Fill below 0dB line (negative area) — clip from midY
  const fillBelowPath = curvePath + ` L${width} ${midY} L0 ${midY} Z`;

  return { curvePath, fillAbovePath, fillBelowPath };
}

/** Build a single band's curve for the dimmed per-band overlay */
function buildBandCurvePath(band: EQBand, width: number, height: number, sr: number, steps = 200): string {
  if (!band.enabled || band.gain === 0) return '';
  const coeffs = getBiquadCoeffs(band, sr);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const freq = xToFreq(x, width);
    const db = evaluateResponse(coeffs, freq, sr);
    const y = dbToY(db, height);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChannelEQ: React.FC<Props> = ({ trackId, compact = false }) => {
  const [state, setState] = useState<EQState>({
    bands: DEFAULT_BANDS.map(b => ({ ...b })),
    masterGain: 0,
    globalEnabled: true,
    selectedBand: null,
  });
  const [eqProcessorId, setEqProcessorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingBand = useRef<number | null>(null);

  // ── a-EQ auto-loading (Task 2) ──────────────────────────────

  useEffect(() => {
    if (!trackId) return;
    let cancelled = false;

    async function ensureEQ() {
      setLoading(true);
      try {
        // Step 1: Check existing plugins
        const data = await engine.plugin.getTrackPlugins(trackId);
        const plugins = data?.plugins ?? [];
        let eqPlugin = plugins.find(p =>
          p.name.toLowerCase() === 'a-eq' ||
          p.name.toLowerCase().includes('a-eq')
        );

        // Step 2: If not found, load a-EQ
        if (!eqPlugin) {
          await engine.plugin.load(trackId, 'a-EQ');
          // Wait for plugin to initialize
          await new Promise(r => setTimeout(r, 400));
          const data2 = await engine.plugin.getTrackPlugins(trackId);
          eqPlugin = (data2?.plugins ?? []).find(p =>
            p.name.toLowerCase() === 'a-eq' ||
            p.name.toLowerCase().includes('a-eq')
          );
        }

        if (cancelled) return;

        if (!eqPlugin) {
          setLoading(false);
          return;
        }

        const procId = eqPlugin.processor_id;
        setEqProcessorId(procId);

        // Step 3: Fetch parameters and populate state
        const paramData = await engine.plugin.getParameters(trackId, procId);
        const params = (paramData as any)?.parameters ?? paramData ?? [];

        if (cancelled) return;
        if (Array.isArray(params) && params.length >= 24) {
          const val = (idx: number) => params[idx]?.value ?? params[idx]?.current ?? 0;

          setState({
            bands: [
              { enabled: val(PARAM_MAP.enableL) >= 0.5,  freq: val(PARAM_MAP.freqL), gain: val(PARAM_MAP.gainL), q: 1.0,              type: 'lowshelf' },
              { enabled: val(PARAM_MAP.enable1) >= 0.5,  freq: val(PARAM_MAP.freq1), gain: val(PARAM_MAP.gain1), q: val(PARAM_MAP.bw1), type: 'parametric' },
              { enabled: val(PARAM_MAP.enable2) >= 0.5,  freq: val(PARAM_MAP.freq2), gain: val(PARAM_MAP.gain2), q: val(PARAM_MAP.bw2), type: 'parametric' },
              { enabled: val(PARAM_MAP.enable3) >= 0.5,  freq: val(PARAM_MAP.freq3), gain: val(PARAM_MAP.gain3), q: val(PARAM_MAP.bw3), type: 'parametric' },
              { enabled: val(PARAM_MAP.enable4) >= 0.5,  freq: val(PARAM_MAP.freq4), gain: val(PARAM_MAP.gain4), q: val(PARAM_MAP.bw4), type: 'parametric' },
              { enabled: val(PARAM_MAP.enableH) >= 0.5,  freq: val(PARAM_MAP.freqH), gain: val(PARAM_MAP.gainH), q: 1.0,              type: 'highshelf' },
            ],
            masterGain: val(PARAM_MAP.masterGain),
            globalEnabled: val(PARAM_MAP.globalEnable) >= 0.5,
            selectedBand: null,
          });
        }
      } catch (e) {
        console.warn('[ChannelEQ] Failed to load a-EQ:', e);
      }
      if (!cancelled) setLoading(false);
    }

    ensureEQ();
    return () => { cancelled = true; };
  }, [trackId]);

  // ── Send parameter to engine (throttled) ────────────────────

  const sendParam = useCallback((paramIndex: number, value: number) => {
    if (!eqProcessorId || !trackId) return;
    engine.plugin.setParameter(trackId, eqProcessorId, paramIndex, value).catch(() => {});
  }, [trackId, eqProcessorId]);

  // ── Band change handlers ────────────────────────────────────

  const updateBand = useCallback((bandIndex: number, updates: Partial<EQBand>) => {
    setState(prev => {
      const newBands = prev.bands.map((b, i) =>
        i === bandIndex ? { ...b, ...updates } : b
      );
      return { ...prev, bands: newBands };
    });

    // Sync to engine
    if (updates.freq !== undefined) {
      const freqParams = [PARAM_MAP.freqL, PARAM_MAP.freq1, PARAM_MAP.freq2, PARAM_MAP.freq3, PARAM_MAP.freq4, PARAM_MAP.freqH];
      sendParam(freqParams[bandIndex], updates.freq);
    }
    if (updates.gain !== undefined) {
      const gainParams = [PARAM_MAP.gainL, PARAM_MAP.gain1, PARAM_MAP.gain2, PARAM_MAP.gain3, PARAM_MAP.gain4, PARAM_MAP.gainH];
      sendParam(gainParams[bandIndex], updates.gain);
    }
    if (updates.q !== undefined && bandIndex >= 1 && bandIndex <= 4) {
      const bwParams = [0, PARAM_MAP.bw1, PARAM_MAP.bw2, PARAM_MAP.bw3, PARAM_MAP.bw4, 0];
      sendParam(bwParams[bandIndex], updates.q);
    }
    if (updates.enabled !== undefined) {
      const enableParams = [PARAM_MAP.enableL, PARAM_MAP.enable1, PARAM_MAP.enable2, PARAM_MAP.enable3, PARAM_MAP.enable4, PARAM_MAP.enableH];
      sendParam(enableParams[bandIndex], updates.enabled ? 1.0 : 0.0);
    }
  }, [sendParam]);

  const setSelectedBand = useCallback((idx: number | null) => {
    setState(prev => ({ ...prev, selectedBand: idx }));
  }, []);

  const setMasterGain = useCallback((gain: number) => {
    setState(prev => ({ ...prev, masterGain: gain }));
    sendParam(PARAM_MAP.masterGain, gain);
  }, [sendParam]);

  const toggleGlobalEnable = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.globalEnabled;
      sendParam(PARAM_MAP.globalEnable, newEnabled ? 1.0 : 0.0);
      return { ...prev, globalEnabled: newEnabled };
    });
  }, [sendParam]);

  // ── SVG dimensions (responsive) ──────────────────────────────

  const [svgSize, setSvgSize] = useState({ width: 600, height: 300 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSvgSize({ width, height });
        }
      }
    });
    observer.observe(svg.parentElement!);
    return () => observer.disconnect();
  }, []);

  const { width: W, height: H } = svgSize;

  // ── Compute curves ──────────────────────────────────────────

  const { curvePath, fillAbovePath } = useMemo(
    () => buildCurvePath(state.bands, state.masterGain, W, H, SAMPLE_RATE),
    [state.bands, state.masterGain, W, H],
  );

  const bandCurves = useMemo(
    () => state.bands.map(b => buildBandCurvePath(b, W, H, SAMPLE_RATE)),
    [state.bands, W, H],
  );

  // ── Drag handling ───────────────────────────────────────────

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, bandIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!state.bands[bandIndex].enabled) return;
    draggingBand.current = bandIndex;
    setSelectedBand(bandIndex);
  }, [state.bands, setSelectedBand]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const idx = draggingBand.current;
      if (idx === null) return;
      const svg = svgRef.current;
      if (!svg) return;

      // Use SVG's screen CTM for accurate viewBox coordinate mapping
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = new DOMPoint(e.clientX, e.clientY);
      const svgPt = pt.matrixTransform(ctm.inverse());

      const freq = Math.max(FREQ_MIN, Math.min(FREQ_MAX, xToFreq(svgPt.x, W)));
      const gain = Math.max(-DB_RANGE, Math.min(DB_RANGE, yToDb(svgPt.y, H)));

      updateBand(idx, { freq: Math.round(freq), gain: Math.round(gain * 10) / 10 });
    };

    const handleMouseUp = () => {
      draggingBand.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [W, H, updateBand]);

  // ── Mouse wheel for Q ───────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent, bandIndex: number) => {
    e.preventDefault();
    const band = state.bands[bandIndex];
    if (!band.enabled || band.type !== 'parametric') return;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newQ = Math.max(0.1, Math.min(6.0, band.q + delta));
    updateBand(bandIndex, { q: Math.round(newQ * 10) / 10 });
  }, [state.bands, updateBand]);

  // ── Editable field handlers ─────────────────────────────────

  const handleFieldChange = useCallback((bandIndex: number, field: 'freq' | 'gain' | 'q', rawValue: string) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;
    if (field === 'freq') {
      updateBand(bandIndex, { freq: Math.max(FREQ_MIN, Math.min(FREQ_MAX, Math.round(num))) });
    } else if (field === 'gain') {
      updateBand(bandIndex, { gain: Math.max(-20, Math.min(20, Math.round(num * 10) / 10)) });
    } else if (field === 'q') {
      updateBand(bandIndex, { q: Math.max(0.1, Math.min(6.0, Math.round(num * 10) / 10)) });
    }
  }, [updateBand]);

  // Field drag (vertical drag to adjust)
  const fieldDragRef = useRef<{ bandIndex: number; field: 'freq' | 'gain' | 'q'; startY: number; startVal: number } | null>(null);

  const handleFieldMouseDown = useCallback((e: React.MouseEvent, bandIndex: number, field: 'freq' | 'gain' | 'q') => {
    // Don't start drag if the input is focused (user is typing)
    if (document.activeElement === e.target) return;
    const band = state.bands[bandIndex];
    const startVal = field === 'freq' ? band.freq : field === 'gain' ? band.gain : band.q;
    fieldDragRef.current = { bandIndex, field, startY: e.clientY, startVal };

    const handleMove = (me: MouseEvent) => {
      const ref = fieldDragRef.current;
      if (!ref) return;
      const dy = ref.startY - me.clientY;
      let sensitivity = 1;
      if (ref.field === 'freq') sensitivity = ref.startVal * 0.005;
      else if (ref.field === 'gain') sensitivity = 0.1;
      else sensitivity = 0.02;
      const newVal = ref.startVal + dy * sensitivity;
      handleFieldChange(ref.bandIndex, ref.field, String(newVal));
    };

    const handleUp = () => {
      fieldDragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [state.bands, handleFieldChange]);

  // ── Render ──────────────────────────────────────────────────

  if (loading) {
    return <div className={styles.eqContainer} style={{ justifyContent: 'center', alignItems: 'center', color: '#555', fontSize: 11 }}>Loading EQ...</div>;
  }

  const midY = H / 2;

  return (
    <div className={styles.eqContainer}>
      {/* SVG Curve Display */}
      <div className={styles.curveWrap} onClick={() => setSelectedBand(null)}>
        <svg ref={svgRef} className={styles.curveSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {/* Grid: frequency lines */}
          {FREQ_LABELS.map(({ freq }) => {
            const x = freqToX(freq, W);
            return <line key={`f${freq}`} className={styles.gridLine} x1={x} y1={0} x2={x} y2={H} />;
          })}

          {/* Grid: dB lines */}
          {DB_LABELS.map(db => {
            const y = dbToY(db, H);
            return (
              <line
                key={`db${db}`}
                className={db === 0 ? styles.gridLineZero : styles.gridLine}
                x1={0} y1={y} x2={W} y2={y}
              />
            );
          })}

          {/* Frequency labels */}
          {FREQ_LABELS.map(({ freq, label }) => (
            <text key={`fl${freq}`} className={styles.freqLabel} x={freqToX(freq, W)} y={H - 4}>{label}</text>
          ))}

          {/* dB labels */}
          {DB_LABELS.filter(db => db % 6 === 0).map(db => (
            <text key={`dl${db}`} className={styles.dbLabel} x={24} y={dbToY(db, H) + 3}>
              {db > 0 ? `+${db}` : db === 0 ? '0' : String(db)}
            </text>
          ))}

          {/* Fill area */}
          <clipPath id="aboveMid">
            <rect x={0} y={0} width={W} height={midY} />
          </clipPath>
          <clipPath id="belowMid">
            <rect x={0} y={midY} width={W} height={H - midY} />
          </clipPath>

          <path className={`${styles.curveFill} ${styles.curveFillPositive}`} d={fillAbovePath} clipPath="url(#aboveMid)" />
          <path className={`${styles.curveFill} ${styles.curveFillNegative}`} d={fillAbovePath} clipPath="url(#belowMid)" />

          {/* Individual band curves (dimmed) */}
          {state.bands.map((band, i) => (
            bandCurves[i] && (
              <path
                key={`bc${i}`}
                className={styles.bandCurve}
                d={bandCurves[i]}
                stroke={BAND_COLORS[i]}
                opacity={state.selectedBand === i ? 0.5 : 0.2}
              />
            )
          ))}

          {/* Main composite curve */}
          <path className={styles.curvePath} d={curvePath} />

          {/* Draggable nodes */}
          {state.bands.map((band, i) => {
            const nx = freqToX(band.freq, W);
            const bandCoeffs = band.enabled && band.gain !== 0 ? getBiquadCoeffs(band, SAMPLE_RATE) : null;
            const bandDb = bandCoeffs ? evaluateResponse(bandCoeffs, band.freq, SAMPLE_RATE) + state.masterGain : state.masterGain;
            const ny = dbToY(band.enabled ? bandDb : 0, H);
            const isSelected = state.selectedBand === i;

            return (
              <g key={`node${i}`}>
                <circle
                  className={`${styles.node} ${!band.enabled ? styles.nodeDisabled : ''} ${isSelected ? styles.nodeSelected : ''}`}
                  cx={nx}
                  cy={ny}
                  r={isSelected ? 10 : 7}
                  fill={band.enabled ? BAND_COLORS[i] : '#444'}
                  stroke={isSelected ? '#fff' : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  onMouseDown={(e) => handleNodeMouseDown(e, i)}
                  onWheel={(e) => handleWheel(e, i)}
                  onClick={(e) => { e.stopPropagation(); setSelectedBand(i); }}
                />
                <text className={styles.nodeLabel} x={nx} y={ny} pointerEvents="none">
                  {BAND_LABELS[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Band Controls Strip — hidden in compact mode */}
      {!compact && (
        <div className={styles.bandStrip}>
          {state.bands.map((band, i) => {
            const isShelf = band.type === 'lowshelf' || band.type === 'highshelf';
            const isSelected = state.selectedBand === i;
            const displayLabel = i === 0 ? 'LO' : i === 5 ? 'HI' : BAND_LONG_LABELS[i];

            return (
              <div
                key={i}
                className={`${styles.band} ${isSelected ? styles.bandSelected : ''}`}
                onClick={() => setSelectedBand(i)}
              >
                {/* Header: enable + label */}
                <div className={styles.bandHeader}>
                  <button
                    className={`${styles.bandEnable} ${band.enabled ? (isShelf ? styles.bandEnableShelfActive : styles.bandEnableActive) : ''}`}
                    onClick={(e) => { e.stopPropagation(); updateBand(i, { enabled: !band.enabled }); }}
                  >
                    {band.enabled ? '\u2713' : ''}
                  </button>
                  <span className={`${styles.bandLabel} ${band.enabled ? (isShelf ? styles.bandLabelShelf : styles.bandLabelActive) : ''}`}>
                    {displayLabel}
                  </span>
                </div>

                {/* Gain */}
                <div className={styles.fieldRow}>
                  <input
                    className={styles.valueField}
                    type="text"
                    value={`${band.gain >= 0 ? '+' : ''}${band.gain.toFixed(1)}`}
                    onChange={(e) => handleFieldChange(i, 'gain', e.target.value)}
                    onMouseDown={(e) => handleFieldMouseDown(e, i, 'gain')}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                    title="Gain (dB)"
                  />
                </div>

                {/* Frequency */}
                <div className={styles.fieldRow}>
                  <input
                    className={styles.valueField}
                    type="text"
                    value={band.freq >= 1000 ? `${(band.freq / 1000).toFixed(1)}k` : `${Math.round(band.freq)}`}
                    onChange={(e) => {
                      let raw = e.target.value.replace(/k$/i, '');
                      let num = parseFloat(raw);
                      if (e.target.value.toLowerCase().endsWith('k')) num *= 1000;
                      handleFieldChange(i, 'freq', String(num));
                    }}
                    onMouseDown={(e) => handleFieldMouseDown(e, i, 'freq')}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                    title="Frequency (Hz)"
                  />
                </div>

                {/* Q (only for parametric bands) */}
                {!isShelf && (
                  <div className={styles.fieldRow}>
                    <input
                      className={styles.valueField}
                      type="text"
                      value={band.q.toFixed(1)}
                      onChange={(e) => handleFieldChange(i, 'q', e.target.value)}
                      onMouseDown={(e) => handleFieldMouseDown(e, i, 'q')}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                      title="Q / Bandwidth"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Master gain + global bypass — hidden in compact mode */}
      {!compact && (
        <div className={styles.masterRow}>
          <span className={styles.masterLabel}>Master</span>
          <input
            className={styles.valueField}
            type="text"
            value={`${state.masterGain >= 0 ? '+' : ''}${state.masterGain.toFixed(1)}`}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) setMasterGain(Math.max(-20, Math.min(20, num)));
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
            title="Master Gain (dB)"
            style={{ width: 48 }}
          />
          <span className={styles.fieldLabel}>dB</span>
          <button
            className={`${styles.globalBypass} ${state.globalEnabled ? styles.globalBypassActive : ''}`}
            onClick={toggleGlobalEnable}
            title={state.globalEnabled ? 'Bypass EQ' : 'Enable EQ'}
          >
            {state.globalEnabled ? 'ON' : '--'}
          </button>
        </div>
      )}
    </div>
  );
};
