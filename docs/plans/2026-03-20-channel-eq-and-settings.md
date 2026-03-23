# Channel Settings Window with Built-in EQ — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Cubase-style Channel Settings window with interactive 6-band EQ (using Ardour's built-in `a-EQ` LV2 plugin), working inserts, sends, channel strip, and fader section.

**Architecture:** The EQ uses Ardour's `a-EQ` plugin (`urn:ardour:a-eq`) which ships with every install. When Channel Settings opens, we auto-load `a-EQ` if not present, then control its 24 parameters via IPC. The EQ curve is rendered in React using biquad filter response math. The rest of the window mirrors Cubase's layout with inserts (left), channel strip, EQ (center), sends, and fader (right).

**Tech Stack:** React, TypeScript, SVG for EQ curve, Zustand, IPC via `ipc.call()`

---

## Reference: a-EQ Plugin Parameters

The plugin is at `engine/libs/plugins/a-eq.lv2/a-eq.c`. URI: `urn:ardour:a-eq`

```
Index | Parameter        | Default  | Range        | Notes
------|-----------------|----------|--------------|------
0     | Freq L (shelf)  | 160 Hz   | 20-20000 Hz  | Low shelf frequency
1     | Gain L          | 0 dB     | -20 to +20   | Low shelf gain
2     | Freq 1          | 300 Hz   | 20-20000 Hz  | Parametric band 1 freq
3     | Gain 1          | 0 dB     | -20 to +20   | Parametric band 1 gain
4     | BW 1            | 1.0      | 0.1-6.0      | Parametric band 1 Q/bandwidth
5     | Freq 2          | 1000 Hz  | 20-20000 Hz  | Parametric band 2 freq
6     | Gain 2          | 0 dB     | -20 to +20   |
7     | BW 2            | 1.0      | 0.1-6.0      |
8     | Freq 3          | 3000 Hz  | 20-20000 Hz  | Parametric band 3 freq
9     | Gain 3          | 0 dB     | -20 to +20   |
10    | BW 3            | 1.0      | 0.1-6.0      |
11    | Freq 4          | 8000 Hz  | 20-20000 Hz  | Parametric band 4 freq
12    | Gain 4          | 0 dB     | -20 to +20   |
13    | BW 4            | 1.0      | 0.1-6.0      |
14    | Freq H (shelf)  | 8000 Hz  | 20-20000 Hz  | High shelf frequency
15    | Gain H          | 0 dB     | -20 to +20   | High shelf gain
16    | Master Gain     | 0 dB     | -20 to +20   | Output gain
17    | Enable L        | 1.0      | 0 or 1       | Toggle low shelf
18    | Enable 1        | 1.0      | 0 or 1       | Toggle band 1
19    | Enable 2        | 1.0      | 0 or 1       | Toggle band 2
20    | Enable 3        | 1.0      | 0 or 1       | Toggle band 3
21    | Enable 4        | 1.0      | 0 or 1       | Toggle band 4
22    | Enable H        | 1.0      | 0 or 1       | Toggle high shelf
23    | Global Enable   | 1.0      | 0 or 1       | Master bypass
24    | Input (audio L) | —        | audio port   |
25    | Output (audio L)| —        | audio port   |
```

## Reference: Cubase Channel Settings Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Channel Settings : Audio 02 [stereo]                                X  │
├─────────────────────────────────────────────────────────────────────────┤
│ ← →  ↑↓ 🔍 │ Stereo In ▼ ← │ Audio 02 │ → Stereo Out ▼ │ Presets ▼ │
├───────┬────────┬─────────────────────────┬────────┬────────────────────┤
│       │Channel │                         │        │  M   S             │
│INSERT │ Strip  │      EQUALIZER          │ SENDS  │  L   e             │
│       │        │                         │        │  C                 │
│ 1 ●   │ INPUT  │  ┌───────────────────┐  │ ●empty │                    │
│ 2 ●   │  GAIN  │  │                   │  │ ●empty │  ┌────────┐        │
│ 3 ●   │ -3.5dB │  │  EQ curve SVG     │  │ ●empty │  │ fader  │ 0.0dB │
│ 4 ●   │        │  │  with 6 nodes     │  │ ●empty │  └────────┘        │
│ 5 ●   │ PHASE  │  │  20Hz ──── 20kHz  │  │        │                    │
│ 6 ●   │   Ø    │  │  +24dB ── -24dB   │  │        │  R    W           │
│ 7 ●   │        │  └───────────────────┘  │        │  ●  🔊  ∞   2    │
│ 8 ●   │  PAN   │                         │        │                    │
│       │   C    │  PRE│1 LO│2 LMF│3HMF│4HI│        │  Audio 02          │
├───────┴────────┴─────────────────────────┴────────┴────────────────────┤
│ INSERTS    ROUTING                        Destinations    Panning      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Reference: IPC Commands

