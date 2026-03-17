/*
 * DawflowPluginHost - DAW-side Plugin Host for the DAWFLOW Plugin System
 *
 * Implements IPC command dispatch (10 DAW commands) and session signal
 * forwarding for the DAWFLOW plugin architecture.
 *
 * Part of the DAWFLOW plugin system (Task 4).
 */

#include "ardour/dawflow_plugin_host.h"
#include "ardour/session.h"
#include "ardour/route.h"
#include "ardour/dB.h"
#include "ardour/gain_control.h"
#include "ardour/mute_control.h"
#include "ardour/solo_control.h"
#include "pbd/id.h"

#include <sys/stat.h>
#include <unistd.h>
#include <cstdlib>
#include <iostream>

using namespace ARDOUR;
using namespace DawflowIPC;

DawflowPluginHost::DawflowPluginHost (Session& session)
	: _session (session)
	, _started (false)
{
	/* Socket path: /tmp/dawflow-<pid>.sock */
	_socket_path = "/tmp/dawflow-" + std::to_string (getpid ()) + ".sock";

	/* Plugin directory: ~/.config/dawflow/plugins/ */
	const char* home = getenv ("HOME");
	std::string config_base = home ? std::string (home) + "/.config/dawflow" : "/tmp/dawflow";

	_plugin_dir = config_base + "/plugins";
	_cache_dir  = config_base + "/cache";

	_register_commands ();
}

DawflowPluginHost::~DawflowPluginHost ()
{
	stop ();
}

void
DawflowPluginHost::start ()
{
	if (_started) {
		return;
	}

	/* Ensure plugin and cache dirs exist */
	mkdir (_plugin_dir.c_str (), 0755);
	mkdir (_cache_dir.c_str (), 0755);

	/* Set up socket server handlers */
	_server.on_message ([this](const std::string& cid, const Message& msg) {
		_handle_message (cid, msg);
	});
	_server.on_connect ([this](const std::string& cid) {
		_handle_client_connect (cid);
	});
	_server.on_disconnect ([this](const std::string& cid) {
		_handle_client_disconnect (cid);
	});

	/* Start socket server */
	if (!_server.start (_socket_path)) {
		std::cerr << "DawflowPluginHost: failed to start socket server on " << _socket_path << std::endl;
		return;
	}

	/* Scan for plugins */
	_loader.set_plugin_dir (_plugin_dir);
	_loader.set_cache_dir (_cache_dir);
	_loader.scan ();

	/* Connect session signals */
	_connect_session_signals ();

	_started = true;

	std::cerr << "DawflowPluginHost: started on " << _socket_path << std::endl;
	std::cerr << "DawflowPluginHost: found " << _loader.get_manifests ().size () << " plugins" << std::endl;
}

void
DawflowPluginHost::stop ()
{
	if (!_started) {
		return;
	}

	_started = false;

	/* Stop all running plugins */
	_loader.stop_all ();

	/* Drop signal connections */
	_signal_connections.drop_connections ();

	/* Stop socket server */
	_server.stop ();

	/* Clean up mappings */
	_plugin_to_client.clear ();
	_client_to_plugin.clear ();

	std::cerr << "DawflowPluginHost: stopped" << std::endl;
}

std::vector<PluginManifest>
DawflowPluginHost::available_plugins () const
{
	return _loader.get_manifests ();
}

bool
DawflowPluginHost::load_plugin (const std::string& plugin_id)
{
	return _loader.launch (plugin_id, _socket_path);
}

void
DawflowPluginHost::unload_plugin (const std::string& plugin_id)
{
	_loader.stop (plugin_id);

	/* Clean up client mapping */
	auto it = _plugin_to_client.find (plugin_id);
	if (it != _plugin_to_client.end ()) {
		_client_to_plugin.erase (it->second);
		_plugin_to_client.erase (it);
	}
}

bool
DawflowPluginHost::is_plugin_loaded (const std::string& plugin_id) const
{
	return _loader.is_running (plugin_id);
}

void
DawflowPluginHost::broadcast_event (const std::string& method, const json& params)
{
	_server.broadcast (Message::notification (method, params));
}

/* ---- Message Handling ---- */

void
DawflowPluginHost::_handle_message (const std::string& client_id, const Message& msg)
{
	if (msg.type == Message::Type::Request) {

		/* Special handling for daw.plugin.register — needs client_id */
		if (msg.method == "daw.plugin.register") {
			try {
				std::string plugin_id = msg.params.at ("plugin_id").get<std::string> ();
				_plugin_to_client[plugin_id] = client_id;
				_client_to_plugin[client_id] = plugin_id;
				std::cerr << "DawflowPluginHost: plugin '" << plugin_id
				          << "' registered as client " << client_id << std::endl;
				if (msg.id.has_value ()) {
					json result;
					result["ok"] = true;
					_server.send (client_id, Message::response_ok (msg.id.value (), result));
				}
			} catch (const std::exception& e) {
				if (msg.id.has_value ()) {
					_server.send (client_id, Message::response_error (
						msg.id.value (), -32602, std::string ("Invalid params: ") + e.what ()));
				}
			}
			return;
		}

		/* Generic command dispatch */
		auto it = _command_handlers.find (msg.method);
		if (it != _command_handlers.end ()) {
			try {
				auto result = it->second (msg.params);
				if (msg.id.has_value ()) {
					_server.send (client_id, Message::response_ok (msg.id.value (), result));
				}
			} catch (const std::exception& e) {
				if (msg.id.has_value ()) {
					_server.send (client_id, Message::response_error (
						msg.id.value (), -32603, e.what ()));
				}
			}
		} else {
			if (msg.id.has_value ()) {
				_server.send (client_id, Message::response_error (
					msg.id.value (), -32601, "Method not found: " + msg.method));
			}
		}
	}
	/* Notifications from plugins are silently ignored for now */
}

