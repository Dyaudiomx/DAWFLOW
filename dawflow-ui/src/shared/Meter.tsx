import React, { useCallback } from 'react';
import styles from './Meter.module.css';

interface MeterProps {
  level?: number; // 0-1
  peakLevel?: number; // 0-1
  clipping?: boolean;
  width?: number;
  height?: number;
  stereo?: boolean;
  leftLevel?: number;
  rightLevel?: number;
  leftPeak?: number;
  rightPeak?: number;
  onClipReset?: () => void;
}

export function levelToGradientStop(level: number): string {
  if (level <= 0) return 'transparent';
  if (level <= 0.7) return 'var(--meter-green)';
  if (level <= 0.85) return 'var(--meter-yellow)';
  if (level <= 0.95) return 'var(--meter-orange)';
  return 'var(--meter-red)';
}

const MeterBar: React.FC<{
  level: number;
  peak: number;
  clipping: boolean;
  barWidth: number;
  barHeight: number;
  onClipReset?: () => void;
}> = ({ level, peak, clipping, barWidth, barHeight, onClipReset }) => {
  const fillHeight = Math.max(0, Math.min(1, level)) * barHeight;
  const peakY = Math.max(0, Math.min(1, peak)) * barHeight;

  const handleClipClick = useCallback(() => {
    if (onClipReset) onClipReset();
  }, [onClipReset]);

  return (
    <div className={styles.bar} style={{ width: barWidth, height: barHeight }}>
      {/* Clip indicator */}
      <div
        className={`${styles.clip} ${clipping ? styles.clipActive : ''}`}
        onClick={handleClipClick}
      />
      {/* Meter fill — uses a stacked gradient background clipped by height */}
      <div
        className={styles.fill}
        style={{
          height: fillHeight,
          background: `linear-gradient(
            to top,
            var(--meter-green) 0%,
            var(--meter-green) 70%,
            var(--meter-yellow) 70%,
            var(--meter-yellow) 85%,
            var(--meter-orange) 85%,
            var(--meter-orange) 95%,
            var(--meter-red) 95%,
            var(--meter-red) 100%
          )`,
        }}
      />
      {/* Peak hold line */}
      {peak > 0.01 && (
        <div
          className={styles.peakHold}
          style={{ bottom: `${peakY}px` }}
        />
      )}
    </div>
  );
};

export const Meter: React.FC<MeterProps> = ({
  level = 0,
  peakLevel = 0,
  clipping = false,
  width,
  height = 140,
  stereo = false,
  leftLevel,
  rightLevel,
  leftPeak,
  rightPeak,
  onClipReset,
}) => {
  const meterWidth = width || 6;

  if (stereo) {
    const lLevel = leftLevel ?? level;
    const rLevel = rightLevel ?? level;
    const lPeak = leftPeak ?? peakLevel;
    const rPeak = rightPeak ?? peakLevel;

    return (
      <div className={styles.meter} style={{ height }}>
        <MeterBar
          level={lLevel}
          peak={lPeak}
          clipping={clipping}
          barWidth={meterWidth}
          barHeight={height - 6}
          onClipReset={onClipReset}
        />
        <MeterBar
          level={rLevel}
          peak={rPeak}
          clipping={clipping}
          barWidth={meterWidth}
          barHeight={height - 6}
          onClipReset={onClipReset}
        />
      </div>
    );
  }

  return (
    <div className={styles.meter} style={{ height }}>
      <MeterBar
        level={level}
        peak={peakLevel}
        clipping={clipping}
        barWidth={meterWidth}
        barHeight={height - 6}
        onClipReset={onClipReset}
      />
    </div>
  );
};
