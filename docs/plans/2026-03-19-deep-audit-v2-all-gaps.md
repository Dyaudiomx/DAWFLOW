# Deep Audit V2 — All Remaining IPC Gaps (Deduplicated)

**Date:** 2026-03-19
**Current State:** ~1,492 command strings (43 duplicates → ~1,449 unique) + 124 signal events
**Method:** 6 parallel agents audited every public method in every major Ardour header file against existing dawflow_commands_*.cc files

---

## TIER 1: CRITICAL (AI must have these) — ~95 commands

### 1.1 Session Lifecycle & File Operations (22)
- daw.session.save_as(snapshot_name) — Save session snapshot
- daw.session.save_template(name, description) — Save as reusable template
- daw.session.wipe() — Reset session to empty
- daw.session.import_files(paths, track_id, position) — Import audio/MIDI files
- daw.session.remove_last_capture() — Delete last recording
- daw.session.cleanup_sources() — Remove unused sources/files
- daw.session.cleanup_regions() — Remove unused regions
- daw.session.cleanup_peakfiles() — Delete orphaned peak files
- daw.session.freeze_all() — Freeze all tracks to audio
- daw.session.midi_panic() — Send all-notes-off to all MIDI
- daw.session.set_all_tracks_record_enabled(bool) — Arm/disarm all tracks
- daw.session.request_count_in_record() — Record with count-in
- daw.session.request_play_range(start, end, loop) — Play time range
- daw.session.cancel_play_range() — Cancel play range
- daw.session.set_session_extents(start, end) — Set session start/end
- daw.session.set_range_selection(start, end) — Select time range
- daw.session.cut_copy_section(start, end, to, op) — Cut/copy time section
- daw.session.deinterlace_midi_region(region_id) — Split interleaved MIDI
- daw.session.globally_add_internal_sends(route_id, placement) — Add sends to all routes
- daw.session.globally_set_send_gains_to_zero(bus_id) — Mute all sends to bus
- daw.session.globally_set_send_gains_to_unity(bus_id) — Set all sends to 0dB
- daw.session.apply_mixer_scene(index) — Apply mixer scene by index

### 1.2 Track Freeze/Bounce (6)
- daw.track.freeze(track_id) — Freeze track to audio
- daw.track.unfreeze(track_id) — Unfreeze track
- daw.track.get_freeze_state(track_id) — Check freeze status
- daw.track.bounce(track_id, name) — Bounce entire track
- daw.track.bounce_range(track_id, start, end, name) — Bounce selection
- daw.track.bounceable(track_id) — Check if bounce is possible

### 1.3 Playlist Management (6)
- daw.track.use_playlist(track_id, playlist_id) — Switch playlist
- daw.track.use_copy_playlist(track_id) — Duplicate current playlist
- daw.track.use_new_playlist(track_id) — Create fresh empty playlist
- daw.track.find_and_use_playlist(track_id, playlist_id) — Load saved playlist
- daw.playlist.get_extent(track_id) — Get total duration
- daw.playlist.remove_gaps(track_id, threshold, leave_gap) — Remove silence

### 1.4 Region Editing (Advanced) (25)
- daw.region.trim_front(region_id, new_pos) — Trim start boundary
- daw.region.trim_end(region_id, new_pos) — Trim end boundary
- daw.region.trim_to(region_id, pos, length) — Set exact bounds
- daw.region.cut_front(region_id, new_pos) — Cut from start
- daw.region.cut_end(region_id, new_pos) — Cut from end
- daw.region.nudge_position(region_id, distance) — Small position nudge
- daw.region.move_to_natural_position(region_id) — Move to natural sync pos
- daw.region.set_sync_position(region_id, pos) — Set sync point
- daw.region.clear_sync_position(region_id) — Remove sync point
- daw.region.set_muted(region_id, bool) — Mute region
- daw.region.set_locked(region_id, bool) — Lock region edits
- daw.region.set_opaque(region_id, bool) — Set opacity/blend
- daw.region.raise(region_id) — Move up one layer
- daw.region.lower(region_id) — Move down one layer
- daw.region.raise_to_top(region_id) — Move to top layer
- daw.region.lower_to_bottom(region_id) — Move to bottom layer
- daw.audio_region.normalize(region_id, target_db) — Normalize audio
- daw.audio_region.set_scale_amplitude(region_id, gain) — Set gain
- daw.audio_region.set_fade_in(region_id, shape, length) — Configure fade in
- daw.audio_region.set_fade_out(region_id, shape, length) — Configure fade out
- daw.audio_region.set_fade_in_active(region_id, bool) — Enable fade in
- daw.audio_region.set_fade_out_active(region_id, bool) — Enable fade out
- daw.audio_region.set_envelope_active(region_id, bool) — Enable envelope
- daw.audio_region.get_rms(region_id) — Get RMS level
- daw.audio_region.get_loudness(region_id) — Get loudness metrics

