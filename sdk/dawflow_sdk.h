#ifndef DAWFLOW_SDK_H
#define DAWFLOW_SDK_H

/*
 * DAWFLOW Plugin SDK v1.0
 *
 * MIT License - This file can be freely distributed.
 *
 * Single-header SDK for building DAWFLOW plugins.
 * Requires: C++17, POSIX (macOS/Linux), nlohmann/json (json.hpp in same directory)
 *
 * Usage:
 *   #define DAWFLOW_SDK_IMPLEMENTATION  // in exactly ONE .cpp file
 *   #include "dawflow_sdk.h"
 */

#include "json.hpp"

#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <mutex>
#include <unordered_map>
#include <vector>
#include <iostream>
#include <cstring>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <poll.h>
#include <netinet/in.h>

namespace DawflowSDK {

using json = nlohmann::json;
using EventHandler = std::function<void(const json& params)>;

class Plugin {
public:
    Plugin(const std::string& socket_path);
    ~Plugin();

    // Event handling
    void on_event(const std::string& method, EventHandler handler);

    // Send command to DAW and get synchronous result
    json call(const std::string& method, const json& params = {});

    // Convenience methods
    json get_session_info();
    json get_tracks();
    json get_transport_state();
    void set_track_gain(const std::string& track_id, double db);
    void set_track_mute(const std::string& track_id, bool muted);
    void set_track_solo(const std::string& track_id, bool soloed);
    void transport_play();
    void transport_stop();
    void transport_locate(int64_t sample_position);

    // Register this plugin with the host
    void register_plugin(const std::string& plugin_id);

    // Start a simple HTTP server for plugin UI
    void serve_ui(int port, const std::string& ui_dir);

    // Run the plugin event loop (blocks until stopped)
    void run();

    // Stop the plugin
    void stop();

    bool is_connected() const;

private:
    // Socket client (inline implementation)
    int _fd = -1;
    std::atomic<bool> _connected{false};
    std::atomic<bool> _running{false};
    std::thread _read_thread;
    std::mutex _write_mutex;

    // Request/response tracking
    std::atomic<int64_t> _next_id{1};
    std::mutex _pending_mutex;
    std::unordered_map<int64_t, json*> _pending_responses;
    std::unordered_map<int64_t, bool> _response_ready;

    // Event handlers
    std::unordered_map<std::string, EventHandler> _event_handlers;

    // HTTP server
    std::thread _http_thread;
    int _http_fd = -1;
    std::string _ui_dir;
    std::string _socket_path;

    void _read_loop();
    void _dispatch_message(const std::string& data);
    bool _connect(const std::string& socket_path);
    bool _send_raw(const std::string& data);

    // HTTP helpers
    void _http_loop(int port, const std::string& ui_dir);
    std::string _read_file(const std::string& path);
    std::string _content_type(const std::string& path);
};

} // namespace DawflowSDK

// ============================================================
// IMPLEMENTATION (include in exactly one .cpp file)
// ============================================================
#ifdef DAWFLOW_SDK_IMPLEMENTATION

namespace DawflowSDK {

Plugin::Plugin(const std::string& socket_path)
    : _socket_path(socket_path)
{
    _connect(socket_path);
}

Plugin::~Plugin()
{
    stop();
}

bool Plugin::_connect(const std::string& socket_path)
{
    _fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (_fd < 0) return false;

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, socket_path.c_str(), sizeof(addr.sun_path) - 1);

