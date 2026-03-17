/*
 * DawflowCommandsAutomation - Extended API commands for the DAWFLOW Plugin Host
 *
 * Implements 33 additional commands:
 *   - Automation (6): get/set state, get/add/clear data, set all state
 *   - Selection (4): select/deselect/get/select-all tracks
 *   - Metering (4): track peak/RMS, master peak, CPU load
 *   - Export (2): session mixdown, range export (stubbed)
 *   - Track Properties (6): monitoring, active, ports, phase, freeze/unfreeze
 *   - Metronome (3): toggle, volume, count-in
 *   - Batch/Macro (2): execute_batch, get_command_list
 *
 * Part of the DAWFLOW plugin system.
 */

#include "ardour/dawflow_commands_automation.h"
#include "ardour/session.h"
#include "ardour/route.h"
#include "ardour/track.h"
#include "ardour/audio_track.h"
#include "ardour/gain_control.h"
#include "ardour/automation_control.h"
#include "ardour/automation_list.h"
#include "ardour/meter.h"
#include "ardour/phase_control.h"
#include "ardour/monitor_control.h"
#include "ardour/selection.h"
#include "ardour/audioengine.h"
#include "ardour/rc_configuration.h"
#include "ardour/dB.h"
#include "ardour/amp.h"
#include "ardour/io.h"
#include "ardour/port.h"
#include "ardour/interthread_info.h"

#include "pbd/id.h"

#include <algorithm>
#include <iostream>

using namespace ARDOUR;
using namespace DawflowIPC;

/* ---- Helpers ---- */

static std::string
autostate_to_string (AutoState s)
{
	switch (s) {
		case Off:   return "Off";
		case Write: return "Write";
		case Touch: return "Touch";
		case Play:  return "Read";
		case Latch: return "Latch";
		default:    return "Unknown";
	}
}

static AutoState
string_to_autostate (const std::string& s)
{
	if (s == "Off")    return Off;
	if (s == "Write")  return Write;
	if (s == "Touch")  return Touch;
	if (s == "Read")   return Play;
	if (s == "Play")   return Play;
	if (s == "Latch")  return Latch;
	throw std::runtime_error ("Unknown automation state: " + s);
}

static std::shared_ptr<AutomationControl>
get_param_control (std::shared_ptr<Route> route, const std::string& param)
{
	if (param == "gain" || param == "fader") {
		return route->gain_control ();
	}
	if (param == "trim") {
		return route->trim_control ();
	}
	if (param == "mute") {
		return route->mute_control ();
	}
	if (param == "solo") {
		return route->solo_control ();
	}
	/* Pan direction (if available) */
	/* For now, only gain/trim/mute/solo are supported */
	throw std::runtime_error ("Unsupported parameter: " + param + " (supported: gain, trim, mute, solo)");
}

/* ---- Registration ---- */

