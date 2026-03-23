import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ipc } from '../services/ipc';
import { useSessionStore, resetFetchDebounce } from '../stores/session';
import styles from './FadeEditorDialog.module.css';

interface Props {
  trackId: string;
  regionId: string;
  regionName: string;
  side: 'in' | 'out';
  currentLengthSamples: number;
  currentShape?: string;
  sampleRate: number;
  onApply: (side: 'in' | 'out', lengthSamples: number, shape: string) => void;
  onClose: () => void;
}

type Peak = { min: number; max: number };

const FADE_SHAPES = [
  { id: 'linear', label: 'Linear' },
  { id: 'fast', label: 'Fast' },
  { id: 'slow', label: 'Slow' },
  { id: 'constant_power', label: 'Equal Power' },
  { id: 'symmetric', label: 'S-Curve' },
  { id: 'custom', label: 'Freeform' },
] as const;

/** Small 24x16 SVG icon depicting each fade curve shape */
function ShapeSvgIcon({ shapeId }: { shapeId: string }) {
  const w = 24;
  const h = 16;
  const pad = 1;
  const steps = 20;

  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let g: number;
    switch (shapeId) {
      case 'fast': g = 1 - Math.pow(1 - t, 3); break;
      case 'slow': g = Math.pow(t, 3); break;
      case 'constant_power': g = Math.sqrt(t); break;
      case 'symmetric': g = t * t * (3 - 2 * t); break;
      default: g = t; // linear + custom fallback
    }
    const x = pad + t * (w - 2 * pad);
    const y = (h - pad) - g * (h - 2 * pad);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points={points.join(' ')} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function getGainForShape(shape: string, t: number, customPoints?: { x: number; y: number }[]): number {
  if (shape === 'custom' && customPoints && customPoints.length >= 2) {
    // Interpolate between custom control points
    for (let i = 0; i < customPoints.length - 1; i++) {
      const a = customPoints[i];
      const b = customPoints[i + 1];
      if (t >= a.x && t <= b.x) {
        const seg = (t - a.x) / (b.x - a.x);
        return a.y + seg * (b.y - a.y);
      }
    }
    return customPoints[customPoints.length - 1].y;
  }
  switch (shape) {
    case 'fast': return 1 - Math.pow(1 - t, 3);
    case 'slow': return Math.pow(t, 3);
    case 'constant_power': return Math.sqrt(t);
    case 'symmetric': return t * t * (3 - 2 * t);
    default: return t; // linear
  }
}

function drawPreview(
  canvas: HTMLCanvasElement,
  shape: string,
  side: 'in' | 'out',
  peaks: Peak[],
  customPoints?: { x: number; y: number }[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#12161a';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, (h / 4) * i); ctx.lineTo(w, (h / 4) * i); ctx.stroke();
  }

  // Waveform (dimmed, showing the audio that's affected)
  if (peaks.length > 0) {
    const mid = h / 2;
    const step = w / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const x = i * step;
      const t = i / peaks.length;
      let gain = getGainForShape(shape, t, customPoints);
      if (side === 'out') gain = 1 - getGainForShape(shape, t, customPoints);

      // Dim waveform (original)
      const top0 = mid - (p.max * mid * 0.9);
      const bot0 = mid - (p.min * mid * 0.9);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#8899aa';
      ctx.fillRect(x, top0, Math.max(step, 1), bot0 - top0);

      // Affected waveform (with fade applied)
      const top1 = mid - (p.max * mid * 0.9 * gain);
      const bot1 = mid - (p.min * mid * 0.9 * gain);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#8cbbd8';
      ctx.fillRect(x, top1, Math.max(step, 1), bot1 - top1);
    }
  }

  // Fade curve line
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    let gain = getGainForShape(shape, t, customPoints);
    if (side === 'out') gain = 1 - getGainForShape(shape, t, customPoints);
    const x = t * w;
    const y = (1 - gain) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Custom points markers
  if (shape === 'custom' && customPoints) {
    ctx.fillStyle = '#4fc3f7';
    for (const pt of customPoints) {
      let gy = pt.y;
      if (side === 'out') gy = 1 - pt.y;
      ctx.beginPath();
      ctx.arc(pt.x * w, (1 - gy) * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export const FadeEditorDialog: React.FC<Props> = ({
  trackId, regionId, regionName, side, currentLengthSamples, currentShape, sampleRate, onApply, onClose,
}) => {
  const [shape, setShape] = useState(currentShape || 'linear');
  const [lengthMs, setLengthMs] = useState(
    currentLengthSamples > 0 ? Math.round((currentLengthSamples / sampleRate) * 1000) : 500
  );
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [customPoints, setCustomPoints] = useState<{ x: number; y: number }[]>([
    { x: 0, y: 0 }, { x: 1, y: 1 },
  ]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch waveform peaks for the affected portion
  useEffect(() => {
    const lengthSamples = Math.round((lengthMs / 1000) * sampleRate);
    if (lengthSamples <= 0) return;
    ipc.call<Peak[]>('daw.get_audio_peaks', {
      track_id: trackId,
      region_id: regionId,
      n_peaks: 320,
      channel: 0,
    }).then((p) => {
      if (Array.isArray(p) && p.length > 0) {
        // Slice to show only the fade-affected portion
        const ratio = Math.min(1, lengthSamples / (p.length * (sampleRate / 320) * (1000 / sampleRate)));
        const count = Math.max(10, Math.round(p.length * Math.min(1, lengthMs / ((p.length / 320) * 1000))));
        if (side === 'in') {
          setPeaks(p.slice(0, Math.min(count, p.length)));
        } else {
          setPeaks(p.slice(Math.max(0, p.length - count)));
        }
      }
    }).catch(() => {});
  }, [trackId, regionId, lengthMs, sampleRate, side]);

  // Draw preview
  useEffect(() => {
    if (canvasRef.current) {
      drawPreview(canvasRef.current, shape, side, peaks, shape === 'custom' ? customPoints : undefined);
    }
  }, [shape, side, peaks, customPoints]);

  // Freeform drawing on canvas
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (shape !== 'custom') return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    const adjustedY = side === 'out' ? 1 - y : y;
    setCustomPoints([{ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, adjustedY)) }]);
  }, [shape, side]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || shape !== 'custom') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    const adjustedY = side === 'out' ? 1 - y : y;
    setCustomPoints((prev) => {
      const pt = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, adjustedY)) };
      // Add point only if x is greater than last point (monotonic)
      if (prev.length === 0 || pt.x > prev[prev.length - 1].x) {
        return [...prev, pt];
      }
      return prev;
    });
  }, [isDrawing, shape, side]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Ensure start and end points
    setCustomPoints((prev) => {
      const pts = [...prev];
      if (pts.length > 0 && pts[0].x > 0) pts.unshift({ x: 0, y: 0 });
      if (pts.length > 0 && pts[pts.length - 1].x < 1) pts.push({ x: 1, y: 1 });
      return pts;
    });
  }, [isDrawing]);

  const handleApply = useCallback(async () => {
    const lengthSamples = Math.round((lengthMs / 1000) * sampleRate);
    const applyShape = shape === 'custom' ? 'linear' : shape;
    // Use audio_region API which supports shape param; fall back to editor API
    const method = side === 'in' ? 'daw.audio_region.set_fade_in' : 'daw.audio_region.set_fade_out';
    const fallbackMethod = side === 'in' ? 'daw.editor.set_region_fade_in' : 'daw.editor.set_region_fade_out';
    try {
      await ipc.call(method, { region_id: regionId, length: lengthSamples, shape: applyShape })
        .catch(() => ipc.call(fallbackMethod, { region_id: regionId, length_samples: lengthSamples, shape: applyShape }));
      onApply(side, lengthSamples, applyShape);
      resetFetchDebounce();
      await useSessionStore.getState().fetchFromEngine();
    } catch (err) {
      console.warn('[DAWFLOW] Fade apply failed:', err);
    }
    onClose();
  }, [regionId, shape, lengthMs, sampleRate, side, onApply, onClose]);

  const title = `Fade ${side === 'in' ? 'In' : 'Out'}: ${regionName}`;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleBar}>
          <span>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.body}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Fade {side === 'in' ? 'In' : 'Out'}</span>
          </div>

          {/* Waveform + curve preview canvas */}
          <canvas
            ref={canvasRef}
            width={320}
            height={180}
            className={`${styles.curveCanvas} ${shape === 'custom' ? styles.curveCanvasDrawable : ''}`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          {shape === 'custom' && (
            <div className={styles.drawHint}>Click and drag to draw a custom fade curve</div>
          )}

          {/* Shape presets */}
          <div className={styles.shapePicker}>
            {FADE_SHAPES.map((s) => (
              <button key={s.id}
                className={`${styles.shapeBtn} ${shape === s.id ? styles.shapeBtnActive : ''}`}
                onClick={() => {
                  setShape(s.id);
                  if (s.id === 'custom') {
                    setCustomPoints([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
                  }
                }}
                title={s.label}
              >
                <ShapeSvgIcon shapeId={s.id} />
                <span className={styles.shapeLabel}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Length control */}
          <div className={styles.lengthRow}>
            <label className={styles.lengthLabel}>Length</label>
            <input type="range" min={10} max={10000} value={lengthMs}
              onChange={(e) => setLengthMs(Number(e.target.value))}
              className={styles.lengthSlider} />
            <input type="number" value={lengthMs}
              onChange={(e) => setLengthMs(Math.max(10, Math.min(30000, Number(e.target.value))))}
              className={styles.lengthInput} />
            <span className={styles.lengthUnit}>ms</span>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={onClose}>Cancel</button>
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
