# DAWFLOW Plugin System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an IPC-based plugin system where proprietary plugins run as separate processes, communicate via Unix sockets, and render UI via embedded web views — creating a clear GPL boundary.

**Architecture:** The DAW (GPL) contains a Plugin Host that discovers `.dawflow` plugin packages, spawns each as a separate process, and communicates via JSON-RPC over Unix domain sockets. Plugins can register actions, receive session events, send DAW commands, and render UI panels in embedded web views served from the plugin process. The plugin loader is GPL; the plugins are proprietary separate executables.

**Tech Stack:** C++17, Unix domain sockets, JSON (nlohmann/json or RapidJSON), libwebsockets (already a dependency), CEF or WKWebView for embedded web views, PBD::Signal for event hooks.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  DAWFLOW Process (GPL)                              │
│                                                     │
│  ┌───────────────┐   ┌──────────────────────┐       │
│  │ Plugin Host   │──▶│ Plugin Bridge (IPC)  │       │
│  │ (discovery,   │   │ (Unix socket server) │       │
│  │  lifecycle)   │   └──────┬───────────────┘       │
│  └───────────────┘          │                       │
│  ┌───────────────┐          │ JSON-RPC              │
│  │ Action Router │◀─────────┤                       │
│  │ (cmd dispatch)│          │                       │
│  └───────────────┘          │                       │
│  ┌───────────────┐          │                       │
│  │ WebView Panel │◀─ http://localhost:{port}/ui     │
│  │ (embedded)    │          │                       │
│  └───────────────┘          │                       │
│  ┌───────────────┐          │                       │
│  │ Event Emitter │──────────┤                       │
│  │ (session/     │          │                       │
│  │  transport)   │          │                       │
│  └───────────────┘          │                       │
└─────────────────────────────┼───────────────────────┘
                              │ Unix Domain Socket
┌─────────────────────────────┼───────────────────────┐
│  Plugin Process (Proprietary, SEPARATE BINARY)      │
│                             │                       │
│  ┌──────────────────────────▼──────────────────┐    │
│  │  Plugin SDK (thin header-only IPC client)   │    │
│  └──────────────────────────┬──────────────────┘    │
│  ┌──────────────┐  ┌────────▼───────┐               │
│  │ HTTP Server  │  │ Plugin Logic   │               │
│  │ (serves UI)  │  │ (AI, rebrand,  │               │
│  │ localhost:N  │  │  features)     │               │
│  └──────────────┘  └────────────────┘               │
└─────────────────────────────────────────────────────┘
```

## IPC Protocol: JSON-RPC 2.0 over Unix Domain Sockets

**DAW → Plugin (Events):**
```json
{"jsonrpc":"2.0","method":"session.transport_changed","params":{"playing":true,"position":44100}}
{"jsonrpc":"2.0","method":"session.track_added","params":{"track_id":3,"name":"Vocals","type":"audio"}}
```

**Plugin → DAW (Commands):**
```json
{"jsonrpc":"2.0","method":"daw.set_track_gain","params":{"track_id":3,"gain_db":-7.0},"id":1}
{"jsonrpc":"2.0","method":"daw.load_plugin","params":{"track_id":3,"plugin_uri":"urn:lv2:calf:Reverb"},"id":2}
```

**DAW → Plugin (Responses):**
```json
{"jsonrpc":"2.0","result":{"success":true},"id":1}
```

## Plugin Package Format (`.dawflow`)

A `.dawflow` file is a ZIP archive:
```
my-plugin.dawflow
├── manifest.json
├── bin/
│   ├── macos-arm64/plugin-binary
│   ├── macos-x86_64/plugin-binary
│   ├── linux-x86_64/plugin-binary
│   └── windows-x86_64/plugin-binary.exe
├── ui/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── resources/
    └── icon.png
```

**manifest.json:**
```json
{
  "id": "com.dawflow.ai-assistant",
  "name": "DAWFLOW AI Assistant",
  "version": "1.0.0",
  "api_version": "1",
  "author": "DAWFLOW Inc.",
  "description": "AI-powered DAW control",
  "entry_point": "bin/{platform}/plugin-binary",
  "capabilities": ["ui_panel", "actions", "session_events", "audio_analysis"],
  "ui": {
    "panels": [
      {"id": "ai-chat", "title": "AI Chat", "location": "bottom", "url": "/ui/index.html"}
    ]
  },
  "actions": [
    {"id": "ai.analyze_track", "label": "AI: Analyze Track"}
  ]
}
```

---

## Task 1: IPC Message Protocol Library

**Files:**
- Create: `libs/dawflow_ipc/dawflow_ipc/protocol.h`
- Create: `libs/dawflow_ipc/dawflow_ipc/message.h`
- Create: `libs/dawflow_ipc/dawflow_ipc/message.cc`
- Create: `libs/dawflow_ipc/wscript`
- Test: `libs/dawflow_ipc/test/test_message.cc`

This is a small, self-contained library that defines the JSON-RPC message format used for DAW↔Plugin communication. It has no dependencies on Ardour internals (only nlohmann/json or a lightweight JSON parser).

**Step 1: Add nlohmann/json single-header to the project**

Download the single-header `json.hpp` (MIT licensed, ~800KB) into the project:

```bash
mkdir -p libs/dawflow_ipc/dawflow_ipc
curl -L https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp \
  -o libs/dawflow_ipc/dawflow_ipc/json.hpp
