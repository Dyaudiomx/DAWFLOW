# Tier 2 — Core DAW Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire recording visualization, editing tools, audio import, locator editing, and plugin browsing so the DAW is fully usable for a basic record-edit-mix workflow.

**Architecture:** All engine IPC commands already exist. Work is entirely in the React UI — adding IPC call wrappers, rendering waveforms/MIDI from peak data, handling tool interactions on regions, and building the plugin browser UI. No C++ engine changes needed.

**Tech Stack:** React 19, TypeScript, Zustand, Canvas API (for waveforms), IPC via HTTP proxy (port 19100), WebSocket (port 3818)

**Build & Test:**
```bash
cd dawflow-ui && npm run build && ./deploy.sh
cd ../sdk/plugins/ui-shell && ./build.sh && cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
rm -rf ~/.config/dawflow/cache/com.dawflow.ui-shell/
cd ../.. && ./run-dawflow.sh
```

---

## Task 1: Region Refresh After Record-Stop

**Files:**
- Modify: `dawflow-ui/src/services/websocket.ts` (transport_roll handler)

**What:** When transport stops (especially after recording), immediately refresh regions so newly recorded audio/MIDI appears without waiting for the 3-second poll.

**Implementation:**

In `websocket.ts`, find the `transport_roll` case in `handleMessage`. When `val[0]` is false (stop), add a delayed region refresh:

```typescript
case 'transport_roll': {
  if (val[0]) {
    useTransportStore.getState().updateFromEngine({ playing: true });
  } else {
    useTransportStore.getState().updateFromEngine({ playing: false, recording: false });
    // Refresh regions after recording stops (short delay for engine to finalize)
    setTimeout(() => {
      useSessionStore.getState().fetchFromEngine();
    }, 500);
  }
  break;
}
```

**Verify:** `npm run build` passes.

---

## Task 2: Waveform Display (Audio Peaks)

**Files:**
- Modify: `dawflow-ui/src/services/ipc.ts` (add getAudioPeaks wrapper if not calling correctly)
- Create: `dawflow-ui/src/shared/WaveformDisplay.tsx`
- Create: `dawflow-ui/src/shared/WaveformDisplay.module.css`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (render WaveformDisplay in region blocks)

**Engine command:** `daw.get_audio_peaks`
- Params: `{ track_id: string, region_id: string, n_peaks?: number, channel?: number }`
- Returns: `Array<{ min: number, max: number }>` (peak values, typically -1.0 to 1.0)

**Step 1: Create WaveformDisplay component**

```tsx
// dawflow-ui/src/shared/WaveformDisplay.tsx
import React, { useEffect, useRef } from 'react';
import { ipc } from '../services/ipc';
import styles from './WaveformDisplay.module.css';

interface Props {
  trackId: string;
  regionId: string;
  color: string;
  width: number;
  height: number;
}

export const WaveformDisplay: React.FC<Props> = ({ trackId, regionId, color, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (width <= 0) return;
    const nPeaks = Math.min(Math.floor(width), 512);
    ipc.call<Array<{ min: number; max: number }>>('daw.get_audio_peaks', {
      track_id: trackId,
      region_id: regionId,
      n_peaks: nPeaks,
    }).then((peaks) => {
      const canvas = canvasRef.current;
      if (!canvas || !peaks || !Array.isArray(peaks)) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const mid = height / 2;
      const step = width / peaks.length;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < peaks.length; i++) {
        const p = peaks[i];
        const x = i * step;
        const top = mid - (p.max * mid);
        const bottom = mid - (p.min * mid);
        ctx.fillRect(x, top, Math.max(step, 1), bottom - top);
      }
    }).catch(() => {});
  }, [trackId, regionId, color, width, height]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
};
```

```css
/* dawflow-ui/src/shared/WaveformDisplay.module.css */
.canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

**Step 2: Render in CenterZone region blocks**

In `CenterZone.tsx`, replace the waveform placeholder comment inside the region `eventBody` div with:

```tsx
import { WaveformDisplay } from '../shared/WaveformDisplay';
```

Then in the region block rendering, replace:
```tsx
<div className={styles.eventBody} style={{ background: track.color, opacity: 0.6 }}>
  {/* Placeholder for waveform/MIDI visualization -- future task */}