### 1.5 MIDI Model Editing (14)
- daw.midi.new_note_diff_command(region_id, name) — Create note edit batch
- daw.midi.apply_diff_command(region_id, command_id) — Apply batch edit
- daw.midi.new_sysex_diff_command(region_id, name) — Create SysEx batch
- daw.midi.new_patch_change_diff_command(region_id, name) — Create patch batch
- daw.midi.find_note(region_id, note_id) — Locate note in model
- daw.midi.find_patch_change(region_id, event_id) — Find patch change
- daw.midi.insert_silence_at_start(region_id, duration) — Add silence
- daw.midi_region.merge(region_id, other_id) — Merge MIDI regions
- daw.midi_region.separate_by_channel(region_id) — Split by channel
- daw.midi_source.set_automation_state(source_id, param, state) — CC automation mode
- daw.midi_source.set_interpolation(source_id, param, style) — CC curve type
- daw.midi_source.get_automation_state(source_id, param) — Get CC mode
- daw.midi_source.get_interpolation(source_id, param) — Get CC style
- daw.midi_track.set_note_mode(track_id, mode) — Sustained vs percussive

### 1.6 Plugin Configuration (Advanced) (16)
- daw.plugin.reset_parameters_to_default(track_id, plugin_id) — Reset all params
- daw.plugin.set_strict_io(track_id, plugin_id, bool) — Strict channel matching
- daw.plugin.set_custom_cfg(track_id, plugin_id, bool) — Custom I/O mode
- daw.plugin.set_count(track_id, plugin_id, count) — Parallel instances
- daw.plugin.set_input_map(track_id, plugin_id, mapping) — Input routing
- daw.plugin.set_output_map(track_id, plugin_id, mapping) — Output routing
- daw.plugin.get_timing_stats(track_id, plugin_id) — CPU timing stats
- daw.plugin.clear_timing_stats(track_id, plugin_id) — Clear stats
- daw.plugin.save_preset(track_id, plugin_id, name) — Create new preset
- daw.plugin.remove_preset(track_id, plugin_id, name) — Delete preset
- daw.plugin.clear_preset(track_id, plugin_id) — Clear active preset
- daw.plugin.get_parameter_descriptor(track_id, plugin_id, param) — Detailed param info
- daw.plugin.get_scale_points(track_id, plugin_id, param) — Enum points
- daw.plugin.get_docs(track_id, plugin_id) — Plugin documentation
- daw.route.customize_plugin_io(track_id, plugin_id, in, out) — Configure I/O
- daw.route.reset_plugin_io(track_id, plugin_id) — Reset I/O to defaults

---

## TIER 2: HIGH PRIORITY (Important for full DAW control) — ~110 commands

