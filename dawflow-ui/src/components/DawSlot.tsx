import React, { useCallback } from 'react';
import styles from './DawSlot.module.css';

export interface DawSlotProps {
  label: string | null;  // null = empty slot
  active?: boolean;
  onClick?: () => void;
  onBypassToggle?: () => void;
  onRemove?: () => void;
  bypassed?: boolean;
}

export const DawSlot: React.FC<DawSlotProps> = ({
  label,
  active = false,
  onClick,
  onBypassToggle,
  onRemove,
  bypassed = false,
}) => {
  const isEmpty = label == null;

  const handleBypassClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onBypassToggle?.();
    },
    [onBypassToggle],
  );

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    },
    [onRemove],
  );

  const slotClassName = [
    styles.dawSlot,
    isEmpty ? styles.empty : '',
    bypassed ? styles.bypassed : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={slotClassName} onClick={isEmpty ? undefined : onClick}>
      {/* Bypass dot */}
      <span
        className={`${styles.bypassDot} ${!isEmpty && active && !bypassed ? styles.bypassDotActive : ''}`}
        onClick={isEmpty ? undefined : handleBypassClick}
        title={isEmpty ? undefined : bypassed ? 'Enable' : 'Bypass'}
      />

      {/* Label */}
      <span
        className={`${styles.slotLabel} ${isEmpty ? styles.emptyLabel : styles.slotLabelLoaded}`}
      >
        {isEmpty ? 'empty' : label}
      </span>

      {/* Remove button (only for loaded slots) */}
      {!isEmpty && (
        <button
          className={styles.removeBtn}
          onClick={handleRemoveClick}
          title="Remove"
        >
          {'\u00D7'}
        </button>
      )}
    </div>
  );
};
