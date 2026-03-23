import React, { useEffect, useState, useCallback, useRef } from 'react';
import { engine } from '../engine/registry';
import styles from './SidechainPanel.module.css';

/* ---------------------------------------------------------------------------
   SidechainPanel — Floating panel for sidechain routing on a plugin
   Shows available audio/MIDI sources and lets the user connect or disconnect.
   --------------------------------------------------------------------------- */

export interface SidechainPanelProps {
  trackId: string;
  processorId: string;
  pluginName: string;
  onClose: () => void;
}

interface SidechainConnection {
  port: string;
  connected_to: string[];
}

export const SidechainPanel: React.FC<SidechainPanelProps> = ({
  trackId,
  processorId,
  pluginName,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // State
  const [supported, setSupported] = useState<boolean | null>(null); // null = loading
  const [audioSources, setAudioSources] = useState<string[]>([]);
  const [midiSources, setMidiSources] = useState<string[]>([]);
  const [connections, setConnections] = useState<SidechainConnection[]>([]);
  const [loading, setLoading] = useState(true);

  /** Derive the currently-connected source port (first connection, if any). */
  const connectedSource = connections.length > 0 && connections[0].connected_to.length > 0
    ? connections[0].connected_to[0]
    : null;

  /* ---- Fetch sidechain state ---- */
  const refresh = useCallback(async () => {
    try {
      // 1. Check if plugin supports sidechain
      const hasResult = await engine.sidechain.has(trackId, processorId);
      if (!hasResult.has_sidechain) {
        setSupported(false);
        setLoading(false);
        return;
      }
      setSupported(true);

      // 2. Fetch available sources and current connections in parallel
      const [sourcesResult, inputResult] = await Promise.all([
        engine.sidechain.listAvailableSources(trackId, processorId),
        engine.sidechain.getInput(trackId, processorId),
      ]);

      setAudioSources(sourcesResult.audio_sources ?? []);
      setMidiSources(sourcesResult.midi_sources ?? []);
      setConnections(inputResult.connections ?? []);
    } catch (err) {
      console.warn('[SidechainPanel] failed to load sidechain state', err);
      setSupported(false);
    } finally {
      setLoading(false);
    }
  }, [trackId, processorId]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- Connect to a source ---- */
  const handleConnect = useCallback(async (sourcePort: string) => {
    try {
      await engine.sidechain.connect(trackId, processorId, sourcePort);
      await refresh();
    } catch (err) {
      console.warn('[SidechainPanel] connect failed', err);
    }
  }, [trackId, processorId, refresh]);

  /* ---- Disconnect sidechain ---- */
  const handleDisconnect = useCallback(async () => {
    try {
      await engine.sidechain.disconnect(trackId, processorId);
      await refresh();
    } catch (err) {
      console.warn('[SidechainPanel] disconnect failed', err);
    }
  }, [trackId, processorId, refresh]);

  /* ---- Close on Escape ---- */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /* ---- Render ---- */
  const hasConnection = connectedSource !== null;

  return (
    <>
      {/* Invisible overlay to capture outside clicks */}
      <div className={styles.overlay} onMouseDown={onClose} />

      <div ref={panelRef} className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>
            Sidechain: {pluginName}
          </span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close sidechain panel"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Loading state */}
          {loading && (
            <div className={styles.loading}>Loading...</div>
          )}

          {/* Plugin does not support sidechain */}
          {!loading && supported === false && (
            <div className={styles.unsupported}>
              This plugin does not support sidechain input.
            </div>
          )}

          {/* Sidechain supported — show source list */}
          {!loading && supported && (
            <>
              <span className={styles.sectionLabel}>Source:</span>

              <div className={styles.sourceList}>
                {/* None / disconnected option */}
                <button
                  className={`${styles.sourceItem} ${!hasConnection ? styles.sourceItemActive : ''}`}
                  onClick={handleDisconnect}
                >
                  <span className={`${styles.radio} ${!hasConnection ? styles.radioActive : ''}`} />
                  <span className={styles.sourceName}>None (disconnected)</span>
                </button>

                {/* Audio sources */}
                {audioSources.map((source) => {
                  const isActive = connectedSource === source;
                  return (
                    <button
                      key={source}
                      className={`${styles.sourceItem} ${isActive ? styles.sourceItemActive : ''}`}
                      onClick={() => handleConnect(source)}
                    >
                      <span className={`${styles.radio} ${isActive ? styles.radioActive : ''}`} />
                      <span className={styles.sourceName}>{source}</span>
                    </button>
                  );
                })}

                {/* MIDI sources (if any) */}
                {midiSources.length > 0 && (
                  <>
                    <div className={styles.divider} />
                    <span className={styles.sectionLabel}>MIDI:</span>
                    {midiSources.map((source) => {
                      const isActive = connectedSource === source;
                      return (
                        <button
                          key={source}
                          className={`${styles.sourceItem} ${isActive ? styles.sourceItemActive : ''}`}
                          onClick={() => handleConnect(source)}
                        >
                          <span className={`${styles.radio} ${isActive ? styles.radioActive : ''}`} />
                          <span className={styles.sourceName}>{source}</span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* No sources available */}
                {audioSources.length === 0 && midiSources.length === 0 && (
                  <div className={styles.empty}>No sources available</div>
                )}
              </div>

              <div className={styles.divider} />

              {/* Disconnect button */}
              <button
                className={`${styles.disconnectBtn} ${!hasConnection ? styles.disconnectBtnDisabled : ''}`}
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

/* ---------------------------------------------------------------------------
   SidechainBadge — Small "SC" indicator shown when a sidechain is connected.
   Usage: <SidechainBadge />
   --------------------------------------------------------------------------- */

export const SidechainBadge: React.FC = () => (
  <span className={styles.scBadge}>
    <span className={styles.scDot} />
    SC
  </span>
);