```

**Step 2: Create the message types header**

Create `libs/dawflow_ipc/dawflow_ipc/message.h`:

```cpp
#ifndef DAWFLOW_IPC_MESSAGE_H
#define DAWFLOW_IPC_MESSAGE_H

#include "dawflow_ipc/json.hpp"
#include <string>
#include <optional>
#include <cstdint>

namespace DawflowIPC {

using json = nlohmann::json;

/** JSON-RPC 2.0 message for DAW <-> Plugin communication */
struct Message {
    enum class Type { Request, Response, Notification };

    Type type;
    std::string method;           // For requests/notifications
    json params;                  // For requests/notifications
    json result;                  // For responses
    json error;                   // For error responses
    std::optional<int64_t> id;    // For requests/responses (absent for notifications)

    /** Serialize to JSON string (newline-delimited) */
    std::string serialize() const;

    /** Deserialize from JSON string */
    static Message deserialize(const std::string& data);

    /** Factory: create a request */
    static Message request(const std::string& method, const json& params, int64_t id);

    /** Factory: create a notification (no response expected) */
    static Message notification(const std::string& method, const json& params);

    /** Factory: create a success response */
    static Message response_ok(int64_t id, const json& result);

    /** Factory: create an error response */
    static Message response_error(int64_t id, int code, const std::string& message);
};

} // namespace DawflowIPC

#endif // DAWFLOW_IPC_MESSAGE_H
```

**Step 3: Implement message serialization**

Create `libs/dawflow_ipc/message.cc`:

```cpp
#include "dawflow_ipc/message.h"
#include <stdexcept>

namespace DawflowIPC {

std::string Message::serialize() const
{
    json j;
    j["jsonrpc"] = "2.0";

    switch (type) {
    case Type::Request:
        j["method"] = method;
        if (!params.is_null()) j["params"] = params;
        if (id.has_value()) j["id"] = id.value();
        break;
    case Type::Notification:
        j["method"] = method;
        if (!params.is_null()) j["params"] = params;
        break;
    case Type::Response:
        if (!error.is_null()) {
            j["error"] = error;
        } else {
            j["result"] = result;
        }
        if (id.has_value()) j["id"] = id.value();
        break;
    }

    return j.dump() + "\n";
}

Message Message::deserialize(const std::string& data)
{
    json j = json::parse(data);
    Message msg;

    if (j.contains("id") && !j["id"].is_null()) {
        msg.id = j["id"].get<int64_t>();
    }

    if (j.contains("method")) {
        msg.method = j["method"].get<std::string>();
        msg.params = j.value("params", json{});
        msg.type = msg.id.has_value() ? Type::Request : Type::Notification;
    } else {
        msg.type = Type::Response;
        if (j.contains("error")) {
            msg.error = j["error"];
        } else {
            msg.result = j.value("result", json{});
        }
    }

    return msg;
}

Message Message::request(const std::string& method, const json& params, int64_t id)
{
    return Message{Type::Request, method, params, {}, {}, id};
}

Message Message::notification(const std::string& method, const json& params)
{
    return Message{Type::Notification, method, params, {}, {}, std::nullopt};
}

Message Message::response_ok(int64_t id, const json& result)
{
    return Message{Type::Response, "", {}, result, {}, id};
}

Message Message::response_error(int64_t id, int code, const std::string& message)
{
    json err;
    err["code"] = code;
    err["message"] = message;
    return Message{Type::Response, "", {}, {}, err, id};
}

} // namespace DawflowIPC
```

**Step 4: Create WAF build file**

Create `libs/dawflow_ipc/wscript`:

```python
#!/usr/bin/env python
from waflib.extras import autowaf as autowaf

def options(opt):
    pass

def configure(conf):
    pass

def build(bld):
    obj = bld.shlib(features='cxx cxxshlib')
    obj.source = ['message.cc']
    obj.target = 'dawflow_ipc'
    obj.name = 'libdawflow_ipc'
    obj.includes = ['.']
    obj.export_includes = ['.']
    obj.cxxflags = ['-std=c++17']
    obj.defines = ['DAWFLOW_IPC_BUILDING']
    obj.install_path = bld.env['LIBDIR']
