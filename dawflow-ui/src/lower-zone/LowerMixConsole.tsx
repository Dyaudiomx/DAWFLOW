import React, { useCallback, useRef } from 'react';
import { useSessionStore } from '../stores/session';
import { Fader } from '../shared/Fader';
import styles from './LowerMixConsole.module.css';

function volumeToDb(volume: number): string {
  if (volume <= 0) return '-\u221E';
  const db = 20 * Math.log10(volume / 0.75);
  if (db > 0) return `+${db.toFixed(2)}`;
  return db.toFixed(2);
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

  return (
    <div className={styles.container}>
      <div className={styles.stripRow}>
        {tracks.map((track, i) => (
          <ChannelStrip
            key={track.id}
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
            meterLevel={track.meterLevel || 0}
            type={track.type}
            index={i}
            onVolumeChange={(v) => setTrackVolume(track.id, v)}
            onPanChange={(p) => setTrackPan(track.id, p)}
            onMuteToggle={() => setTrackMute(track.id, !track.muted)}
            onSoloToggle={() => setTrackSolo(track.id, !track.solo)}
            onRecordToggle={() => setTrackRecord(track.id, !track.recordEnabled)}
            onMonitorToggle={() => setTrackMonitor(track.id, !track.monitorEnabled)}
          />
        ))}
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

/* ---- Individual Channel Strip ---- */

interface ChannelStripProps {
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
  meterLevel: number;
  type: string;
  index: number;
  onVolumeChange: (v: number) => void;
  onPanChange: (p: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onRecordToggle: () => void;
  onMonitorToggle: () => void;
}

const ChannelStrip: React.FC<ChannelStripProps> = React.memo(({
  name, color, volume, pan, muted, solo, recordEnabled, monitorEnabled,
  readAutomation, writeAutomation, meterLevel, type, index,
  onVolumeChange, onPanChange, onMuteToggle, onSoloToggle, onRecordToggle, onMonitorToggle,
}) => {
  const isRecordable = type === 'audio' || type === 'instrument' || type === 'midi';

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
          <button className={styles.stripBtn} title="Listen">L</button>
          <button className={`${styles.stripBtn} ${styles.btnE}`} title="Edit Channel Settings">
            <em>e</em>
          </button>
        </div>
      </div>

      {/* ===== PAN: Horizontal bar with blue trail ===== */}
      <PanBar value={pan} onChange={onPanChange} />

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
        <span className={styles.dbPeak}>0.00</span>
      </div>

      {/* ===== BOTTOM BUTTONS: R W / Record Monitor ===== */}
      <div className={styles.bottomButtons}>
        <div className={styles.btnRow}>
          <button className={`${styles.stripBtn} ${readAutomation ? styles.btnReadActive : ''}`}
            title="Read Automation">R</button>
          <button className={`${styles.stripBtn} ${writeAutomation ? styles.btnWriteActive : ''}`}
            title="Write Automation">W</button>
        </div>
        {isRecordable && (
          <div className={styles.btnRow}>
            <button className={`${styles.stripBtnSm} ${recordEnabled ? styles.btnRecActive : ''}`}
              onClick={onRecordToggle} title="Record Enable">●</button>
            <button className={`${styles.stripBtnSm} ${monitorEnabled ? styles.btnMonActive : ''}`}
              onClick={onMonitorToggle} title="Monitor">◁))</button>
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
