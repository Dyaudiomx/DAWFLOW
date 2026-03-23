# DAWFLOW Complete IPC API Reference

> **Version:** 2.0 (2026-03-19)
> **Total Commands:** 2,219 unique | **Signal Events:** 124 | **Total:** 2,343 IPC items
> **Transport:** POST http://localhost:19100/api/command
> **Format:** JSON-RPC 2.0 — `{"method": "daw.xxx", "params": {...}}`

## Quick Reference: Common Formats

| Concept | Format | Example |
|---------|--------|---------|
| **Object IDs** | String UUID | `"3847"` |
| **Colors** | RRGGBBAA hex string (8 chars, no #) | `"FF0000FF"` (red) |
| **Positions** | int64 samples from session start | `48000` (1 sec at 48kHz) |
| **Beats** | double quarter notes | `4.0` (1 bar in 4/4) |
| **BBT** | {bars: int, beats: int, ticks: int} | `{bars:1, beats:1, ticks:0}` |
| **Gain (linear)** | double 0.0-2.0 | `1.0` = unity (0dB) |
| **Gain (dB)** | double -inf to +6 | `0.0` = unity, `-6.0` = half |
| **Pan** | double 0.0-1.0 | `0.0`=L, `0.5`=C, `1.0`=R |
| **Fade shapes** | string enum | `"linear"`, `"fast"`, `"slow"`, `"constant_power"`, `"symmetric"` |
| **Automation** | string enum | `"off"`, `"play"`, `"write"`, `"touch"`, `"latch"` |
| **Edit modes** | string enum | `"slide"`, `"lock"`, `"ripple"`, `"ripple_all"` |

## Table of Contents

1. [Core: Session, Transport, Tracks, Plugins](#core)
2. [Editing: Regions, MIDI, Fades, Layers](#editing)
3. [Automation, Metering, Sidechain](#automation)
4. [Critical: Tempo, Punch, Export, Import](#critical)
5. [High: Recording, Mixing, MIDI CC, Navigation](#high)
6. [Medium: Navigation, Export, Selection, Playlists](#medium)
7. [Final: MIDI CC, Utilities, Batch](#final)
8. [Complete: Coverage Gaps](#complete)
9. [Mastering: CD Markers, Macros, Video](#mastering)
10. [Engine Deep: DSP, Ports, Buffers, Latency](#engine-deep)
11. [Analysis: Metering, Loudness, Spectral, Transients](#analysis)
12. [Advanced Editing: Snap, Grid, MIDI Learn, Scenes](#advanced-editing)
13. [Session Deep: XML, Plugin State, Config, Undo](#session-deep)
14. [Tier 1: Session Lifecycle, Freeze, Playlists, Region Editing](#tier1)
15. [Tier 2: Engine/Backend, Ports, Transport Masters, Monitor](#tier2)
16. [Tier 3: Export System, Plugin Manager, Triggers](#tier3)
17. [Tier 4: Surround, Sources, Bundles, Lua, Butler](#tier4)
18. [Triggers: Clip Launcher, Mixer Scenes, Region FX](#triggers)
19. [Sidechain: Routing, Monitoring, Rec-Safe, Phase](#sidechain)
20. [Routing Ext: Sends, Aux, MIDI Clock, MTC, LTC](#routing-ext)
21. [Safety: Validation, Transactions, Guards](#safety)
22. [Simulate: Dry-Run Operations](#simulate)
23. [Editor: Region Processing, Selection, Zoom, Grid](#editor)
24. [Metadata: Session Info, Route Groups, Panner, Mixer Scenes](#metadata)
25. [Creative: Step Sequencer, MIDI Patches, Analysis, DSP](#creative)
26. [Temporal: Tempo Map, Automation Deep, MIDI Sequence](#temporal)
27. [Surfaces: Control Protocols, Offline Processing, AAF](#surfaces)
28. [Signal Events: Engine → UI Push Notifications](#signals)

---


---

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

---

# DAWFLOW IPC API Reference: Editing, Automation, Critical, and High-Priority Commands

Comprehensive documentation for all IPC command handlers in:
- `engine/libs/ardour/dawflow_commands_editing.cc` (58 commands)
- `engine/libs/ardour/dawflow_commands_automation.cc` (67 commands)
- `engine/libs/ardour/dawflow_commands_critical.cc` (48 commands)
- `engine/libs/ardour/dawflow_commands_high.cc` (84 commands)

**Total: 257 commands documented.**

---

## Table of Contents

1. [Editing Commands (dawflow_commands_editing.cc)](#editing-commands)
   - [Region Queries](#region-queries)
   - [Region Manipulation](#region-manipulation)
   - [Region Properties](#region-properties)
   - [Audio Region Operations](#audio-region-operations)
   - [Fade Operations](#fade-operations)
   - [Region Gain](#region-gain)
   - [Region Alignment and Nudging](#region-alignment-and-nudging)
   - [Region Trimming](#region-trimming)
   - [Region Composition](#region-composition)
   - [Layer and Arrangement](#layer-and-arrangement)
   - [Playback Shortcuts](#playback-shortcuts)
   - [Slip and Snap](#slip-and-snap)
   - [Move Region Between Tracks](#move-region-between-tracks)
   - [MIDI Editing (Legacy)](#midi-editing-legacy)
   - [MIDI Note-Level Editing (by ID)](#midi-note-level-editing-by-id)
2. [Automation Commands (dawflow_commands_automation.cc)](#automation-commands)
   - [Automation State](#automation-state)
   - [Selection](#selection)
   - [Metering and Analysis](#metering-and-analysis)
   - [Track Properties](#track-properties)
   - [Metronome](#metronome)
   - [Batch and Macro](#batch-and-macro)
   - [Automation Mode Control](#automation-mode-control)
   - [Automation Point Editing](#automation-point-editing)
   - [Metering Extended](#metering-extended)
   - [Audio Analysis and DSP](#audio-analysis-and-dsp)
   - [Real-Time Meter Streaming](#real-time-meter-streaming)
   - [Sidechain Routing](#sidechain-routing)
   - [Surround and Spatial Audio](#surround-and-spatial-audio)
   - [Step Editing](#step-editing)
   - [Group Automation](#group-automation)
3. [Critical Commands (dawflow_commands_critical.cc)](#critical-commands)
   - [Punch Recording](#punch-recording)
   - [Region Copy and Paste](#region-copy-and-paste)
   - [Time Editing (Ripple)](#time-editing-ripple)
   - [Send Level](#send-level)
   - [Mix State](#mix-state)
   - [MIDI Region Creation](#midi-region-creation)
   - [Range Markers](#range-markers)
   - [Tempo and Time Signature](#tempo-and-time-signature)
   - [Section Operations](#section-operations)
   - [Export (Stubs)](#export-stubs)
   - [Audio Import](#audio-import)
   - [Time Conversion](#time-conversion)
   - [View (Stubs)](#view-stubs)
   - [Audio Device Info](#audio-device-info)
   - [Monitor Section](#monitor-section)
   - [Latency](#latency)
   - [Audio Analysis (Critical)](#audio-analysis-critical)
   - [Selection-Based Operations](#selection-based-operations)
4. [High-Priority Commands (dawflow_commands_high.cc)](#high-priority-commands)
   - [Recording](#recording)
   - [Editing (High)](#editing-high)
   - [Mixing](#mixing)
   - [MIDI (High)](#midi-high)
   - [Plugin Management](#plugin-management)
   - [Project Management](#project-management)
   - [Query Commands](#query-commands)
   - [Session Lifecycle](#session-lifecycle)
   - [Transport Extended](#transport-extended)
   - [Metering (High)](#metering-high)
   - [Region Advanced Operations](#region-advanced-operations)
   - [Zoom and Navigation](#zoom-and-navigation)
   - [MIDI Additions](#midi-additions)
   - [Window and Plugin UI](#window-and-plugin-ui)
   - [Real-Time Recording Data](#real-time-recording-data)

---

## Editing Commands

Source: `engine/libs/ardour/dawflow_commands_editing.cc`

### Region Queries

#### `daw.get_regions`
List all regions on a track's playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:** Array of region objects:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Region UUID |
| `name` | string | Region name |
| `position_samples` | int64 | Position in samples |
| `length_samples` | int64 | Length in samples |
| `start_samples` | int64 | Start offset in samples |
| `muted` | bool | Mute state |
| `locked` | bool | Lock state |
| `layer` | int | Layer index |

---

#### `daw.get_region_info`
Get detailed info for one region, including audio-specific and MIDI-specific fields.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Region UUID |
| `name` | string | Region name |
| `position_samples` | int64 | Position in samples |
| `length_samples` | int64 | Length in samples |
| `start_samples` | int64 | Start offset in samples |
| `muted` | bool | Mute state |
| `locked` | bool | Lock state |
| `layer` | int | Layer index |
| `hidden` | bool | Hidden state |
| `opaque` | bool | Opaque state |
| `type` | string | "audio" or "midi" |
| `gain_db` | double | Audio only: gain in dB |
| `fade_in_active` | bool | Audio only: fade-in active |
| `fade_out_active` | bool | Audio only: fade-out active |
| `envelope_active` | bool | Audio only: envelope active |
| `peak_amplitude` | double | Audio only: peak amplitude (linear) |
| `peak_amplitude_db` | double | Audio only: peak amplitude in dB |
| `note_count` | int | MIDI only: number of notes |

---

#### `daw.get_region_details`
Get detailed region information (subset of get_region_info).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Region UUID |
| `name` | string | Region name |
| `position_samples` | int64 | Position in samples |
| `length_samples` | int64 | Length in samples |
| `start_samples` | int64 | Start offset |
| `muted` | bool | Mute state |
| `locked` | bool | Lock state |
| `opaque` | bool | Opaque state |
| `layer` | int | Layer index |

---

#### `daw.get_all_region_properties`
Get all properties of a region in one call, including audio-specific fade/gain info.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Region UUID |
| `name` | string | Region name |
| `position_samples` | int64 | Position in samples |
| `length_samples` | int64 | Length in samples |
| `start_samples` | int64 | Start offset |
| `muted` | bool | Mute state |
| `locked` | bool | Lock state |
| `opaque` | bool | Opaque state |
| `layer` | int | Layer index |
| `can_move` | bool | Whether region can be moved |
| `type` | string | "audio" or "midi" |
| `scale_amplitude` | double | Audio only: scale amplitude (linear) |
| `fade_in_length` | int64 | Audio only: fade-in length in samples |
| `fade_out_length` | int64 | Audio only: fade-out length in samples |
| `fade_in_active` | bool | Audio only: fade-in active (non-default) |
| `fade_out_active` | bool | Audio only: fade-out active (non-default) |

---

### Region Manipulation

#### `daw.split_region`
Split a region at a sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `position_samples` | int64 | yes | | Split point in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.move_region`
Move a region to a new position on the same track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `position_samples` | int64 | yes | | New position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.delete_region`
Remove a region from a track's playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.rename_region`
Set a region's name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `name` | string | yes | | New name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.mute_region`
Mute or unmute a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `muted` | bool | yes | | Mute state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.lock_region`
Lock or unlock a region's position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `locked` | bool | yes | | Lock state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.duplicate_region`
Duplicate a region, optionally at a specific position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `position_samples` | int64 | no | -1 | Position for the copy (-1 = immediately after original) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `region_id` | string | UUID of the new region |

---

### Region Properties

#### `daw.set_region_locked`
Lock or unlock a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `locked` | bool | yes | | Lock state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_region_muted`
Mute or unmute a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `muted` | bool | yes | | Mute state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_region_opaque`
Set region opacity (opaque regions obscure layers below).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `opaque` | bool | yes | | Opaque state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_region_name`
Set a region's name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `name` | string | yes | | New name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `name` | string | Actual name after set |

---

### Audio Region Operations

#### `daw.bounce_range`
Bounce/consolidate a time range on a track to a new region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `start_samples` | int64 | yes | | Start position in samples |
| `end_samples` | int64 | yes | | End position in samples |
| `name` | string | no | "bounced" | Name for the bounced region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `region_id` | string | UUID of the bounced region |
| `name` | string | Name of the bounced region |

---

#### `daw.strip_silence`
Find silent sections in an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `threshold_db` | double | no | -60.0 | Silence threshold in dB |
| `min_length_samples` | int64 | no | 1000 | Minimum silence length |

**Returns:** Array of silence intervals:

| Field | Type | Description |
|-------|------|-------------|
| `start_samples` | int64 | Silence start |
| `end_samples` | int64 | Silence end |

---

#### `daw.get_audio_peaks`
Get peak amplitude data for a region (waveform data).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `n_peaks` | int | no | 256 | Number of peak values (1-65536) |
| `channel` | int | no | 0 | Audio channel |

**Returns:** Array of peak objects:

| Field | Type | Description |
|-------|------|-------------|
| `min` | double | Minimum amplitude |
| `max` | double | Maximum amplitude |

---

#### `daw.get_region_rms`
Get RMS level of an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `rms` | double | RMS value (linear) |
| `rms_db` | double | RMS value in dB |

---

#### `daw.normalize_region`
Normalize an audio region to a target level.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `target_db` | double | no | 0.0 | Target peak level in dB |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Fade Operations

#### `daw.set_region_fade_in`
Set fade-in length on an audio region and activate it.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `length_samples` | int64 | yes | | Fade-in length in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_region_fade_out`
Set fade-out length on an audio region and activate it.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `length_samples` | int64 | yes | | Fade-out length in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_fade_in_active`
Enable or disable fade-in on an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `active` | bool | yes | | Active state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_fade_out_active`
Enable or disable fade-out on an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `active` | bool | yes | | Active state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Region Gain

#### `daw.set_region_gain`
Set scale amplitude on an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `gain` | double | yes | | Scale amplitude (linear, 1.0 = unity) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.reset_region_gain`
Reset scale amplitude to 1.0 (unity).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.get_region_gain`
Get the scale amplitude of an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `gain` | double | Scale amplitude (linear) |

---

### Region Alignment and Nudging

#### `daw.align_regions_to_position`
Align all (or selected) regions on a track to a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `position_samples` | int64 | yes | | Target position in samples |
| `region_ids` | string[] | no | | Optional list of region UUIDs to align (all if omitted) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.nudge_region_forward`
Nudge a region forward by a given amount.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `amount_samples` | int64 | no | sample_rate (1 second) | Nudge amount in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `new_position` | int64 | New position in samples |

---

#### `daw.nudge_region_backward`
Nudge a region backward by a given amount.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `amount_samples` | int64 | no | sample_rate (1 second) | Nudge amount in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `new_position` | int64 | New position in samples |

---

### Region Trimming

#### `daw.trim_region_start`
Trim the start of a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `position_samples` | int64 | yes | | New start position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.trim_region_end`
Trim the end of a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `position_samples` | int64 | yes | | New end position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.trim_region_to_range`
Trim both start and end of a region to a range.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `start_samples` | int64 | yes | | New start position |
| `end_samples` | int64 | yes | | New end position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Region Composition

#### `daw.combine_regions`
Combine multiple regions into a compound region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_ids` | string[] | yes | | Array of region UUIDs to combine (min 2) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `region_id` | string | UUID of the combined region |

---

#### `daw.uncombine_regions`
Uncombine a compound region back into its constituents.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Compound region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.create_region_from_range`
Bounce a time range to a new region on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `start_samples` | int64 | yes | | Range start |
| `end_samples` | int64 | yes | | Range end |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `region_id` | string | UUID of new region |
| `name` | string | Name of new region |

---

### Layer and Arrangement

#### `daw.raise_region`
Raise a region one layer up.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.lower_region`
Lower a region one layer down.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.raise_region_to_top`
Raise a region to the topmost layer.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.lower_region_to_bottom`
Lower a region to the bottommost layer.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_region_sync_point`
Set a region's sync position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `position_samples` | int64 | yes | | Sync point position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Playback Shortcuts

#### `daw.play_region`
Locate to a region's start and begin playback.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `position` | int64 | Playback start position |

---

#### `daw.play_range`
Locate to a start position and begin playback.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_samples` | int64 | yes | | Start position |
| `end_samples` | int64 | yes | | End position (accepted for completeness) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.loop_region`
Set loop range to a region's bounds and start looping playback.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Slip and Snap

#### `daw.slip_region_content`
Slip the audio/MIDI content within a region by a delta.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `delta_samples` | int64 | yes | | Slip amount in samples (positive = forward) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `new_start` | int64 | New start offset |

---

#### `daw.snap_regions_to_grid_ext`
Snap all regions on a track to a grid.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `grid_samples` | int64 | no | sample_rate/4 | Grid size in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `snapped` | int | Number of regions snapped |

---

### Move Region Between Tracks

#### `daw.move_region_to_track_ext`
Move a region from one track to another.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_track_id` | string | yes | | Source track UUID |
| `dest_track_id` | string | yes | | Destination track UUID |
| `region_id` | string | yes | | Region UUID to move |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### MIDI Editing (Legacy)

#### `daw.get_midi_notes`
Get all MIDI notes in a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |

**Returns:** Array of note objects:

| Field | Type | Description |
|-------|------|-------------|
| `note` | int | MIDI note number (0-127) |
| `velocity` | int | Velocity (0-127) |
| `channel` | int | MIDI channel (0-15) |
| `start_beats` | double | Start time in beats |
| `length_beats` | double | Duration in beats |
| `end_beats` | double | End time in beats |
| `id` | int | Note ID |

---

#### `daw.add_midi_note`
Add a note to a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note` | int | yes | | MIDI note number (0-127) |
| `velocity` | int | yes | | Velocity (0-127) |
| `start_beats` | double | yes | | Start time in beats |
| `length_beats` | double | yes | | Duration in beats |
| `channel` | int | no | 0 | MIDI channel (0-15) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.remove_midi_note`
Remove a note by matching note number, start time, and channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note` | int | yes | | MIDI note number |
| `start_beats` | double | yes | | Start time in beats |
| `channel` | int | no | 0 | MIDI channel |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.quantize_midi`
Quantize all notes in a MIDI region to a grid.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `grid_beats` | double | no | 1.0 | Grid size in beats |
| `strength` | double | no | 1.0 | Quantize strength (0.0-1.0) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.transpose_midi`
Transpose all notes in a MIDI region by semitones.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `semitones` | int | yes | | Semitones to transpose |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.set_midi_velocity`
Set velocity for all notes (or filtered by note range).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `velocity` | int | yes | | New velocity (0-127) |
| `note_min` | int | no | 0 | Minimum note number filter |
| `note_max` | int | no | 127 | Maximum note number filter |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.humanize_midi`
Add random timing and velocity variation to MIDI notes.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `timing_amount` | double | no | 0.05 | Timing variation in beats |
| `velocity_amount` | int | no | 10 | Velocity variation (+/- range) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.get_midi_region_info`
Get MIDI region info including note statistics.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `region_id` | string | Region UUID |
| `name` | string | Region name |
| `position_samples` | int64 | Position |
| `length_samples` | int64 | Length |
| `note_count` | int | Number of notes |
| `lowest_note` | int | Lowest MIDI note |
| `highest_note` | int | Highest MIDI note |
| `earliest_beat` | double | Earliest note start |
| `latest_beat` | double | Latest note end |
| `duration_beats` | double | Total duration in beats |

---

### MIDI Note-Level Editing (by ID)

#### `daw.midi.add_note`
Add a single note to a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note` | int | yes | | MIDI note number |
| `velocity` | int | no | 100 | Velocity |
| `channel` | int | no | 0 | MIDI channel |
| `start_beats` | double | yes | | Start time in beats |
| `length_beats` | double | no | 0.25 | Duration in beats |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `note_id` | int | ID of the new note |

---

#### `daw.midi.delete_note`
Delete a note by its ID.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note_id` | int | yes | | Note ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.midi.move_note`
Move or edit a note by its ID. Accepts any combination of optional change fields.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note_id` | int | yes | | Note ID |
| `new_time_beats` | double | no | | New start time |
| `new_note` | int | no | | New note number |
| `new_velocity` | int | no | | New velocity |
| `new_length_beats` | double | no | | New duration |
| `new_channel` | int | no | | New MIDI channel |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.midi.set_note_velocity`
Set velocity for a single note by ID.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note_id` | int | yes | | Note ID |
| `velocity` | int | yes | | New velocity (0-127) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.midi.quantize`
Quantize all notes in a MIDI region to a grid (improved version with swing).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `grid_beats` | double | no | 0.25 | Grid size in beats (1/16 note) |
| `strength` | double | no | 1.0 | Quantize strength (0.0-1.0) |
| `swing` | double | no | 0.0 | Swing amount (0.0-1.0, accepted but not used) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `notes_quantized` | int | Number of notes moved |

---

#### `daw.midi.transpose`
Transpose all notes in a MIDI region by semitones.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `semitones` | int | yes | | Semitones to transpose |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `notes_transposed` | int | Number of notes transposed |

---

## Automation Commands

Source: `engine/libs/ardour/dawflow_commands_automation.cc`

### Automation State

#### `daw.get_automation_state`
Get the automation state for a parameter on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `parameter` | string | no | "gain" | Parameter name (gain, trim, mute, solo) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `parameter` | string | Parameter name |
| `state` | string | "Off", "Read", "Write", "Touch", or "Latch" |

---

#### `daw.set_automation_state`
Set the automation state for a parameter on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `parameter` | string | no | "gain" | Parameter name |
| `state` | string | yes | | "Off", "Read", "Write", "Touch", or "Latch" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.get_automation_data`
Get all automation points for a parameter.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `parameter` | string | no | "gain" | Parameter name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `parameter` | string | Parameter name |
| `points` | object[] | Array of {time, value} |
| `count` | int | Number of points |

---

#### `daw.add_automation_point`
Add an automation point for a parameter.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `parameter` | string | no | "gain" | Parameter name |
| `time` | int64 | yes | | Time in samples |
| `value` | double | yes | | Automation value |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.clear_automation`
Clear all automation points for a parameter.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `parameter` | string | no | "gain" | Parameter name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.set_all_automation_state`
Set automation state for a parameter across all routes.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `state` | string | yes | | "Off", "Read", "Write", "Touch", or "Latch" |
| `parameter` | string | no | "gain" | Parameter name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `count` | int | Number of routes affected |

---

### Selection

#### `daw.select_track`
Select a track, optionally adding to the current selection.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `add` | bool | no | false | Add to selection (vs. replace) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.deselect_all_tracks`
Deselect all tracks. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.get_selected_tracks`
Get the list of currently selected tracks. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of {id, name} |
| `count` | int | Number of selected tracks |

---

#### `daw.select_all_tracks`
Select all tracks/routes. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `count` | int | Number of tracks selected |

---

### Metering and Analysis

#### `daw.get_track_peak`
Get peak meter level for a track channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `channel` | int | no | 0 | Channel index |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `channel` | int | Channel index |
| `peak_db` | double | Peak level in dB |

---

#### `daw.get_track_rms`
Get K-weighted RMS meter level for a track channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `channel` | int | no | 0 | Channel index |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `channel` | int | Channel index |
| `rms_db` | double | RMS level in dB |

---

#### `daw.get_master_peak`
Get peak meter levels for all master bus channels. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `channels` | object[] | Array of {channel, peak_db} |

---

#### `daw.get_cpu_load`
Get current DSP CPU load. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `cpu_load_percent` | double | DSP load as percentage |

---

#### `daw.set_visible_tracks`
Not available from plugin host (requires GUI). Always throws.

---

#### `daw.get_visible_tracks`
Not available from plugin host (requires GUI). Always throws.

---

### Track Properties

#### `daw.set_track_monitoring`
Set monitoring mode for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `mode` | string | yes | | "auto", "input", "disk", or "cue" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.set_track_active`
Activate or deactivate a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `active` | bool | yes | | Active state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.get_track_input_ports`
List input ports and their connection status.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `ports` | object[] | Array of {name, connected} |

---

#### `daw.get_track_output_ports`
List output ports and their connection status.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `ports` | object[] | Array of {name, connected} |

---

#### `daw.set_track_phase_invert`
Invert phase on a specific channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `channel` | int | no | 0 | Channel index |
| `invert` | bool | yes | | Invert state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.freeze_track`
Freeze a track (render all plugins to audio).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.unfreeze_track`
Unfreeze a frozen track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

### Metronome

#### `daw.toggle_metronome`
Toggle the metronome (click) on or off. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `enabled` | bool | New metronome state |

---

#### `daw.set_metronome_volume`
Set metronome volume.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `gain` | double | yes | | Linear gain (0.0-2.0, 1.0 = unity) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `gain` | double | Actual gain set |

---

#### `daw.toggle_count_in`
Toggle recording count-in. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `enabled` | bool | New count-in state |

---

### Batch and Macro

#### `daw.execute_batch`
Execute multiple commands in sequence.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `commands` | object[] | yes | | Array of {method: string, params: object} |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `results` | object[] | Array of {method, result} or {method, error} |
| `count` | int | Number of commands executed |

---

#### `daw.get_command_list`
Return all available command names, sorted. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `commands` | string[] | Sorted list of command names |
| `count` | int | Total count |

---

### Automation Mode Control

#### `daw.set_automation_mode`
Set gain automation mode for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `mode` | string | yes | | "off", "read", "write", "touch", or "latch" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.get_automation_mode`
Query gain automation mode for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | "off", "read", "write", "touch", or "latch" |

---

#### `daw.set_plugin_automation_mode`
Set automation mode for a specific plugin parameter.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin processor UUID |
| `param_index` | int | yes | | Parameter index |
| `mode` | string | yes | | "off", "read", "write", "touch", or "latch" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.get_automation_data_ext`
Get automation data with mode and pan support.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `control` | string | no | "gain" | Control type: "gain", "pan", or "mute" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `control` | string | Control type |
| `points` | object[] | Array of {time_samples, value} |
| `count` | int | Number of points |
| `mode` | string | Current automation mode |

---

### Automation Point Editing

#### `daw.add_automation_point_ext`
Add automation point with control type support.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `control` | string | no | "gain" | Control type: "gain" or "mute" |
| `time_samples` | int64 | yes | | Time in samples |
| `value` | double | yes | | Automation value |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.delete_automation_point`
Delete the nearest automation point at a given time.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `control` | string | no | "gain" | Control type: "gain" or "mute" |
| `time_samples` | int64 | yes | | Target time in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.clear_automation_ext`
Clear all automation for a control type.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `control` | string | no | "gain" | Control type: "gain" or "mute" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Metering Extended

#### `daw.get_meter_levels`
Get peak levels for all tracks in one call. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of {id, name, channels: [{peak_db}]} |

---

#### `daw.reset_meter_peaks`
Reset all track peak meter holds. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.get_master_meter`
Get master bus meter levels. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `channels` | object[] | Array of {peak_db} |
| `channel_count` | int | Number of channels |

---

### Audio Analysis and DSP

#### `daw.analyze_region_spectrum`
Get high-resolution peak data for spectral analysis.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Audio region UUID |
| `bins` | int | no | 256 | Number of frequency bins |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `peaks` | object[] | Array of {min, max} |
| `peak_count` | int | Number of peaks returned |
| `length_samples` | int64 | Region length |
| `sample_rate` | int | Session sample rate |

---

#### `daw.get_region_peak_amplitude`
Get peak amplitude for an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Audio region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `peak_amplitude` | double | Peak amplitude (linear) |
| `peak_db` | double | Peak amplitude in dB |

---

#### `daw.get_dsp_load_detailed`
Get detailed DSP load with per-track info. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `dsp_load_percent` | double | Overall DSP load |
| `buffer_size` | int | Buffer size in samples |
| `sample_rate` | int | Sample rate |
| `xrun_count` | int | Cumulative xrun count |
| `process_threads` | int | Number of process threads |
| `freewheeling` | bool | Freewheel mode |
| `tracks` | object[] | Array of {id, name, signal_latency, playback_latency, processor_count} |

---

#### `daw.get_audio_connections_map`
Get full audio connection map for all routes. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `routes` | object[] | Array of {id, name, inputs: [{port, connections}], outputs: [{port, connections}]} |

---

#### `daw.get_signal_chain`
Get the full processor chain for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `chain` | object[] | Array of {id, name, display_name, active, latency, type, plugin_name, parameter_count} |
| `count` | int | Number of processors |

---

#### `daw.get_recording_peaks_live`
Get real-time peak data for all currently recording tracks. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `recording` | bool | Whether session is actively recording |
| `position` | int64 | Current transport position |
| `tracks` | object[] | Array of {track_id, track_name, capture_start, captured_samples, peaks: [{min, max}]} |

---

#### `daw.get_all_plugin_latencies`
Get latency for every plugin on every route. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of {track_id, track_name, total_latency, plugins: [{processor_id, name, latency, active}]} |

---

#### `daw.get_io_latency`
Get I/O latency information. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `input_latency` | int64 | Worst input latency (samples) |
| `output_latency` | int64 | Worst output latency (samples) |
| `buffer_size` | int | Buffer size |
| `sample_rate` | int | Sample rate |
| `input_latency_ms` | double | Input latency in ms |
| `output_latency_ms` | double | Output latency in ms |
| `roundtrip_ms` | double | Roundtrip latency in ms |

---

### Real-Time Meter Streaming

#### `daw.get_all_meters`
Get all track meter levels in one call for efficient UI polling. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of {id, channels: [{peak, peak0dB}]} |
| `timestamp` | int64 | Transport position |

---

#### `daw.get_track_meter`
Get meter levels for a single track with peak, peak0dB, and RMS.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `channels` | object[] | Array of {peak_db, peak0dB, rms_db} |

---

#### `daw.get_master_meter_detailed`
Get master bus meter with K-metering and VU. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `channels` | object[] | Array of {peak_db, peak0dB, rms_db, k14, k20, vu} |
| `channel_count` | int | Number of channels |
| `position` | int64 | Transport position |
| `playing` | bool | Whether transport is rolling |

---

### Sidechain Routing

#### `daw.plugin.has_sidechain`
Check if a plugin supports sidechain input.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `has_sidechain` | bool | Plugin has sidechain capability |
| `sidechain_configured` | bool | Sidechain input exists |

---

#### `daw.plugin.enable_sidechain`
Add sidechain input to a plugin.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.plugin.disable_sidechain`
Remove sidechain from a plugin.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.plugin.get_sidechain_ports`
List sidechain port connections.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ports` | object[] | Array of {name, connections: string[]} |

---

### Surround and Spatial Audio

#### `daw.get_surround_master`
Query surround master bus. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `has_surround` | bool | Whether surround master exists |
| `id` | string | Surround master UUID |
| `name` | string | Name |
| `active` | bool | Active state |

---

#### `daw.get_panning_info`
Get panning parameters for a track (azimuth, width, elevation).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `azimuth` | double | Pan position (0.0-1.0) |
| `width` | double | Stereo width |
| `elevation` | double | Elevation |
| `has_width` | bool | Width control available |
| `has_elevation` | bool | Elevation control available |

---

#### `daw.set_panning`
Set panning parameters for a track. All parameters are optional.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `azimuth` | double | no | | Pan position (0.0-1.0) |
| `width` | double | no | | Stereo width |
| `elevation` | double | no | | Elevation |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Step Editing

#### `daw.midi.step_edit_start`
Enable step editing on a MIDI track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | MIDI track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `step_editing` | bool | true |

---

#### `daw.midi.step_edit_stop`
Disable step editing on a MIDI track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | MIDI track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `step_editing` | bool | false |

---

#### `daw.midi.is_step_editing`
Query step editing state for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `step_editing` | bool | Whether step editing is active |

---

### Group Automation

#### `daw.set_group_record`
Enable/disable record-enable for a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | yes | | Route group name |
| `enabled` | bool | yes | | Rec-enable state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_group_monitoring`
Enable/disable monitoring for a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | yes | | Route group name |
| `enabled` | bool | yes | | Monitoring state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.get_group_properties`
Get full property dump of a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | yes | | Route group name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Group name |
| `id` | string | Group UUID |
| `active` | bool | Active state |
| `gain` | bool | Gain-linked |
| `mute` | bool | Mute-linked |
| `solo` | bool | Solo-linked |
| `recenable` | bool | Rec-enable-linked |
| `select` | bool | Selection-linked |
| `color` | bool | Color-linked |
| `monitoring` | bool | Monitoring-linked |
| `relative` | bool | Relative mode |
| `members` | object[] | Array of {id, name} |
| `member_count` | int | Number of members |

---

## Critical Commands

Source: `engine/libs/ardour/dawflow_commands_critical.cc`

### Punch Recording

#### `daw.toggle_punch`
Enable/disable punch-in and/or punch-out recording.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `punch_in` | bool | no | | Set punch-in state (omit to toggle both) |
| `punch_out` | bool | no | | Set punch-out state (omit to toggle both) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `punch_in` | bool | Punch-in state |
| `punch_out` | bool | Punch-out state |
| `punch_start` | int64 | Punch location start (if exists) |
| `punch_end` | int64 | Punch location end (if exists) |

---

### Region Copy and Paste

#### `daw.copy_region`
Clone a region (creates a copy in the region pool).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `cloned_region_id` | string | UUID of the cloned region |
| `name` | string | Name of the clone |

---

#### `daw.paste_region`
Place a region on a track at a specific position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Target track UUID |
| `region_id` | string | yes | | Region UUID to paste |
| `position_samples` | int64 | yes | | Paste position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `region_id` | string | UUID of the pasted copy |
| `name` | string | Region name |
| `position` | int64 | Actual position |

---

### Time Editing (Ripple)

#### `daw.insert_time`
Ripple insert: push everything forward from a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | yes | | Insert position |
| `duration_samples` | int64 | yes | | Duration to insert |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `position` | int64 | Position |
| `duration` | int64 | Duration |

---

#### `daw.remove_time`
Ripple delete: pull everything backward from a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | yes | | Remove position |
| `duration_samples` | int64 | yes | | Duration to remove |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `position` | int64 | Position |
| `duration` | int64 | Duration |

---

### Send Level

#### `daw.set_send_level`
Set send gain on a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `send_index` | int | yes | | Send index |
| `gain_db` | double | yes | | Gain in dB |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `track_id` | string | Track UUID |
| `send_index` | int | Send index |
| `gain_db` | double | Gain set |

---

### Mix State

#### `daw.get_mix_state`
Get everything about the mix in one call. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Full track data (see below) |
| `track_count` | int | Number of tracks |
| `sample_rate` | int | Session sample rate |
| `playing` | bool | Transport rolling |
| `recording` | bool | Actively recording |
| `position` | int64 | Transport position |

Each track object contains: `id`, `name`, `type` (audio/midi/bus), `gain_db`, `pan`, `muted`, `soloed`, `active`, `record_armed`, `color`, `plugins` (array of {id, name, enabled, index}), `sends` (array of {index, name, gain_db, enabled}).

---

### MIDI Region Creation

#### `daw.create_midi_region`
Create an empty MIDI region on a MIDI track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | MIDI track UUID |
| `position_samples` | int64 | yes | | Position |
| `length_samples` | int64 | yes | | Length |
| `name` | string | no | "MIDI Region" | Region name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `region_id` | string | New region UUID |
| `name` | string | Region name |
| `position` | int64 | Position |
| `length` | int64 | Length |

---

### Range Markers

#### `daw.add_range_marker`
Add a named range marker.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_samples` | int64 | yes | | Range start |
| `end_samples` | int64 | yes | | Range end |
| `name` | string | yes | | Marker name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `name` | string | Marker name |
| `start` | int64 | Start position |
| `end` | int64 | End position |

---

### Tempo and Time Signature

#### `daw.add_tempo_change`
Add a tempo change at a position (by samples or BBT).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bpm` | double | yes | | Tempo in BPM (0-999) |
| `note_type` | int | no | 4 | Note type (4 = quarter note) |
| `position_samples` | int64 | no | | Position in samples (use this or bar/beat) |
| `bar` | int | no | | Bar number (use with beat) |
| `beat` | int | no | 1 | Beat number |
| `ticks` | int | no | 0 | Tick offset |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `bpm` | double | Tempo set |
| `note_type` | int | Note type |

---

#### `daw.get_tempo_map`
Get the full tempo map (all tempo and meter points). No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tempos` | object[] | Array of {bpm, note_types_per_minute, note_type, bar, beat, tick} |
| `meters` | object[] | Array of {divisions_per_bar, note_value, bar, beat, tick} |
| `tempo_count` | int | Number of tempo points |
| `meter_count` | int | Number of meter points |

---

### Section Operations

#### `daw.cut_section`
Cut a section (removes and pastes).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_samples` | int64 | yes | | Section start |
| `end_samples` | int64 | yes | | Section end |
| `paste_position_samples` | int64 | no | start | Paste destination |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `start` | int64 | Start |
| `end` | int64 | End |
| `paste_position` | int64 | Paste position |

---

#### `daw.copy_section`
Copy a section (non-destructive).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_samples` | int64 | yes | | Section start |
| `end_samples` | int64 | yes | | Section end |
| `paste_position_samples` | int64 | yes | | Paste destination |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `start` | int64 | Start |
| `end` | int64 | End |
| `paste_position` | int64 | Paste position |

---

#### `daw.delete_section`
Delete a section (ripple delete).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_samples` | int64 | yes | | Section start |
| `end_samples` | int64 | yes | | Section end |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `start` | int64 | Start |
| `end` | int64 | End |

---

#### `daw.insert_section`
Insert blank time at a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | yes | | Insert position |
| `duration_samples` | int64 | yes | | Duration to insert |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `position` | int64 | Position |
| `duration` | int64 | Duration |

---

### Export (Stubs)

#### `daw.export_session`
Export session. Returns guidance (requires GUI). No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "requires_gui" |
| `description` | string | Instructions for exporting |
| `session_name` | string | Current session name |
| `session_path` | string | Current session path |
| `workaround` | string | Command-line export instructions |

---

#### `daw.export_range`
Export a range. Returns guidance (requires GUI). No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "requires_gui" |
| `description` | string | Instructions |
| `session_name` | string | Session name |
| `session_path` | string | Session path |
| `tip` | string | Suggestion to use daw.add_range_marker |

---

### Audio Import

#### `daw.import_audio`
Import an audio file onto a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `filepath` | string | yes | | Path to audio file |
| `track_id` | string | no | "" | Target track UUID (omit to add to source pool only) |
| `position_samples` | int64 | no | 0 | Position on the track |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `region_id` | string | New region UUID |
| `name` | string | Region name |
| `length` | int64 | Audio length in samples |
| `placed_on_track` | string | Track UUID or null |
| `position` | int64 | Position (if placed) |

---

### Time Conversion

#### `daw.position_to_bars_beats`
Convert a sample position to bars/beats/ticks (BBT).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | yes | | Sample position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `bars` | int | Bar number |
| `beats` | int | Beat number |
| `ticks` | int | Tick count |
| `bbt_string` | string | Formatted "bars|beats|ticks" |
| `position_samples` | int64 | Input position |

---

#### `daw.bars_beats_to_position`
Convert bars/beats/ticks to a sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bars` | int | yes | | Bar number |
| `beats` | int | no | 1 | Beat number |
| `ticks` | int | no | 0 | Tick count |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `position_samples` | int64 | Sample position |
| `bars` | int | Bar |
| `beats` | int | Beat |
| `ticks` | int | Ticks |

---

### View (Stubs)

#### `daw.set_zoom_level`
Not available from plugin host. Returns guidance.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "requires_gui" |
| `shortcuts` | object | {zoom_in, zoom_out, zoom_to_session} |

---

#### `daw.zoom_to_session`
Not available from plugin host. Returns guidance. No parameters.

---

#### `daw.scroll_to_position`
Move playhead to a position (editor scroll requires GUI).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | no | | Target position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success (if position provided) |
| `position` | int64 | New playhead position |

---

### Audio Device Info

#### `daw.get_buffer_size`
Get current buffer size and sample rate. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `buffer_size` | int | Buffer size in samples |
| `sample_rate` | int | Sample rate |

---

#### `daw.set_buffer_size`
Change the audio engine buffer size.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `buffer_size` | int | yes | | New buffer size |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Whether change succeeded |
| `buffer_size` | int | Actual buffer size after change |

---

#### `daw.get_available_buffer_sizes`
List buffer sizes supported by the audio backend. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `sizes` | int[] | Available buffer sizes |

---

#### `daw.get_available_sample_rates`
List sample rates supported by the audio backend. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `rates` | int[] | Available sample rates |

---

#### `daw.get_device_name`
Get audio device and backend names. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `device_name` | string | Audio device name |
| `backend_name` | string | Audio backend name |

---

### Monitor Section

#### `daw.monitor.get_state`
Get monitor section state. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `has_monitor` | bool | Monitor section exists |
| `dim_all` | bool | Dim state |
| `mono` | bool | Mono state |

---

#### `daw.monitor.set_dim`
Enable or disable dim.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Dim state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `dim` | bool | Dim state |

---

#### `daw.monitor.set_mono`
Enable or disable mono fold-down.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Mono state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `mono` | bool | Mono state |

---

#### `daw.monitor.set_mute`
Mute or unmute monitor output.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Mute state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Latency

#### `daw.get_plugin_latency`
Get latency introduced by a specific plugin.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Processor UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `latency_samples` | int64 | Plugin latency in samples |

---

#### `daw.get_route_latency`
Get playback and signal latency for a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playback_latency` | int64 | Playback latency (samples) |
| `capture_latency` | int64 | Signal latency (samples) |

---

#### `daw.get_total_latency`
Get latency for all routes. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of {id, name, playback_latency, signal_latency} |

---

#### `daw.get_worst_latency`
Get worst-case input/output latency. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `worst_output_latency` | int64 | Worst output latency (samples) |
| `worst_input_latency` | int64 | Worst input latency (samples) |

---

### Audio Analysis (Critical)

#### `daw.get_region_rms_detailed`
Get peak and RMS amplitude for an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Audio region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `peak_amplitude` | double | Peak amplitude (linear) |
| `rms_amplitude` | double | RMS amplitude (linear) |
| `length_samples` | int64 | Region length |

---

#### `daw.is_freewheeling`
Check if engine is in freewheel mode. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `freewheeling` | bool | Freewheel state |

---

#### `daw.get_xrun_count`
Get cumulative xrun count. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `xrun_count` | int | Cumulative xrun count |

---

### Selection-Based Operations

#### `daw.set_loop_from_region`
Set loop range to match a region's bounds.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.set_punch_from_region`
Set punch range to match a region's bounds.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.region_fill_track`
Fill a track with copies of a region up to an end point.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID to copy |
| `end_samples` | int64 | no | session end | Fill up to this position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `copies_created` | int | Number of copies made |

---

#### `daw.insert_silence`
Insert blank time at a position across all tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | yes | | Insert position |
| `duration_samples` | int64 | yes | | Duration to insert |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.remove_time_ripple`
Remove a time range and pull later regions back.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_samples` | int64 | yes | | Range start |
| `end_samples` | int64 | yes | | Range end |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

## High-Priority Commands

Source: `engine/libs/ardour/dawflow_commands_high.cc`

### Recording

#### `daw.set_pre_roll`
Set pre-roll duration.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `seconds` | double | yes | | Pre-roll in seconds |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `preroll_seconds` | double | Value set |

---

#### `daw.set_post_roll`
Set post-roll duration (stored as export_preroll approximation).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `seconds` | double | yes | | Post-roll in seconds |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `postroll_seconds` | double | Value set |
| `description` | string | Explanation of approximation |

---

#### `daw.get_record_state`
Get detailed record state including armed tracks and punch status. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `record_enabled` | bool | Global record enable |
| `actively_recording` | bool | Currently recording |
| `armed_tracks` | object[] | Array of {id, name} |
| `armed_count` | int | Number of armed tracks |
| `punch_enabled` | bool | Punch-in or punch-out enabled |
| `punch_in` | bool | Punch-in state |
| `punch_out` | bool | Punch-out state |
| `punch_start` | int64 | Punch start (if exists) |
| `punch_end` | int64 | Punch end (if exists) |
| `preroll_seconds` | double | Pre-roll setting |

---

#### `daw.transport_record`
Start recording immediately (enable record + play). No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `recording` | bool | true |

---

#### `daw.discard_last_take`
Undo last recording via session undo. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `description` | string | What was undone |

---

#### `daw.set_track_playlist`
Switch a track to a different playlist by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `playlist_name` | string | yes | | Target playlist name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `playlist_name` | string | Active playlist name |

---

#### `daw.get_track_playlists`
List all playlists for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playlists` | object[] | Array of {name, id, region_count, is_current} |
| `count` | int | Total playlists |

---

#### `daw.new_track_playlist`
Create a new empty playlist for a track and switch to it.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `playlist_name` | string | New playlist name |

---

### Editing (High)

#### `daw.move_region_to_track`
Move a region between tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_track_id` | string | yes | | Source track UUID |
| `target_track_id` | string | yes | | Target track UUID |
| `region_id` | string | yes | | Region UUID |
| `position_samples` | int64 | no | -1 | New position (-1 = keep original) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `new_position` | int64 | Final position |

---

#### `daw.nudge_region`
Nudge a region by samples or beats.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Region UUID |
| `nudge_samples` | int64 | no | 0 | Nudge amount in samples |
| `nudge_beats` | double | no | 0.0 | Nudge amount in beats |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `new_position_samples` | int64 | New position |

---

#### `daw.set_snap_mode`
Set grid snap mode. Returns guidance (GUI-only setting).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | string | no | "grid" | Snap mode |
| `grid_size` | string | no | "1/4" | Grid size |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "not_available_from_plugin_host" |

---

#### `daw.consolidate_range`
Consolidate regions in a range (bounce).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `start_samples` | int64 | yes | | Range start |
| `end_samples` | int64 | yes | | Range end |
| `name` | string | no | "consolidated" | Bounced region name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `region_id` | string | Bounced region UUID |
| `region_name` | string | Bounced region name |

---

#### `daw.time_stretch_region`
Time stretch (stub: requires RubberBand).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | no | "" | Region UUID |
| `ratio` | double | no | 1.0 | Stretch ratio |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "not_yet_implemented" |

---

#### `daw.pitch_shift_region`
Pitch shift (stub: requires RubberBand).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | no | "" | Region UUID |
| `semitones` | double | no | 0.0 | Semitones to shift |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "not_yet_implemented" |

---

#### `daw.get_region_at_position`
Find the top region at a time position on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `position_samples` | int64 | yes | | Sample position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `found` | bool | Whether a region was found |
| `id` | string | Region UUID |
| `name` | string | Region name |
| `position_samples` | int64 | Region position |
| `length_samples` | int64 | Region length |
| `muted` | bool | Mute state |
| `locked` | bool | Lock state |

---

#### `daw.select_regions_in_range`
Find regions touching a time range on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `start_samples` | int64 | yes | | Range start |
| `end_samples` | int64 | yes | | Range end |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `regions` | object[] | Array of {id, name, position_samples, length_samples} |
| `count` | int | Number of regions found |

---

### Mixing

#### `daw.set_track_pan_width`
Set stereo width for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `width` | double | yes | | Width value |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `width` | double | Width set |

---

#### `daw.get_track_pan`
Get pan position and width for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `pan_position` | double | Pan azimuth (0.0-1.0, null if unavailable) |
| `pan_width` | double | Stereo width (null if unavailable) |

---

#### `daw.set_send_enable`
Enable or disable a send.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `send_index` | int | yes | | Send index |
| `enabled` | bool | yes | | Enable state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.get_sends`
List all sends with targets, levels, and enable state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `sends` | object[] | Array of {index, id, name, active, gain, gain_db, enabled, target_id, target_name, send_name} |
| `count` | int | Number of sends |

---

#### `daw.set_track_gain_relative`
Adjust gain by a delta in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `delta_db` | double | yes | | Gain change in dB |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `previous_db` | double | Gain before change |
| `new_db` | double | Gain after change |

---

#### `daw.get_master_gain`
Get master bus gain. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `gain` | double | Gain (linear) |
| `gain_db` | double | Gain in dB |
| `track_id` | string | Master bus UUID |
| `name` | string | Master bus name |

---

#### `daw.set_master_gain`
Set master bus fader level.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `gain_db` | double | yes | | Gain in dB |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `gain_db` | double | Gain set |

---

#### `daw.bypass_all_plugins`
Bypass all plugins on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `bypassed_count` | int | Number of plugins bypassed |

---

#### `daw.enable_all_plugins`
Re-enable all plugins on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `enabled_count` | int | Number of plugins enabled |

---

#### `daw.get_master_lufs`
Get LUFS measurement (approximation via K-RMS). No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "approximation" |
| `description` | string | Explanation |
| `channels` | object[] | Array of {channel, peak_db, k_rms_db} |

---

### MIDI (High)

#### `daw.edit_midi_note`
Edit a specific MIDI note by ID. All change fields are optional.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note_id` | int | yes | | Note ID |
| `note` | int | no | | New note number (0-127) |
| `velocity` | int | no | | New velocity (0-127) |
| `start_beats` | double | no | | New start time |
| `length_beats` | double | no | | New length |
| `channel` | int | no | | New channel (0-15) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.set_midi_note_length`
Set the length of a specific MIDI note by ID.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note_id` | int | yes | | Note ID |
| `length_beats` | double | yes | | New length in beats |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.add_midi_cc`
Add a MIDI CC automation event.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `cc_number` | int | yes | | CC number (0-127) |
| `time_beats` | double | yes | | Time in beats |
| `value` | int | yes | | CC value (0-127) |
| `channel` | int | no | 0 | MIDI channel |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `cc_number` | int | CC number |
| `time_samples` | int64 | Time converted to samples |

---

#### `daw.get_midi_cc`
Get CC automation data for a control on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `cc_number` | int | yes | | CC number |
| `channel` | int | no | 0 | MIDI channel |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `points` | object[] | Array of {time_samples, value, value_midi} |
| `count` | int | Number of points |
| `cc_number` | int | CC number |
| `channel` | int | Channel |
| `state` | string | Automation state |

---

#### `daw.duplicate_midi_region_content`
Duplicate a MIDI region right after itself.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `times` | double | no | 1.0 | Number of times to duplicate |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `times` | double | Times duplicated |

---

### Plugin Management

#### `daw.reorder_plugins`
Reorder the processor chain on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_ids` | string[] | yes | | Ordered list of processor UUIDs |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |

---

#### `daw.copy_plugin`
Copy a plugin (with settings) from one track to another.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_track_id` | string | yes | | Source track UUID |
| `source_processor_id` | string | yes | | Source plugin UUID |
| `target_track_id` | string | yes | | Target track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `new_processor_id` | string | UUID of the new plugin instance |

---

#### `daw.set_plugin_position`
Move a plugin to a specific index in the processor chain.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin UUID |
| `position` | int | yes | | Target index in chain |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `position` | int | New position |

---

#### `daw.set_multiple_plugin_parameters`
Set multiple plugin parameters in one call.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin UUID |
| `parameters` | object[] | yes | | Array of {index: int, value: double} |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `set_count` | int | Number of parameters set |
| `errors` | object[] | Array of {index, error} (if any) |

---

### Project Management

#### `daw.export_stems`
Export each track separately (stub: requires GUI).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `format` | string | no | "wav" | Audio format |
| `bit_depth` | int | no | 24 | Bit depth |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "not_yet_implemented" |
| `tracks_to_export` | object[] | Array of {id, name} |
| `track_count` | int | Number of tracks |

---

#### `daw.save_session_as`
Save session under a new name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | yes | | New session name |
| `parent_folder` | string | no | "../" | Parent directory |
| `switch_to` | bool | no | false | Switch to the new session |
| `copy_media` | bool | no | true | Copy media files |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `new_session_path` | string | Path of the new session |
| `new_name` | string | Session name |
| `switched_to` | bool | Whether switched |

---

#### `daw.import_midi`
Import MIDI file (validates file, provides guidance).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `filepath` | string | yes | | Path to MIDI file |
| `track_id` | string | no | "" | Target track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "file_validated" |
| `filepath` | string | File path |
| `description` | string | Import instructions |

---

### Query Commands

#### `daw.get_track_type`
Get the type classification of a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `name` | string | Track name |
| `type` | string | "master", "audio_track", "midi_track", "track", or "bus" |

---

#### `daw.get_track_record_status`
Get per-track arm and monitoring state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track UUID |
| `name` | string | Track name |
| `record_armed` | bool | Rec-enable state |
| `monitoring` | string | "auto", "input", "disk", "cue" |
| `monitoring_input` | bool | Currently monitoring input |
| `monitoring_disk` | bool | Currently monitoring disk |

---

#### `daw.get_loop_range`
Get loop range start and end. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | bool | Loop playback active |
| `start_samples` | int64 | Loop start |
| `end_samples` | int64 | Loop end |
| `length_samples` | int64 | Loop length |

---

#### `daw.get_punch_range`
Get punch range start and end. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `punch_in_enabled` | bool | Punch-in state |
| `punch_out_enabled` | bool | Punch-out state |
| `start_samples` | int64 | Punch start |
| `end_samples` | int64 | Punch end |
| `length_samples` | int64 | Punch length |

---

#### `daw.get_region_by_name`
Find a region by name across all tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | yes | | Region name to search for |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `found` | bool | Whether region was found |
| `id` | string | Region UUID |
| `name` | string | Region name |
| `position_samples` | int64 | Position |
| `length_samples` | int64 | Length |
| `muted` | bool | Mute state |
| `track_id` | string | Track UUID (if on a playlist) |
| `track_name` | string | Track name (if on a playlist) |

---

#### `daw.get_available_ports`
List all system audio/MIDI ports.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | no | "all" | Filter: "all", "audio", or "midi" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `audio_inputs` | string[] | Audio input port names |
| `audio_outputs` | string[] | Audio output port names |
| `midi_inputs` | string[] | MIDI input port names |
| `midi_outputs` | string[] | MIDI output port names |

---

#### `daw.add_time_signature_change`
Add a meter (time signature) change at a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `numerator` | int | yes | | Beats per bar |
| `denominator` | int | yes | | Beat value |
| `position_samples` | int64 | no | 0 | Position in samples (used if bar=0) |
| `bar` | int | no | 0 | Bar number (used if > 0) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Success |
| `numerator` | int | Numerator set |
| `denominator` | int | Denominator set |

---

### Session Lifecycle

#### `daw.new_session`
Cannot create a new session from within an existing session. Returns error.

---

#### `daw.open_session`
Cannot switch sessions from within a session handler. Returns error.

---

#### `daw.close_session`
Save and close the session.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `save_first` | bool | no | true | Save before closing |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `message` | string | Guidance |

---

### Transport Extended

#### `daw.set_follow_edits`
Set follow-edits mode (GUI-level setting).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | yes | | Follow-edits state |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `follow_edits` | bool | State set |

---

#### `daw.transport_rewind`
Rewind transport at a given speed.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `speed` | double | no | -2.0 | Rewind speed |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `speed` | double | Speed set |

---

#### `daw.transport_forward`
Fast-forward transport at a given speed.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `speed` | double | no | 2.0 | Forward speed |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `speed` | double | Speed set |

---

#### `daw.transport_play_selection`
Start playback from a selection start position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_samples` | int64 | yes | | Start position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.transport_record_with_preroll`
Start recording with 2-second preroll. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.transport_record_with_count_in`
Start recording with count-in. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.transport_goto_marker`
Go to a marker by name or index.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | no | "" | Marker name |
| `index` | int | no | -1 | Marker index (among mark-type locations) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `position` | int64 | Marker position |
| `name` | string | Marker name |

---

### Metering (High)

#### `daw.set_meter_type`
Set meter type for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `type` | string | no | "peak" | Meter type: "peak", "rms", "k14", "k20", "vu" |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Region Advanced Operations

#### `daw.separate_regions_between`
Split all regions at two positions on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `start_samples` | int64 | yes | | First split point |
| `end_samples` | int64 | yes | | Second split point |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.snap_regions_to_grid`
Snap all regions on a track to a grid.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `grid_samples` | int64 | no | sample_rate (1 second) | Grid size in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `snapped_count` | int | Number of regions snapped |

---

#### `daw.close_region_gaps`
Close gaps between regions by moving them adjacent.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `threshold_samples` | int64 | no | 0 | Maximum gap to close (0 = close all) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `closed` | int | Number of gaps closed |

---

#### `daw.toggle_region_phase_invert`
Toggle phase inversion on an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | Audio region UUID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `inverted` | bool | Current inversion state |

---

### Zoom and Navigation

#### `daw.zoom_step`
Zoom step (returns session info for React UI zoom calculation).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `direction` | string | no | "in" | "in" or "out" |
| `steps` | int | no | 1 | Number of zoom steps |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `direction` | string | Direction |
| `steps` | int | Steps |
| `session_length_samples` | int64 | Session length |
| `sample_rate` | int | Sample rate |

---

#### `daw.scroll_timeline`
Scroll timeline (returns info for React UI).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `direction` | string | no | "forward" | "forward" or "backward" |
| `pages` | double | no | 0.8 | Pages to scroll |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `direction` | string | Direction |
| `pages` | double | Pages |
| `current_position` | int64 | Current transport position |

---

#### `daw.goto_next_marker`
Navigate to the next or previous marker.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `forward` | bool | no | true | Forward (true) or backward (false) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `position` | int64 | Marker position |
| `name` | string | Marker name |

---

### MIDI Additions

#### `daw.midi.resize_note`
Resize a MIDI note by ID.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `note_id` | int | yes | | Note ID |
| `new_length_beats` | double | yes | | New length in beats |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

#### `daw.midi.add_patch_change`
Add a patch change (not yet implemented). Returns error.

---

#### `daw.midi.delete_patch_change`
Delete a patch change (not yet implemented). Returns error.

---

#### `daw.midi.delete_cc_event`
Delete a MIDI CC event at a specific time.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `region_id` | string | yes | | MIDI region UUID |
| `cc_number` | int | yes | | CC number |
| `time_beats` | double | yes | | Time in beats |
| `channel` | int | no | 0 | MIDI channel |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |

---

### Window and Plugin UI

#### `daw.show_preferences`
Show preferences (returns guidance). No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | true |
| `message` | string | Guidance |

---

#### `daw.show_plugin_manager`
Show plugin manager (returns guidance). No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | true |
| `message` | string | Guidance |

---

#### `daw.plugin.save_preset`
Save a plugin preset.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | yes | | Track UUID |
| `processor_id` | string | yes | | Plugin UUID |
| `name` | string | yes | | Preset name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Success |
| `uri` | string | Preset URI |
| `label` | string | Preset label |

---

### Real-Time Recording Data

#### `daw.get_recording_state`
Get real-time recording info for all armed tracks, including waveform peaks. No parameters.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `recording` | bool | Actively recording |
| `tracks` | object[] | Array of {track_id, track_name, capture_start_samples, captured_samples, capture_end_samples, peaks: [{min, max}]} |
| `position_samples` | int64 | Current transport position |

---

# DAWFLOW IPC Command Reference: Medium, Final, Complete & Mastering

Comprehensive API documentation for all IPC command handlers in four source files:

- `engine/libs/ardour/dawflow_commands_medium.cc`
- `engine/libs/ardour/dawflow_commands_final.cc`
- `engine/libs/ardour/dawflow_commands_complete.cc`
- `engine/libs/ardour/dawflow_commands_mastering.cc`

---

## Table of Contents

1. [dawflow_commands_medium.cc](#dawflow_commands_mediumcc) (77 commands + 10 events)
2. [dawflow_commands_final.cc](#dawflow_commands_finalcc) (65 commands)
3. [dawflow_commands_complete.cc](#dawflow_commands_completecc) (59 commands)
4. [dawflow_commands_mastering.cc](#dawflow_commands_masteringcc) (22 commands)

---

## dawflow_commands_medium.cc

Source: `engine/libs/ardour/dawflow_commands_medium.cc`

### Editing Commands

#### `daw.reverse_region`
Reverse an audio region (stub -- returns not_yet_implemented status).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | Region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"not_yet_implemented"` |
| `description` | string | Explanation of limitation |
| `region_id` | string | Echo of region_id |

---

#### `daw.set_fade_shape`
Set the fade curve shape on an audio region's fade-in or fade-out.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | Region ID |
| `fade` | string | Yes | -- | `"in"` or `"out"` |
| `shape` | string | Yes | -- | `"linear"`, `"fast"`, `"slow"`, `"constant"`, or `"symmetric"` |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.create_crossfade`
Create a crossfade between two overlapping audio regions by setting fade-out on region A and fade-in on region B.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id_a` | string | Yes | -- | First region (fade-out) |
| `region_id_b` | string | Yes | -- | Second region (fade-in) |
| `crossfade_samples` | int64 | No | 4410 | Crossfade length in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `description` | string | Notes about crossfade behavior |

---

#### `daw.get_snap_mode`
Get current snap settings (GUI-only stub).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"gui_only"` |
| `description` | string | Explanation |

---

#### `daw.ripple_region`
Move a region and push all subsequent regions by the same delta.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | Region to move |
| `position_samples` | int64 | Yes | -- | New position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `moved` | int | Number of regions moved |

---

#### `daw.group_regions`
Group regions (GUI-only stub).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"gui_only"` |
| `description` | string | Explanation |

---

#### `daw.ungroup_regions`
Ungroup regions (GUI-only stub).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"gui_only"` |
| `description` | string | Explanation |

---

### MIDI Commands

#### `daw.select_midi_notes`
Select MIDI notes matching criteria (pitch, velocity, time range).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `note_min` | int | No | 0 | Minimum MIDI note number |
| `note_max` | int | No | 127 | Maximum MIDI note number |
| `velocity_min` | int | No | 0 | Minimum velocity |
| `velocity_max` | int | No | 127 | Maximum velocity |
| `start_beats` | double | No | 0.0 | Start time in beats |
| `end_beats` | double | No | 999999.0 | End time in beats |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `notes` | object[] | Array of matching notes |
| `notes[].note` | int | MIDI note number (0-127) |
| `notes[].velocity` | int | Velocity (0-127) |
| `notes[].channel` | int | MIDI channel (0-15) |
| `notes[].start_beats` | double | Start time in beats |
| `notes[].length_beats` | double | Duration in beats |
| `notes[].id` | int | Internal note ID |
| `count` | int | Number of matching notes |

---

#### `daw.split_midi_by_pitch`
Split a MIDI region by pitch. Keeps notes below `split_note` in the region and removes notes at or above it.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `split_note` | int | Yes | -- | MIDI note number (boundary) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `kept_below` | int | Notes kept (below split_note) |
| `removed_above` | int | Notes removed (>= split_note) |
| `description` | string | Instructions for complete split |

---

#### `daw.split_midi_by_channel`
Split a MIDI region by channel. Keeps notes on `keep_channel` and removes all others.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `keep_channel` | int | Yes | -- | MIDI channel to keep (0-15) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `kept` | int | Notes kept |
| `removed` | int | Notes removed |

---

#### `daw.set_midi_channel`
Set all notes in a MIDI region to the specified channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `channel` | int | Yes | -- | Target channel (0-15) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `changed` | int | Number of notes changed |

---

#### `daw.clear_midi_cc`
Clear CC data for a controller (stub -- not yet implemented).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `cc` | int | Yes | -- | CC number (0-127) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"not_yet_implemented"` |
| `description` | string | Explanation |

---

#### `daw.add_program_change`
Insert a MIDI program change event (stub -- not yet implemented).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `program` | int | Yes | -- | Program number |
| `beat` | double | Yes | -- | Position in beats |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"not_yet_implemented"` |
| `description` | string | Explanation |

---

#### `daw.quantize_midi_swing`
Quantize MIDI notes with swing applied.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `grid_beats` | double | No | 0.5 | Grid size in beats |
| `swing` | double | No | 0.6 | Swing amount (0.0-1.0; 0.5 = straight) |
| `strength` | double | No | 1.0 | Quantize strength (0.0-1.0) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.legato_midi`
Extend each note's duration to meet the next note (legato effect).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `gap_beats` | double | No | 0.0 | Gap to leave between notes (in beats) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `changed` | int | Number of notes modified |

---

#### `daw.scale_midi_velocity`
Scale all note velocities in a MIDI region by a percentage.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `scale_percent` | double | Yes | -- | Scale factor (100 = no change, 50 = half, 200 = double) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

### Arrangement Commands

#### `daw.rename_marker`
Rename an existing marker.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Current marker name |
| `new_name` | string | Yes | -- | New marker name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.move_marker`
Move a marker to a new sample position. For range markers, preserves duration.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Marker name |
| `position_samples` | int64 | Yes | -- | New position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.remove_tempo_change`
Remove a tempo point at a specific sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | -- | Position of tempo point (within 64 samples tolerance) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.add_tempo_ramp`
Create a gradual tempo change (ramp) between two positions.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_bpm` | double | Yes | -- | Starting tempo in BPM |
| `end_bpm` | double | Yes | -- | Ending tempo in BPM |
| `start_position_samples` | int64 | Yes | -- | Ramp start position |
| `end_position_samples` | int64 | Yes | -- | Ramp end position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `start_bpm` | double | Echo of start BPM |
| `end_bpm` | double | Echo of end BPM |

---

#### `daw.add_cue_marker`
Add a cue marker at a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Cue marker name |
| `position` | int64 | No | Current transport position | Position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `name` | string | Marker name |
| `position` | int64 | Marker position |

---

### Plugin Commands

#### `daw.move_plugin`
Move a plugin from one track to another. Removes from source, re-creates on destination with same state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_track_id` | string | Yes | -- | Source route ID |
| `dest_track_id` | string | Yes | -- | Destination route ID |
| `processor_id` | string | Yes | -- | Processor ID to move |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `new_processor_id` | string | ID of the new processor on the destination |

---

#### `daw.get_plugin_info`
Get detailed information about a plugin instance.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `processor_id` | string | Yes | -- | Processor ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `processor_id` | string | Processor ID |
| `name` | string | Plugin name |
| `maker` | string | Plugin creator |
| `category` | string | Plugin category |
| `unique_id` | string | Plugin unique identifier |
| `enabled` | bool | Whether plugin is enabled |
| `type` | string | Plugin type: `"AudioUnit"`, `"LV2"`, `"VST3"`, `"VST"`, `"LADSPA"`, `"Lua"`, `"Unknown"` |
| `parameter_count` | int | Total parameter count |
| `audio_inputs` | int | Audio input count |
| `audio_outputs` | int | Audio output count |
| `midi_inputs` | int | MIDI input count |
| `midi_outputs` | int | MIDI output count |
| `preset_count` | int | Number of available presets |

---

#### `daw.load_plugin_by_id`
Load a plugin onto a track using its unique_id (more reliable than name matching).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `unique_id` | string | Yes | -- | Plugin unique identifier |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `processor_id` | string | ID of the new processor |
| `name` | string | Plugin name |

---

### Project Commands

#### `daw.save_template`
Save the current session as a reusable template.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Template name |
| `description` | string | No | `""` | Template description |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `name` | string | Template name |

---

#### `daw.restore_snapshot`
Restore a previously saved session snapshot.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Snapshot name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `snapshot` | string | Snapshot name |

---

#### `daw.copy_track_playlist`
Copy a track's current playlist (for comping workflows).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `playlist_name` | string | Name of the new playlist copy |

---

### View Commands (GUI-only stubs)

#### `daw.zoom_to_region`
Zoom to fit a region (GUI-only -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Not available from plugin host.

---

#### `daw.zoom_to_range`
Zoom to a time range (GUI-only -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Not available from plugin host.

---

### Advanced Commands

#### `daw.remove_track_from_group`
Remove a track from a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `group_name` | string | Yes | -- | Route group name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.set_group_properties`
Set multiple group linking properties at once.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | Yes | -- | Route group name |
| `gain` | bool | No | -- | Link gain across group |
| `mute` | bool | No | -- | Link mute across group |
| `solo` | bool | No | -- | Link solo across group |
| `active` | bool | No | -- | Set group active/inactive |
| `relative` | bool | No | -- | Enable relative gain mode |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.delete_group`
Delete a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | Yes | -- | Route group name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.connect_ports`
Connect two audio engine ports directly.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_port` | string | Yes | -- | Source port name |
| `dest_port` | string | Yes | -- | Destination port name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.disconnect_ports`
Disconnect two audio engine ports.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_port` | string | Yes | -- | Source port name |
| `dest_port` | string | Yes | -- | Destination port name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.get_track_latency`
Get signal and playback latency for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `signal_latency` | int64 | Signal latency in samples |
| `playback_latency` | int64 | Playback latency in samples |

---

#### `daw.get_metronome_state`
Get current metronome (click) state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | bool | Whether click is enabled |
| `gain` | double | Click gain level |
| `count_in` | bool | Whether count-in is enabled |

---

#### `daw.get_transport_speed`
Get current transport speed and playing state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `speed` | double | Current transport speed (1.0 = normal) |
| `playing` | bool | Whether transport is rolling |

---

### Low Priority Commands

#### `daw.set_capture_mode`
Set capture mode (deprecated -- destructive recording removed in Ardour 7+).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"deprecated"` |
| `description` | string | Explanation |

---

#### `daw.get_last_capture_info`
Get info about last recording capture (limited -- Editor-only data).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"limited"` |
| `description` | string | Workaround suggestion |
| `recording` | bool | Whether session is currently recording |

---

#### `daw.set_region_opacity`
Set region opaque flag (controls audio transparency in layered mode).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | Region ID |
| `opaque` | bool | Yes | -- | Whether region is opaque |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.shuffle_region`
Shuffle a region's position within its playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | Region ID |
| `direction` | int | Yes | -- | Shuffle direction (negative = earlier, positive = later) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.set_track_height`
Set visual track height (GUI-only -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Not available from plugin host.

---

#### `daw.show_mixer`
Show mixer window (GUI-only -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Not available from plugin host.

---

#### `daw.show_editor`
Show editor window (GUI-only -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Not available from plugin host.

---

#### `daw.get_latency_report`
Get full latency report for all routes in the session.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of route latency info |
| `tracks[].id` | string | Route ID |
| `tracks[].name` | string | Route name |
| `tracks[].signal_latency` | int64 | Signal latency in samples |
| `tracks[].playback_latency` | int64 | Playback latency in samples |
| `sample_rate` | int | Session sample rate |
| `block_size` | int | Engine block/buffer size |
| `xrun_count` | int | Number of xruns (dropouts) |

---

#### `daw.invert_midi_notes`
Perform melodic inversion of MIDI notes around a pivot note.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `pivot` | int | No | 60 | Pivot note for inversion (middle C = 60) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `pivot` | int | Pivot note used |

---

#### `daw.retrograde_midi`
Reverse the time order of MIDI notes (retrograde transformation).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.get_sample_rate`
Get the session sample rate.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `sample_rate` | int | Session sample rate (e.g. 48000) |

---

### Navigation Commands

#### `daw.goto_next_region_boundary`
Move playhead to the next region start or end boundary.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Whether a boundary was found |
| `position` | int64 | New playhead position (if found) |
| `reason` | string | Reason if not found |

---

#### `daw.goto_prev_region_boundary`
Move playhead to the previous region start or end boundary.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Whether a boundary was found |
| `position` | int64 | New playhead position (if found) |
| `reason` | string | Reason if not found |

---

#### `daw.goto_session_start`
Jump playhead to sample position 0.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `position` | int | `0` |

---

#### `daw.goto_session_end`
Jump playhead to session end.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `position` | int64 | Session end in samples |

---

#### `daw.set_playhead_position`
Locate playhead to an exact sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | -- | Target position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `position` | int64 | New position |

---

#### `daw.get_playhead_position`
Query current playhead position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `position_samples` | int64 | Position in samples |
| `position_seconds` | double | Position in seconds |
| `sample_rate` | int | Session sample rate |

---

#### `daw.nudge_playhead_forward`
Move playhead forward by a sample amount.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `amount_samples` | int64 | No | 1 second (sample_rate) | Amount to nudge forward |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `position` | int64 | New position |

---

#### `daw.nudge_playhead_backward`
Move playhead backward by a sample amount (clamped to 0).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `amount_samples` | int64 | No | 1 second (sample_rate) | Amount to nudge backward |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `position` | int64 | New position |

---

### Export Commands

#### `daw.get_export_formats`
List available export formats (hardcoded list).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `formats` | object[] | Array of format descriptors |
| `formats[].id` | string | Format ID (e.g. `"wav-24"`) |
| `formats[].name` | string | Display name |
| `formats[].extension` | string | File extension |

---

#### `daw.get_session_length`
Get session length in samples and seconds.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `length_samples` | int64 | Session length in samples |
| `length_seconds` | double | Session length in seconds |
| `sample_rate` | int | Session sample rate |

---

#### `daw.bounce_region`
Bounce a region to a new audio file (renders through the track's processing chain).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | Region ID to bounce |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `region_id` | string | New region ID |
| `name` | string | New region name |
| `error` | string | Error message if failed |

---

#### `daw.get_undo_history`
Get undo history with labels.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `max_items` | int | No | 50 | Maximum history items to return |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `undo_depth` | int | Current undo stack depth |
| `next_undo` | string | Label of next undo operation |
| `undo` | object[] | Array of undo entries |
| `undo[].label` | string | Undo operation label |

---

#### `daw.get_recent_sessions`
List recently opened sessions.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `sessions` | object[] | Array of recent sessions |
| `sessions[].name` | string | Session name |
| `sessions[].path` | string | Session file path |
| `count` | int | Number of recent sessions |

---

### Session Maintenance Commands

#### `daw.get_session_stats`
Get aggregate session statistics.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `audio_track_count` | int | Number of audio tracks |
| `midi_track_count` | int | Number of MIDI tracks |
| `bus_count` | int | Number of buses |
| `sample_rate` | int | Session sample rate |
| `session_length_samples` | int64 | Session end in samples |
| `dirty` | bool | Whether session has unsaved changes |

---

#### `daw.rename_session`
Rename the current session.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | New session name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `name` | string | New session name |

---

#### `daw.get_engine_info`
Get audio engine information.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `backend` | string | Audio backend name (e.g. `"CoreAudio"`) |
| `sample_rate` | int | Session sample rate |
| `buffer_size` | int | Engine buffer size in samples |
| `running` | bool | Whether engine is running |
| `dsp_load` | double | DSP load as percentage (0-100) |

---

#### `daw.set_session_dirty`
Mark the session as modified (dirty).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `dirty` | bool | `true` |

---

### Selection & Clipboard Commands

#### `daw.get_selected_regions`
Return info about all regions across all tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `regions` | object[] | Array of region info |
| `regions[].id` | string | Region ID |
| `regions[].name` | string | Region name |
| `regions[].track_id` | string | Parent route ID |
| `regions[].position_samples` | int64 | Position in samples |
| `regions[].length_samples` | int64 | Length in samples |
| `count` | int | Total region count |

---

#### `daw.get_all_track_regions`
Batch fetch all regions for all tracks, grouped by track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of tracks with their regions |
| `tracks[].track_id` | string | Route ID |
| `tracks[].track_name` | string | Route name |
| `tracks[].regions` | object[] | Regions on this track |
| `tracks[].regions[].id` | string | Region ID |
| `tracks[].regions[].name` | string | Region name |
| `tracks[].regions[].position_samples` | int64 | Position |
| `tracks[].regions[].length_samples` | int64 | Length |
| `tracks[].regions[].start_samples` | int64 | Start offset |
| `tracks[].regions[].muted` | bool | Muted flag |
| `tracks[].regions[].locked` | bool | Locked flag |
| `tracks[].regions[].layer` | int | Layer number |

---

#### `daw.count_regions`
Count total regions across all tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `count` | int | Total region count |

---

#### `daw.get_track_playlist_info`
Get playlist info for a specific track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playlist_id` | string | Playlist ID |
| `playlist_name` | string | Playlist name |
| `region_count` | int | Number of regions |
| `hidden` | bool | Whether playlist is hidden |

---

#### `daw.get_available_playlists`
List all playlists available for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playlists` | object[] | Array of playlists |
| `playlists[].id` | string | Playlist ID |
| `playlists[].name` | string | Playlist name |
| `playlists[].region_count` | int | Number of regions |
| `count` | int | Total playlist count |

---

### Time Conversion Commands

#### `daw.samples_to_time`
Convert sample position to human-readable time.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `samples` | int64 | Yes | -- | Sample position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `seconds` | double | Time in seconds |
| `timecode` | string | Formatted as `H:MM:SS` |
| `samples` | int64 | Echo of input |

---

#### `daw.time_to_samples`
Convert seconds to sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `seconds` | double | Yes | -- | Time in seconds |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `samples` | int64 | Sample position |

---

#### `daw.get_time_formats`
Get a position expressed in multiple time formats.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | No | Current transport position | Position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `samples` | int64 | Position in samples |
| `seconds` | double | Position in seconds |
| `sample_rate` | int | Session sample rate |

---

### Track Queries

#### `daw.get_track_by_name`
Find a track/route by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Track name to search for |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Route ID (if found) |
| `name` | string | Route name (if found) |
| `found` | bool | Whether the track was found |

---

#### `daw.get_track_color`
Get the RGBA color for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `color_rgba` | string | 8-character hex RGBA string |

---

#### `daw.get_track_comment`
Get the comment text for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `comment` | string | Track comment text |

---

#### `daw.is_track_muted`
Check if a track is muted.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `muted` | bool | Whether track is muted |

---

#### `daw.is_track_soloed`
Check if a track is soloed.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `soloed` | bool | Whether track is soloed |

---

#### `daw.is_track_record_enabled`
Check if a track is record-armed.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `record_enabled` | bool | Whether track is armed |

---

#### `daw.get_track_gain_db`
Get track gain in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `gain_db` | double | Gain in decibels |

---

#### `daw.get_track_pan_position`
Get track pan position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `pan` | double | Pan position (0.0=left, 0.5=center, 1.0=right) |

---

#### `daw.get_track_monitoring_mode`
Get track monitoring mode.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `"auto"`, `"input"`, or `"disk"` |

---

#### `daw.is_master_track`
Check if a route is the master bus.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `is_master` | bool | Whether route is the master bus |

---

### Playlist Operations

#### `daw.switch_track_playlist`
Switch a track to a named playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |
| `playlist_name` | string | Yes | -- | Name of playlist to switch to |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `playlist` | string | Active playlist name |

---

#### `daw.create_new_playlist`
Create a new empty playlist for a track and switch to it.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `playlist` | string | New playlist name |

---

#### `daw.copy_current_playlist`
Copy the track's current playlist to a new one and switch to the copy.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `playlist` | string | New playlist name |

---

#### `daw.get_playlist_regions`
List all regions in a playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |
| `playlist_name` | string | No | Current playlist | Specific playlist name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playlist` | string | Playlist name |
| `regions` | object[] | Array of region info |
| `regions[].id` | string | Region ID |
| `regions[].name` | string | Region name |
| `regions[].position_samples` | int64 | Position |
| `regions[].length_samples` | int64 | Length |
| `regions[].muted` | bool | Muted flag |
| `regions[].locked` | bool | Locked flag |
| `count` | int | Region count |

---

#### `daw.get_all_playlists`
List all playlists in the session.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `playlists` | object[] | Array of playlists |
| `playlists[].id` | string | Playlist ID |
| `playlists[].name` | string | Playlist name |
| `playlists[].region_count` | int | Number of regions |
| `playlists[].hidden` | bool | Hidden flag |
| `playlists[].empty` | bool | Whether playlist has no regions |
| `count` | int | Total playlist count |

---

### Route Group Queries

#### `daw.get_track_group`
Get the route group a track belongs to.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `group_name` | string | Group name (or null if not in a group) |
| `group_id` | string | Group ID |

---

#### `daw.set_group_gain`
Enable/disable gain linking for a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | Yes | -- | Route group name |
| `enabled` | bool | Yes | -- | Enable gain linking |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.set_group_mute`
Enable/disable mute linking for a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | Yes | -- | Route group name |
| `enabled` | bool | Yes | -- | Enable mute linking |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.set_group_solo`
Enable/disable solo linking for a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | Yes | -- | Route group name |
| `enabled` | bool | Yes | -- | Enable solo linking |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.set_group_color`
Enable/disable color linking for a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_name` | string | Yes | -- | Route group name |
| `enabled` | bool | Yes | -- | Enable color linking |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

### Convenience Operations

#### `daw.solo_track_exclusive`
Solo one track exclusively, un-soloing everything else first.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID to solo |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.get_master_output_db`
Get peak meter levels on the master bus.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `channels` | object[] | Per-channel peak levels |
| `channels[].peak_db` | double | Peak level in dB |

---

#### `daw.record_arm_track`
Arm or disarm a track for recording.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |
| `arm` | bool | No | `true` | `true` to arm, `false` to disarm |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `armed` | bool | Final armed state |

---

#### `daw.get_session_summary`
Get a comprehensive snapshot of the current session state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Session name |
| `path` | string | Session directory path |
| `sample_rate` | int | Sample rate |
| `dirty` | bool | Unsaved changes |
| `playing` | bool | Transport rolling |
| `recording` | bool | Actively recording |
| `position_samples` | int64 | Current transport position |
| `end_samples` | int64 | Session end position |
| `dsp_load` | double | DSP load percentage |
| `audio_tracks` | int | Audio track count |
| `midi_tracks` | int | MIDI track count |
| `buses` | int | Bus count |
| `loop_start` | int64 | Loop start (if loop exists) |
| `loop_end` | int64 | Loop end (if loop exists) |

---

#### `daw.get_all_track_states`
Batch fetch state for every track/bus in the session.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of track state objects |
| `tracks[].id` | string | Route ID |
| `tracks[].name` | string | Route name |
| `tracks[].muted` | bool | Muted state |
| `tracks[].soloed` | bool | Solo state |
| `tracks[].active` | bool | Active state |
| `tracks[].is_master` | bool | Is master bus |
| `tracks[].is_monitor` | bool | Is monitor bus |
| `tracks[].gain_db` | double | Gain in dB |
| `tracks[].pan` | double | Pan position (0-1) |
| `tracks[].record_enabled` | bool | Record armed |
| `tracks[].is_track` | bool | True if track (vs bus) |
| `tracks[].color` | string | 8-char hex RGBA |
| `count` | int | Total route count |

---

#### `daw.get_available_sends`
List all buses available as send targets (excludes tracks, master, monitor).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `buses` | object[] | Array of bus info |
| `buses[].id` | string | Bus route ID |
| `buses[].name` | string | Bus name |
| `count` | int | Number of available buses |

---

#### `daw.get_track_send_count`
Count internal sends on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `send_count` | int | Number of internal sends |

---

#### `daw.set_track_gain_db`
Set track gain in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `gain_db` | double | Yes | -- | Gain in decibels |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.set_track_pan_position`
Set track pan position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `pan` | double | Yes | -- | Pan position (0.0=left, 0.5=center, 1.0=right) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

### Event Broadcasts (10 signals)

These are not IPC commands but real-time event signals broadcast to all connected clients.

| Event | Trigger | Payload Fields |
|-------|---------|---------------|
| `daw.routes.removed_from_group` | Route removed from route group | `route_id`, `route_name` |
| `daw.route.added` | New route added to session | `route_id`, `route_name` |
| `daw.region.added` | New region created | `region_id`, `region_name` |
| `daw.marker.added` | Location/marker added | `name`, `start`, `is_mark` |
| `daw.marker.removed` | Location/marker removed | `name` |
| `daw.marker.changed` | Marker name/position changed | `name`, `start` |
| `daw.tempo.changed` | Tempo map modified | `bpm` |
| `daw.plugin.changed` | Processor chain changed on a route | `route_id`, `route_name` |

---

## dawflow_commands_final.cc

Source: `engine/libs/ardour/dawflow_commands_final.cc`

### Import Commands

#### `daw.get_source_files`
Get all audio/MIDI source files in the session pool.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `sources` | object[] | Array of source info |
| `sources[].id` | string | Source ID |
| `sources[].name` | string | Source name |
| `sources[].length` | int64 | Length in samples |
| `sources[].writable` | bool | Whether source is writable |
| `count` | int | Total source count |

---

### Export Commands

#### `daw.get_session_path`
Get session directory and file paths.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `session_path` | string | Session directory path |
| `session_name` | string | Session name |
| `snap_name` | string | Current snapshot name |
| `sample_rate` | int | Session sample rate |

---

### Plugin Presets

#### `daw.get_plugin_presets`
Get available presets for a plugin instance.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `processor_id` | string | Yes | -- | Processor ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `presets` | object[] | Array of presets |
| `presets[].uri` | string | Preset URI |
| `presets[].label` | string | Preset display name |
| `presets[].user` | bool | Whether user-created |
| `count` | int | Total preset count |

---

#### `daw.load_plugin_preset`
Load a preset onto a plugin by URI or name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `processor_id` | string | Yes | -- | Processor ID |
| `preset_uri` | string | No | `""` | Preset URI to load |
| `preset_name` | string | No | `""` | Preset name to load (fallback) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `loaded` | string | Preset label that was loaded |
| `uri` | string | Preset URI |

---

#### `daw.save_plugin_preset`
Save current plugin state as a user preset.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `processor_id` | string | Yes | -- | Processor ID |
| `name` | string | Yes | -- | Preset name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `preset_uri` | string | URI of saved preset |
| `label` | string | Preset label |

---

### Plugin Search

#### `daw.search_plugins`
Search installed plugins by name (case-insensitive).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | Yes | -- | Search query |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `results` | object[] | Matching plugins |
| `results[].name` | string | Plugin name |
| `results[].type` | string | `"LV2"`, `"AU"`, `"VST3"`, `"VST"`, `"LADSPA"`, `"Lua"` |
| `results[].category` | string | Plugin category |
| `results[].creator` | string | Plugin author |
| `results[].unique_id` | string | Plugin unique ID |
| `count` | int | Number of matches |

---

#### `daw.search_plugins_by_category`
Search installed plugins by category (case-insensitive).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `category` | string | Yes | -- | Category search query |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `results` | object[] | Matching plugins (same shape as `daw.search_plugins`) |
| `count` | int | Number of matches |

---

### Track Properties

#### `daw.set_track_hidden`
Hide or show a track in the UI.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `hidden` | bool | Yes | -- | `true` to hide, `false` to show |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.get_track_names`
Get all track IDs and names (lightweight query).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of track info |
| `tracks[].id` | string | Route ID |
| `tracks[].name` | string | Route name |
| `tracks[].is_track` | bool | True if track (vs bus) |
| `tracks[].active` | bool | Active state |
| `tracks[].hidden` | bool | Hidden state |
| `count` | int | Total count |

---

#### `daw.get_track_count`
Get counts of tracks, audio tracks, and buses.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `total` | int | Total route count |
| `audio_tracks` | int | Audio track count |
| `buses` | int | Bus count |

---

#### `daw.solo_exclusive`
Solo one track, unsolo all others.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID to solo |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.mute_all`
Mute or unmute all tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mute` | bool | No | `true` | `true` to mute, `false` to unmute |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `count` | int | Number of routes affected |

---

#### `daw.unsolo_all`
Unsolo all tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `count` | int | Number of routes affected |

---

#### `daw.unmute_all`
Unmute all tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `count` | int | Number of routes affected |

---

### VCA Commands

#### `daw.create_vca`
Create one or more VCA masters.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | `"VCA"` | VCA name template |
| `count` | int | No | 1 | Number of VCAs to create |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `vcas` | object[] | Created VCAs |
| `vcas[].id` | string | VCA ID |
| `vcas[].name` | string | VCA name |
| `vcas[].number` | int | VCA number |
| `count` | int | Number created |

---

#### `daw.get_vcas`
List all VCA masters.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `vcas` | object[] | Array of VCA info |
| `vcas[].id` | string | VCA ID |
| `vcas[].name` | string | VCA name |
| `vcas[].number` | int | VCA number |
| `count` | int | Total VCA count |

---

### Snapshot Commands

#### `daw.save_snapshot`
Save session state as a named snapshot.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Snapshot name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `snapshot` | string | Snapshot name |

---

#### `daw.get_snapshots`
Get current snapshot name and session info.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `current_snapshot` | string | Current snapshot name |
| `session_name` | string | Session name |
| `session_path` | string | Session path |
| `description` | string | Note about enumeration |

---

### Time Conversion Commands

#### `daw.samples_to_beats`
Convert sample position to beats and BBT.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `samples` | int64 | Yes | -- | Sample position |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `samples` | int64 | Echo of input |
| `beats` | double | Position in quarter-note beats |
| `bar` | int | Bar number |
| `beat` | int | Beat within bar |
| `tick` | int | Tick within beat |
| `bbt_string` | string | Formatted as `bar|beat|tick` |

---

#### `daw.beats_to_samples`
Convert beat position to samples.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `beats` | double | Yes | -- | Beat position (quarter notes) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `samples` | int64 | Sample position |
| `beats` | double | Echo of input |

---

#### `daw.get_position_info`
Get current transport position in all time formats.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `samples` | int64 | Position in samples |
| `beats` | double | Position in beats |
| `bar` | int | Bar number |
| `beat` | int | Beat within bar |
| `tick` | int | Tick within beat |
| `bbt_string` | string | `bar|beat|tick` |
| `seconds` | double | Position in seconds |
| `tempo_bpm` | double | Tempo at position |
| `sample_rate` | int | Session sample rate |

---

### Audio Analysis Commands

#### `daw.detect_silence`
Detect silent sections in an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | Audio region ID |
| `threshold_db` | double | No | -60.0 | Silence threshold in dB |
| `min_length_samples` | int64 | No | 1000 | Minimum silence length in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `silent_ranges` | object[] | Array of silent ranges |
| `silent_ranges[].start_samples` | int64 | Range start |
| `silent_ranges[].end_samples` | int64 | Range end |
| `count` | int | Number of silent ranges |
| `threshold_db` | double | Threshold used |
| `min_length` | int64 | Minimum length used |

---

#### `daw.get_tempo_at`
Get tempo at a specific sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | No | Current transport position | Position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `bpm` | double | Tempo in BPM |
| `position` | int64 | Position queried |
| `bar` | int | Bar number at position |
| `beat` | int | Beat within bar |
| `bbt_string` | string | `bar|beat|tick` |

---

### MIDI CC / Crossfade Stubs

#### `daw.set_crossfade`
Set crossfade between adjacent regions (stub -- not yet implemented).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"not_yet_implemented"` |
| `description` | string | Workaround instructions |

---

### MIDI CC Data

#### `daw.midi.get_cc_data`
Get CC events for a specific controller in a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `cc_number` | int | Yes | -- | CC number (0-127) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `cc_number` | int | CC number queried |
| `events` | object[] | Array of CC events |
| `events[].time_beats` | double | Event time in beats |
| `events[].value` | int | CC value (0-127) |
| `count` | int | Number of events |

---

#### `daw.midi.get_all_cc_numbers`
List all CC numbers that have data in a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `cc_numbers` | object[] | Array of CC numbers with data |
| `cc_numbers[].cc_number` | int | CC number |
| `cc_numbers[].event_count` | int | Number of events |

---

#### `daw.midi.add_cc_event`
Add a CC event to a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `cc_number` | int | Yes | -- | CC number (0-127) |
| `time_beats` | double | Yes | -- | Event time in beats |
| `value` | int | Yes | -- | CC value (0-127) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.midi.clear_cc_data`
Clear all CC events for a controller in a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |
| `cc_number` | int | Yes | -- | CC number to clear (0-127) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

### Utility & Info

#### `daw.ping`
Simple ping to verify connectivity.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `pong` | bool | `true` |
| `session_name` | string | Current session name |
| `engine_running` | bool | Whether audio engine is running |

---

#### `daw.get_api_version`
Get DAWFLOW API version info.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | API version (e.g. `"1.0.0"`) |
| `engine` | string | `"DAWFLOW"` |
| `based_on` | string | `"Ardour 9.2"` |

---

#### `daw.list_commands`
List available commands (informational).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Instruction |
| `approximate_count` | int | Approximate command count |

---

#### `daw.get_audio_backend_info`
Get audio backend status and device info.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `backend_name` | string | Backend name (e.g. `"CoreAudio"`) |
| `sample_rate` | int | Sample rate |
| `buffer_size` | int | Buffer size in samples |
| `dsp_load_percent` | double | DSP load (0-100) |
| `running` | bool | Engine running |
| `physical_inputs` | string[] | Physical audio input port names |
| `physical_outputs` | string[] | Physical audio output port names |
| `input_count` | int | Number of physical inputs |
| `output_count` | int | Number of physical outputs |

---

#### `daw.get_click_settings`
Get metronome click settings.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | bool | Click enabled |
| `gain` | double | Click gain |
| `use_click_emphasis` | bool | Emphasis click on beat 1 |

---

#### `daw.set_click_enabled`
Enable or disable the metronome click.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | Yes | -- | Enable/disable click |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `enabled` | bool | New state |

---

#### `daw.set_click_gain`
Set the metronome click gain.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `gain` | double | Yes | -- | Click gain level |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.get_midi_ports`
List physical MIDI input and output ports.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ports` | object[] | Array of port info |
| `ports[].name` | string | Port name |
| `ports[].direction` | string | `"input"` or `"output"` |
| `count` | int | Total port count |

---

### Batch Track Operations

#### `daw.mute_all_tracks`
Mute every track/bus.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `muted_count` | int | Number of routes muted |

---

#### `daw.unmute_all_tracks`
Unmute every muted track/bus.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `unmuted_count` | int | Number of routes unmuted |

---

#### `daw.unsolo_all_tracks`
Cancel all solo on every track/bus.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |

---

#### `daw.disarm_all_tracks`
Disarm record on every armed track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` |
| `disarmed_count` | int | Number of tracks disarmed |

---

#### `daw.get_armed_tracks`
List all record-armed tracks.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `armed_tracks` | object[] | Array of armed track info |
| `armed_tracks[].id` | string | Track ID |
| `armed_tracks[].name` | string | Track name |
| `count` | int | Number of armed tracks |

---

### MIDI Advanced

#### `daw.midi.get_patch_changes`
Get patch changes in a MIDI region (limited implementation).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `patches` | object[] | Array (currently empty) |
| `count` | int | `0` (not yet fully implemented) |
| `note` | string | Implementation status |

---

#### `daw.midi.get_note_count`
Get count of notes in a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `count` | int | Number of MIDI notes |

---

#### `daw.midi.get_channel_usage`
Get which MIDI channels are used in a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `channels` | int[] | Array of used channel numbers (0-15) |
| `count` | int | Number of unique channels |

---

#### `daw.midi.get_note_range`
Get lowest and highest note in a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `lowest_note` | int | Lowest MIDI note number |
| `highest_note` | int | Highest MIDI note number |
| `range` | int | Note range (highest - lowest) |

---

#### `daw.midi.get_velocity_stats`
Get velocity statistics for a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `region_id` | string | Yes | -- | MIDI region ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `min_velocity` | int | Minimum velocity |
| `max_velocity` | int | Maximum velocity |
| `avg_velocity` | double | Average velocity |
| `note_count` | int | Total note count |

---

### Session Queries

#### `daw.get_session_format`
Get session format and metadata.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `sample_rate` | int | Session sample rate |
| `name` | string | Session name |
| `path` | string | Session directory path |
| `snap_name` | string | Current snapshot name |

---

#### `daw.get_source_count`
Get count of audio/MIDI sources.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `count` | int | Total source count |

---

#### `daw.get_track_order`
Get tracks with their presentation order.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Array of track info |
| `tracks[].id` | string | Route ID |
| `tracks[].name` | string | Route name |
| `tracks[].order` | int | Presentation order |

---

#### `daw.get_session_end_marker`
Get session end position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `end_samples` | int64 | End position in samples |
| `end_seconds` | double | End position in seconds |

---

#### `daw.get_process_thread_count`
Get engine thread and buffer info.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `thread_count` | int | Number of processing threads |
| `buffer_size` | int | Buffer size in samples |

---

### Plugin Chain Queries

#### `daw.get_processor_chain`
Get full processor chain for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `processors` | object[] | Array of processors |
| `processors[].id` | string | Processor ID |
| `processors[].name` | string | Processor name |
| `processors[].active` | bool | Active state |
| `processors[].index` | int | Position in chain |
| `processors[].display_name` | string | Display name |
| `processors[].is_plugin` | bool | Whether it's a plugin insert |
| `processors[].plugin_name` | string | Plugin name (if plugin) |
| `processors[].latency` | int64 | Plugin latency in samples (if plugin) |
| `count` | int | Total processor count |

---

#### `daw.get_plugin_count`
Get count of plugins on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `count` | int | Number of plugin inserts |

---

#### `daw.has_plugin`
Check if a track has a specific plugin by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `plugin_name` | string | Yes | -- | Plugin name to search for |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `has_plugin` | bool | Whether plugin was found |
| `plugin_name` | string | Plugin name searched |

---

### Convenience Queries

#### `daw.get_master_gain_db`
Get master bus gain in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `gain_db` | double | Master gain in decibels |
| `gain_coefficient` | double | Raw gain coefficient |

---

#### `daw.set_master_gain_db`
Set master bus gain in dB.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `gain_db` | double | Yes | -- | Gain in decibels |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |

---

#### `daw.get_track_count_by_type`
Get counts of audio tracks, MIDI tracks, buses, and master.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `audio_tracks` | int | Audio track count |
| `midi_tracks` | int | MIDI track count |
| `buses` | int | Bus count |
| `master` | int | Master bus count (0 or 1) |
| `total` | int | Total route count |

---

#### `daw.get_session_duration_formatted`
Get session duration in HH:MM:SS.mmm format.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `duration_seconds` | double | Duration in seconds |
| `duration_formatted` | string | Formatted as `HH:MM:SS.mmm` |
| `sample_rate` | int | Session sample rate |
| `total_samples` | int64 | Session end in samples |

---

#### `daw.get_tempo_at_position`
Get tempo at a specific sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | No | Current transport position | Position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `bpm` | double | Tempo in BPM |
| `position_samples` | int64 | Position queried |

---

## dawflow_commands_complete.cc

Source: `engine/libs/ardour/dawflow_commands_complete.cc`

### Solo / Mute Controls

#### `daw.set_track_solo_isolate`
Enable/disable solo isolation on a route. When isolated, the route ignores global solo state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `isolated` | bool | Yes | -- | `true` to isolate from solo |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `isolated` | bool | New state |

---

#### `daw.get_track_solo_isolate`
Get solo isolation state for a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `isolated` | bool | Whether solo-isolated |

---

#### `daw.set_track_solo_safe`
Enable/disable solo-safe on a route. When safe, solo cannot be changed by group operations.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `safe` | bool | Yes | -- | `true` to enable solo-safe |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `safe` | bool | New state |

---

#### `daw.get_track_solo_safe`
Get solo-safe state for a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `safe` | bool | Whether solo-safe is enabled |

---

### Recording

#### `daw.set_track_record_safe`
Enable/disable record-safe on a track. When safe, record cannot be armed.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |
| `safe` | bool | Yes | -- | `true` to enable record-safe |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Track ID |
| `safe` | bool | New state |

---

#### `daw.get_track_record_safe`
Get record-safe state for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Track ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Track ID |
| `safe` | bool | Whether record-safe is enabled |

---

#### `daw.set_record_mode`
Set the session record mode.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | string | Yes | -- | `"layered"`, `"non_layered"`, or `"sound_on_sound"` |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `mode` | string | Echo of mode set |

---

#### `daw.get_record_mode`
Get the session record mode.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `"layered"`, `"non_layered"`, `"sound_on_sound"`, or `"unknown"` |

---

### Transport / Varispeed

#### `daw.set_default_play_speed`
Set the default playback speed (varispeed).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `speed` | double | Yes | -- | Playback speed (1.0 = normal, 2.0 = double) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `speed` | double | Speed set |

---

#### `daw.get_default_play_speed`
Get the default playback speed.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `speed` | double | Current default play speed |

---

#### `daw.request_bounded_roll`
Start playback that stops automatically at an end position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start` | int64 | Yes | -- | Start position in samples |
| `end` | int64 | Yes | -- | End position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `start` | int64 | Start position |
| `end` | int64 | End position |

---

#### `daw.request_roll_at_and_return`
Start playback at a position, then return to another position when stopped.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start` | int64 | Yes | -- | Playback start position |
| `return_to` | int64 | Yes | -- | Position to return to |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `start` | int64 | Start position |
| `return_to` | int64 | Return position |

---

#### `daw.trigger_cue_row`
Trigger a cue row (for clip launcher / trigger-based workflows).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `row` | int | Yes | -- | Cue row index |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `row` | int | Row triggered |

---

### Sync / Timecode / MIDI Clock / LTC

#### `daw.set_send_mtc`
Enable/disable sending MIDI Time Code.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | Yes | -- | Enable MTC output |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `send_mtc` | bool | New state |

---

#### `daw.get_send_mtc`
Get MTC send state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `send_mtc` | bool | Whether MTC is being sent |

---

#### `daw.set_send_ltc`
Enable/disable sending Linear Time Code.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | Yes | -- | Enable LTC output |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `send_ltc` | bool | New state |

---

#### `daw.get_send_ltc`
Get LTC send state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `send_ltc` | bool | Whether LTC is being sent |

---

#### `daw.set_send_midi_clock`
Enable/disable sending MIDI Clock.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | Yes | -- | Enable MIDI Clock output |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `send_midi_clock` | bool | New state |

---

#### `daw.get_send_midi_clock`
Get MIDI Clock send state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `send_midi_clock` | bool | Whether MIDI Clock is being sent |

---

#### `daw.set_ltc_output_volume`
Set the LTC output volume.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `volume` | double | Yes | -- | LTC output volume |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `ltc_output_volume` | double | Volume set |

---

#### `daw.get_ltc_output_volume`
Get the LTC output volume.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ltc_output_volume` | double | Current LTC output volume |

---

#### `daw.set_external_sync`
Enable/disable external sync (slave to external timecode source).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | Yes | -- | Enable external sync |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `external_sync` | bool | New state |

---

#### `daw.get_external_sync`
Get external sync state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `external_sync` | bool | Whether external sync is enabled |

---

#### `daw.suspend_timecode_transmission`
Temporarily suspend timecode transmission (MTC/LTC).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.resume_timecode_transmission`
Resume timecode transmission after suspension.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.set_video_sync`
Enable/disable video sync.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | Yes | -- | Enable video sync |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `use_video_sync` | bool | New state |

---

#### `daw.get_video_sync`
Get video sync state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `use_video_sync` | bool | Whether video sync is enabled |

---

### Panning / Surround

#### `daw.set_track_pan_frontback`
Set the front/back pan position for surround panning.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `value` | double | Yes | -- | Front/back position (0.0-1.0) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `value` | double | Value set |

---

#### `daw.get_track_pan_frontback`
Get the front/back pan position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `value` | double | Current front/back position |

---

#### `daw.set_track_pan_lfe`
Set the LFE (subwoofer) pan level for surround panning.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `value` | double | Yes | -- | LFE level (0.0-1.0) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `value` | double | Value set |

---

#### `daw.get_track_pan_lfe`
Get the LFE pan level.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `value` | double | Current LFE level |

---

#### `daw.add_surround_master`
Add a surround master bus (requires GTK action -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Requires GTK action dispatch.

---

#### `daw.remove_surround_master`
Remove the surround master bus (requires GTK action -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Requires GTK action dispatch.

---

### Monitor Section

#### `daw.monitor.add_section`
Add a monitor section (requires GTK action -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Requires GTK action dispatch.

---

#### `daw.monitor.remove_section`
Remove the monitor section (requires GTK action -- throws error).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:** Throws runtime error. Requires GTK action dispatch.

---

#### `daw.monitor.set_cut_all`
Cut all monitor outputs.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `cut` | bool | Yes | -- | `true` to cut, `false` to restore |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `cut_all` | bool | New state |

---

#### `daw.monitor.set_dim_all`
Dim all monitor outputs.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `dim` | bool | Yes | -- | `true` to dim, `false` to restore |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `dim_all` | bool | New state |

---

#### `daw.monitor.set_dim_level`
Set the monitor dim level.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `level` | double | Yes | -- | Dim level |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `dim_level` | double | Level set |

---

#### `daw.monitor.set_solo_boost_level`
Set the monitor solo boost level.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `level` | double | Yes | -- | Solo boost level |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `solo_boost_level` | double | Level set |

---

#### `daw.monitor.set_channel_cut`
Cut a specific monitor channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `channel` | int | Yes | -- | Channel index (0-based) |
| `cut` | bool | Yes | -- | `true` to cut |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `channel` | int | Channel index |
| `cut` | bool | New state |

---

#### `daw.monitor.set_channel_dim`
Dim a specific monitor channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `channel` | int | Yes | -- | Channel index (0-based) |
| `dim` | bool | Yes | -- | `true` to dim |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `channel` | int | Channel index |
| `dim` | bool | New state |

---

#### `daw.monitor.set_channel_polarity`
Invert polarity on a specific monitor channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `channel` | int | Yes | -- | Channel index (0-based) |
| `inverted` | bool | Yes | -- | `true` to invert |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `channel` | int | Channel index |
| `inverted` | bool | New state |

---

#### `daw.monitor.get_full_state`
Get the complete monitor section state including per-channel settings.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `exists` | bool | `true` (monitor section exists) |
| `monitor_active` | bool | Whether monitoring is active |
| `cut_all` | bool | Global cut state |
| `dim_all` | bool | Global dim state |
| `mono` | bool | Mono mode |
| `dim_level` | double | Dim level |
| `solo_boost_level` | double | Solo boost level |
| `channels` | object[] | Per-channel state |
| `channels[].index` | int | Channel index |
| `channels[].cut` | bool | Channel cut state |
| `channels[].dim` | bool | Channel dim state |
| `channels[].inverted` | bool | Channel polarity inverted |
| `channels[].soloed` | bool | Channel soloed |
| `channel_count` | int | Number of output channels |

---

### Foldback / Cue

#### `daw.add_foldback_bus`
Create a foldback (cue) bus for headphone mixes.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | `"Foldback"` | Bus name |
| `channels` | int | No | 2 | Number of channels |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `id` | string | New bus route ID |
| `name` | string | Bus name |
| `channels` | int | Channel count |

---

#### `daw.get_foldback_buses`
List all foldback buses.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `foldback_buses` | object[] | Array of foldback bus info |
| `foldback_buses[].id` | string | Bus route ID |
| `foldback_buses[].name` | string | Bus name |
| `foldback_buses[].n_inputs` | int | Audio input count |
| `foldback_buses[].n_outputs` | int | Audio output count |
| `count` | int | Number of foldback buses |

---

#### `daw.add_foldback_send`
Add a send from a track to a foldback bus.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Source route ID |
| `foldback_bus_id` | string | Yes | -- | Foldback bus route ID |
| `post_fader` | bool | No | `true` | Post-fader send (true) or pre-fader (false) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Source route ID |
| `foldback_bus_id` | string | Foldback bus ID |
| `post_fader` | bool | Send placement |

---

### Route Configuration

#### `daw.set_track_listen`
Set track listen/AFL/PFL state (uses solo control as workaround).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `listen` | bool | Yes | -- | `true` to enable listen |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `listen` | bool | New state |

---

#### `daw.set_track_disk_io_point`
Set where disk I/O occurs in the signal chain.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `point` | string | Yes | -- | `"pre_fader"`, `"post_fader"`, or `"custom"` |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `point` | string | Disk I/O point set |

---

#### `daw.get_track_disk_io_point`
Get the disk I/O point for a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `point` | string | `"pre_fader"`, `"post_fader"`, `"custom"`, or `"unknown"` |

---

#### `daw.set_track_strict_io`
Enable/disable strict I/O mode on a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `strict` | bool | Yes | -- | Enable strict I/O |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `strict_io` | bool | New state |

---

#### `daw.get_track_strict_io`
Get strict I/O state for a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `strict_io` | bool | Whether strict I/O is enabled |

---

#### `daw.set_track_denormal_protection`
Enable/disable denormal protection on a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `enabled` | bool | Yes | -- | Enable denormal protection |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `denormal_protection` | bool | New state |

---

#### `daw.get_track_denormal_protection`
Get denormal protection state for a route.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `track_id` | string | Route ID |
| `denormal_protection` | bool | Whether denormal protection is enabled |

---

#### `daw.set_track_volume_applies_to_output`
Set whether volume control applies to output (vs trim).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | -- | Route ID |
| `applies` | bool | Yes | -- | `true` for output volume |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `track_id` | string | Route ID |
| `volume_applies_to_output` | bool | New state |

---

### Session Lifecycle

#### `daw.bring_all_sources_into_session`
Copy all external source files into the session directory.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success (return code 0) |
| `return_code` | int | Internal return code |
| `total_sources` | int | Total sources to process |
| `sources_processed` | int | Sources successfully processed |
| `last_source` | string | Name of last processed source |

---

#### `daw.refresh_disk_space`
Refresh disk space calculations.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |

---

#### `daw.plot_process_graph`
Export the DSP process graph as a DOT file for visualization.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `file_name` | string | No | `<session_path>/process_graph.dot` | Output file path |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `file_name` | string | Output file path |

---

### Video Sync

#### `daw.set_video_pullup`
Set video pullup/pulldown factor.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pullup` | double | Yes | -- | Pullup factor |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `video_pullup` | double | Value set |

---

#### `daw.get_video_pullup`
Get video pullup/pulldown factor.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `video_pullup` | double | Current pullup factor |

---

## dawflow_commands_mastering.cc

Source: `engine/libs/ardour/dawflow_commands_mastering.cc`

### CD Marker Commands

#### `daw.cd_marker.add`
Add a CD track marker with optional CD-Text metadata.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | -- | Position in samples |
| `name` | string | Yes | -- | CD track name |
| `isrc` | string | No | -- | ISRC code |
| `performer` | string | No | -- | Performer name |
| `composer` | string | No | -- | Composer name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `name` | string | Marker name |
| `position` | int64 | Marker position |

---

#### `daw.cd_marker.remove`
Remove a CD marker by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | CD marker name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `name` | string | Removed marker name |

---

#### `daw.cd_marker.list`
List all CD markers with their metadata.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `markers` | object[] | Array of CD marker info |
| `markers[].name` | string | Marker name |
| `markers[].start` | int64 | Start position in samples |
| `markers[].end` | int64 | End position in samples |
| `markers[].length` | int64 | Length in samples |
| `markers[].cd_info` | object | CD-Text metadata (isrc, performer, composer, etc.) |
| `count` | int | Number of CD markers |

---

#### `daw.cd_marker.get_info`
Get details for a named CD marker.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | CD marker name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Marker name |
| `start` | int64 | Start position |
| `end` | int64 | End position |
| `length` | int64 | Length in samples |
| `cd_info` | object | CD-Text metadata |

---

#### `daw.cd_marker.set_info`
Update CD-Text metadata on an existing CD marker.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | CD marker name |
| `isrc` | string | No | -- | ISRC code |
| `performer` | string | No | -- | Performer name |
| `composer` | string | No | -- | Composer name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `name` | string | Marker name |
| `cd_info` | object | Updated CD-Text metadata |

---

#### `daw.cd_marker.add_index`
Add a CD index point (a point marker, not a range).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | -- | Position in samples |
| `name` | string | Yes | -- | Index point name |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `name` | string | Index name |
| `position` | int64 | Index position |
| `type` | string | `"index"` |

---

#### `daw.cd_marker.get_toc`
Generate CD Table-of-Contents data with MSF (Minutes:Seconds:Frames) timecodes.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `tracks` | object[] | Ordered CD track entries |
| `tracks[].track_number` | int | CD track number (1-based) |
| `tracks[].name` | string | Track name |
| `tracks[].start_sample` | int64 | Start in samples |
| `tracks[].end_sample` | int64 | End in samples |
| `tracks[].start_msf` | string | Start in MM:SS:FF format |
| `tracks[].end_msf` | string | End in MM:SS:FF format |
| `tracks[].duration_seconds` | double | Duration in seconds |
| `tracks[].cd_info` | object | CD-Text metadata |
| `track_count` | int | Number of CD tracks |
| `sample_rate` | int | Session sample rate |

---

#### `daw.cd_marker.validate`
Validate CD markers for Red Book compliance (max 99 tracks, min 4s duration, no overlaps, max 79:57 total).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `valid` | bool | Whether all checks pass |
| `track_count` | int | Number of CD tracks |
| `errors` | string[] | Array of error messages |
| `warnings` | string[] | Array of warning messages |

---

### Plugin Macro Commands

#### `daw.macro.create`
Create a macro that maps a single virtual knob to multiple plugin/strip controls.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | -- | Macro name |
| `controls` | object[] | No | `[]` | Initial control mappings |
| `controls[].track_id` | string | Yes | -- | Route ID |
| `controls[].control_uri` | string | Yes | -- | Control URI (format: `processor_id:param_index`) |
| `controls[].min` | double | No | 0.0 | Output range minimum |
| `controls[].max` | double | No | 1.0 | Output range maximum |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `macro_id` | string | Generated macro ID (e.g. `"macro_1"`) |
| `name` | string | Macro name |
| `controls` | int | Number of control mappings |

---

#### `daw.macro.delete`
Delete a macro.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `macro_id` | string | Yes | -- | Macro ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `macro_id` | string | Deleted macro ID |

---

#### `daw.macro.list`
List all macros with their control mappings.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `macros` | object[] | Array of macro definitions |
| `macros[].macro_id` | string | Macro ID |
| `macros[].name` | string | Macro name |
| `macros[].value` | double | Current value (0.0-1.0) |
| `macros[].controls` | object[] | Control mappings |
| `macros[].controls[].index` | int | Mapping index |
| `macros[].controls[].track_id` | string | Route ID |
| `macros[].controls[].control_uri` | string | Control URI |
| `macros[].controls[].min` | double | Output minimum |
| `macros[].controls[].max` | double | Output maximum |
| `count` | int | Number of macros |

---

#### `daw.macro.get_info`
Get details for a specific macro.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `macro_id` | string | Yes | -- | Macro ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `macro_id` | string | Macro ID |
| `name` | string | Macro name |
| `value` | double | Current value (0.0-1.0) |
| `controls` | object[] | Control mappings (same shape as `daw.macro.list`) |

---

#### `daw.macro.set_value`
Set macro position (0.0-1.0) and update all mapped controls. Each control receives: `min + value * (max - min)`.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `macro_id` | string | Yes | -- | Macro ID |
| `value` | double | Yes | -- | Normalized value (clamped to 0.0-1.0) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `macro_id` | string | Macro ID |
| `value` | double | Value after clamping |
| `controls_updated` | int | Number of controls updated |

---

#### `daw.macro.get_value`
Get current macro position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `macro_id` | string | Yes | -- | Macro ID |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `macro_id` | string | Macro ID |
| `value` | double | Current value (0.0-1.0) |
| `name` | string | Macro name |

---

#### `daw.macro.add_control`
Add a control mapping to an existing macro.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `macro_id` | string | Yes | -- | Macro ID |
| `track_id` | string | Yes | -- | Route ID |
| `control_uri` | string | Yes | -- | Control URI (format: `processor_id:param_index`) |
| `min` | double | No | 0.0 | Output range minimum |
| `max` | double | No | 1.0 | Output range maximum |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `macro_id` | string | Macro ID |
| `control_index` | int | Index of newly added control |
| `total_controls` | int | Total control count |

---

#### `daw.macro.remove_control`
Remove a control mapping from a macro by index.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `macro_id` | string | Yes | -- | Macro ID |
| `control_index` | int | Yes | -- | Index of control to remove |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `macro_id` | string | Macro ID |
| `removed_index` | int | Index that was removed |
| `total_controls` | int | Remaining control count |

---

### Video Sync Commands

#### `daw.video.get_pullup`
Get video pullup/pulldown setting.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `pullup` | double | Current pullup factor |

---

#### `daw.video.set_pullup`
Set video pullup/pulldown.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pullup` | double | Yes | -- | Pullup factor |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `pullup` | double | Value set |

---

#### `daw.video.get_sync_enabled`
Check if video sync is enabled.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | bool | Whether video sync is enabled |

---

#### `daw.video.set_sync_enabled`
Enable/disable video sync.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | bool | Yes | -- | Enable video sync |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `enabled` | bool | New state |

---

#### `daw.video.get_offset`
Get video offset in samples.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | | | | |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `offset_samples` | int64 | Offset in samples |
| `offset_negative` | bool | Whether offset is negative |

---

#### `daw.video.set_offset`
Set video offset in samples.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `offset_samples` | int64 | Yes | -- | Offset in samples |
| `negative` | bool | No | -- | Whether offset is negative |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | `true` on success |
| `offset_samples` | int64 | Offset set |
| `offset_negative` | bool | Final negative flag |

---

# DAWFLOW Deep API Reference

Comprehensive documentation for all IPC commands in the four "deep" command files:
- `dawflow_commands_engine_deep.cc` (110 commands)
- `dawflow_commands_analysis.cc` (110 commands)
- `dawflow_commands_advanced_editing.cc` (110 commands)
- `dawflow_commands_session_deep.cc` (110 commands)

**Total: 440 commands**

---

# 1. Engine Deep Commands (`dawflow_commands_engine_deep.cc`)

## DSP Graph Topology (15 commands)

#### `daw.get_route_signal_path`
Get ordered processor chain for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| route_name | string | Route name |
| processors | array | Array of {index, id, name, active, display_name} |
| count | int | Number of processors |

#### `daw.get_route_processor_count`
Count processors on a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| count | int | Number of processors |

#### `daw.get_processor_info`
Get name, id, active state, latency of a processor by index.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| index | int | yes | - | Processor index in chain |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Processor ID |
| name | string | Processor name |
| display_name | string | Display name |
| active | bool | Whether processor is active |
| input_latency | int64 | Input latency in samples |
| output_latency | int64 | Output latency in samples |
| signal_latency | int64 | Signal latency in samples |
| is_plugin | bool | Whether this is a plugin insert |
| plugin_name | string | Plugin name (only if is_plugin) |

#### `daw.get_processor_io_counts`
Get input/output channel counts for a processor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| index | int | yes | - | Processor index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| input_audio | int | Audio input channels |
| input_midi | int | MIDI input channels |
| output_audio | int | Audio output channels |
| output_midi | int | MIDI output channels |
| input_total | int | Total input channels |
| output_total | int | Total output channels |

#### `daw.get_route_input_ports`
Get input port names for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| ports | array | Array of {name, type, connected, pretty_name} |
| count | int | Number of ports |

#### `daw.get_route_output_ports`
Get output port names for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| ports | array | Array of {name, type, connected, pretty_name} |
| count | int | Number of ports |

#### `daw.get_route_fed_by`
Get routes feeding this route via internal sends.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| fed_by | array | Array of {id, name} |
| count | int | Number of feeding routes |

#### `daw.get_route_feeds`
Get routes this route feeds into via internal sends.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| feeds | array | Array of {id, name} |
| count | int | Number of fed routes |

#### `daw.get_internal_sends_for_route`
Get all internal sends on a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| sends | array | Array of {id, name, active, target_id, target_name} |
| count | int | Number of sends |

#### `daw.get_internal_returns_for_route`
Get internal return info for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| has_internal_return | bool | Whether route has an internal return |
| return_id | string | Return processor ID (if exists) |
| return_name | string | Return name (if exists) |
| active | bool | Whether return is active (if exists) |

#### `daw.get_master_bus_info`
Get master bus details.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Master bus route ID |
| name | string | Master bus name |
| active | bool | Active state |
| meter_point | string | Meter point position |
| gain | float | Gain coefficient |
| gain_db | float | Gain in dB |
| input_channels | int | Number of input audio channels |
| output_channels | int | Number of output audio channels |
| signal_latency | int64 | Signal latency in samples |

#### `daw.get_monitor_bus_info`
Get monitor bus info (if exists).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| exists | bool | Whether monitor bus exists |
| id | string | Monitor bus route ID (if exists) |
| name | string | Monitor bus name (if exists) |
| active | bool | Active state (if exists) |
| meter_point | string | Meter point (if exists) |
| gain | float | Gain coefficient (if exists) |
| gain_db | float | Gain in dB (if exists) |
| input_channels | int | Input audio channels (if exists) |

#### `daw.get_route_panner_info`
Get panner type and state for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| has_panner | bool | Whether route has a panner |
| bypassed | bool | Whether panner is bypassed |
| panner_type | string | Panner URI or "none" |

#### `daw.get_route_meter_point`
Get where the meter is in the signal chain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| meter_point | string | "input", "pre_fader", "post_fader", "output", "custom" |

#### `daw.set_route_meter_point`
Set the meter point for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| meter_point | string | yes | - | "input", "pre_fader", "post_fader", "output", "custom" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| meter_point | string | Resulting meter point |

## Port Management (20 commands)

#### `daw.get_all_ports`
List all audio and MIDI ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ports | array | Array of {name, type} |
| count | int | Total port count |

#### `daw.get_port_info`
Get info about a specific port by name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| port_name | string | yes | - | Full port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| name | string | Port name |
| type | string | Port type |
| connected | bool | Has connections |
| pretty_name | string | Human-readable name |
| physically_connected | bool | Connected to physical port |
| externally_connected | int | External connection count |
| internally_connected | int | Internal connection count |

#### `daw.get_port_connections`
Get connections for a port.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| port_name | string | yes | - | Full port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| port_name | string | Port name |
| connections | array | Array of connected port names (strings) |
| count | int | Number of connections |

#### `daw.get_physical_audio_inputs`
List physical audio input ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ports | array | Array of port name strings |
| count | int | Number of ports |

#### `daw.get_physical_audio_outputs`
List physical audio output ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ports | array | Array of port name strings |
| count | int | Number of ports |

#### `daw.get_physical_midi_inputs`
List physical MIDI input ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ports | array | Array of port name strings |
| count | int | Number of ports |

#### `daw.get_physical_midi_outputs`
List physical MIDI output ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ports | array | Array of port name strings |
| count | int | Number of ports |

#### `daw.engine.connect_ports`
Connect two ports by name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source | string | yes | - | Source port name |
| destination | string | yes | - | Destination port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| source | string | Source port |
| destination | string | Destination port |
| error | string | Error message (on failure) |

#### `daw.engine.disconnect_ports`
Disconnect two ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source | string | yes | - | Source port name |
| destination | string | yes | - | Destination port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| source | string | Source port |
| destination | string | Destination port |
| error | string | Error message (on failure) |

#### `daw.disconnect_all_from_port`
Disconnect all connections from a port.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| port_name | string | yes | - | Port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| port_name | string | Port name |

#### `daw.is_port_connected`
Check if port has any connections.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| port_name | string | yes | - | Port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| port_name | string | Port name |
| connected | bool | Whether port is connected |

#### `daw.get_port_type`
Get type of a port (audio/MIDI).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| port_name | string | yes | - | Port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| port_name | string | Port name |
| type | string | Port type string |

#### `daw.get_port_latency`
Get latency of a specific port.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| port_name | string | yes | - | Port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| port_name | string | Port name |
| playback_latency_min | int64 | Min playback latency |
| playback_latency_max | int64 | Max playback latency |
| capture_latency_min | int64 | Min capture latency |
| capture_latency_max | int64 | Max capture latency |

#### `daw.get_connection_matrix`
Get complete connection matrix for all routes.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| routes | array | Array of {id, name, output_connections, input_connections} |
| count | int | Number of routes |

#### `daw.get_route_io_connections`
Get all I/O connections for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| route_id | string | Route ID |
| inputs | array | Array of {port, connections[]} |
| outputs | array | Array of {port, connections[]} |

#### `daw.get_audio_port_count`
Count of audio ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| count | int | Number of audio ports |

#### `daw.get_midi_port_count`
Count of MIDI ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| count | int | Number of MIDI ports |

#### `daw.get_physical_port_count`
Count of physical I/O ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| physical_audio_inputs | int | Physical audio input count |
| physical_midi_inputs | int | Physical MIDI input count |
| physical_audio_outputs | int | Physical audio output count |
| physical_midi_outputs | int | Physical MIDI output count |
| total_physical_inputs | int | Total physical inputs |
| total_physical_outputs | int | Total physical outputs |

#### `daw.reconnect_all_ports`
Reconnect all ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |

#### `daw.get_port_pretty_name`
Get human-readable port name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| port_name | string | yes | - | Port name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| port_name | string | Port name |
| pretty_name | string | Human-readable name |

## Engine State (15 commands)

#### `daw.get_engine_state_detailed`
Full engine state.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| running | bool | Engine running |
| sample_rate | int | Sample rate |
| buffer_size | int | Buffer size in samples |
| dsp_load | float | DSP load percentage |
| freewheeling | bool | Freewheel state |
| backend_name | string | Audio backend name |
| xrun_count | int | Total xrun count |
| usecs_per_cycle | int | Microseconds per cycle |
| device_name | string | Audio device name |
| is_realtime | bool | Realtime mode |
| systemic_input_latency | int | Systemic input latency |
| systemic_output_latency | int | Systemic output latency |

#### `daw.get_available_backends`
List audio backends.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| backends | array | Array of backend name strings |
| count | int | Number of backends |
| current | string | Current backend name |

#### `daw.get_current_backend_name`
Current backend name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| backend_name | string | Current backend name |

#### `daw.engine.get_available_sample_rates`
Available sample rates for current device.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| sample_rates | array | Array of available sample rates |
| count | int | Number of rates |
| current | int | Current sample rate |

#### `daw.engine.get_available_buffer_sizes`
Available buffer sizes for current device.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| buffer_sizes | array | Array of buffer size ints |
| count | int | Number of sizes |

#### `daw.get_dsp_load_percent`
Current DSP load as percentage.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| dsp_load_percent | float | DSP load percentage |

#### `daw.get_total_xrun_count`
Total xrun count.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| xrun_count | int | Total xruns |

#### `daw.reset_xrun_count`
Reset xrun counter.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| xrun_count | int | Reset to 0 |

#### `daw.get_engine_latency_info`
Input/output latency in samples and ms.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| worst_input_latency_samples | int64 | Worst input latency |
| worst_output_latency_samples | int64 | Worst output latency |
| worst_input_latency_ms | float | Worst input latency in ms |
| worst_output_latency_ms | float | Worst output latency in ms |
| sample_rate | int | Sample rate |

#### `daw.get_usecs_per_cycle`
Microseconds per audio process cycle.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| usecs_per_cycle | int | Microseconds per cycle |

#### `daw.is_engine_realtime`
Check if running in realtime.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| realtime | bool | Realtime mode |

#### `daw.is_engine_freewheeling`
Check if freewheeling.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| freewheeling | bool | Freewheel state |

#### `daw.get_engine_sample_rate`
Current engine sample rate.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| sample_rate | int | Sample rate |

#### `daw.get_engine_buffer_size`
Current buffer size.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| buffer_size | int | Buffer size in samples |
| usecs_per_cycle | int | Microseconds per cycle |
| sample_rate | int | Sample rate |

#### `daw.get_engine_process_thread_count`
Number of DSP processing threads. (Stub -- not yet implemented.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| info | string | Info message |
| error | string | "not yet implemented" |

## Audio Buffer / Source Access (20 commands)

#### `daw.read_region_peaks`
Read peak data from a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
| n_peaks | int | no | 256 | Number of peaks to read |
| channel | int | no | 0 | Channel index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| peaks | array | Array of {min, max} |
| count | int | Number of peaks read |
| channel | int | Channel index |

#### `daw.get_region_peak_amplitude_db`
Get peak amplitude of a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| peak_amplitude | float | Peak amplitude (linear) |
| peak_db | float | Peak amplitude in dB |

#### `daw.get_region_rms_level`
Calculate RMS level of a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| rms | float | RMS amplitude (linear) |
| rms_db | float | RMS in dB |

#### `daw.get_source_info`
Get details about an audio source.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Source ID |
| name | string | Source name |
| length | int64 | Length in samples |
| writable | bool | Whether source is writable |
| path | string | File path (if file source) |
| origin | string | Origin path (if file source) |
| n_channels | int | Channel count (if audio) |
| format_name | string | File extension (if audio file) |

#### `daw.get_source_path`
Get file path for a source.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| path | string | File path |

#### `daw.get_source_sample_rate`
Native sample rate of a source (falls back to session rate).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| sample_rate | int | Sample rate |

#### `daw.get_source_channel_count`
Channel count of a source.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| channel_count | int | Number of channels |

#### `daw.get_source_length_samples`
Length in samples.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| length_samples | int64 | Length in samples |

#### `daw.get_source_length_seconds`
Length in seconds.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| length_seconds | float | Length in seconds |

#### `daw.get_all_audio_sources`
List all audio sources with metadata.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| sources | array | Array of {id, name, length, writable, n_channels, path} |
| count | int | Number of sources |

#### `daw.get_all_midi_sources`
List all MIDI sources.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| sources | array | Array of {id, name, length, writable, path} |
| count | int | Number of sources |

#### `daw.get_region_source_info`
Get source info for a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| sources | array | Array of {index, id, name, length, writable, path} |
| count | int | Number of sources |

#### `daw.get_audio_file_format`
Get format info (WAV, AIFF, etc.) for an audio source.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| format_name | string | File extension/format |

#### `daw.get_region_channels`
Get channel count for a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| channels | int | Number of channels |

#### `daw.is_source_writable`
Check if a source is writable.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| writable | bool | Whether writable |

#### `daw.get_source_capture_length`
Get captured length for recording sources.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| source_id | string | Source ID |
| capture_length | int64 | Length in samples |

#### `daw.get_region_start_offset`
Get the start offset within the source.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| start_offset_samples | int64 | Start offset in samples |
| position_samples | int64 | Position in samples |
| length_samples | int64 | Length in samples |

#### `daw.get_region_fade_in_length`
Get fade in length for an audio region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| fade_in_active | bool | Whether fade in is active |
| fade_in_length | int64 | Fade in length in samples |

#### `daw.get_region_fade_out_length`
Get fade out length for an audio region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| fade_out_active | bool | Whether fade out is active |
| fade_out_length | int64 | Fade out length in samples |

#### `daw.get_region_envelope_info`
Get region gain envelope info.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | - | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| envelope_active | bool | Whether envelope is active |
| envelope_points | int | Total number of points |
| points | array | Array of {time, value} (max 100) |
| truncated | bool | Whether points list was truncated |

## Thread Pool / Resource Monitoring (15 commands)

#### `daw.get_butler_speed`
Get butler (disk I/O) speed. (Stub.)
**Returns:** `{info, error}`

#### `daw.get_disk_io_stats`
Disk read/write statistics. (Stub.)
**Returns:** `{info, error}`

#### `daw.get_capture_buffer_percent`
Capture buffer fill percentage. (Stub.)
**Returns:** `{info, error}`

#### `daw.get_playback_buffer_percent`
Playback buffer fill percentage. (Stub.)
**Returns:** `{info, error}`

#### `daw.get_session_disk_space`
Available disk space for session directory.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| (none) | - | - | - | - |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| session_path | string | Session directory path |
| free_bytes | int64 | Free bytes |
| free_mb | int64 | Free megabytes |
| free_gb | float | Free gigabytes |

#### `daw.get_total_route_count`
Total number of routes.
**Returns:** `{count: int}`

#### `daw.get_active_route_count`
Number of active (non-hidden) routes.
**Returns:** `{count: int}`

#### `daw.get_total_track_count`
Number of audio+MIDI tracks.
**Returns:** `{audio_tracks: int, midi_tracks: int, total: int}`

#### `daw.get_bus_count`
Number of buses.
**Returns:** `{count: int}`

#### `daw.get_vca_count`
Number of VCAs.
**Returns:** `{count: int}`

#### `daw.get_max_route_latency`
Maximum latency across all routes.
**Returns:** `{worst_route_latency_samples, worst_input_latency_samples, worst_output_latency_samples, worst_route_latency_ms, worst_input_latency_ms, worst_output_latency_ms}`

#### `daw.get_session_format_info`
Session format details.
**Returns:** `{session_name, session_path, snap_name, sample_rate}`

#### `daw.get_session_sample_count`
Total audio samples in session.
**Returns:** `{total_samples: int64, total_seconds: float}`

#### `daw.get_region_count`
Total number of regions.
**Returns:** `{count: int}`

#### `daw.get_total_source_count`
Total number of sources.
**Returns:** `{count: int}`

## Freewheel / Bounce (10 commands)

#### `daw.start_freewheel`
Start freewheeling.
**Returns:** `{ok: bool, error?: string}`

#### `daw.stop_freewheel`
Stop freewheeling.
**Returns:** `{ok: bool, error?: string}`

#### `daw.engine.is_freewheeling`
Check freewheel state.
**Returns:** `{freewheeling: bool}`

#### `daw.freeze_track_processing`
Freeze a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{ok: bool, track_id: string}`

#### `daw.unfreeze_track_processing`
Unfreeze a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{ok: bool, track_id: string}`

#### `daw.get_track_freeze_state`
Get freeze state of a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{track_id, freeze_state: "not_frozen"|"frozen"|"unfrozen", is_frozen: bool}`

#### `daw.bounce_range_to_region`
Bounce a time range to a new region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| start_sample | int64 | yes | - | Start sample |
| end_sample | int64 | yes | - | End sample |
| name | string | no | "bounced" | Region name |
**Returns:** `{ok: bool, region_id?: string, name?: string, length?: int64, error?: string}`

#### `daw.bounce_route_to_file`
Bounce a route to audio file. (Stub.)
**Returns:** `{error, info}`

#### `daw.can_freeze_track`
Check if a track can be frozen.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{track_id, can_freeze: bool}`

#### `daw.get_freeze_info`
Get detailed freeze info for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{track_id, track_name, freeze_state, is_frozen, can_freeze}`

## Latency Management (15 commands)

#### `daw.get_route_total_latency`
Total latency for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{route_id, signal_latency_samples: int64, signal_latency_ms: float}`

#### `daw.get_route_input_latency`
Input latency for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{route_id, input_latency_samples: int64, input_latency_ms: float}`

#### `daw.get_route_output_latency`
Output latency for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{route_id, output_latency_samples: int64, output_latency_ms: float}`

#### `daw.get_processor_latency`
Latency introduced by a specific processor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| index | int | yes | - | Processor index |
**Returns:** `{route_id, processor_index, processor_name, signal_latency_samples, input_latency_samples, output_latency_samples, signal_latency_ms}`

#### `daw.get_capture_latency`
Recording latency.
**Returns:** `{capture_latency_samples: int64, capture_latency_ms: float}`

#### `daw.get_playback_latency`
Playback latency.
**Returns:** `{playback_latency_samples: int64, playback_latency_ms: float}`

#### `daw.get_hardware_input_latency`
Hardware input latency.
**Returns:** `{hardware_input_latency_samples: int, hardware_input_latency_ms: float}`

#### `daw.get_hardware_output_latency`
Hardware output latency.
**Returns:** `{hardware_output_latency_samples: int, hardware_output_latency_ms: float}`

#### `daw.get_worst_track_latency`
Worst-case latency across all tracks.
**Returns:** `{worst_latency_samples: int64, worst_track_name: string, worst_latency_ms: float}`

#### `daw.get_latency_compensation_enabled`
Check if latency compensation is on.
**Returns:** `{enabled: true, info: string}`

#### `daw.get_all_route_latencies`
Latency summary for every route.
**Returns:** `{routes: [{id, name, signal_latency_samples, playback_latency_samples, signal_latency_ms, playback_latency_ms}], count}`

#### `daw.set_systemic_input_latency`
Set systemic input latency.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| latency_samples | int | yes | - | Latency in samples |
**Returns:** `{ok: bool, systemic_input_latency: int}`

#### `daw.set_systemic_output_latency`
Set systemic output latency.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| latency_samples | int | yes | - | Latency in samples |
**Returns:** `{ok: bool, systemic_output_latency: int}`

#### `daw.get_systemic_input_latency`
Get systemic input latency.
**Returns:** `{systemic_input_latency_samples: int, systemic_input_latency_ms: float}`

#### `daw.get_systemic_output_latency`
Get systemic output latency.
**Returns:** `{systemic_output_latency_samples: int, systemic_output_latency_ms: float}`

---

# 2. Analysis Commands (`dawflow_commands_analysis.cc`)

## Real-Time Audio Analysis (20 commands)

#### `daw.get_route_meter_levels`
Get current meter levels for a route (peak + RMS per channel).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, channels: [{channel, peak_dB, rms_dB}], n_channels}`

#### `daw.get_route_peak_meter`
Get peak meter reading for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, peaks_dB: float[], max_peak_dB: float}`

#### `daw.get_route_rms_meter`
Get RMS meter reading for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, rms_dB: float[], n_channels}`

#### `daw.get_all_route_meters`
Get meter levels for all routes at once.
**Returns:** `{routes: [{id, name, channels: [{peak_dB, rms_dB}], n_channels}], count}`

#### `daw.get_master_meter_levels`
Get master bus meter levels (peak, RMS, K-14, K-20).
**Returns:** `{channels: [{channel, peak_dB, rms_dB, k14_dB, k20_dB}], n_channels, name}`

#### `daw.get_route_meter_k14`
Get K-14 metering for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, k14_dB: float[], n_channels}`

#### `daw.get_route_meter_k20`
Get K-20 metering for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, k20_dB: float[], n_channels}`

#### `daw.get_meter_type_for_route`
Get the metering type set for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, meter_type: string}`

#### `daw.set_meter_type_for_route`
Set metering type for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| meter_type | string | yes | - | "Peak", "Krms", "K20", "K14", "VU", etc. |
**Returns:** `{ok: true, track_id, meter_type}`

#### `daw.get_meter_falloff_rate`
Get meter falloff rate.
**Returns:** `{meter_falloff: float}`

#### `daw.set_meter_falloff_rate`
Set meter falloff rate.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| falloff | float | yes | - | Falloff rate |
**Returns:** `{ok: true, meter_falloff: float}`

#### `daw.get_route_meter_hold`
Get meter peak hold value.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, peak_hold_dB: float[], n_channels}`

#### `daw.reset_route_meter_peak`
Reset peak hold for a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{ok: true, track_id}`

#### `daw.reset_all_meter_peaks`
Reset all peak holds.
**Returns:** `{ok: true, count: int}`

#### `daw.get_meter_line_up_level`
Get meter line-up level config.
**Returns:** `{meter_type_master, meter_type_track, meter_type_bus, meter_falloff}`

#### `daw.get_route_input_meter`
Get input (pre-fader) meter levels.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, channels: [{channel, peak_dB, rms_dB}], meter_point, note}`

#### `daw.get_route_output_meter`
Get output (post-fader) meter levels.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, channels: [{channel, peak_dB, rms_dB}], meter_point, note}`

#### `daw.get_route_meter_position`
Get meter position in signal chain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, meter_point}`

#### `daw.get_session_meter_type`
Get default session meter type.
**Returns:** `{meter_type_master, meter_type_track, meter_type_bus}`

#### `daw.set_session_meter_type`
Set default session meter type.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| meter_type | string | yes | - | Meter type string |
| target | string | no | "track" | "master", "bus", or "track" |
**Returns:** `{ok: true, target, meter_type}`

## Loudness Analysis (15 commands)

#### `daw.analyze_region_loudness`
Analyze loudness of a region (approximate integrated LUFS).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, integrated_lufs, peak_dBFS, rms_dBFS, note}`

#### `daw.get_region_loudness_range`
Get loudness range (LRA) of a region. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, lra_lu: 0.0, note}`

#### `daw.get_region_true_peak`
Get true peak level of a region (sample peak approximation).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, true_peak_dBTP, sample_peak, note}`

#### `daw.get_region_momentary_loudness`
Get max momentary loudness. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, momentary_lufs: 0.0, note}`

#### `daw.get_region_short_term_loudness`
Get max short-term loudness. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, short_term_lufs: 0.0, note}`

#### `daw.analyze_track_loudness`
Analyze loudness of entire track content.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{track_id, peak_dBFS, rms_dBFS, lufs_approx, region_count, note}`

#### `daw.get_session_loudness_target`
Get session loudness target. (Stub, default -14 LUFS.)
**Returns:** `{target_lufs: -14.0, standard, note}`

#### `daw.set_session_loudness_target`
Set session loudness target. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| target_lufs | float | yes | - | Target LUFS |
**Returns:** `{ok: true, target_lufs, note}`

#### `daw.get_export_loudness_spec`
Get export loudness specification. (Stub.)
**Returns:** `{target_lufs: -14.0, true_peak_dBTP: -1.0, standard, note}`

#### `daw.set_export_loudness_target`
Set export loudness target. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| target_lufs | float | yes | - | Target LUFS |
| true_peak_dBTP | float | no | -1.0 | True peak limit |
**Returns:** `{ok: true, target_lufs, true_peak_dBTP, note}`

#### `daw.normalize_region_loudness`
Normalize region to target LUFS (applies gain via scale_amplitude).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| target_lufs | float | no | -14.0 | Target LUFS |
**Returns:** `{ok, track_id, region_id, target_lufs, measured_lufs, gain_adjustment_dB, new_scale, note}`

#### `daw.get_loudness_standards`
List available loudness standards.
**Returns:** `{standards: [{name, target_lufs, true_peak_dBTP, use}], count}`

#### `daw.get_region_dynamic_range`
Calculate dynamic range of a region (peak-to-RMS).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, dynamic_range_dB, peak_dBFS, rms_dBFS}`

#### `daw.get_region_crest_factor`
Calculate crest factor (peak/RMS ratio).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, crest_factor_dB, crest_factor_linear, peak_dBFS, rms_dBFS}`

#### `daw.get_region_dc_offset`
Detect DC offset in a region. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, dc_offset: 0.0, has_offset: false, note}`

## Spectral Analysis (15 commands)

#### `daw.get_region_spectrum`
Get frequency spectrum of a region (FFT). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| fft_size | int | no | 4096 | FFT size |
**Returns:** `{track_id, region_id, fft_size, sample_rate, bins: [{frequency_hz, magnitude_dB}], note}`

#### `daw.get_region_spectral_centroid`
Get spectral centroid (brightness measure). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, spectral_centroid_hz: 0.0, note}`

#### `daw.get_region_spectral_rolloff`
Get spectral rolloff frequency. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| rolloff_percentage | float | no | 0.85 | Rolloff percentage |
**Returns:** `{track_id, region_id, rolloff_percentage, spectral_rolloff_hz: 0.0, note}`

#### `daw.get_region_spectral_flux`
Get spectral flux (change over time). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, spectral_flux: 0.0, note}`

#### `daw.get_region_spectral_flatness`
Get spectral flatness (noise vs tone). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, spectral_flatness: 0.0, description, note}`

#### `daw.get_region_bandwidth`
Get bandwidth of signal. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, bandwidth_hz, low_freq_hz, high_freq_hz, note}`

#### `daw.get_region_frequency_peaks`
Get dominant frequency peaks. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| num_peaks | int | no | 10 | Number of peaks |
**Returns:** `{track_id, region_id, peaks: [{frequency_hz, magnitude_dB, rank}], num_peaks, note}`

#### `daw.get_region_harmonic_content`
Analyze harmonic content. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, fundamental_hz, harmonics: [], thd_percent, note}`

#### `daw.get_region_noise_floor`
Estimate noise floor level. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, noise_floor_dB: -96.0, note}`

#### `daw.get_region_spectral_balance`
Get low/mid/high frequency balance. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, low_dB, mid_dB, high_dB, low_range, mid_range, high_range, note}`

#### `daw.get_region_frequency_band_energy`
Get energy in specific frequency bands. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| low_freq_hz | float | no | 20.0 | Low frequency bound |
| high_freq_hz | float | no | 20000.0 | High frequency bound |
**Returns:** `{track_id, region_id, low_freq_hz, high_freq_hz, energy_dB, note}`

#### `daw.get_region_spectrogram_data`
Get spectrogram data (time x frequency). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| fft_size | int | no | 2048 | FFT size |
| hop_size | int | no | 512 | Hop size |
**Returns:** `{track_id, region_id, fft_size, hop_size, frames: [], n_frames, n_bins, note}`

#### `daw.get_region_mel_spectrum`
Get mel-frequency spectrum. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| n_mels | int | no | 128 | Number of mel bands |
**Returns:** `{track_id, region_id, n_mels, mel_bands: float[], note}`

#### `daw.get_region_octave_band_levels`
Get levels per octave band. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, bands: [{center_hz, level_dB}], n_bands: 10, note}`

#### `daw.get_region_third_octave_levels`
Get levels per 1/3 octave band (ISO 266). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, bands: [{center_hz, level_dB}], n_bands: 30, note}`

## Transient / Rhythm Analysis (15 commands)

#### `daw.detect_region_transients`
Detect transients in a region. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| threshold | float | no | 0.3 | Detection threshold |
**Returns:** `{track_id, region_id, transients: [], count: 0, threshold, note}`

#### `daw.get_region_onset_times`
Get onset times (attack points). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, onsets: [], count: 0, note}`

#### `daw.detect_region_tempo`
Detect tempo of a region. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, tempo_bpm: 0.0, confidence: 0.0, note}`

#### `daw.get_region_beat_positions`
Get beat positions. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, beats: [], count: 0, note}`

#### `daw.detect_region_time_signature`
Estimate time signature. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, numerator: 0, denominator: 0, confidence: 0.0, note}`

#### `daw.get_region_rhythm_pattern`
Extract rhythm pattern. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, pattern: [], note}`

#### `daw.get_region_groove_template`
Extract groove template (timing deviations). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, deviations: [], note}`

#### `daw.detect_region_downbeats`
Detect downbeat positions. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, downbeats: [], count: 0, note}`

#### `daw.get_region_tempo_curve`
Get tempo variation over time. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, tempo_points: [], note}`

#### `daw.detect_region_silence`
Detect silence regions with threshold. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| threshold_db | float | no | -60.0 | Silence threshold in dB |
| min_length_samples | int64 | no | 4410 | Min silence length |
**Returns:** `{track_id, region_id, silent_sections: [], count: 0, threshold_db, min_length_samples, note}`

#### `daw.get_region_zero_crossings`
Get zero-crossing rate. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, zero_crossing_rate: 0.0, total_zero_crossings: 0, note}`

#### `daw.detect_region_clicks`
Detect clicks/pops in audio. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| sensitivity | float | no | 0.5 | Detection sensitivity |
**Returns:** `{track_id, region_id, clicks: [], count: 0, sensitivity, note}`

#### `daw.get_region_transient_density`
Get transient density over time. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, density_per_second: 0.0, density_curve: [], note}`

#### `daw.split_region_at_transients`
Split region at detected transients. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| threshold | float | no | 0.3 | Detection threshold |
**Returns:** `{ok: false, track_id, region_id, new_regions: [], note}`

#### `daw.get_region_attack_time`
Estimate average attack time. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, attack_time_ms: 0.0, note}`

## Pitch Analysis (10 commands)

#### `daw.detect_region_pitch`
Detect fundamental pitch. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, pitch_hz, midi_note, note_name, cents_deviation, confidence, note}`

#### `daw.get_region_pitch_curve`
Get pitch variation over time. (Stub.)
**Returns:** `{track_id, region_id, pitch_points: [], note}`

#### `daw.detect_region_key`
Estimate musical key. (Stub.)
**Returns:** `{track_id, region_id, key, mode, confidence, note}`

#### `daw.detect_region_scale`
Estimate musical scale. (Stub.)
**Returns:** `{track_id, region_id, scale, root, confidence, note}`

#### `daw.get_region_pitch_histogram`
Get histogram of pitches (chroma vector). (Stub.)
**Returns:** `{track_id, region_id, chroma: [{note, energy}], note}`

#### `daw.detect_region_tuning`
Detect tuning reference (A=440 etc.). (Stub.)
**Returns:** `{track_id, region_id, reference_hz: 440.0, deviation_cents, confidence, note}`

#### `daw.get_region_pitch_stability`
Measure pitch stability. (Stub.)
**Returns:** `{track_id, region_id, pitch_stability, pitch_std_dev_cents, note}`

#### `daw.get_region_vibrato_rate`
Estimate vibrato rate. (Stub.)
**Returns:** `{track_id, region_id, vibrato_rate_hz, vibrato_depth_cents, has_vibrato, note}`

#### `daw.get_region_pitch_range`
Get pitch range (lowest to highest). (Stub.)
**Returns:** `{track_id, region_id, lowest_hz, highest_hz, range_semitones, lowest_note, highest_note, note}`

#### `daw.detect_region_chord`
Estimate chord from audio. (Stub.)
**Returns:** `{track_id, region_id, chord, root, quality, confidence, note}`

## Waveform / Display Analysis (15 commands)

#### `daw.get_waveform_overview`
Get downsampled waveform for overview display.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| width_pixels | int | no | 800 | Output width |
**Returns:** `{track_id, region_id, channels: [{channel, min[], max[], n_peaks}], n_channels, width_pixels, length_samples}`

#### `daw.get_waveform_detail`
Get detailed waveform for zoomed view.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| start_sample | int64 | no | 0 | Start sample |
| end_sample | int64 | yes | - | End sample |
| width_pixels | int | no | 1024 | Output width |
**Returns:** `{track_id, region_id, channels: [{channel, min[], max[], n_peaks}], start_sample, end_sample, width_pixels}`

#### `daw.get_waveform_peaks_per_pixel`
Get peaks at given zoom level.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| start_sample | int64 | no | 0 | Start sample |
| n_samples | int64 | yes | - | Number of samples |
| n_peaks | int | yes | - | Number of peaks |
**Returns:** `{track_id, region_id, channels: [{channel, min[], max[], n_peaks}], n_channels, samples_per_peak}`

#### `daw.get_region_waveform_cache_status`
Check if waveform cache is built.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, cache_ready: bool, n_channels}`

#### `daw.build_region_waveform_cache`
Trigger waveform cache building.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{ok: true, track_id, region_id}`

#### `daw.get_region_overview_data`
Get region overview for arrangement view.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| width_pixels | int | no | 200 | Output width |
**Returns:** `{track_id, region_id, region_name, start_sample, length_samples, min[], max[], n_peaks}`

#### `daw.get_minimap_data`
Get waveform minimap data for all regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| peaks_per_region | int | no | 100 | Peaks per region |
**Returns:** `{tracks: [{id, name, regions: [{id, name, start_sample, length_samples, peaks[]}]}], count}`

#### `daw.get_region_thumbnail`
Get compact waveform thumbnail.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| width | int | no | 64 | Thumbnail width |
**Returns:** `{track_id, region_id, thumbnail: float[], width}`

#### `daw.get_stereo_correlation`
Get stereo correlation for a region. (Stub for stereo.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, correlation, note}`

#### `daw.get_stereo_width`
Get stereo width measurement. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, stereo_width, note}`

#### `daw.get_phase_correlation`
Get phase correlation between channels. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, phase_correlation, note}`

#### `daw.get_mid_side_balance`
Get mid/side balance. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, mid_dB, side_dB, balance, note}`

#### `daw.get_channel_difference`
Get difference between L/R channels. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, difference_dB, correlation, note}`

#### `daw.get_region_sample_value_at`
Get sample value at specific position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| position_sample | int64 | yes | - | Sample position |
| channel | int | no | 0 | Channel index |
**Returns:** `{track_id, region_id, position_sample, channel, value: float, value_dB}`

#### `daw.get_region_statistics`
Get statistical summary (peak, RMS, crest, duration, channels).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, region_name, length_samples, duration_sec, n_channels, sample_rate, peak_amplitude, peak_dBFS, rms_amplitude, rms_dBFS, crest_factor_dB, dynamic_range_dB}`

## Plugin Chain Analysis (10 commands)

#### `daw.get_route_total_plugin_latency`
Total latency from all plugins on route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, total_latency_samples, total_latency_ms, plugins: [{id, name, latency_samples, latency_ms}]}`

#### `daw.get_plugin_processing_latency`
Latency for specific plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, latency_samples, latency_ms}`

#### `daw.get_plugin_cpu_usage`
CPU usage for a plugin. (Stub -- per-plugin CPU not available.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, cpu_percent: 0.0, note}`

#### `daw.get_route_cpu_usage`
Total CPU usage for a route. (Reports session DSP load.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
**Returns:** `{track_id, plugin_count, dsp_load, note}`

#### `daw.get_plugin_type_info`
Get type info (VST3/AU/LV2/LADSPA/Lua) for a plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, type, creator, category, unique_id}`

#### `daw.get_plugin_format_info`
Get format info (mono/stereo/surround).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, input_audio, input_midi, output_audio, output_midi, format}`

#### `daw.get_plugin_channel_config`
Get channel configuration.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, input_audio, input_midi, output_audio, output_midi, strict_io}`

#### `daw.get_plugin_has_editor`
Check if plugin has custom editor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, has_editor: bool}`

#### `daw.get_plugin_is_instrument`
Check if plugin is an instrument.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, is_instrument: bool, category}`

#### `daw.get_plugin_category`
Get plugin category.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{track_id, processor_id, name, category}`

## Audio Comparison (10 commands)

#### `daw.compare_region_levels`
Compare loudness between two regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id_a | string | yes | - | Track A |
| region_id_a | string | yes | - | Region A |
| track_id_b | string | yes | - | Track B |
| region_id_b | string | yes | - | Region B |
**Returns:** `{region_a: {track_id, region_id, peak_dBFS, rms_dBFS}, region_b: {...}, peak_difference_dB, rms_difference_dB}`

#### `daw.get_region_difference`
Get sample-level difference between regions. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id_a, region_id_a, track_id_b, region_id_b | string | yes | - | Two regions to compare |
**Returns:** `{region_a, region_b, max_diff, rms_diff, note}`

#### `daw.correlate_regions`
Cross-correlate two regions (for alignment). (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id_a, region_id_a, track_id_b, region_id_b | string | yes | - | Two regions |
**Returns:** `{region_a, region_b, peak_correlation, offset_samples, note}`

#### `daw.get_region_similarity`
Get similarity score between regions. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id_a, region_id_a, track_id_b, region_id_b | string | yes | - | Two regions |
**Returns:** `{region_a, region_b, similarity, note}`

#### `daw.detect_region_clipping`
Detect clipping in a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| threshold | float | no | 0.9999 | Clipping threshold |
**Returns:** `{track_id, region_id, clipping: bool, peak_amplitude, peak_dBFS, threshold}`

#### `daw.get_region_headroom`
Get headroom before clipping.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, headroom_dB, peak_dBFS}`

#### `daw.get_region_signal_to_noise`
Estimate signal-to-noise ratio. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, snr_dB: 0.0, note}`

#### `daw.count_region_clips`
Count clipped samples. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| threshold | float | no | 0.9999 | Clipping threshold |
**Returns:** `{track_id, region_id, clipped_samples: 0, total_samples, threshold, note}`

#### `daw.get_region_peak_histogram`
Get histogram of peak values. (Stub.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| n_bins | int | no | 64 | Number of histogram bins |
**Returns:** `{track_id, region_id, bins: [{low_dB, high_dB, count}], n_bins, note}`

#### `daw.get_region_amplitude_distribution`
Get amplitude distribution.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{track_id, region_id, peak_dBFS, rms_dBFS, percentile_10, percentile_50, percentile_90, percentile_99, note}`

---

# 3. Advanced Editing Commands (`dawflow_commands_advanced_editing.cc`)

## Advanced Region Operations (20 commands)

#### `daw.get_regions_in_range`
Get all regions in a time range on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| start | int64 | yes | - | Start sample |
| end | int64 | yes | - | End sample |
**Returns:** `{regions: [{id, name, position, start, length, layer, muted, opaque, locked}], count}`

#### `daw.get_overlapping_regions`
Find overlapping regions on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{overlaps: [{region_a, region_b, overlap_start, overlap_end}], count}`

#### `daw.get_region_boundaries`
Get all region start/end points on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{boundaries: int64[], count}`

#### `daw.get_region_at_sample_position`
Get region(s) at a specific sample position on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| position | int64 | yes | - | Sample position |
**Returns:** `{regions: [...], count}`

#### `daw.get_topmost_region_at`
Get topmost (highest layer) region at position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| position | int64 | yes | - | Sample position |
**Returns:** `{region: {...}|null, found: bool}`

#### `daw.get_regions_by_name`
Search regions by name pattern across all tracks.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| pattern | string | yes | - | Substring to match |
**Returns:** `{regions: [{...region, track_id, track_name}], count}`

#### `daw.get_region_layer`
Get the layer number of a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{region_id, layer: int}`

#### `daw.set_region_layer`
Set the layer of a region (raise/lower).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| action | string | no | "raise" | "raise", "lower", "raise_to_top", "lower_to_bottom" |
**Returns:** `{ok: true, layer: int}`

#### `daw.region.raise_to_top_layer`
Raise region to topmost layer.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{ok: true, layer: int}`

#### `daw.region.lower_to_bottom_layer`
Lower region to bottom layer.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{ok: true, layer: int}`

#### `daw.get_region_sync_point`
Get region sync point.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{region_id, sync_point: int64, position: int64}`

#### `daw.region.set_sync_point`
Set region sync point.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| sync_position | int64 | yes | - | Sync position in samples |
**Returns:** `{ok: true, sync_point: int64}`

#### `daw.place_region_at_sync`
Place region so sync point aligns with position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| position | int64 | yes | - | Target position |
**Returns:** `{ok: true, position: int64}`

#### `daw.get_region_bounds`
Get start, end, length, position all at once.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{region_id, position, start, length, end, layer, name}`

#### `daw.set_region_bounds`
Set start, end, length in one call.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| position | int64 | no | - | New position |
| length | int64 | no | - | New length |
| start | int64 | no | - | New start offset |
**Returns:** `{ok: true, position, start, length}`

#### `daw.get_region_equivalent`
Get equivalent region on another playlist (matching position and length).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Source track ID |
| region_id | string | yes | - | Region ID |
| target_track_id | string | yes | - | Target track ID |
**Returns:** `{equivalents: [...], count}`

#### `daw.find_next_region_boundary`
Find next region boundary after position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| position | int64 | yes | - | Current position |
**Returns:** `{boundary: int64|null, found: bool}`

#### `daw.find_prev_region_boundary`
Find previous region boundary before position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| position | int64 | yes | - | Current position |
**Returns:** `{boundary: int64|null, found: bool}`

#### `daw.get_region_automation`
Get automation data associated with a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{region_id, name, position, length, description}`

#### `daw.get_compound_region_info`
Get info about compound (nested) regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{region_id, name, is_compound, source_level, whole_file, position, length}`

## Snap & Grid (15 commands)

#### `daw.editor.get_snap_mode` -- (Stub) **Returns:** `{snap_mode, description}`
#### `daw.editor.set_snap_mode` -- Params: `mode: string` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_grid_type` -- (Stub) **Returns:** `{grid_type, description}`
#### `daw.set_grid_type` -- Params: `grid_type: string` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.snap_position_to_grid`
Snap a given position to nearest beat boundary.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| position | int64 | yes | - | Position to snap |
**Returns:** `{original_position, snapped_position, snapped_bbt}`

#### `daw.get_grid_points_in_range`
Get all grid (beat) points in a time range.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | - | Start sample |
| end | int64 | yes | - | End sample |
**Returns:** `{grid_points: [{position, bbt}], count}`

#### `daw.get_nearest_grid_point`
Get nearest grid point to a position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| position | int64 | yes | - | Position |
**Returns:** `{position, nearest, nearest_bbt, distance}`

#### `daw.get_snap_threshold` -- (Stub) **Returns:** `{threshold: 10, description}`
#### `daw.set_snap_threshold` -- Params: `threshold: int` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_grid_subdivision` -- (Stub) **Returns:** `{subdivision: 1, description}`
#### `daw.set_grid_subdivision` -- Params: `subdivision: int` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.is_snap_enabled` -- (Stub) **Returns:** `{enabled: true, description}`
#### `daw.toggle_snap` -- (Stub) **Returns:** `{ok: false, description}`
#### `daw.get_visible_grid_lines`
Get grid line positions in visible range.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | no | 0 | Start sample |
| end | int64 | no | session end | End sample |
**Returns:** `{lines: [{position, is_bar, bbt}], count}`

#### `daw.editor.snap_regions_to_grid`
Snap all regions on a track to nearest grid.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{ok: true, snapped: int, total: int}`

## Edit Modes & Tools (15 commands)

#### `daw.get_edit_mode`
Get current edit mode.
**Returns:** `{edit_mode: "slide"|"ripple"|"lock"}`

#### `daw.set_edit_mode`
Set edit mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| mode | string | yes | - | "slide", "ripple", or "lock" |
**Returns:** `{ok: true, edit_mode}`

#### `daw.get_edit_point` -- (Stub) **Returns:** `{edit_point: "playhead", description}`
#### `daw.set_edit_point` -- Params: `edit_point: string` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_ripple_mode` -- (Stub) **Returns:** `{ripple_mode: "off", description}`
#### `daw.set_ripple_mode` -- Params: `mode: string` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_draw_length` -- (Stub) **Returns:** `{draw_length: "quarter", description}`
#### `daw.set_draw_length` -- Params: `length: string` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_draw_velocity` -- (Stub) **Returns:** `{draw_velocity: 100, description}`
#### `daw.set_draw_velocity` -- Params: `velocity: int` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_draw_channel` -- (Stub) **Returns:** `{draw_channel: 0, description}`
#### `daw.set_draw_channel` -- Params: `channel: int` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_zoom_focus` -- (Stub) **Returns:** `{zoom_focus: "playhead", description}`
#### `daw.set_zoom_focus` -- Params: `focus: string` (Stub) **Returns:** `{ok: false, requested, description}`
#### `daw.get_mouse_mode` -- (Stub) **Returns:** `{mouse_mode: "object", description}`

## MIDI Learn / Mapping (15 commands)

#### `daw.start_midi_learn` -- Params: `control_path: string` (Stub)
#### `daw.stop_midi_learn` -- (Stub)
#### `daw.get_midi_bindings` -- (Stub) **Returns:** `{bindings: [], count: 0}`
#### `daw.add_midi_binding` -- Params: `control_path: string, channel: int, cc: int` (Stub)
#### `daw.remove_midi_binding` -- Params: `control_path: string` (Stub)
#### `daw.clear_all_midi_bindings` -- (Stub)
#### `daw.get_midi_binding_for_control` -- Params: `control_path: string` (Stub)
#### `daw.get_controllable_list`
List all MIDI-controllable parameters (gain, solo, mute, pan per route).
**Returns:** `{controllables: [{path, id, type, track}], count}`

#### `daw.get_midi_feedback_enabled` -- (Stub) **Returns:** `{enabled: false}`
#### `daw.set_midi_feedback_enabled` -- Params: `enabled: bool` (Stub)
#### `daw.get_midi_input_ports`
Get available MIDI input ports for control.
**Returns:** `{ports: [{name, type}], count}`

#### `daw.set_midi_control_port` -- Params: `port_name: string` (Stub)
#### `daw.get_generic_midi_controls` -- (Stub) **Returns:** `{controls: [], count: 0}`
#### `daw.save_midi_bindings` -- Params: `filepath: string` (Stub)
#### `daw.load_midi_bindings` -- Params: `filepath: string` (Stub)

## MIDI Scene Changes (10 commands)

#### `daw.get_scene_changes`
Get all MIDI scene changes in session.
**Returns:** `{scene_changes: [{location_id, location_name, position, program, bank, channel, active}], count}`

#### `daw.add_scene_change`
Add a MIDI scene change at position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| position | int64 | yes | - | Sample position |
| program | int | no | 0 | MIDI program number |
| bank | int | no | -1 | Bank select (-1 = none) |
| channel | int | no | 0 | MIDI channel |
| name | string | no | "Scene" | Location name |
**Returns:** `{ok: true, location_id, program, bank, channel}`

#### `daw.remove_scene_change`
Remove a scene change.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| location_id | string | yes | - | Location ID |
**Returns:** `{ok: true}`

#### `daw.get_scene_change_at`
Get scene change at a marker.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| location_id | string | yes | - | Location ID |
**Returns:** `{found: bool, location_name, position, active, program, bank, channel}`

#### `daw.set_scene_change_program`
Set program change for a scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| location_id | string | yes | - | Location ID |
| program | int | yes | - | MIDI program number |
**Returns:** `{ok: true, program}`

#### `daw.set_scene_change_bank`
Set bank select for a scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| location_id | string | yes | - | Location ID |
| bank | int | yes | - | Bank number |
**Returns:** `{ok: true, bank}`

#### `daw.set_scene_change_channel`
Set MIDI channel for a scene change.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| location_id | string | yes | - | Location ID |
| channel | int | yes | - | MIDI channel |
**Returns:** `{ok: true, channel}`

#### `daw.get_scene_change_details`
Get full details of a scene change.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| location_id | string | yes | - | Location ID |
**Returns:** `{found, location_id, location_name, position, active, program, bank, channel, type}`

#### `daw.enable_scene_changes`
Enable/disable all scene change sending.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| enabled | bool | yes | - | Enable/disable |
**Returns:** `{ok: true, enabled, count}`

#### `daw.get_scene_changes_enabled`
Check if scene changes are enabled.
**Returns:** `{total, active, enabled: bool}`

## Playlist Operations (15 commands)

#### `daw.playlist.get_for_track`
Get all playlists for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{playlists: [{id, name, region_count, current}], count}`

#### `daw.playlist.get_regions`
Get all regions in a playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{playlist_name, regions: [...], count}`

#### `daw.get_playlist_length`
Get length of a playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{playlist_name, length: int64, region_count}`

#### `daw.get_playlist_region_count`
Get region count in a playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{playlist_name, count}`

#### `daw.playlist.switch_for_track`
Switch a track to different playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| playlist_id | string | yes | - | Playlist ID |
**Returns:** `{ok: true, playlist_name}`

#### `daw.playlist.create_new`
Create a new empty playlist for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| switch_to | bool | no | true | Switch to new playlist |
| name | string | no | auto | Playlist name |
**Returns:** `{ok: true, playlist_id, playlist_name}`

#### `daw.copy_playlist`
Copy/duplicate a playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| switch_to | bool | no | true | Switch to copy |
| name | string | no | auto | Name for copy |
**Returns:** `{ok: true, playlist_id, playlist_name}`

#### `daw.rename_playlist`
Rename a playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| name | string | yes | - | New name |
**Returns:** `{ok: true, name}`

#### `daw.clear_playlist`
Remove all regions from a playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{ok: true, regions_removed: int}`

#### `daw.get_unused_playlists`
Get playlists not assigned to any track.
**Returns:** `{playlists: [{id, name, region_count}], count}`

#### `daw.remove_unused_playlists`
Remove unused playlists.
**Returns:** `{ok: true, removed: int}`

#### `daw.get_playlist_modified`
Check if playlist has been modified.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{playlist_name, modified: bool, region_count}`

#### `daw.playlist.get_all`
List all playlists in the session.
**Returns:** `{playlists: [{id, name, region_count, hidden}], count}`

#### `daw.get_hidden_playlists`
Get hidden playlists.
**Returns:** `{playlists: [{id, name, region_count}], count}`

#### `daw.get_playlist_properties`
Get all properties of a playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{id, name, region_count, length, hidden, shared, empty}`

## Selection Operations (10 commands)

#### `daw.selection.get_regions` -- (Stub) **Returns:** `{regions: [], count: 0}`
#### `daw.selection.get_tracks` -- (Stub) **Returns:** `{tracks: [], count: 0}`
#### `daw.selection.regions_in_range`
Select regions in a time range.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| start | int64 | yes | - | Start sample |
| end | int64 | yes | - | End sample |
**Returns:** `{regions: [...], count}`

#### `daw.select_all_regions_on_track`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
**Returns:** `{regions: [...], count}`

#### `daw.select_regions_by_name`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| pattern | string | yes | - | Name pattern |
**Returns:** `{regions: [{...region, track_id, track_name}], count}`

#### `daw.deselect_all_regions` -- (Stub)
#### `daw.invert_region_selection` -- (Stub)
#### `daw.select_next_region`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| after_position | int64 | no | 0 | Position after which to find next |
**Returns:** `{region: {...}|null, found: bool}`

#### `daw.select_prev_region`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| before_position | int64 | no | 0 | Position before which to find prev |
**Returns:** `{region: {...}|null, found: bool}`

#### `daw.get_selection_bounds` -- (Stub) **Returns:** `{start: 0, end: 0, has_selection: false}`

## Audition (10 commands)

#### `daw.audition_region`
Audition (preview) a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{ok: true, auditioning: string}`

#### `daw.stop_audition`
Stop auditioning.
**Returns:** `{ok: true}`

#### `daw.is_auditioning`
Check if currently auditioning.
**Returns:** `{auditioning: bool}`

#### `daw.audition_source`
Audition an audio source. (Info only -- needs region.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | - | Source ID |
**Returns:** `{ok: false, source_name, length, description}`

#### `daw.set_audition_volume`
Set audition volume.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| volume | float | yes | - | Volume coefficient |
**Returns:** `{ok: bool, volume}`

#### `daw.get_audition_volume`
Get audition volume.
**Returns:** `{volume: float}`

#### `daw.audition_from_position`
Audition from a specific position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | - | Track ID |
| region_id | string | yes | - | Region ID |
| position | int64 | yes | - | Start position |
**Returns:** `{ok: true, auditioning, requested_start, description}`

#### `daw.audition_range`
Audition a time range. (Not directly supported.)
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | - | Start sample |
| end | int64 | yes | - | End sample |
**Returns:** `{ok: false, start, end, description}`

#### `daw.get_audition_position`
Get current audition position.
**Returns:** `{auditioning: bool, position: int64}`

#### `daw.get_audition_length`
Get audition length.
**Returns:** `{auditioning: bool, length: int, position: int64}`

---

# 4. Session Deep Commands (`dawflow_commands_session_deep.cc`)

## Session XML / State Access (20 commands)

#### `daw.get_session_state_xml`
Get basic session state info.
**Returns:** `{session_name, path, sample_rate, dirty, note}`

#### `daw.get_route_state_xml`
Get full XML state of a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
**Returns:** `{xml: string, route_id}`

#### `daw.get_processor_state_xml`
Get XML state of a processor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{xml: string, processor_id}`

#### `daw.get_plugin_state_xml`
Get XML state of a plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{xml: string, processor_id}`

#### `daw.get_playlist_state_xml`
Get XML state of a track's playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID (must be a track) |
**Returns:** `{xml: string, playlist_name}`

#### `daw.get_region_state_xml`
Get XML state of a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| region_id | string | yes | - | Region ID |
**Returns:** `{xml: string, region_id}`

#### `daw.get_location_state_xml`
Get XML state of a location.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | - | Location name |
**Returns:** `{xml: string, name}`

#### `daw.get_tempo_map_state_xml`
Get XML state of the tempo map.
**Returns:** `{xml: string}`

#### `daw.get_route_group_state_xml`
Get XML state of a route group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | - | Group name |
**Returns:** `{xml: string, name}`

#### `daw.get_session_metadata`
Get all session metadata fields.
**Returns:** `{title, artist, album, album_artist, composer, conductor, genre, comment, copyright, isrc, year, description, producer, engineer, lyricist, arranger, remixer, barcode}`

#### `daw.set_session_metadata`
Set session metadata fields (any subset).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| title | string | no | - | Title |
| artist | string | no | - | Artist |
| album | string | no | - | Album |
| (etc.) | string/uint32 | no | - | Any metadata field |
**Returns:** `{ok: true, fields_set: int}`

#### `daw.get_session_description`
Get session description.
**Returns:** `{description: string}`

#### `daw.set_session_description`
Set session description.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| description | string | yes | - | Description text |
**Returns:** `{ok: true}`

#### `daw.get_session_creation_date`
Get session creation date.
**Returns:** `{creation_date: string, session_path}`

#### `daw.get_session_modification_date`
Get session modification date.
**Returns:** `{modification_date: string}`

#### `daw.get_session_version`
Get session version info.
**Returns:** `{session_name, snap_name, sample_rate}`

#### `daw.get_session_program_version`
Get program version.
**Returns:** `{program: "DAWFLOW", revision: string}`

#### `daw.get_session_uuid`
Get session unique identifier (hash-based).
**Returns:** `{session_name, session_path, uuid: string}`

#### `daw.get_session_ardour_version`
Get Ardour revision.
**Returns:** `{ardour_revision: string}`

#### `daw.export_session_state`
Export session state as JSON.
**Returns:** `{state: {session_name, path, sample_rate, dirty, note}, format: "json"}`

## Plugin State Serialization (20 commands)

#### `daw.get_plugin_state_blob`
Get plugin state as base64-encoded XML.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{blob: string, encoding: "base64", processor_id}`

#### `daw.set_plugin_state_blob`
Set plugin state from base64-encoded XML.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
| blob | string | yes | - | Base64 state blob |
**Returns:** `{ok: true, processor_id}`

#### `daw.get_plugin_preset_data`
Get plugin presets.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{presets: [{uri, label, user}], count, current_preset}`

#### `daw.export_plugin_chain`
Export all plugin states on a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
**Returns:** `{route_id, chain: [{processor_id, name, active, state_blob}], count}`

#### `daw.import_plugin_chain` -- (Stub) **Returns:** `{status: "not_yet_implemented", description}`

#### `daw.copy_plugin_state`
Copy plugin state to internal clipboard.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{ok: true, processor_id, clipboard_size_bytes}`

#### `daw.paste_plugin_state`
Paste plugin state from clipboard.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{ok: true, processor_id}`

#### `daw.get_plugin_parameter_defaults`
Get default values for all plugin parameters.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{defaults: [{index, default_value}], count}`

#### `daw.get_plugin_parameter_ranges`
Get min/max/default ranges for all plugin parameters.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{ranges: [{index, min, max, default}], count}`

#### `daw.get_plugin_parameter_names`
Get names of all plugin parameters.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{parameters: [{index, name, is_input, is_output}], count}`

#### `daw.get_plugin_parameter_groups`
Get parameter grouping info.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{groups: [{index, name, group}], count}`

#### `daw.get_plugin_io_configuration`
Get plugin I/O stream counts.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{input_streams, output_streams, input_midi, output_midi, processor_id}`

#### `daw.get_plugin_supported_formats`
Get plugin format support info.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{type, processor_id, supports_audio, supports_midi}`

#### `daw.get_plugin_unique_id`
Get plugin unique ID.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{unique_id, processor_id}`

#### `daw.get_plugin_vendor`
Get plugin vendor/creator.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{vendor, processor_id}`

#### `daw.get_plugin_version`
Get plugin version info.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{name, type, processor_id}`

#### `daw.get_plugin_description`
Get plugin description with category.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{name, category, creator, unique_id, processor_id}`

#### `daw.get_plugin_uri`
Get plugin URI.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{uri, name, processor_id}`

#### `daw.is_plugin_configurable`
Check if plugin has configurable parameters.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{configurable: bool, parameter_count, processor_id}`

#### `daw.get_plugin_latency_info`
Get plugin latency in samples and ms.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| processor_id | string | yes | - | Processor ID |
**Returns:** `{latency_samples, processor_id, sample_rate, latency_ms}`

## Configuration Access (15 commands)

#### `daw.get_session_config`
Get full session configuration as JSON.
**Returns:** `{config: object}`

#### `daw.get_session_config_value`
Get a specific session config value by key.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| key | string | yes | - | Config key name |
**Returns:** `{key, found: bool, value?: string}`

#### `daw.set_session_config_value`
Set a session config value. Supports: auto-input, auto-play, auto-return, punch-in, punch-out.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| key | string | yes | - | Config key name |
| value | bool | yes | - | Value |
**Returns:** `{key, ok: bool, error?: string}`

#### `daw.get_global_config`
Get full global (rc) configuration as JSON.
**Returns:** `{config: object}`

#### `daw.get_global_config_value`
Get a specific global config value by key.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| key | string | yes | - | Config key name |
**Returns:** `{key, found: bool, value?: string}`

#### `daw.set_global_config_value` -- (Stub) **Returns:** `{key, status: "not_yet_implemented"}`

#### `daw.get_config_defaults`
Get default configuration values.
**Returns:** `{description, session_defaults: object}`

#### `daw.list_config_keys`
List all session config keys.
**Returns:** `{keys: string[], count}`

#### `daw.get_auto_input_enabled` -- **Returns:** `{auto_input: bool}`
#### `daw.set_auto_input_enabled` -- Params: `enabled: bool` **Returns:** `{ok, auto_input}`
#### `daw.get_auto_play_enabled` -- **Returns:** `{auto_play: bool}`
#### `daw.set_auto_play_enabled` -- Params: `enabled: bool` **Returns:** `{ok, auto_play}`
#### `daw.get_auto_return_enabled` -- **Returns:** `{auto_return: bool}`
#### `daw.set_auto_return_enabled` -- Params: `enabled: bool` **Returns:** `{ok, auto_return}`
#### `daw.get_session_config_summary`
Get summary of key session config values.
**Returns:** `{auto_input, auto_play, auto_return, punch_in, punch_out, timecode_format, timecode_offset, external_sync, sample_rate, session_name}`

## Route Template Operations (10 commands)

#### `daw.get_route_templates`
Get all route templates.
**Returns:** `{templates: [{name, path, description, modified_with}], count}`

#### `daw.save_route_as_template`
Save a route as a template.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | - | Route ID |
| template_name | string | yes | - | Template name |
**Returns:** `{ok: bool, path, name}`

#### `daw.create_route_from_template` -- (Stub)
#### `daw.delete_route_template`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| template_name | string | yes | - | Template name |
**Returns:** `{ok: true, deleted}`

#### `daw.rename_route_template`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| old_name | string | yes | - | Current name |
| new_name | string | yes | - | New name |
**Returns:** `{ok: true, old_name, new_name}`

#### `daw.get_route_template_info`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| template_name | string | yes | - | Template name |
**Returns:** `{name, path, description, modified_with}`

#### `daw.get_session_templates`
Get all session templates.
**Returns:** `{templates: [{name, path, description, modified_with}], count}`

#### `daw.get_session_template_info`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| template_name | string | yes | - | Template name |
**Returns:** `{name, path, description, modified_with}`

#### `daw.save_as_session_template`
Save current session as template.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| template_name | string | yes | - | Template name |
| description | string | no | "" | Description |
**Returns:** `{ok: true, name}`

#### `daw.get_template_directory`
Get template directories.
**Returns:** `{user_route_template_dir, user_session_template_dir, system_route_template_dir, system_session_template_dir}`

## Undo/Redo Deep Access (10 commands)

#### `daw.undo.get_full_history`
Get undo history info.
**Returns:** `{undo_depth, next_undo, description}`

#### `daw.get_redo_history`
Get redo history info.
**Returns:** `{redo_depth, next_redo, description}`

#### `daw.get_undo_depth` -- **Returns:** `{undo_depth: int}`
#### `daw.get_redo_depth` -- **Returns:** `{redo_depth: int}`
#### `daw.get_next_undo_label` -- **Returns:** `{label: string, has_undo: bool}`
#### `daw.get_next_redo_label` -- **Returns:** `{label: string, has_redo: bool}`

#### `daw.begin_undo_group`
Begin a reversible command group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | - | Undo group name |
**Returns:** `{ok: true, name}`

#### `daw.end_undo_group`
Commit a reversible command group.
**Returns:** `{ok: true}`

#### `daw.clear_undo_history`
Clear all undo history.
**Returns:** `{ok: true}`

#### `daw.get_undo_history_size`
Get undo/redo history size.
**Returns:** `{undo_depth, redo_depth, total_entries}`

## Environment / System Info (10 commands)

#### `daw.get_dawflow_version` -- **Returns:** `{program: "DAWFLOW", revision, base: "Ardour"}`
#### `daw.get_ardour_version` -- **Returns:** `{revision}`
#### `daw.get_build_info` -- **Returns:** `{revision, compiler, cpp_standard, platform}`
#### `daw.get_system_info` -- **Returns:** `{os, architecture, sample_rate, buffer_size}`
#### `daw.get_plugin_paths` -- **Returns:** `{paths: {AU_system, AU_user, VST3_system, VST3_user, LV2_system, LV2_user, ...}}`
#### `daw.get_data_directory` -- **Returns:** `{data_search_path}`
#### `daw.get_config_directory` -- **Returns:** `{config_directory}`
#### `daw.get_cache_directory` -- **Returns:** `{cache_directory}`
#### `daw.get_temp_directory` -- **Returns:** `{temp_directory}`
#### `daw.get_installed_plugin_count`
Get count of installed plugins by type.
**Returns:** `{lv2, au, vst3, ladspa, lua, total}`

## Session File Operations (15 commands)

#### `daw.get_session_file_list` -- **Returns:** `{files: [{name, path, size_bytes}], count, session_path}`
#### `daw.get_session_audio_files` -- **Returns:** `{audio_files: [...], count, audio_dir}`
#### `daw.get_session_midi_files` -- **Returns:** `{midi_files: [...], count, midi_dir}`
#### `daw.get_session_size_bytes` -- **Returns:** `{size_bytes, size_mb, session_path}`
#### `daw.get_session_audio_size` -- **Returns:** `{size_bytes, size_mb, audio_dir}`
#### `daw.get_unused_sources` -- **Returns:** `{unused_sources: [{id, name, length}], count}`
#### `daw.cleanup_unused_sources` -- (Stub) **Returns:** `{status, description}`
#### `daw.get_missing_sources` -- **Returns:** `{missing_sources: [{id, name}], count}`
#### `daw.get_session_backup_info` -- **Returns:** `{backup_dir, backup_files: [...], count}`
#### `daw.get_interchange_dir` -- **Returns:** `{interchange_dir, sound_dir, midi_dir}`
#### `daw.get_peak_dir` -- **Returns:** `{peak_dir}`
#### `daw.get_session_lock_info` -- **Returns:** `{lock_file, exists: bool}`
#### `daw.is_session_writable` -- **Returns:** `{writable: bool, session_path}`
#### `daw.get_dead_sources` -- **Returns:** `{dead_dir, dead_files: [...], count}`
#### `daw.get_session_file_stats`
Get comprehensive session file statistics.
**Returns:** `{audio_file_count, midi_file_count, peak_file_count, total_size_bytes, audio_size_bytes, midi_size_bytes, peak_size_bytes, total_size_mb}`

## Sync & Timecode (10 commands)

#### `daw.get_sync_source`
Get current sync source.
**Returns:** `{sync_source, name, display_name}`

#### `daw.set_sync_source`
Set sync source.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source | string | yes | - | "Engine", "MTC", "MIDIClock", "LTC" |
**Returns:** `{ok: bool, source}`

#### `daw.get_timecode_format` -- **Returns:** `{timecode_format: string}`

#### `daw.set_timecode_format`
Set timecode format.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| format | string | yes | - | "23.976", "24", "25", "29.97", "29.97 drop", "30", "30 drop", "59.94", "60" |
**Returns:** `{ok: true, format}`

#### `daw.get_timecode_offset` -- **Returns:** `{offset_samples: int64, offset_negative: bool}`

#### `daw.set_timecode_offset`
Set timecode offset.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| offset_samples | int64 | yes | - | Offset in samples |
| negative | bool | no | false | Whether offset is negative |
**Returns:** `{ok: true, offset_samples, offset_negative}`

#### `daw.get_timecode_at_position`
Convert sample position to timecode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| position | int64 | yes | - | Sample position |
**Returns:** `{timecode: "HH:MM:SS:FF", hours, minutes, seconds, frames, position}`

#### `daw.get_position_at_timecode`
Convert timecode to sample position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| hours | uint32 | yes | - | Hours |
| minutes | uint32 | yes | - | Minutes |
| seconds | uint32 | yes | - | Seconds |
| frames | uint32 | yes | - | Frames |
| subframes | uint32 | no | 0 | Subframes |
| negative | bool | no | false | Negative timecode |
**Returns:** `{position: int64, timecode: string}`

#### `daw.is_synced_to_external`
Check if synced to external source.
**Returns:** `{external_sync: bool, synced_to_external: bool}`

#### `daw.get_transport_master_info`
Get transport master info and list all available masters.
**Returns:** `{name, display_name, type, available_masters: [{name, display_name, type}], master_count, external_sync}`

---

# DAWFLOW IPC API Reference -- Tier 1-4 Commands

Comprehensive documentation for all IPC command handlers registered in
`dawflow_commands_tier1.cc`, `dawflow_commands_tier2.cc`,
`dawflow_commands_tier3.cc`, and `dawflow_commands_tier4.cc`.

All commands are invoked via JSON-RPC 2.0 over the IPC socket:
```
POST http://localhost:19100/api/command
{"method": "daw.xxx", "params": {...}}
```

---

## Table of Contents

- [Tier 1 -- Critical (89 commands)](#tier-1----critical)
  - [1.1 Session Lifecycle & File Operations (22)](#11-session-lifecycle--file-operations)
  - [1.2 Track Freeze/Bounce (6)](#12-track-freezebounce)
  - [1.3 Playlist Management (6)](#13-playlist-management)
  - [1.4 Region Editing Advanced (25)](#14-region-editing-advanced)
  - [1.5 MIDI Model Editing (14)](#15-midi-model-editing)
  - [1.6 Plugin Configuration Advanced (16)](#16-plugin-configuration-advanced)
- [Tier 2 -- High Priority (106 commands)](#tier-2----high-priority)
  - [2.1 Audio Engine & Backend (25)](#21-audio-engine--backend)
  - [2.2 Port Management (20)](#22-port-management)
  - [2.3 Transport Master/Slave (15)](#23-transport-masterslave)
  - [2.4 Monitor Processor (14)](#24-monitor-processor)
  - [2.5 Location/Marker Flags (16)](#25-locationmarker-flags)
  - [2.6 Automation Write Passes (10)](#26-automation-write-passes)
  - [2.7 VCA Control (6)](#27-vca-control)
- [Tier 3 -- Medium Priority (127 commands)](#tier-3----medium-priority)
  - [3.1 Export System (40)](#31-export-system)
  - [3.2 Plugin Manager (25)](#32-plugin-manager)
  - [3.3 Track Advanced Controls (20)](#33-track-advanced-controls)
  - [3.4 Send/Return Configuration (12)](#34-sendreturn-configuration)
  - [3.5 Trigger/Clip Advanced (35)](#35-triggerclip-advanced)
- [Tier 4 -- Lower Priority / Completeness (100 commands)](#tier-4----lower-priority--completeness)
  - [4.1 Surround / Atmos (13)](#41-surround--atmos)
  - [4.2 Source / Cue Markers (14)](#42-source--cue-markers)
  - [4.3 Bundle / IO Routing (15)](#43-bundle--io-routing)
  - [4.4 Selection System (12)](#44-selection-system)
  - [4.5 Lua Script Integration (12)](#45-lua-script-integration)
  - [4.6 Playlist Analysis (8)](#46-playlist-analysis)
  - [4.7 Phase / Polarity Control (6)](#47-phase--polarity-control)
  - [4.8 Butler / Disk I/O (6)](#48-butler--disk-io)
  - [4.9 Editor Operations (14)](#49-editor-operations)

---

# Tier 1 -- Critical

Source: `engine/libs/ardour/dawflow_commands_tier1.cc`

## 1.1 Session Lifecycle & File Operations

#### `daw.session.save_as`
Save session snapshot with a name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| snapshot_name | string | yes | -- | Name for the snapshot |
| switch_to | bool | no | false | Switch to the new snapshot after saving |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether the save succeeded |
| snapshot_name | string | The snapshot name used |

#### `daw.session.save_template`
Save session as a reusable template.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | -- | Template name |
| description | string | no | "" | Template description |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether the save succeeded |
| template_name | string | The template name used |

#### `daw.session.wipe`
Reset session to empty state. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether the wipe succeeded |

#### `daw.session.import_files`
Import audio/MIDI files (stub -- requires GUI ImportStatus).
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always false |
| note | string | Guidance to use daw.import_audio or daw.import_midi |

#### `daw.session.remove_last_capture`
Delete the last recording. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether the removal succeeded |

#### `daw.session.cleanup_sources`
Remove unused source files from the session. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether cleanup succeeded |
| removed_files | string[] | Paths of removed files |
| removed_count | int | Number of files removed |
| space_freed_bytes | int64 | Disk space reclaimed in bytes |

#### `daw.session.cleanup_regions`
Remove unused regions from the session. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.freeze_all`
Freeze all tracks to audio. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| frozen_count | int | Number of tracks frozen |

#### `daw.session.midi_panic`
Send all-notes-off to all MIDI outputs. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.set_all_tracks_record_enabled`
Arm or disarm all tracks for recording.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| enabled | bool | yes | -- | Arm (true) or disarm (false) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| record_enabled | bool | The value that was set |

#### `daw.session.request_count_in_record`
Start recording with a metronome count-in. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.request_play_range`
Play a specific time range.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | -- | Start position in samples |
| end | int64 | yes | -- | End position in samples |
| loop | bool | no | false | Loop the range |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| start | int64 | Start position |
| end | int64 | End position |

#### `daw.session.cancel_play_range`
Cancel an active play range. No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.set_session_extents`
Set session start/end boundaries.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | -- | Start position in samples |
| end | int64 | yes | -- | End position in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.set_range_selection`
Select a time range (sets session extents as proxy).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | -- | Start position in samples |
| end | int64 | yes | -- | End position in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| note | string | Explanation of the proxy behavior |

#### `daw.session.cut_copy_section`
Cut, copy, insert, or delete a time section.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | -- | Section start in samples |
| end | int64 | yes | -- | Section end in samples |
| to | int64 | no | 0 | Destination position in samples |
| op | string | no | "copy" | Operation: "cut", "copy", "insert", or "delete" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| operation | string | The operation that was performed |

#### `daw.session.deinterlace_midi_region`
Split an interleaved MIDI region by channel.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | ID of the MIDI region |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.globally_add_internal_sends`
Add internal sends from all routes to a destination bus.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| route_id | string | yes | -- | Destination route ID |
| placement | string | no | "post" | "pre" or "post" fader |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.globally_set_send_gains_to_zero`
Mute all sends to a bus (set gains to -inf).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| bus_id | string | yes | -- | Destination bus ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.globally_set_send_gains_to_unity`
Set all sends to a bus to 0 dB.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| bus_id | string | yes | -- | Destination bus ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.session.apply_mixer_scene`
Apply a mixer scene by index.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | -- | Mixer scene index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether the scene was applied |
| index | int | Scene index |
| error | string | Error message if scene was invalid |

#### `daw.session.cleanup_peakfiles_v2`
Delete orphaned peak files (enhanced version). No parameters.
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| cleaned_files | string[] | Paths of cleaned files |
| count | int | Number of files cleaned |
| space_freed_bytes | int64 | Disk space reclaimed |

---

## 1.2 Track Freeze/Bounce

#### `daw.track.freeze`
Freeze a track to audio.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| track_id | string | The track that was frozen |

#### `daw.track.unfreeze`
Unfreeze a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| track_id | string | The track that was unfrozen |

#### `daw.track.get_freeze_state`
Check freeze status of a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| freeze_state | string | "no_freeze", "frozen", or "unfrozen" |
| is_frozen | bool | Whether the track is currently frozen |

#### `daw.track.bounce`
Bounce entire track to a new audio region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| name | string | no | "bounced" | Name for the bounced region |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether bounce succeeded |
| region_id | string | ID of the new bounced region |
| region_name | string | Name of the new region |
| length | int64 | Length in samples |

#### `daw.track.bounce_range`
Bounce a specific time range of a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| start | int64 | yes | -- | Start position in samples |
| end | int64 | yes | -- | End position in samples |
| name | string | no | "bounced-range" | Name for the bounced region |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether bounce succeeded |
| region_id | string | ID of the new bounced region |
| region_name | string | Name of the new region |
| length | int64 | Length in samples |

#### `daw.track.bounceable`
Check if a track can be bounced.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| bounceable | bool | Whether the track can be bounced |

---

## 1.3 Playlist Management

#### `daw.track.use_playlist`
Switch track to a specific playlist by ID.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| playlist_id | string | yes | -- | Playlist ID to switch to |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether switch succeeded |
| track_id | string | Track ID |
| playlist_id | string | Playlist ID |

#### `daw.track.use_copy_playlist`
Duplicate current playlist for track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether duplication succeeded |
| track_id | string | Track ID |
| new_playlist_id | string | ID of the new playlist |
| new_playlist_name | string | Name of the new playlist |

#### `daw.track.use_new_playlist`
Create a fresh empty playlist for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether creation succeeded |
| track_id | string | Track ID |
| new_playlist_id | string | ID of the new playlist |
| new_playlist_name | string | Name of the new playlist |

#### `daw.track.find_and_use_playlist`
Load a saved playlist by its ID.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| playlist_id | string | yes | -- | Playlist ID to load |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether load succeeded |
| track_id | string | Track ID |
| playlist_id | string | Playlist ID |

#### `daw.playlist.get_extent`
Get total duration of a track's playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| start_samples | int64 | Playlist start in samples |
| end_samples | int64 | Playlist end in samples |
| duration_samples | int64 | Total duration in samples |
| region_count | int | Number of regions in playlist |

#### `daw.playlist.remove_gaps`
Remove silence gaps from a track's playlist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| threshold | int64 | no | 1 | Minimum gap size in samples |
| leave_gap | int64 | no | 0 | Gap to leave between regions in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| gaps_removed | int | Number of gaps removed |

---

## 1.4 Region Editing Advanced

#### `daw.region.trim_front`
Trim region start boundary.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| new_position | int64 | yes | -- | New start position in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| position | int64 | New position in samples |
| length | int64 | New length in samples |

#### `daw.region.trim_end`
Trim region end boundary.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| new_position | int64 | yes | -- | New end position in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| position | int64 | Position in samples |
| length | int64 | New length in samples |

#### `daw.region.trim_to`
Set exact region bounds (position + length).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| position | int64 | yes | -- | New position in samples |
| length | int64 | yes | -- | New length in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| position | int64 | Position in samples |
| length | int64 | Length in samples |

#### `daw.region.cut_front`
Cut region from the start.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| new_position | int64 | yes | -- | Cut point in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| position | int64 | New position |
| length | int64 | New length |

#### `daw.region.cut_end`
Cut region from the end.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| new_position | int64 | yes | -- | Cut point in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| position | int64 | Position |
| length | int64 | New length |

#### `daw.region.nudge_position`
Nudge region position by a distance.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| distance | int64 | yes | -- | Distance in samples (positive or negative) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| new_position | int64 | New position in samples |

#### `daw.region.move_to_natural_position`
Move region to its natural/original position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| new_position | int64 | The natural position in samples |

#### `daw.region.set_sync_position`
Set the sync point of a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| position | int64 | yes | -- | Sync position in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.region.clear_sync_position`
Remove sync point from a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.region.set_muted`
Mute or unmute a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| muted | bool | yes | -- | Mute state |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| muted | bool | The mute state that was set |

#### `daw.region.set_locked`
Lock or unlock a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| locked | bool | yes | -- | Lock state |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| locked | bool | The lock state that was set |

#### `daw.region.set_opaque`
Set region opacity (transparent vs opaque).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Region ID |
| opaque | bool | yes | -- | Whether region is opaque |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| opaque | bool | The opacity state that was set |

#### `daw.region.raise`
Move region up one layer. Param: `region_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.region.lower`
Move region down one layer. Param: `region_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.region.raise_to_top`
Move region to top layer. Param: `region_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.region.lower_to_bottom`
Move region to bottom layer. Param: `region_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.audio_region.normalize`
Normalize audio region to target dB.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
| target_db | float | no | 0.0 | Target dB level |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| max_amplitude | double | Peak amplitude before normalization |
| target_db | float | Target dB used |

#### `daw.audio_region.set_scale_amplitude`
Set region gain/amplitude scaling.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
| gain | float | yes | -- | Gain multiplier (1.0 = unity) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| gain | float | The gain value set |

#### `daw.audio_region.set_fade_in`
Configure fade-in shape and length.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
| shape | string | no | "linear" | "linear", "fast", "slow", "constant_power", "symmetric" |
| length | int64 | yes | -- | Fade length in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| shape | string | Shape used |
| length | int64 | Length set |

#### `daw.audio_region.set_fade_out`
Configure fade-out shape and length.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
| shape | string | no | "linear" | "linear", "fast", "slow", "constant_power", "symmetric" |
| length | int64 | yes | -- | Fade length in samples |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| shape | string | Shape used |
| length | int64 | Length set |

#### `daw.audio_region.set_fade_in_active`
Enable or disable fade-in.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
| active | bool | yes | -- | Enable/disable |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| active | bool | State set |

#### `daw.audio_region.set_fade_out_active`
Enable or disable fade-out.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
| active | bool | yes | -- | Enable/disable |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| active | bool | State set |

#### `daw.audio_region.set_envelope_active`
Enable or disable volume envelope.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
| active | bool | yes | -- | Enable/disable |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| active | bool | State set |

#### `daw.audio_region.get_rms`
Get RMS signal level of an audio region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| rms | double | RMS amplitude (linear) |
| rms_db | double | RMS in dB |

#### `daw.audio_region.get_loudness`
Get loudness/amplitude metrics.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Audio region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| maximum_amplitude | double | Peak amplitude (linear) |
| peak_db | double | Peak in dB |
| rms | double | RMS amplitude (linear) |
| rms_db | double | RMS in dB |

---

## 1.5 MIDI Model Editing

#### `daw.midi.new_note_diff_command`
Create a note edit batch command.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| name | string | no | "midi edit" | Command name for undo |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| command_ptr | int64 | Opaque pointer to the command object |
| note | string | Usage guidance |

#### `daw.midi.apply_diff_command`
Apply a batch MIDI edit command. Simplified version; prefer atomic operations.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| note | string | Recommendation to use atomic operations |

#### `daw.midi.new_sysex_diff_command`
Create a SysEx edit batch command.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| name | string | no | "sysex edit" | Command name for undo |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| command_ptr | int64 | Opaque pointer to the command object |

#### `daw.midi.new_patch_change_diff_command`
Create a patch change edit batch command.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| name | string | no | "patch edit" | Command name for undo |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| command_ptr | int64 | Opaque pointer |

#### `daw.midi.find_note`
Locate a note in a MIDI model by event ID.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| note_id | int | yes | -- | Evoral event ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| found | bool | Whether the note was found |
| note | int | MIDI note number (0-127) |
| channel | int | MIDI channel |
| velocity | int | Note velocity |
| time_beats | double | Start time in beats |
| length_beats | double | Duration in beats |

#### `daw.midi.find_patch_change`
List all patch change events in a MIDI region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| patch_changes | array | Array of {id, time, channel, program, bank} |
| count | int | Number of patch changes |

#### `daw.midi.insert_silence_at_start`
Insert silence at the beginning of a MIDI region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| duration_beats | double | yes | -- | Duration of silence in beats |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| duration_beats | double | Duration inserted |

#### `daw.midi_region.merge`
Merge another MIDI region into this one.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | Target MIDI region ID |
| other_id | string | yes | -- | Source MIDI region ID to merge in |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.midi_region.separate_by_channel`
Split a MIDI region by channel.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Whether separation succeeded |
| regions | array | Array of {id, name} for each new region |
| count | int | Number of regions created |

#### `daw.midi_source.set_automation_state`
Set CC automation mode for a MIDI source.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| cc_number | int | yes | -- | CC controller number |
| state | string | yes | -- | "off", "play", "write", "touch", "latch" |
| channel | int | no | 0 | MIDI channel |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.midi_source.set_interpolation`
Set CC interpolation/curve type.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| cc_number | int | yes | -- | CC controller number |
| style | string | yes | -- | "discrete", "linear", "curved", "logarithmic" |
| channel | int | no | 0 | MIDI channel |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |

#### `daw.midi_source.get_automation_state`
Get CC automation mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| cc_number | int | yes | -- | CC controller number |
| channel | int | no | 0 | MIDI channel |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| state | string | "off", "play", "write", "touch", or "latch" |
| cc_number | int | CC number queried |
| channel | int | Channel queried |

#### `daw.midi_source.get_interpolation`
Get CC interpolation style.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | -- | MIDI region ID |
| cc_number | int | yes | -- | CC controller number |
| channel | int | no | 0 | MIDI channel |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| style | string | "discrete", "linear", "curved", or "logarithmic" |
| cc_number | int | CC number queried |
| channel | int | Channel queried |

#### `daw.midi_track.set_note_mode`
Set sustained vs percussive note mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | MIDI track ID |
| mode | string | yes | -- | "sustained" or "percussive" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Always true |
| mode | string | Mode that was set |

---

## 1.6 Plugin Configuration Advanced

#### `daw.plugin.reset_parameters_to_default`
Reset all plugin parameters to their default values.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
**Returns:** `{ ok: bool }`

#### `daw.plugin.set_strict_io`
Enable/disable strict I/O channel matching.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| strict | bool | yes | -- | Enable strict I/O |
**Returns:** `{ ok: bool, strict_io: bool }`

#### `daw.plugin.set_custom_cfg`
Enable/disable custom I/O configuration.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| custom | bool | yes | -- | Enable custom config |
**Returns:** `{ ok: bool, custom_cfg: bool }`

#### `daw.plugin.set_count`
Set number of parallel plugin instances.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| count | int | yes | -- | Number of instances |
**Returns:** `{ ok: bool, count: int }`

#### `daw.plugin.set_input_map`
Set plugin input channel mapping.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| instance | int | no | 0 | Plugin instance index |
| mapping | array | no | -- | Array of {from: int, to: int} pairs |
**Returns:** `{ ok: bool }`

#### `daw.plugin.set_output_map`
Set plugin output channel mapping.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| instance | int | no | 0 | Plugin instance index |
| mapping | array | no | -- | Array of {from: int, to: int} pairs |
**Returns:** `{ ok: bool }`

#### `daw.plugin.get_timing_stats`
Get CPU timing statistics for a plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| has_stats | bool | Whether stats are available |
| min_us | int64 | Minimum processing time (microseconds) |
| max_us | int64 | Maximum processing time (microseconds) |
| avg_us | double | Average processing time (microseconds) |
| stddev_us | double | Standard deviation (microseconds) |
| latency | int64 | Plugin latency in samples |

#### `daw.plugin.clear_timing_stats`
Clear accumulated timing statistics.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
**Returns:** `{ ok: bool }`

#### `daw.plugin.save_preset_v2`
Save current state as a named preset (enhanced version with track_id+plugin_id).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| name | string | yes | -- | Preset name |
**Returns:** `{ ok: bool, preset_uri: string, label: string }`

#### `daw.plugin.remove_preset`
Delete a saved preset.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| name | string | yes | -- | Preset name to remove |
**Returns:** `{ ok: bool }`

#### `daw.plugin.clear_preset`
Clear/deselect the active preset.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
**Returns:** `{ ok: bool }`

#### `daw.plugin.get_parameter_descriptor`
Get detailed info about a plugin parameter.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| param_index | int | yes | -- | Parameter index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| label | string | Human-readable parameter name |
| lower | double | Minimum value |
| upper | double | Maximum value |
| normal | double | Default value |
| step | double | Step increment |
| smallstep | double | Small step increment |
| largestep | double | Large step increment |
| toggled | bool | Whether parameter is a toggle |
| logarithmic | bool | Whether scale is logarithmic |
| sr_dependent | bool | Whether value depends on sample rate |
| integer_step | bool | Whether steps are integer |
| enumeration | bool | Whether values are enumerated |
| unit | string | "none", "dB", "midi_note", or "Hz" |

#### `daw.plugin.get_scale_points`
Get enumerated scale points for a parameter.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| param_index | int | yes | -- | Parameter index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scale_points | array | Array of {label: string, value: double} |
| count | int | Number of scale points |

#### `daw.plugin.get_docs`
Get plugin documentation string.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
**Returns:** `{ docs: string, name: string, maker: string }`

#### `daw.route.customize_plugin_io`
Configure custom I/O for a plugin insert.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
| audio_out | int | no | 2 | Number of audio outputs |
| audio_sinks | int | no | 2 | Number of audio sinks |
**Returns:** `{ ok: bool }`

#### `daw.route.reset_plugin_io`
Reset plugin I/O to defaults.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| plugin_id | string | yes | -- | Plugin processor ID |
**Returns:** `{ ok: bool }`

---

# Tier 2 -- High Priority

Source: `engine/libs/ardour/dawflow_commands_tier2.cc`

## 2.1 Audio Engine & Backend

#### `daw.engine.discover_backends`
Discover available audio backends. No parameters.
**Returns:** `{ backends: string[], count: int }`

#### `daw.engine.set_backend`
Set the active audio backend.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | -- | Backend name |
**Returns:** `{ ok: bool, backend: string }`

#### `daw.engine.get_current_backend`
Get the current audio backend. No parameters.
**Returns:** `{ name: string, running: bool }`

#### `daw.engine.is_jack`
Check if running on JACK. No parameters.
**Returns:** `{ is_jack: bool }`

#### `daw.engine.freewheeling`
Check if engine is freewheeling. No parameters.
**Returns:** `{ freewheeling: bool }`

#### `daw.engine.running`
Check if engine is running. No parameters.
**Returns:** `{ running: bool }`

#### `daw.engine.launch_device_control_app`
Launch the native device control application. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.engine.request_backend_reset`
Request a backend reset. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.engine.request_device_list_update`
Request a refresh of the device list. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.backend.enumerate_drivers`
List available audio drivers. No parameters.
**Returns:** `{ drivers: string[], count: int }`

#### `daw.backend.set_driver`
Set the audio driver.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | -- | Driver name |
**Returns:** `{ ok: bool, driver: string }`

#### `daw.backend.enumerate_input_devices`
List available input devices. No parameters.
**Returns:** `{ devices: [{name: string, available: bool}], count: int }`

#### `daw.backend.enumerate_output_devices`
List available output devices. No parameters.
**Returns:** `{ devices: [{name: string, available: bool}], count: int }`

#### `daw.backend.set_input_device`
Set the input device. Param: `name` (string, required).
**Returns:** `{ ok: bool, device: string }`

#### `daw.backend.set_output_device`
Set the output device. Param: `name` (string, required).
**Returns:** `{ ok: bool, device: string }`

#### `daw.backend.default_sample_rate`
Get the default sample rate. No parameters.
**Returns:** `{ sample_rate: int }`

#### `daw.backend.default_buffer_size`
Get the default buffer size.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| device | string | no | "" | Device name |
**Returns:** `{ buffer_size: int }`

#### `daw.backend.set_use_buffered_io`
Enable/disable buffered I/O. Param: `enabled` (bool, required).
**Returns:** `{ ok: bool, buffered_io: bool }`

#### `daw.backend.get_use_buffered_io`
Check if buffered I/O is enabled. No parameters.
**Returns:** `{ buffered_io: bool }`

#### `daw.backend.drop_device`
Drop the current audio device. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.backend.reset_device`
Reset the current audio device. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.engine.prepare_latency_measurement`
Prepare for latency measurement. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.engine.start_latency_detection`
Start latency detection.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| for_midi | bool | no | false | Detect MIDI latency instead of audio |
**Returns:** `{ ok: bool, for_midi: bool }`

#### `daw.engine.stop_latency_detection`
Stop latency detection. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.engine.get_latency_signal_delay`
Get measured latency signal delay. No parameters.
**Returns:** `{ latency_samples: int }`

---

## 2.2 Port Management

#### `daw.port.list_all`
List all audio and MIDI ports. No parameters.
**Returns:** `{ ports: [{name: string, type: string}], count: int }`

#### `daw.port.register_input`
Register a new input port.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | string | yes | -- | "audio" or "midi" |
| name | string | yes | -- | Port name |
**Returns:** `{ ok: bool, name: string }`

#### `daw.port.register_output`
Register a new output port.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | string | yes | -- | "audio" or "midi" |
| name | string | yes | -- | Port name |
**Returns:** `{ ok: bool, name: string }`

#### `daw.port.unregister`
Unregister a port. Param: `name` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.port.connect`
Connect two ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source | string | yes | -- | Source port name |
| dest | string | yes | -- | Destination port name |
**Returns:** `{ ok: bool, source: string, dest: string }`

#### `daw.port.disconnect`
Disconnect two ports. Params: `source`, `dest` (string, required).
**Returns:** `{ ok: bool, source: string, dest: string }`

#### `daw.port.disconnect_all`
Disconnect all connections from a port. Param: `name` (string, required).
**Returns:** `{ ok: bool, port: string }`

#### `daw.port.get_connections`
Get all connections of a port. Param: `name` (string, required).
**Returns:** `{ port: string, connections: string[], count: int }`

#### `daw.port.connected_to`
Check if a port is connected to another. Params: `name`, `other` (string, required).
**Returns:** `{ connected: bool, port: string, other: string }`

#### `daw.port.physically_connected`
Check if a port is physically connected. Param: `name` (string, required).
**Returns:** `{ physically_connected: bool, port: string }`

#### `daw.port.set_pretty_name`
Set a port's display name. Params: `name` (string), `pretty_name` (string), both required.
**Returns:** `{ ok: bool, port: string, pretty_name: string }`

#### `daw.port.get_pretty_name`
Get a port's display name. Param: `name` (string, required).
**Returns:** `{ port: string, pretty_name: string }`

#### `daw.port.get_physical_outputs`
Get physical output ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | string | no | "audio" | "audio" or "midi" |
**Returns:** `{ ports: string[], count: int, type: string }`

#### `daw.port.get_physical_inputs`
Get physical input ports. Same params as `get_physical_outputs`.
**Returns:** `{ ports: string[], count: int, type: string }`

#### `daw.port.n_physical_outputs`
Count physical output ports. No parameters.
**Returns:** `{ audio: int, midi: int }`

#### `daw.port.n_physical_inputs`
Count physical input ports. No parameters.
**Returns:** `{ audio: int, midi: int }`

#### `daw.port.request_input_monitoring`
Request input monitoring for a port. Params: `name` (string), `enabled` (bool), both required.
**Returns:** `{ ok: bool, port: string, monitoring: bool }`

#### `daw.port.get_midi_ports`
Get MIDI ports.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| for_input | bool | no | true | Get input ports (true) or output ports (false) |
**Returns:** `{ ports: string[], count: int, for_input: bool }`

#### `daw.port.add_midi_flags`
Add flags to a MIDI port. Params: `name` (string), `flags` (uint32), both required.
**Returns:** `{ ok: bool, port: string, flags: int }`

#### `daw.port.remove_midi_flags`
Remove flags from a MIDI port. Params: `name` (string), `flags` (uint32), both required.
**Returns:** `{ ok: bool, port: string, flags: int }`

---

## 2.3 Transport Master/Slave

#### `daw.transport_master.list_all`
List all transport masters. No parameters.
**Returns:** `{ masters: [{name, type, locked, collect, removeable}], count: int }`

#### `daw.transport_master.get_current`
Get the current transport master. No parameters.
**Returns:** `{ name: string|null, type: string, locked: bool, collect: bool }`

#### `daw.transport_master.set_current_by_type`
Set the current transport master by type. Param: `type` (string, required). Values: "Engine", "MTC", "MIDIClock", "LTC".
**Returns:** `{ ok: bool, type: string }`

#### `daw.transport_master.set_current_by_name`
Set the current transport master by name. Param: `name` (string, required).
**Returns:** `{ ok: bool, name: string }`

#### `daw.transport_master.add`
Add a new transport master. Params: `type` (string), `name` (string), both required.
**Returns:** `{ ok: bool, type: string, name: string }`

#### `daw.transport_master.remove`
Remove a transport master. Param: `name` (string, required).
**Returns:** `{ ok: bool, name: string }`

#### `daw.transport_master.get_type`
Get a transport master's type. Param: `name` (string, required).
**Returns:** `{ name: string, type: string }`

#### `daw.transport_master.locked`
Check if a transport master is locked. Param: `name` (string, required).
**Returns:** `{ name: string, locked: bool }`

#### `daw.transport_master.get_delta`
Get the sync delta for a transport master. Param: `name` (string, required).
**Returns:** `{ name: string, delta: int64, delta_string: string }`

#### `daw.transport_master.get_position`
Get the position of a transport master. Param: `name` (string, required).
**Returns:** `{ name: string, position: string }`

#### `daw.transport_master.set_collect`
Enable/disable data collection. Params: `name` (string), `collect` (bool), both required.
**Returns:** `{ ok: bool, name: string, collect: bool }`

#### `daw.transport_master.set_request_mask`
Set the transport request mask. Params: `name` (string), `mask` (uint32), both required.
**Returns:** `{ ok: bool, name: string, mask: int }`

#### `daw.transport_master.set_sample_clock_synced`
Set sample clock sync. Params: `name` (string), `synced` (bool), both required.
**Returns:** `{ ok: bool, name: string, synced: bool }`

#### `daw.transport_master.suspend_timecode`
Suspend timecode transmission. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.transport_master.resume_timecode`
Resume timecode transmission. No parameters.
**Returns:** `{ ok: bool }`

---

## 2.4 Monitor Processor

#### `daw.monitor.set_cut`
Per-channel cut. Params: `channel` (uint32), `cut` (bool), both required.
**Returns:** `{ ok: bool, channel: int, cut: bool }`

#### `daw.monitor.set_solo`
Per-channel solo. Params: `channel` (uint32), `solo` (bool), both required.
**Returns:** `{ ok: bool, channel: int, solo: bool }`

#### `daw.monitor.set_polarity`
Per-channel polarity invert. Params: `channel` (uint32), `invert` (bool), both required.
**Returns:** `{ ok: bool, channel: int, invert: bool }`

#### `daw.monitor.get_cut_all`
Check if all channels are cut. No parameters.
**Returns:** `{ cut_all: bool }`

#### `daw.monitor.get_dim_all`
Check if all channels are dimmed. No parameters.
**Returns:** `{ dim_all: bool }`

#### `daw.monitor.get_mono`
Check if mono mode is active. No parameters.
**Returns:** `{ mono: bool }`

#### `daw.monitor.get_cut`
Get per-channel cut state. Param: `channel` (uint32, required).
**Returns:** `{ channel: int, cut: bool }`

#### `daw.monitor.get_dim`
Get per-channel dim state. Param: `channel` (uint32, required).
**Returns:** `{ channel: int, dim: bool }`

#### `daw.monitor.get_solo`
Get per-channel solo state. Param: `channel` (uint32, required).
**Returns:** `{ channel: int, solo: bool }`

#### `daw.monitor.get_polarity`
Get per-channel polarity state. Param: `channel` (uint32, required).
**Returns:** `{ channel: int, inverted: bool }`

#### `daw.monitor.get_dim_level`
Get the dim level. No parameters.
**Returns:** `{ dim_level: double, dim_level_dB: double }`

#### `daw.monitor.get_solo_boost_level`
Get the solo boost level. No parameters.
**Returns:** `{ solo_boost_level: double, solo_boost_level_dB: double }`

#### `daw.monitor.is_active`
Check if monitor section is active. No parameters.
**Returns:** `{ active: bool }`

#### `daw.session.reset_monitor_section`
Reset all monitor processor state to defaults. No parameters.
**Returns:** `{ ok: bool }`

---

## 2.5 Location/Marker Flags

#### `daw.location.lock`
Lock a location. Param: `id` (string, required).
**Returns:** `{ ok: bool, id: string, locked: true }`

#### `daw.location.unlock`
Unlock a location. Param: `id` (string, required).
**Returns:** `{ ok: bool, id: string, locked: false }`

#### `daw.location.set_hidden`
Hide/show a location. Params: `id` (string), `hidden` (bool), both required.
**Returns:** `{ ok: bool, id: string, hidden: bool }`

#### `daw.location.set_cd`
Set CD marker flag. Params: `id` (string), `cd` (bool), both required.
**Returns:** `{ ok: bool, id: string, cd: bool }`

#### `daw.location.set_cue`
Set cue marker flag. Params: `id` (string), `cue` (bool), both required.
**Returns:** `{ ok: bool, id: string, cue: bool }`

#### `daw.location.set_is_range`
Set location as range marker. Params: `id` (string), `is_range` (bool), both required.
**Returns:** `{ ok: bool, id: string, is_range: bool }`

#### `daw.location.set_skip`
Set skip flag. Params: `id` (string), `skip` (bool), both required.
**Returns:** `{ ok: bool, id: string, skip: bool }`

#### `daw.location.set_section`
Set section flag. Params: `id` (string), `section` (bool), both required.
**Returns:** `{ ok: bool, id: string, section: bool }`

#### `daw.location.set_cue_id`
Set cue ID. Params: `id` (string), `cue_id` (int32), both required.
**Returns:** `{ ok: bool, id: string, cue_id: int }`

#### `daw.location.set_scene_change`
Set/clear scene change on a location.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string | yes | -- | Location ID |
| clear | bool | no | -- | Pass true to clear the scene change |
**Returns:** `{ ok: bool, id: string, scene_change: string }`

#### `daw.location.set_auto_punch`
Set auto-punch flag. Params: `id` (string), `auto_punch` (bool), both required.
**Returns:** `{ ok: bool, id: string, auto_punch: bool }`

#### `daw.location.set_auto_loop`
Set auto-loop flag. Params: `id` (string), `auto_loop` (bool), both required.
**Returns:** `{ ok: bool, id: string, auto_loop: bool }`

#### `daw.locations.clear_cue_markers`
Clear cue markers in a range. Params: `start` (int64), `end` (int64), both required.
**Returns:** `{ ok: bool, start: int64, end: int64 }`

#### `daw.locations.clear_scene_markers`
Clear scene markers in a range. Params: `start` (int64), `end` (int64), both required.
**Returns:** `{ ok: bool, start: int64, end: int64 }`

#### `daw.locations.cut_copy_section`
Cut/copy/insert/delete locations in a section.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | -- | Section start in samples |
| end | int64 | yes | -- | Section end in samples |
| to | int64 | yes | -- | Destination in samples |
| op | string | no | "CopyPaste" | "CutPaste", "Insert", "Delete", or "CopyPaste" |
**Returns:** `{ ok: bool, op: string }`

#### `daw.location.set_time_domain`
Set the time domain of a location. Params: `id` (string), `domain` (string: "beats"/"musical" or "audio"), both required.
**Returns:** `{ ok: bool, id: string, domain: string }`

---

## 2.6 Automation Write Passes

#### `daw.automation.start_touch`
Begin a touch automation write.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| control | string | yes | -- | "gain", "fader", "solo", "mute", or automation control ID |
| when | int64 | no | current transport position | Start time in samples |
**Returns:** `{ ok: bool, track_id: string, control: string }`

#### `daw.automation.stop_touch`
End a touch automation write. Same params as `start_touch`.
**Returns:** `{ ok: bool, track_id: string, control: string }`

#### `daw.automation.start_write_pass`
Start a full automation write pass. Same params as `start_touch`.
**Returns:** `{ ok: bool, track_id: string, control: string }`

#### `daw.automation.write_pass_finished`
Finish an automation write pass. Same params as `start_touch`.
**Returns:** `{ ok: bool, track_id: string, control: string }`

#### `daw.automation.writable`
Check if an automation control is writable. Params: `track_id`, `control` (string, required).
**Returns:** `{ writable: bool, track_id: string, control: string }`

#### `daw.automation.internal_to_interface`
Convert internal value to interface value. Params: `track_id`, `control` (string), `value` (double), all required.
**Returns:** `{ interface_value: double, internal_value: double }`

#### `daw.automation.interface_to_internal`
Convert interface value to internal value. Params: `track_id`, `control` (string), `value` (double), all required.
**Returns:** `{ internal_value: double, interface_value: double }`

#### `daw.automation.get_user_string`
Get human-readable automation value. Params: `track_id`, `control` (string, required).
**Returns:** `{ user_string: string, value: double, track_id: string, control: string }`

#### `daw.automation.get_grouped_controls`
Get controls grouped with this one. Params: `track_id`, `control` (string, required).
**Returns:** `{ track_id: string, control: string, grouped: [{name, value, id}], count: int }`

#### `daw.automation.commit_transaction`
Commit an automation edit transaction. Params: `track_id`, `control` (string, required).
**Returns:** `{ ok: bool, track_id: string, control: string }`

---

## 2.7 VCA Control

#### `daw.vca.assign`
Assign a VCA as master to a target VCA. Params: `vca_id` (string), `target_vca_id` (string), both required.
**Returns:** `{ ok: bool, vca_id: string, target_vca_id: string }`

#### `daw.vca.slaved_to`
Check if a VCA is slaved to another. Params: `vca_id`, `other_id` (string, required).
**Returns:** `{ slaved_to: bool, vca_id: string, other_id: string }`

#### `daw.vca.slaved`
Check if a VCA is slaved to anything. Param: `vca_id` (string, required).
**Returns:** `{ slaved: bool, vca_id: string }`

#### `daw.vca.soloed`
Check if a VCA is soloed. Param: `vca_id` (string, required).
**Returns:** `{ soloed: bool, vca_id: string }`

#### `daw.vca.clear_all_solo_state`
Clear all solo state on a VCA. Param: `vca_id` (string, required).
**Returns:** `{ ok: bool, vca_id: string }`

#### `daw.vca.get_controls`
Get all control values for a VCA. Param: `vca_id` (string, required).
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| vca_id | string | VCA ID |
| name | string | VCA name |
| number | int | VCA number |
| gain | double | Gain coefficient |
| gain_dB | double | Gain in dB |
| solo | bool | Self-solo state |
| mute | bool | Muted-by-self state |
| slaved | bool | Whether slaved |
| soloed | bool | Whether soloed |

---

# Tier 3 -- Medium Priority

Source: `engine/libs/ardour/dawflow_commands_tier3.cc`

## 3.1 Export System

#### `daw.export.create_profile`
Create a new export format specification. No parameters.
**Returns:** `{ status: "created", spec_id: string }`

#### `daw.export.load_preset`
Load an export preset by name (stub). Param: `name` (string, required).
**Returns:** `{ status: "stub", message: string }`

#### `daw.export.save_preset`
Save an export preset (stub). Param: `name` (string, required).
**Returns:** `{ status: "stub", message: string }`

#### `daw.export.remove_preset`
Delete an export preset (stub). Param: `name` (string, required).
**Returns:** `{ status: "stub", message: string }`

#### `daw.export.set_format_name`
Name an export format spec. Param: `name` (string, required).
**Returns:** `{ status: "ok", name: string }`

#### `daw.export.set_format_type`
Set format type. Param: `type` (string, required). Values: "WAV", "W64", "CAF", "AIFF", "AU", "FLAC", "Ogg", "MPEG"/"MP3", "FFMPEG", "RAW".
**Returns:** `{ status: "ok", format: string }`

#### `daw.export.set_sample_rate`
Set export sample rate. Param: `rate` (int, required). Values: 0 (session), 8000, 22050, 24000, 44100, 48000, 88200, 96000, 176400, 192000.
**Returns:** `{ status: "ok", sample_rate: int }`

#### `daw.export.set_bit_depth`
Set bit depth. Param: `depth` (int, required). Values: 8, 16, 24, 32.
**Returns:** `{ status: "ok", bit_depth: int }`

#### `daw.export.set_dither_type`
Set dither algorithm. Param: `type` (string, required). Values: "None", "Rect", "Tri", "Shaped".
**Returns:** `{ status: "ok", dither_type: string }`

#### `daw.export.set_src_quality`
Set sample rate conversion quality. Param: `quality` (string, required). Values: "SincBest", "SincMedium", "SincFast", "ZeroOrder", "Linear".
**Returns:** `{ status: "ok", quality: string }`

#### `daw.export.set_codec_quality`
Set codec quality for lossy formats. Param: `quality` (int, required, 0-100).
**Returns:** `{ status: "ok", quality: int }`

#### `daw.export.set_normalize`
Enable/disable normalization. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", normalize: bool }`

#### `daw.export.set_normalize_loudness`
Enable loudness normalization. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", normalize_loudness: bool }`

#### `daw.export.set_normalize_dbfs`
Set dBFS normalization target. Param: `value` (float, required).
**Returns:** `{ status: "ok", dbfs: float }`

#### `daw.export.set_normalize_lufs`
Set LUFS normalization target. Param: `value` (float, required).
**Returns:** `{ status: "ok", lufs: float }`

#### `daw.export.set_normalize_dbtp`
Set dBTP normalization target. Param: `value` (float, required).
**Returns:** `{ status: "ok", dbtp: float }`

#### `daw.export.set_tp_limiter`
Enable true peak limiter (stub). Param: `enabled` (bool, required).
**Returns:** `{ status: "stub", message: string, enabled: bool }`

#### `daw.export.set_trim_beginning`
Trim silence at start. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", trim_beginning: bool }`

#### `daw.export.set_trim_end`
Trim silence at end. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", trim_end: bool }`

#### `daw.export.set_silence_beginning`
Add silence at start. Param: `samples` (int64, required).
**Returns:** `{ status: "ok", samples: int64 }`

#### `daw.export.set_silence_end`
Add silence at end. Param: `samples` (int64, required).
**Returns:** `{ status: "ok", samples: int64 }`

#### `daw.export.set_tagging`
Enable metadata tagging. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", tagging: bool }`

#### `daw.export.set_with_cue`
Generate CUE sheet. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", with_cue: bool }`

#### `daw.export.set_with_toc`
Generate TOC sheet. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", with_toc: bool }`

#### `daw.export.set_with_mp4chaps`
Generate MP4 chapters. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", with_mp4chaps: bool }`

#### `daw.export.set_analyse`
Enable analysis pass after export. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", analyse: bool }`

#### `daw.export.set_reimport`
Reimport after export. Param: `enabled` (bool, required).
**Returns:** `{ status: "ok", reimport: bool }`

#### `daw.export.set_post_export_command`
Set a post-export shell command. Param: `command` (string, required).
**Returns:** `{ status: "ok", command: string }`

#### `daw.export.set_timespan`
Set export range (stub).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | -- | Start in samples |
| end | int64 | yes | -- | End in samples |
| name | string | no | "" | Timespan name |
**Returns:** `{ status: "stub", message: string, start: int64, end: int64, name: string }`

#### `daw.export.set_timespan_realtime`
Enable realtime export (stub). Param: `realtime` (bool, required).
**Returns:** `{ status: "stub", message: string, realtime: bool }`

#### `daw.export.set_filename_label`
Set filename label (stub). Param: `label` (string, required).
**Returns:** `{ status: "stub", message: string, label: string }`

#### `daw.export.set_filename_folder`
Set export directory (stub). Param: `path` (string, required).
**Returns:** `{ status: "stub", message: string, path: string }`

#### `daw.export.set_filename_revision`
Set revision number (stub). Param: `revision` (int, required).
**Returns:** `{ status: "stub", message: string, revision: int }`

#### `daw.export.set_channel_split`
Split to mono channels (stub). Param: `split` (bool, required).
**Returns:** `{ status: "stub", message: string, split: bool }`

#### `daw.export.add_channel_config`
Add channel configuration (stub). Param: `name` (string, required).
**Returns:** `{ status: "stub", message: string, name: string }`

#### `daw.export.get_warnings`
Get export validation warnings (stub). No parameters.
**Returns:** `{ status: "stub", message: string, warnings: [] }`

#### `daw.export.get_sample_filename`
Preview export filename (stub).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| format | string | no | "WAV" | Format string |
**Returns:** `{ status: "stub", message: string, filename: string }`

#### `daw.export.prepare`
Validate and prepare export (stub). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.export.execute`
Run the export. No parameters.
**Returns:** `{ status: string, return_code: int }` -- status is "started" or "error"

#### `daw.export.abort`
Abort current export. No parameters.
**Returns:** `{ status: string }` -- "aborted" or "no_export_running"

---

## 3.2 Plugin Manager

#### `daw.plugin_manager.refresh`
Rescan plugins.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| cache_only | bool | no | false | Only use cached data |
**Returns:** `{ status: "ok", cache_only: bool }`

#### `daw.plugin_manager.cancel_scan`
Cancel a plugin scan. No parameters.
**Returns:** `{ status: "cancelled" }`

#### `daw.plugin_manager.get_scan_log`
Get scan errors/log. No parameters.
**Returns:** `{ entries: [{type, path, result}], count: int }`

#### `daw.plugin_manager.clear_stale_log`
Clear old scan log entries. No parameters.
**Returns:** `{ status: "ok" }`

#### `daw.plugin_manager.get_plugins_by_type`
Get plugins of a specific type. Param: `type` (string, required). Values: "AudioUnit"/"AU", "LADSPA", "LV2", "Windows_VST"/"VST", "LXVST", "MacVST", "Lua", "VST3".
**Returns:** `{ type: string, plugins: [{name, unique_id, category, creator, n_inputs, n_outputs}], count: int }`

#### `daw.plugin_manager.whitelist`
Add a plugin to the whitelist.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | string | yes | -- | Plugin type |
| id | string | yes | -- | Plugin unique ID |
| force | bool | no | false | Force whitelist |
**Returns:** `{ status: string }` -- "whitelisted" or "failed"

#### `daw.plugin_manager.blacklist`
Add a plugin to the blacklist. Params: `type` (string), `id` (string), both required.
**Returns:** `{ status: "blacklisted" }`

#### `daw.plugin_manager.rescan_plugin`
Re-scan a single plugin. Params: `type` (string), `id` (string), both required.
**Returns:** `{ status: string }` -- "rescanned" or "failed"

#### `daw.plugin_manager.rescan_faulty`
Re-scan all failed plugins. No parameters.
**Returns:** `{ status: "ok" }`

#### `daw.plugin_manager.get_status`
Get plugin favorite/hidden status. Params: `type` (string), `id` (string), both required.
**Returns:** `{ status: string, status_value: string }` -- status_value is "Normal", "Favorite", "Hidden", or "Unknown"

#### `daw.plugin_manager.set_status`
Set plugin favorite/hidden status. Params: `type` (string), `id` (string), `status` (string: "Favorite"/"Hidden"/"Normal"), all required.
**Returns:** `{ status: "ok" }`

#### `daw.plugin_manager.get_stats`
Get plugin usage statistics. Params: `type` (string), `id` (string), both required.
**Returns:** `{ status: string, lru: int64, use_count: int64 }`

#### `daw.plugin_manager.reset_stats`
Clear all plugin statistics. No parameters.
**Returns:** `{ status: "ok" }`

#### `daw.plugin_manager.clear_vst_cache` / `clear_vst_blacklist` / `clear_au_cache` / `clear_au_blacklist` / `clear_vst3_cache` / `clear_vst3_blacklist`
Clear format-specific caches or blacklists. No parameters each.
**Returns:** `{ status: "ok" }`

#### `daw.plugin_manager.cache_valid`
Check if plugin cache is fresh. No parameters.
**Returns:** `{ valid: bool }`

#### `daw.plugin_manager.save_tags`
Persist plugin tags to disk. No parameters.
**Returns:** `{ status: "ok" }`

#### `daw.plugin_manager.save_statuses`
Persist plugin statuses to disk. No parameters.
**Returns:** `{ status: "ok" }`

#### `daw.plugin_manager.dump_untagged`
Export list of untagged plugins. No parameters.
**Returns:** `{ untagged: string }`

#### `daw.plugin_manager.get_type_name`
Get human-readable type name. Param: `type` (string, required).
**Returns:** `{ type_name: string }`

#### `daw.plugin_manager.get_default_vst_path`
Get default VST search paths (stub). No parameters.
**Returns:** `{ status: "stub", message: string, common_paths: string[] }`

---

## 3.3 Track Advanced Controls

#### `daw.track.request_input_monitoring`
Soft input monitoring request. Params: `track_id` (string), `enabled` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.track.ensure_input_monitoring`
Hard input monitoring. Params: `track_id` (string), `enabled` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.track.playback_buffer_load`
Get disk playback buffer percentage. Param: `track_id` (string, required).
**Returns:** `{ load: float }`

#### `daw.track.capture_buffer_load`
Get disk capture buffer percentage. Param: `track_id` (string, required).
**Returns:** `{ load: float }`

#### `daw.track.set_align_style`
Set capture alignment style. Params: `track_id` (string), `style` (string: "CaptureTime" or "ExistingMaterial"), both required.
**Returns:** `{ status: "ok" }`

#### `daw.track.set_align_choice`
Set timing alignment mode. Params: `track_id` (string), `choice` (string: "UseCaptureTime", "UseExistingMaterial", or "Automatic"), both required.
**Returns:** `{ status: "ok" }`

#### `daw.midi_track.midi_panic`
All notes off on a MIDI track. Param: `track_id` (string, required).
**Returns:** `{ status: "ok" }`

#### `daw.midi_track.write_immediate_event`
Queue a raw MIDI event.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | MIDI track ID |
| data | int[] | yes | -- | Array of MIDI bytes |
**Returns:** `{ status: string, bytes: int }` -- status is "ok" or "failed"

#### `daw.midi_track.set_chase_notes`
Enable/disable note chase during playback. Params: `track_id` (string), `enabled` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.midi_track.set_step_editing`
Enable/disable step entry mode. Params: `track_id` (string), `enabled` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.midi_track.set_capture_channel_mode`
Filter MIDI input channels.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | MIDI track ID |
| mode | string | yes | -- | "AllChannels", "FilterChannels", or "ForceChannel" |
| mask | uint16 | yes | -- | Channel bitmask |
**Returns:** `{ status: "ok" }`

#### `daw.midi_track.set_playback_channel_mode`
Filter MIDI output channels. Same params as `set_capture_channel_mode`.
**Returns:** `{ status: "ok" }`

#### `daw.midi_track.set_input_active`
Toggle MIDI input. Params: `track_id` (string), `active` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.route.set_meter_point`
Move meter measurement position. Params: `track_id` (string), `point` (string: "MeterInput", "MeterPreFader", "MeterPostFader", "MeterOutput", "MeterCustom"), both required.
**Returns:** `{ status: "ok" }`

#### `daw.route.set_meter_type`
Change meter type. Params: `track_id` (string), `type` (string: "MeterPeak", "MeterMaxSignal", "MeterMaxPeak", "MeterKrms", "MeterK20", "MeterK14", "MeterK12", "MeterIEC1DIN", "MeterIEC1NOR", "MeterIEC2BBC", "MeterIEC2EBU", "MeterVU", "MeterPeak0dB", "MeterMCP"), both required.
**Returns:** `{ status: "ok" }`

#### `daw.route.set_denormal_protection`
Enable denormal protection. Params: `track_id` (string), `enabled` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.route.get_monitoring_state`
Get current monitoring state. Param: `track_id` (string, required).
**Returns:** `{ state: string, state_raw: int }` -- state is "Silence", "Input", "Disk", or "Cue"

#### `daw.route.feeds`
Check if one route feeds another. Params: `track_id`, `other_id` (string, required).
**Returns:** `{ feeds: bool }`

#### `daw.route.signal_sources`
Get upstream routes that feed this one.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Route ID |
| via_sends_only | bool | no | false | Only count send connections |
**Returns:** `{ sources: [{id, name}], count: int }`

#### `daw.route.output_effectively_connected`
Check if a route's output is in use. Param: `track_id` (string, required).
**Returns:** `{ connected: bool }`

---

## 3.4 Send/Return Configuration

#### `daw.route.add_aux_send`
Create an aux send to a target route. Params: `track_id`, `target_id` (string, required).
**Returns:** `{ status: string, return_code: int }`

#### `daw.route.add_foldback_send`
Create a foldback send.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Source track |
| target_id | string | yes | -- | Target route |
| post_fader | bool | no | true | Post-fader placement |
**Returns:** `{ status: string, return_code: int }`

#### `daw.route.get_internal_send`
Get the send targeting a specific route. Params: `track_id`, `target_id` (string, required).
**Returns:** `{ status: string, send_id: string, name: string, active: bool }` or `{ status: "not_found" }`

#### `daw.route.enable_monitor_send`
Create/enable monitor send. Param: `track_id` (string, required).
**Returns:** `{ status: "ok" }`

#### `daw.route.enable_surround_send`
Create surround send. Param: `track_id` (string, required).
**Returns:** `{ status: "ok" }`

#### `daw.send.set_panner_linked`
Link send panner to route panner. Params: `track_id`, `send_id` (string), `linked` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.send.set_remove_on_disconnect`
Auto-remove send when disconnected. Params: `track_id`, `send_id` (string), `remove` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.route.add_sidechain`
Add sidechain to a plugin. Params: `track_id`, `plugin_id` (string, required).
**Returns:** `{ status: string }` -- "ok" or "failed"

#### `daw.route.remove_sidechain`
Remove sidechain from a plugin. Params: `track_id`, `plugin_id` (string, required).
**Returns:** `{ status: string }` -- "ok" or "failed"

#### `daw.internal_send.set_allow_feedback`
Allow/disallow feedback loop. Params: `track_id`, `send_id` (string), `allow` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.delivery.set_analysis_active`
Enable/disable RTA on delivery. Params: `track_id` (string), `active` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.route.get_latency`
Get total signal latency for a route. Param: `track_id` (string, required).
**Returns:** `{ latency_samples: int64 }`

---

## 3.5 Trigger/Clip Advanced

#### `daw.trigger.set_follow_action0`
Set first follow action. Params: `track_id` (string), `slot` (int), `action` (string: "None", "Stop", "Again", "ForwardTrigger", "ReverseTrigger", "FirstTrigger", "LastTrigger", "JumpTrigger"), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_follow_action1`
Set second follow action. Same params as `set_follow_action0`.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_follow_probability`
Set follow action probability. Params: `track_id` (string), `slot` (int), `probability` (int, 0-100), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_follow_length`
Set custom follow length in BBT.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| slot | int | yes | -- | Trigger slot index |
| bars | int | no | 1 | Bars |
| beats | int | no | 0 | Beats |
| ticks | int | no | 0 | Ticks |
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_use_follow_length`
Enable/disable custom follow length. Params: `track_id` (string), `slot` (int), `enabled` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_legato`
Enable/disable legato mode. Params: `track_id` (string), `slot` (int), `enabled` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_velocity_effect`
Set velocity response (0.0-1.0). Params: `track_id` (string), `slot` (int), `value` (float), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_stretchable`
Enable/disable time-stretching. Params: `track_id` (string), `slot` (int), `enabled` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_allow_patch_changes`
Allow MIDI patch changes. Params: `track_id` (string), `slot` (int), `enabled` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.set_cue_isolated`
Enable/disable cue isolation. Params: `track_id` (string), `slot` (int), `enabled` (bool), all required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.request_stop`
Stop a trigger immediately. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.stop_quantized`
Stop trigger at next quantization point. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.clear_region`
Clear loaded region from trigger slot. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ status: "ok" }`

#### `daw.trigger.get_position`
Get current playback position (from triggerbox). Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ position_fraction: double }`

#### `daw.trigger.get_position_fraction`
Get trigger position 0.0-1.0. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ fraction: double }`

#### `daw.audio_trigger.set_segment_tempo`
Set clip tempo for audio trigger. Params: `track_id` (string), `slot` (int), `bpm` (double), all required.
**Returns:** `{ status: "ok" }`

#### `daw.audio_trigger.get_segment_beatcnt`
Get beat count for audio trigger (stub). Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ status: "stub", message: string }`

#### `daw.audio_trigger.set_segment_beatcnt`
Set beat count for audio trigger (stub). Params: `track_id` (string), `slot` (int), `count` (double), all required.
**Returns:** `{ status: "stub", message: string }`

#### `daw.midi_trigger.set_patch_change`
Set MIDI patch change on trigger.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| slot | int | yes | -- | Trigger slot |
| channel | int | yes | -- | MIDI channel |
| program | int | yes | -- | Program number |
| bank_msb | int | no | -1 | Bank MSB |
| bank_lsb | int | no | -1 | Bank LSB |
**Returns:** `{ status: "ok" }`

#### `daw.midi_trigger.unset_patch_change`
Clear patch change on channel. Params: `track_id` (string), `slot` (int), `channel` (int), all required.
**Returns:** `{ status: "ok" }`

#### `daw.midi_trigger.unset_all_patch_changes`
Clear all patch changes. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ status: "ok" }`

#### `daw.midi_trigger.get_used_channels`
Get which MIDI channels are used. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ channels: int[] }`

#### `daw.midi_trigger.set_channel_map`
Remap a MIDI channel. Params: `track_id` (string), `slot` (int), `from` (int), `to` (int), all required.
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.set_record_enabled`
Enable/disable trigger recording. Params: `track_id` (string), `enabled` (bool), both required.
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.get_record_enabled`
Query if trigger recording is armed. Param: `track_id` (string, required).
**Returns:** `{ record_enabled: bool }`

#### `daw.triggerbox.clear_all`
Clear all trigger slots. Param: `track_id` (string, required).
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.stop_all_immediately`
Stop all triggers NOW. Param: `track_id` (string, required).
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.begin_midi_learn`
Start MIDI learn for a slot. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.midi_unlearn`
Remove MIDI binding from a slot. Params: `track_id` (string), `slot` (int), both required.
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.stop_midi_learn`
Stop MIDI learn mode. Param: `track_id` (string, required).
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.set_midi_map_mode`
Set MIDI mapping mode (static). Param: `mode` (string, required). Values: "AbletonPush", "SequentialNote", "ByMidiChannel", "Custom".
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.set_first_midi_note`
Set starting MIDI note for grid. Param: `note` (int, required, 0-127).
**Returns:** `{ status: "ok" }`

#### `daw.triggerbox.get_midi_map_mode`
Get current MIDI map mode. No parameters.
**Returns:** `{ mode: string }`

#### `daw.triggerbox.get_first_midi_note`
Get starting MIDI note. No parameters.
**Returns:** `{ note: int }`

#### `daw.triggerbox.disarm_all`
Disarm all trigger slots on a track (sets cue_isolated = true). Param: `track_id` (string, required).
**Returns:** `{ status: "ok", slots_disarmed: int }`

---

# Tier 4 -- Lower Priority / Completeness

Source: `engine/libs/ardour/dawflow_commands_tier4.cc`

## 4.1 Surround / Atmos

#### `daw.surround_send.get_gain_control`
Get surround send gain. Param: `track_id` (string, required).
**Returns:** `{ gain: double, track_id: string }`

#### `daw.surround_send.get_pannable`
Get surround panner position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| index | int | no | 0 | Pannable index |
**Returns:** `{ pos_x: double, pos_y: double, pos_z: double, size: double }`

#### `daw.surround_send.n_pannables`
Get number of surround pannables. Param: `track_id` (string, required).
**Returns:** `{ n_pannables: int }`

#### `daw.surround_send.set_delay_in`
Set surround send input delay. Params: `track_id` (string), `samples` (int64), both required.
**Returns:** `{ ok: bool }`

#### `daw.surround_send.set_delay_out`
Set surround send output delay.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| samples | int64 | yes | -- | Delay in samples |
| bus | int | no | 0 | Bus index |
**Returns:** `{ ok: bool }`

#### `daw.surround_return.load_au_preset`
Load an AU preset on the surround return. Param: `index` (int, required).
**Returns:** `{ ok: bool }`

#### `daw.surround_return.set_au_param`
Set an AU parameter on the surround return. Params: `index` (int), `value` (float), both required.
**Returns:** `{ ok: bool }`

#### `daw.surround_return.have_au_renderer`
Check if AU renderer is available. No parameters.
**Returns:** `{ available: bool }`

#### `daw.surround_pannable.set_automation_state`
Set surround pan automation state.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| channel | int | no | 0 | Channel index |
| state | string | yes | -- | "off", "write", "touch", "play", "latch" |
**Returns:** `{ ok: bool }`

#### `daw.surround_pannable.get_automation_state`
Get surround pan automation state. Params: `track_id` (string), optionally `channel` (int, default 0).
**Returns:** `{ state: string }`

#### `daw.surround_pannable.touching`
Check if a surround pannable is being touched. Params: `track_id` (string), optionally `channel` (int, default 0).
**Returns:** `{ touching: bool }`

#### `daw.surround_pannable.sync_visual_link`
Stub -- UI-only operation. No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.surround_pannable.setup_visual_links`
Stub -- UI-only operation. No parameters.
**Returns:** `{ status: "stub", message: string }`

---

## 4.2 Source / Cue Markers

#### `daw.source.add_cue_marker`
Add a cue marker to a source. Params: `source_id` (string), `name` (string), `position` (int64 samples), all required.
**Returns:** `{ ok: bool }`

#### `daw.source.remove_cue_marker`
Remove a cue marker by position. Params: `source_id` (string), `position` (int64 samples), both required.
**Returns:** `{ ok: bool }`

#### `daw.source.move_cue_marker`
Move a cue marker. Params: `source_id` (string), `old_pos` (int64), `new_pos` (int64), all required.
**Returns:** `{ ok: bool }`

#### `daw.source.rename_cue_marker`
Rename a cue marker. Params: `source_id` (string), `position` (int64), `name` (string), all required.
**Returns:** `{ ok: bool }`

#### `daw.source.clear_cue_markers`
Clear all cue markers from a source. Param: `source_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.source.get_cue_markers`
Get all cue markers on a source. Param: `source_id` (string, required).
**Returns:** `{ markers: [{text: string, position: int64}], count: int }`

#### `daw.source.load_transients`
Load transient data.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| source_id | string | yes | -- | Source ID |
| path | string | no | "" | Optional file path |
**Returns:** `{ ok: bool, return_code: int }`

#### `daw.source.has_been_analysed`
Check if source has been analysed. Param: `source_id` (string, required).
**Returns:** `{ analysed: bool }`

#### `daw.source.mark_for_remove`
Mark source for removal. Param: `source_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.source.set_take_id`
Set take ID on a source. Params: `source_id` (string), `name` (string), both required.
**Returns:** `{ ok: bool }`

#### `daw.source.get_take_id`
Get take ID of a source. Param: `source_id` (string, required).
**Returns:** `{ take_id: string }`

#### `daw.audio_source.estimate_tempo`
Estimate tempo of an audio source. Param: `source_id` (string, required).
**Returns:** `{ ok: bool, message: string }`

#### `daw.audio_source.build_peaks`
Build peak waveform data. Param: `source_id` (string, required).
**Returns:** `{ ok: bool, return_code: int }`

#### `daw.source.get_segment_descriptor`
Get segment descriptor for a source range. Params: `source_id` (string), `start` (int64), `end` (int64), all required.
**Returns:** `{ ok: bool, time_domain: string }`

---

## 4.3 Bundle / IO Routing

#### `daw.bundle.list_all`
List all bundles. No parameters.
**Returns:** `{ bundles: [{name, n_channels, inputs_or_outputs}], count: int }`

#### `daw.bundle.create`
Create a new bundle.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | -- | Bundle name |
| input | bool | no | true | Whether ports are inputs |
| channel_name | string | no | -- | Optional initial channel name |
| type | string | no | "audio" | Channel type ("audio" or "midi") |
**Returns:** `{ ok: bool, name: string }`

#### `daw.bundle.add_channel`
Add a channel to a bundle. Params: `bundle_id` (string), `name` (string), both required. Optional `type` (string, default "audio").
**Returns:** `{ ok: bool, n_channels: int }`

#### `daw.bundle.remove_channel`
Remove a channel from a bundle. Params: `bundle_id` (string), `index` (int), both required.
**Returns:** `{ ok: bool, n_channels: int }`

#### `daw.bundle.add_port`
Add a port to a bundle channel. Params: `bundle_id` (string), `channel` (int), `port_name` (string), all required.
**Returns:** `{ ok: bool }`

#### `daw.bundle.remove_port`
Remove a port from a bundle channel. Params: `bundle_id` (string), `channel` (int), `port_name` (string), all required.
**Returns:** `{ ok: bool }`

#### `daw.bundle.connect`
Connect two bundles. Params: `bundle_id`, `other_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.bundle.disconnect`
Disconnect two bundles. Params: `bundle_id`, `other_id` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.bundle.connected_to`
Check if two bundles are connected. Params: `bundle_id`, `other_id` (string, required).
**Returns:** `{ connected: bool }`

#### `daw.io.connect_to_bundle`
Connect a route's I/O to a bundle.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Route ID |
| bundle_id | string | yes | -- | Bundle name |
| input | bool | no | true | Connect to input (true) or output (false) |
**Returns:** `{ ok: bool }`

#### `daw.io.disconnect_from_bundle`
Disconnect a route's I/O from a bundle. Same params as `connect_to_bundle`.
**Returns:** `{ ok: bool }`

#### `daw.io.get_bundles_connected`
Get bundles connected to a route's I/O.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Route ID |
| input | bool | no | true | Query input (true) or output (false) |
**Returns:** `{ bundles: [{name, n_channels}], count: int }`

#### `daw.io.add_port`
Add a port to a route's I/O.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Route ID |
| input | bool | no | true | Add to input (true) or output (false) |
| type | string | no | "audio" | "audio" or "midi" |
| connection | string | no | "" | Auto-connect to this port |
**Returns:** `{ ok: bool, n_ports: int }`

#### `daw.io.remove_port`
Remove a port from a route's I/O.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Route ID |
| input | bool | no | true | Remove from input or output |
| port_name | string | yes | -- | Port name to remove |
**Returns:** `{ ok: bool, n_ports: int }`

#### `daw.io.get_latency`
Get I/O latency.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Route ID |
| input | bool | no | true | Query input or output |
**Returns:** `{ latency_samples: int64, connected_latency_samples: int64 }`

---

## 4.4 Selection System

#### `daw.selection.select_track`
Select a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| op | string | no | "set" | "set", "add", or "toggle" |
**Returns:** `{ ok: bool }`

#### `daw.selection.select_next_track`
Select the next track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| mixer_order | bool | no | false | Use mixer ordering |
**Returns:** `{ ok: bool }`

#### `daw.selection.select_prev_track`
Select the previous track. Same params as `select_next_track`.
**Returns:** `{ ok: bool }`

#### `daw.selection.clear_tracks`
Clear track selection. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.selection.get_selected_tracks`
Get all selected tracks. No parameters.
**Returns:** `{ tracks: [{id, name, order}], count: int }`

#### `daw.selection.is_selected`
Check if a track is selected. Param: `track_id` (string, required).
**Returns:** `{ selected: bool }`

#### `daw.selection.get_first_selected`
Get the first selected stripable. No parameters.
**Returns:** `{ id: string|null, name: string|null }`

#### `daw.selection.get_time_range`
Get selected time range (stub). No parameters.
**Returns:** `{ status: "stub", message: string, start: 0, end: 0 }`

#### `daw.editor.jump_forward_to_mark`
Jump to the next marker from current position. No parameters.
**Returns:** `{ ok: bool, position: int64, name: string }` or `{ ok: false, message: string }`

#### `daw.editor.jump_backward_to_mark`
Jump to the previous marker. No parameters.
**Returns:** `{ ok: bool, position: int64, name: string }` or `{ ok: false, message: string }`

#### `daw.editor.goto_nth_marker`
Go to marker by index. Param: `n` (int, required).
**Returns:** `{ ok: bool, message: string }`

#### `daw.editor.trigger_script`
Trigger an editor script (stub). Param: `n` (int, optional, default 0).
**Returns:** `{ status: "stub", message: string, n: int }`

---

## 4.5 Lua Script Integration

#### `daw.lua.register_function`
Register a Lua function. Params: `name` (string), `script` (string), both required.
**Returns:** `{ ok: bool }`

#### `daw.lua.unregister_function`
Unregister a Lua function. Param: `name` (string, required).
**Returns:** `{ ok: bool }`

#### `daw.lua.list_functions`
List registered Lua functions. No parameters.
**Returns:** `{ functions: string[], count: int }`

#### `daw.lua.execute`
Execute a registered Lua function (stub). Param: `name` (string, required).
**Returns:** `{ status: "stub", message: string, name: string }`

#### `daw.lua.new_plugin`
Create a Lua plugin (stub). Param: `name` (string, required).
**Returns:** `{ status: "stub", message: string, name: string }`

#### `daw.lua.set_processor_param`
Set a parameter on a Lua/plugin processor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| proc | string | yes | -- | Processor ID |
| param | int | yes | -- | Parameter index |
| value | float | yes | -- | Value to set |
**Returns:** `{ ok: bool }`

#### `daw.lua.get_processor_param`
Get a parameter value from a processor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| proc | string | yes | -- | Processor ID |
| param | int | yes | -- | Parameter index |
**Returns:** `{ value: double }`

#### `daw.lua.reset_processor`
Reset all processor parameters to defaults. Params: `track_id` (string), `proc` (string), both required.
**Returns:** `{ ok: bool }`

#### `daw.lua.list_plugins`
List Lua-type plugins in the session. No parameters.
**Returns:** `{ plugins: [{track_id, track_name, proc_id, name}], count: int }`

#### `daw.lua.new_send`
Create a send via Lua (stub). No functional parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.lua.plugin_automation`
Plugin automation via Lua (stub). No functional parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.session.load_io_plugin`
Load an I/O plugin (stub). Param: `name` (string, required).
**Returns:** `{ status: "stub", message: string, name: string }`

---

## 4.6 Playlist Analysis

#### `daw.playlist.all_regions_empty`
Check if all regions on a track's playlist are empty. Param: `track_id` (string, required).
**Returns:** `{ empty: bool }`

#### `daw.playlist.top_layer`
Get the top layer number. Param: `track_id` (string, required).
**Returns:** `{ top_layer: int }`

#### `daw.playlist.region_use_count`
Get how many times a region appears. Params: `track_id` (string), `region_id` (string), both required.
**Returns:** `{ use_count: int }`

#### `daw.playlist.region_is_audible`
Check if a region is audible at a position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| region_id | string | yes | -- | Region ID |
| pos | int64 | yes | -- | Position in samples |
**Returns:** `{ audible: bool }`

#### `daw.playlist.find_next_boundary`
Find the next region boundary.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| pos | int64 | yes | -- | Current position in samples |
| dir | int | no | 1 | Direction: 1 = forward, -1 = backward |
**Returns:** `{ boundary: int64 }`

#### `daw.playlist.find_prev_region_start`
Find the previous region start. Params: `track_id` (string), `pos` (int64), both required.
**Returns:** `{ position: int64 }`

#### `daw.playlist.partition`
Split playlist at boundaries.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| start | int64 | yes | -- | Start in samples |
| end | int64 | yes | -- | End in samples |
| cut | bool | no | false | Remove the partitioned section |
**Returns:** `{ ok: bool }`

#### `daw.playlist.fade_range`
Apply fades to a range.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | -- | Track ID |
| start | int64 | cond. | -- | Start in samples (if no ranges array) |
| end | int64 | cond. | -- | End in samples (if no ranges array) |
| ranges | array | cond. | -- | Array of {start, end} objects |
**Returns:** `{ ok: bool }`

---

## 4.7 Phase / Polarity Control

#### `daw.phase.set_invert`
Set phase invert on a channel. Params: `track_id` (string), `channel` (int), `invert` (bool), all required.
**Returns:** `{ ok: bool }`

#### `daw.phase.get_inverted`
Get phase invert state. Params: `track_id` (string), `channel` (int), both required.
**Returns:** `{ inverted: bool }`

#### `daw.phase.set_all`
Set phase invert on all channels via bitset. Params: `track_id` (string), `bitset` (string of 0s and 1s), both required.
**Returns:** `{ ok: bool }`

#### `daw.phase.any_inverted`
Check if any channel has phase inverted. Param: `track_id` (string, required).
**Returns:** `{ any_inverted: bool }`

#### `daw.phase.none_inverted`
Check if no channels have phase inverted. Param: `track_id` (string, required).
**Returns:** `{ none_inverted: bool }`

#### `daw.phase.resize`
Resize the phase control to match channel count. Params: `track_id` (string), `channels` (int), both required.
**Returns:** `{ ok: bool, size: int }`

---

## 4.8 Butler / Disk I/O

#### `daw.butler.get_capture_buffer_size`
Get the audio capture buffer size. No parameters.
**Returns:** `{ capture_buffer_size: int64, capture_buffer_seconds: double }`

#### `daw.butler.get_playback_buffer_size`
Get the audio playback buffer size. No parameters.
**Returns:** `{ playback_buffer_size: int64, playback_buffer_seconds: double }`

#### `daw.butler.get_midi_buffer_size`
Get MIDI buffer configuration. No parameters.
**Returns:** `{ buffering_preset: string, message: string }` -- preset is "small", "medium", "large", or "custom"

#### `daw.butler.schedule_transport_work`
Schedule disk I/O work. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.butler.wait_until_finished`
Block until butler finishes pending work. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.butler.summon`
Wake up the butler thread. No parameters.
**Returns:** `{ ok: bool }`

---

## 4.9 Editor Operations

#### `daw.editor.new_region_from_selection`
Create region from selection (stub). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.editor.separate_region_from_selection`
Separate region from selection (stub). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.editor.reverse_region`
Reverse a region (stub -- redirects). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.editor.normalize_region`
Normalize a region (stub -- redirects). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.editor.pitch_shift_region`
Pitch shift a region (stub -- redirects). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.editor.play_selection`
Play selection (stub -- redirects). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.editor.play_with_preroll`
Play from current position with 2-second preroll. No parameters.
**Returns:** `{ ok: bool, preroll: int64 }`

#### `daw.editor.rec_with_preroll`
Record with preroll (stub -- redirects). No parameters.
**Returns:** `{ status: "stub", message: string }`

#### `daw.editor.rec_with_count_in`
Record with count-in. No parameters.
**Returns:** `{ ok: bool }`

#### `daw.editor.set_loop_range`
Set the auto-loop range.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| start | int64 | yes | -- | Start in samples |
| end | int64 | yes | -- | End in samples |
**Returns:** `{ ok: bool, start: int64, end: int64 }`

#### `daw.editor.set_punch_range`
Set the auto-punch range. Same params as `set_loop_range`.
**Returns:** `{ ok: bool, start: int64, end: int64 }`

#### `daw.editor.add_location_at_playhead`
Add a marker at the playhead position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | no | "Mark" | Marker name |
**Returns:** `{ ok: bool, position: int64, name: string }`

#### `daw.editor.remove_location_at_playhead`
Remove the marker at the playhead. No parameters.
**Returns:** `{ ok: bool, name: string }` or `{ ok: false, message: string }`

#### `daw.editor.add_section_at_playhead`
Add a range marker section at the playhead.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | no | "Section" | Section name |
**Returns:** `{ ok: bool, position: int64, name: string }`

---

**Total: 422 commands** (89 Tier 1 + 106 Tier 2 + 127 Tier 3 + 100 Tier 4)

---

# DAWFLOW Extended API Reference

Comprehensive documentation for 382 IPC commands across five source files:
- `dawflow_commands_triggers.cc` (80 commands)
- `dawflow_commands_sidechain.cc` (52 commands)
- `dawflow_commands_routing_ext.cc` (96 commands)
- `dawflow_commands_safety.cc` (35 commands)
- `dawflow_commands_simulate.cc` (65 commands)

All commands use JSON-RPC 2.0 over IPC (`POST http://localhost:19100/api/command`).

---

## Table of Contents

1. [Trigger / Clip Launcher (25)](#trigger--clip-launcher)
2. [Mixer Scenes (10)](#mixer-scenes)
3. [Region FX (10)](#region-fx)
4. [Lua Scripting Bridge (8)](#lua-scripting-bridge)
5. [Editor State Bridge (15)](#editor-state-bridge)
6. [IO Plugins (5)](#io-plugins)
7. [Miscellaneous (7)](#miscellaneous)
8. [Sidechain Routing (9)](#sidechain-routing)
9. [Input Monitoring (7)](#input-monitoring)
10. [Rec-Safe (5)](#rec-safe)
11. [Processor Ordering (8)](#processor-ordering)
12. [Trim Control (5)](#trim-control)
13. [Phase Control (4)](#phase-control)
14. [Pan Azimuth / Elevation / Width (8)](#pan-azimuth--elevation--width)
15. [Plugin Latency (6)](#plugin-latency)
16. [Send Pre/Post (8)](#send-prepost)
17. [Aux Bus Management (8)](#aux-bus-management)
18. [MIDI Clock (6)](#midi-clock)
19. [MTC (6)](#mtc)
20. [LTC (8)](#ltc)
21. [Direct Outputs (7)](#direct-outputs)
22. [Solo Isolate / Safe (8)](#solo-isolate--safe)
23. [Track Templates (8)](#track-templates)
24. [Loop / Range Editing (8)](#loop--range-editing)
25. [Internal Routing (8)](#internal-routing)
26. [Auto-Connect (6)](#auto-connect)
27. [Click Track (7)](#click-track)
28. [Routing Ext Bonus (8)](#routing-ext-bonus)
29. [Command Metadata & Validation (10)](#command-metadata--validation)
30. [Transactional Execution (10)](#transactional-execution)
31. [Invariant Checks & Guards (15)](#invariant-checks--guards)
32. [Simulate: Region (15)](#simulate-region)
33. [Simulate: Track (10)](#simulate-track)
34. [Simulate: Routing (10)](#simulate-routing)
35. [Simulate: Export (10)](#simulate-export)
36. [Simulate: Session (15)](#simulate-session)
37. [Simulate: Additional (5)](#simulate-additional)

---

## Trigger / Clip Launcher

Source: `dawflow_commands_triggers.cc` (commands 1-25)

#### `daw.trigger.get_triggerbox_info`
Get triggerbox info for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| data_type | string | "audio" or "midi" |
| num_slots | int | Default triggers per box |
| order | int | TriggerBox order |
| empty | bool | Whether box has no content |
| record_enabled | bool | Whether box recording is enabled |
| currently_playing | int/null | Index of currently playing slot |

---

#### `daw.trigger.get_all_slots`
Get all trigger slots across all tracks with state.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| slots | array | Array of slot objects (see get_slot_info) with track_name added |
| count | int | Total slot count |

---

#### `daw.trigger.get_slot_info`
Get properties of a specific trigger slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| name | string | Slot name |
| state | string | "stopped", "running", "waiting_to_start", etc. |
| active | bool | Whether slot is active |
| playable | bool | Whether slot can play |
| armed | bool | Whether slot is armed for recording |
| launch_style | string | "oneshot", "retrigger", "gate", "toggle", "repeat" |
| gain | double | Slot gain value |
| color | uint32 | Slot color (RGBA) |
| stretch_mode | string | "crisp", "mixed", "smooth" |
| follow_count | int | Follow count |
| cue_isolated | bool | Whether slot is cue-isolated |
| legato | bool | Whether legato mode is on |
| follow_action0 | string | Follow action type for action 0 |
| follow_action1 | string | Follow action type for action 1 |
| follow_action_probability | int | Probability for follow action selection |
| quantization | object | {bars, beats, ticks} |
| region_id | string/null | Assigned region ID |
| region_name | string/null | Assigned region name |

---

#### `daw.trigger.bang`
Launch a trigger.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| velocity | float | no | 1.0 | Launch velocity |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |

---

#### `daw.trigger.unbang`
Stop a trigger.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |

---

#### `daw.trigger.stop_all`
Stop all triggers globally.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| stopped | int | Number of trigger boxes stopped |

---

#### `daw.trigger.stop_track`
Stop all triggers on a specific track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |

---

#### `daw.trigger.set_region`
Assign a region to a trigger slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| region_id | string | yes | — | Region ID to assign |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| region_name | string | Name of assigned region |

---

#### `daw.trigger.clear_slot`
Clear a trigger slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |

---

#### `daw.trigger.set_follow_action`
Set follow action for a slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| action | string | yes | — | "none","stop","again","forward","reverse","first","last","jump" |
| which | int | no | 0 | 0 or 1 (follow action index) |
| probability | int | no | — | Probability (0-100) for follow action selection |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| action | string | Action set |
| which | int | Which follow action |

---

#### `daw.trigger.get_follow_action`
Get follow action for a slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| follow_action0 | string | Follow action 0 type |
| follow_action1 | string | Follow action 1 type |
| probability | int | Follow action probability |

---

#### `daw.trigger.set_launch_style`
Set launch style.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| style | string | yes | — | "oneshot","retrigger","gate","toggle","repeat" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| style | string | Style set |

---

#### `daw.trigger.get_launch_style`
Get launch style.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| style | string | Current launch style |

---

#### `daw.trigger.set_quantization`
Set launch quantization.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| bars | int | no | 1 | Bar quantization |
| beats | int | no | 0 | Beat quantization |
| ticks | int | no | 0 | Tick quantization |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| quantization | object | {bars, beats, ticks} |

---

#### `daw.trigger.get_quantization`
Get launch quantization.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| quantization | object | {bars, beats, ticks} |

---

#### `daw.trigger.set_gain`
Set trigger gain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| gain | double | yes | — | Gain value (linear) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| gain | double | Gain set |

---

#### `daw.trigger.get_gain`
Get trigger gain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| gain | double | Current gain |

---

#### `daw.trigger.set_color`
Set trigger slot color.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| color | uint32 | yes | — | RGBA color value |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| color | uint32 | Color set |

---

#### `daw.trigger.set_name`
Set trigger slot name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| name | string | yes | — | New name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| name | string | Name set |

---

#### `daw.trigger.set_stretch_mode`
Set time stretch mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| mode | string | yes | — | "crisp", "mixed", "smooth" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| mode | string | Mode set |

---

#### `daw.trigger.get_stretch_mode`
Get stretch mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| mode | string | Current stretch mode |

---

#### `daw.trigger.set_follow_count`
Set follow count.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| count | uint32 | yes | — | Number of repeats before follow action |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| count | uint32 | Count set |

---

#### `daw.trigger.is_active`
Check if a trigger is currently playing.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| active | bool | Whether trigger is active |
| state | string | Current trigger state |

---

#### `daw.trigger.get_active_triggers`
List all currently active triggers.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| active_triggers | array | Array of {track_id, track_name, slot_index, name, state, position} |
| count | int | Number of active triggers |

---

#### `daw.trigger.arm_slot`
Arm a slot for recording.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| armed | bool | Armed state after operation |

---

## Mixer Scenes

Source: `dawflow_commands_triggers.cc` (commands 26-35)

#### `daw.mixer_scene.list`
List all mixer scenes with names.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scenes | array | Array of {index, name, empty, stored} |
| count | int | Total scene slots |

---

#### `daw.mixer_scene.store`
Store current mix to a scene slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |

---

#### `daw.mixer_scene.recall`
Recall/apply a mixer scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| applied | bool | Whether scene was applied |

---

#### `daw.mixer_scene.clear`
Clear a mixer scene slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |

---

#### `daw.mixer_scene.rename`
Rename a scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
| name | string | yes | — | New name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| name | string | New name |

---

#### `daw.mixer_scene.get_info`
Get detailed info about a scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| index | int | Scene index |
| name | string | Scene name |
| empty | bool | Whether scene is empty |
| stored | bool | Whether scene has content |

---

#### `daw.mixer_scene.get_count`
Get number of available scene slots.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| count | int | Total scene slots |
| stored_count | int | Number of stored scenes |

---

#### `daw.mixer_scene.is_stored`
Check if a scene slot has content.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| index | int | Scene index |
| stored | bool | Whether scene is stored |

---

#### `daw.mixer_scene.apply_to_routes`
Apply scene to specific routes only.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
| route_ids | string[] | yes | — | Array of route IDs to apply to |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| applied | bool | Whether scene was applied |
| route_count | int | Number of routes applied to |

---

#### `daw.mixer_scene.store_from_routes`
Store scene from specific routes only. Note: stores full scene (per-route selective store requires engine extension).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| note | string | Implementation note |

---

## Region FX

Source: `dawflow_commands_triggers.cc` (commands 36-45)

#### `daw.region_fx.list`
List all region FX on a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| plugins | array | Array of {id, name, type, latency, tailtime} |
| count | int | Number of region FX |

---

#### `daw.region_fx.add`
Add a plugin as region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_uri | string | no | "" | Plugin URI (unique ID) |
| plugin_name | string | no | "" | Plugin name (alternative to URI) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| region_id | string | Region ID |
| plugin_id | string | New region FX ID |
| plugin_name | string | Plugin name |

---

#### `daw.region_fx.remove`
Remove a region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| region_id | string | Region ID |
| plugin_id | string | Removed plugin ID |

---

#### `daw.region_fx.enable`
Enable a region FX (note: region FX are always active when present).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | true |
| note | string | Explanation that region FX are always active |

---

#### `daw.region_fx.disable`
Disable/bypass a region FX (note: not supported, remove to disable).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | true |
| note | string | Explanation that bypass is not supported |

---

#### `daw.region_fx.get_parameters`
Get parameters of a region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| plugin_id | string | Plugin ID |
| parameters | array | Array of {index, name, value, min, max, default} |
| count | int | Number of parameters |

---

#### `daw.region_fx.set_parameter`
Set a parameter on a region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
| param_index | uint32 | yes | — | Parameter index |
| value | double | yes | — | New value |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| region_id | string | Region ID |
| plugin_id | string | Plugin ID |
| param_index | uint32 | Parameter index |
| value | double | Value set |

---

#### `daw.region_fx.get_info`
Get info about a specific region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| plugin_id | string | Plugin ID |
| name | string | Plugin name |
| type | int | Plugin type enum |
| latency | int64 | Signal latency (samples) |
| tailtime | int64 | Signal tail time (samples) |
| input_streams | int | Audio input stream count |
| output_streams | int | Audio output stream count |

---

#### `daw.region_fx.reorder`
Reorder region FX chain (stub: not yet implemented).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| error | string | "not_yet_implemented" |
| note | string | Workaround suggestion |

---

#### `daw.region_fx.get_latency`
Get total region FX latency.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| total_latency | int64 | Total latency (samples) |
| n_region_fx | int | Number of region FX |

---

## Lua Scripting Bridge

Source: `dawflow_commands_triggers.cc` (commands 46-53)

#### `daw.lua.run`
Execute Lua code in session context (stub: not yet implemented).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| code | string | yes | — | Lua code to execute |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| error | string | "not_yet_implemented" |
| code_length | int | Length of submitted code |

---

#### `daw.lua.list_action_scripts`
List registered action scripts.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scripts | array | Array of {name, path, unique_id, author, description, category} |
| count | int | Number of scripts |

---

#### `daw.lua.list_session_scripts`
List session scripts.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scripts | array | Array of {name} |
| count | int | Number of scripts |

---

#### `daw.lua.run_action_script`
Run a numbered action script (stub: not yet implemented).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| slot | int | no | -1 | Script slot number (1-9) |
| name | string | no | "" | Script name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| error | string | "not_yet_implemented" |

---

#### `daw.lua.add_session_script`
Add a Lua session script.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Script name |
| code | string | yes | — | Lua source code |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| name | string | Script name |
| count | int | Total registered script count |

---

#### `daw.lua.remove_session_script`
Remove a session script.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Script name to remove |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| name | string | Script name |
| count | int | Remaining script count |

---

#### `daw.lua.get_script_info`
Get info about a script by name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Script name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| name | string | Script name |
| path | string | File path |
| unique_id | string | Unique identifier |
| type | string | Script type |
| author | string | Author |
| license | string | License |
| category | string | Category |
| description | string | Description |

---

#### `daw.lua.list_available_scripts`
List available Lua scripts from search paths.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | string | no | "" | Filter by type ("all", "DSP", "Session", "EditorHook", "EditorAction", "Snippet", "SessionInit") |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scripts | array | Array of {name, path, unique_id, type, author, category, description} |
| count | int | Number of scripts |
| search_dir | string | User script directory |

---

## Editor State Bridge

Source: `dawflow_commands_triggers.cc` (commands 54-68)

#### `daw.editor.get_snap_mode_v2`
Get snap mode (stub: editor-only state, not accessible from engine).
**Returns:** `{error, note}`

#### `daw.editor.set_snap_mode_v2`
Set snap mode (stub). **Returns:** `{error, note}`

#### `daw.editor.get_grid_type`
Get grid type (stub). **Returns:** `{error, note}`

#### `daw.editor.set_grid_type`
Set grid type (stub). **Returns:** `{error, note}`

#### `daw.editor.get_edit_point`
Get edit point (stub). **Returns:** `{error, note}`

#### `daw.editor.set_edit_point`
Set edit point (stub). **Returns:** `{error, note}`

#### `daw.editor.get_ripple_mode`
Get ripple mode (accessible via RCConfiguration).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ripple_mode | string | "selected", "all", or "interview" |

---

#### `daw.editor.set_ripple_mode`
Set ripple mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| mode | string | yes | — | "selected", "all", or "interview" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| ripple_mode | string | Mode set |

---

#### `daw.editor.get_draw_length`
Get draw length (stub). **Returns:** `{error, note}`

#### `daw.editor.set_draw_length`
Set draw length (stub). **Returns:** `{error, note}`

#### `daw.editor.get_draw_velocity`
Get draw velocity (stub). **Returns:** `{error, note}`

#### `daw.editor.set_draw_velocity`
Set draw velocity (stub). **Returns:** `{error, note}`

#### `daw.editor.get_zoom_focus`
Get zoom focus (stub). **Returns:** `{error, note}`

#### `daw.editor.set_zoom_focus`
Set zoom focus (stub). **Returns:** `{error, note}`

#### `daw.editor.get_mouse_mode`
Get mouse mode (stub). **Returns:** `{error, note}`

---

## IO Plugins

Source: `dawflow_commands_triggers.cc` (commands 69-73)

#### `daw.io_plugin.list`
List I/O plugins.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| io_plugins | array | Array of {id, name, is_pre, type, latency, plugin_name, plugin_uri} |
| count | int | Number of IO plugins |

---

#### `daw.io_plugin.add`
Add an I/O plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_uri | string | no | "" | Plugin URI |
| plugin_name | string | no | "" | Plugin name |
| is_pre | bool | no | true | Pre-processing (true) or post-processing (false) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| id | string | New IO plugin ID |
| name | string | IO plugin name |
| plugin_name | string | Plugin name |
| is_pre | bool | Pre/post flag |

---

#### `daw.io_plugin.remove`
Remove an I/O plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_id | string | yes | — | IO plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| plugin_id | string | Removed plugin ID |

---

#### `daw.io_plugin.enable`
Enable an I/O plugin (note: always active when loaded).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_id | string | yes | — | IO plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | true |
| note | string | Explanation |

---

#### `daw.io_plugin.get_parameters`
Get parameters of an I/O plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_id | string | yes | — | IO plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| plugin_id | string | Plugin ID |
| parameters | array | Array of {index, name, value, min, max, default} |
| count | int | Number of parameters |

---

## Miscellaneous

Source: `dawflow_commands_triggers.cc` (commands 74-80)

#### `daw.archive_session`
Archive session to zip.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| output_path | string | yes | — | Output file path |
| name | string | no | session name | Archive name |
| only_used_sources | bool | no | false | Only include used sources |
**Returns:** `{ok, output_path, name, error_code?}`

#### `daw.get_control_surfaces`
List control surfaces.
**Returns:** `{control_surfaces: [{name, path, active, requested, automatic}], count}`

#### `daw.get_io_plugins`
Alias for `daw.io_plugin.list`.
**Returns:** `{io_plugins: [{id, name, is_pre, type}], count}`

#### `daw.crossfade.create`
Create crossfade between adjacent regions (stub: use region overlap instead).
**Returns:** `{error, note}`

#### `daw.crossfade.get_info`
Get crossfade details (stub).
**Returns:** `{error, note}`

#### `daw.session.cleanup`
Clean up session (remove unused files).
**Returns:** `{ok, space_freed, removed_files, removed_count}`

#### `daw.session.cleanup_peakfiles`
Clean up peak files.
**Returns:** `{ok, error_code?, note?}`

---

## Sidechain Routing

Source: `dawflow_commands_sidechain.cc` (commands 1-9)

#### `daw.sidechain.add`
Add a sidechain to a plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
| n_audio | uint32 | no | 1 | Number of audio sidechain channels |
| n_midi | uint32 | no | 0 | Number of MIDI sidechain channels |
**Returns:** `{success, has_sidechain}`

#### `daw.sidechain.remove`
Remove a sidechain from a plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{success, has_sidechain}`

#### `daw.sidechain.has`
Check if a plugin has a sidechain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain}`

#### `daw.sidechain.get_input`
Get sidechain input port connections.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain, connections: [{port, connected_to}]}`

#### `daw.sidechain.connect`
Connect a source port to sidechain input.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
| source_port | string | yes | — | Source port name |
| port_index | uint32 | no | 0 | Sidechain input port index |
**Returns:** `{success}`

#### `daw.sidechain.disconnect`
Disconnect all sidechain inputs.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{success, disconnected}`

#### `daw.sidechain.get_info`
Get sidechain channel count and connections.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain, sidechain_pins_audio, sidechain_pins_midi, sidechain_ports_audio, sidechain_ports_midi, n_audio, n_midi, n_total, connections: [{port_name, port_index, connections}]}`

#### `daw.sidechain.list_available_sources`
List ports that could feed sidechain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain, audio_sources, midi_sources, audio_count, midi_count}`

#### `daw.sidechain.get_all`
List all plugins with sidechains on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, plugins: [{processor_id, name, index, n_audio, n_midi}], count}`

---

## Input Monitoring

Source: `dawflow_commands_sidechain.cc` (commands 10-16)

#### `daw.monitoring.get_mode`
Get monitoring mode for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, mode, value}`

#### `daw.monitoring.set_mode`
Set monitoring mode for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| mode | string | yes | — | "auto", "input", "disk", "cue" |
**Returns:** `{success, track_id, mode}`

#### `daw.monitoring.get_all`
List monitoring modes for all tracks.
**Returns:** `{tracks: [{track_id, name, mode, value}], count}`

#### `daw.monitoring.set_all`
Set monitoring mode for all tracks.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| mode | string | yes | — | "auto", "input", "disk", "cue" |
**Returns:** `{success, mode, tracks_updated}`

#### `daw.monitoring.get_available_modes`
List available monitoring modes.
**Returns:** `{modes: [{name, value, description}]}`

#### `daw.monitoring.is_monitoring_input`
Check if a track is monitoring input.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, monitoring_input}`

#### `daw.monitoring.is_monitoring_disk`
Check if a track is monitoring disk.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, monitoring_disk}`

---

## Rec-Safe

Source: `dawflow_commands_sidechain.cc` (commands 17-21)

#### `daw.rec_safe.set`
Set rec-safe state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| safe | bool | yes | — | Rec-safe state |
**Returns:** `{success, track_id, safe}`

#### `daw.rec_safe.get`
Get rec-safe state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{track_id, safe}`

#### `daw.rec_safe.set_all`
Set rec-safe state for all tracks.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| safe | bool | yes | — | Rec-safe state |
**Returns:** `{success, safe, tracks_updated}`

#### `daw.rec_safe.get_all`
List rec-safe state for all tracks.
**Returns:** `{tracks: [{track_id, name, safe}], count}`

#### `daw.rec_safe.toggle`
Toggle rec-safe state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{success, track_id, safe}`

---

## Processor Ordering

Source: `dawflow_commands_sidechain.cc` (commands 22-29)

#### `daw.processor.get_at_index`
Get processor info at a position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| index | int | yes | — | Processor index |
**Returns:** `{id, name, active, type, index}`

#### `daw.processor.get_count`
Count processors on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, count}`

#### `daw.processor.move_to_index`
Move a processor to a new index position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Processor ID |
| new_index | int | yes | — | Target index |
**Returns:** `{success, old_index, new_index}`

#### `daw.processor.insert_at_index`
Insert a plugin at a position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| plugin_uri | string | yes | — | Plugin URI or name |
| index | int | yes | — | Target index |
**Returns:** `{success, processor_id, index}`

#### `daw.processor.replace`
Replace a processor with a new plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Processor to replace |
| new_plugin_uri | string | yes | — | New plugin URI or name |
**Returns:** `{success, old_processor_id, new_processor_id}`

#### `daw.processor.get_all_ordered`
Full ordered list with types/names/active.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, processors: [{id, name, active, type, index}], count}`

#### `daw.processor.swap`
Swap two processors by index.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| index_a | int | yes | — | First processor index |
| index_b | int | yes | — | Second processor index |
**Returns:** `{success, index_a, index_b}`

#### `daw.processor.get_type`
Get type of a processor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Processor ID |
**Returns:** `{processor_id, name, type, active}`

---

## Trim Control

Source: `dawflow_commands_sidechain.cc` (commands 30-34)

#### `daw.trim.get`
Get trim value for a track in dB.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, trim_gain, trim_db}`

#### `daw.trim.set`
Set trim value for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| trim_db | double | yes | — | Trim in dB |
**Returns:** `{success, track_id, trim_db, trim_gain}`

#### `daw.trim.get_all`
Get trim values for all tracks.
**Returns:** `{tracks: [{track_id, name, trim_gain, trim_db}], count}`

#### `daw.trim.reset`
Reset trim to 0 dB for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, trim_db}`

#### `daw.trim.reset_all`
Reset trim to 0 dB for all tracks.
**Returns:** `{success, tracks_reset}`

---

## Phase Control

Source: `dawflow_commands_sidechain.cc` (commands 35-38)

#### `daw.phase.get`
Get phase inversion state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, channels: [{channel, inverted}], channel_count, any_inverted}`

#### `daw.phase.set`
Set phase inversion per channel.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| channel | uint32 | yes | — | Channel index |
| inverted | bool | yes | — | Inversion state |
**Returns:** `{success, track_id, channel, inverted}`

#### `daw.phase.invert_all`
Invert all channels on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, channels_inverted}`

#### `daw.phase.reset`
Reset phase to normal (no inversion) for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, channels_reset}`

---

## Pan Azimuth / Elevation / Width

Source: `dawflow_commands_sidechain.cc` (commands 39-46)

#### `daw.pan.get_azimuth`
Get pan azimuth (L-R position, 0=left, 0.5=center, 1=right).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, azimuth}`

#### `daw.pan.set_azimuth`
Set pan azimuth.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| value | double | yes | — | 0.0-1.0 |
**Returns:** `{success, track_id, azimuth}`

#### `daw.pan.get_elevation`
Get pan elevation.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, elevation, note?}`

#### `daw.pan.set_elevation`
Set pan elevation (requires surround or VBAP panner).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| value | double | yes | — | Elevation value |
**Returns:** `{success, track_id, elevation}`

#### `daw.pan.get_width`
Get pan width (stereo spread).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, width, note?}`

#### `daw.pan.set_width`
Set pan width (requires stereo or wider panner).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| value | double | yes | — | Width value |
**Returns:** `{success, track_id, width}`

#### `daw.pan.get_full_state`
Get all pan parameters at once.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, azimuth, elevation, width, frontback, has_azimuth, has_elevation, has_width, has_frontback}`

#### `daw.pan.reset`
Reset pan to center/default.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, controls_reset}`

---

## Plugin Latency

Source: `dawflow_commands_sidechain.cc` (commands 47-52)

#### `daw.plugin_latency.get`
Get a plugin's reported latency.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{processor_id, signal_latency, effective_latency, user_latency}`

#### `daw.plugin_latency.get_user_override`
Get manual latency override.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{processor_id, user_latency, has_override}`

#### `daw.plugin_latency.set_user_override`
Set manual latency override.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
| samples | int64 | yes | — | Latency in samples |
**Returns:** `{success, processor_id, user_latency}`

#### `daw.plugin_latency.clear_override`
Clear manual latency override.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{success, processor_id, signal_latency, effective_latency}`

#### `daw.plugin_latency.get_signal_latency`
Total signal latency of a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, signal_latency}`

#### `daw.plugin_latency.get_chain_latency`
Per-processor latency chain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, chain: [{index, id, name, type, signal_latency, effective_latency, user_latency, cumulative_latency}], processor_count, total_chain_latency, route_signal_latency}`

---

## Send Pre/Post

Source: `dawflow_commands_routing_ext.cc` (commands 1-8)

#### `daw.send.get_pre_fader`
Check if a send is pre-fader. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, pre_fader}`.

#### `daw.send.set_pre_fader`
Set send pre/post fader. Params: `track_id`, `send_index`, `pre_fader`. Returns: `{status, pre_fader}`.

#### `daw.send.get_target`
Get internal send target route. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, target_id, target_name}`.

#### `daw.send.get_all_details`
Get all sends with details. Params: `track_id`. Returns: `{track_id, sends: [{index, name, id, enabled, role, level_db, pre_fader, target_id?, target_name?}], count}`.

#### `daw.send.create_aux`
Create an aux send to a bus. Params: `track_id`, `bus_id`, `pre_fader` (default: true). Returns: `{status, track_id, bus_id, pre_fader}`.

#### `daw.send.get_level_db`
Get send level in dB. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, level_db}`.

#### `daw.send.set_level_db`
Set send level in dB. Params: `track_id`, `send_index`, `level_db`. Returns: `{status, level_db}`.

#### `daw.send.get_pan`
Get send panner info. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, has_panner, panner_linked?}`.

---

## Aux Bus Management

Source: `dawflow_commands_routing_ext.cc` (commands 9-16)

#### `daw.aux.create_bus`
Create an aux bus. Params: `name`, `channels` (default: 2). Returns: `{status, bus_id, name, channels}`.

#### `daw.aux.delete_bus`
Delete an aux bus. Params: `bus_id`. Returns: `{status}`.

#### `daw.aux.list_buses`
List all buses. Returns: `{buses: [{id, name, inputs, outputs, muted, soloed}], count}`.

#### `daw.aux.get_sends_to`
Get all sends targeting a bus. Params: `bus_id`. Returns: `{bus_id, bus_name, senders: [{track_id, track_name, send_index, send_id, level_db, enabled}], count}`.

#### `daw.aux.add_send_from`
Add a send from a track to a bus. Params: `bus_id`, `track_id`, `pre_fader` (default: true). Returns: `{status, bus_id, track_id}`.

#### `daw.aux.remove_send_from`
Remove a send from a track to a bus. Params: `bus_id`, `track_id`. Returns: `{status}`.

#### `daw.aux.get_bus_info`
Get detailed bus info. Params: `bus_id`. Returns: `{id, name, inputs, outputs, muted, soloed, gain_db, sends, send_count, plugin_count}`.

#### `daw.aux.set_bus_gain`
Set bus gain. Params: `bus_id`, `gain_db`. Returns: `{status, gain_db}`.

---

## MIDI Clock

Source: `dawflow_commands_routing_ext.cc` (commands 17-22)

#### `daw.midi_clock.get_enabled`
Returns: `{enabled}`.

#### `daw.midi_clock.set_enabled`
Params: `enabled`. Returns: `{status, enabled}`.

#### `daw.midi_clock.get_port`
Returns: `{port_name, pretty_name, connected}`.

#### `daw.midi_clock.set_port`
Params: `port_name`. Returns: `{status, note, port_name}`.

#### `daw.midi_clock.get_state`
Returns: `{enabled, sets_tempo, resolution, port_name, port_connected}`.

#### `daw.midi_clock.is_synced`
Returns: `{synced, master_type?, master_name?, locked?}`.

---

## MTC

Source: `dawflow_commands_routing_ext.cc` (commands 23-28)

#### `daw.mtc.get_enabled`
Returns: `{enabled}`.

#### `daw.mtc.set_enabled`
Params: `enabled`. Returns: `{status, enabled}`.

#### `daw.mtc.get_port`
Returns: `{port_name, pretty_name, connected}`.

#### `daw.mtc.set_port`
Params: `port_name`. Returns: `{status, note, port_name}`.

#### `daw.mtc.get_state`
Returns: `{enabled, port_name, port_connected}`.

#### `daw.mtc.get_offset`
Returns: `{enabled, timecode_offset, timecode_offset_negative}`.

---

## LTC

Source: `dawflow_commands_routing_ext.cc` (commands 29-36)

#### `daw.ltc.get_send_enabled` / `daw.ltc.set_send_enabled`
Get/set LTC send. Returns/Params: `{enabled}`.

#### `daw.ltc.get_volume` / `daw.ltc.set_volume`
Get/set LTC output volume. Returns: `{volume, volume_db}`. Params: `volume`.

#### `daw.ltc.get_port` / `daw.ltc.set_port`
Get/set LTC output port. Returns: `{port_name}`. Params: `port_name`.

#### `daw.ltc.get_state`
Returns: `{enabled, volume, volume_db, port_name, port_connected}`.

#### `daw.ltc.get_generator_state`
Returns: `{enabled, port_name, port_exists, port_connected, volume, running}`.

---

## Direct Outputs

Source: `dawflow_commands_routing_ext.cc` (commands 37-43)

#### `daw.direct_out.get`
Get direct output info. Params: `track_id`. Returns: `{track_id, has_direct_out, connections: [{port, connected}]}`.

#### `daw.direct_out.enable` / `daw.direct_out.disable`
Enable/disable direct outputs. Params: `track_id`. Returns: `{status}`.

#### `daw.direct_out.is_enabled`
Params: `track_id`. Returns: `{track_id, exists, enabled}`.

#### `daw.direct_out.set_pre_fader`
Params: `track_id`, `pre_fader`. Returns: `{status, track_id, pre_fader, note}`.

#### `daw.direct_out.get_connection`
Params: `track_id`. Returns: `{track_id, connections}`.

#### `daw.direct_out.set_connection`
Params: `track_id`, `port_name`. Returns: `{status, port_name}`.

---

## Solo Isolate / Safe

Source: `dawflow_commands_routing_ext.cc` (commands 44-51)

#### `daw.solo_isolate.get` / `daw.solo_isolate.set` / `daw.solo_isolate.toggle`
Get/set/toggle solo isolate. Params: `track_id`, `isolated` (for set). Returns: `{track_id, isolated}` or `{status, isolated}`.

#### `daw.solo_isolate.get_all`
Returns: `{tracks: [{id, name, isolated}], count}`.

#### `daw.solo_safe.get` / `daw.solo_safe.set` / `daw.solo_safe.toggle`
Get/set/toggle solo safe. Params: `track_id`, `safe` (for set). Returns: `{track_id, safe}` or `{status, safe}`.

#### `daw.solo_safe.get_all`
Returns: `{tracks: [{id, name, safe}], count}`.

---

## Track Templates

Source: `dawflow_commands_routing_ext.cc` (commands 52-59)

#### `daw.track_template.list`
Returns: `{templates: [{name, path}], count}`.

#### `daw.track_template.save`
Params: `track_id`, `name`, `description` (optional). Returns: `{status, name, path}`.

#### `daw.track_template.load`
Params: `template_name`. Returns: `{status, track_id, track_name}`.

#### `daw.track_template.delete`
Params: `template_name`. Returns: `{status, deleted}`.

#### `daw.track_template.rename`
Params: `old_name`, `new_name`. Returns: `{status, old_name, new_name, new_path}`.

#### `daw.track_template.get_info`
Params: `template_name`. Returns: `{name, path, description, modified_with}`.

#### `daw.track_template.get_path`
Params: `template_name`. Returns: `{name, path}`.

#### `daw.track_template.list_with_details`
Returns: `{templates: [{name, path, description, modified_with}], count}`.

---

## Loop / Range Editing

Source: `dawflow_commands_routing_ext.cc` (commands 60-67)

#### `daw.range.get_active`
Returns: `{loop_start?, loop_end?, loop_enabled?, punch_start?, punch_end?, session_start?, session_end?}`.

#### `daw.range.set`
Create a range marker. Params: `start`, `end`. Returns: `{status, name, start, end}`.

#### `daw.range.play`
Play a range. Params: `start` (optional), `end` (optional). Falls back to loop range. Returns: `{status}`.

#### `daw.range.export`
Export a range (stub). Params: `start`, `end`, `format` (default: "wav"). Returns: `{status, start, end, format, note}`.

#### `daw.range.bounce`
Bounce a range to a new region. Params: `track_id`, `start`, `end`. Returns: `{status, region_name?, region_id?}`.

#### `daw.range.select`
Set selection range (uses loop location). Params: `start`, `end`. Returns: `{status, start, end}`.

#### `daw.range.get_selection`
Returns: `{has_selection, start?, end?, length?}`.

#### `daw.range.clear_selection`
Disable loop. Returns: `{status}`.

---

## Internal Routing

Source: `dawflow_commands_routing_ext.cc` (commands 68-75)

#### `daw.internal_send.add`
Params: `source_track_id`, `dest_track_id`, `pre_fader` (default: true). Returns: `{status, source_track_id, dest_track_id, pre_fader}`.

#### `daw.internal_send.remove`
Params: `source_track_id`, `send_id`. Returns: `{status}`.

#### `daw.internal_send.list`
Params: `track_id`. Returns: `{track_id, internal_sends: [{index, id, name, active, target_id, target_name, level_db, role, pre_fader}], count}`.

#### `daw.internal_send.get_target`
Params: `track_id`, `send_id`. Returns: `{status, target_id, target_name}`.

#### `daw.internal_send.set_level`
Params: `track_id`, `send_id`, `level_db`. Returns: `{status, level_db}`.

#### `daw.internal_send.set_enable`
Params: `track_id`, `send_id`, `enabled`. Returns: `{status, enabled}`.

#### `daw.internal_send.get_latency`
Params: `track_id`, `send_id`. Returns: `{status, delay_in, delay_out, signal_latency}`.

#### `daw.internal_send.get_all_routes`
Returns: `{connections: [{source_id, source_name, send_id, send_index, target_id, target_name, active, role, level_db}], count}`.

---

## Auto-Connect

Source: `dawflow_commands_routing_ext.cc` (commands 76-81)

#### `daw.auto_connect.get_input_policy` / `daw.auto_connect.set_input_policy`
Get/set input auto-connect policy. Params: `policy` ("manual", "physical", "master"). Returns: `{policy, policy_name}`.

#### `daw.auto_connect.get_output_policy` / `daw.auto_connect.set_output_policy`
Get/set output auto-connect policy. Same params/returns as input.

#### `daw.auto_connect.trigger_reconnect`
Trigger the auto-connect thread. Returns: `{status, note}`.

#### `daw.auto_connect.get_state`
Returns: `{input_policy, output_policy, input_policy_name, output_policy_name}`.

---

## Click Track

Source: `dawflow_commands_routing_ext.cc` (commands 82-88)

#### `daw.click.get_emphasis_gain` / `daw.click.set_emphasis_gain`
Get/set click emphasis gain. Params: `gain_db`. Returns: `{gain, gain_db, use_emphasis}`.

#### `daw.click.get_regular_gain` / `daw.click.set_regular_gain`
Get/set regular click gain. Params: `gain_db`. Returns: `{gain, gain_db}`.

#### `daw.click.get_record_only` / `daw.click.set_record_only`
Get/set click record-only mode. Params: `record_only`. Returns: `{record_only}`.

#### `daw.click.get_full_state`
Returns: `{gain, gain_db, record_only, use_emphasis, emphasis_sound, session_click_gain?, session_click_gain_db?}`.

---

## Routing Ext Bonus

Source: `dawflow_commands_routing_ext.cc` (commands 89-96)

#### `daw.send.set_pan`
Set send pan. Params: `track_id`, `send_index`, `pan`. Returns: `{status, send_index, pan, note}`.

#### `daw.aux.set_bus_mute`
Mute/unmute aux bus. Params: `bus_id`, `mute`. Returns: `{status, mute}`.

#### `daw.aux.set_bus_solo`
Solo/unsolo aux bus. Params: `bus_id`, `solo`. Returns: `{status, solo}`.

#### `daw.internal_send.set_pan`
Set internal send pan. Params: `track_id`, `send_id`, `pan`. Returns: `{status, pan}`.

#### `daw.ltc.set_send_continuously`
Enable continuous LTC send. Params: `enabled`. Returns: `{status, enabled, note}`.

#### `daw.midi_clock.set_tempo_from_clock`
Toggle midi clock sets tempo. Params: `enabled`. Returns: `{status, enabled}`.

#### `daw.midi_clock.get_resolution`
Get MIDI clock resolution. Returns: `{resolution}`.

#### `daw.click.set_emphasis_enabled`
Enable/disable click emphasis. Params: `enabled`. Returns: `{status, enabled}`.

---

## Command Metadata & Validation

Source: `dawflow_commands_safety.cc` (commands 1-10)

#### `daw.validate_params`
Check if a command exists.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name to validate |
**Returns:** `{valid, command_exists, method, error?}`

#### `daw.get_command_info`
Return info about a command.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, exists, category, is_destructive}`

#### `daw.get_command_schema`
Return JSON description of expected params.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, schema, note?}`

#### `daw.is_command_destructive`
Check if a command is destructive.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, destructive}`

#### `daw.get_destructive_commands`
List all destructive commands.
**Returns:** `{commands, count}`

#### `daw.get_read_only_commands`
List all non-destructive commands.
**Returns:** `{commands, count}`

#### `daw.get_command_categories`
Categorize all commands by namespace prefix.
**Returns:** `{categories: [{name, count, commands}]}`

#### `daw.get_command_help`
Return human-readable description for a command.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, description}`

#### `daw.get_api_stats`
Return overall API statistics.
**Returns:** `{total_commands, destructive_count, read_only_count, categories_count, source_files}`

#### `daw.search_commands`
Search command names by substring.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | yes | — | Search substring |
**Returns:** `{query, matches, count}`

---

## Transactional Execution

Source: `dawflow_commands_safety.cc` (commands 11-20)

#### `daw.begin_transaction`
Begin a reversible command group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Transaction name (undo label) |
**Returns:** `{ok, transaction_name}`

#### `daw.commit_transaction`
Commit the current reversible command group.
**Returns:** `{ok}`

#### `daw.rollback_transaction`
Abort and undo the current transaction.
**Returns:** `{ok}`

#### `daw.execute_atomic`
Execute multiple commands as a single undo group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Undo group label |
| commands | array | yes | — | Array of {method, params} objects |
**Returns:** `{ok, results: [{method, result}], undo_label}`

#### `daw.execute_with_undo`
Execute a single command wrapped in an undo group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command to execute |
| params | object | yes | — | Command parameters |
| undo_label | string | yes | — | Undo label |
**Returns:** Command result + `{undo_label}`

#### `daw.get_transaction_status`
Check if we're in a transaction.
**Returns:** `{in_transaction, transaction_name}`

#### `daw.get_pending_changes_count`
Check dirty state and undo depth.
**Returns:** `{dirty, undo_depth}`

#### `daw.checkpoint`
Save session + create snapshot with auto name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | no | auto-timestamped | Checkpoint name |
**Returns:** `{ok, checkpoint_name, timestamp}`

#### `daw.restore_checkpoint`
Restore a named snapshot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| checkpoint_name | string | yes | — | Checkpoint name |
**Returns:** `{ok, restored}`

#### `daw.get_checkpoints`
List all snapshots as checkpoints.
**Returns:** `{checkpoints: [{name, timestamp}], count}`

---

## Invariant Checks & Guards

Source: `dawflow_commands_safety.cc` (commands 21-35)

#### `daw.can_modify_track`
Check if track can be modified.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{track_id, can_modify, reasons}`

#### `daw.can_delete_track`
Check if track can be deleted.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{track_id, can_delete, reasons, warnings}`

#### `daw.can_modify_region`
Check if a region can be modified.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
**Returns:** `{track_id, region_id, can_modify, reasons}`

#### `daw.can_modify_session`
Check if the session can be modified.
**Returns:** `{can_modify, reasons}`

#### `daw.check_session_health`
Run diagnostic checks on session.
**Returns:** `{healthy, issues: [{severity, category, description}]}`

#### `daw.check_route_health`
Diagnostic checks on a single route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, name, healthy, processor_count, issues: [{severity, category, description}]}`

#### `daw.get_session_locks`
Return all lock states in the session.
**Returns:** `{recording_tracks, frozen_tracks, locked_regions, exporting}`

#### `daw.get_modification_constraints`
What can't be modified right now and why.
**Returns:** `{constraints: [{object_type, object_id, reason}], count}`

#### `daw.is_session_busy`
Check if session is busy with an activity.
**Returns:** `{busy, activities}`

#### `daw.get_recording_state_detailed`
Detailed recording state.
**Returns:** `{recording, armed_tracks: [{id, name}], armed_count, capture_in_progress}`

#### `daw.is_export_in_progress`
Check export state.
**Returns:** `{exporting}`

#### `daw.get_frozen_tracks`
List all frozen tracks.
**Returns:** `{frozen_tracks: [{id, name, freeze_state, freeze_state_name}], count}`

#### `daw.get_locked_regions`
List all locked/position-locked regions.
**Returns:** `{locked_regions: [{id, name, track_id, track_name, locked, position_locked, position_samples, length_samples}], count}`

#### `daw.get_hidden_routes`
List all hidden routes.
**Returns:** `{hidden_routes: [{id, name, is_master, is_monitor, is_auditioner}], count}`

#### `daw.validate_routing_integrity`
Check for feedback loops and disconnected paths.
**Returns:** `{valid, feedback_detected, issues: [{severity, category, description}], routes_checked}`

---

## Simulate: Region

Source: `dawflow_commands_simulate.cc` (commands 1-15)

All simulation commands return a standard prediction envelope:
```json
{
  "safe": true/false,
  "warnings": [...],
  "impacts": {...},
  "affected_objects": [{type, id, name, change}, ...],
  "reversible": true/false,
  "estimated_disk_impact_bytes": 0,
  "estimated_latency_change_samples": 0
}
```

#### `daw.simulate.move_region`
Predict outcome of moving a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| new_position | int64 | yes | — | New position in samples |
**Impacts:** `old_position`, `new_position`, `region_length`. Checks overlaps, session end.

#### `daw.simulate.trim_region`
Predict outcome of trimming a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| new_start | int64 | no | current start | New start in samples |
| new_end | int64 | no | current end | New end in samples |
**Impacts:** old/new start/end/length. Checks source boundaries, gaps, overlaps.

#### `daw.simulate.split_region`
Predict outcome of splitting a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| split_position | int64 | yes | — | Split point in samples |
**Impacts:** left/right region names, starts, lengths.

#### `daw.simulate.delete_regions`
Predict outcome of deleting regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_ids | string[] | yes | — | Array of region IDs |
**Impacts:** `regions_deleted`. Checks orphaned sources.

#### `daw.simulate.duplicate_region`
Predict outcome of duplicating a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| count | int | no | 1 | Number of duplicates |
| gap | int64 | no | 0 | Gap between duplicates (samples) |
**Impacts:** `duplicates`, `gap_samples`, `stride`. Checks overlaps.

#### `daw.simulate.stretch_region`
Predict outcome of time-stretching a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| new_length | int64 | yes | — | New length in samples |
**Impacts:** old/new length, stretch_ratio, quality_note. Estimates disk impact.

#### `daw.simulate.move_region_to_track`
Predict outcome of moving a region to another track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| source_track_id | string | yes | — | Source track |
| dest_track_id | string | yes | — | Destination track |
**Impacts:** source/dest track names, channel counts. Checks channel compatibility, overlaps.

#### `daw.simulate.consolidate_regions`
Predict outcome of consolidating regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_ids | string[] | yes | — | Array of region IDs to merge |
**Impacts:** merged start/end/length, regions_consumed. Estimates disk impact.

#### `daw.simulate.normalize_region`
Predict outcome of normalizing a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| target_db | double | no | 0.0 | Target level in dB |
**Impacts:** current_scale_db, target_db, gain_change_db. Warns on clipping.

#### `daw.simulate.reverse_region`
Predict outcome of reversing a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
**Impacts:** new_source_file, region_length, channels. Estimates disk impact.

#### `daw.simulate.fade_region`
Predict outcome of applying fades to a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| fade_in_length | int64 | no | 0 | Fade-in length (samples) |
| fade_out_length | int64 | no | 0 | Fade-out length (samples) |
**Impacts:** fade_in/out_length, region_length. Checks combined fade vs region length, neighbor overlaps.

#### `daw.simulate.set_region_gain`
Predict outcome of changing region gain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| gain_db | double | yes | — | Gain change in dB |
**Impacts:** current_scale_db, gain_change_db, estimated_peak_db. Warns on clipping.

#### `daw.simulate.quantize_regions`
Predict outcome of quantizing regions on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| grid_type | string | no | "beat" | Grid type for quantization |
**Impacts:** grid_type, regions_affected, total_regions.

#### `daw.simulate.align_regions`
Predict outcome of aligning all regions to a reference position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| reference_position | int64 | yes | — | Reference position (samples) |
**Impacts:** reference_position, regions_affected.

#### `daw.simulate.remove_region_gaps`
Predict outcome of removing gaps between regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Impacts:** gaps_found, total_gap_samples, total_gap_seconds.

---

## Simulate: Track

Source: `dawflow_commands_simulate.cc` (commands 16-25)

#### `daw.simulate.delete_tracks`
Params: `track_ids` (string[]). Checks master/monitor, counts regions/plugins/incoming sends. Sets `reversible: false`.

#### `daw.simulate.freeze_track`
Params: `track_id`. Estimates disk impact and CPU savings.

#### `daw.simulate.add_track`
Params: `type` (default: "audio"), `channels`. Predicts name, order, ports.

#### `daw.simulate.duplicate_track`
Params: `track_id`, `with_playlist` (default: true). Estimates disk usage.

#### `daw.simulate.change_track_channels`
Params: `track_id`, `new_channel_count`. Checks plugin compatibility, panner changes.

#### `daw.simulate.reorder_tracks`
Params: `track_id`, `new_position`. Reports current/new position.

#### `daw.simulate.add_plugin_to_track`
Params: `track_id`, `plugin_id` (optional). Reports current latency and plugin count.

#### `daw.simulate.remove_plugin_from_track`
Params: `track_id`, `processor_id`. Reports latency reduction.

#### `daw.simulate.set_track_monitoring`
Params: `track_id`, `monitoring_mode`. Reports signal flow description.

#### `daw.simulate.arm_track_for_record`
Params: `track_id`, `duration_seconds` (default: 60.0). Checks available disk space.

---

## Simulate: Routing

Source: `dawflow_commands_simulate.cc` (commands 26-35)

#### `daw.simulate.connect_ports`
Params: `source_port`, `dest_port`. Checks existing connection, warns about feedback.

#### `daw.simulate.disconnect_ports`
Params: `source_port`, `dest_port`. Checks if only connection (signal loss).

#### `daw.simulate.add_send`
Params: `track_id`, `dest_track_id`. Checks channel compatibility, feedback loops.

#### `daw.simulate.remove_send`
Params: `track_id`, `send_index`. Reports destination signal loss.

#### `daw.simulate.change_routing`
Params: `track_id`, `new_input` (optional), `new_output` (optional). Reports current I/O.

#### `daw.simulate.set_io_configuration`
Params: `track_id`, `inputs` (optional), `outputs` (optional). Warns on port count changes.

#### `daw.simulate.add_bus`
Params: `name` (default: "Bus"), `channels` (default: 2). Predicts name.

#### `daw.simulate.remove_bus`
Params: `bus_id`. Checks master/monitor, finds orphaned sends. Sets `reversible: false`.

#### `daw.simulate.reconnect_defaults`
Params: `track_id`. Reports connections that would change.

#### `daw.simulate.swap_plugin_order`
Params: `track_id`, `proc_id_a`, `proc_id_b`. Checks channel compatibility after swap.

---

## Simulate: Export

Source: `dawflow_commands_simulate.cc` (commands 36-45)

#### `daw.simulate.export_session`
Params: `format` (default: "wav"), `sample_rate`, `bit_depth` (default: 24). Estimates file size.

#### `daw.simulate.export_stems`
Params: `format` (default: "wav"). Lists all stems with estimated sizes.

#### `daw.simulate.export_range`
Params: `start`, `end`, `format` (default: "wav"). Estimates file size.

#### `daw.simulate.bounce_range`
Params: `track_id`, `start`, `end`. Estimates file size.

#### `daw.simulate.bounce_track`
Params: `track_id`. Estimates file size, processing time.

#### `daw.simulate.export_midi`
Params: `track_id`. Estimates note count, file size.

#### `daw.simulate.render_offline`
Params: `start` (default: 0), `end` (default: session end). Estimates render time.

#### `daw.simulate.export_with_plugins`
Params: `track_id`. Lists all plugins in chain with latencies.

#### `daw.simulate.export_channel_config`
Params: `channels` (default: master bus channels). Reports channel layout.

#### `daw.simulate.normalize_export`
Params: `target_lufs` (default: -14.0). Warns on high LUFS targets.

---

## Simulate: Session

Source: `dawflow_commands_simulate.cc` (commands 46-60)

#### `daw.simulate.cleanup_unused`
No params. Lists unused sources, estimates space freed. Sets `reversible: false`.

#### `daw.simulate.tempo_change`
Params: `new_tempo`, `position` (default: 0). Reports current tempo, affected regions.

#### `daw.simulate.time_signature_change`
Params: `numerator`, `denominator`, `position` (default: 0). Reports grid changes.

#### `daw.simulate.save_session_as`
Params: `name`, `copy_media` (default: true). Estimates disk impact.

#### `daw.simulate.delete_playlists`
Params: `playlist_names` (string[]). Reports orphaned regions. Sets `reversible: false`.

#### `daw.simulate.clear_playlist`
Params: `track_id`. Lists all regions that would be removed.

#### `daw.simulate.import_audio`
Params: `file_path`, `channels` (default: 2), `sample_rate`. Checks sample rate conversion.

#### `daw.simulate.change_sample_rate`
Params: `new_rate`. Reports files to rewrite, estimated time. Sets `safe: false`, `reversible: false`.

#### `daw.simulate.change_buffer_size`
Params: `new_size`. Reports latency in ms. Warns on extreme sizes.

#### `daw.simulate.close_session`
No params. Checks unsaved changes, rolling transport. Sets `reversible: false`.

#### `daw.simulate.undo_steps`
Params: `count`. Reports available steps, operation labels.

#### `daw.simulate.redo_steps`
Params: `count`. Reports available steps, next redo label.

#### `daw.simulate.snapshot_restore`
Params: `snapshot_name`. Checks existence, unsaved changes. Sets `reversible: false`.

#### `daw.simulate.batch_operation`
Params: `operations` (array of {method, params}). Aggregates results from sub-simulations.

#### `daw.simulate.session_merge`
Params: `other_session_path` (optional). Stub for future implementation.

---

## Simulate: Additional

Source: `dawflow_commands_simulate.cc` (commands 61-65)

#### `daw.simulate.mute_tracks`
Params: `track_ids` (string[]), `mute` (default: true). Reports current/new mute state.

#### `daw.simulate.solo_tracks`
Params: `track_ids` (string[]), `solo` (default: true). Reports tracks muted by solo.

#### `daw.simulate.set_track_gain`
Params: `track_id`, `gain_db`. Reports current/new gain, warns on high levels.

#### `daw.simulate.set_track_pan`
Params: `track_id`, `pan_position` (0.0-1.0). Reports position description, output channels.

#### `daw.simulate.set_session_tempo_map`
No params. Reports all affected audio/MIDI regions. Sets `safe: false`.

---

# DAWFLOW IPC API Reference — New Commands (2026-03-19)

Five new source files adding **325 IPC command handlers** across editor operations, session metadata, route groups, panner system, mixer scenes, step sequencer, MIDI patch management, analysis/DSP, temporal/tempo map, automation, MIDI sequence editing, control protocols, offline processing, AAF, and audio file utilities.

**Source files:**
- `engine/libs/ardour/dawflow_commands_editor.cc` — 77 commands
- `engine/libs/ardour/dawflow_commands_metadata.cc` — 115 commands
- `engine/libs/ardour/dawflow_commands_creative.cc` — 56 commands
- `engine/libs/ardour/dawflow_commands_temporal.cc` — 60 commands
- `engine/libs/ardour/dawflow_commands_surfaces.cc` — 17 commands

---

## Table of Contents

1. [Editor: Region Audio Processing](#a-editor-region-audio-processing-20-commands)
2. [Editor: Selection & Navigation](#b-editor-selection--navigation-9-commands)
3. [Editor: Clipboard Operations](#c-editor-clipboard-operations-5-commands)
4. [Editor: Zoom & View Control](#d-editor-zoom--view-control-11-commands)
5. [Editor: Playback Shortcuts](#e-editor-playback-shortcuts-6-commands)
6. [Editor: Markers & Locations](#f-editor-markers--locations-7-commands)
7. [Editor: Playlist & Track Operations](#g-editor-playlist--track-operations-7-commands)
8. [Editor: Time Editing](#h-editor-time-editing-6-commands)
9. [Editor: Edit Mode & Grid](#i-editor-edit-mode--grid-6-commands)
10. [Session Metadata](#j-session-metadata-50-commands)
11. [Route Groups](#k-route-groups-38-commands)
12. [Panner System](#l-panner-system-20-commands)
13. [Mixer Scenes](#m-mixer-scenes-7-commands)
14. [Step Sequencer](#n-step-sequencer-23-commands)
15. [MIDI Patch Manager](#o-midi-patch-manager-13-commands)
16. [Analysis & DSP](#p-analysis--dsp-20-commands)
17. [Tempo Deep Control](#q-tempo-deep-control-35-commands)
18. [Automation Deep Control](#r-automation-deep-control-13-commands)
19. [MIDI Sequence Manipulation](#s-midi-sequence-manipulation-8-commands)
20. [Temporal Extras](#t-temporal-extras-4-commands)
21. [Control Protocols & Surfaces](#u-control-protocols--surfaces-6-commands)
22. [Audiographer Offline Processing](#v-audiographer-offline-processing-6-commands)
23. [AAF Import/Export](#w-aaf-importexport-3-commands)
24. [Audio File Utilities](#x-audio-file-utilities-2-commands)

---

## A. Editor: Region Audio Processing (20 commands)

Source: `dawflow_commands_editor.cc`

#### `daw.editor.reverse_region`
Reverse audio in a region. Creates a new reversed region via the Reverse filter.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to reverse |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if the reverse operation succeeded |
| `region_id` | string | UUID of the original region |
| `new_region_id` | string | UUID of the newly created reversed region |

---

#### `daw.editor.normalize_region`
Normalize an audio region to a target peak dB level.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `target_db` | float | No | `-1.0` | Target peak level in dB |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `peak_db` | float | Original peak amplitude in dB before normalization |

---

#### `daw.editor.strip_region_silence`
Strip silence from a region. **Stub** — requires a silence analysis pass first.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region |
| `threshold_db` | float | No | `-60.0` | Silence threshold in dB |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always false (stub) |
| `error` | string | Instructions to use `daw.analysis.find_silence` first |
| `region_id` | string | UUID of the original region |
| `regions_created` | int | Always 0 (stub) |

---

#### `daw.editor.bounce_region`
Bounce a single region to new audio on its track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track containing the region |
| `region_id` | string | Yes | — | UUID of the region to bounce |
| `name` | string | No | `"bounced"` | Name for the new bounced region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if bounce succeeded |
| `new_region_id` | string | UUID of the new bounced region |

---

#### `daw.editor.combine_regions`
Combine multiple regions into one compound region. **Stub** — requires Editor GUI access.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_ids` | string[] | Yes | — | Array of region UUIDs to combine |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always false (requires editor) |
| `error` | string | Explanation that this is a GUI operation |

---

#### `daw.editor.split_multichannel_region`
Split a stereo/multichannel region into mono regions. **Stub** — requires Editor GUI access.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the multichannel audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | False (requires editor), or false if already mono |
| `error` | string | Explanation |
| `channel_count` | int | Number of channels in the region |

---

#### `daw.editor.adjust_region_gain`
Adjust an audio region's gain by a dB amount (relative adjustment applied to scale amplitude).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `gain_db` | float | Yes | — | Gain adjustment in dB (positive = louder, negative = quieter) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `new_gain_db` | float | Resulting absolute gain in dB |

---

#### `daw.editor.reset_region_gain`
Reset an audio region's gain to 0 dB (unity, scale amplitude = 1.0).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.crop_region_to`
Crop a region to exact start/end sample positions.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region |
| `start` | int64 | Yes | — | New start position (sample offset) |
| `end` | int64 | Yes | — | New end position (sample offset). Must be > start |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.set_region_fade_in`
Set the fade-in shape and length for an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `shape` | string | No | `"linear"` | Fade shape. Valid: `"linear"`, `"fast"`, `"slow"`, `"constant_power"`, `"symmetric"` |
| `length_samples` | int64 | Yes | — | Fade-in length in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.set_region_fade_out`
Set the fade-out shape and length for an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `shape` | string | No | `"linear"` | Fade shape. Valid: `"linear"`, `"fast"`, `"slow"`, `"constant_power"`, `"symmetric"` |
| `length_samples` | int64 | Yes | — | Fade-out length in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.set_region_fade_in_active`
Enable or disable the fade-in on an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `active` | bool | Yes | — | True to enable fade-in, false to disable |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.set_region_fade_out_active`
Enable or disable the fade-out on an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `active` | bool | Yes | — | True to enable fade-out, false to disable |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.set_region_envelope_active`
Enable or disable the volume envelope on an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `active` | bool | Yes | — | True to enable envelope, false to disable |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.get_region_loudness`
Get loudness metrics for an audio region (peak, RMS, LUFS approximation).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `integrated_lufs` | float | Integrated loudness in LUFS (RMS-based approximation) |
| `momentary_lufs` | float | Momentary loudness in LUFS (approximation) |
| `true_peak_dbtp` | float | True peak level in dBTP |
| `rms_db` | float | RMS level in dB |

---

#### `daw.editor.get_region_peak`
Get peak amplitude of an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `peak_db` | float | Peak amplitude in dB |
| `peak_sample` | int | Always 0 (sample-accurate position not available from this API) |

---

#### `daw.editor.time_stretch_region`
Time-stretch a region by a ratio. Creates a new region via RubberBand.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to stretch |
| `ratio` | float | Yes | — | Time stretch ratio (2.0 = double length, 0.5 = half length) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if stretch succeeded |
| `new_region_id` | string | UUID of the new stretched region |

---

#### `daw.editor.pitch_shift_region`
Pitch-shift a region by semitones. Creates a new region via the Pitch filter.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to pitch-shift |
| `semitones` | float | Yes | — | Pitch shift in semitones (positive = up, negative = down) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if pitch shift succeeded |
| `new_region_id` | string | UUID of the new pitch-shifted region |

---

#### `daw.editor.set_region_fade_before_fx`
Set whether fades are applied before or after region-level effects processing.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `before_fx` | bool | Yes | — | True to apply fades before FX, false for after |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.set_default_fade_in`
Reset the fade-in of an audio region to default settings.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

## B. Editor: Selection & Navigation (9 commands)

#### `daw.editor.select_all_regions_in_track`
Get the count of all regions in a track's playlist. Note: actual GUI selection requires editor access.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `count` | int | Number of regions in the track's playlist |
| `note` | string | Indicates GUI selection requires editor |

---

#### `daw.editor.deselect_all`
Deselect all objects. **Stub** — selection is a GUI concept.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | Always false (requires editor) |
| `error` | string | Explanation |

---

#### `daw.editor.get_selection_extents`
Get time extents of current selection. Returns session range as a proxy.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if session range exists |
| `start_samples` | int64 | Start position (sample offset) |
| `end_samples` | int64 | End position (sample offset) |
| `start_bbt` | string | Start as BBT string |
| `end_bbt` | string | End as BBT string |
| `note` | string | Indicates this returns session range as proxy |

---

#### `daw.editor.select_range`
Set a time range selection. Uses session extents as proxy.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start` | int64 | Yes | — | Start position (sample offset) |
| `end` | int64 | Yes | — | End position (sample offset) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `note` | string | Indicates session extents were set as proxy |

---

#### `daw.editor.set_edit_point`
Set the playhead/edit cursor position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | — | Position in samples |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.get_edit_point`
Get the current playhead/transport position.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `position_samples` | int64 | Current playhead position (sample offset) |

---

#### `daw.editor.find_next_region_boundary`
Find the next region start/end boundary on a track from a given position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |
| `position` | int64 | Yes | — | Search start position (sample offset) |
| `direction` | int | No | `1` | Search direction: 1 = forward, -1 = backward |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `boundary_position` | int64 | Position of the found boundary (sample offset) |

---

#### `daw.editor.nudge_region`
Nudge a region by a sample distance forward or backward.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to nudge |
| `distance_samples` | int64 | Yes | — | Distance to nudge in samples |
| `forward` | bool | No | `true` | True = nudge forward, false = nudge backward |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `new_position` | int64 | New position of the region (sample offset) |

---

#### `daw.editor.snap_position_to_grid`
Snap a position to the nearest beat (uses tempo map rounding as proxy for grid snap).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | — | Position to snap (sample offset) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `snapped_position` | int64 | Snapped position (sample offset) |

---

## C. Editor: Clipboard Operations (5 commands)

#### `daw.editor.cut_region`
Cut a region by removing it from its playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to cut |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.copy_region`
Copy a region. Returns the region's properties for use with paste/duplicate. The clipboard is a GUI concept; this captures region data.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to copy |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `region_id` | string | UUID of the region |
| `region_name` | string | Name of the region |
| `position` | int64 | Region position (sample offset) |
| `length` | int64 | Region length in samples |
| `note` | string | Instructions to paste with `daw.editor.duplicate_region` |

---

#### `daw.editor.delete_region`
Delete a region from its playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to delete |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

#### `daw.editor.duplicate_region`
Duplicate a region N times, placing copies immediately after the original.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to duplicate |
| `times` | int | No | `1` | Number of times to duplicate |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `new_region_ids` | string[] | Array of new region UUIDs (may be empty) |
| `note` | string | Confirmation of duplication count |

---

#### `daw.editor.duplicate_range`
Duplicate a time range on a track's playlist N times.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |
| `start` | int64 | Yes | — | Range start (sample offset) |
| `end` | int64 | Yes | — | Range end (sample offset) |
| `times` | int | No | `1` | Number of times to duplicate |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |

---

## D. Editor: Zoom & View Control (11 commands)

All zoom/view commands are **Editor-only stubs** that return `ok: false`. They exist as placeholders for the React UI to implement directly.

#### `daw.editor.set_zoom_level`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `samples_per_pixel` | float | Yes | — | Zoom level |

#### `daw.editor.get_zoom_level`
*No parameters.*

#### `daw.editor.zoom_to_region`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region |

Returns `region_start` and `region_length` even though `ok` is false.

#### `daw.editor.zoom_to_session`
*No parameters.*

#### `daw.editor.scroll_to_position`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | — | Position (sample offset) |

#### `daw.editor.get_visible_range`
*No parameters.*

#### `daw.editor.center_on_playhead`
*No parameters.*

#### `daw.editor.set_track_height`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |
| `height_pixels` | int | Yes | — | Height in pixels |

#### `daw.editor.get_track_height`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

#### `daw.editor.hide_track`
Hide a track from view (sets presentation info hidden flag). **Functional.**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

**Returns:** `ok: true`

#### `daw.editor.show_track`
Show a previously hidden track. **Functional.**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

**Returns:** `ok: true`

---

## E. Editor: Playback Shortcuts (6 commands)

#### `daw.editor.play_selection`
Play the session range (proxy for "play selection").

*No parameters.*

**Returns:** `ok: true`

---

#### `daw.editor.play_from_edit_point`
Play from the current playhead position.

*No parameters.*

**Returns:** `ok: true`

---

#### `daw.editor.play_from_start`
Play from the beginning of the session (locates to sample 0, then rolls).

*No parameters.*

**Returns:** `ok: true`

---

#### `daw.editor.play_region`
Audition a specific region through the auditioner.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region to audition |

**Returns:** `ok: true`

---

#### `daw.editor.rec_with_preroll`
Start recording with preroll from the current playhead position.

*No parameters.*

**Returns:** `ok: true`

---

#### `daw.editor.rec_with_count_in`
Start recording with a count-in.

*No parameters.*

**Returns:** `ok: true`

---

## F. Editor: Markers & Locations (7 commands)

#### `daw.editor.add_marker_at_playhead`
Add a marker at the current playhead position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | `"Marker"` | Marker name |
| `flags` | string | No | `""` | Marker type flags: `"cd"`, `"cue"`, or `"scene"` |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `location_id` | string | UUID of the new location/marker |

---

#### `daw.editor.set_loop_from_region`
Set the loop range to match a region's position and length.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region |

**Returns:** `ok: true`

---

#### `daw.editor.set_punch_from_region`
Set the punch range to match a region's position and length.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region |

**Returns:** `ok: true`

---

#### `daw.editor.set_session_start_from_playhead`
Set the session start to the current playhead position.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if session range exists and was updated |

---

#### `daw.editor.set_session_end_from_playhead`
Set the session end to the current playhead position.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if session range exists and was updated |

---

#### `daw.editor.add_tempo_at_position`
Add a tempo change at a specific sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | — | Position (sample offset) |
| `bpm` | float | Yes | — | Tempo in beats per minute |
| `note_type` | int | No | `4` | Note type (4 = quarter note, 8 = eighth note, etc.) |

**Returns:** `ok: true`

---

#### `daw.editor.add_meter_at_position`
Add a meter (time signature) change at a specific sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | — | Position (sample offset) |
| `numerator` | int | Yes | — | Time signature numerator (e.g., 4) |
| `denominator` | int | Yes | — | Time signature denominator (e.g., 4) |

**Returns:** `ok: true`

---

## G. Editor: Playlist & Track Operations (7 commands)

#### `daw.editor.clear_playlist`
Clear all regions from a track's playlist.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

**Returns:** `ok: true`

---

#### `daw.editor.new_playlist_for_track`
Create a new empty playlist for a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `playlist_id` | string | UUID of the new playlist |

---

#### `daw.editor.copy_playlist_for_track`
Copy the current playlist for a track (creates a duplicate playlist).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `playlist_id` | string | UUID of the new copied playlist |

---

#### `daw.editor.tag_region`
Add tags to a region (stored as semicolon-separated string).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region |
| `tags` | string[] | Yes | — | Array of tag strings |

**Returns:** `ok: true`

---

#### `daw.editor.region_fill_selection`
Fill a time range on a track by repeating the first region found at the start position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |
| `start` | int64 | Yes | — | Fill range start (sample offset) |
| `end` | int64 | Yes | — | Fill range end (sample offset) |

**Returns:** `ok: true`

---

#### `daw.editor.group_regions`
Group selected regions. **Stub** — requires Editor GUI access.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_ids` | string[] | Yes | — | Array of region UUIDs |

**Returns:** `ok: false` (requires editor)

---

#### `daw.editor.ungroup_regions`
Ungroup regions. **Stub** — requires Editor GUI access.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_ids` | string[] | Yes | — | Array of region UUIDs |

**Returns:** `ok: false` (requires editor)

---

## H. Editor: Time Editing (6 commands)

#### `daw.editor.insert_time`
Insert empty time at a position (shifts all content after the position).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position` | int64 | Yes | — | Insert point (sample offset) |
| `duration` | int64 | Yes | — | Amount of time to insert in samples |

**Returns:** `ok: true`

---

#### `daw.editor.remove_time`
Remove a time range, shifting subsequent content backward.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start` | int64 | Yes | — | Range start (sample offset) |
| `end` | int64 | Yes | — | Range end (sample offset) |

**Returns:** `ok: true`

---

#### `daw.editor.remove_gaps`
Remove silence gaps between regions on a track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |
| `threshold_samples` | int64 | No | `1` | Minimum gap size in samples to remove |
| `leave_gap_samples` | int64 | No | `0` | Amount of gap to leave between regions |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `gaps_removed` | int | Number of gaps that were removed |

---

#### `daw.editor.sequence_regions`
Close all gaps between regions on a track (make regions contiguous).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track |

**Returns:** `ok: true`

---

#### `daw.editor.freeze_track`
Freeze a track to audio (renders all processing to a single audio file).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the track to freeze |

**Returns:** `ok: true`

---

#### `daw.editor.unfreeze_track`
Unfreeze a previously frozen track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the frozen track |

**Returns:** `ok: true`

---

## I. Editor: Edit Mode & Grid (6 commands)

#### `daw.editor.set_edit_mode`
Set the edit mode.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | string | Yes | — | Valid: `"slide"`, `"lock"`, `"ripple"`, `"ripple_all"` |

**Returns:** `ok: true`

---

#### `daw.editor.get_edit_mode`
Get the current edit mode.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `mode` | string | Current mode: `"slide"`, `"lock"`, `"ripple"`, or `"ripple_all"` |

---

#### `daw.editor.set_snap_mode`
Set snap mode. **Stub** — snap mode is a GUI concept.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | string | Yes | — | Snap mode name |

**Returns:** `ok: false` (requires editor)

---

#### `daw.editor.get_snap_mode`
Get current snap mode. **Stub**.

*No parameters.*

**Returns:** `ok: false` (requires editor)

---

#### `daw.editor.set_grid_type`
Set grid type. **Stub** — grid type is a GUI concept.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | Yes | — | Grid type name |

**Returns:** `ok: false` (requires editor)

---

#### `daw.editor.get_grid_type`
Get current grid type. **Stub**.

*No parameters.*

**Returns:** `ok: false` (requires editor)

---

## J. Session Metadata (50 commands)

Source: `dawflow_commands_metadata.cc`

25 get/set pairs for session metadata fields. All setters require a `value` parameter. All getters return the field value with `ok: true`.

### String Fields (18 pairs = 36 commands)

Each pair follows the same pattern:

**Getter:** `daw.session.get_{field}` — No parameters. Returns `{field}: string`.
**Setter:** `daw.session.set_{field}` — Requires `value: string`. Returns `ok: true`.

| Field | Getter Command | Setter Command |
|-------|---------------|----------------|
| `title` | `daw.session.get_title` | `daw.session.set_title` |
| `subtitle` | `daw.session.get_subtitle` | `daw.session.set_subtitle` |
| `artist` | `daw.session.get_artist` | `daw.session.set_artist` |
| `album_artist` | `daw.session.get_album_artist` | `daw.session.set_album_artist` |
| `album` | `daw.session.get_album` | `daw.session.set_album` |
| `composer` | `daw.session.get_composer` | `daw.session.set_composer` |
| `arranger` | `daw.session.get_arranger` | `daw.session.set_arranger` |
| `lyricist` | `daw.session.get_lyricist` | `daw.session.set_lyricist` |
| `conductor` | `daw.session.get_conductor` | `daw.session.set_conductor` |
| `remixer` | `daw.session.get_remixer` | `daw.session.set_remixer` |
| `engineer` | `daw.session.get_engineer` | `daw.session.set_engineer` |
| `producer` | `daw.session.get_producer` | `daw.session.set_producer` |
| `mixer` | `daw.session.get_mixer` | `daw.session.set_mixer` |
| `dj_mixer` | `daw.session.get_dj_mixer` | `daw.session.set_dj_mixer` |
| `genre` | `daw.session.get_genre` | `daw.session.set_genre` |
| `copyright` | `daw.session.get_copyright` | `daw.session.set_copyright` |
| `isrc` | `daw.session.get_isrc` | `daw.session.set_isrc` |
| `description` | `daw.session.get_description` | `daw.session.set_description` |
| `comment` | `daw.session.get_comment` | `daw.session.set_comment` |
| `barcode` | `daw.session.get_barcode` | `daw.session.set_barcode` |

### Integer Fields (uint32_t) (5 pairs = 10 commands)

**Getter:** Returns `{field}: int`. **Setter:** Requires `value: int`.

| Field | Getter Command | Setter Command |
|-------|---------------|----------------|
| `year` | `daw.session.get_year` | `daw.session.set_year` |
| `track_number` | `daw.session.get_track_number` | `daw.session.set_track_number` |
| `total_tracks` | `daw.session.get_total_tracks` | `daw.session.set_total_tracks` |
| `disc_number` | `daw.session.get_disc_number` | `daw.session.set_disc_number` |
| `total_discs` | `daw.session.get_total_discs` | `daw.session.set_total_discs` |

### Example Setter

#### `daw.session.set_title`
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | string | Yes | — | The title to set |

**Returns:** `ok: true`

### Example Getter

#### `daw.session.get_title`
*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `title` | string | Current session title |

---

## K. Route Groups (38 commands)

Source: `dawflow_commands_metadata.cc`

#### `daw.route_group.list`
List all route groups with full metadata.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `groups` | array | Array of group objects |

Each group object:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID of the group |
| `name` | string | Group name |
| `active` | bool | Whether the group is active |
| `relative` | bool | Whether gain changes are relative |
| `hidden` | bool | Whether the group is hidden |
| `gain` | bool | Whether gain is linked |
| `mute` | bool | Whether mute is linked |
| `solo` | bool | Whether solo is linked |
| `recenable` | bool | Whether record-enable is linked |
| `select` | bool | Whether selection is linked |
| `color` | bool | Whether color is linked |
| `monitoring` | bool | Whether monitoring is linked |
| `member_count` | int | Number of routes in the group |
| `rgba` | string | Color as RRGGBBAA hex string (e.g., `"FF0000FF"`) |

---

#### `daw.route_group.create`
Create a new route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Name for the new group |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `group_id` | string | UUID of the new group |

---

#### `daw.route_group.delete`
Delete a route group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group to delete |

**Returns:** `ok: true`

---

#### `daw.route_group.add_route`
Add a route to a group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |
| `track_id` | string | Yes | — | UUID of the route to add |

**Returns:** `ok: true`

---

#### `daw.route_group.remove_route`
Remove a route from a group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |
| `track_id` | string | Yes | — | UUID of the route to remove |

**Returns:** `ok: true`

---

#### `daw.route_group.clear`
Remove all members from a group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |

**Returns:** `ok: true`

---

#### `daw.route_group.get_members`
List all members of a group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `members` | array | Array of `{id, name}` objects |

---

### Route Group Boolean Properties (12 pairs = 24 commands)

Each property has a getter (`daw.route_group.get_{prop}`) and setter (`daw.route_group.set_{prop}`).

**All getters** require `group_id: string`, return `{ok: true, value: bool}`.
**All setters** require `group_id: string` and `value: bool`, return `{ok: true}`.

| Property | Getter | Setter |
|----------|--------|--------|
| `active` | `daw.route_group.get_active` | `daw.route_group.set_active` |
| `relative` | `daw.route_group.get_relative` | `daw.route_group.set_relative` |
| `hidden` | `daw.route_group.get_hidden` | `daw.route_group.set_hidden` |
| `gain` | `daw.route_group.get_gain` | `daw.route_group.set_gain` |
| `mute` | `daw.route_group.get_mute` | `daw.route_group.set_mute` |
| `solo` | `daw.route_group.get_solo` | `daw.route_group.set_solo` |
| `recenable` | `daw.route_group.get_recenable` | `daw.route_group.set_recenable` |
| `select` | `daw.route_group.get_select` | `daw.route_group.set_select` |
| `color` | `daw.route_group.get_color` | `daw.route_group.set_color` |
| `monitoring` | `daw.route_group.get_monitoring` | `daw.route_group.set_monitoring` |
| `route_active` | `daw.route_group.get_route_active` | `daw.route_group.set_route_active` |
| `sursend_enable` | `daw.route_group.get_sursend_enable` | `daw.route_group.set_sursend_enable` |

---

#### `daw.route_group.set_rgba`
Set the RGBA color of a group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |
| `color` | string | Yes | — | RRGGBBAA hex string (e.g., `"FF0000FF"` for red with full alpha) |

**Returns:** `ok: true`

---

#### `daw.route_group.get_rgba`
Get the RGBA color of a group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `color` | string | RRGGBBAA hex string |

---

#### `daw.route_group.make_subgroup`
Create a subgroup bus for the group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |
| `pre_fader` | bool | Yes | — | True for pre-fader, false for post-fader |

**Returns:** `ok: true`

---

#### `daw.route_group.destroy_subgroup`
Destroy the subgroup bus for a group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |

**Returns:** `ok: true`

---

#### `daw.route_group.has_subgroup`
Check if a subgroup bus exists for the group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `has_subgroup` | bool | Whether a subgroup bus exists |

---

#### `daw.route_group.assign_vca`
Assign a VCA master to the group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |
| `vca_id` | string | Yes | — | Name of the VCA to assign |

**Returns:** `ok: true`

---

#### `daw.route_group.unassign_vca`
Unassign a VCA master from the group.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `group_id` | string | Yes | — | UUID of the group |
| `vca_id` | string | Yes | — | Name of the VCA to unassign |

**Returns:** `ok: true`

---

## L. Panner System (20 commands)

Source: `dawflow_commands_metadata.cc`

#### `daw.panner.get_position`
Get panner position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `position` | float | 0.0 = left, 0.5 = center, 1.0 = right |

---

#### `daw.panner.set_position`
Set panner position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `position` | float | Yes | — | 0.0 = left, 0.5 = center, 1.0 = right |

**Returns:** `ok: true`

---

#### `daw.panner.get_width`
Get panner stereo width.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`, `width: float` (range -1.0 to 1.0)

---

#### `daw.panner.set_width`
Set panner stereo width.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `width` | float | Yes | — | Width value (-1.0 to 1.0) |

**Returns:** `ok: true`

---

#### `daw.panner.get_elevation` / `daw.panner.set_elevation`
Get/set panner elevation (for 3D/surround panners).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `elevation` | float | Yes (set) | — | Elevation value |

---

#### `daw.panner.get_bypassed` / `daw.panner.set_bypassed`
Get/set panner bypass state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `bypassed` | bool | Yes (set) | — | True to bypass panner |

---

#### `daw.panner.reset`
Reset panner to default position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`

---

#### `daw.panner.get_current_uri`
Get the current panner plugin URI.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`, `uri: string`

---

#### `daw.panner.select_by_uri`
Select a panner plugin by URI.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `uri` | string | Yes | — | Panner plugin URI |

**Returns:** `ok: bool` (true if selected successfully)

---

#### `daw.panner.get_available_panners`
List all available panner plugins.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `panners` | array | Array of `{uri: string, name: string}` objects |

---

#### `daw.panner.get_linked_to_route` / `daw.panner.set_linked_to_route`
Check/set whether send panner is linked to route panner.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `linked` | bool | Yes (set) | — | True to link |

---

#### `daw.panner.get_position_range`
Get valid position range for the panner.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`, `min: float`, `max: float`

---

#### `daw.panner.get_width_range`
Get valid width range for the panner.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`, `min: float`, `max: float`

---

#### `daw.panner.set_automation_state`
Set pan automation state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `state` | string | Yes | — | Valid: `"off"`, `"play"`, `"write"`, `"touch"`, `"latch"` |

**Returns:** `ok: true`

---

#### `daw.panner.get_automation_state`
Get pan automation state.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`, `state: string`

---

#### `daw.panner.start_touch`
Begin touch automation for panning (marks the start of a touch gesture at the current transport position).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`

---

#### `daw.panner.stop_touch`
End touch automation for panning.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |

**Returns:** `ok: true`

---

## M. Mixer Scenes (7 commands)

Source: `dawflow_commands_metadata.cc`

#### `daw.mixer_scene.snapshot`
Capture the current mixer state to a scene slot.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `index` | int | Yes | — | Scene slot index (0-based) |

**Returns:** `ok: true`

---

#### `daw.mixer_scene.apply`
Restore a saved mixer scene.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `index` | int | Yes | — | Scene slot index (0-based) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if scene was applied successfully; false if empty |

---

#### `daw.mixer_scene.clear`
Clear a saved mixer scene.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `index` | int | Yes | — | Scene slot index |

**Returns:** `ok: true`

---

#### `daw.mixer_scene.is_empty`
Check if a mixer scene slot is empty.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `index` | int | Yes | — | Scene slot index |

**Returns:** `ok: true`, `empty: bool`

---

#### `daw.mixer_scene.get_name`
Get the name of a mixer scene.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `index` | int | Yes | — | Scene slot index |

**Returns:** `ok: true`, `name: string`

---

#### `daw.mixer_scene.set_name`
Set the name of a mixer scene (creates the scene if it does not exist).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `index` | int | Yes | — | Scene slot index |
| `name` | string | Yes | — | Name for the scene |

**Returns:** `ok: true`

---

#### `daw.mixer_scene.list`
List all mixer scenes.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `scenes` | array | Array of `{index: int, name: string, empty: bool}` objects |

---

## N. Step Sequencer (23 commands)

Source: `dawflow_commands_creative.cc`

All step sequencer commands require `HAVE_BEATBOX` to be defined at build time. Without it, all return `ok: false` with an error message. Even with `HAVE_BEATBOX`, these are currently **stubs** pending route-based sequencer instance lookup.

#### `daw.step_sequencer.set_step_size`
Set the step size in beats.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `beats` | float | Yes | — | Step size in beats |

---

#### `daw.step_sequencer.set_start_step`
Set the start step index.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `step` | int | Yes | — | Start step index (0-based) |

---

#### `daw.step_sequencer.set_end_step`
Set the end step index.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `step` | int | Yes | — | End step index (0-based) |

---

#### `daw.step_sequencer.sync`
Reset all sequences to start step.

*No parameters.*

---

#### `daw.step_sequencer.reset`
Full reset of step sequencer state.

*No parameters.*

---

#### `daw.step_sequencer.write_to_source`
Export step sequencer pattern to a MIDI source.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | `""` | Name for the exported source |

**Returns:** `ok`, `source_path: string`

---

#### `daw.step_sequence.set_root`
Set root note for a sequence.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `root_note` | int | Yes | — | MIDI note number (0-127) |

---

#### `daw.step_sequence.set_channel`
Set MIDI channel for a sequence.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `channel` | int | Yes | — | MIDI channel (0-15) |

---

#### `daw.step_sequence.shift_left`
Shift sequence steps left.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `steps` | int | No | `1` | Number of steps to shift |

---

#### `daw.step_sequence.shift_right`
Shift sequence steps right.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `steps` | int | No | `1` | Number of steps to shift |

---

#### `daw.step_sequence.reset`
Reset a single sequence.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |

---

#### `daw.step.set_note`
Set note number and velocity for a step.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `note` | int | Yes | — | MIDI note number (0-127) |
| `velocity` | float | No | `0.5` | Velocity (0.0-1.0, normalized) |

---

#### `daw.step.set_velocity`
Set velocity for a step.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `velocity` | float | Yes | — | Velocity (0.0-1.0, normalized) |

---

#### `daw.step.set_duration`
Set step duration as a rational (numerator/denominator).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `numerator` | int | Yes | — | Duration numerator |
| `denominator` | int | Yes | — | Duration denominator |

---

#### `daw.step.set_enabled`
Enable or disable a step.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `enabled` | bool | Yes | — | True to enable, false to disable |

---

#### `daw.step.set_skipped`
Mark a step as skipped.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `skipped` | bool | Yes | — | True to skip, false to unskip |

---

#### `daw.step.set_repeat`
Set repeat count for a step.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `repeats` | int | Yes | — | Number of repeats |

---

#### `daw.step.set_octave_shift`
Set octave shift for a step.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `octave` | int | Yes | — | Octave shift (positive = up, negative = down) |

---

#### `daw.step.adjust_velocity`
Adjust step velocity by delta.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `delta` | int | Yes | — | Velocity adjustment (can be negative) |

---

#### `daw.step.adjust_pitch`
Adjust step pitch by semitones.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `semitones` | int | Yes | — | Pitch adjustment in semitones |

---

#### `daw.step.adjust_octave`
Adjust step octave by delta.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `delta` | int | Yes | — | Octave adjustment (can be negative) |

---

#### `daw.step.set_chord`
Set a chord (multiple notes) on a step.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `notes` | array | Yes | — | Array of MIDI note numbers |

---

#### `daw.step.set_parameter`
Set a parameter value on a step.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sequence` | int | Yes | — | Sequence index |
| `step` | int | Yes | — | Step index |
| `param` | int | Yes | — | Parameter index |
| `value` | float | Yes | — | Parameter value |

---

## O. MIDI Patch Manager (13 commands)

Source: `dawflow_commands_creative.cc`

#### `daw.midi_patches.get_all_models`
List all known MIDI device models.

*No parameters.*

**Returns:** `ok: true`, `models: string[]`

---

#### `daw.midi_patches.get_devices_by_manufacturer`
Group MIDI devices by manufacturer.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `manufacturers` | array | Array of `{name: string, devices: string[]}` |

---

#### `daw.midi_patches.get_patches`
Get patches for a model/mode/channel.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | string | Yes | — | Device model name |
| `mode` | string | Yes | — | Mode name |
| `channel` | int | Yes | — | MIDI channel (0-15) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `patches` | array | Array of `{bank: int, program: int, name: string}` |

---

#### `daw.midi_patches.find_patch`
Find a specific patch by bank/program.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | string | Yes | — | Device model name |
| `mode` | string | Yes | — | Mode name |
| `channel` | int | Yes | — | MIDI channel (0-15) |
| `bank` | int | Yes | — | Bank number |
| `program` | int | Yes | — | Program number |

**Returns:** `ok: bool`, `name: string`

---

#### `daw.midi_patches.next_patch`
Get the next patch after the given bank/program.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | string | Yes | — | Device model name |
| `mode` | string | Yes | — | Mode name |
| `channel` | int | Yes | — | MIDI channel |
| `bank` | int | Yes | — | Current bank |
| `program` | int | Yes | — | Current program |

**Returns:** `ok: bool`, `bank: int`, `program: int`, `name: string`

---

#### `daw.midi_patches.previous_patch`
Get the previous patch before the given bank/program. Same params/returns as `next_patch`.

---

#### `daw.midi_patches.get_note_name`
Get the MIDI note name for a bank/program/channel/note combination.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bank` | int | Yes | — | Bank number |
| `program` | int | Yes | — | Program number |
| `channel` | int | Yes | — | MIDI channel |
| `note` | int | Yes | — | MIDI note number (0-127) |
| `track_id` | string | No | `""` | UUID of a MIDI track for instrument-aware lookup |

**Returns:** `ok: true`, `name: string`

---

#### `daw.midi_patches.get_patch_name`
Get the patch name for a bank/program/channel combination.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bank` | int | Yes | — | Bank number |
| `program` | int | Yes | — | Program number |
| `channel` | int | Yes | — | MIDI channel |
| `track_id` | string | No | `""` | UUID of a MIDI track for instrument-aware lookup |

**Returns:** `ok: true`, `name: string`

---

#### `daw.midi_patches.get_controller_name`
Get the MIDI controller name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `param_type` | int | Yes | — | Evoral parameter type ID |
| `channel` | int | Yes | — | MIDI channel |
| `controller` | int | Yes | — | Controller number |
| `track_id` | string | No | `""` | UUID of a MIDI track for instrument-aware lookup |

**Returns:** `ok: true`, `name: string`

---

#### `daw.midi_patches.add_custom_midnam`
Add a custom MIDNAM document.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | Yes | — | Unique ID for the MIDNAM document |
| `xml_content` | string | Yes | — | XML content of the MIDNAM document |

**Returns:** `ok: bool`

---

#### `daw.midi_patches.remove_custom_midnam`
Remove a custom MIDNAM document.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | Yes | — | ID of the MIDNAM document to remove |

**Returns:** `ok: bool`

---

#### `daw.midi_patches.is_custom_model`
Check if a model is a custom MIDNAM model.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | string | Yes | — | Model name |

**Returns:** `ok: true`, `is_custom: bool`

---

#### `daw.midi_patches.get_instrument_info`
Get instrument info for a MIDI track.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the MIDI track |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if track is a MIDI track |
| `model` | string | Instrument model name |
| `mode` | string | Instrument mode |
| `master_controller_count` | int | Number of master controllers |

---

## P. Analysis & DSP (20 commands)

Source: `dawflow_commands_creative.cc`

#### `daw.analyze.queue_source`
Queue a source for background analysis.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_id` | string | Yes | — | UUID of the source |
| `force` | bool | No | `false` | Force re-analysis even if already analyzed |

**Returns:** `ok: true`

---

#### `daw.analyze.flush`
Wait for all queued analysis to complete (blocks until done).

*No parameters.*

**Returns:** `ok: true`

---

#### `daw.analyze.detect_onsets`
Detect onsets in an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `threshold` | float | No | `0.3` | Peak threshold for onset detection |
| `function_type` | int | No | `0` | Onset detection function type |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `onsets` | int64[] | Array of onset positions (sample offsets) |

---

#### `daw.analyze.detect_transients`
Detect transients in an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `threshold` | float | No | `0.0` | Detection threshold (0.0 = use default) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `transients` | int64[] | Array of transient positions (sample offsets) |

---

#### `daw.analyze.stereo_correlation`
Compute Pearson stereo correlation coefficient for an audio region. Requires a stereo (2+ channel) region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the stereo audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `correlation` | float | Pearson correlation (-1.0 to 1.0; 1.0 = mono, 0.0 = uncorrelated, -1.0 = inverted) |

---

#### `daw.filter.reverse`
Reverse an audio region. Creates a new region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:** `ok: bool`, `new_region_id: string`

---

#### `daw.filter.strip_silence`
Strip silence from an audio region. Scans for silence at the given threshold and removes silent segments.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `threshold_db` | float | Yes | — | Silence threshold in dB |
| `min_length_samples` | int64 | Yes | — | Minimum silence length to strip (samples) |

**Returns:** `ok: bool`, `result_regions: int`

---

#### `daw.filter.quantize_midi`
Quantize MIDI notes in a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |
| `start_grid_beats` | float | Yes | — | Quantize grid size for note starts (in beats, e.g., 0.25 = sixteenth notes) |
| `end_grid_beats` | float | No | `0.0` | Grid size for note ends (0 = same as start_grid) |
| `strength` | float | No | `1.0` | Quantize strength (0.0-1.0; 1.0 = full quantize) |
| `swing` | float | No | `0.0` | Swing amount (0.0-1.0) |

**Returns:** `ok: true`

---

#### `daw.filter.legatize_midi`
Legatize (extend) MIDI notes so each note's end reaches the next note's start.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |

**Returns:** `ok: true`

---

#### `daw.filter.transpose_midi`
Transpose all MIDI notes in a region by semitones.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |
| `semitones` | int | Yes | — | Number of semitones to transpose (positive = up, negative = down) |

**Returns:** `ok: true`

---

#### `daw.convolver.load_impulse`
Load an impulse response file into a convolver (validates the file is loadable).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | File path to the impulse response audio file |
| `in_channel` | int | No | `0` | Input channel index |
| `out_channel` | int | No | `0` | Output channel index |

**Returns:** `ok: bool`

---

#### `daw.convolver.clear_impulse`
Clear loaded impulse response data. Returns a note that convolver state is per-plugin-instance.

*No parameters.*

**Returns:** `ok: true`, `note: string`

---

#### `daw.convolver.is_ready`
Check if a convolver is ready. Returns a note that convolver state is per-plugin-instance.

*No parameters.*

**Returns:** `ok: true`, `ready: false`, `note: string`

---

#### `daw.fluidsynth.load_sf2`
Load a SoundFont 2 file and report program count.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | File path to the .sf2 file |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True if loaded successfully |
| `program_count` | int | Number of programs in the SF2 |

---

#### `daw.fluidsynth.select_program`
Select a program on a channel. **Stub** — per-plugin-instance.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `program` | int | Yes | — | Program number |
| `channel` | int | Yes | — | MIDI channel |

**Returns:** `ok: false`

---

#### `daw.fluidsynth.get_program_count`
Get the number of programs. **Stub** — per-plugin-instance.

**Returns:** `ok: false`, `count: 0`

---

#### `daw.fluidsynth.get_program_name`
Get the name of a program. **Stub** — per-plugin-instance.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `index` | int | Yes | — | Program index |

**Returns:** `ok: false`, `name: ""`

---

#### `daw.fluidsynth.panic`
Send all-notes-off. **Stub** — use MIDI panic via transport commands.

**Returns:** `ok: false`

---

#### `daw.audio_file.get_info` (creative variant)
Get audio file metadata. Duplicate of the surfaces variant, registered in creative commands.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | File path to the audio file |

**Returns:** `ok: bool`, `sample_rate: int`, `channels: int`, `length_samples: int64`, `format: string`

---

#### `daw.audio_file.tag`
Write session metadata tags to an audio file.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | File path to the audio file |

**Returns:** `ok: bool`

---

## Q. Tempo Deep Control (35 commands)

Source: `dawflow_commands_temporal.cc`

### Tempo Map Navigation

#### `daw.tempo_map.get_tempo_at`
Get tempo at a sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position (sample offset) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `bpm` | float | Beats per minute |
| `note_type` | int | Note type (4 = quarter, 8 = eighth, etc.) |
| `ramped` | bool | Whether the tempo is ramped (accelerando/ritardando) |

---

#### `daw.tempo_map.get_meter_at`
Get meter (time signature) at a sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position (sample offset) |

**Returns:** `ok: true`, `numerator: int`, `denominator: int`

---

#### `daw.tempo_map.get_all_tempo_points`
List all tempo points in the map.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `points` | array | Array of `{position_samples, bpm, note_type, ramped, omega}` |

---

#### `daw.tempo_map.get_all_meter_points`
List all meter points in the map.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `points` | array | Array of `{position_samples, numerator, denominator}` |

---

#### `daw.tempo_map.clear_tempos_before`
Remove all non-initial tempo points before a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position cutoff (sample offset) |

**Returns:** `ok: bool`, `removed_count: int`

---

#### `daw.tempo_map.clear_tempos_after`
Remove all non-initial tempo points after a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position cutoff (sample offset) |

**Returns:** `ok: bool`, `removed_count: int`

---

#### `daw.tempo_map.previous_tempo`
Find the tempo point immediately before a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position (sample offset) |

**Returns:** `ok: bool`, `position_samples: int64`, `bpm: float` (ok=false if none found)

---

#### `daw.tempo_map.next_tempo`
Find the tempo point immediately after a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position (sample offset) |

**Returns:** `ok: bool`, `position_samples: int64`, `bpm: float` (ok=false if none found)

---

#### `daw.tempo_map.previous_meter` / `daw.tempo_map.next_meter`
Find the meter point before/after a position. Same pattern as previous/next_tempo.

**Returns:** `ok: bool`, `position_samples: int64`, `numerator: int`, `denominator: int`

---

#### `daw.tempo_map.max_tempo`
Get the maximum tempo in the map.

*No parameters.*

**Returns:** `ok: true`, `bpm: float`

---

#### `daw.tempo_map.min_tempo`
Get the minimum tempo in the map.

*No parameters.*

**Returns:** `ok: true`, `bpm: float`

---

#### `daw.tempo_map.midi_clock_beat_at_or_after`
Find the MIDI clock beat position at or after a given sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position (sample offset) |

**Returns:** `ok: true`, `beat_position_samples: int64`

---

### Time Conversions

#### `daw.tempo_map.samples_to_quarters`
Convert samples to quarter-note beats.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `samples` | int64 | Yes | — | Position in samples |

**Returns:** `ok: true`, `quarters: float`

---

#### `daw.tempo_map.quarters_to_samples`
Convert quarter-note beats to samples.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `quarters` | float | Yes | — | Position in quarter-note beats |

**Returns:** `ok: true`, `samples: int64`

---

#### `daw.tempo_map.samples_to_bbt`
Convert samples to BBT (bars, beats, ticks).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `samples` | int64 | Yes | — | Position in samples |

**Returns:** `ok: true`, `bars: int` (1-based), `beats: int` (1-based), `ticks: int` (0-1919)

---

#### `daw.tempo_map.bbt_to_samples`
Convert BBT to samples.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bars` | int | Yes | — | Bar number (1-based) |
| `beats` | int | Yes | — | Beat number (1-based) |
| `ticks` | int | Yes | — | Tick number (0-1919) |

**Returns:** `ok: true`, `samples: int64`

---

#### `daw.tempo_map.bbt_walk`
Walk from a BBT position by a BBT offset.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bars` | int | Yes | — | Start bar (1-based) |
| `beats` | int | Yes | — | Start beat (1-based) |
| `ticks` | int | Yes | — | Start tick (0-1919) |
| `offset_bars` | int | Yes | — | Offset bars (can be negative) |
| `offset_beats` | int | Yes | — | Offset beats |
| `offset_ticks` | int | Yes | — | Offset ticks |

**Returns:** `ok: true`, `result_bars: int`, `result_beats: int`, `result_ticks: int`

---

#### `daw.tempo_map.bbt_distance`
Compute BBT distance between two positions.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from_bars` | int | Yes | — | From bar (1-based) |
| `from_beats` | int | Yes | — | From beat |
| `from_ticks` | int | Yes | — | From tick |
| `to_bars` | int | Yes | — | To bar |
| `to_beats` | int | Yes | — | To beat |
| `to_ticks` | int | Yes | — | To tick |

**Returns:** `ok: true`, `bars: int`, `beats: int`, `ticks: int` (as BBT offset)

---

### Tempo Point Editing

#### `daw.tempo_point.set_bpm`
Change BPM of the tempo point at a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position of the tempo point |
| `bpm` | float | Yes | — | New BPM value |

**Returns:** `ok: true`

---

#### `daw.tempo_point.set_end_bpm`
Set end BPM for a ramped tempo point (creates a tempo ramp from start BPM to end BPM).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position of the tempo point |
| `end_bpm` | float | Yes | — | End BPM value |

**Returns:** `ok: true`

---

#### `daw.tempo_point.set_ramped`
Toggle ramped/constant mode on a tempo point.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position of the tempo point |
| `ramped` | bool | Yes | — | True for ramped (accelerando/ritardando), false for constant |

**Returns:** `ok: true`

---

#### `daw.tempo_point.remove`
Remove a tempo point. Cannot remove the initial tempo point.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position of the tempo point |

**Returns:** `ok: bool` (false if initial point)

---

### Beat Math

#### `daw.beats.round_to_beat`
Round a quarter-note value to the nearest whole beat.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `quarters` | float | Yes | — | Quarter-note position |

**Returns:** `ok: true`, `rounded: float`

---

#### `daw.beats.round_to_subdivision`
Round quarters to the nearest subdivision.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `quarters` | float | Yes | — | Quarter-note position |
| `subdivision` | int | Yes | — | Subdivisions per beat (e.g., 4 = sixteenth notes) |

**Returns:** `ok: true`, `rounded: float`

---

#### `daw.beats.round_to_bar`
Round quarters to the nearest bar boundary.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `quarters` | float | Yes | — | Quarter-note position |

**Returns:** `ok: true`, `rounded: float`

---

#### `daw.bbt.next_bar`
Get BBT of the next bar from a given BBT position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bars` | int | Yes | — | Bar (1-based) |
| `beats` | int | Yes | — | Beat (1-based) |
| `ticks` | int | Yes | — | Tick (0-1919) |

**Returns:** `ok: true`, `bars: int`, `beats: int`, `ticks: int`

---

#### `daw.bbt.prev_bar`
Get BBT of the previous bar. Same params/returns as `next_bar`.

---

#### `daw.bbt.is_bar`
Check if a BBT position is on a bar boundary.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bars` | int | Yes | — | Bar |
| `beats` | int | Yes | — | Beat |
| `ticks` | int | Yes | — | Tick |

**Returns:** `ok: true`, `is_bar: bool`

---

#### `daw.bbt.is_beat`
Check if a BBT position is on a beat boundary (ticks == 0).

Same params as `is_bar`.

**Returns:** `ok: true`, `is_beat: bool`

---

### Additional Tempo Map Queries

#### `daw.tempo_map.n_tempos`
Get number of tempo points in the map.

*No parameters.*

**Returns:** `ok: true`, `count: int`

---

#### `daw.tempo_map.n_meters`
Get number of meter points in the map.

*No parameters.*

**Returns:** `ok: true`, `count: int`

---

#### `daw.tempo_map.quarters_per_minute_at`
Get quarters per minute at a sample position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position (sample offset) |

**Returns:** `ok: true`, `qpm: float`

---

#### `daw.tempo_map.bbt_at_quarters`
Convert quarter-note beats to BBT.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `quarters` | float | Yes | — | Quarter-note position |

**Returns:** `ok: true`, `bars: int`, `beats: int`, `ticks: int`

---

#### `daw.tempo_map.quarters_at_bbt`
Convert BBT to quarter-note beats.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bars` | int | Yes | — | Bar (1-based) |
| `beats` | int | Yes | — | Beat (1-based) |
| `ticks` | int | Yes | — | Tick (0-1919) |

**Returns:** `ok: true`, `quarters: float`

---

## R. Automation Deep Control (13 commands)

Source: `dawflow_commands_temporal.cc`

Valid `param_type` values: `"gain"`, `"trim"`, `"pan_azimuth"` (or `"pan"`), `"pan_width"`, `"pan_elevation"`, `"mute"`, `"solo"`.

#### `daw.automation.thin`
Thin automation points by removing points that fall within a threshold of a linear interpolation.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `threshold` | float | Yes | — | Thinning threshold |

**Returns:** `ok: true`, `points_removed: int`

---

#### `daw.automation.cut_range`
Cut automation points in a time range (removes them, returns nothing).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `start` | int64 | Yes | — | Range start (sample offset) |
| `end` | int64 | Yes | — | Range end (sample offset) |

**Returns:** `ok: true`, `points_cut: int`

---

#### `daw.automation.copy_range`
Copy automation points from a time range as a JSON array.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `start` | int64 | Yes | — | Range start (sample offset) |
| `end` | int64 | Yes | — | Range end (sample offset) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `data` | array | Array of `{when: int64, value: float}` automation points |

---

#### `daw.automation.paste`
Paste automation points at a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `position` | int64 | Yes | — | Paste position (sample offset) |
| `data` | array | Yes | — | Array of `{when: int64, value: float}` points |

**Returns:** `ok: true`

---

#### `daw.automation.clear_range`
Clear automation points in a time range.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `start` | int64 | Yes | — | Range start (sample offset) |
| `end` | int64 | Yes | — | Range end (sample offset) |

**Returns:** `ok: true`, `points_removed: int`

---

#### `daw.automation.scale_time`
Scale the time axis of all automation points by a factor.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `factor` | float | Yes | — | Scale factor (2.0 = double time, 0.5 = half time) |

**Returns:** `ok: true`

---

#### `daw.automation.transform_values`
Apply a mathematical operation to all automation values.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `operation` | string | Yes | — | Operation: `"multiply"`, `"add"`, or `"set"` |
| `value` | float | Yes | — | Operand value |

**Returns:** `ok: true`

---

#### `daw.automation.shift_points`
Shift all automation points after a position by a sample distance.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `after_position` | int64 | Yes | — | Only shift points after this position (sample offset) |
| `distance` | int64 | Yes | — | Distance to shift in samples (positive = forward) |

**Returns:** `ok: true`

---

#### `daw.automation.truncate_start`
Remove all automation points before a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `position` | int64 | Yes | — | Cutoff position in samples |

**Returns:** `ok: true`

---

#### `daw.automation.truncate_end`
Remove all automation points after a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `position` | int64 | Yes | — | Cutoff position (sample offset) |

**Returns:** `ok: true`

---

#### `daw.automation.set_interpolation`
Set the interpolation style for an automation lane.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `style` | string | Yes | — | Valid: `"discrete"`, `"linear"`, `"curved"`, `"logarithmic"`, `"exponential"` |

**Returns:** `ok: true`

---

#### `daw.automation.get_interpolation`
Get the interpolation style for an automation lane.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |

**Returns:** `ok: true`, `style: string`

---

#### `daw.automation.has_event_at`
Check if an automation event exists at a specific position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `position` | int64 | Yes | — | Position (sample offset) |

**Returns:** `ok: true`, `exists: bool`

---

## S. MIDI Sequence Manipulation (8 commands)

Source: `dawflow_commands_temporal.cc`

#### `daw.midi_sequence.remove_overlapping_notes`
Remove overlapping notes in a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |

**Returns:** `ok: true`, `notes_removed: int`

---

#### `daw.midi_sequence.trim_overlapping_notes`
Trim overlapping notes (adjust lengths rather than removing).

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |

**Returns:** `ok: true`, `notes_trimmed: int`

---

#### `daw.midi_sequence.remove_duplicate_notes`
Remove exact duplicate notes from a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |

**Returns:** `ok: true`, `duplicates_removed: int`

---

#### `daw.midi_sequence.shift_all`
Shift all MIDI events in a region by an amount in beats.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |
| `amount_beats` | float | Yes | — | Amount to shift in beats (positive = later, negative = earlier) |

**Returns:** `ok: true`

---

#### `daw.midi_sequence.get_note_range`
Get the lowest and highest MIDI note numbers in a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `lowest` | int | Lowest MIDI note number (0-127; 0 if empty) |
| `highest` | int | Highest MIDI note number (0-127; 0 if empty) |

---

#### `daw.midi_sequence.get_channels_present`
List MIDI channels that have notes in a region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |

**Returns:** `ok: true`, `channels: int[]` (sorted array of channel numbers 0-15)

---

#### `daw.midi_sequence.set_notes`
Bulk replace all notes in a MIDI region. Removes all existing notes and adds new ones.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |
| `notes` | array | Yes | — | Array of note objects (see below) |

Each note object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `time_beats` | float | Yes | — | Note start time in beats |
| `length_beats` | float | Yes | — | Note length in beats |
| `note` | int | Yes | — | MIDI note number (0-127) |
| `velocity` | int | Yes | — | MIDI velocity (0-127) |
| `channel` | int | No | `0` | MIDI channel (0-15) |

**Returns:** `ok: true`

---

#### `daw.midi_sequence.get_note_count`
Get the number of notes in a MIDI region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the MIDI region |

**Returns:** `ok: true`, `count: int`

---

## T. Temporal Extras (4 commands)

Source: `dawflow_commands_temporal.cc`

#### `daw.tempo_map.metric_at`
Get combined tempo and meter information at a position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `position_samples` | int64 | Yes | — | Position (sample offset) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `bpm` | float | Tempo in BPM |
| `note_type` | int | Note type (4 = quarter) |
| `ramped` | bool | Whether tempo is ramped |
| `divisions_per_bar` | int | Meter numerator |
| `note_value` | int | Meter denominator |
| `superclocks_per_bar` | int64 | Bar duration in superclocks |

---

#### `daw.tempo_map.bbtwalk_to_quarters`
Walk from a quarter-note position by a BBT offset.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_quarters` | float | Yes | — | Start position in quarter-note beats |
| `offset_bars` | int | Yes | — | Offset bars |
| `offset_beats` | int | Yes | — | Offset beats |
| `offset_ticks` | int | Yes | — | Offset ticks |

**Returns:** `ok: true`, `quarters: float`

---

#### `daw.automation.get_points_in_range`
Get all automation points in a time range.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `start` | int64 | Yes | — | Range start (sample offset) |
| `end` | int64 | Yes | — | Range end (sample offset) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `points` | array | Array of `{when: int64, value: float}` |
| `count` | int | Number of points |

---

#### `daw.automation.get_value_at`
Get the interpolated automation value at a specific position.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `track_id` | string | Yes | — | UUID of the route |
| `param_type` | string | Yes | — | Automation parameter type |
| `position` | int64 | Yes | — | Position (sample offset) |

**Returns:** `ok: true`, `value: float`

---

## U. Control Protocols & Surfaces (6 commands)

Source: `dawflow_commands_surfaces.cc`

#### `daw.control_protocol.discover`
Scan for control protocols.

*No parameters.*

**Returns:** `ok: true`, `count: int` (number of known protocols after scan)

---

#### `daw.control_protocol.list_known`
Return list of all known control protocols.

*No parameters.*

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `protocols` | array | Array of `{name: string, active: bool, mandatory: bool}` |

---

#### `daw.control_protocol.activate`
Activate a control protocol by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Protocol name (e.g., "Generic MIDI", "Open Sound Control (OSC)") |

**Returns:** `ok: true`

---

#### `daw.control_protocol.deactivate`
Deactivate a control protocol by name.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Protocol name |

**Returns:** `ok: true`

---

#### `daw.control_protocol.probe_midi`
Scan MIDI ports for control surfaces.

*No parameters.*

**Returns:** `ok: true`

---

#### `daw.control_protocol.is_active`
Check if a specific control protocol is active.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Protocol name |

**Returns:** `ok: true`, `active: bool`

---

## V. Audiographer Offline Processing (6 commands)

Source: `dawflow_commands_surfaces.cc`

#### `daw.offline.normalize`
Normalize an audio region to a target dB level.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `target_db` | float | No | `0.0` | Target peak level in dB |
| `use_peak` | bool | No | `true` | Whether to use peak (always peak in current implementation) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True on success |
| `peak_before` | float | Peak amplitude (linear) before normalization |
| `peak_after` | float | Peak amplitude (linear) after normalization |

---

#### `daw.offline.reverse`
Reverse an audio region. Creates a new reversed region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the region |

**Returns:** `ok: true`, `new_region_id: string`

---

#### `daw.offline.strip_silence`
Strip silence from an audio region by scanning for silent intervals.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |
| `threshold_db` | float | No | `-60.0` | Silence threshold in dB |
| `min_length_ms` | float | No | `100.0` | Minimum silence length in milliseconds |

**Returns:** `ok: true`, `segments_found: int`

---

#### `daw.offline.get_peak`
Get peak level of an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `peak_linear` | float | Peak amplitude (linear, 0.0-1.0+) |
| `peak_db` | float | Peak amplitude in dB |

---

#### `daw.offline.get_rms`
Get RMS level of an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `rms_linear` | float | RMS amplitude (linear) |
| `rms_db` | float | RMS level in dB |

---

#### `daw.offline.get_loudness`
Get EBU R128 loudness of an audio region.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | Yes | — | UUID of the audio region |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | bool | True |
| `integrated_lufs` | float | Integrated loudness in LUFS |
| `true_peak_dbtp` | float | True peak in dBTP |
| `short_term_lufs` | float | Short-term loudness in LUFS |
| `momentary_lufs` | float | Momentary loudness in LUFS |

---

## W. AAF Import/Export (3 commands)

Source: `dawflow_commands_surfaces.cc`

All AAF commands are **stubs** pending libaaf integration.

#### `daw.aaf.import_session`
Import an AAF file into the session. **Stub** — requires GUI interaction.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | Path to the AAF file |
| `merge` | bool | No | `false` | Whether to merge into existing session |

**Returns:** `ok: false`, `tracks_imported: 0`, `regions_imported: 0`

---

#### `daw.aaf.check_available`
Check if AAF support is compiled in.

*No parameters.*

**Returns:** `ok: true`, `available: bool`

---

#### `daw.aaf.get_file_info`
Read AAF metadata without importing. **Stub**.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | Path to the AAF file |

**Returns:** `ok: false`, `track_count: 0`, `region_count: 0`, `sample_rate: 0`, `duration_samples: 0`

---

## X. Audio File Utilities (2 commands)

Source: `dawflow_commands_surfaces.cc`

Note: `daw.audio_file.get_info` was removed from this file (duplicate of handler in `dawflow_commands_creative.cc`).

#### `daw.audio_file.tag_metadata`
Write session metadata tags (title, artist, etc.) to an audio file.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | Path to the audio file |

**Returns:** `ok: true`

---

#### `daw.audio_file.get_format_name`
Get just the format name of an audio file.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | Path to the audio file |

**Returns:** `ok: true`, `format: string`
