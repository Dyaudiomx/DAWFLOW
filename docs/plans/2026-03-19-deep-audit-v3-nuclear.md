# Deep Audit V3 — Nuclear Every-Line-of-Code Audit

**Date:** 2026-03-19
**Current State:** 1,911 command strings (44 duplicates → ~1,867 unique) + 124 signal events = **~1,991 IPC items** across 23 source files
**Method:** 9 parallel agents audited ALL 2,424 header files across the entire Ardour engine repo + all editor actions

---

## What V3 Covered That V2 Didn't

| V2 (6 agents) | V3 (9 agents) |
|---|---|
| ~40 major headers | ALL 348 ardour headers |
| 0 support libraries | temporal (15), evoral (18), pbd (119) |
| 0 editor files | ALL 364 gtk2_ardour headers |
| 0 surface/canvas | surfaces, canvas, audiographer, AAF |
| 0 action system | ALL 446 registered editor actions |

---

## V3 NEW GAPS (Not in V2, not yet implemented)

### Category A: Editor Operations (280 methods) — THE BIGGEST GAP

These are the 280+ operations users perform from menus/keyboard that have NO IPC equivalent. Your tier1-4 files added some but NOT these editor-specific ones:

**A1. Region Audio Processing (31 commands)**
- daw.editor.reverse_region() — Reverse audio
- daw.editor.normalize_region() — Normalize to peak
- daw.editor.pitch_shift(region_id, cents) — Pitch manipulation
- daw.editor.time_stretch(region_id, ratio) — Time stretching
- daw.editor.strip_region_silence(region_id, threshold) — Remove silence
- daw.editor.bounce_region_selection() — Consolidate/flatten
- daw.editor.bounce_range_selection() — Bounce range
- daw.editor.combine_regions() — Merge audio regions
- daw.editor.uncombine_regions() — Split merged region
- daw.editor.split_multichannel_region() — Stereo to dual mono
- daw.editor.split_region_at_transients() — Auto-split at peaks
- daw.editor.fade_range() — Apply fades to range
- daw.editor.set_fade_in_shape(shape) — Set fade curve type
- daw.editor.set_fade_out_shape(shape) — Set fade curve type
- daw.editor.adjust_region_gain(dB) — Region level
- daw.editor.reset_region_gain() — Reset level
- daw.editor.crop_region_to_selection() — Trim to selection
- daw.editor.external_edit_region() — Open in external editor
- daw.editor.spectral_analyze_region() — FFT analysis
- daw.editor.loudness_analyze_region() — Loudness analysis

**A2. Selection & Cursors (45 commands)**
- daw.editor.select_all_in_track(track_id) — Select all in track
- daw.editor.select_all_objects() — Select everything
- daw.editor.select_range(start, end) — Time selection
- daw.editor.select_range_between_cursors() — Between markers
- daw.editor.extend_selection_to_track(track_id) — Multi-track
- daw.editor.invert_selection() — Invert
- daw.editor.deselect_all() — Clear
- daw.editor.get_selection_extents() — Query bounds
- daw.editor.cursor_to_region_boundary(dir) — Navigate regions
- daw.editor.cursor_to_next_region_start() — Next region
- daw.editor.cursor_to_prev_region_start() — Prev region
- daw.editor.find_next_region(track_id, pos) — Search
- daw.editor.find_next_region_boundary(track_id, pos) — Search boundary
- daw.editor.playhead_forward_to_grid() — Snap to grid
- daw.editor.playhead_backward_to_grid() — Snap to grid
- daw.editor.nudge_forward(amount) — Nudge playhead/region
- daw.editor.nudge_backward(amount) — Nudge back

**A3. Clipboard & History (11 commands)**
- daw.editor.cut() — Cut selection
- daw.editor.copy() — Copy selection
- daw.editor.paste() — Paste at edit point
- daw.editor.delete() — Delete selection
- daw.editor.duplicate_selection() — Duplicate
- daw.editor.duplicate_range() — Duplicate range
- daw.editor.cut_copy_section(start, end, to, op) — Section ops

