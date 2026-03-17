/*
 * DawflowPluginHost Extended Commands
 *
 * Implements 25+ additional IPC commands for the DAWFLOW plugin host:
 *   - Transport (enhanced): tempo, loop/punch range, playback speed, record
 *   - Markers: add, list, remove
 *   - Undo/Redo: undo, redo, history
 *   - Session: save, detailed info
 *   - Routing: pan, trim, input/output, sends
 *   - Route Groups: create, add member, list
 *
 * Part of the DAWFLOW plugin system.
 */

#include "ardour/dawflow_plugin_host_extended.h"
#include "ardour/session.h"
#include "ardour/route.h"
#include "ardour/route_group.h"
#include "ardour/location.h"
#include "ardour/internal_send.h"
#include "ardour/delivery.h"
#include "ardour/io.h"
#include "ardour/port.h"
#include "ardour/amp.h"
#include "ardour/dB.h"
#include "ardour/gain_control.h"
#include "ardour/muteable.h"
#include "ardour/pannable.h"
#include "ardour/types.h"

#include "pbd/id.h"
#include "pbd/controllable.h"

#include "temporal/tempo.h"

#include <iostream>

using namespace ARDOUR;
using namespace DawflowIPC;

void
ARDOUR::dawflow_register_extended_commands (
	DawflowPluginHost& /* host */,
	Session& session,
	std::unordered_map<std::string, std::function<json(const json&)>>& handlers)
{

	/* ==================================================================
	 * TRANSPORT (enhanced)
	 * ================================================================== */

	/* daw.set_tempo — Set session tempo in BPM */
	handlers["daw.set_tempo"] = [](const json& params) -> json {
		double bpm = params.at ("bpm").get<double> ();
		Temporal::TempoMap::WritableSharedPtr tmap = Temporal::TempoMap::write_copy ();
		/* Replace the initial tempo at beat 0 */
		tmap->set_tempo (Temporal::Tempo (bpm, bpm, 4), Temporal::timepos_t (Temporal::Beats ()));
		Temporal::TempoMap::update (tmap);
		json result;
		result["success"] = true;
		result["bpm"] = bpm;
		return result;
	};

	/* daw.set_time_signature — Set session time signature */
	handlers["daw.set_time_signature"] = [](const json& params) -> json {
		int numerator = params.at ("numerator").get<int> ();
		int denominator = params.at ("denominator").get<int> ();
		Temporal::TempoMap::WritableSharedPtr tmap = Temporal::TempoMap::write_copy ();
		tmap->set_meter (Temporal::Meter (numerator, denominator), Temporal::timepos_t (Temporal::Beats ()));
		Temporal::TempoMap::update (tmap);
		json result;
		result["success"] = true;
		result["numerator"] = numerator;
		result["denominator"] = denominator;
		return result;
	};

	/* daw.set_loop_range — Set the auto-loop range */
	handlers["daw.set_loop_range"] = [&session](const json& params) -> json {
		samplepos_t start = params.at ("start_sample").get<int64_t> ();
		samplepos_t end   = params.at ("end_sample").get<int64_t> ();
		auto* loc = session.locations ()->auto_loop_location ();
		if (!loc) {
			throw std::runtime_error ("No auto-loop location defined");
		}
		loc->set (timepos_t (start), timepos_t (end));
		json result;
		result["success"] = true;
		result["start_sample"] = (int64_t)start;
		result["end_sample"] = (int64_t)end;
		return result;
	};

	/* daw.set_punch_range — Set the auto-punch range */
	handlers["daw.set_punch_range"] = [&session](const json& params) -> json {
		samplepos_t start = params.at ("start_sample").get<int64_t> ();
		samplepos_t end   = params.at ("end_sample").get<int64_t> ();
		auto* loc = session.locations ()->auto_punch_location ();
		if (!loc) {
			throw std::runtime_error ("No auto-punch location defined");
		}
		loc->set (timepos_t (start), timepos_t (end));
		json result;
		result["success"] = true;
		result["start_sample"] = (int64_t)start;
		result["end_sample"] = (int64_t)end;
		return result;
	};

	/* daw.toggle_loop — Toggle loop playback on/off */
	handlers["daw.toggle_loop"] = [&session](const json& /* params */) -> json {
		bool currently_looping = session.get_play_loop ();
		session.request_play_loop (!currently_looping);
		json result;
		result["success"] = true;
		result["looping"] = !currently_looping;
		return result;
	};

	/* daw.set_playback_speed — Set transport speed (e.g. 0.5 = half, 2.0 = double) */
	handlers["daw.set_playback_speed"] = [&session](const json& params) -> json {
		double speed = params.at ("speed").get<double> ();
		session.request_transport_speed (speed);
		json result;
		result["success"] = true;
		result["speed"] = speed;
		return result;
	};

	/* daw.toggle_record — Toggle record enable for the session */
	handlers["daw.toggle_record"] = [&session](const json& /* params */) -> json {
		if (session.get_record_enabled ()) {
			session.disable_record (false);
		} else {
			session.maybe_enable_record ();
		}
		json result;
		result["success"] = true;
		result["recording"] = session.get_record_enabled ();
		return result;
	};

	/* daw.record_arm_all — Arm or disarm all tracks for recording */
	handlers["daw.record_arm_all"] = [&session](const json& params) -> json {
		bool arm = true;
		if (params.contains ("arm")) {
			arm = params["arm"].get<bool> ();
		}
		session.set_all_tracks_record_enabled (arm);
		json result;
		result["success"] = true;
		result["armed"] = arm;
		return result;
	};

	/* ==================================================================
	 * MARKERS
	 * ================================================================== */

	/* daw.add_marker — Add a named marker at a given position (or current transport) */
	handlers["daw.add_marker"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();

		int64_t pos_val = (int64_t)session.transport_sample ();
		if (params.contains ("position")) {
			pos_val = params["position"].get<int64_t> ();
		}
		samplepos_t pos = (samplepos_t)pos_val;

		auto* loc = new Location (
			session,
			timepos_t (pos),
			timepos_t (pos),
			name,
			Location::Flags (Location::IsMark)
		);
		session.locations ()->add (loc);

		json result;
		result["success"] = true;
		result["name"] = name;
		result["position"] = (int64_t)pos;
		return result;
	};

	/* daw.get_markers — List all markers and range markers */
	handlers["daw.get_markers"] = [&session](const json& /* params */) -> json {
		json markers = json::array ();

		auto& locs = *session.locations ();
		for (auto* loc : locs.list ()) {
			if (!loc) {
				continue;
			}
			if (loc->is_mark () || loc->is_range_marker ()) {
				json m;
				m["name"]     = loc->name ();
				m["start"]    = (int64_t)loc->start ().samples ();
				m["end"]      = (int64_t)loc->end ().samples ();
				m["is_mark"]  = loc->is_mark ();
				m["is_range"] = loc->is_range_marker ();
				markers.push_back (m);
			}
		}

		json result;
		result["markers"] = markers;
		return result;
	};

	/* daw.remove_marker — Remove a marker by name */
	handlers["daw.remove_marker"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();

		auto& locs = *session.locations ();
		for (auto* loc : locs.list ()) {
			if (!loc) {
				continue;
			}
			if (loc->name () == name) {
				session.locations ()->remove (loc);
				json result;
				result["success"] = true;
				return result;
			}
		}
		throw std::runtime_error ("Marker not found: " + name);
	};

	/* ==================================================================
	 * UNDO / REDO
	 * ================================================================== */

	/* daw.undo — Undo the last N operations */
	handlers["daw.undo"] = [&session](const json& params) -> json {
		uint32_t n = 1;
		if (params.contains ("count")) {
			n = params["count"].get<uint32_t> ();
		}
		session.undo (n);
		json result;
		result["success"] = true;
		result["next_undo"] = session.next_undo ();
		return result;
	};

	/* daw.redo — Redo the last N undone operations */
	handlers["daw.redo"] = [&session](const json& params) -> json {
		uint32_t n = 1;
		if (params.contains ("count")) {
			n = params["count"].get<uint32_t> ();
		}
		session.redo (n);
		json result;
		result["success"] = true;
		result["next_redo"] = session.next_redo ();
		return result;
	};

	/* daw.get_undo_history — Get undo/redo stack information */
	handlers["daw.get_undo_history"] = [&session](const json& /* params */) -> json {
		json result;
		result["undo_depth"] = (int)session.undo_depth ();
		result["redo_depth"] = (int)session.redo_depth ();
		result["next_undo"]  = session.next_undo ();
		result["next_redo"]  = session.next_redo ();
		return result;
	};

	/* ==================================================================
	 * SESSION
	 * ================================================================== */

	/* daw.save_session — Save the current session state */
	handlers["daw.save_session"] = [&session](const json& /* params */) -> json {
		session.save_state ("");
		json result;
		result["success"] = true;
		return result;
	};

	/* daw.get_session_details — Get comprehensive session information */
	handlers["daw.get_session_details"] = [&session](const json& /* params */) -> json {
		json result;
		result["name"]         = session.name ();
		result["path"]         = session.path ();
		result["sample_rate"]  = (int)session.sample_rate ();
		result["block_size"]   = (int)session.get_block_size ();
		result["dirty"]        = session.dirty ();
		result["playing"]      = session.transport_rolling ();
		result["recording"]    = session.actively_recording ();
		result["position"]     = (int64_t)session.transport_sample ();
		result["loop_enabled"] = session.get_play_loop ();
		result["track_count"]  = (int)session.ntracks ();
		result["bus_count"]    = (int)session.nbusses ();
		result["undo_depth"]   = (int)session.undo_depth ();
		result["redo_depth"]   = (int)session.redo_depth ();
		return result;
	};

	/* ==================================================================
	 * ROUTING
	 * ================================================================== */

	/* daw.set_track_pan — Set the pan position of a track (0.0=left, 0.5=center, 1.0=right) */
	handlers["daw.set_track_pan"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		double pan_value = params.at ("pan").get<double> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto pan = route->pan_azimuth_control ();
		if (!pan) {
			throw std::runtime_error ("Track has no pan control: " + track_id);
		}

		pan->set_value (pan_value, PBD::Controllable::NoGroup);

		json result;
		result["success"] = true;
		result["pan"] = pan_value;
		return result;
	};

	/* daw.set_track_trim — Set the trim level of a track in dB */
	handlers["daw.set_track_trim"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		double trim_db = params.at ("trim_db").get<double> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		if (!route->trim () || !route->trim ()->gain_control ()) {
			throw std::runtime_error ("Track has no trim control: " + track_id);
		}

		route->trim ()->gain_control ()->set_value (
			dB_to_coefficient (trim_db), PBD::Controllable::NoGroup);

		json result;
		result["success"] = true;
		result["trim_db"] = trim_db;
		return result;
	};

	/* daw.set_track_input — Connect a track's input to a named port */
	handlers["daw.set_track_input"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string port = params.at ("port").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto input = route->input ();
		if (!input) {
			throw std::runtime_error ("Track has no input IO: " + track_id);
		}

		input->disconnect ();
		for (uint32_t i = 0; i < input->n_ports ().n_total (); i++) {
			auto p = input->nth (i);
			if (p) {
				p->connect (port);
			}
		}

		json result;
		result["success"] = true;
		return result;
	};

	/* daw.set_track_output — Connect a track's output to a named port */
	handlers["daw.set_track_output"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string port = params.at ("port").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto output = route->output ();
		if (!output) {
			throw std::runtime_error ("Track has no output IO: " + track_id);
		}

		output->disconnect ();
		for (uint32_t i = 0; i < output->n_ports ().n_total (); i++) {
			auto p = output->nth (i);
			if (p) {
				p->connect (port);
			}
		}

		json result;
		result["success"] = true;
		return result;
	};

	/* daw.add_send — Add an aux send from a track to a target bus */
	handlers["daw.add_send"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string target_id = params.at ("target_bus_id").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto target = session.route_by_id (PBD::ID (target_id));
		if (!target) {
			throw std::runtime_error ("Target bus not found: " + target_id);
		}

		auto send = std::make_shared<InternalSend> (
			session,
			route->pannable (),
			route->mute_master (),
			route,
			target,
			Delivery::Aux
		);

		route->add_processor (send, PreFader);

		json result;
		result["success"] = true;
		result["send_id"] = send->id ().to_s ();
		return result;
	};

	/* ==================================================================
	 * ROUTE GROUPS
	 * ================================================================== */

	/* daw.create_group — Create a new route group */
	handlers["daw.create_group"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();
		auto group = session.new_route_group (name);
		if (!group) {
			throw std::runtime_error ("Failed to create route group: " + name);
		}
		json result;
		result["success"] = true;
		result["group_name"] = group->name ();
		return result;
	};

	/* daw.add_track_to_group — Add a track/bus to an existing route group */
	handlers["daw.add_track_to_group"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string group_name = params.at ("group_name").get<std::string> ();

		auto route = session.route_by_id (PBD::ID (track_id));
		if (!route) {
			throw std::runtime_error ("Track not found: " + track_id);
		}

		auto group = session.route_group_by_name (group_name);
		if (!group) {
			throw std::runtime_error ("Group not found: " + group_name);
		}

		group->add (route);

		json result;
		result["success"] = true;
		return result;
	};

	/* daw.get_groups — List all route groups and their members */
	handlers["daw.get_groups"] = [&session](const json& /* params */) -> json {
		json groups = json::array ();

		for (auto const& g : session.route_groups ()) {
			json group_obj;
			group_obj["name"] = g->name ();
			group_obj["active"] = g->is_active ();

			json members = json::array ();
			auto rl = g->route_list ();
			if (rl) {
				for (auto const& r : *rl) {
					if (!r) {
						continue;
					}
					json member;
					member["id"] = r->id ().to_s ();
					member["name"] = r->name ();
					members.push_back (member);
				}
			}
			group_obj["members"] = members;
			groups.push_back (group_obj);
		}

		json result;
		result["groups"] = groups;
		return result;
	};

	std::cerr << "DawflowPluginHost: registered 25 extended commands "
	          << "(transport, markers, undo, session, routing, groups)" << std::endl;
}
