# Full React UI Replacement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the React UI to real engine data via IPC bridge, remove all mock data, add AI Chat panel — making DAWFLOW a functional DAW with a fully React-driven interface.

**Architecture:** Hybrid approach. Real-time streaming (meters, transport) stays on the existing Ardour WebSocket (port 3818). All commands and queries go through the ui-shell plugin's HTTP API (`POST http://localhost:19100/api/command`) which already proxies JSON-RPC 2.0 to the engine via Unix socket. IPC events are handled by polling after mutations.

**Tech Stack:** React 19, TypeScript, Zustand, Vite 8, C++17 (ui-shell plugin)

---

## Task 1: IPC Command Service for React

Create the client-side service that sends JSON-RPC commands to the engine through the ui-shell plugin's existing HTTP endpoint.

**Files:**
- Create: `dawflow-ui/src/services/ipc.ts`
- Modify: `dawflow-ui/src/stores/connection.ts`

**Step 1: Create the IPC service**

```typescript
// dawflow-ui/src/services/ipc.ts

import { useConnectionStore } from '../stores/connection';

let ipcBaseUrl = 'http://localhost:19100';

export function setIpcBaseUrl(url: string) {
  ipcBaseUrl = url;
}

function getIpcUrl(): string {
  // When served from ui-shell (port 19100), use same origin
  if (typeof window !== 'undefined' && window.location.port === '19100') {
    return window.location.origin;
  }
  return ipcBaseUrl;
}

let nextId = 1;

export async function ipcCall<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = `${getIpcUrl()}/api/command`;
  const body = JSON.stringify({ method, params });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    throw new Error(`IPC error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result && result.error) {
    throw new Error(`IPC method error: ${JSON.stringify(result.error)}`);
  }

  return result as T;
}

// ─── Convenience wrappers ───

export interface EngineTrack {
  id: string;
  name: string;
  gain_db: number;
  muted: boolean;
  soloed: boolean;
  rec_enabled?: boolean;
  type?: string;
}

export interface SessionInfo {
  name: string;
  sample_rate: number;
  playing: boolean;
  recording: boolean;
  position: number;
  dirty: boolean;
}

export const ipc = {
  // Session
  getSessionInfo: () => ipcCall<SessionInfo>('daw.get_session_info'),
  saveSession: () => ipcCall('daw.save_session'),

  // Tracks
  getTracks: () => ipcCall<EngineTrack[]>('daw.get_tracks'),
  addAudioTrack: (name?: string) => ipcCall('daw.add_audio_track', name ? { name } : {}),
  addMidiTrack: (name?: string) => ipcCall('daw.add_midi_track', name ? { name } : {}),
  addBus: (name?: string) => ipcCall('daw.add_bus', name ? { name } : {}),
  removeTrack: (trackId: string) => ipcCall('daw.remove_track', { track_id: trackId }),
  renameTrack: (trackId: string, name: string) => ipcCall('daw.rename_track', { track_id: trackId, name }),
  setTrackGain: (trackId: string, db: number) => ipcCall('daw.set_track_gain', { track_id: trackId, gain_db: db }),
  setTrackMute: (trackId: string, muted: boolean) => ipcCall('daw.set_track_mute', { track_id: trackId, muted }),
  setTrackSolo: (trackId: string, soloed: boolean) => ipcCall('daw.set_track_solo', { track_id: trackId, soloed }),

  // Transport
  play: () => ipcCall('daw.transport_play'),
  stop: () => ipcCall('daw.transport_stop'),
  setTempo: (bpm: number) => ipcCall('daw.set_tempo', { bpm }),

  // Undo/Redo
  undo: () => ipcCall('daw.undo'),
  redo: () => ipcCall('daw.redo'),
  getUndoHistory: () => ipcCall<{ undo_depth: number; redo_depth: number; next_undo?: string; next_redo?: string }>('daw.get_undo_history'),

  // Markers
  getMarkers: () => ipcCall<Array<{ name: string; position: number; type: string }>>('daw.get_markers'),
  addMarker: (name: string, position: number) => ipcCall('daw.add_marker', { name, position }),

  // Regions
  getRegions: (trackId: string) => ipcCall<Array<{
    id: string; name: string; position: number; length: number; start: number; type: string;
  }>>('daw.get_regions', { track_id: trackId }),

  // Audio peaks (for waveform display)
  getAudioPeaks: (regionId: string, width: number) =>
    ipcCall<{ peaks: number[] }>('daw.get_audio_peaks', { region_id: regionId, width }),

  // MIDI
  getMidiNotes: (regionId: string) =>
    ipcCall<Array<{ note: number; velocity: number; start: number; length: number; channel: number }>>('daw.get_midi_notes', { region_id: regionId }),

  // Plugins
  getAvailablePlugins: () =>
    ipcCall<Array<{ id: string; name: string; type: string; category: string }>>('daw.get_available_plugins'),
  loadPlugin: (trackId: string, pluginId: string) =>
    ipcCall('daw.load_plugin', { track_id: trackId, plugin_id: pluginId }),
  getPluginParameters: (trackId: string, pluginIndex: number) =>
    ipcCall<Array<{ id: number; name: string; value: number; min: number; max: number }>>('daw.get_plugin_parameters', { track_id: trackId, plugin_index: pluginIndex }),

  // Metering
  getCpuLoad: () => ipcCall<{ load: number }>('daw.get_cpu_load'),
  getMasterPeak: () => ipcCall<{ left: number; right: number }>('daw.get_master_peak'),

  // Generic
  call: ipcCall,
};
```

**Step 2: Add IPC connection status to connection store**

In `dawflow-ui/src/stores/connection.ts`, the store already has `ipcConnected` and `setIpcConnected`. No changes needed.

**Step 3: Verify build**

Run: `cd dawflow-ui && npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
cd "dawflow-ui"
git add src/services/ipc.ts
git commit -m "feat: add IPC command service for engine communication"
```

---

## Task 2: Wire Real Track List from Engine

Replace the hardcoded DEMO_TRACKS with real tracks fetched from the engine on connection.

**Files:**
- Modify: `dawflow-ui/src/stores/session.ts`
- Modify: `dawflow-ui/src/services/websocket.ts`

**Step 1: Modify session store — remove demo data, add fetch action**

In `dawflow-ui/src/stores/session.ts`:

1. Delete the entire `DEMO_TRACKS` array (lines 5-16)
2. Change `tracks: DEMO_TRACKS` to `tracks: []` (empty on load)
3. Add `loading: boolean` state field (default `true`)
4. Add `fetchFromEngine` action:

```typescript
import { ipc, type EngineTrack } from '../services/ipc';
import type { Track, TrackType } from '../types/track';

