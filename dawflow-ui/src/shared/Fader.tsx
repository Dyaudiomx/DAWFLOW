import React, { useRef, useCallback, useMemo } from 'react';
import styles from './Fader.module.css';

interface FaderProps {
  value: number; // 0-1 normalized
  onChange?: (value: number) => void;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  color?: string; // Track color — cap is tinted to match
  showScale?: boolean;
  disabled?: boolean;
}

/* Left scale (Cubase MixConsole left side): 6, 0, 5, 10, 15, 20, 30, 40, 50, ∞ */
const LEFT_MARKS = [
  { label: '6', position: 0.875 },
  { label: '0', position: 0.75 },
  { label: '5', position: 0.65 },
  { label: '10', position: 0.53 },
  { label: '15', position: 0.42 },
  { label: '20', position: 0.33 },
  { label: '30', position: 0.22 },
  { label: '40', position: 0.14 },
  { label: '50', position: 0.07 },
  { label: '∞', position: 0.01 },
];

/* Right scale (Cubase MixConsole right side): 0, 6, 12, 18, 24, 30, 40, 50, 60 */
const RIGHT_MARKS = [
  { label: '0', position: 0.75 },
  { label: '6', position: 0.625 },
  { label: '12', position: 0.5 },
  { label: '18', position: 0.4 },
  { label: '24', position: 0.3 },
  { label: '30', position: 0.22 },
  { label: '40', position: 0.14 },
  { label: '50', position: 0.07 },
  { label: '60', position: 0.02 },
];

const DEFAULT_VALUE = 0.75; // 0 dB

function valueToDB(v: number): string {
  if (v <= 0) return '-inf';
  const db = 20 * Math.log10(v / 0.75);
  if (db > 0) return `+${db.toFixed(1)}`;
  return db.toFixed(1);
}

