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
