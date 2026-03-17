/*
 * DawflowPluginHost - DAW-side Plugin Host for the DAWFLOW Plugin System
 *
 * Lives inside the DAW, wires up to Session signals, dispatches commands
 * from plugins, and forwards session events to connected plugin processes.
 *
 * Part of the DAWFLOW plugin system (Task 4).
 */

#ifndef ARDOUR_DAWFLOW_PLUGIN_HOST_H
#define ARDOUR_DAWFLOW_PLUGIN_HOST_H

#include "dawflow_ipc/socket_server.h"
#include "dawflow_ipc/plugin_loader.h"
#include "dawflow_ipc/message.h"

#include "pbd/signals.h"

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace ARDOUR {

class Session;

class DawflowPluginHost {
public:
	DawflowPluginHost (Session& session);
	~DawflowPluginHost ();

	/** Start the socket server, scan for plugins, connect session signals. */
	void start ();

	/** Stop the socket server, disconnect all plugins. */
	void stop ();

	/** Get all discovered plugin manifests. */
	std::vector<DawflowIPC::PluginManifest> available_plugins () const;

	/** Launch a plugin process and connect it to the IPC server. */
	bool load_plugin (const std::string& plugin_id);

	/** Stop and disconnect a plugin process. */
	void unload_plugin (const std::string& plugin_id);

	/** Check if a plugin is currently loaded and running. */
	bool is_plugin_loaded (const std::string& plugin_id) const;

	/** Broadcast a notification event to all connected plugin clients. */
	void broadcast_event (const std::string& method, const DawflowIPC::json& params);

	/** Access the command handler map (for extended command registration). */
	using CommandHandler = std::function<DawflowIPC::json(const DawflowIPC::json&)>;
	std::unordered_map<std::string, CommandHandler>& command_handlers () { return _command_handlers; }

	/** Access the session reference (for extended command registration). */
	Session& session () { return _session; }

private:
	Session& _session;
	DawflowIPC::SocketServer _server;
	DawflowIPC::PluginLoader _loader;

	/** Maps plugin_id -> client_id for registered plugins. */
	std::unordered_map<std::string, std::string> _plugin_to_client;

	/** Maps client_id -> plugin_id (reverse lookup). */
	std::unordered_map<std::string, std::string> _client_to_plugin;

	std::unordered_map<std::string, CommandHandler> _command_handlers;

	void _handle_message (const std::string& client_id, const DawflowIPC::Message& msg);
	void _handle_client_connect (const std::string& client_id);
	void _handle_client_disconnect (const std::string& client_id);
	void _register_commands ();
	void _connect_session_signals ();

	PBD::ScopedConnectionList _signal_connections;
	std::string _socket_path;
	std::string _plugin_dir;
	std::string _cache_dir;
	bool _started;
};

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_PLUGIN_HOST_H */
