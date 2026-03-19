# React WebView UI Completion Plan

> **For the next Claude session:** Read this plan, then systematically work through it.

**Date:** 2026-03-19
**Decision:** React WebView approach chosen over GTK reskin. The React UI design
is already built (Cubase-style). Only wiring and bug fixes remain.

---

## Current State

### What's Working
- React UI loads in WKWebView via ui-shell plugin (port 19100)
- WebSocket connection to engine (port 3818) — auto-connects
- Transport: play/stop/record send WebSocket commands
- Transport: 60fps client-side playhead interpolation
- Transport: 800ms debounce prevents engine state override
- Strip: gain/pan/mute send WebSocket commands
- Strip: meter levels received from WebSocket
- Cubase-style visual design (dark theme, blue accent, all CSS tokens)
- Cubase-style context menu (20+ track types)
- Cubase-style Add Track dialog (routing, config, color, count)
- AI Chat panel in Right Zone
- Session info display, region store, marker store

### What's Broken — Fix These First

#### 1. WKWebView Click Issues
**Problem:** Clicks sometimes require double-click.
**Root cause:** `acceptsFirstMouse:YES` is set, `mouseDown:` override was removed.
The GDK event filter might still interfere with mouse events.
**File:** `engine/gtk2_ardour/ardour_ui_webview.mm`
**Fix:** Test with current code (all fixes accumulated). If still broken,
try removing the GDK event filter entirely for mouse events — it should
only filter keyboard events. The filter currently checks for KeyDown/KeyUp/FlagsChanged
which should not affect mouse clicks.

#### 2. Add Track IPC Fails
**Problem:** Clicking "Add Track" does nothing or shows blocked cursor briefly.
**Root cause:** `_session.new_audio_track()` called from socket server thread
causes issues. The fire-and-forget `signal_idle().connect_once()` approach
was implemented but never tested cleanly.
**File:** `engine/libs/ardour/dawflow_plugin_host.cc` (lines ~417-450)
**Current code:** Uses `Glib::signal_idle().connect_once()` for add_audio_track,
add_midi_track, add_bus. Returns `{"success":true,"status":"queued"}` immediately.
**Fix:** Test if this actually works now. If not, try alternative:
- Use `BasicUI::access_action("Main/AddTrackBus")` which is thread-safe
- Or use `Glib::signal_timeout().connect_once()` with 100ms delay

#### 3. IPC Timeout
**File:** `dawflow-ui/src/services/ipc.ts`
**Current:** 10-second AbortController timeout.
**Fix:** This should be sufficient. If Add Track returns "queued", the dialog
should close and polling will pick up the new track within 3 seconds.

---

## Features to Wire (Priority Order)

### Already Working via WebSocket (~12 features)
- ✅ Transport roll (play/stop)
- ✅ Transport record
- ✅ Transport tempo
- ✅ Transport time/position
- ✅ Strip gain (volume faders)
- ✅ Strip pan
- ✅ Strip mute
- ✅ Strip meter levels
- ✅ Strip description (track names)
- ✅ Plugin enable/bypass
- ✅ Plugin parameter values
- ✅ Connection status indicator

### Need to Wire via IPC (~20 commands)
Each is a POST to http://localhost:19100/api/command → engine IPC.

| Priority | Command | React Component | Status |
|----------|---------|-----------------|--------|
| **P0** | `daw.add_audio_track` | AddTrackDialog | Fire-and-forget, needs testing |
| **P0** | `daw.add_midi_track` | AddTrackDialog | Same |
| **P0** | `daw.add_bus` | AddTrackDialog | Same |
| **P1** | `daw.undo` | Toolbar | Wired, needs testing |
| **P1** | `daw.redo` | Toolbar | Wired, needs testing |
| **P1** | `daw.save_session` | Ctrl+S | Wired, needs testing |
| **P2** | `daw.remove_track` | Context menu | Wired |
| **P2** | `daw.rename_track` | Track header | Not wired |
| **P2** | `daw.get_tracks` | Session store | Wired (polling) |
| **P2** | `daw.get_session_info` | Session store | Wired (polling) |
| **P3** | `daw.get_markers` | Ruler | Not wired |
| **P3** | `daw.add_marker` | Ruler | Not wired |
| **P3** | `daw.get_regions` | CenterZone | Wired (on track fetch) |
| **P3** | `daw.set_tempo` | Transport | Wired |
| **P4** | `daw.get_available_plugins` | Plugin selector | Not built |
| **P4** | `daw.load_plugin` | Plugin selector | Not built |
| **P4** | `daw.get_plugin_parameters` | Inspector | Not built |
| **P4** | `daw.export_session` | Export dialog | Not built |
| **P5** | `daw.get_midi_notes` | Piano roll | Not built |
| **P5** | `daw.get_audio_peaks` | Waveform display | Not built |