void
DawflowPluginHost::_handle_client_connect (const std::string& client_id)
{
	std::cerr << "DawflowPluginHost: client connected: " << client_id << std::endl;
}

void
DawflowPluginHost::_handle_client_disconnect (const std::string& client_id)
{
	std::cerr << "DawflowPluginHost: client disconnected: " << client_id << std::endl;

	/* Clean up plugin mapping if this client was a registered plugin */
	auto it = _client_to_plugin.find (client_id);
	if (it != _client_to_plugin.end ()) {
		_plugin_to_client.erase (it->second);
		_client_to_plugin.erase (it);
	}
}

/* ---- Command Registration ---- */

void
DawflowPluginHost::_register_commands ()
{
	/* 1. daw.get_session_info */
	_command_handlers["daw.get_session_info"] = [this](const json& /* params */) -> json {
		json result;
		result["name"]        = _session.name ();
		result["sample_rate"] = _session.sample_rate ();
		result["playing"]     = _session.transport_rolling ();
		result["recording"]   = _session.actively_recording ();
		result["position"]    = _session.transport_sample ();
		result["dirty"]       = _session.dirty ();
		return result;
	};

	/* 2. daw.get_tracks */
	_command_handlers["daw.get_tracks"] = [this](const json& /* params */) -> json {
		json tracks = json::array ();

		auto routes = _session.get_routes ();
		if (routes) {
			for (auto const& route : *routes) {
				if (!route) {
					continue;
				}

				json track;
				track["id"]   = route->id ().to_s ();
				track["name"] = route->name ();

				/* Gain (as dB) */
				auto gc = route->gain_control ();
				if (gc) {
					track["gain_db"] = accurate_coefficient_to_dB (gc->get_value ());
				} else {
					track["gain_db"] = 0.0;
				}

				/* Mute */
				track["muted"] = route->muted ();

				/* Solo */
				track["soloed"] = route->soloed ();

				tracks.push_back (track);
			}
		}

		return tracks;
	};

	/* 3. daw.set_track_gain */
	_command_handlers["daw.set_track_gain"] = [this](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		double gain_db       = params.at ("gain_db").get<double> ();

		auto route = _session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto gc = route->gain_control ();
		if (!gc) {
			throw std::runtime_error ("Track has no gain control: " + track_id);
		}

		gc->set_value (dB_to_coefficient (gain_db), PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 4. daw.set_track_mute */
	_command_handlers["daw.set_track_mute"] = [this](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		bool muted           = params.at ("muted").get<bool> ();

		auto route = _session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto mc = route->mute_control ();
		if (!mc) {
			throw std::runtime_error ("Track has no mute control: " + track_id);
		}

		mc->set_value (muted ? 1.0 : 0.0, PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 5. daw.set_track_solo */
	_command_handlers["daw.set_track_solo"] = [this](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		bool soloed          = params.at ("soloed").get<bool> ();

		auto route = _session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto sc = route->solo_control ();
		if (!sc) {
			throw std::runtime_error ("Track has no solo control: " + track_id);
		}

		sc->set_value (soloed ? 1.0 : 0.0, PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 6. daw.transport_play */
	_command_handlers["daw.transport_play"] = [this](const json& /* params */) -> json {
		_session.request_transport_speed (1.0);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 7. daw.transport_stop */
	_command_handlers["daw.transport_stop"] = [this](const json& /* params */) -> json {
		_session.request_stop ();

		json result;
		result["ok"] = true;
		return result;
	};

	/* 8. daw.transport_locate */
	_command_handlers["daw.transport_locate"] = [this](const json& params) -> json {
		samplepos_t pos = params.at ("sample_position").get<samplepos_t> ();
		_session.request_locate (pos);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 9. daw.get_transport_state */
	_command_handlers["daw.get_transport_state"] = [this](const json& /* params */) -> json {
		json result;
		result["playing"]   = _session.transport_rolling ();
		result["recording"] = _session.actively_recording ();
		result["position"]  = _session.transport_sample ();
		return result;
	};

	/* 10. daw.plugin.register is handled specially in _handle_message()
	 * because it needs access to the client_id. */
}

/* ---- Session Signal Connections ---- */

void
DawflowPluginHost::_connect_session_signals ()
{
	/* TransportStateChange */
	_session.TransportStateChange.connect_same_thread (_signal_connections, [this]() {
		json params;
		params["playing"]   = _session.transport_rolling ();
		params["recording"] = _session.actively_recording ();
		params["position"]  = _session.transport_sample ();
		broadcast_event ("daw.transport.changed", params);
	});

	/* RouteAdded */
	_session.RouteAdded.connect_same_thread (_signal_connections, [this](RouteList& rl) {
		json params;
		json routes = json::array ();
		for (auto const& route : rl) {
			if (!route) {
				continue;
			}
			json r;
			r["id"]   = route->id ().to_s ();
			r["name"] = route->name ();
			routes.push_back (r);
		}
		params["routes"] = routes;
		broadcast_event ("daw.routes.added", params);
	});

	/* DirtyChanged */
	_session.DirtyChanged.connect_same_thread (_signal_connections, [this]() {
		json params;
		params["dirty"] = _session.dirty ();
		broadcast_event ("daw.session.dirty_changed", params);
	});

	/* RecordStateChanged */
	_session.RecordStateChanged.connect_same_thread (_signal_connections, [this]() {
		json params;
		params["recording"] = _session.actively_recording ();
		broadcast_event ("daw.record.changed", params);
	});
}
