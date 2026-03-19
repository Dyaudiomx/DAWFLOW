# DAWFLOW — Project Instructions for Claude

## What Is This Project?

DAWFLOW is a fork of [Ardour](https://github.com/Ardour/ardour) (GPL-2.0-or-later), rebuilt to become the world's first AI-native Digital Audio Workstation. The goal is to compete with Cubase, Ableton Live, and Logic Pro — with deep AI integration that no other DAW offers.

---

## The Business Model: GPL Engine + Proprietary Product

This is the most important thing to understand about this project.

### Two Repos, One Product

| Repo | License | What | Visibility |
|---|---|---|---|
| `Dyaudiomx/dawflow-engine` (submodule at `engine/`) | GPL-2.0 | Ardour fork + plugin system | Private now, public at ship |
| `Dyaudiomx/DAWFLOW` (this repo) | Proprietary | React UI, plugins, SDK, branding, installer | Private forever |

The **product** (what users download) is a single installer that bundles the engine + React UI + pre-configured plugins. The **open source release** is just the bare engine repo with no UI, no plugins, no branding.

### What Is Open Source (GPL) — Engine Repo

The engine is the API surface. It provides functionality but no premium experience:

- The original Ardour codebase (`engine/libs/`, `engine/gtk2_ardour/`, etc.)
- The plugin loading system (`engine/libs/dawflow_ipc/`, `DawflowPluginHost`, `WebViewPanel`)
- The WebSocket server (port 3818) — Ardour's existing protocol
- Bug fixes, performance improvements, build system changes
- A basic/minimal web surface (Ardour's mixer/transport surfaces)

### What Is Proprietary (Closed Source) — This Repo

Everything that makes DAWFLOW special. Two delivery mechanisms:

**1. React UI (`dawflow-ui/`)** — Communicates over WebSocket (port 3818)
- Full Cubase-style interface (zones, inspector, mixer, transport)
- AI Chat panel (embedded directly in the React UI)
- All visual design, theming, and UX
- Served as a web surface at `http://localhost:3818/builtin/dawflow/`
- Runs in the browser or in the engine's embedded WebView

**2. `.dawflow` Plugins (`sdk/plugins/`)** — Communicate over Unix domain sockets (IPC)
- Separate processes, spawned by the engine
- Heavy compute (AI inference, audio analysis, cloud sync)
- Each plugin has its own binary + web UI
- Built with the Plugin SDK (`sdk/dawflow_sdk.h`, MIT licensed)

### The GPL Boundaries

```
  Engine (GPL, public)              Product (Proprietary, private)
  ┌─────────────────────┐           ┌─────────────────────────────┐
  │ Ardour core          │ WebSocket │ React UI (dawflow-ui/)      │
  │ WebSocket server     │◄─────────►│ - Cubase-style layout       │
  │ (port 3818)          │ (browser  │ - AI Chat panel             │
  │                      │  process) │ - All premium UX            │
  │ Plugin host          │           └─────────────────────────────┘
  │ IPC socket server    │ Unix IPC  ┌─────────────────────────────┐
  │ WebView container    │◄─────────►│ .dawflow plugins            │
  │ Plugin loader        │ (separate │ - AI mixing/mastering       │
  └─────────────────────┘  process)  │ - Audio analysis            │
                                     │ - Cloud features            │
                                     └─────────────────────────────┘
```

Both boundaries (WebSocket + Unix IPC) are process/network boundaries. No linking, no derivative work. The React UI runs in a browser or WebView (separate process). Plugins run as child processes.

---

## Rule: Where To Build New Features

**The React UI (`dawflow-ui/`) is the PRIMARY place for new features.** It's fast to iterate (hot reload), proprietary, and directly controls the user experience.

**Use a `.dawflow` plugin when:**
- The feature needs a native binary (audio processing, ML inference)
- It should run as an independent background service
- It needs its own lifecycle separate from the UI

**Modify the engine (`engine/`) ONLY when:**
1. Fixing bugs in existing Ardour functionality
2. Expanding the plugin/WebSocket API (new commands or events)
3. Build system fixes
4. Performance improvements to existing core code
5. Plugin system infrastructure improvements

**In practice**: Most new features are React components in `dawflow-ui/src/`. AI chat, mixing tools, MIDI editors — all React. The engine just exposes data via WebSocket.

---

## React UI Architecture

### Stack
- **React 19** + **Vite 8** + **TypeScript** + **Zustand** (state management)
- Cubase 15 Pro-inspired layout with resizable zones

### Communication: Two Channels
1. **WebSocket (port 3818)** — Real-time streaming: transport state, strip gain/pan/mute, meter levels
   - Auto-connects on load (see `src/services/websocket.ts`)
   - Reconnects every 2 seconds on disconnect
2. **IPC (port 19100)** — 385 commands for everything else: tracks, regions, MIDI, plugins, markers, automation, export
   - See `src/services/ipc.ts` for TypeScript wrappers
   - See `docs/api-reference.md` for complete command reference

### Available WebSocket Commands (UI → Engine)
```typescript
engineTransportRoll(roll: boolean)     // play/stop
engineTransportRecord(record: boolean) // record arm
engineSetTempo(bpm: number)            // tempo change
engineSetStripGain(stripId, gain)      // fader
engineSetStripPan(stripId, pan)        // pan
engineSetStripMute(stripId, mute)      // mute
engineSetPluginEnable(strip, plugin, enabled) // plugin bypass
engineSetPluginParam(strip, plugin, param, value) // plugin param
```

### WebSocket Events (Engine → UI)
- `transport_roll`, `transport_record`, `transport_tempo`, `transport_time`
- `strip_description`, `strip_gain`, `strip_pan`, `strip_mute`, `strip_meter`
- `strip_plugin_description`, `strip_plugin_enable`, `strip_plugin_param_value`

### Layout Structure
```
ProjectWindow
├── Toolbar              (top bar with zone toggles)
├── StatusLine           (audio I/O status)
├── InfoLine             (selected object properties)
├── MainArea
│   ├── LeftZone         (visibility, track list)
│   ├── CenterZone       (timeline/arrangement — placeholder)
│   ├── RightZone        (inspector, channel view)
│   └── LowerZone        (mixer, editor, chord pads, MIDI remote)
└── TransportBar         (play/stop/record, tempo, position)
```

### Zustand Stores
- `stores/transport.ts` — play/stop/record state, tempo, position
- `stores/session.ts` — tracks, track names, volumes, pans, mutes
- `stores/connection.ts` — WebSocket/IPC connection status
- `stores/mixer.ts` — mixer-specific state
- `stores/ui.ts` — zone visibility, widths, heights

### Quick Iteration
```bash
cd dawflow-ui
./deploy.sh          # build + deploy, then refresh browser
# OR for hot reload during development:
npm run dev          # Vite dev server (port 5173), manually set wsUrl
```

---

## Plugin System Architecture

### How Plugins Work

1. User installs `.dawflow` files to `~/.config/dawflow/plugins/`
2. DAW starts → `DawflowPluginHost` scans for plugins, starts socket server
3. User opens Window → DAWFLOW Plugins, clicks Load
4. DAW extracts plugin, spawns it as a child process, passes socket path
5. Plugin connects to socket, registers itself, starts receiving events
6. Plugin serves its web UI on localhost, DAW embeds it in a WebView panel
7. Plugin sends commands to DAW via JSON-RPC 2.0 over IPC
8. DAW sends events to plugin (transport changes, track additions, etc.)

### IPC API — 385 Commands (IMPORTANT: Read This First)

The engine exposes **385 unique IPC commands** covering every major DAW function. Before building or wiring ANY feature, **read the API reference**:

**`docs/api-reference.md`** — Complete documentation of every IPC command:
- Command name, input params (with JSON key names and types), return format, description
- Organized into 34 categories (Session, Transport, Tracks, Regions, MIDI, Plugins, Automation, Metering, Markers, Routing, Groups, VCA, Export, Navigation, etc.)
- 12 broadcast events (engine → plugins/UI)

**`dawflow-ui/src/services/ipc.ts`** — TypeScript wrappers for IPC calls from the React UI.

**How IPC works:**
1. React UI sends `POST http://localhost:19100/api/command` with `{"method": "daw.xxx", "params": {...}}`
2. The ui-shell plugin proxies this to the engine via Unix domain socket (JSON-RPC 2.0)
3. The engine dispatches ALL commands to the GTK main thread via `signal_idle` (thread-safe)
4. Response comes back as JSON

**IPC command files in engine (GPL, open source):**
- `engine/libs/ardour/dawflow_plugin_host.cc` — 35 commands (core session, tracks, plugins)
- `engine/libs/ardour/dawflow_plugin_host_extended.cc` — 52 commands (transport, markers, groups, VCA, routing)
- `engine/libs/ardour/dawflow_commands_editing.cc` — 58 commands (region editing, MIDI notes, waveforms)
- `engine/libs/ardour/dawflow_commands_automation.cc` — 43 commands (automation, metering)
- `engine/libs/ardour/dawflow_commands_critical.cc` — 23 commands (tempo, time sig, punch, sections)
- `engine/libs/ardour/dawflow_commands_high.cc` — 73 commands (recording, session lifecycle, advanced editing)
- `engine/libs/ardour/dawflow_commands_medium.cc` — 77 commands (navigation, export, selection, playlists)
- `engine/libs/ardour/dawflow_commands_final.cc` — 47 commands (MIDI CC, utilities, batch ops)

**IPC Events (DAW → Plugin/UI):**
- `daw.transport.changed`, `daw.routes.added`, `daw.record.changed`
- `daw.session.dirty_changed`, `daw.region.added`, `daw.marker.added`
- `daw.tempo.changed`, `daw.plugin.changed`, and more

**When you need a new command:** Add it to the appropriate `dawflow_commands_*.cc` file using the existing pattern. All commands auto-dispatch to the GTK main thread — no manual `signal_idle` wrapping needed.

### Existing Plugins
- `sdk/plugins/ai-chat/` — AI Assistant plugin (C++ backend + HTML/JS UI on port 19200)

---

## Repository Structure

```
/Users/davidyousefi/dev/DAW FLOW/          (PRODUCT REPO - proprietary)
├── engine/                                 ← git submodule (GPL engine)
│   ├── libs/
│   │   ├── dawflow_ipc/                   # IPC library (GPL)
│   │   └── ardour/                        # Core audio engine (GPL)
│   ├── gtk2_ardour/                       # GUI (GPL)
│   │   ├── dawflow_webview_panel.h/mm     # WKWebView wrapper
│   │   ├── dawflow_panel_manager.h/cc     # Panel lifecycle
│   │   └── dawflow_plugin_manager_dialog.h/cc
│   ├── share/web_surfaces/                # Ardour web surfaces
│   └── wscript                            # Engine build system
├── dawflow-ui/                            # React UI (PROPRIETARY)
│   ├── src/                               # TypeScript source
│   │   ├── layout/                        # Zone components (ProjectWindow, etc.)
│   │   ├── inspector/                     # Inspector panel components
│   │   ├── lower-zone/                    # Mixer, editor, chord pads
│   │   ├── shared/                        # Reusable components (Fader, Knob, etc.)
│   │   ├── stores/                        # Zustand state stores
│   │   ├── services/websocket.ts          # WebSocket connection to engine
│   │   └── tokens/cubase-theme.css        # CSS variables / design tokens
│   ├── deploy.sh                          # Build + deploy to engine
│   └── package.json
├── sdk/                                   # Plugin SDK (MIT licensed)
│   ├── dawflow_sdk.h                      # Single-header SDK
│   ├── examples/hello-plugin/
│   └── plugins/ai-chat/                   # AI chat plugin source
├── plugins/                               # Future proprietary plugins
├── branding/                              # Splash, icons, theme
├── configs/                               # Default preferences
├── installer/                             # macOS .app bundler
├── docs/plans/                            # Design documents
├── build.sh                               # Build everything
└── run-dawflow.sh                         # Launch DAWFLOW
```

---

## Building

### Full build (engine + React UI)

```bash
./build.sh           # configures engine, builds C++, builds React UI, deploys
./run-dawflow.sh     # launches DAWFLOW
```

### Engine only (after modifying C++ code in engine/)

```bash
cd engine
python3 waf build -j$(sysctl -n hw.ncpu)
```

### React UI only (after modifying dawflow-ui/)

```bash
cd dawflow-ui
./deploy.sh          # builds + deploys to engine/share/web_surfaces/
```

### First-time setup (install dependencies)

```bash
brew install gtkmm cairomm glibmm pangomm libsigc++ lv2 lilv serd sord sratom \
  fftw liblo aubio taglib vamp-plugin-sdk libwebsockets hidapi libusb lrdf
git submodule update --init --recursive
cd dawflow-ui && npm install && cd ..
./build.sh
```

### Building a Plugin

```bash
cd sdk/examples/hello-plugin
./build.sh  # Compiles + packages as .dawflow
cp hello-plugin.dawflow ~/.config/dawflow/plugins/
```

---

## Git Workflow

### Product repo (this repo)
- **Branch**: `feature/dawflow-plugin-system`
- **Remote `origin`**: `https://github.com/Dyaudiomx/DAWFLOW.git`
- Contains: React UI, SDK, plugins, branding, installer, docs

### Engine repo (submodule at `engine/`)
- **Branch**: `main` (DAWFLOW changes), `master` (Ardour baseline)
- **Remote**: `https://github.com/Dyaudiomx/dawflow-engine.git`
- **Upstream**: `https://github.com/Ardour/ardour.git` (for pulling Ardour updates)
- Contains: All GPL engine code

### When modifying engine code:
```bash
cd engine
# make changes to libs/, gtk2_ardour/, etc.
python3 waf build -j$(sysctl -n hw.ncpu)
git add . && git commit -m "fix: description"
git push origin main
cd ..
git add engine && git commit -m "chore: update engine submodule"
```

---

## Coding Standards

- **Engine code**: Follow Ardour's existing code style (tabs in some files, spaces in others — match the file)
- **Plugin system code** (`engine/libs/dawflow_ipc/`): 4-space indentation, C++17
- **React UI** (`dawflow-ui/`): TypeScript, functional components, Zustand for state
- **CSS**: CSS Modules (`.module.css`) with design tokens from `cubase-theme.css`
- Always use `#ifdef __APPLE__` guards for macOS-specific code in engine
- Use `PBD::Signal` for event handling in engine code
- Use JSON-RPC 2.0 for all IPC communication

---

## What NOT To Do

1. **Do NOT add features directly to the engine** — build them in the React UI or as plugins
2. **Do NOT modify the GPL license** — the engine stays GPL
3. **Do NOT bundle proprietary code in the engine repo** — it only goes in this product repo
4. **Do NOT break backward compatibility** with Ardour sessions (`.ardour` files must still load)
5. **Do NOT remove Ardour functionality** — we add on top, we don't subtract
6. **Do NOT commit API keys, secrets, or credentials** to any repo
7. **Do NOT deploy the React UI into the engine's git tracking** — it's deployed at build time only
