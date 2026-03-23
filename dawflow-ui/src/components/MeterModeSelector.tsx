import { useState, useRef, useCallback, useEffect } from 'react';
import type React from 'react';
import styles from './MeterModeSelector.module.css';

/* --------------------------------------------------------------------------
   Meter Mode Selector
   Compact dropdown button for choosing the meter display mode on a mixer strip.
   Modes: Peak, RMS, LUFS (with optional K-weighting variants).
   -------------------------------------------------------------------------- */

/** All supported meter modes. */
export type MeterMode = 'peak' | 'rms' | 'lufs' | 'k12' | 'k14' | 'k20';

export interface MeterModeSelectorProps {
  mode: string;
  onChange: (mode: string) => void;
}

/* ---- Static data ---- */

interface ModeEntry {
  value: MeterMode;
  label: string;
  abbr: string;
  group: 'peak' | 'rms' | 'lufs';
}

const MODES: ModeEntry[] = [
  { value: 'peak', label: 'Peak',    abbr: 'PK',  group: 'peak' },
  { value: 'rms',  label: 'RMS',     abbr: 'RMS', group: 'rms'  },
  { value: 'lufs', label: 'LUFS',    abbr: 'LU',  group: 'lufs' },
  { value: 'k12',  label: 'K-12',    abbr: 'K12', group: 'lufs' },
  { value: 'k14',  label: 'K-14',    abbr: 'K14', group: 'lufs' },
  { value: 'k20',  label: 'K-20',    abbr: 'K20', group: 'lufs' },
];

const MODE_MAP = new Map<string, ModeEntry>(MODES.map((m) => [m.value, m]));

/** Returns the CSS gradient string for a given meter mode. */
export function meterGradientForMode(mode: string): string {
  switch (mode) {
    case 'rms':
      return `linear-gradient(
        to top,
        #2a4a7a 0%,
        #3a6ab0 50%,
        #5b8fd4 80%,
        #7aacf0 100%
      )`;
    case 'lufs':
    case 'k12':
    case 'k14':
    case 'k20':
      return `linear-gradient(
        to top,
        #1a6060 0%,
        #2a8a8a 50%,
        #4dcfcf 80%,
        #70e8e8 100%
      )`;
    case 'peak':
    default:
      return `linear-gradient(
        to top,
        var(--meter-green) 0%,
        var(--meter-green) 70%,
        var(--meter-yellow) 70%,
        var(--meter-yellow) 85%,
        var(--meter-orange) 85%,
        var(--meter-orange) 95%,
        var(--meter-red) 95%,
        var(--meter-red) 100%
      )`;
  }
}

/** Resolves the color-group key for a given mode string. */
function groupOf(mode: string): 'peak' | 'rms' | 'lufs' {
  return MODE_MAP.get(mode)?.group ?? 'peak';
}

/* ---- Component ---- */

export const MeterModeSelector: React.FC<MeterModeSelectorProps> = ({
  mode,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = MODE_MAP.get(mode);
  const abbr = current?.abbr ?? 'PK';
  const group = groupOf(mode);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      onChange(value);
      setOpen(false);
    },
    [onChange],
  );

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* Swatch CSS class per group */
  const swatchClass = (g: 'peak' | 'rms' | 'lufs') =>
    g === 'peak'
      ? styles.swatchPeak
      : g === 'rms'
        ? styles.swatchRms
        : styles.swatchLufs;

  /* Trigger color class per group */
  const triggerColorClass =
    group === 'peak'
      ? styles.triggerPeak
      : group === 'rms'
        ? styles.triggerRms
        : styles.triggerLufs;

  return (
    <div className={styles.meterModeSelector} ref={ref}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${triggerColorClass}`}
        onClick={handleToggle}
        title={`Meter mode: ${current?.label ?? 'Peak'}`}
      >
        {abbr}
      </button>

      {open && (
        <div className={styles.menu}>
          {/* Peak + RMS */}
          {MODES.filter((m) => m.group !== 'lufs').map((m) => (
            <button
              key={m.value}
              className={`${styles.option} ${m.value === mode ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(m.value)}
            >
              <span className={`${styles.swatch} ${swatchClass(m.group)}`} />
              {m.label}
            </button>
          ))}

          {/* Divider + LUFS section */}
          <div className={styles.divider} />
          <span className={styles.groupLabel}>Loudness</span>
          {MODES.filter((m) => m.group === 'lufs').map((m) => (
            <button
              key={m.value}
              className={`${styles.option} ${m.value === mode ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(m.value)}
            >
              <span className={`${styles.swatch} ${swatchClass(m.group)}`} />
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
