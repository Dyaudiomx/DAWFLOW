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

  const handleLoadPlugin = (plugin: PluginInfo) => {
    if (!selectedTrackId) return;
    ipc.loadPlugin(selectedTrackId, plugin.id)
      .then(() => useSessionStore.getState().fetchFromEngine())
      .catch((err) => console.error('[DAWFLOW] Plugin load failed:', err));
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
      {!selectedTrackId && <div className={styles.hint}>Select a track to load plugins</div>}
    </div>
  );
};
