# DAWFLOW Core IPC API Reference

Complete documentation for every IPC command handler in the two core command files:

- `engine/libs/ardour/dawflow_plugin_host.cc` — 35 commands
- `engine/libs/ardour/dawflow_plugin_host_extended.cc` — 54 commands

**Total: 89 commands** across these two files.

All commands are invoked via JSON-RPC 2.0 over IPC:
```
POST http://localhost:19100/api/command
{"method": "daw.xxx", "params": {...}}
```

All commands dispatched through the generic handler run on the GTK main thread via `signal_idle` (30-second timeout). Commands noted as "fire-and-forget" queue work on the GTK main thread and return immediately with `{"success": true, "status": "queued"}`.

---

## Table of Contents

- [Session](#session)
- [Transport](#transport)
- [Track Management](#track-management)
- [Track Properties](#track-properties)
- [Plugin Management](#plugin-management)
- [Plugin Editor & Presets](#plugin-editor--presets)
- [Routing](#routing)
- [I/O Routing](#io-routing)
- [Markers](#markers)
- [Marker Management (by ID)](#marker-management-by-id)
- [Undo / Redo](#undo--redo)
- [Route Groups](#route-groups)
- [Route Groups (Extended)](#route-groups-extended)
- [VCA Management](#vca-management)
- [Transport Configuration](#transport-configuration)
- [UI](#ui)

---

## Session

### `daw.get_session_info`

Get basic session information including transport state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Session name |
| `sample_rate` | int | Session sample rate in Hz (e.g. 48000) |
| `playing` | bool | Whether transport is rolling |
| `recording` | bool | Whether session is actively recording |
| `position` | int64 | Current transport position in samples |
| `dirty` | bool | Whether session has unsaved changes |

---

### `daw.get_session_details`

Get comprehensive session information including track/bus counts and undo history depth.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Session name |
| `path` | string | Session directory path |
| `sample_rate` | int | Sample rate in Hz |
| `block_size` | int | Audio engine block size in samples |
| `dirty` | bool | Whether session has unsaved changes |
| `playing` | bool | Whether transport is rolling |
| `recording` | bool | Whether session is actively recording |
| `position` | int64 | Current transport position in samples |
| `loop_enabled` | bool | Whether loop playback is enabled |
| `track_count` | int | Number of tracks in session |
| `bus_count` | int | Number of busses in session |
| `undo_depth` | int | Number of undoable operations |
| `redo_depth` | int | Number of redoable operations |

---

### `daw.get_session_properties`

Get session properties including timecode frame rate and snapshot name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Session name |
| `path` | string | Session directory path |
| `sample_rate` | int | Sample rate in Hz |
| `frame_rate` | double | Timecode frames per second |
| `dirty` | bool | Whether session has unsaved changes |
| `transport_rolling` | bool | Whether transport is rolling |
| `recording` | bool | Whether session is actively recording |
| `position_samples` | int64 | Current transport position in samples |
| `snap_name` | string | Current snapshot name |
| `record_enabled` | bool | Whether global record is enabled (armed) |

---

### `daw.save_session`

Save the current session state to disk.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Side effects:** Writes session file to disk. Clears dirty flag.

---

### `daw.snapshot_session`

Save a named snapshot of the current session state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | no | `"<snap_name>-snapshot"` | Snapshot name |
| `switch_to` | bool | no | `false` | Whether to switch to the new snapshot after saving |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `snapshot_name` | string | Name of the created snapshot |

**Side effects:** Creates a new session snapshot file on disk.

---

## Transport

### `daw.transport_play`

Start transport playback at normal speed (1.0x).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

---

### `daw.transport_stop`

Stop transport playback.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

---

### `daw.transport_locate`

Move the transport playhead to a specific sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sample_position` | int64 | yes | | Target position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

---

### `daw.get_transport_state`

Get the current transport state (play/record/position).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playing` | bool | Whether transport is rolling |
| `recording` | bool | Whether session is actively recording |
| `position` | int64 | Current transport position in samples |

---

### `daw.get_transport_state_full`

Get comprehensive transport state including loop/punch ranges and session config flags.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playing` | bool | Whether transport is rolling |
| `recording` | bool | Whether session is actively recording |
| `record_enabled` | bool | Whether global record is armed |
| `position_samples` | int64 | Current transport position in samples |
| `speed` | double | Current transport speed (1.0 = normal) |
| `sample_rate` | int | Session sample rate in Hz |
| `loop_start` | int64 | Loop start position in samples (if loop location exists) |
| `loop_end` | int64 | Loop end position in samples (if loop location exists) |
| `loop_enabled` | bool | Whether loop playback is enabled (if loop location exists) |
| `punch_start` | int64 | Punch-in position in samples (if punch location exists) |
| `punch_end` | int64 | Punch-out position in samples (if punch location exists) |
| `punch_in` | bool | Whether punch-in is enabled (if punch location exists) |
| `punch_out` | bool | Whether punch-out is enabled (if punch location exists) |
| `auto_input` | bool | Whether auto-input monitoring is enabled |
| `auto_play` | bool | Whether auto-play is enabled |
| `auto_return` | bool | Whether auto-return is enabled |
| `click_enabled` | bool | Whether the metronome click is enabled |

---

### `daw.set_tempo`

Set the session tempo at beat 0. Replaces the initial tempo point.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bpm` | double | yes | | Tempo in beats per minute |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `bpm` | double | The tempo that was set |

**Side effects:** Modifies the tempo map. Broadcasts `daw.tempo.map_changed`.

---

### `daw.set_time_signature`

Set the session time signature at beat 0. Replaces the initial meter.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `numerator` | int | yes | | Time signature numerator (e.g. 4) |
| `denominator` | int | yes | | Time signature denominator (e.g. 4) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `numerator` | int | The numerator that was set |
| `denominator` | int | The denominator that was set |

**Side effects:** Modifies the tempo map. Broadcasts `daw.tempo.map_changed`.

---

### `daw.set_loop_range`

Set the auto-loop range start and end positions.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_sample` | int64 | yes | | Loop start position in samples |
| `end_sample` | int64 | yes | | Loop end position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `start_sample` | int64 | The start position that was set |
| `end_sample` | int64 | The end position that was set |

**Throws:** Error if no auto-loop location is defined in the session.

---

### `daw.set_punch_range`

Set the auto-punch range start and end positions.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_sample` | int64 | yes | | Punch start position in samples |
| `end_sample` | int64 | yes | | Punch end position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `start_sample` | int64 | The start position that was set |
| `end_sample` | int64 | The end position that was set |

**Throws:** Error if no auto-punch location is defined in the session.

---

### `daw.toggle_loop`

Toggle loop playback on or off.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `looping` | bool | The new loop state after toggling |

---

### `daw.set_playback_speed`

Set the transport playback speed.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `speed` | double | yes | | Playback speed multiplier (0.5 = half speed, 1.0 = normal, 2.0 = double) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `speed` | double | The speed that was set |

---

### `daw.toggle_record`

Toggle global session record enable on or off.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `recording` | bool | The new record-enabled state after toggling |

**Side effects:** Broadcasts `daw.record.changed`.

---

### `daw.record_arm_all`

Arm or disarm all tracks for recording.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `arm` | bool | no | `true` | Whether to arm (`true`) or disarm (`false`) all tracks |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `armed` | bool | Whether tracks were armed or disarmed |

**Side effects:** Broadcasts `daw.record.armed_changed`.

---

### `daw.transport_goto_start`

Jump the transport to the start of the session (sample 0).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `position` | int | Always `0` |

---

### `daw.transport_goto_end`

Jump the transport to the end of the session.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `position` | int64 | The session end position in samples |

---

## Transport Configuration

### `daw.set_auto_input`

Enable or disable auto-input monitoring.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Whether auto-input is enabled |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Side effects:** Broadcasts `daw.session.config_changed` with `parameter: "auto-input"`.

---

### `daw.set_auto_play`

Enable or disable auto-play (transport starts on locate).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Whether auto-play is enabled |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Side effects:** Broadcasts `daw.session.config_changed`.

---

### `daw.set_auto_return`

Enable or disable auto-return (transport returns to start position after stop).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Whether auto-return is enabled |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Side effects:** Broadcasts `daw.session.config_changed`.

---

### `daw.set_loop_enabled`

Enable or disable loop playback (non-toggle version).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Whether loop playback is enabled |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

---

### `daw.set_punch_in`

Enable or disable punch-in recording.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Whether punch-in is enabled |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Side effects:** Broadcasts `daw.session.config_changed`.

---

### `daw.set_punch_out`

Enable or disable punch-out recording.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Whether punch-out is enabled |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Side effects:** Broadcasts `daw.session.config_changed`.

---

## Track Management

### `daw.get_tracks`

Get all routes (tracks, busses, master, monitor) with their current state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** `object[]` — Array of track objects (returned directly, not wrapped in a result key):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Route UUID |
| `name` | string | Route display name |
| `type` | string | One of `"audio"`, `"midi"`, `"bus"` |
| `gain_db` | double | Current fader gain in dB (uses `accurate_coefficient_to_dB`) |
| `muted` | bool | Whether track is muted |
| `soloed` | bool | Whether track is soloed |
| `record_enabled` | bool | Whether track is armed for recording (always `false` for busses) |
| `color` | string | Track color as 8-character RRGGBBAA hex string (e.g. `"ff0000ff"`) |

---

### `daw.get_track_details`

Get detailed information about a single track including its plugin chain.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Route UUID |
| `name` | string | Route display name |
| `gain_db` | double | Current fader gain in dB |
| `muted` | bool | Whether track is muted |
| `soloed` | bool | Whether track is soloed |
| `active` | bool | Whether track is active |
| `comment` | string | Track comment text |
| `color` | string | Track color as RRGGBBAA hex string (no zero-padding to 8 chars) |
| `plugins` | object[] | Array of plugin objects on this track |
| `plugins[].id` | string | Processor UUID |
| `plugins[].name` | string | Plugin display name |
| `plugins[].enabled` | bool | Whether plugin is enabled (not bypassed) |
| `plugins[].index` | int | Plugin instance count |

**Returns `{"error": "track not found"}` if track_id is invalid.**

---

### `daw.add_audio_track`

Create a new audio track. Fire-and-forget (queued on GTK main thread).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | no | `"Audio"` | Track name |
| `channels` | int | no | `2` | Number of input and output channels |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.routes.added` when the track is created on the main thread.

---

### `daw.add_midi_track`

Create a new MIDI track (1 MIDI input, 2 audio outputs). Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | no | `"MIDI"` | Track name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.routes.added`.

---

### `daw.add_bus`

Create a new audio bus. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | no | `"Bus"` | Bus name |
| `channels` | int | no | `2` | Number of input and output channels |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.routes.added`.

---

### `daw.add_track_with_color`

Create a new track, MIDI track, or bus with an optional color. Runs synchronously (not fire-and-forget).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | no | `"audio"` | Track type: `"audio"`, `"midi"`, or `"bus"` |
| `name` | string | no | `""` | Track name (defaults to `"Audio"`, `"MIDI"`, or `"Bus"` based on type) |
| `channels` | int | no | `2` | Number of channels (for audio and bus types) |
| `color` | string | no | `""` | Track color as RRGGBBAA hex string (e.g. `"FF0000FF"` for red). Empty = no color set. |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `track_id` | string | UUID of the created route |
| `name` | string | Actual name assigned to the track |

**Returns `{"error": "failed to create track"}` on failure.**

**Side effects:** Broadcasts `daw.routes.added`. Sets presentation color if `color` is provided.

---

### `daw.remove_track`

Remove a track or bus from the session. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID to remove |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Marks session dirty. Route is removed asynchronously on the main thread.

---

### `daw.duplicate_track`

Duplicate a track by copying its XML state and creating a new route from it. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID to duplicate |
| `name` | string | no | `"<original_name> (copy)"` | Name for the duplicated track |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.routes.added` when the duplicate is created.

---

## Track Properties

### `daw.set_track_gain`

Set the fader gain of a track in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `gain_db` | double | yes | | Gain in dB (e.g. 0.0 = unity, -inf = silence, +6.0 = max). Internally converted via `dB_to_coefficient`. |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

**Throws:** Error if track not found or track has no gain control.

---

### `daw.set_track_mute`

Set the mute state of a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `muted` | bool | yes | | Whether track should be muted |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

**Throws:** Error if track not found or track has no mute control.

---

### `daw.set_track_solo`

Set the solo state of a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `soloed` | bool | yes | | Whether track should be soloed |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

**Throws:** Error if track not found or track has no solo control.
**Side effects:** Broadcasts `daw.mix.solo_changed` and potentially `daw.mix.solo_active`.

---

### `daw.rename_track`

Rename a track. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `name` | string | yes | | New track name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.route.property_changed`.

---

### `daw.set_track_color`

Set the display color of a track. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `color` | string | yes | | Color as RRGGBBAA hex string (e.g. `"FF0000FF"` for opaque red) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.route.property_changed`.

---

### `daw.set_track_comment`

Set the comment/notes text for a track. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `comment` | string | yes | | Comment text |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.route.comment_changed`.

---

### `daw.set_track_record`

Arm or disarm a single track for recording. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID (must be a Track, not a Bus) |
| `enabled` | bool | yes | | Whether to arm (`true`) or disarm (`false`) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.record.armed_changed` and `daw.route.record_enable_changed`.

---

### `daw.set_track_pan`

Set the stereo pan position of a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `pan` | double | yes | | Pan position: 0.0 = hard left, 0.5 = center, 1.0 = hard right |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `pan` | double | The pan value that was set |

**Throws:** Error if track not found or track has no pan control.

---

### `daw.set_track_trim`

Set the trim level of a track in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `trim_db` | double | yes | | Trim level in dB. Internally converted via `dB_to_coefficient`. |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `trim_db` | double | The trim value that was set |

**Throws:** Error if track not found or track has no trim control.

---

## Plugin Management

### `daw.get_available_plugins`

List all available plugins from all plugin formats (LV2, AudioUnit, VST3, VST, LADSPA, Lua).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `plugins` | object[] | Array of plugin info objects |
| `plugins[].name` | string | Plugin display name |
| `plugins[].type` | string | Plugin format: `"LV2"`, `"AudioUnit"`, `"VST3"`, `"VST"`, `"LADSPA"`, `"Lua"` |
| `plugins[].category` | string | Plugin category (e.g. `"Dynamics"`, `"EQ"`) |
| `plugins[].creator` | string | Plugin creator/vendor name |
| `plugins[].unique_id` | string | Plugin unique identifier |
| `count` | int | Total number of available plugins |

---

### `daw.get_track_plugins`

List all plugin inserts on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `plugins` | object[] | Array of plugin objects |
| `plugins[].processor_id` | string | Processor UUID (use for subsequent plugin commands) |
| `plugins[].name` | string | Plugin display name |
| `plugins[].enabled` | bool | Whether plugin is enabled (not bypassed) |
| `plugins[].index` | int | Processor index in the signal chain |

**Returns `{"error": "track not found"}` if track_id is invalid.**

---

### `daw.load_plugin`

Load a plugin onto a track by name. Inserts at PreFader position. Fire-and-forget. Searches all plugin formats in order: LV2 > AudioUnit > VST3 > VST > LADSPA > Lua.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `plugin_name` | string | yes | | Exact plugin name to search for (must match `PluginInfo::name` exactly) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.route.processors_changed` when the plugin is loaded.

---

### `daw.remove_plugin`

Remove a plugin from a track by processor ID. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `processor_id` | string | yes | | Processor UUID (from `daw.get_track_plugins`) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

**Side effects:** Broadcasts `daw.route.processors_changed`.

---

### `daw.get_plugin_parameters`

Get all parameters of a plugin insert, including current values and ranges.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `processor_id` | string | yes | | Processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `parameters` | object[] | Array of parameter objects |
| `parameters[].index` | int | Parameter port index (use for `daw.set_plugin_parameter`) |
| `parameters[].name` | string | Parameter label |
| `parameters[].value` | double | Current parameter value |
| `parameters[].min` | double | Minimum allowed value |
| `parameters[].max` | double | Maximum allowed value |
| `parameters[].default` | double | Default (normal) value |

**Returns `{"error": "track not found"}` or `{"error": "plugin not found"}` on failure.**

---

### `daw.set_plugin_parameter`

Set a single plugin parameter value. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `processor_id` | string | yes | | Processor UUID |
| `index` | int | yes | | Parameter port index (from `daw.get_plugin_parameters`) |
| `value` | double | yes | | New parameter value (must be within min/max range) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

---

### `daw.set_plugin_enabled`

Enable or bypass a plugin. Fire-and-forget.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `processor_id` | string | yes | | Processor UUID |
| `enabled` | bool | yes | | `true` to enable, `false` to bypass |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `status` | string | Always `"queued"` |

---

## Plugin Editor & Presets

### `daw.plugin.open_editor`

Get full plugin parameter data for rendering a generic plugin editor in the React UI. Includes parameter metadata (toggled, integer) beyond what `daw.get_plugin_parameters` provides.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `processor_id` | string | yes | | Processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `has_editor` | bool | Whether the plugin has a native GUI editor |
| `name` | string | Plugin display name |
| `track_id` | string | Route UUID (echoed back) |
| `processor_id` | string | Processor UUID (echoed back) |
| `editor_type` | string | Always `"generic"` (React UI renders a generic editor) |
| `parameter_count` | int | Number of controllable parameters |
| `parameters` | object[] | Array of parameter objects |
| `parameters[].index` | int | Parameter port index |
| `parameters[].name` | string | Parameter label |
| `parameters[].value` | double | Current parameter value |
| `parameters[].min` | double | Minimum allowed value |
| `parameters[].max` | double | Maximum allowed value |
| `parameters[].default_value` | double | Default (normal) value |
| `parameters[].is_toggled` | bool | Whether parameter is a toggle (on/off) |
| `parameters[].is_integer` | bool | Whether parameter accepts only integer values |

**Returns `{"error": "track not found"}` or `{"error": "plugin not found"}` on failure.**

---

### `daw.plugin.close_editor`

Acknowledge that a plugin editor panel was closed. Currently a no-op since the React UI manages its own editor panels.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

---

### `daw.plugin.list_presets`

List all available presets for a plugin, including factory and user presets.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `processor_id` | string | yes | | Processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `presets` | object[] | Array of preset objects |
| `presets[].uri` | string | Preset URI (unique identifier) |
| `presets[].label` | string | Preset display name |
| `presets[].user` | bool | Whether this is a user-saved preset |
| `count` | int | Total number of presets |
| `current_preset` | string | Label of the currently loaded preset (empty if none) |

**Returns `{"error": "track not found"}` or `{"error": "plugin not found"}` on failure.**

---

### `daw.plugin.load_preset`

Load a preset onto a plugin by URI or label. Searches the preset list for an exact match on either URI or label.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `processor_id` | string | yes | | Processor UUID |
| `preset_uri` | string | yes | | Preset URI or label to load |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` if preset was loaded |
| `loaded_preset` | string | Label of the loaded preset |

**Returns `{"error": "track not found"}`, `{"error": "plugin not found"}`, `{"error": "preset not found: ..."}`, or `{"error": "failed to load preset: ..."}` on failure.**

---

## Routing

### `daw.set_track_input`

Connect all input ports of a track to a single named source port. Disconnects all existing input connections first.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `port` | string | yes | | Source port name to connect (e.g. `"system:capture_1"`) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Throws:** Error if track not found or track has no input IO.
**Side effects:** Broadcasts `daw.route.io_changed`.

---

### `daw.set_track_output`

Connect all output ports of a track to a single named destination port. Disconnects all existing output connections first.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `port` | string | yes | | Destination port name to connect (e.g. `"system:playback_1"`) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Throws:** Error if track not found or track has no output IO.
**Side effects:** Broadcasts `daw.route.io_changed`.

---

### `daw.add_send`

Add an aux send from a track to a target bus. Inserted at PreFader position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Source route UUID |
| `target_bus_id` | string | yes | | Target bus route UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `send_id` | string | UUID of the created send processor |

**Throws:** Error if source track or target bus not found.
**Side effects:** Broadcasts `daw.route.processors_changed`.

---

## I/O Routing

### `daw.get_available_audio_ports`

List physical audio input or output ports from the audio engine.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `input` | bool | no | `true` | `true` for physical inputs, `false` for physical outputs |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ports` | string[] | Array of port names (e.g. `["system:capture_1", "system:capture_2"]`) |
| `count` | int | Number of ports |

---

### `daw.get_track_io`

Get a track's audio input and output port connections.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `inputs` | object[] | Array of input port objects |
| `inputs[].name` | string | Input port name |
| `inputs[].connections` | string[] | Array of connected source port names |
| `outputs` | object[] | Array of output port objects |
| `outputs[].name` | string | Output port name |
| `outputs[].connections` | string[] | Array of connected destination port names |

**Returns `{"error": "track not found"}` if track_id is invalid.**

---

### `daw.connect_track_input`

Connect a specific physical port to a track input channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `source_port` | string | yes | | Source port name (e.g. `"system:capture_1"`) |
| `channel` | int | no | `0` | Input channel index (0-based) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "track not found"}` or `{"error": "channel not found"}` on failure.**
**Side effects:** Broadcasts `daw.route.io_changed`.

---

### `daw.disconnect_track_input`

Disconnect a track input channel or all input channels.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `channel` | int | no | `-1` | Input channel index (0-based). `-1` or omitted = disconnect all inputs. |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "track not found"}` on failure.**
**Side effects:** Broadcasts `daw.route.io_changed`.

---

### `daw.connect_track_output`

Connect a specific track output channel to a destination port.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `dest_port` | string | yes | | Destination port name (e.g. `"system:playback_1"`) |
| `channel` | int | no | `0` | Output channel index (0-based) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "track not found"}` or `{"error": "channel not found"}` on failure.**
**Side effects:** Broadcasts `daw.route.io_changed`.

---

## Markers

### `daw.add_marker`

Add a named marker at a given position or at the current transport position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | yes | | Marker name |
| `position` | int64 | no | Current transport position | Position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `name` | string | Marker name |
| `position` | int64 | Marker position in samples |

**Side effects:** Broadcasts `daw.locations.added`.

---

### `daw.get_markers`

List all markers and range markers in the session.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `markers` | object[] | Array of marker objects |
| `markers[].name` | string | Marker name |
| `markers[].start` | int64 | Start position in samples |
| `markers[].end` | int64 | End position in samples (same as start for point markers) |
| `markers[].is_mark` | bool | Whether this is a point marker |
| `markers[].is_range` | bool | Whether this is a range marker |

---

### `daw.remove_marker`

Remove a marker by its name. Removes the first marker found with the given name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | yes | | Marker name to remove |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` if marker was found and removed |

**Throws:** Error `"Marker not found: <name>"` if no marker with that name exists.
**Side effects:** Broadcasts `daw.locations.removed`.

---

## Marker Management (by ID)

### `daw.add_location_marker`

Add a named marker at a specific sample position. Returns the location ID for subsequent operations.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | no | `"Marker"` | Marker name |
| `position_samples` | int64 | yes | | Position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `location_id` | string | UUID of the created location |
| `name` | string | Marker name |

**Side effects:** Broadcasts `daw.locations.added`. Triggers undo snapshot.

---

### `daw.remove_location_marker`

Remove a marker by its location UUID.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `location_id` | string | yes | | Location UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` if marker was found and removed |

**Returns `{"error": "marker not found"}` if location_id is invalid.**
**Side effects:** Broadcasts `daw.locations.removed`.

---

### `daw.get_all_markers`

List all locations with full metadata including system locations (loop, punch).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `markers` | object[] | Array of location objects |
| `markers[].id` | string | Location UUID |
| `markers[].name` | string | Location name |
| `markers[].start_samples` | int64 | Start position in samples |
| `markers[].end_samples` | int64 | End position in samples |
| `markers[].is_mark` | bool | Whether this is a point marker |
| `markers[].is_range` | bool | Whether this is a range marker |
| `markers[].is_cd_marker` | bool | Whether this is a CD marker |
| `markers[].is_auto_loop` | bool | Whether this is the auto-loop location |
| `markers[].is_auto_punch` | bool | Whether this is the auto-punch location |
| `markers[].locked` | bool | Whether the location is locked (cannot be moved) |
| `count` | int | Total number of locations |

---

### `daw.update_marker`

Update a marker's name, start position, and/or end position by location UUID. Only provided fields are updated.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `location_id` | string | yes | | Location UUID |
| `name` | string | no | | New marker name |
| `position_samples` | int64 | no | | New start position in samples |
| `end_samples` | int64 | no | | New end position in samples (for range markers) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` if marker was found and updated |

**Returns `{"error": "marker not found"}` if location_id is invalid.**
**Side effects:** Broadcasts `daw.location.start_changed`, `daw.location.end_changed`, and/or `daw.location.name_changed` depending on what was updated.

---

## Undo / Redo

### `daw.undo`

Undo the last N operations.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `count` | int | no | `1` | Number of operations to undo |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `next_undo` | string | Name of the next undoable operation (empty if none) |

**Side effects:** Broadcasts `daw.session.undo_redo_changed`.

---

### `daw.redo`

Redo the last N undone operations.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `count` | int | no | `1` | Number of operations to redo |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `next_redo` | string | Name of the next redoable operation (empty if none) |

**Side effects:** Broadcasts `daw.session.undo_redo_changed`.

---

## Route Groups

### `daw.create_group`

Create a new route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | yes | | Group name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `group_name` | string | Name of the created group |

**Throws:** Error if group creation fails.
**Side effects:** Broadcasts `daw.route_group.added`.

---

### `daw.add_track_to_group`

Add a track or bus to an existing route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `group_name` | string | yes | | Name of the target group |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |

**Throws:** Error if track or group not found.
**Side effects:** Broadcasts `daw.route_group.route_added`.

---

### `daw.get_groups`

List all route groups and their members.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `groups` | object[] | Array of group objects |
| `groups[].name` | string | Group name |
| `groups[].active` | bool | Whether the group is active |
| `groups[].members` | object[] | Array of member route objects |
| `groups[].members[].id` | string | Route UUID |
| `groups[].members[].name` | string | Route display name |

---

## Route Groups (Extended)

### `daw.create_route_group`

Create a new route group. Returns the group ID (more detailed than `daw.create_group`).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | yes | | Group name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `group_id` | string | UUID of the created group |
| `name` | string | Name of the created group |

**Returns `{"error": "failed to create group"}` on failure.**
**Side effects:** Broadcasts `daw.route_group.added`.

---

### `daw.get_route_groups`

List all route groups with full metadata including linked properties and member IDs.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `groups` | object[] | Array of group objects |
| `groups[].id` | string | Group UUID |
| `groups[].name` | string | Group name |
| `groups[].active` | bool | Whether the group is active |
| `groups[].gain` | bool | Whether gain is linked across group members |
| `groups[].mute` | bool | Whether mute is linked across group members |
| `groups[].solo` | bool | Whether solo is linked across group members |
| `groups[].select` | bool | Whether selection is linked across group members |
| `groups[].color` | bool | Whether color is linked across group members |
| `groups[].member_ids` | string[] | Array of member route UUIDs |
| `groups[].member_count` | int | Number of members in the group |
| `count` | int | Total number of groups |

---

### `daw.delete_route_group`

Delete a route group by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | yes | | Name of the group to delete |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "group not found"}` if group name is invalid.**
**Side effects:** Broadcasts `daw.route_group.removed`.

---

### `daw.set_group_active`

Activate or deactivate a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | yes | | Name of the group |
| `active` | bool | yes | | Whether the group should be active |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "group not found"}` if group name is invalid.**
**Side effects:** Broadcasts `daw.route_group.property_changed`.

---

## VCA Management

### `daw.assign_track_to_vca`

Assign a track to a VCA master by VCA name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `vca_name` | string | yes | | VCA master name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "track not found"}` or `{"error": "VCA not found"}` on failure.**

---

### `daw.unassign_track_from_vca`

Remove a track from a VCA master.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Route UUID |
| `vca_name` | string | yes | | VCA master name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "track not found"}` or `{"error": "VCA not found"}` on failure.**

---

### `daw.set_vca_gain`

Set the gain of a VCA master in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `vca_name` | string | yes | | VCA master name |
| `gain_db` | double | yes | | Gain in dB. Internally converted via `dB_to_coefficient`. |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "VCA not found"}` on failure.**

---

### `daw.set_vca_mute`

Mute or unmute a VCA master.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `vca_name` | string | yes | | VCA master name |
| `muted` | bool | yes | | Whether VCA should be muted |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "VCA not found"}` on failure.**

---

### `daw.set_vca_solo`

Solo or unsolo a VCA master.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `vca_name` | string | yes | | VCA master name |
| `soloed` | bool | yes | | Whether VCA should be soloed |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "VCA not found"}` on failure.**

---

### `daw.delete_vca`

Remove a VCA master by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `vca_name` | string | yes | | VCA master name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

**Returns `{"error": "VCA not found"}` on failure.**

---

## UI

### `daw.ui.request_main_webview`

Request that the engine open a full-window WebView panel pointing to the specified URL. Used by plugins to take over the main UI.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | yes | | URL to load in the main WebView panel |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

**Side effects:** Emits the `RequestMainWebView` signal, which the GTK UI handles to create or navigate a WebView panel.

---

### `daw.plugin.register`

Register a plugin client with the plugin host. This command is handled specially (not through the generic handler) because it needs access to the client connection ID.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `plugin_id` | string | yes | | Plugin identifier (from manifest) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always `true` |

**Side effects:** Maps the client connection to the plugin ID, enabling targeted event delivery.

---

## Appendix: Broadcast Events

These are real-time events pushed from the engine to all connected IPC clients (plugins and UI). They are not commands -- they are notifications triggered by session state changes. Documented here for completeness since they originate in the same source file.

### Session Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.transport.changed` | `{playing, recording, position}` | Transport state changed (play/stop/record) |
| `daw.transport.positioned` | `{position_samples, position_seconds}` | Playhead moved (scrub/locate) |
| `daw.transport.looped` | `{position}` | Playhead wrapped at loop end |
| `daw.transport.located` | `{position_samples}` | Transport located to new position |
| `daw.record.changed` | `{recording}` | Record state changed |
| `daw.record.arm_state_changed` | `{recording}` | Global record arm state changed |
| `daw.record.armed_changed` | `{armed_tracks[{id,name}]}` | Per-track record arm changed |
| `daw.record.pass_completed` | `{}` | A recording pass finished |
| `daw.record.capture_cleared` | `{}` | Last capture sources cleared |
| `daw.session.dirty_changed` | `{dirty}` | Session dirty state changed |
| `daw.session.saved` | `{snapshot_name}` | Session was saved |
| `daw.session.loaded` | `{session_name, sample_rate}` | Session finished loading |
| `daw.session.save_underway` | `{}` | Save is in progress |
| `daw.session.save_requested` | `{reason}` | Save was requested |
| `daw.session.state_ready` | `{}` | Session state is ready |
| `daw.session.batch_update_start` | `{}` | Batch update beginning |
| `daw.session.batch_update_end` | `{}` | Batch update ended |
| `daw.session.connections_complete` | `{}` | All I/O connections established |
| `daw.session.config_changed` | `{parameter}` | Session config parameter changed |
| `daw.session.feedback_detected` | `{}` | Routing feedback detected |
| `daw.session.graph_reordered` | `{}` | Route graph reordered |
| `daw.session.audition` | `{active}` | Audition preview started/stopped |
| `daw.session.step_edit_changed` | `{active}` | Step edit mode toggled |
| `daw.session.quantization_changed` | `{}` | Quantize setting changed |
| `daw.session.start_time_changed` | `{start_samples}` | Session start time changed |
| `daw.session.end_time_changed` | `{end_samples}` | Session end time changed |
| `daw.session.latency_updated` | `{playback}` | Latency compensation updated |
| `daw.session.exported` | `{path, format}` | Audio export completed |
| `daw.session.lua_scripts_changed` | `{}` | Lua scripts changed |
| `daw.session.io_plugins_changed` | `{}` | IO plugins changed |
| `daw.session.mtc_ltc_port_changed` | `{}` | MTC/LTC input port changed |
| `daw.session.bundle_changed` | `{}` | I/O bundle added or removed |
| `daw.session.undo_redo_changed` | `{undo_depth, redo_depth, next_undo, next_redo}` | Undo/redo history changed |
| `daw.session.undo_redo_begin` | `{}` | Undo/redo operation starting |
| `daw.session.undo_redo_end` | `{undo_depth, redo_depth}` | Undo/redo operation completed |
| `daw.session.after_connect` | `{}` | All initial connections complete |
| `daw.session.route_templates_changed` | `{}` | Route templates changed |
| `daw.session.dialog` | `{message}` | Session dialog request |
| `daw.session.quit` | `{}` | Application quit requested |
| `daw.session.sample_rate_mismatch` | `{session_rate, file_rate}` | Sample rate mismatch |

### Route Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.routes.added` | `{routes[{id,name}]}` | New routes added to session |
| `daw.routes.instrument_added` | `{routes[{id,name}]}` | Instrument routes added |
| `daw.routes.reconnected` | `{}` | All routes reconnected |
| `daw.routes.removed_from_group` | `{route_id, route_name}` | Route removed from group |
| `daw.route.processors_changed` | `{route_id, route_name}` | Processor chain changed |
| `daw.route.property_changed` | `{route_id, route_name}` | Route property changed (name, color, etc.) |
| `daw.route.active_changed` | `{route_id, route_name, active}` | Route active state changed |
| `daw.route.comment_changed` | `{route_id, route_name, comment}` | Route comment changed |
| `daw.route.meter_changed` | `{route_id, route_name}` | Route metering changed |
| `daw.route.io_changed` | `{route_id, route_name}` | Route I/O connections changed |
| `daw.route.latency_changed` | `{route_id, route_name}` | Processor latency changed |
| `daw.route.track_number_changed` | `{route_id, route_name}` | Track number changed |
| `daw.route.selected_changed` | `{route_id, route_name}` | Route selection changed |
| `daw.route.record_enable_changed` | `{route_id, route_name}` | Track record enable changed |
| `daw.route.denormal_protection_changed` | `{route_id, route_name}` | Denormal protection changed |
| `daw.route.fan_out` | `{route_id, route_name}` | Route fan-out requested |

### Track Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.track.freeze_changed` | `{route_id, route_name}` | Track freeze state changed |
| `daw.track.playlist_changed` | `{route_id, route_name}` | Track's active playlist changed |
| `daw.track.playlist_added` | `{route_id, route_name}` | New playlist added to track |
| `daw.track.speed_changed` | `{route_id, route_name}` | Track speed changed |
| `daw.track.channel_count_changed` | `{route_id, route_name}` | Track channel count changed |
| `daw.track.alignment_changed` | `{route_id, route_name}` | Track alignment style changed |

### Playlist Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.playlist.contents_changed` | `{playlist_name}` | Playlist contents changed |
| `daw.playlist.region_added` | `{playlist_name, region_id, region_name}` | Region added to playlist |
| `daw.playlist.region_removed` | `{playlist_name, region_id, region_name}` | Region removed from playlist |
| `daw.playlist.layering_changed` | `{playlist_name}` | Playlist layering changed |
| `daw.playlist.name_changed` | `{playlist_name}` | Playlist renamed |

### Mix Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.mix.solo_active` | `{solo_active}` | Global solo state changed |
| `daw.mix.solo_changed` | `{}` | A track's solo state changed |
| `daw.mix.mute_changed` | `{}` | Global mute state changed |
| `daw.mix.isolated_changed` | `{}` | Solo isolate state changed |
| `daw.mix.monitor_changed` | `{}` | Monitor section state changed |
| `daw.mix.monitor_bus_changed` | `{}` | Monitor bus added or removed |
| `daw.mix.surround_master_changed` | `{}` | Surround master bus changed |
| `daw.mix.surround_object_count_changed` | `{object_count}` | Surround object count changed |
| `daw.mix.fb_sends_changed` | `{}` | Foldback sends changed |

### Location Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.locations.added` | `{name, start_samples, is_mark}` | Location added |
| `daw.locations.removed` | `{name}` | Location removed |
| `daw.locations.changed` | `{}` | Locations changed (bulk) |
| `daw.locations.loop_changed` | `{name, start_samples, end_samples}` | Loop location changed |
| `daw.locations.punch_changed` | `{name, start_samples, end_samples}` | Punch location changed |
| `daw.locations.modified` | `{}` | Locations modified in bulk |
| `daw.locations.punch_loop_constraint_changed` | `{}` | Punch/loop constraint changed |
| `daw.locations.current_changed` | `{name, start_samples, is_mark}` | Current location changed |
| `daw.location.name_changed` | `{name, start_samples}` | A location's name changed |
| `daw.location.start_changed` | `{name, start_samples}` | A location's start changed |
| `daw.location.end_changed` | `{name, end_samples}` | A location's end changed |
| `daw.location.flags_changed` | `{name, is_mark}` | A location's flags changed |
| `daw.location.lock_changed` | `{name, locked}` | A location's lock state changed |
| `daw.location.cue_changed` | `{name}` | A location's cue changed |

### Engine Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.engine.xrun` | `{xrun_count}` | Audio buffer underrun (session-level) |
| `daw.engine.xrun_detected` | `{}` | Audio buffer underrun (engine-level) |
| `daw.engine.running` | `{running: true}` | Audio engine started |
| `daw.engine.stopped` | `{running: false}` | Audio engine stopped |
| `daw.engine.sample_rate_changed` | `{sample_rate}` | Sample rate changed |
| `daw.engine.buffer_size_changed` | `{buffer_size}` | Buffer size changed |
| `daw.engine.device_error` | `{}` | Audio device error |
| `daw.engine.device_list_changed` | `{}` | Available devices changed |
| `daw.engine.device_reset_started` | `{}` | Device reset started |
| `daw.engine.device_reset_finished` | `{}` | Device reset finished |
| `daw.engine.halted` | `{reason}` | Engine halted due to error |
| `daw.engine.became_silent` | `{}` | Engine went silent |
| `daw.engine.freewheel` | `{nframes}` | Engine freewheel mode |

### Port Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.ports.registered_or_unregistered` | `{}` | Port added or removed |
| `daw.ports.connected_or_disconnected` | `{port1, port2, connected}` | Port connection changed |
| `daw.ports.midi_selection_changed` | `{}` | MIDI selection ports changed |
| `daw.ports.midi_info_changed` | `{}` | MIDI port info changed |
| `daw.ports.graph_reordered` | `{}` | Port graph reordered |
| `daw.ports.physical_input_changed` | `{type, added, count, ports[]}` | Physical input config changed |
| `daw.ports.pretty_name_changed` | `{port_name}` | Port display name changed |

### Route Group Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.route_group.property_changed` | `{group_name}` | Group property changed |
| `daw.route_group.route_added` | `{group_name, route_id, route_name}` | Route added to group |
| `daw.route_group.added` | `{group_name}` | New group created |
| `daw.route_group.removed` | `{}` | Group removed |
| `daw.route_group.reordered` | `{}` | Groups reordered |

### Tempo Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.tempo.map_changed` | `{}` | Tempo/meter map changed |

### Region Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.regions.property_changed` | `{region_count}` | Region properties changed in bulk |

### VCA Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.vca.added` | `{vcas[{id, name}]}` | VCA strip(s) added |

### Plugin Manager Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.plugins.list_changed` | `{}` | Available plugin list changed |
| `daw.plugins.stats_changed` | `{}` | Plugin scan statistics changed |
| `daw.plugins.status_changed` | `{plugin_id, status}` | Individual plugin status changed |
| `daw.plugins.tag_changed` | `{plugin_id, tag}` | Plugin tag changed |

### Source Events

| Event | Payload | Description |
|-------|---------|-------------|
| `daw.source.added` | `{source_name}` | Audio/MIDI source added |
| `daw.source.removed` | `{source_name}` | Audio/MIDI source removed |