```typescript
// Load a-EQ onto a track
ipc.call('daw.load_plugin', { track_id, plugin_name: 'a-EQ' })

// Get track's plugins to find a-EQ processor_id
ipc.getTrackPlugins(trackId) → { plugins: [{ processor_id, name, enabled }] }

// Get/set a-EQ parameters
ipc.getPluginParameters(trackId, processorId)
ipc.setPluginParameter(trackId, processorId, paramIndex, value)

// Enable/disable a-EQ
ipc.setPluginEnabled(trackId, processorId, enabled)

// Sends
ipc.call('daw.get_sends', { track_id })
ipc.call('daw.set_send_level', { track_id, send_index, level })
ipc.call('daw.send.set_pan', { track_id, send_index, pan })
ipc.call('daw.send.set_pre_fader', { track_id, send_index, pre_fader })
ipc.call('daw.set_send_enable', { track_id, send_index, enabled })

// Inserts (reorder, move)
ipc.call('daw.reorder_plugins', { track_id, plugin_ids: [...] })
ipc.call('daw.move_plugin', { track_id, processor_id, new_position })

// Phase
ipc.call('daw.phase.get', { track_id })
ipc.call('daw.phase.invert_all', { track_id })

// Track gain/pan
ipc.call('daw.set_track_gain', { track_id, gain_db })
ipc.call('daw.set_track_pan', { track_id, pan })
```

## Reference: Biquad Filter Math for EQ Curve

To render the EQ curve in SVG, calculate frequency response at N points:

```typescript
// For each band, compute biquad coefficients from (freq, gain, Q, type)
// Then evaluate H(f) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2)
// where z = e^(j*2*pi*f/sampleRate)
// Total response = product of all band responses
// Plot: X = log(freq), Y = 20*log10(|H(f)|)

function peakingEQ(freq: number, gain: number, Q: number, sampleRate: number) {
  const A = Math.pow(10, gain / 40);
  const w0 = 2 * Math.PI * freq / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  return {
    b0: 1 + alpha * A,
    b1: -2 * Math.cos(w0),
    b2: 1 - alpha * A,
    a0: 1 + alpha / A,
    a1: -2 * Math.cos(w0),
    a2: 1 - alpha / A,
  };
}

function lowShelf(freq: number, gain: number, sampleRate: number) {
  const A = Math.pow(10, gain / 40);
  const w0 = 2 * Math.PI * freq / sampleRate;
  const S = 1; // shelf slope
  const alpha = Math.sin(w0) / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2);
  // ... standard cookbook coefficients
}

function highShelf(freq: number, gain: number, sampleRate: number) {
  // ... standard cookbook coefficients
}

function evaluateResponse(coeffs: {b0,b1,b2,a0,a1,a2}, freq: number, sampleRate: number): number {
  const w = 2 * Math.PI * freq / sampleRate;
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cos2w = Math.cos(2 * w);
  const sin2w = Math.sin(2 * w);
  const numRe = coeffs.b0/coeffs.a0 + (coeffs.b1/coeffs.a0)*cosw + (coeffs.b2/coeffs.a0)*cos2w;
  const numIm = -(coeffs.b1/coeffs.a0)*sinw - (coeffs.b2/coeffs.a0)*sin2w;
  const denRe = 1 + (coeffs.a1/coeffs.a0)*cosw + (coeffs.a2/coeffs.a0)*cos2w;
  const denIm = -(coeffs.a1/coeffs.a0)*sinw - (coeffs.a2/coeffs.a0)*sin2w;
  const magNum = Math.sqrt(numRe*numRe + numIm*numIm);
  const magDen = Math.sqrt(denRe*denRe + denIm*denIm);
  return 20 * Math.log10(magNum / magDen);
}
```

---

## Tasks

### Task 1: EQ Component — SVG Curve with Draggable Nodes

**Files:**
- Create: `dawflow-ui/src/components/ChannelEQ.tsx`
- Create: `dawflow-ui/src/components/ChannelEQ.module.css`

