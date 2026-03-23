/**
 * WebSocket service — connects the DAWFLOW React UI to the Ardour engine.
 *
 * Uses the REAL Ardour WebSocket protocol (port 3818).
 * Message format: { node: string, addr: number[], val: (number|string|boolean)[] }
 *
 * Available nodes:
 *   transport_roll, transport_record, transport_tempo, transport_time, transport_bbt
 *   strip_description, strip_gain, strip_pan, strip_mute, strip_meter
 *   strip_plugin_description, strip_plugin_enable, strip_plugin_param_value
 */

import { useTransportStore } from '../stores/transport';
import { useSessionStore } from '../stores/session';
import { useConnectionStore } from '../stores/connection';
import { useMeterStore } from '../stores/meters';
import { ipc } from './ipc';

const JSON_INF = 1.0e+128;

interface ArdourMessage {
  node: string;
  addr: number[];
  val: (number | string | boolean)[];
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let ipcEnabled = true;

function getWsUrl(): string {
  // When served from Ardour's built-in HTTP server (port 3818),
  // use the same host. Otherwise fall back to configured URL.
  if (typeof window !== 'undefined' && window.location.port === '3818') {
    return `ws://${window.location.host}`;
  }
  return useConnectionStore.getState().wsUrl;
}

export function connectToEngine(url?: string) {
  const wsUrl = url || getWsUrl();
  if (ws && ws.readyState === WebSocket.OPEN) return;

  try {
    ws = new WebSocket(wsUrl);
  } catch {
    scheduleReconnect(wsUrl);
    return;
  }

  ws.onopen = () => {
    console.log('[DAWFLOW] Connected to engine at', wsUrl);
    ipcEnabled = true;
    useConnectionStore.getState().setWsConnected(true);

    // Fetch real track data from engine via IPC
    useSessionStore.getState().fetchFromEngine();

    // Fetch loop range for locator display (use setState to avoid sending IPC back)
    ipc.getLoopRange().then((data: Record<string, unknown>) => {
      const start = Number(data.start_samples ?? 0);
      const end = Number(data.end_samples ?? 0);
      const sr = useSessionStore.getState().sampleRate || 48000;
      const tempo = useTransportStore.getState().tempo || 120;
      const bps = tempo / 60;
      const toBBT = (sec: number) => {
        const totalBeats = sec * bps;
        const bar = Math.floor(totalBeats / 4) + 1;
        const beat = Math.floor(totalBeats % 4) + 1;
        const tick = Math.floor((totalBeats % 1) * 480);
        return `${bar}.${beat}.${tick}`;
      };
      if (end > start) {
        const startSec = start / sr;
        const endSec = end / sr;
        useTransportStore.setState({
          leftLocator: startSec,
          rightLocator: endSec,
          leftLocatorDisplay: toBBT(startSec),
          rightLocatorDisplay: toBBT(endSec),
        });
      }
    }).catch(() => {});

    // Sync metronome state — turn it off on startup (UI defaults to off)
    ipc.call('daw.set_click_enabled', { enabled: false }).then(() => {
      useTransportStore.setState({ metronomeEnabled: false });
    }).catch(() => {});

    // Set preferred audio output device (Universal Audio if available)
    ipc.call('daw.backend.enumerate_output_devices').then((raw: unknown) => {
      const data = raw as Record<string, unknown>;
      const devices = (data.devices || data.output_devices || []) as Array<{ name: string; id?: string }>;
      const ua = devices.find(d => d.name && (
        d.name.toLowerCase().includes('universal audio') ||
        d.name.toLowerCase().includes('ua ') ||
        d.name.toLowerCase().includes('apollo')
      ));
      if (ua) {
        ipc.call('daw.backend.set_output_device', { device_name: ua.name })
          .then(() => console.log('[DAWFLOW] Set output device:', ua.name))
          .catch(() => {});
      }
    }).catch(() => {});

    // Poll CPU load every 5 seconds (light query)
    pollTimer = setInterval(() => {
      if (ipcEnabled) {
        ipc.getCpuLoad().then((info) => {
          const load = (info as { cpu_load_percent?: number; cpu_load?: number }).cpu_load_percent
            ?? (info as { cpu_load?: number }).cpu_load ?? 0;
          useTransportStore.getState().setCpuLoad(Math.min(100, load));
        }).catch(() => {});
      }
    }, 5000);

    // NOTE: We do NOT poll tracks/regions/session on a timer anymore.
    // State is fetched once on connect and then on-demand after user actions
    // (add track, delete, record stop, etc). This prevents the engine's
    // responses from overwriting optimistic local state updates.
  };

  ws.onmessage = (event) => {
    try {
      const raw = JSON.parse(event.data);
      const msg: ArdourMessage = {
        node: raw.node,
        addr: raw.addr || [],
        val: (raw.val || []).map((v: number) =>
          v >= JSON_INF ? Infinity : v <= -JSON_INF ? -Infinity : v
        ),
      };
      handleMessage(msg);
    } catch {
      // Non-JSON or malformed — ignore
    }
  };

  ws.onclose = () => {
    console.log('[DAWFLOW] Disconnected from engine');
    ipcEnabled = false;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    useConnectionStore.getState().setWsConnected(false);
    ws = null;
    scheduleReconnect(wsUrl);
  };

  ws.onerror = () => { /* onclose fires after this */ };
}

export function disconnectFromEngine() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { ws.close(); ws = null; }
  useConnectionStore.getState().setWsConnected(false);
}

function scheduleReconnect(url: string) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToEngine(url);
  }, 2000);
}

