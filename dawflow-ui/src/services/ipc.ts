/**
 * IPC Command Service — typed access to all DAWFLOW engine commands
 * via the ui-shell HTTP proxy (POST /api/command).
 *
 * The ui-shell plugin runs an HTTP server (default port 19100) that proxies
 * JSON-RPC 2.0 commands to the engine over a Unix domain socket. This module
 * provides a typed TypeScript layer on top of that endpoint so the React UI
 * can call any of the ~253 engine commands with full type safety.
 *
 * When the React UI is served directly from the ui-shell (port 19100), the
 * base URL is the same origin. Otherwise it falls back to localhost:19100.
 */

// ---------------------------------------------------------------------------
// Types — returned by the engine
// ---------------------------------------------------------------------------

export interface SessionInfo {
  name: string;
  path: string;
  sample_rate: number;
  frame_rate: number;
  transport_rolling: boolean;
  transport_speed: number;
  transport_position: number;
  tempo: number;
  time_signature_numerator: number;
  time_signature_denominator: number;
}

export interface EngineTrack {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'bus' | 'vca';
  muted: boolean;
  soloed: boolean;
  record_enabled: boolean;
  gain_db: number;
  color: string;
}

export interface TransportState {
  rolling: boolean;
  recording: boolean;
  speed: number;
  position: number;
  tempo: number;
  time_signature_numerator: number;
  time_signature_denominator: number;
}

export interface UndoEntry {
  label: string;
}

export interface UndoHistory {
  undo: UndoEntry[];
  redo: UndoEntry[];
}

export interface Marker {
  id: string;
  name: string;
  position: number;
  type: string;
}

export interface Region {
  id: string;
  name: string;
  position: number;
  length: number;
  start: number;
  muted: boolean;
}

export interface AudioPeaks {
  region_id: string;
  peaks: number[];
  width: number;
}

export interface MidiNote {
  id: number;
  note: number;
  velocity: number;
  channel: number;
  start: number;
  length: number;
}

export interface PluginInfo {
  id: string;
  name: string;
  type: string;
  category: string;
  creator: string;
}

export interface PluginParameter {
  id: number;
  name: string;
  value: number;
  min: number;
  max: number;
  label: string;
}

export interface CpuLoadInfo {
  cpu_load: number;
}

export interface MasterPeakInfo {
  peak_db: number;
  left_db: number;
  right_db: number;
}

export interface TrackAddResult {
  track_id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Base URL detection
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.port === '19100') {
    return window.location.origin;
  }
  return 'http://localhost:19100';
}

// ---------------------------------------------------------------------------
// JSON-RPC error type
// ---------------------------------------------------------------------------

export class IpcError extends Error {
  code: number;
  data?: unknown;

