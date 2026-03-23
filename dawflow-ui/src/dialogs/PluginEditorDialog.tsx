import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useUIStore } from '../stores/ui';
import { ipc } from '../services/ipc';
import { Knob } from '../shared/Knob';
import styles from './PluginEditorDialog.module.css';

// ── Types ────────────────────────────────────────────────────

interface Param {
  id: number;
  name: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  unit: string;
  automatable: boolean;
}

interface Preset {
  uri: string;
  label: string;
  user: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

/** Normalize a param value to 0-1 for the Knob. */
function toNormalized(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/** Denormalize a 0-1 knob value back to the param range. */
function fromNormalized(norm: number, min: number, max: number): number {
  return min + norm * (max - min);
}

/** Format a param value for display. */
function formatValue(value: number, unit: string): string {
  const display = Math.abs(value) < 10
    ? value.toFixed(2)
    : Math.abs(value) < 100
      ? value.toFixed(1)
      : value.toFixed(0);
  return unit ? `${display} ${unit}` : display;
}

// ── Component ────────────────────────────────────────────────

export const PluginEditorDialog: React.FC = () => {
  const pluginEditor = useUIStore((s) => s.pluginEditor);
  const setPluginEditor = useUIStore((s) => s.setPluginEditor);

  const [params, setParams] = useState<Param[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currentPreset, setCurrentPreset] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Drag state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ── Fetch parameters + presets on open ──────────────────────

  useEffect(() => {
    if (!pluginEditor?.open) {
      setParams([]);
      setPresets([]);
      setCurrentPreset('');
      return;
    }

    const { trackId, pluginId } = pluginEditor;
    setLoading(true);

    // Fetch parameters — pluginId is the processor_id from get_track_plugins
    ipc.getPluginParameters(trackId, pluginId)
      .then((data: any) => {
        const rawParams = Array.isArray(data) ? data : (data?.parameters || []);
        setParams(
          rawParams.map((p: any, i: number) => ({
            id: p.id ?? p.index ?? i,
            name: p.name ?? `Param ${i}`,
            value: p.value ?? 0,
            min: p.min ?? 0,
            max: p.max ?? 1,
            defaultValue: p.default ?? p.value ?? 0.5,
            unit: p.unit ?? p.label ?? '',
            automatable: p.automatable ?? true,
          })),
        );
      })
      .catch(() => setParams([]))
      .finally(() => setLoading(false));

    // Fetch presets
    ipc.listPluginPresets(trackId, pluginId)
      .then((data) => {
        setPresets(data?.presets || []);
        setCurrentPreset(data?.current_preset || '');
      })
      .catch(() => {
        setPresets([]);
        setCurrentPreset('');
      });
  }, [pluginEditor?.trackId, pluginEditor?.pluginId, pluginEditor?.open]);

  // ── Center dialog on first open ─────────────────────────────

  useEffect(() => {
    if (pluginEditor?.open && !position) {
      const w = 540;
      const h = 400;
      setPosition({
        x: Math.round((window.innerWidth - w) / 2),
        y: Math.round((window.innerHeight - h) / 2),
      });
    }
  }, [pluginEditor?.open]);

  // ── Dragging ────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!dialogRef.current) return;
    isDragging.current = true;
    const rect = dialogRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition({
        x: ev.clientX - dragOffset.current.x,
        y: ev.clientY - dragOffset.current.y,
      });
    };

    const handleUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, []);

  // ── Parameter change ────────────────────────────────────────

  const handleParamChange = useCallback(
    (param: Param, normalizedValue: number) => {
      if (!pluginEditor) return;
      const realValue = fromNormalized(normalizedValue, param.min, param.max);

      // Optimistic update
      setParams((prev) =>
        prev.map((p) => (p.id === param.id ? { ...p, value: realValue } : p)),
      );

      ipc.setPluginParameter(
        pluginEditor.trackId,
        pluginEditor.pluginId,
        param.id,
        realValue,
      ).catch(() => {});
    },
    [pluginEditor],
  );

  if (!pluginEditor?.open) return null;

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        style={{ left: (position ?? { x: 0, y: 0 }).x, top: (position ?? { x: 0, y: 0 }).y }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest(`.${styles.titleBar}`)) {
            const pos = position ?? { x: 0, y: 0 };
            const startX = e.clientX - pos.x;
            const startY = e.clientY - pos.y;
            const onMove = (me: MouseEvent) => setPosition({ x: me.clientX - startX, y: me.clientY - startY });
            const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }
        }}
      >
        <div className={styles.titleBar}>
          <span className={styles.pluginTitle}>{pluginEditor.pluginName}</span>
          <button className={styles.closeBtn} onClick={() => setPluginEditor(null)}>×</button>
        </div>
        <div className={styles.presetBar}>
          <label className={styles.presetLabel}>Preset:</label>
          <select
            className={styles.presetSelect}
            value={currentPreset}
            onChange={(e) => { setCurrentPreset(e.target.value); if (e.target.value) ipc.loadPluginPreset(pluginEditor.trackId, pluginEditor.pluginId, e.target.value); }}
          >
            <option value="">-- No Preset --</option>
            {presets.map((p) => <option key={p.uri} value={p.uri}>{p.label}</option>)}
          </select>
        </div>
        <div className={styles.paramGrid}>
          {loading && <div className={styles.emptyState}>Loading parameters...</div>}
          {!loading && params.length === 0 && <div className={styles.emptyState}>No parameters available</div>}
          {params.map((param) => (
            <div key={param.id} className={styles.paramCell}>
              <Knob
                value={toNormalized(param.value, param.min, param.max)}
                onChange={(v) => handleParamChange(param, v)}
                size={48}
              />
              <div className={styles.paramName}>{param.name}</div>
              <div className={styles.paramValue}>{formatValue(param.value, param.unit)}</div>
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          <button className={styles.footerBtn} onClick={() => {
            ipc.call('daw.plugin.reset_parameters_to_default', { track_id: pluginEditor.trackId, processor_id: pluginEditor.pluginId }).then(() => {
              ipc.getPluginParameters(pluginEditor.trackId, pluginEditor.pluginId).then((data: any) => {
                const rawParams = Array.isArray(data) ? data : (data?.parameters || []);
                setParams(rawParams.map((p: any, i: number) => ({ id: p.id ?? p.index ?? i, name: p.name ?? `Param ${i}`, value: p.value ?? 0, min: p.min ?? 0, max: p.max ?? 1, defaultValue: p.default ?? 0.5, unit: p.unit ?? '', automatable: p.automatable ?? true })));
              });
            }).catch(() => {});
          }}>Reset All</button>
        </div>
      </div>
    </div>
  );
}
