import React, { useEffect, useState } from 'react';
import { ipc } from '../services/ipc';
import styles from './InsertSlots.module.css';

interface TrackPlugin {
  processor_id: string;
  name: string;
  enabled: boolean;
  index: number;
}

interface Props {
  trackId: string;
}

export const InsertSlots: React.FC<Props> = ({ trackId }) => {
  const [plugins, setPlugins] = useState<TrackPlugin[]>([]);

  useEffect(() => {
    if (!trackId) return;
    ipc.call<{ plugins: TrackPlugin[] }>('daw.get_track_plugins', { track_id: trackId })
      .then((data) => { if (data?.plugins) setPlugins(data.plugins); })
      .catch((e) => console.warn('[IPC]', e));
  }, [trackId]);

  const handleToggleBypass = (procId: string, enabled: boolean) => {
    ipc.call('daw.set_plugin_enabled', {
      track_id: trackId,
      processor_id: procId,
      enabled: !enabled,
    }).then(() => {
      // Refresh plugin list
      ipc.call<{ plugins: TrackPlugin[] }>('daw.get_track_plugins', { track_id: trackId })
        .then((data) => { if (data?.plugins) setPlugins(data.plugins); });
    }).catch((e) => console.warn('[IPC]', e));
  };

  // Merge real plugins with empty slots (8 total)
  const slots = Array.from({ length: 8 }, (_, i) => plugins[i] || null);

  return (
    <div className={styles.insertSlots}>
      <span className={styles.sectionLabel}>Pre-Fader</span>

      {slots.map((slot, i) => (
        <React.Fragment key={i}>
          {i === 6 && (
            <>
              <div className={styles.separator} />
              <span className={styles.sectionLabel}>Post-Fader</span>
            </>
          )}

          <div className={styles.slot}>
            <span
              className={`${styles.bypassDot} ${slot?.enabled ? styles.bypassDotActive : ''}`}
              onClick={() => slot && handleToggleBypass(slot.processor_id, slot.enabled)}
              style={{ cursor: slot ? 'pointer' : 'default' }}
            />
            <span className={styles.slotIndex}>{i + 1}</span>
            <span
              className={`${styles.pluginName} ${slot ? styles.pluginNameLoaded : ''}`}
            >
              {slot?.name || 'empty'}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
