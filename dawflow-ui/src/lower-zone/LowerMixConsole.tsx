import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../stores/session';
import { useMixerStore } from '../stores/mixer';
import { useMeterStore } from '../stores/meters';
import { useUIStore } from '../stores/ui';
import { ipc } from '../services/ipc';
import { engine } from '../engine/registry';
import { Fader } from '../shared/Fader';
import { Knob } from '../shared/Knob';
import styles from './LowerMixConsole.module.css';

/* ---- Send detail shape from engine.send.getAllDetails ---- */
interface SendDetail {
  index: number;
  name: string;
  id: string;
  enabled: boolean;
  role: string;
  level_db: number;
  pre_fader: boolean;
  target_id?: string;
  target_name?: string;
}

function volumeToDb(volume: number): string {
  if (volume <= 0) return '-\u221E';
  const db = 20 * Math.log10(volume / 0.75);
  if (db > 0) return `+${db.toFixed(2)}`;
  return db.toFixed(2);
}

function normalizedToDb(normalized: number): string {
  if (normalized <= 0) return '-\u221E';
  // Reverse of (level + 60) / 60 => level = normalized * 60 - 60
  const db = normalized * 60 - 60;
  if (db > 0) return `+${db.toFixed(1)}`;
  return db.toFixed(1);
}

function panToLabel(pan: number): string {
  if (Math.abs(pan) < 0.01) return 'C';
  if (pan < 0) return `L${Math.round(Math.abs(pan) * 100)}`;
  return `R${Math.round(pan * 100)}`;
}

