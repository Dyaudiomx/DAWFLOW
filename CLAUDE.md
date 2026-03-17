# DAWFLOW — Project Instructions for Claude

## What Is This Project?

DAWFLOW is a fork of [Ardour](https://github.com/Ardour/ardour) (GPL-2.0-or-later), rebuilt to become the world's first AI-native Digital Audio Workstation. The goal is to compete with Cubase, Ableton Live, and Logic Pro — with deep AI integration that no other DAW offers.

---

## The Business Model: GPL Core + Proprietary Plugins

This is the most important thing to understand about this project.

### What Is Open Source (GPL)

The **core DAW** is open source and must remain GPL-compliant. This includes:

- The original Ardour codebase (all of `libs/`, `gtk2_ardour/`, etc.)
- The **plugin loading system** we built (`libs/dawflow_ipc/`, `DawflowPluginHost`, `DawflowPluginManagerDialog`, `WebViewPanel`)
- Any bug fixes, performance improvements, or changes made directly to the Ardour core code
- The build system (`wscript` files)

The open source release will contain: Ardour's full functionality + the ability to discover, load, and run `.dawflow` plugins. That's it.

### What Is Proprietary (Closed Source, Sellable)

**ALL new features, UI improvements, AI tools, branding, and value-adds are built as `.dawflow` plugins.** These plugins:

- Run as **separate processes** communicating via Unix domain sockets (IPC)
- Are **NOT derivative works** of the GPL DAW — they are independent executables
- Can be sold, licensed, and distributed without source code disclosure
- Are built using the Plugin SDK (`sdk/dawflow_sdk.h`, MIT licensed)

This includes:
- DAWFLOW branding (name, splash screen, icons, theme)
- AI Chat Assistant (natural language DAW control)
- AI Mixing/Mastering tools
- MIDI generation and composition tools
- Advanced audio analysis
- Cloud collaboration features
- Built-in instruments and effects
- Any future premium features

### Why This Works Legally

The GPL boundary is the **Unix domain socket** (process boundary):

```
┌─────────────────────────┐     Unix Socket     ┌──────────────────────────┐
│  DAW Process (GPL)      │◄──── JSON-RPC ─────►│  Plugin Process          │
│  - Ardour core          │     (IPC boundary)   │  (PROPRIETARY)           │
│  - Plugin host/loader   │                      │  - Your features         │
│  - WebView container    │                      │  - Your AI tools         │
│  - Socket server        │                      │  - Your UI               │
└─────────────────────────┘                      └──────────────────────────┘
```

Separate processes communicating via sockets are definitively NOT derivative works under any interpretation of the GPL. This is the same pattern used by many commercial products built on GPL foundations.

---

## Rule: NEVER Put New Features Directly in the Core

**When implementing ANY new feature, you MUST build it as a `.dawflow` plugin — NEVER modify the core DAW code to add features.**

The ONLY acceptable reasons to modify core DAW code are:
1. **Bug fixes** in existing Ardour functionality
2. **Expanding the plugin API** (adding new commands/events the host exposes to plugins)
3. **Build system fixes** (making it compile on more platforms)
4. **Performance improvements** to existing core code
5. **Plugin system infrastructure** (improving the IPC, loader, or host itself)

If you're tempted to add a feature directly to `gtk2_ardour/` or `libs/ardour/`, stop and ask: "Can this be a plugin instead?" The answer is almost always yes.

---

## Plugin System Architecture

### How Plugins Work

1. User installs `.dawflow` files to `~/.config/dawflow/plugins/`
2. DAW starts → `DawflowPluginHost` scans for plugins, starts socket server
3. User opens Window → DAWFLOW Plugins, clicks Load
4. DAW extracts plugin, spawns it as a child process, passes socket path
5. Plugin connects to socket, registers itself, starts receiving events
6. Plugin serves its web UI on localhost, DAW embeds it in a WebView panel
7. Plugin sends commands to DAW (set gain, load plugins, control transport, etc.)
8. DAW sends events to plugin (transport changes, track additions, etc.)

### Plugin Package Format (`.dawflow`)

A ZIP archive containing:
```
my-plugin.dawflow
├── manifest.json          # Plugin metadata, capabilities, UI panels
├── bin/
│   ├── macos-arm64/       # Platform-specific binary
│   ├── linux-x86_64/
│   └── windows-x86_64/
├── ui/                    # Web UI files (HTML/CSS/JS)
│   ├── index.html
│   └── ...
└── resources/             # Icons, images, etc.
```

### Available DAW Commands (Plugin → DAW)
- `daw.get_session_info` — session name, sample rate, transport state
- `daw.get_tracks` — all tracks with gain, mute, solo status
- `daw.set_track_gain` — set track gain in dB
- `daw.set_track_mute` / `daw.set_track_solo` — toggle mute/solo
- `daw.transport_play` / `daw.transport_stop` / `daw.transport_locate`
- `daw.get_transport_state` — current playback state
- `daw.plugin.register` — register plugin identity with host

### Available DAW Events (DAW → Plugin)
- `daw.transport.changed` — transport state changed
- `daw.routes.added` — new tracks/buses added
- `daw.session.dirty_changed` — session save state changed
- `daw.record.changed` — record arm state changed

**When you need a new command or event:** Add it to `DawflowPluginHost::_register_commands()` or `_connect_session_signals()` in the core, then use it from the plugin. Expanding the API surface is an acceptable core modification.

---

## Project Structure

```
/Users/davidyousefi/dev/DAW FLOW/
├── libs/
│   ├── dawflow_ipc/           # IPC library (GPL, part of core)
│   │   ├── dawflow_ipc/
│   │   │   ├── message.h      # JSON-RPC 2.0 messages
│   │   │   ├── socket_server.h # Unix socket server
│   │   │   ├── socket_client.h # Unix socket client
│   │   │   ├── plugin_manifest.h # .dawflow manifest parser
│   │   │   ├── plugin_loader.h # Plugin process management
│   │   │   └── json.hpp       # nlohmann/json
│   │   └── test/              # Unit tests
│   ├── ardour/                # Core audio engine (GPL)
│   │   ├── ardour/
│   │   │   ├── dawflow_plugin_host.h  # Plugin host (GPL)
│   │   │   └── session.h      # Modified to include plugin host
│   │   └── dawflow_plugin_host.cc
│   └── ... (other Ardour libs)
├── gtk2_ardour/               # GUI (GPL)
│   ├── dawflow_webview_panel.h/mm    # WKWebView wrapper
│   ├── dawflow_panel_manager.h/cc    # Panel lifecycle
│   ├── dawflow_plugin_manager_dialog.h/cc # Plugin manager UI
│   └── ... (other Ardour GUI)
├── sdk/                       # Plugin SDK (MIT licensed, distributable)
│   ├── dawflow_sdk.h          # Single-header SDK for plugin developers
│   ├── json.hpp               # Bundled JSON library
│   └── examples/
│       └── hello-plugin/      # Working example plugin
├── docs/plans/                # Design documents
└── run-dawflow.sh             # Launch script
```

---

## Building

### macOS (arm64)

```bash
# Install dependencies
brew install gtkmm cairomm glibmm pangomm libsigc++ lv2 lilv serd sord sratom \
  fftw liblo aubio taglib vamp-plugin-sdk libwebsockets hidapi libusb lrdf

# Configure
export PKG_CONFIG_PATH="/opt/homebrew/opt/libarchive/lib/pkgconfig:/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig"
export CXXFLAGS="-I/opt/homebrew/include -I/opt/homebrew/opt/libarchive/include -I/opt/homebrew/include/raptor2"
export CFLAGS="-I/opt/homebrew/include -I/opt/homebrew/opt/libarchive/include -I/opt/homebrew/include/raptor2"
export LDFLAGS="-L/opt/homebrew/lib -L/opt/homebrew/opt/libarchive/lib"

python3 waf configure \
  --with-backends=coreaudio,dummy \
  --no-phone-home \
  --boost-include=/opt/homebrew/include \
  --also-include=/opt/homebrew/include,/opt/homebrew/opt/libarchive/include,/opt/homebrew/include/raptor2 \
  --also-libdir=/opt/homebrew/lib,/opt/homebrew/opt/libarchive/lib \
  --keepflags --arm64 --noconfirm

# Build
python3 waf build -j$(sysctl -n hw.ncpu)

# Run
./run-dawflow.sh
```

### Building a Plugin

```bash
cd sdk/examples/hello-plugin
./build.sh  # Compiles + packages as .dawflow
cp hello-plugin.dawflow ~/.config/dawflow/plugins/
```

---

## Git Workflow

- **Branch**: `feature/dawflow-plugin-system` — plugin system implementation
- **Remote `origin`**: `https://github.com/Dyaudiomx/DAWFLOW.git` (our repo)
- **Remote `upstream`**: `https://github.com/Ardour/ardour.git` (for pulling Ardour updates)

---

## Coding Standards

- Follow Ardour's existing code style in core files (tabs in some files, spaces in others — match the file)
- New plugin system code (`libs/dawflow_ipc/`) uses 4-space indentation, C++17
- Plugin SDK uses standard modern C++ conventions
- Always use `#ifdef __APPLE__` guards for macOS-specific code
- Use `PBD::Signal` for event handling in core code
- Use JSON-RPC 2.0 for all IPC communication

---

## What NOT To Do

1. **Do NOT add features directly to the Ardour core** — build them as plugins
2. **Do NOT modify the GPL license** — the core stays GPL
3. **Do NOT include proprietary plugin source code in this repo** — plugins live in separate private repos
4. **Do NOT break backward compatibility** with Ardour sessions (`.ardour` files must still load)
5. **Do NOT remove Ardour functionality** — we add on top, we don't subtract
6. **Do NOT commit API keys, secrets, or credentials** to this repo
