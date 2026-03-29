# DAWFLOW — Project Instructions for Claude

## What Is This Project?

DAWFLOW is a fork of [Ardour](https://github.com/Ardour/ardour) (GPL-2.0-or-later), rebuilt to become the world's first AI-native Digital Audio Workstation. The goal is to compete with Cubase, Ableton Live, and Logic Pro — with deep AI integration that no other DAW offers.

---

## Architecture: Native GTK UI + AI Plugin

**As of March 2026, DAWFLOW uses a native UI approach.** We modify Ardour's GTK2+Cairo UI directly to achieve our Cubase-inspired design. There is no separate web UI layer for the main DAW interface.

### What This Means

- **The native GTK UI is the product.** All visual changes, new panels, restyled widgets — everything happens in `engine/gtk2_ardour/`
- **Cairo for custom drawing.** GTK2 provides layout/events, Cairo paints modern visuals (gradients, rounded corners, custom shapes)
- **No IPC bridge needed.** Features have direct access to the Ardour engine — no HTTP, no WebSocket, no state sync bugs
- **AI Chat stays as a WebView plugin.** The AI assistant (`sdk/plugins/ai-chat/`) runs as a separate process with its own web UI in a dockable panel. This is the one exception

### Why Not a Web UI?

We previously built a React UI (`dawflow-ui/`) that communicated over WebSocket/IPC. It required 2,000+ IPC commands just to bridge the gap, added latency to every interaction, and tripled the work for every feature. The native approach eliminates all of that.

The React UI code is preserved in `dawflow-ui/` as a **visual design reference only** — use it to see what the target look should be, but don't build on it.

---

## GPL Compliance

DAWFLOW is GPL-2.0-or-later, same as Ardour. Everything ships as GPL.

### What This Means In Practice

- Users must purchase DAWFLOW to get the product
- The GPL source code is available **on request** to paying customers only (not publicly listed)
- GPL notice goes in the license agreement / documentation — not on the website or marketing
- The AI assistant plugin can remain proprietary (separate process, no linking)

### The One Exception: AI Plugin

The AI chat plugin (`sdk/plugins/ai-chat/`) communicates over Unix IPC as a separate process. It contains our proprietary AI model, prompts, and cloud integration. This stays closed source because it's not linked to the GPL engine.

---

## Rule: Where To Build New Features

**The native GTK UI (`engine/gtk2_ardour/`) is the PRIMARY place for new features.** Direct access to the engine, no bridge layer, immediate results.

**Use Cairo custom drawing when:**
- The default GTK2 widget looks outdated
- You need modern visuals (gradients, rounded corners, shadows, custom shapes)
- You're restyling track headers, mixer strips, transport bar, etc.

**Use a `.dawflow` plugin when:**
- The feature needs to stay proprietary (AI assistant)
- It should run as an independent background service
- It needs its own lifecycle separate from the DAW

**Use `dawflow-ui/` (React code) only as:**
- Visual design reference — colors, layout proportions, spacing, component hierarchy
- Never as the runtime UI — it is archived

---

## Native UI Restyling Approach

### The Strategy

Ardour's UI uses GTK2 for layout + Cairo for custom rendering. Many widgets (meters, waveforms, timeline) are already custom-drawn with Cairo. The "ugly" parts are just unstyled default GTK2 widgets.

Our approach:
1. **Keep GTK2 as the skeleton** — layout, event handling, window management
2. **Replace widget rendering with Cairo** — custom `on_expose_event()` overrides
3. **Use `dawflow-ui/` as the design spec** — match colors, spacing, proportions from our React UI
4. **Work widget by widget** — track headers, mixer strips, transport bar, toolbar, etc.

### Key Files for Restyling

| Component | Ardour Source |
|---|---|
| Track headers | `engine/gtk2_ardour/time_axis_view.cc`, `route_time_axis_view.cc` |
| Mixer strips | `engine/gtk2_ardour/mixer_strip.cc` |
| Transport bar | `engine/gtk2_ardour/ardour_ui.cc` (transport section) |
| Toolbar | `engine/gtk2_ardour/editor_actions.cc` |
| Meter rendering | `engine/gtk2_ardour/level_meter.cc` |
| Waveforms | `engine/gtk2_ardour/audio_region_view.cc` |
| Timeline/rulers | `engine/gtk2_ardour/editor_rulers.cc` |
| Color theme | `engine/gtk2_ardour/themes/dark-dawflow.colors` |

### Design Reference (React UI)

Use these files to see the target look:
- `dawflow-ui/src/tokens/cubase-theme.css` — color variables, spacing, fonts
- `dawflow-ui/src/components/TrackHeader.tsx` — track header design
- `dawflow-ui/src/lower-zone/LowerMixConsole.tsx` — mixer layout
- `dawflow-ui/src/layout/TransportBar.tsx` — transport bar design
- `dawflow-ui/src/layout/Toolbar.tsx` — toolbar layout

---

## Repository Structure

```
/Users/davidyousefi/dev/DAW FLOW/
├── engine/                                 ← git submodule (Ardour fork, GPL)
│   ├── libs/ardour/                       # Core audio engine
│   ├── gtk2_ardour/                       # GTK UI — THIS IS WHERE WE WORK
│   │   ├── themes/dark-dawflow.colors     # Color theme
│   │   ├── time_axis_view.cc             # Track headers
│   │   ├── mixer_strip.cc               # Mixer strips
│   │   ├── level_meter.cc               # Meter rendering
│   │   ├── audio_region_view.cc         # Waveform display
│   │   ├── editor_rulers.cc             # Timeline rulers
│   │   └── ardour_ui.cc                 # Main UI, transport
│   ├── share/web_surfaces/               # Web surfaces (legacy)
│   └── wscript                           # Build system
├── dawflow-ui/                            # ARCHIVED — React UI (design reference only)
│   ├── src/                              # Use as visual spec, don't run
│   └── package.json
├── sdk/                                   # Plugin SDK (MIT licensed)
│   ├── dawflow_sdk.h                     # Single-header SDK
│   └── plugins/
│       ├── ai-chat/                      # AI assistant (proprietary, WebView panel)
│       └── ui-shell/                     # DISABLED — was the WebView overlay
├── branding/                             # Splash, icons, theme
├── docs/plans/                           # Design documents
├── build.sh                              # Build engine
└── run-dawflow.sh                        # Launch DAWFLOW
```

---

## Building

### Engine (after modifying C++ / GTK code)

```bash
cd engine
python3 waf build -j$(sysctl -n hw.ncpu)
```

### Launch

```bash
./run-dawflow.sh
```

### First-time setup

```bash
brew install gtkmm cairomm glibmm pangomm libsigc++ lv2 lilv serd sord sratom \
  fftw liblo aubio taglib vamp-plugin-sdk libwebsockets hidapi libusb lrdf
git submodule update --init --recursive
./build.sh
```

---

## Git Workflow

### Engine repo (submodule at `engine/`)
- **Branch**: `main`
- **Remote**: `https://github.com/Dyaudiomx/dawflow-engine.git`
- **Upstream**: `https://github.com/Ardour/ardour.git`

### When modifying engine code:
```bash
cd engine
# make changes to gtk2_ardour/, libs/, etc.
python3 waf build -j$(sysctl -n hw.ncpu)
git add . && git commit -m "fix: description"
git push origin main
cd ..
git add engine && git commit -m "chore: update engine submodule"
```

---

## Coding Standards

- **Engine code**: Follow Ardour's existing code style (tabs in some files, spaces in others — match the file)
- **Cairo drawing**: Use `Cairo::Context` (`cr`), match colors from `dawflow-ui/src/tokens/cubase-theme.css`
- Always use `#ifdef __APPLE__` guards for macOS-specific code
- Use `PBD::Signal` for event handling

---

## Rule: Reference Ardour's Implementation First

**Before restyling ANY widget, ALWAYS read how Ardour currently implements it.** Understand the existing rendering, event handling, and state management before changing visuals.

### Key files to study:

| Feature | Source files |
|---|---|
| Waveform rendering | `audio_region_view.cc`, `libs/ardour/audioregion.cc` |
| Region trimming | `editor_drag.cc` (TrimDrag) |
| Fade curves | `audio_region_view.cc` (redraw_start_xfade) |
| Peak caching | `libs/ardour/audiosource.cc` |
| Meter ballistics | `level_meter.cc` |
| Timeline/rulers | `editor_rulers.cc` |
| Snap to grid | `editor_snap.cc` |
| Track headers | `time_axis_view.cc`, `route_time_axis_view.cc` |

---

## What NOT To Do

1. **Do NOT use the React UI as runtime** — it's archived, design reference only
2. **Do NOT modify the GPL license** — everything ships GPL (except AI plugin)
3. **Do NOT break backward compatibility** with Ardour sessions (`.ardour` files must still load)
4. **Do NOT remove Ardour functionality** — we add on top, we don't subtract
5. **Do NOT commit API keys, secrets, or credentials** to any repo

---

## Plugin System (for AI Chat only)

The `.dawflow` plugin system still works for the AI assistant:

1. User opens Window → DAWFLOW Plugins, loads AI Chat
2. Plugin spawns as child process, connects via Unix socket
3. Plugin serves web UI, DAW embeds it in a WebView panel
4. JSON-RPC 2.0 for IPC commands

The IPC command infrastructure (`dawflow_plugin_host.cc`, `dawflow_commands_*.cc`) remains available for plugins to use. The 2,000+ commands are useful for the AI assistant to control the DAW.

---

## Linear Integration — Task Tracking Workflow

**Linear is the single source of truth for ALL work on DAWFLOW.** Every agent session must follow this workflow.

### The Golden Rules

1. **Every session starts by checking Linear** — before writing any code
2. **Self-assign before working** — move to "In Progress", assign to `"me"`
3. **Never work without a Linear issue** — if the user asks for ad-hoc work, create a Linear issue first
4. **Comment on progress** — at start, at blockers, and at completion
5. **Create new issues for discoveries** — bugs found during work get logged immediately
6. **Move to Done only when verified** — code committed, tested, working

### Session Flow

```
SESSION START
├─ 1. List issues: team=DAWFLOW, assignee="me", state="In Progress"
│     → If found: RESUME that work first
├─ 2. If nothing assigned: list unassigned Todo issues
│     → Pick highest priority, assign to "me", move to "In Progress"
├─ 3. If user gives direct instructions:
│     → Create a new Linear issue, assign, then work
│
DURING WORK
├─ 4. Comment at milestones
├─ 5. Create NEW issues for discovered bugs/needs
│
TASK COMPLETE
├─ 7. Move to "Done"
└─ 8. Comment with summary
```
