import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { ipc, type PluginInfo } from '../services/ipc';
import { engine } from '../engine/registry';
import { useUIStore } from '../stores/ui';
import { DawContextMenu, type MenuItem } from '../shared/DawContextMenu';
import { PluginPresetBrowser } from '../components/PluginPresetBrowser';
import styles from './InsertSlots.module.css';

interface TrackPlugin {
  processor_id: string;
  name: string;
  enabled: boolean;
  index: number;
}

/** A processor from the full signal chain (used in Custom disk IO mode) */
interface ChainProcessor {
  id: string;
  name: string;
  display_name: string;
  active: boolean;
  type: 'plugin' | 'builtin';
  plugin_name?: string;
}

type DiskIOPoint = 'pre_fader' | 'post_fader' | 'custom';

interface Props {
  trackId: string;
}

// Plugin types that are instruments (to be excluded from FX list)
const INSTRUMENT_TYPES = new Set(['instrument', 'Instrument', 'VSTi', 'AUi', 'LV2i']);

// System processor names that should be visible in Custom mode
const SYSTEM_PROC_NAMES = new Set([
  'recorder', 'player', 'triggerbox', 'diskwriter', 'diskreader',
]);

// Map display names to friendly labels and colors
const SYSTEM_PROC_STYLE: Record<string, { label: string; color: string }> = {
  'recorder':    { label: 'Recorder',   color: '#8b4a3a' },
  'diskwriter':  { label: 'Recorder',   color: '#8b4a3a' },
  'player':      { label: 'Player',     color: '#8b4a3a' },
  'diskreader':  { label: 'Player',     color: '#8b4a3a' },
  'triggerbox':  { label: 'TriggerBox', color: '#4a5a8b' },
};

function isSystemProc(name: string): boolean {
  return SYSTEM_PROC_NAMES.has(name.toLowerCase());
}

function getSystemStyle(name: string): { label: string; color: string } | null {
  return SYSTEM_PROC_STYLE[name.toLowerCase()] || null;
}

