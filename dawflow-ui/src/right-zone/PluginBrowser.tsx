import React, { useEffect, useState } from 'react';
import { ipc, type PluginInfo } from '../services/ipc';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import styles from './PluginBrowser.module.css';

export const PluginBrowser: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);

  useEffect(() => {
    ipc.getAvailablePlugins()
      .then((data) => { if (Array.isArray(data)) setPlugins(data); })
      .catch((e) => console.warn('[IPC]', e));
  }, []);

  const filtered = plugins.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      || p.creator.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = [...new Set(plugins.map(p => p.type))];

  const [loadingPlugin, setLoadingPlugin] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleLoadPlugin = (plugin: PluginInfo) => {
    if (!selectedTrackId) {
      setLoadError('Select a track first');
      setTimeout(() => setLoadError(null), 2000);
      return;
    }
    setLoadingPlugin(plugin.name);
    setLoadError(null);
    ipc.loadPlugin(selectedTrackId, plugin.name)
      .then(() => {
        useSessionStore.getState().fetchFromEngine();
        setLoadingPlugin(null);
      })
      .catch((err) => {
        setLoadError(String(err));
        setLoadingPlugin(null);
      });
  };

  return (
    <div className={styles.browser}>
      <input
        className={styles.search}
        type="text"
        placeholder="Search plugins..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <div className={styles.filters}>
        <button
          className={typeFilter === 'all' ? styles.filterActive : styles.filterBtn}
          onClick={() => setTypeFilter('all')}
        >All ({plugins.length})</button>
        {types.map((t) => (
          <button
            key={t}
            className={typeFilter === t ? styles.filterActive : styles.filterBtn}
            onClick={() => setTypeFilter(t)}
          >{t}</button>
        ))}
      </div>
      <div className={styles.list}>
        {filtered.slice(0, 200).map((p, i) => (
          <div key={i} className={styles.pluginRow} onDoubleClick={() => handleLoadPlugin(p)}>
            <span className={styles.pluginType}>{p.type}</span>
            <span className={styles.pluginName}>{p.name}</span>
            <span className={styles.pluginCreator}>{p.creator}</span>
          </div>
        ))}
        {filtered.length === 0 && <div className={styles.empty}>No plugins found</div>}
      </div>
      {loadingPlugin && <div className={styles.hint}>Loading {loadingPlugin}...</div>}
      {loadError && <div className={styles.hint} style={{ color: '#e04040' }}>{loadError}</div>}
      {!selectedTrackId && !loadError && <div className={styles.hint}>Select a track, then double-click a plugin to load it</div>}
    </div>
  );
};
