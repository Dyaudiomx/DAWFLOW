# Full-Window WebView Reskin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Ardour GTK2 UI with the proprietary React UI loaded in a full-window WKWebView, triggered by a proprietary plugin on startup.

**Architecture:** Engine gets 3 new capabilities (auto-start WebSocket, auto-load plugins, full-window WebView IPC command). A proprietary `dawflow-ui-shell` plugin serves the React UI and requests the WebView. The React UI connects to the engine via WebSocket (port 3818).

**Tech Stack:** C++17, Objective-C++ (WKWebView), GTK2, JSON-RPC 2.0 IPC, React/TypeScript

---

### Task 1: Auto-start WebSocket Server on Launch

The WebSocket control surface (port 3818) must be active before the React UI loads. Currently it requires manual enabling in Preferences.

**Files:**
- Modify: `engine/gtk2_ardour/ardour_ui_startup.cc:713-742` (startup_done function)
- Reference: `engine/libs/surfaces/websockets/ardour_websockets.h`

**Step 1: Add includes to ardour_ui_startup.cc**

At the top of the file, add:
```cpp
#include "ardour/control_protocol_manager.h"
```

**Step 2: Auto-activate WebSocket surface in startup_done()**

In `engine/gtk2_ardour/ardour_ui_startup.cc`, inside `startup_done()`, right before `WM::Manager::instance().show_visible()` (line 732), add:

```cpp
	/* Auto-start WebSocket server for plugin and web UI communication */
	{
		auto& cpm = ControlProtocolManager::instance ();
		for (auto const& cpi : cpm.control_protocol_info) {
			if (cpi->name == "WebSockets Server (Experimental)") {
				if (!cpi->protocol || !cpi->protocol->active ()) {
					cpm.activate (*cpi);
					PBD::info << "DAWFLOW: Auto-started WebSocket server" << endmsg;
				}
				break;
			}
		}
	}
```

**Step 3: Build and test**

```bash
cd engine && python3 waf build -j$(sysctl -n hw.ncpu)
```

Expected: Compiles without errors.

**Step 4: Run and verify WebSocket starts**

```bash
cd .. && ./run-dawflow.sh
# In another terminal:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3818/
```

Expected: HTTP 200 (server is running), console shows "DAWFLOW: Auto-started WebSocket server"

**Step 5: Commit**

```bash
cd engine
git add gtk2_ardour/ardour_ui_startup.cc
git commit -m "feat: auto-start WebSocket server on launch

Programmatically activates the WebSocket control surface (port 3818)
during startup_done(). This allows plugins and web UIs to communicate
with the engine immediately without manual Preferences toggle.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main
cd .. && git add engine && git commit -m "chore: update engine submodule"
```

---

### Task 2: Auto-load Plugins on Startup

Plugins with `"auto_start": true` in their manifest should be loaded automatically when the session starts.

**Files:**
- Modify: `engine/libs/ardour/ardour/dawflow_plugin_host.h:29-58`
- Modify: `engine/libs/ardour/dawflow_plugin_host.cc`
- Modify: `engine/libs/dawflow_ipc/dawflow_ipc/plugin_manifest.h` (add auto_start field)

**Step 1: Add auto_start to PluginManifest**

In `engine/libs/dawflow_ipc/dawflow_ipc/plugin_manifest.h`, add to the PluginManifest struct:

```cpp
bool auto_start = false;
```

And in the `from_json()` parsing, add:

```cpp
if (j.contains("auto_start")) {
    manifest.auto_start = j["auto_start"].get<bool>();
}
```

**Step 2: Add auto_load_plugins() to DawflowPluginHost**

In `engine/libs/ardour/ardour/dawflow_plugin_host.h`, add a public method:

```cpp
/** Auto-load all plugins that have auto_start: true in their manifest. */
void auto_load_plugins ();
```

**Step 3: Implement auto_load_plugins()**

