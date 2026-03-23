import React, { useState, useCallback, useEffect, useMemo } from 'react';
import styles from './RenderInPlaceDialog.module.css';

// ── Types ────────────────────────────────────────────────────

type RenderMode = 'separate' | 'block' | 'one';
type Processing = 'dry' | 'channel' | 'complete' | 'complete_master';
type SourceAction = 'keep' | 'mute' | 'disable' | 'remove';

export interface RenderSettings {
  mode: RenderMode;
  processing: Processing;
  tailMs: number;
  bitDepth: 16 | 24 | 32;
  sourceAction: SourceAction;
  mixDown: boolean;
  name: string;
}

export interface RenderInPlaceDialogProps {
  trackIds: string[];
  regionIds?: string[];
  trackNames: string[];
  onRender: (settings: RenderSettings) => void;
  onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────

const STORAGE_KEY = 'dawflow-render-in-place-settings';

const TAIL_PRESETS = [
  { value: 0, label: 'Off' },
  { value: 500, label: '500 ms' },
  { value: 1000, label: '1 s' },
  { value: 2000, label: '2 s' },
  { value: 5000, label: '5 s' },
  { value: -1, label: 'Custom' },
] as const;

const MODE_OPTIONS: { value: RenderMode; label: string; desc: string }[] = [
  { value: 'separate', label: 'As Separate Events', desc: 'Each event is rendered individually, preserving gaps.' },
  { value: 'block', label: 'As Block Events', desc: 'Adjacent events are merged into continuous blocks.' },
  { value: 'one', label: 'As One Event', desc: 'All events are rendered into a single continuous event.' },
];

const PROCESSING_OPTIONS: { value: Processing; label: string; desc: string; depth: string }[] = [
  { value: 'dry', label: 'Dry (Transfer Channel Settings)', desc: 'Raw audio only, no effects applied.', depth: styles.depthDry },
  { value: 'channel', label: 'Channel Settings', desc: 'Track inserts, EQ, and channel strip baked in.', depth: styles.depthChannel },
  { value: 'complete', label: 'Complete Signal Path', desc: 'Inserts + send effects + panner included.', depth: styles.depthComplete },
  { value: 'complete_master', label: 'Complete Signal Path + Master FX', desc: 'Everything including master bus processing.', depth: styles.depthMaster },
];

const SOURCE_OPTIONS: { value: SourceAction; label: string }[] = [
  { value: 'keep', label: 'Keep Unchanged' },
  { value: 'mute', label: 'Mute' },
  { value: 'disable', label: 'Disable' },
  { value: 'remove', label: 'Remove' },
];

// ── Helpers ──────────────────────────────────────────────────

function loadSavedSettings(): Partial<RenderSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveSettings(settings: RenderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────────

export const RenderInPlaceDialog: React.FC<RenderInPlaceDialogProps> = ({
  trackIds,
  regionIds,
  trackNames,
  onRender,
  onClose,
}) => {
  const saved = useMemo(() => loadSavedSettings(), []);

  // State with localStorage defaults
  const [mode, setMode] = useState<RenderMode>(saved.mode ?? 'separate');
  const [processing, setProcessing] = useState<Processing>(saved.processing ?? 'channel');
  const [tailPreset, setTailPreset] = useState<number>(() => {
    const ms = saved.tailMs ?? 0;
    const found = TAIL_PRESETS.find((p) => p.value === ms);
    return found ? ms : -1;
  });
  const [customTailMs, setCustomTailMs] = useState<number>(saved.tailMs ?? 0);
  const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(saved.bitDepth ?? 24);
  const [sourceAction, setSourceAction] = useState<SourceAction>(saved.sourceAction ?? 'mute');
  const [mixDown, setMixDown] = useState<boolean>(saved.mixDown ?? false);
  const [nameCustomized, setNameCustomized] = useState(false);
  const [name, setName] = useState(() => {
    const defaultName = trackNames.length === 1
      ? `${trackNames[0]} (Rendered)`
      : `Rendered (${trackNames.length} tracks)`;
    return defaultName;
  });

  const isEventMode = regionIds && regionIds.length > 0;
  const tailMs = tailPreset === -1 ? customTailMs : tailPreset;

  const handleRender = useCallback(() => {
    const settings: RenderSettings = {
      mode,
      processing,
      tailMs,
      bitDepth,
      sourceAction,
      mixDown: processing === 'dry' ? false : mixDown,
      name,
    };
    saveSettings(settings);
    onRender(settings);
  }, [mode, processing, tailMs, bitDepth, sourceAction, mixDown, name, onRender]);

  // Escape key to close, Enter to render
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRender();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, handleRender]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleTailPresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setTailPreset(val);
    if (val !== -1) setCustomTailMs(val);
  }, []);

  const toggleNameLock = useCallback(() => {
    if (nameCustomized) {
      // Revert to auto name
      const defaultName = trackNames.length === 1
        ? `${trackNames[0]} (Rendered)`
        : `Rendered (${trackNames.length} tracks)`;
      setName(defaultName);
    }
    setNameCustomized((prev) => !prev);
  }, [nameCustomized, trackNames]);

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog} role="dialog" aria-label="Render in Place Settings">

        {/* ── Header ── */}
        <div className={styles.header}>
          <span className={styles.title}>Render in Place Settings</span>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* ──── Mode Section ──── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Mode</div>
            <div className={styles.radioGroup}>
              {MODE_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="ripMode"
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                  />
                  <div>
                    <div className={styles.radioLabel}>{opt.label}</div>
                    <div className={styles.radioDescription}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ──── Processing Section ──── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Processing</div>
            <div className={styles.radioGroup}>
              {PROCESSING_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`${styles.processingOption} ${processing === opt.value ? opt.depth : ''}`}
                >
                  <input
                    type="radio"
                    name="ripProcessing"
                    checked={processing === opt.value}
                    onChange={() => setProcessing(opt.value)}
                  />
                  <div>
                    <div className={styles.radioLabel}>{opt.label}</div>
                    <div className={styles.radioDescription}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ──── Properties Section ──── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Properties</div>

            {/* Tail Size */}
            <div className={styles.fieldRow}>
              <span className={styles.label}>Tail Size</span>
              <div className={styles.fieldControl}>
                <select
                  className={styles.select}
                  value={tailPreset}
                  onChange={handleTailPresetChange}
                >
                  {TAIL_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {tailPreset === -1 && (
                  <>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={0}
                      max={30000}
                      step={100}
                      value={customTailMs}
                      onChange={(e) => setCustomTailMs(Math.max(0, Math.min(30000, Number(e.target.value))))}
                    />
                    <span className={styles.unitSuffix}>ms</span>
                  </>
                )}
              </div>
            </div>

            {/* Bit Depth */}
            <div className={styles.fieldRow}>
              <span className={styles.label}>Bit Depth (session default)</span>
              <div className={styles.fieldControl}>
                <select
                  className={styles.select}
                  value={bitDepth}
                  onChange={(e) => setBitDepth(Number(e.target.value) as 16 | 24 | 32)}
                >
                  <option value={16}>16 bit</option>
                  <option value={24}>24 bit</option>
                  <option value={32}>32 bit float</option>
                </select>
              </div>
            </div>

            {/* Name */}
            <div className={styles.fieldRow}>
              <span className={styles.label}>Name</span>
              <div className={styles.fieldControl}>
                <input
                  className={`${styles.input} ${!nameCustomized ? styles.inputDisabled : ''}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!nameCustomized}
                  placeholder="Render name"
                />
                <button
                  className={`${styles.lockBtn} ${nameCustomized ? styles.lockBtnActive : ''}`}
                  onClick={toggleNameLock}
                  title={nameCustomized ? 'Revert to auto name' : 'Customize name'}
                >
                  {nameCustomized ? '\u270E' : '\u{1F512}'}
                </button>
              </div>
            </div>
          </div>

          {/* ──── Source Track Section (only for track render, not event render) ──── */}
          {!isEventMode && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Source Track</div>
              <div className={styles.radioGroup}>
                {SOURCE_OPTIONS.map((opt) => (
                  <label key={opt.value} className={styles.radioOption}>
                    <input
                      type="radio"
                      name="ripSourceAction"
                      checked={sourceAction === opt.value}
                      onChange={() => setSourceAction(opt.value)}
                    />
                    <div className={styles.radioLabel}>{opt.label}</div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ──── Mix Down Option ──── */}
          {trackIds.length > 1 && (
            <div className={styles.section}>
              <label
                className={`${styles.checkbox} ${processing === 'dry' ? styles.checkboxDisabled : ''}`}
              >
                <input
                  type="checkbox"
                  checked={mixDown}
                  onChange={(e) => setMixDown(e.target.checked)}
                  disabled={processing === 'dry'}
                />
                Mix Down to One Track
              </label>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.renderBtn} onClick={handleRender}>
            Render
          </button>
        </div>
      </div>
    </div>
  );
};
