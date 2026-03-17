/*
 * DawflowIPC - Plugin Manifest
 *
 * Defines the structure of a DAWFLOW plugin manifest (manifest.json).
 * Handles parsing, platform resolution, and capability checking.
 *
 * Zero dependencies on Ardour internals. Only requires nlohmann/json and C++17.
 */

#ifndef DAWFLOW_IPC_PLUGIN_MANIFEST_H
#define DAWFLOW_IPC_PLUGIN_MANIFEST_H

#include "dawflow_ipc/json.hpp"
#include <string>
#include <vector>

namespace DawflowIPC {

struct UIPanel {
	std::string id;
	std::string title;
	std::string location;  /* "bottom", "right", "floating" */
	std::string url;        /* relative path e.g., "/ui/index.html" */
};

struct ActionDef {
	std::string id;
	std::string label;
};

struct PluginManifest {
	std::string id;             /* "com.dawflow.ai-assistant" */
	std::string name;           /* "DAWFLOW AI Assistant" */
	std::string version;        /* "1.0.0" */
	std::string api_version;    /* "1" */
	std::string author;
	std::string description;
	std::string entry_point;    /* "bin/{platform}/plugin-binary" */
	std::vector<std::string> capabilities;
	std::vector<UIPanel> panels;
	std::vector<ActionDef> actions;

	/** Parse from JSON string. Throws on invalid input. */
	static PluginManifest from_json (const std::string& json_str);

	/** Get the resolved entry point for the current platform.
	 *  Replaces {platform} with e.g. "macos-arm64", "linux-x86_64". */
	std::string resolved_entry_point () const;

	/** Check if this plugin declares a specific capability. */
	bool has_capability (const std::string& cap) const;
};

} /* namespace DawflowIPC */

#endif /* DAWFLOW_IPC_PLUGIN_MANIFEST_H */
