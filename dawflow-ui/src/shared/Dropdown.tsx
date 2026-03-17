import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './Dropdown.module.css';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value?: string;
  options: DropdownOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  width?: number | string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  width,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange?.(optValue);
      setOpen(false);
    },
    [onChange],
  );

  // Close on outside click
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

  return (
    <div className={styles.dropdown} ref={ref} style={width ? { width } : undefined}>
      <button className={styles.trigger} onClick={handleToggle}>
        <span className={styles.label}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={styles.arrow}>{open ? '\u2304' : '\u2304'}</span>
      </button>
      {open && (
        <div className={styles.menu}>
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.option} ${opt.value === value ? styles.selected : ''}`}
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