</div>
```
With:
```tsx
<div className={styles.eventBody} style={{ background: track.color, opacity: 0.6 }}>
  {track.type === 'audio' && (
    <WaveformDisplay
      trackId={track.id}
      regionId={region.id}
      color={track.color}
      width={widthPx}
      height={track.height - 20}
    />
  )}
</div>
```

**Verify:** `npm run build` passes.

---

## Task 3: MIDI Note Display

**Files:**
- Create: `dawflow-ui/src/shared/MidiNoteDisplay.tsx`
- Create: `dawflow-ui/src/shared/MidiNoteDisplay.module.css`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (render MidiNoteDisplay in MIDI region blocks)

**Engine command:** `daw.get_midi_notes`
- Params: `{ track_id: string, region_id: string }`
- Returns: `Array<{ note: number, velocity: number, channel: number, start_beats: number, length_beats: number, id: number }>`

**Step 1: Create MidiNoteDisplay component**

```tsx
// dawflow-ui/src/shared/MidiNoteDisplay.tsx
import React, { useEffect, useState } from 'react';
import { ipc } from '../services/ipc';
import styles from './MidiNoteDisplay.module.css';

interface MidiNote {
  note: number;
  velocity: number;
  start_beats: number;
  length_beats: number;
  id: number;
}

interface Props {
  trackId: string;
  regionId: string;
  color: string;
  width: number;
  height: number;
  regionLengthBeats: number;
}

export const MidiNoteDisplay: React.FC<Props> = ({ trackId, regionId, color, width, height, regionLengthBeats }) => {
  const [notes, setNotes] = useState<MidiNote[]>([]);

  useEffect(() => {
    ipc.call<MidiNote[]>('daw.get_midi_notes', {
      track_id: trackId,
      region_id: regionId,
    }).then((data) => {
      if (Array.isArray(data)) setNotes(data);
    }).catch(() => {});
  }, [trackId, regionId]);

  if (notes.length === 0) return null;

  const minNote = Math.min(...notes.map(n => n.note));
  const maxNote = Math.max(...notes.map(n => n.note));
  const noteRange = Math.max(maxNote - minNote + 1, 12);
  const totalBeats = regionLengthBeats || 4;

  return (
    <div className={styles.container} style={{ width, height }}>
      {notes.map((n) => {
        const left = (n.start_beats / totalBeats) * width;
        const w = Math.max((n.length_beats / totalBeats) * width, 2);
        const top = ((maxNote - n.note) / noteRange) * height;
        const h = Math.max(height / noteRange, 1);
        return (
          <div
            key={n.id}
            className={styles.note}
            style={{
              left, top, width: w, height: h,
              background: color,
              opacity: 0.5 + (n.velocity / 127) * 0.5,
            }}
          />
        );
      })}
    </div>
  );
};
```

```css
/* dawflow-ui/src/shared/MidiNoteDisplay.module.css */
.container { position: relative; overflow: hidden; }
.note { position: absolute; border-radius: 1px; }
```

**Step 2: Render in CenterZone**

Add to CenterZone imports and render in region blocks alongside WaveformDisplay:
```tsx
import { MidiNoteDisplay } from '../shared/MidiNoteDisplay';
```

In the eventBody, after the audio waveform condition:
```tsx
{track.type === 'midi' && (
  <MidiNoteDisplay
    trackId={track.id}
    regionId={region.id}
    color={track.color}
    width={widthPx}
    height={track.height - 20}
    regionLengthBeats={region.length / (sampleRate * 60 / useTransportStore.getState().tempo)}
  />
)}
```

**Verify:** `npm run build` passes.

---

## Task 4: Scissor Tool (Split Region)

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (add click handler on regions when scissor active)

**Engine command:** `daw.split_region`
- Params: `{ track_id: string, region_id: string, position_samples: number }`
- Returns: `{ ok: true }`

**Implementation:**

In CenterZone, the region block already renders. Add an onClick handler that checks the active tool:

```tsx
<div
  key={region.id}
  className={styles.regionBlock}
  style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
  onClick={(e) => {
    e.stopPropagation();
    if (activeTool === 'split') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickOffsetPx = e.clientX - rect.left;
      const clickFraction = clickOffsetPx / widthPx;
      const splitSample = Math.floor(region.position + clickFraction * region.length);
      ipc.call('daw.split_region', {
        track_id: track.id,
        region_id: region.id,
        position_samples: splitSample,
      }).then(() => useSessionStore.getState().fetchFromEngine());
    } else if (activeTool === 'erase') {
      ipc.call('daw.delete_region', {
        track_id: track.id,
        region_id: region.id,
      }).then(() => useSessionStore.getState().fetchFromEngine());
    }
  }}
