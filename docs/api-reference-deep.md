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
