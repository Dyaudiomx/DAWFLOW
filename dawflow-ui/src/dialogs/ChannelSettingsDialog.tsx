import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { engine } from '../engine/registry';
import { ipc } from '../services/ipc';
import { Fader } from '../shared/Fader';
import { ChannelEQ } from '../components/ChannelEQ';
import styles from './ChannelSettingsDialog.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InsertInfo {
  processor_id: string;
  name: string;
  enabled: boolean;
  index: number;
}

interface SendDetail {
  index: number;
  name: string;
  id: string;
  enabled: boolean;
  level_db: number;
  pre_fader: boolean;
  target_id?: string;
  target_name?: string;
}

interface BusOption {
  id: string;
  name: string;
}

type BottomTab = 'inserts' | 'routing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function panToLabel(pan: number): string {
  if (Math.abs(pan) < 0.02) return 'C';
  if (pan < 0) return `L${Math.round(Math.abs(pan) * 100)}`;
  return `R${Math.round(pan * 100)}`;
}

function gainToDb(normalized: number): number {
  if (normalized <= 0) return -Infinity;
  return 20 * Math.log10(normalized / 0.75);
}

function formatDb(db: number): string {
  if (!isFinite(db)) return '-\u221E';
  if (db > 0) return `+${db.toFixed(1)}`;
  return db.toFixed(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChannelSettingsDialog: React.FC = () => {
  const channelSettingsTrackId = useUIStore((s) => s.channelSettingsTrackId);
  const setChannelSettingsTrackId = useUIStore((s) => s.setChannelSettingsTrackId);
  const tracks = useSessionStore((s) => s.tracks);

  const track = tracks.find((t) => t.id === channelSettingsTrackId) ?? null;

  // State
  const [inserts, setInserts] = useState<InsertInfo[]>([]);
  const [sends, setSends] = useState<SendDetail[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [inputGainDb, setInputGainDb] = useState(0);
  const [phaseInvert, setPhaseInvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('inserts');
  const [meterLevels, setMeterLevels] = useState<number[]>([0, 0]);
  const [inputPorts, setInputPorts] = useState<string[]>([]);
  const [outputPorts, setOutputPorts] = useState<string[]>([]);
  const [selectedInput, setSelectedInput] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  // Insert drag state
  const [dragInsert, setDragInsert] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Insert browser state
  const [browserSlot, setBrowserSlot] = useState<number | null>(null);
  const [availablePlugins, setAvailablePlugins] = useState<Array<{ name: string; category: string; creator: string }>>([]);
  const [browserSearch, setBrowserSearch] = useState('');
  const browserRef = useRef<HTMLDivElement>(null);
  const browserSearchRef = useRef<HTMLInputElement>(null);

  // Send dropdown state
  const [sendDropdown, setSendDropdown] = useState<number | null>(null);

  // Dialog position
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ── Center on first open ──────────────────────────────────────

  useEffect(() => {
    if (channelSettingsTrackId && !position) {
      setPosition({
        x: Math.round((window.innerWidth - 1200) / 2),
        y: Math.round((window.innerHeight - 740) / 2),
      });
    }
    if (!channelSettingsTrackId) {
      setPosition(null);
    }
  }, [channelSettingsTrackId]);

  // ── Fetch data when track changes ─────────────────────────────

  useEffect(() => {
    if (!channelSettingsTrackId) {
      setInserts([]);
      setSends([]);
      setInputGainDb(0);
      setPhaseInvert(false);
      return;
    }

    setLoading(true);
    const tid = channelSettingsTrackId;

    // Fetch inserts
    engine.plugin.getTrackPlugins(tid)
      .then((data) => {
        const plugins = data?.plugins ?? [];
        // Filter out a-EQ from visible inserts (it's shown in the EQ section)
        setInserts(plugins.filter(p => !p.name.toLowerCase().includes('a-eq')));
      })
      .catch(() => setInserts([]));

    // Fetch sends
    engine.send.getAllDetails(tid)
      .then((data) => setSends(data?.sends ?? []))
      .catch(() => setSends([]));

    // Fetch I/O routing
    engine.routing.getTrackIo(tid)
      .then((data) => {
        if (data?.inputs?.[0]?.connections?.[0]) setSelectedInput(data.inputs[0].connections[0]);
        if (data?.outputs?.[0]?.connections?.[0]) setSelectedOutput(data.outputs[0].connections[0]);
      })
      .catch(() => {});

    // Fetch available ports
    engine.routing.getAvailablePorts()
      .then((data) => {
        setInputPorts(data?.audio_inputs ?? []);
        setOutputPorts(data?.audio_outputs ?? []);
      })
      .catch(() => {});

    // Fetch buses for send destinations (exclude self + master bus to prevent crashes)
    ipc.getTracks()
      .then((tracks) => setBuses(
        tracks
          .filter(t => t.type === 'bus' && t.id !== tid && t.name.toLowerCase() !== 'master')
          .map(b => ({ id: b.id, name: b.name }))
      ))
      .catch(() => {});

    setLoading(false);
  }, [channelSettingsTrackId]);

  // ── Meter polling ─────────────────────────────────────────────

  useEffect(() => {
    if (!channelSettingsTrackId) return;
    const tid = channelSettingsTrackId;
    const poll = setInterval(() => {
      engine.meter.getRouteMeterLevels(tid)
        .then((data) => {
          if (data?.channels) {
            const levels = data.channels.map((ch: any) => {
              const db = ch.peak_dB ?? -100;
              return Math.max(0, Math.min(1, (db + 60) / 66));
            });
            setMeterLevels(levels.length >= 2 ? levels : [levels[0] ?? 0, levels[0] ?? 0]);
          }
        })
        .catch(() => {});
    }, 100);
    return () => clearInterval(poll);
  }, [channelSettingsTrackId]);

  // ── Plugin browser ────────────────────────────────────────────

  useEffect(() => {
    if (browserSlot === null) return;
    ipc.getAvailablePlugins()
      .then((plugs) => {
        const fxOnly = plugs.filter(p => {
          const type = (p.type || '').toLowerCase();
          const cat = (p.category || '').toLowerCase();
          if (type.includes('instrument') || cat.includes('instrument')) return false;
          return true;
        });
        setAvailablePlugins(fxOnly);
      })
      .catch(() => setAvailablePlugins([]));
    requestAnimationFrame(() => browserSearchRef.current?.focus());
  }, [browserSlot]);

  // Close browser on outside click
  useEffect(() => {
    if (browserSlot === null) return;
    const handler = (e: MouseEvent) => {
      if (browserRef.current && !browserRef.current.contains(e.target as Node)) {
        setBrowserSlot(null);
        setBrowserSearch('');
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [browserSlot]);

  const filteredPlugins = useMemo(() => {
    const q = browserSearch.toLowerCase().trim();
    if (!q) return availablePlugins;
    return availablePlugins.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.creator || '').toLowerCase().includes(q)
    );
  }, [availablePlugins, browserSearch]);

  // ── Drag handling (title bar) ─────────────────────────────────

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = position ?? { x: 0, y: 0 };
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const onMove = (me: MouseEvent) => setPosition({ x: me.clientX - startX, y: me.clientY - startY });
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [position]);

  // ── Engine actions ────────────────────────────────────────────

  const handleMute = useCallback(() => {
    if (!track) return;
    engine.track.setMute(track.id, !track.muted).catch(() => {});
  }, [track]);

  const handleSolo = useCallback(() => {
    if (!track) return;
    engine.track.setSolo(track.id, !track.solo).catch(() => {});
  }, [track]);

  const handleRecord = useCallback(() => {
    if (!track) return;
    engine.track.setRecord(track.id, !track.recordEnabled).catch(() => {});
  }, [track]);

  const handleMonitor = useCallback(() => {
    if (!track) return;
    const newMode = track.monitorEnabled ? 'off' : 'input';
    engine.track.setMonitoring(track.id, newMode).catch(() => {});
  }, [track]);

  const handleListen = useCallback(() => {
    if (!track) return;
    engine.track.setListen(track.id, true).catch(() => {});
  }, [track]);

  const handlePhaseToggle = useCallback(() => {
    if (!track) return;
    const newPhase = !phaseInvert;
    setPhaseInvert(newPhase);
    engine.track.setPhaseInvert(track.id, newPhase).catch(() => {});
  }, [track, phaseInvert]);

  const handleInputGainChange = useCallback((valStr: string) => {
    if (!track) return;
    const db = parseFloat(valStr);
    if (isNaN(db)) return;
    const clamped = Math.max(-20, Math.min(20, db));
    setInputGainDb(clamped);
    engine.track.setTrim(track.id, clamped).catch(() => {});
  }, [track]);

  const handleVolumeChange = useCallback((v: number) => {
    if (!track) return;
    const db = gainToDb(v);
    engine.track.setGain(track.id, isFinite(db) ? db : -96).catch(() => {});
  }, [track]);

  const handlePanChange = useCallback((valStr: string) => {
    if (!track) return;
    let pan = 0;
    const clean = valStr.trim().toUpperCase();
    if (clean === 'C' || clean === '0') pan = 0;
    else if (clean.startsWith('L')) pan = -parseInt(clean.slice(1)) / 100;
    else if (clean.startsWith('R')) pan = parseInt(clean.slice(1)) / 100;
    else pan = parseFloat(valStr);
    if (isNaN(pan)) return;
    pan = Math.max(-1, Math.min(1, pan));
    engine.track.setPan(track.id, pan).catch(() => {});
  }, [track]);

  const handleAutomationRead = useCallback(() => {
    if (!track) return;
    const newMode = track.readAutomation ? 'off' : 'read';
    engine.automation.setState(track.id, newMode).catch(() => {});
  }, [track]);

  const handleAutomationWrite = useCallback(() => {
    if (!track) return;
    const newMode = track.writeAutomation ? 'off' : 'write';
    engine.automation.setState(track.id, newMode).catch(() => {});
  }, [track]);

  // ── Insert actions ────────────────────────────────────────────

  const refreshInserts = useCallback(() => {
    if (!track) return;
    engine.plugin.getTrackPlugins(track.id)
      .then((data) => {
        const plugins = data?.plugins ?? [];
        setInserts(plugins.filter(p => !p.name.toLowerCase().includes('a-eq')));
      })
      .catch(() => {});
  }, [track]);

  const handleInsertBypassToggle = useCallback((insert: InsertInfo) => {
    if (!track) return;
    engine.plugin.setEnabled(track.id, insert.processor_id, !insert.enabled)
      .then(() => refreshInserts())
      .catch(() => {});
  }, [track, refreshInserts]);

  const handleInsertClick = useCallback((insert: InsertInfo) => {
    if (!track) return;
    ipc.call('daw.plugin.show_native_gui', {
      track_id: track.id, processor_id: insert.processor_id,
    }).catch(() => {
      useUIStore.getState().setPluginEditor({
        open: true, trackId: track.id, pluginId: insert.processor_id, pluginName: insert.name,
      });
    });
  }, [track]);

  const handleInsertRemove = useCallback((e: React.MouseEvent, procId: string) => {
    e.stopPropagation();
    if (!track) return;
    engine.plugin.remove(track.id, procId)
      .then(() => refreshInserts())
      .catch(() => {});
  }, [track, refreshInserts]);

  const handleLoadPlugin = useCallback((pluginName: string) => {
    if (!track) return;
    ipc.loadPlugin(track.id, pluginName)
      .then(() => {
        refreshInserts();
        setBrowserSlot(null);
        setBrowserSearch('');
        setTimeout(() => {
          engine.plugin.getTrackPlugins(track.id).then((data) => {
            const loaded = data?.plugins;
            if (loaded?.length) {
              const last = loaded[loaded.length - 1];
              ipc.call('daw.plugin.show_native_gui', { track_id: track.id, processor_id: last.processor_id }).catch(() => {});
            }
          }).catch(() => {});
        }, 500);
      })
      .catch(() => {});
  }, [track, refreshInserts]);

  // Insert drag-to-reorder
  const handleInsertDragStart = useCallback((e: React.DragEvent, slotIndex: number) => {
    setDragInsert(slotIndex);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleInsertDragOver = useCallback((e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot(slotIndex);
  }, []);

  const handleInsertDrop = useCallback((e: React.DragEvent, targetSlot: number) => {
    e.preventDefault();
    if (dragInsert === null || !track) return;
    const sourcePlugin = inserts[dragInsert];
    if (!sourcePlugin) return;

    // Build new processor_id order by moving source to target position
    const ids = inserts.map(p => p.processor_id);
    const sourceIdx = ids.indexOf(sourcePlugin.processor_id);
    if (sourceIdx === -1) { setDragInsert(null); setDragOverSlot(null); return; }
    ids.splice(sourceIdx, 1);
    const insertAt = Math.min(targetSlot, ids.length);
    ids.splice(insertAt, 0, sourcePlugin.processor_id);

    ipc.call('daw.reorder_plugins', {
      track_id: track.id,
      processor_ids: ids,
    })
      .then(() => refreshInserts())
      .catch(() => {});

    setDragInsert(null);
    setDragOverSlot(null);
  }, [dragInsert, track, inserts, refreshInserts]);

  // ── Send actions ──────────────────────────────────────────────

  const refreshSends = useCallback(() => {
    if (!track) return;
    engine.send.getAllDetails(track.id)
      .then((data) => setSends(data?.sends ?? []))
      .catch(() => {});
  }, [track]);

  const handleSendLevelChange = useCallback((sendIndex: number, dbStr: string) => {
    if (!track) return;
    const db = parseFloat(dbStr);
    if (isNaN(db)) return;
    engine.send.setLevelDb(track.id, sendIndex, db)
      .then(() => {
        setSends(prev => prev.map(s => s.index === sendIndex ? { ...s, level_db: db } : s));
      })
      .catch(() => {});
  }, [track]);

  const handleSendEnableToggle = useCallback((sendIndex: number, enabled: boolean) => {
    if (!track) return;
    engine.send.setEnable(track.id, sendIndex, !enabled)
      .then(() => setSends(prev => prev.map(s => s.index === sendIndex ? { ...s, enabled: !s.enabled } : s)))
      .catch(() => {});
  }, [track]);

  const handleSendPrePostToggle = useCallback((sendIndex: number, currentPre: boolean) => {
    if (!track) return;
    const newPre = !currentPre;
    ipc.call('daw.send.set_pre_fader', { track_id: track.id, send_index: sendIndex, pre_fader: newPre })
      .then(() => setSends(prev => prev.map(s => s.index === sendIndex ? { ...s, pre_fader: newPre } : s)))
      .catch(() => {});
  }, [track]);

  const handleSendDestinationSelect = useCallback((sendIndex: number, bus: BusOption) => {
    if (!track) return;
    const existing = sends[sendIndex];
    setSendDropdown(null);

    if (existing?.target_id) {
      // Remove old send, add new
      ipc.call('daw.aux.remove_send_from', { bus_id: existing.target_id, track_id: track.id })
        .catch(() => {})
        .finally(() => {
          ipc.call('daw.add_send', { track_id: track.id, target_bus_id: bus.id })
            .then(() => refreshSends())
            .catch(() => {});
        });
    } else {
      ipc.call('daw.add_send', { track_id: track.id, target_bus_id: bus.id })
        .then(() => refreshSends())
        .catch(() => {});
    }
  }, [track, sends, refreshSends]);

  // ── Navigation ────────────────────────────────────────────────

  const handleClose = useCallback(() => setChannelSettingsTrackId(null), [setChannelSettingsTrackId]);

  const handlePrevTrack = useCallback(() => {
    if (!track) return;
    const idx = tracks.findIndex(t => t.id === track.id);
    if (idx > 0) setChannelSettingsTrackId(tracks[idx - 1].id);
  }, [track, tracks, setChannelSettingsTrackId]);

  const handleNextTrack = useCallback(() => {
    if (!track) return;
    const idx = tracks.findIndex(t => t.id === track.id);
    if (idx < tracks.length - 1) setChannelSettingsTrackId(tracks[idx + 1].id);
  }, [track, tracks, setChannelSettingsTrackId]);

  const handleInputChange = useCallback((port: string) => {
    if (!track) return;
    setSelectedInput(port);
    engine.routing.setTrackInput(track.id, port).catch(() => {});
  }, [track]);

  const handleOutputChange = useCallback((port: string) => {
    if (!track) return;
    setSelectedOutput(port);
    engine.routing.setTrackOutput(track.id, port).catch(() => {});
  }, [track]);

  const handleTrackNameSubmit = useCallback(() => {
    if (!track || !nameValue.trim()) { setEditingName(false); return; }
    ipc.call('daw.rename_track', { track_id: track.id, name: nameValue.trim() }).catch(() => {});
    setEditingName(false);
  }, [track, nameValue]);

  // ── Early return ──────────────────────────────────────────────

  if (!channelSettingsTrackId || !track) return null;

  const trackIndex = tracks.findIndex(t => t.id === track.id) + 1;
  const panValue = track.pan ?? 0;
  const volumeDb = gainToDb(track.volume);

  // Pad inserts to 8 slots
  const insertSlots: Array<InsertInfo | null> = Array.from({ length: 8 }, (_, i) =>
    inserts.find(ins => ins.index === i) ?? null
  );

  // Pad sends to 4 slots
  const sendSlots: Array<SendDetail | null> = Array.from({ length: 4 }, (_, i) =>
    sends.find(s => s.index === i) ?? null
  );

  return (
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
      >
        {/* ===== TITLE BAR ===== */}
        <div className={styles.titleBar} onMouseDown={handleTitleMouseDown}>
          <span className={styles.titleText}>Channel Settings : {track.name}</span>
          <span className={styles.titleDim}>[{track.type === 'audio' ? 'stereo' : track.type}]</span>
          <span className={styles.titleSpacer} />
          <button className={styles.closeBtn} onClick={handleClose}>x</button>
        </div>

        {/* ===== NAVIGATION BAR ===== */}
        <div className={styles.navBar}>
          <button className={styles.navBtn} onClick={handlePrevTrack} title="Previous Channel">&larr;</button>
          <button className={styles.navBtn} onClick={handleNextTrack} title="Next Channel">&rarr;</button>

          <select
            className={styles.navSelect}
            value={selectedInput}
            onChange={(e) => handleInputChange(e.target.value)}
            title="Input Routing"
          >
            <option value="">Input</option>
            {inputPorts.map(p => <option key={p} value={p}>{p.split(':').pop() ?? p}</option>)}
          </select>

          <span className={styles.navArrow}>&larr;</span>

          {editingName ? (
            <input
              className={styles.navTrackNameInput}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleTrackNameSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTrackNameSubmit(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
            />
          ) : (
            <span
              className={styles.navTrackName}
              onDoubleClick={() => { setNameValue(track.name); setEditingName(true); }}
            >
              {track.name}
            </span>
          )}

          <span className={styles.navArrow}>&rarr;</span>

          <select
            className={styles.navSelect}
            value={selectedOutput}
            onChange={(e) => handleOutputChange(e.target.value)}
            title="Output Routing"
          >
            <option value="">Output</option>
            {outputPorts.map(p => <option key={p} value={p}>{p.split(':').pop() ?? p}</option>)}
          </select>

          <span className={styles.navSpacer} />
        </div>

        {/* ===== MAIN BODY (5 columns) ===== */}
        {loading ? (
          <div className={styles.loadingWrap}>Loading channel data...</div>
        ) : (
          <div className={styles.body}>
            {/* ──── COL 1: INSERTS ──── */}
            <div className={`${styles.panel} ${styles.insertsPanel}`}>
              <div className={styles.panelHeader}>
                <span className={styles.panelLabel}>Inserts</span>
              </div>
              <div className={styles.panelContent}>
                <span className={styles.sectionTag}>Pre-Fader</span>
                {insertSlots.map((ins, i) => (
                  <React.Fragment key={i}>
                    {i === 6 && (
                      <>
                        <div className={styles.insertDivider} />
                        <span className={styles.sectionTag}>Post-Fader</span>
                      </>
                    )}
                    <div
                      className={`${styles.insertSlotRow} ${dragOverSlot === i ? styles.insertSlotDragOver : ''}`}
                      draggable={!!ins}
                      onDragStart={(e) => ins && handleInsertDragStart(e, i)}
                      onDragOver={(e) => handleInsertDragOver(e, i)}
                      onDrop={(e) => handleInsertDrop(e, i)}
                      onDragEnd={() => { setDragInsert(null); setDragOverSlot(null); }}
                      onClick={() => {
                        if (ins) handleInsertClick(ins);
                        else setBrowserSlot(browserSlot === i ? null : i);
                      }}
                      style={{ position: 'relative' }}
                    >
                      <span className={styles.insertIndex}>{i + 1}</span>
                      <span
                        className={`${styles.insertBypass} ${ins ? (ins.enabled ? styles.insertBypassActive : styles.insertBypassOff) : ''}`}
                        onClick={(e) => { e.stopPropagation(); if (ins) handleInsertBypassToggle(ins); }}
                      />
                      <span className={`${styles.insertName} ${!ins ? styles.insertEmpty : ''}`}>
                        {ins?.name || 'empty'}
                      </span>
                      {ins && (
                        <button
                          className={styles.insertRemoveBtn}
                          onClick={(e) => handleInsertRemove(e, ins.processor_id)}
                          title={`Remove ${ins.name}`}
                        >
                          x
                        </button>
                      )}

                      {/* Plugin browser dropdown */}
                      {browserSlot === i && (
                        <div className={styles.pluginBrowser} ref={browserRef}>
                          <div className={styles.browserSearchRow}>
                            <input
                              ref={browserSearchRef}
                              className={styles.browserSearchInput}
                              type="text"
                              value={browserSearch}
                              onChange={(e) => setBrowserSearch(e.target.value)}
                              placeholder="Search plugins..."
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className={styles.browserList}>
                            {filteredPlugins.slice(0, 50).map(p => (
                              <button
                                key={p.name}
                                className={styles.browserItem}
                                onClick={(e) => { e.stopPropagation(); handleLoadPlugin(p.name); }}
                              >
                                <span className={styles.browserItemName}>{p.name}</span>
                                <span className={styles.browserItemMeta}>{p.creator}</span>
                              </button>
                            ))}
                            {filteredPlugins.length === 0 && (
                              <div className={styles.browserEmpty}>No plugins found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ──── COL 2: CHANNEL STRIP ──── */}
            <div className={`${styles.panel} ${styles.stripPanel}`}>
              <div className={styles.panelHeader}>
                <span className={styles.panelLabel}>Channel Strip</span>
              </div>
              <div className={styles.panelContent}>
                <div className={styles.stripSection}>
                  <span className={styles.stripLabel}>Input Gain</span>
                  <input
                    className={styles.stripValueField}
                    type="text"
                    value={`${inputGainDb >= 0 ? '+' : ''}${inputGainDb.toFixed(1)}`}
                    onChange={(e) => handleInputGainChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                    title="Input Gain (dB)"
                  />
                  <span className={styles.stripUnit}>dB</span>

                  <span className={styles.stripLabel}>Phase</span>
                  <button
                    className={`${styles.phaseBtn} ${phaseInvert ? styles.phaseBtnActive : ''}`}
                    onClick={handlePhaseToggle}
                    title="Phase Invert"
                  >
                    {'\u00D8'}
                  </button>

                  <span className={styles.stripLabel}>Pan</span>
                  <input
                    className={styles.stripValueField}
                    type="text"
                    value={panToLabel(panValue)}
                    onChange={(e) => handlePanChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                    title="Pan"
                  />
                </div>
              </div>
            </div>

            {/* ──── COL 3: EQUALIZER ──── */}
            <div className={`${styles.panel} ${styles.eqPanel}`}>
              <div className={styles.panelHeader}>
                <span className={styles.panelLabel}>Equalizer</span>
              </div>
              <div className={styles.eqContent}>
                <ChannelEQ trackId={channelSettingsTrackId} />
              </div>
            </div>

            {/* ──── COL 4: SENDS ──── */}
            <div className={`${styles.panel} ${styles.sendsPanel}`}>
              <div className={styles.panelHeader}>
                <span className={styles.panelLabel}>Sends</span>
              </div>
              <div className={styles.panelContent}>
                {sendSlots.map((send, i) => {
                  const isPre = send?.pre_fader ?? true;
                  return (
                    <div
                      key={i}
                      className={styles.sendSlot}
                      style={{ borderLeft: send ? `3px solid ${isPre ? '#c07030' : '#4a6a8a'}` : '3px solid transparent' }}
                    >
                      <div className={styles.sendHeader}>
                        <span
                          className={`${styles.sendDot} ${send?.enabled ? styles.sendDotActive : ''}`}
                          onClick={() => send && handleSendEnableToggle(send.index, send.enabled)}
                        />
                        <span
                          className={`${styles.sendName} ${!send ? styles.sendEmpty : ''}`}
                          onClick={() => setSendDropdown(sendDropdown === i ? null : i)}
                          style={{ position: 'relative', cursor: 'pointer' }}
                        >
                          {send ? (send.target_name || send.name || `Send ${i + 1}`) : 'empty'}
                        </span>
                        {send && (
                          <button
                            className={styles.sendPrePostBtn}
                            onClick={() => handleSendPrePostToggle(send.index, send.pre_fader)}
                            title={isPre ? 'Pre-Fader (click for Post)' : 'Post-Fader (click for Pre)'}
                            style={{ color: isPre ? '#c07030' : '#4a6a8a' }}
                          >
                            {isPre ? 'Pre' : 'Pst'}
                          </button>
                        )}
                      </div>

                      {/* Destination dropdown */}
                      {sendDropdown === i && (
                        <div className={styles.sendDropdown}>
                          {buses.map(bus => (
                            <button
                              key={bus.id}
                              className={styles.sendDropdownItem}
                              onClick={() => handleSendDestinationSelect(i, bus)}
                            >
                              {bus.name}
                            </button>
                          ))}
                          {buses.length === 0 && <div className={styles.sendDropdownEmpty}>No buses</div>}
                        </div>
                      )}

                      {send && (
                        <div className={styles.sendLevelRow}>
                          <input
                            className={styles.sendLevelInput}
                            type="text"
                            value={send.level_db?.toFixed(1) ?? '0.0'}
                            onChange={(e) => handleSendLevelChange(send.index, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                            title="Send level (dB)"
                          />
                          <span className={styles.sendUnit}>dB</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ──── COL 5: FADER STRIP ──── */}
            <div className={styles.miniStrip}>
              {/* M / S */}
              <div className={styles.miniStripBtns}>
                <button
                  className={`${styles.miniBtnMute} ${track.muted ? styles.miniBtnMuteActive : ''}`}
                  onClick={handleMute} title="Mute"
                >M</button>
                <button
                  className={`${styles.miniBtnSolo} ${track.solo ? styles.miniBtnSoloActive : ''}`}
                  onClick={handleSolo} title="Solo"
                >S</button>
              </div>

              {/* L / e */}
              <div className={styles.miniStripBtns}>
                <button className={styles.miniBtnListen} onClick={handleListen} title="Listen">L</button>
                <button className={styles.miniBtnEdit} title="Edit Channel"><em>e</em></button>
              </div>

              {/* Pan display */}
              <div className={styles.miniPan}>{panToLabel(panValue)}</div>

              {/* Fader */}
              <div className={styles.miniFaderWrap}>
                <Fader
                  value={track.volume}
                  onChange={handleVolumeChange}
                  height={280}
                  orientation="vertical"
                  color={track.color}
                  showScale={true}
                />
              </div>

              {/* Meter */}
              <div className={styles.miniMeterWrap}>
                <div className={styles.miniMeterBar}>
                  <div className={styles.miniMeterFill} style={{ height: `${meterLevels[0] * 100}%` }} />
                </div>
                <div className={styles.miniMeterBar}>
                  <div className={styles.miniMeterFill} style={{ height: `${meterLevels[1] * 100}%` }} />
                </div>
              </div>

              {/* dB readout */}
              <div className={styles.miniDbReadout}>{formatDb(volumeDb)} dB</div>

              {/* R / W */}
              <div className={styles.miniStripBtns}>
                <button
                  className={`${styles.miniBtnRead} ${track.readAutomation ? styles.miniBtnReadActive : ''}`}
                  onClick={handleAutomationRead} title="Read Automation"
                >R</button>
                <button
                  className={`${styles.miniBtnWrite} ${track.writeAutomation ? styles.miniBtnWriteActive : ''}`}
                  onClick={handleAutomationWrite} title="Write Automation"
                >W</button>
              </div>

              {/* Record / Monitor */}
              <div className={styles.miniStripBtns}>
                <button
                  className={`${styles.miniBtnRec} ${track.recordEnabled ? styles.miniBtnRecActive : ''}`}
                  onClick={handleRecord} title="Record Arm"
                >*</button>
                <button
                  className={`${styles.miniBtnMon} ${track.monitorEnabled ? styles.miniBtnMonActive : ''}`}
                  onClick={handleMonitor} title="Monitor"
                >M</button>
              </div>

              {/* Track info */}
              <div className={styles.miniTrackInfo}>
                <div className={styles.miniColorBar} style={{ backgroundColor: track.color }} />
                <span className={styles.miniTrackNumber}>{trackIndex}</span>
                <span className={styles.miniTrackName}>{track.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== BOTTOM TAB BAR ===== */}
        <div className={styles.bottomBar}>
          <button
            className={`${styles.bottomTab} ${bottomTab === 'inserts' ? styles.bottomTabActive : ''}`}
            onClick={() => setBottomTab('inserts')}
          >Inserts</button>
          <button
            className={`${styles.bottomTab} ${bottomTab === 'routing' ? styles.bottomTabActive : ''}`}
            onClick={() => setBottomTab('routing')}
          >Routing</button>
          <span className={styles.bottomSpacer} />
        </div>
      </div>
    </div>
  );
};