function engineTrackToTrack(et: EngineTrack, index: number): Track {
  const COLORS: Record<string, string> = {
    audio: '#5B7FA5',
    midi: '#3A8C8C',
    instrument: '#B8963A',
    bus: '#6A9FD4',
    vca: '#8A6AAE',
  };
  const type = (et.type || 'audio') as TrackType;
  return {
    id: et.id,
    name: et.name,
    type,
    color: COLORS[type] || '#5B7FA5',
    height: 65,
    muted: et.muted,
    solo: et.soloed,
    recordEnabled: et.rec_enabled || false,
    monitorEnabled: false,
    readAutomation: false,
    writeAutomation: false,
    frozen: false,
    locked: false,
    visible: true,
    volume: et.gain_db !== undefined ? Math.pow(10, et.gain_db / 20) * 0.75 : 0.75,
    pan: 0,
    inputRouting: '',
    outputRouting: '',
  };
}

// In the store, add:
fetchFromEngine: async () => {
  try {
    const [engineTracks, sessionInfo] = await Promise.all([
      ipc.getTracks(),
      ipc.getSessionInfo(),
    ]);
    set({
      tracks: engineTracks.map(engineTrackToTrack),
      sessionName: sessionInfo.name || 'Untitled',
      sampleRate: sessionInfo.sample_rate || 48000,
      loading: false,
    });
  } catch (e) {
    console.error('[DAWFLOW] Failed to fetch session data:', e);
    set({ loading: false });
  }
},
```

**Step 2: Trigger fetch on WebSocket connect**

In `dawflow-ui/src/services/websocket.ts`, after `useConnectionStore.getState().setWsConnected(true)` in the `ws.onopen` handler (~line 50), add:

```typescript
// Fetch real track data from engine via IPC
useSessionStore.getState().fetchFromEngine();
```

**Step 3: Handle strip_description for dynamic track creation**

In `dawflow-ui/src/services/websocket.ts`, update the `strip_description` handler to create tracks if they don't exist yet (the engine sends strip_description for all strips on connect):

```typescript
case 'strip_description': {
  const stripId = addr[0];
  const name = val[0] as string;
  const session = useSessionStore.getState();
  const track = session.tracks[stripId];
  if (track) {
    if (track.name !== name) session.setTrackName(track.id, name);
  }
  // If track doesn't exist yet, fetchFromEngine will handle it
  break;
}
```

**Step 4: Build and verify**

Run: `cd dawflow-ui && npm run build`
Expected: Clean build. When launched with engine running, tracks should populate from real session.

**Step 5: Commit**

```bash
git add src/stores/session.ts src/services/websocket.ts
git commit -m "feat: wire real track list from engine, remove demo data"
```

---

## Task 3: Wire Live Meters to Mixer

Route the existing `strip_meter` WebSocket events to the mixer and track components.

**Files:**
- Modify: `dawflow-ui/src/stores/session.ts` — add meter fields to Track type
- Modify: `dawflow-ui/src/services/websocket.ts` — route strip_meter events
- Modify: `dawflow-ui/src/lower-zone/LowerMixConsole.tsx` — use real meter data

**Step 1: Add meter data to session store**

In `dawflow-ui/src/stores/session.ts`, add to the SessionStore interface and implementation:

```typescript
// Add action:
setTrackMeterLevel: (id: string, level: number) => void;
```

Also add `meterLevel: number` (default `0`) to the Track type in `types/track.ts`.

Implementation:
```typescript
setTrackMeterLevel: (id, level) => set((s) => ({
  tracks: s.tracks.map((t) => t.id === id ? { ...t, meterLevel: level } : t)
})),
```

**Step 2: Route strip_meter events in websocket.ts**

In `dawflow-ui/src/services/websocket.ts`, update the `strip_meter` handler:

```typescript
case 'strip_meter': {
  const stripId = addr[0];
  const level = val[0] as number; // dB value from engine
  const session = useSessionStore.getState();
  const track = session.tracks[stripId];
  if (track) {
    // Convert dB to 0-1 range: -60dB = 0, 0dB = 1
    const normalized = Math.max(0, Math.min(1, (level + 60) / 60));
    session.setTrackMeterLevel(track.id, normalized);
  }
  break;
}
```

**Step 3: Update LowerMixConsole to use real meter data**

In `dawflow-ui/src/lower-zone/LowerMixConsole.tsx`:

1. Remove the `getMeterDelay` and `getMeterDuration` functions (lines 6-14)
2. In the `ChannelStrip`, add a `meterLevel` prop
3. Replace the animated CSS meter with a real level bar:

```tsx
// Replace meterSim div with:
<div className={styles.meterWrap}>
  <div className={styles.meterReal}>
    <div
      className={styles.meterRealFill}
      style={{ height: `${(meterLevel || 0) * 100}%`, opacity: muted ? 0.15 : 1 }}
    />
  </div>