```

**Step 5: Register in top-level wscript**

In the top-level `wscript`, add `libs/dawflow_ipc` to the children list alongside the other libs. Search for the line that builds `libs/` children and add it.

**Step 6: Write test**

Create `libs/dawflow_ipc/test/test_message.cc`:

```cpp
#include "dawflow_ipc/message.h"
#include <cassert>
#include <iostream>

int main()
{
    using namespace DawflowIPC;

    // Test request serialization
    auto req = Message::request("daw.set_track_gain", {{"track_id", 3}, {"gain_db", -7.0}}, 1);
    std::string s = req.serialize();
    assert(s.find("\"method\":\"daw.set_track_gain\"") != std::string::npos);
    assert(s.find("\"id\":1") != std::string::npos);

    // Test roundtrip
    auto parsed = Message::deserialize(s);
    assert(parsed.type == Message::Type::Request);
    assert(parsed.method == "daw.set_track_gain");
    assert(parsed.params["track_id"] == 3);
    assert(parsed.params["gain_db"] == -7.0);
    assert(parsed.id.value() == 1);

    // Test notification (no id)
    auto notif = Message::notification("session.transport_changed", {{"playing", true}});
    s = notif.serialize();
    auto parsed2 = Message::deserialize(s);
    assert(parsed2.type == Message::Type::Notification);
    assert(!parsed2.id.has_value());

    // Test response
    auto resp = Message::response_ok(1, {{"success", true}});
    s = resp.serialize();
    auto parsed3 = Message::deserialize(s);
    assert(parsed3.type == Message::Type::Response);
    assert(parsed3.result["success"] == true);

    // Test error response
    auto err = Message::response_error(2, -32600, "Invalid Request");
    s = err.serialize();
    auto parsed4 = Message::deserialize(s);
    assert(parsed4.error["code"] == -32600);

    std::cout << "All message tests passed!" << std::endl;
    return 0;
}
```

**Step 7: Build and verify**

```bash
python3 waf build -j$(sysctl -n hw.ncpu)
# Run test manually:
clang++ -std=c++17 -I libs/dawflow_ipc libs/dawflow_ipc/message.cc \
  libs/dawflow_ipc/test/test_message.cc -o /tmp/test_message && /tmp/test_message
```

Expected: `All message tests passed!`

**Step 8: Commit**

```bash
git add libs/dawflow_ipc/
git commit -m "feat: add DawflowIPC message protocol library (JSON-RPC 2.0)"
```

---

## Task 2: Unix Socket Transport Layer

**Files:**
- Create: `libs/dawflow_ipc/dawflow_ipc/socket_server.h`
- Create: `libs/dawflow_ipc/dawflow_ipc/socket_server.cc`
- Create: `libs/dawflow_ipc/dawflow_ipc/socket_client.h`
- Create: `libs/dawflow_ipc/dawflow_ipc/socket_client.cc`
- Test: `libs/dawflow_ipc/test/test_socket.cc`

**Step 1: Create socket server header**

Create `libs/dawflow_ipc/dawflow_ipc/socket_server.h`:

```cpp
#ifndef DAWFLOW_IPC_SOCKET_SERVER_H
#define DAWFLOW_IPC_SOCKET_SERVER_H

#include "dawflow_ipc/message.h"
#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <mutex>
#include <unordered_map>

namespace DawflowIPC {

/**
 * Unix domain socket server.
 * Accepts multiple plugin connections, dispatches messages.
 * Runs its own listener thread.
 */
class SocketServer {
public:
    using MessageHandler = std::function<void(const std::string& client_id, const Message& msg)>;
    using ConnectHandler = std::function<void(const std::string& client_id)>;
    using DisconnectHandler = std::function<void(const std::string& client_id)>;

    SocketServer();
    ~SocketServer();

    /** Start listening on a Unix domain socket at the given path */
    bool start(const std::string& socket_path);

    /** Stop the server and close all connections */
    void stop();

    /** Send a message to a specific connected plugin */
    bool send(const std::string& client_id, const Message& msg);

    /** Broadcast a message to all connected plugins */
    void broadcast(const Message& msg);

    /** Register handlers */
    void on_message(MessageHandler handler);
    void on_connect(ConnectHandler handler);
    void on_disconnect(DisconnectHandler handler);

    bool is_running() const { return _running.load(); }

private:
    void _accept_loop();
    void _client_loop(int fd, const std::string& client_id);

    int _server_fd = -1;
    std::string _socket_path;
    std::atomic<bool> _running{false};
    std::thread _accept_thread;

    std::mutex _clients_mutex;
    std::unordered_map<std::string, int> _client_fds;  // client_id -> fd
    std::unordered_map<std::string, std::thread> _client_threads;

    MessageHandler _message_handler;
    ConnectHandler _connect_handler;
    DisconnectHandler _disconnect_handler;

    int _next_client_id = 0;
};

} // namespace DawflowIPC

