# DAWFLOW Next Steps — Critical Bugfix Priority List

> **For the next agent:** Read this document first. Do NOT build new features. Fix these bugs in order, testing each one before moving to the next.

**Context:** The native WebView IPC bridge is working (~1ms latency). The React UI loads and most IPC commands work. But several core features have bugs that make the DAW unusable. Fix these in order.

**How to test:** Build with `cd dawflow-ui && npm run build && ./deploy.sh && cd ../sdk/plugins/ui-shell && ./build.sh && cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/ && rm -rf ~/.config/dawflow/cache/com.dawflow.ui-shell/` then `cd ../.. && ./run-dawflow.sh`. Watch the browser console (Cmd+Option+I in the WebView).

---

## Bug 1: MIDI Notes Don't Show in Arrangement View Region Blocks

**Symptom:** You add MIDI notes in the MIDI editor window, but the arrangement view's MIDI region blocks stay empty (no mini-note preview).

**Root Cause:** `MidiNoteDisplay` component (`dawflow-ui/src/shared/MidiNoteDisplay.tsx`) has two issues:
1. Line 31: `if (Array.isArray(arr) && arr.length > 0)` — if the engine returns an empty array (timing issue, wrong region queried), it silently keeps old data. But on fresh mount, `notes` is `[]` and never gets populated if the first fetch returns empty.
2. The `dawflow:midi-notes-changed` custom event fires from the MIDI editor, but the MidiNoteDisplay may not be listening yet (race condition on mount).

**Fix:**
- Remove the `arr.length > 0` check — always set notes from the response (empty array means the region genuinely has no notes)
- Add a retry: if first fetch returns empty, retry once after 500ms
- Add console.log to track what's happening: `console.log('[MidiNoteDisplay]', regionId, 'fetched', arr.length, 'notes')`

**Files:** `dawflow-ui/src/shared/MidiNoteDisplay.tsx`

---

## Bug 2: MIDI Draw Tool Creates Regions at Wrong Position

**Symptom:** Using the pencil tool (key 8) on a MIDI track, the drawn region doesn't appear at the exact click position. It seems offset.

**Root Cause:** In `CenterZone.tsx`, the draw tool's `onMouseDown` handler calculates `startXPx` from the event display's bounding rect, but the event display is nested inside a track row that may have an offset. The `snapToGrid` function may also be snapping to unexpected positions.

**Fix:**
- In `CenterZone.tsx`, find the draw tool `onMouseDown` handler (search for `activeTool === 'draw'`)
- Verify `e.currentTarget.getBoundingClientRect()` returns the correct rect (it should be the `.eventDisplay` div, not a parent)
- Add a visual preview: while dragging, show a semi-transparent rectangle at the drag position (like a ghost region) so the user sees exactly where the region will be created
- After mouse up, create the region at the snapped position and immediately fetch regions to update the view

**Files:** `dawflow-ui/src/layout/CenterZone.tsx` (search for `activeTool === 'draw'`)

---

## Bug 3: MIDI Notes Disappear When Reopening Editor Window

**Symptom:** Add notes in the MIDI editor floating window, close the window, reopen it — all notes are gone.

**Root Cause:** The MIDI editor fetches notes on mount via `ipc.getMidiNotes(regionId, trackId)`. The engine returns the notes successfully (visible in console log). But the editor's `useEffect` has a dependency array `[regionId, trackId]` — when the floating window closes and reopens, React creates a NEW component instance with the same props, so `useEffect` runs and fetches notes. The issue is likely that the fetch DOES return notes but the response parsing is wrong — the response field names (`start_beats` vs `start` vs `time`) may not match.

**Fix:**
- In `MidiEditor.tsx` line ~186, add `console.log('[MidiEditor] fetched notes:', raw)` to see what the engine actually returns
- Verify the field mapping: `n.start ?? n.time ?? n.time_beats ?? 0` — compare against the actual engine response which uses `start_beats`
- The mapping should be: `time: n.start_beats ?? n.start ?? n.time ?? 0`
- Also check: `length: n.length_beats ?? n.length ?? 0.25`
- The engine returns: `{note, velocity, channel, start_beats, length_beats, end_beats, id}`

**Files:** `dawflow-ui/src/lower-zone/MidiEditor.tsx` (line ~186)

---

## Bug 4: Automation Lane Visually Broken (Dark, Cut Off)

**Symptom:** When expanding an automation lane, the header and curve area look dark and cut off. The lane doesn't match the track width.

**Root Cause:** The `AutomationLaneHeader` and `AutomationLane` components have CSS that doesn't account for the new 300px track header width. The lane header may be overflowing or hidden.

**Fix:**
- In `CenterZone.module.css`, check if `.automationLane` or the lane wrapper has `overflow: hidden` — change to `overflow: visible`
- In `CenterZone.tsx`, check how the automation lane is rendered — it should be a full-width row below the track row with the same layout (300px header + flex event area)
- The `AutomationLane` component (`dawflow-ui/src/layout/AutomationLane.tsx`) renders an SVG curve — verify it receives the correct `pixelsPerSecond` and renders at the right width
- The `AutomationLaneHeader` (`dawflow-ui/src/components/AutomationLaneHeader.tsx`) should be 300px wide to match the track header