</div>
```

4. Pass `meterLevel={track.meterLevel || 0}` from the parent to each ChannelStrip.

**Step 4: Add CSS for real meter**

In `LowerMixConsole.module.css`, add:
```css
.meterReal {
  width: 4px;
  height: 100%;
  background: var(--surface-3);
  border-radius: 1px;
  overflow: hidden;
  display: flex;
  flex-direction: column-reverse;
}
.meterRealFill {
  width: 100%;
  background: linear-gradient(to top, #4CAF50 0%, #4CAF50 70%, #FFC107 70%, #FFC107 85%, #FF5722 85%, #FF5722 100%);
  transition: height 80ms linear;
}
```

**Step 5: Build and verify**

Run: `cd dawflow-ui && npm run build`
Expected: Meters now show real levels when audio is playing through the engine.

**Step 6: Commit**

```bash
git add src/stores/session.ts src/types/track.ts src/services/websocket.ts src/lower-zone/LowerMixConsole.tsx src/lower-zone/LowerMixConsole.module.css
git commit -m "feat: wire live meter data from engine to mixer"
```

---

## Task 4: Wire Undo/Redo and Session Save

Connect the toolbar Undo/Redo buttons and add session save functionality.

**Files:**
- Modify: `dawflow-ui/src/layout/Toolbar.tsx`

**Step 1: Wire undo/redo buttons**

In `dawflow-ui/src/layout/Toolbar.tsx`, import the IPC service and wire the buttons:

```typescript
import { ipc } from '../services/ipc';
```

Replace the undo/redo buttons (~line 72-77):
```tsx
<button className={styles.btn} title="Undo (Ctrl+Z)"
  onClick={() => ipc.undo().then(() => useSessionStore.getState().fetchFromEngine())}>
  <SvgIcon name="undo" size={16} />
</button>
<button className={styles.btn} title="Redo (Ctrl+Shift+Z)"
  onClick={() => ipc.redo().then(() => useSessionStore.getState().fetchFromEngine())}>
  <SvgIcon name="redo" size={16} />
</button>
```

**Step 2: Add keyboard shortcuts**

Add a `useEffect` in the Toolbar (or in App.tsx) for Ctrl+Z / Ctrl+Shift+Z / Ctrl+S:

```typescript
React.useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      ipc.undo().then(() => useSessionStore.getState().fetchFromEngine());
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      ipc.redo().then(() => useSessionStore.getState().fetchFromEngine());
    } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      ipc.saveSession();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

