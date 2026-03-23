import React, { useState, useCallback, useEffect } from 'react';
import styles from './ColorPickerDialog.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColorPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (color: string) => void; // Returns "RRGGBBFF" format
  currentColor?: string;
}

// ---------------------------------------------------------------------------
// Cubase color palette (16x6 = 96 colors)
// ---------------------------------------------------------------------------

const COLOR_PALETTE: string[][] = [
  // Row 1: Reds
  [
    '#FF0000', '#FF3333', '#FF6666', '#FF9999',
    '#CC0000', '#CC3333', '#990000', '#993333',
    '#FF4444', '#FF7777', '#FFAAAA', '#FFCCCC',
    '#CC4444', '#CC7777', '#994444', '#997777',
  ],
  // Row 2: Oranges/Yellows
  [
    '#FF8800', '#FFAA33', '#FFCC66', '#FFEE99',
    '#CC6600', '#CC8833', '#996600', '#998833',
    '#FFFF00', '#FFFF44', '#FFFF88', '#FFFFCC',
    '#CCCC00', '#CCCC44', '#999900', '#999944',
  ],
  // Row 3: Greens
  [
    '#00FF00', '#33FF33', '#66FF66', '#99FF99',
    '#00CC00', '#33CC33', '#009900', '#339933',
    '#00FF88', '#33FF99', '#66FFAA', '#99FFCC',
    '#00CC66', '#33CC77', '#009944', '#339955',
  ],
  // Row 4: Cyans/Blues
  [
    '#00FFFF', '#33FFFF', '#66FFFF', '#99FFFF',
    '#00CCCC', '#33CCCC', '#009999', '#339999',
    '#0088FF', '#3399FF', '#66AAFF', '#99CCFF',
    '#0066CC', '#3377CC', '#004499', '#335599',
  ],
  // Row 5: Blues/Purples
  [
    '#0000FF', '#3333FF', '#6666FF', '#9999FF',
    '#0000CC', '#3333CC', '#000099', '#333399',
    '#8800FF', '#9933FF', '#AA66FF', '#CC99FF',
    '#6600CC', '#7733CC', '#440099', '#553399',
  ],
  // Row 6: Pinks/Grays
  [
    '#FF00FF', '#FF33FF', '#FF66FF', '#FF99FF',
    '#CC00CC', '#CC33CC', '#990099', '#993399',
    '#FFFFFF', '#CCCCCC', '#999999', '#666666',
    '#444444', '#333333', '#222222', '#111111',
  ],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a hex color to uppercase 6-char form (no #) */
function normalizeHex(color: string): string {
  let hex = color.replace(/^#/, '').toUpperCase();
  // Strip alpha if 8-char
  if (hex.length === 8) hex = hex.slice(0, 6);
  // Expand shorthand (e.g. "F00" -> "FF0000")
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return hex;
}

/** Convert "#RRGGBB" to "RRGGBBFF" output format */
function hexToOutput(hex: string): string {
  return normalizeHex(hex) + 'FF';
}

/** Check if a string is a valid 6-char hex color */
function isValidHex(hex: string): boolean {
  return /^[0-9A-Fa-f]{6}$/.test(hex);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ColorPickerDialog: React.FC<ColorPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
  currentColor,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('#5b9bd5');
  const [customHex, setCustomHex] = useState<string>('');

  // Sync selected color when dialog opens or currentColor changes
  useEffect(() => {
    if (open && currentColor) {
      const normalized = '#' + normalizeHex(currentColor);
      setSelectedColor(normalized);
      setCustomHex(normalizeHex(currentColor));
    }
  }, [open, currentColor]);

  const handleSwatchClick = useCallback((color: string) => {
    setSelectedColor(color);
    setCustomHex(normalizeHex(color));
  }, []);

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
      setCustomHex(val);
      if (isValidHex(val)) {
        setSelectedColor('#' + val.toUpperCase());
      }
    },
    [],
  );

  const handleApply = useCallback(() => {
    onSelect(hexToOutput(selectedColor));
    onClose();
  }, [selectedColor, onSelect, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleApply();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, handleApply]);

  if (!open) return null;

  const currentNormalized = normalizeHex(selectedColor);

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.title}>Track Color</div>

        {/* Color grid */}
        <div className={styles.grid}>
          {COLOR_PALETTE.flat().map((color) => {
            const isSelected =
              normalizeHex(color) === currentNormalized;
            return (
              <div
                key={color}
                className={`${styles.swatch} ${isSelected ? styles.swatchSelected : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleSwatchClick(color)}
                title={color}
              />
            );
          })}
        </div>

        {/* Custom hex input */}
        <div className={styles.customInput}>
          <span style={{ color: '#888', fontSize: 12 }}>#</span>
          <input
            type="text"
            value={customHex}
            onChange={handleCustomChange}
            placeholder="RRGGBB"
            maxLength={6}
            spellCheck={false}
          />
          <div
            className={styles.preview}
            style={{ backgroundColor: selectedColor }}
          />
        </div>

        {/* Footer buttons */}
        <div className={styles.footer}>
          <button
            className={`${styles.btn} ${styles.btnCancel}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.btnApply}`}
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPickerDialog;