**Files:** `dawflow-ui/src/layout/CenterZone.tsx`, `dawflow-ui/src/layout/CenterZone.module.css`, `dawflow-ui/src/components/AutomationLaneHeader.tsx`, `dawflow-ui/src/layout/AutomationLane.tsx`

---

## Bug 5: Track Header Colored Square Sometimes Disappears

**Symptom:** Sometimes a track's colored square section is missing/collapsed.

**Root Cause:** The `TrackHeader` component uses `align-self: stretch` on the color square, which requires the parent to have a defined height. If the parent row's height collapses (e.g., from flexbox wrapping), the square disappears.

**Fix:**
- In `TrackHeader.module.css`, add `min-height: 60px` to the `.trackHeader` container
- Add `height: 100%` to the `.colorSquare` as a fallback alongside `align-self: stretch`
- Verify the parent `.trackRow` in `CenterZone.module.css` has `height` set (from `track.height` prop)

**Files:** `dawflow-ui/src/components/TrackHeader.module.css`, `dawflow-ui/src/layout/CenterZone.module.css`

---

## Bug 6: `daw.get_available_ports` Crashes Engine

**Symptom:** Console shows `DawflowPluginHost: ERROR on daw.get_available_ports: [json.exception.type_error.306] cannot use value() with null`

**Root Cause:** The engine handler for `daw.get_available_ports` tries to read a `type` parameter using `.value()` on a null JSON value. The React UI calls it without the `type` parameter.

**Fix (engine side):**
- In the engine source file that registers `daw.get_available_ports`, add a null check: `std::string type = params.contains("type") ? params.at("type").get<std::string>() : "";`
- Search in `engine/libs/ardour/dawflow_commands_*.cc` for the handler

**Fix (React side, interim):**
- In `TrackInspector.tsx`, change the call from `ipc.call('daw.get_available_ports')` to `ipc.call('daw.get_available_ports', { type: 'audio' })` to always pass the parameter

**Files:** `engine/libs/ardour/dawflow_commands_*.cc` (search for `get_available_ports`), `dawflow-ui/src/inspector/TrackInspector.tsx`

---

## Bug 7: MIDI Draw Should Show Real-Time Preview

**Symptom:** When drawing a MIDI region with the pencil tool, nothing appears until after mouse up.

**Fix:**
- In the draw tool mouseDown handler in `CenterZone.tsx`, add a temporary "ghost region" state
- While dragging, render a semi-transparent div at the drag position showing the region preview
- On mouse up, remove the ghost and create the real region
- This is purely visual — add state like `drawingGhost: { trackId, startPx, widthPx } | null`

**Files:** `dawflow-ui/src/layout/CenterZone.tsx`

---

## Bug 8: Excessive IPC Calls to `get_tracks`/`get_session_info`

**Symptom:** Console shows `get_tracks` and `get_session_info` called repeatedly even without user interaction.

**Root Cause:** After removing the 3-second poll, there are still multiple sources triggering `fetchFromEngine()`:
- `transport_roll` stop handler (line ~210 in websocket.ts)
- `transport_record` handler polls during recording (every 1.5s)
- CenterZone recording useEffect
- Various after-action fetches

**Fix:**
- Add a debounce to `fetchFromEngine()` in `session.ts` — if it was called less than 1 second ago, skip
- Remove the `transport_record` polling (recording regions should be shown via the fake "Recording..." visual in CenterZone, then real regions fetched once on stop)

**Files:** `dawflow-ui/src/stores/session.ts`, `dawflow-ui/src/services/websocket.ts`

---

## Priority Order

1. **Bug 3** (MIDI editor field mapping) — quickest fix, high impact
2. **Bug 1** (MidiNoteDisplay) — depends on Bug 3 being fixed
3. **Bug 6** (get_available_ports crash) — easy engine fix, stops console spam
4. **Bug 4** (automation lane CSS) — visual fix
5. **Bug 5** (track header square) — visual fix
6. **Bug 2** (draw position) — needs testing
7. **Bug 7** (draw preview) — polish
8. **Bug 8** (excessive polling) — performance

---

## Testing Checklist

After fixing each bug, verify:
- [ ] Add MIDI track, draw region with pencil tool → region appears at click position
- [ ] Double-click region → MIDI editor opens as floating window
- [ ] Draw notes in editor → notes appear in arrangement view region block
- [ ] Close and reopen editor → notes are still there
- [ ] Expand automation lane → lane header shows correctly, curve is visible
- [ ] Track header shows colored square on all tracks
- [ ] No `get_available_ports` errors in console
- [ ] Record audio → region appears within 1 second of pressing stop
- [ ] Play → playhead moves smoothly from where you clicked
