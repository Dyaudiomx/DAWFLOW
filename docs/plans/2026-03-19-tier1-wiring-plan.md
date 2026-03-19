# Tier 1 — "Make It Feel Real" Wiring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire ~15 placeholder UI features to the engine so the DAW feels functional — every button, field, and indicator that already has UI should actually do something.

**Architecture:** All changes are in the React UI (`dawflow-ui/src/`). Most tasks are 1-10 line changes — connecting existing UI elements to existing IPC/WebSocket commands. No engine C++ changes needed (all commands already exist).

**Tech Stack:** React 19, TypeScript, Zustand stores, WebSocket (port 3818), IPC HTTP proxy (port 19100)

**Build & Test:**
```bash
cd dawflow-ui && npm run build    # TypeScript check + Vite build
./deploy.sh                       # Deploy to engine + ui-shell
cd ../sdk/plugins/ui-shell && ./build.sh && cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
rm -rf ~/.config/dawflow/cache/com.dawflow.ui-shell/
# Then launch with ./run-dawflow.sh from project root
```

---

## Task 1: Wire Solo to IPC

**Files:**
- Modify: `dawflow-ui/src/stores/session.ts` (setTrackSolo action)

**What:** Solo currently only updates local state. The engine has `daw.set_track_solo` via IPC. Wire it up.

**Step 1: Add IPC import and wire the call**

In `stores/session.ts`, add `import { ipc } from '../services/ipc';` at the top (if not already imported).

Then change `setTrackSolo` from:
```typescript
setTrackSolo: (id, solo) => set((s) => {
  // Solo doesn't have a direct WebSocket command in Ardour's protocol yet.
  // For now, just update local state.
  return { tracks: s.tracks.map((t) => t.id === id ? { ...t, solo } : t) };
}),
```

To:
```typescript
setTrackSolo: (id, solo) => {
  ipc.setTrackSolo(id, solo).catch(() => {});
  set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, solo } : t)
  }));
},
```

**Step 2: Verify build**

Run: `cd dawflow-ui && npm run build`

**Step 3: Commit**
```
feat: wire solo button to engine via IPC
```

---

## Task 2: Wire Record-Enable to IPC

**Files:**
- Modify: `dawflow-ui/src/stores/session.ts` (setTrackRecord action)
- Modify: `dawflow-ui/src/services/ipc.ts` (add setTrackRecord wrapper)

**Step 1: Add IPC wrapper in ipc.ts**

After the `setTrackSolo` function, add:
```typescript
async function setTrackRecord(trackId: string, enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_record', { track_id: trackId, enabled });
}
```

Add `setTrackRecord` to the `ipc` export object under the `// Tracks` section.

**Step 2: Wire in session store**

Change `setTrackRecord` from:
```typescript
setTrackRecord: (id, enabled) => set((s) => ({
  tracks: s.tracks.map((t) => t.id === id ? { ...t, recordEnabled: enabled } : t)
})),
```

To:
```typescript
setTrackRecord: (id, enabled) => {
  ipc.setTrackRecord(id, enabled).catch(() => {});
  set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, recordEnabled: enabled } : t)
  }));
},
```

**Step 3: Verify build, commit**
```
feat: wire record-enable button to engine via IPC
```

---

## Task 3: Wire Monitor to IPC

**Files:**
- Modify: `dawflow-ui/src/services/ipc.ts` (add setTrackMonitor wrapper)
- Modify: `dawflow-ui/src/stores/session.ts` (setTrackMonitor action)

**Step 1: Add IPC wrapper**

The engine command is `daw.set_track_monitoring`. Add to ipc.ts:
```typescript
async function setTrackMonitor(trackId: string, enabled: boolean): Promise<void> {
  await ipcCall<unknown>('daw.set_track_monitoring', { track_id: trackId, enabled });
}
```

Add to the `ipc` export object.

**Step 2: Wire in session store**

Change `setTrackMonitor` to call `ipc.setTrackMonitor(id, enabled).catch(() => {})` before `set(...)`, same pattern as solo/record.

**Step 3: Verify build, commit**
```
feat: wire monitor button to engine via IPC
```

---

## Task 4: Wire Track Color

**Files:**
- Modify: `dawflow-ui/src/stores/session.ts` (setTrackColor action)
- Modify: `dawflow-ui/src/services/ipc.ts` (add setTrackColor wrapper)
- Modify: `dawflow-ui/src/dialogs/AddTrackDialog.tsx` (send color after creating track)

**Step 1: Add IPC wrapper**

The engine command is `daw.set_track_color` and expects `{ track_id, color }` where color is a hex string. Add to ipc.ts:
```typescript
async function setTrackColor(trackId: string, color: string): Promise<void> {
  await ipcCall<unknown>('daw.set_track_color', { track_id: trackId, color });
}
```

