# 10 Missing DAW Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the 10 highest-impact missing features to bring the React UI to professional DAW parity with Cubase/Ardour.

**Architecture:** All features are React components in `dawflow-ui/src/`. They communicate with the Ardour engine via IPC (`engine.*` from `src/engine/registry.ts`) or WebSocket. No engine C++ changes needed — all IPC commands already exist.

**Tech Stack:** React 19, TypeScript, Zustand, CSS Modules, SVG for visualizations

---

## Task 1: Undo/Redo History Panel

**Files:**
- Create: `dawflow-ui/src/components/UndoHistoryPanel.tsx`
- Create: `dawflow-ui/src/components/UndoHistoryPanel.module.css`
- Modify: `dawflow-ui/src/layout/ProjectWindow.tsx` (add panel toggle)
- Modify: `dawflow-ui/src/stores/ui.ts` (add undoHistoryVisible state)

**What to build:**
- Floating panel (like Channel Settings) showing undo/redo stack
- Two sections: "Undo" (past actions) and "Redo" (future actions)
- Click any entry to undo/redo to that point (call `daw.undo` N times)
- Poll `daw.get_undo_history` every 2 seconds when panel is open
- Keyboard shortcut: Cmd+Z = undo, Cmd+Shift+Z = redo (already wired in shortcuts.ts)
- Show entry labels from engine (e.g., "Move Region", "Change Gain")
- Current state marker (separator between undo/redo stacks)

**IPC Commands:**
```typescript
// Already in ipc.ts:
ipc.undo()                    // daw.undo
ipc.redo()                    // daw.redo
ipc.getUndoHistory()          // daw.get_undo_history → { undo: [{label}], redo: [{label}] }

// Also available in registry.ts:
engine.session.getUndoHistory()
engine.session.getNextUndoLabel()  // daw.get_next_undo_label → { label, has_undo }
engine.session.getNextRedoLabel()  // daw.get_next_redo_label → { label, has_redo }
```

**Layout:**
```
┌─ Undo History ────────── x ┐
│ ▸ Current State            │
│ ────────────────────────── │
│   Move Region              │  ← click to undo to here
│   Change Gain              │
│   Add Track                │
│   Load Plugin              │
│ ────────────────────────── │
│ ▾ Redo Available           │
│   Delete Region            │  ← click to redo to here
│   Mute Track               │
└────────────────────────────┘
```

**Open trigger:** Edit menu → "Undo History" or Ctrl+H

---

## Task 2: Range Tool / Marquee Selection

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (add range drag logic)
- Modify: `dawflow-ui/src/layout/CenterZone.module.css` (range selection overlay)
- Modify: `dawflow-ui/src/stores/ui.ts` (add rangeSelection state)

**What to build:**
- When Range tool is active, click+drag on timeline creates a time range selection
- Visual: blue semi-transparent overlay covering the selected time span across all tracks (or specific tracks if dragged within track bounds)
- Range stored in samples: `{ startSample, endSample, trackIds?: string[] }`
- Context menu on range: "Bounce Selection", "Consolidate", "Export Selection", "Loop from Selection", "Crop to Selection"
- Double-click range to select all regions within it
- Range persists until cleared (click empty area or Escape)

**State (add to ui.ts):**
```typescript
rangeSelection: { startSample: number; endSample: number; trackIds?: string[] } | null;
setRangeSelection: (range: { startSample: number; endSample: number; trackIds?: string[] } | null) => void;
```

**CenterZone drag logic (when activeTool === 'range'):**
```typescript
onMouseDown: record startX, startTrackId
onMouseMove: compute endX, endTrackId, draw overlay
onMouseUp: compute sample range from pixel positions, store in ui store
```

**Context menu actions (IPC):**
```typescript
// Bounce range to new region:
ipc.call('daw.bounce_range', { track_id, start_samples, end_samples, name })

// Consolidate (merge all regions in range into one):
ipc.call('daw.consolidate_range', { track_id, start_samples, end_samples })

// Set loop from selection:
ipc.call('daw.set_loop_range', { start_sample, end_sample })

// Export range:
ipc.call('daw.export_range', { start_samples, end_samples, filename })
```

**Visual (CSS):**
```css
.rangeOverlay {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(74, 144, 217, 0.15);
  border-left: 1px solid rgba(74, 144, 217, 0.6);
  border-right: 1px solid rgba(74, 144, 217, 0.6);
  pointer-events: none;
  z-index: 8;
}
```

