import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Track } from '../types/track';
import { useSessionStore } from '../stores/session';
import { useUIStore } from '../stores/ui';
import { ipc } from '../services/ipc';
import { InspectorSection } from './InspectorSection';
import { InsertSlots } from './InsertSlots';
import { SendSlots } from './SendSlots';
import { Knob } from '../shared/Knob';
import styles from './TrackInspector.module.css';

/* ---- Inline style for routing <select> to match dark theme ---- */
const routingSelectStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 24,
  background: '#1A1A1A',
  border: '1px solid #3A3A3A',
  borderRadius: 2,
  color: '#CCCCCC',
  fontFamily: 'var(--font-family)',
  fontSize: 11,
  padding: '0 4px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'auto',
};

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

/* ---- MIDI Modifiers per-track state ---- */
interface MidiModifiers {
  transpose: number;       // semitones, -127 to +127
  velocityShift: number;   // +/- velocity, -127 to +127
  velocityComp: number;    // compression ratio, 0.25 to 4.0 (1.0 = no change)
  lengthComp: number;      // length ratio, 0.25 to 4.0 (1.0 = no change)
}

const DEFAULT_MIDI_MODS: MidiModifiers = {
  transpose: 0,
  velocityShift: 0,
  velocityComp: 1.0,
  lengthComp: 1.0,
};

/** Clamp a number between min and max */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Map a ratio (0.25..4.0) to 0..1 for slider display (logarithmic scale) */
function ratioToSlider(ratio: number): number {
  // log scale: 0.25 -> 0, 1.0 -> ~0.333, 4.0 -> 1.0
  const logMin = Math.log(0.25);
  const logMax = Math.log(4.0);
  return (Math.log(clamp(ratio, 0.25, 4.0)) - logMin) / (logMax - logMin);
}

