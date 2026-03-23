# Comprehensive UI Fix & Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix every broken IPC call in the React UI and wire up all missing features so the DAWFLOW UI is a fully functional Cubase-style DAW interface.

**Architecture:** The React UI (dawflow-ui/) communicates with the engine via two channels: WebSocket (port 3818) for real-time streaming (meters, transport) and IPC HTTP (port 19100) for commands. All fixes are in dawflow-ui/src/ — no engine changes needed.

**Tech Stack:** React 19, TypeScript, Zustand, Vite, CSS Modules

---

## Phase 1: Fix All Broken IPC Calls (CRITICAL)

These are commands that exist in the UI but call the WRONG engine command name, use wrong parameters, or reference non-existent commands.

### Task 1.1: Fix Toolbar.tsx Broken Commands

**Files:**
- Modify: `dawflow-ui/src/layout/Toolbar.tsx`

**Fixes:**
1. `daw.set_global_automation_state` does NOT exist. The R/W/A buttons should toggle global automation by iterating selected tracks and calling `daw.set_automation_mode` per track, OR just set local UI state for the global mode indicator.
2. `daw.transport_locate` in Home button uses wrong param `{ position: 0 }` — should be `{ sample_position: 0 }` per the ipc.ts wrapper.
3. Verify all toolbar buttons call correct commands.

### Task 1.2: Fix TransportBar.tsx Broken Commands

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx`

**Fixes:**
1. "Go to End" button calls `daw.goto_end` — should be `daw.transport_goto_end`
2. Verify all transport buttons use ipc wrappers instead of raw `ipc.call()`

### Task 1.3: Fix RightZone.tsx Control Room & Meter Tab

**Files:**
- Modify: `dawflow-ui/src/layout/RightZone.tsx`

**Fixes:**
1. Dim button: `daw.monitor.set_dim_all` sends `{ value }` — should send `{ dim: boolean }`
2. Ref/Cut button: `daw.monitor.set_cut_all` sends `{ value }` — should send `{ cut: boolean }`
3. Mono button: `daw.monitor.set_mono` sends `{ value }` — should send `{ enabled: boolean }`
4. Remove `daw.monitor.set_source` call (command doesn't exist)
5. Monitor fader: uses `daw.set_track_gain` with `track_id: 'monitor'` — monitor is not a track. Use `daw.monitor.set_level` or remove.
6. Loudness: `daw.get_loudness_integrated` doesn't exist — replace with `daw.analyze.ebur128`
7. Loudness reset: `daw.reset_loudness_analysis` doesn't exist — remove or use `daw.analyze.reset_ebur128`
8. Reduce meter polling from 150ms to 300ms

### Task 1.4: Fix SendSlots.tsx Broken Commands

**Files:**
- Modify: `dawflow-ui/src/inspector/SendSlots.tsx`

**Fixes:**
1. `daw.set_send_pan` doesn't exist — use `daw.send.set_pan`
2. `daw.set_send_prefader` doesn't exist — check API for correct command or remove
3. `daw.set_send_target` doesn't exist — remove, use `daw.remove_send` + `daw.add_send`
4. `daw.remove_send` doesn't exist — use `daw.aux.remove_send_from`
5. Send level param: sends `level` but API expects `gain_db`

### Task 1.5: Fix TrackInspector.tsx Broken Commands

**Files:**
- Modify: `dawflow-ui/src/inspector/TrackInspector.tsx`

**Fixes:**
1. `daw.bypass_all_inserts` doesn't exist — use `daw.bypass_all_plugins`
2. Metadata commands `daw.session.get_title`, `daw.session.set_title`, etc. don't exist — use `daw.get_session_metadata` and `daw.set_session_metadata`

### Task 1.6: Fix ExportDialog.tsx Issues

**Files:**
- Modify: `dawflow-ui/src/dialogs/ExportDialog.tsx`

**Fixes:**
1. Normalization: sends LUFS target for BOTH peak and LUFS modes — use `daw.export.set_normalize_dbfs` for peak mode
2. True Peak Limiter checkbox: declared but never sent — wire to `daw.export.set_tp_limiter`
3. Verify export execution calls `daw.export.prepare` then `daw.export.execute` correctly

### Task 1.7: Fix MidiEditor.tsx Broken Commands

**Files:**
- Modify: `dawflow-ui/src/lower-zone/MidiEditor.tsx`

**Fixes:**
1. CC lane drawing: `daw.set_midi_cc_data` doesn't exist — use `daw.midi.add_cc_event`
2. CC lane fetching: `daw.get_midi_cc_data` doesn't exist — use `daw.midi.get_cc_data`

### Task 1.8: Fix AutomationLane.tsx

**Files:**
- Modify: `dawflow-ui/src/layout/AutomationLane.tsx`

**Fixes:**
1. `daw.move_automation_point` doesn't exist — implement as delete + add

### Task 1.9: Fix ProjectSettingsDialog.tsx

**Files:**
- Modify: `dawflow-ui/src/dialogs/ProjectSettingsDialog.tsx`

**Fixes:**
1. `daw.session.get_title`, `daw.session.get_artist` etc. don't exist — use `daw.get_session_metadata`
2. `daw.session.set_title`, `daw.session.set_artist` etc. don't exist — use `daw.set_session_metadata`

### Task 1.10: Fix LowerMixConsole.tsx Polling

**Files:**
- Modify: `dawflow-ui/src/lower-zone/LowerMixConsole.tsx`

**Fixes:**
1. Reduce master meter polling from 200ms to 500ms
2. Only poll when lower zone is visible (check parent state)

---

## Phase 2: Wire Up Essential Missing Features

These are IPC commands that have wrappers in ipc.ts but are NEVER called by any component, or have no wrapper at all but are needed for basic DAW functionality.

### Task 2.1: Wire Session File Operations (File Menu)

**Files:**
- Modify: `dawflow-ui/src/layout/Toolbar.tsx` — add File menu dropdown
- Modify: `dawflow-ui/src/services/ipc.ts` — add missing wrappers

**Features to wire:**
- Save Session: `daw.save_session` (wrapper exists, just need UI trigger)
- Save As: `daw.save_session_as` (need wrapper + dialog)
- New Session: `daw.new_session` (need wrapper)
- Keyboard shortcut: Ctrl+S for save, Ctrl+Shift+S for save-as

### Task 2.2: Wire Undo/Redo Properly

**Files:**
- Modify: `dawflow-ui/src/layout/Toolbar.tsx`
- Modify: `dawflow-ui/src/services/shortcuts.ts`

**Features:**
- Ctrl+Z → `daw.undo`
- Ctrl+Shift+Z → `daw.redo`
- Show undo/redo labels in toolbar tooltips

### Task 2.3: Wire Snap/Grid Controls

**Files:**
- Modify: `dawflow-ui/src/layout/Toolbar.tsx`
- Modify: `dawflow-ui/src/stores/ui.ts`

**Features:**
- Snap on/off toggle
- Grid type dropdown (Bar, Beat, 1/8, 1/16, etc.)
- Wire to `daw.set_snap_mode` and `daw.set_grid_type`

### Task 2.4: Wire Region Editing Tools

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`
- Modify: `dawflow-ui/src/services/ipc.ts` — add missing wrappers

