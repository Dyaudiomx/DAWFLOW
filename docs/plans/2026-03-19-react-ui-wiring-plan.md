# React UI Wiring Plan — Connect All Placeholders

> **For Claude:** Read `docs/api-reference.md` for all 385 IPC commands.
> Read `dawflow-ui/src/services/ipc.ts` for existing TypeScript wrappers.

**Goal:** Wire every placeholder in the React UI to the engine via IPC.

**Current state:** 31 of 385 commands have TypeScript wrappers (8% coverage).

---

## Phase 1: Critical Infrastructure (fix broken foundations)

### 1A. Add ~100 missing IPC wrappers to ipc.ts
The biggest gap. Most engine commands have no TypeScript wrapper.
Categories needing wrappers: session props, transport state, track details,
region editing, MIDI editing, plugins, automation, metering, markers, tempo.

### 1B. Fix dual-protocol conflicts
- transport.ts sends tempo via BOTH WebSocket and IPC (double-send)
- session.ts uses WebSocket strip index for gain/pan/mute instead of IPC track ID
- Fix: use IPC everywhere, keep WebSocket only for real-time meter streaming

### 1C. Fix AddTrackDialog to use daw.add_track_with_color
Currently creates track without color/routing. Use the new endpoint that
returns track ID so we can set color immediately.

## Phase 2: Core Features (make the DAW usable)

### 2A. Status line — fetch real values from engine
- Audio I/O status from daw.get_audio_backend_info
- Buffer size, sample rate, record format from daw.get_session_properties
- CPU/disk load already polling

### 2B. Info line — show selected object properties
- Track region details from daw.get_region_details
- Update on selection change

### 2C. Transport bar — wire all remaining buttons
- Utility buttons, tap tempo, record mode to engine
- Locator editing already done

### 2D. Toolbar — wire remaining buttons
- MediaBay → toggle right zone to media tab
- MixConsole → toggle lower zone to mixconsole tab
- R/W/A buttons → daw.set_automation_mode
- Auto-scroll toggle

### 2E. Track controls
- Monitor button onClick handler (already wired to IPC, just missing handler)
- Solo visual state from engine

### 2F. Inspector routing
- Input routing → daw.get_available_audio_ports + daw.connect_track_input
- Output routing → daw.connect_track_output
- Populate dropdowns with real port names

### 2G. SendSlots — connect to engine
- Fetch real sends via daw.get_sends
- Level/pan changes via IPC

### 2H. Metering
- Master meter from daw.get_master_meter (poll every 100ms)
- Track meters already working via WebSocket strip_meter

## Phase 3: Editing Features

### 3A. Region editing actions
- All region tools (trim, fade, normalize, reverse) via IPC
- Region context menu actions

### 3B. MIDI editing
- Note add/delete/move from MidiNoteDisplay click handlers
- Quantize, transpose via toolbar actions

### 3C. Automation
- Read/write mode toggles in mixer and inspector
- daw.set_automation_mode per track

### 3D. Plugin editor
- Click on insert slot → daw.plugin.open_editor → show generic editor panel
- Preset list/load via daw.plugin.list_presets / daw.plugin.load_preset

## Phase 4: Polish

### 4A. Visibility persistence → daw.set_track_hidden
### 4B. Track notepad → daw.set_track_comment
### 4C. ChordPads MIDI output
### 4D. EditorHost — show editor for selected region
### 4E. ChannelView EQ curve from plugin data
