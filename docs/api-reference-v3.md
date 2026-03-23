# DAWFLOW IPC API Reference — V3 Commands

> **For AI Agents & React UI developers:** This document describes the EXACT parameters, types, formats, and return values for every IPC command. Follow these specifications precisely — incorrect parameter names, wrong types, or missing fields WILL cause errors.

## How IPC Works

```
React UI → POST http://localhost:19100/api/command
Body: {"method": "daw.xxx.yyy", "params": {...}}
Response: {"result": {...}} or {"error": {"message": "..."}}
```

All values are JSON. Strings are UTF-8. Numbers are JSON numbers (int64 or double). Booleans are `true`/`false`.

## Common Patterns

### IDs
All object IDs are **strings** containing Ardour's internal UUID format (e.g. `"3847"` or `"1234-5678"`). Never assume numeric — always pass as strings.

### Colors
Colors use **RRGGBBAA hex strings** (8 chars). Example: `"FF0000FF"` = red, `"50B050FF"` = green.
- When SENDING to engine: `"FF0000FF"` (string, no `#` prefix, always 8 chars with alpha)
- When RECEIVING from engine: same format `"FF0000FF"`
- To convert to CSS: take first 6 chars → `#FF0000`

### Positions / Times
- `position_samples` / `start` / `end`: **int64** (sample offset from session start at session sample rate)
- `position_beats` / `quarters`: **double** (quarter notes from session start)
- `bbt`: **object** `{bars: int, beats: int, ticks: int}` (bar 1 = first bar, beat 1 = first beat, ticks 0-1919)

### Gain / Volume
- Linear gain: **double** (0.0 = silence, 1.0 = unity/0dB, 2.0 = +6dB)
- dB gain: **double** (-inf to +6, typically -60 to +6)
- To convert: `dB = 20 * log10(linear)`, `linear = 10^(dB/20)`

### Automation State
String enum: `"off"` | `"play"` | `"write"` | `"touch"` | `"latch"`

### Fade Shapes
String enum: `"linear"` | `"fast"` | `"slow"` | `"constant_power"` | `"symmetric"`

### Edit Modes
String enum: `"slide"` | `"lock"` | `"ripple"` | `"ripple_all"`

### Snap Modes
String enum: `"snap_off"` | `"snap_normal"` | `"snap_magnetic"`

### Grid Types
String enum: `"no_grid"` | `"bar"` | `"beat"` | `"quarter"` | `"eighth"` | `"sixteenth"` | `"thirty_second"` | `"sixty_fourth"` | `"one_twenty_eighth"` | `"timecode"` | `"minsec"` | `"cdframe"`

---

## Category A: Editor Operations

### A1. Region Audio Processing

#### `daw.editor.reverse_region`
Reverse audio in a region (creates a new reversed region).
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| **Returns** | | | |
| `ok` | bool | | Success |
| `new_region_id` | string | | UUID of the new reversed region |

#### `daw.editor.normalize_region`
Normalize audio region to a target peak level.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | yes | | Region UUID |
| `target_db` | double | no | -1.0 | Target peak in dB (0.0 = full scale) |
| **Returns** | | | | |
| `ok` | bool | | | Success |
| `peak_before_db` | double | | | Peak level before normalization |

#### `daw.editor.strip_region_silence`
Remove silent sections from a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | yes | | Region UUID |
| `threshold_db` | double | no | -60.0 | Silence threshold in dB |
| `min_length_ms` | double | no | 100.0 | Minimum silence length in ms |
| **Returns** | | | | |
| `ok` | bool | | | Success |
| `segments_found` | int | | | Number of non-silent segments |

#### `daw.editor.bounce_region`
Bounce/consolidate a region to a new audio file.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| `region_id` | string | yes | Region UUID |
| `name` | string | no | Name for new region (auto-generated if omitted) |
| **Returns** | | | |
| `ok` | bool | | Success |
| `new_region_id` | string | | UUID of bounced region |

#### `daw.editor.adjust_region_gain`
Adjust the gain of an audio region.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| `gain_db` | double | yes | Gain adjustment in dB (e.g. -3.0 to reduce by 3dB) |
| **Returns** | | | |
| `ok` | bool | | Success |
| `new_gain_db` | double | | Resulting gain in dB |

#### `daw.editor.reset_region_gain`
Reset region gain to 0dB (unity).
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |

#### `daw.editor.set_region_fade_in`
Configure the fade-in for an audio region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | yes | | Region UUID |
| `shape` | string | yes | | Fade shape: `"linear"`, `"fast"`, `"slow"`, `"constant_power"`, `"symmetric"` |
| `length_samples` | int64 | yes | | Fade length in samples |
| **Returns** | | | | |
| `ok` | bool | | | Success |

#### `daw.editor.set_region_fade_out`
Same as `set_region_fade_in` but for fade-out.

#### `daw.editor.set_region_fade_in_active`
Enable or disable the fade-in on an audio region.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| `active` | bool | yes | `true` to enable, `false` to disable |

#### `daw.editor.set_region_fade_out_active`
Same as above for fade-out.

#### `daw.editor.set_region_envelope_active`
Enable or disable the volume envelope on an audio region.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| `active` | bool | yes | Enable/disable envelope |

#### `daw.editor.get_region_loudness`
Get detailed loudness analysis of an audio region.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| **Returns** | | | |
| `ok` | bool | | Success |
| `integrated_lufs` | double | | Integrated loudness (LUFS) |
| `momentary_lufs` | double | | Maximum momentary loudness |
| `true_peak_dbtp` | double | | True peak (dBTP) |
| `rms_db` | double | | RMS level (dB) |

#### `daw.editor.time_stretch_region`
Time-stretch an audio region (changes duration without pitch change).
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| `ratio` | double | yes | Stretch ratio (0.5 = half speed, 2.0 = double speed) |
| **Returns** | | | |
| `ok` | bool | | Success |
| `new_region_id` | string | | UUID of stretched region |

#### `daw.editor.pitch_shift_region`
Pitch-shift an audio region (changes pitch without duration change).
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| `semitones` | double | yes | Pitch shift in semitones (can be fractional, e.g. 0.5 for quarter tone) |
| **Returns** | | | |
| `ok` | bool | | Success |
| `new_region_id` | string | | UUID of pitch-shifted region |

### A2. Selection & Navigation

#### `daw.editor.select_all_regions_in_track`
Select all regions in a track.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| **Returns** | | | |
| `ok` | bool | | Success |
| `count` | int | | Number of regions selected |

#### `daw.editor.deselect_all`
Clear all selections (regions, tracks, time ranges).
No parameters. Returns `{ok: true}`.

#### `daw.editor.get_selection_extents`
Get the current time selection range.
| **Returns** | | | |
|-------|------|----------|-------------|
| `ok` | bool | | Success |
| `start_samples` | int64 | | Selection start in samples |
| `end_samples` | int64 | | Selection end in samples |
| `start_bbt` | string | | BBT string (e.g. "1|1|0") |
| `end_bbt` | string | | BBT string |

#### `daw.editor.select_range`
Set a time range selection.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | int64 | yes | Start position in samples |
| `end` | int64 | yes | End position in samples |

#### `daw.editor.nudge_region`
Nudge a region forward or backward.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| `distance_samples` | int64 | yes | Distance in samples |
| `forward` | bool | yes | `true` = forward, `false` = backward |
| **Returns** | | | |
| `ok` | bool | | Success |
| `new_position` | int64 | | New position in samples |

### A3. Clipboard Operations

#### `daw.editor.delete_region`
Delete a region from the playlist.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |

#### `daw.editor.duplicate_region`
Duplicate a region one or more times.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | yes | | Region UUID |
| `times` | int | no | 1 | Number of copies |
| **Returns** | | | | |
| `ok` | bool | | | Success |
| `new_region_ids` | string[] | | | UUIDs of new regions |

### A4. Zoom & View Control

#### `daw.editor.set_zoom_level`
Set the timeline zoom level.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `samples_per_pixel` | double | yes | Zoom level (lower = more zoomed in) |

#### `daw.editor.get_zoom_level`
Get the current zoom level.
| **Returns** | | | |
|-------|------|----------|-------------|
| `ok` | bool | | Success |
| `samples_per_pixel` | double | | Current zoom level |

#### `daw.editor.get_visible_range`
Get the currently visible time range in the editor.
| **Returns** | | | |
|-------|------|----------|-------------|
| `ok` | bool | | Success |
| `start_samples` | int64 | | Left edge of visible area |
| `end_samples` | int64 | | Right edge of visible area |