Add to the `ipc` export object.

**Step 2: Wire session store setTrackColor**

Change `setTrackColor` to also call IPC:
```typescript
setTrackColor: (id, color) => {
  ipc.setTrackColor(id, color).catch(() => {});
  set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, color } : t)
  }));
},
```

**Step 3: Send color after track creation in AddTrackDialog**

In `AddTrackDialog.tsx`, after the `for` loop that creates tracks and after `fetchFromEngine()`, the new tracks will be in the store. Since the IPC add commands are fire-and-forget (queued), we can't get the track ID back reliably. For now, color is applied via the session store when the user selects a track and changes its color in the inspector. The color picker in AddTrackDialog sets a default but won't apply on create (acceptable for now).

**Step 4: Verify build, commit**
```
feat: wire track color changes to engine via IPC
```

---

## Task 5: Wire CPU/Disk Load Polling

**Files:**
- Modify: `dawflow-ui/src/services/websocket.ts` (add CPU load polling in connectToEngine)

**Step 1: Add CPU load polling**

In `websocket.ts`, inside the `ws.onopen` callback, after the existing `pollTimer` setup (around line 59), add:
```typescript
// Poll CPU load every 2 seconds
const cpuPollTimer = setInterval(() => {
  if (ipcEnabled) {
    import('../services/ipc').then(({ ipc }) => {
      ipc.getCpuLoad().then((info) => {
        useTransportStore.getState().setCpuLoad(info.cpu_load);
      }).catch(() => {});
    });
  }
}, 2000);
```

Actually, better approach — import ipc at the top of websocket.ts:
```typescript
import { ipc } from './ipc';
```

Then in `ws.onopen`, after the track poll timer:
```typescript
// Poll CPU load every 2 seconds for performance meters
setInterval(() => {
  if (ipcEnabled) {
    ipc.getCpuLoad().then((info) => {
      useTransportStore.getState().setCpuLoad(info.cpu_load);
    }).catch(() => {});
  }
}, 2000);
```

And in `ws.onclose`, clear it (or just let it run — the `ipcEnabled` guard prevents calls when disconnected).

**Step 2: Verify build, commit**
```
feat: poll CPU load from engine for performance meters
```

---

## Task 6: Wire Tempo Arrows + Editable BPM Field

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx` (tempo field and arrows)
- Modify: `dawflow-ui/src/layout/TransportBar.module.css` (tempo input styling)

**Step 1: Make tempo editable**

In `TransportBar.tsx`, replace the tempo field block (the `<span className={styles.tempoVal}>` and the two arrow buttons) with:
```tsx
<div className={styles.tempoField}>
  <input
    type="number"
    className={styles.tempoVal}
    value={transport.tempo.toFixed(2)}
    onChange={(e) => {
      const v = parseFloat(e.target.value);
      if (v >= 20 && v <= 300) transport.setTempo(v);
    }}
    onKeyDown={(e) => e.stopPropagation()}
    step="1"
    min="20"
    max="300"
  />
  <span className={styles.tempoUpDown}>
    <button className={styles.tempoArrow} onClick={() => transport.setTempo(Math.min(300, transport.tempo + 1))}>&#9650;</button>
    <button className={styles.tempoArrow} onClick={() => transport.setTempo(Math.max(20, transport.tempo - 1))}>&#9660;</button>
  </span>
</div>
```

**Step 2: Style the input**

In `TransportBar.module.css`, update `.tempoVal` to work as an input:
```css
.tempoVal {
  font-size: 12px;
  font-family: var(--font-mono);
  color: #DDD;
  font-weight: 600;
  width: 60px;
  background: transparent;
  border: none;
  outline: none;
  text-align: right;
  -moz-appearance: textfield;
}
.tempoVal::-webkit-outer-spin-button,
.tempoVal::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.tempoVal:focus {
  color: #FFF;
}
```

**Step 3: Verify build, commit**
```
feat: make BPM field editable with up/down arrows in transport bar
```

---

## Task 7: Wire Tool Cursors

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (bind activeTool to cursor)
- Modify: `dawflow-ui/src/layout/CenterZone.module.css` (add cursor classes)

**Step 1: Add cursor CSS classes**

Add to `CenterZone.module.css`:
```css
/* Tool cursors */
.toolCursorSelect { cursor: default; }
.toolCursorRange { cursor: text; }
.toolCursorSplit { cursor: crosshair; }
.toolCursorGlue { cursor: grab; }
.toolCursorErase { cursor: not-allowed; }
.toolCursorZoom { cursor: zoom-in; }
.toolCursorMute { cursor: pointer; }
.toolCursorDraw { cursor: crosshair; }
.toolCursorLine { cursor: crosshair; }
.toolCursorPlay { cursor: pointer; }
.toolCursorColor { cursor: copy; }
.toolCursorComp { cursor: col-resize; }
.toolCursorTimewarp { cursor: ew-resize; }
```

**Step 2: Bind activeTool in CenterZone.tsx**

Add to the component:
```typescript
const activeTool = useUIStore((s) => s.activeTool);
```

Build a cursor class name:
```typescript
const toolCursorClass = styles[`toolCursor${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}`] || '';
```

Apply to the `trackArea` div:
```tsx
<div className={`${styles.trackArea} ${toolCursorClass}`} style={{ position: 'relative' }} ...>
```

**Step 3: Verify build, commit**
```
feat: change cursor based on active tool in center zone
```

---

## Task 8: Wire Seeking (Click on Ruler/Timeline)

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (add click handler on ruler)
- Modify: `dawflow-ui/src/services/ipc.ts` (add transport_locate wrapper)

**Step 1: Add IPC wrapper for seeking**

Add to ipc.ts:
```typescript
async function transportLocate(position: number): Promise<void> {
  await ipcCall<unknown>('daw.transport_locate', { sample_position: Math.floor(position) });
}
```

Add `transportLocate` to the `ipc` export object under `// Transport`.

