import React, { useMemo } from 'react';
import styles from './DawMeter.module.css';

export interface DawMeterProps {
  level: number;       // 0-1 normalized
  peak?: number;       // peak hold 0-1
  orientation?: 'vertical' | 'horizontal';
  width?: number;
  height?: number;
  showScale?: boolean;
}

/* dB thresholds mapped to normalized 0-1 range:
   -12 dB ~ 0.60, -3 dB ~ 0.85 */
const THRESHOLD_YELLOW = 0.60;
const THRESHOLD_RED = 0.85;

const SCALE_MARKS_V = [
  { label: '0', pos: '0%' },
  { label: '-6', pos: '20%' },
  { label: '-12', pos: '40%' },
  { label: '-24', pos: '60%' },
  { label: '-48', pos: '85%' },
];

const SCALE_MARKS_H = [
  { label: '-48', pos: '15%' },
  { label: '-24', pos: '40%' },
  { label: '-12', pos: '60%' },
  { label: '-6', pos: '80%' },
  { label: '0', pos: '100%' },
];

function buildGradient(orientation: 'vertical' | 'horizontal'): string {
  /* Green from bottom/left, yellow in the mid-range, red at top/right */
  const dir = orientation === 'vertical' ? 'to top' : 'to right';
  return `linear-gradient(
    ${dir},
    var(--meter-green) 0%,
    var(--meter-green) 55%,
    var(--meter-yellow) 55%,
    var(--meter-yellow) 80%,
    var(--meter-orange) 80%,
    var(--meter-orange) 92%,
    var(--meter-red) 92%,
    var(--meter-red) 100%
  )`;
}

export const DawMeter: React.FC<DawMeterProps> = ({
  level,
  peak,
  orientation = 'vertical',
  width,
  height,
  showScale = false,
}) => {
  const isVertical = orientation === 'vertical';

  const meterW = width ?? (isVertical ? 6 : 120);
  const meterH = height ?? (isVertical ? 140 : 6);

  const clampedLevel = Math.max(0, Math.min(1, level));
  const clampedPeak = peak != null ? Math.max(0, Math.min(1, peak)) : undefined;

  const gradient = useMemo(() => buildGradient(orientation), [orientation]);

  const fillStyle: React.CSSProperties = isVertical
    ? { height: `${clampedLevel * 100}%`, background: gradient }
    : { width: `${clampedLevel * 100}%`, background: gradient };

  const peakStyle: React.CSSProperties | undefined =
    clampedPeak != null && clampedPeak > 0.01
      ? isVertical
        ? { bottom: `${clampedPeak * 100}%` }
        : { left: `${clampedPeak * 100}%` }
      : undefined;

  const scaleMarks = isVertical ? SCALE_MARKS_V : SCALE_MARKS_H;

  return (
    <div
      className={`${styles.dawMeter} ${isVertical ? styles.vertical : styles.horizontal}`}
      style={{ width: meterW, height: meterH }}
    >
      <div
        className={styles.barContainer}
        style={{ width: meterW, height: meterH }}
      >
        <div className={styles.fill} style={fillStyle} />
        {peakStyle && <div className={styles.peakHold} style={peakStyle} />}
      </div>

      {showScale && (
        <div className={styles.scale}>
          {scaleMarks.map((m) => (
            <span
              key={m.label}
              className={styles.scaleMark}
              style={isVertical ? { top: m.pos } : { left: m.pos }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
