import React, { useState, useCallback, useEffect } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { ipc } from '../services/ipc';
import styles from './AddTrackDialog.module.css';

// ── Track type definitions ──────────────────────────────────

type TrackType = 'audio' | 'instrument' | 'sampler' | 'drum' | 'midi' | 'effect' | 'group' | 'vca';

interface TrackTypeDef {
  key: TrackType;
  label: string;
  icon: string;
}

const TRACK_TYPES: TrackTypeDef[] = [
  { key: 'audio',      label: 'Audio',      icon: '\u223F' },   // sine wave
  { key: 'instrument', label: 'Instrument', icon: '\u266B' },   // beamed notes
  { key: 'sampler',    label: 'Sampler',    icon: '\u25A6' },   // square with fill
  { key: 'drum',       label: 'Drum',       icon: '\u25C9' },   // fisheye
  { key: 'midi',       label: 'MIDI',       icon: '\u2399' },   // MIDI symbol
  { key: 'effect',     label: 'Effect',     icon: '\u2697' },   // alembic
  { key: 'group',      label: 'Group',      icon: '\u2630' },   // trigram
  { key: 'vca',        label: 'VCA',        icon: '\u2195' },   // up down arrow
];

// ── Preset color palette ────────────────────────────────────

const COLOR_PRESETS = [
  '#e04040',  // red
  '#e07030',  // orange
  '#d4b830',  // yellow
  '#50b050',  // green
  '#30a8a8',  // teal
  '#4090d0',  // blue
  '#7060c0',  // purple
  '#c050a0',  // magenta
  '#888888',  // gray
  '#c0a070',  // tan
];

// ── Default names per type ──────────────────────────────────

const DEFAULT_NAMES: Record<TrackType, string> = {
  audio:      'Audio',
  instrument: 'Instrument',
  sampler:    'Sampler',
  drum:       'Drum',
  midi:       'MIDI',
  effect:     'FX',
  group:      'Group',
  vca:        'VCA',
};

// ── Component ───────────────────────────────────────────────

