import React from 'react';
import styles from './DawToolbar.module.css';

/* ---- DawToolbar: the main toolbar row ---- */

export interface DawToolbarProps {
  children: React.ReactNode;
}

export const DawToolbar: React.FC<DawToolbarProps> = ({ children }) => {
  return <div className={styles.dawToolbar}>{children}</div>;
};

/* ---- DawToolbarGroup: a cluster of related buttons ---- */

export interface DawToolbarGroupProps {
  children: React.ReactNode;
}

export const DawToolbarGroup: React.FC<DawToolbarGroupProps> = ({ children }) => {
  return <div className={styles.group}>{children}</div>;
};

/* ---- DawToolbarSeparator: thin vertical divider between groups ---- */

export const DawToolbarSeparator: React.FC = () => {
  return <div className={styles.separator} />;
};