**Features:**
- Split tool click: calls `daw.split_region` (already wired, verify working)
- Region move: calls `daw.move_region` (already wired, verify working)
- Region trim (drag edges): `daw.trim_region_start` / `daw.trim_region_end`
- Region consolidate (Ctrl+Shift+B): `daw.consolidate_range`
- Region bounce (Ctrl+B): `daw.bounce_range`

### Task 2.5: Wire MIDI Editor Transformations

**Files:**
- Modify: `dawflow-ui/src/lower-zone/MidiEditor.tsx`

**Features:**
- Quantize button/shortcut (Q): `daw.quantize_midi`
- Transpose buttons (+/-): `daw.transpose_midi`
- Velocity scale: `daw.midi.scale_velocity`
- Humanize: `daw.humanize_midi`
- Add CC lane editing with proper `daw.midi.add_cc_event` / `daw.midi.get_cc_data`

### Task 2.6: Wire Mixer Strip Controls Properly

**Files:**
- Modify: `dawflow-ui/src/lower-zone/LowerMixConsole.tsx`
- Modify: `dawflow-ui/src/stores/session.ts`

**Features:**
- Fader: uses WebSocket `engineSetStripGain` — this is CORRECT for real-time. Keep it.
- Pan: uses WebSocket `engineSetStripPan` — CORRECT. Keep it.
- Solo/Mute: Mix of WebSocket and IPC — standardize to use WebSocket for real-time, IPC for state queries
- Automation mode per-strip: wire R/W/T/L buttons to `daw.set_automation_mode`
- Solo Defeat: `daw.set_track_solo_defeat`
- Phase Invert: `daw.set_track_phase_invert`

### Task 2.7: Wire Plugin Management

**Files:**
- Modify: `dawflow-ui/src/inspector/InsertSlots.tsx`
- Modify: `dawflow-ui/src/right-zone/MediaBrowser.tsx` (plugin browser)

**Features:**
- Load plugin to track: `daw.add_plugin` (from plugin browser drag/click)
- Remove plugin from track: `daw.remove_plugin`
- Reorder plugins: `daw.reorder_plugin`
- Plugin bypass per-slot: `daw.set_plugin_enabled` (already wired in InsertSlots)
- Plugin scan: `daw.scan_plugins` (for plugin browser refresh)

