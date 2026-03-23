# Tools & Time Warp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up all remaining CenterZone tools (mute, glue, timewarp, range, zoom, play, color, comp) with correct IPC calls, with special focus on the time warp tool (drag-to-stretch regions).

**Architecture:** Each tool needs a region-click handler in CenterZone.tsx and optionally a timeline-click handler. The time warp tool requires drag interaction that calculates a stretch ratio from original vs. dragged length, then calls `daw.editor.time_stretch_region`. Following Ardour's `TimeFXDrag` pattern from `editor_drag.cc`.

**Tech Stack:** React, TypeScript, Zustand, IPC via `ipc.call()`

---

### Task 1: Mute Tool — Click region to toggle mute

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (region click handler section)

**Implementation:**
In the region `onClick` handler (around line 1237 where `split` is handled), add:
```typescript
} else if (activeTool === 'mute') {
  e.stopPropagation();
  ipc.call('daw.set_region_muted', { region_id: region.id, muted: !region.muted })
    .then(() => {
      // Toggle visual mute state
      useRegionStore.getState().setRegions(track.id,
        (regionsByTrack[track.id] || []).map(r =>
          r.id === region.id ? { ...r, muted: !r.muted } : r
        )
      );
    }).catch(err => console.warn('[DAWFLOW] Mute region:', err));
```
Also add visual dimming: muted regions render with `opacity: 0.35`.

---

### Task 2: Glue Tool — Click region to merge with next adjacent region

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`

**Implementation:**
```typescript
} else if (activeTool === 'glue') {
  e.stopPropagation();
  // Find next region on same track that's adjacent
  const trackRegions = (regionsByTrack[track.id] || []).sort((a, b) => a.position - b.position);
  const idx = trackRegions.findIndex(r => r.id === region.id);
  if (idx >= 0 && idx < trackRegions.length - 1) {
    const next = trackRegions[idx + 1];
    ipc.call('daw.editor.combine_regions', { region_ids: [region.id, next.id] })
      .then(() => ipc.getRegions(track.id).then(regions => {
        useRegionStore.getState().setRegions(track.id, regions.map(r => ({ ...r, trackId: track.id, type: track.type || 'audio' })));
      }))
      .catch(err => console.warn('[DAWFLOW] Glue regions:', err));
  }
```

---

### Task 3: Zoom Tool — Click to zoom in, Alt+click to zoom out

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (event display click handler)

**Implementation:**
Add to the event display `onMouseDown`:
```typescript
} else if (activeTool === 'zoom') {
  e.stopPropagation();
  e.preventDefault();
  if (e.altKey) {
    setPixelsPerSecond(prev => Math.max(ZOOM_MIN, prev / 1.4));
  } else {
    setPixelsPerSecond(prev => Math.min(ZOOM_MAX, prev * 1.4));
  }
```

---

### Task 4: Color Tool — Click region to apply selected track color

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`

**Implementation:**
```typescript
} else if (activeTool === 'color') {
  e.stopPropagation();
  ipc.call('daw.set_region_color', { region_id: region.id, color: track.color.replace('#', '') + 'ff' })
    .catch(err => console.warn('[DAWFLOW] Color region:', err));
```

---

### Task 5: Play Tool — Click to audition from click position

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`

**Implementation:**
```typescript
} else if (activeTool === 'play') {
  e.stopPropagation();
  const rect = e.currentTarget.closest(`.${styles.eventDisplay}`)?.getBoundingClientRect();
  if (rect) {
    const clickSec = (e.clientX - rect.left) / pixelsPerSecond;
    const posSamples = Math.floor(clickSec * sampleRate);
    ipc.transportLocate(posSamples).then(() => {
      engineTransportRoll(true);
    }).catch(() => {});
  }
```

---

### Task 6: Time Warp Tool — Drag region edge to stretch

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`

**How Cubase/Ardour does it:**
1. Click near the LEFT half of a region → dragging stretches from the start
2. Click near the RIGHT half → dragging stretches from the end
3. During drag, a visual overlay shows the stretched length
4. On mouse up, calculate ratio = newLength / originalLength
5. Call `daw.editor.time_stretch_region` with `{ region_id, ratio }`

**Implementation:**
Add new state:
```typescript
const [timeWarpDrag, setTimeWarpDrag] = React.useState<{
  regionId: string; trackId: string; side: 'start' | 'end';
  origPositionSamples: number; origLengthSamples: number;
  currentLengthPx: number; startX: number;
} | null>(null);
```

In region onClick for timewarp tool:
```typescript
} else if (activeTool === 'timewarp') {
  e.stopPropagation();
  e.preventDefault();
  const regionRect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - regionRect.left;
  const isLeftHalf = clickX < regionRect.width / 2;

  setTimeWarpDrag({
    regionId: region.id, trackId: track.id,
    side: isLeftHalf ? 'start' : 'end',
    origPositionSamples: region.position,
    origLengthSamples: region.length,
    currentLengthPx: regionRect.width,
    startX: e.clientX,
  });

  // ... mousemove updates currentLengthPx
  // ... mouseup calculates ratio and calls IPC
```

On mouseUp:
```typescript
const origLengthSec = timeWarpDrag.origLengthSamples / sampleRate;
const newLengthSec = timeWarpDrag.currentLengthPx / pixelsPerSecond;
const ratio = newLengthSec / origLengthSec;

ipc.call('daw.editor.time_stretch_region', {
  region_id: timeWarpDrag.regionId,
  ratio: ratio,
}).then(() => {
  // Refetch regions
  ipc.getRegions(timeWarpDrag.trackId).then(regions => {
    useRegionStore.getState().setRegions(timeWarpDrag.trackId, regions.map(r => ({
      ...r, trackId: timeWarpDrag.trackId, type: 'audio',
    })));
  });
}).catch(err => console.warn('[DAWFLOW] Time stretch:', err));
```

Visual: During drag, render a semi-transparent overlay showing the stretched region width.

---

### Task 7: Range Tool — Drag to select a time range

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`

**Implementation:**
Add range selection state and visual overlay. On mouseDown with range tool, start a range. On mouseUp, set locators.

---

### Task 8: Comp Tool — Click take lane to comp

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`

**Implementation:**
Placeholder — comp tool activates take lane editing mode. Requires take lanes to be visible first.

---

## Execution Order
1. Task 6 (Time Warp) — most requested
2. Task 1 (Mute)
3. Task 2 (Glue)
4. Task 3 (Zoom)
5. Task 5 (Play)
6. Task 4 (Color)
7. Task 7 (Range)
8. Task 8 (Comp)
