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
  unique_id?: string;
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
  // Native WebView bridge: direct in-process call (~0ms latency)
  if (typeof (window as any).__dawflow_call === 'function') {
    return (window as any).__dawflow_call(method, params ?? {}) as Promise<T>;
  }

  // Fallback: HTTP POST via ui-shell proxy
  const url = `${getBaseUrl()}/api/command`;

  const body: Record<string, unknown> = { method };
  if (params !== undefined) {
    body.params = params;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

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
      const error = new Error(`IPC call timed out calling ${method}`);
      console.error('[DAWFLOW IPC]', method, 'failed:', error);
      throw error;
    }
    const error = new Error(
      `IPC network error calling ${method}: ${err instanceof Error ? err.message : String(err)}`,
    );
    console.error('[DAWFLOW IPC]', method, 'failed:', error);
    throw error;
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

async function setTrackRecord(trackId: string, enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_record', { track_id: trackId, enabled });
}

async function setTrackMonitor(trackId: string, enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_monitoring', { track_id: trackId, enabled });
}

async function setTrackColor(trackId: string, color: string): Promise<void> {
  await ipcCall<unknown>('daw.set_track_color', { track_id: trackId, color });
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

async function transportLocate(samplePosition: number): Promise<void> {
  await ipcCall<unknown>('daw.transport_locate', { sample_position: samplePosition });
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
  // Engine returns position_samples/length_samples/start_samples — map to our interface
  const raw = await ipcCall<Array<Record<string, unknown>>>('daw.get_regions', { track_id: trackId });
  if (!Array.isArray(raw)) return [];
  const regions = raw.map((r) => ({
    id: String(r.id || ''),
    name: String(r.name || ''),
    position: Number(r.position_samples ?? r.position ?? 0),
    length: Number(r.length_samples ?? r.length ?? 0),
    start: Number(r.start_samples ?? r.start ?? 0),
    sourceLength: Number(r.source_length_samples ?? r.length_samples ?? r.length ?? 0),
    muted: Boolean(r.muted),
    locked: Boolean(r.locked),
    fadeInLength: 0,
    fadeOutLength: 0,
  }));

  // Fetch fade lengths for each region in parallel
  await Promise.allSettled(regions.map(async (region) => {
    try {
      const [fadeIn, fadeOut] = await Promise.all([
        ipcCall<Record<string, unknown>>('daw.get_region_fade_in_length', { region_id: region.id }).catch(() => null),
        ipcCall<Record<string, unknown>>('daw.get_region_fade_out_length', { region_id: region.id }).catch(() => null),
      ]);
      if (fadeIn) region.fadeInLength = Number(fadeIn.fade_in_length ?? 0);
      if (fadeOut) region.fadeOutLength = Number(fadeOut.fade_out_length ?? 0);
    } catch { /* ignore */ }
  }));

  return regions;
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

async function getMidiNotes(regionId: string, trackId?: string): Promise<MidiNote[]> {
  const params: Record<string, unknown> = { region_id: regionId };
  if (trackId) params.track_id = trackId;
  return ipcCall<MidiNote[]>('daw.get_midi_notes', params);
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Plugins
// ---------------------------------------------------------------------------

async function getAvailablePlugins(): Promise<PluginInfo[]> {
  const data = await ipcCall<{ plugins: PluginInfo[]; count: number }>('daw.get_available_plugins');
  return data.plugins || [];
}

async function loadPlugin(trackId: string, pluginName: string): Promise<void> {
  await ipcCall<unknown>('daw.load_plugin', { track_id: trackId, plugin_name: pluginName });
}

async function getPluginParameters(trackId: string, processorId: string | number): Promise<PluginParameter[]> {
  return ipcCall<PluginParameter[]>('daw.get_plugin_parameters', {
    track_id: trackId,
    processor_id: String(processorId),
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
// Convenience wrappers — Session Management (extended)
// ---------------------------------------------------------------------------

async function getSessionProperties(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_session_properties');
}

async function getSessionStats(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_session_stats');
}

async function saveSessionAs(name: string, parentFolder?: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.save_session_as', { name, parent_folder: parentFolder });
}

async function snapshotSession(name?: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.snapshot_session', { name });
}

async function renameSession(name: string): Promise<void> {
  await ipcCall<unknown>('daw.rename_session', { name });
}

async function getRecentSessions(): Promise<Array<{ name: string; path: string }>> {
  const data = await ipcCall<{ sessions: Array<{ name: string; path: string }> }>('daw.get_recent_sessions');
  return data.sessions || [];
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Transport (extended)
// ---------------------------------------------------------------------------

async function getTransportStateFull(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_transport_state_full');
}

async function getPlayheadPosition(): Promise<{ position_samples: number; position_seconds: number; sample_rate: number }> {
  return ipcCall<{ position_samples: number; position_seconds: number; sample_rate: number }>('daw.get_playhead_position');
}

async function setPlayheadPosition(samples: number): Promise<void> {
  await ipcCall<unknown>('daw.set_playhead_position', { position_samples: samples });
}

async function toggleLoop(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.toggle_loop');
}

async function setLoopEnabled(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_loop_enabled', { enabled });
}

async function setLoopRange(startSample: number, endSample: number): Promise<void> {
  await ipcCall<unknown>('daw.set_loop_range', { start_sample: startSample, end_sample: endSample });
}

async function getLoopRange(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_loop_range');
}

async function setPunchIn(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_punch_in', { enabled });
}

async function setPunchOut(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_punch_out', { enabled });
}

async function setAutoInput(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_auto_input', { enabled });
}

async function setAutoReturn(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_auto_return', { enabled });
}

async function gotoMarker(name: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.transport_goto_marker', { name });
}

async function gotoNextMarker(forward?: boolean): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.goto_next_marker', { forward: forward ?? true });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Track Management (extended)
// ---------------------------------------------------------------------------

async function addTrackWithColor(type: string, name: string, color?: string, channels?: number): Promise<{ success: boolean; track_id: string; name: string }> {
  return ipcCall<{ success: boolean; track_id: string; name: string }>('daw.add_track_with_color', {
    type, name, channels: channels ?? 2, color: color ?? '',
  });
}

async function getTrackDetails(trackId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_track_details', { track_id: trackId });
}

async function setTrackActive(trackId: string, active: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_active', { track_id: trackId, active });
}

async function setTrackComment(trackId: string, comment: string): Promise<void> {
  await ipcCall<unknown>('daw.set_track_comment', { track_id: trackId, comment });
}

async function setTrackHidden(trackId: string, hidden: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_hidden', { track_id: trackId, hidden });
}

async function freezeTrack(trackId: string): Promise<void> {
  await ipcCall<unknown>('daw.freeze_track', { track_id: trackId });
}

async function unfreezeTrack(trackId: string): Promise<void> {
  await ipcCall<unknown>('daw.unfreeze_track', { track_id: trackId });
}

async function duplicateTrack(trackId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.duplicate_track', { track_id: trackId });
}

async function addInstrumentTrack(name?: string, pluginId?: string): Promise<TrackAddResult> {
  return ipcCall<TrackAddResult>('daw.add_instrument_track', {
    ...(name !== undefined && { name }),
    ...(pluginId !== undefined && { plugin_id: pluginId }),
  });
}

async function addVCA(name?: string): Promise<{ vcas: Array<{ id: string; name: string; number: number }>; count: number }> {
  return ipcCall<{ vcas: Array<{ id: string; name: string; number: number }>; count: number }>('daw.create_vca', {
    name: name ?? 'VCA',
    count: 1,
  });
}

/**
 * Create a folder track — a bus that acts as a collapsible container.
 * A matching route group is created so child tracks can be grouped.
 *
 * After calling this, the caller must register the bus_id as a folder in the session store:
 *   useSessionStore.setState(s => ({ folderBusIds: [...s.folderBusIds, result.bus_id] }))
 */
async function addFolderTrack(name?: string): Promise<{ bus_id: string; group_id: string; name: string }> {
  const folderName = name ?? 'Folder';

  // 1. Create a bus (this is the folder track — shows in track list)
  await ipcCall<unknown>('daw.add_track_with_color', {
    type: 'bus',
    name: folderName,
    channels: 2,
    color: '6A5040ff',
  });

  // 2. Wait for async bus creation, then find it
  await new Promise(r => setTimeout(r, 800));
  const tracks = await ipcCall<EngineTrack[]>('daw.get_tracks');
  const bus = [...tracks].reverse().find(t => t.name === folderName && t.type === 'bus');
  if (!bus) throw new Error('Failed to create folder bus');

  // 3. Create a route group with the same name (for child track management)
  let groupId = '';
  try {
    const group = await ipcCall<{ ok: boolean; group_id: string }>('daw.route_group.create', { name: folderName });
    groupId = group.group_id || '';
  } catch (e) {
    console.warn('[DAWFLOW] Failed to create route group for folder, folder will work without grouping:', e);
  }

  // 4. If group was created, make the bus a subgroup so children route through it
  if (groupId) {
    try {
      await ipcCall<unknown>('daw.route_group.add_route', { group_id: groupId, track_id: bus.id });
      await ipcCall<unknown>('daw.route_group.make_subgroup', { group_id: groupId, pre_fader: false });
    } catch (e) {
      console.warn('[DAWFLOW] Failed to set up subgroup routing:', e);
    }
  }

  return { bus_id: bus.id, group_id: groupId, name: folderName };
}

async function setTrackGainRelative(trackId: string, deltaDbs: number): Promise<void> {
  await ipcCall<unknown>('daw.set_track_gain_relative', { track_id: trackId, delta_db: deltaDbs });
}

async function setTrackTrim(trackId: string, trimDb: number): Promise<void> {
  await ipcCall<unknown>('daw.set_track_trim', { track_id: trackId, trim_db: trimDb });
}

async function setTrackDelay(trackId: string, delaySamples: number): Promise<void> {
  await ipcCall<unknown>('daw.set_track_delay', { track_id: trackId, delay_samples: delaySamples });
}

async function reorderTracks(trackIds: string[]): Promise<void> {
  await ipcCall<unknown>('daw.reorder_tracks', { track_ids: trackIds });
}

async function getTrackProperties(trackId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_track_properties', { track_id: trackId });
}

async function getTrackRecordStatus(trackId: string): Promise<{ record_enabled: boolean; monitoring: string }> {
  return ipcCall<{ record_enabled: boolean; monitoring: string }>('daw.get_track_record_status', { track_id: trackId });
}

async function soloExclusive(trackId: string): Promise<void> {
  await ipcCall<unknown>('daw.solo_exclusive', { track_id: trackId });
}

async function getTrackNames(): Promise<{ tracks: Array<{ id: string; name: string; is_track: boolean; active: boolean; hidden: boolean }>; count: number }> {
  return ipcCall<{ tracks: Array<{ id: string; name: string; is_track: boolean; active: boolean; hidden: boolean }>; count: number }>('daw.get_track_names');
}

async function getTrackCount(): Promise<{ total: number; audio_tracks: number; buses: number }> {
  return ipcCall<{ total: number; audio_tracks: number; buses: number }>('daw.get_track_count');
}

async function getTrackType(trackId: string): Promise<{ track_id: string; name: string; type: string }> {
  return ipcCall<{ track_id: string; name: string; type: string }>('daw.get_track_type', { track_id: trackId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Region Editing (extended)
// ---------------------------------------------------------------------------

async function splitRegion(trackId: string, regionId: string, positionSamples: number): Promise<void> {
  await ipcCall<unknown>('daw.split_region', { track_id: trackId, region_id: regionId, position_samples: positionSamples });
}

async function deleteRegion(trackId: string, regionId: string): Promise<void> {
  await ipcCall<unknown>('daw.delete_region', { track_id: trackId, region_id: regionId });
}

async function moveRegion(trackId: string, regionId: string, positionSamples: number): Promise<void> {
  await ipcCall<unknown>('daw.move_region', { track_id: trackId, region_id: regionId, position_samples: positionSamples });
}

async function duplicateRegion(trackId: string, regionId: string, positionSamples?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.duplicate_region', { track_id: trackId, region_id: regionId, position_samples: positionSamples });
}

async function trimRegionStart(trackId: string, regionId: string, positionSamples: number): Promise<void> {
  await ipcCall<unknown>('daw.trim_region_start', { track_id: trackId, region_id: regionId, position_samples: positionSamples });
}

async function trimRegionEnd(trackId: string, regionId: string, positionSamples: number): Promise<void> {
  await ipcCall<unknown>('daw.trim_region_end', { track_id: trackId, region_id: regionId, position_samples: positionSamples });
}

async function setRegionFadeIn(trackId: string, regionId: string, lengthSamples: number): Promise<void> {
  await ipcCall<unknown>('daw.set_region_fade_in', { track_id: trackId, region_id: regionId, length_samples: lengthSamples });
}

async function setRegionFadeOut(trackId: string, regionId: string, lengthSamples: number): Promise<void> {
  await ipcCall<unknown>('daw.set_region_fade_out', { track_id: trackId, region_id: regionId, length_samples: lengthSamples });
}

async function normalizeRegion(trackId: string, regionId: string, targetDb?: number): Promise<void> {
  await ipcCall<unknown>('daw.normalize_region', { track_id: trackId, region_id: regionId, target_db: targetDb ?? 0 });
}

async function setRegionLocked(trackId: string, regionId: string, locked: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_region_locked', { track_id: trackId, region_id: regionId, locked });
}

async function setRegionMuted(trackId: string, regionId: string, muted: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_region_muted', { track_id: trackId, region_id: regionId, muted });
}

async function setRegionName(trackId: string, regionId: string, name: string): Promise<void> {
  await ipcCall<unknown>('daw.set_region_name', { track_id: trackId, region_id: regionId, name });
}

async function getRegionDetails(trackId: string, regionId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_region_details', { track_id: trackId, region_id: regionId });
}

async function getAllTrackRegions(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_all_track_regions');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — MIDI Editing (extended)
// ---------------------------------------------------------------------------

async function midiAddNote(trackId: string, regionId: string, note: number, startBeats: number, lengthBeats?: number, velocity?: number, channel?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi.add_note', { track_id: trackId, region_id: regionId, note, start_beats: startBeats, length_beats: lengthBeats ?? 0.25, velocity: velocity ?? 100, channel: channel ?? 0 });
}

async function midiDeleteNote(trackId: string, regionId: string, noteId: number): Promise<void> {
  await ipcCall<unknown>('daw.midi.delete_note', { track_id: trackId, region_id: regionId, note_id: noteId });
}

async function midiMoveNote(trackId: string, regionId: string, noteId: number, params: Record<string, unknown>): Promise<void> {
  await ipcCall<unknown>('daw.midi.move_note', { track_id: trackId, region_id: regionId, note_id: noteId, ...params });
}

async function midiQuantize(trackId: string, regionId: string, gridBeats?: number, strength?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi.quantize', { track_id: trackId, region_id: regionId, grid_beats: gridBeats ?? 0.25, strength: strength ?? 1.0 });
}

async function midiTranspose(trackId: string, regionId: string, semitones: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi.transpose', { track_id: trackId, region_id: regionId, semitones });
}

async function midiHumanize(trackId: string, regionId: string, timingAmount?: number, velocityAmount?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.humanize_midi', { track_id: trackId, region_id: regionId, timing_amount: timingAmount ?? 10, velocity_amount: velocityAmount ?? 10 });
}

async function midiLegato(trackId: string, regionId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi_legato', { track_id: trackId, region_id: regionId });
}

async function midiStrum(trackId: string, regionId: string, delayMs?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.filter.strum', { track_id: trackId, region_id: regionId, delay_ms: delayMs ?? 15 });
}

async function midiInvert(trackId: string, regionId: string, pivotNote?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.invert_midi_notes', { track_id: trackId, region_id: regionId, pivot_note: pivotNote ?? 60 });
}

async function midiScaleVelocity(trackId: string, regionId: string, scalePercent: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.scale_midi_velocity', { track_id: trackId, region_id: regionId, scale_percent: scalePercent });
}

async function midiSetNoteVelocity(trackId: string, regionId: string, noteId: number, velocity: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi.set_note_velocity', { track_id: trackId, region_id: regionId, note_id: noteId, velocity });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Plugin Management (extended)
// ---------------------------------------------------------------------------

async function openPluginEditor(trackId: string, processorId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.plugin.open_editor', { track_id: trackId, processor_id: processorId });
}

async function closePluginEditor(trackId: string, processorId: string): Promise<void> {
  await ipcCall<unknown>('daw.plugin.close_editor', { track_id: trackId, processor_id: processorId });
}

async function listPluginPresets(trackId: string, processorId: string): Promise<{ presets: Array<{ uri: string; label: string; user: boolean }>; current_preset: string }> {
  return ipcCall<{ presets: Array<{ uri: string; label: string; user: boolean }>; current_preset: string }>('daw.plugin.list_presets', { track_id: trackId, processor_id: processorId });
}

async function loadPluginPreset(trackId: string, processorId: string, presetUri: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.plugin.load_preset', { track_id: trackId, processor_id: processorId, preset_uri: presetUri });
}

async function savePluginPreset(trackId: string, processorId: string, name: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.plugin.save_preset', { track_id: trackId, processor_id: processorId, name });
}

async function setPluginParameter(trackId: string, processorId: string, index: number, value: number): Promise<void> {
  await ipcCall<unknown>('daw.set_plugin_parameter', { track_id: trackId, processor_id: processorId, index, value });
}

async function setPluginEnabled(trackId: string, processorId: string, enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_plugin_enabled', { track_id: trackId, processor_id: processorId, enabled });
}

async function removePlugin(trackId: string, processorId: string): Promise<void> {
  await ipcCall<unknown>('daw.remove_plugin', { track_id: trackId, processor_id: processorId });
}

async function getTrackPlugins(trackId: string): Promise<{ plugins: Array<{ processor_id: string; name: string; enabled: boolean; index: number }> }> {
  return ipcCall<{ plugins: Array<{ processor_id: string; name: string; enabled: boolean; index: number }> }>('daw.get_track_plugins', { track_id: trackId });
}

async function reorderPlugins(trackId: string, processorIds: string[]): Promise<void> {
  await ipcCall<unknown>('daw.reorder_plugins', { track_id: trackId, processor_ids: processorIds });
}

async function loadPluginById(trackId: string, uniqueId: string): Promise<{ ok: boolean; processor_id: string; name: string }> {
  return ipcCall<{ ok: boolean; processor_id: string; name: string }>('daw.load_plugin_by_id', { track_id: trackId, unique_id: uniqueId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Automation
// ---------------------------------------------------------------------------

async function setAutomationMode(trackId: string, mode: string): Promise<void> {
  await ipcCall<unknown>('daw.set_automation_mode', { track_id: trackId, mode });
}

async function getAutomationMode(trackId: string): Promise<{ mode: string }> {
  return ipcCall<{ mode: string }>('daw.get_automation_mode', { track_id: trackId });
}

async function getAutomationData(trackId: string, control?: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_automation_data_ext', { track_id: trackId, control: control ?? 'gain' });
}

async function addAutomationPoint(trackId: string, timeSamples: number, value: number, control?: string): Promise<void> {
  await ipcCall<unknown>('daw.add_automation_point_ext', { track_id: trackId, time_samples: timeSamples, value, control: control ?? 'gain' });
}

async function clearAutomation(trackId: string, control?: string): Promise<void> {
  await ipcCall<unknown>('daw.clear_automation_ext', { track_id: trackId, control: control ?? 'gain' });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Phase / Polarity
// ---------------------------------------------------------------------------

async function setTrackPhaseInvert(trackId: string, invert: boolean, channel?: number): Promise<void> {
  await ipcCall<unknown>('daw.set_track_phase_invert', { track_id: trackId, invert, ...(channel !== undefined ? { channel } : {}) });
}

async function getTrackPhaseState(trackId: string): Promise<{ any_inverted: boolean; channels: Array<{ channel: number; inverted: boolean }> }> {
  return ipcCall<{ any_inverted: boolean; channels: Array<{ channel: number; inverted: boolean }> }>('daw.phase.get', { track_id: trackId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Metering (extended)
// ---------------------------------------------------------------------------

async function getMeterLevels(): Promise<{ tracks: Array<{ id: string; name: string; channels: Array<{ peak_db: number }> }> }> {
  return ipcCall<{ tracks: Array<{ id: string; name: string; channels: Array<{ peak_db: number }> }> }>('daw.get_meter_levels');
}

async function getMasterMeter(): Promise<{ channels: Array<{ peak_db: number }>; channel_count: number }> {
  return ipcCall<{ channels: Array<{ peak_db: number }>; channel_count: number }>('daw.get_master_meter');
}

async function resetMeterPeaks(): Promise<void> {
  await ipcCall<unknown>('daw.reset_meter_peaks');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Markers (extended)
// ---------------------------------------------------------------------------

async function getAllMarkers(): Promise<{ markers: Array<Record<string, unknown>>; count: number }> {
  return ipcCall<{ markers: Array<Record<string, unknown>>; count: number }>('daw.get_all_markers');
}

async function addLocationMarker(positionSamples: number, name?: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.add_location_marker', { position_samples: positionSamples, name: name ?? 'Marker' });
}

async function removeLocationMarker(locationId: string): Promise<void> {
  await ipcCall<unknown>('daw.remove_location_marker', { location_id: locationId });
}

async function updateMarker(locationId: string, params: Record<string, unknown>): Promise<void> {
  await ipcCall<unknown>('daw.update_marker', { location_id: locationId, ...params });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Routing
// ---------------------------------------------------------------------------

async function getAvailableAudioPorts(input?: boolean): Promise<{ ports: string[]; count: number }> {
  return ipcCall<{ ports: string[]; count: number }>('daw.get_available_audio_ports', { input: input ?? true });
}

async function getTrackIO(trackId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_track_io', { track_id: trackId });
}

async function connectTrackInput(trackId: string, sourcePort: string, channel?: number): Promise<void> {
  await ipcCall<unknown>('daw.connect_track_input', { track_id: trackId, source_port: sourcePort, channel: channel ?? 0 });
}

async function connectTrackOutput(trackId: string, destPort: string, channel?: number): Promise<void> {
  await ipcCall<unknown>('daw.connect_track_output', { track_id: trackId, dest_port: destPort, channel: channel ?? 0 });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Groups & VCA
// ---------------------------------------------------------------------------

async function getRouteGroups(): Promise<{ groups: Array<Record<string, unknown>>; count: number }> {
  return ipcCall<{ groups: Array<Record<string, unknown>>; count: number }>('daw.get_route_groups');
}

async function createRouteGroup(name: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.create_route_group', { name });
}

async function assignTrackToVCA(trackId: string, vcaName: string): Promise<void> {
  await ipcCall<unknown>('daw.assign_track_to_vca', { track_id: trackId, vca_name: vcaName });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Batch & Utilities
// ---------------------------------------------------------------------------

async function muteAllTracks(): Promise<void> {
  await ipcCall<unknown>('daw.mute_all_tracks');
}

async function unmuteAllTracks(): Promise<void> {
  await ipcCall<unknown>('daw.unmute_all_tracks');
}

async function unsoloAllTracks(): Promise<void> {
  await ipcCall<unknown>('daw.unsolo_all_tracks');
}

async function disarmAllTracks(): Promise<void> {
  await ipcCall<unknown>('daw.disarm_all_tracks');
}

async function getArmedTracks(): Promise<{ armed_tracks: Array<{ id: string; name: string }>; count: number }> {
  return ipcCall<{ armed_tracks: Array<{ id: string; name: string }>; count: number }>('daw.get_armed_tracks');
}

async function importAudio(filepath: string, trackId?: string, positionSamples?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.import_audio', { filepath, track_id: trackId, position_samples: positionSamples ?? 0 });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Metronome
// ---------------------------------------------------------------------------

async function setClickEnabled(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_click_enabled', { enabled });
}

async function getClickSettings(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_click_settings');
}

async function toggleCountIn(): Promise<{ ok: boolean; enabled: boolean }> {
  return ipcCall<{ ok: boolean; enabled: boolean }>('daw.toggle_count_in');
}

async function getMetronomeState(): Promise<{ enabled: boolean; gain: number; count_in: boolean }> {
  return ipcCall<{ enabled: boolean; gain: number; count_in: boolean }>('daw.get_metronome_state');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Pre-roll / Post-roll
// ---------------------------------------------------------------------------

async function setPreRoll(seconds: number): Promise<{ ok: boolean; preroll_seconds: number }> {
  return ipcCall<{ ok: boolean; preroll_seconds: number }>('daw.set_pre_roll', { seconds });
}

async function setPostRoll(seconds: number): Promise<{ ok: boolean; postroll_seconds: number }> {
  return ipcCall<{ ok: boolean; postroll_seconds: number }>('daw.set_post_roll', { seconds });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Record Mode
// ---------------------------------------------------------------------------

async function setRecordMode(mode: string): Promise<{ ok: boolean; mode: string }> {
  return ipcCall<{ ok: boolean; mode: string }>('daw.set_record_mode', { mode });
}

async function getRecordMode(): Promise<{ mode: string }> {
  return ipcCall<{ mode: string }>('daw.get_record_mode');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Tempo (extended)
// ---------------------------------------------------------------------------

async function getTempoMap(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_tempo_map');
}

async function addTempoChange(positionSamples: number, bpm: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.add_tempo_change', { position_samples: positionSamples, bpm });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Export
// ---------------------------------------------------------------------------

async function setExportFormatType(type: string): Promise<void> {
  await ipcCall<unknown>('daw.export.set_format_type', { type });
}

async function setExportSampleRate(rate: number): Promise<void> {
  await ipcCall<unknown>('daw.export.set_sample_rate', { sample_rate: rate });
}

async function setExportBitDepth(depth: number): Promise<void> {
  await ipcCall<unknown>('daw.export.set_bit_depth', { bit_depth: depth });
}

async function setExportNormalize(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.export.set_normalize', { enabled });
}

async function setExportNormalizeLufs(value: number): Promise<void> {
  await ipcCall<unknown>('daw.export.set_normalize_lufs', { lufs: value });
}

async function setExportNormalizeDbfs(value: number): Promise<void> {
  await ipcCall<unknown>('daw.export.set_normalize_dbfs', { dbfs: value });
}

async function setExportTpLimiter(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.export.set_tp_limiter', { enabled });
}

async function setExportTrimBeginning(trim: boolean): Promise<void> {
  await ipcCall<unknown>('daw.export.set_trim_beginning', { enabled: trim });
}

async function setExportTrimEnd(trim: boolean): Promise<void> {
  await ipcCall<unknown>('daw.export.set_trim_end', { enabled: trim });
}

async function setExportFilenameLabel(label: string): Promise<void> {
  await ipcCall<unknown>('daw.export.set_filename_label', { label });
}

async function setExportFilenameFolder(folder: string): Promise<void> {
  await ipcCall<unknown>('daw.export.set_filename_folder', { folder });
}

async function setExportTimespan(start: number, end: number, name?: string): Promise<void> {
  await ipcCall<unknown>('daw.export.set_timespan', { start, end, ...(name !== undefined && { name }) });
}

async function prepareExport(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.export.prepare');
}

async function executeExport(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.export.execute');
}

async function abortExport(): Promise<void> {
  await ipcCall<unknown>('daw.export.abort');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Monitor
// ---------------------------------------------------------------------------

async function setMonitorCutAll(cut: boolean): Promise<void> {
  await ipcCall<unknown>('daw.monitor.set_cut_all', { cut });
}

async function setMonitorDimAll(dim: boolean): Promise<void> {
  await ipcCall<unknown>('daw.monitor.set_dim_all', { dim });
}

async function setMonitorMono(enabled: boolean): Promise<void> {
  // Engine expects { enabled: boolean } — not { mono }
  await ipcCall<unknown>('daw.monitor.set_mono', { enabled });
}

async function getMonitorCutAll(): Promise<{ cut: boolean }> {
  return ipcCall<{ cut: boolean }>('daw.monitor.get_cut_all');
}

async function getMonitorDimAll(): Promise<{ dim: boolean }> {
  return ipcCall<{ dim: boolean }>('daw.monitor.get_dim_all');
}

async function getMonitorMono(): Promise<{ mono: boolean }> {
  return ipcCall<{ mono: boolean }>('daw.monitor.get_mono');
}

async function getMonitorDimLevel(): Promise<{ dim_level: number }> {
  return ipcCall<{ dim_level: number }>('daw.monitor.get_dim_level');
}

async function setMonitorCut(channel: number, cut: boolean): Promise<void> {
  await ipcCall<unknown>('daw.monitor.set_cut', { channel, cut });
}

async function setMonitorDim(channel: number, dim: boolean): Promise<void> {
  await ipcCall<unknown>('daw.monitor.set_dim', { channel, dim });
}

async function setMonitorSolo(channel: number, solo: boolean): Promise<void> {
  await ipcCall<unknown>('daw.monitor.set_solo', { channel, solo });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Sends
// ---------------------------------------------------------------------------

async function getTrackSends(trackId: string): Promise<{ sends: Array<Record<string, unknown>>; count: number }> {
  return ipcCall<{ sends: Array<Record<string, unknown>>; count: number }>('daw.get_sends', { track_id: trackId });
}

async function setSendLevel(trackId: string, sendIndex: number, gainDb: number): Promise<void> {
  await ipcCall<unknown>('daw.set_send_level', { track_id: trackId, send_index: sendIndex, gain_db: gainDb });
}

async function setSendPan(trackId: string, sendIndex: number, pan: number): Promise<void> {
  await ipcCall<unknown>('daw.send.set_pan', { track_id: trackId, send_index: sendIndex, pan });
}

async function setSendEnabled(trackId: string, sendIndex: number, enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_send_enable', { track_id: trackId, send_index: sendIndex, enabled });
}

async function setSendPreFader(trackId: string, sendIndex: number, preFader: boolean): Promise<void> {
  await ipcCall<unknown>('daw.send.set_pre_fader', { track_id: trackId, send_index: sendIndex, pre_fader: preFader });
}

async function addSend(trackId: string, targetBusId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.add_send', { track_id: trackId, target_bus_id: targetBusId });
}

async function removeSendFrom(trackId: string, busId: string): Promise<void> {
  await ipcCall<unknown>('daw.aux.remove_send_from', { bus_id: busId, track_id: trackId });
}

async function getBuses(): Promise<{ buses: Array<Record<string, unknown>>; count: number }> {
  return ipcCall<{ buses: Array<Record<string, unknown>>; count: number }>('daw.aux.list_buses');
}

async function getTrackLatency(trackId: string): Promise<{ latency_samples: number; latency_ms: number }> {
  return ipcCall<{ latency_samples: number; latency_ms: number }>('daw.get_track_latency', { track_id: trackId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Route Groups (extended)
// ---------------------------------------------------------------------------

async function getRouteGroupDetails(groupId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_route_group_state_xml', { group_id: groupId });
}

async function deleteRouteGroup(groupId: string): Promise<void> {
  await ipcCall<unknown>('daw.delete_route_group', { group_id: groupId });
}

async function addRouteToGroup(groupId: string, trackId: string): Promise<void> {
  await ipcCall<unknown>('daw.add_track_to_group', { group_id: groupId, track_id: trackId });
}

async function removeRouteFromGroup(groupId: string, trackId: string): Promise<void> {
  await ipcCall<unknown>('daw.remove_track_from_group', { group_id: groupId, track_id: trackId });
}

async function setRouteGroupActive(groupId: string, active: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_group_active', { group_id: groupId, active });
}

async function setRouteGroupGain(groupId: string, linked: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_group_gain', { group_id: groupId, linked });
}

async function setRouteGroupMute(groupId: string, linked: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_group_mute', { group_id: groupId, linked });
}

async function setRouteGroupSolo(groupId: string, linked: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_group_solo', { group_id: groupId, linked });
}

async function setRouteGroupColor(groupId: string, color: string): Promise<void> {
  await ipcCall<unknown>('daw.set_group_color', { group_id: groupId, color });
}

async function makeSubgroup(groupId: string, preFader: boolean): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.route_group.make_subgroup', { group_id: groupId, pre_fader: preFader });
}

async function destroySubgroup(groupId: string): Promise<void> {
  await ipcCall<unknown>('daw.route_group.destroy_subgroup', { group_id: groupId });
}

async function assignGroupToVCA(groupId: string, vcaId: string): Promise<void> {
  await ipcCall<unknown>('daw.assign_track_to_vca', { group_id: groupId, vca_id: vcaId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Panner
// ---------------------------------------------------------------------------

async function getPanPosition(trackId: string): Promise<{ position: number }> {
  const data = await ipcCall<{ pan?: number }>('daw.get_track_pan', { track_id: trackId });
  return { position: data.pan ?? 0.5 };
}

async function setPanPosition(trackId: string, position: number): Promise<void> {
  await ipcCall<unknown>('daw.set_track_pan', { track_id: trackId, pan: position });
}

async function getPanWidth(trackId: string): Promise<{ width: number }> {
  return ipcCall<{ width: number }>('daw.pan.get_width', { track_id: trackId });
}

async function setPanWidth(trackId: string, width: number): Promise<void> {
  await ipcCall<unknown>('daw.pan.set_width', { track_id: trackId, width });
}

async function setPanBypassed(trackId: string, bypassed: boolean): Promise<void> {
  await ipcCall<unknown>('daw.panner.set_bypassed', { track_id: trackId, bypassed });
}

async function resetPan(trackId: string): Promise<void> {
  await ipcCall<unknown>('daw.pan.reset', { track_id: trackId });
}

async function getAvailablePanners(): Promise<{ panners: Array<{ uri: string; name: string }>; count: number }> {
  return ipcCall<{ panners: Array<{ uri: string; name: string }>; count: number }>('daw.panner.get_available_panners');
}

async function selectPanner(trackId: string, uri: string): Promise<void> {
  await ipcCall<unknown>('daw.set_panning', { track_id: trackId, uri });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Editor
// ---------------------------------------------------------------------------

async function reverseRegion(regionId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.reverse_region', { region_id: regionId });
}

async function normalizeRegionById(regionId: string, targetDb?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.normalize_region', { region_id: regionId, target_db: targetDb ?? 0 });
}

async function timeStretchRegion(regionId: string, ratio: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.time_stretch_region', { region_id: regionId, ratio });
}

async function pitchShiftRegion(regionId: string, semitones: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.pitch_shift_region', { region_id: regionId, semitones });
}

async function setRegionFadeInActive(regionId: string, active: boolean): Promise<void> {
  await ipcCall<unknown>('daw.editor.set_region_fade_in_active', { region_id: regionId, active });
}

async function setRegionFadeOutActive(regionId: string, active: boolean): Promise<void> {
  await ipcCall<unknown>('daw.editor.set_region_fade_out_active', { region_id: regionId, active });
}

async function getRegionLoudness(regionId: string): Promise<{ loudness_lufs: number; loudness_range: number }> {
  return ipcCall<{ loudness_lufs: number; loudness_range: number }>('daw.audio_region.get_loudness', { region_id: regionId });
}

async function getRegionPeak(regionId: string): Promise<{ peak_db: number; true_peak_db: number }> {
  return ipcCall<{ peak_db: number; true_peak_db: number }>('daw.get_region_true_peak', { region_id: regionId });
}

async function setEditMode(mode: string): Promise<void> {
  await ipcCall<unknown>('daw.set_edit_mode', { mode });
}

async function getEditMode(): Promise<{ mode: string }> {
  return ipcCall<{ mode: string }>('daw.get_edit_mode');
}

async function setGridType(type: string): Promise<void> {
  await ipcCall<unknown>('daw.set_grid_type', { type });
}

async function getGridType(): Promise<{ type: string }> {
  return ipcCall<{ type: string }>('daw.get_grid_type');
}

async function setSnapMode(mode: string): Promise<void> {
  await ipcCall<unknown>('daw.set_snap_mode', { mode });
}

async function getSnapMode(): Promise<{ mode: string }> {
  return ipcCall<{ mode: string }>('daw.get_snap_mode');
}

async function zoomToSelection(): Promise<void> {
  await ipcCall<unknown>('daw.zoom_to_session');
}

async function zoomToSession(): Promise<void> {
  await ipcCall<unknown>('daw.zoom_to_session');
}

async function getVisibleRange(): Promise<{ start_samples: number; end_samples: number }> {
  return ipcCall<{ start_samples: number; end_samples: number }>('daw.editor.get_visible_range');
}

async function selectRange(start: number, end: number): Promise<void> {
  await ipcCall<unknown>('daw.editor.select_range', { start, end });
}

async function insertTime(position: number, duration: number): Promise<void> {
  await ipcCall<unknown>('daw.insert_time', { position, duration });
}

async function removeTime(start: number, end: number): Promise<void> {
  await ipcCall<unknown>('daw.remove_time', { start, end });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Session Metadata
// ---------------------------------------------------------------------------

async function getSessionTitle(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_title');
}

async function setSessionTitle(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_title', { value });
}

async function getSessionArtist(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_artist');
}

async function setSessionArtist(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_artist', { value });
}

async function getSessionAlbum(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_album');
}

async function setSessionAlbum(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_album', { value });
}

async function getSessionGenre(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_genre');
}

async function setSessionGenre(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_genre', { value });
}

async function getSessionYear(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_year');
}

async function setSessionYear(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_year', { value });
}

async function getSessionComposer(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_composer');
}

async function setSessionComposer(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_composer', { value });
}

async function getSessionCopyright(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_copyright');
}

async function setSessionCopyright(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_copyright', { value });
}

async function getSessionISRC(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_isrc');
}

async function setSessionISRC(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_isrc', { value });
}

async function getSessionDescription(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_description');
}

async function setSessionDescription(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_description', { value });
}

async function getSessionComment(): Promise<{ value: string }> {
  return ipcCall<{ value: string }>('daw.session.get_comment');
}

async function setSessionComment(value: string): Promise<void> {
  await ipcCall<unknown>('daw.session.set_comment', { value });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Tempo (extended: query & conversion)
// ---------------------------------------------------------------------------

async function getTempoAt(positionSamples: number): Promise<{ bpm: number }> {
  return ipcCall<{ bpm: number }>('daw.get_tempo_at', { position_samples: positionSamples });
}

async function getMeterAt(positionSamples: number): Promise<{ numerator: number; denominator: number }> {
  return ipcCall<{ numerator: number; denominator: number }>('daw.tempo_map.get_meter_at', { position_samples: positionSamples });
}

async function getAllTempoPoints(): Promise<{ points: Array<{ position_samples: number; bpm: number }>; count: number }> {
  return ipcCall<{ points: Array<{ position_samples: number; bpm: number }>; count: number }>('daw.tempo_map.get_all_tempo_points');
}

async function getAllMeterPoints(): Promise<{ points: Array<{ position_samples: number; numerator: number; denominator: number }>; count: number }> {
  return ipcCall<{ points: Array<{ position_samples: number; numerator: number; denominator: number }>; count: number }>('daw.tempo_map.get_all_meter_points');
}

async function setTempoBpm(positionSamples: number, bpm: number): Promise<void> {
  await ipcCall<unknown>('daw.set_tempo', { position_samples: positionSamples, bpm });
}

async function removeTempo(positionSamples: number): Promise<void> {
  await ipcCall<unknown>('daw.remove_tempo_change', { position_samples: positionSamples });
}

async function samplesToBeats(samples: number): Promise<{ beats: number }> {
  return ipcCall<{ beats: number }>('daw.samples_to_beats', { samples });
}

async function beatsToSamples(beats: number): Promise<{ samples: number }> {
  return ipcCall<{ samples: number }>('daw.beats_to_samples', { beats });
}

async function samplesToBBT(samples: number): Promise<{ bars: number; beats: number; ticks: number }> {
  return ipcCall<{ bars: number; beats: number; ticks: number }>('daw.tempo_map.samples_to_bbt', { samples });
}

async function bbtToSamples(bars: number, beats: number, ticks?: number): Promise<{ samples: number }> {
  return ipcCall<{ samples: number }>('daw.tempo_map.bbt_to_samples', { bars, beats, ticks: ticks ?? 0 });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Automation (extended)
// ---------------------------------------------------------------------------

async function thinAutomation(trackId: string, paramType: string, threshold: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.automation.thin', { track_id: trackId, param_type: paramType, threshold });
}

async function clearAutomationRange(trackId: string, paramType: string, start: number, end: number): Promise<void> {
  await ipcCall<unknown>('daw.automation.clear_range', { track_id: trackId, param_type: paramType, start, end });
}

async function setAutomationInterpolation(trackId: string, paramType: string, style: string): Promise<void> {
  await ipcCall<unknown>('daw.automation.set_interpolation', { track_id: trackId, param_type: paramType, style });
}

async function getAutomationInterpolation(trackId: string, paramType: string): Promise<{ style: string }> {
  return ipcCall<{ style: string }>('daw.automation.get_interpolation', { track_id: trackId, param_type: paramType });
}

async function removeOverlappingNotes(regionId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi_sequence.remove_overlapping_notes', { region_id: regionId });
}

async function trimOverlappingNotes(regionId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi_sequence.trim_overlapping_notes', { region_id: regionId });
}

async function removeDuplicateNotes(regionId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi_sequence.remove_duplicate_notes', { region_id: regionId });
}

async function getMidiNoteRange(regionId: string): Promise<{ lowest: number; highest: number }> {
  return ipcCall<{ lowest: number; highest: number }>('daw.midi.get_note_range', { region_id: regionId });
}

async function getMidiChannelsPresent(regionId: string): Promise<{ channels: number[] }> {
  return ipcCall<{ channels: number[] }>('daw.midi_sequence.get_channels_present', { region_id: regionId });
}

async function shiftMidiNotes(regionId: string, amountBeats: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.midi.transpose', { region_id: regionId, amount_beats: amountBeats });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Mixer Scenes
// ---------------------------------------------------------------------------

async function snapshotMixerScene(index: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.mixer_scene.snapshot', { index });
}

async function applyMixerScene(index: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.mixer_scene.apply', { index });
}

async function clearMixerScene(index: number): Promise<void> {
  await ipcCall<unknown>('daw.mixer_scene.clear', { index });
}

async function isMixerSceneEmpty(index: number): Promise<{ empty: boolean }> {
  return ipcCall<{ empty: boolean }>('daw.mixer_scene.is_empty', { index });
}

async function getMixerSceneName(index: number): Promise<{ name: string }> {
  return ipcCall<{ name: string }>('daw.mixer_scene.get_name', { index });
}

async function setMixerSceneName(index: number, name: string): Promise<void> {
  await ipcCall<unknown>('daw.mixer_scene.set_name', { index, name });
}

async function listMixerScenes(): Promise<{ scenes: Array<{ index: number; name: string; empty: boolean }>; count: number }> {
  return ipcCall<{ scenes: Array<{ index: number; name: string; empty: boolean }>; count: number }>('daw.mixer_scene.list');
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Loudness & Analysis
// ---------------------------------------------------------------------------

async function getLoudnessIntegrated(): Promise<{ lufs: number; range: number }> {
  return ipcCall<{ lufs: number; range: number }>('daw.analyze.lufs_integrated');
}

async function resetLoudnessAnalysis(): Promise<void> {
  await ipcCall<unknown>('daw.analyze.reset_loudness');
}

async function getEngineInfo(): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.get_engine_info');
}

async function offlineNormalize(regionId: string, targetDb?: number): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.offline.normalize', { region_id: regionId, target_db: targetDb ?? 0 });
}

async function offlineReverse(regionId: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.offline.reverse', { region_id: regionId });
}

async function offlineGetPeak(regionId: string): Promise<{ peak_db: number; true_peak_db: number }> {
  return ipcCall<{ peak_db: number; true_peak_db: number }>('daw.offline.get_peak', { region_id: regionId });
}

async function offlineGetLoudness(regionId: string): Promise<{ lufs: number; range: number }> {
  return ipcCall<{ lufs: number; range: number }>('daw.offline.get_loudness', { region_id: regionId });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Control Protocols
// ---------------------------------------------------------------------------

async function discoverControlProtocols(): Promise<{ protocols: Array<{ name: string; active: boolean }>; count: number }> {
  return ipcCall<{ protocols: Array<{ name: string; active: boolean }>; count: number }>('daw.control_protocol.discover');
}

async function listControlProtocols(): Promise<{ protocols: Array<{ name: string; active: boolean }>; count: number }> {
  return ipcCall<{ protocols: Array<{ name: string; active: boolean }>; count: number }>('daw.control_protocol.list_known');
}

async function activateControlProtocol(name: string): Promise<Record<string, unknown>> {
  return ipcCall<Record<string, unknown>>('daw.control_protocol.activate', { name });
}

async function deactivateControlProtocol(name: string): Promise<void> {
  await ipcCall<unknown>('daw.control_protocol.deactivate', { name });
}

async function isControlProtocolActive(name: string): Promise<{ active: boolean }> {
  return ipcCall<{ active: boolean }>('daw.control_protocol.is_active', { name });
}

// ---------------------------------------------------------------------------
// Video sync
// ---------------------------------------------------------------------------

async function getVideoPullup(): Promise<{ pullup: number }> {
  return ipcCall<{ pullup: number }>('daw.video.get_pullup');
}
async function setVideoPullup(pullup: number): Promise<void> {
  await ipcCall<unknown>('daw.video.set_pullup', { pullup });
}
async function getVideoSyncEnabled(): Promise<{ enabled: boolean }> {
  return ipcCall<{ enabled: boolean }>('daw.video.get_sync_enabled');
}
async function setVideoSyncEnabled(enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.video.set_sync_enabled', { enabled });
}
async function getVideoOffset(): Promise<{ offset_samples: number; offset_negative: boolean }> {
  return ipcCall<{ offset_samples: number; offset_negative: boolean }>('daw.video.get_offset');
}
async function setVideoOffset(offsetSamples: number, negative?: boolean): Promise<void> {
  await ipcCall<unknown>('daw.video.set_offset', { offset_samples: offsetSamples, negative: negative ?? false });
}

// ---------------------------------------------------------------------------
// Convenience wrappers — Render in Place
// ---------------------------------------------------------------------------

async function renderInPlace(params: {
  track_ids: string[];
  region_ids?: string[];
  processing?: string;
  mode?: string;
  tail_ms?: number;
  bit_depth?: number;
  source_action?: string;
  mix_down?: boolean;
  name?: string;
}): Promise<{ ok: boolean; rendered_tracks: Array<{ source_track_id: string; new_track_id: string; new_track_name: string; region_ids: string[] }> }> {
  return ipcCall<{ ok: boolean; rendered_tracks: Array<{ source_track_id: string; new_track_id: string; new_track_name: string; region_ids: string[] }> }>('daw.render_in_place', params);
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
  getSessionProperties,
  getSessionStats,
  saveSessionAs,
  snapshotSession,
  renameSession,
  getRecentSessions,

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
  setTrackRecord,
  setTrackMonitor,
  setTrackColor,
  addTrackWithColor,
  getTrackDetails,
  setTrackActive,
  setTrackComment,
  setTrackHidden,
  freezeTrack,
  unfreezeTrack,
  duplicateTrack,
  addInstrumentTrack,
  addVCA,
  addFolderTrack,
  setTrackGainRelative,
  setTrackTrim,
  setTrackDelay,
  reorderTracks,
  getTrackProperties,
  getTrackRecordStatus,
  soloExclusive,
  getTrackNames,
  getTrackCount,
  getTrackType,

  // Transport
  play,
  stop,
  setTempo,
  transportLocate,
  getTransportStateFull,
  getPlayheadPosition,
  setPlayheadPosition,
  toggleLoop,
  setLoopEnabled,
  setLoopRange,
  getLoopRange,
  setPunchIn,
  setPunchOut,
  setAutoInput,
  setAutoReturn,
  gotoMarker,
  gotoNextMarker,

  // Undo/Redo
  undo,
  redo,
  getUndoHistory,

  // Markers
  getMarkers,
  addMarker,
  getAllMarkers,
  addLocationMarker,
  removeLocationMarker,
  updateMarker,

  // Regions
  getRegions,
  splitRegion,
  deleteRegion,
  moveRegion,
  duplicateRegion,
  trimRegionStart,
  trimRegionEnd,
  setRegionFadeIn,
  setRegionFadeOut,
  normalizeRegion,
  setRegionLocked,
  setRegionMuted,
  setRegionName,
  getRegionDetails,
  getAllTrackRegions,

  // Audio Peaks
  getAudioPeaks,

  // MIDI
  getMidiNotes,
  midiAddNote,
  midiDeleteNote,
  midiMoveNote,
  midiQuantize,
  midiTranspose,
  midiHumanize,
  midiLegato,
  midiStrum,
  midiInvert,
  midiScaleVelocity,
  midiSetNoteVelocity,

  // Plugins
  getAvailablePlugins,
  loadPlugin,
  getPluginParameters,
  openPluginEditor,
  closePluginEditor,
  listPluginPresets,
  loadPluginPreset,
  savePluginPreset,
  setPluginParameter,
  setPluginEnabled,
  removePlugin,
  getTrackPlugins,
  reorderPlugins,
  loadPluginById,

  // Automation
  setAutomationMode,
  getAutomationMode,
  getAutomationData,
  addAutomationPoint,
  clearAutomation,

  // Phase / Polarity
  setTrackPhaseInvert,
  getTrackPhaseState,

  // Metering
  getCpuLoad,
  getMasterPeak,
  getMeterLevels,
  getMasterMeter,
  resetMeterPeaks,

  // Routing
  getAvailableAudioPorts,
  getTrackIO,
  connectTrackInput,
  connectTrackOutput,

  // Groups & VCA
  getRouteGroups,
  createRouteGroup,
  assignTrackToVCA,

  // Batch & Utilities
  muteAllTracks,
  unmuteAllTracks,
  unsoloAllTracks,
  disarmAllTracks,
  getArmedTracks,
  importAudio,

  // Metronome
  setClickEnabled,
  getClickSettings,
  toggleCountIn,
  getMetronomeState,

  // Pre-roll / Post-roll
  setPreRoll,
  setPostRoll,

  // Record Mode
  setRecordMode,
  getRecordMode,

  // Tempo
  getTempoMap,
  addTempoChange,

  // Export
  setExportFormatType,
  setExportSampleRate,
  setExportBitDepth,
  setExportNormalize,
  setExportNormalizeLufs,
  setExportNormalizeDbfs,
  setExportTpLimiter,
  setExportTrimBeginning,
  setExportTrimEnd,
  setExportFilenameLabel,
  setExportFilenameFolder,
  setExportTimespan,
  prepareExport,
  executeExport,
  abortExport,

  // Monitor
  setMonitorCutAll,
  setMonitorDimAll,
  setMonitorMono,
  getMonitorCutAll,
  getMonitorDimAll,
  getMonitorMono,
  getMonitorDimLevel,
  setMonitorCut,
  setMonitorDim,
  setMonitorSolo,

  // Sends
  getTrackSends,
  setSendLevel,
  setSendPan,
  setSendEnabled,
  setSendPreFader,
  addSend,
  removeSendFrom,
  getBuses,
  getTrackLatency,

  // Route Groups (extended)
  getRouteGroupDetails,
  deleteRouteGroup,
  addRouteToGroup,
  removeRouteFromGroup,
  setRouteGroupActive,
  setRouteGroupGain,
  setRouteGroupMute,
  setRouteGroupSolo,
  setRouteGroupColor,
  makeSubgroup,
  destroySubgroup,
  assignGroupToVCA,

  // Panner
  getPanPosition,
  setPanPosition,
  getPanWidth,
  setPanWidth,
  setPanBypassed,
  resetPan,
  getAvailablePanners,
  selectPanner,

  // Editor
  reverseRegion,
  normalizeRegionById,
  timeStretchRegion,
  pitchShiftRegion,
  setRegionFadeInActive,
  setRegionFadeOutActive,
  getRegionLoudness,
  getRegionPeak,
  setEditMode,
  getEditMode,
  setGridType,
  getGridType,
  setSnapMode,
  getSnapMode,
  zoomToSelection,
  zoomToSession,
  getVisibleRange,
  selectRange,
  insertTime,
  removeTime,

  // Session Metadata
  getSessionTitle,
  setSessionTitle,
  getSessionArtist,
  setSessionArtist,
  getSessionAlbum,
  setSessionAlbum,
  getSessionGenre,
  setSessionGenre,
  getSessionYear,
  setSessionYear,
  getSessionComposer,
  setSessionComposer,
  getSessionCopyright,
  setSessionCopyright,
  getSessionISRC,
  setSessionISRC,
  getSessionDescription,
  setSessionDescription,
  getSessionComment,
  setSessionComment,

  // Tempo (query & conversion)
  getTempoAt,
  getMeterAt,
  getAllTempoPoints,
  getAllMeterPoints,
  setTempoBpm,
  removeTempo,
  samplesToBeats,
  beatsToSamples,
  samplesToBBT,
  bbtToSamples,

  // Automation (extended)
  thinAutomation,
  clearAutomationRange,
  setAutomationInterpolation,
  getAutomationInterpolation,
  removeOverlappingNotes,
  trimOverlappingNotes,
  removeDuplicateNotes,
  getMidiNoteRange,
  getMidiChannelsPresent,
  shiftMidiNotes,

  // Mixer Scenes
  snapshotMixerScene,
  applyMixerScene,
  clearMixerScene,
  isMixerSceneEmpty,
  getMixerSceneName,
  setMixerSceneName,
  listMixerScenes,

  // Loudness & Analysis
  getLoudnessIntegrated,
  resetLoudnessAnalysis,
  getEngineInfo,
  offlineNormalize,
  offlineReverse,
  offlineGetPeak,
  offlineGetLoudness,

  // Control Protocols
  discoverControlProtocols,
  listControlProtocols,
  activateControlProtocol,
  deactivateControlProtocol,
  isControlProtocolActive,

  // Video sync
  getVideoPullup,
  setVideoPullup,
  getVideoSyncEnabled,
  setVideoSyncEnabled,
  getVideoOffset,
  setVideoOffset,

  // Render in Place
  renderInPlace,

  // Generic
  call,
} as const;
