import React from 'react';
import styles from './DawButton.module.css';

export interface DawButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  variant?: 'default' | 'mute' | 'solo' | 'record' | 'monitor' | 'automation';
  size?: 'xs' | 'sm' | 'md';
  title?: string;
  disabled?: boolean;
}

export const DawButton: React.FC<DawButtonProps> = ({
  label,
  active = false,
  onClick,
  variant = 'default',
  size = 'sm',
  title,
  disabled = false,
}) => {
  const className = [
    styles.dawButton,
    styles[size],
    styles[variant],
    active ? styles.active : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
