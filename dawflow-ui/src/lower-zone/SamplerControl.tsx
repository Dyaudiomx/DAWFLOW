/**
 * SamplerControl — Cubase 15 Pro Sampler Control (Lower Zone)
 *
 * When a sampler/instrument track is selected, this tab shows:
 *  - Header: plugin name + preset selector
 *  - Waveform display with start/end markers and loop region
 *  - Pitch (root key) selector
 *  - Filter section (cutoff + resonance knobs)
 *  - Amp envelope (ADSR sliders)
 *
 * Implementation: fetches plugins on the selected track via IPC, identifies
 * sampler/instrument plugins, and maps their parameters to a sampler-style
 * layout. If no instrument plugin is found, shows an empty state.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './SamplerControl.module.css';
import { ipc, type PluginParameter } from '../services/ipc';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { Knob } from '../shared/Knob';
import { Fader } from '../shared/Fader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginEntry {
  processor_id: string;
  name: string;
  enabled: boolean;
  index: number;
}

interface PresetEntry {
  uri: string;
  label: string;
  user: boolean;
}

/** Recognized parameter categories — we search param names for these keywords. */
const FILTER_KEYWORDS = ['cutoff', 'filter freq', 'frequency', 'filter', 'tone', 'brightness'];
const RESONANCE_KEYWORDS = ['resonance', 'q', 'filter res', 'emphasis'];
const ATTACK_KEYWORDS = ['attack', 'amp attack', 'env attack', 'a time'];
const DECAY_KEYWORDS = ['decay', 'amp decay', 'env decay', 'd time'];
const SUSTAIN_KEYWORDS = ['sustain', 'amp sustain', 'env sustain', 's level'];
const RELEASE_KEYWORDS = ['release', 'amp release', 'env release', 'r time'];
const VOLUME_KEYWORDS = ['volume', 'level', 'master', 'output', 'gain', 'amplitude'];
const PAN_KEYWORDS = ['pan', 'balance', 'stereo'];
const PITCH_KEYWORDS = ['pitch', 'tune', 'coarse', 'root', 'transpose', 'semitone'];
const LOOP_KEYWORDS = ['loop', 'loop mode', 'loop on'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchParam(params: PluginParameter[], keywords: string[]): PluginParameter | null {
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  for (const kw of lowerKeywords) {
    const found = params.find(p => p.name.toLowerCase().includes(kw));
    if (found) return found;
  }
  return null;
}

/** Normalize a parameter value to 0-1. */
function normalizeParam(p: PluginParameter): number {
  if (p.max === p.min) return 0;
  return (p.value - p.min) / (p.max - p.min);
}

/** Denormalize a 0-1 value back to param range. */
function denormalizeParam(norm: number, p: PluginParameter): number {
  return p.min + norm * (p.max - p.min);
}

/** Format parameter value for display. */
function formatParamValue(p: PluginParameter): string {
  const range = p.max - p.min;
  if (range <= 1) return p.value.toFixed(2);
  if (range <= 100) return p.value.toFixed(1);
  return Math.round(p.value).toString();
}

/** Check if a plugin name sounds like a sampler or instrument. */
function isInstrumentPlugin(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('sampler') || n.includes('sample') ||
    n.includes('synth') || n.includes('instrument') ||
    n.includes('piano') || n.includes('organ') ||
    n.includes('drum') || n.includes('bass') ||
    n.includes('string') || n.includes('pad') ||
    n.includes('lead') || n.includes('pluck') ||
    n.includes('fluid') || n.includes('sfz') ||
    n.includes('soundfont') || n.includes('kontakt') ||
    n.includes('serum') || n.includes('vital') ||
    n.includes('massive') || n.includes('zebra') ||
    n.includes('diva') || n.includes('surge') ||
    n.includes('helm') || n.includes('odin') ||
    n.includes('a-fluid') || n.includes('general midi')
  );
}

