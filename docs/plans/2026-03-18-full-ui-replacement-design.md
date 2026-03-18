# Full React UI Replacement Design

**Date:** 2026-03-18
**Status:** Approved
**Goal:** Replace Ardour's GTK UI entirely with the React WebSocket UI, wire all real data, and add AI Chat interface.

---

## Architecture: Hybrid WebSocket + IPC Bridge

```
React UI (browser/WebView)
    |
    +-- ws://localhost:3818        <-- Real-time streaming (Ardour WebSocket)
    |   Already working.              Meters, transport, strip state.
    |   10Hz polling for meters/time.
    |
    +-- ws://localhost:19100/ipc   <-- Commands & queries (IPC proxy)
        NEW: ui-shell relays          253 JSON-RPC 2.0 commands.
        JSON-RPC to engine.           <1ms local round-trip.
```

### Why Hybrid?

- **WebSocket** is optimized for real-time streaming (meters at 100ms, transport position). Already working.
- **IPC** has 253 commands covering everything (tracks, MIDI, regions, routing, automation, plugins, markers, undo, export). Already implemented in engine.
- **ui-shell plugin** already runs as a process with IPC access. Adding a WebSocket proxy is minimal work.
- **Zero engine modifications** needed. All new code stays proprietary.

### IPC Bridge Design

The `dawflow-ui-shell` plugin adds a WebSocket endpoint at `ws://localhost:19100/ipc`:

**Request flow:**
```
React UI --> ws://localhost:19100/ipc --> ui-shell process --> Unix socket --> Engine
```

**Message format:** JSON-RPC 2.0 (same as plugin IPC)
```json
// Request
{"jsonrpc":"2.0","method":"daw.get_tracks","params":{},"id":1}

// Response
{"jsonrpc":"2.0","id":1,"result":[{"id":"abc","name":"Kick","gain_db":-3.0}]}

// Event (engine -> React)
{"jsonrpc":"2.0","method":"daw.transport.changed","params":{"playing":true}}
```

**Event forwarding:** ui-shell subscribes to IPC events and forwards them to all connected WebSocket clients.

---

## What's Real vs Mock (Current State)

### Currently Real (via WebSocket)
- Transport: play/stop/record, tempo, position, locators
- Strip: gain, pan, mute (for existing tracks)
- Plugin: enable/bypass, parameter values
- Connection status indicator

### Currently Mock/Demo (to be replaced)
- 10 hardcoded demo tracks (Kick, Snare, Hi-Hat, etc.)
- Procedurally generated waveforms (SVG)
- Procedurally generated MIDI notes
- Animated fake meters
- All insert/send slots (empty placeholders)
- Control Room, Media Browser, Sampler, MIDI Remote panels
- EQ curve display
- Session name, sample rate

---

## Implementation Priorities

### Priority 1: Foundation (IPC Bridge + Real Data)

1. **IPC Bridge in ui-shell** — WebSocket proxy for JSON-RPC 2.0
2. **IPC Service in React** (`services/ipc.ts`) — Connect, send commands, receive events
3. **Real track list** — Query `daw.get_tracks` on connect, listen for `daw.routes.added`
4. **Live meters** — Wire existing WebSocket `strip_meter` events to Meter components
5. **Session info** — Real name, sample rate from `daw.get_session_info`
6. **Remove all demo data** — Delete DEMO_TRACKS, fake waveforms, fake meters

### Priority 2: Core DAW Operations

7. **Add Track dialog** — Audio/MIDI/Bus via `daw.add_audio_track`, `daw.add_midi_track`, `daw.add_bus`
8. **Delete/rename tracks** — `daw.remove_track`, `daw.rename_track`
9. **Undo/Redo** — Wire toolbar buttons to `daw.undo`, `daw.redo`
10. **Session save** — `daw.save_session`
11. **AI Chat panel** — New tab in Right Zone (see AI Chat section)

### Priority 3: Timeline & Editing

12. **Region display** — Query `daw.get_regions` per track, render positioned rectangles
13. **Audio waveforms** — `daw.get_audio_peaks` for peak data, render in canvas/SVG
14. **MIDI piano roll** — `daw.get_midi_notes`, render in Lower Zone Editor tab
15. **Markers** — `daw.get_markers`, display in ruler, add/remove UI

### Priority 4: Plugin & Routing

16. **Plugin selector** — `daw.get_available_plugins`, search, load via `daw.load_plugin`
17. **Plugin parameters** — `daw.get_plugin_parameters`, edit via `daw.set_plugin_parameter`
18. **Insert chain** — Show loaded plugins in inspector InsertSlots
19. **Sends/routing** — `daw.add_send`, `daw.set_send_level`, `daw.get_available_ports`