### A5. Edit Mode & Grid

#### `daw.editor.set_edit_mode`
Set the editing mode.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | string | yes | `"slide"`, `"lock"`, `"ripple"`, or `"ripple_all"` |

#### `daw.editor.get_edit_mode`
Returns `{ok: true, mode: "slide"}`.

#### `daw.editor.set_grid_type`
Set the snap/grid type.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | See Grid Types enum above |

---

## Category B: Session Metadata

All metadata commands follow the same pattern:

#### `daw.session.get_<field>`
No parameters. Returns `{ok: true, <field>: "value"}`.

#### `daw.session.set_<field>`
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | string or int | yes | New value |

**String fields:** title, subtitle, artist, album_artist, album, composer, arranger, lyricist, conductor, remixer, engineer, producer, mixer, dj_mixer, genre, year, copyright, isrc, description, comment, barcode

**Integer fields:** track_number, total_tracks, disc_number, total_discs

**Example:**
```json
// Set
{"method": "daw.session.set_artist", "params": {"value": "David Yousefi"}}
// Get
{"method": "daw.session.get_artist", "params": {}}
// Response: {"result": {"ok": true, "artist": "David Yousefi"}}
```

---

## Category C: Route Groups

#### `daw.route_group.list`
List all route groups with their properties.
| **Returns** | | |
|-------|------|-------------|
| `ok` | bool | Success |
| `groups` | array | Array of group objects |

Each group object:
```json
{
  "id": "1234",
  "name": "Drums",
  "active": true,
  "relative": false,
  "hidden": false,
  "gain": true,
  "mute": true,
  "solo": true,
  "recenable": false,
  "select": true,
  "color": true,
  "monitoring": false,
  "member_count": 4,
  "rgba": "FF5500FF"
}
```

#### `daw.route_group.create`
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Group name |
| **Returns** | | | |
| `ok` | bool | | Success |
| `group_id` | string | | New group UUID |

#### `daw.route_group.add_route`
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `group_id` | string | yes | Group UUID |
| `track_id` | string | yes | Track/bus UUID to add |

#### `daw.route_group.set_rgba`
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `group_id` | string | yes | Group UUID |
| `color` | string | yes | RRGGBBAA hex, e.g. `"FF0000FF"` for red |

---

## Category D: Panner System

#### `daw.panner.get_position`
Get the pan position of a track.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| **Returns** | | | |
| `ok` | bool | | |
| `position` | double | | 0.0 = full left, 0.5 = center, 1.0 = full right |

#### `daw.panner.set_position`
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| `position` | double | yes | 0.0 (left) to 1.0 (right) |

#### `daw.panner.get_width`
Get stereo width.
| Returns | Type | Description |
|---------|------|-------------|
| `width` | double | -1.0 (swapped) to 0.0 (mono) to 1.0 (full stereo) |

#### `daw.panner.set_width`
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| `width` | double | yes | -1.0 to 1.0 |

#### `daw.panner.get_available_panners`
List all available panner types.
| **Returns** | | |
|-------|------|-------------|
| `panners` | array | `[{uri: "...", name: "VBAP 2D"}, ...]` |

#### `daw.panner.select_by_uri`
Change the panner algorithm for a track.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| `uri` | string | yes | Panner URI from `get_available_panners` |

---

## Category G: Mixer Scenes

#### `daw.mixer_scene.snapshot`
Capture the current mixer state (faders, pans, mutes) to a scene slot.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `index` | int | yes | Scene slot index (0-7) |

#### `daw.mixer_scene.apply`
Restore a saved mixer scene.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `index` | int | yes | Scene slot index (0-7) |

#### `daw.mixer_scene.list`
Get all mixer scenes.
| **Returns** | | |
|-------|------|-------------|
| `scenes` | array | `[{index: 0, name: "Verse", empty: false}, ...]` |

---

## Category I: Tempo Deep Control

#### `daw.tempo_map.get_tempo_at`
Get the tempo at a specific position.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `position_samples` | int64 | yes | Position in samples |
| **Returns** | | | |
| `ok` | bool | | |
| `bpm` | double | | Beats per minute |
| `note_type` | int | | Note type (4 = quarter, 8 = eighth) |
| `ramped` | bool | | True if tempo is ramping to next point |

