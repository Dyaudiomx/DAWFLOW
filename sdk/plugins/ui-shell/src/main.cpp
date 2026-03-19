#define DAWFLOW_SDK_IMPLEMENTATION
#include "../../../dawflow_sdk.h"
#include <iostream>
#include <libgen.h>
#include <mach-o/dyld.h>

static std::string get_exe_dir()
{
    char path[4096];
    uint32_t size = sizeof(path);
    if (_NSGetExecutablePath(path, &size) == 0) {
        char* dir = dirname(path);
        return std::string(dir);
    }
    return ".";
}

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

    plugin.register_plugin("com.dawflow.ui-shell");

    /* Resolve ui/ relative to the binary location (not cwd) */
    std::string exe_dir = get_exe_dir();
    std::string ui_dir = exe_dir + "/../../ui/";
    std::cout << "DAWFLOW UI Shell: serving UI from " << ui_dir << std::endl;

    /* Start HTTP server for the React UI */
    plugin.serve_ui(ui_port, ui_dir);
    std::cout << "DAWFLOW UI Shell: serving at http://localhost:" << ui_port << std::endl;

    /* Request full-window WebView in a background thread.
     * plugin.call() is synchronous and the engine processes it via
     * Glib::signal_idle — if we block the main thread here, the HTTP
     * server thread can't serve the WebView's first request. */
    std::string url = "http://localhost:" + std::to_string(ui_port) + "/";
    std::thread([&plugin, url]() {
        /* Brief delay to let the HTTP server start accepting connections */
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
        DawflowSDK::json params;
        params["url"] = url;
        try {
            plugin.call("daw.ui.request_main_webview", params);
            std::cout << "DAWFLOW UI Shell: WebView request accepted" << std::endl;
        } catch (...) {
            std::cerr << "DAWFLOW UI Shell: WebView request failed" << std::endl;
        }
    }).detach();

    std::cout << "DAWFLOW UI Shell: starting event loop" << std::endl;

    /* Run event loop */
    plugin.run();

    return 0;
}
