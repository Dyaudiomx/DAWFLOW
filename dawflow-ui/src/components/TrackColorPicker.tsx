import React, { useEffect, useRef, useCallback } from 'react';
import styles from './TrackColorPicker.module.css';

/* ---------------------------------------------------------------------------
   Cubase 15 Pro — Track Color Palette
   3 rows of 8 swatches each (24 colors), matching the Cubase color picker.
   --------------------------------------------------------------------------- */

const TRACK_COLORS: string[] = [
  /* Row 1 — warm / bright */
  '#C43030', // Red
  '#D45A2E', // Orange-Red
  '#D47B2E', // Orange
  '#D4A22E', // Yellow-Orange
  '#C8B830', // Yellow
  '#8CB830', // Yellow-Green
  '#4CAF50', // Green
  '#30C460', // Bright Green

  /* Row 2 — cool / vivid */
  '#2EA88C', // Teal
  '#2EC8D4', // Cyan
  '#5BB8E0', // Light Blue
  '#4A90D9', // Blue
  '#5A68C8', // Indigo
  '#7B50C8', // Purple
  '#9B50C8', // Violet
  '#C850A0', // Magenta

  /* Row 3 — muted / earthy */
  '#D4708C', // Pink
  '#E0508C', // Hot Pink
  '#888888', // Gray
  '#8C6A40', // Brown
  '#5A3878', // Dark Purple
  '#6A5040', // Dark Brown
  '#5B7FA5', // Slate Blue
  '#777777', // Charcoal
];

/** Default color returned when "Set Track Color to Default" is clicked. */
const DEFAULT_TRACK_COLOR = '';

/* ---------------------------------------------------------------------------
   Props
   --------------------------------------------------------------------------- */

export interface TrackColorPickerProps {
  /** Horizontal position (px from left of viewport). */
  x: number;
  /** Vertical position (px from top of viewport). */
  y: number;
  /** Currently applied track color (hex string). */
  currentColor: string;
  /** Called when the user picks a color. Receives a hex string. */
  onColorSelect: (color: string) => void;
  /** Called when the popup should close (outside click, Escape, X button). */
  onClose: () => void;
}

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */

export const TrackColorPicker: React.FC<TrackColorPickerProps> = ({
  x,
  y,
  currentColor,
  onColorSelect,
  onClose,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  /* ---- Clamp position so the popup stays within the viewport ---- */
  const clampedX = Math.min(x, window.innerWidth - 230);
  const clampedY = Math.min(y, window.innerHeight - 200);

  /* ---- Close on Escape ---- */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /* ---- Swatch click ---- */
  const handleSwatchClick = useCallback(
    (color: string) => {
      onColorSelect(color);
      onClose();
    },
    [onColorSelect, onClose],
  );

  /* ---- Reset to default ---- */
  const handleDefault = useCallback(() => {
    onColorSelect(DEFAULT_TRACK_COLOR);
    onClose();
  }, [onColorSelect, onClose]);

  /* ---- Normalise current color for comparison ---- */
  const normalised = currentColor.toUpperCase();

  return (
    <>
      {/* Invisible overlay to capture outside clicks */}
      <div className={styles.overlay} onMouseDown={onClose} />

      <div
        ref={pickerRef}
        className={styles.picker}
        style={{ left: clampedX, top: clampedY }}
      >
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Choose Track Color</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close color picker"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Color grid */}
        <div className={styles.grid}>
          {TRACK_COLORS.map((color) => (
            <button
              key={color}
              className={`${styles.swatch} ${
                color.toUpperCase() === normalised ? styles.swatchSelected : ''
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleSwatchClick(color)}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.defaultBtn} onClick={handleDefault}>
            Set Track Color to Default
          </button>
        </div>
      </div>
    </>
  );
};