#### `daw.tempo_map.samples_to_bbt`
Convert a sample position to bars|beats|ticks.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `samples` | int64 | yes | Sample position |
| **Returns** | | | |
| `bars` | int | | Bar number (1-based) |
| `beats` | int | | Beat number (1-based) |
| `ticks` | int | | Tick number (0-1919, 1920 ticks per beat) |

#### `daw.tempo_map.bbt_to_samples`
Convert bars|beats|ticks to sample position.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `bars` | int | yes | Bar number (1-based) |
| `beats` | int | yes | Beat number (1-based) |
| `ticks` | int | no | Tick number (0-1919, default 0) |
| **Returns** | | | |
| `samples` | int64 | | Sample position |

#### `daw.tempo_point.set_bpm`
Change the BPM of an existing tempo point.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `position_samples` | int64 | yes | Position of the tempo point |
| `bpm` | double | yes | New BPM value |

---

## Category J: Automation Deep Control

#### `daw.automation.thin`
Remove automation points that contribute less than `threshold` to the curve shape (Douglas-Peucker thinning).
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| `param_type` | string | yes | `"gain"`, `"pan"`, `"mute"`, etc. |
| `threshold` | double | yes | Thinning threshold (higher = more aggressive, try 0.001 to 0.1) |
| **Returns** | | | |
| `points_removed` | int | | Number of points removed |

#### `daw.automation.clear_range`
Remove all automation points in a time range.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| `param_type` | string | yes | Parameter type |
| `start` | int64 | yes | Range start in samples |
| `end` | int64 | yes | Range end in samples |
| **Returns** | | | |
| `points_removed` | int | | Number of points removed |

#### `daw.automation.set_interpolation`
Set the interpolation style for an automation parameter.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `track_id` | string | yes | Track UUID |
| `param_type` | string | yes | Parameter type |
| `style` | string | yes | `"discrete"`, `"linear"`, `"curved"`, `"logarithmic"`, `"exponential"` |

#### `daw.midi_sequence.remove_overlapping_notes`
Fix overlapping notes in a MIDI region (removes the shorter note where two notes of the same pitch overlap).
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | MIDI region UUID |
| **Returns** | | | |
| `notes_removed` | int | | Number of notes removed |

#### `daw.midi_sequence.get_note_range`
Get the lowest and highest MIDI note numbers in a region.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | MIDI region UUID |
| **Returns** | | | |
| `lowest` | int | | Lowest MIDI note (0-127) |
| `highest` | int | | Highest MIDI note (0-127) |

---

## Category K: Control Protocols

#### `daw.control_protocol.list_known`
List all discovered control surface protocols.
| **Returns** | | |
|-------|------|-------------|
| `protocols` | array | `[{name: "Mackie", active: true, mandatory: false}, ...]` |

#### `daw.control_protocol.activate`
Load and activate a control surface protocol.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Protocol name from `list_known` |

---

## Category L: Offline Audio Processing

#### `daw.offline.normalize`
Normalize an audio region to a target peak level.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `region_id` | string | yes | | Region UUID |
| `target_db` | double | no | 0.0 | Target peak in dB |
| `use_peak` | bool | no | true | `true` = peak normalize, `false` = RMS normalize |
| **Returns** | | | | |
| `peak_before_db` | double | | | Peak level before |
| `peak_after_db` | double | | | Peak level after |

#### `daw.offline.get_loudness`
Get detailed loudness analysis of an audio region.
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `region_id` | string | yes | Region UUID |
| **Returns** | | | |
| `integrated_lufs` | double | | Integrated loudness (LUFS) |
| `true_peak_dbtp` | double | | True peak (dBTP) |
| `short_term_lufs` | double | | Max short-term loudness |
| `momentary_lufs` | double | | Max momentary loudness |

---

## Category M: AAF Import/Export

#### `daw.aaf.check_available`
Check if AAF support is compiled into this build.
| **Returns** | | |
|-------|------|-------------|
| `available` | bool | `true` if AAF import/export is available |

#### `daw.aaf.import_session`
Import a Pro Tools AAF file into the current session.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | yes | | Absolute path to .aaf file |
| `merge` | bool | no | false | `true` = merge into current session, `false` = replace |
| **Returns** | | | | |
| `tracks_imported` | int | | | Number of tracks created |
| `regions_imported` | int | | | Number of regions imported |
