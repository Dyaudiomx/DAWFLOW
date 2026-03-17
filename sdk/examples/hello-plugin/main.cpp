#define DAWFLOW_SDK_IMPLEMENTATION
#include "../../dawflow_sdk.h"
#include <iostream>

int main(int argc, char* argv[])
{
    if (argc < 2) {
        std::cerr << "Usage: hello-plugin <socket_path> [ui_port]" << std::endl;
        return 1;
    }

    std::string socket_path = argv[1];
    int ui_port = (argc > 2) ? std::atoi(argv[2]) : 19100;

    std::cout << "Hello Plugin: connecting to " << socket_path << std::endl;

    DawflowSDK::Plugin plugin(socket_path);

    if (!plugin.is_connected()) {
        std::cerr << "Failed to connect to DAWFLOW" << std::endl;
        return 1;
    }

    // Register ourselves
    plugin.register_plugin("com.dawflow.hello-plugin");

    // Listen for transport changes
    plugin.on_event("daw.transport.changed", [](const DawflowSDK::json& params) {
        bool playing = params.value("playing", false);
        std::cout << "Transport: " << (playing ? "PLAYING" : "STOPPED") << std::endl;
    });

    // Listen for track additions
    plugin.on_event("daw.routes.added", [](const DawflowSDK::json& params) {
        std::cout << "New tracks added!" << std::endl;
    });

    // Get session info
    auto info = plugin.get_session_info();
    std::cout << "Session: " << info.dump(2) << std::endl;

    // Start HTTP server for UI
    plugin.serve_ui(ui_port, "ui/");
    std::cout << "UI available at http://localhost:" << ui_port << std::endl;

    // Run event loop
    plugin.run();

    return 0;
}