### 2.1 Audio Engine & Backend (25)
- daw.engine.discover_backends() — List available backends
- daw.engine.set_backend(name) — Switch audio backend
- daw.engine.get_current_backend() — Get active backend name
- daw.engine.is_jack() — Check if JACK backend
- daw.engine.freewheeling() — Check freewheel state
- daw.engine.running() — Check if engine running
- daw.engine.launch_device_control_app() — Launch device control
- daw.engine.request_backend_reset() — Request hardware reset
- daw.engine.request_device_list_update() — Refresh device list
- daw.backend.enumerate_drivers() — List available drivers
- daw.backend.set_driver(name) — Set driver
- daw.backend.enumerate_input_devices() — List input devices
- daw.backend.enumerate_output_devices() — List output devices
- daw.backend.set_input_device(name) — Set input device
- daw.backend.set_output_device(name) — Set output device
- daw.backend.default_sample_rate() — Get default sample rate
- daw.backend.default_buffer_size(device) — Get default buffer size
- daw.backend.set_use_buffered_io(bool) — Enable buffered I/O
- daw.backend.get_use_buffered_io() — Get buffered I/O state
- daw.backend.drop_device() — Deinitialize device
- daw.backend.reset_device() — Reset device
- daw.engine.prepare_latency_measurement() — Setup latency test
- daw.engine.start_latency_detection(bool) — Start/stop detection
- daw.engine.stop_latency_detection() — Stop detection
- daw.engine.get_latency_signal_delay() — Get measured latency

### 2.2 Port Management (20)
- daw.port.list_all() — List all registered ports
- daw.port.register_input(type, name) — Create input port
- daw.port.register_output(type, name) — Create output port
- daw.port.unregister(name) — Delete port
- daw.port.connect(source, dest) — Connect two ports
- daw.port.disconnect(source, dest) — Disconnect two ports
- daw.port.disconnect_all(name) — Disconnect all from port
- daw.port.get_connections(name) — List connections
- daw.port.connected_to(name, other) — Check specific connection
- daw.port.physically_connected(name) — Check physical connection
- daw.port.set_pretty_name(name, pretty) — Set display name
- daw.port.get_pretty_name(name) — Get display name
- daw.port.get_physical_outputs(type) — List physical outputs
- daw.port.get_physical_inputs(type) — List physical inputs
- daw.port.n_physical_outputs() — Physical output count
- daw.port.n_physical_inputs() — Physical input count
- daw.port.request_input_monitoring(name, bool) — Toggle monitoring
- daw.port.get_midi_ports(for_input) — List configurable MIDI
- daw.port.add_midi_flags(name, flags) — Add MIDI port flags
- daw.port.remove_midi_flags(name, flags) — Remove MIDI port flags

### 2.3 Transport Master/Slave (15)
- daw.transport_master.list_all() — List all transport masters
- daw.transport_master.get_current() — Get active master
- daw.transport_master.set_current_by_type(type) — Set by type (MTC/LTC/MIDIClock)
- daw.transport_master.set_current_by_name(name) — Set by name
- daw.transport_master.add(type, name) — Add new master
- daw.transport_master.remove(name) — Remove master
- daw.transport_master.get_type(name) — Get master type
- daw.transport_master.locked(name) — Check if synced
- daw.transport_master.get_delta(name) — Get time delta
- daw.transport_master.get_position(name) — Get master position
- daw.transport_master.set_collect(name, bool) — Enable/disable collection
- daw.transport_master.set_request_mask(name, mask) — Set allowed requests
- daw.transport_master.set_sample_clock_synced(name, bool) — Sample-clock sync
- daw.transport_master.suspend_timecode() — Disable timecode output
- daw.transport_master.resume_timecode() — Re-enable timecode output

### 2.4 Monitor Processor (18)
- daw.monitor.set_cut_all(bool) — Mute all outputs
- daw.monitor.set_dim_all(bool) — Dim all outputs
- daw.monitor.set_mono(bool) — Mono mixdown
- daw.monitor.set_cut(channel, bool) — Mute specific channel
- daw.monitor.set_dim(channel, bool) — Dim specific channel
- daw.monitor.set_solo(channel, bool) — Solo specific channel
- daw.monitor.set_polarity(channel, bool) — Invert polarity
- daw.monitor.get_cut_all() — Query cut-all state
- daw.monitor.get_dim_all() — Query dim-all state
- daw.monitor.get_mono() — Query mono state
- daw.monitor.get_cut(channel) — Query channel cut
- daw.monitor.get_dim(channel) — Query channel dim
- daw.monitor.get_solo(channel) — Query channel solo
- daw.monitor.get_polarity(channel) — Query channel polarity
- daw.monitor.get_dim_level() — Get dim level dB
- daw.monitor.get_solo_boost_level() — Get solo boost dB
- daw.monitor.is_active() — Check if monitoring active
- daw.session.reset_monitor_section() — Reinitialize monitor bus

