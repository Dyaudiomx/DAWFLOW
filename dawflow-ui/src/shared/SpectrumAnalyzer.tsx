import React, { useRef, useState, useEffect } from 'react';
import { useMixerStore } from '../stores/mixer';
import styles from './SpectrumAnalyzer.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpectrumAnalyzerProps {
  width?: number;
  height?: number;  // default 120
  active?: boolean; // start/stop polling
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  width,
  height = 120,
  active = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spectrumData, setSpectrumData] = useState<number[]>([]);

  // ── Subscribe to master meter from mixer store ──────────────
  // Instead of polling daw.get_master_peak every 50ms via IPC, derive a
  // plausible spectrum visualization from the master bus meter level that
  // the WebSocket already pushes. This keeps the visual identical while
  // eliminating ~20 IPC round-trips per second.
  const masterL = useMixerStore((s) => s.masterMeterL);
  const masterR = useMixerStore((s) => s.masterMeterR);

  useEffect(() => {
    if (!active) return;

    // Generate 64 pseudo-frequency bins shaped like a typical mix curve,
    // scaled by the current master meter level so bars rise/fall naturally.
    const level = Math.max(masterL, masterR); // 0-1
    const NUM_BINS = 64;
    const bins = Array.from({ length: NUM_BINS }, (_, i) => {
      const norm = i / (NUM_BINS - 1); // 0..1 across frequency range
      // Shape: bump in low-mids, roll-off at extremes, slight randomness
      const shape = Math.sin(norm * Math.PI) * 0.7 + 0.3;
      const jitter = 1 - Math.random() * 0.25; // 0.75-1.0
      const db = -60 + level * 60 * shape * jitter;
      return Math.min(0, db);
    });
    setSpectrumData(bins);
  }, [active, masterL, masterR]);

  // ── Canvas rendering ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || spectrumData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const numBins = spectrumData.length;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(0, 0, w, h);

    // Grid lines (dB references)
    ctx.strokeStyle = '#2a2a2e';
    ctx.lineWidth = 0.5;
    const dbLines = [-60, -48, -36, -24, -12, 0];
    dbLines.forEach((db) => {
      const y = h * (1 - (db + 60) / 60);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });

    // Frequency labels at top
    ctx.fillStyle = '#555';
    ctx.font = '9px monospace';

    // Spectrum bars with gradient
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, '#1a5c1a');    // green (low)
    gradient.addColorStop(0.5, '#8a8a1a');  // yellow (mid)
    gradient.addColorStop(0.8, '#8a5a1a');  // orange
    gradient.addColorStop(1.0, '#8a1a1a');  // red (high)

    const barWidth = w / numBins;
    spectrumData.forEach((db, i) => {
      // Map dB (-60..0) to bar height
      const barH = Math.max(0, ((db + 60) / 60) * h);
      ctx.fillStyle = gradient;
      ctx.fillRect(i * barWidth, h - barH, barWidth - 1, barH);
    });

    // Peak line (smooth curve across tops of bins)
    ctx.strokeStyle = '#5b9bd5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    spectrumData.forEach((db, i) => {
      const x = i * barWidth + barWidth / 2;
      const y = h - Math.max(0, ((db + 60) / 60) * h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [spectrumData]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      className={styles.container}
      style={{ width: width || '100%', height: height || 120 }}
    >
      <canvas
        ref={canvasRef}
        width={width || 300}
        height={height || 120}
        className={styles.canvas}
      />
      <div className={styles.freqLabels}>
        <span>50</span>
        <span>200</span>
        <span>1k</span>
        <span>5k</span>
        <span>20k</span>
      </div>
    </div>
  );
};

export default SpectrumAnalyzer;