>
```

This handles both Task 4 (scissor) and Task 5 (eraser) in one click handler.

**Verify:** `npm run build` passes.

---

## Task 5: Eraser Tool (Delete Region)

Handled in Task 4 above — the region onClick checks for `activeTool === 'erase'` and calls `daw.delete_region`.

---

## Task 6: Region Drag/Move

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (add drag handlers on regions)

**Engine command:** `daw.move_region`
- Params: `{ track_id: string, region_id: string, position_samples: number }`
- Returns: `{ ok: true }`

**Implementation:**

Add drag state to CenterZone:
```typescript
const [draggingRegion, setDraggingRegion] = React.useState<{
  trackId: string; regionId: string; startX: number; origPosition: number;
} | null>(null);
```

On the region block, add mousedown handler (only for select tool):
```tsx
onMouseDown={(e) => {
  if (activeTool !== 'select') return;
  e.stopPropagation();
  setDraggingRegion({
    trackId: track.id,
    regionId: region.id,
    startX: e.clientX,
    origPosition: region.position,
  });
}}
```

On the trackArea div, add mousemove and mouseup:
```tsx
onMouseMove={(e) => {
  if (!draggingRegion) return;
  const deltaPx = e.clientX - draggingRegion.startX;
  const deltaSamples = Math.floor((deltaPx / PIXELS_PER_SECOND) * sampleRate);
  const newPos = Math.max(0, draggingRegion.origPosition + deltaSamples);
  // Update local region position for live preview
  useRegionStore.getState().setRegionPosition(
    draggingRegion.trackId, draggingRegion.regionId, newPos
  );
}}
onMouseUp={() => {
  if (draggingRegion) {
    const regions = useRegionStore.getState().regionsByTrack[draggingRegion.trackId] || [];
    const region = regions.find(r => r.id === draggingRegion.regionId);
    if (region) {
      ipc.call('daw.move_region', {
        track_id: draggingRegion.trackId,
        region_id: draggingRegion.regionId,
        position_samples: region.position,
      }).then(() => useSessionStore.getState().fetchFromEngine());
    }
    setDraggingRegion(null);
  }
}}
```

Also add a `setRegionPosition` action to the region store (`stores/regions.ts`):
```typescript
setRegionPosition: (trackId: string, regionId: string, position: number) => set((s) => ({
  regionsByTrack: {
    ...s.regionsByTrack,
    [trackId]: (s.regionsByTrack[trackId] || []).map(r =>
      r.id === regionId ? { ...r, position } : r
    ),
  },
})),
```

**Verify:** `npm run build` passes.

---

## Task 7: Audio Import via Drag-Drop

**Files:**
- Modify: `dawflow-ui/src/layout/CenterZone.tsx` (add drop zone)
- Modify: `dawflow-ui/src/layout/CenterZone.module.css` (drop zone styling)

**Engine command:** `daw.import_audio`
- Params: `{ filepath: string, track_id?: string, position_samples?: number }`
- Returns: `{ ok: true, region_id, name, length, placed_on_track, position }`

**Note:** WKWebView file drops give the file path. The engine reads files from the local filesystem.

**Implementation:**

Add drag-drop handlers to the trackArea div:
```tsx
onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
onDrop={(e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length === 0) return;

  // Find which track the drop landed on
  const trackEl = (e.target as HTMLElement).closest('[data-track-id]');
  const trackId = trackEl?.getAttribute('data-track-id') || '';

  // Calculate position from drop X coordinate
  const rect = e.currentTarget.getBoundingClientRect();
  const offsetPx = e.clientX - rect.left - 250;
  const seconds = Math.max(0, offsetPx / PIXELS_PER_SECOND);
  const positionSamples = Math.floor(seconds * sampleRate);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // WKWebView provides the file path
    const filepath = (file as any).path || file.name;
    ipc.call('daw.import_audio', {
      filepath,
      track_id: trackId || undefined,
      position_samples: positionSamples,
    }).then(() => useSessionStore.getState().fetchFromEngine());
  }
}}
```

Add `data-track-id` to each trackRow div:
```tsx
<div key={track.id} data-track-id={track.id} className={...}>
```

Add drop zone CSS for drag-over state (optional visual feedback):
```css
.trackArea.dragOver { outline: 2px dashed #5b9bd5; outline-offset: -2px; }
```

**Verify:** `npm run build` passes.

---

## Task 8: Locator Editing

**Files:**
- Modify: `dawflow-ui/src/layout/TransportBar.tsx` (make locator fields editable)
- Modify: `dawflow-ui/src/stores/transport.ts` (add setLeftLocator / setRightLocator)

**Engine commands:**
- `daw.set_loop_range` — `{ start_sample: number, end_sample: number }`
- `daw.set_punch_range` — `{ start_sample: number, end_sample: number }`

**Implementation:**

Add to transport store:
```typescript
setLeftLocator: (seconds: number) => {
  set({ leftLocator: seconds });
},
setRightLocator: (seconds: number) => {
  set({ rightLocator: seconds });
},
setLocatorRange: (leftSec: number, rightSec: number, sampleRate: number) => {
  set({ leftLocator: leftSec, rightLocator: rightSec });
  ipc.call('daw.set_loop_range', {
    start_sample: Math.floor(leftSec * sampleRate),
    end_sample: Math.floor(rightSec * sampleRate),
  }).catch(() => {});
},
```

In TransportBar, make locator value spans clickable/editable using the same `defaultValue` + `onBlur` pattern as the tempo field. When the user types a value (in bars.beats or seconds), convert and call `setLocatorRange`.

For a simpler v1: make the locator fields double-clickable to open a small input, parse the entered value as seconds, and call the store action.

**Verify:** `npm run build` passes.

---

## Task 9: Plugin Browser

**Files:**
- Create: `dawflow-ui/src/right-zone/PluginBrowser.tsx`
- Create: `dawflow-ui/src/right-zone/PluginBrowser.module.css`
- Modify: `dawflow-ui/src/layout/RightZone.tsx` (render PluginBrowser in VSTi tab)

**Engine command:** `daw.get_available_plugins`
- Params: none
- Returns: `{ plugins: Array<{ name, type, category, creator, unique_id }>, count: number }`

**Implementation:**

Create a searchable plugin list that shows available plugins grouped by type/category. Double-clicking a plugin loads it onto the selected track via `daw.load_plugin`.

```tsx
// dawflow-ui/src/right-zone/PluginBrowser.tsx
import React, { useEffect, useState } from 'react';
import { ipc } from '../services/ipc';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import styles from './PluginBrowser.module.css';

interface PluginInfo {
  name: string;
  type: string;
  category: string;
  creator: string;
  unique_id: string;
}

export const PluginBrowser: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);

  useEffect(() => {
    ipc.call<{ plugins: PluginInfo[]; count: number }>('daw.get_available_plugins')
      .then((data) => { if (data.plugins) setPlugins(data.plugins); })
      .catch(() => {});
  }, []);

  const filtered = plugins.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      || p.creator.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = [...new Set(plugins.map(p => p.type))];

  const handleLoadPlugin = (plugin: PluginInfo) => {
    if (!selectedTrackId) return;
    ipc.call('daw.load_plugin', {
      track_id: selectedTrackId,
      plugin_name: plugin.name,
    }).then(() => useSessionStore.getState().fetchFromEngine());
  };

  return (
    <div className={styles.browser}>
      <input
        className={styles.search}
        type="text"
        placeholder="Search plugins..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <div className={styles.filters}>
        <button className={typeFilter === 'all' ? styles.filterActive : styles.filter}
          onClick={() => setTypeFilter('all')}>All ({plugins.length})</button>
        {types.map((t) => (
          <button key={t} className={typeFilter === t ? styles.filterActive : styles.filter}
            onClick={() => setTypeFilter(t)}>{t}</button>
        ))}
      </div>
      <div className={styles.list}>
        {filtered.slice(0, 200).map((p, i) => (
          <div key={i} className={styles.pluginRow} onDoubleClick={() => handleLoadPlugin(p)}>
            <span className={styles.pluginType}>{p.type}</span>
            <span className={styles.pluginName}>{p.name}</span>
            <span className={styles.pluginCreator}>{p.creator}</span>
          </div>
        ))}
        {filtered.length === 0 && <div className={styles.empty}>No plugins found</div>}
      </div>
      {!selectedTrackId && <div className={styles.hint}>Select a track to load plugins</div>}
    </div>
  );
};
```

CSS should follow existing dark theme (dark background, light text, hover states).

In `RightZone.tsx`, replace the VSTi tab placeholder with `<PluginBrowser />`.

**Verify:** `npm run build` passes.

---

## Task 10: Insert Slots in Inspector (Live Plugin Data)

**Files:**
- Modify: `dawflow-ui/src/inspector/InsertSlots.tsx` (fetch real plugin data)

**Engine command:** `daw.get_track_plugins`
- Params: `{ track_id: string }`
- Returns: `{ plugins: Array<{ processor_id, name, enabled, index }> }`

**Implementation:**

Rewrite InsertSlots to accept a `trackId` prop and fetch real data:

```tsx
interface Props {
  trackId: string;
}