**Step 2: Add click handler on ruler**

In CenterZone.tsx, get the sample rate from session store:
```typescript
const sampleRate = useSessionStore((s) => s.sampleRate);
```

Add onClick to the `rulerTimeline` div:
```tsx
<div className={styles.rulerTimeline} onClick={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const offsetPx = e.clientX - rect.left;
  const seconds = offsetPx / PIXELS_PER_SECOND;
  const samples = Math.floor(seconds * sampleRate);
  ipc.transportLocate(samples).catch(() => {});
  useTransportStore.getState().setPosition(seconds);
}}>
```

**Step 3: Verify build, commit**
```
feat: click on ruler to seek playhead position
```

---

## Task 9: Wire Track Rename (Double-Click)

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (add inline rename)
- Modify: `dawflow-ui/src/layout/CenterZone.module.css` (add input style)

**Step 1: Add rename state**

At the top of the `CenterZone` component, add:
```typescript
const [editingTrackId, setEditingTrackId] = React.useState<string | null>(null);
const [editingName, setEditingName] = React.useState('');
```

**Step 2: Replace track name span with conditional input**

Replace:
```tsx
<span className={styles.trackName}>{track.name}</span>
```

With:
```tsx
{editingTrackId === track.id ? (
  <input
    autoFocus
    className={styles.trackNameInput}
    value={editingName}
    onChange={(e) => setEditingName(e.target.value)}
    onClick={(e) => e.stopPropagation()}
    onBlur={() => {
      if (editingName.trim()) {
        ipc.renameTrack(track.id, editingName.trim()).then(() =>
          useSessionStore.getState().fetchFromEngine()
        );
      }
      setEditingTrackId(null);
    }}
    onKeyDown={(e) => {
      e.stopPropagation();
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      if (e.key === 'Escape') setEditingTrackId(null);
    }}
  />
) : (
  <span
    className={styles.trackName}
    onDoubleClick={(e) => {
      e.stopPropagation();
      setEditingTrackId(track.id);
      setEditingName(track.name);
    }}
  >
    {track.name}
  </span>
)}
```

**Step 3: Add CSS for track name input**

Add to `CenterZone.module.css`:
```css
.trackNameInput {
  background: #1e1e22;
  border: 1px solid #5b9bd5;
  border-radius: 2px;
  color: #eee;
  font-size: 11px;
  font-family: inherit;
  padding: 1px 4px;
  width: 100px;
  outline: none;
}
```

**Step 4: Verify build, commit**
```
feat: double-click track name to rename via IPC
```

---

## Task 10: Wire Toolbar State Buttons (Global M/S/R/W)

**Files:**
- Modify: `dawflow-ui/src/layout/Toolbar.tsx` (add onClick to M/S/L/R/W/A buttons)

**Step 1: Add click handlers**

The toolbar state buttons (M, S, L, R, W, A) are global toggles. In Cubase these toggle the global mute/solo/listen/read/write/automation states. For now, wire them to toggle all tracks:

Replace the state buttons section:
```tsx
<div className={styles.section}>
  <button className={styles.stateBtn} title="Mute">M</button>
  <button className={styles.stateBtn} title="Solo">S</button>
  <button className={styles.stateBtn} title="Listen">L</button>
  <button className={styles.stateBtn} title="Read">R</button>
  <button className={styles.stateBtn} title="Write">W</button>
  <button className={styles.stateBtn} title="Automation">A</button>
</div>
```

