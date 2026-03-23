import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './DawSelect.module.css';

export interface DawSelectOption {
  value: string;
  label: string;
}

export interface DawSelectProps {
  value: string;
  options: DawSelectOption[];
  onChange: (value: string) => void;
  title?: string;
  width?: number;
}

export const DawSelect: React.FC<DawSelectProps> = ({
  value,
  options,
  onChange,
  title,
  width,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange(optValue);
      setOpen(false);
    },
    [onChange],
  );

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div
      className={`${styles.dawSelect} ${open ? styles.open : ''}`}
      ref={ref}
      style={width ? { width } : undefined}
      title={title}
    >
      <button className={styles.trigger} onClick={handleToggle}>
        <span className={styles.triggerLabel}>
          {selected ? selected.label : '\u2014'}
        </span>
        <span className={styles.triggerArrow}>{'\u25BC'}</span>
      </button>

      {open && (
        <div className={styles.menu}>
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.option} ${opt.value === value ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
