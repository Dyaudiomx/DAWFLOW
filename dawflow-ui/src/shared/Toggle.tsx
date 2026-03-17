import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
  active: boolean;
  onToggle: () => void;
  activeColor?: string;
  label?: string;
  title?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  active,
  onToggle,
  activeColor,
  label,
  title,
}) => {
  const activeStyle = active && activeColor
    ? ({ backgroundColor: activeColor, color: '#fff', borderColor: activeColor } as React.CSSProperties)
    : undefined;

  return (
    <button
      className={`${styles.toggle} ${active ? styles.active : ''}`}
      onClick={onToggle}
      title={title}
      style={activeStyle}
    >
      {label}
    </button>
  );
};
