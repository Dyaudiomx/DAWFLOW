// Auto-generated from docs/api-reference.md
// DO NOT EDIT MANUALLY — regenerate from the API reference
//
// DAWFLOW Engine Command Registry
// ~400 commands organized into logical namespaces
//
// Transport layer: uses native WebView bridge (window.__dawflow_call) when
// running inside the DAW's embedded WKWebView. Falls back to HTTP POST
// (ui-shell proxy) when running in a browser for development.

const IPC_URL = '/api/command';
let requestId = 0;

/** Check if we're running inside the native DAW WebView */
function isNativeWebView(): boolean {
  return typeof (window as any).__dawflow_call === 'function';
}

async function callEngine<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  // Native bridge: direct in-process call via WKScriptMessageHandler (~0ms latency)
  if (isNativeWebView()) {
    return (window as any).__dawflow_call(method, params ?? {}) as Promise<T>;
  }

  // Fallback: HTTP POST via ui-shell proxy (~50-200ms latency)
  const id = ++requestId;
  const res = await fetch(IPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'IPC error');
  return json.result as T;
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

interface TrackInfo {
  id: string;
  name: string;
  type: string;
  gain_db: number;
  muted: boolean;
  soloed: boolean;
  record_enabled: boolean;
  color: string;
}

interface TrackDetails {
  id: string;
  name: string;
  gain_db: number;
  muted: boolean;
  soloed: boolean;
  active: boolean;
  comment: string;
  color: string;
  plugins: Array<{ id: string; name: string; enabled: boolean; index: number }>;
}

interface RegionInfo {
  id: string;
  name: string;
  position_samples: number;
  length_samples: number;
  start_samples: number;
  muted: boolean;
  locked: boolean;
  layer: number;
}

interface MidiNote {
  note: number;
  velocity: number;
  channel: number;
  start_beats: number;
  length_beats: number;
  end_beats: number;
  id: number;
}

interface PluginInfo {
  processor_id: string;
  name: string;
  enabled: boolean;
  index: number;
}

interface PluginDetail {
  processor_id: string;
  name: string;
  maker: string;
  category: string;
  unique_id: string;
  enabled: boolean;
  type: string;
  parameter_count: number;
  audio_inputs: number;
  audio_outputs: number;
  midi_inputs: number;
  midi_outputs: number;
  preset_count: number;
}

interface PluginParam {
  index: number;
  name: string;
  value: number;
  min: number;
  max: number;
  default: number;
}

interface MarkerInfo {
  name: string;
  start: number;
  end: number;
  is_mark: boolean;
  is_range: boolean;
}

interface AutomationPoint {
  time: number;
  value: number;
}

interface SendInfo {
  index: number;
  id: string;
  name: string;
  active: boolean;
  gain?: number;
  gain_db?: number;
  enabled?: boolean;
  target_id?: string;
  target_name?: string;
  send_name?: string;
}

interface MeterChannel {
  channel: number;
  peak_dB: number;
  rms_dB: number;
}

// ---------------------------------------------------------------------------
// Engine command registry
// ---------------------------------------------------------------------------

