# Channel Settings Window — Design Document

**Date:** 2026-03-29
**Status:** Planning
**Reference:** Cubase Channel Settings window (screenshot provided)

## Overview

A standalone popup window that opens when clicking the "e" button on a track header. Shows full channel editing capabilities: inserts, channel strip, EQ, sends, and a fader section. Matches the Cubase Channel Settings layout.

## Layout (Left to Right)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Channel Settings : [Track Name] [stereo]                                │
├──────────────────────────────────────────────────────────────────────────┤
│ [←][→] [↑][↓] [🔍] │ [Stereo In ▼] │ [Track] │ → │ [Output ▼] │ [Preset ▼] │
├────────────┬─────────────────────────────────────────┬────────┬─────────┤
│            │ Channel Strip    │  Equalizer           │        │         │
│ Inserts    │                  │                      │ Sends  │ M  S    │
│ Strip      │  [PRE section]   │  ┌──EQ Curve──────┐  │ Cue    │ L  e    │
│            │  HC filter       │  │                 │  │ Sends  │         │
│ [slot 1]   │  Gain           │  │  4-band EQ      │  │        │ [pan]   │
│ [slot 2]   │  Phase          │  │  visualization  │  │[snd 1] │         │
│ [slot 3]   │                  │  │                 │  │[snd 2] │ [fader] │
│ [slot 4]   │                  │  └─────────────────┘  │[snd 3] │ [meter] │
│ [slot 5]   │                  │                      │[snd 4] │         │
│ [slot 6]   │  [1 LO] [2 LMF] │ [3 HMF] [4 HI]     │[snd 5] │ R  W    │
│ [slot 7]   │  freq  gain  Q  │  freq  gain  Q       │[snd 6] │ ● 🔊    │
│ [slot 8]   │                  │                      │[snd 7] │ ∞  16   │
│            │                  │                      │[snd 8] │         │
├────────────┴──────────────────┴──────────────────────┴────────┤ [name] │
│ [Inserts] [Routing]                    [Destinations][Panning] │         │
└──────────────────────────────────────────────────────────────────────────┘
```

## Sections

### 1. Title Bar
- Window title: "Channel Settings : [Track Name] [mono/stereo]"

### 2. Top Navigation Bar
- Left: ← → (prev/next track), ↑ ↓ (scroll), 🔍 (search)
- Center: Input routing dropdown → Track instrument → Output routing dropdown
- Right: Track Presets dropdown

### 3. Left Panel — Inserts + Strip
**Tabs:** "Inserts" | "Strip" (bottom: "Routing")
- 8 insert slots (click to add plugin, drag to reorder)
- Each slot shows: plugin name, bypass toggle, edit button
- Strip tab: Pre-section controls (HC filter, gain, phase)

### 4. Center Panel — EQ
- Large Cairo-drawn frequency response curve (20Hz–20kHz, -24 to +24 dB)
- 4 EQ bands: LO (low shelf), LMF (low-mid peak), HMF (high-mid peak), HI (high shelf)
- Each band: enable toggle, gain knob, frequency knob, Q knob
- PRE section above EQ: gain, phase 0°
- Drag points on the EQ curve to adjust

### 5. Right Panel — Sends
**Tabs:** "Sends" | "Cue Sends" (bottom: "Destinations" | "Panning")
- 8 send slots (click to add send to bus)
- Each slot: destination, level, pan, pre/post toggle

### 6. Far Right — Channel Fader
- M S L e buttons (mute, solo, listen, edit)
- Pan control (horizontal or rotary)
- Vertical fader with dB scale
- Stereo level meter
- R W buttons (automation read/write)
- Record arm, monitor buttons
- Stereo/mono, channel count
- Track name label at bottom

## Implementation Plan

### Phase 1: Window Skeleton (this session)
1. Create `dawflow_channel_settings.h/cc` — new GTK Window class
2. Basic 4-column layout with placeholder sections
3. Wire "e" button to open this window for the selected track
4. Title bar with track name

### Phase 2: Insert Slots
1. List of 8 ProcessorBox-style slots
2. Click to add plugin (reuse Ardour's plugin selector)
3. Bypass toggle per slot
4. Drag to reorder

### Phase 3: EQ Visualization
1. Cairo-drawn frequency response curve
2. 4-band parametric EQ controls
3. Interactive — drag points on curve
4. Connect to Ardour's built-in EQ plugin (if loaded)

### Phase 4: Send Slots
1. List of 8 send slots
2. Add send to bus
3. Level/pan per send
4. Pre/post fader toggle

### Phase 5: Channel Fader
1. Vertical fader + meter (reuse GainMeterBase)
2. M/S/R/W buttons
3. Pan control
4. Input/output routing at top

## Files to Create/Modify

| File | Action |
|---|---|
| `engine/gtk2_ardour/dawflow_channel_settings.h` | NEW — window class declaration |
| `engine/gtk2_ardour/dawflow_channel_settings.cc` | NEW — window implementation |
| `engine/gtk2_ardour/route_time_axis.cc` | MODIFY — wire e button to open window |
| `engine/gtk2_ardour/wscript` | MODIFY — add new .cc to build |

## Dependencies
- Ardour's ProcessorBox (for insert slot management)
- GainMeterBase (for fader + meter)
- PluginSelector (for adding plugins)
- IOSelector (for routing)