In `engine/libs/ardour/dawflow_plugin_host.cc`, add:

```cpp
void
DawflowPluginHost::auto_load_plugins ()
{
	for (auto const& manifest : available_plugins ()) {
		if (manifest.auto_start && !is_plugin_loaded (manifest.id)) {
			PBD::info << "DAWFLOW: Auto-loading plugin: " << manifest.name << endmsg;
			load_plugin (manifest.id);
		}
	}
}
```

**Step 4: Call auto_load_plugins from startup_done()**

In `engine/gtk2_ardour/ardour_ui_startup.cc` → `startup_done()`, after the WebSocket activation block, add:

```cpp
	/* Auto-load DAWFLOW plugins that request it */
	if (_session) {
		_session->dawflow_plugin_host ().auto_load_plugins ();
	}
```

Note: Check how the session exposes the plugin host — it may be `_session->dawflow_plugin_host()` or accessed differently. Look at the Session class for the accessor method.

**Step 5: Build and test**

```bash
cd engine && python3 waf build -j$(sysctl -n hw.ncpu)
```

Expected: Compiles without errors.

**Step 6: Commit**

```bash
cd engine
git add libs/dawflow_ipc/dawflow_ipc/plugin_manifest.h \
        libs/ardour/ardour/dawflow_plugin_host.h \
        libs/ardour/dawflow_plugin_host.cc \
        gtk2_ardour/ardour_ui_startup.cc
git commit -m "feat: auto-load plugins with auto_start: true on launch

Plugins can set auto_start: true in manifest.json to be loaded
automatically when the session starts. DawflowPluginHost::auto_load_plugins()
scans available plugins and loads matching ones.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main
cd .. && git add engine && git commit -m "chore: update engine submodule"
```

---

### Task 3: Add daw.ui.request_main_webview IPC Command

This is the key command that lets a plugin take over the main window with a WebView.

**Files:**
- Modify: `engine/libs/ardour/dawflow_plugin_host.cc` (add command in _register_commands)
- Modify: `engine/gtk2_ardour/ardour_ui.h:449-451` (add WebView member + method)
- Create: `engine/gtk2_ardour/ardour_ui_webview.mm` (new file — WebView takeover logic)
- Modify: `engine/gtk2_ardour/wscript:680` (add new .mm file to macOS build)

**Step 1: Add method declaration to ARDOUR_UI**

In `engine/gtk2_ardour/ardour_ui.h`, near line 490 (near startup_done), add:

```cpp
	/** Replace GTK2 content with a full-window WebView loading the given URL. */
	void request_main_webview (const std::string& url);
```

And near line 449 (member variables), add:

```cpp
	void*       _main_webview_impl; /* opaque — DawflowWebViewImpl* on macOS, nullptr otherwise */
```

Initialize `_main_webview_impl` to `nullptr` in the constructor.

**Step 2: Create ardour_ui_webview.mm**

Create `engine/gtk2_ardour/ardour_ui_webview.mm`:

