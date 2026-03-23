import React, { useRef, useCallback, useState } from 'react';
import type { Track } from '../types/track';
import { useSessionStore } from '../stores/session';
import { useUIStore } from '../stores/ui';
import { Fader } from '../shared/Fader';
import { ChannelEQ } from '../components/ChannelEQ';
import { InsertSlots } from './InsertSlots';
import { SendSlots } from './SendSlots';
import { InspectorSection } from './InspectorSection';
import styles from './ChannelView.module.css';

function volumeToDb(v: number): string {
  if (v <= 0) return '-inf';
  const db = 20 * Math.log10(v / 0.75);
  if (db > 0) return `+${db.toFixed(2)}`;
  return db.toFixed(2);
}

function panToLabel(p: number): string {
  if (Math.abs(p) < 0.01) return 'C';
  if (p < 0) return `L${Math.round(Math.abs(p) * 100)}`;
  return `R${Math.round(p * 100)}`;
}

export const ChannelView: React.FC = () => {
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const tracks = useSessionStore((s) => s.tracks);
  const track = tracks.find((t) => t.id === selectedTrackId);

  if (!track) {
    return (
      <div className={styles.noTrack}>
        <span>No Channel Selected</span>
      </div>
    );
  }

  return <ChannelContent track={track} />;
};

const ChannelContent: React.FC<{ track: Track }> = ({ track }) => {
  const { setTrackMute, setTrackSolo, setTrackRecord, setTrackMonitor, setTrackVolume, setTrackPan } = useSessionStore();
  const panBarRef = useRef<HTMLDivElement>(null);
  const [faderHeight, setFaderHeight] = useState(480);
  const dividerRef = useRef<{ startY: number; startH: number } | null>(null);

  const handlePanDrag = useCallback((e: React.MouseEvent) => {
    const bar = panBarRef.current;
    if (!bar) return;
    const update = (clientX: number) => {
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setTrackPan(track.id, ratio * 2 - 1);
    };
    update(e.clientX);
    const onMove = (ev: MouseEvent) => update(ev.clientX);
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [track.id, setTrackPan]);

  const handleDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dividerRef.current = { startY: e.clientY, startH: faderHeight };
    const onMove = (ev: MouseEvent) => {
      if (!dividerRef.current) return;
      const delta = dividerRef.current.startY - ev.clientY;
      setFaderHeight(Math.max(400, Math.min(800, dividerRef.current.startH + delta)));
    };
    const onUp = () => {
      dividerRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [faderHeight]);

  const panPct = ((track.pan + 1) / 2) * 100;
  const panTrailLeft = track.pan < 0 ? `${panPct}%` : '50%';
  const panTrailWidth = track.pan < 0 ? `${50 - panPct}%` : `${panPct - 50}%`;

  return (
    <div className={styles.channel}>
      {/* ===== TOP SECTION (scrollable) ===== */}
      <div className={styles.topSection}>
        {/* Channel header */}
        <div className={styles.header}>Channel</div>

        {/* Track name */}
        <div className={styles.trackName} style={{ backgroundColor: track.color }}>
          {track.name}
        </div>

        {/* EQ — Real interactive 6-band parametric EQ */}
        <div className={styles.eqSection}>
          <ChannelEQ trackId={track.id} compact />
        </div>

        {/* Inserts — Real wired insert slots with plugin browser */}
        <InspectorSection title="Inserts" icon="⚡" defaultOpen>
          <InsertSlots trackId={track.id} />
        </InspectorSection>

        {/* Sends — Real wired send slots with routing */}
        <InspectorSection title="Sends" icon="↗" defaultOpen>
          <SendSlots trackId={track.id} />
        </InspectorSection>
      </div>

      {/* ===== RESIZABLE DIVIDER ===== */}
      <div className={styles.divider} onMouseDown={handleDividerDown}>
        <div className={styles.dividerGrip}>· · · ·</div>
      </div>

      {/* ===== BOTTOM FADER SECTION (resizable) ===== */}
      <div className={styles.bottomStrip} style={{ height: faderHeight }}>
        {/* Output routing */}
        <div className={styles.routingDrop}>
          <span>{track.outputRouting || 'Stereo Out'}</span>
          <span className={styles.dropArrow}>▾</span>
        </div>

        {/* M S / L e */}
        <div className={styles.stripBtnRow}>
          <button className={`${styles.stripBtn} ${track.muted ? styles.btnMuteActive : ''}`}
            onClick={() => setTrackMute(track.id, !track.muted)}>M</button>
          <button className={`${styles.stripBtn} ${track.solo ? styles.btnSoloActive : ''}`}
            onClick={() => setTrackSolo(track.id, !track.solo)}>S</button>
        </div>
        <div className={styles.stripBtnRow}>
          <button className={styles.stripBtn}>L</button>
          <button className={styles.stripBtn}><em>e</em></button>
        </div>

        {/* Pan bar */}
        <div className={styles.panSection}>
          <div className={styles.panTrack} ref={panBarRef} onMouseDown={handlePanDrag}>
            <div className={styles.panTrail} style={{ left: panTrailLeft, width: panTrailWidth }} />
            <div className={styles.panIndicator} style={{ left: `${panPct}%` }} />
          </div>
          <div className={styles.panLabel}>{panToLabel(track.pan)}</div>
        </div>

        {/* Fader — takes remaining height */}
        <div className={styles.faderArea}>
          <Fader
            value={track.volume}
            onChange={(v) => setTrackVolume(track.id, v)}
            orientation="vertical"
            color={track.color}
            showScale
          />
        </div>

        {/* dB readout */}
        <div className={styles.dbRow}>
          <span>{volumeToDb(track.volume)}</span>
          <span>-∞</span>
        </div>

        {/* R W */}
        <div className={styles.stripBtnRow}>
          <button className={styles.stripBtn}>R</button>
          <button className={styles.stripBtn}>W</button>
        </div>

        {/* Record / Monitor */}
        <div className={styles.stripBtnRow}>
          <button className={`${styles.stripBtnSm} ${track.recordEnabled ? styles.recActive : ''}`}
            onClick={() => setTrackRecord(track.id, !track.recordEnabled)}>●</button>
          <button className={`${styles.stripBtnSm} ${track.monitorEnabled ? styles.monActive : ''}`}
            onClick={() => setTrackMonitor(track.id, !track.monitorEnabled)}>◁))</button>
        </div>

        {/* Track info icons */}
        <div className={styles.trackInfo}>
          <span>≋</span>
          <span>∞</span>
          <span className={styles.trackNum}>1</span>
        </div>

        {/* Channel name */}
        <div className={styles.channelNameBottom} style={{ backgroundColor: track.color }}>
          {track.name}
        </div>
      </div>
    </div>
  );
};
