# Video Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full video support in the React UI — import, timeline display with frame thumbnails, sync controls, external monitor, frame counter.

**Architecture:** Video frames fetched from harvid HTTP server (localhost:5080). Sync controlled via 6 existing IPC commands. Xjadeo launched as external process. Video track rendered in CenterZone timeline.

**Tech Stack:** React 19, TypeScript, CSS Modules, HTML5 `<img>` for frame thumbnails

---

## Task 1: IPC Wrappers + Video Store

**Files:**
- Modify: `dawflow-ui/src/services/ipc.ts` — add 6 video wrappers
- Modify: `dawflow-ui/src/engine/registry.ts` — add video namespace
- Create: `dawflow-ui/src/stores/video.ts` — video state store

**IPC wrappers:**
```typescript
getVideoPullup()         // daw.video.get_pullup → { pullup }
setVideoPullup(pullup)   // daw.video.set_pullup
getVideoSyncEnabled()    // daw.video.get_sync_enabled → { enabled }
setVideoSyncEnabled(en)  // daw.video.set_sync_enabled
getVideoOffset()         // daw.video.get_offset → { offset_samples, offset_negative }
setVideoOffset(samples)  // daw.video.set_offset
```

**Video store (Zustand):**
```typescript
interface VideoState {
  videoFile: string | null;
  fps: number;
  duration: number; // seconds
  aspectRatio: number;
  syncEnabled: boolean;
  pullup: number;
  offsetSamples: number;
  offsetNegative: boolean;
  offsetLocked: boolean;
  harvidAvailable: boolean;
  harvidUrl: string; // default http://localhost:5080
  xjadeoRunning: boolean;
  videoTrackVisible: boolean;
}
```

---

## Task 2: Video Track Timeline Component

**Files:**
- Create: `dawflow-ui/src/layout/VideoTrack.tsx`
- Create: `dawflow-ui/src/layout/VideoTrack.module.css`

**What to build:**
- Horizontal track (~80px tall) at the top of the arrangement, above tempo track
- Left header (300px): video icon, filename, FPS badge, sync indicator
- Right timeline: frame thumbnails fetched from harvid
- Frame thumbnails: fetch `http://localhost:5080/?file={path}&frame={N}&w=120&h=68`
- Only load visible frames (virtual scroll — same pattern as grid lines)
- Spacing: 1 frame thumbnail per ~120px of timeline
- Fallback: if harvid not available, show placeholder with frame numbers

**Props:**
```typescript
interface VideoTrackProps {
  pixelsPerSecond: number;
  scrollLeftPx: number;
  sampleRate: number;
  viewportWidth: number;
}
```

**Frame position math:**
```typescript
const frameDuration = 1 / fps; // seconds per frame
const frameWidthPx = frameDuration * pixelsPerSecond;
// Only render frames that fit ~120px spacing
const step = Math.max(1, Math.ceil(120 / frameWidthPx));
const firstVisibleFrame = Math.floor((scrollLeftPx / pixelsPerSecond) * fps);
const visibleFrames = Math.ceil(viewportWidth / 120) + 2;
```

---

## Task 3: Video Inspector Panel

**Files:**
- Create: `dawflow-ui/src/inspector/VideoInspector.tsx`
- Create: `dawflow-ui/src/inspector/VideoInspector.module.css`

**Layout:**
```
┌─ Video ─────────────────────┐
│ File: my_video.mp4          │
│ FPS: 23.976   Duration: 2:30│
│ Aspect: 16:9                │
│ ──────────────────────────── │
│ ⏻ Sync Enabled              │
│ Pullup: [1.000x]            │
│ Offset: [+0.000s] 🔒        │
│ ──────────────────────────── │
│ [Open Video Monitor]        │
│ [Import Video...]           │
│ [Remove Video]              │
└─────────────────────────────┘
```

**Controls:**
- Sync toggle → `daw.video.set_sync_enabled`
- Pullup value field → `daw.video.set_pullup`
- Offset field (seconds or samples) → `daw.video.set_offset`
- Offset lock toggle (local state)
- "Open Video Monitor" → launch xjadeo
- "Import Video..." → file dialog

---

## Task 4: Frame Counter in Transport Bar

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx`
- Modify: `dawflow-ui/src/layout/TransportBar.module.css`

**What to build:**
- Small frame counter display next to the existing time display
- Shows: `FR: 1234` or timecode `01:23:45:12`
- Only visible when a video is loaded
- Computed from: `frameNumber = Math.floor(position * fps)`
- SMPTE timecode: `HH:MM:SS:FF` derived from frame number and fps

---

## Task 5: Video Import Dialog

**Files:**
- Create: `dawflow-ui/src/dialogs/VideoImportDialog.tsx`
- Create: `dawflow-ui/src/dialogs/VideoImportDialog.module.css`

**What to build:**
- Modal dialog for importing video files
- File path input (or drag-drop)
- Options: auto-set session FPS, video offset, start harvid
- On import: call engine to load video file
- IPC: `daw.video.import` or use existing Ardour video import mechanism

---

## Task 6: Video Monitor Launcher (Xjadeo)

**Files:**
- Modify: `dawflow-ui/src/inspector/VideoInspector.tsx` (add launch button)

**What to build:**
- "Open Video Monitor" button in the Video Inspector
- Calls IPC to spawn xjadeo process
- Shows running indicator when xjadeo is active
- IPC: may need new engine command `daw.video.open_monitor` / `daw.video.close_monitor`

---

## Task 7: Wire Video Track into CenterZone

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` — render VideoTrack above regular tracks
- Modify: `dawflow-ui/src/stores/ui.ts` — add videoTrackVisible toggle

**Integration:**
- Add VideoTrack between the MarkerTrack and the first audio track
- Only render when video is loaded (check video store)
- Pass scrollLeftPx, pixelsPerSecond, sampleRate, viewportWidth

---

## Testing Checklist

- [ ] Video IPC wrappers call engine successfully
- [ ] Video store holds state
- [ ] Video track renders in timeline with header
- [ ] Frame thumbnails load from harvid (if running)
- [ ] Fallback shows frame numbers when harvid unavailable
- [ ] Sync toggle enables/disables video sync
- [ ] Pullup value updates in engine
- [ ] Offset changes video position
- [ ] Frame counter in transport shows current frame
- [ ] Timecode format: HH:MM:SS:FF
- [ ] Video import dialog opens
- [ ] Video monitor button works (if xjadeo installed)