#endif
```

**Step 2: Implement socket server**

Create `libs/dawflow_ipc/dawflow_ipc/socket_server.cc` — implements Unix domain socket accept loop, per-client reader threads, newline-delimited JSON framing, and broadcast. Uses `sys/socket.h`, `sys/un.h`, `poll.h`. Each client gets a unique ID string like `"plugin-0"`, `"plugin-1"`.

Key implementation details:
- `_accept_loop()`: listens for connections via `accept()`, spawns `_client_loop()` thread per connection
- `_client_loop()`: reads newline-delimited JSON, parses via `Message::deserialize()`, calls `_message_handler`
- `send()`: writes serialized message to client fd with mutex protection
- `broadcast()`: iterates `_client_fds` and sends to each
- `stop()`: sets `_running = false`, closes server fd, joins all threads
- Socket path cleaned up on start (`unlink`) and stop

**Step 3: Create socket client header**

Create `libs/dawflow_ipc/dawflow_ipc/socket_client.h`:

```cpp
#ifndef DAWFLOW_IPC_SOCKET_CLIENT_H
#define DAWFLOW_IPC_SOCKET_CLIENT_H

#include "dawflow_ipc/message.h"
#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <mutex>

namespace DawflowIPC {

/**
 * Unix domain socket client.
 * Used by plugin processes to connect to the DAW.
 * Runs its own reader thread.
 */
class SocketClient {
public:
    using MessageHandler = std::function<void(const Message& msg)>;

    SocketClient();
    ~SocketClient();

    /** Connect to the DAW's socket */
    bool connect(const std::string& socket_path);

    /** Disconnect */
    void disconnect();

    /** Send a message to the DAW */
    bool send(const Message& msg);

    /** Register message handler */
    void on_message(MessageHandler handler);

    bool is_connected() const { return _connected.load(); }

private:
    void _read_loop();

    int _fd = -1;
    std::atomic<bool> _connected{false};
    std::thread _read_thread;
    std::mutex _write_mutex;
    MessageHandler _message_handler;
};

} // namespace DawflowIPC

#endif
```

**Step 4: Implement socket client**

Create `libs/dawflow_ipc/socket_client.cc` — connects to Unix domain socket, runs reader thread for incoming messages, provides `send()` with write mutex.

**Step 5: Update wscript to compile new files**

Add `socket_server.cc` and `socket_client.cc` to the source list in `libs/dawflow_ipc/wscript`.

**Step 6: Write integration test**

Create `libs/dawflow_ipc/test/test_socket.cc` — spawns server, connects client, sends request from client, verifies server receives it, server sends response, client receives it. All within one process using threads.

**Step 7: Build and test**

```bash
python3 waf build
# Test:
clang++ -std=c++17 -I libs/dawflow_ipc -pthread \
  libs/dawflow_ipc/message.cc libs/dawflow_ipc/socket_server.cc \
  libs/dawflow_ipc/socket_client.cc libs/dawflow_ipc/test/test_socket.cc \
  -o /tmp/test_socket && /tmp/test_socket
```

**Step 8: Commit**

```bash
git add libs/dawflow_ipc/
git commit -m "feat: add Unix domain socket transport for plugin IPC"
```

---

## Task 3: Plugin Package Loader

**Files:**
- Create: `libs/dawflow_ipc/dawflow_ipc/plugin_manifest.h`
- Create: `libs/dawflow_ipc/dawflow_ipc/plugin_manifest.cc`
- Create: `libs/dawflow_ipc/dawflow_ipc/plugin_loader.h`
- Create: `libs/dawflow_ipc/dawflow_ipc/plugin_loader.cc`
- Test: `libs/dawflow_ipc/test/test_loader.cc`

**Step 1: Create manifest parser**

`plugin_manifest.h` defines `PluginManifest` struct — parses `manifest.json` from a `.dawflow` ZIP package. Fields: `id`, `name`, `version`, `api_version`, `entry_point`, `capabilities` (vector of strings), `ui_panels` (vector of panel descriptors with id/title/location/url), `actions` (vector of action descriptors with id/label).

Uses `libarchive` (already an Ardour dependency) to read ZIP contents.

**Step 2: Create plugin loader**

`plugin_loader.h` defines `PluginLoader` class:
- `scan(const std::string& plugin_dir)` — finds all `.dawflow` files, reads manifests
- `load(const std::string& plugin_id)` — extracts plugin to cache dir, spawns process
- `unload(const std::string& plugin_id)` — kills process, cleans up
- `get_manifests()` — returns list of discovered plugin manifests

Key behaviors:
- Extracts `.dawflow` ZIP to `~/.config/dawflow/plugins/<plugin-id>/`
- Resolves platform-specific binary: `bin/macos-arm64/plugin-binary`
- Spawns plugin process via `fork()/exec()` with socket path as argument
- Tracks child PIDs for lifecycle management

**Step 3: Write test with a mock plugin**

Test creates a minimal `.dawflow` package (ZIP with manifest.json and a shell script as "binary"), loads it, verifies manifest parsing, verifies process spawn.

**Step 4: Build and test**

**Step 5: Commit**

```bash
git commit -m "feat: add .dawflow plugin package loader with manifest parsing"
```

---

## Task 4: Plugin Host (DAW-side Integration)

**Files:**
- Create: `libs/ardour/ardour/dawflow_plugin_host.h`
- Create: `libs/ardour/dawflow_plugin_host.cc`
- Modify: `libs/ardour/ardour/session.h` — add `DawflowPluginHost` member
- Modify: `libs/ardour/session.cc` — initialize host on session load

**Step 1: Create the Plugin Host class**

`DawflowPluginHost` is the main coordinator inside the DAW process:

```cpp
#ifndef ARDOUR_DAWFLOW_PLUGIN_HOST_H
#define ARDOUR_DAWFLOW_PLUGIN_HOST_H

