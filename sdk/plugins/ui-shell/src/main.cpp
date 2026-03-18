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

    plugin.register_plugin("com.dawflow.ui-shell");

    /* Start HTTP server for the React UI */
    plugin.serve_ui(ui_port, "ui/");
    std::cout << "DAWFLOW UI Shell: serving at http://localhost:" << ui_port << std::endl;

    /* Request full-window WebView */
    std::string url = "http://localhost:" + std::to_string(ui_port) + "/";
    DawflowSDK::json params;
    params["url"] = url;
    plugin.call("daw.ui.request_main_webview", params);

    std::cout << "DAWFLOW UI Shell: requested main WebView" << std::endl;

    /* Run event loop */
    plugin.run();

    return 0;
}