**Step 3: Build and verify**

Run: `cd dawflow-ui && npm run build`

**Step 4: Commit**

```bash
git add src/layout/Toolbar.tsx
git commit -m "feat: wire undo/redo and Ctrl+S save to engine"
```

---

## Task 5: Add Track Dialog

Build a dialog to create new audio, MIDI, or bus tracks.

**Files:**
- Create: `dawflow-ui/src/dialogs/AddTrackDialog.tsx`
- Create: `dawflow-ui/src/dialogs/AddTrackDialog.module.css`
- Modify: `dawflow-ui/src/layout/Toolbar.tsx` — add trigger button
- Modify: `dawflow-ui/src/stores/ui.ts` — add dialog visibility state

**Step 1: Add dialog state to UI store**

In `dawflow-ui/src/stores/ui.ts`, add:

```typescript
// State:
addTrackDialogOpen: boolean;
// Actions:
openAddTrackDialog: () => void;
closeAddTrackDialog: () => void;
```

Implementation:
```typescript
addTrackDialogOpen: false,
openAddTrackDialog: () => set({ addTrackDialogOpen: true }),
closeAddTrackDialog: () => set({ addTrackDialogOpen: false }),
```

**Step 2: Create the AddTrackDialog component**

```tsx
// dawflow-ui/src/dialogs/AddTrackDialog.tsx
import React, { useState } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { ipc } from '../services/ipc';
import styles from './AddTrackDialog.module.css';

type TrackKind = 'audio' | 'midi' | 'bus';

export const AddTrackDialog: React.FC = () => {
  const open = useUIStore((s) => s.addTrackDialogOpen);
  const close = useUIStore((s) => s.closeAddTrackDialog);
  const [kind, setKind] = useState<TrackKind>('audio');
  const [name, setName] = useState('');
  const [count, setCount] = useState(1);

  if (!open) return null;

  const handleCreate = async () => {
    const fn = kind === 'audio' ? ipc.addAudioTrack
             : kind === 'midi' ? ipc.addMidiTrack
             : ipc.addBus;
    for (let i = 0; i < count; i++) {
      await fn(name || undefined);
    }
    // Refresh track list
    await useSessionStore.getState().fetchFromEngine();
    setName('');
    setCount(1);
    close();
  };

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>Add Track</div>
        <div className={styles.body}>
          <div className={styles.field}>
            <label>Type</label>
            <div className={styles.kindButtons}>
              {(['audio', 'midi', 'bus'] as TrackKind[]).map((k) => (
                <button key={k} className={`${styles.kindBtn} ${kind === k ? styles.kindActive : ''}`}
                  onClick={() => setKind(k)}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label>Name</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'audio' ? 'Audio' : kind === 'midi' ? 'MIDI' : 'Bus'} />
          </div>
          <div className={styles.field}>
            <label>Count</label>
            <input className={styles.input} type="number" min={1} max={32}
              value={count} onChange={(e) => setCount(parseInt(e.target.value) || 1)} />
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={close}>Cancel</button>
          <button className={styles.createBtn} onClick={handleCreate}>Add Track</button>
        </div>
      </div>
    </div>
  );
};
```

**Step 3: Create the CSS**

