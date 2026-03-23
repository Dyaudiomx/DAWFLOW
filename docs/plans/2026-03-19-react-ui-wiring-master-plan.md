# React UI Wiring Master Plan

**Date:** 2026-03-19
**Overall UI Completeness:** ~35-40% of a professional DAW
**IPC Wrapper Coverage:** 116 of 2,219 commands (5.2%)

---

## Priority Wave 1: CRITICAL — Make it work like a real DAW

These are the things that make or break the "is this a real DAW?" impression.

### W1-A: Transport & Status Line (Toolbar.tsx, TransportBar.tsx, ProjectWindow.tsx)
**Owner file:** Toolbar.tsx, TransportBar.tsx, ProjectWindow.tsx
- Wire Home button → `ipc.transportLocate(0)`
- Wire Go to End button → `ipc.call('daw.goto_end')`
- Wire Tap tempo button → tap interval calculation → `ipc.setTempo(bpm)`
- Wire Record Mode dropdown → `ipc.call('daw.set_record_mode', {mode})`
- Wire all utility buttons (Settings, Performance, Audio Connections)
- Wire Status Line: buffer size, sample rate, bit depth, audio I/O status from engine
- Wire Info Line: update with selected region/track properties
- Wire L/R/W/A automation buttons → `ipc.call('daw.set_global_automation_state')`
- Wire MIDI/Audio activity indicators from engine events
- Wire diskLoad polling alongside cpuLoad

### W1-B: Mixer Metering & Master (LowerMixConsole.tsx, stores/mixer.ts)
**Owner file:** LowerMixConsole.tsx, stores/session.ts
- Wire real-time meter levels (WebSocket `strip_meter` already works, ensure store propagation)
- Wire peak hold display (track max peak, show in dB readout)
- Add Master bus channel strip at end of mixer
- Wire master meter from `ipc.getMasterMeter()`
- Wire R/W automation buttons → `ipc.call('daw.set_automation_mode')`
- Wire peak reset on click

### W1-C: Send Slots Engine Wiring (SendSlots.tsx)
**Owner file:** inspector/SendSlots.tsx
- Fetch sends on mount: `ipc.call('daw.get_track_sends', {track_id})`
- Wire send level changes → `ipc.call('daw.set_send_level')`
- Wire send pan changes → `ipc.call('daw.set_send_pan')`
- Wire send destination selector (fetch available buses)
- Wire pre/post toggle → `ipc.call('daw.set_send_prefader')`
- Wire send enable/disable → `ipc.call('daw.set_send_enabled')`

### W1-D: Track Routing in Inspector (TrackInspector.tsx)
**Owner file:** inspector/TrackInspector.tsx
- Fetch available ports: `ipc.getAvailableAudioPorts()`
- Wire input routing dropdown → `ipc.connectTrackInput()`
- Wire output routing dropdown → `ipc.connectTrackOutput()`
- Fetch current routing: `ipc.getTrackIO(trackId)`
- Wire delay/latency display from engine
- Wire automation R/W buttons with click handlers

### W1-E: Region Selection & Editing (CenterZone.tsx)
**Owner file:** layout/CenterZone.tsx
- Add region selection highlight (click to select, shift-click for multi)
- Wire selected region data to Info Line
- Add fade handles on region edges (drag to set fade in/out)
- Wire zoom controls (scroll wheel, toolbar zoom buttons)
- Wire snap visualization (show grid lines matching toolbar snap settings)
- Wire real-time waveform refresh during recording (poll peaks every 500ms)

---

## Priority Wave 2: HIGH — Professional features

### W2-A: Export Dialog (NEW: dialogs/ExportDialog.tsx)
- Format selection (WAV, FLAC, MP3, OGG)
- Sample rate, bit depth, dither
- Normalization (peak, LUFS)
- Range selection (session, selection, locators)
- Filename pattern
- Wire to `ipc.call('daw.export.*')` commands

### W2-B: Right Zone Metering Tab (RightZone.tsx)
- Wire master meter: poll `ipc.getMasterMeter()` every 100ms
- Wire loudness: poll `ipc.call('daw.get_loudness_integrated')` every 500ms
- Wire true peak display
- Wire LRA (loudness range)
- Add reset button

### W2-C: Right Zone Control Room Tab (RightZone.tsx)
- Wire Dim/Ref/Mono buttons → `ipc.call('daw.monitor.set_dim_all')` etc.
- Wire source selector → engine monitor routing
- Wire monitor level fader

### W2-D: Keyboard Shortcuts (NEW: services/shortcuts.ts)
- Delete → delete selected region
- D → duplicate selected region
- X/C/V → cut/copy/paste
- M → toggle mute on selected track
- S → toggle solo on selected track
- F → zoom to fit selection
- G → toggle grid
- +/- → zoom in/out

### W2-E: IPC Wrapper Expansion (services/ipc.ts)
- Add wrappers for ALL commonly used commands
- Target: 300+ wrappers (from current 116)
- Focus on: sends, routing, automation, export, monitoring, metering

---

## Priority Wave 3: MEDIUM — Full DAW features

### W3-A: MIDI Piano Roll Editor (NEW: lower-zone/MidiEditor.tsx)
- Piano keyboard on left
- Note grid with drag to create/move/resize
- Velocity lane at bottom
- CC lanes (expandable)
- Quantize button
- Wire to `ipc.getMidiNotes()`, `ipc.midiAddNote()`, etc.

### W3-B: Audio Event Editor (NEW: lower-zone/AudioEditor.tsx)
- Waveform display with zoom
- Fade handles (in/out)
- Gain envelope
- Time-stretch markers
- Normalize, reverse buttons

### W3-C: Automation Lanes (CenterZone.tsx expansion)
- Per-track automation lanes (below region)
- Parameter selector dropdown
- Draw/edit automation points
- Read/Write/Touch/Latch modes

### W3-D: Project Settings Dialog (NEW: dialogs/ProjectSettingsDialog.tsx)
- Sample rate display/change
- Bit depth
- Buffer size
- Audio device selection
- Session metadata (title, artist, etc.)

### W3-E: Plugin GUI Window (NEW: dialogs/PluginEditorDialog.tsx)
- Floating window for plugin parameters
- Knob/slider per parameter
- Preset selector
- A/B comparison

---

## Priority Wave 4: POLISH — Complete the picture

### W4-A: Track Folders & Nesting
### W4-B: Comping / Take Lanes
### W4-C: Arranger Track / Sections
### W4-D: MediaBay / File Browser
### W4-E: Spectrum Analyzer
### W4-F: Marker Track
### W4-G: Tempo Track Curve
### W4-H: Context Menus (right-click on regions, tracks, plugins)

---

## Agent Assignment Plan (Wave 1)

To avoid conflicts, each agent owns SPECIFIC files:

| Agent | Owns | Touches |
|-------|------|---------|
| A: Transport+Status | Toolbar.tsx, TransportBar.tsx, ProjectWindow.tsx status/info lines | stores/transport.ts (add fields) |
| B: Mixer+Metering | LowerMixConsole.tsx | stores/session.ts (meterLevel fix) |
| C: SendSlots | inspector/SendSlots.tsx | services/ipc.ts (add send wrappers) |
| D: Track Routing | inspector/TrackInspector.tsx | services/ipc.ts (add routing wrappers) |
| E: Region Selection+Editing | layout/CenterZone.tsx | stores/ui.ts (add selectedRegionId) |

Each agent modifies ONLY its owned files. Shared files (ipc.ts, stores) are modified by at most one agent per section.