### Task 2.8: Wire Recording Features

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx`
- Modify: `dawflow-ui/src/stores/transport.ts`

**Features:**
- Pre-roll: `daw.set_pre_roll`
- Post-roll: `daw.set_post_roll`
- Punch in/out: `daw.set_punch_in`, `daw.set_punch_out` (wrappers exist)
- Record mode switching: already wired, verify working
- Metronome/Click: `daw.set_click_enabled` (already wired)
- Precount: `daw.set_precount_enabled`

### Task 2.9: Wire Track Freeze/Bounce

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (context menu)
- Modify: `dawflow-ui/src/inspector/TrackInspector.tsx`

**Features:**
- Freeze Track: `daw.freeze_track` (wrapper exists)
- Unfreeze Track: `daw.unfreeze_track`
- Bounce Track: `daw.bounce_track`
- Add to right-click context menu AND inspector

### Task 2.10: Wire Marker Operations

**Files:**
- Modify: `dawflow-ui/src/layout/MarkerTrack.tsx`
- Modify: `dawflow-ui/src/services/shortcuts.ts`

**Features:**
- Add marker at playhead: keyboard shortcut (Insert or M)
- Navigate to next/prev marker: `daw.goto_next_marker`
- Cycle markers: `daw.add_range_marker`
- MarkerTrack already wired for most operations — verify working

---

## Phase 3: Complete the UI (New Components & Polish)

### Task 3.1: Add File Menu Dropdown

**Files:**
- Create: `dawflow-ui/src/layout/FileMenu.tsx`
- Create: `dawflow-ui/src/layout/FileMenu.module.css`
- Modify: `dawflow-ui/src/layout/Toolbar.tsx`

**Features:**
- File → New Session
- File → Open Session
- File → Save (Ctrl+S)
- File → Save As (Ctrl+Shift+S)
- File → Export Audio (Ctrl+Shift+E, opens ExportDialog)
- File → Close Session
- Edit → Undo (Ctrl+Z)
- Edit → Redo (Ctrl+Shift+Z)
- Recent sessions list

### Task 3.2: Add Track Add Dialog Improvements

**Files:**
- Modify: existing AddTrackDialog if it exists, or create one

**Features:**
- Track type selection (Audio, MIDI, Instrument, Group, FX, VCA, Folder)
- Track count (how many to add)
- Input/output routing preset
- Track color selection
- Wire to `daw.add_audio_track`, `daw.add_midi_track`, `daw.add_bus`, `daw.add_vca`

### Task 3.3: Improve Plugin Browser

**Files:**
- Modify: `dawflow-ui/src/right-zone/MediaBrowser.tsx`

**Features:**
- Categorized plugin list (by type: EQ, Dynamics, Reverb, etc.)
- Search/filter
- Drag to insert slot
- Double-click to add to selected track
- Show plugin format (LV2, VST, AU)

### Task 3.4: Add Spectrum Analyzer to Master

**Files:**
- Modify: `dawflow-ui/src/shared/SpectrumAnalyzer.tsx`
- Modify: `dawflow-ui/src/layout/RightZone.tsx`

**Features:**
- Real-time FFT display
- Wire to `daw.get_master_spectrum` or `daw.analyze.fft`
- Show in meter tab of right zone

### Task 3.5: Add Key Commands / Shortcuts Dialog

**Files:**
- Modify: `dawflow-ui/src/services/shortcuts.ts`

**Features: Add all standard DAW shortcuts:**
- Space: Play/Stop
- R: Record
- Numpad 1-9: Locator recall
- L: Toggle loop
- C: Toggle click
- F: Zoom to fit
- G: Toggle grid
- J: Toggle snap
- 1-9: Select tool (1=Select, 2=Range, 3=Split, etc.)
- Ctrl+D: Duplicate
- Ctrl+A: Select all
- Home: Go to start
- End: Go to end
- +/-: Zoom in/out

### Task 3.6: Improve Locator Range UX

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`
- Modify: `dawflow-ui/src/layout/CenterZone.module.css`

**Features:**
- Double-click on locator range to zoom to fit range
- Right-click on range for "Set Locators from Selection", "Export Range", etc.
- Locator range should also set the export range in ExportDialog
- Verify locator flag visibility and drag behavior

---

## Phase 4: Polish & Performance

### Task 4.1: Reduce Unnecessary Polling

- `get_master_meter`: only poll when meter tab or mixer is visible
- `get_cpu_load`: reduce from 2s to 5s
- `fetchFromEngine` (tracks): reduce from 3s to 5s, or use event-driven updates
- Remove duplicate recording poll (CenterZone + websocket.ts both poll during recording)

### Task 4.2: Add Error Handling

- Replace all `.catch(() => {})` with `.catch((e) => console.warn('[DAWFLOW]', e))`
- Show user-facing error toast for critical failures (save, export, record)

### Task 4.3: Fix CSS Class Mismatches Audit

- Scan all components for `styles.X` references that don't exist in the corresponding `.module.css`
- Fix any remaining visual breakage

---

## Execution Priority

**Night 1 (NOW):** Phase 1 (all broken IPC fixes) + Phase 2 Tasks 2.1-2.3
**Night 2:** Phase 2 Tasks 2.4-2.10
**Night 3:** Phase 3 (new components) + Phase 4 (polish)

## Build & Deploy After Each Task

```bash
cd dawflow-ui && npm run build && ./deploy.sh
cd ../sdk/plugins/ui-shell && ./build.sh && cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
rm -rf ~/.config/dawflow/cache/com.dawflow.ui-shell/
```