---

## Task 3: Scrub/Shuttle on Ruler

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (ruler mouse handlers)

**What to build:**
- Click on the ruler timeline area → locate playhead to that position (already works)
- **Click+hold+drag** on ruler → scrub: continuously locate to mouse position while dragging, engine plays audio at that position
- Visual: playhead follows mouse in real-time during scrub
- Release mouse → stop scrubbing, playhead stays at release position

**Implementation:**
The ruler already has `onMouseDown` for locator dragging. Add scrub behavior:

```typescript
// In the ruler timeline area's onMouseDown:
if (!e.shiftKey) {
  // Simple click = locate (already works)
  // But if mouse is held and dragged, start scrubbing
  const onMove = (me: MouseEvent) => {
    const rect = rulerTimelineRef.current!.getBoundingClientRect();
    const xPx = me.clientX - rect.left + scrollLeftPx;
    const seconds = Math.max(0, xPx / pixelsPerSecond);
    const samples = Math.floor(seconds * sampleRate);
    ipc.transportLocate(samples);
    useTransportStore.getState().setPosition(seconds);
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}
```

**No new IPC commands needed** — `daw.transport_locate` already exists and works.

---

## Task 4: Track Freeze/Unfreeze

**Files:**
- Modify: `dawflow-ui/src/components/TrackHeader.tsx` (add freeze button)
- Modify: `dawflow-ui/src/components/TrackHeader.module.css` (freeze button style)
- Modify: `dawflow-ui/src/types/track.ts` (add frozen state)
- Modify: `dawflow-ui/src/stores/session.ts` (fetch freeze state)
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (context menu entry)

**What to build:**
- Snowflake icon (❄) button on TrackHeader, next to the automation button
- Click → freeze track (renders all plugins to audio, disables plugins)
- Click again → unfreeze (restores live plugins)
- Frozen tracks show a visual indicator (blue tint or snowflake overlay on waveform)
- Context menu: "Freeze Track" / "Unfreeze Track"
- Frozen state fetched from engine on each track refresh

**IPC Commands:**
```typescript
engine.track.freeze(trackId)      // daw.freeze_track → { ok, track_id }
engine.track.unfreeze(trackId)    // daw.unfreeze_track → { ok, track_id }

// Check freeze state during fetchFromEngine:
ipc.call('daw.get_freeze_info', { track_id })
// → { track_id, track_name, freeze_state, is_frozen, can_freeze }
```

**Track type update:**
```typescript
// In types/track.ts, already has:
frozen: boolean;

// In session.ts fetchFromEngine, add:
frozen: (et as any).is_frozen ?? false,
// OR fetch separately per track with daw.get_freeze_info
```

**TrackHeader button:**
```tsx
<button
  className={`${styles.btnFreeze} ${track.frozen ? styles.active : ''}`}
  onClick={(e) => { e.stopPropagation(); onFreezeToggle(track.id); }}
  title={track.frozen ? 'Unfreeze Track' : 'Freeze Track'}
>
  ❄
</button>
```

---

## Task 5: Crossfade Handling

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (detect overlapping regions, render crossfade visual)
- Modify: `dawflow-ui/src/layout/CenterZone.module.css` (crossfade diamond/overlay)

**What to build:**
- When two regions on the same track overlap, show a crossfade indicator at the overlap zone
- Visual: X-shaped diamond icon or gradient overlay at the overlap point
- Double-click the crossfade zone → open Fade Editor dialog with both fades linked
- Auto-create crossfade when dragging a region to overlap another

**Detection logic:**
```typescript
// For each track, sort regions by position, check adjacent pairs for overlap:
const regions = regionsByTrack[track.id] || [];
const sorted = [...regions].sort((a, b) => a.position - b.position);
for (let i = 0; i < sorted.length - 1; i++) {
  const a = sorted[i];
  const b = sorted[i + 1];
  const aEnd = a.position + a.length;
  if (aEnd > b.position) {
    // Overlap detected: crossfade zone from b.position to aEnd
    const xfadeStart = b.position;
    const xfadeEnd = aEnd;
    // Render crossfade indicator
  }
}
```