### 2.5 Location/Marker Flags (16)
- daw.location.lock(id) — Lock marker position
- daw.location.unlock(id) — Unlock marker position
- daw.location.set_hidden(id, bool) — Hide from view
- daw.location.set_cd(id, bool) — Mark as CD marker
- daw.location.set_cue(id, bool) — Mark as cue marker
- daw.location.set_is_range(id, bool) — Mark as range
- daw.location.set_skip(id, bool) — Mark for skip
- daw.location.set_section(id, bool) — Mark as section
- daw.location.set_cue_id(id, cue_id) — Set cue ID
- daw.location.set_scene_change(id, scene_data) — Attach scene change
- daw.location.set_auto_punch(id, bool) — Set auto-punch behavior
- daw.location.set_auto_loop(id, bool) — Set auto-loop behavior
- daw.locations.clear_cue_markers(start, end) — Remove cue markers in range
- daw.locations.clear_scene_markers(start, end) — Remove scene markers in range
- daw.locations.cut_copy_section(start, end, to, op) — Section operations
- daw.location.set_time_domain(id, domain) — Set beat vs sample domain

### 2.6 Automation Write Passes (10)
- daw.automation.start_touch(track_id, control, when) — Begin touch
- daw.automation.stop_touch(track_id, control, when) — End touch
- daw.automation.start_write_pass(track_id, control, when) — Begin writing
- daw.automation.write_pass_finished(track_id, control, when) — End writing
- daw.automation.writable(track_id, control) — Check if can write
- daw.automation.internal_to_interface(track_id, control, value) — Convert value
- daw.automation.interface_to_internal(track_id, control, value) — Convert value
- daw.automation.get_user_string(track_id, control) — Human-readable value
- daw.automation.get_grouped_controls(track_id, control) — Get linked controls
- daw.automation.commit_transaction(track_id, control) — Commit undo

### 2.7 VCA Control (6)
- daw.vca.assign(vca_id, target_vca_id) — Assign VCA to control another
- daw.vca.slaved_to(vca_id, other_id) — Check if slaved to specific
- daw.vca.slaved(vca_id) — Check if slaved to any
- daw.vca.soloed(vca_id) — Check if soloed
- daw.vca.clear_all_solo_state(vca_id) — Clear solo
- daw.vca.get_controls(vca_id) — Get gain/solo/mute controls

---

## TIER 3: MEDIUM PRIORITY (Full coverage) — ~130 commands

### 3.1 Export System (40)
- daw.export.create_profile() — Create new export profile
- daw.export.load_preset(name) — Load export preset
- daw.export.save_preset(name) — Save export preset
- daw.export.remove_preset(name) — Delete preset
- daw.export.set_format_name(name) — Name export format
- daw.export.set_format_type(type) — Set format type (WAV/FLAC/MP3/etc)
- daw.export.set_sample_rate(rate) — Set export sample rate
- daw.export.set_bit_depth(depth) — Set bit depth
- daw.export.set_dither_type(type) — Set dither algorithm
- daw.export.set_src_quality(quality) — Sample rate conversion quality
- daw.export.set_codec_quality(quality) — Codec quality
- daw.export.set_normalize(bool) — Enable normalization
- daw.export.set_normalize_loudness(bool) — Enable loudness norm
- daw.export.set_normalize_dbfs(value) — Set dBFS target
- daw.export.set_normalize_lufs(value) — Set LUFS target
- daw.export.set_normalize_dbtp(value) — Set dBTP target
- daw.export.set_tp_limiter(bool) — Enable true peak limiter
- daw.export.set_trim_beginning(bool) — Trim silence start
- daw.export.set_trim_end(bool) — Trim silence end
- daw.export.set_silence_beginning(time) — Add silence start
- daw.export.set_silence_end(time) — Add silence end
- daw.export.set_tagging(bool) — Enable metadata tagging
- daw.export.set_with_cue(bool) — Generate CUE sheet
- daw.export.set_with_toc(bool) — Generate TOC sheet
- daw.export.set_with_mp4chaps(bool) — Generate MP4 chapters
- daw.export.set_analyse(bool) — Enable analysis pass
- daw.export.set_reimport(bool) — Reimport after export
- daw.export.set_post_export_command(cmd) — Post-export shell command
- daw.export.set_timespan(start, end, name) — Set export range
- daw.export.set_timespan_realtime(bool) — Realtime export
- daw.export.set_filename_label(label) — Set filename label
- daw.export.set_filename_folder(path) — Set export directory
- daw.export.set_filename_revision(num) — Set revision number
- daw.export.set_channel_split(bool) — Split to mono
- daw.export.add_channel_config(name) — Add channel config
- daw.export.get_warnings() — Get validation warnings
- daw.export.get_sample_filename(format) — Preview filename
- daw.export.prepare() — Validate and prepare
- daw.export.execute() — Run export
- daw.export.abort() — Abort current export