```css
/* dawflow-ui/src/dialogs/AddTrackDialog.module.css */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.dialog {
  background: var(--surface-1, #2b2b2b); border: 1px solid var(--border-1, #555);
  border-radius: 6px; width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.header {
  padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--text-1, #e0e0e0);
  border-bottom: 1px solid var(--border-1, #555);
}
.body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 11px; color: var(--text-2, #999); text-transform: uppercase; }
.kindButtons { display: flex; gap: 4px; }
.kindBtn {
  flex: 1; padding: 6px; background: var(--surface-2, #333); border: 1px solid var(--border-1, #555);
  color: var(--text-2, #999); font-size: 12px; cursor: pointer; border-radius: 3px;
}
.kindBtn:hover { background: var(--surface-3, #3a3a3a); }
.kindActive { background: var(--accent, #4A90D9) !important; color: #fff !important; border-color: var(--accent, #4A90D9) !important; }
.input {
  background: var(--surface-3, #1e1e1e); border: 1px solid var(--border-1, #555);
  color: var(--text-1, #e0e0e0); padding: 6px 8px; font-size: 12px; border-radius: 3px;
}
.footer {
  padding: 12px 16px; display: flex; justify-content: flex-end; gap: 8px;
  border-top: 1px solid var(--border-1, #555);
}
.cancelBtn {
  padding: 6px 14px; background: var(--surface-2, #333); border: 1px solid var(--border-1, #555);
  color: var(--text-2, #999); font-size: 12px; cursor: pointer; border-radius: 3px;
}
.createBtn {
  padding: 6px 14px; background: var(--accent, #4A90D9); border: none;
  color: #fff; font-size: 12px; cursor: pointer; border-radius: 3px; font-weight: 600;
}
.createBtn:hover { filter: brightness(1.1); }
```

**Step 4: Add trigger button to Toolbar**

In `dawflow-ui/src/layout/Toolbar.tsx`, after the Undo/Redo section, add a "+" button:

```tsx
<button className={styles.btn} title="Add Track"
  onClick={() => useUIStore.getState().openAddTrackDialog()}>
  +
</button>
```

**Step 5: Render dialog in App.tsx**

Import and render `<AddTrackDialog />` at the root level in App.tsx.

**Step 6: Build and verify**

Run: `cd dawflow-ui && npm run build`

**Step 7: Commit**

```bash
git add src/dialogs/ src/stores/ui.ts src/layout/Toolbar.tsx src/App.tsx
git commit -m "feat: add track creation dialog (audio/MIDI/bus)"
```

---

## Task 6: AI Chat Panel in Right Zone

Build the AI Chat interface as a new tab in the Right Zone.

**Files:**
- Create: `dawflow-ui/src/right-zone/AIChatPanel.tsx`
- Create: `dawflow-ui/src/right-zone/AIChatPanel.module.css`
- Create: `dawflow-ui/src/stores/chat.ts`
- Modify: `dawflow-ui/src/layout/RightZone.tsx` — add AI tab
- Modify: `dawflow-ui/src/stores/ui.ts` — add 'ai' to RightZoneTab type

**Step 1: Add 'ai' to RightZoneTab type**

In `dawflow-ui/src/stores/ui.ts`, change:
```typescript
export type RightZoneTab = 'vsti' | 'media' | 'cr' | 'meter' | 'ai';
```

**Step 2: Create chat store**

```typescript
// dawflow-ui/src/stores/chat.ts
import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  pending?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  inputValue: string;
  isStreaming: boolean;

  setInputValue: (value: string) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

let msgCounter = 0;

export const useChatStore = create<ChatStore>((set) => ({
  messages: [{
    id: 'welcome',
    role: 'assistant',
    content: 'I\'m your AI assistant. I can help you mix, edit, and produce music. Try asking me to mute a track, set the tempo, or add a new track.',
    timestamp: Date.now(),
  }],
  inputValue: '',
  isStreaming: false,

  setInputValue: (value) => set({ inputValue: value }),
  addMessage: (msg) => {
    const id = `msg-${++msgCounter}-${Date.now()}`;
    set((s) => ({
      messages: [...s.messages, { ...msg, id, timestamp: Date.now() }],
    }));
    return id;
  },
  updateMessage: (id, content) => set((s) => ({
    messages: s.messages.map((m) => m.id === id ? { ...m, content, pending: false } : m),
  })),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [] }),
}));
```

**Step 3: Create AIChatPanel component**