export const InsertSlots: React.FC<Props> = ({ trackId }) => {
  const [plugins, setPlugins] = useState<TrackPlugin[]>([]);
  const [browserOpen, setBrowserOpen] = useState<number | null>(null);
  const [availablePlugins, setAvailablePlugins] = useState<PluginInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingPlugins, setLoadingPlugins] = useState(false);
  const browserRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Preset browser state
  const [presetBrowserSlot, setPresetBrowserSlot] = useState<number | null>(null);
  const [currentPresets, setCurrentPresets] = useState<Record<string, string>>({});

  // Disk I/O state
  const [diskIOPoint, setDiskIOPoint] = useState<DiskIOPoint>('pre_fader');
  const [signalChain, setSignalChain] = useState<ChainProcessor[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const refreshPlugins = useCallback(() => {
    if (!trackId) return;
    ipc.getTrackPlugins(trackId)
      .then((data) => { if (data?.plugins) setPlugins(data.plugins); })
      .catch((e) => console.warn('[InsertSlots] refresh failed', e));
  }, [trackId]);

  useEffect(() => { refreshPlugins(); }, [refreshPlugins]);

  // Fetch current preset name for each loaded plugin
  useEffect(() => {
    if (!trackId || plugins.length === 0) {
      setCurrentPresets({});
      return;
    }
    const names: Record<string, string> = {};
    Promise.all(
      plugins.map((p) =>
        engine.plugin.listPresets(trackId, p.processor_id)
          .then((data) => {
            if (data?.current_preset) {
              const match = data.presets?.find((pr) => pr.uri === data.current_preset);
              if (match) names[p.processor_id] = match.label;
            }
          })
          .catch(() => {})
      )
    ).then(() => setCurrentPresets(names));
  }, [trackId, plugins]);

  // Fetch disk IO point on mount / track change
  useEffect(() => {
    if (!trackId) return;
    ipc.call('daw.get_track_disk_io_point', { track_id: trackId })
      .then((res: any) => {
        if (res?.point) setDiskIOPoint(res.point as DiskIOPoint);
      })
      .catch(() => {});
  }, [trackId]);

  // Fetch signal chain when in Custom mode
  useEffect(() => {
    if (!trackId || diskIOPoint !== 'custom') {
      setSignalChain([]);
      return;
    }
    ipc.call('daw.get_signal_chain', { track_id: trackId })
      .then((res: any) => {
        if (res?.chain) setSignalChain(res.chain);
      })
      .catch(() => setSignalChain([]));
  }, [trackId, diskIOPoint, plugins]); // re-fetch when plugins change too

  const handleSetDiskIO = useCallback((point: DiskIOPoint) => {
    setDiskIOPoint(point);
    ipc.call('daw.set_track_disk_io_point', { track_id: trackId, point })
      .then(() => refreshPlugins())
      .catch((e) => console.warn('[InsertSlots] set disk IO failed', e));
  }, [trackId, refreshPlugins]);

  // Fetch available plugins when browser opens
  useEffect(() => {
    if (browserOpen === null) return;
    setLoadingPlugins(true);
    ipc.getAvailablePlugins()
      .then((plugs) => {
        const fxOnly = plugs.filter(p => {
          const type = (p.type || '').toLowerCase();
          const cat = (p.category || '').toLowerCase();
          if (INSTRUMENT_TYPES.has(p.type)) return false;
          if (type.includes('instrument') || type.includes('vsti') || type.includes('aui')) return false;
          if (cat.includes('instrument')) return false;
          return true;
        });
        setAvailablePlugins(fxOnly);
        setLoadingPlugins(false);
      })
      .catch(() => { setAvailablePlugins([]); setLoadingPlugins(false); });
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [browserOpen]);

  // Close browser on outside click
  useEffect(() => {
    if (browserOpen === null) return;
    const handler = (e: MouseEvent) => {
      if (browserRef.current && !browserRef.current.contains(e.target as Node)) {
        setBrowserOpen(null);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [browserOpen]);

  // Close on Escape
  useEffect(() => {
    if (browserOpen === null) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setBrowserOpen(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [browserOpen]);

  const handleToggleBypass = (procId: string, enabled: boolean) => {
    ipc.setPluginEnabled(trackId, procId, !enabled)
      .then(() => refreshPlugins())
      .catch((e) => console.warn('[InsertSlots] bypass toggle failed', e));
  };

  const handleRemovePlugin = (e: React.MouseEvent, procId: string) => {
    e.stopPropagation();
    ipc.removePlugin(trackId, procId)
      .then(() => refreshPlugins())
      .catch((err) => console.warn('[InsertSlots] remove failed', err));
  };

  const handleLoadPlugin = useCallback((pluginName: string) => {
    ipc.loadPlugin(trackId, pluginName)
      .then(() => {
        refreshPlugins();
        setBrowserOpen(null);
        setTimeout(() => {
          ipc.getTrackPlugins(trackId).then((data) => {
            const loaded = data?.plugins;
            if (loaded && loaded.length > 0) {
              const lastPlugin = loaded[loaded.length - 1];
              ipc.call('daw.plugin.show_native_gui', {
                track_id: trackId, processor_id: lastPlugin.processor_id,
              }).catch(() => {});
            }
          }).catch(() => {});
        }, 500);
      })
      .catch((err) => console.warn('[InsertSlots] load plugin failed', err));
  }, [trackId, refreshPlugins]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  // Group plugins by category, filtered by search
  const categorizedPlugins = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = query
      ? availablePlugins.filter(p => p.name.toLowerCase().includes(query) || (p.category || '').toLowerCase().includes(query) || (p.creator || '').toLowerCase().includes(query))
      : availablePlugins;

    const byCategory = new Map<string, PluginInfo[]>();
    for (const p of filtered) {
      const cat = p.category || 'Other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(p);
    }
    const sorted = new Map([...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    return sorted;
  }, [availablePlugins, searchQuery]);

  // Context menu for the insert slots area
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const contextMenuItems: MenuItem[] = useMemo(() => [
    {
      label: 'Disk I/O',
      onClick: () => {},
      submenu: [
        {
          label: 'Pre-Fader',
          icon: diskIOPoint === 'pre_fader' ? '✓' : '',
          onClick: () => handleSetDiskIO('pre_fader'),
        },
        {
          label: 'Post-Fader',
          icon: diskIOPoint === 'post_fader' ? '✓' : '',
          onClick: () => handleSetDiskIO('post_fader'),
        },
        {
          label: 'Custom',
          icon: diskIOPoint === 'custom' ? '✓' : '',
          onClick: () => handleSetDiskIO('custom'),
        },
      ],
    },
  ], [diskIOPoint, handleSetDiskIO]);

  // In Custom mode, extract visible system processors from the signal chain
  const systemProcessors = useMemo(() => {
    if (diskIOPoint !== 'custom') return [];
    return signalChain.filter(p => p.type === 'builtin' && isSystemProc(p.name));
  }, [diskIOPoint, signalChain]);

  // Merge real plugins with empty slots (8 total)
  const slots = Array.from({ length: 8 }, (_, i) => plugins[i] || null);

  // Disk IO point label
  const diskIOLabel = diskIOPoint === 'pre_fader' ? 'Pre-Fader'
    : diskIOPoint === 'post_fader' ? 'Post-Fader' : 'Custom';

  return (
    <div className={styles.insertSlots} onContextMenu={handleContextMenu}>
      {/* Disk IO indicator */}
      <div className={styles.diskIOBar}>
        <span className={styles.diskIOLabel}>Disk I/O</span>
        <span className={styles.diskIOValue}>{diskIOLabel}</span>
      </div>

      {/* System processors in Custom mode — shown before plugin slots */}
      {diskIOPoint === 'custom' && systemProcessors.length > 0 && (
        <div className={styles.systemProcs}>
          {systemProcessors.map((proc) => {
            const sysStyle = getSystemStyle(proc.name);
            return (
              <div
                key={proc.id}
                className={styles.systemProcSlot}
                style={{ '--sys-color': sysStyle?.color || '#555' } as React.CSSProperties}
              >
                <span
                  className={`${styles.bypassDot} ${proc.active ? styles.bypassDotActive : ''}`}
                  style={{ background: proc.active ? (sysStyle?.color || 'var(--color-bypass)') : undefined }}
                />
                <span className={styles.systemProcName}>
                  {sysStyle?.label || proc.display_name || proc.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <span className={styles.sectionLabel}>Pre-Fader</span>

      {slots.map((slot, i) => (
        <React.Fragment key={i}>
          {i === 6 && (
            <>
              <div className={styles.separator} />
              <span className={styles.sectionLabel}>Post-Fader</span>
            </>
          )}

          <div className={styles.slot} style={{ position: 'relative' }}>
            <span
              className={`${styles.bypassDot} ${slot?.enabled ? styles.bypassDotActive : ''}`}
              onClick={() => slot && handleToggleBypass(slot.processor_id, slot.enabled)}
              title={slot ? (slot.enabled ? 'Bypass' : 'Enable') : undefined}
              style={{ cursor: slot ? 'pointer' : 'default' }}
            />
            <span className={styles.slotIndex}>{i + 1}</span>
            <div className={styles.pluginNameCol}>
              <span
                className={`${styles.pluginName} ${slot ? styles.pluginNameLoaded : ''}`}
                onClick={() => {
                  if (slot) {
                    ipc.call('daw.plugin.show_native_gui', {
                      track_id: trackId, processor_id: slot.processor_id,
                    }).catch(() => {
                      useUIStore.getState().setPluginEditor({
                        open: true, trackId, pluginId: slot.processor_id, pluginName: slot.name,
                      });
                    });
                  } else {
                    setBrowserOpen(browserOpen === i ? null : i);
                  }
                }}
                title={slot ? `Edit ${slot.name}` : 'Click to browse plugins'}
              >
                {slot?.name || 'empty'}
              </span>
              {slot && currentPresets[slot.processor_id] && (
                <span className={styles.presetName}>{currentPresets[slot.processor_id]}</span>
              )}
            </div>
            {slot && (
              <button
                className={styles.presetTrigger}
                onClick={(e) => {
                  e.stopPropagation();
                  setPresetBrowserSlot(presetBrowserSlot === i ? null : i);
                }}
                title="Presets"
              >
                &#9662;
              </button>
            )}
            {slot && (
              <button
                className={styles.removeBtn}
                onClick={(e) => handleRemovePlugin(e, slot.processor_id)}
                title={`Remove ${slot.name}`}
              >
                x
              </button>
            )}

            {/* Preset Browser Dropdown */}
            {slot && presetBrowserSlot === i && (
              <PluginPresetBrowser
                trackId={trackId}
                processorId={slot.processor_id}
                pluginName={slot.name}
                onClose={() => {
                  setPresetBrowserSlot(null);
                  // Refresh preset names after closing
                  refreshPlugins();
                }}
              />
            )}

            {/* Plugin Browser Dropdown */}
            {browserOpen === i && (
              <div className={styles.pluginBrowser} ref={browserRef}>
                {/* Search bar */}
                <div className={styles.browserSearch}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#888" strokeWidth="1.2" strokeLinecap="round">
                    <circle cx="5" cy="5" r="3.5" /><line x1="7.5" y1="7.5" x2="10.5" y2="10.5" />
                  </svg>
                  <input
                    ref={searchRef}
                    className={styles.browserSearchInput}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search plugins..."
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>

                {/* No Effect option */}
                <button
                  className={styles.browserItem}
                  onClick={() => setBrowserOpen(null)}
                >
                  No Effect
                </button>

                <div className={styles.browserDivider} />

                {/* Plugin list */}
                <div className={styles.browserList}>
                  {loadingPlugins && <div className={styles.browserLoading}>Loading plugins...</div>}

                  {/* If searching, show flat list */}
                  {searchQuery.trim() ? (
                    Array.from(categorizedPlugins.values()).flat().map(p => (
                      <button
                        key={p.id || p.name}
                        className={styles.browserItem}
                        onClick={() => handleLoadPlugin(p.name)}
                        title={`${p.name} — ${p.creator || 'Unknown'}`}
                      >
                        <span className={styles.browserItemName}>{p.name}</span>
                        <span className={styles.browserItemCreator}>{p.creator}</span>
                      </button>
                    ))
                  ) : (
                    /* Category tree */
                    Array.from(categorizedPlugins.entries()).map(([category, plugs]) => (
                      <div key={category}>
                        <button
                          className={styles.browserCategory}
                          onClick={() => toggleCategory(category)}
                        >
                          <span className={styles.browserCategoryArrow}>
                            {expandedCategories.has(category) ? '▼' : '►'}
                          </span>
                          <span>{category}</span>
                          <span className={styles.browserCategoryCount}>{plugs.length}</span>
                        </button>
                        {expandedCategories.has(category) && plugs.map(p => (
                          <button
                            key={p.id || p.name}
                            className={`${styles.browserItem} ${styles.browserItemIndented}`}
                            onClick={() => handleLoadPlugin(p.name)}
                            title={`${p.name} — ${p.creator || 'Unknown'}`}
                          >
                            <span className={styles.browserItemName}>{p.name}</span>
                            <span className={styles.browserItemCreator}>{p.creator}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}

                  {!loadingPlugins && categorizedPlugins.size === 0 && (
                    <div className={styles.browserEmpty}>No plugins found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </React.Fragment>
      ))}

      {/* Context menu */}
      {contextMenu && (
        <DawContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