### 3.2 Plugin Manager (25)
- daw.plugin_manager.refresh(cache_only) — Rescan plugins
- daw.plugin_manager.cancel_scan() — Cancel plugin scan
- daw.plugin_manager.get_scan_log() — Get scan errors
- daw.plugin_manager.clear_stale_log() — Clear old logs
- daw.plugin_manager.get_plugins_by_type(type) — Get by type (VST3/AU/LV2/etc)
- daw.plugin_manager.whitelist(type, id) — Add to whitelist
- daw.plugin_manager.blacklist(type, id) — Add to blacklist
- daw.plugin_manager.rescan_plugin(type, id) — Re-scan one plugin
- daw.plugin_manager.rescan_faulty() — Re-scan failed plugins
- daw.plugin_manager.get_status(type, id) — Get favorite/hidden status
- daw.plugin_manager.set_status(type, id, status) — Set status
- daw.plugin_manager.get_stats(type, id) — Get usage stats
- daw.plugin_manager.reset_stats() — Clear all stats
- daw.plugin_manager.clear_vst_cache() — Clear VST cache
- daw.plugin_manager.clear_vst_blacklist() — Clear VST blacklist
- daw.plugin_manager.clear_au_cache() — Clear AU cache
- daw.plugin_manager.clear_au_blacklist() — Clear AU blacklist
- daw.plugin_manager.clear_vst3_cache() — Clear VST3 cache
- daw.plugin_manager.clear_vst3_blacklist() — Clear VST3 blacklist
- daw.plugin_manager.cache_valid() — Check cache freshness
- daw.plugin_manager.save_tags() — Persist plugin tags
- daw.plugin_manager.save_statuses() — Persist statuses
- daw.plugin_manager.dump_untagged() — Export untagged list
- daw.plugin_manager.get_type_name(type) — Human-readable type
- daw.plugin_manager.get_default_vst_path() — Get default VST path

### 3.3 Track Advanced Controls (20)
- daw.track.request_input_monitoring(track_id, bool) — Soft input monitoring
- daw.track.ensure_input_monitoring(track_id, bool) — Hard input monitoring
- daw.track.playback_buffer_load(track_id) — Disk playback buffer %
- daw.track.capture_buffer_load(track_id) — Disk capture buffer %
- daw.track.set_align_style(track_id, style) — Capture alignment
- daw.track.set_align_choice(track_id, choice) — Timing mode
- daw.midi_track.midi_panic(track_id) — All notes off
- daw.midi_track.write_immediate_event(track_id, data) — Queue MIDI event
- daw.midi_track.set_chase_notes(track_id, bool) — Chase during playback
- daw.midi_track.set_step_editing(track_id, bool) — Step entry mode
- daw.midi_track.set_capture_channel_mode(track_id, mode, mask) — Filter input
- daw.midi_track.set_playback_channel_mode(track_id, mode, mask) — Filter output
- daw.midi_track.set_input_active(track_id, bool) — Toggle input
- daw.route.set_meter_point(track_id, point) — Move meter position
- daw.route.set_meter_type(track_id, type) — Change meter type
- daw.route.set_denormal_protection(track_id, bool) — Denormal protection
- daw.route.get_monitoring_state(track_id) — Get monitoring mode
- daw.route.feeds(track_id, other_id) — Check if feeds another
- daw.route.signal_sources(track_id) — Get upstream routes
- daw.route.output_effectively_connected(track_id) — Check output used

