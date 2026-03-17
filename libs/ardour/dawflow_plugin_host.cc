/*
 * DawflowPluginHost - DAW-side Plugin Host for the DAWFLOW Plugin System
 *
 * Implements IPC command dispatch (26 DAW commands) and session signal
 * forwarding for the DAWFLOW plugin architecture.
 *
 * Part of the DAWFLOW plugin system (Task 4).
 */

#include "ardour/dawflow_plugin_host.h"
#include "ardour/dawflow_plugin_host_extended.h"
#include "ardour/dawflow_commands_editing.h"
#include "ardour/dawflow_commands_automation.h"
#include "ardour/dawflow_commands_final.h"
#include "ardour/dawflow_commands_critical.h"
#include "ardour/dawflow_commands_medium.h"
#include "ardour/dawflow_commands_high.h"
#include "ardour/session.h"
#include "ardour/route.h"
#include "ardour/audio_track.h"
#include "ardour/midi_track.h"
#include "ardour/track.h"
#include "ardour/dB.h"
#include "ardour/gain_control.h"
#include "ardour/mute_control.h"
#include "ardour/solo_control.h"
#include "ardour/plugin_insert.h"
#include "ardour/plugin_manager.h"
#include "ardour/plugin.h"
#include "ardour/processor.h"
#include "ardour/route_group.h"
#include "ardour/presentation_info.h"
#include "ardour/types.h"
#include "ardour/chan_count.h"
#include "ardour/parameter_descriptor.h"
#include "ardour/automation_control.h"
#include "evoral/Parameter.h"
#include "pbd/id.h"