#include "dawflow_ipc/socket_server.h"
#include "dawflow_ipc/plugin_loader.h"
#include "dawflow_ipc/message.h"
#include "pbd/signals.h"

#include <string>
#include <unordered_map>
#include <functional>

namespace ARDOUR {

class Session;

class DawflowPluginHost {
public:
    DawflowPluginHost(Session& session);
    ~DawflowPluginHost();

    /** Start the host: scan plugins, start socket server, load auto-start plugins */
    void start();

    /** Stop all plugins and the socket server */
    void stop();

    /** Get list of available plugins */
    std::vector<DawflowIPC::PluginManifest> available_plugins() const;

    /** Load and start a specific plugin by ID */
    bool load_plugin(const std::string& plugin_id);

    /** Unload a running plugin */
    void unload_plugin(const std::string& plugin_id);

    /** Handle incoming command from a plugin (dispatched by socket server) */
    void handle_plugin_command(const std::string& client_id, const DawflowIPC::Message& msg);

    /** Broadcast an event to all running plugins */
    void broadcast_event(const std::string& method, const DawflowIPC::json& params);

private:
    Session& _session;
    DawflowIPC::SocketServer _server;
    DawflowIPC::PluginLoader _loader;

    /** Map of plugin_id -> client_id (socket connection) */
    std::unordered_map<std::string, std::string> _plugin_clients;

    /** Action dispatch table: method name -> handler function */
    using CommandHandler = std::function<DawflowIPC::json(const DawflowIPC::json& params)>;
    std::unordered_map<std::string, CommandHandler> _command_handlers;

    /** Register all DAW commands that plugins can call */
    void _register_commands();

    /** Connect to session signals to forward events to plugins */
    void _connect_session_signals();

    /** PBD signal connections (auto-disconnect on destroy) */
    PBD::ScopedConnectionList _signal_connections;

    std::string _socket_path;
};

} // namespace ARDOUR