**A4. Zoom & View (20 commands)**
- daw.editor.zoom_to_selection() — Fit selection in view
- daw.editor.zoom_to_session() — Fit whole session
- daw.editor.temporal_zoom_in/out() — Timeline zoom
- daw.editor.fit_tracks(count) — Fit N tracks in view
- daw.editor.scroll_tracks_up/down() — Vertical scroll
- daw.editor.scroll_forward/backward() — Horizontal scroll
- daw.editor.center_playhead() — Center view on playhead
- daw.editor.center_edit_point() — Center on edit point
- daw.editor.move_to_start/end() — Jump to endpoints
- daw.editor.maximize_editing_space() — Fullscreen
- daw.editor.restore_editing_space() — Exit fullscreen
- daw.editor.save_visual_state(n) — Save view state
- daw.editor.goto_visual_state(n) — Restore view state

**A5. Playback Shortcuts (13 commands)**
- daw.editor.play_selection() — Play selected
- daw.editor.play_solo_selection() — Solo play
- daw.editor.play_with_preroll() — Play with preroll
- daw.editor.play_from_start() — Play from session start
- daw.editor.play_from_edit_point() — Play from cursor
- daw.editor.play_edit_range() — Play edit range
- daw.editor.rec_with_preroll() — Record with preroll
- daw.editor.rec_with_count_in() — Record with count-in

**A6. Markers & Locations (30 commands)**
- daw.editor.add_location_from_selection() — Marker from selection
- daw.editor.add_location_from_region() — Marker from region
- daw.editor.add_bbt_marker_at_playhead() — Time sig marker
- daw.editor.set_loop_from_selection() — Loop from selection
- daw.editor.set_loop_from_region() — Loop from region
- daw.editor.set_punch_from_selection() — Punch from selection
- daw.editor.set_session_start_from_playhead() — Session boundary
- daw.editor.set_session_end_from_playhead() — Session boundary
- daw.editor.toggle_location_at_playhead() — Toggle marker
- daw.editor.mouse_add_new_tempo_event(pos) — Add tempo
- daw.editor.mouse_add_new_meter_event(pos) — Add meter
- daw.editor.edit_tempo_section(id) — Edit tempo
- daw.editor.edit_meter_section(id) — Edit meter

**A7. Playlist & Track Ops (35 commands)**
- daw.editor.clear_playlist(track_id) — Clear playlist
- daw.editor.new_playlists_for_all_tracks() — New playlists
- daw.editor.new_playlists_for_armed_tracks() — For armed
- daw.editor.new_playlists_for_selected_tracks() — For selected
- daw.editor.remove_selected_regions() — Delete regions
- daw.editor.rename_region(region_id, name) — Rename
- daw.editor.group_selected_regions() — Group
- daw.editor.ungroup_selected_regions() — Ungroup
- daw.editor.tag_region(region_id, tags) — Tag region
- daw.editor.region_fill_selection() — Fill selection
- daw.editor.region_fill_track() — Fill track
- daw.editor.recover_regions() — Recover deleted
- daw.editor.change_region_layering_order(region_id, layer) — Reorder
- daw.editor.show_midi_list_editor(region_id) — MIDI editor
- daw.editor.hide_track(track_id) — Hide track
- daw.editor.show_track(track_id) — Show track
- daw.editor.remove_tracks() — Delete selected tracks

**A8. Time Editing (15 commands)**
- daw.editor.insert_time(pos, duration) — Insert time space
- daw.editor.remove_time(start, end) — Remove time
- daw.editor.remove_gaps(threshold) — Remove silence gaps
- daw.editor.do_ripple(pos, distance) — Ripple edit
- daw.editor.sequence_regions() — Order by position
- daw.editor.freeze_route(track_id) — Freeze track
- daw.editor.unfreeze_route(track_id) — Unfreeze track
- daw.editor.tab_to_transient(dir) — Jump to transient