#include <sys/stat.h>
#include <unistd.h>
#include <cstdlib>
#include <iostream>
#include <sstream>

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

	/* ---- Track Management Commands ---- */

	/* 10. daw.add_audio_track */
	_command_handlers["daw.add_audio_track"] = [this](const json& params) -> json {
		std::string name = params.value ("name", "Audio");
		int channels = params.value ("channels", 2);
		auto tracks = _session.new_audio_track (channels, channels, nullptr, 1, name, PresentationInfo::max_order, Normal, true, false);
		if (tracks.empty ()) {
			return {{"error", "failed to create track"}};
		}
		auto& t = tracks.front ();
		return {{"success", true}, {"track_id", t->id ().to_s ()}, {"name", t->name ()}};
	};

	/* 11. daw.add_midi_track */
	_command_handlers["daw.add_midi_track"] = [this](const json& params) -> json {
		std::string name = params.value ("name", "MIDI");
		ChanCount in (DataType::MIDI, 1);
		ChanCount out (DataType::AUDIO, 2);
		auto tracks = _session.new_midi_track (in, out, false, nullptr, nullptr, nullptr, 1, name, PresentationInfo::max_order, Normal, true, false);
		if (tracks.empty ()) {
			return {{"error", "failed to create MIDI track"}};
		}
		auto& t = tracks.front ();
		return {{"success", true}, {"track_id", t->id ().to_s ()}, {"name", t->name ()}};
	};

	/* 12. daw.add_bus */
	_command_handlers["daw.add_bus"] = [this](const json& params) -> json {
		std::string name = params.value ("name", "Bus");
		int channels = params.value ("channels", 2);
		auto routes = _session.new_audio_route (channels, channels, nullptr, 1, name, PresentationInfo::Flag (PresentationInfo::AudioBus), PresentationInfo::max_order);
		if (routes.empty ()) {
			return {{"error", "failed to create bus"}};
		}
		return {{"success", true}, {"bus_id", routes.front ()->id ().to_s ()}, {"name", routes.front ()->name ()}};
	};

	/* 13. daw.remove_track */
	_command_handlers["daw.remove_track"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		auto rl = std::make_shared<RouteList> ();
		rl->push_back (route);
		_session.remove_routes (rl);
		return {{"success", true}};
	};

	/* 14. daw.rename_track */
	_command_handlers["daw.rename_track"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		route->set_name (params["name"].get<std::string> ());
		return {{"success", true}, {"name", route->name ()}};
	};

	/* 15. daw.set_track_color */
	_command_handlers["daw.set_track_color"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		uint32_t color = std::stoul (params["color"].get<std::string> (), nullptr, 16);
		route->presentation_info ().set_color (color);
		return {{"success", true}};
	};

	/* 16. daw.set_track_comment */
	_command_handlers["daw.set_track_comment"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		route->set_comment (params["comment"].get<std::string> (), nullptr);
		return {{"success", true}};
	};

	/* 17. daw.get_track_details */
	_command_handlers["daw.get_track_details"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		json result;
		result["id"]      = route->id ().to_s ();
		result["name"]    = route->name ();
		result["gain_db"] = accurate_coefficient_to_dB (route->gain_control ()->get_value ());
		result["muted"]   = route->muted ();
		result["soloed"]  = route->soloed ();
		result["active"]  = route->active ();
		result["comment"] = route->comment ();
		std::stringstream ss;
		ss << std::hex << route->presentation_info ().color ();
		result["color"] = ss.str ();
		/* List plugins on this track */
		json plugins = json::array ();
		route->foreach_processor ([&plugins](std::weak_ptr<ARDOUR::Processor> wp) {
			auto p = wp.lock ();
			if (p) {
				auto pi = std::dynamic_pointer_cast<ARDOUR::PluginInsert> (p);
				if (pi) {
					plugins.push_back ({
						{"id", p->id ().to_s ()},
						{"name", p->name ()},
						{"enabled", pi->enabled ()},
						{"index", (int)pi->get_count ()}
					});
				}
			}
		});
		result["plugins"] = plugins;
		return result;
	};

	/* 18. daw.set_track_record */
	_command_handlers["daw.set_track_record"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		auto track = std::dynamic_pointer_cast<ARDOUR::Track> (route);
		if (!track) {
			return {{"error", "not a track"}};
		}
		auto rec = track->rec_enable_control ();
		if (rec) {
			rec->set_value (params["enabled"].get<bool> () ? 1.0 : 0.0, PBD::Controllable::NoGroup);
		}
		return {{"success", true}};
	};

	/* 19. daw.duplicate_track */
	_command_handlers["daw.duplicate_track"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		XMLNode& state = route->get_state ();
		std::string name = params.value ("name", route->name () + " (copy)");
		auto routes = _session.new_route_from_template (1, PresentationInfo::max_order, state, name);
		if (routes.empty ()) {
			return {{"error", "failed to duplicate"}};
		}
		return {{"success", true}, {"track_id", routes.front ()->id ().to_s ()}};
	};

	/* ---- Plugin Management Commands ---- */

	/* 20. daw.get_available_plugins */
	_command_handlers["daw.get_available_plugins"] = [this](const json& /* params */) -> json {
		auto& pm = ARDOUR::PluginManager::instance ();
		json plugins = json::array ();
		auto add_list = [&plugins](const ARDOUR::PluginInfoList& list, const std::string& type) {
			for (auto& pi : list) {
				plugins.push_back ({
					{"name", pi->name},
					{"type", type},
					{"category", pi->category},
					{"creator", pi->creator},
					{"unique_id", pi->unique_id}
				});
			}
		};
		add_list (pm.lv2_plugin_info (), "LV2");
		add_list (pm.au_plugin_info (), "AudioUnit");
		add_list (pm.vst3_plugin_info (), "VST3");
		add_list (pm.mac_vst_plugin_info (), "VST");
		add_list (pm.ladspa_plugin_info (), "LADSPA");
		add_list (pm.lua_plugin_info (), "Lua");
		return {{"plugins", plugins}, {"count", (int)plugins.size ()}};
	};

	/* 21. daw.load_plugin */
	_command_handlers["daw.load_plugin"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		std::string plugin_name = params["plugin_name"].get<std::string> ();
		auto& pm = ARDOUR::PluginManager::instance ();
		ARDOUR::PluginInfoPtr found;
		auto search = [&](const ARDOUR::PluginInfoList& list) {
			for (auto& pi : list) {
				if (pi->name == plugin_name) {
					found = pi;
					return;
				}
			}
		};
		search (pm.lv2_plugin_info ());
		if (!found) search (pm.au_plugin_info ());
		if (!found) search (pm.vst3_plugin_info ());
		if (!found) search (pm.mac_vst_plugin_info ());
		if (!found) search (pm.ladspa_plugin_info ());
		if (!found) search (pm.lua_plugin_info ());
		if (!found) {
			return {{"error", "plugin not found: " + plugin_name}};
		}
		auto plugin = found->load (_session);
		if (!plugin) {
			return {{"error", "failed to load plugin"}};
		}
		auto insert = std::shared_ptr<ARDOUR::PluginInsert> (new ARDOUR::PluginInsert (_session, *route, plugin));
		route->add_processor (insert, PreFader);
		return {{"success", true}, {"processor_id", insert->id ().to_s ()}};
	};

	/* 22. daw.remove_plugin */
	_command_handlers["daw.remove_plugin"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		std::string proc_id = params["processor_id"].get<std::string> ();
		std::shared_ptr<ARDOUR::Processor> target;
		route->foreach_processor ([&](std::weak_ptr<ARDOUR::Processor> wp) {
			auto p = wp.lock ();
			if (p && p->id ().to_s () == proc_id) {
				target = p;
			}
		});
		if (!target) {
			return {{"error", "processor not found"}};
		}
		route->remove_processor (target);
		return {{"success", true}};
	};

	/* 23. daw.get_plugin_parameters */
	_command_handlers["daw.get_plugin_parameters"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		std::string proc_id = params["processor_id"].get<std::string> ();
		std::shared_ptr<ARDOUR::PluginInsert> pi;
		route->foreach_processor ([&](std::weak_ptr<ARDOUR::Processor> wp) {
			auto p = wp.lock ();
			if (p && p->id ().to_s () == proc_id) {
				pi = std::dynamic_pointer_cast<ARDOUR::PluginInsert> (p);
			}
		});
		if (!pi) {
			return {{"error", "plugin not found"}};
		}
		auto plugin = pi->plugin ();
		json parameters = json::array ();
		for (uint32_t i = 0; i < plugin->parameter_count (); i++) {
			bool ok;
			uint32_t port = plugin->nth_parameter (i, ok);
			if (!ok) {
				continue;
			}
			ARDOUR::ParameterDescriptor desc;
			plugin->get_parameter_descriptor (port, desc);
			parameters.push_back ({
				{"index", (int)port},
				{"name", desc.label},
				{"value", plugin->get_parameter (port)},
				{"min", desc.lower},
				{"max", desc.upper},
				{"default", desc.normal}
			});
		}
		return {{"parameters", parameters}};
	};

	/* 24. daw.set_plugin_parameter */
	_command_handlers["daw.set_plugin_parameter"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		std::string proc_id = params["processor_id"].get<std::string> ();
		std::shared_ptr<ARDOUR::PluginInsert> pi;
		route->foreach_processor ([&](std::weak_ptr<ARDOUR::Processor> wp) {
			auto p = wp.lock ();
			if (p && p->id ().to_s () == proc_id) {
				pi = std::dynamic_pointer_cast<ARDOUR::PluginInsert> (p);
			}
		});
		if (!pi) {
			return {{"error", "plugin not found"}};
		}
		uint32_t index = params["index"].get<uint32_t> ();
		float value = params["value"].get<float> ();
		auto c = pi->automation_control (Evoral::Parameter (ARDOUR::PluginAutomation, 0, index));
		if (!c) {
			return {{"error", "parameter not found"}};
		}
		c->set_value (value, PBD::Controllable::NoGroup);
		return {{"success", true}};
	};

	/* 25. daw.set_plugin_enabled */
	_command_handlers["daw.set_plugin_enabled"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		std::string proc_id = params["processor_id"].get<std::string> ();
		std::shared_ptr<ARDOUR::PluginInsert> pi;
		route->foreach_processor ([&](std::weak_ptr<ARDOUR::Processor> wp) {
			auto p = wp.lock ();
			if (p && p->id ().to_s () == proc_id) {
				pi = std::dynamic_pointer_cast<ARDOUR::PluginInsert> (p);
			}
		});
		if (!pi) {
			return {{"error", "plugin not found"}};
		}
		pi->enable (params["enabled"].get<bool> ());
		return {{"success", true}};
	};

	/* 26. daw.get_track_plugins */
	_command_handlers["daw.get_track_plugins"] = [this](const json& params) -> json {
		auto route = _session.route_by_id (PBD::ID (params["track_id"].get<std::string> ()));
		if (!route) {
			return {{"error", "track not found"}};
		}
		json plugins = json::array ();
		int idx = 0;
		route->foreach_processor ([&](std::weak_ptr<ARDOUR::Processor> wp) {
			auto p = wp.lock ();
			if (!p) {
				return;
			}
			auto pi = std::dynamic_pointer_cast<ARDOUR::PluginInsert> (p);
			if (pi) {
				plugins.push_back ({
					{"processor_id", p->id ().to_s ()},
					{"name", p->name ()},
					{"enabled", pi->enabled ()},
					{"index", idx}
				});
			}
			idx++;
		});
		return {{"plugins", plugins}};
	};

	/* daw.plugin.register is handled specially in _handle_message()
	 * because it needs access to the client_id. */

	/* Register extended commands (transport, markers, undo, session, routing, groups) */
	dawflow_register_extended_commands (*this, _session, _command_handlers);

	/* Register editing commands (regions, audio analysis, MIDI notes) */
	dawflow_register_editing_commands (_session, _command_handlers);

	/* Register automation, selection, metering, export, and utility commands */
	dawflow_register_automation_commands (_session, _command_handlers);

	/* Register final batch: import, export, presets, search, VCA, snapshots, time, analysis */
	dawflow_register_final_commands (_session, _command_handlers);

	/* Register critical gap-fill: sections, regions, tempo, mix state, time conversion */
	dawflow_register_critical_commands (_session, _command_handlers);

	/* Register medium & low priority: editing, MIDI, arrangement, plugins, project, advanced, events */
	dawflow_register_medium_commands (*this, _session, _command_handlers);

	/* Register HIGH priority gap-fill: recording, editing, mixing, MIDI, plugins, project, query */
	dawflow_register_high_commands (_session, _command_handlers);
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