```objc
/*
 * ARDOUR_UI full-window WebView implementation (macOS)
 *
 * When a plugin requests daw.ui.request_main_webview, this code hides
 * all GTK2 content and creates a full-window WKWebView in the main window.
 */

#include "ardour_ui.h"

#ifdef __APPLE__

#import <WebKit/WebKit.h>
#include <gdk/gdkquartz.h>

void
ARDOUR_UI::request_main_webview (const std::string& url)
{
	if (_main_webview_impl) {
		/* Already showing a WebView — just navigate to new URL */
		WKWebView* wv = (WKWebView*)_main_webview_impl;
		NSString* urlStr = [NSString stringWithUTF8String:url.c_str ()];
		NSURL* nsurl = [NSURL URLWithString:urlStr];
		if (nsurl) {
			[wv loadRequest:[NSURLRequest requestWithURL:nsurl]];
		}
		return;
	}

	/* Hide all GTK2 content */
	main_vpacker.hide ();

	/* Get the NSView backing the main GDK window */
	GdkWindow* gdk_win = _main_window.get_window ()->gobj ();
	NSView* parent_nsview = gdk_quartz_window_get_nsview (gdk_win);

	/* Create WKWebView filling the entire window */
	NSRect frame = [parent_nsview bounds];
	WKWebViewConfiguration* config = [[WKWebViewConfiguration alloc] init];
	[config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];

	WKWebView* webview = [[WKWebView alloc] initWithFrame:frame configuration:config];
	[webview setAutoresizingMask:NSViewWidthSizable | NSViewHeightSizable];
	[config release];

	/* Add as subview of the GTK window's NSView */
	[parent_nsview addSubview:webview];

	/* Store for later use */
	_main_webview_impl = (void*)webview; /* retained by addSubview */

	/* Load the URL */
	NSString* urlStr = [NSString stringWithUTF8String:url.c_str ()];
	NSURL* nsurl = [NSURL URLWithString:urlStr];
	if (nsurl) {
		[webview loadRequest:[NSURLRequest requestWithURL:nsurl]];
	}

	PBD::info << "DAWFLOW: Main window WebView active — " << url << endmsg;
}

#else /* !__APPLE__ */

void
ARDOUR_UI::request_main_webview (const std::string& /* url */)
{
	PBD::warning << "DAWFLOW: Full-window WebView is only supported on macOS" << endmsg;
}

#endif /* __APPLE__ */
```

**Step 3: Add the new file to the wscript build**

In `engine/gtk2_ardour/wscript`, at line 680 where macOS-specific `.mm` files are listed:

```python
obj.source += [ 'cocoacarbon.mm', 'bundle_env_cocoa.cc', 'dawflow_webview_panel.mm', 'ardour_ui_webview.mm', 'session_dialog_mac.mm' ]
```

Also add `-framework WebKit` to the link flags if not already present.

**Step 4: Register the IPC command**

In `engine/libs/ardour/dawflow_plugin_host.cc`, at the end of `_register_commands()` (around line 770, before the extended command registrations), add:

```cpp
/* UI takeover — plugin can request a full-window WebView */
_command_handlers["daw.ui.request_main_webview"] = [this](const json& params) -> json {
	std::string url = params.at ("url").get<std::string> ();

	/* Schedule on the GUI thread (IPC runs on a different thread) */
	Glib::signal_idle ().connect_once ([url]() {
		ARDOUR_UI::instance ()->request_main_webview (url);
	});

	json result;
	result["ok"] = true;
	return result;
};
```

Note: The `Glib::signal_idle().connect_once()` ensures the GTK/Cocoa operations happen on the main thread, not the IPC thread.

**Step 5: Initialize _main_webview_impl in constructor**

In the ARDOUR_UI constructor (likely `ardour_ui.cc` or `ardour_ui_ed.cc`), initialize:

```cpp
_main_webview_impl = nullptr;
```

Find the constructor's member initializer list and add it there.

**Step 6: Build and test**

```bash
cd engine && python3 waf build -j$(sysctl -n hw.ncpu)
```

Expected: Compiles without errors.

**Step 7: Commit**

```bash
cd engine
git add gtk2_ardour/ardour_ui.h \
        gtk2_ardour/ardour_ui_webview.mm \
        gtk2_ardour/wscript \
        libs/ardour/dawflow_plugin_host.cc
git commit -m "feat: add daw.ui.request_main_webview IPC command

Plugins can send daw.ui.request_main_webview with a URL to replace the
GTK2 main window content with a full-window WKWebView. The WebView
fills the entire window and autoresizes. GTK2 widgets are hidden but
not destroyed — the engine keeps running normally underneath.

This is a generic capability — any plugin can use it. The engine does
not know or care what UI is loaded.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main
cd .. && git add engine && git commit -m "chore: update engine submodule"
```

---

### Task 4: Create the dawflow-ui-shell Plugin

