# Remaining Features — Complete DAW UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all remaining features to bring DAWFLOW from ~80% to 100% professional DAW completeness — track folders, comping/take lanes, arranger track, spectrum analyzer, tempo curve, and polish items.

**Architecture:** All features are React components in dawflow-ui/, communicating with the Ardour engine via IPC (port 19100) and WebSocket (port 3818). State managed via Zustand stores. Each feature is independent and can be implemented in parallel by separate agents that own distinct files.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, CSS Modules, HTML Canvas (for visualizations)

---

## Task 1: Track Folders (Collapsible Nesting) — HIGHEST PRIORITY

**Files:**
- Modify: `dawflow-ui/src/stores/session.ts` — add folder expand/collapse state, build tree from flat list
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` — render nested tracks with indent, collapse toggle
- Modify: `dawflow-ui/src/lower-zone/LowerMixConsole.tsx` — respect folder collapse in mixer
- Modify: `dawflow-ui/src/inspector/VisibilityTab.tsx` — show folder hierarchy

**Context:**
- `Track` type already has `children?: Track[]` and `'folder'` type in `types/track.ts`
- Engine returns flat track list via `ipc.getTracks()` — folder tracks have `type: 'folder'` or `type: 'group'`
- Engine has route groups (`daw.route_group.*`) that map to folder behavior
- Adding a folder track: `ipc.call('daw.add_track', { type: 'bus', name: 'Folder' })` + `daw.route_group.create` + `daw.route_group.add_route`

**Step 1: Add folder state to session store**

In `stores/session.ts`, add:
```typescript
// State
collapsedFolders: Set<string>;  // track IDs of collapsed folders

// Actions
toggleFolderCollapsed: (trackId: string) => void;
getTrackTree: () => Track[];  // build nested tree from flat tracks
```

`getTrackTree()` should:
1. Fetch the route groups via `daw.route_group.list`
2. For each group, check if it has a corresponding bus track (same name)
3. Nest member tracks under the folder track using `children`
4. Return the tree structure

**Step 2: Render folder tracks in CenterZone**

In the track list rendering section of CenterZone.tsx:

```typescript
function renderTrackRow(track: Track, depth: number = 0) {
  const isFolder = track.type === 'folder' || track.type === 'group';
  const isCollapsed = sessionStore.collapsedFolders.has(track.id);

  return (
    <React.Fragment key={track.id}>
      <div className={styles.trackRow} style={{ paddingLeft: depth * 20 }}>
        {isFolder && (
          <button
            className={styles.folderToggle}
            onClick={() => sessionStore.toggleFolderCollapsed(track.id)}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        )}
        {/* ... existing track header content ... */}
      </div>
      {/* Render children if expanded */}
      {isFolder && !isCollapsed && track.children?.map(child =>
        renderTrackRow(child, depth + 1)
      )}
    </React.Fragment>
  );
}
```

**Step 3: Folder track header styling**
- Folder tracks: slightly different background (#2a2a2e), folder icon (📁)
- Indent children by 20px per level
- Collapse triangle (▶/▼) before the track name
- Child tracks show a vertical line on the left connecting to parent

**Step 4: Mixer respects folders**
- In LowerMixConsole, skip hidden (collapsed) tracks
- Folder tracks show as a summary strip (aggregate meter, mute/solo affects children)

**Step 5: Drag tracks into/out of folders**
- Drag a track onto a folder header → add to group via `daw.route_group.add_route`
- Drag a track out of folder → remove from group via `daw.route_group.remove_route`

---

## Task 2: Comping / Take Lanes

**Files:**
- Create: `dawflow-ui/src/layout/TakeLanes.tsx`
- Create: `dawflow-ui/src/layout/TakeLanes.module.css`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` — add take lane toggle, render lanes

**Context:**
- Ardour uses playlists for comping — each take is a playlist
- IPC commands: `daw.get_track_playlists`, `daw.track.use_playlist`, `daw.track.use_copy_playlist`, `daw.track.use_new_playlist`, `daw.get_available_playlists`
- When recording multiple takes, Ardour creates new playlists automatically

**Step 1: TakeLanes component**

Props: `trackId: string, pixelsPerSecond: number, scrollLeft: number, sampleRate: number`

On mount, fetch playlists: `ipc.call('daw.get_track_playlists', { track_id: trackId })`

Render each playlist as a horizontal lane below the main track:
- Each lane shows regions from that playlist (fetched via `daw.get_playlist_regions`)
- Active playlist is highlighted
- Click a lane to make it active: `ipc.call('daw.track.use_playlist', { track_id, playlist_id })`
- Comp tool: click a section of a take lane to promote that region to the active playlist

**Step 2: Toggle in track header**
- Add a small "Lanes" button (or "C" for comp) on each track header
- When active, expand the track to show take lanes below the main region area
- Track height increases by `n_playlists * 40px`