### 3.4 Send/Return Configuration (12)
- daw.route.add_aux_send(track_id, target_id, placement) — Create aux send
- daw.route.add_foldback_send(track_id, target_id) — Create foldback
- daw.route.get_internal_send(track_id, target_id) — Get send to route
- daw.route.enable_monitor_send(track_id) — Create monitor send
- daw.route.enable_surround_send(track_id) — Create surround output
- daw.send.set_panner_linked(track_id, send_id, bool) — Link panner
- daw.send.set_remove_on_disconnect(track_id, send_id, bool) — Auto-remove
- daw.route.add_sidechain(track_id, plugin_id) — Add sidechain
- daw.route.remove_sidechain(track_id, plugin_id) — Remove sidechain
- daw.internal_send.set_allow_feedback(track_id, send_id, bool) — Allow feedback
- daw.delivery.set_analysis_active(track_id, bool) — Enable RTA
- daw.route.get_latency(track_id) — Get total signal latency

### 3.5 Trigger/Clip Advanced (35)
- daw.trigger.set_follow_action0(track_id, slot, action) — First follow action
- daw.trigger.set_follow_action1(track_id, slot, action) — Second follow action
- daw.trigger.set_follow_probability(track_id, slot, pct) — Follow probability
- daw.trigger.set_follow_length(track_id, slot, beats) — Custom follow length
- daw.trigger.set_use_follow_length(track_id, slot, bool) — Enable follow length
- daw.trigger.set_legato(track_id, slot, bool) — Legato mode
- daw.trigger.set_velocity_effect(track_id, slot, float) — Velocity response
- daw.trigger.set_stretchable(track_id, slot, bool) — Time-stretching
- daw.trigger.set_allow_patch_changes(track_id, slot, bool) — MIDI patches
- daw.trigger.set_cue_isolated(track_id, slot, bool) — Cue isolation
- daw.trigger.request_stop(track_id, slot) — Stop immediately
- daw.trigger.stop_quantized(track_id, slot) — Stop at quantize
- daw.trigger.clear_region(track_id, slot) — Clear loaded region
- daw.trigger.get_position(track_id, slot) — Current playback pos
- daw.trigger.get_position_fraction(track_id, slot) — Position 0.0-1.0
- daw.audio_trigger.set_segment_tempo(track_id, slot, bpm) — Clip tempo
- daw.audio_trigger.get_segment_beatcnt(track_id, slot) — Beat count
- daw.audio_trigger.set_segment_beatcnt(track_id, slot, count) — Set beats
- daw.midi_trigger.set_patch_change(track_id, slot, channel, patch) — MIDI patch
- daw.midi_trigger.unset_patch_change(track_id, slot, channel) — Clear patch
- daw.midi_trigger.unset_all_patch_changes(track_id, slot) — Clear all
- daw.midi_trigger.get_used_channels(track_id, slot) — Used channels
- daw.midi_trigger.set_channel_map(track_id, slot, from, to) — Remap channel
- daw.triggerbox.set_record_enabled(track_id, bool) — Enable recording
- daw.triggerbox.get_record_enabled(track_id) — Query recording
- daw.triggerbox.clear_all(track_id) — Clear all slots
- daw.triggerbox.stop_all_immediately(track_id) — Stop all NOW
- daw.triggerbox.begin_midi_learn(track_id, slot) — Start MIDI learn
- daw.triggerbox.midi_unlearn(track_id, slot) — Forget MIDI binding
- daw.triggerbox.stop_midi_learn(track_id) — Stop learning
- daw.triggerbox.set_midi_map_mode(mode) — Set mapping mode
- daw.triggerbox.set_first_midi_note(note) — Set first note
- daw.triggerbox.get_midi_map_mode() — Get mapping mode
- daw.triggerbox.get_first_midi_note() — Get first note
- daw.triggerbox.disarm_all(track_id) — Disarm all slots

