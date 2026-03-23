import { useEffect, useRef, useState } from 'react';
import { ipc } from '../services/ipc';
import styles from './PhaseCorrelationMeter.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhaseCorrelationMeterProps {
  /** Track ID to poll phase correlation for. Omit for master bus. */
  trackId?: string;
  /** Override width in px (default 200). */
  width?: number;
  /** Override height in px (default 20). */
  height?: number;
}

interface PhaseCorrelationResult {
  correlation: number; // -1.0 .. +1.0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PhaseCorrelationMeter: React.FC<PhaseCorrelationMeterProps> = ({
  trackId,
  width = 200,
  height = 20,
}) => {
  const [correlation, setCorrelation] = useState(1); // default fully in phase
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Poll engine for phase correlation ────────────────────
  useEffect(() => {
    const poll = () => {
      const params: Record<string, unknown> = {};
      if (trackId) params.track_id = trackId;

      ipc
        .call<PhaseCorrelationResult>('daw.get_phase_correlation', params)
        .then((res) => {
          if (res && typeof res.correlation === 'number') {
            setCorrelation(Math.max(-1, Math.min(1, res.correlation)));
          }
        })
        .catch(() => {
          // Engine may not support this yet — keep last value
        });
    };

    poll(); // immediate first poll
    intervalRef.current = setInterval(poll, 100);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trackId]);

  // ── Derived positions ────────────────────────────────────
  // Map correlation (-1..+1) to a 0..1 fraction
  const frac = (correlation + 1) / 2;

  // The track has 20px padding on each side (CSS inset: 4px 20px).
  // Needle position in pixels within the container:
  const padH = 20;
  const trackW = width - padH * 2;
  const needlePx = padH + frac * trackW;

  // Clip the active fill to show only up to the needle position.
  const fillClip = `inset(0 ${100 - frac * 100}% 0 0)`;

  return (
    <div
      className={styles.container}
      style={{ width, height }}
      title={`Phase: ${correlation >= 0 ? '+' : ''}${correlation.toFixed(2)}`}
    >
      {/* Dim background gradient (full range) */}
      <div className={styles.track} />

      {/* Center tick at 0 */}
      <div className={styles.centerTick} />

      {/* Active fill up to current value */}
      <div className={styles.fill} style={{ clipPath: fillClip }} />

      {/* Needle */}
      <div
        className={styles.needle}
        style={{ left: needlePx }}
      />

      {/* Labels */}
      <div className={styles.labels}>
        <span className={styles.label}>-1</span>
        <span className={styles.labelCenter}>0</span>
        <span className={styles.label}>+1</span>
      </div>
    </div>
  );
};

export default PhaseCorrelationMeter;