**Step 3: Visual styling**
- Take lanes: slightly different background per lane (alternating #1a1a1e / #1e1e22)
- Active lane: brighter border
- Comp regions: semi-transparent overlay showing which sections come from which take

---

## Task 3: Arranger Track / Sections

**Files:**
- Create: `dawflow-ui/src/layout/ArrangerTrack.tsx`
- Create: `dawflow-ui/src/layout/ArrangerTrack.module.css`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` — render above track list

**Context:**
- Ardour supports sections via locations with `is_section` flag
- IPC: `daw.editor.add_section_at_playhead`, `daw.location.set_section`, `daw.session.get_arranger`, `daw.cut_section`, `daw.copy_section`, `daw.insert_section`

**Step 1: ArrangerTrack component**

Render a 32px-tall track above the track list (below MarkerTrack) showing colored section blocks:
- Fetch sections: filter locations where `is_section === true` from `ipc.getMarkers()`
- Each section: colored block with label (Intro, Verse, Chorus, Bridge, Outro)
- Click to select section, double-click to rename
- Right-click: duplicate, delete, move, change color
- Drag section edges to resize

**Step 2: Section operations**
- Click empty area + type name to create section
- Drag to reorder sections (calls `daw.copy_section` + `daw.delete_section`)
- Export section as loop or range

---

## Task 4: Spectrum Analyzer

**Files:**
- Create: `dawflow-ui/src/shared/SpectrumAnalyzer.tsx`
- Create: `dawflow-ui/src/shared/SpectrumAnalyzer.module.css`
- Modify: `dawflow-ui/src/layout/RightZone.tsx` — add spectrum display to Meter tab

**Context:**
- IPC: `daw.get_region_spectrum`, `daw.get_region_mel_spectrum`, `daw.analyze_region_spectrum`
- For real-time: need to poll master or track FFT data

**Step 1: SpectrumAnalyzer component**

Canvas-based FFT display:
- X axis: frequency (20Hz - 20kHz, logarithmic)
- Y axis: amplitude (dB, -90 to 0)
- Frequency labels: 50, 100, 200, 500, 1k, 2k, 5k, 10k, 20k
- Fill below curve with gradient (green → yellow → red)
- Poll data: `ipc.call('daw.get_master_spectrum')` every 50ms (20fps)
- Fallback: if real-time not available, show static analysis of selected region

**Step 2: Integrate into RightZone Meter tab**
- Add below the loudness section
- Toggle: "Spectrum" checkbox to enable/disable (saves CPU)
- Size: fill available width, 120px height

---

## Task 5: Tempo Track / Curve Visualization

**Files:**
- Create: `dawflow-ui/src/layout/TempoTrack.tsx`
- Create: `dawflow-ui/src/layout/TempoTrack.module.css`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` — render below ruler

**Context:**
- IPC: `daw.tempo_map.get_all_tempo_points`, `daw.tempo_point.set_bpm`, `daw.tempo_point.set_ramped`, `daw.add_tempo_change`, `daw.remove_tempo_change`

**Step 1: TempoTrack component**

A 60px-tall track showing the tempo curve:
- SVG or Canvas
- X axis: time (aligned with timeline)
- Y axis: BPM (auto-scale to min/max tempo in session)
- Draw line/curve through tempo points
- Ramped tempos: smooth curve between points
- Constant tempos: flat line segments
- Grid lines at round BPM values (60, 80, 100, 120, etc.)

**Step 2: Tempo point editing**
- Click to add new tempo point: `ipc.call('daw.add_tempo_change', { position, bpm })`
- Drag point vertically to change BPM: `ipc.call('daw.tempo_point.set_bpm', { position, bpm })`
- Right-click: delete point, toggle ramped/constant
- Double-click: edit BPM in text input

**Step 3: Toggle visibility**
- Add "Tempo" toggle button in the ruler area
- When visible, shows between ruler and tracks

---

## Task 6: Time Signature Track

**Files:**
- Create: `dawflow-ui/src/layout/SignatureTrack.tsx`
- Create: `dawflow-ui/src/layout/SignatureTrack.module.css`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` — render alongside tempo track

**Context:**
- IPC: `daw.tempo_map.get_all_meter_points`, `daw.editor.add_meter_at_position`

**Step 1: SignatureTrack component**
- 24px tall row showing time signature changes
- Each change: label like "4/4" or "3/4" at the change position
- Click to add new meter change
- Right-click to delete
- Double-click to edit numerator/denominator

---

## Task 7: Track Input/Output Metering Indicators

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx` — wire MI/MO/AI/AO indicators with real activity

**Context:**
- WebSocket `strip_meter` events provide per-track meter data
- Need to detect ANY input/output activity and blink the indicators

**Step 1: Activity detection**
In `websocket.ts`, when processing `strip_meter` events:
- If any meter level > -60dB, set `audioInActivity = true` with 200ms timeout
- Similarly for MIDI events

---

## Task 8: Crossfade Editor

**Files:**
- Create: `dawflow-ui/src/dialogs/CrossfadeDialog.tsx`
- Create: `dawflow-ui/src/dialogs/CrossfadeDialog.module.css`

**Context:**
- IPC: `daw.audio_region.set_fade_in`, `daw.audio_region.set_fade_out`
- Fade shapes: linear, fast, slow, constant_power, symmetric

**Step 1: CrossfadeDialog**
- Opens when two adjacent regions overlap
- Shows the crossfade visually (two overlapping waveforms with fade curves)
- Shape selector: 5 preset curves
- Length: drag or input
- Preview button: audition the crossfade region

---

## Task 9: Track Color Picker Dialog

**Files:**
- Create: `dawflow-ui/src/dialogs/ColorPickerDialog.tsx`
- Create: `dawflow-ui/src/dialogs/ColorPickerDialog.module.css`

**Step 1: ColorPickerDialog**
- A Cubase-style color grid (16x8 preset colors like the AddTrackDialog palette)
- Click color to apply to track: `ipc.setTrackColor(trackId, colorHex + 'ff')`
- Custom color input (hex field)
- Opens from context menu "Set Track Color..." and from inspector color swatch

---

## Task 10: MIDI CC Lanes in MIDI Editor

**Files:**
- Modify: `dawflow-ui/src/lower-zone/MidiEditor.tsx` — add CC lane section below velocity

**Context:**
- IPC: `daw.get_midi_cc_data`, `daw.set_midi_cc_data`, `daw.midi_patches.get_controller_name`

**Step 1: CC Lane selector**
- Dropdown below velocity lane: "Add CC Lane" → CC 1 (Modulation), CC 7 (Volume), CC 11 (Expression), CC 64 (Sustain), CC 74 (Filter), etc.
- Each CC lane: 60px tall, shows CC values as vertical bars or connected line
- Draw tool: draw CC curves
- Click to add/move CC points

---

## Task 11: Drum Editor (Alternative MIDI View)

**Files:**
- Create: `dawflow-ui/src/lower-zone/DrumEditor.tsx`
- Create: `dawflow-ui/src/lower-zone/DrumEditor.module.css`
- Modify: `dawflow-ui/src/lower-zone/EditorHost.tsx` — toggle between piano roll and drum view

**Step 1: DrumEditor**
- Grid layout: rows = drum instruments (kick, snare, hi-hat, etc.), columns = beats
- Each cell: diamond/circle indicating hit, size = velocity
- Left column: instrument names + mute/solo per row
- Standard GM drum map (note 36 = kick, 38 = snare, 42 = hi-hat, etc.)
- Click cell to add/remove hit
- Drag cell to adjust velocity

---

## Task 12: Polish — Remaining Small Items

**Files:** Various

**12a. Zone layout persistence (localStorage)**
- Save zone widths/heights/visibility to `localStorage` on change
- Restore on app load

**12b. Time display format switching**
- In TransportBar, click the time display to cycle: Bars.Beats | Seconds | Samples | Timecode

**12c. Pre-roll/Post-roll settings**
- Add small "Pre" and "Post" indicators near the record button
- Click to set pre-roll length (bars or seconds)

**12d. Track freeze indicator**
- Show snowflake icon (❄) on frozen tracks in CenterZone header
- Frozen tracks: dimmed waveform, "Frozen" label

**12e. Selected track highlight in mixer**
- When a track is selected in CenterZone, highlight its strip in the mixer

---

## Execution Priority Order

| Priority | Task | Complexity | Impact |
|----------|------|-----------|--------|
| 1 | Task 1: Track Folders | HIGH | CRITICAL — David's top request |
| 2 | Task 5: Tempo Track | MEDIUM | HIGH — visual completeness |
| 3 | Task 3: Arranger Track | MEDIUM | HIGH — professional workflow |
| 4 | Task 10: MIDI CC Lanes | MEDIUM | HIGH — MIDI editor completeness |
| 5 | Task 2: Comping/Takes | HIGH | HIGH — recording workflow |
| 6 | Task 4: Spectrum Analyzer | LOW | MEDIUM — analysis |
| 7 | Task 11: Drum Editor | MEDIUM | MEDIUM — MIDI workflow |
| 8 | Task 6: Signature Track | LOW | LOW — visual |
| 9 | Task 9: Color Picker | LOW | LOW — UX polish |
| 10 | Task 8: Crossfade | MEDIUM | LOW — advanced editing |
| 11 | Task 7: Activity Indicators | LOW | LOW — visual feedback |
| 12 | Task 12: Polish Items | LOW | LOW — final touches |

---

## Agent Assignment (No File Conflicts)

| Agent | Tasks | Files Owned |
|-------|-------|-------------|
| A | Task 1 (Folders) | session.ts, CenterZone.tsx (folder rendering section), VisibilityTab.tsx |
| B | Task 5 (Tempo) + Task 6 (Signature) | NEW TempoTrack.tsx, NEW SignatureTrack.tsx |
| C | Task 3 (Arranger) | NEW ArrangerTrack.tsx |
| D | Task 10 (CC Lanes) + Task 11 (Drum Editor) | MidiEditor.tsx, NEW DrumEditor.tsx, EditorHost.tsx |
| E | Task 2 (Comping) | NEW TakeLanes.tsx |
| F | Task 4 (Spectrum) + Task 9 (Color Picker) + Task 12 (Polish) | NEW SpectrumAnalyzer.tsx, NEW ColorPickerDialog.tsx, various small files |