// MIDI note names
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiNoteToName(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  return `${NOTE_NAMES[note % 12]}${octave}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SamplerControl: React.FC = () => {
  const selectedTrackId = useUIStore(s => s.selectedTrackId);
  const tracks = useSessionStore(s => s.tracks);

  const selectedTrack = useMemo(
    () => tracks.find(t => t.id === selectedTrackId),
    [tracks, selectedTrackId],
  );

  // Plugin state
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [activePlugin, setActivePlugin] = useState<PluginEntry | null>(null);
  const [params, setParams] = useState<PluginParameter[]>([]);
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [currentPreset, setCurrentPreset] = useState('');
  const [loading, setLoading] = useState(false);

  // ADSR + filter mapped params
  const filterCutoff = useMemo(() => matchParam(params, FILTER_KEYWORDS), [params]);
  const filterResonance = useMemo(() => matchParam(params, RESONANCE_KEYWORDS), [params]);
  const attack = useMemo(() => matchParam(params, ATTACK_KEYWORDS), [params]);
  const decay = useMemo(() => matchParam(params, DECAY_KEYWORDS), [params]);
  const sustain = useMemo(() => matchParam(params, SUSTAIN_KEYWORDS), [params]);
  const release = useMemo(() => matchParam(params, RELEASE_KEYWORDS), [params]);
  const volume = useMemo(() => matchParam(params, VOLUME_KEYWORDS), [params]);
  const pan = useMemo(() => matchParam(params, PAN_KEYWORDS), [params]);
  const pitch = useMemo(() => matchParam(params, PITCH_KEYWORDS), [params]);
  const loopParam = useMemo(() => matchParam(params, LOOP_KEYWORDS), [params]);

  // "Extra" params — those not already mapped to a known category
  const mappedIds = useMemo(() => {
    const ids = new Set<number>();
    [filterCutoff, filterResonance, attack, decay, sustain, release, volume, pan, pitch, loopParam]
      .filter(Boolean)
      .forEach(p => ids.add(p!.id));
    return ids;
  }, [filterCutoff, filterResonance, attack, decay, sustain, release, volume, pan, pitch, loopParam]);

  const extraParams = useMemo(
    () => params.filter(p => !mappedIds.has(p.id)).slice(0, 8),
    [params, mappedIds],
  );

  // Root key state (MIDI note 0-127, default C3 = 60)
  const [rootKey, setRootKey] = useState(60);

  // Waveform placeholder state (no actual sample data from IPC yet)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const [sampleStart, setSampleStart] = useState(0);
  const [sampleEnd, setSampleEnd] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0.25);
  const [loopEnd, setLoopEnd] = useState(0.75);

  // ---- Fetch plugins when track changes ----
  useEffect(() => {
    if (!selectedTrackId) {
      setPlugins([]);
      setActivePlugin(null);
      setParams([]);
      setPresets([]);
      return;
    }

    setLoading(true);
    ipc.getTrackPlugins(selectedTrackId)
      .then((data) => {
        const pluginList = data.plugins || [];
        setPlugins(pluginList);

        // Find the first instrument/sampler plugin
        const instrument = pluginList.find(p => isInstrumentPlugin(p.name));
        const target = instrument || pluginList[0] || null;
        setActivePlugin(target);
      })
      .catch(() => {
        setPlugins([]);
        setActivePlugin(null);
      })
      .finally(() => setLoading(false));
  }, [selectedTrackId]);

  // ---- Fetch parameters + presets when active plugin changes ----
  useEffect(() => {
    if (!selectedTrackId || !activePlugin) {
      setParams([]);
      setPresets([]);
      setCurrentPreset('');
      return;
    }

    ipc.getPluginParameters(selectedTrackId, activePlugin.processor_id)
      .then((paramList) => {
        setParams(Array.isArray(paramList) ? paramList : []);
      })
      .catch(() => setParams([]));

    ipc.listPluginPresets(selectedTrackId, activePlugin.processor_id)
      .then((data) => {
        setPresets(data.presets || []);
        setCurrentPreset(data.current_preset || '');
      })
      .catch(() => {
        setPresets([]);
        setCurrentPreset('');
      });
  }, [selectedTrackId, activePlugin]);

  // ---- Draw waveform placeholder ----
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#1a1a1c';
    ctx.fillRect(0, 0, w, h);

    const centerY = h / 2;
    const trackColor = selectedTrack?.color || '#9B6AAE';

    // Grid lines
    ctx.strokeStyle = '#2a2a2c';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero line
    ctx.strokeStyle = '#3a3a3c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // Generate a convincing waveform shape using sine harmonics
    const numPoints = w;
    const wavePoints: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      // Synthesize a plausible sample waveform with envelope
      const envelope =
        Math.sin(t * Math.PI) * // overall shape
        (0.3 + 0.7 * Math.pow(Math.sin(t * Math.PI * 0.5), 0.3)); // attack bias
      const wave =
        Math.sin(t * 80 * Math.PI) * 0.6 +
        Math.sin(t * 160 * Math.PI) * 0.25 +
        Math.sin(t * 320 * Math.PI) * 0.1 +
        Math.sin(t * 47 * Math.PI) * 0.15;
      wavePoints.push(wave * envelope * 0.7);
    }

    // Inactive region (before start, after end) — dimmed
    const startPx = Math.floor(sampleStart * w);
    const endPx = Math.floor(sampleEnd * w);

    // Draw inactive regions (dimmed)
    if (startPx > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, startPx, h);
    }
    if (endPx < w) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(endPx, 0, w - endPx, h);
    }

    // Loop region highlight
    if (loopEnabled) {
      const loopStartPx = Math.floor(loopStart * w);
      const loopEndPx = Math.floor(loopEnd * w);
      ctx.fillStyle = 'rgba(106, 90, 205, 0.12)';
      ctx.fillRect(loopStartPx, 0, loopEndPx - loopStartPx, h);

      // Loop boundaries
      ctx.strokeStyle = '#6A5ACD';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(loopStartPx + 0.5, 0);
      ctx.lineTo(loopStartPx + 0.5, h);
      ctx.moveTo(loopEndPx + 0.5, 0);
      ctx.lineTo(loopEndPx + 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Waveform fill
    ctx.fillStyle = `${trackColor}40`;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    for (let i = 0; i < numPoints; i++) {
      const amp = Math.abs(wavePoints[i]) * (h * 0.42);
      ctx.lineTo(i, centerY - amp);
    }
    for (let i = numPoints - 1; i >= 0; i--) {
      const amp = Math.abs(wavePoints[i]) * (h * 0.42);
      ctx.lineTo(i, centerY + amp);
    }
    ctx.closePath();
    ctx.fill();

    // Waveform outline
    ctx.strokeStyle = `${trackColor}cc`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const amp = Math.abs(wavePoints[i]) * (h * 0.42);
      if (i === 0) ctx.moveTo(i, centerY - amp);
      else ctx.lineTo(i, centerY - amp);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const amp = Math.abs(wavePoints[i]) * (h * 0.42);
      if (i === 0) ctx.moveTo(i, centerY + amp);
      else ctx.lineTo(i, centerY + amp);
    }
    ctx.stroke();

    // Start/End markers
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startPx + 0.5, 0);
    ctx.lineTo(startPx + 0.5, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endPx + 0.5, 0);
    ctx.lineTo(endPx + 0.5, h);
    ctx.stroke();

    // Start/End triangles
    ctx.fillStyle = '#e0e0e0';
    // Start triangle (top-left)
    ctx.beginPath();
    ctx.moveTo(startPx, 0);
    ctx.lineTo(startPx + 8, 0);
    ctx.lineTo(startPx, 8);
    ctx.closePath();
    ctx.fill();
    // End triangle (top-right)
    ctx.beginPath();
    ctx.moveTo(endPx, 0);
    ctx.lineTo(endPx - 8, 0);
    ctx.lineTo(endPx, 8);
    ctx.closePath();
    ctx.fill();
  }, [sampleStart, sampleEnd, loopEnabled, loopStart, loopEnd, selectedTrack?.color]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const container = waveformContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => drawWaveform());
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawWaveform]);

  // ---- Parameter change handler ----
  const handleParamChange = useCallback(
    (param: PluginParameter, normalizedValue: number) => {
      if (!selectedTrackId || !activePlugin) return;
      const rawValue = denormalizeParam(normalizedValue, param);
      ipc.setPluginParameter(selectedTrackId, activePlugin.processor_id, param.id, rawValue)
        .catch(() => {});
      // Optimistic update
      setParams(prev =>
        prev.map(p => (p.id === param.id ? { ...p, value: rawValue } : p)),
      );
    },
    [selectedTrackId, activePlugin],
  );

  // ---- Preset change handler ----
  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const uri = e.target.value;
      if (!selectedTrackId || !activePlugin || !uri) return;
      setCurrentPreset(uri);
      ipc.loadPluginPreset(selectedTrackId, activePlugin.processor_id, uri)
        .then(() => {
          // Refresh parameters after preset load
          return ipc.getPluginParameters(selectedTrackId, activePlugin.processor_id);
        })
        .then((paramList) => {
          setParams(Array.isArray(paramList) ? paramList : []);
        })
        .catch(() => {});
    },
    [selectedTrackId, activePlugin],
  );

  // ---- Open native plugin GUI ----
  const handleOpenEditor = useCallback(() => {
    if (!selectedTrackId || !activePlugin) return;
    ipc.openPluginEditor(selectedTrackId, activePlugin.processor_id).catch(() => {});
  }, [selectedTrackId, activePlugin]);

  // ---- Plugin enable/disable ----
  const handleToggleEnabled = useCallback(() => {
    if (!selectedTrackId || !activePlugin) return;
    const next = !activePlugin.enabled;
    ipc.setPluginEnabled(selectedTrackId, activePlugin.processor_id, next).catch(() => {});
    setActivePlugin(prev => prev ? { ...prev, enabled: next } : null);
  }, [selectedTrackId, activePlugin]);

  // ---- Root key adjust ----
  const handleRootKeyDown = useCallback(() => {
    setRootKey(prev => Math.max(0, prev - 1));
  }, []);
  const handleRootKeyUp = useCallback(() => {
    setRootKey(prev => Math.min(127, prev + 1));
  }, []);

  // ---- Loop toggle ----
  const handleLoopToggle = useCallback(() => {
    setLoopEnabled(prev => !prev);
    if (loopParam && selectedTrackId && activePlugin) {
      const newVal = loopParam.value > loopParam.min ? loopParam.min : loopParam.max;
      ipc.setPluginParameter(selectedTrackId, activePlugin.processor_id, loopParam.id, newVal)
        .catch(() => {});
      setParams(prev =>
        prev.map(p => (p.id === loopParam.id ? { ...p, value: newVal } : p)),
      );
    }
  }, [loopParam, selectedTrackId, activePlugin]);

  // ---- Browse instruments ----
  const handleBrowseInstruments = useCallback(() => {
    // Open the right zone with the VSTi browser tab
    useUIStore.getState().toggleRightZone();
    useUIStore.getState().setRightZoneTab('vsti');
  }, []);

  // ---- No track selected ----
  if (!selectedTrackId || !selectedTrack) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="10" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M8 22V14L12 18L8 22Z" fill="currentColor" opacity="0.4" />
              <rect x="14" y="13" width="2" height="10" rx="1" fill="currentColor" opacity="0.3" />
              <rect x="18" y="15" width="2" height="6" rx="1" fill="currentColor" opacity="0.3" />
              <rect x="22" y="12" width="2" height="12" rx="1" fill="currentColor" opacity="0.3" />
              <rect x="26" y="14" width="2" height="8" rx="1" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <span className={styles.emptyMessage}>No Sampler Track Selected</span>
          <span className={styles.emptyHint}>Select an instrument or sampler track to view controls</span>
        </div>
      </div>
    );
  }

  // ---- Track selected but no instrument plugin ----
  const isSamplerTrack = selectedTrack.type === 'sampler' || selectedTrack.type === 'instrument' || selectedTrack.type === 'midi';

  if (!loading && !activePlugin && plugins.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="10" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="13" y1="18" x2="23" y2="18" stroke="currentColor" strokeWidth="1.5" />
              <line x1="18" y1="13" x2="18" y2="23" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <span className={styles.emptyMessage}>No Sampler Loaded</span>
          <span className={styles.emptyHint}>
            {isSamplerTrack
              ? 'Load an instrument plugin to use the sampler controls'
              : 'This track type does not support sampler controls'}
          </span>
          {isSamplerTrack && (
            <button className={styles.browseBtn} onClick={handleBrowseInstruments}>
              Browse Instruments
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyMessage}>Loading...</span>
        </div>
      </div>
    );
  }

  // ---- Main Sampler Control layout ----
  return (
    <div className={styles.container}>
      {/* ---- Header ---- */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={`${styles.enableBtn} ${activePlugin?.enabled ? styles.enableBtnActive : ''}`}
            onClick={handleToggleEnabled}
            title={activePlugin?.enabled ? 'Bypass plugin' : 'Enable plugin'}
          >
            {activePlugin?.enabled ? 'ON' : 'OFF'}
          </button>
          <span className={styles.pluginName}>{activePlugin?.name || 'Unknown Plugin'}</span>
          {plugins.length > 1 && (
            <select
              className={styles.pluginSelect}
              value={activePlugin?.processor_id || ''}
              onChange={(e) => {
                const p = plugins.find(pl => pl.processor_id === e.target.value);
                if (p) setActivePlugin(p);
              }}
            >
              {plugins.map(p => (
                <option key={p.processor_id} value={p.processor_id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className={styles.headerRight}>
          <select
            className={styles.presetSelect}
            value={currentPreset}
            onChange={handlePresetChange}
          >
            <option value="">-- Presets --</option>
            {presets.map(p => (
              <option key={p.uri} value={p.uri}>{p.label}</option>
            ))}
          </select>
          <button className={styles.headerBtn} onClick={handleOpenEditor} title="Open plugin editor">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <line x1="1" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="4" cy="7.5" r="1.2" fill="currentColor" opacity="0.5" />
              <circle cx="8" cy="7.5" r="1.2" fill="currentColor" opacity="0.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ---- Main content ---- */}
      <div className={styles.mainLayout}>
        {/* Left: Waveform display */}
        <div className={styles.waveformSection}>
          <div className={styles.waveformHeader}>
            <span className={styles.sectionLabel}>SAMPLE</span>
            <div className={styles.waveformControls}>
              <button
                className={`${styles.loopBtn} ${loopEnabled ? styles.loopBtnActive : ''}`}
                onClick={handleLoopToggle}
                title="Toggle loop"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4C2 2.9 2.9 2 4 2H8C9.1 2 10 2.9 10 4V5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  <path d="M10 8C10 9.1 9.1 10 8 10H4C2.9 10 2 9.1 2 8V7" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  <path d="M9 3.5L10.5 5L12 3.5" stroke="currentColor" strokeWidth="1" fill="none" />
                  <path d="M3 8.5L1.5 7L0 8.5" stroke="currentColor" strokeWidth="1" fill="none" />
                </svg>
              </button>
            </div>
          </div>
          <div ref={waveformContainerRef} className={styles.waveformArea}>
            <canvas ref={waveformCanvasRef} className={styles.waveformCanvas} />
          </div>
          <div className={styles.waveformInfo}>
            <div className={styles.waveInfoItem}>
              <span className={styles.waveInfoLabel}>Start</span>
              <span className={styles.waveInfoValue}>{(sampleStart * 100).toFixed(1)}%</span>
            </div>
            <div className={styles.waveInfoItem}>
              <span className={styles.waveInfoLabel}>End</span>
              <span className={styles.waveInfoValue}>{(sampleEnd * 100).toFixed(1)}%</span>
            </div>
            {loopEnabled && (
              <>
                <div className={styles.waveInfoItem}>
                  <span className={styles.waveInfoLabel}>Loop S</span>
                  <span className={styles.waveInfoValue}>{(loopStart * 100).toFixed(1)}%</span>
                </div>
                <div className={styles.waveInfoItem}>
                  <span className={styles.waveInfoLabel}>Loop E</span>
                  <span className={styles.waveInfoValue}>{(loopEnd * 100).toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className={styles.controlsSection}>
          {/* Pitch / Root Key */}
          <div className={styles.controlPanel}>
            <span className={styles.sectionLabel}>PITCH</span>
            <div className={styles.pitchRow}>
              <button className={styles.pitchBtn} onClick={handleRootKeyDown}>-</button>
              <span className={styles.pitchValue}>{midiNoteToName(rootKey)}</span>
              <button className={styles.pitchBtn} onClick={handleRootKeyUp}>+</button>
              {pitch && (
                <div className={styles.knobItem}>
                  <Knob
                    value={normalizeParam(pitch)}
                    onChange={(v) => handleParamChange(pitch, v)}
                    size={28}
                    color="#9B6AAE"
                    label="Tune"
                  />
                  <span className={styles.knobValue}>{formatParamValue(pitch)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Filter Section */}
          <div className={styles.controlPanel}>
            <span className={styles.sectionLabel}>FILTER</span>
            <div className={styles.knobRow}>
              {filterCutoff ? (
                <div className={styles.knobItem}>
                  <Knob
                    value={normalizeParam(filterCutoff)}
                    onChange={(v) => handleParamChange(filterCutoff, v)}
                    size={32}
                    color="#4A90D9"
                    label="Cutoff"
                  />
                  <span className={styles.knobValue}>{formatParamValue(filterCutoff)}</span>
                </div>
              ) : (
                <div className={styles.knobItem}>
                  <Knob value={0.7} size={32} color="#4A90D9" label="Cutoff" />
                  <span className={styles.knobValueDim}>--</span>
                </div>
              )}
              {filterResonance ? (
                <div className={styles.knobItem}>
                  <Knob
                    value={normalizeParam(filterResonance)}
                    onChange={(v) => handleParamChange(filterResonance, v)}
                    size={32}
                    color="#4A90D9"
                    label="Reso"
                  />
                  <span className={styles.knobValue}>{formatParamValue(filterResonance)}</span>
                </div>
              ) : (
                <div className={styles.knobItem}>
                  <Knob value={0} size={32} color="#4A90D9" label="Reso" />
                  <span className={styles.knobValueDim}>--</span>
                </div>
              )}
            </div>
          </div>

          {/* Volume / Pan */}
          <div className={styles.controlPanel}>
            <span className={styles.sectionLabel}>OUTPUT</span>
            <div className={styles.knobRow}>
              {volume ? (
                <div className={styles.knobItem}>
                  <Knob
                    value={normalizeParam(volume)}
                    onChange={(v) => handleParamChange(volume, v)}
                    size={28}
                    color="#4CAF50"
                    label="Level"
                  />
                  <span className={styles.knobValue}>{formatParamValue(volume)}</span>
                </div>
              ) : (
                <div className={styles.knobItem}>
                  <Knob value={0.75} size={28} color="#4CAF50" label="Level" />
                  <span className={styles.knobValueDim}>--</span>
                </div>
              )}
              {pan ? (
                <div className={styles.knobItem}>
                  <Knob
                    value={normalizeParam(pan)}
                    onChange={(v) => handleParamChange(pan, v)}
                    size={28}
                    color="#C8A830"
                    label="Pan"
                    bipolar
                  />
                  <span className={styles.knobValue}>{formatParamValue(pan)}</span>
                </div>
              ) : (
                <div className={styles.knobItem}>
                  <Knob value={0} size={28} color="#C8A830" label="Pan" bipolar />
                  <span className={styles.knobValueDim}>--</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Bottom: ADSR Envelope + Extra Params ---- */}
      <div className={styles.bottomSection}>
        {/* ADSR */}
        <div className={styles.adsrPanel}>
          <span className={styles.sectionLabel}>AMP ENVELOPE</span>
          <div className={styles.adsrRow}>
            <AdsrSlider
              label="A"
              param={attack}
              color="#E57373"
              onChange={handleParamChange}
            />
            <AdsrSlider
              label="D"
              param={decay}
              color="#FFB74D"
              onChange={handleParamChange}
            />
            <AdsrSlider
              label="S"
              param={sustain}
              color="#81C784"
              onChange={handleParamChange}
            />
            <AdsrSlider
              label="R"
              param={release}
              color="#64B5F6"
              onChange={handleParamChange}
            />
          </div>
        </div>

        {/* Extra unmapped parameters */}
        {extraParams.length > 0 && (
          <div className={styles.extraPanel}>
            <span className={styles.sectionLabel}>PARAMETERS</span>
            <div className={styles.extraRow}>
              {extraParams.map(p => (
                <div key={p.id} className={styles.knobItem}>
                  <Knob
                    value={normalizeParam(p)}
                    onChange={(v) => handleParamChange(p, v)}
                    size={24}
                    color="#888"
                    label={p.name.length > 8 ? p.name.substring(0, 8) : p.name}
                  />
                  <span className={styles.knobValue}>{formatParamValue(p)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ADSR Slider sub-component
// ---------------------------------------------------------------------------

interface AdsrSliderProps {
  label: string;
  param: PluginParameter | null;
  color: string;
  onChange: (param: PluginParameter, value: number) => void;
}

const AdsrSlider: React.FC<AdsrSliderProps> = ({ label, param, color, onChange }) => {
  const value = param ? normalizeParam(param) : 0.2;
  const displayValue = param ? formatParamValue(param) : '--';
  const hasParam = param !== null;

  const handleChange = useCallback(
    (v: number) => {
      if (param) onChange(param, v);
    },
    [param, onChange],
  );

  return (
    <div className={styles.adsrItem}>
      <Fader
        value={value}
        onChange={hasParam ? handleChange : undefined}
        height={80}
        orientation="vertical"
        color={color}
        disabled={!hasParam}
      />
      <span className={styles.adsrLabel}>{label}</span>
      <span className={hasParam ? styles.adsrValue : styles.adsrValueDim}>
        {displayValue}
      </span>
    </div>
  );
};