#endif
```

**Step 2: Implement the Plugin Host**

Key behaviors of `dawflow_plugin_host.cc`:

**`_register_commands()`** — registers handlers for every command plugins can call:
```cpp
void DawflowPluginHost::_register_commands()
{
    _command_handlers["daw.get_session_info"] = [this](const json& params) -> json {
        return {
            {"name", _session.name()},
            {"sample_rate", (int)_session.sample_rate()},
            {"tempo", _session.tempo_map().tempo_at_sample(0).quarter_notes_per_minute()}
        };
    };

    _command_handlers["daw.get_tracks"] = [this](const json& params) -> json {
        json tracks = json::array();
        for (auto& route : *_session.get_routes()) {
            tracks.push_back({
                {"id", route->id().to_s()},
                {"name", route->name()},
                {"gain_db", accurate_coefficient_to_dB(route->gain_control()->get_value())},
                {"muted", route->muted()},
                {"soloed", route->soloed()}
            });
        }
        return {{"tracks", tracks}};
    };

    _command_handlers["daw.set_track_gain"] = [this](const json& params) -> json {
        auto route = _session.route_by_id(PBD::ID(params["track_id"].get<std::string>()));
        if (!route) return {{"error", "track not found"}};
        double db = params["gain_db"].get<double>();
        route->gain_control()->set_value(dB_to_coefficient(db), PBD::Controllable::NoGroup);
        return {{"success", true}};
    };

    _command_handlers["daw.set_track_mute"] = [this](const json& params) -> json {
        auto route = _session.route_by_id(PBD::ID(params["track_id"].get<std::string>()));
        if (!route) return {{"error", "track not found"}};
        route->mute_control()->set_value(params["muted"].get<bool>() ? 1.0 : 0.0, PBD::Controllable::NoGroup);
        return {{"success", true}};
    };

    _command_handlers["daw.transport_play"] = [this](const json&) -> json {
        _session.request_transport_speed(1.0);
        return {{"success", true}};
    };

    _command_handlers["daw.transport_stop"] = [this](const json&) -> json {
        _session.request_stop();
        return {{"success", true}};
    };

    _command_handlers["daw.transport_locate"] = [this](const json& params) -> json {
        samplepos_t pos = params["sample_position"].get<int64_t>();
        _session.request_locate(pos);
        return {{"success", true}};
    };

    // ... more commands: load_plugin, set_track_name, add_track, delete_track,
    // set_track_color, get_plugin_list, set_plugin_parameter, etc.
}
```

**`_connect_session_signals()`** — hooks into PBD::Signal to forward events:
```cpp
void DawflowPluginHost::_connect_session_signals()
{
    _session.TransportStateChange.connect_same_thread(_signal_connections,
        [this]() {
            broadcast_event("session.transport_changed", {
                {"playing", _session.transport_rolling()},
                {"recording", _session.actively_recording()},
                {"position", (int64_t)_session.transport_sample()}
            });
        });

    _session.RouteAdded.connect_same_thread(_signal_connections,
        [this](ARDOUR::RouteList& routes) {
            for (auto& r : routes) {
                broadcast_event("session.track_added", {
                    {"track_id", r->id().to_s()},
                    {"name", r->name()}
                });
            }
        });

    _session.DirtyChanged.connect_same_thread(_signal_connections,
        [this]() {
            broadcast_event("session.dirty_changed", {
                {"dirty", _session.dirty()}
            });
        });

    // ... more signals: RecordStateChanged, PositionChanged, etc.
}
```

**Step 3: Wire into Session**

Add to `libs/ardour/ardour/session.h`:
```cpp
#include "ardour/dawflow_plugin_host.h"
// ...
class Session {
    // ... existing members ...
    std::unique_ptr<DawflowPluginHost> _dawflow_host;
public:
    DawflowPluginHost& dawflow_host() { return *_dawflow_host; }
};
```

In `libs/ardour/session.cc`, in the `Session` constructor (after routes are set up):
```cpp
_dawflow_host = std::make_unique<DawflowPluginHost>(*this);
_dawflow_host->start();
```

In `Session::~Session()`:
```cpp
_dawflow_host->stop();
_dawflow_host.reset();
```

**Step 4: Build and verify compilation**

```bash
python3 waf build
```

**Step 5: Commit**

```bash
git commit -m "feat: add DawflowPluginHost with IPC command dispatch and session event forwarding"
```

---

## Task 5: WebView Panel Integration (UI Side)

**Files:**
- Create: `gtk2_ardour/dawflow_webview_panel.h`
- Create: `gtk2_ardour/dawflow_webview_panel.cc`
- Modify: `gtk2_ardour/ardour_ui.h` — add webview panel container
- Modify: `gtk2_ardour/ardour_ui.cc` — initialize panels from loaded plugins

This task adds the ability to embed web views in the DAW UI where plugins can render their interfaces.

**Approach**: On macOS, use `WKWebView` via Objective-C++ (already available — Ardour's Quartz backend uses Cocoa). On Linux, use `GtkSocket` + `webkit2gtk` or a lightweight embedded browser. For the initial implementation, target macOS with `WKWebView`.

**Step 1: Create WebView panel wrapper**

`dawflow_webview_panel.h`:
```cpp
#ifndef DAWFLOW_WEBVIEW_PANEL_H
#define DAWFLOW_WEBVIEW_PANEL_H

#include <string>

#ifdef __APPLE__
#ifdef __OBJC__
@class WKWebView;
@class NSView;
#else
typedef void WKWebView;
typedef void NSView;
#endif
#endif

namespace Dawflow {

/**
 * Embedded web view panel for plugin UIs.
 * Wraps platform-specific web view (WKWebView on macOS).
 */
class WebViewPanel {
public:
    WebViewPanel(const std::string& plugin_id, const std::string& title);
    ~WebViewPanel();

    /** Load a URL into the web view */
    void load_url(const std::string& url);

    /** Get the native view handle for embedding */
    void* native_handle();

    /** Set panel size */
    void set_size(int width, int height);

    const std::string& plugin_id() const { return _plugin_id; }
    const std::string& title() const { return _title; }

private:
    std::string _plugin_id;
    std::string _title;
#ifdef __APPLE__
    WKWebView* _webview = nullptr;
    NSView* _container = nullptr;
#endif
};

} // namespace Dawflow

#endif
```

**Step 2: Implement macOS WebView**

`dawflow_webview_panel.mm` (Objective-C++ for macOS):
```objc
#include "dawflow_webview_panel.h"

#ifdef __APPLE__
#import <WebKit/WebKit.h>