**A9. Edit Mode & Grid (12 commands)**
- daw.editor.set_edit_mode(mode) — Slide/Lock/Ripple
- daw.editor.cycle_edit_mode() — Cycle through modes
- daw.editor.set_snap_mode(mode) — Snap on/off
- daw.editor.set_snap_to(grid) — Grid type (bar/beat/etc)
- daw.editor.set_zoom_focus(focus) — Zoom behavior
- daw.editor.toggle_marker_lines() — Visual option
- daw.editor.toggle_all_existing_automation() — Show/hide automation
- daw.editor.toggle_layer_display() — Overlaid/stacked

---

### Category B: Session Metadata (50 commands)

Complete metadata get/set pairs — critical for AI tagging:
- daw.session.get/set_title, subtitle, artist, album_artist, album
- daw.session.get/set_composer, arranger, lyricist, conductor, remixer
- daw.session.get/set_engineer, producer, mixer, dj_mixer
- daw.session.get/set_genre, year, copyright, isrc, description, comment
- daw.session.get/set_track_number, total_tracks, disc_number, total_discs

---

### Category C: Route Groups (40 commands)

Full route group property control:
- daw.route_group.create/delete/list — Lifecycle
- daw.route_group.add_route/remove_route/clear — Membership
- daw.route_group.set/get_active, relative, hidden — State
- daw.route_group.set/get_gain, mute, solo, recenable, select, color, monitoring — Property linking
- daw.route_group.make_subgroup/destroy_subgroup — Subgroup bus
- daw.route_group.assign_master/unassign_master — VCA assignment
- daw.route_group.set/get_rgba — Group color

---

### Category D: Panner System (25 commands)

Full panning control:
- daw.panner.set/get_position — Pan position
- daw.panner.set/get_width — Stereo width
- daw.panner.set/get_elevation — Height (for Atmos)
- daw.panner.set/get_bypassed — Bypass
- daw.panner.reset — Default position
- daw.panner.select_by_uri(uri) — Change panner type
- daw.panner.get_available_panners — List panner types
- daw.panner.set/get_linked_to_route — Link to route
- daw.panner.position/width/elevation_range — Get valid ranges
- daw.panner_shell.configure_io — I/O config

---

### Category E: Step Sequencer (28 commands)

Full step sequencer control (from step_sequencer.h):
- daw.step_sequencer.set_step_size(beats) — Step duration
- daw.step_sequencer.set_start/end_step — Range
- daw.step_sequencer.sync/reset — State
- daw.step_sequencer.write_to_source — Export to MIDI
- daw.step_sequence.set_root/channel/mode — Sequence config
- daw.step_sequence.shift_left/right — Rotate
- daw.step.set_note/velocity/duration/offset — Note data
- daw.step.set_chord — Multiple notes
- daw.step.set_parameter — CC values
- daw.step.adjust_velocity/pitch/duration/octave — Relative adjustments
- daw.step.set_enabled/skipped/repeat — Step state

---

### Category F: MIDI Patch Manager (17 commands)

- daw.midi_patches.get_all_models — List MIDI devices
- daw.midi_patches.get_devices_by_manufacturer — Grouped list
- daw.midi_patches.get_patches(model, mode, channel) — Get patches
- daw.midi_patches.find_patch(model, mode, channel, key) — Find patch
- daw.midi_patches.next/previous_patch — Navigate
- daw.midi_patches.get_note_name(bank, program, channel, note) — Note names
- daw.midi_patches.get_patch_name(bank, program, channel) — Patch names
- daw.midi_patches.get_controller_name(param) — CC names
- daw.midi_patches.add/update/remove_custom_midnam — Custom patches

---

### Category G: Mixer Scenes (7 commands)

- daw.mixer_scene.snapshot(index) — Capture current state
- daw.mixer_scene.apply(index) — Restore state
- daw.mixer_scene.clear(index) — Clear saved state
- daw.mixer_scene.is_empty(index) — Check state
- daw.mixer_scene.get/set_name(index) — Name