This is the proprietary plugin that ties it all together. Lives in the product repo.

**Files:**
- Create: `sdk/plugins/ui-shell/manifest.json`
- Create: `sdk/plugins/ui-shell/src/main.cpp`
- Create: `sdk/plugins/ui-shell/build.sh`
- Create: `sdk/plugins/ui-shell/ui/` (symlink or copy of dawflow-ui build output)

**Step 1: Create manifest.json**

Create `sdk/plugins/ui-shell/manifest.json`:

```json
{
    "id": "com.dawflow.ui-shell",
    "name": "DAWFLOW UI",
    "version": "1.0.0",
    "api_version": "1",
    "author": "DAWFLOW",
    "description": "Premium Cubase-style UI for DAWFLOW",
    "entry_point": "bin/{platform}/dawflow-ui-shell",
    "auto_start": true,
    "capabilities": ["ui_takeover"]
}
```

**Step 2: Create main.cpp**

Create `sdk/plugins/ui-shell/src/main.cpp`:

```cpp
#define DAWFLOW_SDK_IMPLEMENTATION
#include "../../../dawflow_sdk.h"
#include <iostream>

int main(int argc, char* argv[])
{
    if (argc < 2) {
        std::cerr << "Usage: dawflow-ui-shell <socket_path> [ui_port]" << std::endl;
        return 1;
    }

    std::string socket_path = argv[1];
    int ui_port = (argc > 2) ? std::atoi(argv[2]) : 19100;

    std::cout << "DAWFLOW UI Shell: connecting to " << socket_path << std::endl;

    DawflowSDK::Plugin plugin(socket_path);

    if (!plugin.is_connected()) {
        std::cerr << "DAWFLOW UI Shell: failed to connect" << std::endl;
        return 1;
    }

    /* Register with the host */
    plugin.register_plugin("com.dawflow.ui-shell");

    /* Start HTTP server for the React UI */
    plugin.serve_ui(ui_port, "ui/");
    std::cout << "DAWFLOW UI Shell: serving at http://localhost:" << ui_port << std::endl;

    /* Request full-window WebView */
    std::string url = "http://localhost:" + std::to_string(ui_port) + "/";
    DawflowSDK::json params;
    params["url"] = url;
    plugin.send_command("daw.ui.request_main_webview", params);

    std::cout << "DAWFLOW UI Shell: requested main WebView" << std::endl;

    /* Run event loop */
    plugin.run();

    return 0;
}
```

**Step 3: Create build.sh**

Create `sdk/plugins/ui-shell/build.sh`:

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLATFORM="macos-arm64"

echo "Building DAWFLOW UI Shell plugin..."

# Build the C++ binary
mkdir -p "$SCRIPT_DIR/bin/$PLATFORM"
clang++ -std=c++17 -O2 \
    -I"$SCRIPT_DIR/../../" \
    "$SCRIPT_DIR/src/main.cpp" \
    -o "$SCRIPT_DIR/bin/$PLATFORM/dawflow-ui-shell"

