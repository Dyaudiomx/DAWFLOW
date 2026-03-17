# DAWFLOW Cubase 15 Pro UI Redesign — Design Document

**Date:** 2026-03-17
**Status:** Approved
**Approach:** Hybrid (Web UI shell around native GTK2 canvas)

---

## Decisions

1. **Hybrid architecture** — React web UI wraps around the native GTK2 canvas
2. **React + Vite + TypeScript + Zustand** — Modern web stack
3. **Pixel-perfect Cubase 15 Pro clone** — Match layout, colors, button placement exactly
4. **Phase 1: Full 5-zone shell** — Build complete Project Window frame first, populate zones after

## Architecture

- Single WebView hosts the entire React app
- Native GTK2 canvas embedded in center zone for timeline/waveforms/MIDI
- Two communication channels: WebSocket/OSC (existing) + DAWFLOW IPC JSON-RPC (existing)
- Zustand stores for state management
- CSS custom properties for all design tokens (easy color swapping via eyedropper later)

## What Stays Native (GTK2/Canvas)

- Timeline/arrangement canvas
- Waveform rendering
- MIDI note rendering in piano roll
- Automation curve drawing
- Drag/drop on timeline
- Region/event interaction
- Ruler rendering

## What Becomes Web UI (React)

- Toolbar (all 26 Cubase sections)
- Left Zone / Inspector (accordion sections)
- Right Zone (VSTi, Media, CR, Meter tabs)
- Lower Zone (MixConsole, Editor, Sampler, ChordPads, MIDI Remote tabs)
- Transport Bar
- Channel Settings window
- MediaBay browser
- Plugin manager
- All dialogs

## Color System

Approximated from Cubase 15 dark theme. Design token system allows instant swap when exact values are eyedroppered from running Cubase. See `src/tokens/cubase-theme.css`.

## Component Structure

See `dawflow-ui/src/` for full component hierarchy. Key layout components:
- `ProjectWindow.tsx` — 5-zone container
- `Toolbar.tsx` — 26-section toolbar
- `LeftZone.tsx` → `Inspector.tsx` — Accordion track inspector
- `CenterZone.tsx` — Native canvas placeholder
- `RightZone.tsx` — 4-tab panel (VSTi/Media/CR/Meter)
- `LowerZone.tsx` — 5-tab panel (MixConsole/Editor/Sampler/ChordPads/MIDIRemote)
- `TransportBar.tsx` — Bottom transport strip

## Build Phases

1. Scaffold + design tokens + shared components
2. 5-zone shell with resize/collapse
3. Toolbar with all sections
4. Inspector with accordion sections
5. Lower Zone with MixConsole
6. Right Zone with tabs
7. Transport Bar
8. State management + WebSocket bridge