namespace Dawflow {

WebViewPanel::WebViewPanel(const std::string& plugin_id, const std::string& title)
    : _plugin_id(plugin_id), _title(title)
{
    NSRect frame = NSMakeRect(0, 0, 400, 300);
    WKWebViewConfiguration* config = [[WKWebViewConfiguration alloc] init];
    _webview = [[WKWebView alloc] initWithFrame:frame configuration:config];
    _container = (NSView*)_webview;
}

WebViewPanel::~WebViewPanel()
{
    // ARC handles cleanup, or manual release if MRC
}

void WebViewPanel::load_url(const std::string& url)
{
    NSString* ns_url = [NSString stringWithUTF8String:url.c_str()];
    NSURL* nsurl = [NSURL URLWithString:ns_url];
    NSURLRequest* request = [NSURLRequest requestWithURL:nsurl];
    [(WKWebView*)_webview loadRequest:request];
}

void* WebViewPanel::native_handle()
{
    return (void*)_container;
}

void WebViewPanel::set_size(int width, int height)
{
    [(NSView*)_container setFrameSize:NSMakeSize(width, height)];
}

} // namespace Dawflow
#endif
```

**Step 3: Integrate into Ardour UI**

Add a bottom panel area in `ardour_ui.h` that can host web views from plugins. When a plugin with `ui_panel` capability connects, the host creates a `WebViewPanel` and embeds it in the UI. Uses Ardour's existing `Tabbable` pattern for docking.

**Step 4: Build and verify**

```bash
python3 waf build
```

**Step 5: Commit**

```bash
git commit -m "feat: add WebViewPanel for embedded plugin UIs (macOS WKWebView)"
```

---

## Task 6: Plugin SDK (Header-Only Client Library)

**Files:**
- Create: `sdk/dawflow_sdk.h` (single-header SDK for plugin developers)
- Create: `sdk/examples/hello-plugin/main.cpp`
- Create: `sdk/examples/hello-plugin/ui/index.html`
- Create: `sdk/examples/hello-plugin/manifest.json`
- Create: `sdk/examples/hello-plugin/build.sh`

This is the library that plugin developers use. It's a thin header-only wrapper around `SocketClient` that provides a clean API. This file is NOT GPL — it's distributed as part of the proprietary SDK or under a permissive license (MIT/BSD).

**Step 1: Create the SDK header**

`sdk/dawflow_sdk.h` — self-contained, includes the socket client and JSON library. Provides:

```cpp
namespace DawflowSDK {

class Plugin {
public:
    Plugin(const std::string& socket_path);

    /** Register a handler for DAW events */
    void on_event(const std::string& method, EventHandler handler);

    /** Send a command to the DAW and get result */
    json call(const std::string& method, const json& params);

    /** Convenience: get all tracks */
    json get_tracks();

    /** Convenience: set track gain */
    void set_track_gain(const std::string& track_id, double db);

    /** Convenience: transport control */
    void play();
    void stop();
    void locate(int64_t sample);

    /** Start the plugin event loop (blocks) */
    void run();

    /** Start HTTP server for UI */
    void serve_ui(int port, const std::string& ui_dir);
};

} // namespace DawflowSDK
```

**Step 2: Create hello-plugin example**

`sdk/examples/hello-plugin/main.cpp`:
```cpp
#include "dawflow_sdk.h"
#include <iostream>