# Build the React UI if not already built
if [ ! -f "$SCRIPT_DIR/ui/index.html" ]; then
    echo "Building React UI..."
    cd "$SCRIPT_DIR/../../../dawflow-ui"
    npm run build
    cp -r dist/* "$SCRIPT_DIR/ui/"
    cd "$SCRIPT_DIR"
fi

# Package as .dawflow
echo "Packaging..."
cd "$SCRIPT_DIR"
rm -f dawflow-ui-shell.dawflow
zip -r dawflow-ui-shell.dawflow manifest.json bin/ ui/ -x '*.DS_Store'

echo "Done: dawflow-ui-shell.dawflow"
echo "Install: cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/"
```

**Step 4: Create ui/ directory**

```bash
mkdir -p sdk/plugins/ui-shell/ui
```

**Step 5: Build and install the plugin**

```bash
# Build React UI first
cd dawflow-ui && npm run build && cd ..

# Copy built UI to plugin
cp -r dawflow-ui/dist/* sdk/plugins/ui-shell/ui/

# Build plugin
chmod +x sdk/plugins/ui-shell/build.sh
cd sdk/plugins/ui-shell && ./build.sh && cd ../../..

# Install
mkdir -p ~/.config/dawflow/plugins
cp sdk/plugins/ui-shell/dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
```

**Step 6: Commit**

```bash
git add sdk/plugins/ui-shell/
git commit -m "feat: add dawflow-ui-shell plugin

Proprietary plugin that serves the React UI and requests full-window
WebView from the engine. On startup:
1. Connects to engine IPC
2. Serves React UI on localhost:19100
3. Sends daw.ui.request_main_webview to take over the window

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Integration Test — Full Flow

**Step 1: Ensure plugin is installed**

```bash
ls ~/.config/dawflow/plugins/dawflow-ui-shell.dawflow
```

Expected: File exists.

**Step 2: Launch DAWFLOW**

```bash
./run-dawflow.sh
```

Expected sequence in console:
```
DAWFLOW: Auto-started WebSocket server
DAWFLOW: Auto-loading plugin: DAWFLOW UI
DAWFLOW UI Shell: connecting to /tmp/dawflow-...
DAWFLOW UI Shell: serving at http://localhost:19100
DAWFLOW UI Shell: requested main WebView
DAWFLOW: Main window WebView active — http://localhost:19100/
```

Expected visually: The GTK2 Ardour UI disappears. The React Cubase-style UI fills the window.

**Step 3: Verify WebSocket connection**

In the React UI, bottom-right corner should show `● Engine Connected` (green).

**Step 4: Test transport controls**

Click Play in the React UI → transport should roll (check console for transport state change).
Click Stop → transport should stop.

**Step 5: Test without plugin**

```bash
rm ~/.config/dawflow/plugins/dawflow-ui-shell.dawflow
./run-dawflow.sh
```

Expected: Normal Ardour GTK2 UI appears. No WebView. The open-source experience.

**Step 6: Reinstall plugin for normal use**

```bash
cp sdk/plugins/ui-shell/dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/
```

---

### Task 6: Update deploy.sh for Dual Deployment

The `dawflow-ui/deploy.sh` should now also copy built UI to the ui-shell plugin.

**Files:**
- Modify: `dawflow-ui/deploy.sh`

**Step 1: Update deploy.sh**

```bash
#!/bin/bash
# Build the React UI and deploy to both engine web surface and ui-shell plugin
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE_DIR="$SCRIPT_DIR/../engine"
PLUGIN_UI_DIR="$SCRIPT_DIR/../sdk/plugins/ui-shell/ui"
ENGINE_TARGET="$ENGINE_DIR/share/web_surfaces/builtin/dawflow"

echo "Building DAWFLOW UI..."
npm run build

# Deploy to engine web surfaces (for browser access)
echo "Deploying to engine web surfaces..."
mkdir -p "$ENGINE_TARGET"
rm -rf "$ENGINE_TARGET/assets"
cp -r dist/* "$ENGINE_TARGET/"

# Deploy to ui-shell plugin (for in-app WebView)
echo "Deploying to ui-shell plugin..."
mkdir -p "$PLUGIN_UI_DIR"
rm -rf "$PLUGIN_UI_DIR/assets"
cp -r dist/* "$PLUGIN_UI_DIR/"

echo ""
echo "Done. UI deployed to:"
echo "  Engine: $ENGINE_TARGET"
echo "  Plugin: $PLUGIN_UI_DIR"
echo ""
echo "To rebuild the plugin package:"
echo "  cd sdk/plugins/ui-shell && ./build.sh"
echo ""
```

**Step 2: Commit**

```bash
git add dawflow-ui/deploy.sh
git commit -m "feat: deploy React UI to both engine and ui-shell plugin

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
