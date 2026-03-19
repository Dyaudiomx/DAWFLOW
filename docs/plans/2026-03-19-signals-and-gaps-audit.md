# Deep Audit Results — Signals, Engine, and Editor Gaps

**Date:** 2026-03-19
**Finding:** We have 385 IPC commands but are missing ~300+ more: 236 signals (only 4 exposed), 68 engine/DSP functions, and 100+ editor operations.

## Signal System (236 found, 4 exposed = 1.7%)

### Currently Exposed (in dawflow_plugin_host.cc)
1. `daw.transport.changed` — play/stop/record
2. `daw.routes.added` — track creation
3. `daw.session.dirty_changed` — unsaved changes
4. `daw.record.changed` — recording state

### Critical Missing (20 signals needed immediately)
- Transport: PositionChanged, Xrun, Located, TransportLooped, RecordArmStateChanged
- Plugins: ActiveChanged, ParameterChangedExternally, processors_changed, StartTouch/EndTouch
- Mixing: SoloActive, SoloChanged, MuteChanged
- Locations: auto_loop_location_changed, auto_punch_location_changed, locations_modified
- Engine: Xrun, DeviceError

### High Priority (35+ signals)
- Playlist: RegionAdded/Removed/ContentsChanged
- MIDI: MidiModel::ContentsChanged
- Automation: automation_state_changed, StateChanged
- Engine: Running/Stopped, SampleRateChanged/BufferSizeChanged

### Medium Priority (60+ signals)
- Waveform: PeaksReady, PeakRangeReady
- VCA: VCAAdded, AssignmentChange
- Triggers, Advanced mixing, MIDI ports

## Audio Engine / DSP (68 missing commands)
- Device management: 7 commands (list/set backend, device, buffer)
- Engine lifecycle: 6 commands (start, stop, freewheel)
- Latency: 7 commands (measurement, compensation)
- Port management: 6 commands
- MIDI ports: 6 commands
- Monitor section: 8 commands
- Analysis: 7 commands (LUFS, spectrum, peaks)
- Source management: 5 commands
- Freewheel rendering: 3 commands
- Plugin latency: 4 commands
- Xrun: 3 commands
- Engine state: 3 commands
- Resource monitoring: 3 commands

## Total Remaining Work
- ~232 new signal events to expose
- ~68 new engine/DSP commands
- ~100+ editor operations (waiting for Agent 2)
- = **~400 more IPC items needed for 100% coverage**
