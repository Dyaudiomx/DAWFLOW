# Channel Settings Window — Cubase-style Implementation Plan

> This is a major feature requiring a dedicated session. The current PluginEditorDialog
> and channel settings are placeholder-quality. This plan describes the full Cubase-matching
> implementation.

## Target Layout (from Cubase screenshots)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Channel Settings : Audio 01 [stereo]                            X  │
├─────────────────────────────────────────────────────────────────────┤
│ ← →  ↑↓ 🔍  │ Stereo In ▼ ← Audio 01 → Stereo Out ▼ │ Presets ▼ │
├──────┬───────┬──────────────────────┬──────┬─────────────────────────┤
│      │Channel│                      │      │ M  S                    │
│INSERT│ Strip │    EQUALIZER         │SENDS │ L  e                    │
│      │       │                      │      │ C (pan display)         │
│ 1 ●  │INPUT  │  ┌──────────────┐    │ ● -- │                         │
│ 2 ●  │ GAIN  │  │ EQ curve     │    │ ● -- │  ┌──────┐              │
│ 3 ●  │-3.5dB │  │ with nodes   │    │ ● -- │  │fader │  0.0 dB     │
│ 4 ●  │       │  │ 20-20kHz     │    │ ● -- │  └──────┘              │
│ 5 ●  │PHASE  │  │ +24 to -24dB │    │      │                         │
│ 6 ●  │  Ø    │  └──────────────┘    │      │  R  W                  │
│ 7 ●  │       │  PRE│1 LO│2 LMF│3 HMF│4 HI│  ●  🔊  ∞  2          │
│ 8 ●  │ PAN   │  0dB│0dB │0dB  │0dB  │      │  Audio 01              │
│      │  C    │ 100Hz│800Hz│2.3k│12kHz│      │                         │
│      │       │  1.0 │ 1.0│ 1.0│ 1.0 │      │                         │
├──────┴───────┴──────────────────────┴──────┴─────────────────────────┤
│ INSERTS   ROUTING                    Destinations  Panning           │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Tasks

### 1. EQ Section (Center)
- **SVG canvas** with logarithmic X axis (20Hz-20kHz) and linear Y axis (+24 to -24 dB)
- **4 draggable nodes**: LO (100Hz), LMF (800Hz), HMF (3kHz), HI (12kHz)
- Click to add/select node, drag to move (freq + gain)
- EQ curve rendered as SVG path using biquad filter response calculation
- Each band has: **enable toggle**, **filter type dropdown** (Parametric, Low Shelf, High Pass, etc.), **gain (dB)**, **frequency (Hz)**, **Q factor**
- Values shown as editable text fields (not knobs!) — matching Cubase
- Active band highlighted in blue
- **Engine approach**: Auto-load Ardour's `a-EQ` plugin on each track, control via plugin parameters

### 2. Inserts Section (Left)
- 8 slots, same as inspector InsertSlots but in the channel window
- Click empty slot → plugin browser dropdown (already built)
- **Drag to reorder** plugins (`daw.reorder_plugins` or `daw.move_plugin`)
- **Bypass dot** (green=active, click to toggle)
- **Remove** on hover (×)
- Bottom tabs: INSERTS | ROUTING

### 3. Channel Strip Section
- **Input Gain** knob/value field
- **Phase** toggle (Ø button)
- **Pan** display (pan value, C for center)

### 4. Sends Section (Right)
- 4+ send slots
- Pre-fader sends = **orange** background
- Post-fader sends = **blue** background
- Each send: enable toggle, pre/post button, destination dropdown, level value
- Bottom: Destinations | Panning tabs

### 5. Right Strip (Fader + Controls)
- M / S buttons
- L / e buttons
- Pan indicator (C)
- **Vertical fader** with dB scale
- 0.0 dB display
- R / W buttons (automation)
- Record arm, monitor, input config
- Track name

### 6. Top Bar
- ← → navigation between tracks
- ↑ ↓ move track
- Input routing dropdown
- Track name (editable)
- Output routing dropdown
- Track Presets dropdown

## IPC Commands Needed
- `daw.get_track_plugins` — list inserts
- `daw.load_plugin` — add to insert
- `daw.remove_plugin` — remove from insert
- `daw.reorder_plugins` — drag reorder
- `daw.set_plugin_enabled` — bypass toggle
- `daw.get_plugin_parameters` / `daw.set_plugin_parameter` — EQ control
- `daw.get_sends` / `daw.set_send_level` / `daw.send.set_pan` — sends
- `daw.set_track_gain` / `daw.set_track_pan` — fader/pan
- `daw.phase.get` / `daw.phase.invert_all` — phase

## EQ Implementation Detail
Ardour ships with `a-EQ` (LV2 plugin). To use it as channel EQ:
1. On channel settings open, check if track has `a-EQ` loaded
2. If not, auto-load it: `daw.load_plugin` with name `a-EQ`
3. Get its parameters: `daw.get_plugin_parameters`
4. Map parameters to the 4-band EQ UI
5. When user drags nodes or changes values, call `daw.set_plugin_parameter`
6. The EQ curve is calculated in JS from the band parameters (biquad math)

## Priority
This is the single most important UI feature for professional use. It should be
the first thing built in the next session.
