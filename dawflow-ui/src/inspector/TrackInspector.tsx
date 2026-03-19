import React, { useCallback, useMemo, useRef } from 'react';
import type { Track } from '../types/track';
import { useSessionStore } from '../stores/session';
import { InspectorSection } from './InspectorSection';
import { InsertSlots } from './InsertSlots';
import { SendSlots } from './SendSlots';
import styles from './TrackInspector.module.css';

/* ---- Routing option sets ---- */

const INPUT_OPTIONS = [
  { value: 'no-bus', label: 'No Bus' },
  { value: 'Audio 1', label: 'Audio 1' },
  { value: 'Audio 2', label: 'Audio 2' },
  { value: 'Audio 3', label: 'Audio 3' },
  { value: 'Audio 4', label: 'Audio 4' },
  { value: 'Audio 5', label: 'Audio 5' },
  { value: 'Audio 6', label: 'Audio 6' },
  { value: 'Audio 7', label: 'Audio 7' },
  { value: 'Audio 8', label: 'Audio 8' },
  { value: 'Stereo In', label: 'Stereo In' },
];

const MIDI_INPUT_OPTIONS = [
  { value: 'All MIDI', label: 'All MIDI Inputs' },
  { value: 'MIDI 1', label: 'MIDI Port 1' },
  { value: 'MIDI 2', label: 'MIDI Port 2' },
];

const OUTPUT_OPTIONS = [
  { value: 'Stereo Out', label: 'Stereo Out' },
  { value: 'Group 1', label: 'Group 1' },
  { value: 'Group 2', label: 'Group 2' },
  { value: 'FX 1', label: 'FX Channel 1' },
  { value: 'FX 2', label: 'FX Channel 2' },
  { value: 'no-bus', label: 'No Bus' },
];

interface TrackInspectorProps {
  track: Track;
}

/** Convert 0-1 linear volume to dB display string */
function volumeToDb(v: number): string {
  if (v <= 0) return '-inf';
  const db = 20 * Math.log10(v);
  if (db <= -60) return '-inf';
  return db.toFixed(2);
}

/** Convert -1..+1 bipolar pan to L/C/R display string */
function panToString(p: number): string {
  if (Math.abs(p) < 0.01) return 'C';
  if (p < 0) {
    const pct = Math.round(Math.abs(p) * 100);
    return `L${pct}`;
  }
  const pct = Math.round(p * 100);
  return `R${pct}`;
}

