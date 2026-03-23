import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './DawInput.module.css';

export interface DawInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  type?: 'text' | 'number';
  suffix?: string;
  width?: number;
}

export const DawInput: React.FC<DawInputProps> = ({
  value,
  onChange,
  onCommit,
  type = 'text',
  suffix,
  width,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Sync from parent when value changes externally */
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setLocalValue(v);
      onChange(v);
    },
    [onChange],
  );

  const commit = useCallback(() => {
    onCommit?.(localValue);
  }, [onCommit, localValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commit();
        inputRef.current?.blur();
      }
      if (e.key === 'Escape') {
        setLocalValue(value);
        inputRef.current?.blur();
      }
    },
    [commit, value],
  );

  const handleBlur = useCallback(() => {
    commit();
  }, [commit]);

  return (
    <div className={styles.dawInput} style={width ? { width } : undefined}>
      <input
        ref={inputRef}
        className={styles.field}
        type={type}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </div>
  );
};