**IPC Commands:**
```typescript
// Create crossfade between two overlapping regions:
ipc.call('daw.create_crossfade', {
  track_id: string,
  region_id_a: string,  // earlier region
  region_id_b: string,  // later region
  crossfade_samples: number  // optional, defaults to overlap size
})

// Fade shape control (already used in FadeEditorDialog):
ipc.call('daw.set_fade_shape', {
  track_id, region_id, fade: 'in' | 'out',
  shape: 'linear' | 'fast' | 'slow' | 'constant' | 'symmetric'
})
```

**Visual (CSS):**
```css
.crossfadeZone {
  position: absolute;
  top: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
  border-left: 1px dashed rgba(255,255,255,0.2);
  border-right: 1px dashed rgba(255,255,255,0.2);
  cursor: pointer;
  z-index: 3;
}
```

---

## Task 6: Ripple Edit Mode

**Files:**
- Modify: `dawflow-ui/src/stores/ui.ts` (add rippleMode state)
- Modify: `dawflow-ui/src/layout/Toolbar.tsx` (add ripple toggle button)
- Modify: `dawflow-ui/src/layout/Toolbar.module.css` (ripple button style)
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (adjust delete/trim/move to shift subsequent regions)

**What to build:**
- Toggle button in toolbar: "Ripple" (like Reaper's ripple edit)
- When ON: deleting a region shifts all later regions left to fill the gap
- When ON: trimming a region's end shifts all later regions accordingly
- When ON: moving a region shifts others to make room
- Three modes: Off, Ripple One Track, Ripple All Tracks

**State:**
```typescript
// In ui.ts:
rippleMode: 'off' | 'one' | 'all';
setRippleMode: (mode: 'off' | 'one' | 'all') => void;
```

**Implementation (in CenterZone delete handler):**
```typescript
if (rippleMode !== 'off') {
  const deletedRegion = regions.find(r => r.id === regionId);
  if (deletedRegion) {
    const gapSamples = deletedRegion.length;
    // Use engine's insert/remove time to shift everything:
    await ipc.call('daw.remove_time', {
      start: deletedRegion.position,
      end: deletedRegion.position + deletedRegion.length,
    });
  }
}
```

**IPC Commands:**
```typescript
ipc.call('daw.insert_time', { position: number, duration: number })
ipc.call('daw.remove_time', { start: number, end: number })
```

---

## Task 7: Plugin Preset Browser

**Files:**
- Create: `dawflow-ui/src/components/PluginPresetBrowser.tsx`
- Create: `dawflow-ui/src/components/PluginPresetBrowser.module.css`
- Modify: `dawflow-ui/src/inspector/InsertSlots.tsx` (add preset dropdown per plugin)

**What to build:**
- Dropdown button next to each loaded plugin in InsertSlots
- Click → shows list of presets (factory + user)
- Click a preset → loads it
- "Save Preset..." option at bottom → prompts for name, saves current state
- "Remove Preset" option for user presets
- Current preset name shown next to plugin name

**Layout:**
```
┌─ a-EQ Presets ─────────────┐
│ ⬚ (No Preset)              │
│ ─── Factory ──────────────  │
│   Bright Vocal              │
│   Warm Bass                 │
│   Cut Low End               │
│ ─── User ─────────────────  │
│   My Vocal Chain            │
│   Session Default           │
│ ───────────────────────────  │
│ + Save Preset...            │
└─────────────────────────────┘
```

**IPC Commands:**
```typescript
// List presets for a plugin:
engine.plugin.listPresets(trackId, processorId)
// → { presets: [{ uri, label, user: boolean }], current_preset }

// Load a preset:
engine.plugin.loadPreset(trackId, processorId, presetUri)

// Save current state as preset:
engine.plugin.savePreset(trackId, processorId, name)

// Remove a user preset:
engine.plugin.removePreset(trackId, processorId, name)
```

---

## Task 8: Sidechain Routing UI

**Files:**
- Create: `dawflow-ui/src/components/SidechainPanel.tsx`
- Create: `dawflow-ui/src/components/SidechainPanel.module.css`
- Modify: `dawflow-ui/src/inspector/InsertSlots.tsx` (add sidechain icon per plugin)

**What to build:**
- Small "SC" icon next to plugins that support sidechain (compressors, gates, etc.)
- Click SC icon → opens a small dropdown showing available sidechain sources
- Sources: all audio tracks and buses in the session
- Select a source → connects it as sidechain input to the plugin
- Visual indicator when sidechain is active (SC icon highlighted)

**IPC Commands:**
```typescript
// Check if plugin supports sidechain:
ipc.call('daw.sidechain.has', { track_id, processor_id })
// → { has_sidechain: boolean }

// List available sidechain sources:
ipc.call('daw.sidechain.list_available_sources', { track_id, processor_id })
// → { audio_sources: [...], midi_sources: [...] }

// Connect sidechain:
ipc.call('daw.sidechain.connect', { track_id, processor_id, source_port })

// Get current sidechain connections:
ipc.call('daw.sidechain.get_input', { track_id, processor_id })
// → { has_sidechain, connections: [{ port, connected_to }] }

// Disconnect:
ipc.call('daw.sidechain.disconnect', { track_id, processor_id })
```

**InsertSlots integration:**
After loading a plugin, check `daw.sidechain.has`. If true, show the SC icon.

---

## Task 9: Comping / Take Lanes

**Files:**
- Create: `dawflow-ui/src/layout/TakeLanes.tsx` (already exists as stub — rewrite)
- Create: `dawflow-ui/src/layout/TakeLanes.module.css` (already exists as stub — rewrite)
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (render take lanes below tracks)
- Modify: `dawflow-ui/src/components/TrackHeader.tsx` (add take lanes toggle)

**What to build:**
- Each track can have multiple playlists (takes)
- Toggle "Show Lanes" on a track → expands to show all playlists stacked vertically
- Each lane shows regions from that playlist
- Click a lane to make it the active playlist (comp selection)
- The "Comp" tool: click on a section of a lane to promote that region to the main playlist
- Visual: active lane is brighter, inactive lanes are dimmed
- Playlist management: "New Playlist", "Duplicate Playlist" in context menu

**IPC Commands:**
```typescript
// Get all playlists for a track:
ipc.call('daw.playlist.get_for_track', { track_id })
// → { playlists: [{ id, name, region_count, current: boolean }], count }

// Switch to a different playlist:
ipc.call('daw.track.use_playlist', { track_id, playlist_id })

// Create new empty playlist:
ipc.call('daw.track.use_new_playlist', { track_id })
// → { ok, new_playlist_id, new_playlist_name }

// Duplicate current playlist (for overdub recording):
ipc.call('daw.track.use_copy_playlist', { track_id })

// Get regions from a specific playlist:
ipc.call('daw.get_regions', { track_id })  // returns regions for current playlist
```

**Lane rendering:**
```
Track: Audio 01  [▼ Lanes]
├─ ● Take 1 (current) ─── [====region====]──────[==region==]──
├─   Take 2              ─── [========longer region========]──
├─   Take 3              ─── [===]──[===]──[===]──[===]──────
```

---

## Task 10: Tempo Track / Tempo Changes

**Files:**
- Rewrite: `dawflow-ui/src/layout/TempoTrack.tsx` (currently a stub)
- Rewrite: `dawflow-ui/src/layout/TempoTrack.module.css`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (render tempo track at top of timeline)

**What to build:**
- Dedicated track at top of the arrangement (below ruler, above regular tracks)
- Shows tempo as a line graph: X = time, Y = BPM
- Tempo points shown as draggable diamonds on the line
- Click empty area → add new tempo point
- Drag a point → change BPM at that position
- Double-click a point → edit BPM value in a text field
- Right-click → remove tempo point
- Supports tempo ramps (gradual change between two points)
- Shows current BPM at playhead position

**IPC Commands:**
```typescript
// Get all tempo points:
ipc.call('daw.tempo_map.get_all_tempo_points')
// → { points: [{ position_samples, bpm }], count }

// Add a tempo change:
ipc.call('daw.add_tempo_change', { position_samples, bpm })

// Remove a tempo change:
ipc.call('daw.remove_tempo_change', { position_samples })

// Add a tempo ramp (gradual change):
ipc.call('daw.add_tempo_ramp', {
  start_bpm, end_bpm, start_position_samples, end_position_samples
})

// Get tempo at a specific position:
ipc.call('daw.get_tempo_at', { position_samples })
// → { bpm }

// Also: time signature changes
ipc.call('daw.tempo_map.get_all_meter_points')
// → { points: [{ position_samples, numerator, denominator }], count }

ipc.call('daw.add_time_signature_change', { numerator, denominator, position_samples })
```

**Visual:**
```
Tempo ─────────────────────────────────────────────
  140 ┊                    ◆━━━━━━━━━━━◆
  120 ┊━━━━━━━━━━━━━━━━━◆╱              ╲◆━━━━━━━━
  100 ┊
   80 ┊
      ┊────┊────┊────┊────┊────┊────┊────┊────┊───
      1    5    9    13   17   21   25   29   33
```

---

## Testing Checklist

### Task 1 — Undo History
- [ ] Panel opens/closes
- [ ] Shows undo entries from engine
- [ ] Click entry → undoes to that point
- [ ] Redo entries appear after undo
- [ ] Panel updates after performing an action

### Task 2 — Range Tool
- [ ] Range tool active → drag creates blue overlay
- [ ] Range covers correct time span
- [ ] Right-click range → shows bounce/consolidate/export options
- [ ] "Loop from Selection" sets locators
- [ ] Escape clears range

### Task 3 — Scrub
- [ ] Click+hold+drag on ruler → playhead follows mouse
- [ ] Audio plays at scrub position (engine handles this)
- [ ] Release → playhead stays at release position

### Task 4 — Freeze
- [ ] Snowflake button appears on track header
- [ ] Click freeze → track renders, plugins disabled
- [ ] Frozen visual indicator shows
- [ ] Click unfreeze → plugins restored
- [ ] Context menu has Freeze/Unfreeze

### Task 5 — Crossfades
- [ ] Overlapping regions show crossfade indicator
- [ ] Double-click crossfade → opens fade editor
- [ ] Drag region to overlap → crossfade auto-creates

### Task 6 — Ripple Edit
- [ ] Toggle button in toolbar
- [ ] Delete region in ripple mode → later regions shift left
- [ ] Trim region → later regions adjust
- [ ] Three modes: Off, One Track, All Tracks

### Task 7 — Plugin Presets
- [ ] Preset dropdown appears next to loaded plugins
- [ ] Lists factory + user presets
- [ ] Click preset → loads it
- [ ] "Save Preset" → creates user preset
- [ ] Current preset name shown

### Task 8 — Sidechain
- [ ] SC icon on supported plugins
- [ ] Click SC → shows available sources
- [ ] Select source → connects sidechain
- [ ] Active sidechain → SC icon highlighted

### Task 9 — Comping
- [ ] "Show Lanes" toggle on track header
- [ ] Lanes expand showing all playlists
- [ ] Click lane → switches active playlist
- [ ] "New Playlist" in context menu
- [ ] Active lane highlighted, others dimmed

### Task 10 — Tempo Track
- [ ] Tempo track shows at top of arrangement
- [ ] Tempo points displayed as diamonds on line
- [ ] Drag point → changes BPM
- [ ] Click empty → adds new tempo point
- [ ] Right-click → remove point
- [ ] Tempo ramps render as angled lines

## Files Summary

| File | Action | Task |
|------|--------|------|
| `src/components/UndoHistoryPanel.tsx` | CREATE | 1 |
| `src/components/UndoHistoryPanel.module.css` | CREATE | 1 |
| `src/components/PluginPresetBrowser.tsx` | CREATE | 7 |
| `src/components/PluginPresetBrowser.module.css` | CREATE | 7 |
| `src/components/SidechainPanel.tsx` | CREATE | 8 |
| `src/components/SidechainPanel.module.css` | CREATE | 8 |
| `src/layout/TakeLanes.tsx` | REWRITE | 9 |
| `src/layout/TakeLanes.module.css` | REWRITE | 9 |
| `src/layout/TempoTrack.tsx` | REWRITE | 10 |
| `src/layout/TempoTrack.module.css` | REWRITE | 10 |
| `src/layout/CenterZone.tsx` | MODIFY | 2, 3, 5, 6, 9, 10 |
| `src/layout/CenterZone.module.css` | MODIFY | 2, 5 |
| `src/layout/Toolbar.tsx` | MODIFY | 6 |
| `src/layout/Toolbar.module.css` | MODIFY | 6 |
| `src/layout/ProjectWindow.tsx` | MODIFY | 1 |
| `src/stores/ui.ts` | MODIFY | 1, 2, 6 |
| `src/stores/session.ts` | MODIFY | 4 |
| `src/types/track.ts` | MODIFY | 4 |
| `src/components/TrackHeader.tsx` | MODIFY | 4, 9 |
| `src/components/TrackHeader.module.css` | MODIFY | 4 |
| `src/inspector/InsertSlots.tsx` | MODIFY | 7, 8 |
