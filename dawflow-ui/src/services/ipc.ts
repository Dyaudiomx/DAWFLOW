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
  return raw.map((r) => ({
    id: String(r.id || ''),
    name: String(r.name || ''),
    position: Number(r.position_samples ?? r.position ?? 0),
    length: Number(r.length_samples ?? r.length ?? 0),
    start: Number(r.start_samples ?? r.start ?? 0),
    muted: Boolean(r.muted),
  }));
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
  const data = await ipcCall<{ plugins: PluginInfo[]; count: number }>('daw.get_available_plugins');
  return data.plugins || [];
}

async function loadPlugin(trackId: string, pluginName: string): Promise<void> {
  await ipcCall<unknown>('daw.load_plugin', { track_id: trackId, plugin_name: pluginName });
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

  // Automation
  setAutomationMode,
  getAutomationMode,
  getAutomationData,
  addAutomationPoint,
  clearAutomation,

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

  // Tempo
  getTempoMap,
  addTempoChange,

  // Generic
  call,
} as const;
