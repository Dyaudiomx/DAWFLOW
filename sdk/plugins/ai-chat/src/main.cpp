#define DAWFLOW_SDK_IMPLEMENTATION
#include "../../../dawflow_sdk.h"
#include <iostream>
#include <fstream>

int main(int argc, char* argv[])
{
    if (argc < 2) {
        std::cerr << "Usage: dawflow-ai-chat <socket_path> [ui_port]" << std::endl;
        return 1;
    }

    std::string socket_path = argv[1];
    int ui_port = (argc > 2) ? std::atoi(argv[2]) : 19200;

    std::cout << "DAWFLOW AI Chat: connecting to " << socket_path << std::endl;

    DawflowSDK::Plugin plugin(socket_path);

    if (!plugin.is_connected()) {
        std::cerr << "Failed to connect to DAWFLOW" << std::endl;
        return 1;
    }

    // Register ourselves with the host
    plugin.register_plugin("com.dawflow.ai-chat");

    // Listen for DAW events (can be forwarded to UI via WebSocket in future)
    plugin.on_event("daw.transport.changed", [](const DawflowSDK::json& params) {
        // Transport state changed — UI polls for this
    });

    plugin.on_event("daw.routes.added", [](const DawflowSDK::json& params) {
        // Track list changed — UI polls for this
    });

    // Start HTTP server for chat UI
    // All AI logic lives in the web UI JavaScript
    // The C++ plugin bridges the DAW via /api/command proxy
    plugin.serve_ui(ui_port, "ui/");
    std::cout << "DAWFLOW AI Chat: http://localhost:" << ui_port << std::endl;

    // Run event loop (blocks until stopped)
    plugin.run();

    return 0;
}