export const LowerMixConsole: React.FC = () => {
  const tracks = useSessionStore((s) => s.tracks);
  const setTrackVolume = useSessionStore((s) => s.setTrackVolume);
  const setTrackPan = useSessionStore((s) => s.setTrackPan);
  const setTrackMute = useSessionStore((s) => s.setTrackMute);
  const setTrackSolo = useSessionStore((s) => s.setTrackSolo);
  const setTrackRecord = useSessionStore((s) => s.setTrackRecord);
  const setTrackMonitor = useSessionStore((s) => s.setTrackMonitor);

  const masterMeterL = useMixerStore((s) => s.masterMeterL);
  const masterMeterR = useMixerStore((s) => s.masterMeterR);
  const masterPeakL = useMixerStore((s) => s.masterPeakL);
  const masterPeakR = useMixerStore((s) => s.masterPeakR);
  const setMasterMeter = useMixerStore((s) => s.setMasterMeter);
  const resetMasterPeak = useMixerStore((s) => s.resetMasterPeak);

  // Peak levels are now tracked in the meter store (useMeterStore.peaks)

  // Ref for automation mode cache per track
  const automationModes = useRef<Record<string, string>>({});

  // Phase invert state per track (useState so buttons re-render)
  const [phaseInverted, setPhaseInverted] = useState<Record<string, boolean>>({});

  const resetPeak = useCallback((trackId: string) => {
    useMeterStore.getState().resetPeak(trackId);
  }, []);

  // Fetch automation mode & phase state from engine when tracks change
  useEffect(() => {
    for (const track of tracks) {
      // Skip if already cached
      if (automationModes.current[track.id] !== undefined) continue;
      ipc.getAutomationMode(track.id)
        .then((data) => {
          const mode = data.mode || 'off';
          automationModes.current[track.id] = mode;
          const session = useSessionStore.getState();
          session.updateTracks(
            session.tracks.map((t) =>
              t.id === track.id
                ? { ...t, readAutomation: mode === 'read', writeAutomation: mode === 'write' || mode === 'touch' || mode === 'latch' }
                : t
            )
          );
        })
        .catch(() => {});
      ipc.getTrackPhaseState(track.id)
        .then((data) => {
          const inverted = data.any_inverted || false;
          setPhaseInverted((prev) => ({ ...prev, [track.id]: inverted }));
        })
        .catch(() => {});
    }
  }, [tracks.length]); // Re-run when track count changes

  // Poll master meter via IPC every 300ms
  useEffect(() => {
    let active = true;
    const poll = () => {
      if (!active) return;
      ipc.getMasterMeter()
        .then((data) => {
          if (!active) return;
          const channels = data.channels || [];
          const lDb = channels[0]?.peak_db ?? -Infinity;
          const rDb = channels[1]?.peak_db ?? lDb;
          // Normalize dB to 0-1: -60dB = 0, 0dB = 1
          const lNorm = Math.max(0, Math.min(1, (lDb + 60) / 60));
          const rNorm = Math.max(0, Math.min(1, (rDb + 60) / 60));
          setMasterMeter(lNorm, rNorm);
        })
        .catch(() => { /* engine not connected */ });
    };
    poll();
    const timer = setInterval(poll, 300);
    return () => { active = false; clearInterval(timer); };
  }, [setMasterMeter]);

  // Handle R/W automation button clicks
  const handleAutomationToggle = useCallback((trackId: string, mode: 'read' | 'write') => {
    const current = automationModes.current[trackId] || 'off';
    const newMode = current === mode ? 'off' : mode;
    automationModes.current[trackId] = newMode;
    ipc.setAutomationMode(trackId, newMode).catch((e) => console.warn('[IPC]', e));
    // Force re-render by updating tracks in the session store
    const session = useSessionStore.getState();
    session.updateTracks(
      session.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              readAutomation: newMode === 'read',
              writeAutomation: newMode === 'write',
            }
          : t
      )
    );
  }, []);

  // Handle phase invert toggle
  const handlePhaseToggle = useCallback((trackId: string) => {
    setPhaseInverted((prev) => {
      const current = prev[trackId] || false;
      const newState = !current;
      ipc.setTrackPhaseInvert(trackId, newState).catch((e) => console.warn('[IPC]', e));
      return { ...prev, [trackId]: newState };
    });
  }, []);

  // Find master bus (typically named "Master" with type matching bus behavior)
  // Engine returns the master as a regular track with type 'bus' and name 'Master'.
  // Note: TrackType may not include 'bus' but engine casts it at runtime, so compare as string.
  const masterTrack = tracks.find(
    (t) => t.name.toLowerCase() === 'master' && (['bus', 'fx', 'group'] as string[]).includes(t.type)
  );

  // Filter out master from the regular strip list so it only appears on the right
  const regularTracks = masterTrack
    ? tracks.filter((t) => t.id !== masterTrack.id)
    : tracks;

  return (
    <div className={styles.container}>
      <div className={styles.stripRow}>
        {regularTracks.map((track, i) => (
          <ChannelStrip
            key={track.id}
            trackId={track.id}
            name={track.name}
            color={track.color}
            volume={track.volume}
            pan={track.pan}
            muted={track.muted}
            solo={track.solo}
            recordEnabled={track.recordEnabled}
            monitorEnabled={track.monitorEnabled}
            readAutomation={track.readAutomation}
            writeAutomation={track.writeAutomation}
            type={track.type}
            index={i}
            onVolumeChange={(v) => setTrackVolume(track.id, v)}
            onPanChange={(p) => setTrackPan(track.id, p)}
            onMuteToggle={() => setTrackMute(track.id, !track.muted)}
            onSoloToggle={() => setTrackSolo(track.id, !track.solo)}
            onRecordToggle={() => setTrackRecord(track.id, !track.recordEnabled)}
            onMonitorToggle={() => setTrackMonitor(track.id, !track.monitorEnabled)}
            phaseActive={phaseInverted[track.id] || false}
            onReadToggle={() => handleAutomationToggle(track.id, 'read')}
            onWriteToggle={() => handleAutomationToggle(track.id, 'write')}
            onPhaseToggle={() => handlePhaseToggle(track.id)}
            onPeakReset={() => resetPeak(track.id)}
            onEditChannel={() => useUIStore.getState().setChannelSettingsTrackId(track.id)}
          />
        ))}

        {/* ===== MASTER BUS STRIP ===== */}
        <div className={styles.masterSeparator} />
        <MasterStrip
          masterTrack={masterTrack || null}
          meterL={masterMeterL}
          meterR={masterMeterR}
          peakL={masterPeakL}
          peakR={masterPeakR}
          onVolumeChange={masterTrack ? (v) => setTrackVolume(masterTrack.id, v) : undefined}
          onPanChange={masterTrack ? (p) => setTrackPan(masterTrack.id, p) : undefined}
          onMuteToggle={masterTrack ? () => setTrackMute(masterTrack.id, !masterTrack.muted) : undefined}
          onPeakReset={resetMasterPeak}
        />
      </div>
    </div>
  );
};