int main(int argc, char* argv[])
{
    if (argc < 2) {
        std::cerr << "Usage: hello-plugin <socket_path>" << std::endl;
        return 1;
    }

    DawflowSDK::Plugin plugin(argv[1]);

    // Register for transport events
    plugin.on_event("session.transport_changed", [](const json& params) {
        std::cout << "Transport: " << (params["playing"].get<bool>() ? "PLAY" : "STOP") << std::endl;
    });

    // Start UI server
    plugin.serve_ui(9100, "ui/");

    // Get initial session info
    auto info = plugin.call("daw.get_session_info", {});
    std::cout << "Connected to session: " << info["name"] << std::endl;

    // Run event loop
    plugin.run();
    return 0;
}
```

`sdk/examples/hello-plugin/ui/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Hello Plugin</title>
    <style>
        body { font-family: system-ui; background: #1a1a2e; color: #eee; padding: 20px; }
        button { background: #e94560; color: white; border: none; padding: 10px 20px;
                 border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #c73e54; }
        #tracks { margin-top: 20px; }
        .track { background: #16213e; padding: 10px; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Hello DAWFLOW Plugin</h1>
    <div>
        <button onclick="sendCommand('daw.transport_play', {})">Play</button>
        <button onclick="sendCommand('daw.transport_stop', {})">Stop</button>
        <button onclick="loadTracks()">Refresh Tracks</button>
    </div>
    <div id="tracks"></div>
    <script>
        // Plugin communicates with the DAW via its local HTTP API
        async function sendCommand(method, params) {
            const resp = await fetch('/api/command', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({method, params})
            });
            return resp.json();
        }

        async function loadTracks() {
            const result = await sendCommand('daw.get_tracks', {});
            const el = document.getElementById('tracks');
            el.innerHTML = result.tracks.map(t =>
                `<div class="track">${t.name} (${t.gain_db.toFixed(1)} dB)
                 ${t.muted ? '🔇' : '🔊'}</div>`
            ).join('');
        }

        loadTracks();
    </script>
</body>
</html>
```

`sdk/examples/hello-plugin/manifest.json`:
```json
{
    "id": "com.dawflow.hello-plugin",
    "name": "Hello Plugin",
    "version": "0.1.0",
    "api_version": "1",
    "author": "DAWFLOW",
    "description": "Example plugin demonstrating the DAWFLOW plugin system",
    "entry_point": "bin/{platform}/hello-plugin",
    "capabilities": ["ui_panel", "session_events"],
    "ui": {
        "panels": [
            {"id": "hello", "title": "Hello Plugin", "location": "bottom", "url": "/ui/index.html"}
        ]
    }
}
```

**Step 3: Build the example**

`sdk/examples/hello-plugin/build.sh`:
```bash
#!/bin/bash
PLATFORM="macos-arm64"
mkdir -p bin/$PLATFORM
clang++ -std=c++17 -I ../../ main.cpp -o bin/$PLATFORM/hello-plugin -pthread
echo "Built bin/$PLATFORM/hello-plugin"
```

**Step 4: Package as .dawflow**

```bash
cd sdk/examples/hello-plugin
zip -r hello-plugin.dawflow manifest.json bin/ ui/
```

**Step 5: Commit**

```bash
git commit -m "feat: add DAWFLOW Plugin SDK and hello-plugin example"
```

---

## Task 7: Plugin Manager UI

**Files:**
- Create: `gtk2_ardour/dawflow_plugin_manager_dialog.h`
- Create: `gtk2_ardour/dawflow_plugin_manager_dialog.cc`
- Modify: `gtk2_ardour/ardour_ui_ed.cc` — add menu item "DAWFLOW Plugins..."

A simple GTK dialog that lists discovered `.dawflow` plugins, shows their status (loaded/unloaded), and provides Load/Unload buttons.

**Step 1: Create the dialog**

Uses existing Ardour GTK patterns (`ArdourDialog` base class, `TreeView` for list). Columns: Name, Version, Author, Status, Load/Unload button.

**Step 2: Add menu entry**

In `ardour_ui_ed.cc`, add a menu item under the Window menu: "DAWFLOW Plugins..." which opens the dialog.

**Step 3: Build and test**

Launch the DAW, verify the menu item appears, dialog opens with empty list (no plugins installed yet).

**Step 4: Commit**

```bash
git commit -m "feat: add DAWFLOW Plugin Manager UI dialog"
```

---

## Task 8: End-to-End Integration Test

**Files:**
- Modify: `sdk/examples/hello-plugin/` — finalize the example
- No new files — this is a manual verification task

**Step 1: Build the DAW**

```bash
cd "/Users/davidyousefi/dev/DAW FLOW"
python3 waf build
```

**Step 2: Build the hello-plugin**

```bash
cd sdk/examples/hello-plugin
./build.sh
zip -r hello-plugin.dawflow manifest.json bin/ ui/
```

**Step 3: Install the plugin**

```bash
mkdir -p ~/.config/dawflow/plugins/
cp hello-plugin.dawflow ~/.config/dawflow/plugins/
```

**Step 4: Launch DAW and test**

```bash
cd "/Users/davidyousefi/dev/DAW FLOW"
./run-dawflow.sh
```

Verify:
1. DAW launches without errors
2. Window → DAWFLOW Plugins shows "Hello Plugin" in the list
3. Click "Load" → plugin process spawns
4. WebView panel appears at bottom with "Hello DAWFLOW Plugin" UI
5. Click "Play" button in web UI → DAW transport starts
6. Click "Refresh Tracks" → track list appears
7. Unload plugin → process terminates, panel closes

**Step 5: Commit**

```bash
git commit -m "feat: complete DAWFLOW plugin system end-to-end integration"
```

---

## Summary of Deliverables

| Task | Component | Purpose |
|------|-----------|---------|
| 1 | IPC Message Protocol | JSON-RPC message format |
| 2 | Socket Transport | Unix domain socket server/client |
| 3 | Plugin Loader | .dawflow package discovery & process management |
| 4 | Plugin Host | DAW-side command dispatch & event forwarding |
| 5 | WebView Panel | Embedded web views for plugin UIs |
| 6 | Plugin SDK | Header-only library for plugin developers |
| 7 | Plugin Manager UI | GTK dialog for managing plugins |
| 8 | E2E Test | Full integration verification |

## GPL Compliance Notes

- **Tasks 1-5, 7**: Part of the DAW, GPL-licensed, open source
- **Task 6 (SDK)**: Can be MIT/BSD licensed — it's a thin IPC client, separate from the DAW
- **Plugins built with SDK**: Separate processes, proprietary, NOT derivative works of the GPL DAW
- **The boundary**: Unix domain socket = process boundary = GPL boundary
