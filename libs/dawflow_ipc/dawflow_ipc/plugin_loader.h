/*
 * DawflowIPC - Plugin Package Loader
 *
 * Discovers .dawflow plugin packages in a directory, reads their manifests
 * from ZIP archives, extracts packages, and manages plugin process lifecycles
 * via fork/exec.
 *
 * Uses libarchive for ZIP reading/extraction. POSIX APIs for process management.
 * Zero dependencies on Ardour internals.
 */

#ifndef DAWFLOW_IPC_PLUGIN_LOADER_H
#define DAWFLOW_IPC_PLUGIN_LOADER_H

#include "dawflow_ipc/plugin_manifest.h"
#include <string>
#include <unordered_map>
#include <vector>

#include <sys/types.h>

namespace DawflowIPC {

struct LoadedPlugin {
	PluginManifest manifest;
	std::string    extracted_path;  /* where the plugin was extracted to */
	std::string    package_path;    /* path to the .dawflow file */
	pid_t          pid = 0;         /* child process PID (0 = not running) */
	int            ui_port = 0;     /* HTTP port for UI serving */
};

class PluginLoader {
public:
	PluginLoader ();
	~PluginLoader ();

	/** Set the directory to scan for .dawflow packages. */
	void set_plugin_dir (const std::string& dir);

	/** Set the directory where plugins are extracted/cached. */
	void set_cache_dir (const std::string& dir);

	/** Scan plugin_dir for .dawflow files, parse manifests. */
	void scan ();

	/** Get all discovered plugin manifests. */
	std::vector<PluginManifest> get_manifests () const;

	/** Launch a plugin process. Returns true if spawned successfully.
	 *  socket_path is passed as first argument to the plugin binary. */
	bool launch (const std::string& plugin_id, const std::string& socket_path);

	/** Stop a running plugin process. */
	void stop (const std::string& plugin_id);

	/** Stop all running plugins. */
	void stop_all ();

	/** Check if a plugin is running. */
	bool is_running (const std::string& plugin_id) const;

	/** Get loaded plugin info. Returns nullptr if not found. */
	const LoadedPlugin* get_plugin (const std::string& plugin_id) const;

private:
	std::string _plugin_dir;
	std::string _cache_dir;
	int         _next_ui_port;
	std::unordered_map<std::string, LoadedPlugin> _plugins;

	/** Extract a .dawflow ZIP to cache directory. Returns extracted path. */
	std::string _extract_package (const std::string& dawflow_path, const std::string& plugin_id);

	/** Read manifest.json from a .dawflow ZIP without extracting everything. */
	std::string _read_manifest_from_zip (const std::string& zip_path);
};

} /* namespace DawflowIPC */

#endif /* DAWFLOW_IPC_PLUGIN_LOADER_H */
