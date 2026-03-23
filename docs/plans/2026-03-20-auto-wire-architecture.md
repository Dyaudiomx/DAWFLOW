# DAWFLOW Auto-Wire Architecture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a system where every UI element auto-wires to the correct Ardour IPC command, enabling rapid screen construction from Cubase screenshots.

**Architecture:** Three-layer system — (1) Typed Command Registry auto-generated from API docs, (2) Reusable DAW Component Library with built-in engine bindings, (3) Screen Layouts composed from components. New screens require zero manual IPC wiring.

**Tech Stack:** React 19, TypeScript, Zustand, CSS Modules, Vite

---

## Layer 1: Command Registry (`src/engine/registry.ts`)

Auto-generated typed namespace. Every IPC command is a function with exact param types.

```typescript
import { engine } from '../engine/registry';

// Type-safe, auto-complete, impossible to get wrong
await engine.track.setMute('177', true);
await engine.transport.play();
const info = await engine.session.getInfo(); // returns typed object
```

### Categories (~300 commands that DAW UI needs):
- `engine.session.*` — save, load, info, metadata
- `engine.transport.*` — play, stop, record, locate, loop
- `engine.track.*` — CRUD, mute, solo, gain, pan, color, freeze
- `engine.region.*` — split, move, trim, delete, fade, normalize
- `engine.midi.*` — notes, CC, quantize, transpose
- `engine.plugin.*` — add, remove, enable, params, presets
- `engine.automation.*` — points, mode, curves
- `engine.meter.*` — master, track, peaks, loudness
- `engine.marker.*` — add, remove, navigate
- `engine.routing.*` — I/O, sends, groups, VCA
- `engine.export.*` — prepare, execute, status
- `engine.monitor.*` — dim, cut, mono, level

## Layer 2: Component Library (`src/components/`)

Pre-built DAW components that compose into any screen.

| Component | Use Case | Auto-Wire |
|-----------|----------|-----------|
| `DawButton` | M/S/R/W/A toggles | `variant` prop sets color |
| `DawFader` | Volume faders | Connected to track gain |
| `DawKnob` | Pan, send level | Bipolar/unipolar modes |
| `DawMeter` | Level meters | Peak hold, color zones |
| `DawSelect` | Routing, modes | Dark themed dropdown |
| `DawInput` | Tempo, position | Numeric with suffix |
| `DawSlot` | Insert/send slots | Bypass dot, remove X |
| `DawSection` | Inspector panels | Collapsible header |
| `DawToolbar` | Tool rows | Groups + separators |
| `ChannelStrip` | Mixer strips | Full strip with all controls |

## Layer 3: Screen Layouts

Each screen is just composition of Layer 2 components in a layout.

### Screens to Build (priority order):

**Tier 1 — Core (must work for basic production):**
1. Project Window (arrangement view + track list)
2. MixConsole (full mixer with strips)
3. Transport Bar (transport + locators + tempo)
4. Inspector (track properties + inserts + sends)

**Tier 2 — Editing:**
5. Key Editor (MIDI piano roll)
6. Sample Editor (audio waveform editor)
7. Drum Editor (grid-based drum editor)

**Tier 3 — Management:**
8. Export Audio Mixdown dialog
9. Project Setup dialog
10. Audio Connections dialog
11. Plugin Manager

**Tier 4 — Advanced:**
12. Control Room / Monitor section
13. Chord Pads
14. MIDI Remote
15. Score Editor

## Workflow: Screenshot to Working Screen

```
1. David sends Cubase screenshot
2. Claude identifies components needed
3. Claude composes React layout using Layer 2 components
4. Components auto-wire via Layer 1 registry
5. Build + deploy
6. Test in running DAW
7. Fix any visual issues (no IPC debugging needed)
```

## Timeline

- **Phase 1 (Day 1-2)**: Command registry + component library
- **Phase 2 (Day 3-5)**: Core screens (Project Window, MixConsole, Transport, Inspector)
- **Phase 3 (Day 6-8)**: Editor screens (Key Editor, Sample Editor, Drum Editor)
- **Phase 4 (Day 9-10)**: Dialogs + management screens
- **Phase 5 (Week 3-4)**: Polish, testing, edge cases
