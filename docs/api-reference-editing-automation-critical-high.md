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
