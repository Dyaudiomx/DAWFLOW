import React, { useEffect, useState, useRef, useCallback } from 'react';
import { engine } from '../engine/registry';
import styles from './PluginPresetBrowser.module.css';

interface Preset {
  uri: string;
  label: string;
  user: boolean;
}

export interface PluginPresetBrowserProps {
  trackId: string;
  processorId: string;
  pluginName: string;
  onClose: () => void;
}

export const PluginPresetBrowser: React.FC<PluginPresetBrowserProps> = ({
  trackId,
  processorId,
  pluginName,
  onClose,
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currentPreset, setCurrentPreset] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  // Fetch presets on mount
  const fetchPresets = useCallback(() => {
    setLoading(true);
    engine.plugin.listPresets(trackId, processorId)
      .then((data) => {
        setPresets(data?.presets ?? []);
        setCurrentPreset(data?.current_preset ?? '');
      })
      .catch(() => {
        setPresets([]);
        setCurrentPreset('');
      })
      .finally(() => setLoading(false));
  }, [trackId, processorId]);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus save input when switching to save mode
  useEffect(() => {
    if (saving) {
      requestAnimationFrame(() => saveInputRef.current?.focus());
    }
  }, [saving]);

  const handleLoadPreset = useCallback((presetUri: string) => {
    engine.plugin.loadPreset(trackId, processorId, presetUri)
      .then(() => {
        setCurrentPreset(presetUri);
      })
      .catch((e) => console.warn('[PresetBrowser] load failed', e));
    onClose();
  }, [trackId, processorId, onClose]);

  const handleClearPreset = useCallback(() => {
    // Load empty string to clear
    setCurrentPreset('');
    onClose();
  }, [onClose]);

  const handleSavePreset = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;
    engine.plugin.savePreset(trackId, processorId, name)
      .then(() => {
        setSaving(false);
        setSaveName('');
        fetchPresets();
      })
      .catch((e) => console.warn('[PresetBrowser] save failed', e));
  }, [trackId, processorId, saveName, fetchPresets]);

  const handleRemovePreset = useCallback((e: React.MouseEvent, presetName: string) => {
    e.stopPropagation();
    engine.plugin.removePreset(trackId, processorId, presetName)
      .then(() => fetchPresets())
      .catch((err) => console.warn('[PresetBrowser] remove failed', err));
  }, [trackId, processorId, fetchPresets]);

  const factoryPresets = presets.filter((p) => !p.user);
  const userPresets = presets.filter((p) => p.user);

  return (
    <>
      {/* Invisible overlay to catch outside clicks */}
      <div className={styles.overlay} onClick={onClose} />

      <div className={styles.panel} ref={panelRef}>
        <div className={styles.list}>
          {loading && <div className={styles.loading}>Loading presets...</div>}

          {!loading && (
            <>
              {/* (No Preset) */}
              <button
                className={`${styles.item} ${styles.itemNoPreset} ${!currentPreset ? styles.itemActive : ''}`}
                onClick={handleClearPreset}
              >
                <span className={styles.itemLabel}>(No Preset)</span>
              </button>

              <div className={styles.divider} />

              {/* Factory presets */}
              {factoryPresets.length > 0 && (
                <>
                  <div className={styles.sectionHeader}>Factory</div>
                  {factoryPresets.map((p) => (
                    <button
                      key={p.uri}
                      className={`${styles.item} ${p.uri === currentPreset ? styles.itemActive : ''}`}
                      onClick={() => handleLoadPreset(p.uri)}
                    >
                      <span className={styles.itemLabel}>{p.label}</span>
                    </button>
                  ))}
                </>
              )}

              {/* User presets */}
              {userPresets.length > 0 && (
                <>
                  {factoryPresets.length > 0 && <div className={styles.divider} />}
                  <div className={styles.sectionHeader}>User</div>
                  {userPresets.map((p) => (
                    <button
                      key={p.uri}
                      className={`${styles.item} ${p.uri === currentPreset ? styles.itemActive : ''}`}
                      onClick={() => handleLoadPreset(p.uri)}
                    >
                      <span className={styles.itemLabel}>{p.label}</span>
                      <span
                        className={styles.removeBtn}
                        onClick={(e) => handleRemovePreset(e, p.label)}
                        title={`Remove "${p.label}"`}
                      >
                        x
                      </span>
                    </button>
                  ))}
                </>
              )}

              {!loading && presets.length === 0 && (
                <div className={styles.empty}>No presets available</div>
              )}
            </>
          )}
        </div>

        {/* Save preset area */}
        {!saving ? (
          <button
            className={styles.saveBtn}
            onClick={() => setSaving(true)}
          >
            Save Preset...
          </button>
        ) : (
          <div className={styles.saveRow}>
            <input
              ref={saveInputRef}
              className={styles.saveInput}
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Preset name..."
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleSavePreset();
                if (e.key === 'Escape') { setSaving(false); setSaveName(''); }
              }}
            />
          </div>
        )}
      </div>
    </>
  );
};
