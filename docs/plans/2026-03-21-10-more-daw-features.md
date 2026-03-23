# 10 More DAW Features — Implementation Plan (Batch 2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 10 more professional DAW features covering gain staging, metering, routing, MIDI transforms, and audio analysis.

**Architecture:** All React components in `dawflow-ui/src/`. Engine APIs already exist — pure UI work.

**Tech Stack:** React 19, TypeScript, Zustand, CSS Modules, SVG

---

## Task 1: Input Trim/Gain Control

**Files:** Modify `LowerMixConsole.tsx`, `LowerMixConsole.module.css`

- Add a small trim knob above the main fader in each mixer strip
- Range: -20dB to +20dB, default 0dB
- Cmd+click resets to 0dB
- Fetch initial value from engine, update on change

**IPC:** `engine.track.setTrim(trackId, trimDb)`, `engine.track.getTrim(trackId)`

---

## Task 2: Mixer Send Faders

**Files:** Modify `LowerMixConsole.tsx`, `LowerMixConsole.module.css`

- Add expandable "Sends" section below the pan bar in each mixer strip
- Show up to 4 mini horizontal send faders per strip
- Each send: level fader + destination label + pre/post indicator (orange/blue dot)
- Fetch sends via `engine.send.getAllDetails(trackId)`
- Click empty slot → destination dropdown (list buses)

---

## Task 3: Meter Modes (LUFS/RMS/PPM)

**Files:** Create `src/components/MeterModeSelector.tsx`, `MeterModeSelector.module.css`. Modify `LowerMixConsole.tsx`

- Dropdown at top of meter area to switch mode: Peak, RMS, LUFS, K-12, K-14, K-20
- Peak mode: current behavior (fast attack, slow decay)
- RMS mode: slower averaging, shows average loudness
- LUFS mode: integrated loudness per EBU R128
- Visual: different meter colors per mode (peak=green/yellow/red, RMS=blue, LUFS=cyan)
- Right-click meter → mode selector

**IPC:** `engine.meter.getRouteMeterLevels(trackId)` (already used), `ipc.call('daw.analyze.lufs_integrated', { track_id })`

---

## Task 4: Input Monitoring + Level Display

**Files:** Modify `LowerMixConsole.tsx`, `TrackHeader.tsx`

- Add input level indicator (thin bar) next to the output meter in mixer strips
- Different color from output meter (e.g., cyan/teal) to distinguish
- Toggle input monitoring via existing monitor button (already exists)
- Show input port name in tooltip

**IPC:** `engine.track.setMonitoring(trackId, mode)` (already used), `engine.meter.getRouteMeterLevels(trackId)`

---

## Task 5: Group Management UI

**Files:** Create `src/components/GroupManager.tsx`, `GroupManager.module.css`

- Floating panel (like Undo History) listing all route groups
- Each group: name, member count, color swatch
- "New Group" button → name prompt → `daw.create_route_group`
- Click group → shows member tracks
- Drag tracks to/from groups
- Group properties: link gain, mute, solo, record, color
- Delete group button

**IPC:** `engine.group.getAll()`, `engine.group.create(name)`, `engine.group.addTrack(groupName, trackId)`, `engine.group.removeTrack(groupName, trackId)`, `engine.group.setProperties(groupName, props)`

---

## Task 6: Audio Analysis Display

**Files:** Modify `AudioEditor.tsx`, `AudioEditor.module.css`

- Info bar at top of audio editor showing analysis results for selected region
- Display: Peak dBFS, RMS dB, Integrated LUFS, Detected Key, Detected BPM
- "Analyze" button triggers analysis, results cached per region
- Compact layout: `Peak: -3.2 dBFS | RMS: -18.4 dB | LUFS: -14.2 | Key: C minor | BPM: 120`

**IPC:** `ipc.call('daw.analyze_region_loudness', { region_id })`, `ipc.call('daw.detect_region_key', { region_id })`, `ipc.call('daw.analyze.ebur128', { track_id })`

---

## Task 7: Fade Curve Shape Control

**Files:** Modify `src/dialogs/FadeEditorDialog.tsx`, `FadeEditorDialog.module.css`

- Add shape selector buttons: Linear, Fast, Slow, Constant Power, Symmetric
- Visual preview: SVG curve showing the selected shape
- Click shape → applies via `daw.set_fade_shape`
- Current shape highlighted

**IPC:** `ipc.call('daw.set_fade_shape', { track_id, region_id, fade: 'in'|'out', shape: 'linear'|'fast'|'slow'|'constant'|'symmetric' })`

---

## Task 8: MIDI Transforms (Legato/Strum/Invert/Humanize)

**Files:** Modify `MidiEditor.tsx`, `MidiEditor.module.css`

- Add "Transform" dropdown button in MIDI editor toolbar
- Menu items:
  - Legato → extends each note to meet the next (`daw.midi_legato`)
  - Strum → offsets chord notes by small delay (`daw.filter.strum`)
  - Invert → mirror notes around pivot (`daw.invert_midi_notes`)
  - Humanize → random velocity/timing variation (`daw.humanize_midi`)
- Each applies to selected notes (or all if none selected)
- After transform, refetch MIDI notes

**IPC:** `ipc.call('daw.midi_legato', { track_id, region_id })`, `ipc.call('daw.filter.strum', { track_id, region_id, delay_ms })`, `ipc.call('daw.invert_midi_notes', { track_id, region_id, pivot_note })`, `ipc.call('daw.humanize_midi', { track_id, region_id, timing_range, velocity_range })`

---

## Task 9: Bounce to Track / Consolidate

**Files:** Modify `CenterZone.tsx` (context menu)

- Add "Bounce Region" to region right-click context menu
- Add "Bounce to Track" to track context menu (bounces all regions)
- Uses range selection if available, otherwise bounces entire region
- After bounce, refetch regions

**IPC:** `ipc.call('daw.bounce_region', { track_id, region_id })`, `ipc.call('daw.bounce_range', { track_id, start_samples, end_samples })`

---

## Task 10: Phase Invert Per-Channel + Phase Correlation

**Files:** Modify `LowerMixConsole.tsx`, create `src/shared/PhaseCorrelationMeter.tsx`

- Phase button in mixer strip already exists — enhance to show per-channel state
- For stereo tracks: two phase buttons (L/R) or single button that cycles: Off → L → R → Both
- Phase correlation meter: horizontal bar (-1 to +1), green at +1, red at -1
- Show in master strip area or as global meter
- Poll `daw.get_phase_correlation` for the master bus

**IPC:** `ipc.call('daw.phase.set', { track_id, channel, inverted })`, `ipc.call('daw.get_phase_correlation', { track_id })`