void
ARDOUR::dawflow_register_automation_commands (
	Session& session,
	std::unordered_map<std::string, std::function<json(const json&)>>& handlers)
{
	/* ============================================================
	 * AUTOMATION COMMANDS (6)
	 * ============================================================ */

	/* 1. daw.get_automation_state */
	handlers["daw.get_automation_state"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string param    = params.value ("parameter", "gain");

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto ctrl = get_param_control (route, param);
		if (!ctrl) {
			throw std::runtime_error ("Control not available for parameter: " + param);
		}

		json result;
		result["track_id"]  = track_id;
		result["parameter"] = param;
		result["state"]     = autostate_to_string (ctrl->automation_state ());
		return result;
	};

	/* 2. daw.set_automation_state */
	handlers["daw.set_automation_state"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string param    = params.value ("parameter", "gain");
		std::string state_s  = params.at ("state").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto ctrl = get_param_control (route, param);
		if (!ctrl) {
			throw std::runtime_error ("Control not available for parameter: " + param);
		}

		ctrl->set_automation_state (string_to_autostate (state_s));

		json result;
		result["ok"] = true;
		return result;
	};

	/* 3. daw.get_automation_data */
	handlers["daw.get_automation_data"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string param    = params.value ("parameter", "gain");

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto ctrl = get_param_control (route, param);
		if (!ctrl || !ctrl->alist ()) {
			throw std::runtime_error ("No automation list for parameter: " + param);
		}

		auto alist = ctrl->alist ();
		json points = json::array ();

		/* Iterate automation events */
		for (auto it = alist->begin (); it != alist->end (); ++it) {
			json pt;
			pt["time"]  = (*it)->when.samples ();
			pt["value"] = (*it)->value;
			points.push_back (pt);
		}

		json result;
		result["track_id"]  = track_id;
		result["parameter"] = param;
		result["points"]    = points;
		result["count"]     = (int)points.size ();
		return result;
	};

	/* 4. daw.add_automation_point */
	handlers["daw.add_automation_point"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string param    = params.value ("parameter", "gain");
		int64_t time_samples = params.at ("time").get<int64_t> ();
		double value         = params.at ("value").get<double> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto ctrl = get_param_control (route, param);
		if (!ctrl || !ctrl->alist ()) {
			throw std::runtime_error ("No automation list for parameter: " + param);
		}

		ctrl->alist ()->add (timepos_t (time_samples), value, false, true);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 5. daw.clear_automation */
	handlers["daw.clear_automation"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string param    = params.value ("parameter", "gain");

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto ctrl = get_param_control (route, param);
		if (!ctrl || !ctrl->alist ()) {
			throw std::runtime_error ("No automation list for parameter: " + param);
		}

		ctrl->alist ()->clear ();

		json result;
		result["ok"] = true;
		return result;
	};

	/* 6. daw.set_all_automation_state */
	handlers["daw.set_all_automation_state"] = [&session](const json& params) -> json {
		std::string state_s = params.at ("state").get<std::string> ();
		std::string param   = params.value ("parameter", "gain");
		AutoState as = string_to_autostate (state_s);

		int count = 0;
		auto routes = session.get_routes ();
		if (routes) {
			for (auto const& route : *routes) {
				if (!route) continue;
				try {
					auto ctrl = get_param_control (route, param);
					if (ctrl) {
						ctrl->set_automation_state (as);
						count++;
					}
				} catch (...) {
					/* skip routes without the requested parameter */
				}
			}
		}

		json result;
		result["ok"]    = true;
		result["count"] = count;
		return result;
	};

	/* ============================================================
	 * SELECTION COMMANDS (4)
	 * ============================================================ */

	/* 7. daw.select_track */
	handlers["daw.select_track"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		bool add = params.value ("add", false);

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		SelectionOperation op = add ? SelectionAdd : SelectionSet;
		session.selection ().select_stripable_and_maybe_group (route, op, false);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 8. daw.deselect_all_tracks */
	handlers["daw.deselect_all_tracks"] = [&session](const json& /* params */) -> json {
		session.selection ().clear_stripables ();

		json result;
		result["ok"] = true;
		return result;
	};

	/* 9. daw.get_selected_tracks */
	handlers["daw.get_selected_tracks"] = [&session](const json& /* params */) -> json {
		CoreSelection::StripableAutomationControls sacs;
		session.selection ().get_stripables (sacs);

		json tracks = json::array ();
		for (auto const& sac : sacs) {
			if (sac.stripable) {
				json t;
				t["id"]   = sac.stripable->id ().to_s ();
				t["name"] = sac.stripable->name ();
				tracks.push_back (t);
			}
		}

		json result;
		result["tracks"] = tracks;
		result["count"]  = (int)tracks.size ();
		return result;
	};

	/* 10. daw.select_all_tracks */
	handlers["daw.select_all_tracks"] = [&session](const json& /* params */) -> json {
		auto routes = session.get_routes ();
		int count = 0;

		if (routes) {
			bool first = true;
			for (auto const& route : *routes) {
				if (!route) continue;
				SelectionOperation op = first ? SelectionSet : SelectionAdd;
				session.selection ().select_stripable_and_maybe_group (route, op, false);
				first = false;
				count++;
			}
		}

		json result;
		result["ok"]    = true;
		result["count"] = count;
		return result;
	};

	/* ============================================================
	 * METERING & ANALYSIS COMMANDS (4)
	 * ============================================================ */

	/* 11. daw.get_track_peak */
	handlers["daw.get_track_peak"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		uint32_t channel     = params.value ("channel", 0);

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto meter = route->peak_meter ();
		if (!meter) {
			throw std::runtime_error ("No peak meter for track: " + track_id);
		}

		float peak_db = meter->meter_level (channel, MeterPeak);

		json result;
		result["track_id"] = track_id;
		result["channel"]  = channel;
		result["peak_db"]  = peak_db;
		return result;
	};

	/* 12. daw.get_track_rms */
	handlers["daw.get_track_rms"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		uint32_t channel     = params.value ("channel", 0);

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto meter = route->peak_meter ();
		if (!meter) {
			throw std::runtime_error ("No peak meter for track: " + track_id);
		}

		float rms_db = meter->meter_level (channel, MeterKrms);

		json result;
		result["track_id"] = track_id;
		result["channel"]  = channel;
		result["rms_db"]   = rms_db;
		return result;
	};

	/* 13. daw.get_master_peak */
	handlers["daw.get_master_peak"] = [&session](const json& /* params */) -> json {
		auto master = session.master_out ();
		if (!master) {
			throw std::runtime_error ("No master bus found");
		}

		auto meter = master->peak_meter ();
		if (!meter) {
			throw std::runtime_error ("No peak meter on master bus");
		}

		json channels = json::array ();
		/* Report peak for all available channels */
		uint32_t n_chans = meter->input_streams ().n_audio ();
		for (uint32_t c = 0; c < n_chans; ++c) {
			json ch;
			ch["channel"] = c;
			ch["peak_db"] = meter->meter_level (c, MeterPeak);
			channels.push_back (ch);
		}

		json result;
		result["channels"] = channels;
		return result;
	};

	/* 14. daw.get_cpu_load */
	handlers["daw.get_cpu_load"] = [&session](const json& /* params */) -> json {
		float dsp_load = session.engine ().get_dsp_load () * 100.0f;

		json result;
		result["cpu_load_percent"] = dsp_load;
		return result;
	};

	/* ============================================================
	 * EXPORT COMMANDS (2) - stubbed, full export is very complex
	 * ============================================================ */

	/* 15. daw.export_session */
	handlers["daw.export_session"] = [](const json& /* params */) -> json {
		/* TODO: Implement full session export using ARDOUR::ExportProfileManager,
		 * ExportHandler, and ExportStatus. This requires significant setup of
		 * export format specs, timespans, and channel configs.
		 *
		 * Params would be: format ("wav", "flac", "mp3"), filename, bit_depth, sample_rate
		 */
		throw std::runtime_error (
			"daw.export_session is not yet implemented. "
			"Session export requires complex ExportProfileManager setup. "
			"Use Ardour's export dialog for now."
		);
	};

	/* 16. daw.export_range */
	handlers["daw.export_range"] = [](const json& /* params */) -> json {
		/* TODO: Same as export_session but with a time range.
		 * Params would be: start_sample, end_sample, format, filename, bit_depth, sample_rate
		 */
		throw std::runtime_error (
			"daw.export_range is not yet implemented. "
			"Range export requires complex ExportProfileManager setup. "
			"Use Ardour's export dialog for now."
		);
	};

	/* ============================================================
	 * VIEW/ZOOM COMMANDS (5) - stubbed, require GUI access
	 * ============================================================ */

	/* 17. daw.set_zoom_level */
	handlers["daw.set_zoom_level"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.set_zoom_level is not available from the plugin host. "
			"View/zoom commands require access to the Editor (gtk2_ardour). "
			"This command will be available when GUI-side command routing is implemented."
		);
	};

	/* 18. daw.zoom_to_session */
	handlers["daw.zoom_to_session"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.zoom_to_session is not available from the plugin host. "
			"View/zoom commands require access to the Editor (gtk2_ardour)."
		);
	};

	/* 19. daw.scroll_to_position */
	handlers["daw.scroll_to_position"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.scroll_to_position is not available from the plugin host. "
			"View/zoom commands require access to the Editor (gtk2_ardour)."
		);
	};

	/* 20. daw.set_visible_tracks */
	handlers["daw.set_visible_tracks"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.set_visible_tracks is not available from the plugin host. "
			"View/zoom commands require access to the Editor (gtk2_ardour)."
		);
	};

	/* 21. daw.get_visible_tracks */
	handlers["daw.get_visible_tracks"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.get_visible_tracks is not available from the plugin host. "
			"View/zoom commands require access to the Editor (gtk2_ardour)."
		);
	};

	/* ============================================================
	 * TRACK PROPERTIES COMMANDS (6)
	 * ============================================================ */

	/* 22. daw.set_track_monitoring */
	handlers["daw.set_track_monitoring"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string mode_s   = params.at ("mode").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto mc = route->monitoring_control ();
		if (!mc) {
			throw std::runtime_error ("Track has no monitoring control: " + track_id);
		}

		MonitorChoice mode;
		if (mode_s == "auto")       mode = MonitorAuto;
		else if (mode_s == "input") mode = MonitorInput;
		else if (mode_s == "disk")  mode = MonitorDisk;
		else if (mode_s == "cue")   mode = MonitorCue;
		else throw std::runtime_error ("Unknown monitoring mode: " + mode_s + " (valid: auto, input, disk, cue)");

		mc->set_value (static_cast<double> (mode), PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 23. daw.set_track_active */
	handlers["daw.set_track_active"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		bool active          = params.at ("active").get<bool> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		route->set_active (active, nullptr);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 24. daw.get_track_input_ports */
	handlers["daw.get_track_input_ports"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto input_io = route->input ();
		if (!input_io) {
			throw std::runtime_error ("Track has no input IO: " + track_id);
		}

		json ports = json::array ();
		uint32_t n = input_io->n_ports ().n_total ();
		for (uint32_t i = 0; i < n; ++i) {
			auto port = input_io->nth (i);
			if (port) {
				json p;
				p["name"]      = port->name ();
				p["connected"] = port->connected ();
				ports.push_back (p);
			}
		}

		json result;
		result["track_id"] = track_id;
		result["ports"]    = ports;
		return result;
	};

	/* 25. daw.get_track_output_ports */
	handlers["daw.get_track_output_ports"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto output_io = route->output ();
		if (!output_io) {
			throw std::runtime_error ("Track has no output IO: " + track_id);
		}

		json ports = json::array ();
		uint32_t n = output_io->n_ports ().n_total ();
		for (uint32_t i = 0; i < n; ++i) {
			auto port = output_io->nth (i);
			if (port) {
				json p;
				p["name"]      = port->name ();
				p["connected"] = port->connected ();
				ports.push_back (p);
			}
		}

		json result;
		result["track_id"] = track_id;
		result["ports"]    = ports;
		return result;
	};

	/* 26. daw.set_track_phase_invert */
	handlers["daw.set_track_phase_invert"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		uint32_t channel     = params.value ("channel", 0);
		bool invert          = params.at ("invert").get<bool> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto pc = route->phase_control ();
		if (!pc) {
			throw std::runtime_error ("Track has no phase control: " + track_id);
		}

		pc->set_phase_invert (channel, invert);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 27. daw.freeze_track */
	handlers["daw.freeze_track"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		/* freeze_me is only available on Track subclass, not Route */
		auto track = std::dynamic_pointer_cast<Track> (route);
		if (!track) {
			throw std::runtime_error ("Route is not a track (cannot freeze buses): " + track_id);
		}

		if (track->freeze_state () == Track::Frozen) {
			throw std::runtime_error ("Track is already frozen: " + track_id);
		}

		/* freeze_me requires an InterThreadInfo for progress tracking.
		 * This is a blocking operation in its simplest form. */
		InterThreadInfo itt;
		itt.done = false;
		itt.cancel = false;
		itt.progress = 0.0f;

		track->freeze_me (itt);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 28. daw.unfreeze_track */
	handlers["daw.unfreeze_track"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto track = std::dynamic_pointer_cast<Track> (route);
		if (!track) {
			throw std::runtime_error ("Route is not a track (cannot unfreeze buses): " + track_id);
		}

		if (track->freeze_state () != Track::Frozen) {
			throw std::runtime_error ("Track is not frozen: " + track_id);
		}

		track->unfreeze ();

		json result;
		result["ok"] = true;
		return result;
	};

	/* ============================================================
	 * METRONOME COMMANDS (3)
	 * ============================================================ */

	/* 29. daw.toggle_metronome */
	handlers["daw.toggle_metronome"] = [](const json& /* params */) -> json {
		bool current = Config->get_clicking ();
		Config->set_clicking (!current);

		json result;
		result["ok"]      = true;
		result["enabled"] = !current;
		return result;
	};

	/* 30. daw.set_metronome_volume */
	handlers["daw.set_metronome_volume"] = [](const json& params) -> json {
		double gain = params.at ("gain").get<double> ();

		/* gain is a linear coefficient (0.0 to 2.0 typically, 1.0 = unity) */
		if (gain < 0.0) gain = 0.0;
		if (gain > 2.0) gain = 2.0;

		Config->set_click_gain (static_cast<float> (gain));

		json result;
		result["ok"]   = true;
		result["gain"] = gain;
		return result;
	};

	/* 31. daw.toggle_count_in */
	handlers["daw.toggle_count_in"] = [&session](const json& /* params */) -> json {
		bool current = session.config.get_count_in ();
		session.config.set_count_in (!current);

		json result;
		result["ok"]      = true;
		result["enabled"] = !current;
		return result;
	};

	/* ============================================================
	 * BATCH / MACRO COMMANDS (2)
	 * ============================================================ */

	/* 32. daw.execute_batch — execute multiple commands in sequence */
	handlers["daw.execute_batch"] = [&handlers](const json& params) -> json {
		if (!params.contains ("commands") || !params["commands"].is_array ()) {
			throw std::runtime_error ("execute_batch requires a 'commands' array");
		}

		json results = json::array ();
		for (auto const& cmd : params["commands"]) {
			std::string method = cmd.at ("method").get<std::string> ();
			json cmd_params = cmd.value ("params", json::object ());

			auto it = handlers.find (method);
			if (it != handlers.end ()) {
				try {
					json r = it->second (cmd_params);
					results.push_back ({{"method", method}, {"result", r}});
				} catch (const std::exception& e) {
					results.push_back ({{"method", method}, {"error", e.what ()}});
				}
			} else {
				results.push_back ({{"method", method}, {"error", "unknown command"}});
			}
		}

		json result;
		result["results"] = results;
		result["count"]   = (int)results.size ();
		return result;
	};

	/* 33. daw.get_command_list — return all available commands */
	handlers["daw.get_command_list"] = [&handlers](const json& /* params */) -> json {
		json commands = json::array ();
		for (auto const& kv : handlers) {
			commands.push_back (kv.first);
		}
		std::sort (commands.begin (), commands.end ());

		json result;
		result["commands"] = commands;
		result["count"]    = (int)commands.size ();
		return result;
	};
}
