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

const JSON_INF = 1.0e+128;

interface ArdourMessage {
  node: string;
  addr: number[];
  val: (number | string | boolean)[];
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
    useConnectionStore.getState().setWsConnected(true);

    // Fetch real track data from engine via IPC
    useSessionStore.getState().fetchFromEngine();
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
    useConnectionStore.getState().setWsConnected(false);
    ws = null;
    scheduleReconnect(wsUrl);
  };

  ws.onerror = () => { /* onclose fires after this */ };
}

export function disconnectFromEngine() {
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
    case 'transport_roll': {
      const transport = useTransportStore.getState();
      if (val[0]) transport.play(); else transport.stop();
      break;
    }

    case 'transport_record': {
      if (val[0]) useTransportStore.getState().record();
      break;
    }

    case 'transport_tempo': {
      useTransportStore.getState().setTempo(val[0] as number);
      break;
    }

    case 'transport_time': {
      useTransportStore.getState().setPosition(val[0] as number);
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
      if (track) session.setTrackVolume(track.id, gain);
      break;
    }

    case 'strip_pan': {
      const stripId = addr[0];
      const pan = val[0] as number;
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      if (track) session.setTrackPan(track.id, pan);
      break;
    }

    case 'strip_mute': {
      const stripId = addr[0];
      const muted = val[0] as boolean;
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      if (track) session.setTrackMute(track.id, muted);
      break;
    }

    case 'strip_meter': {
      const stripId = addr[0];
      const level = val[0] as number; // dB value from engine
      const session = useSessionStore.getState();
      const track = session.tracks[stripId];
      if (track) {
        // Convert dB to 0-1 range: -60dB = 0, 0dB = 1, clamp
        const normalized = Math.max(0, Math.min(1, (level + 60) / 60));
        session.setTrackMeterLevel(track.id, normalized);
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