```tsx
// dawflow-ui/src/right-zone/AIChatPanel.tsx
import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chat';
import { ipc } from '../services/ipc';
import { useSessionStore } from '../stores/session';
import { useTransportStore } from '../stores/transport';
import styles from './AIChatPanel.module.css';

export const AIChatPanel: React.FC = () => {
  const messages = useChatStore((s) => s.messages);
  const inputValue = useChatStore((s) => s.inputValue);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    addMessage({ role: 'user', content: text });
    setInputValue('');
    setStreaming(true);

    const assistantId = addMessage({ role: 'assistant', content: '...', pending: true });

    try {
      // Build context
      const tracks = useSessionStore.getState().tracks;
      const transport = useTransportStore.getState();
      const context = {
        tracks: tracks.map((t) => ({ id: t.id, name: t.name, type: t.type, muted: t.muted, solo: t.solo })),
        playing: transport.playing,
        tempo: transport.tempo,
        position: transport.positionDisplay,
      };

      // Send to AI backend via ui-shell
      const result = await ipc.call('daw.ai.chat', {
        message: text,
        context,
      });

      const response = typeof result === 'string' ? result
        : (result as Record<string, unknown>).response as string || JSON.stringify(result);
      updateMessage(assistantId, response);
    } catch (e) {
      updateMessage(assistantId, `Sorry, I couldn't process that. ${e instanceof Error ? e.message : ''}`);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>AI Assistant</span>
        <button className={styles.headerBtn} title="Settings">&#9881;</button>
      </div>
      <div className={styles.messages} ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.message} ${styles[msg.role]}`}>
            <div className={styles.bubble}>
              {msg.pending ? <span className={styles.dots}>&#8226;&#8226;&#8226;</span> : msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inputArea}>
        <input
          ref={inputRef}
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isStreaming}
        />
        <button className={styles.sendBtn} onClick={handleSend} disabled={isStreaming || !inputValue.trim()}>
          &#10148;
        </button>
      </div>
    </div>
  );
};
```

**Step 4: Create AIChatPanel CSS**

```css
/* dawflow-ui/src/right-zone/AIChatPanel.module.css */
.container { display: flex; flex-direction: column; height: 100%; }
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid var(--border-1, #444);
}
.headerTitle { font-size: 12px; font-weight: 600; color: var(--text-1, #e0e0e0); }
.headerBtn {
  background: none; border: none; color: var(--text-2, #999); cursor: pointer; font-size: 14px;
}
.messages {
  flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;
}
.message { display: flex; max-width: 90%; }
.user { align-self: flex-end; }
.assistant { align-self: flex-start; }
.system { align-self: center; }
.bubble {
  padding: 8px 12px; border-radius: 12px; font-size: 12px; line-height: 1.5;
  color: var(--text-1, #e0e0e0); word-break: break-word; white-space: pre-wrap;
}
.user .bubble { background: var(--accent, #4A90D9); border-bottom-right-radius: 4px; }
.assistant .bubble { background: var(--surface-2, #333); border-bottom-left-radius: 4px; }
.dots { animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
.inputArea {
  display: flex; gap: 6px; padding: 8px 12px;
  border-top: 1px solid var(--border-1, #444);
}
.input {
  flex: 1; background: var(--surface-3, #1e1e1e); border: 1px solid var(--border-1, #555);
  color: var(--text-1, #e0e0e0); padding: 8px 10px; font-size: 12px; border-radius: 6px;
}
.input:focus { outline: none; border-color: var(--accent, #4A90D9); }
.sendBtn {
  background: var(--accent, #4A90D9); border: none; color: #fff; width: 32px; height: 32px;
  border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;
}
.sendBtn:disabled { opacity: 0.4; cursor: default; }
.sendBtn:hover:not(:disabled) { filter: brightness(1.15); }
```

**Step 5: Add AI tab to RightZone**

In `dawflow-ui/src/layout/RightZone.tsx`:

1. Import `AIChatPanel`:
```typescript
import { AIChatPanel } from '../right-zone/AIChatPanel';
```

2. Add to TABS array:
```typescript
{ id: 'ai' as const, label: 'AI' },
```

3. Change the type:
```typescript
type RightZoneTab = 'vsti' | 'media' | 'cr' | 'meter' | 'ai';
```

4. Add rendering case:
```tsx
{rightZoneTab === 'ai' && <AIChatPanel />}
```

**Step 6: Build and verify**

Run: `cd dawflow-ui && npm run build`

**Step 7: Commit**

```bash
git add src/right-zone/ src/stores/chat.ts src/layout/RightZone.tsx src/stores/ui.ts
git commit -m "feat: add AI Chat panel in Right Zone"
```

---

## Task 7: IPC Event Forwarding in ui-shell Plugin

Add event buffering and SSE endpoint to the ui-shell plugin so the React UI can receive engine events (routes added, transport changed).

**Files:**
- Modify: `sdk/plugins/ui-shell/src/main.cpp`

**Step 1: Add event subscription and buffering**

Before `plugin.run()` in main.cpp, subscribe to IPC events and buffer them:

```cpp
// Event buffer for SSE clients
std::mutex event_mutex;
std::vector<std::string> event_buffer;
const size_t MAX_EVENTS = 100;

plugin.on_event("daw.routes.added", [&](const DawflowSDK::json& params) {
    std::lock_guard<std::mutex> lock(event_mutex);
    DawflowSDK::json evt;
    evt["method"] = "daw.routes.added";
    evt["params"] = params;
    event_buffer.push_back(evt.dump());
    if (event_buffer.size() > MAX_EVENTS) event_buffer.erase(event_buffer.begin());
});

plugin.on_event("daw.transport.changed", [&](const DawflowSDK::json& params) {
    std::lock_guard<std::mutex> lock(event_mutex);
    DawflowSDK::json evt;
    evt["method"] = "daw.transport.changed";
    evt["params"] = params;
    event_buffer.push_back(evt.dump());
    if (event_buffer.size() > MAX_EVENTS) event_buffer.erase(event_buffer.begin());
});

plugin.on_event("daw.session.dirty_changed", [&](const DawflowSDK::json& params) {
    std::lock_guard<std::mutex> lock(event_mutex);
    DawflowSDK::json evt;
    evt["method"] = "daw.session.dirty_changed";
    evt["params"] = params;
    event_buffer.push_back(evt.dump());
    if (event_buffer.size() > MAX_EVENTS) event_buffer.erase(event_buffer.begin());
});
```

**Step 2: Add GET /api/events endpoint to HTTP server**

This requires modifying the SDK's `_http_loop` method. Since we don't want to modify the shared SDK header, instead we add a custom HTTP handler in main.cpp.

The simplest approach: modify the `POST /api/command` block in the SDK to also handle `GET /api/events`. However, since the SDK is shared, we should fork the HTTP handling into main.cpp.

Alternative (simpler): Add a new endpoint to the existing HTTP handler. In the SDK's `_http_loop`, before the static file serving block, add a check for `GET /api/events`:

Actually, the cleanest approach is to add the event polling endpoint in the SDK's command handler. Modify `dawflow_sdk.h` `_http_loop` to check for `GET /api/events` path, or more practically, the React UI can just poll `POST /api/command` with method `daw.get_tracks` periodically (every 2-3 seconds) after mutations.

**Simplified approach for MVP:** Skip SSE. Instead, after any mutation (add track, undo, etc.), the React UI calls `fetchFromEngine()` to refresh. This is already wired in Tasks 2-5. For route changes initiated from the engine side (e.g., loading a session from the GTK menu), we add a periodic poll.

In `dawflow-ui/src/services/websocket.ts`, add a poll timer:

```typescript
// Poll for track list changes every 3 seconds
let pollTimer: ReturnType<typeof setInterval> | null = null;

// In ws.onopen handler, start polling:
pollTimer = setInterval(() => {
  useSessionStore.getState().fetchFromEngine();
}, 3000);

// In ws.onclose handler, stop polling:
if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
```

**Step 3: Build and verify**

Run: `cd dawflow-ui && npm run build`

**Step 4: Commit**

```bash
git add src/services/websocket.ts
git commit -m "feat: add periodic track list polling for engine sync"
```

---

## Task 8: Real Session Info Display

Wire the real session name, sample rate, and connection status throughout the UI.

**Files:**
- Modify: `dawflow-ui/src/layout/ProjectWindow.tsx` — show real session name in title
- Modify: `dawflow-ui/src/layout/Toolbar.tsx` — show session name

**Step 1: Update document title with session name**

In `dawflow-ui/src/layout/ProjectWindow.tsx`, add:

```typescript
import { useSessionStore } from '../stores/session';

// Inside the component:
const sessionName = useSessionStore((s) => s.sessionName);

React.useEffect(() => {
  document.title = `${sessionName} — DAWFLOW`;
}, [sessionName]);
```

**Step 2: Build and verify**

Run: `cd dawflow-ui && npm run build`

**Step 3: Commit**

```bash
git add src/layout/ProjectWindow.tsx
git commit -m "feat: show real session name in window title"
```

---

## Task 9: Region Display in Timeline (Center Zone)

Replace fake waveforms/MIDI with real region data from the engine.

**Files:**
- Create: `dawflow-ui/src/stores/regions.ts`
- Modify: `dawflow-ui/src/layout/CenterZone.tsx`
- Modify: `dawflow-ui/src/services/websocket.ts` — fetch regions on connect

**Step 1: Create regions store**