---

## TIER 4: LOWER PRIORITY (Niche/completeness) — ~100 commands

### 4.1 Surround/Atmos (13)
- daw.surround_send.get_gain_control(track_id) — Get gain
- daw.surround_send.get_pannable(track_id, index) — Get pannable channel
- daw.surround_send.n_pannables(track_id) — Number of channels
- daw.surround_send.set_delay_in(track_id, samples) — Input delay
- daw.surround_send.set_delay_out(track_id, samples, bus) — Output delay
- daw.surround_return.load_au_preset(index) — Load AU preset
- daw.surround_return.set_au_param(index, value) — Set AU param
- daw.surround_return.have_au_renderer() — Check AU available
- daw.surround_pannable.set_automation_state(track_id, state) — Automation mode
- daw.surround_pannable.get_automation_state(track_id) — Get mode
- daw.surround_pannable.touching(track_id) — Is being touched
- daw.surround_pannable.sync_visual_link(track_id) — Sync visual link
- daw.surround_pannable.setup_visual_links(track_id) — Setup links

### 4.2 Source/Cue Markers (14)
- daw.source.add_cue_marker(source_id, name, position) — Add cue point
- daw.source.remove_cue_marker(source_id, position) — Remove cue point
- daw.source.move_cue_marker(source_id, old_pos, new_pos) — Move cue
- daw.source.rename_cue_marker(source_id, position, name) — Rename cue
- daw.source.clear_cue_markers(source_id) — Remove all cues
- daw.source.get_cue_markers(source_id) — List all cues
- daw.source.load_transients(source_id) — Load transient file
- daw.source.has_been_analysed(source_id) — Check if analyzed
- daw.source.mark_for_remove(source_id) — Schedule deletion
- daw.source.set_take_id(source_id, name) — Label take
- daw.source.get_take_id(source_id) — Get take label
- daw.audio_source.estimate_tempo(source_id) — Auto-detect BPM
- daw.audio_source.build_peaks(source_id) — Analyze/cache peaks
- daw.source.get_segment_descriptor(source_id, range) — Get metadata

### 4.3 Bundle/IO Routing (15)
- daw.bundle.list_all() — List all bundles
- daw.bundle.create(name, type, direction) — Create bundle
- daw.bundle.add_channel(bundle_id, name, type) — Add channel
- daw.bundle.remove_channel(bundle_id, index) — Remove channel
- daw.bundle.add_port(bundle_id, channel, port_name) — Add port
- daw.bundle.remove_port(bundle_id, channel, port_name) — Remove port
- daw.bundle.connect(bundle_id, other_id) — Connect bundles
- daw.bundle.disconnect(bundle_id, other_id) — Disconnect bundles
- daw.bundle.connected_to(bundle_id, other_id) — Check connection
- daw.io.connect_to_bundle(track_id, bundle_id, input) — Route to bundle
- daw.io.disconnect_from_bundle(track_id, bundle_id, input) — Disconnect
- daw.io.get_bundles_connected(track_id, input) — List connected
- daw.io.add_port(track_id, type, input) — Add I/O port
- daw.io.remove_port(track_id, port_name, input) — Remove I/O port
- daw.io.get_latency(track_id, input) — Get I/O latency

### 4.4 Selection System (12)
- daw.selection.select_track(track_id, op) — Select track
- daw.selection.select_next_track(mixer_order) — Next track
- daw.selection.select_prev_track(mixer_order) — Previous track
- daw.selection.clear_tracks() — Clear track selection
- daw.selection.get_selected_tracks() — Get selected tracks
- daw.selection.is_selected(track_id) — Check if selected
- daw.selection.get_first_selected() — Get first selected
- daw.selection.get_time_range() — Get selected time range
- daw.editor.jump_forward_to_mark() — Jump to next marker
- daw.editor.jump_backward_to_mark() — Jump to prev marker
- daw.editor.goto_nth_marker(n) — Jump to marker N
- daw.editor.trigger_script(n) — Execute editor script

