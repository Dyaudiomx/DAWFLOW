import React, { useRef, useCallback, useMemo } from 'react';
import styles from './Knob.module.css';

interface KnobProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  color?: string;
  label?: string;
  bipolar?: boolean;
}

const ARC_RANGE = 270;
const ARC_OFFSET = 135; // start angle from bottom-left

export const Knob: React.FC<KnobProps> = ({
  value,
  onChange,
  size = 28,
  color = '#4A90D9',
  label,
  bipolar = false,
}) => {
  const dragStartY = useRef<number | null>(null);
  const dragStartValue = useRef<number>(value);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onChange) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
    },
    [onChange, value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartY.current === null || !onChange) return;
      const dy = dragStartY.current - e.clientY;
      const sensitivity = 0.005;
      if (bipolar) {
        onChange(clamp(dragStartValue.current + dy * sensitivity * 2, -1, 1));
      } else {
        onChange(clamp(dragStartValue.current + dy * sensitivity, 0, 1));
      }
    },
    [onChange, bipolar],
  );

  const handlePointerUp = useCallback(() => {
    dragStartY.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (onChange) onChange(bipolar ? 0 : 0.5);
  }, [onChange, bipolar]);

  // Compute rotation angle for the indicator
  const normalized = bipolar ? (value + 1) / 2 : value;
  const rotation = ARC_OFFSET + normalized * ARC_RANGE; // 135 to 405 degrees

  // Value arc for the colored ring (using conic-gradient)
  const arcStyle = useMemo(() => {
    const startDeg = ARC_OFFSET;
    const valueDeg = startDeg + normalized * ARC_RANGE;

    if (bipolar) {
      const centerDeg = startDeg + 0.5 * ARC_RANGE; // 270 = top
      const min = Math.min(centerDeg, valueDeg);
      const max = Math.max(centerDeg, valueDeg);
      return {
        background: `conic-gradient(
          from ${startDeg}deg,
          transparent 0deg,
          transparent ${min - startDeg}deg,
          ${color} ${min - startDeg}deg,
          ${color} ${max - startDeg}deg,
          transparent ${max - startDeg}deg,
          transparent 360deg
        )`,
      };
    }

    return {
      background: `conic-gradient(
        from ${startDeg}deg,
        ${color} 0deg,
        ${color} ${valueDeg - startDeg}deg,
        transparent ${valueDeg - startDeg}deg,
        transparent ${ARC_RANGE}deg,
        transparent ${ARC_RANGE}deg,
        transparent 360deg
      )`,
    };
  }, [normalized, color, bipolar]);

  return (
    <div
      className={styles.knob}
      style={{ width: size, height: size + (label ? 14 : 0) }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <div className={styles.knobBody} style={{ width: size, height: size }}>
        {/* Outer shadow ring */}
        <div className={styles.outerRing} />

        {/* Value arc ring */}
        <div className={styles.valueRing} style={arcStyle} />

        {/* Track ring (background arc) */}
        <div className={styles.trackRing} />

        {/* Main knob body — 3D metallic appearance */}
        <div className={styles.body}>
          {/* Metallic sheen layer (conic gradient) */}
          <div className={styles.metallic} />
          {/* Top highlight (radial gradient) */}
          <div className={styles.highlight} />
          {/* Edge bevel */}
          <div className={styles.bevel} />
          {/* Inner groove ring for texture */}
          <div className={styles.groove} />
          {/* Indicator line */}
          <div
            className={styles.indicator}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className={styles.indicatorLine} />
          </div>
        </div>
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
};