### Priority 5: Advanced Features

20. **Automation lanes** — `daw.get_automation_data`, `daw.add_automation_point`
21. **Export dialog** — `daw.export_session`
22. **Advanced metering** — `daw.get_master_lufs`, `daw.get_track_peak`
23. **Region operations** — Move, split, trim, normalize, time-stretch

---

## AI Chat Panel Design

### Location
Right Zone, new tab: `[VSTi] [Media] [CR] [Meter] [AI]`

### Layout
```
+---------------------------+
| AI Assistant        [gear]|
+---------------------------+
|                           |
| [assistant bubble]        |
|   "I can help you mix..." |
|                           |
|          [user bubble]    |
|          "Mute the kick"  |
|                           |
| [assistant bubble]        |
|   "Done. Kick is muted." |
|                           |
+---------------------------+
| [Type a message...]  [->] |
+---------------------------+
```

### Features
- Chat history with user/assistant message bubbles
- Streaming responses (token-by-token display)
- Context-aware: reads session state, selected track, transport
- Can execute DAW commands via IPC bridge
- Resizable with right zone (min-width 250px)
- Scrollable message history
- Keyboard shortcut to focus input

### DAW Command Execution
The AI can call any IPC command. Examples:
- "Mute the kick" -> `daw.set_track_mute`
- "Add an audio track called Guitar" -> `daw.add_audio_track`
- "Set the tempo to 128" -> `daw.set_tempo`
- "Solo the vocals and bass" -> multiple `daw.set_track_solo` calls

### Backend
Uses the existing `ai-chat` plugin infrastructure (`sdk/plugins/ai-chat/`), or a new endpoint on the ui-shell plugin that calls the Gemini/Claude API.

---

## Components to Build

### New Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `AIChatPanel` | `right-zone/AIChatPanel.tsx` | Chat interface |
| `ChatMessage` | `right-zone/ChatMessage.tsx` | Message bubble |
| `AddTrackDialog` | `dialogs/AddTrackDialog.tsx` | Create tracks |
| `PluginSelector` | `dialogs/PluginSelector.tsx` | Browse/load plugins |
| `PianoRoll` | `lower-zone/PianoRoll.tsx` | MIDI editor |
| `RegionView` | `center-zone/RegionView.tsx` | Timeline regions |
| `WaveformDisplay` | `center-zone/WaveformDisplay.tsx` | Audio peaks |
| `AutomationLane` | `center-zone/AutomationLane.tsx` | Automation curves |
| `MarkerRuler` | `center-zone/MarkerRuler.tsx` | Marker display |
| `ExportDialog` | `dialogs/ExportDialog.tsx` | Export audio |

### New Services
| Service | Location | Purpose |
|---------|----------|---------|
| `ipc.ts` | `services/ipc.ts` | IPC bridge WebSocket client |
| `ai.ts` | `services/ai.ts` | AI chat backend connection |

### New Stores
| Store | Location | Purpose |
|-------|----------|---------|
| `usePluginStore` | `stores/plugins.ts` | Available/loaded plugins |
| `useRegionStore` | `stores/regions.ts` | Regions per track |
| `useMarkerStore` | `stores/markers.ts` | Session markers |
| `useChatStore` | `stores/chat.ts` | AI chat messages |

### Modified Components
- `RightZone.tsx` — Add AI tab
- `CenterZone.tsx` — Real regions, waveforms, markers
- `LowerMixConsole.tsx` — Real meters, real channel population
- `Toolbar.tsx` — Wire undo/redo, add track button
- `stores/session.ts` — Remove demo tracks, populate from IPC
- `stores/mixer.ts` — Populate from real strip data
- `services/websocket.ts` — Wire strip_meter to meter components

---

## What Stays in the Engine (NOT replaced)

- Audio/MIDI processing (libardour)
- JACK/CoreAudio port management
- File I/O (session load/save logic)
- Plugin hosting (LV2/VST/AU)
- Video timeline (future)
- Key command editor (future)
- MIDI controller learn/mapping (future)

---

## Success Criteria

1. Launch DAWFLOW, see React UI with real tracks from loaded session
2. Create/delete tracks from React UI
3. Live meters animating from real audio
4. Play/stop/record working
5. AI Chat can answer questions and execute DAW commands
6. Save session from React UI
7. Undo/redo from React UI
8. No demo/mock data remaining in stores
