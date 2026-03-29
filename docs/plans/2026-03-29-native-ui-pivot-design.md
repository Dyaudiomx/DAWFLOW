# DAWFLOW Native UI Pivot — Design Document

**Date:** 2026-03-29
**Status:** Approved

## Decision

Abandon the React WebView overlay approach. Restyle Ardour's native GTK2+Cairo UI directly to achieve the Cubase 15 Pro-inspired look. Keep only the AI chat plugin as a WebView panel.

## Why

### Problems with the WebView approach
- 2,000+ IPC commands needed to bridge React UI ↔ engine — tripled work for every feature
- HTTP/WebSocket round trips added latency to every interaction
- State synchronization bugs between engine and React UI were the #1 source of issues
- Simple features (folder tracks, VCA) required 4+ async HTTP calls with fragile error handling
- Two codebases to maintain (C++ engine + TypeScript UI)

### Why native works better
- Direct access to all engine internals — no bridge layer
- Every Ardour feature works immediately (20+ years of proven DAW behavior)
- One codebase, one process, zero sync bugs
- Cairo can draw anything — gradients, rounded corners, shadows, custom shapes
- Much faster path to a shippable product

### GPL clarification
- GPL source code only needs to be available on request to purchasers
- No requirement to publicly list source code on website
- GPL notice goes in license agreement documentation only
- AI assistant plugin stays proprietary (separate process, no linking)

## Architecture

```
DAWFLOW Application (single process)
├── Ardour Engine (audio, MIDI, routing, plugins)
├── GTK2 Layout (window management, events, containers)
├── Cairo Rendering (all custom visuals — modern look)
├── Dark Cubase Theme (colors, fonts via .colors file)
└── Plugin Host (IPC server for external plugins)

AI Chat Plugin (separate process, proprietary)
├── C++ backend (inference, cloud API)
├── HTML/JS UI (served on localhost)
└── Embedded in DAW via WebView panel
```

## Restyling Strategy

### Phase 1: Color Theme (Foundation)
- Update `engine/gtk2_ardour/themes/dark-dawflow.colors`
- Match colors from `dawflow-ui/src/tokens/cubase-theme.css`
- This affects every widget globally — biggest visual impact for least work

### Phase 2: Track Headers
- Override rendering in `time_axis_view.cc` / `route_time_axis_view.cc`
- Cairo custom draw: colored left strip, track number, M/S/R/W buttons
- Reference: `dawflow-ui/src/components/TrackHeader.tsx`

### Phase 3: Mixer Strips
- Restyle `mixer_strip.cc`
- Vertical fader, pan knob, insert/send slots, channel name
- Reference: `dawflow-ui/src/lower-zone/LowerMixConsole.tsx`

### Phase 4: Transport Bar
- Restyle transport section in `ardour_ui.cc`
- Modern play/stop/record buttons, tempo, position display
- Reference: `dawflow-ui/src/layout/TransportBar.tsx`

### Phase 5: Toolbar
- Restyle editor toolbar
- Tool buttons, snap/grid controls, quantize
- Reference: `dawflow-ui/src/layout/Toolbar.tsx`

## What's Preserved

- `dawflow-ui/` — kept as visual design reference (archived, not runtime)
- IPC command infrastructure — still used by AI chat plugin
- Plugin system — still works for AI assistant and future plugins
- `.dawflow` plugin format — unchanged

## What's Removed/Disabled

- `sdk/plugins/ui-shell/manifest.json` — `auto_start: false` (WebView overlay disabled)
- No more WebView-based main UI
- No more IPC wiring tasks for UI features

## Build Workflow (simplified)

```bash
# Edit GTK/Cairo code in engine/gtk2_ardour/
cd engine && python3 waf build -j$(sysctl -n hw.ncpu)
./run-dawflow.sh
```

No more `npm run build`, `deploy.sh`, plugin cache clearing, etc.

## Risk Assessment

- **Cairo learning curve** — mitigated by Ardour already using Cairo extensively for meters, waveforms, timeline
- **GTK2 layout rigidity** — mitigated by using Cairo custom drawing to override widget appearance
- **Slower iteration than React hot reload** — C++ requires rebuild (~10-20 seconds), but no more IPC debugging saves time overall