With:
```tsx
<div className={styles.section}>
  <button className={styles.stateBtn} title="Unmute All Tracks"
    onClick={() => { const s = useSessionStore.getState(); s.tracks.forEach(t => { if (t.muted) s.setTrackMute(t.id, false); }); }}>M</button>
  <button className={styles.stateBtn} title="Unsolo All Tracks"
    onClick={() => { const s = useSessionStore.getState(); s.tracks.forEach(t => { if (t.solo) s.setTrackSolo(t.id, false); }); }}>S</button>
  <button className={styles.stateBtn} title="Listen">L</button>
  <button className={styles.stateBtn} title="Read">R</button>
  <button className={styles.stateBtn} title="Write">W</button>
  <button className={styles.stateBtn} title="Automation">A</button>
</div>
```

**Step 2: Verify build, commit**
```
feat: wire global Mute/Solo reset buttons in toolbar
```

---

## Task 11: Wire Go-To-Start to Engine (Transport Locate)

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx` (wire Go to Start button)
- Modify: `dawflow-ui/src/stores/transport.ts` (call IPC locate)

**Step 1: Wire the Go to Start button**

In TransportBar.tsx, the "Go to Start" button calls `transport.setPosition(0)`. But `setPosition` only updates local state — it doesn't send a locate command to the engine.

Import ipc in TransportBar.tsx:
```typescript
import { ipc } from '../services/ipc';
```

Change the Go to Start button onClick from:
```tsx
onClick={() => transport.setPosition(0)}
```
To:
```tsx
onClick={() => { ipc.transportLocate(0).catch(() => {}); transport.setPosition(0); }}
```

Do the same for the "Return to Zero" button.

**Step 2: Verify build, commit**
```
feat: wire Go to Start button to engine transport_locate
```

---

## Task 12: Wire Rewind/Forward Buttons

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx`

**Step 1: Add click handlers for rewind/forward**

Replace the Rewind button:
```tsx
<button className={styles.tBtn} title="Rewind">
```
With:
```tsx
<button className={styles.tBtn} title="Rewind" onClick={() => {
  const pos = useTransportStore.getState().position;
  const newPos = Math.max(0, pos - 5);
  ipc.transportLocate(Math.floor(newPos * (useSessionStore.getState().sampleRate || 48000))).catch(() => {});
  useTransportStore.getState().setPosition(newPos);
}}>
```

Same pattern for Forward but `pos + 5`.

**Step 2: Verify build, commit**
```
feat: wire rewind/forward buttons to seek 5 seconds
```

---

## Task 13: Wire Record Mode Dropdown

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx` (fix empty onChange)

**Step 1: Wire the record mode select**

Replace:
```tsx
<select className={styles.select} value={transport.recordMode} onChange={() => {}}>
```

With:
```tsx
<select className={styles.select} value={transport.recordMode}
  onChange={(e) => useTransportStore.getState().setRecordMode?.(e.target.value as typeof transport.recordMode)}>
```

Note: `setRecordMode` doesn't exist in the transport store yet. Add it:

In `stores/transport.ts`, add to the interface:
```typescript
setRecordMode: (mode: TransportStore['recordMode']) => void;
```

Add to the store:
```typescript
setRecordMode: (mode) => set({ recordMode: mode }),
```

This is local-only for now (Ardour's WebSocket protocol doesn't expose record modes). But at least the dropdown will work.

**Step 2: Verify build, commit**
```
feat: wire record mode dropdown to local state
```

---

## Task 14: Add Missing Import for ipc in Session Store

**Files:**
- Modify: `dawflow-ui/src/stores/session.ts`

**Step 1: Check and add ipc import**

Verify the session store has `import { ipc } from '../services/ipc';` at the top. If it doesn't have it, add it. This is needed for Tasks 1-4 above.

---

## Final: Full Build + Deploy + Test

After all tasks:

```bash
cd dawflow-ui && npm run build && ./deploy.sh
cd ../sdk/plugins/ui-shell && ./build.sh && cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
rm -rf ~/.config/dawflow/cache/com.dawflow.ui-shell/
cd ../.. && ./run-dawflow.sh
```

**Manual test checklist:**
- [ ] Click Solo on a track — track solos in engine
- [ ] Click Record (R) on a track — track arms in engine
- [ ] Click Monitor on a track — monitoring toggles in engine
- [ ] Change track color in inspector — color persists
- [ ] CPU meter bar shows real values (not stuck at 0%)
- [ ] Edit BPM in transport bar — tempo changes
- [ ] Click tempo up/down arrows — tempo increments/decrements
- [ ] Select scissors tool — cursor changes to crosshair in timeline
- [ ] Click on ruler — playhead moves to click position
- [ ] Double-click track name — rename input appears, Enter saves
- [ ] Press Space — play/stop toggles
- [ ] Click Go to Start — playhead returns to 0
- [ ] Click Rewind — playhead moves back 5 seconds
- [ ] Global M button in toolbar — unmutes all tracks
- [ ] Global S button in toolbar — unsolos all tracks