### Display-Only Components (no wiring needed, already built)
- Toolbar with tools, snap, grid, quantize, zone toggles
- Left Zone (Inspector, Channel View, Visibility)
- Right Zone (VSTi, Media, Control Room, Meter, AI Chat)
- Lower Zone tabs (MixConsole, Editor, Sampler, Chord Pads, MIDI Remote)
- Shared components (Fader, Knob, Meter, Button, Toggle, Dropdown)

---

## Recommended Session Plan

### Phase 1: Fix Critical Blockers (30 min)
1. Launch the app, open browser console at http://localhost:19100/
2. Check if WebSocket connects (look for "Engine Connected" green indicator)
3. Test single-click — if broken, fix the WebView event handling
4. Test Add Track — if broken, debug the IPC call in browser console
5. Fix whatever is actually broken based on real error messages

### Phase 2: Wire P0-P1 Commands (1 hour)
6. Verify add track works end-to-end
7. Verify undo/redo works
8. Verify save works (Ctrl+S)
9. Make the dialog close after successful track creation

### Phase 3: Visual Polish (1 hour)
10. Grid fills entire area (background grid behind track list)
11. Right-click context menu opens Add Track with correct type
12. Transport bar displays update in real-time
13. Meter levels animate smoothly

### Phase 4: Wire P2-P3 Commands (1 hour)
14. Track deletion via context menu
15. Track rename via double-click
16. Markers in ruler
17. Region display

---

## Key Architecture Notes

### WebSocket (real-time streaming, already working)
```
React UI ←→ ws://localhost:3818 ←→ Ardour WebSocket Surface
```
Handles: transport state, strip gain/pan/mute/meter, plugin params

### IPC (commands, needs wiring)
```
React UI → POST http://localhost:19100/api/command → ui-shell plugin → Unix socket → Engine
```
The ui-shell plugin's HTTP server proxies JSON-RPC 2.0 to the engine.

### Fire-and-Forget Pattern (for session-modifying commands)
Session methods like `new_audio_track()` must run on the GTK main thread.
Current solution: `Glib::signal_idle().connect_once()` — dispatches to main
thread without blocking the socket server thread. Returns immediately with
`{"status":"queued"}`. The React UI's 3-second polling picks up changes.

### React Store Architecture
- `stores/transport.ts` — play/stop/record, tempo, position (with interpolation)
- `stores/session.ts` — tracks, session name, sample rate (with fetchFromEngine)
- `stores/connection.ts` — WebSocket/IPC connection status
- `stores/regions.ts` — regions per track
- `stores/chat.ts` — AI chat messages
- `stores/ui.ts` — zone visibility, tools, snap, selected track
- `stores/mixer.ts` — mixer channels (placeholder)

### Important: Feedback Loop Prevention
Store actions that send commands to the engine (play, setTrackMute, etc.)
use the engine-command functions. WebSocket handlers that receive state FROM
the engine use `updateFromEngine()` / `updateTracks()` which DON'T send
commands back. This prevents infinite loops.

---

## File Locations Quick Reference

### React UI
- `dawflow-ui/src/services/websocket.ts` — WebSocket connection + handlers
- `dawflow-ui/src/services/ipc.ts` — IPC command service (POST to :19100)
- `dawflow-ui/src/stores/` — All Zustand stores
- `dawflow-ui/src/layout/` — Main layout components
- `dawflow-ui/src/tokens/cubase-theme.css` — All design tokens
- `dawflow-ui/deploy.sh` — Build + deploy to engine + ui-shell

### Engine (only touch for WebView/IPC fixes)
- `engine/gtk2_ardour/ardour_ui_webview.mm` — WebView creation + keyboard handling
- `engine/libs/ardour/dawflow_plugin_host.cc` — IPC command handlers
- `engine/gtk2_ardour/startup_fsm.cc` — Startup flow
- `engine/gtk2_ardour/plugin_scan_dialog.cc` — DAWFLOW branded scan dialog

### Build & Deploy
```bash
# React UI only
cd dawflow-ui && npm run build && ./deploy.sh

# Rebuild ui-shell plugin
cd sdk/plugins/ui-shell && ./build.sh && cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/

# Clear plugin cache (do this when UI changes)
rm -rf ~/.config/dawflow/cache/com.dawflow.ui-shell/

# Engine only
cd engine && python3 waf build -j$(sysctl -n hw.ncpu)

# Launch
./run-dawflow.sh
```
