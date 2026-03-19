# Comprehensive IPC Exposure Plan — Every Ardour Function

**Date:** 2026-03-19
**Goal:** Expose every Ardour internal function via IPC so the React UI can fully replace the GTK interface.
**Approach:** Add ~280 new IPC endpoints to the engine (GPL, open source). The React UI (proprietary) calls them.

## Current State
- **~237 IPC endpoints already exist** across 7 command files
- **~280 new endpoints needed** identified by 6 parallel audit agents
- **~64 are critical** (block basic workflows)

---

## Phase 1: CRITICAL BLOCKERS (64 endpoints) — Do First

### 1A. Session Lifecycle (4 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.new_session` | name, path, sample_rate, template? | session_path | Create new project |
| `daw.open_session` | path | session_name, sample_rate | Load project |
| `daw.close_session` | save_first? | ok | Close current |
| `daw.save_session` | (none) | ok | Ctrl+S |

### 1B. Plugin Editor Windows (3 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.plugin.open_editor` | track_id, processor_id | window_id, editor_type | **#1 BLOCKER** — opens native plugin GUI |
| `daw.plugin.close_editor` | track_id, processor_id | ok | Close plugin window |
| `daw.plugin.list_presets` | track_id, processor_id | presets[] | List available presets |

### 1C. Transport Controls (17 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.transport_goto_start` | (none) | position | Jump to session start |
| `daw.transport_goto_end` | (none) | position | Jump to session end |
| `daw.transport_play_selection` | (none) | ok | Play selected range |
| `daw.transport_rewind` | speed? | ok | Shuttle backward |
| `daw.transport_forward` | speed? | ok | Shuttle forward |
| `daw.set_auto_input` | enabled | ok | Monitor input toggle |
| `daw.set_auto_play` | enabled | ok | Auto-play on locate |
| `daw.set_auto_return` | enabled | ok | Return after stop |
| `daw.set_follow_edits` | enabled | ok | Playhead follows edits |
| `daw.set_loop_enabled` | enabled | ok | Toggle loop playback |
| `daw.set_punch_in` | enabled | ok | Punch in toggle |
| `daw.set_punch_out` | enabled | ok | Punch out toggle |
| `daw.transport_record_with_preroll` | (none) | ok | Preroll + record |
| `daw.transport_record_with_count_in` | (none) | ok | Count-in + record |
| `daw.get_transport_state` | (none) | full state snapshot | All transport flags |
| `daw.get_playhead_position` | (none) | samples, seconds, bbt, tc | Multi-format position |
| `daw.transport_goto_marker` | marker_name or index | position | Jump to marker |

### 1D. Metering (4 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.get_meter_levels` | track_id?, channel? | peak, rms, hold, clipped | Per-channel meters |
| `daw.reset_meter_peaks` | track_id? | ok | Reset peak hold |
| `daw.set_meter_type` | track_id?, type | ok | K-metering, VU, etc. |
| `daw.subscribe_meter_updates` | interval_ms | ok | Start streaming meter data as events |

### 1E. Region Editing Critical (18 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.separate_regions_between` | track_id, start, end | ok | Slice at range |
| `daw.create_regions_from_range` | track_id, start, end | region_id | New region from range |
| `daw.combine_regions` | track_id, region_ids[] | region_id | Consolidate/bounce |
| `daw.uncombine_regions` | track_id, region_id | ok | Un-consolidate |
| `daw.split_at_transients` | track_id, region_id, threshold | ok | Auto-split at peaks |
| `daw.place_transient_marker` | track_id, region_id, position | ok | Manual transient |
| `daw.remove_transient_marker` | track_id, region_id, position | ok | Remove transient |
| `daw.goto_next_transient` | track_id, region_id, forward | position | Navigate transients |
| `daw.snap_regions_to_grid` | track_id, region_ids[] | ok | Auto-snap |
| `daw.close_region_gaps` | track_id, threshold | ok | Close gaps |
| `daw.reverse_audio_range` | track_id, start, end | ok | Reverse selection |
| `daw.raise_region` | track_id, region_id | ok | Layer up |
| `daw.lower_region` | track_id, region_id | ok | Layer down |
| `daw.slip_region_content` | track_id, region_id, delta | ok | Non-destructive slip |
| `daw.toggle_region_phase_invert` | track_id, region_id | ok | Phase flip |
| `daw.set_region_locked` | track_id, region_id, locked | ok | Lock/unlock |
| `daw.set_region_opaque` | track_id, region_id, opaque | ok | Opacity |
| `daw.separate_region_from_selection` | (uses selection) | ok | Split at selection |

