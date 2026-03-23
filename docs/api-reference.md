# DAWFLOW IPC API Reference

> **2110 unique commands + 122 signal events = 2232 total** registered across 29 source files, 0 duplicates. All commands use JSON-RPC 2.0 over Unix domain socket IPC.
>
> **Request format:** `{"jsonrpc": "2.0", "id": 1, "method": "daw.xxx", "params": {...}}`
>
> **Response format:** `{"jsonrpc": "2.0", "id": 1, "result": {...}}` or `{"jsonrpc": "2.0", "id": 1, "error": {"code": -32603, "message": "..."}}`
>
> **Socket path:** `/tmp/dawflow-<pid>.sock`
>
> **Async commands** (marked "queued") return `{"success": true, "status": "queued"}` immediately; the operation executes on the GTK main thread.
>
> **Source files:** `dawflow_plugin_host.cc`, `dawflow_plugin_host_extended.cc`, `dawflow_commands_editing.cc`, `dawflow_commands_automation.cc`, `dawflow_commands_critical.cc`, `dawflow_commands_high.cc`, `dawflow_commands_medium.cc`, `dawflow_commands_final.cc`, `dawflow_commands_engine_deep.cc`, `dawflow_commands_analysis.cc`, `dawflow_commands_advanced_editing.cc`, `dawflow_commands_session_deep.cc`, `dawflow_commands_safety.cc`, `dawflow_commands_simulate.cc`, `dawflow_commands_triggers.cc`, `dawflow_commands_complete.cc`, `dawflow_commands_sidechain.cc`, `dawflow_commands_routing_ext.cc`, `dawflow_commands_mastering.cc`, `dawflow_commands_tier1.cc`, `dawflow_commands_tier2.cc`, `dawflow_commands_tier3.cc`, `dawflow_commands_tier4.cc`, `dawflow_commands_final_coverage.cc`

---

## Table of Contents

