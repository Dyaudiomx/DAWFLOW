# GPL/Proprietary Separation Design

**Date**: 2026-03-18
**Status**: Approved

## Problem

The DAWFLOW project currently has GPL engine code and proprietary React UI/plugins mixed in one repo. The built React UI assets are deployed into `share/web_surfaces/builtin/dawflow/` inside the GPL source tree. This creates legal ambiguity for selling the UI as a proprietary product.

## Decision

Split into two repos (Approach B — Two Repos). Both stay private during development. At ship time, the engine repo goes public with a clean history.

## Repo Layout

### Product Repo: `Dyaudiomx/DAWFLOW` (private forever)

```
DAWFLOW/
├── engine/                    <- git submodule -> dawflow-engine
├── dawflow-ui/                <- React UI (proprietary)
├── plugins/                   <- proprietary .dawflow plugins
│   └── ai-chat/
├── installer/                 <- macOS .app bundler
├── configs/                   <- default preferences, plugin activation
├── branding/                  <- splash screen, icons, theme
├── sdk/                       <- plugin SDK (MIT, distributed with product)
├── docs/                      <- internal docs, plans
├── build.sh                   <- builds engine + UI + plugins, packages
├── run-dawflow.sh             <- dev launch script
└── CLAUDE.md
```

### Engine Repo: `Dyaudiomx/dawflow-engine` (private now, public at ship)

```
dawflow-engine/
├── libs/                      <- Ardour libs + dawflow_ipc
├── gtk2_ardour/               <- GUI + webview panel + plugin manager
├── share/
│   └── web_surfaces/
│       └── builtin/
│           ├── mixer/         <- Ardour's existing surfaces
│           ├── transport/
│           └── protocol/
│           (NO dawflow/ surface — that's proprietary)
├── wscript
└── ... (all Ardour source)
```

## What Goes Where

### Engine (GPL-2.0-or-later)

- All Ardour source code (`libs/`, `gtk2_ardour/`, etc.)
- `libs/dawflow_ipc/` — IPC library
- `libs/ardour/dawflow_plugin_host.cc` — plugin host
- `gtk2_ardour/dawflow_webview_panel.mm` — WebView container
- `gtk2_ardour/dawflow_panel_manager.cc` — panel lifecycle
- `gtk2_ardour/dawflow_plugin_manager_dialog.cc` — plugin manager UI
- Ardour's existing web surfaces (mixer, transport, protocol)
- Build system (`wscript` files)

### Product (Proprietary)

- `dawflow-ui/` — React UI (Cubase-style)
- All `.dawflow` plugins (AI chat, mixing tools, etc.)
- `sdk/` — plugin SDK (MIT licensed, ships with product)
- Installer, branding, configs
- `share/web_surfaces/builtin/dawflow/` build output (deployed at build time, not in engine repo)

## GPL Boundary

```
Engine (GPL, public)              Product (Proprietary, private)
┌─────────────────────┐           ┌─────────────────────┐
│ Ardour core         │ WebSocket │ React UI             │
│ WebSocket server    │◄─────────►│ (browser process)    │
│ Plugin host         │           └─────────────────────┘
│ WebView container   │ Unix IPC  ┌─────────────────────┐
│ Plugin loader       │◄─────────►│ .dawflow plugins     │
└─────────────────────┘           │ (separate processes) │
                                  └─────────────────────┘
```

Both boundaries (WebSocket + Unix IPC) are process/network boundaries. No linking, no derivative work.

## Development Workflow

1. Engine changes: commit in `engine/` submodule, push to `dawflow-engine`
2. UI/plugin changes: commit in product repo root
3. `build.sh` builds engine, builds UI, deploys UI into engine's web_surfaces dir, runs DAW

## Ship Day Plan

1. Create new public `dawflow-engine` repo (or make existing one public)
2. Squash history to clean starting commit
3. Add README + GPL-2.0 LICENSE
4. Product repo stays private

## Implementation Steps

1. Create `dawflow-engine` repo on GitHub (private)
2. Push current Ardour source (minus proprietary files) to it
3. Remove `share/web_surfaces/builtin/dawflow/` from engine
4. Add engine as submodule in product repo under `engine/`
5. Update `run-dawflow.sh` and create `build.sh` for new structure
6. Update `dawflow-ui/deploy.sh` to target `engine/share/web_surfaces/builtin/dawflow/`
7. Move `sdk/` to product repo root (already there, just remove from engine)