### 1F. MIDI Critical (11 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.midi.move_note` | track_id, region_id, note_id, new_time, new_pitch | ok | Move note |
| `daw.midi.resize_note` | track_id, region_id, note_id, new_length | ok | Change duration |
| `daw.midi.set_note_velocity` | track_id, region_id, note_id, velocity | ok | Edit velocity |
| `daw.midi.add_note` | track_id, region_id, pitch, time, length, velocity, channel | note_id | Create note |
| `daw.midi.delete_note` | track_id, region_id, note_id | ok | Delete note |
| `daw.midi.get_cc_data` | track_id, region_id, cc_number | cc_events[] | Get controller data |
| `daw.midi.add_cc_event` | track_id, region_id, cc_number, time, value | ok | Add CC point |
| `daw.midi.delete_cc_event` | track_id, region_id, cc_number, time | ok | Remove CC point |
| `daw.midi.add_patch_change` | track_id, region_id, time, program, bank, channel | ok | Program change |
| `daw.midi.delete_patch_change` | track_id, region_id, patch_id | ok | Remove patch change |
| `daw.midi.quantize` | track_id, region_id, grid_size, strength, swing | ok | Quantize notes |

### 1G. Markers (4 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.add_marker` | position, name, type? | location_id | Add marker |
| `daw.remove_marker` | location_id | ok | Remove marker |
| `daw.get_markers` | include_ranges?, include_cues? | markers[] | List all markers |
| `daw.update_marker` | location_id, name?, position?, end? | ok | Edit marker |

### 1H. Zoom & Navigation (3 endpoints)
| Command | Params | Returns | Notes |
|---------|--------|---------|-------|
| `daw.zoom_step` | direction (in/out), steps? | zoom_level | Zoom in/out |
| `daw.scroll_timeline` | direction, pages? | position | Scroll view |
| `daw.goto_next_marker` | (none) | position, name | Navigate markers |

---

## Phase 2: HIGH PRIORITY (80 endpoints) — Professional Workflows

### 2A. Region Editing (28 endpoints)
- Alignment (start/end/center/sync/relative)
- Nudge (forward/backward by grid)
- Fading (set shape, fade range, toggle visibility)
- Gain envelope (show/hide, reset, toggle editing)
- Grouping (group/ungroup regions)
- Loop/punch from region/selection
- Play selection/region/solo
- Zoom to selection/region/session
- Layer display mode (overlaid/stacked)
- Fit tracks vertically

### 2B. Plugin System (8 endpoints)
- `daw.plugin.load_preset` / `daw.plugin.save_preset`
- `daw.plugin.open_generic_editor` (parameter-only UI)
- `daw.plugin.manage_pins` (I/O routing)
- `daw.plugin.remove`
- `daw.get_mixer_state` (full snapshot)
- `daw.get_meter_levels` (per-channel)
- `daw.set_meter_point` (pre/post fader)

### 2C. Track & Routing (12 endpoints)
- Route groups (create, add/remove tracks, get all, rename, details)
- VCA (assign/unassign tracks, get assignments, rename, delete, gain/mute/solo)
- Input/output device routing
- Add/remove aux sends

### 2D. MIDI & Automation (19 endpoints)
- Note selection, batch edit, transpose
- Automation interpolation styles (linear/smooth)
- Automation ramps, copy/paste ranges
- Step editing (step-add notes, cursor control)
- SysEx events