1. [Session Management](#session-management)
2. [Transport](#transport)
3. [Recording](#recording)
4. [Track Management](#track-management)
5. [Track Properties](#track-properties)
6. [Region Editing](#region-editing)
7. [Region Properties](#region-properties)
8. [Region Audio Analysis](#region-audio-analysis)
9. [MIDI Editing (Legacy)](#midi-editing-legacy)
10. [MIDI Editing (By Note ID)](#midi-editing-by-note-id)
11. [MIDI CC & Program Changes](#midi-cc--program-changes)
12. [MIDI Transformations](#midi-transformations)
13. [Plugin Management](#plugin-management)
14. [Plugin Parameters & Presets](#plugin-parameters--presets)
15. [Plugin Search](#plugin-search)
16. [Automation](#automation)
17. [Metering](#metering)
18. [Markers & Locations](#markers--locations)
19. [Tempo & Time Signature](#tempo--time-signature)
20. [Time Conversion](#time-conversion)
21. [Routing & I/O](#routing--io)
22. [Sends](#sends)
23. [Groups & VCA](#groups--vca)
24. [Selection](#selection)
25. [Arrangement (Sections)](#arrangement-sections)
26. [Export & Import](#export--import)
27. [Snapshots & Templates](#snapshots--templates)
28. [Navigation & Playhead](#navigation--playhead)
29. [View & Zoom](#view--zoom)
30. [Metronome](#metronome)
31. [Playlists](#playlists)
32. [Audio Device & Backend](#audio-device--backend)
33. [Monitor Section](#monitor-section)
34. [Latency](#latency)
35. [Batch & Utilities](#batch--utilities)
36. [DSP Graph & Routing](#dsp-graph--routing)
37. [Port Management](#port-management)
38. [Engine State](#engine-state)
39. [Audio Sources & Buffers](#audio-sources--buffers)
40. [Resource Monitoring](#resource-monitoring)
41. [Freewheel & Bounce](#freewheel--bounce)
42. [Latency Management](#latency-management)
43. [Audio Analysis - Metering](#audio-analysis---metering)
44. [Audio Analysis - Loudness](#audio-analysis---loudness)
45. [Audio Analysis - Spectral](#audio-analysis---spectral)
46. [Audio Analysis - Transients & Rhythm](#audio-analysis---transients--rhythm)
47. [Audio Analysis - Pitch](#audio-analysis---pitch)
48. [Audio Analysis - Waveform](#audio-analysis---waveform)
49. [Audio Analysis - Plugin Chain](#audio-analysis---plugin-chain)
50. [Audio Analysis - Comparison](#audio-analysis---comparison)
51. [Advanced Region Editing](#advanced-region-editing)
52. [Snap & Grid](#snap--grid)
53. [Edit Modes & Tools](#edit-modes--tools)
54. [MIDI Learn & Mapping](#midi-learn--mapping)
55. [MIDI Scene Changes](#midi-scene-changes)
56. [Advanced Playlists](#advanced-playlists)
57. [Advanced Selection](#advanced-selection)
58. [Audition](#audition)
59. [Session XML & State](#session-xml--state)
60. [Plugin State Serialization](#plugin-state-serialization)
61. [Configuration Access](#configuration-access)
62. [Route & Session Templates](#route--session-templates)
63. [Deep Undo/Redo](#deep-undoredo)
64. [Environment & System](#environment--system)
65. [Session Files](#session-files)
66. [Sync & Timecode](#sync--timecode)
67. [Safety: Command Metadata](#safety-command-metadata)
68. [Safety: Transactional Execution](#safety-transactional-execution)
69. [Safety: Invariant Guards](#safety-invariant-guards)
70. [Simulation: Region](#simulation-region)
71. [Simulation: Track](#simulation-track)
72. [Simulation: Routing](#simulation-routing)
73. [Simulation: Export](#simulation-export)
74. [Simulation: Session](#simulation-session)
75. [Trigger/Clip Launcher](#triggerclip-launcher)
76. [Mixer Scenes](#mixer-scenes)
77. [Region FX](#region-fx)
78. [Lua Scripting](#lua-scripting)
79. [Editor State](#editor-state)
80. [IO Plugins](#io-plugins)
81. [Solo Controls](#solo-controls)
82. [Recording Modes](#recording-modes)
83. [Transport Varispeed](#transport-varispeed)
84. [Sync/Timecode](#synctimecode)
85. [Surround Panning](#surround-panning)
86. [Monitor Section (Extended)](#monitor-section-extended)
87. [Foldback/Cue](#foldbackcue)
88. [Route Configuration](#route-configuration)
89. [Session Lifecycle](#session-lifecycle)
90. [Video Sync](#video-sync)
91. [Sidechain Routing](#sidechain-routing)
92. [Input Monitoring](#input-monitoring)
93. [Rec-Safe](#rec-safe)
94. [Processor Ordering](#processor-ordering)
95. [Trim Control](#trim-control)
96. [Phase Control](#phase-control)
97. [Pan Azimuth/Elevation/Width](#pan-azimuth-elevation-width)
98. [Plugin Latency Override](#plugin-latency-override)
99. [Send Configuration](#send-configuration)
100. [Aux Bus Management](#aux-bus-management)
101. [MIDI Clock](#midi-clock)
102. [MTC](#mtc)
103. [LTC](#ltc)
104. [Direct Outputs](#direct-outputs)
105. [Solo Isolate/Safe Extended](#solo-isolatesafe-extended)
106. [Track Templates](#track-templates)
107. [Loop/Range Editing](#looprange-editing)
108. [Internal Routing](#internal-routing)
109. [Auto-Connect](#auto-connect)
110. [Click Track Extended](#click-track-extended)
111. [CD Markers](#cd-markers)
112. [Plugin Macros](#plugin-macros)
113. [Video Sync Extended](#video-sync-extended)
114. [Session Lifecycle (Tier 1)](#session-lifecycle-tier-1)
115. [Track Freeze/Bounce (Tier 1)](#track-freezebounce-tier-1)
116. [Playlist Management (Tier 1)](#playlist-management-tier-1)
117. [Advanced Region Editing (Tier 1)](#advanced-region-editing-tier-1)
118. [MIDI Model (Tier 1)](#midi-model-tier-1)
119. [Plugin Config Advanced (Tier 1)](#plugin-config-advanced-tier-1)
120. [Audio Engine/Backend (Tier 2)](#audio-enginebackend-tier-2)
121. [Port Management Advanced (Tier 2)](#port-management-advanced-tier-2)
122. [Transport Masters (Tier 2)](#transport-masters-tier-2)
123. [Monitor Processor Extended (Tier 2)](#monitor-processor-extended-tier-2)
124. [Location Flags (Tier 2)](#location-flags-tier-2)
125. [Automation Write Passes (Tier 2)](#automation-write-passes-tier-2)
126. [VCA Advanced (Tier 2)](#vca-advanced-tier-2)
127. [Export System (Tier 3)](#export-system-tier-3)
128. [Plugin Manager (Tier 3)](#plugin-manager-tier-3)
129. [Track Advanced Controls (Tier 3)](#track-advanced-controls-tier-3)
130. [Send/Return Config (Tier 3)](#sendreturn-config-tier-3)
131. [Trigger/Clip Advanced (Tier 3)](#triggerclip-advanced-tier-3)
132. [Surround/Atmos (Tier 4)](#surroundatmos-tier-4)
133. [Source/Cue Markers (Tier 4)](#sourcecue-markers-tier-4)
134. [Bundle/IO Routing (Tier 4)](#bundleio-routing-tier-4)
135. [Selection System (Tier 4)](#selection-system-tier-4)
136. [Lua Scripts Extended (Tier 4)](#lua-scripts-extended-tier-4)
137. [Playlist Analysis (Tier 4)](#playlist-analysis-tier-4)
138. [Phase/Polarity Extended (Tier 4)](#phasepolarity-extended-tier-4)
139. [Butler/Disk I/O (Tier 4)](#butlerdisk-io-tier-4)
140. [Editor Operations (Tier 4)](#editor-operations-tier-4)
141. [Editor View Operations (Final)](#editor-view-operations-final)
142. [Editor Data Operations (Final)](#editor-data-operations-final)
143. [Bulk Playlist Operations (Final)](#bulk-playlist-operations-final)
144. [Step Sequencer Final](#step-sequencer-final)
145. [Panner Extended (Final)](#panner-extended-final)
146. [MIDI Patches Extended (Final)](#midi-patches-extended-final)
147. [Analysis Extended (Final)](#analysis-extended-final)
148. [Control Protocol Extended (Final)](#control-protocol-extended-final)
149. [Audiographer Extended (Final)](#audiographer-extended-final)
150. [Events (DAW to Plugin)](#events-daw-to-plugin)

---

## Session Management

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_session_info` | none | `{name, sample_rate, playing, recording, position, dirty}` | Get basic session state |
| `daw.get_session_details` | none | `{name, path, sample_rate, block_size, dirty, playing, recording, position, loop_enabled, track_count, bus_count, undo_depth, redo_depth}` | Comprehensive session info |
| `daw.get_session_properties` | none | `{name, path, sample_rate, frame_rate, dirty, transport_rolling, recording, position_samples, snap_name, record_enabled}` | Extended session properties |
| `daw.get_session_path` | none | `{session_path, session_name, snap_name, sample_rate}` | Session directory and file paths |
| `daw.get_session_length` | none | `{length_samples, length_seconds, sample_rate}` | Session length in samples and seconds |
| `daw.get_session_stats` | none | session statistics | Session statistics overview |
| `daw.save_session` | none | `{success}` | Save current session state |
| `daw.save_session_as` | `{name: string, parent_folder?: string, switch_to?: boolean, copy_media?: boolean}` | `{ok, new_session_path, new_name, switched_to}` | Save session under a new name |
| `daw.snapshot_session` | `{name?: string, switch_to?: boolean}` | `{success, snapshot_name}` | Save session state as a named snapshot |
| `daw.rename_session` | `{name: string}` | `{ok}` | Rename the current session |
| `daw.set_session_dirty` | `{dirty: boolean}` | `{ok}` | Mark session as dirty or clean |
| `daw.close_session` | none | status | Close the current session |
| `daw.new_session` | params | status | Create a new session (stub) |
| `daw.open_session` | params | status | Open an existing session (stub) |
| `daw.get_recent_sessions` | none | `{sessions}` | List recently opened sessions |
| `daw.ping` | none | `{pong, session_name, engine_running}` | Verify connectivity |
| `daw.get_api_version` | none | `{version, engine, based_on}` | Get DAWFLOW API version |
| `daw.list_commands` | none | `{message, approximate_count}` | List available commands |
| `daw.get_command_list` | none | `{commands: string[], count}` | Get sorted list of all registered commands |
| `daw.get_audio_backend_info` | none | `{backend_name, sample_rate, buffer_size, dsp_load_percent, running, physical_inputs, physical_outputs, input_count, output_count}` | Audio backend status and devices |
| `daw.get_engine_info` | none | engine info | Audio engine information |
| `daw.get_sample_rate` | none | `{sample_rate}` | Dedicated sample rate query |

## Transport

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.transport_play` | none | `{ok}` | Start playback |
| `daw.transport_stop` | none | `{ok}` | Stop playback |
| `daw.transport_locate` | `{sample_position: number}` | `{ok}` | Move playhead to sample position |
| `daw.get_transport_state` | none | `{playing, recording, position}` | Get basic transport state |
| `daw.get_transport_state_full` | none | `{playing, recording, record_enabled, position_samples, speed, sample_rate, loop_start?, loop_end?, loop_enabled?, punch_start?, punch_end?, punch_in?, punch_out?, auto_input, auto_play, auto_return, click_enabled}` | Full transport state with loop/punch |
| `daw.get_transport_speed` | none | `{speed, playing}` | Get current transport speed |
| `daw.set_playback_speed` | `{speed: number}` | `{success, speed}` | Set transport speed (0.5=half, 2.0=double) |
| `daw.toggle_loop` | none | `{success, looping}` | Toggle loop playback on/off |
| `daw.set_loop_enabled` | `{enabled: boolean}` | `{success}` | Enable or disable loop playback |
| `daw.set_loop_range` | `{start_sample: number, end_sample: number}` | `{success, start_sample, end_sample}` | Set the auto-loop range |
| `daw.get_loop_range` | none | `{enabled, start_samples, end_samples, length_samples}` | Get loop start/end positions |
| `daw.set_punch_range` | `{start_sample: number, end_sample: number}` | `{success, start_sample, end_sample}` | Set the auto-punch range |
| `daw.get_punch_range` | none | `{punch_in_enabled, punch_out_enabled, start_samples, end_samples, length_samples}` | Get punch start/end positions |
| `daw.set_punch_in` | `{enabled: boolean}` | `{success}` | Enable or disable punch-in |
| `daw.set_punch_out` | `{enabled: boolean}` | `{success}` | Enable or disable punch-out |
| `daw.toggle_punch` | `{punch_in?: boolean, punch_out?: boolean}` | `{ok, punch_in, punch_out, punch_start?, punch_end?}` | Toggle punch recording on/off |
| `daw.set_auto_input` | `{enabled: boolean}` | `{success}` | Enable or disable auto-input monitoring |
| `daw.set_auto_play` | `{enabled: boolean}` | `{success}` | Enable or disable auto-play |
| `daw.set_auto_return` | `{enabled: boolean}` | `{success}` | Enable or disable auto-return |
| `daw.set_follow_edits` | `{enabled: boolean}` | `{success}` | Enable or disable follow-edits mode |
| `daw.transport_goto_start` | none | `{success, position}` | Jump to session start |
| `daw.transport_goto_end` | none | `{success, position}` | Jump to session end |
| `daw.transport_goto_marker` | `{name: string}` | `{success, position}` | Jump to a named marker |
| `daw.transport_forward` | params | result | Fast-forward transport |
| `daw.transport_rewind` | params | result | Rewind transport |
| `daw.transport_play_selection` | none | result | Play the current selection |
| `daw.play_range` | `{start_samples: number, end_samples: number}` | `{ok}` | Play a specific time range |
| `daw.play_region` | `{track_id: string, region_id: string}` | `{ok}` | Play a specific region |

## Recording

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.toggle_record` | none | `{success, recording}` | Toggle session record enable |
| `daw.transport_record` | none | `{ok, recording}` | Start recording immediately (arm + play) |
| `daw.transport_record_with_preroll` | none | result | Start recording with preroll |
| `daw.transport_record_with_count_in` | none | result | Start recording with count-in |
| `daw.record_arm_all` | `{arm?: boolean}` | `{success, armed}` | Arm or disarm all tracks |
| `daw.get_record_state` | none | `{record_enabled, actively_recording, armed_tracks: [{id, name}], armed_count, punch_enabled, punch_in, punch_out, punch_start?, punch_end?, preroll_seconds}` | Detailed record state |
| `daw.set_pre_roll` | `{seconds: number}` | `{ok, preroll_seconds}` | Set pre-roll duration in seconds |
| `daw.set_post_roll` | `{seconds: number}` | `{ok, postroll_seconds, description}` | Set post-roll (via export_preroll) |
| `daw.discard_last_take` | none | `{ok, description}` | Undo last recording take |
| `daw.get_armed_tracks` | none | `{armed_tracks: [{id, name}], count}` | List all record-armed tracks |
| `daw.disarm_all_tracks` | none | `{success, disarmed_count}` | Disarm all tracks |
| `daw.set_capture_mode` | none | `{status: "deprecated"}` | Destructive mode removed in Ardour 7+ |
| `daw.get_last_capture_info` | none | `{status, description, recording}` | Info about last recording (limited) |
| `daw.get_recording_state` | none | `{recording, tracks: [{track_id, capture_start_samples, captured_samples, peaks: [{min,max}]}], position_samples}` | Real-time recording data with live peaks |

## Track Management

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_tracks` | none | `[{id, name, type, gain_db, muted, soloed, record_enabled, color}]` | List all tracks/buses |
| `daw.get_track_details` | `{track_id: string}` | `{id, name, gain_db, muted, soloed, active, comment, color, plugins: [{id, name, enabled, index}]}` | Detailed info for one track |
| `daw.get_track_names` | none | `{tracks: [{id, name, is_track, active, hidden}], count}` | Lightweight track list |
| `daw.get_track_count` | none | `{total, audio_tracks, buses}` | Count of tracks and buses |
| `daw.get_track_type` | `{track_id: string}` | `{track_id, name, type}` | Track type (audio_track, midi_track, bus, master) |
| `daw.add_audio_track` | `{name?: string, channels?: number}` | `{success, status: "queued"}` | Create new audio track (async) |
| `daw.add_midi_track` | `{name?: string}` | `{success, status: "queued"}` | Create new MIDI track (async) |
| `daw.add_bus` | `{name?: string, channels?: number}` | `{success, status: "queued"}` | Create new bus (async) |
| `daw.add_track_with_color` | `{type?: string, name?: string, channels?: number, color?: string}` | `{success, track_id, name}` | Create track/bus with optional color |
| `daw.remove_track` | `{track_id: string}` | `{success, status: "queued"}` | Remove a track (async) |
| `daw.rename_track` | `{track_id: string, name: string}` | `{success, status: "queued"}` | Rename a track (async) |
| `daw.duplicate_track` | `{track_id: string, name?: string}` | `{success, status: "queued"}` | Duplicate a track (async) |

## Track Properties

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_gain` | `{track_id: string, gain_db: number}` | `{ok}` | Set track fader level in dB |
| `daw.set_track_gain_relative` | `{track_id: string, delta_db: number}` | `{ok, previous_db, new_db}` | Adjust gain by delta dB |
| `daw.set_track_mute` | `{track_id: string, muted: boolean}` | `{ok}` | Mute or unmute a track |
| `daw.set_track_solo` | `{track_id: string, soloed: boolean}` | `{ok}` | Solo or unsolo a track |
| `daw.set_track_pan` | `{track_id: string, pan: number}` | `{success, pan}` | Set pan position (0.0=L, 0.5=C, 1.0=R) |
| `daw.get_track_pan` | `{track_id: string}` | `{track_id, pan_position, pan_width}` | Get pan position and width |
| `daw.set_track_pan_width` | `{track_id: string, width: number}` | `{ok, width}` | Set stereo pan width |
| `daw.set_track_trim` | `{track_id: string, trim_db: number}` | `{success, trim_db}` | Set track trim level in dB |
| `daw.set_track_record` | `{track_id: string, enabled: boolean}` | `{success, status: "queued"}` | Record-arm a track (async) |
| `daw.set_track_color` | `{track_id: string, color: string}` | `{success, status: "queued"}` | Set track color (hex RGBA) (async) |
| `daw.set_track_comment` | `{track_id: string, comment: string}` | `{success, status: "queued"}` | Set track comment (async) |
| `daw.set_track_active` | `{track_id: string, active: boolean}` | `{ok}` | Activate or deactivate a track |
| `daw.set_track_hidden` | `{track_id: string, hidden: boolean}` | `{ok}` | Hide or show a track in the UI |
| `daw.set_track_monitoring` | `{track_id: string, mode: string}` | `{ok}` | Set monitoring (auto/input/disk/cue) |
| `daw.get_track_record_status` | `{track_id: string}` | `{track_id, name, record_armed, monitoring, monitoring_input, monitoring_disk}` | Per-track record and monitoring state |
| `daw.set_track_phase_invert` | `{track_id: string, channel?: number, invert: boolean}` | `{ok}` | Invert phase on a channel |
| `daw.freeze_track` | `{track_id: string}` | `{ok}` | Freeze track (render to audio) |
| `daw.unfreeze_track` | `{track_id: string}` | `{ok}` | Unfreeze a frozen track |
| `daw.get_track_input_ports` | `{track_id: string}` | `{track_id, ports: [{name, connected}]}` | List track input ports |
| `daw.get_track_output_ports` | `{track_id: string}` | `{track_id, ports: [{name, connected}]}` | List track output ports |
| `daw.get_track_latency` | `{track_id: string}` | `{track_id, signal_latency, playback_latency}` | Get track latency info |
| `daw.solo_exclusive` | `{track_id: string}` | `{ok}` | Solo one track, unsolo all others |
| `daw.mute_all` | `{mute?: boolean}` | `{ok, count}` | Mute or unmute all tracks |
| `daw.unmute_all` | none | `{ok, count}` | Unmute all tracks |
| `daw.unsolo_all` | none | `{ok, count}` | Unsolo all tracks |
| `daw.mute_all_tracks` | none | `{success, muted_count}` | Mute every track/bus |
| `daw.unmute_all_tracks` | none | `{success, unmuted_count}` | Unmute every muted track/bus |
| `daw.unsolo_all_tracks` | none | `{success}` | Cancel all solo via session |
| `daw.get_master_gain` | none | `{gain, gain_db, track_id, name}` | Get master bus gain |
| `daw.set_master_gain` | `{gain_db: number}` | `{ok, gain_db}` | Set master bus fader |
| `daw.get_mix_state` | none | `{tracks: [{id, name, type, gain_db, pan, muted, soloed, active, record_armed, color, plugins, sends}], track_count, sample_rate, playing, recording, position}` | Full mix state in one call |

## Region Editing

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_regions` | `{track_id: string}` | `[{id, name, position_samples, length_samples, start_samples, muted, locked, layer}]` | List all regions on a track |
| `daw.get_region_info` | `{track_id: string, region_id: string}` | `{id, name, position_samples, length_samples, start_samples, muted, locked, layer, hidden, opaque, gain_db?, fade_in_active?, fade_out_active?, envelope_active?, peak_amplitude?, peak_amplitude_db?, note_count?, type}` | Detailed info for one region |
| `daw.get_region_details` | `{track_id: string, region_id: string}` | region details | Get region details (alternate) |
| `daw.get_region_at_position` | `{track_id: string, position_samples: number}` | `{found, id?, name?, position_samples?, length_samples?, muted?, locked?}` | Find top region at a time position |
| `daw.get_region_by_name` | `{name: string}` | `{found, id?, name?, position_samples?, length_samples?, muted?, track_id?, track_name?}` | Find region by name across all tracks |
| `daw.select_regions_in_range` | `{track_id: string, start_samples: number, end_samples: number}` | `{regions: [{id, name, position_samples, length_samples}], count}` | Find regions touching a time range |
| `daw.split_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Split region at a sample position |
| `daw.move_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Move region to new position |
| `daw.move_region_to_track` | `{source_track_id: string, target_track_id: string, region_id: string, position_samples?: number}` | `{ok, new_position}` | Move region between tracks |
| `daw.nudge_region` | `{track_id: string, region_id: string, nudge_samples?: number, nudge_beats?: number}` | `{ok, new_position_samples}` | Nudge region by samples or beats |
| `daw.nudge_region_forward` | `{track_id: string, region_id: string, amount_samples: number}` | `{ok}` | Nudge region forward by samples |
| `daw.nudge_region_backward` | `{track_id: string, region_id: string, amount_samples: number}` | `{ok}` | Nudge region backward by samples |
| `daw.delete_region` | `{track_id: string, region_id: string}` | `{ok}` | Remove region from playlist |
| `daw.copy_region` | `{track_id: string, region_id: string}` | `{ok, cloned_region_id, name}` | Clone a region (new ID) |
| `daw.paste_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok, region_id, name, position}` | Place a region copy at a position |
| `daw.duplicate_region` | `{track_id: string, region_id: string, times?: number}` | `{ok}` | Duplicate region after itself |
| `daw.trim_region_start` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Trim region start to position |
| `daw.trim_region_end` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Trim region end to position |
| `daw.trim_region_to_range` | `{track_id: string, region_id: string, start_samples: number, end_samples: number}` | `{ok}` | Trim region to a time range |
| `daw.bounce_range` | `{track_id: string, start_samples: number, end_samples: number, name?: string}` | `{ok, region_id, name}` | Bounce/consolidate a time range |
| `daw.bounce_region` | `{track_id: string, region_id: string}` | `{success, region_id, name}` | Bounce a region to a new audio file |
| `daw.consolidate_range` | `{track_id: string, start_samples: number, end_samples: number, name?: string}` | `{ok, region_id, region_name}` | Consolidate regions in range (bounce) |
| `daw.normalize_region` | `{track_id: string, region_id: string}` | `{ok}` | Normalize audio region to peak |
| `daw.ripple_region` | `{track_id: string, region_id: string, position_samples: number}` | `{ok, moved}` | Move region and push subsequent regions |
| `daw.shuffle_region` | `{track_id: string, region_id: string, direction: number}` | `{ok}` | Shuffle region position |
| `daw.align_regions_to_position` | `{track_id: string, position_samples: number, region_ids?: string[]}` | `{ok}` | Align regions to a sample position |
| `daw.separate_regions_between` | `{track_id: string, start: number, end: number}` | result | Separate regions at boundaries |
| `daw.snap_regions_to_grid` | `{track_id: string}` | result | Snap all regions to nearest grid |
| `daw.close_region_gaps` | `{track_id: string}` | result | Close gaps between regions |
| `daw.slip_region_content` | `{track_id: string, region_id: string, amount: number}` | result | Slip region content within bounds |
| `daw.count_regions` | `{track_id: string}` | `{count}` | Count regions on a track |
| `daw.get_all_track_regions` | params | result | Get regions across all tracks |
| `daw.get_selected_regions` | none | result | Get currently selected regions |

## Region Properties

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.rename_region` | `{track_id: string, region_id: string, name: string}` | `{ok}` | Set region name |
| `daw.set_region_name` | `{track_id: string, region_id: string, name: string}` | `{ok}` | Set region name (alternate) |
| `daw.mute_region` | `{track_id: string, region_id: string, muted: boolean}` | `{ok}` | Mute or unmute a region |
| `daw.set_region_muted` | `{track_id: string, region_id: string, muted: boolean}` | `{ok}` | Mute or unmute (alternate) |
| `daw.lock_region` | `{track_id: string, region_id: string, locked: boolean}` | `{ok}` | Lock or unlock region position |
| `daw.set_region_locked` | `{track_id: string, region_id: string, locked: boolean}` | `{ok}` | Lock or unlock (alternate) |
| `daw.set_region_gain` | `{track_id: string, region_id: string, gain_db: number}` | `{ok}` | Set audio region gain |
| `daw.set_region_opacity` | `{track_id: string, region_id: string, opaque: boolean}` | `{ok}` | Set region opacity/transparency |
| `daw.set_region_opaque` | `{track_id: string, region_id: string, opaque: boolean}` | `{ok}` | Set opaque flag (alternate) |
| `daw.set_region_fade_in` | `{track_id: string, region_id: string, length_samples: number}` | `{ok}` | Set fade-in length |
| `daw.set_region_fade_out` | `{track_id: string, region_id: string, length_samples: number}` | `{ok}` | Set fade-out length |
| `daw.set_fade_in_active` | `{track_id: string, region_id: string, active: boolean}` | `{ok}` | Enable/disable fade-in |
| `daw.set_fade_out_active` | `{track_id: string, region_id: string, active: boolean}` | `{ok}` | Enable/disable fade-out |
| `daw.set_fade_shape` | `{track_id: string, region_id: string, fade: string, shape: string}` | `{ok}` | Set fade curve shape (linear/fast/slow/constant/symmetric) |
| `daw.create_crossfade` | `{track_id: string, region_id_a: string, region_id_b: string, crossfade_samples?: number}` | `{ok, description}` | Create crossfade between overlapping regions |
| `daw.set_crossfade` | none | `{status: "not_yet_implemented"}` | Crossfade stub (use fade_in/fade_out) |
| `daw.set_region_sync_point` | `{track_id: string, region_id: string, position_samples: number}` | `{ok}` | Set region sync point |
| `daw.toggle_region_phase_invert` | `{track_id: string, region_id: string}` | result | Toggle phase inversion on region |
| `daw.loop_region` | `{track_id: string, region_id: string}` | `{ok}` | Loop a region |
| `daw.raise_region` | `{track_id: string, region_id: string}` | `{ok}` | Raise region layer |
| `daw.lower_region` | `{track_id: string, region_id: string}` | `{ok}` | Lower region layer |
| `daw.raise_region_to_top` | `{track_id: string, region_id: string}` | `{ok}` | Raise region to top layer |
| `daw.lower_region_to_bottom` | `{track_id: string, region_id: string}` | `{ok}` | Lower region to bottom layer |
| `daw.reverse_region` | `{track_id: string, region_id: string}` | `{status: "not_yet_implemented"}` | Reverse audio region (stub) |
| `daw.time_stretch_region` | `{region_id?: string, ratio?: number}` | `{status: "not_yet_implemented"}` | Time stretch (requires RubberBand) |
| `daw.pitch_shift_region` | `{region_id?: string, semitones?: number}` | `{status: "not_yet_implemented"}` | Pitch shift (requires RubberBand) |

## Region Audio Analysis

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_audio_peaks` | `{track_id: string, region_id: string, n_peaks?: number, channel?: number}` | `[{min, max}]` | Get waveform peak data for a region |
| `daw.get_region_rms` | `{track_id: string, region_id: string}` | `{rms, rms_db}` | Get RMS level of an audio region |
| `daw.strip_silence` | `{track_id: string, region_id: string, threshold_db?: number, min_length_samples?: number}` | `[{start_samples, end_samples}]` | Find silent sections in a region |
| `daw.detect_silence` | `{track_id: string, region_id: string, threshold_db?: number, min_length_samples?: number}` | `{silent_ranges: [{start_samples, end_samples}], count, threshold_db, min_length}` | Detect silent sections (alternate) |
| `daw.get_region_rms_detailed` | `{track_id: string, region_id: string}` | `{peak_amplitude, rms_amplitude, length_samples}` | Detailed audio analysis |
| `daw.is_freewheeling` | none | `{freewheeling}` | Check freewheel mode |

## MIDI Editing (Legacy)

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.create_midi_region` | `{track_id: string, position_samples: number, length_samples: number, name?: string}` | `{ok, region_id, name, position, length}` | Create empty MIDI region on a track |
| `daw.get_midi_notes` | `{track_id: string, region_id: string}` | `[{note, velocity, channel, start_beats, length_beats, end_beats, id}]` | Get all MIDI notes in a region |
| `daw.get_midi_region_info` | `{track_id: string, region_id: string}` | `{region_id, name, position_samples, length_samples, note_count, lowest_note?, highest_note?, earliest_beat?, latest_beat?, duration_beats?}` | MIDI region statistics |
| `daw.add_midi_note` | `{track_id: string, region_id: string, note: number, velocity: number, start_beats: number, length_beats: number, channel?: number}` | `{ok}` | Add a note to a MIDI region |
| `daw.remove_midi_note` | `{track_id: string, region_id: string, note: number, start_beats: number, channel?: number}` | `{ok}` | Remove a note by matching note/start/channel |
| `daw.quantize_midi` | `{track_id: string, region_id: string, grid_beats?: number, strength?: number}` | `{ok}` | Quantize MIDI notes to grid |
| `daw.transpose_midi` | `{track_id: string, region_id: string, semitones: number}` | `{ok}` | Transpose all notes by semitones |
| `daw.set_midi_velocity` | `{track_id: string, region_id: string, velocity: number, note_min?: number, note_max?: number}` | `{ok}` | Set velocity for notes (optionally filtered) |
| `daw.humanize_midi` | `{track_id: string, region_id: string, timing_amount?: number, velocity_amount?: number}` | `{ok}` | Add random timing/velocity variation |
| `daw.select_midi_notes` | `{track_id: string, region_id: string, note_min?: number, note_max?: number, velocity_min?: number, velocity_max?: number, start_beats?: number, end_beats?: number}` | `{notes: [{note, velocity, channel, start_beats, length_beats, id}], count}` | Select notes by criteria |

## MIDI Editing (By Note ID)

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi.add_note` | `{track_id: string, region_id: string, note: number, velocity?: number, channel?: number, start_beats: number, length_beats?: number}` | `{success, note_id}` | Add a note (returns note ID) |
| `daw.midi.delete_note` | `{track_id: string, region_id: string, note_id: number}` | `{success}` | Delete a note by ID |
| `daw.midi.move_note` | `{track_id: string, region_id: string, note_id: number, new_time_beats?: number, new_note?: number, new_velocity?: number, new_length_beats?: number, new_channel?: number}` | `{success}` | Move/edit a note by ID |
| `daw.midi.set_note_velocity` | `{track_id: string, region_id: string, note_id: number, velocity: number}` | `{success}` | Set velocity for one note by ID |
| `daw.midi.resize_note` | `{track_id: string, region_id: string, note_id: number, length_beats: number}` | `{success}` | Resize a note by ID |
| `daw.midi.quantize` | `{track_id: string, region_id: string, grid_beats?: number, strength?: number, swing?: number}` | `{success, notes_quantized}` | Quantize notes to grid |
| `daw.midi.transpose` | `{track_id: string, region_id: string, semitones: number}` | `{success, notes_transposed}` | Transpose notes by semitones |
| `daw.edit_midi_note` | `{track_id: string, region_id: string, note_id: number, note?: number, velocity?: number, start_beats?: number, length_beats?: number, channel?: number}` | `{ok}` | Edit note properties by ID |
| `daw.set_midi_note_length` | `{track_id: string, region_id: string, note_id: number, length_beats: number}` | `{ok}` | Set note length by ID |
| `daw.duplicate_midi_region_content` | `{track_id: string, region_id: string, times?: number}` | `{ok, times}` | Duplicate/loop MIDI region content |

## MIDI CC & Program Changes

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi.get_cc_data` | `{track_id: string, region_id: string, cc_number: number}` | `{cc_number, events: [{time_beats, value}], count}` | Get CC events for a controller |
| `daw.midi.get_all_cc_numbers` | `{track_id: string, region_id: string}` | `{cc_numbers: [{cc_number, event_count}]}` | List CC numbers with data |
| `daw.midi.add_cc_event` | `{track_id: string, region_id: string, cc_number: number, time_beats: number, value: number}` | `{success}` | Add CC event to a MIDI region |
| `daw.midi.clear_cc_data` | `{track_id: string, region_id: string, cc_number: number}` | `{success}` | Clear CC events for a controller |
| `daw.midi.delete_cc_event` | `{track_id: string, region_id: string, cc_number: number, time_beats: number}` | `{success}` | Delete a specific CC event |
| `daw.add_midi_cc` | `{track_id: string, region_id: string, cc_number: number, time_beats: number, value: number, channel?: number}` | `{ok, cc_number, time_samples}` | Add CC via track automation |
| `daw.get_midi_cc` | `{track_id: string, cc_number: number, channel?: number}` | `{points: [{time_samples, value, value_midi}], count, cc_number, channel, state}` | Get CC data from track automation |
| `daw.clear_midi_cc` | `{cc: number}` | `{status: "not_yet_implemented"}` | Clear MIDI CC data (stub) |
| `daw.midi.add_patch_change` | params | result | Add MIDI patch/program change |
| `daw.midi.delete_patch_change` | params | result | Delete MIDI patch/program change |
| `daw.add_program_change` | `{program: number, beat: number}` | `{status: "not_yet_implemented"}` | Insert program change (stub) |

## MIDI Transformations

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.quantize_midi_swing` | `{track_id: string, region_id: string, grid_beats?: number, swing?: number, strength?: number}` | `{ok}` | Quantize with swing (0.5=straight) |
| `daw.legato_midi` | `{track_id: string, region_id: string, gap_beats?: number}` | `{ok, changed}` | Extend notes to meet next note |
| `daw.scale_midi_velocity` | `{track_id: string, region_id: string, scale_percent: number}` | `{ok}` | Scale velocities by percentage |
| `daw.set_midi_channel` | `{track_id: string, region_id: string, channel: number}` | `{ok, changed}` | Set MIDI channel for all notes (0-15) |
| `daw.split_midi_by_pitch` | `{track_id: string, region_id: string, split_note: number}` | `{ok, kept_below, removed_above}` | Split MIDI by pitch (keeps below) |
| `daw.split_midi_by_channel` | `{track_id: string, region_id: string, keep_channel: number}` | `{ok, kept, removed}` | Keep notes on one channel, remove rest |
| `daw.invert_midi_notes` | `{track_id: string, region_id: string, pivot?: number}` | `{ok, pivot}` | Melodic inversion around a pivot note |
| `daw.retrograde_midi` | `{track_id: string, region_id: string}` | `{ok}` | Reverse note order (retrograde) |

## Plugin Management

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_available_plugins` | none | `{plugins: [{name, type, category, creator, unique_id}], count}` | List all installed plugins |
| `daw.get_track_plugins` | `{track_id: string}` | `{plugins: [{processor_id, name, enabled, index}]}` | List plugins on a track |
| `daw.load_plugin` | `{track_id: string, plugin_name: string}` | `{success, status: "queued"}` | Load plugin by name (async) |
| `daw.load_plugin_by_id` | `{track_id: string, unique_id: string}` | `{ok, processor_id, name}` | Load plugin by unique ID |
| `daw.remove_plugin` | `{track_id: string, processor_id: string}` | `{success, status: "queued"}` | Remove plugin from track (async) |
| `daw.set_plugin_enabled` | `{track_id: string, processor_id: string, enabled: boolean}` | `{success, status: "queued"}` | Enable/disable (bypass) a plugin (async) |
| `daw.bypass_all_plugins` | `{track_id: string}` | `{ok, bypassed_count}` | Bypass all plugins on a track |
| `daw.enable_all_plugins` | `{track_id: string}` | `{ok, enabled_count}` | Re-enable all plugins on a track |
| `daw.get_plugin_info` | `{track_id: string, processor_id: string}` | `{processor_id, name, maker, category, unique_id, enabled, type, parameter_count, audio_inputs, audio_outputs, midi_inputs, midi_outputs, preset_count}` | Detailed plugin information |
| `daw.get_processor_chain` | `{track_id: string}` | `{processors: [{index, id, name, active, type, plugin_name?, parameter_count?, target_name?}], count}` | Full signal chain (fader, meter, sends, plugins) |
| `daw.reorder_plugins` | `{track_id: string, processor_ids: string[]}` | `{ok}` | Reorder processor chain |
| `daw.set_plugin_position` | `{track_id: string, processor_id: string, position: number}` | `{ok, position}` | Move plugin to specific index |
| `daw.move_plugin` | `{source_track_id: string, dest_track_id: string, processor_id: string}` | `{ok, new_processor_id}` | Move plugin between tracks |
| `daw.copy_plugin` | `{source_track_id: string, source_processor_id: string, target_track_id: string}` | `{ok, new_processor_id}` | Copy plugin with settings to another track |
| `daw.plugin.open_editor` | `{track_id: string, processor_id: string}` | `{success, has_editor, name, track_id, processor_id, parameters, parameter_count, editor_type}` | Open generic plugin editor (returns params) |
| `daw.plugin.close_editor` | none | `{success}` | Close plugin editor |
| `daw.show_plugin_manager` | none | result | Show plugin manager (GUI stub) |
| `daw.plugin.register` | `{plugin_id: string}` | `{ok}` | Register a .dawflow plugin (special handler) |
| `daw.ui.request_main_webview` | `{url: string}` | `{ok}` | Request full-window WebView takeover |

## Plugin Parameters & Presets

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_plugin_parameters` | `{track_id: string, processor_id: string}` | `{parameters: [{index, name, value, min, max, default}]}` | Get all plugin parameters |
| `daw.set_plugin_parameter` | `{track_id: string, processor_id: string, index: number, value: number}` | `{success, status: "queued"}` | Set a single plugin parameter (async) |
| `daw.set_multiple_plugin_parameters` | `{track_id: string, processor_id: string, parameters: [{index, value}]}` | `{ok, set_count, errors?}` | Set multiple params in one call |
| `daw.plugin.list_presets` | `{track_id: string, processor_id: string}` | `{presets: [{uri, label, user}], count, current_preset}` | List available presets |
| `daw.plugin.load_preset` | `{track_id: string, processor_id: string, preset_uri: string}` | `{success, loaded_preset}` | Load a preset by URI or label |
| `daw.plugin.save_preset` | `{track_id: string, processor_id: string, name: string}` | result | Save current state as user preset |
| `daw.get_plugin_presets` | `{track_id: string, processor_id: string}` | `{presets: [{uri, label, user}], count}` | List presets (alternate) |
| `daw.load_plugin_preset` | `{track_id: string, processor_id: string, preset_uri?: string, preset_name?: string}` | `{ok, loaded, uri}` | Load preset by URI or name |
| `daw.save_plugin_preset` | `{track_id: string, processor_id: string, name: string}` | `{ok, preset_uri, label}` | Save current state as user preset |

## Plugin Search

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.search_plugins` | `{query: string}` | `{results: [{name, type, category, creator, unique_id}], count}` | Search plugins by name |
| `daw.search_plugins_by_category` | `{category: string}` | `{results: [{name, type, category, creator, unique_id}], count}` | Search plugins by category |

## Automation

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_automation_state` | `{track_id: string, parameter?: string}` | `{track_id, parameter, state}` | Get automation state (Off/Write/Touch/Read/Latch) |
| `daw.set_automation_state` | `{track_id: string, parameter?: string, state: string}` | `{ok}` | Set automation state |
| `daw.get_automation_data` | `{track_id: string, parameter?: string}` | `{track_id, parameter, points: [{time, value}], count}` | Get automation points |
| `daw.add_automation_point` | `{track_id: string, parameter?: string, time: number, value: number}` | `{ok}` | Add an automation point |
| `daw.clear_automation` | `{track_id: string, parameter?: string}` | `{ok}` | Clear all automation points |
| `daw.set_all_automation_state` | `{state: string, parameter?: string}` | `{ok, count}` | Set automation state on all tracks |
| `daw.set_automation_mode` | `{track_id: string, mode: string}` | `{success}` | Set gain automation mode (off/read/write/touch/latch) |
| `daw.get_automation_mode` | `{track_id: string}` | `{mode}` | Get gain automation mode |
| `daw.set_plugin_automation_mode` | `{track_id: string, processor_id: string, param_index: number, mode: string}` | `{success}` | Set plugin parameter automation mode |
| `daw.get_automation_data_ext` | `{track_id: string, control?: string}` | `{control, points: [{time_samples, value}], count, mode}` | Extended automation data (gain/pan/mute) |
| `daw.add_automation_point_ext` | `{track_id: string, control?: string, time_samples: number, value: number}` | `{success}` | Add point with control type |
| `daw.delete_automation_point` | `{track_id: string, control?: string, time_samples: number}` | `{success}` | Delete nearest point at time |
| `daw.clear_automation_ext` | `{track_id: string, control?: string}` | `{success}` | Clear automation by control type |

## Metering

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_track_peak` | `{track_id: string, channel?: number}` | `{track_id, channel, peak_db}` | Get track peak level |
| `daw.get_track_rms` | `{track_id: string, channel?: number}` | `{track_id, channel, rms_db}` | Get track RMS level |
| `daw.get_master_peak` | none | `{channels: [{channel, peak_db}]}` | Get master bus peak levels |
| `daw.get_master_meter` | none | `{channels: [{peak_db}], channel_count}` | Master bus meter levels |
| `daw.get_master_lufs` | none | `{status: "approximation", channels: [{channel, peak_db, k_rms_db}]}` | LUFS approximation via K-RMS |
| `daw.get_cpu_load` | none | `{cpu_load_percent}` | Get DSP CPU load percentage |
| `daw.get_meter_levels` | none | `{tracks: [{id, name, channels: [{peak_db}]}]}` | All-track peak levels in one call |
| `daw.reset_meter_peaks` | none | `{success}` | Reset all track peak holds |
| `daw.set_meter_type` | params | result | Set meter type for a track |
| `daw.get_xrun_count` | none | `{xrun_count}` | Get audio dropout (xrun) count |
| `daw.get_latency_report` | none | `{tracks: [{id, name, signal_latency, playback_latency}], sample_rate, block_size, xrun_count}` | Full latency report for all tracks |

## Markers & Locations

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.add_marker` | `{name: string, position?: number}` | `{success, name, position}` | Add a named marker (default: current pos) |
| `daw.add_location_marker` | `{name?: string, position_samples: number}` | `{success, location_id, name}` | Add marker with location ID returned |
| `daw.add_range_marker` | `{name: string, start_samples: number, end_samples: number}` | `{ok, name, start, end}` | Add a range marker |
| `daw.add_cue_marker` | `{name: string, position?: number}` | `{ok, name, position}` | Add a cue marker |
| `daw.get_markers` | none | `{markers: [{name, start, end, is_mark, is_range}]}` | List all markers and range markers |
| `daw.get_all_markers` | none | `{markers: [{id, name, start_samples, end_samples, is_mark, is_range, is_cd_marker, is_auto_loop, is_auto_punch, locked}], count}` | Full metadata for all locations |
| `daw.remove_marker` | `{name: string}` | `{success}` | Remove a marker by name |
| `daw.remove_location_marker` | `{location_id: string}` | `{success}` | Remove marker by location ID |
| `daw.update_marker` | `{location_id: string, name?: string, position_samples?: number, end_samples?: number}` | `{success}` | Update marker name/position by ID |
| `daw.rename_marker` | `{name: string, new_name: string}` | `{ok}` | Rename a marker by current name |
| `daw.move_marker` | `{name: string, position_samples: number}` | `{ok}` | Move marker to new position |
| `daw.goto_next_marker` | none | result | Jump playhead to next marker |

## Tempo & Time Signature

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_tempo` | `{bpm: number}` | `{success, bpm}` | Set session tempo at beat 0 |
| `daw.set_time_signature` | `{numerator: number, denominator: number}` | `{success, numerator, denominator}` | Set session time signature at beat 0 |
| `daw.add_tempo_change` | `{bpm: number, note_type?: number, position_samples?: number, bar?: number, beat?: number, ticks?: number}` | `{ok, bpm, note_type}` | Add tempo change at position or bar/beat |
| `daw.remove_tempo_change` | `{position_samples: number}` | `{ok}` | Remove tempo point at position |
| `daw.add_tempo_ramp` | `{start_bpm: number, end_bpm: number, start_position_samples: number, end_position_samples: number}` | `{ok, start_bpm, end_bpm}` | Gradual tempo change between two points |
| `daw.add_time_signature_change` | `{numerator: number, denominator: number, position_samples?: number, bar?: number}` | `{ok, numerator, denominator}` | Add meter change at position or bar |
| `daw.get_tempo_map` | none | `{tempos: [{bpm, note_types_per_minute, note_type, bar, beat, tick}], meters: [{divisions_per_bar, note_value, bar, beat, tick}], tempo_count, meter_count}` | Full tempo and meter map |
| `daw.get_tempo_at` | `{position?: number}` | `{bpm, position, bar, beat, bbt_string}` | Get tempo at a specific position |

## Time Conversion

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.position_to_bars_beats` | `{position_samples: number}` | `{bars, beats, ticks, bbt_string, position_samples}` | Convert samples to bars/beats/ticks |
| `daw.bars_beats_to_position` | `{bars: number, beats?: number, ticks?: number}` | `{position_samples, bars, beats, ticks}` | Convert bars/beats to samples |
| `daw.samples_to_beats` | `{samples: number}` | `{samples, beats, bar, beat, tick, bbt_string}` | Convert samples to beat position |
| `daw.beats_to_samples` | `{beats: number}` | `{samples, beats}` | Convert beats to sample position |
| `daw.get_position_info` | none | `{samples, beats, bar, beat, tick, bbt_string, seconds, tempo_bpm, sample_rate}` | Current position in all formats |
| `daw.samples_to_time` | `{samples: number}` | time info | Convert samples to time formats |
| `daw.time_to_samples` | `{time: number}` | `{samples}` | Convert time to samples |
| `daw.get_time_formats` | none | result | List available time formats |

## Routing & I/O

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_input` | `{track_id: string, port: string}` | `{success}` | Connect track input to a port |
| `daw.set_track_output` | `{track_id: string, port: string}` | `{success}` | Connect track output to a port |
| `daw.get_track_io` | `{track_id: string}` | `{inputs: [{name, connections}], outputs: [{name, connections}]}` | Get track I/O connections |
| `daw.connect_track_input` | `{track_id: string, source_port: string, channel?: number}` | `{success}` | Connect port to track input channel |
| `daw.disconnect_track_input` | `{track_id: string, channel?: number}` | `{success}` | Disconnect track input (channel or all) |
| `daw.connect_track_output` | `{track_id: string, dest_port: string, channel?: number}` | `{success}` | Connect track output channel to port |
| `daw.connect_ports` | `{source_port: string, dest_port: string}` | `{ok}` | Connect two ports directly |
| `daw.disconnect_ports` | `{source_port: string, dest_port: string}` | `{ok}` | Disconnect two ports |
| `daw.get_available_audio_ports` | `{input?: boolean}` | `{ports: string[], count}` | List physical audio ports |
| `daw.get_available_ports` | `{type?: string}` | `{audio_inputs, audio_outputs, midi_inputs, midi_outputs}` | List all system ports (audio/MIDI) |
| `daw.get_midi_ports` | none | `{ports: [{name, direction}], count}` | List physical MIDI ports |

## Sends

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.add_send` | `{track_id: string, target_bus_id: string}` | `{success, send_id}` | Add aux send from track to bus |
| `daw.set_send_level` | `{track_id: string, send_index: number, gain_db: number}` | `{ok, track_id, send_index, gain_db}` | Set send gain in dB |
| `daw.set_send_enable` | `{track_id: string, send_index: number, enabled: boolean}` | `{ok}` | Enable or disable a send |
| `daw.get_sends` | `{track_id: string}` | `{sends: [{index, id, name, active, gain?, gain_db?, enabled?, target_id?, target_name?, send_name?}], count}` | List sends with targets and levels |

## Groups & VCA

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.create_group` | `{name: string}` | `{success, group_name}` | Create a new route group |
| `daw.create_route_group` | `{name: string}` | `{success, group_id, name}` | Create route group (returns ID) |
| `daw.add_track_to_group` | `{track_id: string, group_name: string}` | `{success}` | Add track to a route group |
| `daw.remove_track_from_group` | `{track_id: string, group_name: string}` | `{ok}` | Remove track from a route group |
| `daw.get_groups` | none | `{groups: [{name, active, members: [{id, name}]}]}` | List route groups and members |
| `daw.get_route_groups` | none | `{groups: [{id, name, active, gain, mute, solo, select, color, member_ids, member_count}], count}` | Detailed route group listing |
| `daw.delete_route_group` | `{group_name: string}` | `{success}` | Delete a route group by name |
| `daw.delete_group` | `{group_name: string}` | `{ok}` | Delete route group (alternate) |
| `daw.set_group_active` | `{group_name: string, active: boolean}` | `{success}` | Activate or deactivate a group |
| `daw.set_group_properties` | `{group_name: string, gain?: boolean, mute?: boolean, solo?: boolean, active?: boolean, relative?: boolean}` | `{ok}` | Set group linking properties |
| `daw.create_vca` | `{name?: string, count?: number}` | `{vcas: [{id, name, number}], count}` | Create VCA masters |
| `daw.get_vcas` | none | `{vcas: [{id, name, number}], count}` | List all VCA masters |
| `daw.assign_track_to_vca` | `{track_id: string, vca_name: string}` | `{success}` | Assign track to VCA |
| `daw.unassign_track_from_vca` | `{track_id: string, vca_name: string}` | `{success}` | Remove track from VCA |
| `daw.set_vca_gain` | `{vca_name: string, gain_db: number}` | `{success}` | Set VCA gain in dB |
| `daw.set_vca_mute` | `{vca_name: string, muted: boolean}` | `{success}` | Mute or unmute a VCA |
| `daw.set_vca_solo` | `{vca_name: string, soloed: boolean}` | `{success}` | Solo or unsolo a VCA |
| `daw.delete_vca` | `{vca_name: string}` | `{success}` | Remove a VCA master |

## Selection

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.select_track` | `{track_id: string, add?: boolean}` | `{ok}` | Select a track (optionally add to selection) |
| `daw.deselect_all_tracks` | none | `{ok}` | Clear track selection |
| `daw.get_selected_tracks` | none | `{tracks: [{id, name}], count}` | Get selected tracks |
| `daw.select_all_tracks` | none | `{ok, count}` | Select all tracks |
| `daw.set_loop_from_region` | `{track_id: string, region_id: string}` | `{success}` | Set loop range from region |
| `daw.set_punch_from_region` | `{track_id: string, region_id: string}` | `{success}` | Set punch range from region |
| `daw.region_fill_track` | `{track_id: string, region_id: string, end_samples?: number}` | `{success, copies_created}` | Fill track with region copies |
| `daw.insert_silence` | `{position_samples: number, duration_samples: number}` | `{success}` | Insert blank time |
| `daw.remove_time_ripple` | `{start_samples: number, end_samples: number}` | `{success}` | Remove time and ripple |

## Arrangement (Sections)

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.insert_time` | `{position_samples: number, duration_samples: number}` | `{ok, position, duration}` | Ripple insert (push everything forward) |
| `daw.remove_time` | `{position_samples: number, duration_samples: number}` | `{ok, position, duration}` | Ripple delete (pull everything backward) |
| `daw.cut_section` | `{start_samples: number, end_samples: number, paste_position_samples?: number}` | `{ok, start, end, paste_position}` | Cut a section |
| `daw.copy_section` | `{start_samples: number, end_samples: number, paste_position_samples: number}` | `{ok, start, end, paste_position}` | Copy a section (non-destructive) |
| `daw.delete_section` | `{start_samples: number, end_samples: number}` | `{ok, start, end}` | Delete a section (ripple delete) |
| `daw.insert_section` | `{position_samples: number, duration_samples: number}` | `{ok, position, duration}` | Insert blank time at position |

## Export & Import

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.export_session` | none | `{status: "requires_gui", description, session_name, session_path, workaround}` | Export session (requires GUI) |
| `daw.export_range` | none | `{status: "requires_gui", description, session_name, session_path, tip}` | Export range (requires GUI) |
| `daw.export_stems` | `{format?: string, bit_depth?: number}` | `{status: "not_yet_implemented", tracks_to_export, track_count}` | Stem export (stub) |
| `daw.get_export_formats` | none | `{formats: [{id, name, extension}]}` | List available export formats |
| `daw.import_audio` | `{filepath: string, track_id?: string, position_samples?: number}` | `{ok, region_id, name, length, placed_on_track?, position?}` | Import audio file onto a track |
| `daw.import_midi` | `{filepath: string, track_id?: string}` | `{status, filepath, description}` | Import MIDI file (validation + guidance) |
| `daw.get_source_files` | none | `{sources: [{id, name, length, writable}], count}` | List audio/MIDI source files in session |

## Snapshots & Templates

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.save_snapshot` | `{name: string}` | `{ok, snapshot}` | Save session state as snapshot |
| `daw.get_snapshots` | none | `{current_snapshot, session_name, session_path}` | Get current snapshot info |
| `daw.restore_snapshot` | `{name: string}` | `{ok, snapshot}` | Restore a saved snapshot |
| `daw.save_template` | `{name: string, description?: string}` | `{ok, name}` | Save session as template |

## Navigation & Playhead

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_playhead_position` | `{position_samples: number}` | `{success, position}` | Locate playhead to exact position |
| `daw.get_playhead_position` | none | `{position_samples, position_seconds, sample_rate}` | Query current playhead position |
| `daw.nudge_playhead_forward` | `{amount_samples?: number}` | `{success, position}` | Move playhead forward (default: 1 second) |
| `daw.nudge_playhead_backward` | `{amount_samples?: number}` | `{success, position}` | Move playhead backward (default: 1 second) |
| `daw.goto_session_start` | none | `{success, position}` | Jump to session start |
| `daw.goto_session_end` | none | `{success, position}` | Jump to session end |
| `daw.goto_next_region_boundary` | none | `{success, position}` | Jump to next region start/end |
| `daw.goto_prev_region_boundary` | none | `{success, position}` | Jump to previous region start/end |
| `daw.scroll_to_position` | `{position_samples?: number}` | `{ok, position}` or `{status: "requires_gui"}` | Move playhead (editor scroll requires GUI) |
| `daw.scroll_timeline` | params | result | Scroll the timeline view |

## Snap & Grid

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_snap_mode` | none | `{status: "gui_only", description}` | Get snap settings (GUI-side setting, not available from plugin host) |
| `daw.set_snap_mode` | `{mode?: string, grid_size?: string}` | `{status: "not_available_from_plugin_host", mode, grid_size}` | Set snap mode (GUI-side, React UI manages this client-side) |

## View & Zoom

These commands require access to the Editor (gtk2_ardour) and are not fully available from the plugin host.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_zoom_level` | params | `{status: "requires_gui", shortcuts}` | Set zoom level (GUI only) |
| `daw.zoom_to_session` | none | `{status: "requires_gui"}` | Zoom to full session (GUI only) |
| `daw.zoom_to_region` | params | error | Zoom to fit a region (GUI only) |
| `daw.zoom_to_range` | params | error | Zoom to time range (GUI only) |
| `daw.zoom_step` | params | result | Zoom in/out by step |
| `daw.set_visible_tracks` | params | error | Set visible tracks (GUI only) |
| `daw.get_visible_tracks` | params | error | Get visible tracks (GUI only) |
| `daw.set_track_height` | params | error | Set track height (GUI only) |
| `daw.show_mixer` | none | error | Show mixer window (GUI only) |
| `daw.show_editor` | none | error | Show editor window (GUI only) |
| `daw.show_preferences` | none | result | Show preferences dialog (GUI only) |

## Metronome

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.toggle_metronome` | none | `{ok, enabled}` | Toggle click on/off |
| `daw.set_metronome_volume` | `{gain: number}` | `{ok, gain}` | Set click gain (0.0-2.0, 1.0=unity) |
| `daw.toggle_count_in` | none | `{ok, enabled}` | Toggle count-in on/off |
| `daw.get_metronome_state` | none | `{enabled, gain, count_in}` | Get click state |
| `daw.get_click_settings` | none | `{enabled, gain, use_click_emphasis}` | Get click settings |
| `daw.set_click_enabled` | `{enabled: boolean}` | `{success, enabled}` | Enable or disable click |
| `daw.set_click_gain` | `{gain: number}` | `{success}` | Set click gain level |

## Playlists

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_playlist` | `{track_id: string, playlist_name: string}` | `{ok, playlist_name}` | Switch track to a different playlist |
| `daw.get_track_playlists` | `{track_id: string}` | `{playlists: [{name, id, region_count, is_current}], count}` | List playlists for a track |
| `daw.new_track_playlist` | `{track_id: string}` | `{ok, playlist_name}` | Create new empty playlist for track |
| `daw.copy_track_playlist` | `{track_id: string}` | `{ok, playlist_name}` | Copy current playlist (for comping) |
| `daw.get_track_playlist_info` | `{track_id: string}` | playlist info | Get current playlist info |
| `daw.get_available_playlists` | none | result | List all available playlists |

## Audio Device & Backend

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_buffer_size` | none | `{buffer_size, sample_rate}` | Get current buffer size |
| `daw.set_buffer_size` | `{buffer_size: number}` | `{success, buffer_size}` | Set buffer size |
| `daw.get_available_buffer_sizes` | none | `{sizes: number[]}` | List supported buffer sizes |
| `daw.get_available_sample_rates` | none | `{rates: number[]}` | List supported sample rates |
| `daw.get_device_name` | none | `{device_name, backend_name}` | Get audio device and backend |

## Monitor Section

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.monitor.get_state` | none | `{has_monitor, ...}` | Get monitor section state |
| `daw.monitor.set_dim` | `{enabled: boolean}` | `{success, dim}` | Toggle monitor dim |
| `daw.monitor.set_mono` | `{enabled: boolean}` | `{success, mono}` | Toggle mono fold-down |
| `daw.monitor.set_mute` | `{enabled: boolean}` | `{success}` | Toggle monitor mute |

## Latency

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_plugin_latency` | `{track_id: string, processor_id: string}` | `{latency_samples}` | Get plugin latency |
| `daw.get_route_latency` | `{track_id: string}` | `{playback_latency, capture_latency}` | Get route latency |
| `daw.get_total_latency` | none | `{tracks: [{id, name, playback_latency, signal_latency}]}` | All route latencies |
| `daw.get_worst_latency` | none | `{worst_output_latency, worst_input_latency}` | Worst-case latency |

## Batch & Utilities

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.execute_batch` | `{commands: [{method: string, params: object}]}` | `{results: [{method, result} or {method, error}], count}` | Execute multiple commands in sequence |
| `daw.undo` | `{count?: number}` | `{success, next_undo}` | Undo last N operations |
| `daw.redo` | `{count?: number}` | `{success, next_redo}` | Redo last N undone operations |
| `daw.get_undo_history` | `{max_items?: number}` | `{undo_depth, next_undo, undo: [{label}]}` | Get undo/redo history |
| `daw.group_regions` | none | `{status: "gui_only"}` | Group regions (GUI only) |
| `daw.ungroup_regions` | none | `{status: "gui_only"}` | Ungroup regions (GUI only) |

---

## DSP Graph & Routing

*Source: `dawflow_commands_engine_deep.cc` -- 15 commands for DSP graph topology and signal flow inspection.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_route_signal_path` | `{track_id: string}` | `{route_id, route_name, processors: [{index, id, name, active, display_name}], count}` | Get ordered processor chain for a route |
| `daw.get_route_processor_count` | `{track_id: string}` | `{route_id, count}` | Count processors on a route |
| `daw.get_processor_info` | `{track_id: string, index: int}` | `{id, name, display_name, active, input_latency, output_latency, signal_latency, is_plugin, plugin_name?}` | Get processor details by index |
| `daw.get_processor_io_counts` | `{track_id: string, index: int}` | `{input_audio, input_midi, output_audio, output_midi, input_total, output_total}` | Get input/output channel counts for a processor |
| `daw.get_route_input_ports` | `{track_id: string}` | `{route_id, ports: [{name, type, connected, pretty_name}], count}` | Get input port names and state |
| `daw.get_route_output_ports` | `{track_id: string}` | `{route_id, ports: [{name, type, connected, pretty_name}], count}` | Get output port names and state |
| `daw.get_route_fed_by` | `{track_id: string}` | `{route_id, fed_by: [{id, name}], count}` | Get routes feeding into this route via internal sends |
| `daw.get_route_feeds` | `{track_id: string}` | `{route_id, feeds: [{id, name}], count}` | Get routes this route feeds into |
| `daw.get_internal_sends_for_route` | `{track_id: string}` | `{route_id, sends: [{id, name, active, target_id, target_name}], count}` | Get all internal sends on a route |
| `daw.get_internal_returns_for_route` | `{track_id: string}` | `{route_id, has_internal_return, return_id?, return_name?, active?}` | Get internal return info for a route |
| `daw.get_master_bus_info` | none | `{id, name, active, meter_point, gain, gain_db, input_channels, output_channels, signal_latency}` | Get master bus details |
| `daw.get_monitor_bus_info` | none | `{exists, id?, name?, active?, meter_point?, gain?, gain_db?, input_channels?}` | Get monitor bus info (if exists) |
| `daw.get_route_panner_info` | `{track_id: string}` | `{route_id, has_panner, bypassed?, panner_type?}` | Get panner type and state |
| `daw.get_route_meter_point` | `{track_id: string}` | `{route_id, meter_point}` | Get where the meter is in the signal chain |
| `daw.set_route_meter_point` | `{track_id: string, meter_point: string}` | `{ok, meter_point}` | Set the meter point (input/pre_fader/post_fader/output/custom) |

## Port Management

*Source: `dawflow_commands_engine_deep.cc` -- 20 commands for audio/MIDI port enumeration, connection, and inspection.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_all_ports` | none | `{ports: [{name, type}], count}` | List all audio and MIDI ports |
| `daw.get_port_info` | `{port_name: string}` | `{name, type, connected, pretty_name, physically_connected, externally_connected, internally_connected}` | Get detailed info about a port |
| `daw.get_port_connections` | `{port_name: string}` | `{port_name, connections: [string], count}` | Get all connections for a port |
| `daw.get_physical_audio_inputs` | none | `{ports: [string], count}` | List physical audio input ports |
| `daw.get_physical_audio_outputs` | none | `{ports: [string], count}` | List physical audio output ports |
| `daw.get_physical_midi_inputs` | none | `{ports: [string], count}` | List physical MIDI input ports |
| `daw.get_physical_midi_outputs` | none | `{ports: [string], count}` | List physical MIDI output ports |
| `daw.engine.connect_ports` | `{source: string, destination: string}` | `{ok, source, destination, error?}` | Connect two ports by name |
| `daw.engine.disconnect_ports` | `{source: string, destination: string}` | `{ok, source, destination, error?}` | Disconnect two ports |
| `daw.disconnect_all_from_port` | `{port_name: string}` | `{ok, port_name}` | Disconnect all connections from a port |
| `daw.is_port_connected` | `{port_name: string}` | `{port_name, connected}` | Check if port has any connections |
| `daw.get_port_type` | `{port_name: string}` | `{port_name, type}` | Get type of a port (audio/MIDI) |
| `daw.get_port_latency` | `{port_name: string}` | `{port_name, playback_latency_min, playback_latency_max, capture_latency_min, capture_latency_max}` | Get latency of a specific port |
| `daw.get_connection_matrix` | none | `{routes: [{id, name, output_connections, input_connections}], count}` | Get complete connection matrix for all routes |
| `daw.get_route_io_connections` | `{track_id: string}` | `{route_id, inputs: [{port, connections}], outputs: [{port, connections}]}` | Get all I/O connections for a route |
| `daw.get_audio_port_count` | none | `{count}` | Count of audio ports |
| `daw.get_midi_port_count` | none | `{count}` | Count of MIDI ports |
| `daw.get_physical_port_count` | none | `{physical_audio_inputs, physical_midi_inputs, physical_audio_outputs, physical_midi_outputs, total_physical_inputs, total_physical_outputs}` | Count of physical I/O ports |
| `daw.reconnect_all_ports` | none | `{ok}` | Reconnect all ports |
| `daw.get_port_pretty_name` | `{port_name: string}` | `{port_name, pretty_name}` | Get human-readable port name |

## Engine State

*Source: `dawflow_commands_engine_deep.cc` -- 15 commands for audio engine state and backend inspection.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_engine_state_detailed` | none | `{running, sample_rate, buffer_size, dsp_load, freewheeling, backend_name, xrun_count, usecs_per_cycle, device_name, is_realtime, systemic_input_latency, systemic_output_latency}` | Full engine state |
| `daw.get_available_backends` | none | `{backends: [string], count, current}` | List audio backends |
| `daw.get_current_backend_name` | none | `{backend_name}` | Current backend name |
| `daw.engine.get_available_sample_rates` | none | `{sample_rates: [int], count, current}` | Available sample rates for current device |
| `daw.engine.get_available_buffer_sizes` | none | `{buffer_sizes: [int], count}` | Available buffer sizes for current device |
| `daw.get_dsp_load_percent` | none | `{dsp_load_percent}` | Current DSP load as percentage |
| `daw.get_total_xrun_count` | none | `{xrun_count}` | Total xrun count |
| `daw.reset_xrun_count` | none | `{ok, xrun_count}` | Reset xrun counter |
| `daw.get_engine_latency_info` | none | `{worst_input_latency_samples, worst_output_latency_samples, worst_input_latency_ms, worst_output_latency_ms, sample_rate}` | Input/output latency in samples and ms |
| `daw.get_usecs_per_cycle` | none | `{usecs_per_cycle}` | Microseconds per audio process cycle |
| `daw.is_engine_realtime` | none | `{realtime}` | Check if running in realtime |
| `daw.is_engine_freewheeling` | none | `{freewheeling}` | Check if freewheeling |
| `daw.get_engine_sample_rate` | none | `{sample_rate}` | Current engine sample rate |
| `daw.get_engine_buffer_size` | none | `{buffer_size, usecs_per_cycle, sample_rate}` | Current buffer size |
| `daw.get_engine_process_thread_count` | none | `{info, error}` | Number of DSP processing threads (stub) |

## Audio Sources & Buffers

*Source: `dawflow_commands_engine_deep.cc` -- 20 commands for accessing audio source files, peak data, and region audio properties.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.read_region_peaks` | `{region_id: string, n_peaks?: int, channel?: int}` | `{region_id, peaks: [{min, max}], count, channel}` | Read peak data from a region |
| `daw.get_region_peak_amplitude_db` | `{region_id: string}` | `{region_id, peak_amplitude, peak_db}` | Get peak amplitude of a region |
| `daw.get_region_rms_level` | `{region_id: string}` | `{region_id, rms, rms_db}` | Calculate RMS level of a region |
| `daw.get_source_info` | `{source_id: string}` | `{id, name, length, writable, path?, origin?, n_channels?, format_name?}` | Get details about an audio source |
| `daw.get_source_path` | `{source_id: string}` | `{source_id, path}` | Get file path for a source |
| `daw.get_source_sample_rate` | `{source_id: string}` | `{source_id, sample_rate}` | Native sample rate of a source |
| `daw.get_source_channel_count` | `{source_id: string}` | `{source_id, channel_count}` | Channel count of a source |
| `daw.get_source_length_samples` | `{source_id: string}` | `{source_id, length_samples}` | Length in samples |
| `daw.get_source_length_seconds` | `{source_id: string}` | `{source_id, length_seconds}` | Length in seconds |
| `daw.get_all_audio_sources` | none | `{sources: [{id, name, length, writable, n_channels, path?}], count}` | List all audio sources |
| `daw.get_all_midi_sources` | none | `{sources: [{id, name, length, writable, path?}], count}` | List all MIDI sources |
| `daw.get_region_source_info` | `{region_id: string}` | `{region_id, sources: [{index, id, name, length, writable, path?}], count}` | Get source info for a region |
| `daw.get_audio_file_format` | `{source_id: string}` | `{source_id, format_name}` | Get format info (WAV, AIFF, etc.) |
| `daw.get_region_channels` | `{region_id: string}` | `{region_id, channels}` | Get channel count for a region |
| `daw.is_source_writable` | `{source_id: string}` | `{source_id, writable}` | Check if a source is writable |
| `daw.get_source_capture_length` | `{source_id: string}` | `{source_id, capture_length}` | Get captured length for recording sources |
| `daw.get_region_start_offset` | `{region_id: string}` | `{region_id, start_offset_samples, position_samples, length_samples}` | Get the start offset within the source |
| `daw.get_region_fade_in_length` | `{region_id: string}` | `{region_id, fade_in_active, fade_in_length}` | Get fade in length |
| `daw.get_region_fade_out_length` | `{region_id: string}` | `{region_id, fade_out_active, fade_out_length}` | Get fade out length |
| `daw.get_region_envelope_info` | `{region_id: string}` | `{region_id, envelope_active, envelope_points, points?: [{time, value}], truncated?}` | Get region gain envelope info |

## Resource Monitoring

*Source: `dawflow_commands_engine_deep.cc` -- 15 commands for disk, CPU, and session resource monitoring.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_butler_speed` | none | `{info, error}` | Get butler (disk I/O) speed (stub) |
| `daw.get_disk_io_stats` | none | `{info, error}` | Disk read/write statistics (stub) |
| `daw.get_capture_buffer_percent` | none | `{info, error}` | Capture buffer fill percentage (stub) |
| `daw.get_playback_buffer_percent` | none | `{info, error}` | Playback buffer fill percentage (stub) |
| `daw.get_session_disk_space` | none | `{session_path, free_bytes, free_mb, free_gb}` | Available disk space for session directory |
| `daw.get_total_route_count` | none | `{count}` | Total number of routes |
| `daw.get_active_route_count` | none | `{count}` | Number of active (non-hidden) routes |
| `daw.get_total_track_count` | none | `{audio_tracks, midi_tracks, total}` | Number of audio+MIDI tracks |
| `daw.get_bus_count` | none | `{count}` | Number of buses |
| `daw.get_vca_count` | none | `{count}` | Number of VCAs |
| `daw.get_max_route_latency` | none | `{worst_route_latency_samples, worst_input_latency_samples, worst_output_latency_samples, *_ms}` | Maximum latency across all routes |
| `daw.get_session_format_info` | none | `{session_name, session_path, snap_name, sample_rate}` | Session format details |
| `daw.get_session_sample_count` | none | `{total_samples, total_seconds}` | Total audio samples in session |
| `daw.get_region_count` | none | `{count}` | Total number of regions |
| `daw.get_total_source_count` | none | `{count}` | Total number of sources |

## Freewheel & Bounce

*Source: `dawflow_commands_engine_deep.cc` -- 10 commands for offline rendering and track freeze.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.start_freewheel` | none | `{ok, error?}` | Start freewheeling |
| `daw.stop_freewheel` | none | `{ok, error?}` | Stop freewheeling |
| `daw.engine.is_freewheeling` | none | `{freewheeling}` | Check freewheel state |
| `daw.freeze_track_processing` | `{track_id: string}` | `{ok, track_id}` | Freeze a track (render to audio) |
| `daw.unfreeze_track_processing` | `{track_id: string}` | `{ok, track_id}` | Unfreeze a track |
| `daw.get_track_freeze_state` | `{track_id: string}` | `{track_id, freeze_state, is_frozen}` | Get freeze state of a track |
| `daw.bounce_range_to_region` | `{track_id: string, start_sample: int64, end_sample: int64, name?: string}` | `{ok, region_id?, name?, length?}` | Bounce a time range to a new region |
| `daw.bounce_route_to_file` | params | `{error, info}` | Bounce route to audio file (stub) |
| `daw.can_freeze_track` | `{track_id: string}` | `{track_id, can_freeze}` | Check if a track can be frozen |
| `daw.get_freeze_info` | `{track_id: string}` | `{track_id, track_name, freeze_state, is_frozen, can_freeze}` | Get detailed freeze info for a track |

## Latency Management

*Source: `dawflow_commands_engine_deep.cc` -- 15 commands for latency inspection and compensation.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_route_total_latency` | `{track_id: string}` | `{route_id, signal_latency_samples, signal_latency_ms}` | Total latency for a route |
| `daw.get_route_input_latency` | `{track_id: string}` | `{route_id, input_latency_samples, input_latency_ms}` | Input latency for a route |
| `daw.get_route_output_latency` | `{track_id: string}` | `{route_id, output_latency_samples, output_latency_ms}` | Output latency for a route |
| `daw.get_processor_latency` | `{track_id: string, index: int}` | `{route_id, processor_index, processor_name, signal_latency_samples, input_latency_samples, output_latency_samples, signal_latency_ms}` | Latency introduced by a specific processor |
| `daw.get_capture_latency` | none | `{capture_latency_samples, capture_latency_ms}` | Recording latency |
| `daw.get_playback_latency` | none | `{playback_latency_samples, playback_latency_ms}` | Playback latency |
| `daw.get_hardware_input_latency` | none | `{hardware_input_latency_samples, hardware_input_latency_ms}` | Hardware input latency |
| `daw.get_hardware_output_latency` | none | `{hardware_output_latency_samples, hardware_output_latency_ms}` | Hardware output latency |
| `daw.get_worst_track_latency` | none | `{worst_latency_samples, worst_track_name, worst_latency_ms}` | Worst-case latency across all tracks |
| `daw.get_latency_compensation_enabled` | none | `{enabled, info}` | Check if latency compensation is on |
| `daw.get_all_route_latencies` | none | `{routes: [{id, name, signal_latency_samples, playback_latency_samples, *_ms}], count}` | Latency summary for every route |
| `daw.set_systemic_input_latency` | `{latency_samples: int}` | `{ok, systemic_input_latency}` | Set systemic input latency |
| `daw.set_systemic_output_latency` | `{latency_samples: int}` | `{ok, systemic_output_latency}` | Set systemic output latency |
| `daw.get_systemic_input_latency` | none | `{systemic_input_latency_samples, systemic_input_latency_ms}` | Get systemic input latency |
| `daw.get_systemic_output_latency` | none | `{systemic_output_latency_samples, systemic_output_latency_ms}` | Get systemic output latency |

## Audio Analysis - Metering

*Source: `dawflow_commands_analysis.cc` -- 20 commands for real-time meter levels and meter configuration.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_route_meter_levels` | `{track_id: string}` | `{track_id, channels: [{channel, peak_dB, rms_dB}], n_channels}` | Get current peak + RMS meter levels per channel |
| `daw.get_route_peak_meter` | `{track_id: string}` | `{track_id, peaks_dB: [float], max_peak_dB}` | Get peak meter reading for a route |
| `daw.get_route_rms_meter` | `{track_id: string}` | `{track_id, rms_dB: [float], n_channels}` | Get RMS meter reading for a route |
| `daw.get_all_route_meters` | none | `{routes: [{id, name, channels: [{peak_dB, rms_dB}], n_channels}], count}` | Get meter levels for all routes at once |
| `daw.get_master_meter_levels` | none | `{channels: [{channel, peak_dB, rms_dB, k14_dB, k20_dB}], n_channels, name}` | Get master bus meter levels |
| `daw.get_route_meter_k14` | `{track_id: string}` | `{track_id, k14_dB: [float], n_channels}` | Get K-14 metering for a route |
| `daw.get_route_meter_k20` | `{track_id: string}` | `{track_id, k20_dB: [float], n_channels}` | Get K-20 metering for a route |
| `daw.get_meter_type_for_route` | `{track_id: string}` | `{track_id, meter_type}` | Get the metering type set for a route |
| `daw.set_meter_type_for_route` | `{track_id: string, meter_type: string}` | `{ok, track_id, meter_type}` | Set metering type (Peak/Krms/K20/K14/VU/etc.) |
| `daw.get_meter_falloff_rate` | none | `{meter_falloff}` | Get meter falloff rate |
| `daw.set_meter_falloff_rate` | `{falloff: float}` | `{ok, meter_falloff}` | Set meter falloff rate |
| `daw.get_route_meter_hold` | `{track_id: string}` | `{track_id, peak_hold_dB: [float], n_channels}` | Get meter peak hold value |
| `daw.reset_route_meter_peak` | `{track_id: string}` | `{ok, track_id}` | Reset peak hold for a route |
| `daw.reset_all_meter_peaks` | none | `{ok, count}` | Reset all peak holds |
| `daw.get_meter_line_up_level` | none | `{meter_type_master, meter_type_track, meter_type_bus, meter_falloff}` | Get meter line-up level |
| `daw.get_route_input_meter` | `{track_id: string}` | `{track_id, channels: [{channel, peak_dB, rms_dB}], meter_point}` | Get input (pre-fader) meter levels |
| `daw.get_route_output_meter` | `{track_id: string}` | `{track_id, channels: [{channel, peak_dB, rms_dB}], meter_point}` | Get output (post-fader) meter levels |
| `daw.get_route_meter_position` | `{track_id: string}` | `{track_id, meter_point}` | Get meter position in signal chain |
| `daw.get_session_meter_type` | none | `{meter_type_master, meter_type_track, meter_type_bus}` | Get default session meter type |
| `daw.set_session_meter_type` | `{target?: string, meter_type: string}` | `{ok, target, meter_type}` | Set default session meter type |

## Audio Analysis - Loudness

*Source: `dawflow_commands_analysis.cc` -- 15 commands for EBU R128 loudness, dynamic range, and normalization.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.analyze_region_loudness` | `{track_id: string, region_id: string}` | `{track_id, region_id, integrated_lufs, peak_dBFS, rms_dBFS}` | Analyze loudness of a region (approx LUFS) |
| `daw.get_region_loudness_range` | `{track_id: string, region_id: string}` | `{track_id, region_id, lra_lu}` | Get loudness range (LRA) (stub) |
| `daw.get_region_true_peak` | `{track_id: string, region_id: string}` | `{track_id, region_id, true_peak_dBTP, sample_peak}` | Get true peak level |
| `daw.get_region_momentary_loudness` | `{track_id: string, region_id: string}` | `{track_id, region_id, momentary_lufs}` | Get max momentary loudness (stub) |
| `daw.get_region_short_term_loudness` | `{track_id: string, region_id: string}` | `{track_id, region_id, short_term_lufs}` | Get max short-term loudness (stub) |
| `daw.analyze_track_loudness` | `{track_id: string}` | `{track_id, peak_dBFS, rms_dBFS, lufs_approx, region_count}` | Analyze loudness of entire track |
| `daw.get_session_loudness_target` | none | `{target_lufs, standard}` | Get session loudness target |
| `daw.set_session_loudness_target` | `{target_lufs: double}` | `{ok, target_lufs}` | Set session loudness target (stub) |
| `daw.get_export_loudness_spec` | none | `{target_lufs, true_peak_dBTP, standard}` | Get export loudness spec |
| `daw.set_export_loudness_target` | `{target_lufs: double, true_peak_dBTP?: double}` | `{ok, target_lufs, true_peak_dBTP}` | Set export loudness target (stub) |
| `daw.normalize_region_loudness` | `{track_id: string, region_id: string, target_lufs?: double}` | `{ok, target_lufs, measured_lufs, gain_adjustment_dB, new_scale}` | Normalize region to target LUFS |
| `daw.get_loudness_standards` | none | `{standards: [{name, target_lufs, true_peak_dBTP, use}], count}` | List available loudness standards |
| `daw.get_region_dynamic_range` | `{track_id: string, region_id: string}` | `{dynamic_range_dB, peak_dBFS, rms_dBFS}` | Calculate dynamic range |
| `daw.get_region_crest_factor` | `{track_id: string, region_id: string}` | `{crest_factor_dB, crest_factor_linear, peak_dBFS, rms_dBFS}` | Calculate crest factor |
| `daw.get_region_dc_offset` | `{track_id: string, region_id: string}` | `{dc_offset, has_offset}` | Detect DC offset (stub) |

## Audio Analysis - Spectral

*Source: `dawflow_commands_analysis.cc` -- 15 commands for FFT spectrum, spectral features, and frequency band analysis.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_region_spectrum` | `{track_id: string, region_id: string, fft_size?: int}` | `{fft_size, sample_rate, bins: [{frequency_hz, magnitude_dB}]}` | Get frequency spectrum (FFT) (stub) |
| `daw.get_region_spectral_centroid` | `{track_id: string, region_id: string}` | `{spectral_centroid_hz}` | Get spectral centroid / brightness (stub) |
| `daw.get_region_spectral_rolloff` | `{track_id: string, region_id: string, rolloff_percentage?: double}` | `{spectral_rolloff_hz}` | Get spectral rolloff frequency (stub) |
| `daw.get_region_spectral_flux` | `{track_id: string, region_id: string}` | `{spectral_flux}` | Get spectral flux (stub) |
| `daw.get_region_spectral_flatness` | `{track_id: string, region_id: string}` | `{spectral_flatness}` | Get spectral flatness 0=tone, 1=noise (stub) |
| `daw.get_region_bandwidth` | `{track_id: string, region_id: string}` | `{bandwidth_hz, low_freq_hz, high_freq_hz}` | Get bandwidth of signal (stub) |
| `daw.get_region_frequency_peaks` | `{track_id: string, region_id: string, num_peaks?: int}` | `{peaks: [{frequency_hz, magnitude_dB, rank}]}` | Get dominant frequency peaks (stub) |
| `daw.get_region_harmonic_content` | `{track_id: string, region_id: string}` | `{fundamental_hz, harmonics, thd_percent}` | Analyze harmonic content (stub) |
| `daw.get_region_noise_floor` | `{track_id: string, region_id: string}` | `{noise_floor_dB}` | Estimate noise floor level (stub) |
| `daw.get_region_spectral_balance` | `{track_id: string, region_id: string}` | `{low_dB, mid_dB, high_dB}` | Get low/mid/high frequency balance (stub) |
| `daw.get_region_frequency_band_energy` | `{track_id: string, region_id: string, low_freq_hz?: double, high_freq_hz?: double}` | `{energy_dB}` | Get energy in frequency bands (stub) |
| `daw.get_region_spectrogram_data` | `{track_id: string, region_id: string, fft_size?: int, hop_size?: int}` | `{frames, n_frames, n_bins}` | Get spectrogram data (stub) |
| `daw.get_region_mel_spectrum` | `{track_id: string, region_id: string, n_mels?: int}` | `{n_mels, mel_bands}` | Get mel-frequency spectrum (stub) |
| `daw.get_region_octave_band_levels` | `{track_id: string, region_id: string}` | `{bands: [{center_hz, level_dB}], n_bands}` | Get levels per octave band (stub) |
| `daw.get_region_third_octave_levels` | `{track_id: string, region_id: string}` | `{bands: [{center_hz, level_dB}], n_bands}` | Get levels per 1/3 octave band (stub) |

## Audio Analysis - Transients & Rhythm

*Source: `dawflow_commands_analysis.cc` -- 15 commands for onset detection, tempo estimation, and rhythm analysis.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.detect_region_transients` | `{track_id: string, region_id: string, threshold?: double}` | `{transients, count, threshold}` | Detect transients (stub) |
| `daw.get_region_onset_times` | `{track_id: string, region_id: string}` | `{onsets, count}` | Get onset times (stub) |
| `daw.detect_region_tempo` | `{track_id: string, region_id: string}` | `{tempo_bpm, confidence}` | Detect tempo (stub) |
| `daw.get_region_beat_positions` | `{track_id: string, region_id: string}` | `{beats, count}` | Get beat positions (stub) |
| `daw.detect_region_time_signature` | `{track_id: string, region_id: string}` | `{numerator, denominator, confidence}` | Estimate time signature (stub) |
| `daw.get_region_rhythm_pattern` | `{track_id: string, region_id: string}` | `{pattern}` | Extract rhythm pattern (stub) |
| `daw.get_region_groove_template` | `{track_id: string, region_id: string}` | `{deviations}` | Extract groove template (stub) |
| `daw.detect_region_downbeats` | `{track_id: string, region_id: string}` | `{downbeats, count}` | Detect downbeats (stub) |
| `daw.get_region_tempo_curve` | `{track_id: string, region_id: string}` | `{tempo_points}` | Get tempo variation over time (stub) |
| `daw.detect_region_silence` | `{track_id: string, region_id: string, threshold_db?: double, min_length_samples?: int64}` | `{silent_sections, count}` | Detect silence (stub) |
| `daw.get_region_zero_crossings` | `{track_id: string, region_id: string}` | `{zero_crossing_rate, total_zero_crossings}` | Get zero-crossing rate (stub) |
| `daw.detect_region_clicks` | `{track_id: string, region_id: string, sensitivity?: double}` | `{clicks, count, sensitivity}` | Detect clicks/pops (stub) |
| `daw.get_region_transient_density` | `{track_id: string, region_id: string}` | `{density_per_second, density_curve}` | Get transient density (stub) |
| `daw.split_region_at_transients` | `{track_id: string, region_id: string, threshold?: double}` | `{ok, new_regions}` | Split region at transients (stub) |
| `daw.get_region_attack_time` | `{track_id: string, region_id: string}` | `{attack_time_ms}` | Estimate attack time (stub) |

## Audio Analysis - Pitch

*Source: `dawflow_commands_analysis.cc` -- 10 commands for pitch, key, scale, and chord detection.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.detect_region_pitch` | `{track_id: string, region_id: string}` | `{pitch_hz, midi_note, note_name, cents_deviation, confidence}` | Detect fundamental pitch (stub) |
| `daw.get_region_pitch_curve` | `{track_id: string, region_id: string}` | `{pitch_points}` | Get pitch over time (stub) |
| `daw.detect_region_key` | `{track_id: string, region_id: string}` | `{key, mode, confidence}` | Estimate musical key (stub) |
| `daw.detect_region_scale` | `{track_id: string, region_id: string}` | `{scale, root, confidence}` | Estimate musical scale (stub) |
| `daw.get_region_pitch_histogram` | `{track_id: string, region_id: string}` | `{chroma: [{note, energy}]}` | Get pitch histogram (stub) |
| `daw.detect_region_tuning` | `{track_id: string, region_id: string}` | `{reference_hz, deviation_cents, confidence}` | Detect tuning reference (stub) |
| `daw.get_region_pitch_stability` | `{track_id: string, region_id: string}` | `{pitch_stability, pitch_std_dev_cents}` | Measure pitch stability (stub) |
| `daw.get_region_vibrato_rate` | `{track_id: string, region_id: string}` | `{vibrato_rate_hz, vibrato_depth_cents, has_vibrato}` | Estimate vibrato rate (stub) |
| `daw.get_region_pitch_range` | `{track_id: string, region_id: string}` | `{lowest_hz, highest_hz, range_semitones}` | Get pitch range (stub) |
| `daw.detect_region_chord` | `{track_id: string, region_id: string}` | `{chord, root, quality, confidence}` | Estimate chord (stub) |

## Audio Analysis - Waveform

*Source: `dawflow_commands_analysis.cc` -- 15 commands for waveform display, thumbnails, minimap, and stereo analysis.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_waveform_overview` | `{track_id: string, region_id: string, width_pixels?: int}` | `{channels: [{channel, min, max, n_peaks}], n_channels, width_pixels, length_samples}` | Get downsampled waveform for overview |
| `daw.get_waveform_detail` | `{track_id: string, region_id: string, start_sample?: int64, end_sample: int64, width_pixels?: int}` | `{channels, start_sample, end_sample, width_pixels}` | Get detailed waveform for zoomed view |
| `daw.get_waveform_peaks_per_pixel` | `{track_id: string, region_id: string, start_sample?: int64, n_samples: int64, n_peaks: int}` | `{channels, n_channels, samples_per_peak}` | Get peaks at given zoom level |
| `daw.get_region_waveform_cache_status` | `{track_id: string, region_id: string}` | `{cache_ready, n_channels}` | Check if waveform cache is built |
| `daw.build_region_waveform_cache` | `{track_id: string, region_id: string}` | `{ok}` | Trigger waveform cache building |
| `daw.get_region_overview_data` | `{track_id: string, region_id: string, width_pixels?: int}` | `{region_name, start_sample, length_samples, min, max, n_peaks}` | Get region overview for arrangement view |
| `daw.get_minimap_data` | `{peaks_per_region?: int}` | `{tracks: [{id, name, regions: [{id, name, start_sample, length_samples, peaks}]}], count}` | Get waveform minimap for all regions |
| `daw.get_region_thumbnail` | `{track_id: string, region_id: string, width?: int}` | `{thumbnail, width}` | Get compact waveform thumbnail |
| `daw.get_stereo_correlation` | `{track_id: string, region_id: string}` | `{correlation}` | Get stereo correlation (stub) |
| `daw.get_stereo_width` | `{track_id: string, region_id: string}` | `{stereo_width}` | Get stereo width (stub) |
| `daw.get_phase_correlation` | `{track_id: string, region_id: string}` | `{phase_correlation}` | Get phase correlation (stub) |
| `daw.get_mid_side_balance` | `{track_id: string, region_id: string}` | `{mid_dB, side_dB, balance}` | Get mid/side balance (stub) |
| `daw.get_channel_difference` | `{track_id: string, region_id: string}` | `{difference_dB, correlation}` | Get L/R channel difference (stub) |
| `daw.get_region_sample_value_at` | `{track_id: string, region_id: string, position_sample: int64, channel?: int}` | `{value, value_dB}` | Get sample value at position |
| `daw.get_region_statistics` | `{track_id: string, region_id: string}` | `{region_name, length_samples, duration_sec, n_channels, peak_dBFS, rms_dBFS, crest_factor_dB}` | Get statistical summary |

## Audio Analysis - Plugin Chain

*Source: `dawflow_commands_analysis.cc` -- 10 commands for plugin latency, CPU, type, and format inspection.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_route_total_plugin_latency` | `{track_id: string}` | `{total_latency_samples, total_latency_ms, plugins: [{id, name, latency_samples, latency_ms}]}` | Total latency from all plugins |
| `daw.get_plugin_processing_latency` | `{track_id: string, processor_id: string}` | `{name, latency_samples, latency_ms}` | Latency for specific plugin |
| `daw.get_plugin_cpu_usage` | `{track_id: string, processor_id: string}` | `{name, cpu_percent}` | CPU usage for plugin (stub) |
| `daw.get_route_cpu_usage` | `{track_id: string}` | `{plugin_count, dsp_load}` | Total CPU for route (proxy) |
| `daw.get_plugin_type_info` | `{track_id: string, processor_id: string}` | `{name, type, creator, category, unique_id}` | Get plugin type (VST3/AU/LV2) |
| `daw.get_plugin_format_info` | `{track_id: string, processor_id: string}` | `{name, input_audio, output_audio, format}` | Get format (mono/stereo/surround) |
| `daw.get_plugin_channel_config` | `{track_id: string, processor_id: string}` | `{name, input_audio, output_audio, strict_io}` | Get channel configuration |
| `daw.get_plugin_has_editor` | `{track_id: string, processor_id: string}` | `{name, has_editor}` | Check if plugin has custom editor |
| `daw.get_plugin_is_instrument` | `{track_id: string, processor_id: string}` | `{name, is_instrument, category}` | Check if plugin is instrument |
| `daw.get_plugin_category` | `{track_id: string, processor_id: string}` | `{name, category}` | Get plugin category |

## Audio Analysis - Comparison

*Source: `dawflow_commands_analysis.cc` -- 10 commands for comparing regions, detecting clipping, and cross-correlation.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.compare_region_levels` | `{track_id_a, region_id_a, track_id_b, region_id_b: string}` | `{region_a, region_b, peak_difference_dB, rms_difference_dB}` | Compare loudness between two regions |
| `daw.get_region_difference` | `{track_id_a, region_id_a, track_id_b, region_id_b: string}` | `{max_diff, rms_diff}` | Sample-level difference (stub) |
| `daw.correlate_regions` | `{track_id_a, region_id_a, track_id_b, region_id_b: string}` | `{peak_correlation, offset_samples}` | Cross-correlate for alignment (stub) |
| `daw.get_region_similarity` | `{track_id_a, region_id_a, track_id_b, region_id_b: string}` | `{similarity}` | Similarity score (stub) |
| `daw.detect_region_clipping` | `{track_id: string, region_id: string, threshold?: double}` | `{clipping, peak_dBFS, threshold}` | Detect clipping |
| `daw.get_region_headroom` | `{track_id: string, region_id: string}` | `{headroom_dB, peak_dBFS}` | Get headroom to 0 dBFS |
| `daw.get_region_signal_to_noise` | `{track_id: string, region_id: string}` | `{snr_dB}` | Signal-to-noise ratio (stub) |
| `daw.count_region_clips` | `{track_id: string, region_id: string, threshold?: double}` | `{clip_count, threshold}` | Count clipped samples (stub) |
| `daw.get_region_peak_histogram` | `{track_id: string, region_id: string, n_bins?: int}` | `{bins, n_bins}` | Peak value histogram (stub) |
| `daw.get_region_amplitude_distribution` | `{track_id: string, region_id: string, n_bins?: int}` | `{bins, n_bins}` | Amplitude distribution (stub) |

## Advanced Region Editing

*Source: `dawflow_commands_advanced_editing.cc` -- 20 commands for region search, layering, sync points, and boundary navigation.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_regions_in_range` | `{track_id: string, start: int64, end: int64}` | `{regions: [...], count}` | Get all regions in a time range |
| `daw.get_overlapping_regions` | `{track_id: string}` | `{overlaps: [{region_a, region_b, overlap_start, overlap_end}], count}` | Find overlapping regions |
| `daw.get_region_boundaries` | `{track_id: string}` | `{boundaries: [int64], count}` | Get all region start/end points |
| `daw.get_region_at_sample_position` | `{track_id: string, position: int64}` | `{regions: [...], count}` | Get regions at sample position |
| `daw.get_topmost_region_at` | `{track_id: string, position: int64}` | `{region?, found}` | Get topmost region at position |
| `daw.get_regions_by_name` | `{pattern: string}` | `{regions: [{..., track_id, track_name}], count}` | Search regions by name across all tracks |
| `daw.get_region_layer` | `{track_id: string, region_id: string}` | `{region_id, layer}` | Get region layer number |
| `daw.set_region_layer` | `{track_id: string, region_id: string, action?: string}` | `{ok, layer}` | Set layer (raise/lower/raise_to_top/lower_to_bottom) |
| `daw.region.raise_to_top_layer` | `{track_id: string, region_id: string}` | `{ok, layer}` | Raise region to top layer |
| `daw.region.lower_to_bottom_layer` | `{track_id: string, region_id: string}` | `{ok, layer}` | Lower region to bottom layer |
| `daw.get_region_sync_point` | `{track_id: string, region_id: string}` | `{sync_point, position}` | Get region sync point |
| `daw.region.set_sync_point` | `{track_id: string, region_id: string, sync_position: int64}` | `{ok, sync_point}` | Set region sync point |
| `daw.place_region_at_sync` | `{track_id: string, region_id: string, position: int64}` | `{ok, position}` | Place region aligning sync point |
| `daw.get_region_bounds` | `{track_id: string, region_id: string}` | `{position, start, length, end, layer, name}` | Get all bounds at once |
| `daw.set_region_bounds` | `{track_id: string, region_id: string, position?, length?, start?}` | `{ok, position, start, length}` | Set bounds in one call |
| `daw.get_region_equivalent` | `{track_id: string, region_id: string, target_track_id: string}` | `{equivalents, count}` | Get equivalent region on another playlist |
| `daw.find_next_region_boundary` | `{track_id: string, position: int64}` | `{boundary?, found}` | Find next boundary after position |
| `daw.find_prev_region_boundary` | `{track_id: string, position: int64}` | `{boundary?, found}` | Find previous boundary |
| `daw.get_region_automation` | `{track_id: string, region_id: string}` | `{name, position, length, description}` | Get region automation data |
| `daw.get_compound_region_info` | `{track_id: string, region_id: string}` | `{is_compound, source_level, whole_file}` | Get compound region info |

## Snap & Grid

*Source: `dawflow_commands_advanced_editing.cc` -- 15 commands for snap modes and grid configuration.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.editor.get_snap_mode` | none | `{snap_mode}` | Get snap mode (stub) |
| `daw.editor.set_snap_mode` | `{mode: string}` | `{ok, requested}` | Set snap mode (stub) |
| `daw.get_grid_type` | none | `{grid_type}` | Get grid type (stub) |
| `daw.set_grid_type` | `{grid_type: string}` | `{ok, requested}` | Set grid type (stub) |
| `daw.snap_position_to_grid` | `{position: int64}` | `{original_position, snapped_position, snapped_bbt}` | Snap position to nearest beat |
| `daw.get_grid_points_in_range` | `{start: int64, end: int64}` | `{grid_points: [{position, bbt}], count}` | Get grid points in range |
| `daw.get_nearest_grid_point` | `{position: int64}` | `{nearest, nearest_bbt, distance}` | Get nearest grid point |
| `daw.get_snap_threshold` | none | `{threshold}` | Get snap threshold (stub) |
| `daw.set_snap_threshold` | `{threshold: int}` | `{ok, requested}` | Set snap threshold (stub) |
| `daw.get_grid_subdivision` | none | `{subdivision}` | Get grid subdivision (stub) |
| `daw.set_grid_subdivision` | `{subdivision: int}` | `{ok, requested}` | Set grid subdivision (stub) |
| `daw.is_snap_enabled` | none | `{enabled}` | Check if snap enabled (stub) |
| `daw.toggle_snap` | none | `{ok}` | Toggle snap (stub) |
| `daw.get_visible_grid_lines` | `{start?: int64, end?: int64}` | `{lines: [{position, is_bar, bbt}], count}` | Get grid lines in range |
| `daw.editor.snap_regions_to_grid` | `{track_id: string}` | `{ok, snapped, total}` | Snap all regions to grid |

## Edit Modes & Tools

*Source: `dawflow_commands_advanced_editing.cc` -- 15 commands for edit mode, tools, and draw settings.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_edit_mode` | none | `{edit_mode}` | Get edit mode (slide/ripple/lock) |
| `daw.set_edit_mode` | `{mode: string}` | `{ok, edit_mode}` | Set edit mode |
| `daw.get_edit_point` | none | `{edit_point}` | Get edit point (stub) |
| `daw.set_edit_point` | `{edit_point: string}` | `{ok, requested}` | Set edit point (stub) |
| `daw.get_ripple_mode` | none | `{ripple_mode}` | Get ripple mode (stub) |
| `daw.set_ripple_mode` | `{mode: string}` | `{ok, requested}` | Set ripple mode (stub) |
| `daw.get_draw_length` | none | `{draw_length}` | Get draw note length (stub) |
| `daw.set_draw_length` | `{length: string}` | `{ok, requested}` | Set draw note length (stub) |
| `daw.get_draw_velocity` | none | `{draw_velocity}` | Get draw velocity (stub) |
| `daw.set_draw_velocity` | `{velocity: int}` | `{ok, requested}` | Set draw velocity (stub) |
| `daw.get_draw_channel` | none | `{draw_channel}` | Get draw channel (stub) |
| `daw.set_draw_channel` | `{channel: int}` | `{ok, requested}` | Set draw channel (stub) |
| `daw.get_zoom_focus` | none | `{zoom_focus}` | Get zoom focus (stub) |
| `daw.set_zoom_focus` | `{focus: string}` | `{ok, requested}` | Set zoom focus (stub) |
| `daw.get_mouse_mode` | none | `{mouse_mode}` | Get mouse mode (stub) |

## MIDI Learn & Mapping

*Source: `dawflow_commands_advanced_editing.cc` -- 15 commands for MIDI learn and control surface configuration.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.start_midi_learn` | `{control_path: string}` | `{ok, control}` | Start MIDI learn (stub) |
| `daw.stop_midi_learn` | none | `{ok}` | Stop MIDI learn (stub) |
| `daw.get_midi_bindings` | none | `{bindings, count}` | Get MIDI bindings (stub) |
| `daw.add_midi_binding` | `{control_path: string, channel: int, cc: int}` | `{ok}` | Add MIDI binding (stub) |
| `daw.remove_midi_binding` | `{control_path: string}` | `{ok}` | Remove MIDI binding (stub) |
| `daw.clear_all_midi_bindings` | none | `{ok}` | Clear all bindings (stub) |
| `daw.get_midi_binding_for_control` | `{control_path: string}` | `{control, bound}` | Get binding for control (stub) |
| `daw.get_controllable_list` | none | `{controllables: [{path, id, type, track}], count}` | List MIDI-controllable params |
| `daw.get_midi_feedback_enabled` | none | `{enabled}` | Check MIDI feedback (stub) |
| `daw.set_midi_feedback_enabled` | `{enabled: boolean}` | `{ok}` | Set MIDI feedback (stub) |
| `daw.get_midi_input_ports` | none | `{ports: [{name, type}], count}` | Get MIDI input ports |
| `daw.set_midi_control_port` | `{port_name: string}` | `{ok}` | Set MIDI control port (stub) |
| `daw.get_generic_midi_controls` | none | `{controls, count}` | Get generic MIDI controls (stub) |
| `daw.save_midi_bindings` | `{filepath: string}` | `{ok}` | Save bindings to file (stub) |
| `daw.load_midi_bindings` | `{filepath: string}` | `{ok}` | Load bindings from file (stub) |

## MIDI Scene Changes

*Source: `dawflow_commands_advanced_editing.cc` -- 10 commands for MIDI program/bank changes at markers.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_scene_changes` | none | `{scene_changes: [{location_id, location_name, position, program, bank, channel, active}], count}` | Get all scene changes |
| `daw.add_scene_change` | `{position: int64, program?: int, bank?: int, channel?: int, name?: string}` | `{ok, location_id, program, bank, channel}` | Add scene change |
| `daw.remove_scene_change` | `{location_id: string}` | `{ok}` | Remove scene change |
| `daw.get_scene_change_at` | `{location_id: string}` | `{found, program?, bank?, channel?}` | Get scene change at marker |
| `daw.set_scene_change_program` | `{location_id: string, program: int}` | `{ok, program}` | Set program change |
| `daw.set_scene_change_bank` | `{location_id: string, bank: int}` | `{ok, bank}` | Set bank select |
| `daw.set_scene_change_channel` | `{location_id: string, channel: int}` | `{ok, channel}` | Set MIDI channel |
| `daw.get_scene_change_details` | `{location_id: string}` | `{found, location_name, position, active, program, bank, channel, type}` | Get full scene change details |
| `daw.enable_scene_changes` | `{enabled: boolean}` | `{ok, enabled, count}` | Enable/disable scene changes |
| `daw.get_scene_changes_enabled` | none | `{total, active, enabled}` | Check if scene changes enabled |

## Advanced Playlists

*Source: `dawflow_commands_advanced_editing.cc` -- 15 commands for playlist management.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.playlist.get_for_track` | `{track_id: string}` | `{playlists: [{id, name, region_count, current}], count}` | Get playlists for track |
| `daw.playlist.get_regions` | `{track_id: string}` | `{playlist_name, regions, count}` | Get regions in playlist |
| `daw.get_playlist_length` | `{track_id: string}` | `{playlist_name, length, region_count}` | Get playlist length |
| `daw.get_playlist_region_count` | `{track_id: string}` | `{playlist_name, count}` | Get region count |
| `daw.playlist.switch_for_track` | `{track_id: string, playlist_id: string}` | `{ok, playlist_name}` | Switch track playlist |
| `daw.playlist.create_new` | `{track_id: string, name?: string, switch_to?: boolean}` | `{ok, playlist_id, playlist_name}` | Create new playlist |
| `daw.copy_playlist` | `{track_id: string, name?: string, switch_to?: boolean}` | `{ok, playlist_id, playlist_name}` | Copy/duplicate playlist |
| `daw.rename_playlist` | `{track_id: string, name: string}` | `{ok, name}` | Rename playlist |
| `daw.clear_playlist` | `{track_id: string}` | `{ok, regions_removed}` | Clear all regions |
| `daw.get_unused_playlists` | none | `{playlists, count}` | Get unused playlists |
| `daw.remove_unused_playlists` | none | `{ok, removed}` | Remove unused playlists |
| `daw.get_playlist_modified` | `{track_id: string}` | `{playlist_name, modified, region_count}` | Check if modified |
| `daw.playlist.get_all` | none | `{playlists: [{id, name, region_count, hidden}], count}` | List all playlists |
| `daw.get_hidden_playlists` | none | `{playlists, count}` | Get hidden playlists |
| `daw.get_playlist_properties` | `{track_id: string}` | `{id, name, region_count, length, hidden, shared, empty}` | Get playlist properties |

## Advanced Selection

*Source: `dawflow_commands_advanced_editing.cc` -- 10 commands for selection operations.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.selection.get_regions` | none | `{regions, count}` | Get selected regions (stub) |
| `daw.selection.get_tracks` | none | `{tracks, count}` | Get selected tracks (stub) |
| `daw.selection.regions_in_range` | `{track_id: string, start: int64, end: int64}` | `{regions, count}` | Get regions in range |
| `daw.select_all_regions_on_track` | `{track_id: string}` | `{regions, count}` | Select all on track |
| `daw.select_regions_by_name` | `{pattern: string}` | `{regions, count}` | Select by name pattern |
| `daw.deselect_all_regions` | none | `{ok}` | Deselect all (stub) |
| `daw.invert_region_selection` | none | `{ok}` | Invert selection (stub) |
| `daw.select_next_region` | `{track_id: string, after_position?: int64}` | `{region?, found}` | Select next region |
| `daw.select_prev_region` | `{track_id: string, before_position?: int64}` | `{region?, found}` | Select previous region |
| `daw.get_selection_bounds` | none | `{start, end, has_selection}` | Get selection bounds (stub) |

## Audition

*Source: `dawflow_commands_advanced_editing.cc` -- 10 commands for auditioning (previewing).*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.audition_region` | `{track_id: string, region_id: string}` | `{ok, auditioning}` | Audition a region |
| `daw.stop_audition` | none | `{ok}` | Stop auditioning |
| `daw.is_auditioning` | none | `{auditioning}` | Check if auditioning |
| `daw.audition_source` | `{source_id: string}` | `{ok, source_name, length}` | Audition source (info only) |
| `daw.set_audition_volume` | `{volume: double}` | `{ok, volume}` | Set audition volume |
| `daw.get_audition_volume` | none | `{volume}` | Get audition volume |
| `daw.audition_from_position` | `{track_id: string, region_id: string, position: int64}` | `{ok, auditioning}` | Audition from position |
| `daw.audition_range` | `{start: int64, end: int64}` | `{ok}` | Audition range (limited) |
| `daw.get_audition_position` | none | `{auditioning, position}` | Get audition position |
| `daw.get_audition_length` | none | `{auditioning, length, position}` | Get audition length |

## Session XML & State

*Source: `dawflow_commands_session_deep.cc` -- 20 commands for raw XML state access and metadata.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_session_state_xml` | none | `{xml}` | Get full session state as XML |
| `daw.get_route_state_xml` | `{route_id: string}` | `{xml, route_id}` | Get route state as XML |
| `daw.get_processor_state_xml` | `{route_id: string, processor_id: string}` | `{xml, processor_id}` | Get processor state as XML |
| `daw.get_plugin_state_xml` | `{route_id: string, processor_id: string}` | `{xml, processor_id}` | Get plugin state as XML |
| `daw.get_playlist_state_xml` | `{route_id: string}` | `{xml, playlist_name}` | Get playlist state as XML |
| `daw.get_region_state_xml` | `{route_id: string, region_id: string}` | `{xml, region_id}` | Get region state as XML |
| `daw.get_location_state_xml` | `{name: string}` | `{xml, name}` | Get location state as XML |
| `daw.get_tempo_map_state_xml` | none | `{xml}` | Get tempo map state as XML |
| `daw.get_route_group_state_xml` | `{name: string}` | `{xml, name}` | Get route group state as XML |
| `daw.get_session_metadata` | none | `{title, artist, album, composer, genre, comment, copyright, isrc, year, ...}` | Get session metadata |
| `daw.set_session_metadata` | `{title?, artist?, album?, ...}` | `{ok, fields_set}` | Set session metadata |
| `daw.get_session_description` | none | `{description}` | Get session description |
| `daw.set_session_description` | `{description: string}` | `{ok}` | Set session description |
| `daw.get_session_creation_date` | none | `{creation_date, session_path}` | Get creation date |
| `daw.get_session_modification_date` | none | `{modification_date}` | Get modification date |
| `daw.get_session_version` | none | `{session_name, snap_name, sample_rate}` | Get session version |
| `daw.get_session_program_version` | none | `{program, revision}` | Get DAWFLOW version |
| `daw.get_session_uuid` | none | `{session_name, session_path, uuid}` | Get session UUID |
| `daw.get_session_ardour_version` | none | `{ardour_revision}` | Get Ardour version |
| `daw.export_session_state` | none | `{state, format}` | Export state as JSON |

## Plugin State Serialization

*Source: `dawflow_commands_session_deep.cc` -- 20 commands for plugin state blob import/export and parameter introspection.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_plugin_state_blob` | `{route_id: string, processor_id: string}` | `{blob, encoding, processor_id}` | Get plugin state as base64 XML |
| `daw.set_plugin_state_blob` | `{route_id: string, processor_id: string, blob: string}` | `{ok, processor_id}` | Restore plugin state from blob |
| `daw.get_plugin_preset_data` | `{route_id: string, processor_id: string}` | `{presets: [{uri, label, user}], count, current_preset}` | Get preset list |
| `daw.export_plugin_chain` | `{route_id: string}` | `{chain: [{processor_id, name, active, state_blob}], count}` | Export plugin chain as blobs |
| `daw.import_plugin_chain` | params | `{status}` | Import plugin chain (stub) |
| `daw.copy_plugin_state` | `{route_id: string, processor_id: string}` | `{ok, clipboard_size_bytes}` | Copy plugin state to clipboard |
| `daw.paste_plugin_state` | `{route_id: string, processor_id: string}` | `{ok, processor_id}` | Paste plugin state from clipboard |
| `daw.get_plugin_parameter_defaults` | `{route_id: string, processor_id: string}` | `{defaults: [{index, default_value}], count}` | Get parameter defaults |
| `daw.get_plugin_parameter_ranges` | `{route_id: string, processor_id: string}` | `{ranges: [{index, min, max, default}], count}` | Get parameter ranges |
| `daw.get_plugin_parameter_names` | `{route_id: string, processor_id: string}` | `{parameters: [{index, name, is_input, is_output}], count}` | Get parameter names |
| `daw.get_plugin_parameter_groups` | `{route_id: string, processor_id: string}` | `{groups: [{index, name, group}], count}` | Get parameter groups |
| `daw.get_plugin_io_configuration` | `{route_id: string, processor_id: string}` | `{input_streams, output_streams, input_midi, output_midi}` | Get plugin I/O config |
| `daw.get_plugin_supported_formats` | `{route_id: string, processor_id: string}` | `{type, supports_audio, supports_midi}` | Get supported formats |
| `daw.get_plugin_unique_id` | `{route_id: string, processor_id: string}` | `{unique_id}` | Get unique ID |
| `daw.get_plugin_vendor` | `{route_id: string, processor_id: string}` | `{vendor}` | Get vendor/creator |
| `daw.get_plugin_version` | `{route_id: string, processor_id: string}` | `{name, type}` | Get version info |
| `daw.get_plugin_description` | `{route_id: string, processor_id: string}` | `{name, category, creator, unique_id}` | Get description |
| `daw.get_plugin_uri` | `{route_id: string, processor_id: string}` | `{uri, name}` | Get plugin URI |
| `daw.is_plugin_configurable` | `{route_id: string, processor_id: string}` | `{configurable, parameter_count}` | Check if configurable |
| `daw.get_plugin_latency_info` | `{route_id: string, processor_id: string}` | `{latency_samples, latency_ms}` | Get plugin latency |

## Configuration Access

*Source: `dawflow_commands_session_deep.cc` -- 15 commands for session and global config.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_session_config` | none | `{config}` | Get full session config as JSON |
| `daw.get_session_config_value` | `{key: string}` | `{key, found, value?}` | Get config value by key |
| `daw.set_session_config_value` | `{key: string, value: any}` | `{key, ok}` | Set config value (limited keys) |
| `daw.get_global_config` | none | `{config}` | Get full global config |
| `daw.get_global_config_value` | `{key: string}` | `{key, found, value?}` | Get global config value |
| `daw.set_global_config_value` | `{key: string}` | `{key, status}` | Set global config (stub) |
| `daw.get_config_defaults` | none | `{session_defaults}` | Get default config values |
| `daw.list_config_keys` | none | `{keys: [string], count}` | List all config keys |
| `daw.get_auto_input_enabled` | none | `{auto_input}` | Get auto-input |
| `daw.set_auto_input_enabled` | `{enabled: boolean}` | `{ok, auto_input}` | Set auto-input |
| `daw.get_auto_play_enabled` | none | `{auto_play}` | Get auto-play |
| `daw.set_auto_play_enabled` | `{enabled: boolean}` | `{ok, auto_play}` | Set auto-play |
| `daw.get_auto_return_enabled` | none | `{auto_return}` | Get auto-return |
| `daw.set_auto_return_enabled` | `{enabled: boolean}` | `{ok, auto_return}` | Set auto-return |
| `daw.get_session_config_summary` | none | `{auto_input, auto_play, auto_return, punch_in, punch_out, timecode_format, ...}` | Config summary |

## Route & Session Templates

*Source: `dawflow_commands_session_deep.cc` -- 10 commands for template management.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_route_templates` | none | `{templates: [{name, path, description, modified_with}], count}` | List route templates |
| `daw.save_route_as_template` | `{route_id: string, template_name: string}` | `{ok, path, name}` | Save route as template |
| `daw.create_route_from_template` | params | `{status}` | Create from template (stub) |
| `daw.delete_route_template` | `{template_name: string}` | `{ok, deleted}` | Delete template |
| `daw.rename_route_template` | `{old_name: string, new_name: string}` | `{ok}` | Rename template |
| `daw.get_route_template_info` | `{template_name: string}` | `{name, path, description, modified_with}` | Get template info |
| `daw.get_session_templates` | none | `{templates, count}` | List session templates |
| `daw.get_session_template_info` | `{template_name: string}` | `{name, path, description}` | Get session template info |
| `daw.save_as_session_template` | `{template_name: string, description?: string}` | `{ok, name}` | Save as session template |
| `daw.get_template_directory` | none | `{user_route_template_dir, user_session_template_dir, system_*}` | Get template directories |

## Deep Undo/Redo

*Source: `dawflow_commands_session_deep.cc` -- 10 commands for undo/redo history.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.undo.get_full_history` | none | `{undo_depth, next_undo}` | Get undo history info |
| `daw.get_redo_history` | none | `{redo_depth, next_redo}` | Get redo history |
| `daw.get_undo_depth` | none | `{undo_depth}` | Get undo depth |
| `daw.get_redo_depth` | none | `{redo_depth}` | Get redo depth |
| `daw.get_next_undo_label` | none | `{label, has_undo}` | Get next undo label |
| `daw.get_next_redo_label` | none | `{label, has_redo}` | Get next redo label |
| `daw.begin_undo_group` | `{name: string}` | `{ok, name}` | Begin undo group |
| `daw.end_undo_group` | none | `{ok}` | End undo group |
| `daw.clear_undo_history` | none | `{ok}` | Clear undo history |
| `daw.get_undo_history_size` | none | `{undo_depth, redo_depth, total_entries}` | Get undo/redo size |

## Environment & System

*Source: `dawflow_commands_session_deep.cc` -- 10 commands for version, paths, and system info.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_dawflow_version` | none | `{program, revision, base}` | Get DAWFLOW version |
| `daw.get_ardour_version` | none | `{revision}` | Get Ardour revision |
| `daw.get_build_info` | none | `{revision, compiler, cpp_standard, platform}` | Get build info |
| `daw.get_system_info` | none | `{os, architecture, sample_rate, buffer_size}` | Get system info |
| `daw.get_plugin_paths` | none | `{paths: {...}}` | Get plugin search paths |
| `daw.get_data_directory` | none | `{data_search_path}` | Get data directory |
| `daw.get_config_directory` | none | `{config_directory}` | Get config directory |
| `daw.get_cache_directory` | none | `{cache_directory}` | Get cache directory |
| `daw.get_temp_directory` | none | `{temp_directory}` | Get temp directory |
| `daw.get_installed_plugin_count` | none | `{lv2, au, vst3, ladspa, lua, total}` | Get plugin counts by type |

## Session Files

*Source: `dawflow_commands_session_deep.cc` -- 15 commands for session file operations.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_session_file_list` | none | `{files: [{name, path, size_bytes}], count, session_path}` | List session files |
| `daw.get_session_audio_files` | none | `{audio_files, count, audio_dir}` | List audio files |
| `daw.get_session_midi_files` | none | `{midi_files, count, midi_dir}` | List MIDI files |
| `daw.get_session_size_bytes` | none | `{size_bytes, size_mb}` | Get session size |
| `daw.get_session_audio_size` | none | `{size_bytes, size_mb}` | Get audio size |
| `daw.get_unused_sources` | none | `{unused_sources: [{id, name, length}], count}` | Get unused sources |
| `daw.cleanup_unused_sources` | none | `{status}` | Cleanup sources (stub) |
| `daw.get_missing_sources` | none | `{missing_sources: [{id, name}], count}` | Get missing sources |
| `daw.get_session_backup_info` | none | `{backup_dir, backup_files, count}` | Get backup info |
| `daw.get_interchange_dir` | none | `{interchange_dir, sound_dir, midi_dir}` | Get interchange dirs |
| `daw.get_peak_dir` | none | `{peak_dir}` | Get peak directory |
| `daw.get_session_lock_info` | none | `{lock_file, exists}` | Get lock file info |
| `daw.is_session_writable` | none | `{writable, session_path}` | Check if writable |
| `daw.get_dead_sources` | none | `{dead_dir, dead_files, count}` | Get dead sources |
| `daw.get_session_file_stats` | none | `{audio_file_count, midi_file_count, peak_file_count, total_size_bytes, total_size_mb}` | Get file stats |

## Sync & Timecode

*Source: `dawflow_commands_session_deep.cc` -- 10 commands for sync and timecode.*

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.get_sync_source` | none | `{sync_source, name, display_name}` | Get sync source |
| `daw.set_sync_source` | `{source: string}` | `{ok, source}` | Set sync source |
| `daw.get_timecode_format` | none | `{timecode_format}` | Get timecode format |
| `daw.set_timecode_format` | `{format: string}` | `{ok, format}` | Set timecode format |
| `daw.get_timecode_offset` | none | `{offset_samples, offset_negative}` | Get timecode offset |
| `daw.set_timecode_offset` | `{offset_samples: int64, negative?: boolean}` | `{ok}` | Set timecode offset |
| `daw.get_timecode_at_position` | `{position: int64}` | `{timecode, hours, minutes, seconds, frames}` | Sample to timecode |
| `daw.get_position_at_timecode` | `{hours: int, minutes: int, seconds: int, frames: int}` | `{position, timecode}` | Timecode to sample |
| `daw.is_synced_to_external` | none | `{external_sync, synced_to_external}` | Check external sync |
| `daw.get_transport_master_info` | none | `{name, display_name, type, available_masters, master_count, external_sync}` | Get transport master info |

---

## Safety: Command Metadata

10 commands for introspecting the API itself — validate parameters, search commands, and query metadata about any registered command.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.validate_params` | `{method: string, params?: object}` | `{valid, command_exists, method, error?}` | Check if a command exists and can accept the given parameters |
| `daw.get_command_info` | `{method: string}` | `{method, exists, category, is_destructive}` | Return metadata about a command: existence, category, destructiveness |
| `daw.get_command_schema` | `{method: string}` | `{method, schema}` | Return JSON description of expected params for a command |
| `daw.is_command_destructive` | `{method: string}` | `{method, destructive}` | Check if a command modifies session state |
| `daw.get_destructive_commands` | none | `{commands, count}` | List all registered destructive commands (sorted) |
| `daw.get_read_only_commands` | none | `{commands, count}` | List all registered non-destructive (read-only) commands (sorted) |
| `daw.get_command_categories` | none | `{categories: [{name, count, commands}]}` | Group all registered commands by functional category |
| `daw.get_command_help` | `{method: string}` | `{method, description}` | Return human-readable description for a command |
| `daw.get_api_stats` | none | `{total_commands, destructive_count, read_only_count, categories_count, source_files}` | Return overall API statistics |
| `daw.search_commands` | `{query: string}` | `{query, matches, count}` | Case-insensitive substring search across all command names |

---

## Safety: Transactional Execution

10 commands for grouping edits into atomic, undoable transactions — begin/commit/rollback, execute command batches, and manage session checkpoints.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.begin_transaction` | `{name: string}` | `{ok, transaction_name}` | Begin a reversible command group; fails if a transaction is already in progress |
| `daw.commit_transaction` | none | `{ok}` | Commit the current reversible command group to the undo stack |
| `daw.rollback_transaction` | none | `{ok}` | Abort the current transaction and undo any changes made within it |
| `daw.execute_atomic` | `{name: string, commands: [{method, params}]}` | `{ok, results: [{method, result}], undo_label}` | Execute multiple commands as a single undoable group; rolls back all on failure |
| `daw.execute_with_undo` | `{method: string, params: object, undo_label: string}` | `{...command_result, undo_label}` | Execute a single command wrapped in a named undo group |
| `daw.get_transaction_status` | none | `{in_transaction, transaction_name}` | Check if a transaction is currently in progress |
| `daw.get_pending_changes_count` | none | `{dirty, undo_depth}` | Check session dirty state and undo depth |
| `daw.checkpoint` | `{name?: string}` | `{ok, checkpoint_name, timestamp}` | Save session state as a named snapshot (auto-generates timestamped name if omitted) |
| `daw.restore_checkpoint` | `{checkpoint_name: string}` | `{ok, restored}` | Restore a previously saved snapshot by name |
| `daw.get_checkpoints` | none | `{checkpoints: [{name, timestamp}], count}` | List all session snapshots (`.ardour` files) as checkpoints |

---

## Safety: Invariant Guards

15 commands that check whether objects can be safely modified — frozen tracks, locked regions, recording state, export state, routing integrity, and session health diagnostics.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.can_modify_track` | `{track_id: string}` | `{track_id, can_modify, reasons}` | Check if a track can be modified (not frozen, not recording, active) |
| `daw.can_delete_track` | `{track_id: string}` | `{track_id, can_delete, reasons, warnings}` | Check if a track can be deleted (not master/monitor, not recording); warns about content |
| `daw.can_modify_region` | `{track_id: string, region_id: string}` | `{track_id, region_id, can_modify, reasons}` | Check if a region can be modified (track not frozen, region not locked) |
| `daw.can_modify_session` | none | `{can_modify, reasons}` | Check if the session can be modified (not exporting, writable, not deleting) |
| `daw.check_session_health` | none | `{healthy, issues: [{severity, category, description}]}` | Run diagnostic checks: dirty state, writable, I/O routing, empty playlists, engine status |
| `daw.check_route_health` | `{track_id: string}` | `{track_id, name, healthy, processor_count, issues: [{severity, category, description}]}` | Diagnostic checks on a single route: active state, plugin validity, I/O, frozen state |
| `daw.get_session_locks` | none | `{recording_tracks, frozen_tracks, locked_regions, exporting}` | Return all lock states in the session across all tracks and regions |
| `daw.get_modification_constraints` | none | `{constraints: [{object_type, object_id, reason}], count}` | List every object that cannot be modified right now and the reason why |
| `daw.is_session_busy` | none | `{busy, activities}` | Check if session is busy (recording, exporting, or auditioning) |
| `daw.get_recording_state_detailed` | none | `{recording, armed_tracks: [{id, name}], armed_count, capture_in_progress}` | Detailed recording state: armed tracks and capture status |
| `daw.is_export_in_progress` | none | `{exporting}` | Check if an export is currently in progress |
| `daw.get_frozen_tracks` | none | `{frozen_tracks: [{id, name, freeze_state, freeze_state_name}], count}` | List all frozen tracks with their freeze state |
| `daw.get_locked_regions` | none | `{locked_regions: [{id, name, track_id, track_name, locked, position_locked, position_samples, length_samples}], count}` | List all locked or position-locked regions across all tracks |
| `daw.get_hidden_routes` | none | `{hidden_routes: [{id, name, is_master, is_monitor, is_auditioner}], count}` | List all hidden routes in the session |
| `daw.validate_routing_integrity` | none | `{valid, feedback_detected, issues: [{severity, category, description}], routes_checked}` | Check for disconnected outputs/inputs and routing anomalies across all routes |

---

## Simulation: Region

15 dry-run commands that predict the outcome of region operations without performing them. All simulation commands return the standard prediction envelope:

```json
{
  "safe": true,
  "warnings": ["..."],
  "impacts": {...},
  "affected_objects": [{"type": "region", "id": "...", "name": "...", "change": "..."}],
  "reversible": true,
  "estimated_disk_impact_bytes": 0,
  "estimated_latency_change_samples": 0
}
```

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.simulate.move_region` | `{track_id: string, region_id: string, new_position: int64}` | prediction envelope | Predict overlap and boundary issues when moving a region to a new position |
| `daw.simulate.trim_region` | `{track_id: string, region_id: string, new_start?: int64, new_end?: int64}` | prediction envelope | Predict source boundary violations, gap creation, and neighbor overlaps from trimming |
| `daw.simulate.split_region` | `{track_id: string, region_id: string, split_position: int64}` | prediction envelope | Predict the two resulting regions and validate split position is within region bounds |
| `daw.simulate.delete_regions` | `{track_id: string, region_ids: string[]}` | prediction envelope | Predict orphaned sources (files with no remaining references) from deleting regions |
| `daw.simulate.duplicate_region` | `{track_id: string, region_id: string, count?: int, gap?: int64}` | prediction envelope | Predict placement and overlaps for one or more region duplicates |
| `daw.simulate.stretch_region` | `{track_id: string, region_id: string, new_length: int64}` | prediction envelope | Predict quality impact from stretch ratio and estimate new source file size |
| `daw.simulate.move_region_to_track` | `{region_id: string, source_track_id: string, dest_track_id: string}` | prediction envelope | Predict channel compatibility (down/upmix) and overlaps on the destination track |
| `daw.simulate.consolidate_regions` | `{track_id: string, region_ids: string[]}` | prediction envelope | Predict merged region bounds and estimate new audio file size from consolidation |
| `daw.simulate.normalize_region` | `{track_id: string, region_id: string, target_db?: float}` | prediction envelope | Predict gain change and clipping risk from normalizing to a target dB level |
| `daw.simulate.reverse_region` | `{track_id: string, region_id: string}` | prediction envelope | Predict new source file creation and estimate disk impact from reversing |
| `daw.simulate.fade_region` | `{track_id: string, region_id: string, fade_in_length?: int64, fade_out_length?: int64}` | prediction envelope | Predict fade overlap issues and validate fade lengths against region length |
| `daw.simulate.set_region_gain` | `{track_id: string, region_id: string, gain_db: float}` | prediction envelope | Predict clipping risk from applying a gain change to an audio region |
| `daw.simulate.quantize_regions` | `{track_id: string, grid_type?: string}` | prediction envelope | Predict how many regions would move and by how much when snapped to grid |
| `daw.simulate.align_regions` | `{track_id: string, reference_position: int64}` | prediction envelope | Predict movement distances when aligning all regions to a reference position |
| `daw.simulate.remove_region_gaps` | `{track_id: string}` | prediction envelope | Predict gap removal: count of gaps, total gap samples, and per-region movements |

---

## Simulation: Track

10 dry-run commands that predict the outcome of track-level operations. Returns the standard prediction envelope.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.simulate.delete_tracks` | `{track_ids: string[]}` | prediction envelope | Predict regions/plugins/sends lost per track; warns about master/monitor and incoming sends; irreversible |
| `daw.simulate.freeze_track` | `{track_id: string}` | prediction envelope | Predict plugins deactivated, estimated CPU savings, and new frozen audio file size |
| `daw.simulate.add_track` | `{type?: string, channels?: int}` | prediction envelope | Predict track name, order, type, and default port connections for a new track |
| `daw.simulate.duplicate_track` | `{track_id: string, with_playlist?: boolean}` | prediction envelope | Predict plugins and regions to duplicate, and estimate disk usage if copying playlist |
| `daw.simulate.change_track_channels` | `{track_id: string, new_channel_count: int}` | prediction envelope | Predict connection breakage, plugin reconfiguration needs, and panner changes |
| `daw.simulate.reorder_tracks` | `{track_id: string, new_position: int}` | prediction envelope | Predict track movement from current presentation order to new position |
| `daw.simulate.add_plugin_to_track` | `{track_id: string, plugin_id?: string}` | prediction envelope | Predict latency impact and report current plugin chain depth |
| `daw.simulate.remove_plugin_from_track` | `{track_id: string, processor_id: string}` | prediction envelope | Predict latency reduction from removing a specific plugin insert |
| `daw.simulate.set_track_monitoring` | `{track_id: string, monitoring_mode: string}` | prediction envelope | Predict signal flow change when switching monitoring mode (auto/input/disk/cue) |
| `daw.simulate.arm_track_for_record` | `{track_id: string, duration_seconds?: float}` | prediction envelope | Predict disk usage for estimated recording duration; warns if insufficient disk space |

---

## Simulation: Routing

10 dry-run commands that predict the outcome of routing and I/O changes. Returns the standard prediction envelope.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.simulate.connect_ports` | `{source_port: string, dest_port: string}` | prediction envelope | Predict connection result; warns if connection already exists and flags feedback risk |
| `daw.simulate.disconnect_ports` | `{source_port: string, dest_port: string}` | prediction envelope | Predict signal loss if this is the only connection to the destination port |
| `daw.simulate.add_send` | `{track_id: string, dest_track_id: string}` | prediction envelope | Predict channel mismatch and detect potential feedback loops (dest already sends to source) |
| `daw.simulate.remove_send` | `{track_id: string, send_index: int}` | prediction envelope | Predict signal loss to the destination track when removing a send by index |
| `daw.simulate.change_routing` | `{track_id: string, new_input?: string, new_output?: string}` | prediction envelope | Predict which current connections will be broken; reports full current I/O state |
| `daw.simulate.set_io_configuration` | `{track_id: string, inputs?: int, outputs?: int}` | prediction envelope | Predict connection breakage from changing input/output port counts |
| `daw.simulate.add_bus` | `{name?: string, channels?: int}` | prediction envelope | Predict bus name, channel count, and default output routing |
| `daw.simulate.remove_bus` | `{bus_id: string}` | prediction envelope | Predict orphaned sends from other routes; blocks master/monitor removal; irreversible |
| `daw.simulate.reconnect_defaults` | `{track_id: string}` | prediction envelope | Predict which existing connections will be replaced when reconnecting to default system I/O |
| `daw.simulate.swap_plugin_order` | `{track_id: string, proc_id_a: string, proc_id_b: string}` | prediction envelope | Predict channel compatibility issues when swapping two plugins in the signal chain |

---

## Simulation: Export

10 dry-run commands that predict the outcome of export and bounce operations. Returns the standard prediction envelope.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.simulate.export_session` | `{format?: string, sample_rate?: int, bit_depth?: int}` | prediction envelope | Predict output file size based on session length, channels, sample rate, and bit depth |
| `daw.simulate.export_stems` | `{format?: string}` | prediction envelope | Predict per-track stem file sizes and total disk usage for all tracks |
| `daw.simulate.export_range` | `{start: int64, end: int64, format?: string}` | prediction envelope | Predict output file size for a specific sample range export |
| `daw.simulate.bounce_range` | `{track_id: string, start: int64, end: int64}` | prediction envelope | Predict new region file size from bouncing a time range on a track |
| `daw.simulate.bounce_track` | `{track_id: string}` | prediction envelope | Predict file size and processing time for bouncing an entire track to audio |
| `daw.simulate.export_midi` | `{track_id: string}` | prediction envelope | Predict MIDI file size from estimated note count; validates track is MIDI type |
| `daw.simulate.render_offline` | `{start?: int64, end?: int64}` | prediction envelope | Predict offline render time based on track count and range (assumes ~5x realtime) |
| `daw.simulate.export_with_plugins` | `{track_id: string}` | prediction envelope | Report plugin chain details (names, latencies, active state) for the export path |
| `daw.simulate.export_channel_config` | `{channels?: int}` | prediction envelope | Predict channel layout (mono/stereo/surround) and warn on master bus channel mismatch |
| `daw.simulate.normalize_export` | `{target_lufs?: float}` | prediction envelope | Predict loudness normalization; warns if target LUFS is very loud (above -9) |

---

## Simulation: Session

15 dry-run commands that predict the outcome of session-level operations. Returns the standard prediction envelope.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.simulate.cleanup_unused` | none | prediction envelope | Predict unused source files that would be permanently deleted and disk space freed; irreversible |
| `daw.simulate.tempo_change` | `{new_tempo: float, position?: int64}` | prediction envelope | Predict impact on audio/MIDI regions; warns on large tempo changes (>30 BPM delta) |
| `daw.simulate.time_signature_change` | `{numerator: int, denominator: int, position?: int64}` | prediction envelope | Predict grid recalculation; warns on unusual denominators |
| `daw.simulate.save_session_as` | `{name: string, copy_media?: boolean}` | prediction envelope | Predict disk usage for new session copy, including media file duplication estimate |
| `daw.simulate.delete_playlists` | `{playlist_names: string[]}` | prediction envelope | Predict orphaned regions from playlist deletion; irreversible |
| `daw.simulate.clear_playlist` | `{track_id: string}` | prediction envelope | Predict all regions that would be removed from the track's playlist |
| `daw.simulate.import_audio` | `{file_path?: string, channels?: int, sample_rate?: int}` | prediction envelope | Predict sample rate conversion needs and new track creation |
| `daw.simulate.change_sample_rate` | `{new_rate: int}` | prediction envelope | Predict full audio file rewrite: file count, processing time; always unsafe and irreversible |
| `daw.simulate.change_buffer_size` | `{new_size: int}` | prediction envelope | Predict latency change in ms; warns on very small (<64) or very large (>4096) buffer sizes |
| `daw.simulate.close_session` | none | prediction envelope | Predict data loss from unsaved changes and warn if transport is rolling; irreversible |
| `daw.simulate.undo_steps` | `{count: int}` | prediction envelope | Predict available undo depth and list operation labels that would be undone |
| `daw.simulate.redo_steps` | `{count: int}` | prediction envelope | Predict available redo depth and report the next redo operation label |
| `daw.simulate.snapshot_restore` | `{snapshot_name: string}` | prediction envelope | Predict data loss from unsaved changes; validates snapshot exists on disk; irreversible |
| `daw.simulate.batch_operation` | `{operations: [{method: string, params: object}]}` | prediction envelope | Run simulation for each operation in a batch; aggregates warnings, affected objects, and disk impact |
| `daw.simulate.session_merge` | `{other_session_path?: string}` | prediction envelope | Predict potential conflicts (track names, sample rate, tempo, plugins) for session merge (stub) |
| `daw.simulate.mute_tracks` | `{track_ids: string[], mute?: boolean}` | prediction envelope | Predict mute/unmute state changes for multiple tracks |
| `daw.simulate.solo_tracks` | `{track_ids: string[], solo?: boolean}` | prediction envelope | Predict solo state changes and count tracks that will become inaudible |
| `daw.simulate.set_track_gain` | `{track_id: string, gain_db: float}` | prediction envelope | Predict gain change from current level; warns on high gain (>6 dB) for clipping risk |
| `daw.simulate.set_track_pan` | `{track_id: string, pan_position: float}` | prediction envelope | Predict pan position (0.0=left, 1.0=right) with description; warns on mono output |
| `daw.simulate.set_session_tempo_map` | none | prediction envelope | Predict full tempo map replacement impact: all audio/MIDI regions and markers affected; unsafe |

---

## Trigger/Clip Launcher

Commands for Ardour's trigger/clip launcher system (TriggerBox). Each track has a TriggerBox with slots that can hold audio or MIDI regions for clip-based launching, similar to Ableton Live's session view.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.trigger.get_triggerbox_info` | `{track_id: string}` | `{track_id, data_type, num_slots, order, empty, record_enabled, currently_playing}` | Get TriggerBox info for a track |
| `daw.trigger.get_all_slots` | none | `{slots: [{track_id, track_name, slot_index, name, state, active, playable, armed, launch_style, gain, color, stretch_mode, follow_count, follow_action0, follow_action1, region_id, region_name, ...}], count}` | Get all trigger slots across all tracks |
| `daw.trigger.get_slot_info` | `{track_id: string, slot_index: number}` | `{track_id, slot_index, name, state, active, playable, armed, launch_style, gain, color, stretch_mode, follow_count, follow_action0, follow_action1, follow_action_probability, quantization, region_id, region_name}` | Get properties of a specific trigger slot |
| `daw.trigger.bang` | `{track_id: string, slot_index: number, velocity?: number}` | `{ok, track_id, slot_index}` | Launch a trigger (fire the clip) |
| `daw.trigger.unbang` | `{track_id: string, slot_index: number}` | `{ok, track_id, slot_index}` | Stop a trigger |
| `daw.trigger.stop_all` | none | `{ok, stopped}` | Stop all triggers globally |
| `daw.trigger.stop_track` | `{track_id: string}` | `{ok, track_id}` | Stop all triggers on a specific track |
| `daw.trigger.set_region` | `{track_id: string, slot_index: number, region_id: string}` | `{ok, track_id, slot_index, region_name}` | Assign a region to a trigger slot |
| `daw.trigger.clear_slot` | `{track_id: string, slot_index: number}` | `{ok, track_id, slot_index}` | Clear a trigger slot |
| `daw.trigger.set_follow_action` | `{track_id: string, slot_index: number, action: string, which?: number, probability?: number}` | `{ok, track_id, slot_index, action, which}` | Set follow action (none/stop/again/forward/reverse/first/last/jump) |
| `daw.trigger.get_follow_action` | `{track_id: string, slot_index: number}` | `{track_id, slot_index, follow_action0, follow_action1, probability}` | Get follow action for a slot |
| `daw.trigger.set_launch_style` | `{track_id: string, slot_index: number, style: string}` | `{ok, track_id, slot_index, style}` | Set launch style (oneshot/retrigger/gate/toggle/repeat) |
| `daw.trigger.get_launch_style` | `{track_id: string, slot_index: number}` | `{track_id, slot_index, style}` | Get launch style |
| `daw.trigger.set_quantization` | `{track_id: string, slot_index: number, bars?: number, beats?: number, ticks?: number}` | `{ok, track_id, slot_index, quantization}` | Set launch quantization (bars/beats/ticks) |
| `daw.trigger.get_quantization` | `{track_id: string, slot_index: number}` | `{track_id, slot_index, quantization}` | Get launch quantization |
| `daw.trigger.set_gain` | `{track_id: string, slot_index: number, gain: number}` | `{ok, track_id, slot_index, gain}` | Set trigger slot gain |
| `daw.trigger.get_gain` | `{track_id: string, slot_index: number}` | `{track_id, slot_index, gain}` | Get trigger slot gain |
| `daw.trigger.set_color` | `{track_id: string, slot_index: number, color: number}` | `{ok, track_id, slot_index, color}` | Set trigger slot color (RGBA) |
| `daw.trigger.set_name` | `{track_id: string, slot_index: number, name: string}` | `{ok, track_id, slot_index, name}` | Set trigger slot name |
| `daw.trigger.set_stretch_mode` | `{track_id: string, slot_index: number, mode: string}` | `{ok, track_id, slot_index, mode}` | Set time stretch mode (crisp/mixed/smooth) |
| `daw.trigger.get_stretch_mode` | `{track_id: string, slot_index: number}` | `{track_id, slot_index, mode}` | Get stretch mode |
| `daw.trigger.set_follow_count` | `{track_id: string, slot_index: number, count: number}` | `{ok, track_id, slot_index, count}` | Set follow count (play N times before follow action) |
| `daw.trigger.is_active` | `{track_id: string, slot_index: number}` | `{track_id, slot_index, active, state}` | Check if a trigger is currently playing |
| `daw.trigger.get_active_triggers` | none | `{active_triggers: [{track_id, track_name, slot_index, name, state, position}], count}` | List all currently active triggers |
| `daw.trigger.arm_slot` | `{track_id: string, slot_index: number}` | `{ok, track_id, slot_index, armed}` | Arm a slot for recording |

## Mixer Scenes

Mixer scenes snapshot and recall mix states (fader levels, pans, mutes, etc.). Ardour supports multiple scene slots.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.mixer_scene.list` | none | `{scenes: [{index, name, empty, stored}], count}` | List all mixer scenes with names |
| `daw.mixer_scene.store` | `{index: number}` | `{ok, index}` | Store current mix to a scene slot |
| `daw.mixer_scene.recall` | `{index: number}` | `{ok, index, applied}` | Recall/apply a mixer scene |
| `daw.mixer_scene.clear` | `{index: number}` | `{ok, index}` | Clear a mixer scene slot |
| `daw.mixer_scene.rename` | `{index: number, name: string}` | `{ok, index, name}` | Rename a scene |
| `daw.mixer_scene.get_info` | `{index: number}` | `{index, name, empty, stored}` | Get detailed info about a scene |
| `daw.mixer_scene.get_count` | none | `{count, stored_count}` | Get number of available scene slots |
| `daw.mixer_scene.is_stored` | `{index: number}` | `{index, stored}` | Check if a scene slot has content |
| `daw.mixer_scene.apply_to_routes` | `{index: number, route_ids: string[]}` | `{ok, index, applied, route_count}` | Apply scene to specific routes only |
| `daw.mixer_scene.store_from_routes` | `{index: number}` | `{ok, index, note}` | Store scene from specific routes (stores full scene; per-route selective store requires engine extension) |

## Region FX

Region FX are per-region plugin chains. Unlike track-level plugins, these process only one region and are stored with it.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.region_fx.list` | `{region_id: string}` | `{region_id, plugins: [{id, name, type, latency, tailtime}], count}` | List all region FX on a region |
| `daw.region_fx.add` | `{region_id: string, plugin_uri?: string, plugin_name?: string}` | `{ok, region_id, plugin_id, plugin_name}` | Add a plugin as region FX |
| `daw.region_fx.remove` | `{region_id: string, plugin_id: string}` | `{ok, region_id, plugin_id}` | Remove a region FX |
| `daw.region_fx.enable` | `{region_id: string, plugin_id: string}` | `{ok, region_id, plugin_id, note}` | Enable region FX (always active when present) |
| `daw.region_fx.disable` | `{region_id: string, plugin_id: string}` | `{ok, region_id, plugin_id, note}` | Disable region FX (remove to disable; no bypass toggle) |
| `daw.region_fx.get_parameters` | `{region_id: string, plugin_id: string}` | `{region_id, plugin_id, parameters: [{index, name, value, min, max, default}], count}` | Get parameters of a region FX |
| `daw.region_fx.set_parameter` | `{region_id: string, plugin_id: string, param_index: number, value: number}` | `{ok, region_id, plugin_id, param_index, value}` | Set a parameter on a region FX |
| `daw.region_fx.get_info` | `{region_id: string, plugin_id: string}` | `{region_id, plugin_id, name, type, latency, tailtime, input_streams, output_streams}` | Get info about a specific region FX |
| `daw.region_fx.reorder` | `{region_id: string}` | `{error, note, region_id}` | Reorder region FX chain (stub -- use remove + add sequence) |
| `daw.region_fx.get_latency` | `{region_id: string}` | `{region_id, total_latency, n_region_fx}` | Get total region FX latency |

## Lua Scripting

Bridge to Ardour's Lua scripting engine. Session scripts and action scripts can be managed via IPC.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.lua.run` | `{code: string}` | `{error, note, code_length}` | Execute Lua code in session context (stub -- use action scripts) |
| `daw.lua.list_action_scripts` | none | `{scripts: [{name, path, unique_id, author, description, category}], count}` | List registered action scripts |
| `daw.lua.list_session_scripts` | none | `{scripts: [{name}], count}` | List session scripts |
| `daw.lua.run_action_script` | `{slot?: number, name?: string}` | `{error, note}` | Run a numbered action script (stub -- requires editor Lua state) |
| `daw.lua.add_session_script` | `{name: string, code: string}` | `{ok, name, count}` | Add a Lua session script |
| `daw.lua.remove_session_script` | `{name: string}` | `{ok, name, count}` | Remove a session script |
| `daw.lua.get_script_info` | `{name: string}` | `{name, path, unique_id, type, author, license, category, description}` | Get info about a script by name |
| `daw.lua.list_available_scripts` | `{type?: string}` | `{scripts: [{name, path, unique_id, type, author, category, description}], count, search_dir}` | List available Lua scripts from search paths |

## Editor State

Bridge to editor-level state (snap, grid, edit point, zoom, mouse mode). Most of this state lives in the GTK editor; only ripple mode is accessible from the engine.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.editor.get_snap_mode_v2` | none | `{error, note}` | Get snap mode (stub -- editor-only state) |
| `daw.editor.set_snap_mode_v2` | params | `{error, note}` | Set snap mode (stub -- editor-only state) |
| `daw.editor.get_grid_type` | none | `{error, note}` | Get grid type (stub -- editor-only state) |
| `daw.editor.set_grid_type` | params | `{error, note}` | Set grid type (stub -- editor-only state) |
| `daw.editor.get_edit_point` | none | `{error, note}` | Get edit point (stub -- editor-only state) |
| `daw.editor.set_edit_point` | params | `{error, note}` | Set edit point (stub -- editor-only state) |
| `daw.editor.get_ripple_mode` | none | `{ripple_mode}` | Get ripple mode (selected/all/interview) |
| `daw.editor.set_ripple_mode` | `{mode: string}` | `{ok, ripple_mode}` | Set ripple mode (selected/all/interview) |
| `daw.editor.get_draw_length` | none | `{error, note}` | Get draw length (stub -- editor-only state) |
| `daw.editor.set_draw_length` | params | `{error, note}` | Set draw length (stub -- editor-only state) |
| `daw.editor.get_draw_velocity` | none | `{error, note}` | Get draw velocity (stub -- editor-only state) |
| `daw.editor.set_draw_velocity` | params | `{error, note}` | Set draw velocity (stub -- editor-only state) |
| `daw.editor.get_zoom_focus` | none | `{error, note}` | Get zoom focus (stub -- editor-only state) |
| `daw.editor.set_zoom_focus` | params | `{error, note}` | Set zoom focus (stub -- editor-only state) |
| `daw.editor.get_mouse_mode` | none | `{error, note}` | Get mouse mode (stub -- editor-only state) |

## IO Plugins

I/O-level plugins process audio before it enters or after it leaves the session signal graph. Pre-plugins process input; post-plugins process output.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.io_plugin.list` | none | `{io_plugins: [{id, name, is_pre, type, latency, plugin_name, plugin_uri}], count}` | List I/O plugins |
| `daw.io_plugin.add` | `{plugin_uri?: string, plugin_name?: string, is_pre?: boolean}` | `{ok, id, name, plugin_name, is_pre}` | Add an I/O plugin |
| `daw.io_plugin.remove` | `{plugin_id: string}` | `{ok, plugin_id}` | Remove an I/O plugin |
| `daw.io_plugin.enable` | `{plugin_id: string}` | `{ok, plugin_id, note}` | Enable I/O plugin (always active when loaded; unload to disable) |
| `daw.io_plugin.get_parameters` | `{plugin_id: string}` | `{plugin_id, parameters: [{index, name, value, min, max, default}], count}` | Get parameters of an I/O plugin |
| `daw.get_io_plugins` | none | `{io_plugins: [{id, name, is_pre, type}], count}` | Get I/O plugins (alias for daw.io_plugin.list) |
| `daw.get_control_surfaces` | none | `{control_surfaces: [{name, path, active, requested, automatic}], count}` | List control surfaces |
| `daw.archive_session` | `{output_path: string, name?: string, only_used_sources?: boolean}` | `{ok, output_path, name, error_code?}` | Archive session to zip |
| `daw.crossfade.create` | none | `{error, note}` | Create crossfade (stub -- use region overlap) |
| `daw.crossfade.get_info` | none | `{error, note}` | Get crossfade details (stub -- use region info) |
| `daw.session.cleanup` | none | `{ok, space_freed, removed_files, removed_count}` | Clean up session (remove unused files) |
| `daw.session.cleanup_peakfiles` | none | `{ok, note?, error_code?}` | Clean up peak files |

## Solo Controls

Extended solo controls including solo isolate and solo safe modes.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_solo_isolate` | `{track_id: string, isolated: boolean}` | `{ok, track_id, isolated}` | Solo isolate a track (keeps it audible regardless of other solos) |
| `daw.get_track_solo_isolate` | `{track_id: string}` | `{track_id, isolated}` | Get solo isolate state |
| `daw.set_track_solo_safe` | `{track_id: string, safe: boolean}` | `{ok, track_id, safe}` | Solo safe a track (prevents it from being soloed) |
| `daw.get_track_solo_safe` | `{track_id: string}` | `{track_id, safe}` | Get solo safe state |

## Recording Modes

Configure recording behavior: record safe, record modes (layered, non-layered, sound-on-sound).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_record_safe` | `{track_id: string, safe: boolean}` | `{ok, track_id, safe}` | Set track record safe (prevents accidental recording) |
| `daw.get_track_record_safe` | `{track_id: string}` | `{track_id, safe}` | Get track record safe state |
| `daw.set_record_mode` | `{mode: string}` | `{ok, mode}` | Set record mode (layered/non_layered/sound_on_sound) |
| `daw.get_record_mode` | none | `{mode}` | Get current record mode |

## Transport Varispeed

Varispeed playback, bounded roll, and cue row triggering.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_default_play_speed` | `{speed: number}` | `{ok, speed}` | Set default play speed (1.0 = normal, 0.5 = half, 2.0 = double) |
| `daw.get_default_play_speed` | none | `{speed}` | Get default play speed |
| `daw.request_bounded_roll` | `{start: number, end: number}` | `{ok, start, end}` | Play a bounded range (start to end samples) |
| `daw.request_roll_at_and_return` | `{start: number, return_to: number}` | `{ok, start, return_to}` | Roll from a position and return to another when done |
| `daw.trigger_cue_row` | `{row: number}` | `{ok, row}` | Trigger a cue row (fire all triggers at that row index) |

## Sync/Timecode

MTC, LTC, MIDI Clock output, external sync, and timecode transmission control.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_send_mtc` | `{enabled: boolean}` | `{ok, send_mtc}` | Enable/disable MTC (MIDI Timecode) output |
| `daw.get_send_mtc` | none | `{send_mtc}` | Get MTC output state |
| `daw.set_send_ltc` | `{enabled: boolean}` | `{ok, send_ltc}` | Enable/disable LTC (Linear Timecode) output |
| `daw.get_send_ltc` | none | `{send_ltc}` | Get LTC output state |
| `daw.set_send_midi_clock` | `{enabled: boolean}` | `{ok, send_midi_clock}` | Enable/disable MIDI Clock output |
| `daw.get_send_midi_clock` | none | `{send_midi_clock}` | Get MIDI Clock output state |
| `daw.set_ltc_output_volume` | `{volume: number}` | `{ok, ltc_output_volume}` | Set LTC output volume |
| `daw.get_ltc_output_volume` | none | `{ltc_output_volume}` | Get LTC output volume |
| `daw.set_external_sync` | `{enabled: boolean}` | `{ok, external_sync}` | Enable/disable external sync |
| `daw.get_external_sync` | none | `{external_sync}` | Get external sync state |
| `daw.suspend_timecode_transmission` | none | `{ok}` | Suspend timecode transmission |
| `daw.resume_timecode_transmission` | none | `{ok}` | Resume timecode transmission |
| `daw.set_video_sync` | `{enabled: boolean}` | `{ok, use_video_sync}` | Enable/disable video sync |
| `daw.get_video_sync` | none | `{use_video_sync}` | Get video sync state |

## Surround Panning

Front/back pan, LFE control, and surround master management for multichannel/Atmos workflows.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_pan_frontback` | `{track_id: string, value: number}` | `{ok, track_id, value}` | Set front/back pan position |
| `daw.get_track_pan_frontback` | `{track_id: string}` | `{track_id, value}` | Get front/back pan position |
| `daw.set_track_pan_lfe` | `{track_id: string, value: number}` | `{ok, track_id, value}` | Set LFE (subwoofer) send level |
| `daw.get_track_pan_lfe` | `{track_id: string}` | `{track_id, value}` | Get LFE send level |
| `daw.add_surround_master` | none | `{ok, id?, name?}` | Add surround master (requires GTK action dispatch) |
| `daw.remove_surround_master` | none | `{ok}` | Remove surround master (requires GTK action dispatch) |

## Monitor Section (Extended)

Full monitor section control: cut, dim, solo boost, per-channel cut/dim/polarity, and full state readback.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.monitor.add_section` | none | `{ok, id?, name?}` | Add monitor section (requires GTK action dispatch) |
| `daw.monitor.remove_section` | none | `{ok}` | Remove monitor section (requires GTK action dispatch) |
| `daw.monitor.set_cut_all` | `{cut: boolean}` | `{ok, cut_all}` | Cut all monitor outputs (silence monitoring) |
| `daw.monitor.set_dim_all` | `{dim: boolean}` | `{ok, dim_all}` | Dim all monitor outputs |
| `daw.monitor.set_dim_level` | `{level: number}` | `{ok, dim_level}` | Set dim level (gain reduction when dimmed) |
| `daw.monitor.set_solo_boost_level` | `{level: number}` | `{ok, solo_boost_level}` | Set solo boost level |
| `daw.monitor.set_channel_cut` | `{channel: number, cut: boolean}` | `{ok, channel, cut}` | Cut a specific monitor channel |
| `daw.monitor.set_channel_dim` | `{channel: number, dim: boolean}` | `{ok, channel, dim}` | Dim a specific monitor channel |
| `daw.monitor.set_channel_polarity` | `{channel: number, inverted: boolean}` | `{ok, channel, inverted}` | Invert polarity on a monitor channel |
| `daw.monitor.get_full_state` | none | `{exists, monitor_active, cut_all, dim_all, mono, dim_level, solo_boost_level, channels: [{index, cut, dim, inverted, soloed}], channel_count}` | Get complete monitor section state |

## Foldback/Cue

Foldback buses provide separate mixes for musicians' headphone monitoring during recording.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.add_foldback_bus` | `{name?: string, channels?: number}` | `{ok, id, name, channels}` | Create a foldback bus for musician cue mixes |
| `daw.get_foldback_buses` | none | `{foldback_buses: [{id, name, n_inputs, n_outputs}], count}` | List all foldback buses |
| `daw.add_foldback_send` | `{track_id: string, foldback_bus_id: string, post_fader?: boolean}` | `{ok, track_id, foldback_bus_id, post_fader}` | Add a send from a track to a foldback bus |

## Route Configuration

Advanced route configuration: listen mode, disk I/O point, strict I/O, denormal protection, and volume output routing.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_track_listen` | `{track_id: string, listen: boolean}` | `{ok, track_id, listen}` | Set track listen (via solo control) |
| `daw.set_track_disk_io_point` | `{track_id: string, point: string}` | `{ok, track_id, point}` | Set disk I/O point (pre_fader/post_fader/custom) |
| `daw.get_track_disk_io_point` | `{track_id: string}` | `{track_id, point}` | Get disk I/O point |
| `daw.set_track_strict_io` | `{track_id: string, strict: boolean}` | `{ok, track_id, strict_io}` | Set strict I/O mode (match plugin I/O to track I/O) |
| `daw.get_track_strict_io` | `{track_id: string}` | `{track_id, strict_io}` | Get strict I/O state |
| `daw.set_track_denormal_protection` | `{track_id: string, enabled: boolean}` | `{ok, track_id, denormal_protection}` | Enable denormal protection (prevents CPU spikes from denormals) |
| `daw.get_track_denormal_protection` | `{track_id: string}` | `{track_id, denormal_protection}` | Get denormal protection state |
| `daw.set_track_volume_applies_to_output` | `{track_id: string, applies: boolean}` | `{ok, track_id, volume_applies_to_output}` | Set whether volume control applies to output |

## Session Lifecycle

Session-level housekeeping: bring sources into session, refresh disk space, and export process graph.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.bring_all_sources_into_session` | none | `{ok, return_code, total_sources, sources_processed, last_source?}` | Copy all external sources into session folder |
| `daw.refresh_disk_space` | none | `{ok}` | Refresh disk space calculations |
| `daw.plot_process_graph` | `{file_name?: string}` | `{ok, file_name}` | Export DSP process graph as .dot file |

## Video Sync

Video pullup/pulldown configuration for film and broadcast workflows.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.set_video_pullup` | `{pullup: number}` | `{ok, video_pullup}` | Set video pullup value |
| `daw.get_video_pullup` | none | `{video_pullup}` | Get video pullup value |

## Sidechain Routing

Sidechain management for plugin inserts. Add, remove, connect, and inspect sidechain inputs on any plugin.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.sidechain.add` | `{track_id: string, processor_id: string, n_audio?: number, n_midi?: number}` | `{success, has_sidechain}` | Add a sidechain to a plugin |
| `daw.sidechain.remove` | `{track_id: string, processor_id: string}` | `{success, has_sidechain}` | Remove a sidechain from a plugin |
| `daw.sidechain.has` | `{track_id: string, processor_id: string}` | `{has_sidechain}` | Check if a plugin has a sidechain |
| `daw.sidechain.get_input` | `{track_id: string, processor_id: string}` | `{has_sidechain, connections: [{port, connected_to}]}` | Get sidechain input port connections |
| `daw.sidechain.connect` | `{track_id: string, processor_id: string, source_port: string, port_index?: number}` | `{success}` | Connect a source port to sidechain input |
| `daw.sidechain.disconnect` | `{track_id: string, processor_id: string}` | `{success, disconnected}` | Disconnect all sidechain inputs |
| `daw.sidechain.get_info` | `{track_id: string, processor_id: string}` | `{has_sidechain, n_audio, n_midi, n_total, sidechain_pins_audio, sidechain_ports_audio, connections}` | Get sidechain channel count and connections |
| `daw.sidechain.list_available_sources` | `{track_id: string, processor_id: string}` | `{has_sidechain, audio_sources, midi_sources, audio_count, midi_count}` | List ports that could feed sidechain |
| `daw.sidechain.get_all` | `{track_id: string}` | `{track_id, plugins: [{processor_id, name, index, n_audio, n_midi}], count}` | List all plugins with sidechains on a track |

## Input Monitoring

Control monitoring mode (auto, input, disk, cue) for individual tracks or all tracks.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.monitoring.get_mode` | `{track_id: string}` | `{track_id, mode, value}` | Get monitoring mode for a track |
| `daw.monitoring.set_mode` | `{track_id: string, mode: string}` | `{success, track_id, mode}` | Set monitoring mode (auto/input/disk/cue) |
| `daw.monitoring.get_all` | none | `{tracks: [{track_id, name, mode, value}], count}` | List monitoring modes for all tracks |
| `daw.monitoring.set_all` | `{mode: string}` | `{success, mode, tracks_updated}` | Set monitoring mode for all tracks |
| `daw.monitoring.get_available_modes` | none | `{modes: [{name, value, description}]}` | List available monitoring modes |
| `daw.monitoring.is_monitoring_input` | `{track_id: string}` | `{track_id, monitoring_input}` | Check if a track is monitoring input |
| `daw.monitoring.is_monitoring_disk` | `{track_id: string}` | `{track_id, monitoring_disk}` | Check if a track is monitoring disk |

## Rec-Safe

Prevent accidental recording on protected tracks. Rec-safe locks out the record-arm button.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.rec_safe.set` | `{track_id: string, safe: boolean}` | `{success, track_id, safe}` | Set rec-safe state for a track |
| `daw.rec_safe.get` | `{track_id: string}` | `{track_id, safe}` | Get rec-safe state for a track |
| `daw.rec_safe.set_all` | `{safe: boolean}` | `{success, safe, tracks_updated}` | Set rec-safe state for all tracks |
| `daw.rec_safe.get_all` | none | `{tracks: [{track_id, name, safe}], count}` | List rec-safe state for all tracks |
| `daw.rec_safe.toggle` | `{track_id: string}` | `{success, track_id, safe}` | Toggle rec-safe state for a track |

## Processor Ordering

Inspect and reorder the processor (plugin/insert) chain on any track or bus.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.processor.get_at_index` | `{track_id: string, index: number}` | `{id, name, active, type, index}` | Get processor info at a position |
| `daw.processor.get_count` | `{track_id: string}` | `{track_id, count}` | Count processors on a track |
| `daw.processor.move_to_index` | `{track_id: string, processor_id: string, new_index: number}` | `{success, old_index, new_index}` | Move a processor to a new index position |
| `daw.processor.insert_at_index` | `{track_id: string, plugin_uri: string, index: number}` | `{success, processor_id, index}` | Insert a plugin at a specific position |
| `daw.processor.replace` | `{track_id: string, processor_id: string, new_plugin_uri: string}` | `{success, old_processor_id, new_processor_id}` | Replace a processor with a new plugin |
| `daw.processor.get_all_ordered` | `{track_id: string}` | `{track_id, processors: [{id, name, active, type, index}], count}` | Full ordered list with types/names/active |
| `daw.processor.swap` | `{track_id: string, index_a: number, index_b: number}` | `{success, index_a, index_b}` | Swap two processors by index |
| `daw.processor.get_type` | `{track_id: string, processor_id: string}` | `{processor_id, name, type, active}` | Get type of a processor |

## Trim Control

Pre-fader trim (input gain) in dB. Applied before the signal reaches the fader and plugin chain.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.trim.get` | `{track_id: string}` | `{track_id, trim_gain, trim_db}` | Get trim value for a track in dB |
| `daw.trim.set` | `{track_id: string, trim_db: number}` | `{success, track_id, trim_db, trim_gain}` | Set trim value for a track |
| `daw.trim.get_all` | none | `{tracks: [{track_id, name, trim_gain, trim_db}], count}` | Get trim values for all tracks |
| `daw.trim.reset` | `{track_id: string}` | `{success, track_id, trim_db}` | Reset trim to 0 dB for a track |
| `daw.trim.reset_all` | none | `{success, tracks_reset}` | Reset trim to 0 dB for all tracks |

## Phase Control

Per-channel phase inversion (polarity flip). Essential for multi-mic setups and fixing phase cancellation.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.phase.get` | `{track_id: string}` | `{track_id, channels: [{channel, inverted}], channel_count, any_inverted}` | Get phase inversion state for a track |
| `daw.phase.set` | `{track_id: string, channel: number, inverted: boolean}` | `{success, track_id, channel, inverted}` | Set phase inversion per channel |
| `daw.phase.invert_all` | `{track_id: string}` | `{success, track_id, channels_inverted}` | Invert all channels on a track |
| `daw.phase.reset` | `{track_id: string}` | `{success, track_id, channels_reset}` | Reset phase to normal (no inversion) for a track |

## Pan Azimuth/Elevation/Width

Extended panning controls including azimuth (L-R), elevation (surround), width (stereo spread), and a combined full-state query.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.pan.get_azimuth` | `{track_id: string}` | `{track_id, azimuth}` | Get pan azimuth (L-R position, 0.0-1.0) |
| `daw.pan.set_azimuth` | `{track_id: string, value: number}` | `{success, track_id, azimuth}` | Set pan azimuth |
| `daw.pan.get_elevation` | `{track_id: string}` | `{track_id, elevation}` | Get pan elevation (surround/VBAP panner) |
| `daw.pan.set_elevation` | `{track_id: string, value: number}` | `{success, track_id, elevation}` | Set pan elevation |
| `daw.pan.get_width` | `{track_id: string}` | `{track_id, width}` | Get pan width (stereo spread) |
| `daw.pan.set_width` | `{track_id: string, value: number}` | `{success, track_id, width}` | Set pan width |
| `daw.pan.get_full_state` | `{track_id: string}` | `{track_id, azimuth, elevation, width, frontback, has_azimuth, has_elevation, has_width, has_frontback}` | Get all pan parameters at once |
| `daw.pan.reset` | `{track_id: string}` | `{success, track_id, controls_reset}` | Reset pan to center/default |

## Plugin Latency Override

Inspect and override per-plugin latency compensation. View the full chain latency breakdown.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.plugin_latency.get` | `{track_id: string, processor_id: string}` | `{processor_id, signal_latency, effective_latency, user_latency}` | Get a plugin's reported latency |
| `daw.plugin_latency.get_user_override` | `{track_id: string, processor_id: string}` | `{processor_id, user_latency, has_override}` | Get manual latency override |
| `daw.plugin_latency.set_user_override` | `{track_id: string, processor_id: string, samples: number}` | `{success, processor_id, user_latency}` | Set manual latency override |
| `daw.plugin_latency.clear_override` | `{track_id: string, processor_id: string}` | `{success, processor_id, signal_latency, effective_latency}` | Clear manual latency override |
| `daw.plugin_latency.get_signal_latency` | `{track_id: string}` | `{track_id, signal_latency}` | Total signal latency of a route |
| `daw.plugin_latency.get_chain_latency` | `{track_id: string}` | `{track_id, chain: [{index, id, name, type, signal_latency, effective_latency, user_latency, cumulative_latency}], processor_count, total_chain_latency, route_signal_latency}` | Per-processor latency chain breakdown |

## Send Configuration

Extended send controls: pre/post fader, target, level, and pan for external and internal sends.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.send.get_pre_fader` | `{track_id: string, send_index: number}` | `{track_id, send_index, pre_fader}` | Check if a send is pre-fader |
| `daw.send.set_pre_fader` | `{track_id: string, send_index: number, pre_fader: boolean}` | `{status, pre_fader}` | Set send pre/post fader |
| `daw.send.get_target` | `{track_id: string, send_index: number}` | `{track_id, send_index, target_id, target_name}` | Get internal send target route |
| `daw.send.get_all_details` | `{track_id: string}` | `{track_id, sends: [{index, name, id, enabled, role, level_db, pre_fader, target_id?, target_name?}], count}` | Get full details of all sends on a track |
| `daw.send.create_aux` | `{track_id: string, bus_id: string, pre_fader?: boolean}` | `{status, track_id, bus_id, pre_fader}` | Create an aux send to a bus |
| `daw.send.get_level_db` | `{track_id: string, send_index: number}` | `{track_id, send_index, level_db}` | Get send level in dB |
| `daw.send.set_level_db` | `{track_id: string, send_index: number, level_db: number}` | `{status, level_db}` | Set send level in dB |
| `daw.send.get_pan` | `{track_id: string, send_index: number}` | `{track_id, send_index, has_panner, panner_linked?}` | Get send panner state |
| `daw.send.set_pan` | `{track_id: string, send_index: number, pan: number}` | `{status, send_index, pan}` | Set send pan position (unlinks from route) |

## Aux Bus Management

Create, delete, inspect, and control auxiliary buses and their send routing.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.aux.create_bus` | `{name: string, channels?: number}` | `{status, bus_id, name, channels}` | Create an audio bus |
| `daw.aux.delete_bus` | `{bus_id: string}` | `{status}` | Delete a bus (not master/monitor) |
| `daw.aux.list_buses` | none | `{buses: [{id, name, inputs, outputs, muted, soloed}], count}` | List all buses |
| `daw.aux.get_sends_to` | `{bus_id: string}` | `{bus_id, bus_name, senders: [{track_id, track_name, send_index, send_id, level_db, enabled}], count}` | List all tracks sending to a bus |
| `daw.aux.add_send_from` | `{bus_id: string, track_id: string, pre_fader?: boolean}` | `{status, bus_id, track_id}` | Add a send from a track to a bus |
| `daw.aux.remove_send_from` | `{bus_id: string, track_id: string}` | `{status}` | Remove a send from a track to a bus |
| `daw.aux.get_bus_info` | `{bus_id: string}` | `{id, name, inputs, outputs, muted, soloed, gain_db, sends, send_count, plugin_count}` | Full bus info with sends and plugins |
| `daw.aux.set_bus_gain` | `{bus_id: string, gain_db: number}` | `{status, gain_db}` | Set bus gain in dB |
| `daw.aux.set_bus_mute` | `{bus_id: string, mute: boolean}` | `{status, mute}` | Mute/unmute an aux bus |
| `daw.aux.set_bus_solo` | `{bus_id: string, solo: boolean}` | `{status, solo}` | Solo/unsolo an aux bus |

## MIDI Clock

Control MIDI clock output: enable/disable, inspect port, check sync state.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi_clock.get_enabled` | none | `{enabled}` | Check if MIDI clock send is enabled |
| `daw.midi_clock.set_enabled` | `{enabled: boolean}` | `{status, enabled}` | Enable/disable MIDI clock output |
| `daw.midi_clock.get_port` | none | `{port_name, pretty_name, connected}` | Get MIDI clock output port |
| `daw.midi_clock.set_port` | `{port_name: string}` | `{status, port_name}` | Set MIDI clock output port |
| `daw.midi_clock.get_state` | none | `{enabled, sets_tempo, resolution, port_name, port_connected}` | Full MIDI clock state |
| `daw.midi_clock.is_synced` | none | `{synced, master_type, master_name, locked}` | Check if synced to external MIDI clock |
| `daw.midi_clock.set_tempo_from_clock` | `{enabled: boolean}` | `{status, enabled}` | Toggle whether MIDI clock sets tempo |
| `daw.midi_clock.get_resolution` | none | `{resolution}` | Get MIDI clock resolution |

## MTC

MIDI Timecode output controls for synchronization with external gear.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.mtc.get_enabled` | none | `{enabled}` | Check if MTC send is enabled |
| `daw.mtc.set_enabled` | `{enabled: boolean}` | `{status, enabled}` | Enable/disable MTC output |
| `daw.mtc.get_port` | none | `{port_name, pretty_name, connected}` | Get MTC output port |
| `daw.mtc.set_port` | `{port_name: string}` | `{status, port_name}` | Set MTC output port |
| `daw.mtc.get_state` | none | `{enabled, port_name, port_connected}` | Full MTC state |
| `daw.mtc.get_offset` | none | `{enabled, timecode_offset, timecode_offset_negative}` | Get MTC timecode offset |

## LTC

Linear Timecode output controls for audio-based synchronization. Includes volume, port, and generator state.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.ltc.get_send_enabled` | none | `{enabled}` | Check if LTC send is enabled |
| `daw.ltc.set_send_enabled` | `{enabled: boolean}` | `{status, enabled}` | Enable/disable LTC output |
| `daw.ltc.get_volume` | none | `{volume, volume_db}` | Get LTC output volume |
| `daw.ltc.set_volume` | `{volume: number}` | `{status, volume}` | Set LTC output volume |
| `daw.ltc.get_port` | none | `{port_name}` | Get LTC output port name |
| `daw.ltc.set_port` | `{port_name: string}` | `{status, port_name}` | Set LTC output port and reconnect |
| `daw.ltc.get_state` | none | `{enabled, volume, volume_db, port_name, port_connected}` | Full LTC state |
| `daw.ltc.get_generator_state` | none | `{enabled, port_name, port_exists, port_connected, volume, running}` | LTC generator runtime state |
| `daw.ltc.set_send_continuously` | `{enabled: boolean}` | `{status, enabled}` | Enable continuous LTC send |

## Direct Outputs

Control direct output routing for tracks and buses.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.direct_out.get` | `{track_id: string}` | `{track_id, has_direct_out, connections: [{port, connected}]}` | Get direct output state and connections |
| `daw.direct_out.enable` | `{track_id: string}` | `{status}` | Enable (activate) direct outputs |
| `daw.direct_out.disable` | `{track_id: string}` | `{status}` | Disable (deactivate) direct outputs |
| `daw.direct_out.is_enabled` | `{track_id: string}` | `{track_id, exists, enabled}` | Check if direct outputs are enabled |
| `daw.direct_out.set_pre_fader` | `{track_id: string, pre_fader: boolean}` | `{status, track_id, pre_fader}` | Set direct output position relative to fader |
| `daw.direct_out.get_connection` | `{track_id: string}` | `{track_id, connections}` | Get direct output port connections |
| `daw.direct_out.set_connection` | `{track_id: string, port_name: string}` | `{status, port_name}` | Set direct output connection to a port |

## Solo Isolate/Safe Extended

Solo isolate prevents a track from being affected by solo on other tracks. Solo safe prevents a track's solo from being cleared by "clear all solos".

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.solo_isolate.get` | `{track_id: string}` | `{track_id, isolated}` | Get solo isolate state |
| `daw.solo_isolate.set` | `{track_id: string, isolated: boolean}` | `{status, isolated}` | Set solo isolate state |
| `daw.solo_isolate.toggle` | `{track_id: string}` | `{status, isolated}` | Toggle solo isolate |
| `daw.solo_isolate.get_all` | none | `{tracks: [{id, name, isolated}], count}` | Get solo isolate state for all tracks |
| `daw.solo_safe.get` | `{track_id: string}` | `{track_id, safe}` | Get solo safe state |
| `daw.solo_safe.set` | `{track_id: string, safe: boolean}` | `{status, safe}` | Set solo safe state |
| `daw.solo_safe.toggle` | `{track_id: string}` | `{status, safe}` | Toggle solo safe |
| `daw.solo_safe.get_all` | none | `{tracks: [{id, name, safe}], count}` | Get solo safe state for all tracks |

## Track Templates

Save, load, list, rename, and inspect route templates.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.track_template.list` | none | `{templates: [{name, path}], count}` | List available track templates |
| `daw.track_template.save` | `{track_id: string, name: string, description?: string}` | `{status, name, path}` | Save a track as a template |
| `daw.track_template.load` | `{template_name: string}` | `{status, track_id, track_name}` | Create a new track from a template |
| `daw.track_template.delete` | `{template_name: string}` | `{status, deleted}` | Delete a track template |
| `daw.track_template.rename` | `{old_name: string, new_name: string}` | `{status, old_name, new_name, new_path}` | Rename a track template |
| `daw.track_template.get_info` | `{template_name: string}` | `{name, path, description, modified_with}` | Get template details |
| `daw.track_template.get_path` | `{template_name: string}` | `{name, path}` | Get template file path |
| `daw.track_template.list_with_details` | none | `{templates: [{name, path, description, modified_with}], count}` | List templates with full metadata |

## Loop/Range Editing

Create, play, bounce, select, and inspect time ranges and loop regions.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.range.get_active` | none | `{loop_start?, loop_end?, loop_enabled?, punch_start?, punch_end?, session_start?, session_end?}` | Get active loop, punch, and session ranges |
| `daw.range.set` | `{start: number, end: number}` | `{status, name, start, end}` | Create a range marker |
| `daw.range.play` | `{start?: number, end?: number}` | `{status}` | Play a range (or the loop range if omitted) |
| `daw.range.export` | `{start: number, end: number, format?: string}` | `{status, start, end, format}` | Export a range (requires export dialog) |
| `daw.range.bounce` | `{track_id: string, start: number, end: number}` | `{status, region_name?, region_id?}` | Bounce a range to a new region |
| `daw.range.select` | `{start: number, end: number}` | `{status, start, end}` | Set the selection range (via loop location) |
| `daw.range.get_selection` | none | `{has_selection, start?, end?, length?}` | Get current selection range |
| `daw.range.clear_selection` | none | `{status}` | Clear the selection (disable loop) |

## Internal Routing

Add, remove, and inspect internal sends between tracks/buses within the session.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.internal_send.add` | `{source_track_id: string, dest_track_id: string, pre_fader?: boolean}` | `{status, source_track_id, dest_track_id, pre_fader}` | Add an internal send between tracks |
| `daw.internal_send.remove` | `{source_track_id: string, send_id: string}` | `{status}` | Remove an internal send |
| `daw.internal_send.list` | `{track_id: string}` | `{track_id, internal_sends: [{index, id, name, active, target_id, target_name, level_db, role, pre_fader}], count}` | List internal sends on a track |
| `daw.internal_send.get_target` | `{track_id: string, send_id: string}` | `{status, target_id, target_name}` | Get the target route of an internal send |
| `daw.internal_send.set_level` | `{track_id: string, send_id: string, level_db: number}` | `{status, level_db}` | Set internal send level in dB |
| `daw.internal_send.set_enable` | `{track_id: string, send_id: string, enabled: boolean}` | `{status, enabled}` | Enable/disable an internal send |
| `daw.internal_send.get_latency` | `{track_id: string, send_id: string}` | `{status, delay_in, delay_out, signal_latency}` | Get latency info for an internal send |
| `daw.internal_send.get_all_routes` | none | `{connections: [{source_id, source_name, send_id, send_index, target_id, target_name, active, role, level_db}], count}` | List all internal send connections in session |
| `daw.internal_send.set_pan` | `{track_id: string, send_id: string, pan: number}` | `{status, pan}` | Set internal send pan (unlinks from route) |

## Auto-Connect

Control automatic input/output connection policies for new tracks.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.auto_connect.get_input_policy` | none | `{policy, policy_name}` | Get input auto-connect policy |
| `daw.auto_connect.set_input_policy` | `{policy: string}` | `{status, policy}` | Set input auto-connect (manual/physical/master) |
| `daw.auto_connect.get_output_policy` | none | `{policy, policy_name}` | Get output auto-connect policy |
| `daw.auto_connect.set_output_policy` | `{policy: string}` | `{status, policy}` | Set output auto-connect (manual/physical/master) |
| `daw.auto_connect.trigger_reconnect` | none | `{status}` | Wake auto-connect thread to reconnect routes |
| `daw.auto_connect.get_state` | none | `{input_policy, output_policy, input_policy_name, output_policy_name}` | Get full auto-connect state |

## Click Track Extended

Extended click track (metronome) controls: emphasis/regular gain, record-only mode, and full state query.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.click.get_emphasis_gain` | none | `{gain, gain_db, use_emphasis}` | Get click emphasis gain |
| `daw.click.set_emphasis_gain` | `{gain_db: number}` | `{status, gain, gain_db}` | Set click emphasis gain in dB |
| `daw.click.get_regular_gain` | none | `{gain, gain_db}` | Get regular click gain |
| `daw.click.set_regular_gain` | `{gain_db: number}` | `{status, gain, gain_db}` | Set regular click gain in dB |
| `daw.click.get_record_only` | none | `{record_only}` | Check if click is record-only |
| `daw.click.set_record_only` | `{record_only: boolean}` | `{status, record_only}` | Set click to record-only mode |
| `daw.click.get_full_state` | none | `{gain, gain_db, record_only, use_emphasis, emphasis_sound, session_click_gain?, session_click_gain_db?}` | Full click track state |
| `daw.click.set_emphasis_enabled` | `{enabled: boolean}` | `{status, enabled}` | Enable/disable click emphasis |

## CD Markers

Create and manage CD markers with CD-Text metadata for mastering. Validate Red Book compliance.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.cd_marker.add` | `{position: number, name: string, isrc?: string, performer?: string, composer?: string}` | `{ok, name, position}` | Add a CD track marker with optional metadata |
| `daw.cd_marker.remove` | `{name: string}` | `{ok, name}` | Remove a CD marker by name |
| `daw.cd_marker.list` | none | `{markers: [{name, start, end, length, cd_info}], count}` | List all CD markers |
| `daw.cd_marker.get_info` | `{name: string}` | `{name, start, end, length, cd_info}` | Get details for a named CD marker |
| `daw.cd_marker.set_info` | `{name: string, isrc?: string, performer?: string, composer?: string}` | `{ok, name, cd_info}` | Update CD-Text metadata on a marker |
| `daw.cd_marker.add_index` | `{position: number, name: string}` | `{ok, name, position, type}` | Add a CD index point (mark, not range) |
| `daw.cd_marker.get_toc` | none | `{tracks: [{track_number, name, start_sample, end_sample, start_msf, end_msf, duration_seconds, cd_info}], track_count, sample_rate}` | Generate CD Table-of-Contents data |
| `daw.cd_marker.validate` | none | `{valid, track_count, errors, warnings}` | Validate CD markers for Red Book compliance |

## Plugin Macros

Create virtual macro controls that map a single knob to multiple plugin/strip parameters simultaneously.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.macro.create` | `{name: string, controls?: [{track_id, control_uri, min?, max?}]}` | `{ok, macro_id, name, controls}` | Create a macro with optional initial controls |
| `daw.macro.delete` | `{macro_id: string}` | `{ok, macro_id}` | Delete a macro |
| `daw.macro.list` | none | `{macros: [{macro_id, name, value, controls}], count}` | List all macros |
| `daw.macro.get_info` | `{macro_id: string}` | `{macro_id, name, value, controls}` | Get details for a macro |
| `daw.macro.set_value` | `{macro_id: string, value: number}` | `{ok, macro_id, value, controls_updated}` | Set macro position (0.0-1.0) and update all controls |
| `daw.macro.get_value` | `{macro_id: string}` | `{macro_id, value, name}` | Get current macro position |
| `daw.macro.add_control` | `{macro_id: string, track_id: string, control_uri: string, min?: number, max?: number}` | `{ok, macro_id, control_index, total_controls}` | Add a control mapping to an existing macro |
| `daw.macro.remove_control` | `{macro_id: string, control_index: number}` | `{ok, macro_id, removed_index, total_controls}` | Remove a control from a macro by index |

## Video Sync Extended

Video pullup/pulldown, sync enable, and offset controls for film and broadcast workflows.

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.video.get_pullup` | none | `{pullup}` | Get video pullup/pulldown value |
| `daw.video.set_pullup` | `{pullup: number}` | `{ok, pullup}` | Set video pullup/pulldown |
| `daw.video.get_sync_enabled` | none | `{enabled}` | Check if video sync is enabled |
| `daw.video.set_sync_enabled` | `{enabled: boolean}` | `{ok, enabled}` | Enable/disable video sync |
| `daw.video.get_offset` | none | `{offset_samples, offset_negative}` | Get video offset in samples |
| `daw.video.set_offset` | `{offset_samples: number, negative?: boolean}` | `{ok, offset_samples, offset_negative}` | Set video offset in samples |

## Session Lifecycle (Tier 1)

Session file operations, cleanup, freeze-all, MIDI panic, section editing, and mixer scene application. Source: `dawflow_commands_tier1.cc` section 1.1 (22 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.session.save_as` | `{snapshot_name: string, switch_to?: boolean}` | `{ok, snapshot_name}` | Save session snapshot with a name |
| `daw.session.save_template` | `{name: string, description?: string}` | `{ok, template_name}` | Save session as a reusable template |
| `daw.session.wipe` | none | `{ok}` | Reset session to empty state (destructive) |
| `daw.session.import_files` | params | `{ok, note}` | Import audio/MIDI files (stub -- use daw.import_audio) |
| `daw.session.remove_last_capture` | none | `{ok}` | Delete the last recording capture |
| `daw.session.cleanup_sources` | none | `{ok, removed_files, removed_count, space_freed_bytes}` | Remove unused source files from disk |
| `daw.session.cleanup_regions` | none | `{ok}` | Remove unused regions |
| `daw.session.freeze_all` | none | `{ok, frozen_count}` | Freeze all tracks to audio |
| `daw.session.midi_panic` | none | `{ok}` | Send all-notes-off to all MIDI outputs |
| `daw.session.set_all_tracks_record_enabled` | `{enabled: boolean}` | `{ok, record_enabled}` | Arm or disarm all tracks at once |
| `daw.session.request_count_in_record` | none | `{ok}` | Start recording with count-in |
| `daw.session.request_play_range` | `{start: number, end: number, loop?: boolean}` | `{ok, start, end}` | Play a specific time range |
| `daw.session.cancel_play_range` | none | `{ok}` | Cancel active play range |
| `daw.session.set_session_extents` | `{start: number, end: number}` | `{ok}` | Set session start/end boundaries |
| `daw.session.set_range_selection` | `{start: number, end: number}` | `{ok, note}` | Select a time range (session extents proxy) |
| `daw.session.cut_copy_section` | `{start: number, end: number, to?: number, op?: string}` | `{ok, operation}` | Cut/copy/insert/delete a time section (op: cut/copy/insert/delete) |
| `daw.session.deinterlace_midi_region` | `{region_id: string}` | `{ok}` | Split interleaved MIDI region by channel |
| `daw.session.globally_add_internal_sends` | `{route_id: string, placement?: string}` | `{ok}` | Add internal sends from all routes to a destination |
| `daw.session.globally_set_send_gains_to_zero` | `{bus_id: string}` | `{ok}` | Mute all sends to a bus |
| `daw.session.globally_set_send_gains_to_unity` | `{bus_id: string}` | `{ok}` | Set all sends to a bus to 0 dB |
| `daw.session.apply_mixer_scene` | `{index: number}` | `{ok, index, error?}` | Apply a stored mixer scene by index |
| `daw.session.cleanup_peakfiles_v2` | none | `{ok, cleaned_files, count, space_freed_bytes}` | Delete orphaned peak files (enhanced) |

## Track Freeze/Bounce (Tier 1)

Freeze, unfreeze, bounce, and bounce-range operations on tracks. Source: `dawflow_commands_tier1.cc` section 1.2 (6 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.track.freeze` | `{track_id: string}` | `{ok, track_id}` | Freeze a track (render to audio) |
| `daw.track.unfreeze` | `{track_id: string}` | `{ok, track_id}` | Unfreeze a frozen track |
| `daw.track.get_freeze_state` | `{track_id: string}` | `{track_id, freeze_state, is_frozen}` | Check freeze status (no_freeze/frozen/unfrozen) |
| `daw.track.bounce` | `{track_id: string, name?: string}` | `{ok, region_id, region_name, length}` | Bounce entire track to a new audio region |
| `daw.track.bounce_range` | `{track_id: string, start: number, end: number, name?: string}` | `{ok, region_id, region_name, length}` | Bounce a specific time range of a track |
| `daw.track.bounceable` | `{track_id: string}` | `{track_id, bounceable}` | Check if a track can be bounced |

## Playlist Management (Tier 1)

Switch, copy, and create playlists for tracks. Source: `dawflow_commands_tier1.cc` section 1.3 (6 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.track.use_playlist` | `{track_id: string, playlist_id: string}` | `{ok, track_id, playlist_id}` | Switch track to a specific playlist by ID |
| `daw.track.use_copy_playlist` | `{track_id: string}` | `{ok, track_id, new_playlist_id, new_playlist_name}` | Duplicate current playlist for track |
| `daw.track.use_new_playlist` | `{track_id: string}` | `{ok, track_id, new_playlist_id, new_playlist_name}` | Create fresh empty playlist for track |
| `daw.track.find_and_use_playlist` | `{track_id: string, playlist_id: string}` | `{ok, track_id, playlist_id}` | Load a saved playlist by its ID |
| `daw.playlist.get_extent` | `{track_id: string}` | `{start_samples, end_samples, duration_samples, region_count}` | Get total duration of a track's playlist |
| `daw.playlist.remove_gaps` | `{track_id: string, threshold?: number, leave_gap?: number}` | `{ok, gaps_removed}` | Remove silence gaps from playlist |

## Advanced Region Editing (Tier 1)

Low-level region operations: trim, cut, nudge, layer, fade, normalize, and amplitude control. Source: `dawflow_commands_tier1.cc` section 1.4 (25 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.region.trim_front` | `{region_id: string, new_position: number}` | `{ok, position, length}` | Trim region start boundary |
| `daw.region.trim_end` | `{region_id: string, new_position: number}` | `{ok, position, length}` | Trim region end boundary |
| `daw.region.trim_to` | `{region_id: string, position: number, length: number}` | `{ok, position, length}` | Set exact region bounds |
| `daw.region.cut_front` | `{region_id: string, new_position: number}` | `{ok, position, length}` | Cut region from the start |
| `daw.region.cut_end` | `{region_id: string, new_position: number}` | `{ok, position, length}` | Cut region from the end |
| `daw.region.nudge_position` | `{region_id: string, distance: number}` | `{ok, new_position}` | Nudge region position by a distance |
| `daw.region.move_to_natural_position` | `{region_id: string}` | `{ok, new_position}` | Move region to its original/natural position |
| `daw.region.set_sync_position` | `{region_id: string, position: number}` | `{ok}` | Set the sync point of a region |
| `daw.region.clear_sync_position` | `{region_id: string}` | `{ok}` | Remove sync point from region |
| `daw.region.set_muted` | `{region_id: string, muted: boolean}` | `{ok, muted}` | Mute or unmute a region |
| `daw.region.set_locked` | `{region_id: string, locked: boolean}` | `{ok, locked}` | Lock or unlock a region |
| `daw.region.set_opaque` | `{region_id: string, opaque: boolean}` | `{ok, opaque}` | Set region opacity (transparent vs opaque) |
| `daw.region.raise` | `{region_id: string}` | `{ok}` | Move region up one layer |
| `daw.region.lower` | `{region_id: string}` | `{ok}` | Move region down one layer |
| `daw.region.raise_to_top` | `{region_id: string}` | `{ok}` | Move region to top layer |
| `daw.region.lower_to_bottom` | `{region_id: string}` | `{ok}` | Move region to bottom layer |
| `daw.audio_region.normalize` | `{region_id: string, target_db?: number}` | `{ok, max_amplitude, target_db}` | Normalize audio region to target dB (default 0) |
| `daw.audio_region.set_scale_amplitude` | `{region_id: string, gain: number}` | `{ok, gain}` | Set region gain/amplitude scaling |
| `daw.audio_region.set_fade_in` | `{region_id: string, length: number, shape?: string}` | `{ok, shape, length}` | Configure fade-in shape and length |
| `daw.audio_region.set_fade_out` | `{region_id: string, length: number, shape?: string}` | `{ok, shape, length}` | Configure fade-out shape and length |
| `daw.audio_region.set_fade_in_active` | `{region_id: string, active: boolean}` | `{ok, active}` | Enable/disable fade-in |
| `daw.audio_region.set_fade_out_active` | `{region_id: string, active: boolean}` | `{ok, active}` | Enable/disable fade-out |
| `daw.audio_region.set_envelope_active` | `{region_id: string, active: boolean}` | `{ok, active}` | Enable/disable volume envelope |
| `daw.audio_region.get_rms` | `{region_id: string}` | `{region_id, rms, rms_db}` | Get RMS signal level of audio region |
| `daw.audio_region.get_loudness` | `{region_id: string}` | `{region_id, maximum_amplitude, peak_db, rms, rms_db}` | Get loudness/amplitude metrics |

## MIDI Model (Tier 1)

Low-level MIDI model editing: diff commands, note/patch lookup, silence insertion, region merge/split, CC automation state, and note mode. Source: `dawflow_commands_tier1.cc` section 1.5 (14 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi.new_note_diff_command` | `{region_id: string, name?: string}` | `{ok, command_ptr, note}` | Create a note edit batch command |
| `daw.midi.apply_diff_command` | `{region_id: string}` | `{ok, note}` | Apply a batch MIDI edit command (prefer atomic ops over IPC) |
| `daw.midi.new_sysex_diff_command` | `{region_id: string, name?: string}` | `{ok, command_ptr}` | Create a SysEx edit batch command |
| `daw.midi.new_patch_change_diff_command` | `{region_id: string, name?: string}` | `{ok, command_ptr}` | Create a patch change edit batch |
| `daw.midi.find_note` | `{region_id: string, note_id: number}` | `{found, note?, channel?, velocity?, time_beats?, length_beats?}` | Locate a note in a MIDI model by event ID |
| `daw.midi.find_patch_change` | `{region_id: string}` | `{patch_changes: [{id, time, channel, program, bank}], count}` | Find/list patch change events |
| `daw.midi.insert_silence_at_start` | `{region_id: string, duration_beats: number}` | `{ok, duration_beats}` | Insert silence at the beginning of a MIDI region |
| `daw.midi_region.merge` | `{region_id: string, other_id: string}` | `{ok}` | Merge another MIDI region into this one |
| `daw.midi_region.separate_by_channel` | `{region_id: string}` | `{ok, regions: [{id, name}], count}` | Split MIDI region by channel |
| `daw.midi_source.set_automation_state` | `{region_id: string, cc_number: number, state: string, channel?: number}` | `{ok}` | Set CC automation mode (off/play/write/touch/latch) |
| `daw.midi_source.get_automation_state` | `{region_id: string, cc_number: number, channel?: number}` | `{state, cc_number, channel}` | Get CC automation mode |
| `daw.midi_source.set_interpolation` | `{region_id: string, cc_number: number, style: string, channel?: number}` | `{ok}` | Set CC interpolation style (discrete/linear/curved/logarithmic) |
| `daw.midi_source.get_interpolation` | `{region_id: string, cc_number: number, channel?: number}` | `{style, cc_number, channel}` | Get CC interpolation style |
| `daw.midi_track.set_note_mode` | `{track_id: string, mode: string}` | `{ok, mode}` | Set sustained vs percussive note mode |

## Plugin Config Advanced (Tier 1)

Plugin parameter reset, strict I/O, custom config, instance count, channel mapping, timing stats, presets (v2), and documentation access. Source: `dawflow_commands_tier1.cc` section 1.6 (16 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.plugin.reset_parameters_to_default` | `{track_id: string, plugin_id: string}` | `{ok}` | Reset all plugin parameters to defaults |
| `daw.plugin.set_strict_io` | `{track_id: string, plugin_id: string, strict: boolean}` | `{ok, strict_io}` | Enable/disable strict I/O channel matching |
| `daw.plugin.set_custom_cfg` | `{track_id: string, plugin_id: string, custom: boolean}` | `{ok, custom_cfg}` | Enable/disable custom I/O configuration |
| `daw.plugin.set_count` | `{track_id: string, plugin_id: string, count: number}` | `{ok, count}` | Set number of parallel plugin instances |
| `daw.plugin.set_input_map` | `{track_id: string, plugin_id: string, instance?: number, mapping?: [{from, to}]}` | `{ok}` | Set plugin input channel mapping |
| `daw.plugin.set_output_map` | `{track_id: string, plugin_id: string, instance?: number, mapping?: [{from, to}]}` | `{ok}` | Set plugin output channel mapping |
| `daw.plugin.get_timing_stats` | `{track_id: string, plugin_id: string}` | `{has_stats, min_us?, max_us?, avg_us?, stddev_us?, latency?}` | Get CPU timing statistics for a plugin |
| `daw.plugin.clear_timing_stats` | `{track_id: string, plugin_id: string}` | `{ok}` | Clear accumulated timing statistics |
| `daw.plugin.save_preset_v2` | `{track_id: string, plugin_id: string, name: string}` | `{ok, preset_uri, label}` | Save current state as a named preset (enhanced) |
| `daw.plugin.remove_preset` | `{track_id: string, plugin_id: string, name: string}` | `{ok}` | Delete a saved preset |
| `daw.plugin.clear_preset` | `{track_id: string, plugin_id: string}` | `{ok}` | Clear/deselect the active preset |
| `daw.plugin.get_parameter_descriptor` | `{track_id: string, plugin_id: string, param_index: number}` | `{label, lower, upper, normal, step, smallstep, largestep, toggled, logarithmic, sr_dependent, integer_step, enumeration, unit}` | Get detailed info about a plugin parameter |
| `daw.plugin.get_scale_points` | `{track_id: string, plugin_id: string, param_index: number}` | `{scale_points: [{label, value}], count}` | Get enumerated scale points for a parameter |
| `daw.plugin.get_docs` | `{track_id: string, plugin_id: string}` | `{docs, name, maker}` | Get plugin documentation string |
| `daw.route.customize_plugin_io` | `{track_id: string, plugin_id: string, audio_out?: number, audio_sinks?: number}` | `{ok}` | Configure custom I/O for a plugin insert |
| `daw.route.reset_plugin_io` | `{track_id: string, plugin_id: string}` | `{ok}` | Reset plugin I/O to defaults |

## Audio Engine/Backend (Tier 2)

Audio engine discovery, backend selection, device enumeration, latency detection, and buffered I/O. Source: `dawflow_commands_tier2.cc` section 2.1 (25 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.engine.discover_backends` | none | `{backends, count}` | Discover available audio backends |
| `daw.engine.set_backend` | `{name: string}` | `{ok, backend}` | Set the audio backend by name |
| `daw.engine.get_current_backend` | none | `{name, running}` | Get the current audio backend name and state |
| `daw.engine.is_jack` | none | `{is_jack}` | Check if running under JACK |
| `daw.engine.freewheeling` | none | `{freewheeling}` | Check if engine is in freewheel mode |
| `daw.engine.running` | none | `{running}` | Check if engine is running |
| `daw.engine.launch_device_control_app` | none | `{ok}` | Launch audio device control application |
| `daw.engine.request_backend_reset` | none | `{ok}` | Request backend reset |
| `daw.engine.request_device_list_update` | none | `{ok}` | Request device list refresh |
| `daw.backend.enumerate_drivers` | none | `{drivers, count}` | List available audio drivers |
| `daw.backend.set_driver` | `{name: string}` | `{ok, driver}` | Set the audio driver |
| `daw.backend.enumerate_input_devices` | none | `{devices: [{name, available}], count}` | List available input devices |
| `daw.backend.enumerate_output_devices` | none | `{devices: [{name, available}], count}` | List available output devices |
| `daw.backend.set_input_device` | `{name: string}` | `{ok, device}` | Set the input device |
| `daw.backend.set_output_device` | `{name: string}` | `{ok, device}` | Set the output device |
| `daw.backend.default_sample_rate` | none | `{sample_rate}` | Get default sample rate for current backend |
| `daw.backend.default_buffer_size` | `{device?: string}` | `{buffer_size}` | Get default buffer size for device |
| `daw.backend.set_use_buffered_io` | `{enabled: boolean}` | `{ok, buffered_io}` | Enable/disable buffered I/O |
| `daw.backend.get_use_buffered_io` | none | `{buffered_io}` | Check if buffered I/O is enabled |
| `daw.backend.drop_device` | none | `{ok}` | Drop the audio device |
| `daw.backend.reset_device` | none | `{ok}` | Reset the audio device |
| `daw.engine.prepare_latency_measurement` | none | `{ok}` | Prepare for latency measurement |
| `daw.engine.start_latency_detection` | `{for_midi?: boolean}` | `{ok, for_midi}` | Start latency detection |
| `daw.engine.stop_latency_detection` | none | `{ok}` | Stop latency detection |
| `daw.engine.get_latency_signal_delay` | none | `{latency_samples}` | Get measured latency signal delay |

## Port Management Advanced (Tier 2)

Port listing, registration, connection, monitoring, physical I/O, pretty names, and MIDI flags. Source: `dawflow_commands_tier2.cc` section 2.2 (20 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.port.list_all` | none | `{ports: [{name, type}], count}` | List all registered audio and MIDI ports |
| `daw.port.register_input` | `{type: string, name: string}` | `{ok, name}` | Register a new input port |
| `daw.port.register_output` | `{type: string, name: string}` | `{ok, name}` | Register a new output port |
| `daw.port.unregister` | `{name: string}` | `{ok}` | Unregister a port |
| `daw.port.connect` | `{source: string, dest: string}` | `{ok, source, dest}` | Connect two ports |
| `daw.port.disconnect` | `{source: string, dest: string}` | `{ok, source, dest}` | Disconnect two ports |
| `daw.port.disconnect_all` | `{name: string}` | `{ok, port}` | Disconnect all connections from a port |
| `daw.port.get_connections` | `{name: string}` | `{port, connections, count}` | Get all connections for a port |
| `daw.port.connected_to` | `{name: string, other: string}` | `{connected, port, other}` | Check if two ports are connected |
| `daw.port.physically_connected` | `{name: string}` | `{physically_connected, port}` | Check if a port is physically connected |
| `daw.port.set_pretty_name` | `{name: string, pretty_name: string}` | `{ok, port, pretty_name}` | Set human-readable name for a port |
| `daw.port.get_pretty_name` | `{name: string}` | `{port, pretty_name}` | Get human-readable name for a port |
| `daw.port.get_physical_outputs` | `{type?: string}` | `{ports, count, type}` | List physical output ports |
| `daw.port.get_physical_inputs` | `{type?: string}` | `{ports, count, type}` | List physical input ports |
| `daw.port.n_physical_outputs` | none | `{audio, midi}` | Count physical output ports |
| `daw.port.n_physical_inputs` | none | `{audio, midi}` | Count physical input ports |
| `daw.port.request_input_monitoring` | `{name: string, enabled: boolean}` | `{ok, port, monitoring}` | Request input monitoring for a port |
| `daw.port.get_midi_ports` | `{for_input?: boolean}` | `{ports, count, for_input}` | List MIDI ports (input or output) |
| `daw.port.add_midi_flags` | `{name: string, flags: number}` | `{ok, port, flags}` | Add MIDI flags to a port |
| `daw.port.remove_midi_flags` | `{name: string, flags: number}` | `{ok, port, flags}` | Remove MIDI flags from a port |

## Transport Masters (Tier 2)

List, add, remove, configure, and query transport masters (MTC, LTC, MIDI Clock, Engine). Source: `dawflow_commands_tier2.cc` section 2.3 (15 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.transport_master.list_all` | none | `{masters: [{name, type, locked, collect, removeable}], count}` | List all transport masters |
| `daw.transport_master.get_current` | none | `{name, type, locked, collect}` | Get the current transport master |
| `daw.transport_master.set_current_by_type` | `{type: string}` | `{ok, type}` | Set current master by type (Engine/MTC/MIDIClock/LTC) |
| `daw.transport_master.set_current_by_name` | `{name: string}` | `{ok, name}` | Set current master by name |
| `daw.transport_master.add` | `{type: string, name: string}` | `{ok, type, name}` | Add a new transport master |
| `daw.transport_master.remove` | `{name: string}` | `{ok, name}` | Remove a transport master |
| `daw.transport_master.get_type` | `{name: string}` | `{name, type}` | Get the type of a transport master |
| `daw.transport_master.locked` | `{name: string}` | `{name, locked}` | Check if a transport master is locked |
| `daw.transport_master.get_delta` | `{name: string}` | `{name, delta, delta_string}` | Get sync delta for a transport master |
| `daw.transport_master.get_position` | `{name: string}` | `{name, position}` | Get position string for a transport master |
| `daw.transport_master.set_collect` | `{name: string, collect: boolean}` | `{ok, name, collect}` | Enable/disable data collection |
| `daw.transport_master.set_request_mask` | `{name: string, mask: number}` | `{ok, name, mask}` | Set transport request mask |
| `daw.transport_master.set_sample_clock_synced` | `{name: string, synced: boolean}` | `{ok, name, synced}` | Set sample clock sync state |
| `daw.transport_master.suspend_timecode` | none | `{ok}` | Suspend timecode transmission |
| `daw.transport_master.resume_timecode` | none | `{ok}` | Resume timecode transmission |

## Monitor Processor Extended (Tier 2)

Per-channel cut, solo, polarity, dim level, and monitor section state. Source: `dawflow_commands_tier2.cc` section 2.4 (14 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.monitor.set_cut` | `{channel: number, cut: boolean}` | `{ok, channel, cut}` | Per-channel cut on monitor |
| `daw.monitor.set_solo` | `{channel: number, solo: boolean}` | `{ok, channel, solo}` | Per-channel solo on monitor |
| `daw.monitor.set_polarity` | `{channel: number, invert: boolean}` | `{ok, channel, invert}` | Per-channel polarity invert on monitor |
| `daw.monitor.get_cut_all` | none | `{cut_all}` | Get global cut state |
| `daw.monitor.get_dim_all` | none | `{dim_all}` | Get global dim state |
| `daw.monitor.get_mono` | none | `{mono}` | Get mono state |
| `daw.monitor.get_cut` | `{channel: number}` | `{channel, cut}` | Get per-channel cut state |
| `daw.monitor.get_dim` | `{channel: number}` | `{channel, dim}` | Get per-channel dim state |
| `daw.monitor.get_solo` | `{channel: number}` | `{channel, solo}` | Get per-channel solo state |
| `daw.monitor.get_polarity` | `{channel: number}` | `{channel, inverted}` | Get per-channel polarity state |
| `daw.monitor.get_dim_level` | none | `{dim_level, dim_level_dB}` | Get dim level in coefficient and dB |
| `daw.monitor.get_solo_boost_level` | none | `{solo_boost_level, solo_boost_level_dB}` | Get solo boost level |
| `daw.monitor.is_active` | none | `{active}` | Check if monitor processor is active |
| `daw.session.reset_monitor_section` | none | `{ok}` | Reset monitor processor to defaults |

## Location Flags (Tier 2)

Lock/unlock locations, set flags (CD, cue, skip, section, range, hidden), clear markers, and set time domain. Source: `dawflow_commands_tier2.cc` section 2.5 (16 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.location.lock` | `{id: string}` | `{ok, id, locked}` | Lock a location |
| `daw.location.unlock` | `{id: string}` | `{ok, id, locked}` | Unlock a location |
| `daw.location.set_hidden` | `{id: string, hidden: boolean}` | `{ok, id, hidden}` | Show or hide a location |
| `daw.location.set_cd` | `{id: string, cd: boolean}` | `{ok, id, cd}` | Set CD marker flag |
| `daw.location.set_cue` | `{id: string, cue: boolean}` | `{ok, id, cue}` | Set cue flag |
| `daw.location.set_is_range` | `{id: string, is_range: boolean}` | `{ok, id, is_range}` | Set range marker flag |
| `daw.location.set_skip` | `{id: string, skip: boolean}` | `{ok, id, skip}` | Set skip flag |
| `daw.location.set_section` | `{id: string, section: boolean}` | `{ok, id, section}` | Set section flag |
| `daw.location.set_cue_id` | `{id: string, cue_id: number}` | `{ok, id, cue_id}` | Set cue ID on a location |
| `daw.location.set_scene_change` | `{id: string, clear?: boolean}` | `{ok, id, scene_change}` | Set/clear scene change on a location |
| `daw.location.set_auto_punch` | `{id: string, auto_punch: boolean}` | `{ok, id, auto_punch}` | Set auto-punch flag |
| `daw.location.set_auto_loop` | `{id: string, auto_loop: boolean}` | `{ok, id, auto_loop}` | Set auto-loop flag |
| `daw.locations.clear_cue_markers` | `{start: number, end: number}` | `{ok, start, end}` | Clear cue markers in a time range |
| `daw.locations.clear_scene_markers` | `{start: number, end: number}` | `{ok, start, end}` | Clear scene markers in a time range |
| `daw.locations.cut_copy_section` | `{start: number, end: number, to: number, op?: string}` | `{ok, op}` | Cut/copy/insert/delete a location section |
| `daw.location.set_time_domain` | `{id: string, domain: string}` | `{ok, id, domain}` | Set time domain (audio/beats) |

## Automation Write Passes (Tier 2)

Start/stop touch and write passes, check writability, value conversion, and grouped controls. Source: `dawflow_commands_tier2.cc` section 2.6 (10 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.automation.start_touch` | `{track_id: string, control: string, when?: number}` | `{ok, track_id, control}` | Start touch automation at a position |
| `daw.automation.stop_touch` | `{track_id: string, control: string, when?: number}` | `{ok, track_id, control}` | Stop touch automation at a position |
| `daw.automation.start_write_pass` | `{track_id: string, control: string, when?: number}` | `{ok, track_id, control}` | Start an automation write pass |
| `daw.automation.write_pass_finished` | `{track_id: string, control: string, when?: number}` | `{ok, track_id, control}` | Signal that a write pass finished |
| `daw.automation.writable` | `{track_id: string, control: string}` | `{writable, track_id, control}` | Check if an automation control is writable |
| `daw.automation.internal_to_interface` | `{track_id: string, control: string, value: number}` | `{interface_value, internal_value}` | Convert internal value to interface (0-1) |
| `daw.automation.interface_to_internal` | `{track_id: string, control: string, value: number}` | `{internal_value, interface_value}` | Convert interface (0-1) to internal value |
| `daw.automation.get_user_string` | `{track_id: string, control: string}` | `{user_string, value, track_id, control}` | Get human-readable string for current value |
| `daw.automation.get_grouped_controls` | `{track_id: string, control: string}` | `{track_id, control, grouped: [{name, value, id}], count}` | Get controls grouped with this one |
| `daw.automation.commit_transaction` | `{track_id: string, control: string}` | `{ok, track_id, control}` | Commit an automation transaction |

## VCA Advanced (Tier 2)

VCA assignment, slave queries, solo state, and control inspection. Source: `dawflow_commands_tier2.cc` section 2.7 (6 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.vca.assign` | `{vca_id: string, target_vca_id: string}` | `{ok, vca_id, target_vca_id}` | Assign a VCA as master to another VCA |
| `daw.vca.slaved_to` | `{vca_id: string, other_id: string}` | `{slaved_to, vca_id, other_id}` | Check if VCA is slaved to another |
| `daw.vca.slaved` | `{vca_id: string}` | `{slaved, vca_id}` | Check if VCA is slaved to any master |
| `daw.vca.soloed` | `{vca_id: string}` | `{soloed, vca_id}` | Check if VCA is soloed |
| `daw.vca.clear_all_solo_state` | `{vca_id: string}` | `{ok, vca_id}` | Clear all solo state on a VCA |
| `daw.vca.get_controls` | `{vca_id: string}` | `{vca_id, gain, mute, solo}` | Get VCA gain, mute, and solo controls |

## Export System (Tier 3)

Full export configuration: format, normalization, timespans, sample rate conversion, tagging, and execution. Source: `dawflow_commands_tier3.cc` section 3.1 (40 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.export.create_profile` | params | result | Create a new export profile |
| `daw.export.set_format_type` | `{type: string}` | `{ok}` | Set export format type (WAV, FLAC, Ogg, MP3, etc.) |
| `daw.export.set_format_name` | `{name: string}` | `{ok}` | Set export format name |
| `daw.export.set_sample_rate` | `{sample_rate: number}` | `{ok}` | Set export sample rate |
| `daw.export.set_bit_depth` | `{bit_depth: number}` | `{ok}` | Set export bit depth |
| `daw.export.set_dither_type` | `{dither: string}` | `{ok}` | Set dither type |
| `daw.export.set_src_quality` | `{quality: number}` | `{ok}` | Set sample rate conversion quality |
| `daw.export.set_normalize` | `{enabled: boolean}` | `{ok}` | Enable/disable normalization |
| `daw.export.set_normalize_dbfs` | `{dbfs: number}` | `{ok}` | Set peak normalization target in dBFS |
| `daw.export.set_normalize_dbtp` | `{dbtp: number}` | `{ok}` | Set true-peak normalization target |
| `daw.export.set_normalize_lufs` | `{lufs: number}` | `{ok}` | Set LUFS normalization target |
| `daw.export.set_normalize_loudness` | `{enabled: boolean}` | `{ok}` | Enable/disable loudness normalization |
| `daw.export.set_trim_beginning` | `{enabled: boolean}` | `{ok}` | Enable/disable trim silence at beginning |
| `daw.export.set_trim_end` | `{enabled: boolean}` | `{ok}` | Enable/disable trim silence at end |
| `daw.export.set_silence_beginning` | `{seconds: number}` | `{ok}` | Set silence padding at beginning |
| `daw.export.set_silence_end` | `{seconds: number}` | `{ok}` | Set silence padding at end |
| `daw.export.set_codec_quality` | `{quality: number}` | `{ok}` | Set lossy codec quality |
| `daw.export.set_tagging` | `{enabled: boolean}` | `{ok}` | Enable/disable metadata tagging |
| `daw.export.set_with_cue` | `{enabled: boolean}` | `{ok}` | Enable/disable CUE sheet generation |
| `daw.export.set_with_toc` | `{enabled: boolean}` | `{ok}` | Enable/disable TOC file generation |
| `daw.export.set_with_mp4chaps` | `{enabled: boolean}` | `{ok}` | Enable/disable MP4 chapter markers |
| `daw.export.set_tp_limiter` | `{enabled: boolean}` | `{ok}` | Enable/disable true-peak limiter |
| `daw.export.set_channel_split` | `{enabled: boolean}` | `{ok}` | Enable/disable channel splitting |
| `daw.export.set_analyse` | `{enabled: boolean}` | `{ok}` | Enable/disable post-export analysis |
| `daw.export.set_reimport` | `{enabled: boolean}` | `{ok}` | Enable/disable reimport after export |
| `daw.export.set_post_export_command` | `{command: string}` | `{ok}` | Set post-export shell command |
| `daw.export.set_filename_folder` | `{folder: string}` | `{ok}` | Set export output folder |
| `daw.export.set_filename_label` | `{label: string}` | `{ok}` | Set export filename label |
| `daw.export.set_filename_revision` | `{revision: number}` | `{ok}` | Set export filename revision number |
| `daw.export.set_timespan` | params | result | Set export timespan (session/selection/ranges) |
| `daw.export.set_timespan_realtime` | `{realtime: boolean}` | `{ok}` | Enable/disable real-time export |
| `daw.export.add_channel_config` | params | result | Add channel configuration to export |
| `daw.export.get_warnings` | none | result | Get export warnings/errors |
| `daw.export.get_sample_filename` | none | result | Get a sample of the export filename |
| `daw.export.prepare` | none | result | Prepare the export (validate config) |
| `daw.export.execute` | none | result | Execute the export |
| `daw.export.abort` | none | result | Abort an in-progress export |
| `daw.export.save_preset` | `{name: string}` | result | Save current export config as a preset |
| `daw.export.remove_preset` | `{name: string}` | result | Remove an export preset |
| `daw.export.load_preset` | `{name: string}` | result | Load an export preset |
| `daw.delivery.set_analysis_active` | `{track_id: string, active: boolean}` | `{ok}` | Enable/disable delivery analysis on a route |

## Plugin Manager (Tier 3)

Plugin scanning, blacklisting, cache management, status, statistics, and tagging. Source: `dawflow_commands_tier3.cc` section 3.2 (25 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.plugin_manager.refresh` | none | result | Refresh/rescan all plugins |
| `daw.plugin_manager.cancel_scan` | none | result | Cancel an in-progress plugin scan |
| `daw.plugin_manager.get_stats` | none | result | Get plugin scan statistics |
| `daw.plugin_manager.get_status` | `{plugin_id: string}` | result | Get status of a specific plugin |
| `daw.plugin_manager.set_status` | `{plugin_id: string, status: string}` | result | Set plugin status (Normal/Favorite/Hidden) |
| `daw.plugin_manager.get_type_name` | `{type: string}` | result | Get display name for a plugin type |
| `daw.plugin_manager.get_plugins_by_type` | `{type: string}` | result | List plugins filtered by type |
| `daw.plugin_manager.cache_valid` | none | result | Check if plugin cache is valid |
| `daw.plugin_manager.blacklist` | `{plugin_id: string}` | result | Blacklist a plugin |
| `daw.plugin_manager.whitelist` | `{plugin_id: string}` | result | Remove a plugin from blacklist |
| `daw.plugin_manager.clear_vst_cache` | none | result | Clear VST plugin cache |
| `daw.plugin_manager.clear_vst_blacklist` | none | result | Clear VST blacklist |
| `daw.plugin_manager.clear_vst3_cache` | none | result | Clear VST3 plugin cache |
| `daw.plugin_manager.clear_vst3_blacklist` | none | result | Clear VST3 blacklist |
| `daw.plugin_manager.clear_au_cache` | none | result | Clear AudioUnit cache |
| `daw.plugin_manager.clear_au_blacklist` | none | result | Clear AudioUnit blacklist |
| `daw.plugin_manager.get_scan_log` | none | result | Get plugin scan log |
| `daw.plugin_manager.clear_stale_log` | none | result | Clear stale scan log entries |
| `daw.plugin_manager.rescan_plugin` | `{plugin_id: string}` | result | Rescan a specific plugin |
| `daw.plugin_manager.rescan_faulty` | none | result | Rescan all faulty plugins |
| `daw.plugin_manager.reset_stats` | none | result | Reset plugin statistics |
| `daw.plugin_manager.save_statuses` | none | result | Save plugin statuses to disk |
| `daw.plugin_manager.save_tags` | none | result | Save plugin tags to disk |
| `daw.plugin_manager.dump_untagged` | none | result | List plugins without tags |
| `daw.plugin_manager.get_default_vst_path` | none | result | Get default VST search path |

## Track Advanced Controls (Tier 3)

MIDI track configuration, alignment, buffer monitoring, and input monitoring. Source: `dawflow_commands_tier3.cc` section 3.3 (20 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi_track.midi_panic` | `{track_id: string}` | `{ok}` | Send MIDI panic (all-notes-off) on a single track |
| `daw.midi_track.set_input_active` | `{track_id: string, active: boolean}` | `{ok}` | Enable/disable MIDI input on a track |
| `daw.midi_track.set_capture_channel_mode` | `{track_id: string, mode: string}` | `{ok}` | Set MIDI capture channel filtering |
| `daw.midi_track.set_playback_channel_mode` | `{track_id: string, mode: string}` | `{ok}` | Set MIDI playback channel filtering |
| `daw.midi_track.set_step_editing` | `{track_id: string, enabled: boolean}` | `{ok}` | Enable/disable step editing mode |
| `daw.midi_track.set_chase_notes` | `{track_id: string, enabled: boolean}` | `{ok}` | Enable/disable note chase on locate |
| `daw.midi_track.write_immediate_event` | `{track_id: string, data: number[]}` | `{ok}` | Send raw MIDI event immediately |
| `daw.track.set_align_style` | `{track_id: string, style: string}` | `{ok}` | Set track alignment style |
| `daw.track.set_align_choice` | `{track_id: string, choice: string}` | `{ok}` | Set track alignment choice |
| `daw.track.capture_buffer_load` | `{track_id: string}` | result | Get capture buffer fill percentage |
| `daw.track.playback_buffer_load` | `{track_id: string}` | result | Get playback buffer fill percentage |
| `daw.track.request_input_monitoring` | `{track_id: string, enabled: boolean}` | `{ok}` | Request input monitoring on a track |
| `daw.track.ensure_input_monitoring` | `{track_id: string, enabled: boolean}` | `{ok}` | Ensure input monitoring is set |
| `daw.route.set_denormal_protection` | `{track_id: string, enabled: boolean}` | `{ok}` | Enable/disable denormal protection |
| `daw.route.set_meter_point` | `{track_id: string, point: string}` | `{ok}` | Set meter tap point (pre/post/output/custom) |
| `daw.route.set_meter_type` | `{track_id: string, type: string}` | `{ok}` | Set meter type |
| `daw.route.get_latency` | `{track_id: string}` | result | Get route signal latency |
| `daw.route.get_monitoring_state` | `{track_id: string}` | result | Get route monitoring state |
| `daw.route.output_effectively_connected` | `{track_id: string}` | result | Check if output is effectively connected |
| `daw.route.signal_sources` | `{track_id: string}` | result | Get all signal sources feeding a route |

## Send/Return Config (Tier 3)

Send panner linking, auto-disconnect, sidechain, foldback, surround sends, and internal send configuration. Source: `dawflow_commands_tier3.cc` section 3.4 (12 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.route.add_aux_send` | `{track_id: string, bus_id: string}` | `{ok}` | Add an aux send from track to bus |
| `daw.route.add_foldback_send` | `{track_id: string, bus_id: string}` | `{ok}` | Add a foldback send from track to bus |
| `daw.route.add_sidechain` | `{track_id: string, plugin_id: string}` | `{ok}` | Add sidechain input to a plugin |
| `daw.route.remove_sidechain` | `{track_id: string, plugin_id: string}` | `{ok}` | Remove sidechain from a plugin |
| `daw.route.enable_monitor_send` | `{track_id: string}` | `{ok}` | Enable monitor send on a route |
| `daw.route.enable_surround_send` | `{track_id: string}` | `{ok}` | Enable surround send on a route |
| `daw.route.feeds` | `{track_id: string, other_id: string}` | result | Check if a route feeds another |
| `daw.route.get_internal_send` | `{track_id: string, target_id: string}` | result | Get internal send between two routes |
| `daw.send.set_panner_linked` | `{track_id: string, send_id: string, linked: boolean}` | `{ok}` | Link/unlink send panner to track panner |
| `daw.send.set_remove_on_disconnect` | `{track_id: string, send_id: string, enabled: boolean}` | `{ok}` | Auto-remove send when target disconnects |
| `daw.internal_send.set_allow_feedback` | `{track_id: string, send_id: string, allow: boolean}` | `{ok}` | Allow/disallow feedback on internal send |
| `daw.session.load_io_plugin` | `{name: string}` | result | Load an I/O plugin into the session |

## Trigger/Clip Advanced (Tier 3)

Trigger slot configuration, follow actions, MIDI learn, TriggerBox control, audio/MIDI trigger properties. Source: `dawflow_commands_tier3.cc` section 3.5 (35 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.trigger.set_follow_action0` | `{track_id: string, slot: number, type: string}` | `{ok}` | Set primary follow action |
| `daw.trigger.set_follow_action1` | `{track_id: string, slot: number, type: string}` | `{ok}` | Set secondary follow action |
| `daw.trigger.set_follow_probability` | `{track_id: string, slot: number, probability: number}` | `{ok}` | Set follow action probability (0-100) |
| `daw.trigger.set_follow_length` | `{track_id: string, slot: number, beats: number}` | `{ok}` | Set follow action length in beats |
| `daw.trigger.set_use_follow_length` | `{track_id: string, slot: number, enabled: boolean}` | `{ok}` | Enable/disable follow length |
| `daw.trigger.set_legato` | `{track_id: string, slot: number, legato: boolean}` | `{ok}` | Enable/disable legato mode |
| `daw.trigger.set_velocity_effect` | `{track_id: string, slot: number, effect: number}` | `{ok}` | Set velocity effect amount |
| `daw.trigger.set_stretchable` | `{track_id: string, slot: number, stretchable: boolean}` | `{ok}` | Enable/disable time-stretching |
| `daw.trigger.set_cue_isolated` | `{track_id: string, slot: number, isolated: boolean}` | `{ok}` | Isolate trigger from cue |
| `daw.trigger.set_allow_patch_changes` | `{track_id: string, slot: number, allow: boolean}` | `{ok}` | Allow/disallow MIDI patch changes |
| `daw.trigger.clear_region` | `{track_id: string, slot: number}` | `{ok}` | Clear region from a trigger slot |
| `daw.trigger.request_stop` | `{track_id: string, slot: number}` | `{ok}` | Request trigger stop |
| `daw.trigger.stop_quantized` | `{track_id: string, slot: number}` | `{ok}` | Stop trigger at next quantize point |
| `daw.trigger.get_position` | `{track_id: string, slot: number}` | result | Get trigger playback position |
| `daw.trigger.get_position_fraction` | `{track_id: string, slot: number}` | result | Get trigger playback progress (0-1) |
| `daw.triggerbox.clear_all` | `{track_id: string}` | `{ok}` | Clear all trigger slots |
| `daw.triggerbox.disarm_all` | `{track_id: string}` | `{ok}` | Disarm all trigger slots |
| `daw.triggerbox.stop_all_immediately` | `{track_id: string}` | `{ok}` | Stop all triggers immediately |
| `daw.triggerbox.set_record_enabled` | `{track_id: string, enabled: boolean}` | `{ok}` | Enable/disable trigger recording |
| `daw.triggerbox.get_record_enabled` | `{track_id: string}` | result | Check if trigger recording is enabled |
| `daw.triggerbox.begin_midi_learn` | `{track_id: string, slot: number}` | `{ok}` | Start MIDI learn for a trigger slot |
| `daw.triggerbox.midi_unlearn` | `{track_id: string, slot: number}` | `{ok}` | Remove MIDI learn mapping |
| `daw.triggerbox.stop_midi_learn` | `{track_id: string}` | `{ok}` | Stop MIDI learn mode |
| `daw.triggerbox.get_midi_map_mode` | `{track_id: string}` | result | Get MIDI mapping mode |
| `daw.triggerbox.set_midi_map_mode` | `{track_id: string, mode: string}` | `{ok}` | Set MIDI mapping mode |
| `daw.triggerbox.get_first_midi_note` | `{track_id: string}` | result | Get first MIDI note for trigger mapping |
| `daw.triggerbox.set_first_midi_note` | `{track_id: string, note: number}` | `{ok}` | Set first MIDI note for trigger mapping |
| `daw.audio_trigger.set_segment_tempo` | `{track_id: string, slot: number, bpm: number}` | `{ok}` | Set audio trigger segment tempo |
| `daw.audio_trigger.set_segment_beatcnt` | `{track_id: string, slot: number, beats: number}` | `{ok}` | Set audio trigger segment beat count |
| `daw.audio_trigger.get_segment_beatcnt` | `{track_id: string, slot: number}` | result | Get audio trigger segment beat count |
| `daw.midi_trigger.set_channel_map` | `{track_id: string, slot: number, map: string}` | `{ok}` | Set MIDI trigger channel map |
| `daw.midi_trigger.set_patch_change` | `{track_id: string, slot: number, channel: number, program: number, bank?: number}` | `{ok}` | Set MIDI trigger patch change |
| `daw.midi_trigger.unset_patch_change` | `{track_id: string, slot: number, channel: number}` | `{ok}` | Remove MIDI trigger patch change |
| `daw.midi_trigger.unset_all_patch_changes` | `{track_id: string, slot: number}` | `{ok}` | Remove all MIDI trigger patch changes |
| `daw.midi_trigger.get_used_channels` | `{track_id: string, slot: number}` | result | Get MIDI channels used by trigger |

## Surround/Atmos (Tier 4)

Surround send gain, pannable positions, delay, and Apple AU renderer integration. Source: `dawflow_commands_tier4.cc` section 4.1 (13 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.surround_send.get_gain_control` | `{track_id: string}` | `{gain, track_id}` | Get surround send gain |
| `daw.surround_send.get_pannable` | `{track_id: string, index?: number}` | `{pos_x, pos_y, pos_z, size}` | Get surround pannable position |
| `daw.surround_send.n_pannables` | `{track_id: string}` | `{n_pannables}` | Get number of surround pannables |
| `daw.surround_send.set_delay_in` | `{track_id: string, samples: number}` | `{ok}` | Set surround send input delay |
| `daw.surround_send.set_delay_out` | `{track_id: string, samples: number}` | `{ok}` | Set surround send output delay |
| `daw.surround_pannable.get_automation_state` | `{track_id: string, index?: number}` | result | Get surround pan automation state |
| `daw.surround_pannable.set_automation_state` | `{track_id: string, index?: number, state: string}` | `{ok}` | Set surround pan automation state |
| `daw.surround_pannable.touching` | `{track_id: string, index?: number}` | result | Check if surround pannable is being touched |
| `daw.surround_pannable.setup_visual_links` | `{track_id: string}` | `{ok}` | Set up visual links for surround panning |
| `daw.surround_pannable.sync_visual_link` | `{track_id: string}` | `{ok}` | Sync visual link state |
| `daw.surround_return.have_au_renderer` | none | result | Check if Apple AU renderer is available |
| `daw.surround_return.load_au_preset` | `{preset: string}` | result | Load an AU renderer preset |
| `daw.surround_return.set_au_param` | `{param: string, value: number}` | result | Set AU renderer parameter |

## Source/Cue Markers (Tier 4)

Source-level cue markers, take IDs, transient loading, tempo estimation, and analysis state. Source: `dawflow_commands_tier4.cc` section 4.2 (14 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.source.get_cue_markers` | `{source_id: string}` | result | Get cue markers on a source |
| `daw.source.add_cue_marker` | `{source_id: string, name: string, position: number}` | `{ok}` | Add a cue marker to a source |
| `daw.source.remove_cue_marker` | `{source_id: string, position: number}` | `{ok}` | Remove a cue marker from a source |
| `daw.source.move_cue_marker` | `{source_id: string, old_position: number, new_position: number}` | `{ok}` | Move a cue marker |
| `daw.source.rename_cue_marker` | `{source_id: string, position: number, name: string}` | `{ok}` | Rename a cue marker |
| `daw.source.clear_cue_markers` | `{source_id: string}` | `{ok}` | Clear all cue markers from a source |
| `daw.source.get_take_id` | `{source_id: string}` | result | Get take ID for a source |
| `daw.source.set_take_id` | `{source_id: string, take_id: string}` | `{ok}` | Set take ID for a source |
| `daw.source.has_been_analysed` | `{source_id: string}` | result | Check if source has been analysed |
| `daw.source.load_transients` | `{source_id: string}` | result | Load transient data for a source |
| `daw.source.mark_for_remove` | `{source_id: string}` | `{ok}` | Mark a source for removal |
| `daw.source.get_segment_descriptor` | `{source_id: string}` | result | Get segment descriptor for a source |
| `daw.audio_source.build_peaks` | `{source_id: string}` | `{ok}` | Build peak data for an audio source |
| `daw.audio_source.estimate_tempo` | `{source_id: string}` | result | Estimate tempo of an audio source |

## Bundle/IO Routing (Tier 4)

Create, connect, and manage bundles (named port groups) for complex I/O routing. Source: `dawflow_commands_tier4.cc` section 4.3 (15 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.bundle.create` | `{name: string, type?: string, direction?: string}` | result | Create a new bundle |
| `daw.bundle.list_all` | none | result | List all bundles |
| `daw.bundle.add_channel` | `{bundle: string, name: string}` | `{ok}` | Add a channel to a bundle |
| `daw.bundle.remove_channel` | `{bundle: string, index: number}` | `{ok}` | Remove a channel from a bundle |
| `daw.bundle.add_port` | `{bundle: string, channel: number, port: string}` | `{ok}` | Add a port to a bundle channel |
| `daw.bundle.remove_port` | `{bundle: string, channel: number, port: string}` | `{ok}` | Remove a port from a bundle channel |
| `daw.bundle.connect` | `{bundle: string, other: string}` | `{ok}` | Connect two bundles |
| `daw.bundle.disconnect` | `{bundle: string, other: string}` | `{ok}` | Disconnect two bundles |
| `daw.bundle.connected_to` | `{bundle: string, other: string}` | result | Check if two bundles are connected |
| `daw.io.add_port` | `{track_id: string, direction: string, type?: string}` | `{ok}` | Add a port to a route's I/O |
| `daw.io.remove_port` | `{track_id: string, port: string}` | `{ok}` | Remove a port from a route's I/O |
| `daw.io.connect_to_bundle` | `{track_id: string, bundle: string, direction: string}` | `{ok}` | Connect a route's I/O to a bundle |
| `daw.io.disconnect_from_bundle` | `{track_id: string, bundle: string, direction: string}` | `{ok}` | Disconnect a route's I/O from a bundle |
| `daw.io.get_bundles_connected` | `{track_id: string, direction: string}` | result | List bundles connected to a route |
| `daw.io.get_latency` | `{track_id: string, direction: string}` | result | Get I/O latency |

## Selection System (Tier 4)

Track and time range selection operations. Source: `dawflow_commands_tier4.cc` section 4.4 (12 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.selection.select_track` | `{track_id: string, op?: string}` | `{ok}` | Select a track (op: set/add/toggle) |
| `daw.selection.get_selected_tracks` | none | result | Get selected tracks |
| `daw.selection.clear_tracks` | none | `{ok}` | Clear track selection |
| `daw.selection.select_next_track` | none | `{ok}` | Select next track |
| `daw.selection.select_prev_track` | none | `{ok}` | Select previous track |
| `daw.selection.get_first_selected` | none | result | Get first selected track |
| `daw.selection.is_selected` | `{track_id: string}` | result | Check if a track is selected |
| `daw.selection.get_time_range` | none | result | Get selected time range |

## Lua Scripts Extended (Tier 4)

Execute Lua scripts, create plugins/sends, control parameters, and manage registered functions. Source: `dawflow_commands_tier4.cc` section 4.5 (12 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.lua.execute` | `{script: string}` | result | Execute a Lua script |
| `daw.lua.list_functions` | none | result | List registered Lua functions |
| `daw.lua.register_function` | `{name: string, script: string}` | `{ok}` | Register a named Lua function |
| `daw.lua.unregister_function` | `{name: string}` | `{ok}` | Unregister a Lua function |
| `daw.lua.list_plugins` | none | result | List Lua plugins |
| `daw.lua.new_plugin` | `{track_id: string, script: string}` | result | Create a new Lua plugin on a track |
| `daw.lua.new_send` | `{track_id: string, target_id: string}` | result | Create a new Lua send |
| `daw.lua.get_processor_param` | `{track_id: string, processor_id: string, param: number}` | result | Get Lua processor parameter value |
| `daw.lua.set_processor_param` | `{track_id: string, processor_id: string, param: number, value: number}` | `{ok}` | Set Lua processor parameter value |
| `daw.lua.reset_processor` | `{track_id: string, processor_id: string}` | `{ok}` | Reset a Lua processor |
| `daw.lua.plugin_automation` | `{track_id: string, processor_id: string}` | result | Get Lua plugin automation data |
| `daw.editor.trigger_script` | `{script: string}` | result | Trigger an editor script |

## Playlist Analysis (Tier 4)

Playlist boundary detection, audibility checks, region use count, fade, and partition operations. Source: `dawflow_commands_tier4.cc` section 4.6 (8 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.playlist.find_next_boundary` | `{track_id: string, position: number}` | result | Find next region boundary after position |
| `daw.playlist.find_prev_region_start` | `{track_id: string, position: number}` | result | Find previous region start before position |
| `daw.playlist.region_is_audible` | `{track_id: string, region_id: string}` | result | Check if a region is audible (not hidden by layers) |
| `daw.playlist.region_use_count` | `{track_id: string, region_id: string}` | result | Get number of times a region is used |
| `daw.playlist.top_layer` | `{track_id: string}` | result | Get top layer count |
| `daw.playlist.all_regions_empty` | `{track_id: string}` | result | Check if all regions in playlist are empty |
| `daw.playlist.fade_range` | `{track_id: string, start: number, end: number}` | `{ok}` | Apply fade to a range |
| `daw.playlist.partition` | `{track_id: string, position: number}` | `{ok}` | Partition playlist at a position (split all regions) |

## Phase/Polarity Extended (Tier 4)

Per-channel phase inversion, resize, and bulk operations. Source: `dawflow_commands_tier4.cc` section 4.7 (6 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.phase.set_invert` | `{track_id: string, channel: number, invert: boolean}` | `{ok}` | Set phase inversion on a specific channel |
| `daw.phase.get_inverted` | `{track_id: string, channel: number}` | result | Get phase inversion state for a channel |
| `daw.phase.set_all` | `{track_id: string, invert: boolean}` | `{ok}` | Set phase inversion on all channels |
| `daw.phase.any_inverted` | `{track_id: string}` | result | Check if any channel is phase-inverted |
| `daw.phase.none_inverted` | `{track_id: string}` | result | Check if no channels are phase-inverted |
| `daw.phase.resize` | `{track_id: string, size: number}` | `{ok}` | Resize phase control channel count |

## Butler/Disk I/O (Tier 4)

Butler thread control and disk buffer sizes. Source: `dawflow_commands_tier4.cc` section 4.8 (6 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.butler.summon` | none | `{ok}` | Wake up the butler thread |
| `daw.butler.wait_until_finished` | none | `{ok}` | Wait for butler to finish pending work |
| `daw.butler.schedule_transport_work` | none | `{ok}` | Schedule transport-related disk work |
| `daw.butler.get_playback_buffer_size` | none | result | Get playback disk buffer size |
| `daw.butler.get_capture_buffer_size` | none | result | Get capture disk buffer size |
| `daw.butler.get_midi_buffer_size` | none | result | Get MIDI disk buffer size |

## Editor Operations (Tier 4)

Playhead navigation, marker jumps, region operations from selection, and recording convenience commands. Source: `dawflow_commands_tier4.cc` section 4.9 (14 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.editor.add_location_at_playhead` | none | `{ok}` | Add a marker at the current playhead position |
| `daw.editor.remove_location_at_playhead` | none | `{ok}` | Remove marker at current playhead |
| `daw.editor.add_section_at_playhead` | none | `{ok}` | Add a section marker at playhead |
| `daw.editor.goto_nth_marker` | `{n: number}` | result | Jump playhead to the Nth marker |
| `daw.editor.jump_forward_to_mark` | none | result | Jump playhead forward to next marker |
| `daw.editor.jump_backward_to_mark` | none | result | Jump playhead backward to previous marker |
| `daw.editor.play_selection` | none | `{ok}` | Play the current selection |
| `daw.editor.play_with_preroll` | none | `{ok}` | Play with preroll |
| `daw.editor.rec_with_preroll` | none | `{ok}` | Record with preroll |
| `daw.editor.rec_with_count_in` | none | `{ok}` | Record with count-in |
| `daw.editor.set_loop_range` | none | `{ok}` | Set loop range from selection |
| `daw.editor.set_punch_range` | none | `{ok}` | Set punch range from selection |
| `daw.editor.new_region_from_selection` | none | result | Create a new region from the current selection |
| `daw.editor.separate_region_from_selection` | none | result | Separate region at selection boundaries |
| `daw.editor.normalize_region` | `{track_id?: string, region_id?: string}` | `{ok}` | Normalize selected/specified region |
| `daw.editor.reverse_region` | `{track_id?: string, region_id?: string}` | result | Reverse selected/specified region |
| `daw.editor.pitch_shift_region` | `{track_id?: string, region_id?: string, semitones?: number}` | result | Pitch shift selected/specified region |

---

## Editor View Operations (Final)

Editor view/UI commands for track fitting, fullscreen editing, visual state bookmarks, solo-selection playback, edit mode cycling, marker lines, automation lane visibility, layer display, and transient navigation. Source: `dawflow_commands_final_coverage.cc` (11 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.editor.fit_tracks_in_view` | `{count?: number}` | `{ok, stub, count}` | Fit N tracks into the visible editor area |
| `daw.editor.maximize_editing_space` | none | `{ok, stub}` | Toggle fullscreen editing space (hide all panels) |
| `daw.editor.restore_editing_space` | none | `{ok, stub}` | Restore normal editing space from fullscreen |
| `daw.editor.save_visual_state` | `{slot: number}` | `{ok, stub, slot}` | Save current view (zoom, scroll, track heights) to a bookmark slot |
| `daw.editor.goto_visual_state` | `{slot: number}` | `{ok, stub, slot}` | Restore a previously saved view bookmark |
| `daw.editor.play_solo_selection` | none | `{ok, stub}` | Play with only selected tracks soloed |
| `daw.editor.cycle_edit_mode` | none | `{ok, previous, current}` | Cycle edit mode: Slide -> Lock -> Ripple -> Slide |
| `daw.editor.toggle_marker_lines` | none | `{ok, stub}` | Toggle vertical lines at marker positions |
| `daw.editor.toggle_all_existing_automation` | none | `{ok, stub}` | Toggle visibility of all existing automation lanes |
| `daw.editor.toggle_layer_display` | none | `{ok, stub}` | Toggle between stacked and overlaid region layer display |
| `daw.editor.tab_to_transient` | `{direction?: "forward"\|"backward"}` | `{ok, stub, direction}` | Jump to the next or previous transient in the selected region |

---

## Editor Data Operations (Final)

Editor data operations for external editing, range markers, BBT markers, location toggling, tempo/meter editing, region recovery, and MIDI list editor. Source: `dawflow_commands_final_coverage.cc` (8 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.editor.external_edit_region` | `{region_id: string}` | `{ok, stub, region_id}` | Launch external audio editor for the specified region |
| `daw.editor.add_location_from_selection` | `{start: int64, end: int64, name?: string}` | `{ok, name, start, end}` | Create a range marker from the given sample bounds |
| `daw.editor.add_bbt_marker_at_playhead` | none | `{ok, position, name}` | Add a BBT (time signature) marker at the current playhead position |
| `daw.editor.toggle_location_at_playhead` | none | `{ok, position, action, name}` | Add or remove a marker at the current playhead (toggles) |
| `daw.editor.edit_tempo_at_position` | `{position: int64, new_bpm: number}` | `{ok, position, new_bpm}` | Modify the tempo at a given sample position |
| `daw.editor.edit_meter_at_position` | `{position: int64, numerator: int, denominator: int}` | `{ok, position, numerator, denominator}` | Modify the time signature at a given sample position |
| `daw.editor.recover_regions` | none | `{ok, stub}` | Recover recently deleted regions from undo history |
| `daw.editor.show_midi_list_editor` | `{region_id: string}` | `{ok, stub, region_id}` | Open the MIDI list editor for a specified MIDI region |

---

## Bulk Playlist Operations (Final)

Create new playlists in bulk for all tracks, armed tracks, or selected tracks. Source: `dawflow_commands_final_coverage.cc` (3 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.editor.new_playlists_for_all_tracks` | none | `{ok, count}` | Create new playlists on every track in the session |
| `daw.editor.new_playlists_for_armed_tracks` | none | `{ok, count}` | Create new playlists only on record-armed tracks |
| `daw.editor.new_playlists_for_selected_tracks` | none | `{ok, stub}` | Create new playlists for the currently selected tracks |

---

## Step Sequencer Final

Step sequencer mode, offset, and duration controls. Source: `dawflow_commands_final_coverage.cc` (3 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.step_sequence.set_mode` | `{track_id: string, mode?: int}` | `{ok, stub, track_id, mode}` | Set the musical mode for a step sequence on a track |
| `daw.step.set_offset` | `{track_id: string, step: int, offset: number}` | `{ok, stub, track_id, step, offset}` | Set the timing offset (in beats) for a specific step |
| `daw.step.adjust_duration` | `{track_id: string, step: int, delta: number}` | `{ok, stub, track_id, step, delta}` | Adjust the duration of a specific step by a delta ratio |

---

## Panner Extended (Final)

Extended panner operations for elevation range and I/O configuration. Source: `dawflow_commands_final_coverage.cc` (2 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.panner.get_elevation_range` | `{track_id: string}` | `{ok, track_id, min, max}` | Get the minimum and maximum elevation values for a track's panner |
| `daw.panner_shell.configure_io` | `{track_id: string, in_channels: int, out_channels: int}` | `{ok, track_id, in_channels, out_channels}` | Configure the panner shell's input/output channel counts |

---

## MIDI Patches Extended (Final)

Update custom MIDI device definitions (MIDNAM). Source: `dawflow_commands_final_coverage.cc` (1 command).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.midi_patches.update_custom_midnam` | `{name: string, data: string}` | `{ok, name}` | Update a custom MIDI device definition (MIDNAM XML data) |

---

## Analysis Extended (Final)

Extended analysis commands for range analysis, integrated LUFS, EBU R128 measurement, MIDI strum, and MIDI transform. Source: `dawflow_commands_final_coverage.cc` (5 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.analyze.range` | `{track_id: string, start: int64, end: int64}` | `{ok, track_id, start, end, samples_read, rms, rms_dB, peak, peak_dB}` | Analyze RMS and peak levels for an arbitrary time range on an audio track |
| `daw.analyze.lufs_integrated` | `{track_id: string, region_id?: string}` | `{ok, track_id, region_id, integrated_lufs, samples_analyzed}` | Calculate integrated LUFS loudness for a region or entire playlist (approximation) |
| `daw.analyze.ebur128` | `{track_id: string, region_id?: string}` | `{ok, track_id, region_id, integrated_lufs, loudness_range, true_peak_dBTP, samples_analyzed}` | EBU R128 measurement: integrated LUFS, loudness range (LRA), and true peak estimate |
| `daw.filter.strum` | `{region_id: string, delay_per_note_ms: number}` | `{ok, stub, region_id, delay_per_note_ms}` | Apply strum timing to a MIDI chord (incremental delay per note) |
| `daw.filter.midi_transform` | `{region_id: string, transform_spec: object}` | `{ok, stub, region_id, transform_spec}` | Apply a user-defined MIDI transform (velocity/pitch/channel/time operations) |

---

## Control Protocol Extended (Final)

USB controller probing and Mackie Control surface configuration. Source: `dawflow_commands_final_coverage.cc` (4 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.control_protocol.probe_usb` | `{vendor_id: string, product_id: string}` | `{ok, stub, vendor_id, product_id, found}` | Probe for a USB controller device by vendor:product ID |
| `daw.mackie.set_view_mode` | `{mode: string}` | `{ok, stub, mode}` | Set Mackie Control surface view mode (mixer/dynamics/eq/sends/instrument/user) |
| `daw.mackie.set_flip_mode` | `{mode: string}` | `{ok, stub, mode}` | Set Mackie fader flip mode (normal/mirror/flip/zero) |
| `daw.mackie.set_subview` | `{mode: string, strip?: number}` | `{ok, stub, mode, strip}` | Set Mackie soft-key subview assignment (none/eq/dynamics/sends/track_info) |

---

## Audiographer Extended (Final)

Offline processing commands for silence insertion and sample rate conversion. Source: `dawflow_commands_final_coverage.cc` (2 commands).

| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `daw.audiographer.add_silence` | `{region_id: string, start_ms?: number, end_ms?: number}` | `{ok, stub, region_id, start_ms, end_ms}` | Add silence at the start and/or end of a region (offline processing) |
| `daw.audiographer.sample_rate_convert` | `{source_id: string, target_rate: int, quality?: string}` | `{ok, stub, source_id, target_rate, quality}` | Perform offline sample rate conversion on a source (quality: best/medium/fast) |

---

## Events (DAW to Plugin)

Events are JSON messages broadcast from the DAW to all connected plugins when state changes occur. Plugins receive these automatically after registering via `daw.plugin.register`. Events are JSON-RPC notifications (no `id` field).

**124 signal events** across 16 categories.

### Transport Events (4)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.transport.changed` | `{playing, recording, position, speed}` | Transport state changed |
| `daw.transport.positioned` | `{position_samples, speed}` | Transport repositioned |
| `daw.transport.looped` | `{position}` | Playhead wrapped at loop end |
| `daw.transport.located` | `{position_samples}` | Transport located to new position |

### Record Events (5)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.record.changed` | `{recording}` | Record state changed |
| `daw.record.armed_changed` | `{armed_tracks: [{id, name}]}` | Record arm state changed |
| `daw.record.arm_state_changed` | `{}` | Record arm state changed (global) |
| `daw.record.capture_cleared` | `{}` | Recording capture data cleared |
| `daw.record.pass_completed` | `{}` | A recording pass completed |

### Route Events (12)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.routes.added` | `{route_id, route_name}` | New route added to session |
| `daw.routes.instrument_added` | `{route_id, route_name}` | Instrument track added |
| `daw.routes.reconnected` | `{}` | Routes reconnected |
| `daw.routes.removed_from_group` | `{route_id, route_name}` | Track removed from group |
| `daw.route.active_changed` | `{route_id, active}` | Route active state changed |
| `daw.route.comment_changed` | `{route_id}` | Route comment changed |
| `daw.route.denormal_protection_changed` | `{route_id}` | Denormal protection changed |
| `daw.route.fan_out` | `{route_id}` | Route fan-out occurred |
| `daw.route.io_changed` | `{route_id}` | Route I/O configuration changed |
| `daw.route.latency_changed` | `{route_id}` | Route latency changed |
| `daw.route.meter_changed` | `{route_id}` | Route meter changed |
| `daw.route.processors_changed` | `{route_id}` | Processor chain changed |
| `daw.route.property_changed` | `{route_id}` | Route property changed |
| `daw.route.record_enable_changed` | `{route_id}` | Route record enable changed |
| `daw.route.selected_changed` | `{route_id}` | Route selection changed |
| `daw.route.track_number_changed` | `{route_id}` | Track number changed |

### Mix Events (9)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.mix.solo_active` | `{solo_active}` | Global solo state changed |
| `daw.mix.solo_changed` | `{}` | A track's solo state changed |
| `daw.mix.mute_changed` | `{}` | A track's mute state changed |
| `daw.mix.monitor_changed` | `{}` | Monitor state changed |
| `daw.mix.monitor_bus_changed` | `{}` | Monitor bus configuration changed |
| `daw.mix.isolated_changed` | `{}` | Solo isolation changed |
| `daw.mix.fb_sends_changed` | `{}` | Foldback sends changed |
| `daw.mix.surround_master_changed` | `{}` | Surround master changed |
| `daw.mix.surround_object_count_changed` | `{}` | Surround object count changed |

### Session Events (24)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.session.loaded` | `{}` | Session loaded |
| `daw.session.saved` | `{snapshot_name}` | Session saved |
| `daw.session.save_requested` | `{}` | Session save requested |
| `daw.session.save_underway` | `{}` | Session save is underway |
| `daw.session.dirty_changed` | `{dirty}` | Session dirty state changed |
| `daw.session.state_ready` | `{}` | Session state is ready |
| `daw.session.after_connect` | `{}` | After session connections made |
| `daw.session.connections_complete` | `{}` | All session connections complete |
| `daw.session.audition` | `{active}` | Audition started/stopped |
| `daw.session.dialog` | `{}` | Session dialog event |
| `daw.session.quit` | `{}` | Session quit requested |
| `daw.session.exported` | `{}` | Session exported |
| `daw.session.config_changed` | `{}` | Session config changed |
| `daw.session.graph_reordered` | `{}` | Session signal graph reordered |
| `daw.session.latency_updated` | `{}` | Session latency recalculated |
| `daw.session.feedback_detected` | `{}` | Feedback loop detected |
| `daw.session.bundle_changed` | `{}` | Session bundle changed |
| `daw.session.io_plugins_changed` | `{}` | I/O plugins changed |
| `daw.session.lua_scripts_changed` | `{}` | Lua scripts changed |
| `daw.session.mtc_ltc_port_changed` | `{}` | MTC/LTC port changed |
| `daw.session.quantization_changed` | `{}` | Quantization setting changed |
| `daw.session.route_templates_changed` | `{}` | Route templates changed |
| `daw.session.sample_rate_mismatch` | `{}` | Sample rate mismatch detected |
| `daw.session.step_edit_changed` | `{}` | Step edit state changed |
| `daw.session.batch_update_start` | `{}` | Batch update started |
| `daw.session.batch_update_end` | `{}` | Batch update ended |
| `daw.session.start_time_changed` | `{}` | Session start time changed |
| `daw.session.end_time_changed` | `{}` | Session end time changed |
| `daw.session.undo_redo_begin` | `{}` | Undo/redo operation starting |
| `daw.session.undo_redo_changed` | `{}` | Undo/redo state changed |
| `daw.session.undo_redo_end` | `{}` | Undo/redo operation completed |

### Location Events (10)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.locations.added` | `{name, start_samples, is_mark}` | Location/marker added |
| `daw.locations.removed` | `{name}` | Location/marker removed |
| `daw.locations.changed` | `{}` | Any location changed |
| `daw.locations.modified` | `{}` | Locations list modified |
| `daw.locations.current_changed` | `{}` | Current location changed |
| `daw.locations.loop_changed` | `{}` | Loop location changed |
| `daw.locations.punch_changed` | `{}` | Punch location changed |
| `daw.locations.punch_loop_constraint_changed` | `{}` | Punch/loop constraint changed |
| `daw.location.start_changed` | `{location_id}` | Individual location start changed |
| `daw.location.end_changed` | `{location_id}` | Individual location end changed |
| `daw.location.flags_changed` | `{location_id}` | Location flags changed |
| `daw.location.lock_changed` | `{location_id}` | Location lock state changed |
| `daw.location.name_changed` | `{location_id}` | Location name changed |
| `daw.location.cue_changed` | `{location_id}` | Cue point changed |

### Engine Events (13)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.engine.xrun` | `{xrun_count}` | Buffer underrun occurred |
| `daw.engine.xrun_detected` | `{}` | Xrun detected (alternate signal) |
| `daw.engine.running` | `{}` | Engine started running |
| `daw.engine.stopped` | `{}` | Engine stopped |
| `daw.engine.halted` | `{}` | Engine halted (error) |
| `daw.engine.freewheel` | `{freewheeling}` | Freewheel state changed |
| `daw.engine.sample_rate_changed` | `{sample_rate}` | Sample rate changed |
| `daw.engine.buffer_size_changed` | `{buffer_size}` | Buffer size changed |
| `daw.engine.device_error` | `{}` | Audio device error |
| `daw.engine.device_list_changed` | `{}` | Available device list changed |
| `daw.engine.device_reset_started` | `{}` | Device reset started |
| `daw.engine.device_reset_finished` | `{}` | Device reset finished |
| `daw.engine.became_silent` | `{}` | Engine became silent |

### Port Events (7)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.ports.registered_or_unregistered` | `{}` | Port registered or unregistered |
| `daw.ports.connected_or_disconnected` | `{}` | Port connection changed |
| `daw.ports.graph_reordered` | `{}` | Port graph reordered |
| `daw.ports.pretty_name_changed` | `{}` | Port pretty name changed |
| `daw.ports.physical_input_changed` | `{}` | Physical input port changed |
| `daw.ports.midi_info_changed` | `{}` | MIDI port info changed |
| `daw.ports.midi_selection_changed` | `{}` | MIDI port selection changed |

### Track Events (6)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.track.speed_changed` | `{track_id}` | Track speed changed |
| `daw.track.playlist_changed` | `{track_id}` | Track playlist changed |
| `daw.track.playlist_added` | `{track_id}` | Playlist added to track |
| `daw.track.alignment_changed` | `{track_id}` | Track alignment changed |
| `daw.track.channel_count_changed` | `{track_id}` | Track channel count changed |
| `daw.track.freeze_changed` | `{track_id}` | Track freeze state changed |

### Playlist Events (5)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.playlist.contents_changed` | `{playlist_id}` | Playlist contents changed |
| `daw.playlist.region_added` | `{playlist_id, region_id}` | Region added to playlist |
| `daw.playlist.region_removed` | `{playlist_id, region_id}` | Region removed from playlist |
| `daw.playlist.layering_changed` | `{playlist_id}` | Playlist layering changed |
| `daw.playlist.name_changed` | `{playlist_id}` | Playlist renamed |

### Region Events (1)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.regions.property_changed` | `{region_id}` | Region property changed |

### Source Events (2)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.source.added` | `{source_id}` | New source added |
| `daw.source.removed` | `{source_id}` | Source removed |

### Tempo Events (1)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.tempo.map_changed` | `{}` | Tempo map changed |

### Route Group Events (5)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.route_group.added` | `{group_name}` | Route group added |
| `daw.route_group.removed` | `{group_name}` | Route group removed |
| `daw.route_group.property_changed` | `{group_name}` | Route group property changed |
| `daw.route_group.reordered` | `{group_name}` | Route group reordered |
| `daw.route_group.route_added` | `{group_name, route_id}` | Route added to group |

### Plugin Events (4)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.plugins.list_changed` | `{}` | Plugin list changed (scan completed) |
| `daw.plugins.status_changed` | `{}` | Plugin status changed |
| `daw.plugins.stats_changed` | `{}` | Plugin statistics changed |
| `daw.plugins.tag_changed` | `{}` | Plugin tag changed |

### VCA Events (1)

| Event | Params | Description |
|-------|--------|-------------|
| `daw.vca.added` | `{vca_id}` | VCA added |