    if (::connect(_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(_fd);
        _fd = -1;
        return false;
    }

#ifdef __APPLE__
    int nosigpipe = 1;
    setsockopt(_fd, SOL_SOCKET, SO_NOSIGPIPE, &nosigpipe, sizeof(nosigpipe));
#endif

    _connected = true;
    _read_thread = std::thread([this]() { _read_loop(); });
    return true;
}

void Plugin::_read_loop()
{
    std::string buffer;
    char chunk[4096];

    while (_connected) {
        struct pollfd pfd = {_fd, POLLIN, 0};
        int ret = poll(&pfd, 1, 100);
        if (ret <= 0) continue;

        ssize_t n = read(_fd, chunk, sizeof(chunk));
        if (n <= 0) {
            _connected = false;
            break;
        }

        buffer.append(chunk, n);
        size_t pos;
        while ((pos = buffer.find('\n')) != std::string::npos) {
            std::string line = buffer.substr(0, pos);
            buffer.erase(0, pos + 1);
            if (!line.empty()) {
                _dispatch_message(line);
            }
        }
    }
}

void Plugin::_dispatch_message(const std::string& data)
{
    try {
        json j = json::parse(data);

        if (j.contains("method")) {
            // Notification from DAW
            std::string method = j["method"].get<std::string>();
            json params = j.value("params", json{});
            auto it = _event_handlers.find(method);
            if (it != _event_handlers.end()) {
                it->second(params);
            }
        } else if (j.contains("id")) {
            // Response to our request
            int64_t id = j["id"].get<int64_t>();
            std::lock_guard<std::mutex> lock(_pending_mutex);
            auto it = _pending_responses.find(id);
            if (it != _pending_responses.end()) {
                if (j.contains("result")) {
                    *(it->second) = j["result"];
                } else if (j.contains("error")) {
                    *(it->second) = j["error"];
                }
                _response_ready[id] = true;
            }
        }
    } catch (...) {
        // Ignore malformed messages
    }
}

bool Plugin::_send_raw(const std::string& data)
{
    std::lock_guard<std::mutex> lock(_write_mutex);
    if (_fd < 0 || !_connected) return false;
    std::string msg = data + "\n";
    ssize_t written = write(_fd, msg.c_str(), msg.size());
    return written == (ssize_t)msg.size();
}

json Plugin::call(const std::string& method, const json& params)
{
    int64_t id = _next_id++;
    json request;
    request["jsonrpc"] = "2.0";
    request["method"] = method;
    request["params"] = params;
    request["id"] = id;

    json result;
    {
        std::lock_guard<std::mutex> lock(_pending_mutex);
        _pending_responses[id] = &result;
        _response_ready[id] = false;
    }

    _send_raw(request.dump());

    // Wait for response (timeout 5 seconds)
    for (int i = 0; i < 50; i++) {
        {
            std::lock_guard<std::mutex> lock(_pending_mutex);
            if (_response_ready[id]) {
                _pending_responses.erase(id);
                _response_ready.erase(id);
                return result;
            }
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    // Timeout
    std::lock_guard<std::mutex> lock(_pending_mutex);
    _pending_responses.erase(id);
    _response_ready.erase(id);
    return {{"error", "timeout"}};
}

void Plugin::on_event(const std::string& method, EventHandler handler)
{
    _event_handlers[method] = handler;
}

// Convenience methods
json Plugin::get_session_info() { return call("daw.get_session_info"); }
json Plugin::get_tracks() { return call("daw.get_tracks"); }
json Plugin::get_transport_state() { return call("daw.get_transport_state"); }

void Plugin::set_track_gain(const std::string& track_id, double db) {
    call("daw.set_track_gain", {{"track_id", track_id}, {"gain_db", db}});
}
void Plugin::set_track_mute(const std::string& track_id, bool muted) {
    call("daw.set_track_mute", {{"track_id", track_id}, {"muted", muted}});
}
void Plugin::set_track_solo(const std::string& track_id, bool soloed) {
    call("daw.set_track_solo", {{"track_id", track_id}, {"soloed", soloed}});
}
void Plugin::transport_play() { call("daw.transport_play"); }
void Plugin::transport_stop() { call("daw.transport_stop"); }
void Plugin::transport_locate(int64_t pos) {
    call("daw.transport_locate", {{"sample_position", pos}});
}
void Plugin::register_plugin(const std::string& plugin_id) {
    call("daw.plugin.register", {{"plugin_id", plugin_id}});
}

bool Plugin::is_connected() const { return _connected; }

// Simple HTTP server for plugin UI
void Plugin::serve_ui(int port, const std::string& ui_dir)
{
    _ui_dir = ui_dir;
    _http_thread = std::thread([this, port, ui_dir]() { _http_loop(port, ui_dir); });
}

void Plugin::_http_loop(int port, const std::string& ui_dir)
{
    _http_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (_http_fd < 0) return;

    int reuse = 1;
    setsockopt(_http_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    if (bind(_http_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(_http_fd);
        _http_fd = -1;
        return;
    }

    listen(_http_fd, 5);

    while (_running) {
        struct pollfd pfd = {_http_fd, POLLIN, 0};
        int ret = poll(&pfd, 1, 100);
        if (ret <= 0) continue;

        int client = accept(_http_fd, nullptr, nullptr);
        if (client < 0) continue;

        // Read HTTP request
        char buf[4096];
        ssize_t n = read(client, buf, sizeof(buf) - 1);
        if (n <= 0) { close(client); continue; }
        buf[n] = '\0';

        std::string request(buf);
        std::string method, path;
        size_t sp1 = request.find(' ');
        size_t sp2 = request.find(' ', sp1 + 1);
        if (sp1 != std::string::npos && sp2 != std::string::npos) {
            method = request.substr(0, sp1);
            path = request.substr(sp1 + 1, sp2 - sp1 - 1);
        }

        std::string response_body;
        std::string content_type_str = "text/html";
        int status = 200;

        if (method == "POST" && path == "/api/command") {
            // Proxy command to DAW via IPC
            size_t body_start = request.find("\r\n\r\n");
            if (body_start != std::string::npos) {
                std::string body = request.substr(body_start + 4);
                try {
                    json cmd = json::parse(body);
                    json result_data = call(cmd["method"].get<std::string>(),
                                       cmd.value("params", json{}));
                    response_body = result_data.dump();
                    content_type_str = "application/json";
                } catch (...) {
                    response_body = "{\"error\":\"invalid request\"}";
                    content_type_str = "application/json";
                    status = 400;
                }
            }
        } else {
            // Serve static files
            if (path == "/") path = "/index.html";
            std::string file_path = ui_dir + path;
            response_body = _read_file(file_path);
            if (response_body.empty()) {
                status = 404;
                response_body = "Not Found";
            } else {
                content_type_str = _content_type(file_path);
            }
        }

        // Send HTTP response
        std::string header = "HTTP/1.1 " + std::to_string(status) + " OK\r\n"
            "Content-Type: " + content_type_str + "\r\n"
            "Content-Length: " + std::to_string(response_body.size()) + "\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Connection: close\r\n\r\n";
        write(client, header.c_str(), header.size());
        write(client, response_body.c_str(), response_body.size());
        close(client);
    }
}

std::string Plugin::_read_file(const std::string& path)
{
    FILE* f = fopen(path.c_str(), "rb");
    if (!f) return "";
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    std::string content(sz, '\0');
    fread(&content[0], 1, sz, f);
    fclose(f);
    return content;
}

std::string Plugin::_content_type(const std::string& path)
{
    if (path.find(".html") != std::string::npos) return "text/html";
    if (path.find(".css") != std::string::npos) return "text/css";
    if (path.find(".js") != std::string::npos) return "application/javascript";
    if (path.find(".json") != std::string::npos) return "application/json";
    if (path.find(".png") != std::string::npos) return "image/png";
    if (path.find(".svg") != std::string::npos) return "image/svg+xml";
    return "application/octet-stream";
}

void Plugin::run()
{
    _running = true;
    while (_running && _connected) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}

void Plugin::stop()
{
    _running = false;
    _connected = false;

    if (_fd >= 0) {
        close(_fd);
        _fd = -1;
    }
    if (_read_thread.joinable()) _read_thread.join();

    if (_http_fd >= 0) {
        close(_http_fd);
        _http_fd = -1;
    }
    if (_http_thread.joinable()) _http_thread.join();
}

} // namespace DawflowSDK

#endif // DAWFLOW_SDK_IMPLEMENTATION
#endif // DAWFLOW_SDK_H
