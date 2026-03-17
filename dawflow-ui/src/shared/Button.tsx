import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  variant?: 'default' | 'state' | 'tool' | 'transport' | 'icon';
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  active = false,
  activeColor,
  disabled = false,
  onClick,
  children,
  title,
  className,
  size = 'md',
}) => {
  const style =
    active && activeColor
      ? ({ backgroundColor: activeColor, color: '#fff' } as React.CSSProperties)
      : undefined;

  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${active ? styles.active : ''} ${disabled ? styles.disabled : ''} ${className || ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
};