export const AddTrackDialog: React.FC = () => {
  const open = useUIStore((s) => s.addTrackDialogOpen);
  const defaultType = useUIStore((s) => s.addTrackDialogType);
  const close = useUIStore((s) => s.closeAddTrackDialog);

  const [trackType, setTrackType] = useState<TrackType>('audio');
  const [name, setName] = useState('');
  const [count, setCount] = useState(1);
  const [inputRouting, setInputRouting] = useState('stereo-in');
  const [configuration, setConfiguration] = useState('stereo');
  const [outputRouting, setOutputRouting] = useState('stereo-out');
  const [trackColor, setTrackColor] = useState(COLOR_PRESETS[5]); // blue default
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync default type from store when dialog opens
  useEffect(() => {
    if (open && defaultType) {
      const matched = TRACK_TYPES.find((t) => t.key === defaultType);
      if (matched) setTrackType(matched.key);
    }
  }, [open, defaultType]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const trackName = name.trim() || undefined;
      for (let i = 0; i < count; i++) {
        const suffix = count > 1 ? ` ${i + 1}` : '';
        const finalName = trackName ? trackName + suffix : undefined;

        let type = 'audio';
        if (trackType === 'midi' || trackType === 'instrument' || trackType === 'sampler' || trackType === 'drum') type = 'midi';
        else if (trackType === 'effect' || trackType === 'group' || trackType === 'vca') type = 'bus';

        await ipc.call('daw.add_track_with_color', {
          type,
          name: finalName || '',
          color: trackColor.replace('#', '') + 'ff',
          channels: configuration === 'mono' ? 1 : 2,
        });
      }
      await useSessionStore.getState().fetchFromEngine();

      // Reset form
      setName('');
      setCount(1);
      setTrackType('audio');
      setInputRouting('stereo-in');
      setConfiguration('stereo');
      setOutputRouting('stereo-out');
      setTrackColor(COLOR_PRESETS[5]);
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[DAWFLOW] Failed to add track:', msg);
      setError(msg);
    } finally {
      setCreating(false);
    }
  }, [trackType, name, count, creating, close, configuration, trackColor]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  }, [close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && !creating) handleCreate();
  }, [close, creating, handleCreate]);

  const currentTypeDef = TRACK_TYPES.find((t) => t.key === trackType) ?? TRACK_TYPES[0];

  // Determine which routing fields to show
  const showInputRouting = trackType === 'audio';
  const showOutputRouting = trackType !== 'vca';
  const showConfiguration = trackType === 'audio' || trackType === 'effect' || trackType === 'group';

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className={styles.dialog} role="dialog" aria-label="Add Track">

        {/* ── Left sidebar: track type list ── */}
        <div className={styles.sidebar}>
          {TRACK_TYPES.map((t) => (
            <button
              key={t.key}
              className={`${styles.sidebarItem} ${trackType === t.key ? styles.sidebarItemActive : ''}`}
              onClick={() => setTrackType(t.key)}
            >
              <span className={styles.sidebarIcon}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Right content ── */}
        <div className={styles.content}>

          {/* Header */}
          <div className={styles.header}>
            <span className={styles.title}>Add Track</span>
            <button className={styles.closeBtn} onClick={close} title="Close">&times;</button>
          </div>

          {/* Hero: large icon + type name */}
          <div className={styles.hero}>
            <div className={styles.heroIcon}>{currentTypeDef.icon}</div>
            <span className={styles.heroLabel}>{currentTypeDef.label}</span>
          </div>

          {/* Form fields */}
          <div className={styles.body}>

            {/* Input Routing */}
            {showInputRouting && (
              <div className={styles.fieldRow}>
                <span className={styles.label}>Input Routing</span>
                <div className={styles.fieldControl}>
                  <select
                    className={styles.select}
                    value={inputRouting}
                    onChange={(e) => setInputRouting(e.target.value)}
                  >
                    <option value="stereo-in">Stereo In</option>
                    <option value="mono-in">Mono In</option>
                    <option value="no-bus">No Bus</option>
                    <option value="bus-1">Bus 1</option>
                    <option value="bus-2">Bus 2</option>
                  </select>
                </div>
              </div>
            )}

            {/* Configuration */}
            {showConfiguration && (
              <div className={styles.fieldRow}>
                <span className={styles.label}>Configuration</span>
                <div className={styles.fieldControl}>
                  <select
                    className={styles.select}
                    value={configuration}
                    onChange={(e) => setConfiguration(e.target.value)}
                  >
                    <option value="mono">Mono</option>
                    <option value="stereo">Stereo</option>
                    <option value="5.1">5.1 Surround</option>
                  </select>
                </div>
              </div>
            )}

            {/* Output Routing */}
            {showOutputRouting && (
              <div className={styles.fieldRow}>
                <span className={styles.label}>Output Routing</span>
                <div className={styles.fieldControl}>
                  <select
                    className={styles.select}
                    value={outputRouting}
                    onChange={(e) => setOutputRouting(e.target.value)}
                  >
                    <option value="stereo-out">Stereo Out</option>
                    <option value="no-bus">No Bus</option>
                  </select>
                </div>
              </div>
            )}

            {/* Name */}
            <div className={styles.fieldRow}>
              <span className={styles.label}>Name</span>
              <div className={styles.fieldControl}>
                <input
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={DEFAULT_NAMES[trackType]}
                  autoFocus
                />
              </div>
            </div>

            {/* Track Color */}
            <div className={styles.fieldRow}>
              <span className={styles.label}>Track Color</span>
              <div className={styles.fieldControl}>
                <div className={styles.colorSwatches}>
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      className={`${styles.colorSwatch} ${trackColor === color ? styles.colorSwatchActive : ''}`}
                      style={{ background: color }}
                      onClick={() => setTrackColor(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Count */}
            <div className={styles.fieldRow}>
              <span className={styles.label}>Count</span>
              <div className={styles.fieldControl}>
                <div className={styles.countGroup}>
                  <input
                    className={styles.countInput}
                    type="number"
                    min={1}
                    max={32}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Math.min(32, Number(e.target.value) || 1)))}
                  />
                  <div className={styles.countBtns}>
                    <button
                      className={styles.countBtn}
                      onClick={() => setCount((c) => Math.min(32, c + 1))}
                      title="Increase"
                    >
                      &#9650;
                    </button>
                    <button
                      className={styles.countBtn}
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      title="Decrease"
                    >
                      &#9660;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          {error && (
            <div style={{ padding: '4px 20px', color: '#e04040', fontSize: 11 }}>{error}</div>
          )}
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={close}>Cancel</button>
            <button className={styles.addBtn} onClick={handleCreate} disabled={creating}>
              {creating ? 'Adding...' : 'Add Track'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
