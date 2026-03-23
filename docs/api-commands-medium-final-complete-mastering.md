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