---

### Category H: Analysis & DSP (40 commands)

**Offline Audio Analysis:**
- daw.analyze.queue_source(source_id) — Queue for analysis
- daw.analyze.region(region_id) — Analyze region
- daw.analyze.range(track_id, start, end) — Analyze range
- daw.analyze.detect_onsets(source_id, threshold) — Onset detection
- daw.analyze.detect_transients(source_id, threshold) — Transients
- daw.analyze.estimate_tempo(source_id) — BPM detection
- daw.analyze.lufs(region_id) — LUFS loudness
- daw.analyze.ebur128(region_id) — EBU R128
- daw.analyze.spectral(region_id) — FFT
- daw.analyze.stereo_correlation(region_id) — Stereo analysis

**Audio Processing Filters:**
- daw.filter.reverse(region_id) — Reverse
- daw.filter.stretch(region_id, ratio, method) — RubberBand/SoundTouch
- daw.filter.strip_silence(region_id, threshold) — Remove silence
- daw.filter.legatize(region_id) — MIDI legatize
- daw.filter.quantize(region_id, start_grid, end_grid) — Quantize MIDI
- daw.filter.transpose(region_id, semitones) — Transpose MIDI
- daw.filter.strum(region_id) — Strum effect
- daw.filter.transform(region_id, transform_spec) — MIDI transform

**Convolver:**
- daw.convolver.load_impulse(path, in_ch, out_ch) — Load IR
- daw.convolver.clear_impulse — Unload
- daw.convolver.ready — Check status

**FluidSynth:**
- daw.fluidsynth.load_sf2(path) — Load SoundFont
- daw.fluidsynth.select_program(program, channel) — Instrument
- daw.fluidsynth.get_program_count — Count
- daw.fluidsynth.get_program_name(index) — Name

---

### Category I: Temporal/Tempo Deep Control (35 commands)

**TempoMap navigation:**
- daw.tempo_map.clear_tempos_before/after(pos) — Bulk clear
- daw.tempo_map.previous/next_tempo(pos) — Navigate
- daw.tempo_map.previous/next_meter(pos) — Navigate
- daw.tempo_map.max/min_tempo() — Range
- daw.tempo_map.bbt_walk(pos, offset) — Walk BBT
- daw.tempo_map.bbt_distance(from, to) — BBT distance
- daw.tempo_map.midi_clock_beat(pos) — MIDI clock
- daw.tempo_map.quarters_at_sample(pos) — Convert

**Tempo point editing:**
- daw.tempo_point.set_npm(id, bpm) — Change tempo
- daw.tempo_point.set_end_npm(id, bpm) — End of ramp
- daw.tempo_point.set_ramped(id, bool) — Linear/constant

**Beat math:**
- daw.beats.round_to_beat/subdivision(value, div) — Rounding
- daw.beats.round_to_bar(value) — Bar rounding
- daw.bbt.next/prev_bar(bbt) — Navigate
- daw.bbt.is_bar/beat(bbt) — Check

---

### Category J: Automation Deep Control (25 commands)

**ControlList manipulation:**
- daw.automation.thin(track_id, param, threshold) — Thin points
- daw.automation.cut(track_id, param, start, end) — Extract range
- daw.automation.copy(track_id, param, start, end) — Copy range
- daw.automation.paste(track_id, param, pos, data) — Paste data
- daw.automation.clear_range(track_id, param, start, end) — Clear
- daw.automation.x_scale(track_id, param, factor) — Scale time
- daw.automation.y_transform(track_id, param, transform) — Transform values
- daw.automation.slide(track_id, param, distance) — Move points
- daw.automation.shift(track_id, param, pos, distance) — Shift after pos
- daw.automation.truncate_start/end(track_id, param, pos) — Trim
- daw.automation.set_interpolation(track_id, param, style) — Curve type