  constructor(message: string, code: number, data?: unknown) {
    super(message);
    this.name = 'IpcError';
    this.code = code;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Core call function
// ---------------------------------------------------------------------------

/**
 * Send a JSON-RPC 2.0 command to the engine via the ui-shell HTTP proxy.
 *
 * @param method  The IPC method name (e.g. "daw.get_tracks")
 * @param params  Optional parameters object
 * @returns       The typed result from the engine
 * @throws        IpcError on JSON-RPC errors, Error on HTTP/network failures
 */
export async function ipcCall<T>(
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const url = `${getBaseUrl()}/api/command`;

  const body: Record<string, unknown> = { method };
  if (params !== undefined) {
    body.params = params;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`IPC call timed out calling ${method}`);
    }
    throw new Error(
      `IPC network error calling ${method}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `IPC HTTP ${response.status} calling ${method}: ${text}`,
    );
  }

  const result: T | { error: string | { code: number; message: string; data?: unknown } } =
    await response.json();

  // The ui-shell proxy returns the raw result from Plugin::call().
  // On errors, that result is an object with an "error" key.
  if (
    result !== null &&
    typeof result === 'object' &&
    'error' in result
  ) {
    const err = (result as { error: string | { code: number; message: string; data?: unknown } }).error;
    if (typeof err === 'string') {
      throw new IpcError(err, -1);
    }
    throw new IpcError(err.message, err.code, err.data);
  }

  return result as T;
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Session
// ---------------------------------------------------------------------------

async function getSessionInfo(): Promise<SessionInfo> {
  return ipcCall<SessionInfo>('daw.get_session_info');
}

async function saveSession(): Promise<void> {
  await ipcCall<unknown>('daw.save_session');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Tracks
// ---------------------------------------------------------------------------

async function getTracks(): Promise<EngineTrack[]> {
  return ipcCall<EngineTrack[]>('daw.get_tracks');
}

async function addAudioTrack(name?: string): Promise<TrackAddResult> {
  return ipcCall<TrackAddResult>('daw.add_audio_track', {
    ...(name !== undefined && { name }),
  });
}

async function addMidiTrack(name?: string): Promise<TrackAddResult> {
  return ipcCall<TrackAddResult>('daw.add_midi_track', {
    ...(name !== undefined && { name }),
  });
}

async function addBus(name?: string): Promise<TrackAddResult> {
  return ipcCall<TrackAddResult>('daw.add_bus', {
    ...(name !== undefined && { name }),
  });
}

async function removeTrack(trackId: string): Promise<void> {
  await ipcCall<unknown>('daw.remove_track', { track_id: trackId });
}

async function renameTrack(trackId: string, name: string): Promise<void> {
  await ipcCall<unknown>('daw.rename_track', { track_id: trackId, name });
}

async function setTrackGain(trackId: string, gainDb: number): Promise<void> {
  await ipcCall<unknown>('daw.set_track_gain', { track_id: trackId, gain_db: gainDb });
}

async function setTrackMute(trackId: string, muted: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_mute', { track_id: trackId, muted });
}

async function setTrackSolo(trackId: string, soloed: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_solo', { track_id: trackId, soloed });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Transport
// ---------------------------------------------------------------------------

async function play(): Promise<void> {
  await ipcCall<unknown>('daw.transport_play');
}

async function stop(): Promise<void> {
  await ipcCall<unknown>('daw.transport_stop');
}

async function setTempo(bpm: number): Promise<void> {
  await ipcCall<unknown>('daw.set_tempo', { bpm });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Undo/Redo
// ---------------------------------------------------------------------------

async function undo(count?: number): Promise<void> {
  await ipcCall<unknown>('daw.undo', { ...(count !== undefined && { count }) });
}

async function redo(count?: number): Promise<void> {
  await ipcCall<unknown>('daw.redo', { ...(count !== undefined && { count }) });
}

async function getUndoHistory(): Promise<UndoHistory> {
  return ipcCall<UndoHistory>('daw.get_undo_history');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Markers
// ---------------------------------------------------------------------------

async function getMarkers(): Promise<Marker[]> {
  return ipcCall<Marker[]>('daw.get_markers');
}

async function addMarker(name: string, position?: number): Promise<void> {
  await ipcCall<unknown>('daw.add_marker', {
    name,
    ...(position !== undefined && { position }),
  });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Regions
// ---------------------------------------------------------------------------

async function getRegions(trackId: string): Promise<Region[]> {
  return ipcCall<Region[]>('daw.get_regions', { track_id: trackId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Audio Peaks
// ---------------------------------------------------------------------------

async function getAudioPeaks(regionId: string, width: number): Promise<AudioPeaks> {
  return ipcCall<AudioPeaks>('daw.get_audio_peaks', { region_id: regionId, width });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — MIDI
// ---------------------------------------------------------------------------

async function getMidiNotes(regionId: string): Promise<MidiNote[]> {
  return ipcCall<MidiNote[]>('daw.get_midi_notes', { region_id: regionId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Plugins
// ---------------------------------------------------------------------------

async function getAvailablePlugins(): Promise<PluginInfo[]> {
  return ipcCall<PluginInfo[]>('daw.get_available_plugins');
}

async function loadPlugin(trackId: string, pluginId: string): Promise<void> {
  await ipcCall<unknown>('daw.load_plugin', { track_id: trackId, plugin_id: pluginId });
}

async function getPluginParameters(trackId: string, pluginIndex: number): Promise<PluginParameter[]> {
  return ipcCall<PluginParameter[]>('daw.get_plugin_parameters', {
    track_id: trackId,
    plugin_index: pluginIndex,
  });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Metering
// ---------------------------------------------------------------------------

async function getCpuLoad(): Promise<CpuLoadInfo> {
  return ipcCall<CpuLoadInfo>('daw.get_cpu_load');
}

async function getMasterPeak(): Promise<MasterPeakInfo> {
  return ipcCall<MasterPeakInfo>('daw.get_master_peak');
}

// ---------------------------------------------------------------------------
// Generic pass-through
// ---------------------------------------------------------------------------

async function call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  return ipcCall<T>(method, params);
}

// ---------------------------------------------------------------------------
// Bundled export
// ---------------------------------------------------------------------------

export const ipc = {
  // Session
  getSessionInfo,
  saveSession,

  // Tracks
  getTracks,
  addAudioTrack,
  addMidiTrack,
  addBus,
  removeTrack,
  renameTrack,
  setTrackGain,
  setTrackMute,
  setTrackSolo,

  // Transport
  play,
  stop,
  setTempo,

  // Undo/Redo
  undo,
  redo,
  getUndoHistory,

  // Markers
  getMarkers,
  addMarker,

  // Regions
  getRegions,

  // Audio Peaks
  getAudioPeaks,

  // MIDI
  getMidiNotes,

  // Plugins
  getAvailablePlugins,
  loadPlugin,
  getPluginParameters,

  // Metering
  getCpuLoad,
  getMasterPeak,

  // Generic
  call,
} as const;
