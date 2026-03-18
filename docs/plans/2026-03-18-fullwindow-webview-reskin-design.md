# Full-Window WebView Reskin Design

**Date**: 2026-03-18
**Status**: Approved

## Goal

Replace the native GTK2 Ardour UI with the proprietary React UI, loaded via a full-window WKWebView. The React UI is served by a proprietary plugin and communicates with the engine over WebSocket. The open-source build shows normal Ardour UI (no plugin = no reskin).

## Architecture

The engine (GPL) provides three new generic capabilities:
1. Auto-start WebSocket server on launch
2. Auto-load `.dawflow` plugins on startup
3. A plugin can request a full-window WebView via IPC

A proprietary plugin (`dawflow-ui-shell`) uses these capabilities to serve the React UI and request the full-window WebView. The React UI connects back to the engine via WebSocket (port 3818) for all DAW control.

## Engine Modifications (GPL)

### 1. Auto-start WebSocket server

In `ardour_ui_startup.cc` → `startup_done()`, programmatically activate the WebSocket control surface (port 3818). No manual Preferences toggle needed.

### 2. Auto-load plugins on startup

In the startup sequence, after session loads, call `DawflowPluginHost` to scan and auto-load plugins from `~/.config/dawflow/plugins/` that have `"auto_start": true` in their manifest.

### 3. New IPC command: `daw.ui.request_main_webview`

Plugin sends:
```json
{"method": "daw.ui.request_main_webview", "params": {"url": "http://localhost:19100/"}}
```

Engine response:
- Hides all GTK2 content in `main_vpacker` (tabs, menu, etc.)
- Creates a full-window WKWebView as child of `_main_window`
- Loads the URL via `gdk_quartz_window_get_nsview()` + `[nsview addSubview:webview]`
- WebView fills entire window, autoresizes with it
- GTK2 widgets stay alive (not destroyed) — engine keeps running

## The Proprietary Plugin: dawflow-ui-shell

Minimal C++ plugin (~50 lines):
1. Connects to engine IPC socket
2. Starts HTTP server (port 19100) serving built React UI files
3. Sends `daw.ui.request_main_webview` with its URL

Manifest:
```json
{
    "id": "com.dawflow.ui-shell",
    "name": "DAWFLOW UI",
    "auto_start": true,
    "capabilities": ["ui_takeover"],
    "ui_url": "http://localhost:19100/"
}
```

Install location: `~/.config/dawflow/plugins/dawflow-ui-shell.dawflow`

## Full Startup Flow

```
App launches → Engine starts, loads session
  → startup_done() fires
    → Auto-starts WebSocket server (port 3818)
    → Auto-loads plugins (scans ~/.config/dawflow/plugins/)
      → dawflow-ui-shell plugin starts
        → Connects to engine IPC
        → Starts HTTP server (port 19100) serving React UI
        → Sends daw.ui.request_main_webview("http://localhost:19100/")
          → Engine hides GTK2 content
          → Creates full-window WKWebView, loads URL
            → React UI loads, connects to ws://localhost:3818
            → User sees Cubase-style UI, all controls work
```

## GPL Boundary

```
Engine (GPL)                         Product (Proprietary)
┌──────────────────────┐             ┌─────────────────────────┐
│ WebSocket server     │◄──ws:3818──►│ React UI (in WebView)   │
│ Plugin auto-loader   │             │ - Cubase layout         │
│ WebView host         │             │ - All premium UX        │
│ (generic capability) │             │ - AI chat panel         │
│                      │◄──ipc─────►│ dawflow-ui-shell plugin │
│ request_main_webview │             │ - Serves React UI       │
│ (any plugin can use) │             │ - Requests WebView      │
└──────────────────────┘             └─────────────────────────┘
```

Engine provides generic capabilities. Plugin provides the actual UI. React app does the work.

## Open Source vs Product

| | Open Source (engine only) | Product (engine + plugins) |
|---|---|---|
| What user sees | Normal Ardour GTK2 UI | Full React UI (Cubase-style) |
| WebSocket server | Auto-started (available) | Auto-started (used by React UI) |
| Plugin loading | Works (no plugins installed) | dawflow-ui-shell auto-loaded |
| WebView | Capability exists, unused | Full-window, shows React UI |

## Dev Workflow

- **Fast iteration**: `cd dawflow-ui && npm run dev` → open `localhost:5173` in browser. Same UI, hot reload, no plugin needed.
- **Test in-app**: Build plugin, install to plugins dir, launch DAW → React UI appears in WebView.
- **Production**: Plugin serves from cloud URL or bundled files.

## Implementation Tasks

1. Engine: Auto-start WebSocket server in `startup_done()`
2. Engine: Auto-load plugins with `auto_start: true` in `startup_done()`
3. Engine: Add `daw.ui.request_main_webview` IPC command
4. Engine: Implement GTK2 hide + full-window WKWebView creation
5. Plugin: Create `dawflow-ui-shell` plugin (C++ binary + manifest)
6. Plugin: HTTP server to serve React UI build output
7. Integration: Install plugin, test full flow