/* ---- Horizontal Pan Bar with blue trail ---- */

interface PanBarProps {
  value: number;
  onChange: (value: number) => void;
}

const PanBar: React.FC<PanBarProps> = React.memo(({ value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const computeValue = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const normalized = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return normalized * 2 - 1;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    // Cmd+click (Mac) / Ctrl+click (Win) = reset to center
    if (e.metaKey || e.ctrlKey) { onChange(0); return; }
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const v = computeValue(e.clientX);
    if (v !== undefined) onChange(v);
  }, [onChange, computeValue]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const v = computeValue(e.clientX);
    if (v !== undefined) onChange(v);
  }, [onChange, computeValue]);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);
  const handleDoubleClick = useCallback(() => { onChange(0); }, [onChange]);

  // Blue trail: fills from center (50%) to indicator position
  const indicatorPct = ((value + 1) / 2) * 100;
  const trailLeft = value < 0 ? `${indicatorPct}%` : '50%';
  const trailWidth = value < 0 ? `${50 - indicatorPct}%` : `${indicatorPct - 50}%`;

  return (
    <div className={styles.panSection}>
      <div
        className={styles.panTrack}
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Blue trail from center to indicator */}
        <div
          className={styles.panTrail}
          style={{ left: trailLeft, width: trailWidth }}
        />
        {/* Small vertical indicator bar */}
        <div
          className={styles.panIndicator}
          style={{ left: `${indicatorPct}%` }}
        />
      </div>
      <div className={styles.panLabel}>{panToLabel(value)}</div>
    </div>
  );
});
PanBar.displayName = 'PanBar';

/* ---- Sends Section (collapsible, up to 4 mini horizontal send faders) ---- */

interface SendsSectionProps {
  trackId: string;
}