```typescript
// dawflow-ui/src/stores/regions.ts
import { create } from 'zustand';

export interface Region {
  id: string;
  trackId: string;
  name: string;
  position: number;  // samples
  length: number;    // samples
  start: number;     // samples (offset within source)
  type: string;      // audio, midi
}

interface RegionStore {
  regionsByTrack: Record<string, Region[]>;
  setRegions: (trackId: string, regions: Region[]) => void;
  clearAll: () => void;
}

export const useRegionStore = create<RegionStore>((set) => ({
  regionsByTrack: {},
  setRegions: (trackId, regions) => set((s) => ({
    regionsByTrack: { ...s.regionsByTrack, [trackId]: regions },
  })),
  clearAll: () => set({ regionsByTrack: {} }),
}));
```

**Step 2: Fetch regions after tracks load**

In `dawflow-ui/src/stores/session.ts`, after `fetchFromEngine` populates tracks, trigger region fetch:

```typescript
// After setting tracks in fetchFromEngine:
import { useRegionStore } from './regions';
import { ipc } from '../services/ipc';

// After tracks are set, fetch regions for each:
for (const track of engineTracks) {
  try {
    const regions = await ipc.getRegions(track.id);
    useRegionStore.getState().setRegions(track.id, regions.map((r) => ({
      ...r, trackId: track.id,
    })));
  } catch {
    // Track may not have regions
  }
}
```

**Step 3: Update CenterZone to render real regions**

In `dawflow-ui/src/layout/CenterZone.tsx`:

1. Import `useRegionStore`
2. Get `regionsByTrack` from the store
3. Replace fake waveform/MIDI rendering with real region rectangles:

```tsx
import { useRegionStore } from '../stores/regions';
import { useSessionStore } from '../stores/session';

// Inside component:
const regionsByTrack = useRegionStore((s) => s.regionsByTrack);
const sampleRate = useSessionStore((s) => s.sampleRate);

// For each track, render its regions:
const regions = regionsByTrack[track.id] || [];
// If no real regions, show nothing (no more fakes)
```

Each region renders as a positioned rectangle in the timeline based on its `position` and `length` in samples, converted to pixels using sample rate and a zoom level.

**Step 4: Remove fake waveform/MIDI generation functions**

Delete `generateWaveformPath` and `generateMidiNotes` functions from CenterZone.tsx.

**Step 5: Build and verify**

Run: `cd dawflow-ui && npm run build`

**Step 6: Commit**

```bash
git add src/stores/regions.ts src/layout/CenterZone.tsx src/stores/session.ts
git commit -m "feat: display real regions from engine in timeline"
```

---

## Task 10: Deploy and End-to-End Test

Build everything, deploy, and verify the full flow.

**Step 1: Build React UI**

```bash
cd dawflow-ui && npm run build
```

**Step 2: Deploy to ui-shell plugin**

```bash
cd dawflow-ui && ./deploy.sh
```

**Step 3: Rebuild ui-shell plugin**

```bash
cd sdk/plugins/ui-shell && ./build.sh
cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
```

**Step 4: Launch and verify**

```bash
./run-dawflow.sh
```

Verify checklist:
- [ ] React UI loads in WebView
- [ ] Real tracks appear from loaded session (no demo tracks)
- [ ] Live meters respond to audio playback
- [ ] Play/Stop/Record buttons work
- [ ] Undo/Redo work (Ctrl+Z/Ctrl+Shift+Z)
- [ ] Ctrl+S saves session
- [ ] Add Track dialog creates real tracks
- [ ] AI Chat tab appears in Right Zone
- [ ] AI Chat sends messages (may need backend wiring)
- [ ] Session name shows in title bar
- [ ] Regions display in timeline (if session has audio/MIDI)

**Step 5: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete MVP — real data wiring, AI chat, track management"
```

---

## Future Tasks (Post-MVP, not in this plan)

These are documented for reference but NOT part of this implementation round:

- **Task F1:** Audio waveform rendering via `daw.get_audio_peaks`
- **Task F2:** MIDI piano roll editor via `daw.get_midi_notes` / `daw.add_midi_note`
- **Task F3:** Plugin selector dialog with search
- **Task F4:** Plugin parameter editor (knobs/sliders per plugin)
- **Task F5:** Insert chain management in inspector
- **Task F6:** Send/routing management
- **Task F7:** Automation lane display and editing
- **Task F8:** Marker ruler with add/remove
- **Task F9:** Export dialog
- **Task F10:** AI Chat backend with actual LLM integration + DAW command execution
- **Task F11:** Audio editor in Lower Zone (trim, fade, crossfade)
- **Task F12:** Advanced metering (LUFS, RTA)