### 2E. Window Management (13 endpoints)
- Toggle editor/mixer/preferences/plugin manager windows
- Session options, about dialog
- Close all dialogs
- Window visibility queries

---

## Phase 3: MEDIUM PRIORITY (80 endpoints) — Advanced Features

### 3A. Region Advanced (27 endpoints)
- Navigation (boundary, region point, playhead)
- Cue markers (add/remove/clear/globalize)
- Ripple editing (enable, execute, markers)
- Silence detection and removal
- Tempo detection from region

### 3B. Export/Import (7 endpoints)
- Export session/selection/region/stems
- Quick export, surround export
- MIDI export

### 3C. Zoom Advanced (12 endpoints)
- Zoom presets (10ms, 100ms, 1s, etc.)
- Zoom to selection/extents
- Zoom focus (cursor/playhead/center/mouse)
- Vertical zoom, track scroll
- Ruler visibility
- Get zoom state

### 3D. Session Maintenance (10 endpoints)
- Cleanup unused sources/regions
- Bring sources into session
- Flush wastebasket
- Archive session
- Snapshots

### 3E. Transport Advanced (13 endpoints)
- Sync source (JACK/MTC/LTC)
- Click settings (record-only, custom sound, volume)
- Session properties query
- Rename session

### 3F. Metering Advanced (6 endpoints)
- Meter configuration (channel counts)
- Reset peak hold per track
- Get zoom state
- Marker lock/unlock
- Marker line visibility

---

## Phase 4: LOW PRIORITY (56 endpoints) — Polish

- UI-only functions (14)
- Niche transport (6)
- Advanced routing (sidechain, panning modes)
- Step editing details
- Ruler show/hide per type
- Track reordering
- And more...

---

## Implementation Strategy

### File Organization
New endpoints go in existing command files by domain:
- `dawflow_plugin_host.cc` — Core session/track commands
- `dawflow_commands_editing.cc` — Region/audio operations
- `dawflow_commands_automation.cc` — Automation + metering
- `dawflow_commands_critical.cc` — Session lifecycle + markers
- `dawflow_commands_high.cc` — MIDI + advanced editing
- `dawflow_commands_medium.cc` — Navigation + zoom + windows
- NEW: `dawflow_commands_plugin_ui.cc` — Plugin editor windows (special handling)
- NEW: `dawflow_commands_meter_stream.cc` — Real-time meter streaming

### Thread Safety
ALL commands dispatch through centralized `signal_idle` + `shared_ptr<DispatchState>` mechanism (already implemented). No per-command wrapping needed.

### Testing
Each phase should be tested end-to-end:
1. Add IPC endpoint in engine
2. Build engine (`waf build`)
3. Add IPC wrapper in `dawflow-ui/src/services/ipc.ts`
4. Wire to React UI component
5. Build + deploy React UI
6. Manual test in running DAW

---

## Timeline Estimate

| Phase | Endpoints | Effort | Enables |
|-------|-----------|--------|---------|
| Phase 1 | 64 critical | 1-2 weeks | Basic DAW workflow |
| Phase 2 | 80 high | 2-3 weeks | Professional editing |
| Phase 3 | 80 medium | 2-3 weeks | Advanced features |
| Phase 4 | 56 low | 1-2 weeks | Polish |
| **Total** | **~280** | **~8 weeks** | **Full GTK replacement** |

---

## Key Architectural Decisions

1. **Plugin editor windows** — Use Ardour's native window system via `daw.plugin.open_editor`. The engine creates the plugin window as a separate OS window, not embedded in the WebView. This is the same approach Ardour uses.

2. **Meter streaming** — Add a dedicated event channel that broadcasts meter data at ~25Hz via the existing WebSocket connection (not IPC polling). This mirrors how Ardour's GTK UI uses fast_update timers.

3. **Session lifecycle** — `new_session` and `open_session` will need special handling since they tear down and rebuild the entire session state. The React UI must reconnect and re-fetch everything.

4. **Color format** — Ardour uses RRGGBBAA uint32_t. IPC sends/receives 8-char hex strings. React UI converts to/from CSS `#RRGGBB` format.
