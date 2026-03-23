import React, { useMemo } from 'react';
import { Fader } from '../shared/Fader';
import { Knob } from '../shared/Knob';
import { DawButton } from './DawButton';
import { DawSlot } from './DawSlot';
import { DawMeter } from './DawMeter';
import styles from './ChannelStrip.module.css';

export interface ChannelStripInsert {
  name: string;
  enabled: boolean;
  processorId: string;
}

export interface ChannelStripSend {
  name: string;
  level: number;
  enabled: boolean;
}

export interface ChannelStripProps {
  trackId: string;
  name: string;
  color: string;
  type: string;
  volume: number;       // 0-1
  pan: number;          // -1 to 1
  muted: boolean;
  solo: boolean;
  recordEnabled: boolean;
  meterLevel: number;
  peakLevel: number;
  automationMode: string;
  inserts: ChannelStripInsert[];
  sends: ChannelStripSend[];
  onVolumeChange: (v: number) => void;
  onPanChange: (p: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onRecordToggle: () => void;
}

/* dB display helper */
function volumeToDb(v: number): string {
  if (v <= 0) return '-\u221E';
  const db = 20 * Math.log10(v / 0.75);
  if (db > 0) return `+${db.toFixed(1)}`;
  return db.toFixed(1);
}

/* 8 insert slots (fill empty with null) */
function padSlots<T>(items: T[], count: number): (T | null)[] {
  const result: (T | null)[] = [...items];
  while (result.length < count) result.push(null);
  return result.slice(0, count);
}

export const ChannelStrip: React.FC<ChannelStripProps> = React.memo(({
  trackId: _trackId,
  name,
  color,
  type,
  volume,
  pan,
  muted,
  solo,
  recordEnabled,
  meterLevel,
  peakLevel,
  automationMode,
  inserts,
  sends,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onRecordToggle,
}) => {
  const insertSlots = useMemo(() => padSlots(inserts, 8), [inserts]);
  const sendSlots = useMemo(() => padSlots(sends, 8), [sends]);

  const isRecordable = type === 'audio' || type === 'instrument' || type === 'midi';

  return (
    <div className={styles.channelStrip}>
      {/* Color bar */}
      <div className={styles.colorBar} style={{ backgroundColor: color }} />

      {/* Track name */}
      <div className={styles.name} title={name}>{name}</div>

      {/* Input routing */}
      <div className={styles.routingLabel} title="Input routing">In</div>

      {/* Insert slots (8) */}
      <div className={styles.insertsSection}>
        <div className={styles.sectionTitle}>Inserts</div>
        {insertSlots.map((ins, i) => (
          <DawSlot
            key={i}
            label={ins ? ins.name : null}
            active={ins ? ins.enabled : false}
            bypassed={ins ? !ins.enabled : false}
          />
        ))}
      </div>

      {/* EQ curve thumbnail */}
      <div className={styles.eqThumbnail}>
        <div className={styles.eqLine} />
      </div>

      {/* Send slots (8) */}
      <div className={styles.sendsSection}>
        <div className={styles.sectionTitle}>Sends</div>
        {sendSlots.map((snd, i) => (
          <DawSlot
            key={i}
            label={snd ? snd.name : null}
            active={snd ? snd.enabled : false}
            bypassed={snd ? !snd.enabled : false}
          />
        ))}
      </div>

      {/* Pan knob */}
      <div className={styles.panArea}>
        <Knob
          value={pan}
          onChange={onPanChange}
          size={28}
          color={color}
          bipolar
          label="Pan"
        />
      </div>

      {/* Fader + meter */}
      <div className={styles.faderMeter}>
        <div className={styles.meterColumn}>
          <DawMeter
            level={muted ? 0 : meterLevel}
            peak={peakLevel}
            orientation="vertical"
            width={6}
          />
        </div>
        <div className={styles.faderColumn}>
          <Fader
            value={volume}
            onChange={onVolumeChange}
            orientation="vertical"
            color={color}
          />
        </div>
      </div>

      {/* dB readout */}
      <div className={styles.dbReadout}>{volumeToDb(volume)} dB</div>

      {/* M / S / R buttons */}
      <div className={styles.buttonRow}>
        <DawButton
          label="M"
          variant="mute"
          active={muted}
          onClick={onMuteToggle}
          size="xs"
          title="Mute"
        />
        <DawButton
          label="S"
          variant="solo"
          active={solo}
          onClick={onSoloToggle}
          size="xs"
          title="Solo"
        />
        {isRecordable && (
          <DawButton
            label={'\u25CF'}
            variant="record"
            active={recordEnabled}
            onClick={onRecordToggle}
            size="xs"
            title="Record Enable"
          />
        )}
      </div>

      {/* Automation mode */}
      <div className={styles.automationLabel}>{automationMode || 'off'}</div>

      {/* Output routing */}
      <div className={styles.outputRouting} title="Output routing">Out</div>

      {/* Bottom name plate */}
      <div className={styles.namePlate} style={{ backgroundColor: color }} title={name}>
        {name}
      </div>
    </div>
  );
});
ChannelStrip.displayName = 'ChannelStrip';