/** Map a 0..1 slider value back to ratio (0.25..4.0, logarithmic) */
function sliderToRatio(slider: number): number {
  const logMin = Math.log(0.25);
  const logMax = Math.log(4.0);
  return Math.exp(logMin + clamp(slider, 0, 1) * (logMax - logMin));
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
    sampleRate,
  } = useSessionStore();

  /* ---- Routing state (fetched from engine) ---- */
  const [inputPorts, setInputPorts] = useState<{ id: string; name: string }[]>([]);
  const [outputPorts, setOutputPorts] = useState<{ id: string; name: string }[]>([]);
  const [trackIO, setTrackIO] = useState<{ inputs: string[]; outputs: string[] }>({ inputs: [], outputs: [] });
  // Track's currently connected port names (first connection of each port)
  const currentInput = trackIO.inputs[0] || '';
  const currentOutput = trackIO.outputs[0] || '';

  useEffect(() => {
    if (!track) return;

    // Fetch available ports — use daw.get_available_ports (returns all system ports)
    ipc.call<{ audio_inputs?: string[]; audio_outputs?: string[]; midi_inputs?: string[]; midi_outputs?: string[] }>(
      'daw.get_available_ports', { type: 'all' },
    )
      .then((data) => {
        setInputPorts((data.audio_inputs || []).map((p) => ({ id: p, name: p })));
        setOutputPorts((data.audio_outputs || []).map((p) => ({ id: p, name: p })));
      })
      .catch(() => {
        // Fallback: try the simpler port-list commands
        ipc.getAvailableAudioPorts(true)
          .then((data) => setInputPorts((data.ports || []).map((p) => ({ id: p, name: p }))))
          .catch(() => {});
        ipc.getAvailableAudioPorts(false)
          .then((data) => setOutputPorts((data.ports || []).map((p) => ({ id: p, name: p }))))
          .catch(() => {});
      });

    // Fetch current routing — engine returns {inputs: [{name, connections: [...]}], outputs: [...]}
    ipc.getTrackIO(track.id)
      .then((data: any) => {
        const ins = Array.isArray(data.inputs)
          ? data.inputs.map((p: any) => (p.connections && p.connections[0]) || p.name || '').filter(Boolean)
          : [];
        const outs = Array.isArray(data.outputs)
          ? data.outputs.map((p: any) => (p.connections && p.connections[0]) || p.name || '').filter(Boolean)
          : [];
        setTrackIO({ inputs: ins, outputs: outs });
      })
      .catch(() => {});
  }, [track?.id]);

  /* ---- Latency state ---- */
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    if (!track) return;
    // Engine returns {track_id, signal_latency, playback_latency} (both in samples)
    ipc.call<{ signal_latency?: number; playback_latency?: number }>('daw.get_track_latency', { track_id: track.id })
      .then((data) => {
        setLatency(data.playback_latency ?? data.signal_latency ?? 0);
      })
      .catch(() => {});
  }, [track?.id]);

  const latencyMs = (latency / (sampleRate || 48000)) * 1000;

  /* ---- Track comment/notepad state ---- */
  const [comment, setComment] = useState('');
  const commentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!track) return;
    // daw.get_track_comment does not exist; comment is returned by daw.get_track_details
    ipc.getTrackDetails(track.id)
      .then((data: any) => {
        setComment(data.comment || '');
      })
      .catch(() => {});
  }, [track?.id]);

  const handleCommentChange = useCallback(
    (value: string) => {
      setComment(value);
      // Debounce the IPC call by 500ms
      if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
      commentTimerRef.current = setTimeout(() => {
        ipc.setTrackComment(track.id, value).catch(() => {});
      }, 500);
    },
    [track.id],
  );

  /* ---- Automation R/W handlers ---- */
  const handleAutomationRead = useCallback(() => {
    const newMode = track.readAutomation ? 'off' : 'read';
    ipc.setAutomationMode(track.id, newMode).catch(() => {});
  }, [track.id, track.readAutomation]);

  const handleAutomationWrite = useCallback(() => {
    const newMode = track.writeAutomation ? 'off' : 'write';
    ipc.setAutomationMode(track.id, newMode).catch(() => {});
  }, [track.id, track.writeAutomation]);

  /* ---- Quick Controls state ---- */
  const [qcParams, setQcParams] = useState<Array<{
    name: string;
    value: number;
    min: number;
    max: number;
    processorId: string;
    index: number;
  } | null>>([null, null, null, null, null, null, null, null]);

  // Fetch first plugin's first 8 params when track changes
  useEffect(() => {
    if (!track) return;
    ipc.getTrackPlugins(track.id).then((data) => {
      const plugins = data?.plugins || [];
      if (plugins.length === 0) {
        setQcParams([null, null, null, null, null, null, null, null]);
        return;
      }
      const firstPlugin = plugins[0];
      ipc.call<{ parameters?: Array<{ id: number; name: string; value: number; min: number; max: number; label: string }> }>(
        'daw.get_plugin_parameters',
        { track_id: track.id, processor_id: firstPlugin.processor_id },
      ).then((paramData) => {
        const params = paramData?.parameters || [];
        const mapped = Array.from({ length: 8 }, (_, i) => {
          const p = params[i];
          if (!p) return null;
          return {
            name: p.name || p.label || `Param ${i + 1}`,
            value: p.value ?? 0,
            min: p.min ?? 0,
            max: p.max ?? 1,
            processorId: firstPlugin.processor_id,
            index: i,
          };
        });
        setQcParams(mapped);
      }).catch(() => {});
    }).catch(() => {});
  }, [track?.id]);

  // Handler for QC knob change — normalize 0-1 knob value to param min/max range
  const handleQCChange = useCallback((slotIndex: number, knobValue: number, processorId: string, min: number, max: number) => {
    if (!track) return;
    const paramValue = min + knobValue * (max - min);
    ipc.setPluginParameter(track.id, processorId, slotIndex, paramValue).catch(() => {});
    setQcParams((prev) => prev.map((p, i) => (i === slotIndex && p ? { ...p, value: paramValue } : p)));
  }, [track?.id]);

  /* ---- MIDI Modifiers state (per-track, stored locally) ---- */
  const [midiMods, setMidiMods] = useState<MidiModifiers>({ ...DEFAULT_MIDI_MODS });
  const velCompSliderRef = useRef<HTMLDivElement>(null);
  const lenCompSliderRef = useRef<HTMLDivElement>(null);

  // Reset MIDI modifiers when track changes; try to fetch from engine
  useEffect(() => {
    setMidiMods({ ...DEFAULT_MIDI_MODS });
    if (!track || (track.type !== 'midi' && track.type !== 'instrument')) return;
    ipc.call<Record<string, unknown>>('daw.get_track_details', { track_id: track.id })
      .then((data) => {
        const next = { ...DEFAULT_MIDI_MODS };
        if (typeof data?.midi_transpose === 'number') next.transpose = data.midi_transpose as number;
        if (typeof data?.midi_velocity_shift === 'number') next.velocityShift = data.midi_velocity_shift as number;
        if (typeof data?.midi_velocity_comp === 'number') next.velocityComp = data.midi_velocity_comp as number;
        if (typeof data?.midi_length_comp === 'number') next.lengthComp = data.midi_length_comp as number;
        setMidiMods(next);
      })
      .catch(() => { /* Engine may not return these fields — local defaults are fine */ });
  }, [track?.id, track?.type]);

  // Handler: update transpose
  const handleTranspose = useCallback((semitones: number) => {
    const clamped = clamp(Math.round(semitones), -127, 127);
    setMidiMods((prev) => ({ ...prev, transpose: clamped }));
    if (track) {
      ipc.call('daw.set_midi_track_transpose', { track_id: track.id, semitones: clamped })
        .catch(() => { /* Engine may not support — local state still works */ });
    }
  }, [track?.id]);

  // Handler: update velocity shift
  const handleVelocityShift = useCallback((shift: number) => {
    const clamped = clamp(Math.round(shift), -127, 127);
    setMidiMods((prev) => ({ ...prev, velocityShift: clamped }));
    if (track) {
      ipc.call('daw.set_midi_track_velocity_shift', { track_id: track.id, shift: clamped })
        .catch(() => {});
    }
  }, [track?.id]);

  // Handler: update velocity compression ratio
  const handleVelocityComp = useCallback((ratio: number) => {
    const clamped = clamp(Math.round(ratio * 100) / 100, 0.25, 4.0);
    setMidiMods((prev) => ({ ...prev, velocityComp: clamped }));
    if (track) {
      ipc.call('daw.set_midi_track_velocity_comp', { track_id: track.id, ratio: clamped })
        .catch(() => {});
    }
  }, [track?.id]);

  // Handler: update length compression ratio
  const handleLengthComp = useCallback((ratio: number) => {
    const clamped = clamp(Math.round(ratio * 100) / 100, 0.25, 4.0);
    setMidiMods((prev) => ({ ...prev, lengthComp: clamped }));
    if (track) {
      ipc.call('daw.set_midi_track_length_comp', { track_id: track.id, ratio: clamped })
        .catch(() => {});
    }
  }, [track?.id]);

  // Generic slider drag handler for ratio sliders (velocity comp, length comp)
  const handleRatioSliderDrag = useCallback(
    (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>, setter: (ratio: number) => void) => {
      // Cmd+click = reset to 1.0
      if (e.metaKey || e.ctrlKey) {
        setter(1.0);
        return;
      }
      const bar = ref.current;
      if (!bar) return;

      const update = (clientX: number) => {
        const rect = bar.getBoundingClientRect();
        const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
        setter(sliderToRatio(pct));
      };

      update(e.clientX);

      const onMove = (ev: MouseEvent) => update(ev.clientX);
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [],
  );

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
      // Cmd+click (Mac) / Ctrl+click (Win) = reset to default (0 dB = 0.75 linear)
      if (e.metaKey || e.ctrlKey) {
        setTrackVolume(track.id, 0.75);
        return;
      }
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
      // Cmd+click (Mac) / Ctrl+click (Win) = reset to center
      if (e.metaKey || e.ctrlKey) {
        setTrackPan(track.id, 0);
        return;
      }
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
        <button className={styles.editChannelBtn} title="Edit Channel Settings" onClick={() => useUIStore.getState().setChannelSettingsTrackId(track.id)}>
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
            onClick={handleAutomationRead}
            title="Read Automation"
          >
            R
          </button>
          <button
            className={`${styles.stateBtn} ${track.writeAutomation ? styles.stateBtnWrite : ''}`}
            onClick={handleAutomationWrite}
            title="Write Automation"
          >
            W
          </button>
          <button
            className={styles.stateBtn}
            onClick={() => ipc.call('daw.set_track_listen', { track_id: track.id, listen: true }).catch(() => {})}
            title="Listen"
          >
            L
          </button>
          <button
            className={styles.stateBtn}
            onClick={() => ipc.call('daw.bypass_all_plugins', { track_id: track.id }).catch(() => {})}
            title="Bypass All Plugins"
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
        <span className={styles.delayValue}>{latencyMs.toFixed(2)} ms</span>
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
            <select
              value={currentInput}
              onChange={(e) => {
                const port = e.target.value;
                ipc.connectTrackInput(track.id, port).catch(() => {});
                setTrackIO((prev) => ({ ...prev, inputs: [port] }));
              }}
              style={routingSelectStyle}
              title="Input Routing"
            >
              <option value="">No Input</option>
              {inputPorts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className={styles.routingIcons}>
              <button className={styles.routingIconBtn} title="Add Bus">+</button>
              <button className={styles.routingIconBtn} title="Remove Bus">&minus;</button>
            </div>
          </div>
          {/* Output routing */}
          <div className={styles.routingRow}>
            <select
              value={currentOutput}
              onChange={(e) => {
                const port = e.target.value;
                ipc.connectTrackOutput(track.id, port).catch(() => {});
                setTrackIO((prev) => ({ ...prev, outputs: [port] }));
              }}
              style={routingSelectStyle}
              title="Output Routing"
            >
              <option value="">No Output</option>
              {outputPorts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
          {/* MIDI Modifiers — non-destructive real-time transforms */}
          <InspectorSection title="MIDI Modifiers">
            {/* Transpose: -127 to +127 semitones */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Transpose</span>
              <div className={styles.midiModControls}>
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleTranspose(midiMods.transpose - 1)}
                  title="Transpose down 1 semitone"
                >{'\u2212'}</button>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={-127}
                  max={127}
                  value={midiMods.transpose}
                  onChange={(e) => handleTranspose(Number(e.target.value) || 0)}
                  title="Transpose (semitones)"
                />
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleTranspose(midiMods.transpose + 1)}
                  title="Transpose up 1 semitone"
                >+</button>
                <span className={styles.midiModUnit}>st</span>
                <button
                  className={styles.midiModReset}
                  onClick={() => handleTranspose(0)}
                  title="Reset Transpose"
                >{'\u21BA'}</button>
              </div>
            </div>

            {/* Velocity Shift: -127 to +127 */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Vel. Shift</span>
              <div className={styles.midiModControls}>
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleVelocityShift(midiMods.velocityShift - 1)}
                  title="Decrease velocity shift"
                >{'\u2212'}</button>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={-127}
                  max={127}
                  value={midiMods.velocityShift}
                  onChange={(e) => handleVelocityShift(Number(e.target.value) || 0)}
                  title="Velocity Shift"
                />
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleVelocityShift(midiMods.velocityShift + 1)}
                  title="Increase velocity shift"
                >+</button>
                <span className={styles.midiModUnit}></span>
                <button
                  className={styles.midiModReset}
                  onClick={() => handleVelocityShift(0)}
                  title="Reset Velocity Shift"
                >{'\u21BA'}</button>
              </div>
            </div>

            {/* Velocity Compression: 0.25x to 4.0x (logarithmic slider) */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Vel. Comp.</span>
              <div className={styles.midiModControls}>
                <div
                  className={styles.midiModSliderWrap}
                  ref={velCompSliderRef}
                  onMouseDown={(e) => handleRatioSliderDrag(e, velCompSliderRef, handleVelocityComp)}
                >
                  <div className={styles.midiModSliderTrack}>
                    <div
                      className={styles.midiModSliderFill}
                      style={{ width: `${ratioToSlider(midiMods.velocityComp) * 100}%` }}
                    />
                  </div>
                  <div
                    className={styles.midiModSliderThumb}
                    style={{ left: `${ratioToSlider(midiMods.velocityComp) * 100}%` }}
                  />
                </div>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  value={midiMods.velocityComp.toFixed(2)}
                  onChange={(e) => handleVelocityComp(Number(e.target.value) || 1.0)}
                  title="Velocity Compression Ratio"
                />
                <button
                  className={styles.midiModReset}
                  onClick={() => handleVelocityComp(1.0)}
                  title="Reset Velocity Compression"
                >{'\u21BA'}</button>
              </div>
            </div>

            {/* Length Compression: 0.25x to 4.0x (logarithmic slider) */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Len. Comp.</span>
              <div className={styles.midiModControls}>
                <div
                  className={styles.midiModSliderWrap}
                  ref={lenCompSliderRef}
                  onMouseDown={(e) => handleRatioSliderDrag(e, lenCompSliderRef, handleLengthComp)}
                >
                  <div className={styles.midiModSliderTrack}>
                    <div
                      className={styles.midiModSliderFill}
                      style={{ width: `${ratioToSlider(midiMods.lengthComp) * 100}%` }}
                    />
                  </div>
                  <div
                    className={styles.midiModSliderThumb}
                    style={{ left: `${ratioToSlider(midiMods.lengthComp) * 100}%` }}
                  />
                </div>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  value={midiMods.lengthComp.toFixed(2)}
                  onChange={(e) => handleLengthComp(Number(e.target.value) || 1.0)}
                  title="Length Compression Ratio"
                />
                <button
                  className={styles.midiModReset}
                  onClick={() => handleLengthComp(1.0)}
                  title="Reset Length Compression"
                >{'\u21BA'}</button>
              </div>
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
          {/* MIDI Modifiers — non-destructive real-time transforms */}
          <InspectorSection title="MIDI Modifiers">
            {/* Transpose: -127 to +127 semitones */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Transpose</span>
              <div className={styles.midiModControls}>
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleTranspose(midiMods.transpose - 1)}
                  title="Transpose down 1 semitone"
                >{'\u2212'}</button>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={-127}
                  max={127}
                  value={midiMods.transpose}
                  onChange={(e) => handleTranspose(Number(e.target.value) || 0)}
                  title="Transpose (semitones)"
                />
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleTranspose(midiMods.transpose + 1)}
                  title="Transpose up 1 semitone"
                >+</button>
                <span className={styles.midiModUnit}>st</span>
                <button
                  className={styles.midiModReset}
                  onClick={() => handleTranspose(0)}
                  title="Reset Transpose"
                >{'\u21BA'}</button>
              </div>
            </div>

            {/* Velocity Shift: -127 to +127 */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Vel. Shift</span>
              <div className={styles.midiModControls}>
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleVelocityShift(midiMods.velocityShift - 1)}
                  title="Decrease velocity shift"
                >{'\u2212'}</button>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={-127}
                  max={127}
                  value={midiMods.velocityShift}
                  onChange={(e) => handleVelocityShift(Number(e.target.value) || 0)}
                  title="Velocity Shift"
                />
                <button
                  className={styles.midiModBtn}
                  onClick={() => handleVelocityShift(midiMods.velocityShift + 1)}
                  title="Increase velocity shift"
                >+</button>
                <span className={styles.midiModUnit}></span>
                <button
                  className={styles.midiModReset}
                  onClick={() => handleVelocityShift(0)}
                  title="Reset Velocity Shift"
                >{'\u21BA'}</button>
              </div>
            </div>

            {/* Velocity Compression: 0.25x to 4.0x (logarithmic slider) */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Vel. Comp.</span>
              <div className={styles.midiModControls}>
                <div
                  className={styles.midiModSliderWrap}
                  ref={velCompSliderRef}
                  onMouseDown={(e) => handleRatioSliderDrag(e, velCompSliderRef, handleVelocityComp)}
                >
                  <div className={styles.midiModSliderTrack}>
                    <div
                      className={styles.midiModSliderFill}
                      style={{ width: `${ratioToSlider(midiMods.velocityComp) * 100}%` }}
                    />
                  </div>
                  <div
                    className={styles.midiModSliderThumb}
                    style={{ left: `${ratioToSlider(midiMods.velocityComp) * 100}%` }}
                  />
                </div>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  value={midiMods.velocityComp.toFixed(2)}
                  onChange={(e) => handleVelocityComp(Number(e.target.value) || 1.0)}
                  title="Velocity Compression Ratio"
                />
                <button
                  className={styles.midiModReset}
                  onClick={() => handleVelocityComp(1.0)}
                  title="Reset Velocity Compression"
                >{'\u21BA'}</button>
              </div>
            </div>

            {/* Length Compression: 0.25x to 4.0x (logarithmic slider) */}
            <div className={styles.midiModRow}>
              <span className={styles.midiModLabel}>Len. Comp.</span>
              <div className={styles.midiModControls}>
                <div
                  className={styles.midiModSliderWrap}
                  ref={lenCompSliderRef}
                  onMouseDown={(e) => handleRatioSliderDrag(e, lenCompSliderRef, handleLengthComp)}
                >
                  <div className={styles.midiModSliderTrack}>
                    <div
                      className={styles.midiModSliderFill}
                      style={{ width: `${ratioToSlider(midiMods.lengthComp) * 100}%` }}
                    />
                  </div>
                  <div
                    className={styles.midiModSliderThumb}
                    style={{ left: `${ratioToSlider(midiMods.lengthComp) * 100}%` }}
                  />
                </div>
                <input
                  className={styles.midiModInput}
                  type="number"
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  value={midiMods.lengthComp.toFixed(2)}
                  onChange={(e) => handleLengthComp(Number(e.target.value) || 1.0)}
                  title="Length Compression Ratio"
                />
                <button
                  className={styles.midiModReset}
                  onClick={() => handleLengthComp(1.0)}
                  title="Reset Length Compression"
                >{'\u21BA'}</button>
              </div>
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
        <div className={styles.qcGrid}>
          {qcParams.map((param, i) => {
            if (!param) {
              return (
                <div key={i} className={styles.qcKnobSlot}>
                  <Knob value={0.5} size={32} color="#555555" />
                  <span className={styles.qcKnobLabel}>{'\u2014'}</span>
                </div>
              );
            }
            const range = param.max - param.min;
            const normalized = range > 0 ? (param.value - param.min) / range : 0;
            return (
              <div key={i} className={styles.qcKnobSlot}>
                <Knob
                  value={normalized}
                  size={32}
                  color="#4A90D9"
                  onChange={(v) => handleQCChange(param.index, v, param.processorId, param.min, param.max)}
                />
                <span className={styles.qcKnobLabel} title={param.name}>{param.name}</span>
              </div>
            );
          })}
        </div>
        {qcParams.every((p) => p === null) && (
          <div className={styles.qcEmpty}>No Plugin</div>
        )}
      </InspectorSection>

      {/* ================================================================
          NOTEPAD
          ================================================================ */}
      <InspectorSection title="Notepad">
        <textarea
          className={styles.notepad}
          placeholder="Notes..."
          spellCheck={false}
          value={comment}
          onChange={(e) => handleCommentChange(e.target.value)}
        />
      </InspectorSection>
    </div>
  );
};