export const engine = {

  // =========================================================================
  // Session Management
  // =========================================================================
  session: {
    getInfo: () =>
      callEngine<{ name: string; sample_rate: number; playing: boolean; recording: boolean; position: number; dirty: boolean }>('daw.get_session_info'),

    getDetails: () =>
      callEngine<{ name: string; path: string; sample_rate: number; block_size: number; dirty: boolean; playing: boolean; recording: boolean; position: number; loop_enabled: boolean; track_count: number; bus_count: number; undo_depth: number; redo_depth: number }>('daw.get_session_details'),

    getProperties: () =>
      callEngine<{ name: string; path: string; sample_rate: number; frame_rate: number; dirty: boolean; transport_rolling: boolean; recording: boolean; position_samples: number; snap_name: string; record_enabled: boolean }>('daw.get_session_properties'),

    getPath: () =>
      callEngine<{ session_path: string; session_name: string; snap_name: string; sample_rate: number }>('daw.get_session_path'),

    getLength: () =>
      callEngine<{ length_samples: number; length_seconds: number; sample_rate: number }>('daw.get_session_length'),

    getStats: () =>
      callEngine('daw.get_session_stats'),

    save: () =>
      callEngine<{ success: boolean }>('daw.save_session'),

    saveAs: (name: string, parentFolder?: string, switchTo?: boolean, copyMedia?: boolean) =>
      callEngine<{ ok: boolean; new_session_path: string; new_name: string; switched_to: boolean }>('daw.save_session_as', { name, parent_folder: parentFolder, switch_to: switchTo, copy_media: copyMedia }),

    snapshot: (name?: string, switchTo?: boolean) =>
      callEngine<{ success: boolean; snapshot_name: string }>('daw.snapshot_session', { name, switch_to: switchTo }),

    rename: (name: string) =>
      callEngine<{ ok: boolean }>('daw.rename_session', { name }),

    setDirty: (dirty: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_session_dirty', { dirty }),

    close: () =>
      callEngine('daw.close_session'),

    getRecentSessions: () =>
      callEngine<{ sessions: string[] }>('daw.get_recent_sessions'),

    ping: () =>
      callEngine<{ pong: boolean; session_name: string; engine_running: boolean }>('daw.ping'),

    getApiVersion: () =>
      callEngine<{ version: string; engine: string; based_on: string }>('daw.get_api_version'),

    getCommandList: () =>
      callEngine<{ commands: string[]; count: number }>('daw.get_command_list'),

    getAudioBackendInfo: () =>
      callEngine<{ backend_name: string; sample_rate: number; buffer_size: number; dsp_load_percent: number; running: boolean; physical_inputs: number; physical_outputs: number; input_count: number; output_count: number }>('daw.get_audio_backend_info'),

    getSampleRate: () =>
      callEngine<{ sample_rate: number }>('daw.get_sample_rate'),

    getMetadata: () =>
      callEngine<{ title: string; artist: string; album: string; composer: string; genre: string; comment: string; copyright: string; isrc: string; year: string }>('daw.get_session_metadata'),

    setMetadata: (fields: Record<string, string>) =>
      callEngine<{ ok: boolean; fields_set: number }>('daw.set_session_metadata', fields),

    getConfig: () =>
      callEngine('daw.get_session_config'),

    getConfigValue: (key: string) =>
      callEngine<{ key: string; found: boolean; value?: unknown }>('daw.get_session_config_value', { key }),

    setConfigValue: (key: string, value: unknown) =>
      callEngine<{ key: string; ok: boolean }>('daw.set_session_config_value', { key, value }),

    getConfigSummary: () =>
      callEngine('daw.get_session_config_summary'),

    wipe: () =>
      callEngine<{ ok: boolean }>('daw.session.wipe'),

    cleanupSources: () =>
      callEngine<{ ok: boolean; removed_files: number; removed_count: number; space_freed_bytes: number }>('daw.session.cleanup_sources'),

    cleanupRegions: () =>
      callEngine<{ ok: boolean }>('daw.session.cleanup_regions'),

    freezeAll: () =>
      callEngine<{ ok: boolean; frozen_count: number }>('daw.session.freeze_all'),

    midiPanic: () =>
      callEngine<{ ok: boolean }>('daw.session.midi_panic'),

    isDirty: () =>
      callEngine<{ dirty: boolean; undo_depth: number }>('daw.get_pending_changes_count'),

    isBusy: () =>
      callEngine<{ busy: boolean; activities: string[] }>('daw.is_session_busy'),

    checkHealth: () =>
      callEngine<{ healthy: boolean; issues: Array<{ severity: string; category: string; description: string }> }>('daw.check_session_health'),

    getDiskSpace: () =>
      callEngine<{ session_path: string; free_bytes: number; free_mb: number; free_gb: number }>('daw.get_session_disk_space'),
  },

  // =========================================================================
  // Transport
  // =========================================================================
  transport: {
    play: () =>
      callEngine<{ ok: boolean }>('daw.transport_play'),

    stop: () =>
      callEngine<{ ok: boolean }>('daw.transport_stop'),

    locate: (samplePosition: number) =>
      callEngine<{ ok: boolean }>('daw.transport_locate', { sample_position: samplePosition }),

    getState: () =>
      callEngine<{ playing: boolean; recording: boolean; position: number }>('daw.get_transport_state'),

    getStateFull: () =>
      callEngine<{ playing: boolean; recording: boolean; record_enabled: boolean; position_samples: number; speed: number; sample_rate: number; loop_start?: number; loop_end?: number; loop_enabled?: boolean; punch_start?: number; punch_end?: number; punch_in?: boolean; punch_out?: boolean; auto_input: boolean; auto_play: boolean; auto_return: boolean; click_enabled: boolean }>('daw.get_transport_state_full'),

    getSpeed: () =>
      callEngine<{ speed: number; playing: boolean }>('daw.get_transport_speed'),

    setPlaybackSpeed: (speed: number) =>
      callEngine<{ success: boolean; speed: number }>('daw.set_playback_speed', { speed }),

    toggleLoop: () =>
      callEngine<{ success: boolean; looping: boolean }>('daw.toggle_loop'),

    setLoopEnabled: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.set_loop_enabled', { enabled }),

    setLoopRange: (startSample: number, endSample: number) =>
      callEngine<{ success: boolean; start_sample: number; end_sample: number }>('daw.set_loop_range', { start_sample: startSample, end_sample: endSample }),

    getLoopRange: () =>
      callEngine<{ enabled: boolean; start_samples: number; end_samples: number; length_samples: number }>('daw.get_loop_range'),

    setPunchRange: (startSample: number, endSample: number) =>
      callEngine<{ success: boolean; start_sample: number; end_sample: number }>('daw.set_punch_range', { start_sample: startSample, end_sample: endSample }),

    getPunchRange: () =>
      callEngine<{ punch_in_enabled: boolean; punch_out_enabled: boolean; start_samples: number; end_samples: number; length_samples: number }>('daw.get_punch_range'),

    setPunchIn: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.set_punch_in', { enabled }),

    setPunchOut: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.set_punch_out', { enabled }),

    togglePunch: (punchIn?: boolean, punchOut?: boolean) =>
      callEngine<{ ok: boolean; punch_in: boolean; punch_out: boolean }>('daw.toggle_punch', { punch_in: punchIn, punch_out: punchOut }),

    setAutoInput: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.set_auto_input', { enabled }),

    setAutoPlay: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.set_auto_play', { enabled }),

    setAutoReturn: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.set_auto_return', { enabled }),

    setFollowEdits: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.set_follow_edits', { enabled }),

    gotoStart: () =>
      callEngine<{ success: boolean; position: number }>('daw.transport_goto_start'),

    gotoEnd: () =>
      callEngine<{ success: boolean; position: number }>('daw.transport_goto_end'),

    gotoMarker: (name: string) =>
      callEngine<{ success: boolean; position: number }>('daw.transport_goto_marker', { name }),

    forward: () =>
      callEngine('daw.transport_forward'),

    rewind: () =>
      callEngine('daw.transport_rewind'),

    playSelection: () =>
      callEngine('daw.transport_play_selection'),

    playRange: (startSamples: number, endSamples: number) =>
      callEngine<{ ok: boolean }>('daw.play_range', { start_samples: startSamples, end_samples: endSamples }),

    playRegion: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.play_region', { track_id: trackId, region_id: regionId }),

    setDefaultPlaySpeed: (speed: number) =>
      callEngine<{ ok: boolean; speed: number }>('daw.set_default_play_speed', { speed }),

    getDefaultPlaySpeed: () =>
      callEngine<{ speed: number }>('daw.get_default_play_speed'),

    requestBoundedRoll: (start: number, end: number) =>
      callEngine<{ ok: boolean; start: number; end: number }>('daw.request_bounded_roll', { start, end }),

    triggerCueRow: (row: number) =>
      callEngine<{ ok: boolean; row: number }>('daw.trigger_cue_row', { row }),
  },

  // =========================================================================
  // Recording
  // =========================================================================
  recording: {
    toggle: () =>
      callEngine<{ success: boolean; recording: boolean }>('daw.toggle_record'),

    record: () =>
      callEngine<{ ok: boolean; recording: boolean }>('daw.transport_record'),

    recordWithPreroll: () =>
      callEngine('daw.transport_record_with_preroll'),

    recordWithCountIn: () =>
      callEngine('daw.transport_record_with_count_in'),

    armAll: (arm?: boolean) =>
      callEngine<{ success: boolean; armed: number }>('daw.record_arm_all', { arm }),

    getState: () =>
      callEngine<{ record_enabled: boolean; actively_recording: boolean; armed_tracks: Array<{ id: string; name: string }>; armed_count: number; punch_enabled: boolean; punch_in: boolean; punch_out: boolean; preroll_seconds: number }>('daw.get_record_state'),

    setPreRoll: (seconds: number) =>
      callEngine<{ ok: boolean; preroll_seconds: number }>('daw.set_pre_roll', { seconds }),

    setPostRoll: (seconds: number) =>
      callEngine<{ ok: boolean; postroll_seconds: number }>('daw.set_post_roll', { seconds }),

    discardLastTake: () =>
      callEngine<{ ok: boolean; description: string }>('daw.discard_last_take'),

    getArmedTracks: () =>
      callEngine<{ armed_tracks: Array<{ id: string; name: string }>; count: number }>('daw.get_armed_tracks'),

    disarmAll: () =>
      callEngine<{ success: boolean; disarmed_count: number }>('daw.disarm_all_tracks'),

    getRecordingState: () =>
      callEngine<{ recording: boolean; tracks: Array<{ track_id: string; capture_start_samples: number; captured_samples: number; peaks: Array<{ min: number; max: number }> }>; position_samples: number }>('daw.get_recording_state'),

    setRecordMode: (mode: string) =>
      callEngine<{ ok: boolean; mode: string }>('daw.set_record_mode', { mode }),

    getRecordMode: () =>
      callEngine<{ mode: string }>('daw.get_record_mode'),
  },

  // =========================================================================
  // Track Management
  // =========================================================================
  track: {
    getAll: () =>
      callEngine<TrackInfo[]>('daw.get_tracks'),

    getDetails: (trackId: string) =>
      callEngine<TrackDetails>('daw.get_track_details', { track_id: trackId }),

    getNames: () =>
      callEngine<{ tracks: Array<{ id: string; name: string; is_track: boolean; active: boolean; hidden: boolean }>; count: number }>('daw.get_track_names'),

    getCount: () =>
      callEngine<{ total: number; audio_tracks: number; buses: number }>('daw.get_track_count'),

    getType: (trackId: string) =>
      callEngine<{ track_id: string; name: string; type: string }>('daw.get_track_type', { track_id: trackId }),

    addAudio: (name?: string, channels?: number) =>
      callEngine<{ success: boolean; status: string }>('daw.add_audio_track', { name, channels }),

    addMidi: (name?: string) =>
      callEngine<{ success: boolean; status: string }>('daw.add_midi_track', { name }),

    addBus: (name?: string, channels?: number) =>
      callEngine<{ success: boolean; status: string }>('daw.add_bus', { name, channels }),

    addWithColor: (type?: string, name?: string, channels?: number, color?: string) =>
      callEngine<{ success: boolean; track_id: string; name: string }>('daw.add_track_with_color', { type, name, channels, color }),

    remove: (trackId: string) =>
      callEngine<{ success: boolean; status: string }>('daw.remove_track', { track_id: trackId }),

    rename: (trackId: string, name: string) =>
      callEngine<{ success: boolean; status: string }>('daw.rename_track', { track_id: trackId, name }),

    duplicate: (trackId: string, name?: string) =>
      callEngine<{ success: boolean; status: string }>('daw.duplicate_track', { track_id: trackId, name }),

    // Track properties
    setGain: (trackId: string, gainDb: number) =>
      callEngine<{ ok: boolean }>('daw.set_track_gain', { track_id: trackId, gain_db: gainDb }),

    setGainRelative: (trackId: string, deltaDd: number) =>
      callEngine<{ ok: boolean; previous_db: number; new_db: number }>('daw.set_track_gain_relative', { track_id: trackId, delta_db: deltaDd }),

    setMute: (trackId: string, muted: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_track_mute', { track_id: trackId, muted }),

    setSolo: (trackId: string, soloed: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_track_solo', { track_id: trackId, soloed }),

    setPan: (trackId: string, pan: number) =>
      callEngine<{ success: boolean; pan: number }>('daw.set_track_pan', { track_id: trackId, pan }),

    getPan: (trackId: string) =>
      callEngine<{ track_id: string; pan_position: number; pan_width: number }>('daw.get_track_pan', { track_id: trackId }),

    setPanWidth: (trackId: string, width: number) =>
      callEngine<{ ok: boolean; width: number }>('daw.set_track_pan_width', { track_id: trackId, width }),

    setTrim: (trackId: string, trimDb: number) =>
      callEngine<{ success: boolean; trim_db: number }>('daw.set_track_trim', { track_id: trackId, trim_db: trimDb }),

    setRecord: (trackId: string, enabled: boolean) =>
      callEngine<{ success: boolean; status: string }>('daw.set_track_record', { track_id: trackId, enabled }),

    setColor: (trackId: string, color: string) =>
      callEngine<{ success: boolean; status: string }>('daw.set_track_color', { track_id: trackId, color }),

    setComment: (trackId: string, comment: string) =>
      callEngine<{ success: boolean; status: string }>('daw.set_track_comment', { track_id: trackId, comment }),

    setActive: (trackId: string, active: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_track_active', { track_id: trackId, active }),

    setHidden: (trackId: string, hidden: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_track_hidden', { track_id: trackId, hidden }),

    setMonitoring: (trackId: string, mode: string) =>
      callEngine<{ ok: boolean }>('daw.set_track_monitoring', { track_id: trackId, mode }),

    getRecordStatus: (trackId: string) =>
      callEngine<{ track_id: string; name: string; record_armed: boolean; monitoring: string; monitoring_input: boolean; monitoring_disk: boolean }>('daw.get_track_record_status', { track_id: trackId }),

    setPhaseInvert: (trackId: string, invert: boolean, channel?: number) =>
      callEngine<{ ok: boolean }>('daw.set_track_phase_invert', { track_id: trackId, invert, channel }),

    freeze: (trackId: string) =>
      callEngine<{ ok: boolean }>('daw.freeze_track', { track_id: trackId }),

    unfreeze: (trackId: string) =>
      callEngine<{ ok: boolean }>('daw.unfreeze_track', { track_id: trackId }),

    getFreezeState: (trackId: string) =>
      callEngine<{ track_id: string; freeze_state: string; is_frozen: boolean }>('daw.track.get_freeze_state', { track_id: trackId }),

    bounce: (trackId: string, name?: string) =>
      callEngine<{ ok: boolean; region_id: string; region_name: string; length: number }>('daw.track.bounce', { track_id: trackId, name }),

    bounceRange: (trackId: string, start: number, end: number, name?: string) =>
      callEngine<{ ok: boolean; region_id: string; region_name: string; length: number }>('daw.track.bounce_range', { track_id: trackId, start, end, name }),

    getInputPorts: (trackId: string) =>
      callEngine<{ track_id: string; ports: Array<{ name: string; connected: boolean }> }>('daw.get_track_input_ports', { track_id: trackId }),

    getOutputPorts: (trackId: string) =>
      callEngine<{ track_id: string; ports: Array<{ name: string; connected: boolean }> }>('daw.get_track_output_ports', { track_id: trackId }),

    getLatency: (trackId: string) =>
      callEngine<{ track_id: string; signal_latency: number; playback_latency: number }>('daw.get_track_latency', { track_id: trackId }),

    soloExclusive: (trackId: string) =>
      callEngine<{ ok: boolean }>('daw.solo_exclusive', { track_id: trackId }),

    muteAll: (mute?: boolean) =>
      callEngine<{ ok: boolean; count: number }>('daw.mute_all', { mute }),

    unmuteAll: () =>
      callEngine<{ ok: boolean; count: number }>('daw.unmute_all'),

    unsoloAll: () =>
      callEngine<{ ok: boolean; count: number }>('daw.unsolo_all'),

    getMasterGain: () =>
      callEngine<{ gain: number; gain_db: number; track_id: string; name: string }>('daw.get_master_gain'),

    setMasterGain: (gainDb: number) =>
      callEngine<{ ok: boolean; gain_db: number }>('daw.set_master_gain', { gain_db: gainDb }),

    getMixState: () =>
      callEngine<{ tracks: Array<{ id: string; name: string; type: string; gain_db: number; pan: number; muted: boolean; soloed: boolean; active: boolean; record_armed: boolean; color: string }>; track_count: number; sample_rate: number; playing: boolean; recording: boolean; position: number }>('daw.get_mix_state'),

    setSoloIsolate: (trackId: string, isolated: boolean) =>
      callEngine<{ ok: boolean; track_id: string; isolated: boolean }>('daw.set_track_solo_isolate', { track_id: trackId, isolated }),

    getSoloIsolate: (trackId: string) =>
      callEngine<{ track_id: string; isolated: boolean }>('daw.get_track_solo_isolate', { track_id: trackId }),

    setSoloSafe: (trackId: string, safe: boolean) =>
      callEngine<{ ok: boolean; track_id: string; safe: boolean }>('daw.set_track_solo_safe', { track_id: trackId, safe }),

    getSoloSafe: (trackId: string) =>
      callEngine<{ track_id: string; safe: boolean }>('daw.get_track_solo_safe', { track_id: trackId }),

    setRecordSafe: (trackId: string, safe: boolean) =>
      callEngine<{ ok: boolean; track_id: string; safe: boolean }>('daw.set_track_record_safe', { track_id: trackId, safe }),

    getRecordSafe: (trackId: string) =>
      callEngine<{ track_id: string; safe: boolean }>('daw.get_track_record_safe', { track_id: trackId }),

    setListen: (trackId: string, listen: boolean) =>
      callEngine<{ ok: boolean; track_id: string; listen: boolean }>('daw.set_track_listen', { track_id: trackId, listen }),

    setStrictIo: (trackId: string, strict: boolean) =>
      callEngine<{ ok: boolean; track_id: string; strict_io: boolean }>('daw.set_track_strict_io', { track_id: trackId, strict }),

    getStrictIo: (trackId: string) =>
      callEngine<{ track_id: string; strict_io: boolean }>('daw.get_track_strict_io', { track_id: trackId }),
  },

  // =========================================================================
  // Region Editing
  // =========================================================================
  region: {
    getAll: (trackId: string) =>
      callEngine<RegionInfo[]>('daw.get_regions', { track_id: trackId }),

    getInfo: (trackId: string, regionId: string) =>
      callEngine<RegionInfo & { hidden: boolean; opaque: boolean; gain_db?: number; fade_in_active?: boolean; fade_out_active?: boolean; envelope_active?: boolean; peak_amplitude?: number; peak_amplitude_db?: number; note_count?: number; type: string }>('daw.get_region_info', { track_id: trackId, region_id: regionId }),

    getAtPosition: (trackId: string, positionSamples: number) =>
      callEngine<{ found: boolean; id?: string; name?: string; position_samples?: number; length_samples?: number; muted?: boolean; locked?: boolean }>('daw.get_region_at_position', { track_id: trackId, position_samples: positionSamples }),

    getByName: (name: string) =>
      callEngine<{ found: boolean; id?: string; name?: string; position_samples?: number; length_samples?: number; muted?: boolean; track_id?: string; track_name?: string }>('daw.get_region_by_name', { name }),

    selectInRange: (trackId: string, startSamples: number, endSamples: number) =>
      callEngine<{ regions: RegionInfo[]; count: number }>('daw.select_regions_in_range', { track_id: trackId, start_samples: startSamples, end_samples: endSamples }),

    split: (trackId: string, regionId: string, positionSamples: number) =>
      callEngine<{ ok: boolean }>('daw.split_region', { track_id: trackId, region_id: regionId, position_samples: positionSamples }),

    move: (trackId: string, regionId: string, positionSamples: number) =>
      callEngine<{ ok: boolean }>('daw.move_region', { track_id: trackId, region_id: regionId, position_samples: positionSamples }),

    moveToTrack: (sourceTrackId: string, targetTrackId: string, regionId: string, positionSamples?: number) =>
      callEngine<{ ok: boolean; new_position: number }>('daw.move_region_to_track', { source_track_id: sourceTrackId, target_track_id: targetTrackId, region_id: regionId, position_samples: positionSamples }),

    nudge: (trackId: string, regionId: string, nudgeSamples?: number, nudgeBeats?: number) =>
      callEngine<{ ok: boolean; new_position_samples: number }>('daw.nudge_region', { track_id: trackId, region_id: regionId, nudge_samples: nudgeSamples, nudge_beats: nudgeBeats }),

    delete: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.delete_region', { track_id: trackId, region_id: regionId }),

    copy: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean; cloned_region_id: string; name: string }>('daw.copy_region', { track_id: trackId, region_id: regionId }),

    paste: (trackId: string, regionId: string, positionSamples: number) =>
      callEngine<{ ok: boolean; region_id: string; name: string; position: number }>('daw.paste_region', { track_id: trackId, region_id: regionId, position_samples: positionSamples }),

    duplicate: (trackId: string, regionId: string, times?: number) =>
      callEngine<{ ok: boolean }>('daw.duplicate_region', { track_id: trackId, region_id: regionId, times }),

    trimStart: (trackId: string, regionId: string, positionSamples: number) =>
      callEngine<{ ok: boolean }>('daw.trim_region_start', { track_id: trackId, region_id: regionId, position_samples: positionSamples }),

    trimEnd: (trackId: string, regionId: string, positionSamples: number) =>
      callEngine<{ ok: boolean }>('daw.trim_region_end', { track_id: trackId, region_id: regionId, position_samples: positionSamples }),

    trimToRange: (trackId: string, regionId: string, startSamples: number, endSamples: number) =>
      callEngine<{ ok: boolean }>('daw.trim_region_to_range', { track_id: trackId, region_id: regionId, start_samples: startSamples, end_samples: endSamples }),

    bounceRange: (trackId: string, startSamples: number, endSamples: number, name?: string) =>
      callEngine<{ ok: boolean; region_id: string; name: string }>('daw.bounce_range', { track_id: trackId, start_samples: startSamples, end_samples: endSamples, name }),

    bounceRegion: (trackId: string, regionId: string) =>
      callEngine<{ success: boolean; region_id: string; name: string }>('daw.bounce_region', { track_id: trackId, region_id: regionId }),

    consolidate: (trackId: string, startSamples: number, endSamples: number, name?: string) =>
      callEngine<{ ok: boolean; region_id: string; region_name: string }>('daw.consolidate_range', { track_id: trackId, start_samples: startSamples, end_samples: endSamples, name }),

    normalize: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.normalize_region', { track_id: trackId, region_id: regionId }),

    ripple: (trackId: string, regionId: string, positionSamples: number) =>
      callEngine<{ ok: boolean; moved: number }>('daw.ripple_region', { track_id: trackId, region_id: regionId, position_samples: positionSamples }),

    getSelected: () =>
      callEngine('daw.get_selected_regions'),

    count: (trackId: string) =>
      callEngine<{ count: number }>('daw.count_regions', { track_id: trackId }),

    // Region properties
    setName: (trackId: string, regionId: string, name: string) =>
      callEngine<{ ok: boolean }>('daw.rename_region', { track_id: trackId, region_id: regionId, name }),

    setMuted: (trackId: string, regionId: string, muted: boolean) =>
      callEngine<{ ok: boolean }>('daw.mute_region', { track_id: trackId, region_id: regionId, muted }),

    setLocked: (trackId: string, regionId: string, locked: boolean) =>
      callEngine<{ ok: boolean }>('daw.lock_region', { track_id: trackId, region_id: regionId, locked }),

    setGain: (trackId: string, regionId: string, gainDb: number) =>
      callEngine<{ ok: boolean }>('daw.set_region_gain', { track_id: trackId, region_id: regionId, gain_db: gainDb }),

    setOpaque: (trackId: string, regionId: string, opaque: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_region_opaque', { track_id: trackId, region_id: regionId, opaque }),

    setFadeIn: (trackId: string, regionId: string, lengthSamples: number) =>
      callEngine<{ ok: boolean }>('daw.set_region_fade_in', { track_id: trackId, region_id: regionId, length_samples: lengthSamples }),

    setFadeOut: (trackId: string, regionId: string, lengthSamples: number) =>
      callEngine<{ ok: boolean }>('daw.set_region_fade_out', { track_id: trackId, region_id: regionId, length_samples: lengthSamples }),

    setFadeInActive: (trackId: string, regionId: string, active: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_fade_in_active', { track_id: trackId, region_id: regionId, active }),

    setFadeOutActive: (trackId: string, regionId: string, active: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_fade_out_active', { track_id: trackId, region_id: regionId, active }),

    setFadeShape: (trackId: string, regionId: string, fade: string, shape: string) =>
      callEngine<{ ok: boolean }>('daw.set_fade_shape', { track_id: trackId, region_id: regionId, fade, shape }),

    createCrossfade: (trackId: string, regionIdA: string, regionIdB: string, crossfadeSamples?: number) =>
      callEngine<{ ok: boolean; description: string }>('daw.create_crossfade', { track_id: trackId, region_id_a: regionIdA, region_id_b: regionIdB, crossfade_samples: crossfadeSamples }),

    setSyncPoint: (trackId: string, regionId: string, positionSamples: number) =>
      callEngine<{ ok: boolean }>('daw.set_region_sync_point', { track_id: trackId, region_id: regionId, position_samples: positionSamples }),

    loopRegion: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.loop_region', { track_id: trackId, region_id: regionId }),

    raise: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.raise_region', { track_id: trackId, region_id: regionId }),

    lower: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.lower_region', { track_id: trackId, region_id: regionId }),

    raiseToTop: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.raise_region_to_top', { track_id: trackId, region_id: regionId }),

    lowerToBottom: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.lower_region_to_bottom', { track_id: trackId, region_id: regionId }),

    // Audio analysis
    getAudioPeaks: (trackId: string, regionId: string, nPeaks?: number, channel?: number) =>
      callEngine<Array<{ min: number; max: number }>>('daw.get_audio_peaks', { track_id: trackId, region_id: regionId, n_peaks: nPeaks, channel }),

    getRms: (trackId: string, regionId: string) =>
      callEngine<{ rms: number; rms_db: number }>('daw.get_region_rms', { track_id: trackId, region_id: regionId }),

    stripSilence: (trackId: string, regionId: string, thresholdDb?: number, minLengthSamples?: number) =>
      callEngine<Array<{ start_samples: number; end_samples: number }>>('daw.strip_silence', { track_id: trackId, region_id: regionId, threshold_db: thresholdDb, min_length_samples: minLengthSamples }),
  },

  // =========================================================================
  // MIDI
  // =========================================================================
  midi: {
    createRegion: (trackId: string, positionSamples: number, lengthSamples: number, name?: string) =>
      callEngine<{ ok: boolean; region_id: string; name: string; position: number; length: number }>('daw.create_midi_region', { track_id: trackId, position_samples: positionSamples, length_samples: lengthSamples, name }),

    getNotes: (trackId: string, regionId: string) =>
      callEngine<MidiNote[]>('daw.get_midi_notes', { track_id: trackId, region_id: regionId }),

    getRegionInfo: (trackId: string, regionId: string) =>
      callEngine<{ region_id: string; name: string; position_samples: number; length_samples: number; note_count: number; lowest_note?: number; highest_note?: number; earliest_beat?: number; latest_beat?: number; duration_beats?: number }>('daw.get_midi_region_info', { track_id: trackId, region_id: regionId }),

    // Legacy API
    addNote: (trackId: string, regionId: string, note: number, velocity: number, startBeats: number, lengthBeats: number, channel?: number) =>
      callEngine<{ ok: boolean }>('daw.add_midi_note', { track_id: trackId, region_id: regionId, note, velocity, start_beats: startBeats, length_beats: lengthBeats, channel }),

    removeNote: (trackId: string, regionId: string, note: number, startBeats: number, channel?: number) =>
      callEngine<{ ok: boolean }>('daw.remove_midi_note', { track_id: trackId, region_id: regionId, note, start_beats: startBeats, channel }),

    quantize: (trackId: string, regionId: string, gridBeats?: number, strength?: number) =>
      callEngine<{ ok: boolean }>('daw.quantize_midi', { track_id: trackId, region_id: regionId, grid_beats: gridBeats, strength }),

    transpose: (trackId: string, regionId: string, semitones: number) =>
      callEngine<{ ok: boolean }>('daw.transpose_midi', { track_id: trackId, region_id: regionId, semitones }),

    setVelocity: (trackId: string, regionId: string, velocity: number, noteMin?: number, noteMax?: number) =>
      callEngine<{ ok: boolean }>('daw.set_midi_velocity', { track_id: trackId, region_id: regionId, velocity, note_min: noteMin, note_max: noteMax }),

    humanize: (trackId: string, regionId: string, timingAmount?: number, velocityAmount?: number) =>
      callEngine<{ ok: boolean }>('daw.humanize_midi', { track_id: trackId, region_id: regionId, timing_amount: timingAmount, velocity_amount: velocityAmount }),

    selectNotes: (trackId: string, regionId: string, noteMin?: number, noteMax?: number, velocityMin?: number, velocityMax?: number, startBeats?: number, endBeats?: number) =>
      callEngine<{ notes: MidiNote[]; count: number }>('daw.select_midi_notes', { track_id: trackId, region_id: regionId, note_min: noteMin, note_max: noteMax, velocity_min: velocityMin, velocity_max: velocityMax, start_beats: startBeats, end_beats: endBeats }),

    // By note ID API
    addNoteById: (trackId: string, regionId: string, note: number, startBeats: number, velocity?: number, channel?: number, lengthBeats?: number) =>
      callEngine<{ success: boolean; note_id: number }>('daw.midi.add_note', { track_id: trackId, region_id: regionId, note, start_beats: startBeats, velocity, channel, length_beats: lengthBeats }),

    deleteNoteById: (trackId: string, regionId: string, noteId: number) =>
      callEngine<{ success: boolean }>('daw.midi.delete_note', { track_id: trackId, region_id: regionId, note_id: noteId }),

    moveNoteById: (trackId: string, regionId: string, noteId: number, opts: { new_time_beats?: number; new_note?: number; new_velocity?: number; new_length_beats?: number; new_channel?: number }) =>
      callEngine<{ success: boolean }>('daw.midi.move_note', { track_id: trackId, region_id: regionId, note_id: noteId, ...opts }),

    setNoteVelocityById: (trackId: string, regionId: string, noteId: number, velocity: number) =>
      callEngine<{ success: boolean }>('daw.midi.set_note_velocity', { track_id: trackId, region_id: regionId, note_id: noteId, velocity }),

    resizeNoteById: (trackId: string, regionId: string, noteId: number, lengthBeats: number) =>
      callEngine<{ success: boolean }>('daw.midi.resize_note', { track_id: trackId, region_id: regionId, note_id: noteId, length_beats: lengthBeats }),

    editNote: (trackId: string, regionId: string, noteId: number, props: { note?: number; velocity?: number; start_beats?: number; length_beats?: number; channel?: number }) =>
      callEngine<{ ok: boolean }>('daw.edit_midi_note', { track_id: trackId, region_id: regionId, note_id: noteId, ...props }),

    quantizeById: (trackId: string, regionId: string, gridBeats?: number, strength?: number, swing?: number) =>
      callEngine<{ success: boolean; notes_quantized: number }>('daw.midi.quantize', { track_id: trackId, region_id: regionId, grid_beats: gridBeats, strength, swing }),

    transposeById: (trackId: string, regionId: string, semitones: number) =>
      callEngine<{ success: boolean; notes_transposed: number }>('daw.midi.transpose', { track_id: trackId, region_id: regionId, semitones }),

    // CC
    getCcData: (trackId: string, regionId: string, ccNumber: number) =>
      callEngine<{ cc_number: number; events: Array<{ time_beats: number; value: number }>; count: number }>('daw.midi.get_cc_data', { track_id: trackId, region_id: regionId, cc_number: ccNumber }),

    getAllCcNumbers: (trackId: string, regionId: string) =>
      callEngine<{ cc_numbers: Array<{ cc_number: number; event_count: number }> }>('daw.midi.get_all_cc_numbers', { track_id: trackId, region_id: regionId }),

    addCcEvent: (trackId: string, regionId: string, ccNumber: number, timeBeats: number, value: number) =>
      callEngine<{ success: boolean }>('daw.midi.add_cc_event', { track_id: trackId, region_id: regionId, cc_number: ccNumber, time_beats: timeBeats, value }),

    clearCcData: (trackId: string, regionId: string, ccNumber: number) =>
      callEngine<{ success: boolean }>('daw.midi.clear_cc_data', { track_id: trackId, region_id: regionId, cc_number: ccNumber }),

    deleteCcEvent: (trackId: string, regionId: string, ccNumber: number, timeBeats: number) =>
      callEngine<{ success: boolean }>('daw.midi.delete_cc_event', { track_id: trackId, region_id: regionId, cc_number: ccNumber, time_beats: timeBeats }),

    // Transformations
    quantizeSwing: (trackId: string, regionId: string, gridBeats?: number, swing?: number, strength?: number) =>
      callEngine<{ ok: boolean }>('daw.quantize_midi_swing', { track_id: trackId, region_id: regionId, grid_beats: gridBeats, swing, strength }),

    legato: (trackId: string, regionId: string, gapBeats?: number) =>
      callEngine<{ ok: boolean; changed: number }>('daw.legato_midi', { track_id: trackId, region_id: regionId, gap_beats: gapBeats }),

    scaleVelocity: (trackId: string, regionId: string, scalePercent: number) =>
      callEngine<{ ok: boolean }>('daw.scale_midi_velocity', { track_id: trackId, region_id: regionId, scale_percent: scalePercent }),

    setChannel: (trackId: string, regionId: string, channel: number) =>
      callEngine<{ ok: boolean; changed: number }>('daw.set_midi_channel', { track_id: trackId, region_id: regionId, channel }),

    invertNotes: (trackId: string, regionId: string, pivot?: number) =>
      callEngine<{ ok: boolean; pivot: number }>('daw.invert_midi_notes', { track_id: trackId, region_id: regionId, pivot }),

    retrograde: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.retrograde_midi', { track_id: trackId, region_id: regionId }),

    duplicateContent: (trackId: string, regionId: string, times?: number) =>
      callEngine<{ ok: boolean; times: number }>('daw.duplicate_midi_region_content', { track_id: trackId, region_id: regionId, times }),
  },

  // =========================================================================
  // Plugin Management
  // =========================================================================
  plugin: {
    getAvailable: () =>
      callEngine<{ plugins: Array<{ name: string; type: string; category: string; creator: string; unique_id: string }>; count: number }>('daw.get_available_plugins'),

    getTrackPlugins: (trackId: string) =>
      callEngine<{ plugins: PluginInfo[] }>('daw.get_track_plugins', { track_id: trackId }),

    load: (trackId: string, pluginName: string) =>
      callEngine<{ success: boolean; status: string }>('daw.load_plugin', { track_id: trackId, plugin_name: pluginName }),

    loadById: (trackId: string, uniqueId: string) =>
      callEngine<{ ok: boolean; processor_id: string; name: string }>('daw.load_plugin_by_id', { track_id: trackId, unique_id: uniqueId }),

    remove: (trackId: string, processorId: string) =>
      callEngine<{ success: boolean; status: string }>('daw.remove_plugin', { track_id: trackId, processor_id: processorId }),

    setEnabled: (trackId: string, processorId: string, enabled: boolean) =>
      callEngine<{ success: boolean; status: string }>('daw.set_plugin_enabled', { track_id: trackId, processor_id: processorId, enabled }),

    bypassAll: (trackId: string) =>
      callEngine<{ ok: boolean; bypassed_count: number }>('daw.bypass_all_plugins', { track_id: trackId }),

    enableAll: (trackId: string) =>
      callEngine<{ ok: boolean; enabled_count: number }>('daw.enable_all_plugins', { track_id: trackId }),

    getInfo: (trackId: string, processorId: string) =>
      callEngine<PluginDetail>('daw.get_plugin_info', { track_id: trackId, processor_id: processorId }),

    getProcessorChain: (trackId: string) =>
      callEngine<{ processors: Array<{ index: number; id: string; name: string; active: boolean; type: string; plugin_name?: string; parameter_count?: number }>; count: number }>('daw.get_processor_chain', { track_id: trackId }),

    reorder: (trackId: string, processorIds: string[]) =>
      callEngine<{ ok: boolean }>('daw.reorder_plugins', { track_id: trackId, processor_ids: processorIds }),

    setPosition: (trackId: string, processorId: string, position: number) =>
      callEngine<{ ok: boolean; position: number }>('daw.set_plugin_position', { track_id: trackId, processor_id: processorId, position }),

    movePlugin: (sourceTrackId: string, destTrackId: string, processorId: string) =>
      callEngine<{ ok: boolean; new_processor_id: string }>('daw.move_plugin', { source_track_id: sourceTrackId, dest_track_id: destTrackId, processor_id: processorId }),

    copyPlugin: (sourceTrackId: string, sourceProcessorId: string, targetTrackId: string) =>
      callEngine<{ ok: boolean; new_processor_id: string }>('daw.copy_plugin', { source_track_id: sourceTrackId, source_processor_id: sourceProcessorId, target_track_id: targetTrackId }),

    openEditor: (trackId: string, processorId: string) =>
      callEngine<{ success: boolean; has_editor: boolean; name: string; parameters: PluginParam[]; parameter_count: number }>('daw.plugin.open_editor', { track_id: trackId, processor_id: processorId }),

    // Parameters
    getParameters: (trackId: string, processorId: string) =>
      callEngine<{ parameters: PluginParam[] }>('daw.get_plugin_parameters', { track_id: trackId, processor_id: processorId }),

    setParameter: (trackId: string, processorId: string, index: number, value: number) =>
      callEngine<{ success: boolean; status: string }>('daw.set_plugin_parameter', { track_id: trackId, processor_id: processorId, index, value }),

    setMultipleParameters: (trackId: string, processorId: string, parameters: Array<{ index: number; value: number }>) =>
      callEngine<{ ok: boolean; set_count: number }>('daw.set_multiple_plugin_parameters', { track_id: trackId, processor_id: processorId, parameters }),

    resetParametersToDefault: (trackId: string, pluginId: string) =>
      callEngine<{ ok: boolean }>('daw.plugin.reset_parameters_to_default', { track_id: trackId, plugin_id: pluginId }),

    getParameterDescriptor: (trackId: string, pluginId: string, paramIndex: number) =>
      callEngine<{ label: string; lower: number; upper: number; normal: number; step: number; toggled: boolean; logarithmic: boolean; integer_step: boolean; unit: string }>('daw.plugin.get_parameter_descriptor', { track_id: trackId, plugin_id: pluginId, param_index: paramIndex }),

    // Presets
    listPresets: (trackId: string, processorId: string) =>
      callEngine<{ presets: Array<{ uri: string; label: string; user: boolean }>; count: number; current_preset: string }>('daw.plugin.list_presets', { track_id: trackId, processor_id: processorId }),

    loadPreset: (trackId: string, processorId: string, presetUri: string) =>
      callEngine<{ success: boolean; loaded_preset: string }>('daw.plugin.load_preset', { track_id: trackId, processor_id: processorId, preset_uri: presetUri }),

    savePreset: (trackId: string, processorId: string, name: string) =>
      callEngine<{ ok: boolean; preset_uri: string; label: string }>('daw.save_plugin_preset', { track_id: trackId, processor_id: processorId, name }),

    removePreset: (trackId: string, pluginId: string, name: string) =>
      callEngine<{ ok: boolean }>('daw.plugin.remove_preset', { track_id: trackId, plugin_id: pluginId, name }),

    // Search
    search: (query: string) =>
      callEngine<{ results: Array<{ name: string; type: string; category: string; creator: string; unique_id: string }>; count: number }>('daw.search_plugins', { query }),

    searchByCategory: (category: string) =>
      callEngine<{ results: Array<{ name: string; type: string; category: string; creator: string; unique_id: string }>; count: number }>('daw.search_plugins_by_category', { category }),

    // State serialization
    getStateBlob: (routeId: string, processorId: string) =>
      callEngine<{ blob: string; encoding: string; processor_id: string }>('daw.get_plugin_state_blob', { route_id: routeId, processor_id: processorId }),

    setStateBlob: (routeId: string, processorId: string, blob: string) =>
      callEngine<{ ok: boolean; processor_id: string }>('daw.set_plugin_state_blob', { route_id: routeId, processor_id: processorId, blob }),

    copyState: (routeId: string, processorId: string) =>
      callEngine<{ ok: boolean; clipboard_size_bytes: number }>('daw.copy_plugin_state', { route_id: routeId, processor_id: processorId }),

    pasteState: (routeId: string, processorId: string) =>
      callEngine<{ ok: boolean; processor_id: string }>('daw.paste_plugin_state', { route_id: routeId, processor_id: processorId }),
  },

  // =========================================================================
  // Automation
  // =========================================================================
  automation: {
    getState: (trackId: string, parameter?: string) =>
      callEngine<{ track_id: string; parameter: string; state: string }>('daw.get_automation_state', { track_id: trackId, parameter }),

    setState: (trackId: string, state: string, parameter?: string) =>
      callEngine<{ ok: boolean }>('daw.set_automation_state', { track_id: trackId, parameter, state }),

    getData: (trackId: string, parameter?: string) =>
      callEngine<{ track_id: string; parameter: string; points: AutomationPoint[]; count: number }>('daw.get_automation_data', { track_id: trackId, parameter }),

    addPoint: (trackId: string, time: number, value: number, parameter?: string) =>
      callEngine<{ ok: boolean }>('daw.add_automation_point', { track_id: trackId, parameter, time, value }),

    clear: (trackId: string, parameter?: string) =>
      callEngine<{ ok: boolean }>('daw.clear_automation', { track_id: trackId, parameter }),

    setAllState: (state: string, parameter?: string) =>
      callEngine<{ ok: boolean; count: number }>('daw.set_all_automation_state', { state, parameter }),

    setMode: (trackId: string, mode: string) =>
      callEngine<{ success: boolean }>('daw.set_automation_mode', { track_id: trackId, mode }),

    getMode: (trackId: string) =>
      callEngine<{ mode: string }>('daw.get_automation_mode', { track_id: trackId }),

    setPluginAutomationMode: (trackId: string, processorId: string, paramIndex: number, mode: string) =>
      callEngine<{ success: boolean }>('daw.set_plugin_automation_mode', { track_id: trackId, processor_id: processorId, param_index: paramIndex, mode }),

    // Extended
    getDataExt: (trackId: string, control?: string) =>
      callEngine<{ control: string; points: Array<{ time_samples: number; value: number }>; count: number; mode: string }>('daw.get_automation_data_ext', { track_id: trackId, control }),

    addPointExt: (trackId: string, timeSamples: number, value: number, control?: string) =>
      callEngine<{ success: boolean }>('daw.add_automation_point_ext', { track_id: trackId, control, time_samples: timeSamples, value }),

    deletePoint: (trackId: string, timeSamples: number, control?: string) =>
      callEngine<{ success: boolean }>('daw.delete_automation_point', { track_id: trackId, control, time_samples: timeSamples }),

    clearExt: (trackId: string, control?: string) =>
      callEngine<{ success: boolean }>('daw.clear_automation_ext', { track_id: trackId, control }),

    // Write passes
    startTouch: (trackId: string, control: string, when?: number) =>
      callEngine<{ ok: boolean }>('daw.automation.start_touch', { track_id: trackId, control, when }),

    stopTouch: (trackId: string, control: string, when?: number) =>
      callEngine<{ ok: boolean }>('daw.automation.stop_touch', { track_id: trackId, control, when }),

    startWritePass: (trackId: string, control: string, when?: number) =>
      callEngine<{ ok: boolean }>('daw.automation.start_write_pass', { track_id: trackId, control, when }),

    writePassFinished: (trackId: string, control: string, when?: number) =>
      callEngine<{ ok: boolean }>('daw.automation.write_pass_finished', { track_id: trackId, control, when }),
  },

  // =========================================================================
  // Metering
  // =========================================================================
  meter: {
    getTrackPeak: (trackId: string, channel?: number) =>
      callEngine<{ track_id: string; channel: number; peak_db: number }>('daw.get_track_peak', { track_id: trackId, channel }),

    getTrackRms: (trackId: string, channel?: number) =>
      callEngine<{ track_id: string; channel: number; rms_db: number }>('daw.get_track_rms', { track_id: trackId, channel }),

    getMasterPeak: () =>
      callEngine<{ channels: Array<{ channel: number; peak_db: number }> }>('daw.get_master_peak'),

    getMasterMeter: () =>
      callEngine<{ channels: Array<{ peak_db: number }>; channel_count: number }>('daw.get_master_meter'),

    getMasterLufs: () =>
      callEngine('daw.get_master_lufs'),

    getCpuLoad: () =>
      callEngine<{ cpu_load_percent: number }>('daw.get_cpu_load'),

    getAllLevels: () =>
      callEngine<{ tracks: Array<{ id: string; name: string; channels: Array<{ peak_db: number }> }> }>('daw.get_meter_levels'),

    resetPeaks: () =>
      callEngine<{ success: boolean }>('daw.reset_meter_peaks'),

    getXrunCount: () =>
      callEngine<{ xrun_count: number }>('daw.get_xrun_count'),

    getLatencyReport: () =>
      callEngine<{ tracks: Array<{ id: string; name: string; signal_latency: number; playback_latency: number }>; sample_rate: number; block_size: number; xrun_count: number }>('daw.get_latency_report'),

    // Extended analysis metering
    getRouteMeterLevels: (trackId: string) =>
      callEngine<{ track_id: string; channels: MeterChannel[]; n_channels: number }>('daw.get_route_meter_levels', { track_id: trackId }),

    getAllRouteMeters: () =>
      callEngine<{ routes: Array<{ id: string; name: string; channels: Array<{ peak_dB: number; rms_dB: number }>; n_channels: number }>; count: number }>('daw.get_all_route_meters'),

    getMasterMeterLevels: () =>
      callEngine<{ channels: Array<{ channel: number; peak_dB: number; rms_dB: number; k14_dB: number; k20_dB: number }>; n_channels: number; name: string }>('daw.get_master_meter_levels'),

    resetRoutePeak: (trackId: string) =>
      callEngine<{ ok: boolean; track_id: string }>('daw.reset_route_meter_peak', { track_id: trackId }),

    resetAllPeaks: () =>
      callEngine<{ ok: boolean; count: number }>('daw.reset_all_meter_peaks'),

    setMeterType: (trackId: string, meterType: string) =>
      callEngine<{ ok: boolean; track_id: string; meter_type: string }>('daw.set_meter_type_for_route', { track_id: trackId, meter_type: meterType }),

    getMeterType: (trackId: string) =>
      callEngine<{ track_id: string; meter_type: string }>('daw.get_meter_type_for_route', { track_id: trackId }),
  },

  // =========================================================================
  // Markers & Locations
  // =========================================================================
  marker: {
    add: (name: string, position?: number) =>
      callEngine<{ success: boolean; name: string; position: number }>('daw.add_marker', { name, position }),

    addLocation: (positionSamples: number, name?: string) =>
      callEngine<{ success: boolean; location_id: string; name: string }>('daw.add_location_marker', { position_samples: positionSamples, name }),

    addRange: (name: string, startSamples: number, endSamples: number) =>
      callEngine<{ ok: boolean; name: string; start: number; end: number }>('daw.add_range_marker', { name, start_samples: startSamples, end_samples: endSamples }),

    addCue: (name: string, position?: number) =>
      callEngine<{ ok: boolean; name: string; position: number }>('daw.add_cue_marker', { name, position }),

    getAll: () =>
      callEngine<{ markers: MarkerInfo[] }>('daw.get_markers'),

    getAllDetailed: () =>
      callEngine<{ markers: Array<{ id: string; name: string; start_samples: number; end_samples: number; is_mark: boolean; is_range: boolean; is_cd_marker: boolean; locked: boolean }>; count: number }>('daw.get_all_markers'),

    remove: (name: string) =>
      callEngine<{ success: boolean }>('daw.remove_marker', { name }),

    removeById: (locationId: string) =>
      callEngine<{ success: boolean }>('daw.remove_location_marker', { location_id: locationId }),

    update: (locationId: string, name?: string, positionSamples?: number, endSamples?: number) =>
      callEngine<{ success: boolean }>('daw.update_marker', { location_id: locationId, name, position_samples: positionSamples, end_samples: endSamples }),

    rename: (name: string, newName: string) =>
      callEngine<{ ok: boolean }>('daw.rename_marker', { name, new_name: newName }),

    move: (name: string, positionSamples: number) =>
      callEngine<{ ok: boolean }>('daw.move_marker', { name, position_samples: positionSamples }),

    gotoNext: () =>
      callEngine('daw.goto_next_marker'),
  },

  // =========================================================================
  // Tempo & Time Signature
  // =========================================================================
  tempo: {
    set: (bpm: number) =>
      callEngine<{ success: boolean; bpm: number }>('daw.set_tempo', { bpm }),

    setTimeSignature: (numerator: number, denominator: number) =>
      callEngine<{ success: boolean; numerator: number; denominator: number }>('daw.set_time_signature', { numerator, denominator }),

    addChange: (bpm: number, noteType?: number, positionSamples?: number, bar?: number, beat?: number, ticks?: number) =>
      callEngine<{ ok: boolean; bpm: number; note_type: number }>('daw.add_tempo_change', { bpm, note_type: noteType, position_samples: positionSamples, bar, beat, ticks }),

    removeChange: (positionSamples: number) =>
      callEngine<{ ok: boolean }>('daw.remove_tempo_change', { position_samples: positionSamples }),

    addRamp: (startBpm: number, endBpm: number, startPositionSamples: number, endPositionSamples: number) =>
      callEngine<{ ok: boolean; start_bpm: number; end_bpm: number }>('daw.add_tempo_ramp', { start_bpm: startBpm, end_bpm: endBpm, start_position_samples: startPositionSamples, end_position_samples: endPositionSamples }),

    addTimeSignatureChange: (numerator: number, denominator: number, positionSamples?: number, bar?: number) =>
      callEngine<{ ok: boolean; numerator: number; denominator: number }>('daw.add_time_signature_change', { numerator, denominator, position_samples: positionSamples, bar }),

    getMap: () =>
      callEngine<{ tempos: Array<{ bpm: number; note_type: number; bar: number; beat: number; tick: number }>; meters: Array<{ divisions_per_bar: number; note_value: number; bar: number; beat: number; tick: number }>; tempo_count: number; meter_count: number }>('daw.get_tempo_map'),

    getAt: (position?: number) =>
      callEngine<{ bpm: number; position: number; bar: number; beat: number; bbt_string: string }>('daw.get_tempo_at', { position }),

    // Time conversion
    positionToBarsBeats: (positionSamples: number) =>
      callEngine<{ bars: number; beats: number; ticks: number; bbt_string: string; position_samples: number }>('daw.position_to_bars_beats', { position_samples: positionSamples }),

    barsBeatsToPosition: (bars: number, beats?: number, ticks?: number) =>
      callEngine<{ position_samples: number; bars: number; beats: number; ticks: number }>('daw.bars_beats_to_position', { bars, beats, ticks }),

    samplesToBeats: (samples: number) =>
      callEngine<{ samples: number; beats: number; bar: number; beat: number; tick: number; bbt_string: string }>('daw.samples_to_beats', { samples }),

    beatsToSamples: (beats: number) =>
      callEngine<{ samples: number; beats: number }>('daw.beats_to_samples', { beats }),

    getPositionInfo: () =>
      callEngine<{ samples: number; beats: number; bar: number; beat: number; tick: number; bbt_string: string; seconds: number; tempo_bpm: number; sample_rate: number }>('daw.get_position_info'),
  },

  // =========================================================================
  // Routing & I/O
  // =========================================================================
  routing: {
    setTrackInput: (trackId: string, port: string) =>
      callEngine<{ success: boolean }>('daw.set_track_input', { track_id: trackId, port }),

    setTrackOutput: (trackId: string, port: string) =>
      callEngine<{ success: boolean }>('daw.set_track_output', { track_id: trackId, port }),

    getTrackIo: (trackId: string) =>
      callEngine<{ inputs: Array<{ name: string; connections: string[] }>; outputs: Array<{ name: string; connections: string[] }> }>('daw.get_track_io', { track_id: trackId }),

    connectTrackInput: (trackId: string, sourcePort: string, channel?: number) =>
      callEngine<{ success: boolean }>('daw.connect_track_input', { track_id: trackId, source_port: sourcePort, channel }),

    disconnectTrackInput: (trackId: string, channel?: number) =>
      callEngine<{ success: boolean }>('daw.disconnect_track_input', { track_id: trackId, channel }),

    connectTrackOutput: (trackId: string, destPort: string, channel?: number) =>
      callEngine<{ success: boolean }>('daw.connect_track_output', { track_id: trackId, dest_port: destPort, channel }),

    connectPorts: (sourcePort: string, destPort: string) =>
      callEngine<{ ok: boolean }>('daw.connect_ports', { source_port: sourcePort, dest_port: destPort }),

    disconnectPorts: (sourcePort: string, destPort: string) =>
      callEngine<{ ok: boolean }>('daw.disconnect_ports', { source_port: sourcePort, dest_port: destPort }),

    getAvailableAudioPorts: (input?: boolean) =>
      callEngine<{ ports: string[]; count: number }>('daw.get_available_audio_ports', { input }),

    getAvailablePorts: (type?: string) =>
      callEngine<{ audio_inputs: string[]; audio_outputs: string[]; midi_inputs: string[]; midi_outputs: string[] }>('daw.get_available_ports', { type }),

    getMidiPorts: () =>
      callEngine<{ ports: Array<{ name: string; direction: string }>; count: number }>('daw.get_midi_ports'),

    getConnectionMatrix: () =>
      callEngine<{ routes: Array<{ id: string; name: string; output_connections: string[]; input_connections: string[] }>; count: number }>('daw.get_connection_matrix'),

    getMasterBusInfo: () =>
      callEngine<{ id: string; name: string; active: boolean; meter_point: string; gain: number; gain_db: number; input_channels: number; output_channels: number; signal_latency: number }>('daw.get_master_bus_info'),

    setMeterPoint: (trackId: string, meterPoint: string) =>
      callEngine<{ ok: boolean; meter_point: string }>('daw.set_route_meter_point', { track_id: trackId, meter_point: meterPoint }),
  },

  // =========================================================================
  // Sends
  // =========================================================================
  send: {
    add: (trackId: string, targetBusId: string) =>
      callEngine<{ success: boolean; send_id: string }>('daw.add_send', { track_id: trackId, target_bus_id: targetBusId }),

    setLevel: (trackId: string, sendIndex: number, gainDb: number) =>
      callEngine<{ ok: boolean; track_id: string; send_index: number; gain_db: number }>('daw.set_send_level', { track_id: trackId, send_index: sendIndex, gain_db: gainDb }),

    setEnable: (trackId: string, sendIndex: number, enabled: boolean) =>
      callEngine<{ ok: boolean }>('daw.set_send_enable', { track_id: trackId, send_index: sendIndex, enabled }),

    getAll: (trackId: string) =>
      callEngine<{ sends: SendInfo[]; count: number }>('daw.get_sends', { track_id: trackId }),

    getPreFader: (trackId: string, sendIndex: number) =>
      callEngine<{ track_id: string; send_index: number; pre_fader: boolean }>('daw.send.get_pre_fader', { track_id: trackId, send_index: sendIndex }),

    setPreFader: (trackId: string, sendIndex: number, preFader: boolean) =>
      callEngine<{ status: string; pre_fader: boolean }>('daw.send.set_pre_fader', { track_id: trackId, send_index: sendIndex, pre_fader: preFader }),

    getTarget: (trackId: string, sendIndex: number) =>
      callEngine<{ track_id: string; send_index: number; target_id: string; target_name: string }>('daw.send.get_target', { track_id: trackId, send_index: sendIndex }),

    getAllDetails: (trackId: string) =>
      callEngine<{ track_id: string; sends: Array<{ index: number; name: string; id: string; enabled: boolean; role: string; level_db: number; pre_fader: boolean; target_id?: string; target_name?: string }>; count: number }>('daw.send.get_all_details', { track_id: trackId }),

    createAux: (trackId: string, busId: string, preFader?: boolean) =>
      callEngine<{ status: string; track_id: string; bus_id: string; pre_fader: boolean }>('daw.send.create_aux', { track_id: trackId, bus_id: busId, pre_fader: preFader }),

    getLevelDb: (trackId: string, sendIndex: number) =>
      callEngine<{ track_id: string; send_index: number; level_db: number }>('daw.send.get_level_db', { track_id: trackId, send_index: sendIndex }),

    setLevelDb: (trackId: string, sendIndex: number, levelDb: number) =>
      callEngine<{ status: string; level_db: number }>('daw.send.set_level_db', { track_id: trackId, send_index: sendIndex, level_db: levelDb }),

    setPan: (trackId: string, sendIndex: number, pan: number) =>
      callEngine<{ status: string; send_index: number; pan: number }>('daw.send.set_pan', { track_id: trackId, send_index: sendIndex, pan }),
  },

  // =========================================================================
  // Groups & VCA
  // =========================================================================
  group: {
    create: (name: string) =>
      callEngine<{ success: boolean; group_id: string; name: string }>('daw.create_route_group', { name }),

    addTrack: (trackId: string, groupName: string) =>
      callEngine<{ success: boolean }>('daw.add_track_to_group', { track_id: trackId, group_name: groupName }),

    removeTrack: (trackId: string, groupName: string) =>
      callEngine<{ ok: boolean }>('daw.remove_track_from_group', { track_id: trackId, group_name: groupName }),

    getAll: () =>
      callEngine<{ groups: Array<{ name: string; active: boolean; members: Array<{ id: string; name: string }> }> }>('daw.get_groups'),

    getDetailed: () =>
      callEngine<{ groups: Array<{ id: string; name: string; active: boolean; gain: boolean; mute: boolean; solo: boolean; member_count: number }>; count: number }>('daw.get_route_groups'),

    delete: (groupName: string) =>
      callEngine<{ success: boolean }>('daw.delete_route_group', { group_name: groupName }),

    setActive: (groupName: string, active: boolean) =>
      callEngine<{ success: boolean }>('daw.set_group_active', { group_name: groupName, active }),

    setProperties: (groupName: string, props: { gain?: boolean; mute?: boolean; solo?: boolean; active?: boolean; relative?: boolean }) =>
      callEngine<{ ok: boolean }>('daw.set_group_properties', { group_name: groupName, ...props }),
  },

  vca: {
    create: (name?: string, count?: number) =>
      callEngine<{ vcas: Array<{ id: string; name: string; number: number }>; count: number }>('daw.create_vca', { name, count }),

    getAll: () =>
      callEngine<{ vcas: Array<{ id: string; name: string; number: number }>; count: number }>('daw.get_vcas'),

    assignTrack: (trackId: string, vcaName: string) =>
      callEngine<{ success: boolean }>('daw.assign_track_to_vca', { track_id: trackId, vca_name: vcaName }),

    unassignTrack: (trackId: string, vcaName: string) =>
      callEngine<{ success: boolean }>('daw.unassign_track_from_vca', { track_id: trackId, vca_name: vcaName }),

    setGain: (vcaName: string, gainDb: number) =>
      callEngine<{ success: boolean }>('daw.set_vca_gain', { vca_name: vcaName, gain_db: gainDb }),

    setMute: (vcaName: string, muted: boolean) =>
      callEngine<{ success: boolean }>('daw.set_vca_mute', { vca_name: vcaName, muted }),

    setSolo: (vcaName: string, soloed: boolean) =>
      callEngine<{ success: boolean }>('daw.set_vca_solo', { vca_name: vcaName, soloed }),

    delete: (vcaName: string) =>
      callEngine<{ success: boolean }>('daw.delete_vca', { vca_name: vcaName }),
  },

  // =========================================================================
  // Selection
  // =========================================================================
  selection: {
    selectTrack: (trackId: string, add?: boolean) =>
      callEngine<{ ok: boolean }>('daw.select_track', { track_id: trackId, add }),

    deselectAllTracks: () =>
      callEngine<{ ok: boolean }>('daw.deselect_all_tracks'),

    getSelectedTracks: () =>
      callEngine<{ tracks: Array<{ id: string; name: string }>; count: number }>('daw.get_selected_tracks'),

    selectAllTracks: () =>
      callEngine<{ ok: boolean; count: number }>('daw.select_all_tracks'),

    setLoopFromRegion: (trackId: string, regionId: string) =>
      callEngine<{ success: boolean }>('daw.set_loop_from_region', { track_id: trackId, region_id: regionId }),

    setPunchFromRegion: (trackId: string, regionId: string) =>
      callEngine<{ success: boolean }>('daw.set_punch_from_region', { track_id: trackId, region_id: regionId }),

    insertSilence: (positionSamples: number, durationSamples: number) =>
      callEngine<{ success: boolean }>('daw.insert_silence', { position_samples: positionSamples, duration_samples: durationSamples }),

    removeTimeRipple: (startSamples: number, endSamples: number) =>
      callEngine<{ success: boolean }>('daw.remove_time_ripple', { start_samples: startSamples, end_samples: endSamples }),

    getSelectionBounds: () =>
      callEngine<{ start: number; end: number; has_selection: boolean }>('daw.get_selection_bounds'),
  },

  // =========================================================================
  // Arrangement (Sections)
  // =========================================================================
  arrangement: {
    insertTime: (positionSamples: number, durationSamples: number) =>
      callEngine<{ ok: boolean; position: number; duration: number }>('daw.insert_time', { position_samples: positionSamples, duration_samples: durationSamples }),

    removeTime: (positionSamples: number, durationSamples: number) =>
      callEngine<{ ok: boolean; position: number; duration: number }>('daw.remove_time', { position_samples: positionSamples, duration_samples: durationSamples }),

    cutSection: (startSamples: number, endSamples: number, pastePositionSamples?: number) =>
      callEngine<{ ok: boolean; start: number; end: number; paste_position: number }>('daw.cut_section', { start_samples: startSamples, end_samples: endSamples, paste_position_samples: pastePositionSamples }),

    copySection: (startSamples: number, endSamples: number, pastePositionSamples: number) =>
      callEngine<{ ok: boolean; start: number; end: number; paste_position: number }>('daw.copy_section', { start_samples: startSamples, end_samples: endSamples, paste_position_samples: pastePositionSamples }),

    deleteSection: (startSamples: number, endSamples: number) =>
      callEngine<{ ok: boolean; start: number; end: number }>('daw.delete_section', { start_samples: startSamples, end_samples: endSamples }),

    insertSection: (positionSamples: number, durationSamples: number) =>
      callEngine<{ ok: boolean; position: number; duration: number }>('daw.insert_section', { position_samples: positionSamples, duration_samples: durationSamples }),
  },

  // =========================================================================
  // Export & Import
  // =========================================================================
  export: {
    getFormats: () =>
      callEngine<{ formats: Array<{ id: string; name: string; extension: string }> }>('daw.get_export_formats'),

    importAudio: (filepath: string, trackId?: string, positionSamples?: number) =>
      callEngine<{ ok: boolean; region_id: string; name: string; length: number; placed_on_track?: string; position?: number }>('daw.import_audio', { filepath, track_id: trackId, position_samples: positionSamples }),

    importMidi: (filepath: string, trackId?: string) =>
      callEngine('daw.import_midi', { filepath, track_id: trackId }),

    getSourceFiles: () =>
      callEngine<{ sources: Array<{ id: string; name: string; length: number; writable: boolean }>; count: number }>('daw.get_source_files'),

    // Export system (Tier 3)
    setFormatType: (type: string) =>
      callEngine<{ ok: boolean }>('daw.export.set_format_type', { type }),

    setSampleRate: (sampleRate: number) =>
      callEngine<{ ok: boolean }>('daw.export.set_sample_rate', { sample_rate: sampleRate }),

    setBitDepth: (bitDepth: number) =>
      callEngine<{ ok: boolean }>('daw.export.set_bit_depth', { bit_depth: bitDepth }),

    setNormalize: (enabled: boolean) =>
      callEngine<{ ok: boolean }>('daw.export.set_normalize', { enabled }),

    setNormalizeLufs: (lufs: number) =>
      callEngine<{ ok: boolean }>('daw.export.set_normalize_lufs', { lufs }),

    setNormalizeLoudness: (enabled: boolean) =>
      callEngine<{ ok: boolean }>('daw.export.set_normalize_loudness', { enabled }),

    setFilenameFolder: (folder: string) =>
      callEngine<{ ok: boolean }>('daw.export.set_filename_folder', { folder }),

    setFilenameLabel: (label: string) =>
      callEngine<{ ok: boolean }>('daw.export.set_filename_label', { label }),

    prepare: () =>
      callEngine('daw.export.prepare'),

    execute: () =>
      callEngine('daw.export.execute'),

    abort: () =>
      callEngine('daw.export.abort'),

    savePreset: (name: string) =>
      callEngine('daw.export.save_preset', { name }),

    loadPreset: (name: string) =>
      callEngine('daw.export.load_preset', { name }),
  },

  // =========================================================================
  // Snapshots & Templates
  // =========================================================================
  snapshot: {
    save: (name: string) =>
      callEngine<{ ok: boolean; snapshot: string }>('daw.save_snapshot', { name }),

    getAll: () =>
      callEngine<{ current_snapshot: string; session_name: string; session_path: string }>('daw.get_snapshots'),

    restore: (name: string) =>
      callEngine<{ ok: boolean; snapshot: string }>('daw.restore_snapshot', { name }),

    saveTemplate: (name: string, description?: string) =>
      callEngine<{ ok: boolean; name: string }>('daw.save_template', { name, description }),
  },

  // =========================================================================
  // Navigation & Playhead
  // =========================================================================
  navigation: {
    setPlayheadPosition: (positionSamples: number) =>
      callEngine<{ success: boolean; position: number }>('daw.set_playhead_position', { position_samples: positionSamples }),

    getPlayheadPosition: () =>
      callEngine<{ position_samples: number; position_seconds: number; sample_rate: number }>('daw.get_playhead_position'),

    nudgeForward: (amountSamples?: number) =>
      callEngine<{ success: boolean; position: number }>('daw.nudge_playhead_forward', { amount_samples: amountSamples }),

    nudgeBackward: (amountSamples?: number) =>
      callEngine<{ success: boolean; position: number }>('daw.nudge_playhead_backward', { amount_samples: amountSamples }),

    gotoStart: () =>
      callEngine<{ success: boolean; position: number }>('daw.goto_session_start'),

    gotoEnd: () =>
      callEngine<{ success: boolean; position: number }>('daw.goto_session_end'),

    gotoNextRegionBoundary: () =>
      callEngine<{ success: boolean; position: number }>('daw.goto_next_region_boundary'),

    gotoPrevRegionBoundary: () =>
      callEngine<{ success: boolean; position: number }>('daw.goto_prev_region_boundary'),
  },

  // =========================================================================
  // Metronome
  // =========================================================================
  metronome: {
    toggle: () =>
      callEngine<{ ok: boolean; enabled: boolean }>('daw.toggle_metronome'),

    setVolume: (gain: number) =>
      callEngine<{ ok: boolean; gain: number }>('daw.set_metronome_volume', { gain }),

    toggleCountIn: () =>
      callEngine<{ ok: boolean; enabled: boolean }>('daw.toggle_count_in'),

    getState: () =>
      callEngine<{ enabled: boolean; gain: number; count_in: boolean }>('daw.get_metronome_state'),

    setEnabled: (enabled: boolean) =>
      callEngine<{ success: boolean; enabled: boolean }>('daw.set_click_enabled', { enabled }),

    setGain: (gain: number) =>
      callEngine<{ success: boolean }>('daw.set_click_gain', { gain }),

    getFullState: () =>
      callEngine<{ gain: number; gain_db: number; record_only: boolean; use_emphasis: boolean }>('daw.click.get_full_state'),

    setRecordOnly: (recordOnly: boolean) =>
      callEngine<{ status: string; record_only: boolean }>('daw.click.set_record_only', { record_only: recordOnly }),
  },

  // =========================================================================
  // Playlists
  // =========================================================================
  playlist: {
    setTrackPlaylist: (trackId: string, playlistName: string) =>
      callEngine<{ ok: boolean; playlist_name: string }>('daw.set_track_playlist', { track_id: trackId, playlist_name: playlistName }),

    getTrackPlaylists: (trackId: string) =>
      callEngine<{ playlists: Array<{ name: string; id: string; region_count: number; is_current: boolean }>; count: number }>('daw.get_track_playlists', { track_id: trackId }),

    newTrackPlaylist: (trackId: string) =>
      callEngine<{ ok: boolean; playlist_name: string }>('daw.new_track_playlist', { track_id: trackId }),

    copyTrackPlaylist: (trackId: string) =>
      callEngine<{ ok: boolean; playlist_name: string }>('daw.copy_track_playlist', { track_id: trackId }),

    getAll: () =>
      callEngine<{ playlists: Array<{ id: string; name: string; region_count: number; hidden: boolean }>; count: number }>('daw.playlist.get_all'),

    clear: (trackId: string) =>
      callEngine<{ ok: boolean; regions_removed: number }>('daw.clear_playlist', { track_id: trackId }),

    removeGaps: (trackId: string, threshold?: number, leaveGap?: number) =>
      callEngine<{ ok: boolean; gaps_removed: number }>('daw.playlist.remove_gaps', { track_id: trackId, threshold, leave_gap: leaveGap }),
  },

  // =========================================================================
  // Audio Device & Backend
  // =========================================================================
  device: {
    getBufferSize: () =>
      callEngine<{ buffer_size: number; sample_rate: number }>('daw.get_buffer_size'),

    setBufferSize: (bufferSize: number) =>
      callEngine<{ success: boolean; buffer_size: number }>('daw.set_buffer_size', { buffer_size: bufferSize }),

    getAvailableBufferSizes: () =>
      callEngine<{ sizes: number[] }>('daw.get_available_buffer_sizes'),

    getAvailableSampleRates: () =>
      callEngine<{ rates: number[] }>('daw.get_available_sample_rates'),

    getDeviceName: () =>
      callEngine<{ device_name: string; backend_name: string }>('daw.get_device_name'),

    getEngineState: () =>
      callEngine<{ running: boolean; sample_rate: number; buffer_size: number; dsp_load: number; freewheeling: boolean; backend_name: string; xrun_count: number; device_name: string; is_realtime: boolean }>('daw.get_engine_state_detailed'),

    getAvailableBackends: () =>
      callEngine<{ backends: string[]; count: number; current: string }>('daw.get_available_backends'),

    getDspLoad: () =>
      callEngine<{ dsp_load_percent: number }>('daw.get_dsp_load_percent'),

    resetXrunCount: () =>
      callEngine<{ ok: boolean; xrun_count: number }>('daw.reset_xrun_count'),
  },

  // =========================================================================
  // Monitor Section
  // =========================================================================
  monitor: {
    getState: () =>
      callEngine('daw.monitor.get_state'),

    setDim: (enabled: boolean) =>
      callEngine<{ success: boolean; dim: boolean }>('daw.monitor.set_dim', { enabled }),

    setMono: (enabled: boolean) =>
      callEngine<{ success: boolean; mono: boolean }>('daw.monitor.set_mono', { enabled }),

    setMute: (enabled: boolean) =>
      callEngine<{ success: boolean }>('daw.monitor.set_mute', { enabled }),

    setCutAll: (cut: boolean) =>
      callEngine<{ ok: boolean; cut_all: boolean }>('daw.monitor.set_cut_all', { cut }),

    setDimAll: (dim: boolean) =>
      callEngine<{ ok: boolean; dim_all: boolean }>('daw.monitor.set_dim_all', { dim }),

    setDimLevel: (level: number) =>
      callEngine<{ ok: boolean; dim_level: number }>('daw.monitor.set_dim_level', { level }),

    setSoloBoostLevel: (level: number) =>
      callEngine<{ ok: boolean; solo_boost_level: number }>('daw.monitor.set_solo_boost_level', { level }),

    setChannelCut: (channel: number, cut: boolean) =>
      callEngine<{ ok: boolean; channel: number; cut: boolean }>('daw.monitor.set_channel_cut', { channel, cut }),

    setChannelDim: (channel: number, dim: boolean) =>
      callEngine<{ ok: boolean; channel: number; dim: boolean }>('daw.monitor.set_channel_dim', { channel, dim }),

    setChannelPolarity: (channel: number, inverted: boolean) =>
      callEngine<{ ok: boolean; channel: number; inverted: boolean }>('daw.monitor.set_channel_polarity', { channel, inverted }),

    getFullState: () =>
      callEngine<{ exists: boolean; monitor_active: boolean; cut_all: boolean; dim_all: boolean; mono: boolean; dim_level: number; solo_boost_level: number; channels: Array<{ index: number; cut: boolean; dim: boolean; inverted: boolean; soloed: boolean }>; channel_count: number }>('daw.monitor.get_full_state'),
  },

  // =========================================================================
  // Undo / Redo
  // =========================================================================
  undo: {
    undo: (count?: number) =>
      callEngine<{ success: boolean; next_undo: string }>('daw.undo', { count }),

    redo: (count?: number) =>
      callEngine<{ success: boolean; next_redo: string }>('daw.redo', { count }),

    getHistory: (maxItems?: number) =>
      callEngine<{ undo_depth: number; next_undo: string; undo: Array<{ label: string }> }>('daw.get_undo_history', { max_items: maxItems }),

    getUndoDepth: () =>
      callEngine<{ undo_depth: number }>('daw.get_undo_depth'),

    getRedoDepth: () =>
      callEngine<{ redo_depth: number }>('daw.get_redo_depth'),

    getNextUndoLabel: () =>
      callEngine<{ label: string; has_undo: boolean }>('daw.get_next_undo_label'),

    getNextRedoLabel: () =>
      callEngine<{ label: string; has_redo: boolean }>('daw.get_next_redo_label'),

    beginGroup: (name: string) =>
      callEngine<{ ok: boolean; name: string }>('daw.begin_undo_group', { name }),

    endGroup: () =>
      callEngine<{ ok: boolean }>('daw.end_undo_group'),

    clearHistory: () =>
      callEngine<{ ok: boolean }>('daw.clear_undo_history'),
  },

  // =========================================================================
  // Batch & Transactions
  // =========================================================================
  batch: {
    execute: (commands: Array<{ method: string; params: Record<string, unknown> }>) =>
      callEngine<{ results: Array<{ method: string; result?: unknown; error?: unknown }>; count: number }>('daw.execute_batch', { commands }),

    beginTransaction: (name: string) =>
      callEngine<{ ok: boolean; transaction_name: string }>('daw.begin_transaction', { name }),

    commitTransaction: () =>
      callEngine<{ ok: boolean }>('daw.commit_transaction'),

    rollbackTransaction: () =>
      callEngine<{ ok: boolean }>('daw.rollback_transaction'),

    executeAtomic: (name: string, commands: Array<{ method: string; params: Record<string, unknown> }>) =>
      callEngine<{ ok: boolean; results: Array<{ method: string; result: unknown }>; undo_label: string }>('daw.execute_atomic', { name, commands }),

    executeWithUndo: (method: string, params: Record<string, unknown>, undoLabel: string) =>
      callEngine('daw.execute_with_undo', { method, params, undo_label: undoLabel }),

    checkpoint: (name?: string) =>
      callEngine<{ ok: boolean; checkpoint_name: string; timestamp: string }>('daw.checkpoint', { name }),

    restoreCheckpoint: (checkpointName: string) =>
      callEngine<{ ok: boolean; restored: string }>('daw.restore_checkpoint', { checkpoint_name: checkpointName }),

    getCheckpoints: () =>
      callEngine<{ checkpoints: Array<{ name: string; timestamp: string }>; count: number }>('daw.get_checkpoints'),
  },

  // =========================================================================
  // Waveform Data (for arrangement view)
  // =========================================================================
  waveform: {
    getOverview: (trackId: string, regionId: string, widthPixels?: number) =>
      callEngine<{ channels: Array<{ channel: number; min: number[]; max: number[]; n_peaks: number }>; n_channels: number; width_pixels: number; length_samples: number }>('daw.get_waveform_overview', { track_id: trackId, region_id: regionId, width_pixels: widthPixels }),

    getDetail: (trackId: string, regionId: string, endSample: number, startSample?: number, widthPixels?: number) =>
      callEngine('daw.get_waveform_detail', { track_id: trackId, region_id: regionId, end_sample: endSample, start_sample: startSample, width_pixels: widthPixels }),

    getPeaksPerPixel: (trackId: string, regionId: string, nSamples: number, nPeaks: number, startSample?: number) =>
      callEngine('daw.get_waveform_peaks_per_pixel', { track_id: trackId, region_id: regionId, n_samples: nSamples, n_peaks: nPeaks, start_sample: startSample }),

    getMinimap: (peaksPerRegion?: number) =>
      callEngine<{ tracks: Array<{ id: string; name: string; regions: Array<{ id: string; name: string; start_sample: number; length_samples: number }> }>; count: number }>('daw.get_minimap_data', { peaks_per_region: peaksPerRegion }),

    getRegionOverview: (trackId: string, regionId: string, widthPixels?: number) =>
      callEngine('daw.get_region_overview_data', { track_id: trackId, region_id: regionId, width_pixels: widthPixels }),

    getCacheStatus: (trackId: string, regionId: string) =>
      callEngine<{ cache_ready: boolean; n_channels: number }>('daw.get_region_waveform_cache_status', { track_id: trackId, region_id: regionId }),

    buildCache: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean }>('daw.build_region_waveform_cache', { track_id: trackId, region_id: regionId }),
  },

  // =========================================================================
  // Trigger / Clip Launcher
  // =========================================================================
  trigger: {
    getTriggerboxInfo: (trackId: string) =>
      callEngine<{ track_id: string; data_type: string; num_slots: number; empty: boolean; currently_playing: number }>('daw.trigger.get_triggerbox_info', { track_id: trackId }),

    getAllSlots: () =>
      callEngine('daw.trigger.get_all_slots'),

    getSlotInfo: (trackId: string, slotIndex: number) =>
      callEngine<{ track_id: string; slot_index: number; name: string; state: string; active: boolean; playable: boolean; launch_style: string; gain: number; color: number; stretch_mode: string; region_id: string; region_name: string }>('daw.trigger.get_slot_info', { track_id: trackId, slot_index: slotIndex }),

    bang: (trackId: string, slotIndex: number, velocity?: number) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number }>('daw.trigger.bang', { track_id: trackId, slot_index: slotIndex, velocity }),

    unbang: (trackId: string, slotIndex: number) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number }>('daw.trigger.unbang', { track_id: trackId, slot_index: slotIndex }),

    stopAll: () =>
      callEngine<{ ok: boolean; stopped: number }>('daw.trigger.stop_all'),

    stopTrack: (trackId: string) =>
      callEngine<{ ok: boolean; track_id: string }>('daw.trigger.stop_track', { track_id: trackId }),

    setRegion: (trackId: string, slotIndex: number, regionId: string) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number; region_name: string }>('daw.trigger.set_region', { track_id: trackId, slot_index: slotIndex, region_id: regionId }),

    clearSlot: (trackId: string, slotIndex: number) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number }>('daw.trigger.clear_slot', { track_id: trackId, slot_index: slotIndex }),

    setLaunchStyle: (trackId: string, slotIndex: number, style: string) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number; style: string }>('daw.trigger.set_launch_style', { track_id: trackId, slot_index: slotIndex, style }),

    setGain: (trackId: string, slotIndex: number, gain: number) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number; gain: number }>('daw.trigger.set_gain', { track_id: trackId, slot_index: slotIndex, gain }),

    setColor: (trackId: string, slotIndex: number, color: number) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number; color: number }>('daw.trigger.set_color', { track_id: trackId, slot_index: slotIndex, color }),

    setName: (trackId: string, slotIndex: number, name: string) =>
      callEngine<{ ok: boolean; track_id: string; slot_index: number; name: string }>('daw.trigger.set_name', { track_id: trackId, slot_index: slotIndex, name }),

    setFollowAction: (trackId: string, slotIndex: number, action: string, which?: number, probability?: number) =>
      callEngine<{ ok: boolean }>('daw.trigger.set_follow_action', { track_id: trackId, slot_index: slotIndex, action, which, probability }),

    setStretchMode: (trackId: string, slotIndex: number, mode: string) =>
      callEngine<{ ok: boolean }>('daw.trigger.set_stretch_mode', { track_id: trackId, slot_index: slotIndex, mode }),

    getActiveTriggers: () =>
      callEngine<{ active_triggers: Array<{ track_id: string; track_name: string; slot_index: number; name: string; state: string; position: number }>; count: number }>('daw.trigger.get_active_triggers'),
  },

  // =========================================================================
  // Mixer Scenes
  // =========================================================================
  mixerScene: {
    list: () =>
      callEngine<{ scenes: Array<{ index: number; name: string; empty: boolean; stored: boolean }>; count: number }>('daw.mixer_scene.list'),

    store: (index: number) =>
      callEngine<{ ok: boolean; index: number }>('daw.mixer_scene.store', { index }),

    recall: (index: number) =>
      callEngine<{ ok: boolean; index: number; applied: boolean }>('daw.mixer_scene.recall', { index }),

    clear: (index: number) =>
      callEngine<{ ok: boolean; index: number }>('daw.mixer_scene.clear', { index }),

    rename: (index: number, name: string) =>
      callEngine<{ ok: boolean; index: number; name: string }>('daw.mixer_scene.rename', { index, name }),

    getInfo: (index: number) =>
      callEngine<{ index: number; name: string; empty: boolean; stored: boolean }>('daw.mixer_scene.get_info', { index }),

    getCount: () =>
      callEngine<{ count: number; stored_count: number }>('daw.mixer_scene.get_count'),

    applyToRoutes: (index: number, routeIds: string[]) =>
      callEngine<{ ok: boolean; index: number; applied: boolean; route_count: number }>('daw.mixer_scene.apply_to_routes', { index, route_ids: routeIds }),
  },

  // =========================================================================
  // Aux Bus Management
  // =========================================================================
  aux: {
    createBus: (name: string, channels?: number) =>
      callEngine<{ status: string; bus_id: string; name: string; channels: number }>('daw.aux.create_bus', { name, channels }),

    deleteBus: (busId: string) =>
      callEngine<{ status: string }>('daw.aux.delete_bus', { bus_id: busId }),

    listBuses: () =>
      callEngine<{ buses: Array<{ id: string; name: string; inputs: number; outputs: number; muted: boolean; soloed: boolean }>; count: number }>('daw.aux.list_buses'),

    getSendsTo: (busId: string) =>
      callEngine<{ bus_id: string; bus_name: string; senders: Array<{ track_id: string; track_name: string; send_index: number; level_db: number; enabled: boolean }>; count: number }>('daw.aux.get_sends_to', { bus_id: busId }),

    addSendFrom: (busId: string, trackId: string, preFader?: boolean) =>
      callEngine<{ status: string; bus_id: string; track_id: string }>('daw.aux.add_send_from', { bus_id: busId, track_id: trackId, pre_fader: preFader }),

    removeSendFrom: (busId: string, trackId: string) =>
      callEngine<{ status: string }>('daw.aux.remove_send_from', { bus_id: busId, track_id: trackId }),

    getBusInfo: (busId: string) =>
      callEngine<{ id: string; name: string; inputs: number; outputs: number; muted: boolean; soloed: boolean; gain_db: number; send_count: number; plugin_count: number }>('daw.aux.get_bus_info', { bus_id: busId }),

    setBusGain: (busId: string, gainDb: number) =>
      callEngine<{ status: string; gain_db: number }>('daw.aux.set_bus_gain', { bus_id: busId, gain_db: gainDb }),

    setBusMute: (busId: string, mute: boolean) =>
      callEngine<{ status: string; mute: boolean }>('daw.aux.set_bus_mute', { bus_id: busId, mute }),

    setBusSolo: (busId: string, solo: boolean) =>
      callEngine<{ status: string; solo: boolean }>('daw.aux.set_bus_solo', { bus_id: busId, solo }),
  },

  // =========================================================================
  // Sidechain Routing
  // =========================================================================
  sidechain: {
    add: (trackId: string, processorId: string, nAudio?: number, nMidi?: number) =>
      callEngine<{ success: boolean; has_sidechain: boolean }>('daw.sidechain.add', { track_id: trackId, processor_id: processorId, n_audio: nAudio, n_midi: nMidi }),

    remove: (trackId: string, processorId: string) =>
      callEngine<{ success: boolean; has_sidechain: boolean }>('daw.sidechain.remove', { track_id: trackId, processor_id: processorId }),

    has: (trackId: string, processorId: string) =>
      callEngine<{ has_sidechain: boolean }>('daw.sidechain.has', { track_id: trackId, processor_id: processorId }),

    getInput: (trackId: string, processorId: string) =>
      callEngine<{ has_sidechain: boolean; connections: Array<{ port: string; connected_to: string[] }> }>('daw.sidechain.get_input', { track_id: trackId, processor_id: processorId }),

    connect: (trackId: string, processorId: string, sourcePort: string, portIndex?: number) =>
      callEngine<{ success: boolean }>('daw.sidechain.connect', { track_id: trackId, processor_id: processorId, source_port: sourcePort, port_index: portIndex }),

    disconnect: (trackId: string, processorId: string) =>
      callEngine<{ success: boolean; disconnected: number }>('daw.sidechain.disconnect', { track_id: trackId, processor_id: processorId }),

    getInfo: (trackId: string, processorId: string) =>
      callEngine<{ has_sidechain: boolean; n_audio: number; n_midi: number; n_total: number }>('daw.sidechain.get_info', { track_id: trackId, processor_id: processorId }),

    listAvailableSources: (trackId: string, processorId: string) =>
      callEngine<{ has_sidechain: boolean; audio_sources: string[]; midi_sources: string[]; audio_count: number; midi_count: number }>('daw.sidechain.list_available_sources', { track_id: trackId, processor_id: processorId }),
  },

  // =========================================================================
  // Edit Modes & Tools
  // =========================================================================
  editMode: {
    get: () =>
      callEngine<{ edit_mode: string }>('daw.get_edit_mode'),

    set: (mode: string) =>
      callEngine<{ ok: boolean; edit_mode: string }>('daw.set_edit_mode', { mode }),

    getRippleMode: () =>
      callEngine<{ ripple_mode: string }>('daw.editor.get_ripple_mode'),

    setRippleMode: (mode: string) =>
      callEngine<{ ok: boolean; ripple_mode: string }>('daw.editor.set_ripple_mode', { mode }),

    cycleEditMode: () =>
      callEngine<{ ok: boolean; previous: string; current: string }>('daw.editor.cycle_edit_mode'),
  },

  // =========================================================================
  // Snap & Grid
  // =========================================================================
  grid: {
    snapPosition: (position: number) =>
      callEngine<{ original_position: number; snapped_position: number; snapped_bbt: string }>('daw.snap_position_to_grid', { position }),

    getPointsInRange: (start: number, end: number) =>
      callEngine<{ grid_points: Array<{ position: number; bbt: string }>; count: number }>('daw.get_grid_points_in_range', { start, end }),

    getNearestPoint: (position: number) =>
      callEngine<{ nearest: number; nearest_bbt: string; distance: number }>('daw.get_nearest_grid_point', { position }),

    getVisibleLines: (start?: number, end?: number) =>
      callEngine<{ lines: Array<{ position: number; is_bar: boolean; bbt: string }>; count: number }>('daw.get_visible_grid_lines', { start, end }),
  },

  // =========================================================================
  // Audition
  // =========================================================================
  audition: {
    region: (trackId: string, regionId: string) =>
      callEngine<{ ok: boolean; auditioning: boolean }>('daw.audition_region', { track_id: trackId, region_id: regionId }),

    stop: () =>
      callEngine<{ ok: boolean }>('daw.stop_audition'),

    isAuditioning: () =>
      callEngine<{ auditioning: boolean }>('daw.is_auditioning'),

    setVolume: (volume: number) =>
      callEngine<{ ok: boolean; volume: number }>('daw.set_audition_volume', { volume }),

    getVolume: () =>
      callEngine<{ volume: number }>('daw.get_audition_volume'),
  },

  // =========================================================================
  // Foldback / Cue
  // =========================================================================
  foldback: {
    addBus: (name?: string, channels?: number) =>
      callEngine<{ ok: boolean; id: string; name: string; channels: number }>('daw.add_foldback_bus', { name, channels }),

    getBuses: () =>
      callEngine<{ foldback_buses: Array<{ id: string; name: string; n_inputs: number; n_outputs: number }>; count: number }>('daw.get_foldback_buses'),

    addSend: (trackId: string, foldbackBusId: string, postFader?: boolean) =>
      callEngine<{ ok: boolean; track_id: string; foldback_bus_id: string; post_fader: boolean }>('daw.add_foldback_send', { track_id: trackId, foldback_bus_id: foldbackBusId, post_fader: postFader }),
  },

  // =========================================================================
  // Loudness Analysis
  // =========================================================================
  loudness: {
    analyzeRegion: (trackId: string, regionId: string) =>
      callEngine<{ track_id: string; region_id: string; integrated_lufs: number; peak_dBFS: number; rms_dBFS: number }>('daw.analyze_region_loudness', { track_id: trackId, region_id: regionId }),

    analyzeTrack: (trackId: string) =>
      callEngine<{ track_id: string; peak_dBFS: number; rms_dBFS: number; lufs_approx: number; region_count: number }>('daw.analyze_track_loudness', { track_id: trackId }),

    normalizeRegion: (trackId: string, regionId: string, targetLufs?: number) =>
      callEngine<{ ok: boolean; target_lufs: number; measured_lufs: number; gain_adjustment_dB: number; new_scale: number }>('daw.normalize_region_loudness', { track_id: trackId, region_id: regionId, target_lufs: targetLufs }),

    getStandards: () =>
      callEngine<{ standards: Array<{ name: string; target_lufs: number; true_peak_dBTP: number; use: string }>; count: number }>('daw.get_loudness_standards'),

    getSessionTarget: () =>
      callEngine<{ target_lufs: number; standard: string }>('daw.get_session_loudness_target'),

    getRegionTruePeak: (trackId: string, regionId: string) =>
      callEngine<{ track_id: string; region_id: string; true_peak_dBTP: number; sample_peak: number }>('daw.get_region_true_peak', { track_id: trackId, region_id: regionId }),

    getRegionDynamicRange: (trackId: string, regionId: string) =>
      callEngine<{ dynamic_range_dB: number; peak_dBFS: number; rms_dBFS: number }>('daw.get_region_dynamic_range', { track_id: trackId, region_id: regionId }),

    analyzeRange: (trackId: string, start: number, end: number) =>
      callEngine<{ ok: boolean; track_id: string; start: number; end: number; rms: number; rms_dB: number; peak: number; peak_dB: number }>('daw.analyze.range', { track_id: trackId, start, end }),

    ebur128: (trackId: string, regionId?: string) =>
      callEngine<{ ok: boolean; track_id: string; region_id: string; integrated_lufs: number; loudness_range: number; true_peak_dBTP: number }>('daw.analyze.ebur128', { track_id: trackId, region_id: regionId }),
  },

  // =========================================================================
  // Pan (Extended)
  // =========================================================================
  pan: {
    getAzimuth: (trackId: string) =>
      callEngine<{ track_id: string; azimuth: number }>('daw.pan.get_azimuth', { track_id: trackId }),

    setAzimuth: (trackId: string, value: number) =>
      callEngine<{ success: boolean; track_id: string; azimuth: number }>('daw.pan.set_azimuth', { track_id: trackId, value }),

    getWidth: (trackId: string) =>
      callEngine<{ track_id: string; width: number }>('daw.pan.get_width', { track_id: trackId }),

    setWidth: (trackId: string, value: number) =>
      callEngine<{ success: boolean; track_id: string; width: number }>('daw.pan.set_width', { track_id: trackId, value }),

    getFullState: (trackId: string) =>
      callEngine<{ track_id: string; azimuth: number; elevation: number; width: number; frontback: number; has_azimuth: boolean; has_elevation: boolean; has_width: boolean; has_frontback: boolean }>('daw.pan.get_full_state', { track_id: trackId }),

    reset: (trackId: string) =>
      callEngine<{ success: boolean; track_id: string; controls_reset: number }>('daw.pan.reset', { track_id: trackId }),
  },

  // =========================================================================
  // Environment & System
  // =========================================================================
  system: {
    getVersion: () =>
      callEngine<{ program: string; revision: string; base: string }>('daw.get_dawflow_version'),

    getBuildInfo: () =>
      callEngine<{ revision: string; compiler: string; cpp_standard: string; platform: string }>('daw.get_build_info'),

    getSystemInfo: () =>
      callEngine<{ os: string; architecture: string; sample_rate: number; buffer_size: number }>('daw.get_system_info'),

    getPluginPaths: () =>
      callEngine('daw.get_plugin_paths'),

    getInstalledPluginCount: () =>
      callEngine<{ lv2: number; au: number; vst3: number; ladspa: number; lua: number; total: number }>('daw.get_installed_plugin_count'),

    getControlSurfaces: () =>
      callEngine<{ control_surfaces: Array<{ name: string; path: string; active: boolean }>; count: number }>('daw.get_control_surfaces'),
  },

  // =========================================================================
  // Range Operations
  // =========================================================================
  range: {
    getActive: () =>
      callEngine<{ loop_start?: number; loop_end?: number; loop_enabled?: boolean; punch_start?: number; punch_end?: number; session_start?: number; session_end?: number }>('daw.range.get_active'),

    set: (start: number, end: number) =>
      callEngine<{ status: string; name: string; start: number; end: number }>('daw.range.set', { start, end }),

    play: (start?: number, end?: number) =>
      callEngine<{ status: string }>('daw.range.play', { start, end }),

    bounce: (trackId: string, start: number, end: number) =>
      callEngine<{ status: string; region_name?: string; region_id?: string }>('daw.range.bounce', { track_id: trackId, start, end }),

    select: (start: number, end: number) =>
      callEngine<{ status: string; start: number; end: number }>('daw.range.select', { start, end }),

    getSelection: () =>
      callEngine<{ has_selection: boolean; start?: number; end?: number; length?: number }>('daw.range.get_selection'),

    clearSelection: () =>
      callEngine<{ status: string }>('daw.range.clear_selection'),
  },

  // =========================================================================
  // CD Markers
  // =========================================================================
  cdMarker: {
    add: (position: number, name: string, isrc?: string, performer?: string, composer?: string) =>
      callEngine<{ ok: boolean; name: string; position: number }>('daw.cd_marker.add', { position, name, isrc, performer, composer }),

    remove: (name: string) =>
      callEngine<{ ok: boolean; name: string }>('daw.cd_marker.remove', { name }),

    list: () =>
      callEngine<{ markers: Array<{ name: string; start: number; end: number; length: number }>; count: number }>('daw.cd_marker.list'),

    setInfo: (name: string, isrc?: string, performer?: string, composer?: string) =>
      callEngine<{ ok: boolean; name: string }>('daw.cd_marker.set_info', { name, isrc, performer, composer }),

    getToc: () =>
      callEngine<{ tracks: Array<{ track_number: number; name: string; start_sample: number; end_sample: number; duration_seconds: number }>; track_count: number; sample_rate: number }>('daw.cd_marker.get_toc'),

    validate: () =>
      callEngine<{ valid: boolean; track_count: number; errors: string[]; warnings: string[] }>('daw.cd_marker.validate'),
  },

  // =========================================================================
  // Internal Routing
  // =========================================================================
  internalSend: {
    add: (sourceTrackId: string, destTrackId: string, preFader?: boolean) =>
      callEngine<{ status: string; source_track_id: string; dest_track_id: string; pre_fader: boolean }>('daw.internal_send.add', { source_track_id: sourceTrackId, dest_track_id: destTrackId, pre_fader: preFader }),

    remove: (sourceTrackId: string, sendId: string) =>
      callEngine<{ status: string }>('daw.internal_send.remove', { source_track_id: sourceTrackId, send_id: sendId }),

    list: (trackId: string) =>
      callEngine<{ track_id: string; internal_sends: Array<{ index: number; id: string; name: string; active: boolean; target_id: string; target_name: string; level_db: number; role: string; pre_fader: boolean }>; count: number }>('daw.internal_send.list', { track_id: trackId }),

    setLevel: (trackId: string, sendId: string, levelDb: number) =>
      callEngine<{ status: string; level_db: number }>('daw.internal_send.set_level', { track_id: trackId, send_id: sendId, level_db: levelDb }),

    setEnable: (trackId: string, sendId: string, enabled: boolean) =>
      callEngine<{ status: string; enabled: boolean }>('daw.internal_send.set_enable', { track_id: trackId, send_id: sendId, enabled }),

    getAllRoutes: () =>
      callEngine<{ connections: Array<{ source_id: string; source_name: string; send_id: string; target_id: string; target_name: string; active: boolean; role: string; level_db: number }>; count: number }>('daw.internal_send.get_all_routes'),
  },

} as const;

// Re-export the callEngine function for advanced use cases
export { callEngine };

// Export types for consumers
export type {
  TrackInfo,
  TrackDetails,
  RegionInfo,
  MidiNote,
  PluginInfo,
  PluginDetail,
  PluginParam,
  MarkerInfo,
  AutomationPoint,
  SendInfo,
  MeterChannel,
};