**What to build:**
- SVG canvas: 600×300px, black background with dark grid
- X axis: logarithmic, 20Hz to 20kHz (labels: 20, 50, 100, 200, 500, 1k, 2k, 5k, 10k, 20k)
- Y axis: linear, -24dB to +24dB (labels every 6dB)
- 0dB reference line (horizontal, slightly brighter)
- Vertical grid lines at frequency markers
- **6 draggable nodes** (circles with numbers):
  - Node L: low shelf (orange/warm color)
  - Nodes 1-4: parametric (blue/cyan when active)
  - Node H: high shelf (orange/warm color)
- **EQ response curve**: computed from biquad math, rendered as SVG `<path>`
- **Filled area** below/above 0dB line with low opacity
- Dragging a node: X controls frequency (log scale), Y controls gain
- Clicking a node selects it (highlighted, shows its controls below)
- Mouse wheel on a node adjusts Q (bandwidth)

**Below the SVG — Band Controls (Cubase-style):**

```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│  PRE    │  1 LO   │  2 LMF  │  3 HMF  │  4 HI   │         │
│ ⏻  🔧  │ ⏻  ∿   │ ⏻  ∿   │ ⏻  ∿   │ ⏻  ∿   │         │
│ 20kHz 12│ 0.0dB   │  0.0dB  │ 11.4dB  │  0.0dB  │         │
│ 20Hz  12│ 100.0Hz │ 800.0Hz │ 2357Hz  │ 12000Hz │         │
│ Gain ▬▬ │  1.0    │   1.0   │   1.0   │   1.0   │         │
│ Phase 0°│         │         │         │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

- Each band: power toggle, filter type dropdown (Parametric I/II, Low Shelf I-IV, High Pass I/II, etc.), gain field, freq field, Q field
- Active band highlighted with blue background on values
- Values are **editable text fields** (NOT knobs) — click to type, or drag up/down to adjust
- Filter type dropdown per band (matches Cubase: Parametric I, Low Shelf I, High Pass I, etc.)

**State:**
```typescript
interface EQBand {
  enabled: boolean;
  freq: number;
  gain: number;
  q: number;       // only for parametric bands
  type: 'lowshelf' | 'parametric' | 'highshelf';
}

interface EQState {
  bands: EQBand[]; // 6 bands: L, 1, 2, 3, 4, H
  masterGain: number;
  globalEnabled: boolean;
  selectedBand: number | null;
}
```

---

### Task 2: a-EQ Plugin Auto-Loading

**Files:**
- Modify: `dawflow-ui/src/components/ChannelEQ.tsx`

**On component mount:**
1. Call `ipc.getTrackPlugins(trackId)` to list current plugins
2. Search for a plugin named `a-EQ` (case-insensitive)
3. If found → store its `processor_id`, fetch parameters
4. If NOT found → call `ipc.loadPlugin(trackId, 'a-EQ')`, wait 300ms, re-fetch plugins to get processor_id
5. Once we have the processor_id, call `ipc.getPluginParameters(trackId, processorId)` to populate the EQ state

**Parameter index mapping:**
```typescript
const PARAM_MAP = {
  freqL: 0, gainL: 1,
  freq1: 2, gain1: 3, bw1: 4,
  freq2: 5, gain2: 6, bw2: 7,
  freq3: 8, gain3: 9, bw3: 10,
  freq4: 11, gain4: 12, bw4: 13,
  freqH: 14, gainH: 15,
  masterGain: 16,
  enableL: 17, enable1: 18, enable2: 19, enable3: 20, enable4: 21, enableH: 22,
  globalEnable: 23,
};
```

**On parameter change (drag node or edit field):**
```typescript
ipc.setPluginParameter(trackId, eqProcessorId, paramIndex, newValue)
```

---

### Task 3: Channel Settings Window Layout

**Files:**
- Rewrite: `dawflow-ui/src/dialogs/ChannelSettingsDialog.tsx` (or create new)
- Create: `dawflow-ui/src/dialogs/ChannelSettingsDialog.module.css`

**Layout — 5 columns:**

1. **Inserts** (left, ~120px) — reuse InsertSlots component with modifications
2. **Channel Strip** (~140px) — Input Gain, Phase, Pan
3. **Equalizer** (flex, fills remaining) — ChannelEQ component from Task 1
4. **Sends** (~120px) — send slots with pre/post color coding
5. **Fader Strip** (right, ~100px) — M/S/L/e, fader, R/W, record/monitor, track name

**Top bar:**
- ← → buttons to navigate between tracks
- Input routing dropdown
- Track name (editable)
- Output routing dropdown
- Track Presets dropdown

**Bottom tabs:**
- INSERTS | ROUTING (left side)
- Destinations | Panning (right side)

---

### Task 4: Insert Section in Channel Settings

**Files:**
- Modify: `dawflow-ui/src/dialogs/ChannelSettingsDialog.tsx`

**Features (matching Cubase):**
- 8 insert slots (6 pre-fader + 2 post-fader, separated by line)
- Each slot: bypass dot (green=active), slot number, plugin name
- Click empty slot → plugin browser dropdown (reuse from InsertSlots)
- Click loaded slot → open native plugin GUI (`daw.plugin.show_native_gui`)
- Hover → show × button to remove
- **Drag to reorder**: mouseDown on a loaded slot starts drag, drop on another slot position calls `daw.move_plugin` with new_position
- Pre/post fader label between slots 6 and 7

---

### Task 5: Sends Section

**Files:**
- Modify: `dawflow-ui/src/dialogs/ChannelSettingsDialog.tsx`

**Features:**
- 4 send slots (expandable)
- Each send shows: enable toggle (⏻), pre/post indicator (🔊), destination dropdown, level value
- **Pre-fader sends: orange background** (`#c07030` or similar warm amber)
- **Post-fader sends: blue background** (`#4a6a8a` or similar cool blue)
- Click toggle to switch pre/post → color changes
- Destination dropdown lists available buses
- Level: editable field or horizontal fader
- Tab switches: Sends | Cue Sends