function send(node: string, addr: number[] = [], val: (number | string | boolean)[] = []) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const serializedVal = val.map(v =>
    v === Infinity ? JSON_INF : v === -Infinity ? -JSON_INF : v
  );
  ws.send(JSON.stringify({ node, addr, val: serializedVal }));
}

// ======================================================================
// COMMANDS: UI → Engine (using real Ardour protocol)
// ======================================================================

export function engineTransportRoll(roll: boolean) {
  send('transport_roll', [], [roll]);
}

export function engineTransportRecord(record: boolean) {
  send('transport_record', [], [record]);
}

export function engineSetTempo(bpm: number) {
  send('transport_tempo', [], [bpm]);
}

export function engineSetStripGain(stripId: number, gain: number) {
  send('strip_gain', [stripId], [gain]);
}

export function engineSetStripPan(stripId: number, pan: number) {
  send('strip_pan', [stripId], [pan]);
}

export function engineSetStripMute(stripId: number, mute: boolean) {
  send('strip_mute', [stripId], [mute]);
}

export function engineSetPluginEnable(stripId: number, pluginId: number, enabled: boolean) {
  send('strip_plugin_enable', [stripId, pluginId], [enabled]);
}

export function engineSetPluginParam(stripId: number, pluginId: number, paramId: number, value: number) {
  send('strip_plugin_param_value', [stripId, pluginId, paramId], [value]);
}

// ======================================================================
// MESSAGE HANDLERS: Engine → UI (update Zustand stores)
// ======================================================================

function handleMessage(msg: ArdourMessage) {
  const { node, addr, val } = msg;

  switch (node) {
    // ---------------------------------------------------------------
    // IMPORTANT: Engine → UI handlers use updateFromEngine() or direct
    // state setters that do NOT send commands back to the engine.
    // This prevents infinite loops (engine event → store action →
    // WebSocket command → engine event → ...).
    // ---------------------------------------------------------------

    case 'transport_roll': {
      if (val[0]) {
        useTransportStore.getState().updateFromEngine({ playing: true });
      } else {
        useTransportStore.getState().updateFromEngine({ playing: false, recording: false });
        // Refresh regions after playback/recording stops.
        // Ardour needs time to commit recorded audio to disk and create regions.
        // Two fetches: quick one for fast commits, delayed one for slow commits.
        // The debounce in fetchFromEngine prevents redundant calls within 1s.
        setTimeout(() => useSessionStore.getState().fetchFromEngine(), 300);
        setTimeout(() => useSessionStore.getState().fetchFromEngine(), 2000);
      }
      break;
    }

    case 'transport_record': {
      if (val[0]) {
        useTransportStore.getState().updateFromEngine({ recording: true, playing: true });
        // No polling during recording — CenterZone shows a fake "Recording..." visual.
        // Regions are fetched on transport stop (transport_roll false handler above).
      } else {
        useTransportStore.getState().updateFromEngine({ recording: false });
      }
      break;
    }

    case 'transport_tempo': {
      useTransportStore.getState().updateFromEngine({ tempo: val[0] as number });
      break;
    }

    case 'transport_time': {
      const pos = val[0] as number;
      // Use updateFromEngine (not setPosition) to respect the user-action debounce.
      // This prevents the engine's old position from overwriting a user's seek.
      useTransportStore.getState().updateFromEngine({ position: pos });
      break;
    }

    case 'transport_bbt': {
      // BBT format from Ardour: bar|beat|tick
      const bbt = val[0] as string;
      if (bbt) {
        useTransportStore.getState().setPositionDisplay(bbt.replace(/\|/g, '.'));
      }
      break;
    }

    case 'strip_description': {
      // val = [name, flags...] — update track name in session store
      const stripId = addr[0];
      const name = val[0] as string;
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      if (track && track.name !== name) {
        session.setTrackName(track.id, name);
      }
      break;
    }

    case 'strip_gain': {
      const stripId = addr[0];
      const gain = val[0] as number;
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      // Use updateTracks to avoid re-sending the command back to the engine
      if (track) {
        session.updateTracks(
          session.tracks.map((t) => t.id === track.id ? { ...t, volume: gain } : t)
        );
      }
      break;
    }

    case 'strip_pan': {
      const stripId = addr[0];
      const pan = val[0] as number;
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      if (track) {
        session.updateTracks(
          session.tracks.map((t) => t.id === track.id ? { ...t, pan } : t)
        );
      }
      break;
    }

    case 'strip_mute': {
      const stripId = addr[0];
      const muted = val[0] as boolean;
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      if (track) {
        session.updateTracks(
          session.tracks.map((t) => t.id === track.id ? { ...t, muted } : t)
        );
      }
      break;
    }

    case 'strip_meter': {
      const stripId = addr[0];
      const level = val[0] as number; // dB value from engine
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      if (track) {
        // Convert dB to 0-1 range: -60dB = 0, 0dB = 1, clamp
        const newLevel = Math.max(0, Math.min(1, (level + 60) / 60));
        const currentLevel = useMeterStore.getState().levels[track.id] ?? 0;
        // Ballistic metering: instant attack, slow decay (~1.5s full falloff)
        const displayLevel = newLevel >= currentLevel
          ? newLevel
          : currentLevel * 0.92 + newLevel * 0.08;
        // Write to dedicated meter store — does NOT touch the tracks array
        useMeterStore.getState().setLevel(track.id, displayLevel < 0.005 ? 0 : displayLevel);
      }
      break;
    }

    default:
      break;
  }
}

// ======================================================================
// AUTO-CONNECT on module load (when served from Ardour)
// ======================================================================

if (typeof window !== 'undefined') {
  // Auto-connect after a short delay to let React render first
  setTimeout(() => connectToEngine(), 500);
}
