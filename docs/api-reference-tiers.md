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
