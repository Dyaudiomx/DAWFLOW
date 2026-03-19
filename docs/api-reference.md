# DAWFLOW IPC API Reference

> **385 unique commands** registered across 8 source files, 0 duplicates. All commands use JSON-RPC 2.0 over Unix domain socket IPC.
>
> **Request format:** `{"jsonrpc": "2.0", "id": 1, "method": "daw.xxx", "params": {...}}`
>
> **Response format:** `{"jsonrpc": "2.0", "id": 1, "result": {...}}` or `{"jsonrpc": "2.0", "id": 1, "error": {"code": -32603, "message": "..."}}`
>
> **Socket path:** `/tmp/dawflow-<pid>.sock`
>
> **Async commands** (marked "queued") return `{"success": true, "status": "queued"}` immediately; the operation executes on the GTK main thread.
>
> **Source files:** `dawflow_plugin_host.cc`, `dawflow_plugin_host_extended.cc`, `dawflow_commands_editing.cc`, `dawflow_commands_automation.cc`, `dawflow_commands_critical.cc`, `dawflow_commands_high.cc`, `dawflow_commands_medium.cc`, `dawflow_commands_final.cc`

---

## Table of Contents

1. [Session Management](#session-management)
2. [Transport](#transport)
3. [Recording](#recording)
4. [Track Management](#track-management)
5. [Track Properties](#track-properties)
6. [Region Editing](#region-editing)
7. [Region Properties](#region-properties)
8. [Region Audio Analysis](#region-audio-analysis)
9. [MIDI Editing (Legacy)](#midi-editing-legacy)
10. [MIDI Editing (By Note ID)](#midi-editing-by-note-id)
11. [MIDI CC & Program Changes](#midi-cc--program-changes)
12. [MIDI Transformations](#midi-transformations)
13. [Plugin Management](#plugin-management)
14. [Plugin Parameters & Presets](#plugin-parameters--presets)
15. [Plugin Search](#plugin-search)
16. [Automation](#automation)
17. [Metering](#metering)
18. [Markers & Locations](#markers--locations)
19. [Tempo & Time Signature](#tempo--time-signature)
20. [Time Conversion](#time-conversion)
21. [Routing & I/O](#routing--io)
22. [Sends](#sends)
23. [Groups & VCA](#groups--vca)
24. [Selection](#selection)
25. [Arrangement (Sections)](#arrangement-sections)
26. [Export & Import](#export--import)
27. [Snapshots & Templates](#snapshots--templates)
28. [Navigation & Playhead](#navigation--playhead)
29. [View & Zoom](#view--zoom)
30. [Metronome](#metronome)
31. [Playlists](#playlists)
32. [Batch & Utilities](#batch--utilities)
33. [Events (DAW to Plugin)](#events-daw-to-plugin)

---

## Session Management

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_session_info` | none | `{name, sample_rate, playing, recording, position, dirty}` | Get basic session state |
| `daw.get_session_details` | none | `{name, path, sample_rate, block_size, dirty, playing, recording, position, loop_enabled, track_count, bus_count, undo_depth, redo_depth}` | Comprehensive session info |
| `daw.get_session_properties` | none | `{name, path, sample_rate, frame_rate, dirty, transport_rolling, recording, position_samples, snap_name, record_enabled}` | Extended session properties |
| `daw.get_session_path` | none | `{session_path, session_name, snap_name, sample_rate}` | Session directory and file paths |
| `daw.get_session_length` | none | `{length_samples, length_seconds, sample_rate}` | Session length in samples and seconds |
| `daw.get_session_stats` | none | session statistics | Session statistics overview |
| `daw.save_session` | none | `{success}` | Save current session state |
| `daw.save_session_as` | `{name: string, parent_folder?: string, switch_to?: boolean, copy_media?: boolean}` | `{ok, new_session_path, new_name, switched_to}` | Save session under a new name |
| `daw.snapshot_session` | `{name?: string, switch_to?: boolean}` | `{success, snapshot_name}` | Save session state as a named snapshot |
| `daw.rename_session` | `{name: string}` | `{ok}` | Rename the current session |
| `daw.set_session_dirty` | `{dirty: boolean}` | `{ok}` | Mark session as dirty or clean |
| `daw.close_session` | none | status | Close the current session |
| `daw.new_session` | params | status | Create a new session (stub) |
| `daw.open_session` | params | status | Open an existing session (stub) |
| `daw.get_recent_sessions` | none | `{sessions}` | List recently opened sessions |
| `daw.ping` | none | `{pong, session_name, engine_running}` | Verify connectivity |
| `daw.get_api_version` | none | `{version, engine, based_on}` | Get DAWFLOW API version |
| `daw.list_commands` | none | `{message, approximate_count}` | List available commands |
| `daw.get_command_list` | none | `{commands: string[], count}` | Get sorted list of all registered commands |
| `daw.get_audio_backend_info` | none | `{backend_name, sample_rate, buffer_size, dsp_load_percent, running, physical_inputs, physical_outputs, input_count, output_count}` | Audio backend status and devices |
| `daw.get_engine_info` | none | engine info | Audio engine information |
| `daw.get_sample_rate` | none | `{sample_rate}` | Dedicated sample rate query |

## Transport

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.transport_play` | none | `{ok}` | Start playback |
| `daw.transport_stop` | none | `{ok}` | Stop playback |
| `daw.transport_locate` | `{sample_position: number}` | `{ok}` | Move playhead to sample position |
| `daw.get_transport_state` | none | `{playing, recording, position}` | Get basic transport state |
| `daw.get_transport_state_full` | none | `{playing, recording, record_enabled, position_samples, speed, sample_rate, loop_start?, loop_end?, loop_enabled?, punch_start?, punch_end?, punch_in?, punch_out?, auto_input, auto_play, auto_return, click_enabled}` | Full transport state with loop/punch |
| `daw.get_transport_speed` | none | `{speed, playing}` | Get current transport speed |
| `daw.set_playback_speed` | `{speed: number}` | `{success, speed}` | Set transport speed (0.5=half, 2.0=double) |
| `daw.toggle_loop` | none | `{success, looping}` | Toggle loop playback on/off |
| `daw.set_loop_enabled` | `{enabled: boolean}` | `{success}` | Enable or disable loop playback |
| `daw.set_loop_range` | `{start_sample: number, end_sample: number}` | `{success, start_sample, end_sample}` | Set the auto-loop range |
| `daw.get_loop_range` | none | `{enabled, start_samples, end_samples, length_samples}` | Get loop start/end positions |
| `daw.set_punch_range` | `{start_sample: number, end_sample: number}` | `{success, start_sample, end_sample}` | Set the auto-punch range |
| `daw.get_punch_range` | none | `{punch_in_enabled, punch_out_enabled, start_samples, end_samples, length_samples}` | Get punch start/end positions |
| `daw.set_punch_in` | `{enabled: boolean}` | `{success}` | Enable or disable punch-in |
| `daw.set_punch_out` | `{enabled: boolean}` | `{success}` | Enable or disable punch-out |
| `daw.toggle_punch` | `{punch_in?: boolean, punch_out?: boolean}` | `{ok, punch_in, punch_out, punch_start?, punch_end?}` | Toggle punch recording on/off |
| `daw.set_auto_input` | `{enabled: boolean}` | `{success}` | Enable or disable auto-input monitoring |
| `daw.set_auto_play` | `{enabled: boolean}` | `{success}` | Enable or disable auto-play |
| `daw.set_auto_return` | `{enabled: boolean}` | `{success}` | Enable or disable auto-return |
| `daw.set_follow_edits` | `{enabled: boolean}` | `{success}` | Enable or disable follow-edits mode |
| `daw.transport_goto_start` | none | `{success, position}` | Jump to session start |
| `daw.transport_goto_end` | none | `{success, position}` | Jump to session end |
| `daw.transport_goto_marker` | `{name: string}` | `{success, position}` | Jump to a named marker |
| `daw.transport_forward` | params | result | Fast-forward transport |
| `daw.transport_rewind` | params | result | Rewind transport |
| `daw.transport_play_selection` | none | result | Play the current selection |
| `daw.play_range` | `{start_samples: number, end_samples: number}` | `{ok}` | Play a specific time range |
| `daw.play_region` | `{track_id: string, region_id: string}` | `{ok}` | Play a specific region |

## Recording

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.toggle_record` | none | `{success, recording}` | Toggle session record enable |
| `daw.transport_record` | none | `{ok, recording}` | Start recording immediately (arm + play) |
| `daw.transport_record_with_preroll` | none | result | Start recording with preroll |
| `daw.transport_record_with_count_in` | none | result | Start recording with count-in |
| `daw.record_arm_all` | `{arm?: boolean}` | `{success, armed}` | Arm or disarm all tracks |
| `daw.get_record_state` | none | `{record_enabled, actively_recording, armed_tracks: [{id, name}], armed_count, punch_enabled, punch_in, punch_out, punch_start?, punch_end?, preroll_seconds}` | Detailed record state |
| `daw.set_pre_roll` | `{seconds: number}` | `{ok, preroll_seconds}` | Set pre-roll duration in seconds |
| `daw.set_post_roll` | `{seconds: number}` | `{ok, postroll_seconds, description}` | Set post-roll (via export_preroll) |
| `daw.discard_last_take` | none | `{ok, description}` | Undo last recording take |
| `daw.get_armed_tracks` | none | `{armed_tracks: [{id, name}], count}` | List all record-armed tracks |
| `daw.disarm_all_tracks` | none | `{success, disarmed_count}` | Disarm all tracks |
| `daw.set_capture_mode` | none | `{status: "deprecated"}` | Destructive mode removed in Ardour 7+ |
| `daw.get_last_capture_info` | none | `{status, description, recording}` | Info about last recording (limited) |

## Track Management

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_tracks` | none | `[{id, name, type, gain_db, muted, soloed, record_enabled, color}]` | List all tracks/buses |
| `daw.get_track_details` | `{track_id: string}` | `{id, name, gain_db, muted, soloed, active, comment, color, plugins: [{id, name, enabled, index}]}` | Detailed info for one track |
| `daw.get_track_names` | none | `{tracks: [{id, name, is_track, active, hidden}], count}` | Lightweight track list |
| `daw.get_track_count` | none | `{total, audio_tracks, buses}` | Count of tracks and buses |
| `daw.get_track_type` | `{track_id: string}` | `{track_id, name, type}` | Track type (audio_track, midi_track, bus, master) |
| `daw.add_audio_track` | `{name?: string, channels?: number}` | `{success, status: "queued"}` | Create new audio track (async) |
| `daw.add_midi_track` | `{name?: string}` | `{success, status: "queued"}` | Create new MIDI track (async) |
| `daw.add_bus` | `{name?: string, channels?: number}` | `{success, status: "queued"}` | Create new bus (async) |
| `daw.add_track_with_color` | `{type?: string, name?: string, channels?: number, color?: string}` | `{success, track_id, name}` | Create track/bus with optional color |
| `daw.remove_track` | `{track_id: string}` | `{success, status: "queued"}` | Remove a track (async) |
| `daw.rename_track` | `{track_id: string, name: string}` | `{success, status: "queued"}` | Rename a track (async) |
| `daw.duplicate_track` | `{track_id: string, name?: string}` | `{success, status: "queued"}` | Duplicate a track (async) |

## Track Properties

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_gain` | `{track_id: string, gain_db: number}` | `{ok}` | Set track fader level in dB |
| `daw.set_track_gain_relative` | `{track_id: string, delta_db: number}` | `{ok, previous_db, new_db}` | Adjust gain by delta dB |
| `daw.set_track_mute` | `{track_id: string, muted: boolean}` | `{ok}` | Mute or unmute a track |
| `daw.set_track_solo` | `{track_id: string, soloed: boolean}` | `{ok}` | Solo or unsolo a track |
| `daw.set_track_pan` | `{track_id: string, pan: number}` | `{success, pan}` | Set pan position (0.0=L, 0.5=C, 1.0=R) |
| `daw.get_track_pan` | `{track_id: string}` | `{track_id, pan_position, pan_width}` | Get pan position and width |
| `daw.set_track_pan_width` | `{track_id: string, width: number}` | `{ok, width}` | Set stereo pan width |
| `daw.set_track_trim` | `{track_id: string, trim_db: number}` | `{success, trim_db}` | Set track trim level in dB |
| `daw.set_track_record` | `{track_id: string, enabled: boolean}` | `{success, status: "queued"}` | Record-arm a track (async) |
| `daw.set_track_color` | `{track_id: string, color: string}` | `{success, status: "queued"}` | Set track color (hex RGBA) (async) |
| `daw.set_track_comment` | `{track_id: string, comment: string}` | `{success, status: "queued"}` | Set track comment (async) |
| `daw.set_track_active` | `{track_id: string, active: boolean}` | `{ok}` | Activate or deactivate a track |
| `daw.set_track_hidden` | `{track_id: string, hidden: boolean}` | `{ok}` | Hide or show a track in the UI |
| `daw.set_track_monitoring` | `{track_id: string, mode: string}` | `{ok}` | Set monitoring (auto/input/disk/cue) |
| `daw.get_track_record_status` | `{track_id: string}` | `{track_id, name, record_armed, monitoring, monitoring_input, monitoring_disk}` | Per-track record and monitoring state |
| `daw.set_track_phase_invert` | `{track_id: string, channel?: number, invert: boolean}` | `{ok}` | Invert phase on a channel |
| `daw.freeze_track` | `{track_id: string}` | `{ok}` | Freeze track (render to audio) |
| `daw.unfreeze_track` | `{track_id: string}` | `{ok}` | Unfreeze a frozen track |
| `daw.get_track_input_ports` | `{track_id: string}` | `{track_id, ports: [{name, connected}]}` | List track input ports |
| `daw.get_track_output_ports` | `{track_id: string}` | `{track_id, ports: [{name, connected}]}` | List track output ports |
| `daw.get_track_latency` | `{track_id: string}` | `{track_id, signal_latency, playback_latency}` | Get track latency info |
| `daw.solo_exclusive` | `{track_id: string}` | `{ok}` | Solo one track, unsolo all others |
| `daw.mute_all` | `{mute?: boolean}` | `{ok, count}` | Mute or unmute all tracks |
| `daw.unmute_all` | none | `{ok, count}` | Unmute all tracks |
| `daw.unsolo_all` | none | `{ok, count}` | Unsolo all tracks |
| `daw.mute_all_tracks` | none | `{success, muted_count}` | Mute every track/bus |
| `daw.unmute_all_tracks` | none | `{success, unmuted_count}` | Unmute every muted track/bus |
| `daw.unsolo_all_tracks` | none | `{success}` | Cancel all solo via session |
| `daw.get_master_gain` | none | `{gain, gain_db, track_id, name}` | Get master bus gain |
| `daw.set_master_gain` | `{gain_db: number}` | `{ok, gain_db}` | Set master bus fader |
| `daw.get_mix_state` | none | `{tracks: [{id, name, type, gain_db, pan, muted, soloed, active, record_armed, color, plugins, sends}], track_count, sample_rate, playing, recording, position}` | Full mix state in one call |

## Region Editing

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_regions` | `{track_id: string}` | `[{id, name, position_samples, length_samples, start_samples, muted, locked, layer}]` | List all regions on a track |
| `daw.get_region_info` | `{track_id: string, region_id: string}` | `{id, name, position_samples, length_samples, start_samples, muted, locked, layer, hidden, opaque, gain_db?, fade_in_active?, fade_out_active?, envelope_active?, peak_amplitude?, peak_amplitude_db?, note_count?, type}` | Detailed info for one region |
| `daw.get_region_details` | `{track_id: string, region_id: string}` | region details | Get region details (alternate) |
| `daw.get_region_at_position` | `{track_id: string, position_samples: number}` | `{found, id?, name?, position_samples?, length_samples?, muted?, locked?}` | Find top region at a time position |
| `daw.get_region_by_name` | `{name: string}` | `{found, id?, name?, position_samples?, length_samples?, muted?, track_id?, track_name?}` | Find region by name across all tracks |
| `daw.select_regions_in_range` | `{track_id: string, start_samples: number, end_samples: number}` | `{regions: [{id, name, position_samples, length_samples}], count}` | Find regions touching a time range |
| `daw.split_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Split region at a sample position |
| `daw.move_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Move region to new position |
| `daw.move_region_to_track` | `{source_track_id: string, target_track_id: string, region_id: string, position_samples?: number}` | `{ok, new_position}` | Move region between tracks |
| `daw.nudge_region` | `{track_id: string, region_id: string, nudge_samples?: number, nudge_beats?: number}` | `{ok, new_position_samples}` | Nudge region by samples or beats |
| `daw.nudge_region_forward` | `{track_id: string, region_id: string, amount_samples: number}` | `{ok}` | Nudge region forward by samples |
| `daw.nudge_region_backward` | `{track_id: string, region_id: string, amount_samples: number}` | `{ok}` | Nudge region backward by samples |
| `daw.delete_region` | `{track_id: string, region_id: string}` | `{ok}` | Remove region from playlist |
| `daw.copy_region` | `{track_id: string, region_id: string}` | `{ok, cloned_region_id, name}` | Clone a region (new ID) |
| `daw.paste_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok, region_id, name, position}` | Place a region copy at a position |
| `daw.duplicate_region` | `{track_id: string, region_id: string, times?: number}` | `{ok}` | Duplicate region after itself |
| `daw.trim_region_start` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Trim region start to position |
| `daw.trim_region_end` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Trim region end to position |
| `daw.trim_region_to_range` | `{track_id: string, region_id: string, start_samples: number, end_samples: number}` | `{ok}` | Trim region to a time range |
| `daw.bounce_range` | `{track_id: string, start_samples: number, end_samples: number, name?: string}` | `{ok, region_id, name}` | Bounce/consolidate a time range |
| `daw.bounce_region` | `{track_id: string, region_id: string}` | `{success, region_id, name}` | Bounce a region to a new audio file |
| `daw.consolidate_range` | `{track_id: string, start_samples: number, end_samples: number, name?: string}` | `{ok, region_id, region_name}` | Consolidate regions in range (bounce) |
| `daw.normalize_region` | `{track_id: string, region_id: string}` | `{ok}` | Normalize audio region to peak |
| `daw.ripple_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok, moved}` | Move region and push subsequent regions |
| `daw.shuffle_region` | `{track_id: string, region_id: string, direction: number}` | `{ok}` | Shuffle region position |
| `daw.align_regions_to_position` | `{track_id: string, position_samples: number, region_ids?: string[]}` | `{ok}` | Align regions to a sample position |
| `daw.separate_regions_between` | `{track_id: string, start: number, end: number}` | result | Separate regions at boundaries |
| `daw.snap_regions_to_grid` | `{track_id: string}` | result | Snap all regions to nearest grid |
| `daw.close_region_gaps` | `{track_id: string}` | result | Close gaps between regions |
| `daw.slip_region_content` | `{track_id: string, region_id: string, amount: number}` | result | Slip region content within bounds |
| `daw.count_regions` | `{track_id: string}` | `{count}` | Count regions on a track |
| `daw.get_all_track_regions` | params | result | Get regions across all tracks |
| `daw.get_selected_regions` | none | result | Get currently selected regions |

## Region Properties

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.rename_region` | `{track_id: string, region_id: string, name: string}` | `{ok}` | Set region name |
| `daw.set_region_name` | `{track_id: string, region_id: string, name: string}` | `{ok}` | Set region name (alternate) |
| `daw.mute_region` | `{track_id: string, region_id: string, muted: boolean}` | `{ok}` | Mute or unmute a region |
| `daw.set_region_muted` | `{track_id: string, region_id: string, muted: boolean}` | `{ok}` | Mute or unmute (alternate) |
| `daw.lock_region` | `{track_id: string, region_id: string, locked: boolean}` | `{ok}` | Lock or unlock region position |
| `daw.set_region_locked` | `{track_id: string, region_id: string, locked: boolean}` | `{ok}` | Lock or unlock (alternate) |
| `daw.set_region_gain` | `{track_id: string, region_id: string, gain_db: number}` | `{ok}` | Set audio region gain |
| `daw.set_region_opacity` | `{track_id: string, region_id: string, opaque: boolean}` | `{ok}` | Set region opacity/transparency |
| `daw.set_region_opaque` | `{track_id: string, region_id: string, opaque: boolean}` | `{ok}` | Set opaque flag (alternate) |
| `daw.set_region_fade_in` | `{track_id: string, region_id: string, length_samples: number}` | `{ok}` | Set fade-in length |
| `daw.set_region_fade_out` | `{track_id: string, region_id: string, length_samples: number}` | `{ok}` | Set fade-out length |
| `daw.set_fade_in_active` | `{track_id: string, region_id: string, active: boolean}` | `{ok}` | Enable/disable fade-in |
| `daw.set_fade_out_active` | `{track_id: string, region_id: string, active: boolean}` | `{ok}` | Enable/disable fade-out |
| `daw.set_fade_shape` | `{track_id: string, region_id: string, fade: string, shape: string}` | `{ok}` | Set fade curve shape (linear/fast/slow/constant/symmetric) |
| `daw.create_crossfade` | `{track_id: string, region_id_a: string, region_id_b: string, crossfade_samples?: number}` | `{ok, description}` | Create crossfade between overlapping regions |
| `daw.set_crossfade` | none | `{status: "not_yet_implemented"}` | Crossfade stub (use fade_in/fade_out) |
| `daw.set_region_sync_point` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Set region sync point |
| `daw.toggle_region_phase_invert` | `{track_id: string, region_id: string}` | result | Toggle phase inversion on region |
| `daw.loop_region` | `{track_id: string, region_id: string}` | `{ok}` | Loop a region |
| `daw.raise_region` | `{track_id: string, region_id: string}` | `{ok}` | Raise region layer |
| `daw.lower_region` | `{track_id: string, region_id: string}` | `{ok}` | Lower region layer |
| `daw.raise_region_to_top` | `{track_id: string, region_id: string}` | `{ok}` | Raise region to top layer |
| `daw.lower_region_to_bottom` | `{track_id: string, region_id: string}` | `{ok}` | Lower region to bottom layer |
| `daw.reverse_region` | `{track_id: string, region_id: string}` | `{status: "not_yet_implemented"}` | Reverse audio region (stub) |
| `daw.time_stretch_region` | `{region_id?: string, ratio?: number}` | `{status: "not_yet_implemented"}` | Time stretch (requires RubberBand) |
| `daw.pitch_shift_region` | `{region_id?: string, semitones?: number}` | `{status: "not_yet_implemented"}` | Pitch shift (requires RubberBand) |

## Region Audio Analysis

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_audio_peaks` | `{track_id: string, region_id: string, n_peaks?: number, channel?: number}` | `[{min, max}]` | Get waveform peak data for a region |
| `daw.get_region_rms` | `{track_id: string, region_id: string}` | `{rms, rms_db}` | Get RMS level of an audio region |
| `daw.strip_silence` | `{track_id: string, region_id: string, threshold_db?: number, min_length_samples?: number}` | `[{start_samples, end_samples}]` | Find silent sections in a region |
| `daw.detect_silence` | `{track_id: string, region_id: string, threshold_db?: number, min_length_samples?: number}` | `{silent_ranges: [{start_samples, end_samples}], count, threshold_db, min_length}` | Detect silent sections (alternate) |

## MIDI Editing (Legacy)

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.create_midi_region` | `{track_id: string, position_samples: number, length_samples: number, name?: string}` | `{ok, region_id, name, position, length}` | Create empty MIDI region on a track |
| `daw.get_midi_notes` | `{track_id: string, region_id: string}` | `[{note, velocity, channel, start_beats, length_beats, end_beats, id}]` | Get all MIDI notes in a region |
| `daw.get_midi_region_info` | `{track_id: string, region_id: string}` | `{region_id, name, position_samples, length_samples, note_count, lowest_note?, highest_note?, earliest_beat?, latest_beat?, duration_beats?}` | MIDI region statistics |
| `daw.add_midi_note` | `{track_id: string, region_id: string, note: number, velocity: number, start_beats: number, length_beats: number, channel?: number}` | `{ok}` | Add a note to a MIDI region |
| `daw.remove_midi_note` | `{track_id: string, region_id: string, note: number, start_beats: number, channel?: number}` | `{ok}` | Remove a note by matching note/start/channel |
| `daw.quantize_midi` | `{track_id: string, region_id: string, grid_beats?: number, strength?: number}` | `{ok}` | Quantize MIDI notes to grid |
| `daw.transpose_midi` | `{track_id: string, region_id: string, semitones: number}` | `{ok}` | Transpose all notes by semitones |
| `daw.set_midi_velocity` | `{track_id: string, region_id: string, velocity: number, note_min?: number, note_max?: number}` | `{ok}` | Set velocity for notes (optionally filtered) |
| `daw.humanize_midi` | `{track_id: string, region_id: string, timing_amount?: number, velocity_amount?: number}` | `{ok}` | Add random timing/velocity variation |
| `daw.select_midi_notes` | `{track_id: string, region_id: string, note_min?: number, note_max?: number, velocity_min?: number, velocity_max?: number, start_beats?: number, end_beats?: number}` | `{notes: [{note, velocity, channel, start_beats, length_beats, id}], count}` | Select notes by criteria |

## MIDI Editing (By Note ID)

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi.add_note` | `{track_id: string, region_id: string, note: number, velocity?: number, channel?: number, start_beats: number, length_beats?: number}` | `{success, note_id}` | Add a note (returns note ID) |
| `daw.midi.delete_note` | `{track_id: string, region_id: string, note_id: number}` | `{success}` | Delete a note by ID |
| `daw.midi.move_note` | `{track_id: string, region_id: string, note_id: number, new_time_beats?: number, new_note?: number, new_velocity?: number, new_length_beats?: number, new_channel?: number}` | `{success}` | Move/edit a note by ID |
| `daw.midi.set_note_velocity` | `{track_id: string, region_id: string, note_id: number, velocity: number}` | `{success}` | Set velocity for one note by ID |
| `daw.midi.resize_note` | `{track_id: string, region_id: string, note_id: number, length_beats: number}` | `{success}` | Resize a note by ID |
| `daw.midi.quantize` | `{track_id: string, region_id: string, grid_beats?: number, strength?: number, swing?: number}` | `{success, notes_quantized}` | Quantize notes to grid |
| `daw.midi.transpose` | `{track_id: string, region_id: string, semitones: number}` | `{success, notes_transposed}` | Transpose notes by semitones |
| `daw.edit_midi_note` | `{track_id: string, region_id: string, note_id: number, note?: number, velocity?: number, start_beats?: number, length_beats?: number, channel?: number}` | `{ok}` | Edit note properties by ID |
| `daw.set_midi_note_length` | `{track_id: string, region_id: string, note_id: number, length_beats: number}` | `{ok}` | Set note length by ID |
| `daw.duplicate_midi_region_content` | `{track_id: string, region_id: string, times?: number}` | `{ok, times}` | Duplicate/loop MIDI region content |

## MIDI CC & Program Changes

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi.get_cc_data` | `{track_id: string, region_id: string, cc_number: number}` | `{cc_number, events: [{time_beats, value}], count}` | Get CC events for a controller |
| `daw.midi.get_all_cc_numbers` | `{track_id: string, region_id: string}` | `{cc_numbers: [{cc_number, event_count}]}` | List CC numbers with data |
| `daw.midi.add_cc_event` | `{track_id: string, region_id: string, cc_number: number, time_beats: number, value: number}` | `{success}` | Add CC event to a MIDI region |
| `daw.midi.clear_cc_data` | `{track_id: string, region_id: string, cc_number: number}` | `{success}` | Clear CC events for a controller |
| `daw.midi.delete_cc_event` | `{track_id: string, region_id: string, cc_number: number, time_beats: number}` | `{success}` | Delete a specific CC event |
| `daw.add_midi_cc` | `{track_id: string, region_id: string, cc_number: number, time_beats: number, value: number, channel?: number}` | `{ok, cc_number, time_samples}` | Add CC via track automation |
| `daw.get_midi_cc` | `{track_id: string, cc_number: number, channel?: number}` | `{points: [{time_samples, value, value_midi}], count, cc_number, channel, state}` | Get CC data from track automation |
| `daw.clear_midi_cc` | `{cc: number}` | `{status: "not_yet_implemented"}` | Clear MIDI CC data (stub) |
| `daw.midi.add_patch_change` | params | result | Add MIDI patch/program change |
| `daw.midi.delete_patch_change` | params | result | Delete MIDI patch/program change |
| `daw.add_program_change` | `{program: number, beat: number}` | `{status: "not_yet_implemented"}` | Insert program change (stub) |

## MIDI Transformations

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.quantize_midi_swing` | `{track_id: string, region_id: string, grid_beats?: number, swing?: number, strength?: number}` | `{ok}` | Quantize with swing (0.5=straight) |
| `daw.legato_midi` | `{track_id: string, region_id: string, gap_beats?: number}` | `{ok, changed}` | Extend notes to meet next note |
| `daw.scale_midi_velocity` | `{track_id: string, region_id: string, scale_percent: number}` | `{ok}` | Scale velocities by percentage |
| `daw.set_midi_channel` | `{track_id: string, region_id: string, channel: number}` | `{ok, changed}` | Set MIDI channel for all notes (0-15) |
| `daw.split_midi_by_pitch` | `{track_id: string, region_id: string, split_note: number}` | `{ok, kept_below, removed_above}` | Split MIDI by pitch (keeps below) |
| `daw.split_midi_by_channel` | `{track_id: string, region_id: string, keep_channel: number}` | `{ok, kept, removed}` | Keep notes on one channel, remove rest |
| `daw.invert_midi_notes` | `{track_id: string, region_id: string, pivot?: number}` | `{ok, pivot}` | Melodic inversion around a pivot note |
| `daw.retrograde_midi` | `{track_id: string, region_id: string}` | `{ok}` | Reverse note order (retrograde) |

## Plugin Management

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_available_plugins` | none | `{plugins: [{name, type, category, creator, unique_id}], count}` | List all installed plugins |
| `daw.get_track_plugins` | `{track_id: string}` | `{plugins: [{processor_id, name, enabled, index}]}` | List plugins on a track |
| `daw.load_plugin` | `{track_id: string, plugin_name: string}` | `{success, status: "queued"}` | Load plugin by name (async) |
| `daw.load_plugin_by_id` | `{track_id: string, unique_id: string}` | `{ok, processor_id, name}` | Load plugin by unique ID |
| `daw.remove_plugin` | `{track_id: string, processor_id: string}` | `{success, status: "queued"}` | Remove plugin from track (async) |
| `daw.set_plugin_enabled` | `{track_id: string, processor_id: string, enabled: boolean}` | `{success, status: "queued"}` | Enable/disable (bypass) a plugin (async) |
| `daw.bypass_all_plugins` | `{track_id: string}` | `{ok, bypassed_count}` | Bypass all plugins on a track |
| `daw.enable_all_plugins` | `{track_id: string}` | `{ok, enabled_count}` | Re-enable all plugins on a track |
| `daw.get_plugin_info` | `{track_id: string, processor_id: string}` | `{processor_id, name, maker, category, unique_id, enabled, type, parameter_count, audio_inputs, audio_outputs, midi_inputs, midi_outputs, preset_count}` | Detailed plugin information |
| `daw.get_processor_chain` | `{track_id: string}` | `{processors: [{index, id, name, active, type, plugin_name?, parameter_count?, target_name?}], count}` | Full signal chain (fader, meter, sends, plugins) |
| `daw.reorder_plugins` | `{track_id: string, processor_ids: string[]}` | `{ok}` | Reorder processor chain |
| `daw.set_plugin_position` | `{track_id: string, processor_id: string, position: number}` | `{ok, position}` | Move plugin to specific index |
| `daw.move_plugin` | `{source_track_id: string, dest_track_id: string, processor_id: string}` | `{ok, new_processor_id}` | Move plugin between tracks |
| `daw.copy_plugin` | `{source_track_id: string, source_processor_id: string, target_track_id: string}` | `{ok, new_processor_id}` | Copy plugin with settings to another track |
| `daw.plugin.open_editor` | `{track_id: string, processor_id: string}` | `{success, has_editor, name, track_id, processor_id, parameters, parameter_count, editor_type}` | Open generic plugin editor (returns params) |
| `daw.plugin.close_editor` | none | `{success}` | Close plugin editor |
| `daw.show_plugin_manager` | none | result | Show plugin manager (GUI stub) |
| `daw.plugin.register` | `{plugin_id: string}` | `{ok}` | Register a .dawflow plugin (special handler) |
| `daw.ui.request_main_webview` | `{url: string}` | `{ok}` | Request full-window WebView takeover |

## Plugin Parameters & Presets

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_plugin_parameters` | `{track_id: string, processor_id: string}` | `{parameters: [{index, name, value, min, max, default}]}` | Get all plugin parameters |
| `daw.set_plugin_parameter` | `{track_id: string, processor_id: string, index: number, value: number}` | `{success, status: "queued"}` | Set a single plugin parameter (async) |
| `daw.set_multiple_plugin_parameters` | `{track_id: string, processor_id: string, parameters: [{index, value}]}` | `{ok, set_count, errors?}` | Set multiple params in one call |
| `daw.plugin.list_presets` | `{track_id: string, processor_id: string}` | `{presets: [{uri, label, user}], count, current_preset}` | List available presets |
| `daw.plugin.load_preset` | `{track_id: string, processor_id: string, preset_uri: string}` | `{success, loaded_preset}` | Load a preset by URI or label |
| `daw.plugin.save_preset` | `{track_id: string, processor_id: string, name: string}` | result | Save current state as user preset |
| `daw.get_plugin_presets` | `{track_id: string, processor_id: string}` | `{presets: [{uri, label, user}], count}` | List presets (alternate) |
| `daw.load_plugin_preset` | `{track_id: string, processor_id: string, preset_uri?: string, preset_name?: string}` | `{ok, loaded, uri}` | Load preset by URI or name |
| `daw.save_plugin_preset` | `{track_id: string, processor_id: string, name: string}` | `{ok, preset_uri, label}` | Save current state as user preset |

## Plugin Search

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.search_plugins` | `{query: string}` | `{results: [{name, type, category, creator, unique_id}], count}` | Search plugins by name |
| `daw.search_plugins_by_category` | `{category: string}` | `{results: [{name, type, category, creator, unique_id}], count}` | Search plugins by category |

## Automation

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_automation_state` | `{track_id: string, parameter?: string}` | `{track_id, parameter, state}` | Get automation state (Off/Write/Touch/Read/Latch) |
| `daw.set_automation_state` | `{track_id: string, parameter?: string, state: string}` | `{ok}` | Set automation state |
| `daw.get_automation_data` | `{track_id: string, parameter?: string}` | `{track_id, parameter, points: [{time, value}], count}` | Get automation points |
| `daw.add_automation_point` | `{track_id: string, parameter?: string, time: number, value: number}` | `{ok}` | Add an automation point |
| `daw.clear_automation` | `{track_id: string, parameter?: string}` | `{ok}` | Clear all automation points |
| `daw.set_all_automation_state` | `{state: string, parameter?: string}` | `{ok, count}` | Set automation state on all tracks |
| `daw.set_automation_mode` | `{track_id: string, mode: string}` | `{success}` | Set gain automation mode (off/read/write/touch/latch) |
| `daw.get_automation_mode` | `{track_id: string}` | `{mode}` | Get gain automation mode |
| `daw.set_plugin_automation_mode` | `{track_id: string, processor_id: string, param_index: number, mode: string}` | `{success}` | Set plugin parameter automation mode |
| `daw.get_automation_data_ext` | `{track_id: string, control?: string}` | `{control, points: [{time_samples, value}], count, mode}` | Extended automation data (gain/pan/mute) |
| `daw.add_automation_point_ext` | `{track_id: string, control?: string, time_samples: number, value: number}` | `{success}` | Add point with control type |
| `daw.delete_automation_point` | `{track_id: string, control?: string, time_samples: number}` | `{success}` | Delete nearest point at time |
| `daw.clear_automation_ext` | `{track_id: string, control?: string}` | `{success}` | Clear automation by control type |

## Metering

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_track_peak` | `{track_id: string, channel?: number}` | `{track_id, channel, peak_db}` | Get track peak level |
| `daw.get_track_rms` | `{track_id: string, channel?: number}` | `{track_id, channel, rms_db}` | Get track RMS level |
| `daw.get_master_peak` | none | `{channels: [{channel, peak_db}]}` | Get master bus peak levels |
| `daw.get_master_meter` | none | `{channels: [{peak_db}], channel_count}` | Master bus meter levels |
| `daw.get_master_lufs` | none | `{status: "approximation", channels: [{channel, peak_db, k_rms_db}]}` | LUFS approximation via K-RMS |
| `daw.get_cpu_load` | none | `{cpu_load_percent}` | Get DSP CPU load percentage |
| `daw.get_meter_levels` | none | `{tracks: [{id, name, channels: [{peak_db}]}]}` | All-track peak levels in one call |
| `daw.reset_meter_peaks` | none | `{success}` | Reset all track peak holds |
| `daw.set_meter_type` | params | result | Set meter type for a track |
| `daw.get_xrun_count` | none | `{xrun_count}` | Get audio dropout (xrun) count |
| `daw.get_latency_report` | none | `{tracks: [{id, name, signal_latency, playback_latency}], sample_rate, block_size, xrun_count}` | Full latency report for all tracks |

## Markers & Locations

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.add_marker` | `{name: string, position?: number}` | `{success, name, position}` | Add a named marker (default: current pos) |
| `daw.add_location_marker` | `{name?: string, position_samples: number}` | `{success, location_id, name}` | Add marker with location ID returned |
| `daw.add_range_marker` | `{name: string, start_samples: number, end_samples: number}` | `{ok, name, start, end}` | Add a range marker |
| `daw.add_cue_marker` | `{name: string, position?: number}` | `{ok, name, position}` | Add a cue marker |
| `daw.get_markers` | none | `{markers: [{name, start, end, is_mark, is_range}]}` | List all markers and range markers |
| `daw.get_all_markers` | none | `{markers: [{id, name, start_samples, end_samples, is_mark, is_range, is_cd_marker, is_auto_loop, is_auto_punch, locked}], count}` | Full metadata for all locations |
| `daw.remove_marker` | `{name: string}` | `{success}` | Remove a marker by name |
| `daw.remove_location_marker` | `{location_id: string}` | `{success}` | Remove marker by location ID |
| `daw.update_marker` | `{location_id: string, name?: string, position_samples?: number, end_samples?: number}` | `{success}` | Update marker name/position by ID |
| `daw.rename_marker` | `{name: string, new_name: string}` | `{ok}` | Rename a marker by current name |
| `daw.move_marker` | `{name: string, position_samples: number}` | `{ok}` | Move marker to new position |
| `daw.goto_next_marker` | none | result | Jump playhead to next marker |

## Tempo & Time Signature

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_tempo` | `{bpm: number}` | `{success, bpm}` | Set session tempo at beat 0 |
| `daw.set_time_signature` | `{numerator: number, denominator: number}` | `{success, numerator, denominator}` | Set session time signature at beat 0 |
| `daw.add_tempo_change` | `{bpm: number, note_type?: number, position_samples?: number, bar?: number, beat?: number, ticks?: number}` | `{ok, bpm, note_type}` | Add tempo change at position or bar/beat |
| `daw.remove_tempo_change` | `{position_samples: number}` | `{ok}` | Remove tempo point at position |
| `daw.add_tempo_ramp` | `{start_bpm: number, end_bpm: number, start_position_samples: number, end_position_samples: number}` | `{ok, start_bpm, end_bpm}` | Gradual tempo change between two points |
| `daw.add_time_signature_change` | `{numerator: number, denominator: number, position_samples?: number, bar?: number}` | `{ok, numerator, denominator}` | Add meter change at position or bar |
| `daw.get_tempo_map` | none | `{tempos: [{bpm, note_types_per_minute, note_type, bar, beat, tick}], meters: [{divisions_per_bar, note_value, bar, beat, tick}], tempo_count, meter_count}` | Full tempo and meter map |
| `daw.get_tempo_at` | `{position?: number}` | `{bpm, position, bar, beat, bbt_string}` | Get tempo at a specific position |

## Time Conversion

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.position_to_bars_beats` | `{position_samples: number}` | `{bars, beats, ticks, bbt_string, position_samples}` | Convert samples to bars/beats/ticks |
| `daw.bars_beats_to_position` | `{bars: number, beats?: number, ticks?: number}` | `{position_samples, bars, beats, ticks}` | Convert bars/beats to samples |
| `daw.samples_to_beats` | `{samples: number}` | `{samples, beats, bar, beat, tick, bbt_string}` | Convert samples to beat position |
| `daw.beats_to_samples` | `{beats: number}` | `{samples, beats}` | Convert beats to sample position |
| `daw.get_position_info` | none | `{samples, beats, bar, beat, tick, bbt_string, seconds, tempo_bpm, sample_rate}` | Current position in all formats |
| `daw.samples_to_time` | `{samples: number}` | time info | Convert samples to time formats |
| `daw.time_to_samples` | `{time: number}` | `{samples}` | Convert time to samples |
| `daw.get_time_formats` | none | result | List available time formats |

## Routing & I/O

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_input` | `{track_id: string, port: string}` | `{success}` | Connect track input to a port |
| `daw.set_track_output` | `{track_id: string, port: string}` | `{success}` | Connect track output to a port |
| `daw.get_track_io` | `{track_id: string}` | `{inputs: [{name, connections}], outputs: [{name, connections}]}` | Get track I/O connections |
| `daw.connect_track_input` | `{track_id: string, source_port: string, channel?: number}` | `{success}` | Connect port to track input channel |
| `daw.disconnect_track_input` | `{track_id: string, channel?: number}` | `{success}` | Disconnect track input (channel or all) |
| `daw.connect_track_output` | `{track_id: string, dest_port: string, channel?: number}` | `{success}` | Connect track output channel to port |
| `daw.connect_ports` | `{source_port: string, dest_port: string}` | `{ok}` | Connect two ports directly |
| `daw.disconnect_ports` | `{source_port: string, dest_port: string}` | `{ok}` | Disconnect two ports |
| `daw.get_available_audio_ports` | `{input?: boolean}` | `{ports: string[], count}` | List physical audio ports |
| `daw.get_available_ports` | `{type?: string}` | `{audio_inputs, audio_outputs, midi_inputs, midi_outputs}` | List all system ports (audio/MIDI) |
| `daw.get_midi_ports` | none | `{ports: [{name, direction}], count}` | List physical MIDI ports |

## Sends

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.add_send` | `{track_id: string, target_bus_id: string}` | `{success, send_id}` | Add aux send from track to bus |
| `daw.set_send_level` | `{track_id: string, send_index: number, gain_db: number}` | `{ok, track_id, send_index, gain_db}` | Set send gain in dB |
| `daw.set_send_enable` | `{track_id: string, send_index: number, enabled: boolean}` | `{ok}` | Enable or disable a send |
| `daw.get_sends` | `{track_id: string}` | `{sends: [{index, id, name, active, gain?, gain_db?, enabled?, target_id?, target_name?, send_name?}], count}` | List sends with targets and levels |

## Groups & VCA

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.create_group` | `{name: string}` | `{success, group_name}` | Create a new route group |
| `daw.create_route_group` | `{name: string}` | `{success, group_id, name}` | Create route group (returns ID) |
| `daw.add_track_to_group` | `{track_id: string, group_name: string}` | `{success}` | Add track to a route group |
| `daw.remove_track_from_group` | `{track_id: string, group_name: string}` | `{ok}` | Remove track from a route group |
| `daw.get_groups` | none | `{groups: [{name, active, members: [{id, name}]}]}` | List route groups and members |
| `daw.get_route_groups` | none | `{groups: [{id, name, active, gain, mute, solo, select, color, member_ids, member_count}], count}` | Detailed route group listing |
| `daw.delete_route_group` | `{group_name: string}` | `{success}` | Delete a route group by name |
| `daw.delete_group` | `{group_name: string}` | `{ok}` | Delete route group (alternate) |
| `daw.set_group_active` | `{group_name: string, active: boolean}` | `{success}` | Activate or deactivate a group |
| `daw.set_group_properties` | `{group_name: string, gain?: boolean, mute?: boolean, solo?: boolean, active?: boolean, relative?: boolean}` | `{ok}` | Set group linking properties |
| `daw.create_vca` | `{name?: string, count?: number}` | `{vcas: [{id, name, number}], count}` | Create VCA masters |
| `daw.get_vcas` | none | `{vcas: [{id, name, number}], count}` | List all VCA masters |
| `daw.assign_track_to_vca` | `{track_id: string, vca_name: string}` | `{success}` | Assign track to VCA |
| `daw.unassign_track_from_vca` | `{track_id: string, vca_name: string}` | `{success}` | Remove track from VCA |
| `daw.set_vca_gain` | `{vca_name: string, gain_db: number}` | `{success}` | Set VCA gain in dB |
| `daw.set_vca_mute` | `{vca_name: string, muted: boolean}` | `{success}` | Mute or unmute a VCA |
| `daw.set_vca_solo` | `{vca_name: string, soloed: boolean}` | `{success}` | Solo or unsolo a VCA |
| `daw.delete_vca` | `{vca_name: string}` | `{success}` | Remove a VCA master |

## Selection

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.select_track` | `{track_id: string, add?: boolean}` | `{ok}` | Select a track (optionally add to selection) |
| `daw.deselect_all_tracks` | none | `{ok}` | Clear track selection |
| `daw.get_selected_tracks` | none | `{tracks: [{id, name}], count}` | Get selected tracks |
| `daw.select_all_tracks` | none | `{ok, count}` | Select all tracks |

## Arrangement (Sections)

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.insert_time` | `{position_samples: number, duration_samples: number}` | `{ok, position, duration}` | Ripple insert (push everything forward) |
| `daw.remove_time` | `{position_samples: number, duration_samples: number}` | `{ok, position, duration}` | Ripple delete (pull everything backward) |
| `daw.cut_section` | `{start_samples: number, end_samples: number, paste_position_samples?: number}` | `{ok, start, end, paste_position}` | Cut a section |
| `daw.copy_section` | `{start_samples: number, end_samples: number, paste_position_samples: number}` | `{ok, start, end, paste_position}` | Copy a section (non-destructive) |
| `daw.delete_section` | `{start_samples: number, end_samples: number}` | `{ok, start, end}` | Delete a section (ripple delete) |
| `daw.insert_section` | `{position_samples: number, duration_samples: number}` | `{ok, position, duration}` | Insert blank time at position |

## Export & Import

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.export_session` | none | `{status: "requires_gui", description, session_name, session_path, workaround}` | Export session (requires GUI) |
| `daw.export_range` | none | `{status: "requires_gui", description, session_name, session_path, tip}` | Export range (requires GUI) |
| `daw.export_stems` | `{format?: string, bit_depth?: number}` | `{status: "not_yet_implemented", tracks_to_export, track_count}` | Stem export (stub) |
| `daw.get_export_formats` | none | `{formats: [{id, name, extension}]}` | List available export formats |
| `daw.import_audio` | `{filepath: string, track_id?: string, position_samples?: number}` | `{ok, region_id, name, length, placed_on_track?, position?}` | Import audio file onto a track |
| `daw.import_midi` | `{filepath: string, track_id?: string}` | `{status, filepath, description}` | Import MIDI file (validation + guidance) |
| `daw.get_source_files` | none | `{sources: [{id, name, length, writable}], count}` | List audio/MIDI source files in session |

## Snapshots & Templates

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.save_snapshot` | `{name: string}` | `{ok, snapshot}` | Save session state as snapshot |
| `daw.get_snapshots` | none | `{current_snapshot, session_name, session_path}` | Get current snapshot info |
| `daw.restore_snapshot` | `{name: string}` | `{ok, snapshot}` | Restore a saved snapshot |
| `daw.save_template` | `{name: string, description?: string}` | `{ok, name}` | Save session as template |

## Navigation & Playhead

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_playhead_position` | `{position_samples: number}` | `{success, position}` | Locate playhead to exact position |
| `daw.get_playhead_position` | none | `{position_samples, position_seconds, sample_rate}` | Query current playhead position |
| `daw.nudge_playhead_forward` | `{amount_samples?: number}` | `{success, position}` | Move playhead forward (default: 1 second) |
| `daw.nudge_playhead_backward` | `{amount_samples?: number}` | `{success, position}` | Move playhead backward (default: 1 second) |
| `daw.goto_session_start` | none | `{success, position}` | Jump to session start |
| `daw.goto_session_end` | none | `{success, position}` | Jump to session end |
| `daw.goto_next_region_boundary` | none | `{success, position}` | Jump to next region start/end |
| `daw.goto_prev_region_boundary` | none | `{success, position}` | Jump to previous region start/end |
| `daw.scroll_to_position` | `{position_samples?: number}` | `{ok, position}` or `{status: "requires_gui"}` | Move playhead (editor scroll requires GUI) |
| `daw.scroll_timeline` | params | result | Scroll the timeline view |

## Snap & Grid

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_snap_mode` | none | `{status: "gui_only", description}` | Get snap settings (GUI-side setting, not available from plugin host) |
| `daw.set_snap_mode` | `{mode?: string, grid_size?: string}` | `{status: "not_available_from_plugin_host", mode, grid_size}` | Set snap mode (GUI-side, React UI manages this client-side) |

## View & Zoom

These commands require access to the Editor (gtk2_ardour) and are not fully available from the plugin host.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_zoom_level` | params | `{status: "requires_gui", shortcuts}` | Set zoom level (GUI only) |
| `daw.zoom_to_session` | none | `{status: "requires_gui"}` | Zoom to full session (GUI only) |
| `daw.zoom_to_region` | params | error | Zoom to fit a region (GUI only) |
| `daw.zoom_to_range` | params | error | Zoom to time range (GUI only) |
| `daw.zoom_step` | params | result | Zoom in/out by step |
| `daw.set_visible_tracks` | params | error | Set visible tracks (GUI only) |
| `daw.get_visible_tracks` | params | error | Get visible tracks (GUI only) |
| `daw.set_track_height` | params | error | Set track height (GUI only) |
| `daw.show_mixer` | none | error | Show mixer window (GUI only) |
| `daw.show_editor` | none | error | Show editor window (GUI only) |
| `daw.show_preferences` | none | result | Show preferences dialog (GUI only) |

## Metronome

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.toggle_metronome` | none | `{ok, enabled}` | Toggle click on/off |
| `daw.set_metronome_volume` | `{gain: number}` | `{ok, gain}` | Set click gain (0.0-2.0, 1.0=unity) |
| `daw.toggle_count_in` | none | `{ok, enabled}` | Toggle count-in on/off |
| `daw.get_metronome_state` | none | `{enabled, gain, count_in}` | Get click state |
| `daw.get_click_settings` | none | `{enabled, gain, use_click_emphasis}` | Get click settings |
| `daw.set_click_enabled` | `{enabled: boolean}` | `{success, enabled}` | Enable or disable click |
| `daw.set_click_gain` | `{gain: number}` | `{success}` | Set click gain level |

## Playlists

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_playlist` | `{track_id: string, playlist_name: string}` | `{ok, playlist_name}` | Switch track to a different playlist |
| `daw.get_track_playlists` | `{track_id: string}` | `{playlists: [{name, id, region_count, is_current}], count}` | List playlists for a track |
| `daw.new_track_playlist` | `{track_id: string}` | `{ok, playlist_name}` | Create new empty playlist for track |
| `daw.copy_track_playlist` | `{track_id: string}` | `{ok, playlist_name}` | Copy current playlist (for comping) |
| `daw.get_track_playlist_info` | `{track_id: string}` | playlist info | Get current playlist info |
| `daw.get_available_playlists` | none | result | List all available playlists |

## Batch & Utilities

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.execute_batch` | `{commands: [{method: string, params: object}]}` | `{results: [{method, result} or {method, error}], count}` | Execute multiple commands in sequence |
| `daw.undo` | `{count?: number}` | `{success, next_undo}` | Undo last N operations |
| `daw.redo` | `{count?: number}` | `{success, next_redo}` | Redo last N undone operations |
| `daw.get_undo_history` | `{max_items?: number}` | `{undo_depth, next_undo, undo: [{label}]}` | Get undo/redo history |
| `daw.group_regions` | none | `{status: "gui_only"}` | Group regions (GUI only) |
| `daw.ungroup_regions` | none | `{status: "gui_only"}` | Ungroup regions (GUI only) |

---

## Events (DAW to Plugin)

These events are broadcast as JSON-RPC notifications (no `id`) to all connected plugin clients.

### Core Events (from `dawflow_plugin_host.cc`)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.transport.changed` | `{playing, recording, position}` | Transport state changed |
| `daw.routes.added` | `{routes: [{id, name}]}` | New tracks/buses added |
| `daw.session.dirty_changed` | `{dirty}` | Session dirty state changed |
| `daw.record.changed` | `{recording}` | Record state changed |

### Extended Events (from `dawflow_commands_medium.cc`)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.routes.removed_from_group` | `{route_id, route_name}` | Track removed from route group |
| `daw.route.added` | `{route_id, route_name}` | New route added (duplicate of core) |
| `daw.region.added` | `{region_id, region_name}` | New region created |
| `daw.marker.added` | `{name, start, is_mark}` | Marker added |
| `daw.marker.removed` | `{name}` | Marker removed |
| `daw.marker.changed` | `{name, start}` | Marker name/position changed |
| `daw.tempo.changed` | `{bpm}` | Tempo map changed |
| `daw.plugin.changed` | `{route_id, route_name}` | Plugin chain changed on a route |