**IPC:**
```typescript
ipc.call('daw.get_sends', { track_id }) // list current sends
ipc.call('daw.add_send', { track_id, destination_id }) // add new
ipc.call('daw.set_send_level', { track_id, send_index, level })
ipc.call('daw.send.set_pan', { track_id, send_index, pan })
ipc.call('daw.send.set_pre_fader', { track_id, send_index, pre_fader: true/false })
ipc.call('daw.set_send_enable', { track_id, send_index, enabled })
```

---

### Task 6: Channel Strip Section

**Features:**
- **Input Gain**: value field showing dB, click to edit or drag to adjust
- **Phase**: Ø toggle button → `daw.phase.invert_all`
- **Pan**: value display (C = center, L50, R50 etc.), click to edit

---

### Task 7: Right Fader Strip

**Features:**
- M / S buttons (mute/solo)
- L / e buttons (listen/edit channel)
- Pan indicator (horizontal bar or text)
- **Vertical fader** with dB scale (reuse Fader component, orientation="vertical")
- dB value display below fader
- R / W buttons (automation read/write)
- Record arm (●), Monitor (🔊), input config (∞), channel count (2)
- Track name at bottom (editable)

---

### Task 8: Track Navigation

**Features:**
- ← → buttons in top bar cycle through tracks
- Updates all sections (inserts, EQ, sends, fader) when track changes
- Track name editable in the center of the top bar

---

## Testing Checklist

- [ ] Open Channel Settings → a-EQ loads automatically
- [ ] EQ curve renders flat line at 0dB by default
- [ ] Drag node 3 (HMF) up → curve shows peak, value fields update
- [ ] Edit frequency field directly → node moves on curve
- [ ] Toggle band enable → node dims, curve updates
- [ ] Click empty insert slot → plugin browser opens
- [ ] Load plugin → appears in slot, native GUI opens
- [ ] Drag plugin to different slot → reorders
- [ ] Send slot: toggle pre/post → color changes orange/blue
- [ ] Fader drag → volume changes, dB display updates
- [ ] Cmd+click fader → resets to 0dB
- [ ] ← → buttons → switch to next/prev track, all sections update
- [ ] Close and reopen → EQ state persists (loaded from plugin params)

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `dawflow-ui/src/components/ChannelEQ.tsx` | CREATE | Interactive 6-band EQ with SVG curve |
| `dawflow-ui/src/components/ChannelEQ.module.css` | CREATE | EQ styling |
| `dawflow-ui/src/dialogs/ChannelSettingsDialog.tsx` | REWRITE | Full Cubase-style channel settings |
| `dawflow-ui/src/dialogs/ChannelSettingsDialog.module.css` | REWRITE | Channel settings styling |
| `dawflow-ui/src/inspector/InsertSlots.tsx` | MODIFY | Add drag-to-reorder support |
| `dawflow-ui/src/inspector/SendSlots.tsx` | MODIFY | Add pre/post color coding |