### 4.5 Lua Script Integration (12)
- daw.lua.register_function(name, script) — Register Lua script
- daw.lua.unregister_function(name) — Unload script
- daw.lua.list_functions() — List registered scripts
- daw.lua.execute(name, args) — Run registered script
- daw.lua.new_plugin(name) — Create Lua processor
- daw.lua.set_processor_param(proc, param, value) — Set Lua param
- daw.lua.get_processor_param(proc, param) — Get Lua param
- daw.lua.reset_processor(proc) — Reset Lua to defaults
- daw.lua.list_plugins() — List Lua plugins
- daw.lua.new_send(track_id, target_id) — Create send via Lua
- daw.lua.plugin_automation(track_id, plugin_id) — Get automation
- daw.session.load_io_plugin(name) — Load I/O plugin

### 4.6 Playlist Analysis (8)
- daw.playlist.all_regions_empty(track_id) — Check if empty
- daw.playlist.top_layer(track_id) — Get highest z-order
- daw.playlist.region_use_count(track_id, region_id) — Count duplicates
- daw.playlist.region_is_audible(track_id, region_id, pos) — Audibility
- daw.playlist.find_next_boundary(track_id, pos, dir) — Find edge
- daw.playlist.find_prev_region_start(track_id, pos) — Find prev start
- daw.playlist.partition(track_id, start, end, cut) — Split at boundaries
- daw.playlist.fade_range(track_id, ranges) — Apply fades

### 4.7 Phase/Polarity Control (6)
- daw.phase.set_invert(track_id, channel, bool) — Invert channel
- daw.phase.get_inverted(track_id, channel) — Query inversion
- daw.phase.set_all(track_id, bitset) — Batch set
- daw.phase.any_inverted(track_id) — Any channel inverted
- daw.phase.none_inverted(track_id) — No channels inverted
- daw.phase.resize(track_id, channels) — Resize mask

### 4.8 Butler/Disk I/O (6)
- daw.butler.get_capture_buffer_size() — Capture buffer size
- daw.butler.get_playback_buffer_size() — Playback buffer size
- daw.butler.get_midi_buffer_size() — MIDI buffer size
- daw.butler.schedule_transport_work() — Schedule work
- daw.butler.wait_until_finished() — Wait for completion
- daw.butler.summon() — Wake up butler thread

### 4.9 Editor Operations (14)
- daw.editor.new_region_from_selection() — Region from selection
- daw.editor.separate_region_from_selection() — Split at selection
- daw.editor.reverse_region() — Reverse selected
- daw.editor.normalize_region() — Normalize selected
- daw.editor.pitch_shift_region() — Pitch shift
- daw.editor.play_selection() — Play selection
- daw.editor.play_with_preroll() — Play with preroll
- daw.editor.rec_with_preroll() — Record with preroll
- daw.editor.rec_with_count_in() — Record with count-in
- daw.editor.set_loop_range(start, end) — Set loop region
- daw.editor.set_punch_range(start, end) — Set punch region
- daw.editor.add_location_at_playhead() — Add marker at playhead
- daw.editor.remove_location_at_playhead() — Remove marker at playhead
- daw.editor.add_section_at_playhead() — Add section at playhead

---

## GRAND TOTAL

| Tier | Count | Description |
|------|-------|-------------|
| T1 Critical | ~95 | AI must have for core operations |
| T2 High | ~110 | Important for full DAW control |
| T3 Medium | ~130 | Full coverage for professional use |
| T4 Lower | ~100 | Niche/completeness |
| **TOTAL** | **~435** | **New commands to implement** |

**After implementation:** ~1,449 existing + ~435 new = **~1,884 unique commands** + 124 signal events = **~2,008 total IPC items**

---

## Existing Duplicates to Clean Up (43)

These commands are registered in multiple files (usually safety wrappers duplicating originals):
- daw.undo (4x), daw.redo (4x)
- daw.transport_play/stop/locate (3x each)
- daw.get_session_info/tracks/transport_state (3x each)
- daw.set_track_gain/mute/solo (3x each)
- daw.get_regions/markers (3x/2x)
- Plus ~20 more (see full list above)

Recommend: remove duplicates from dawflow_commands_safety.cc since the originals handle these.