export const InsertSlots: React.FC<Props> = ({ trackId }) => {
  const [plugins, setPlugins] = useState<Array<{
    processor_id: string; name: string; enabled: boolean; index: number;
  }>>([]);

  useEffect(() => {
    if (!trackId) return;
    ipc.call<{ plugins: typeof plugins }>('daw.get_track_plugins', { track_id: trackId })
      .then((data) => { if (data.plugins) setPlugins(data.plugins); })
      .catch(() => {});
  }, [trackId]);

  const handleToggleBypass = (procId: string, enabled: boolean) => {
    ipc.call('daw.set_plugin_enabled', {
      track_id: trackId,
      processor_id: procId,
      enabled: !enabled,
    }).then(() => {
      // Refresh
      ipc.call<{ plugins: typeof plugins }>('daw.get_track_plugins', { track_id: trackId })
        .then((data) => { if (data.plugins) setPlugins(data.plugins); });
    });
  };

  // Merge real plugins with empty slots (8 total)
  const slots = Array.from({ length: 8 }, (_, i) => plugins[i] || null);

  return (
    <div className={styles.insertSlots}>
      <span className={styles.sectionLabel}>Pre-Fader</span>
      {slots.map((slot, i) => (
        <React.Fragment key={i}>
          {i === 6 && (
            <>
              <div className={styles.separator} />
              <span className={styles.sectionLabel}>Post-Fader</span>
            </>
          )}
          <div className={styles.slot}>
            <span
              className={`${styles.bypassDot} ${slot?.enabled ? styles.bypassDotActive : ''}`}
              onClick={() => slot && handleToggleBypass(slot.processor_id, slot.enabled)}
            />
            <span className={styles.slotIndex}>{i + 1}</span>
            <span className={`${styles.pluginName} ${slot ? styles.pluginNameLoaded : ''}`}>
              {slot?.name || 'empty'}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
```

Update callers in TrackInspector.tsx to pass `trackId`:
```tsx
<InsertSlots trackId={track.id} />
```

**Verify:** `npm run build` passes.

---

## Final: Full Build + Deploy + Test

```bash
cd dawflow-ui && npm run build && ./deploy.sh
cd ../sdk/plugins/ui-shell && ./build.sh && cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
rm -rf ~/.config/dawflow/cache/com.dawflow.ui-shell/
cd ../.. && ./run-dawflow.sh
```

**Manual test checklist:**
- [ ] Record audio on a track, stop — regions appear within 1 second
- [ ] Audio regions show waveform visualization
- [ ] MIDI regions show note blocks
- [ ] Select scissors tool, click on a region — splits at click point
- [ ] Select eraser tool, click on a region — region deleted
- [ ] Select arrow tool, drag a region — region moves, commits on mouse up
- [ ] Drag audio file from Finder onto a track — imports and creates region
- [ ] Right zone VSTi tab shows searchable plugin list
- [ ] Double-click a plugin in the browser — loads onto selected track
- [ ] Inspector insert slots show loaded plugins with bypass toggle
- [ ] Locator fields are editable