/* --------------------------------------------------------------------------
   Color utilities — derive the Cubase "washed-out" cap tint from track color
   -------------------------------------------------------------------------- */

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function getCapColors(trackColor?: string): {
  light: string;
  dark: string;
  border: string;
  highlight: string;
} {
  if (!trackColor) {
    return {
      light: '#C8B888',
      dark: '#A89868',
      border: '#9A8A5A',
      highlight: 'rgba(255, 255, 255, 0.15)',
    };
  }

  const { h, s } = hexToHSL(trackColor);
  // Cubase washed-out look: lighten significantly, reduce saturation
  const capS = Math.max(s * 0.45, 12);
  const lightL = 68;
  const darkL = 55;
  const borderL = 45;

  return {
    light: hslToString(h, capS, lightL),
    dark: hslToString(h, capS, darkL),
    border: hslToString(h, capS, borderL),
    highlight: `hsla(${Math.round(h)}, ${Math.round(capS)}%, 88%, 0.25)`,
  };
}

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export const Fader: React.FC<FaderProps> = ({
  value,
  onChange,
  height,
  orientation = 'vertical',
  color,
  showScale = false,
  disabled = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const computeValue = useCallback(
    (clientX: number, clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (orientation === 'vertical') {
        const y = clientY - rect.top;
        return clamp(1 - y / rect.height);
      } else {
        const x = clientX - rect.left;
        return clamp(x / rect.width);
      }
    },
    [orientation],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !onChange) return;
      e.preventDefault();
      // Cmd+click (Mac) / Ctrl+click (Win) = reset to default
      if (e.metaKey || e.ctrlKey) { onChange(DEFAULT_VALUE); return; }
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const v = computeValue(e.clientX, e.clientY);
      if (v !== undefined) onChange(v);
    },
    [disabled, onChange, computeValue],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !onChange) return;
      const v = computeValue(e.clientX, e.clientY);
      if (v !== undefined) onChange(v);
    },
    [onChange, computeValue],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!disabled && onChange) {
      onChange(DEFAULT_VALUE);
    }
  }, [disabled, onChange]);

  const isVertical = orientation === 'vertical';
  const capPosition = isVertical ? (1 - value) * 100 : value * 100;

  /* Compute cap colors from track color */
  const capColors = useMemo(() => getCapColors(color), [color]);

  const capGradient = useMemo(() => {
    const { light, dark } = capColors;
    if (isVertical) {
      // Tall cap (48px) — 7 grip lines evenly spaced
      return `linear-gradient(
        to bottom,
        ${light} 0%, ${light} 10%,
        ${dark} 10%, ${dark} 13%,
        ${light} 13%, ${light} 22%,
        ${dark} 22%, ${dark} 25%,
        ${light} 25%, ${light} 34%,
        ${dark} 34%, ${dark} 37%,
        ${light} 37%, ${light} 46%,
        ${dark} 46%, ${dark} 49%,
        ${light} 49%, ${light} 58%,
        ${dark} 58%, ${dark} 61%,
        ${light} 61%, ${light} 70%,
        ${dark} 70%, ${dark} 73%,
        ${light} 73%, ${light} 82%,
        ${dark} 82%, ${dark} 85%,
        ${light} 85%, ${light} 100%
      )`;
    }
    // Horizontal: grip lines run vertically
    return `linear-gradient(
      to right,
      ${light} 0%, ${light} 18%,
      ${dark} 18%, ${dark} 22%,
      ${light} 22%, ${light} 38%,
      ${dark} 38%, ${dark} 42%,
      ${light} 42%, ${light} 58%,
      ${dark} 58%, ${dark} 62%,
      ${light} 62%, ${light} 78%,
      ${dark} 78%, ${dark} 82%,
      ${light} 82%, ${light} 100%
    )`;
  }, [capColors, isVertical]);

  const fillColor = color || '#4A90D9';

  /* ---- Horizontal fader (inspector sends, etc.) ---- */
  if (!isVertical) {
    return (
      <div
        className={`${styles.fader} ${styles.horizontal} ${disabled ? styles.disabled : ''}`}
        style={{ width: height || '100%' }}
      >
        <div
          className={styles.hTrack}
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          <div className={styles.hGroove} />
          <div
            className={styles.hFill}
            style={{ width: `${value * 100}%`, backgroundColor: fillColor }}
          />
          <div
            className={styles.hThumb}
            style={{ left: `${capPosition}%` }}
          />
        </div>
      </div>
    );
  }

  /* ---- Vertical fader (MixConsole channels) ---- */
  return (
    <div
      className={`${styles.fader} ${styles.vertical} ${disabled ? styles.disabled : ''}`}
      style={height ? { height } : undefined}
    >
      <div className={styles.faderBody}>
        {/* Track / groove / cap assembly */}
        <div
          className={styles.track}
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          {/* Dark groove center channel */}
          <div className={styles.trackGroove}>
            {/* Fill from bottom up to cap position */}
            <div
              className={styles.fill}
              style={{
                height: `${value * 100}%`,
                backgroundColor: fillColor,
              }}
            />
          </div>

          {/* Fader cap — colored to match track */}
          <div
            className={styles.cap}
            style={{
              top: `${capPosition}%`,
              background: capGradient,
              borderColor: capColors.border,
              boxShadow: `
                0 2px 4px rgba(0, 0, 0, 0.55),
                inset 0 1px 0 ${capColors.highlight}
              `,
            }}
          />
        </div>

        {/* Left scale (tick marks + dB labels on the LEFT) */}
        {showScale && (
          <div className={styles.scaleLeft}>
            {LEFT_MARKS.map((mark) => (
              <div
                key={mark.label}
                className={styles.scaleMarkLeft}
                style={{ bottom: `${mark.position * 100}%` }}
              >
                <span className={styles.scaleLabelLeft}>{mark.label}</span>
                <span className={styles.scaleTick} />
              </div>
            ))}
          </div>
        )}

        {/* Right scale (tick marks + dB labels on the RIGHT) */}
        {showScale && (
          <div className={styles.scaleRight}>
            {RIGHT_MARKS.map((mark) => (
              <div
                key={mark.label}
                className={styles.scaleMarkRight}
                style={{ bottom: `${mark.position * 100}%` }}
              >
                <span className={styles.scaleTick} />
                <span className={styles.scaleLabelRight}>{mark.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* dB readout below fader */}
      <div className={styles.readout}>{valueToDB(value)} dB</div>
    </div>
  );
};