**MIDI Sequence manipulation:**
- daw.midi_sequence.remove_overlapping_notes(region_id) — Fix overlaps
- daw.midi_sequence.trim_overlapping_notes(region_id) — Trim overlaps
- daw.midi_sequence.remove_duplicate_notes(region_id) — Deduplicate
- daw.midi_sequence.set_notes(region_id, notes_data) — Bulk replace
- daw.midi_sequence.shift(region_id, amount) — Shift all events
- daw.midi_sequence.lowest/highest_note(region_id) — Range
- daw.midi_sequence.channels_present(region_id) — Active channels

---

### Category K: Control Protocols & Surfaces (15 commands)

- daw.control_protocol.discover() — Scan for controllers
- daw.control_protocol.list_known() — List all protocols
- daw.control_protocol.activate(name) — Load protocol
- daw.control_protocol.deactivate(name) — Unload protocol
- daw.control_protocol.probe_midi() — Scan MIDI
- daw.control_protocol.probe_usb(vendor, product) — Scan USB
- daw.mackie.set_view_mode(mode) — Surface mode
- daw.mackie.set_flip_mode(mode) — Flip faders
- daw.mackie.set_subview(mode, strip) — Soft-keys

---

### Category L: Audiographer Offline Processing (15 commands)

- daw.audiographer.normalize(region_id, peak_db) — Normalize
- daw.audiographer.silence_trim(region_id, start, end) — Trim silence
- daw.audiographer.add_silence(region_id, start_ms, end_ms) — Add silence
- daw.audiographer.sample_rate_convert(region_id, rate, quality) — SRC
- daw.audiographer.format_convert(region_id, format, dither) — Format convert
- daw.audiographer.loudness_read(region_id) — Read loudness
- daw.audiographer.peak_read(region_id) — Read peak

---

### Category M: AAF Import/Export (5 commands)

- daw.aaf.import(path, options) — Import Pro Tools session
- daw.aaf.analyze(path) — Inspect AAF metadata
- daw.aaf.export(path, options) — Export as AAF

---

## GRAND TOTAL — V3 New Gaps

| Category | Count | Description |
|----------|-------|-------------|
| A. Editor Operations | ~280 | Region processing, selection, clipboard, zoom, markers, playlists, time editing |
| B. Session Metadata | ~50 | Title, artist, genre, ISRC, etc. |
| C. Route Groups | ~40 | Group properties, subgroups, VCA |
| D. Panner System | ~25 | Position, width, elevation, types |
| E. Step Sequencer | ~28 | Full sequencer control |
| F. MIDI Patches | ~17 | Device models, patches, note names |
| G. Mixer Scenes | ~7 | Snapshot, apply, clear |
| H. Analysis & DSP | ~40 | Offline analysis, filters, convolver, FluidSynth |
| I. Tempo Deep | ~35 | TempoMap nav, point editing, beat math |
| J. Automation Deep | ~25 | ControlList manipulation, MIDI sequence |
| K. Control Protocols | ~15 | Surface discovery and control |
| L. Audiographer | ~15 | Offline audio processing |
| M. AAF | ~5 | Pro Tools interchange |
| **V3 TOTAL** | **~582** | **New commands not in V2** |

Combined with V2 remaining gaps (some now implemented in your tier1-4 files):
- V2 gaps that your tier1-4 already covered: ~420 (matching the 420 commands in tier files)
- V2 gaps still remaining: ~15
- V3 new gaps: ~582

**Final total remaining gaps: ~597 commands**

**After full implementation:**
- Current: 1,867 unique commands + 124 signals = **1,991 IPC items**
- After V3: ~2,464 unique commands + 124 signals = **~2,588 total IPC items**

This would make DAWFLOW have **2.5x more automation endpoints than REAPER** (~1,000) and complete coverage of every user-facing operation in the DAW.

---

## Duplicates to Clean Up (44)

Still have 44 duplicate command registrations to remove (mostly in dawflow_commands_safety.cc).