const SendsSection: React.FC<SendsSectionProps> = React.memo(({ trackId }) => {
  const [open, setOpen] = useState(false);
  const [sends, setSends] = useState<SendDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const levelThrottle = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Fetch sends from engine when section is expanded
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    engine.send.getAllDetails(trackId)
      .then((data) => {
        if (cancelled) return;
        setSends((data.sends || []).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setSends([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [trackId, open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleEnableToggle = useCallback((sendIndex: number, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setSends((prev) =>
      prev.map((s) => s.index === sendIndex ? { ...s, enabled: newEnabled } : s)
    );
    engine.send.setEnable(trackId, sendIndex, newEnabled).catch((e) =>
      console.warn('[Send enable]', e)
    );
  }, [trackId]);

  const handleLevelChange = useCallback((sendIndex: number, normalized: number) => {
    // Convert 0-1 normalized to dB: 0 = -inf, 1 = +6dB
    // Using a logarithmic mapping: 0→-60dB, ~0.83→0dB, 1→+6dB
    const levelDb = normalized <= 0 ? -Infinity : normalized * 66 - 60;
    setSends((prev) =>
      prev.map((s) => s.index === sendIndex ? { ...s, level_db: levelDb } : s)
    );
    // Throttle IPC calls to 50ms per send
    if (levelThrottle.current[sendIndex]) clearTimeout(levelThrottle.current[sendIndex]);
    levelThrottle.current[sendIndex] = setTimeout(() => {
      engine.send.setLevelDb(trackId, sendIndex, levelDb).catch((e) =>
        console.warn('[Send level]', e)
      );
    }, 50);
  }, [trackId]);

  // Convert dB to 0-1 for fader display
  const dbToNormalized = (db: number): number => {
    if (!isFinite(db) || db <= -60) return 0;
    return Math.max(0, Math.min(1, (db + 60) / 66));
  };

  return (
    <>
      <button
        className={`${styles.sendsToggle} ${open ? styles.sendsToggleOpen : ''}`}
        onClick={handleToggle}
        title={open ? 'Collapse sends' : 'Expand sends'}
      >
        {open ? '\u25BE Sends' : '\u25B8 S'}
      </button>
      {open && (
        <div className={styles.sendsBody}>
          {loading ? (
            <div className={styles.sendsEmpty}>...</div>
          ) : sends.length === 0 ? (
            <div className={styles.sendsEmpty}>No sends</div>
          ) : (
            sends.map((send) => (
              <div key={send.index} className={styles.sendRow}>
                {/* Enable dot */}
                <div
                  className={`${styles.sendEnableDot} ${send.enabled ? styles.sendEnabled : ''}`}
                  onClick={() => handleEnableToggle(send.index, send.enabled)}
                  title={send.enabled ? 'Disable send' : 'Enable send'}
                />
                {/* Pre/Post indicator dot */}
                <div
                  className={`${styles.sendPreDot} ${send.pre_fader ? styles.sendPreFader : styles.sendPostFader}`}
                  title={send.pre_fader ? 'Pre-fader' : 'Post-fader'}
                />
                {/* Destination label */}
                <span className={styles.sendLabel} title={send.target_name || send.name}>
                  {send.target_name || send.name}
                </span>
                {/* Horizontal send fader */}
                <div className={styles.sendFaderWrap}>
                  <Fader
                    value={dbToNormalized(send.level_db)}
                    onChange={(v) => handleLevelChange(send.index, v)}
                    orientation="horizontal"
                    color={send.pre_fader ? '#E57C23' : '#4A90D9'}
                    disabled={!send.enabled}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
});
SendsSection.displayName = 'SendsSection';

/* ---- Individual Channel Strip ---- */

interface ChannelStripProps {
  trackId: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  recordEnabled: boolean;
  monitorEnabled: boolean;
  readAutomation: boolean;
  writeAutomation: boolean;
  type: string;
  index: number;
  onVolumeChange: (v: number) => void;
  onPanChange: (p: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onRecordToggle: () => void;
  onMonitorToggle: () => void;
  phaseActive: boolean;
  onReadToggle: () => void;
  onWriteToggle: () => void;
  onPhaseToggle: () => void;
  onPeakReset: () => void;
  onEditChannel: () => void;
}

const ChannelStrip: React.FC<ChannelStripProps> = React.memo(({
  trackId, name, color, volume, pan, muted, solo, recordEnabled, monitorEnabled,
  readAutomation, writeAutomation, type, index: _index,
  phaseActive,
  onVolumeChange, onPanChange, onMuteToggle, onSoloToggle, onRecordToggle, onMonitorToggle,
  onReadToggle, onWriteToggle, onPhaseToggle, onPeakReset, onEditChannel,
}) => {
  // Subscribe to meter store independently — only THIS strip re-renders on meter tick
  const meterLevel = useMeterStore((s) => s.levels[trackId] ?? 0);
  const peakLevel = useMeterStore((s) => s.peaks[trackId] ?? 0);
  const isRecordable = type === 'audio' || type === 'instrument' || type === 'midi';

  // Trim knob state: 0-1 normalized, default 0.5 = 0dB
  const [trimNorm, setTrimNorm] = useState(0.5);
  const trimThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTrimChange = useCallback((norm: number) => {
    setTrimNorm(norm);
    const trimDb = (norm - 0.5) * 40; // 0→-20dB, 0.5→0dB, 1→+20dB
    if (trimThrottle.current) clearTimeout(trimThrottle.current);
    trimThrottle.current = setTimeout(() => {
      engine.track.setTrim(trackId, trimDb).catch((e) => console.warn('[Trim]', e));
    }, 50);
  }, [trackId]);

  const trimDb = (trimNorm - 0.5) * 40;
  const trimDisplay = trimDb > 0.05 ? `+${trimDb.toFixed(1)}` : trimDb < -0.05 ? trimDb.toFixed(1) : '0.0';

  return (
    <div className={styles.strip}>
      {/* ===== TOP: Color bar ===== */}
      <div className={styles.colorBar} style={{ backgroundColor: color }} />

      {/* ===== TOP BUTTONS: M S / L e (Cubase full mixer layout) ===== */}
      <div className={styles.topButtons}>
        <div className={styles.btnRow}>
          <button className={`${styles.stripBtn} ${muted ? styles.btnMuteActive : ''}`}
            onClick={onMuteToggle} title="Mute">M</button>
          <button className={`${styles.stripBtn} ${solo ? styles.btnSoloActive : ''}`}
            onClick={onSoloToggle} title="Solo">S</button>
        </div>
        <div className={styles.btnRow}>
          <button
            className={`${styles.stripBtn} ${phaseActive ? styles.btnPhaseActive : ''}`}
            onClick={onPhaseToggle}
            title="Phase Invert"
          >{'\u00F8'}</button>
          <button className={`${styles.stripBtn} ${styles.btnE}`} title="Edit Channel Settings" onClick={onEditChannel}>
            <em>e</em>
          </button>
        </div>
      </div>

      {/* ===== PAN: Horizontal bar with blue trail ===== */}
      <PanBar value={pan} onChange={onPanChange} />

      {/* ===== SENDS: Collapsible section with up to 4 mini horizontal faders ===== */}
      <SendsSection trackId={trackId} />

      {/* ===== TRIM KNOB ===== */}
      <div className={styles.trimSection}>
        <span className={styles.trimLabel}>Trim</span>
        <Knob value={trimNorm} onChange={handleTrimChange} size={20} bipolar={false} color="#888" />
        <span className={styles.trimValue}>{trimDisplay} dB</span>
      </div>

      {/* ===== FADER + METER ===== */}
      <div className={styles.faderMeter}>
        <div className={styles.meterWrap}>
          <div className={styles.meterReal}>
            <div
              className={styles.meterRealFill}
              style={{ height: `${(meterLevel || 0) * 100}%`, opacity: muted ? 0.15 : 1 }}
            />
          </div>
        </div>
        <div className={styles.faderWrap}>
          <Fader value={volume} onChange={onVolumeChange} orientation="vertical" color={color} showScale />
        </div>
      </div>

      {/* ===== dB READOUT ===== */}
      <div className={styles.dbReadout}>
        <span className={styles.dbValue} style={{ color }}>{volumeToDb(volume)}</span>
        <span
          className={styles.dbPeak}
          style={peakLevel > 0.98 ? { color: '#FF5722' } : undefined}
          onClick={onPeakReset}
          title="Click to reset peak"
        >
          {normalizedToDb(peakLevel)}
        </span>
      </div>

      {/* ===== BOTTOM BUTTONS: R W / Record Monitor ===== */}
      <div className={styles.bottomButtons}>
        <div className={styles.btnRow}>
          <button
            className={`${styles.stripBtn} ${readAutomation ? styles.btnReadActive : ''}`}
            onClick={onReadToggle}
            title="Read Automation"
          >R</button>
          <button
            className={`${styles.stripBtn} ${writeAutomation ? styles.btnWriteActive : ''}`}
            onClick={onWriteToggle}
            title="Write Automation"
          >W</button>
        </div>
        {isRecordable && (
          <div className={styles.btnRow}>
            <button className={`${styles.stripBtnSm} ${recordEnabled ? styles.btnRecActive : ''}`}
              onClick={onRecordToggle} title="Record Enable">{'\u25CF'}</button>
            <button className={`${styles.stripBtnSm} ${monitorEnabled ? styles.btnMonActive : ''}`}
              onClick={onMonitorToggle} title="Monitor">{'\u25C1))'}</button>
          </div>
        )}
      </div>

      {/* ===== CHANNEL NAME ===== */}
      <div className={styles.channelName} style={{ backgroundColor: color }} title={name}>
        {name}
      </div>
    </div>
  );
});
ChannelStrip.displayName = 'ChannelStrip';

/* ---- Master Bus Strip ---- */

interface MasterStripProps {
  masterTrack: {
    id: string;
    name: string;
    color: string;
    volume: number;
    pan: number;
    muted: boolean;
  } | null;
  meterL: number;
  meterR: number;
  peakL: number;
  peakR: number;
  onVolumeChange?: (v: number) => void;
  onPanChange?: (p: number) => void;
  onMuteToggle?: () => void;
  onPeakReset: () => void;
}

const MasterStrip: React.FC<MasterStripProps> = React.memo(({
  masterTrack, meterL, meterR, peakL, peakR,
  onVolumeChange, onPanChange, onMuteToggle, onPeakReset,
}) => {
  const volume = masterTrack?.volume ?? 0.75;
  const pan = masterTrack?.pan ?? 0;
  const muted = masterTrack?.muted ?? false;
  const color = masterTrack?.color ?? '#D4A84A';

  const peakMax = Math.max(peakL, peakR);

  return (
    <div className={`${styles.strip} ${styles.masterStrip}`}>
      {/* ===== TOP: Color bar ===== */}
      <div className={styles.colorBar} style={{ backgroundColor: color }} />

      {/* ===== TOP BUTTONS: M only ===== */}
      <div className={styles.topButtons}>
        <div className={styles.btnRow}>
          <button
            className={`${styles.stripBtn} ${muted ? styles.btnMuteActive : ''}`}
            onClick={onMuteToggle}
            title="Mute Master"
          >M</button>
        </div>
      </div>

      {/* ===== PAN ===== */}
      {onPanChange ? (
        <PanBar value={pan} onChange={onPanChange} />
      ) : (
        <div className={styles.panSection}>
          <div className={styles.panLabel}>C</div>
        </div>
      )}

      {/* ===== FADER + STEREO METERS ===== */}
      <div className={styles.faderMeter}>
        {/* Left meter */}
        <div className={styles.meterWrap}>
          <div className={styles.meterReal}>
            <div
              className={styles.meterRealFill}
              style={{ height: `${meterL * 100}%`, opacity: muted ? 0.15 : 1 }}
            />
          </div>
        </div>
        {/* Right meter */}
        <div className={styles.meterWrap}>
          <div className={styles.meterReal}>
            <div
              className={styles.meterRealFill}
              style={{ height: `${meterR * 100}%`, opacity: muted ? 0.15 : 1 }}
            />
          </div>
        </div>
        <div className={styles.faderWrap}>
          <Fader
            value={volume}
            onChange={onVolumeChange || (() => {})}
            orientation="vertical"
            color={color}
            showScale
          />
        </div>
      </div>

      {/* ===== dB READOUT ===== */}
      <div className={styles.dbReadout}>
        <span className={styles.dbValue} style={{ color }}>{volumeToDb(volume)}</span>
        <span
          className={styles.dbPeak}
          style={peakMax > 0.98 ? { color: '#FF5722' } : undefined}
          onClick={onPeakReset}
          title="Click to reset master peak"
        >
          {normalizedToDb(peakMax)}
        </span>
      </div>

      {/* ===== No automation or record buttons for master ===== */}
      <div className={styles.bottomButtons} />

      {/* ===== CHANNEL NAME ===== */}
      <div className={styles.channelName} style={{ backgroundColor: color }} title="Master">
        Master
      </div>
    </div>
  );
});
MasterStrip.displayName = 'MasterStrip';