export const TrackInspector: React.FC<TrackInspectorProps> = ({ track }) => {
  const {
    setTrackName,
    setTrackMute,
    setTrackSolo,
    setTrackRecord,
    setTrackMonitor,
    setTrackVolume,
    setTrackPan,
  } = useSessionStore();

  /* ---- Refs for drag interaction ---- */
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const panBarRef = useRef<HTMLDivElement>(null);

  /* ---- Name editing ---- */
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTrackName(track.id, e.target.value);
    },
    [track.id, setTrackName],
  );

  /* ---- Track type helpers ---- */
  const isAudioLike =
    track.type === 'audio' ||
    track.type === 'group' ||
    track.type === 'fx' ||
    track.type === 'vca';
  const isMidi = track.type === 'midi';
  const isInstrument = track.type === 'instrument';

  const inputOptions =
    isMidi || isInstrument ? MIDI_INPUT_OPTIONS : INPUT_OPTIONS;

  /* ---- Computed display values ---- */
  const dbDisplay = useMemo(() => volumeToDb(track.volume), [track.volume]);
  const panDisplay = useMemo(() => panToString(track.pan), [track.pan]);

  // Volume: 0-1 mapped to 0-100%
  const volumePct = Math.max(0, Math.min(1, track.volume)) * 100;

  // Pan: -1..+1 mapped to 0-100% for thumb position
  const panPct = ((Math.max(-1, Math.min(1, track.pan)) + 1) / 2) * 100;

  /* ---- Volume drag handler ---- */
  const handleVolumeDrag = useCallback(
    (e: React.MouseEvent) => {
      const bar = volumeBarRef.current;
      if (!bar) return;

      const updateVolume = (clientX: number) => {
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        setTrackVolume(track.id, ratio);
      };

      updateVolume(e.clientX);

      const onMove = (ev: MouseEvent) => updateVolume(ev.clientX);
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [track.id, setTrackVolume],
  );

  /* ---- Pan drag handler ---- */
  const handlePanDrag = useCallback(
    (e: React.MouseEvent) => {
      const bar = panBarRef.current;
      if (!bar) return;

      const updatePan = (clientX: number) => {
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        // Map 0-1 to -1..+1
        const pan = ratio * 2 - 1;
        setTrackPan(track.id, pan);
      };

      updatePan(e.clientX);

      const onMove = (ev: MouseEvent) => updatePan(ev.clientX);
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [track.id, setTrackPan],
  );

  /* ---- Pan fill calculation ---- */
  const panFillStyle = useMemo(() => {
    const center = 50;
    if (Math.abs(panPct - center) < 0.5) {
      // Centered — tiny sliver at center
      return { left: `${center - 0.5}%`, width: '1%', borderRadius: '3px' };
    }
    if (panPct < center) {
      return {
        left: `${panPct}%`,
        width: `${center - panPct}%`,
      };
    }
    return {
      left: `${center}%`,
      width: `${panPct - center}%`,
    };
  }, [panPct]);

  const panFillClass = useMemo(() => {
    if (Math.abs(panPct - 50) < 0.5) return styles.panFillCenter;
    return panPct < 50 ? styles.panFillLeft : styles.panFillRight;
  }, [panPct]);

  /* ---- Resolve input label for display ---- */
  const inputLabel = useMemo(() => {
    const opt = inputOptions.find((o) => o.value === track.inputRouting);
    return opt ? opt.label : track.inputRouting || 'No Bus';
  }, [track.inputRouting, inputOptions]);

  const outputLabel = useMemo(() => {
    const opt = OUTPUT_OPTIONS.find((o) => o.value === track.outputRouting);
    return opt ? opt.label : track.outputRouting || 'No Bus';
  }, [track.outputRouting]);

  return (
    <div className={styles.trackInspector}>
      {/* ================================================================
          1. TRACK NAME HEADER — colored bar with "e" button
          ================================================================ */}
      <div className={styles.trackHeader} style={{ backgroundColor: track.color }}>
        <input
          className={styles.trackName}
          type="text"
          value={track.name}
          onChange={handleNameChange}
          spellCheck={false}
        />
        <button className={styles.editChannelBtn} title="Edit Channel Settings">
          e
        </button>
      </div>

      {/* ================================================================
          2. STATE BUTTONS — Row 1: M S R W L B  |  Row 2: icons
          ================================================================ */}
      <div className={styles.stateRow}>
        {/* Row 1: M S R W L B — large 24x24 outlined squares */}
        <div className={styles.stateButtonsRow}>
          <button
            className={`${styles.stateBtn} ${track.muted ? styles.stateBtnMute : ''}`}
            onClick={() => setTrackMute(track.id, !track.muted)}
            title="Mute"
          >
            M
          </button>
          <button
            className={`${styles.stateBtn} ${track.solo ? styles.stateBtnSolo : ''}`}
            onClick={() => setTrackSolo(track.id, !track.solo)}
            title="Solo"
          >
            S
          </button>
          <button
            className={`${styles.stateBtn} ${track.readAutomation ? styles.stateBtnRead : ''}`}
            title="Read Automation"
          >
            R
          </button>
          <button
            className={`${styles.stateBtn} ${track.writeAutomation ? styles.stateBtnWrite : ''}`}
            title="Write Automation"
          >
            W
          </button>
          <button
            className={styles.stateBtn}
            title="Listen"
          >
            L
          </button>
          <button
            className={styles.stateBtn}
            title="Bypass Inserts"
          >
            B
          </button>
        </div>

        {/* Row 2: Record dot, Monitor speaker, Musical note icons */}
        <div className={styles.iconButtonsRow}>
          {(isAudioLike || isInstrument) && (
            <>
              <button
                className={`${styles.iconBtn} ${
                  track.recordEnabled
                    ? styles.iconBtnRecordActive
                    : styles.iconBtnRecord
                }`}
                onClick={() => setTrackRecord(track.id, !track.recordEnabled)}
                title="Record Enable"
              >
                {'\u25CF'}
              </button>
              <button
                className={`${styles.iconBtn} ${
                  track.monitorEnabled
                    ? styles.iconBtnMonitorActive
                    : styles.iconBtnMonitor
                }`}
                onClick={() => setTrackMonitor(track.id, !track.monitorEnabled)}
                title="Monitor Input"
              >
                {'\uD83D\uDD0A'}
              </button>
              <button
                className={styles.iconBtn}
                title="Musical Mode"
              >
                {'\u266A'}
              </button>
            </>
          )}
          {isMidi && (
            <>
              <button
                className={`${styles.iconBtn} ${
                  track.recordEnabled
                    ? styles.iconBtnRecordActive
                    : styles.iconBtnRecord
                }`}
                onClick={() => setTrackRecord(track.id, !track.recordEnabled)}
                title="Record Enable"
              >
                {'\u25CF'}
              </button>
              <button
                className={`${styles.iconBtn} ${
                  track.monitorEnabled
                    ? styles.iconBtnMonitorActive
                    : styles.iconBtnMonitor
                }`}
                onClick={() => setTrackMonitor(track.id, !track.monitorEnabled)}
                title="Monitor Input"
              >
                {'\uD83D\uDD0A'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ================================================================
          3. VOLUME SLIDER — horizontal blue bar, white circle thumb
          ================================================================ */}
      <div className={styles.volumeRow}>
        <span className={styles.sliderIcon} title="Volume">
          {'\uD83D\uDD0A'}
        </span>
        <div
          className={styles.volumeBarWrap}
          ref={volumeBarRef}
          onMouseDown={handleVolumeDrag}
        >
          <div className={styles.volumeTrack}>
            <div
              className={styles.volumeFill}
              style={{ width: `${volumePct}%` }}
            />
          </div>
          <div
            className={styles.volumeThumb}
            style={{ left: `${volumePct}%` }}
          />
        </div>
        <span className={styles.volumeValue}>{dbDisplay} dB</span>
      </div>

      {/* ================================================================
          4. PAN SLIDER — horizontal grey bar, white circle thumb
          ================================================================ */}
      <div className={styles.panRow}>
        <span className={styles.sliderIcon} title="Pan">
          {'\u2194'}
        </span>
        <div
          className={styles.panBarWrap}
          ref={panBarRef}
          onMouseDown={handlePanDrag}
        >
          <div className={styles.panTrack}>
            <div
              className={`${styles.panFill} ${panFillClass}`}
              style={panFillStyle}
            />
          </div>
          <div
            className={styles.panThumb}
            style={{ left: `${panPct}%` }}
          />
        </div>
        <span className={styles.panValue}>{panDisplay}</span>
      </div>

      {/* ================================================================
          5. DELAY DISPLAY
          ================================================================ */}
      <div className={styles.delayRow}>
        <span className={styles.sliderIcon}>{'\u23F1'}</span>
        <span className={styles.delayValue}>0.00 ms</span>
      </div>

      {/* ================================================================
          6. ACCORDION SECTIONS — Cubase exact order
          ================================================================ */}

      {/* Track Presets */}
      <InspectorSection title="Track Presets" icon={'\u2630'}>
        <div className={styles.placeholderRow}>
          <div className={styles.presetDropdown}>
            <span className={styles.presetIcon}>{'\u2630'}</span>
            <span className={styles.presetText}>Track Presets...</span>
          </div>
        </div>
      </InspectorSection>

      {/* No Extension / Insert Recording */}
      <InspectorSection title="No Extension">
        <div className={styles.placeholderRow}>
          <div className={styles.presetDropdown}>
            <span className={styles.presetText}>Insert Recording...</span>
          </div>
        </div>
      </InspectorSection>

      {/* Routing — always starts open */}
      <InspectorSection title="Routing" icon={'\u21C6'} defaultOpen>
        <div className={styles.routingSection}>
          {/* Input routing */}
          <div className={styles.routingRow}>
            <div className={styles.routingDropdown}>
              <span className={styles.routingIcon}>{'\u229E'}</span>
              <span className={styles.routingLabel}>{inputLabel}</span>
            </div>
            <div className={styles.routingIcons}>
              <button className={styles.routingIconBtn} title="Add Bus">+</button>
              <button className={styles.routingIconBtn} title="Remove Bus">&minus;</button>
            </div>
          </div>
          {/* Output routing */}
          <div className={styles.routingRow}>
            <div className={styles.routingDropdown}>
              <span className={styles.routingIcon}>{'\u229E'}</span>
              <span className={styles.routingLabel}>{outputLabel}</span>
            </div>
            <div className={styles.routingIcons}>
              <button className={styles.routingIconBtn} title="Add Bus">+</button>
              <button className={styles.routingIconBtn} title="Remove Bus">&minus;</button>
            </div>
          </div>
        </div>
      </InspectorSection>

      {/* Track Versions */}
      <InspectorSection title="Track Versions" icon={'\u2630'}>
        <div className={styles.placeholderRow}>
          <span className={styles.placeholderText}>v1</span>
        </div>
      </InspectorSection>

      {/* ================================================================
          INSERTS — audio/instrument tracks
          ================================================================ */}
      {(isAudioLike || isInstrument) && (
        <InspectorSection title="Inserts" icon={'\u26A1'}>
          <InsertSlots trackId={track.id} />
        </InspectorSection>
      )}

      {/* ================================================================
          MIDI TRACK SECTIONS
          ================================================================ */}
      {isMidi && (
        <>
          <InspectorSection title="MIDI Modifiers">
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Transpose</span>
              <span className={styles.midiValue}>0</span>
            </div>
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Vel. Shift</span>
              <span className={styles.midiValue}>0</span>
            </div>
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Vel. Comp.</span>
              <span className={styles.midiValue}>0 / 100</span>
            </div>
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Length Comp.</span>
              <span className={styles.midiValue}>0 / 100</span>
            </div>
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Random</span>
              <span className={styles.midiValue}>Off</span>
            </div>
          </InspectorSection>

          <InspectorSection title="MIDI Inserts">
            <InsertSlots trackId={track.id} />
          </InspectorSection>

          <InspectorSection title="MIDI Sends">
            <SendSlots />
          </InspectorSection>
        </>
      )}

      {/* ================================================================
          INSTRUMENT TRACK — combined sections
          ================================================================ */}
      {isInstrument && (
        <>
          <InspectorSection title="MIDI Modifiers">
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Transpose</span>
              <span className={styles.midiValue}>0</span>
            </div>
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Vel. Shift</span>
              <span className={styles.midiValue}>0</span>
            </div>
            <div className={styles.midiRow}>
              <span className={styles.midiLabel}>Vel. Comp.</span>
              <span className={styles.midiValue}>0 / 100</span>
            </div>
          </InspectorSection>

          <InspectorSection title="MIDI Sends">
            <SendSlots />
          </InspectorSection>
        </>
      )}

      {/* ================================================================
          SENDS — audio tracks
          ================================================================ */}
      {(isAudioLike || isInstrument) && (
        <InspectorSection title="Sends" icon={'\u2197'}>
          <SendSlots />
        </InspectorSection>
      )}

      {/* ================================================================
          QUICK CONTROLS — all track types
          ================================================================ */}
      <InspectorSection title="Quick Controls" icon={'\u25CF'}>
        <div className={styles.quickControls}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.qcSlot}>
              <span className={styles.qcLabel}>QC {i + 1}</span>
              <div className={styles.qcBar}>
                <div className={styles.qcFill} style={{ width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </InspectorSection>

      {/* ================================================================
          NOTEPAD
          ================================================================ */}
      <InspectorSection title="Notepad">
        <textarea
          className={styles.notepad}
          placeholder="Notes..."
          spellCheck={false}
        />
      </InspectorSection>
    </div>
  );
};
