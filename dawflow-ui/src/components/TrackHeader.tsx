import React, { useState, useRef, useCallback } from 'react';
import { engine } from '../engine/registry';
import { useMeterStore } from '../stores/meters';
import styles from './TrackHeader.module.css';

/** Convert a hex color like '#4090d0' or '4090d0ff' to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').slice(0, 6);
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TrackHeaderProps {
  track: {
    id: string;
    name: string;
    type: string;
    color: string;
    muted: boolean;
    mutedByOthers?: boolean;
    solo: boolean;
    recordEnabled: boolean;
    monitorEnabled: boolean;
    readAutomation: boolean;
    writeAutomation: boolean;
    frozen: boolean;
    index: number;
  };
  selected: boolean;
  onSelect: (trackId: string, e?: React.MouseEvent) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onRecordToggle: (trackId: string) => void;
  onMonitorToggle: (trackId: string) => void;
  onFreezeToggle: (trackId: string) => void;
  onNameChange: (trackId: string, name: string) => void;
  onColorPickerOpen: (trackId: string) => void;
  onEditChannel: (trackId: string) => void;
  onToggleAutomation: (trackId: string) => void;
  onToggleLanes: (trackId: string) => void;
  onAutomationModeChange: (trackId: string, mode: 'off' | 'read' | 'write') => void;
  onDragStart?: (trackId: string, e: React.DragEvent) => void;
  onContextMenu?: (trackId: string, e: React.MouseEvent) => void;
}

// ---------------------------------------------------------------------------
// Track type icon helper — returns a small SVG/unicode icon per type
// ---------------------------------------------------------------------------

const TRACK_TYPE_ICONS: Record<string, string> = {
  audio: '\u223F',       // sine wave ∿
  midi: '\u266A',        // music note ♪
  instrument: '\u266B',  // beamed notes ♫
  sampler: '\u25A6',     // square with diagonal ▦
  folder: '\u25E8',      // folder-ish ◨
  group: '\u25CB',       // circle ○
  bus: '\u2261',         // triple bar ≡
  fx: '\u0192',          // f with hook ƒ
  vca: '\u25B3',         // triangle △
};

// ---------------------------------------------------------------------------
// Helper: is this track type recordable?
// ---------------------------------------------------------------------------

function isRecordable(type: string): boolean {
  return type === 'audio' || type === 'midi' || type === 'instrument' || type === 'sampler';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  selected,
  onSelect,
  onMuteToggle,
  onSoloToggle,
  onRecordToggle,
  onMonitorToggle,
  onFreezeToggle,
  onNameChange,
  onColorPickerOpen,
  onEditChannel,
  onToggleAutomation,
  onToggleLanes,
  onAutomationModeChange,
  onDragStart,
  onContextMenu,
}) => {
  // ---- Inline name editing state ----
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(track.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- Output meter state ----
  // Meter level comes from the dedicated meter store (fed by WebSocket strip_meter events).
  // We do NOT poll per-track meters via IPC — that causes too many requests.
  const meterLevel = useMeterStore((s) => s.levels[track.id] ?? 0);

  // ---- Select handler (auto-arm is handled by CenterZone) ----
  const handleSelect = useCallback((e: React.MouseEvent) => {
    // Always call onSelect for multi-selection (shift/cmd), even if already selected
    if (selected && !e.shiftKey && !e.metaKey && !e.ctrlKey) return;
    onSelect(track.id, e);
  }, [selected, track.id, onSelect]);

  // ---- Double-click name to edit ----
  const handleNameDoubleClick = useCallback(() => {
    setEditValue(track.name);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [track.name]);

  // ---- Commit name edit ----
  const commitName = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== track.name) {
      onNameChange(track.id, trimmed);
    }
  }, [editValue, track.id, track.name, onNameChange]);

  // ---- Keyboard handling for name input ----
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitName();
      } else if (e.key === 'Escape') {
        setEditing(false);
      }
    },
    [commitName],
  );

  // ---- Color square click (cmd+click = color picker, click = select) ----
  const handleColorSquareClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.stopPropagation();
        onColorPickerOpen(track.id);
      }
    },
    [onColorPickerOpen, track.id],
  );

  // ---- Drag ----
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', track.id);
      e.dataTransfer.effectAllowed = 'move';
      onDragStart?.(track.id, e);
    },
    [onDragStart, track.id],
  );

  // ---- Context menu ----
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(track.id, e);
    },
    [onContextMenu, track.id],
  );

  // ---- Automation R / W toggle helpers ----
  const handleReadClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newMode = track.readAutomation ? 'off' : 'read';
      onAutomationModeChange(track.id, newMode);
      engine.automation.setMode(track.id, newMode === 'off' ? 'Manual' : 'Play').catch(() => {});
    },
    [track.id, track.readAutomation, onAutomationModeChange],
  );

  const handleWriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newMode = track.writeAutomation ? 'off' : 'write';
      onAutomationModeChange(track.id, newMode);
      engine.automation.setMode(track.id, newMode === 'write' ? 'Write' : 'Manual').catch(() => {});
    },
    [track.id, track.writeAutomation, onAutomationModeChange],
  );

  // ---- Automation arrow on color square ----
  const handleAutomationArrowClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleAutomation(track.id);
    },
    [onToggleAutomation, track.id],
  );

  // ---- Derive class names ----
  const headerCls = [
    styles.trackHeader,
    selected ? styles.selected : '',
    track.mutedByOthers && !track.solo ? styles.dimmedBySolo : '',
    track.frozen ? styles.frozen : '',
  ]
    .filter(Boolean)
    .join(' ');

  const trackIcon = TRACK_TYPE_ICONS[track.type] || '\u223F';

  return (
    <div
      className={headerCls}
      style={{ background: `color-mix(in srgb, ${track.color} 12%, #252528)` }}
      onClick={handleSelect}
      onContextMenu={handleContextMenu}
    >
      {/* ================================================================
          COLOR SQUARE — Full-height left column
          ================================================================ */}
      <div
        className={styles.colorSquare}
        style={{ background: track.color }}
        draggable
        onClick={handleColorSquareClick}
        onDragStart={handleDragStart}
        title={`Track ${track.index + 1} (${track.type})\nCmd+Click to change color\nDrag to reorder`}
      >
        <span className={styles.trackNumber}>{track.index + 1}</span>
        <span className={styles.trackTypeIcon}>{trackIcon}</span>
        <span
          className={styles.automationArrow}
          onClick={handleAutomationArrowClick}
        >
          {'\u25BC'}
        </span>
      </div>

      {/* ================================================================
          RIGHT CONTENT — Two rows beside the color square
          ================================================================ */}
      <div className={styles.content}>
        {/* ----------------------------------------------------------
            ROW 1 — M, S, Track name
            ---------------------------------------------------------- */}
        <div className={styles.row1}>
          <div className={styles.msGroup}>
            <button
              className={`${styles.btnMute}${track.muted ? ` ${styles.active}` : ''}${track.mutedByOthers && !track.muted ? ` ${styles.implicitMute}` : ''}`}
              onClick={(e) => { e.stopPropagation(); onMuteToggle(track.id); }}
              title={track.mutedByOthers ? 'Muted by solo' : 'Mute'}
            >
              M
            </button>
            <button
              className={`${styles.btnSolo}${track.solo ? ` ${styles.active}` : ''}`}
              onClick={(e) => { e.stopPropagation(); onSoloToggle(track.id); }}
              title="Solo"
            >
              S
            </button>
          </div>

          {editing ? (
            <input
              ref={inputRef}
              className={styles.trackNameInput}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={styles.trackName}
              onDoubleClick={handleNameDoubleClick}
              title={track.name}
            >
              {track.name}
            </span>
          )}
        </div>

        {/* ----------------------------------------------------------
            ROW 2 — Record, Monitor, Edit, Stereo, R, W, Lanes
            ---------------------------------------------------------- */}
        <div className={styles.row2}>
          {/* Record arm */}
          <button
            className={`${styles.btnRecord}${track.recordEnabled ? ` ${styles.active}` : ''}`}
            onClick={(e) => { e.stopPropagation(); onRecordToggle(track.id); }}
            title="Record Arm"
            disabled={!isRecordable(track.type)}
          >
            <span className={styles.recordDot} />
          </button>

          {/* Monitor */}
          <button
            className={`${styles.btnMonitor}${track.monitorEnabled ? ` ${styles.active}` : ''}`}
            onClick={(e) => { e.stopPropagation(); onMonitorToggle(track.id); }}
            title="Monitor"
          >
            {'\u{1F50A}'}
          </button>

          {/* Edit channel */}
          <button
            className={styles.btnEdit}
            onClick={(e) => { e.stopPropagation(); onEditChannel(track.id); }}
            title="Edit Channel Settings"
          >
            e
          </button>

          {/* Stereo/Mono indicator */}
          <span className={styles.btnStereo} title="Stereo">
            {'\u229E'}
          </span>

          {/* Read automation */}
          <button
            className={`${styles.btnRead}${track.readAutomation ? ` ${styles.active}` : ''}`}
            onClick={handleReadClick}
            title="Read Automation"
          >
            R
          </button>

          {/* Write automation */}
          <button
            className={`${styles.btnWrite}${track.writeAutomation ? ` ${styles.active}` : ''}`}
            onClick={handleWriteClick}
            title="Write Automation"
          >
            W
          </button>

          {/* Freeze */}
          <button
            className={`${styles.btnFreeze}${track.frozen ? ` ${styles.active}` : ''}`}
            onClick={(e) => { e.stopPropagation(); onFreezeToggle(track.id); }}
            title={track.frozen ? 'Unfreeze Track' : 'Freeze Track'}
          >
            {'\u2744'}
          </button>

          {/* Spacer */}
          <span className={styles.spacer} />

          {/* Show lanes */}
          <button
            className={styles.btnLanes}
            onClick={(e) => { e.stopPropagation(); onToggleLanes(track.id); }}
            title="Show/Hide Take Lanes"
          >
            {'\u2630'}
          </button>
        </div>
      </div>

      {/* ================================================================
          OUTPUT METER — Narrow strip on far right
          ================================================================ */}
      <div className={styles.outputMeter} title={`Output: ${(meterLevel * 100).toFixed(0)}%`}>
        <div
          className={styles.outputMeterFill}
          style={{
            height: `${meterLevel * 100}%`,
            background: meterLevel > 0.9 ? '#f44336' : meterLevel > 0.7 ? '#FFC107' : '#4CAF50',
          }}
        />
      </div>
    </div>
  );
};

export default TrackHeader;
