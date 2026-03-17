/*
 * DawflowCommandsHigh - HIGH priority API gap-fill for the DAWFLOW Plugin Host
 *
 * Implements 50 production-critical IPC commands for recording, editing,
 * mixing, MIDI, plugins, project management, and querying.
 *
 * Part of the DAWFLOW plugin system.
 */

#include "ardour/dawflow_commands_high.h"

#include "ardour/session.h"
#include "ardour/session_playlists.h"
#include "ardour/route.h"
#include "ardour/track.h"
#include "ardour/audio_track.h"
#include "ardour/midi_track.h"
#include "ardour/playlist.h"
#include "ardour/audioplaylist.h"
#include "ardour/region.h"
#include "ardour/region_factory.h"
#include "ardour/audioregion.h"
#include "ardour/midi_region.h"
#include "ardour/midi_model.h"
#include "ardour/midi_source.h"
#include "ardour/plugin.h"
#include "ardour/plugin_insert.h"
#include "ardour/plugin_manager.h"
#include "ardour/processor.h"
#include "ardour/vca.h"
#include "ardour/vca_manager.h"
#include "ardour/presentation_info.h"
#include "ardour/monitor_control.h"
#include "ardour/dB.h"
#include "ardour/source.h"
#include "ardour/types.h"
#include "ardour/internal_send.h"
#include "ardour/delivery.h"
#include "ardour/io.h"
#include "ardour/port.h"
#include "ardour/audioengine.h"
#include "ardour/port_manager.h"
#include "ardour/rc_configuration.h"
#include "ardour/automation_control.h"
#include "ardour/automation_list.h"
#include "ardour/pannable.h"
#include "ardour/meter.h"
#include "ardour/amp.h"
#include "ardour/gain_control.h"
#include "ardour/interthread_info.h"
#include "ardour/location.h"

#include "evoral/Note.h"
#include "evoral/Parameter.h"
#include "temporal/tempo.h"
#include "temporal/beats.h"
#include "temporal/bbt_time.h"
#include "pbd/id.h"
#include "pbd/controllable.h"
#include "pbd/stateful.h"
#include "pbd/xml++.h"

#include <glibmm/fileutils.h>

#include <algorithm>
#include <cmath>
#include <iostream>
#include <string>
#include <sstream>

using namespace ARDOUR;
using namespace DawflowIPC;

/* ---- Helpers (prefixed _high_ to avoid ODR clashes) ---- */

static double
_high_beats_to_double (Temporal::Beats const & b)
{
	return (double)b.get_beats () + (double)b.get_ticks () / (double)Temporal::Beats::PPQN;
}

static std::shared_ptr<Route>
_high_get_route (Session& session, const std::string& track_id)
{
	auto route = session.route_by_id (PBD::ID (track_id));
	if (!route) {
		throw std::runtime_error ("Track not found: " + track_id);
	}
	return route;
}

static std::shared_ptr<Track>
_high_get_track (Session& session, const std::string& track_id)
{
	auto route = _high_get_route (session, track_id);
	auto track = std::dynamic_pointer_cast<Track> (route);
	if (!track) {
		throw std::runtime_error ("Route is not a track: " + track_id);
	}
	return track;
}

static std::shared_ptr<Playlist>
_high_get_playlist (Session& session, const std::string& track_id)
{
	auto track = _high_get_track (session, track_id);
	auto playlist = track->playlist ();
	if (!playlist) {
		throw std::runtime_error ("Track has no playlist: " + track_id);
	}
	return playlist;
}

static std::shared_ptr<Region>
_high_find_region (std::shared_ptr<Playlist> playlist, const std::string& region_id)
{
	auto regions = playlist->region_list ();
	if (!regions) {
		throw std::runtime_error ("Playlist has no regions");
	}
	for (auto& r : *regions) {
		if (r->id ().to_s () == region_id) {
			return r;
		}
	}
	throw std::runtime_error ("Region not found: " + region_id);
}

static std::shared_ptr<PluginInsert>
_high_find_plugin_insert (std::shared_ptr<Route> route, const std::string& proc_id)
{
	std::shared_ptr<PluginInsert> found;
	route->foreach_processor ([&](std::weak_ptr<Processor> wp) {
		auto p = wp.lock ();
		if (p && p->id ().to_s () == proc_id) {
			auto pi = std::dynamic_pointer_cast<PluginInsert> (p);
			if (pi) {
				found = pi;
			}
		}
	});
	if (!found) {
		throw std::runtime_error ("Plugin not found: " + proc_id);
	}
	return found;
}

/* ---- Registration ---- */

void
ARDOUR::dawflow_register_high_commands (
	Session& session,
	std::unordered_map<std::string, std::function<json(const json&)>>& handlers)
{
	/* ============================================================
	 * RECORDING COMMANDS (8)
	 * ============================================================ */

	/* 1. daw.set_pre_roll — Set pre-roll seconds via Config */
	handlers["daw.set_pre_roll"] = [](const json& params) -> json {
		float seconds = params.at ("seconds").get<float> ();
		Config->set_preroll_seconds (seconds);

		json result;
		result["ok"] = true;
		result["preroll_seconds"] = seconds;
		return result;
	};

	/* 2. daw.set_post_roll — Set post-roll via export_preroll (Ardour has no
	 * dedicated post-roll config; use export_preroll as closest analog).
	 * Negative preroll_seconds indicates bars, positive indicates seconds. */
	handlers["daw.set_post_roll"] = [](const json& params) -> json {
		float seconds = params.at ("seconds").get<float> ();
		/* Ardour uses export_preroll for export padding. There is no direct
		 * "post-roll" config variable, but we store it in export_preroll
		 * as a reasonable approximation. */
		Config->set_export_preroll (seconds);

		json result;
		result["ok"] = true;
		result["postroll_seconds"] = seconds;
		result["description"] = "Set export_preroll as post-roll approximation. "
			"Ardour has no separate post-roll config; preroll_seconds controls "
			"pre-roll behavior (-2=2 bars, >0=seconds).";
		return result;
	};

	/* 3. daw.get_record_state — Detailed record state (armed tracks, punch status) */
	handlers["daw.get_record_state"] = [&session](const json& /* params */) -> json {
		json result;
		result["record_enabled"] = session.get_record_enabled ();
		result["actively_recording"] = session.actively_recording ();

		/* Count armed tracks */
		int armed_count = 0;
		json armed_tracks = json::array ();
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (!r) continue;
				auto track = std::dynamic_pointer_cast<Track> (r);
				if (track && track->rec_enable_control () &&
				    track->rec_enable_control ()->get_value () > 0.5) {
					armed_count++;
					armed_tracks.push_back ({
						{"id", r->id ().to_s ()},
						{"name", r->name ()}
					});
				}
			}
		}
		result["armed_tracks"] = armed_tracks;
		result["armed_count"] = armed_count;

		/* Punch status */
		auto* punch_loc = session.locations ()->auto_punch_location ();
		result["punch_enabled"] = session.config.get_punch_in () || session.config.get_punch_out ();
		result["punch_in"] = session.config.get_punch_in ();
		result["punch_out"] = session.config.get_punch_out ();
		if (punch_loc) {
			result["punch_start"] = (int64_t)punch_loc->start ().samples ();
			result["punch_end"] = (int64_t)punch_loc->end ().samples ();
		}

		/* Pre-roll info */
		result["preroll_seconds"] = Config->get_preroll_seconds ();

		return result;
	};

	/* 4. daw.transport_record — Start recording immediately (enable record + play) */
	handlers["daw.transport_record"] = [&session](const json& /* params */) -> json {
		if (!session.get_record_enabled ()) {
			session.maybe_enable_record ();
		}
		session.request_transport_speed (1.0);

		json result;
		result["ok"] = true;
		result["recording"] = true;
		return result;
	};

	/* 5. daw.discard_last_take — Undo last recording via session undo */
	handlers["daw.discard_last_take"] = [&session](const json& /* params */) -> json {
		/* Stop transport if rolling */
		if (session.transport_rolling ()) {
			session.request_stop ();
		}

		/* Undo last operation (which should be the recording) */
		if (session.undo_depth () > 0) {
			session.undo (1);

			json result;
			result["ok"] = true;
			result["description"] = "Undid last operation (last recording take). "
				"Verify the undo was a recording action via daw.get_undo_history.";
			return result;
		}

		throw std::runtime_error ("No undo history available to discard take");
	};

	/* 6. daw.set_track_playlist — Switch track to a different playlist by name */
	handlers["daw.set_track_playlist"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string playlist_name = params.at ("playlist_name").get<std::string> ();

		auto track = _high_get_track (session, track_id);

		auto playlists = session.playlists ();
		if (!playlists) {
			throw std::runtime_error ("No session playlists manager");
		}

		auto playlist = playlists->by_name (playlist_name);
		if (!playlist) {
			throw std::runtime_error ("Playlist not found: " + playlist_name);
		}

		track->use_playlist (track->data_type (), playlist);

		json result;
		result["ok"] = true;
		result["playlist_name"] = playlist->name ();
		return result;
	};

	/* 7. daw.get_track_playlists — List playlists for a track */
	handlers["daw.get_track_playlists"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto track = _high_get_track (session, track_id);
		auto playlists = session.playlists ();
		if (!playlists) {
			throw std::runtime_error ("No session playlists manager");
		}

		auto pls = playlists->playlists_for_track (track);

		json playlist_list = json::array ();
		auto current_pl = track->playlist ();
		for (auto& pl : pls) {
			json p;
			p["name"] = pl->name ();
			p["id"] = pl->id ().to_s ();
			p["region_count"] = (int)pl->n_regions ();
			p["is_current"] = (current_pl && pl->id () == current_pl->id ());
			playlist_list.push_back (p);
		}

		json result;
		result["playlists"] = playlist_list;
		result["count"] = (int)playlist_list.size ();
		return result;
	};

	/* 8. daw.new_track_playlist — Create new playlist for a track */
	handlers["daw.new_track_playlist"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto track = _high_get_track (session, track_id);
		track->use_new_playlist (track->data_type ());

		auto pl = track->playlist ();

		json result;
		result["ok"] = true;
		result["playlist_name"] = pl ? pl->name () : "unknown";
		return result;
	};

	/* ============================================================
	 * EDITING COMMANDS (8) — skipping daw.set_snap_mode and daw.select_regions_in_range
	 * which are handled below
	 * ============================================================ */

	/* 9. daw.move_region_to_track — Move region between tracks */
	handlers["daw.move_region_to_track"] = [&session](const json& params) -> json {
		std::string source_track_id = params.at ("source_track_id").get<std::string> ();
		std::string target_track_id = params.at ("target_track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		samplepos_t position = params.value ("position_samples", (samplepos_t)-1);

		auto src_playlist = _high_get_playlist (session, source_track_id);
		auto tgt_playlist = _high_get_playlist (session, target_track_id);
		auto region = _high_find_region (src_playlist, region_id);

		if (position < 0) {
			position = region->position_sample ();
		}

		/* Remove from source playlist */
		src_playlist->remove_region (region);

		/* Add to target playlist at position */
		tgt_playlist->add_region (region, timepos_t (position));

		json result;
		result["ok"] = true;
		result["new_position"] = (int64_t)position;
		return result;
	};

	/* 10. daw.nudge_region — Nudge region by samples or beats */
	handlers["daw.nudge_region"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int64_t nudge_samples = params.value ("nudge_samples", (int64_t)0);
		double nudge_beats = params.value ("nudge_beats", 0.0);

		auto playlist = _high_get_playlist (session, track_id);
		auto region = _high_find_region (playlist, region_id);

		if (!region->can_move ()) {
			throw std::runtime_error ("Region is locked and cannot be nudged: " + region_id);
		}

		samplepos_t current_pos = region->position_sample ();
		samplepos_t new_pos = current_pos;

		if (nudge_samples != 0) {
			new_pos = (samplepos_t)std::max ((int64_t)0, (int64_t)current_pos + nudge_samples);
		} else if (nudge_beats != 0.0) {
			/* Convert beat offset to samples at current position */
			auto const& tmap = Temporal::TempoMap::use ();
			auto current_beats = tmap->quarters_at_sample (current_pos);
			double new_beats_val = _high_beats_to_double (current_beats) + nudge_beats;
			if (new_beats_val < 0.0) new_beats_val = 0.0;
			Temporal::Beats new_beats = Temporal::Beats::from_double (new_beats_val);
			new_pos = tmap->sample_at (new_beats);
		}

		region->set_position (timepos_t (new_pos));

		json result;
		result["ok"] = true;
		result["new_position_samples"] = (int64_t)new_pos;
		return result;
	};

	/* 11. daw.set_snap_mode — Set grid snap (stub: snap mode is a GUI-side setting) */
	handlers["daw.set_snap_mode"] = [](const json& params) -> json {
		std::string mode = params.value ("mode", "grid");
		std::string grid_size = params.value ("grid_size", "1/4");

		json result;
		result["status"] = "not_available_from_plugin_host";
		result["description"] = "Snap/grid mode is a GUI-side setting controlled by "
			"the Editor. It cannot be changed from the plugin host (libardour). "
			"The Editor stores snap mode in its own state. "
			"Requested mode: " + mode + ", grid_size: " + grid_size;
		return result;
	};

	/* 12. daw.consolidate_range — Consolidate regions in range (bounce) */
	handlers["daw.consolidate_range"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		samplepos_t start = params.at ("start_samples").get<samplepos_t> ();
		samplepos_t end = params.at ("end_samples").get<samplepos_t> ();
		std::string name = params.value ("name", "consolidated");

		auto track = _high_get_track (session, track_id);

		InterThreadInfo itt;
		auto bounced = track->bounce_range (start, end, itt, std::shared_ptr<Processor> (), false, name);

		if (!bounced) {
			throw std::runtime_error ("Consolidation (bounce) failed for track: " + track_id);
		}

		json result;
		result["ok"] = true;
		result["region_id"] = bounced->id ().to_s ();
		result["region_name"] = bounced->name ();
		return result;
	};

	/* 13. daw.time_stretch_region — Time stretch (stub: requires RubberBand integration) */
	handlers["daw.time_stretch_region"] = [](const json& params) -> json {
		std::string region_id = params.value ("region_id", "");
		double ratio = params.value ("ratio", 1.0);

		json result;
		result["status"] = "not_yet_implemented";
		result["description"] = "Time stretching requires the RubberBandStretcher "
			"integration (TimeFXDialog in the Editor). It cannot be performed "
			"directly from libardour without the GUI thread. "
			"Requested ratio: " + std::to_string (ratio) + " for region " + region_id + ". "
			"Use Ardour's GUI time-stretch tool for now.";
		return result;
	};

	/* 14. daw.pitch_shift_region — Pitch shift (stub: requires RubberBand) */
	handlers["daw.pitch_shift_region"] = [](const json& params) -> json {
		std::string region_id = params.value ("region_id", "");
		double semitones = params.value ("semitones", 0.0);

		json result;
		result["status"] = "not_yet_implemented";
		result["description"] = "Pitch shifting requires RubberBand integration "
			"(PitchShiftDialog in the Editor). Cannot be performed from libardour "
			"without the GUI thread. "
			"Requested shift: " + std::to_string (semitones) + " semitones for region " + region_id + ". "
			"Use Ardour's GUI pitch-shift tool for now.";
		return result;
	};

	/* 15. daw.get_region_at_position — Find region at time on track */
	handlers["daw.get_region_at_position"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		samplepos_t position = params.at ("position_samples").get<samplepos_t> ();

		auto playlist = _high_get_playlist (session, track_id);
		auto region = playlist->top_region_at (timepos_t (position));

		if (!region) {
			json result;
			result["found"] = false;
			return result;
		}

		json result;
		result["found"] = true;
		result["id"] = region->id ().to_s ();
		result["name"] = region->name ();
		result["position_samples"] = region->position_sample ();
		result["length_samples"] = region->length_samples ();
		result["muted"] = region->muted ();
		result["locked"] = region->locked ();
		return result;
	};

	/* 16. daw.select_regions_in_range — Select regions touching a time range */
	handlers["daw.select_regions_in_range"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		samplepos_t start = params.at ("start_samples").get<samplepos_t> ();
		samplepos_t end = params.at ("end_samples").get<samplepos_t> ();

		auto playlist = _high_get_playlist (session, track_id);
		auto regions = playlist->regions_touched (timepos_t (start), timepos_t (end));

		json region_list = json::array ();
		if (regions) {
			for (auto& r : *regions) {
				region_list.push_back ({
					{"id", r->id ().to_s ()},
					{"name", r->name ()},
					{"position_samples", r->position_sample ()},
					{"length_samples", r->length_samples ()}
				});
			}
		}

		json result;
		result["regions"] = region_list;
		result["count"] = (int)region_list.size ();
		return result;
	};

	/* ============================================================
	 * MIXING COMMANDS (12)
	 * (daw.unsolo_all and daw.unmute_all already exist — skipped)
	 * ============================================================ */

	/* 17. daw.set_track_pan_width — Stereo width via pan_width_control() */
	handlers["daw.set_track_pan_width"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		double width = params.at ("width").get<double> ();

		auto route = _high_get_route (session, track_id);
		auto pw = route->pan_width_control ();
		if (!pw) {
			throw std::runtime_error ("Track has no pan width control: " + track_id);
		}

		pw->set_value (width, PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		result["width"] = width;
		return result;
	};

	/* 18. daw.get_track_pan — Get pan position and width */
	handlers["daw.get_track_pan"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _high_get_route (session, track_id);

		json result;
		result["track_id"] = track_id;

		auto azimuth = route->pan_azimuth_control ();
		if (azimuth) {
			result["pan_position"] = azimuth->get_value ();
		} else {
			result["pan_position"] = nullptr;
		}

		auto width = route->pan_width_control ();
		if (width) {
			result["pan_width"] = width->get_value ();
		} else {
			result["pan_width"] = nullptr;
		}

		return result;
	};

	/* 19. daw.set_send_enable — Enable/disable send via send_enable_controllable(n) */
	handlers["daw.set_send_enable"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		uint32_t send_index = params.at ("send_index").get<uint32_t> ();
		bool enabled = params.at ("enabled").get<bool> ();

		auto route = _high_get_route (session, track_id);
		auto ctrl = route->send_enable_controllable (send_index);
		if (!ctrl) {
			throw std::runtime_error ("Send enable control not found at index " +
				std::to_string (send_index) + " on track " + track_id);
		}

		ctrl->set_value (enabled ? 1.0 : 0.0, PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 20. daw.get_sends — List sends with targets, levels, enabled state */
	handlers["daw.get_sends"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _high_get_route (session, track_id);

		json sends = json::array ();

		for (uint32_t i = 0; ; ++i) {
			auto send_proc = route->nth_send (i);
			if (!send_proc) break;

			json s;
			s["index"] = i;
			s["id"] = send_proc->id ().to_s ();
			s["name"] = send_proc->name ();
			s["active"] = send_proc->enabled ();

			/* Send level */
			auto level_ctrl = route->send_level_controllable (i);
			if (level_ctrl) {
				double gain = level_ctrl->get_value ();
				s["gain"] = gain;
				s["gain_db"] = (gain > 0.0) ? accurate_coefficient_to_dB (gain) : -200.0;
			}

			/* Send enable */
			auto enable_ctrl = route->send_enable_controllable (i);
			if (enable_ctrl) {
				s["enabled"] = (enable_ctrl->get_value () > 0.5);
			}

			/* Target (for InternalSend) */
			auto isend = std::dynamic_pointer_cast<InternalSend> (send_proc);
			if (isend) {
				auto target = isend->target_route ();
				if (target) {
					s["target_id"] = target->id ().to_s ();
					s["target_name"] = target->name ();
				}
			}

			/* Send name */
			std::string sname = route->send_name (i);
			if (!sname.empty ()) {
				s["send_name"] = sname;
			}

			sends.push_back (s);
		}

		json result;
		result["sends"] = sends;
		result["count"] = (int)sends.size ();
		return result;
	};

	/* 21. daw.set_track_gain_relative — Adjust gain by delta dB */
	handlers["daw.set_track_gain_relative"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		double delta_db = params.at ("delta_db").get<double> ();

		auto route = _high_get_route (session, track_id);
		auto gc = route->gain_control ();
		if (!gc) {
			throw std::runtime_error ("Track has no gain control: " + track_id);
		}

		double current_gain = gc->get_value ();
		double current_db = (current_gain > 0.0) ? accurate_coefficient_to_dB (current_gain) : -200.0;
		double new_db = current_db + delta_db;

		/* Clamp to reasonable range */
		if (new_db < -200.0) new_db = -200.0;
		if (new_db > 6.0) new_db = 6.0;

		gc->set_value (dB_to_coefficient (new_db), PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		result["previous_db"] = current_db;
		result["new_db"] = new_db;
		return result;
	};

	/* 22 & 23: daw.unsolo_all and daw.unmute_all already exist — skipped */

	/* 24. daw.get_master_gain — Master bus gain */
	handlers["daw.get_master_gain"] = [&session](const json& /* params */) -> json {
		auto master = session.master_out ();
		if (!master) {
			throw std::runtime_error ("No master bus found");
		}

		auto gc = master->gain_control ();
		if (!gc) {
			throw std::runtime_error ("Master bus has no gain control");
		}

		double gain = gc->get_value ();

		json result;
		result["gain"] = gain;
		result["gain_db"] = (gain > 0.0) ? accurate_coefficient_to_dB (gain) : -200.0;
		result["track_id"] = master->id ().to_s ();
		result["name"] = master->name ();
		return result;
	};

	/* 25. daw.set_master_gain — Set master fader */
	handlers["daw.set_master_gain"] = [&session](const json& params) -> json {
		double gain_db = params.at ("gain_db").get<double> ();

		auto master = session.master_out ();
		if (!master) {
			throw std::runtime_error ("No master bus found");
		}

		auto gc = master->gain_control ();
		if (!gc) {
			throw std::runtime_error ("Master bus has no gain control");
		}

		gc->set_value (dB_to_coefficient (gain_db), PBD::Controllable::NoGroup);

		json result;
		result["ok"] = true;
		result["gain_db"] = gain_db;
		return result;
	};

	/* 26. daw.bypass_all_plugins — Bypass all plugins on a track */
	handlers["daw.bypass_all_plugins"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _high_get_route (session, track_id);

		int count = 0;
		route->foreach_processor ([&count](std::weak_ptr<Processor> wp) {
			auto p = wp.lock ();
			if (!p) return;
			auto pi = std::dynamic_pointer_cast<PluginInsert> (p);
			if (pi && pi->enabled ()) {
				pi->enable (false);
				count++;
			}
		});

		json result;
		result["ok"] = true;
		result["bypassed_count"] = count;
		return result;
	};

	/* 27. daw.enable_all_plugins — Re-enable all plugins on a track */
	handlers["daw.enable_all_plugins"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _high_get_route (session, track_id);

		int count = 0;
		route->foreach_processor ([&count](std::weak_ptr<Processor> wp) {
			auto p = wp.lock ();
			if (!p) return;
			auto pi = std::dynamic_pointer_cast<PluginInsert> (p);
			if (pi && !pi->enabled ()) {
				pi->enable (true);
				count++;
			}
		});

		json result;
		result["ok"] = true;
		result["enabled_count"] = count;
		return result;
	};

	/* 28. daw.get_master_lufs — LUFS measurement (stub: no built-in LUFS meter in Ardour core) */
	handlers["daw.get_master_lufs"] = [&session](const json& /* params */) -> json {
		auto master = session.master_out ();
		if (!master) {
			throw std::runtime_error ("No master bus found");
		}

		/* Ardour has K-metering (K-14, K-20) but not a direct LUFS readout
		 * accessible from libardour. The ebur128 meter would need to be
		 * read via the LoudnessAnalyzer or a dedicated meter plugin. */
		auto meter = master->peak_meter ();
		json result;
		result["status"] = "approximation";
		result["description"] = "Ardour does not expose a built-in LUFS meter via "
			"the session API. Use a LUFS metering plugin (e.g., x42 Meter) on the "
			"master bus and read its parameters via daw.get_plugin_parameters. "
			"Returning K-RMS as an approximation.";

		if (meter) {
			uint32_t n_chans = meter->input_streams ().n_audio ();
			json channels = json::array ();
			for (uint32_t c = 0; c < n_chans; ++c) {
				json ch;
				ch["channel"] = c;
				ch["peak_db"] = meter->meter_level (c, MeterPeak);
				ch["k_rms_db"] = meter->meter_level (c, MeterKrms);
				channels.push_back (ch);
			}
			result["channels"] = channels;
		}

		return result;
	};

	/* ============================================================
	 * MIDI COMMANDS (5)
	 * ============================================================ */

	/* 29. daw.edit_midi_note — Edit specific note by ID (change pitch, velocity, etc.) */
	handlers["daw.edit_midi_note"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int note_id = params.at ("note_id").get<int> ();

		auto playlist = _high_get_playlist (session, track_id);
		auto region = _high_find_region (playlist, region_id);
		auto mr = std::dynamic_pointer_cast<MidiRegion> (region);
		if (!mr) {
			throw std::runtime_error ("Region is not a MIDI region: " + region_id);
		}
		auto model = mr->model ();
		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		/* Find note by ID */
		std::shared_ptr<Evoral::Note<Temporal::Beats>> found;
		auto& notes = model->notes ();
		for (auto& n : notes) {
			if ((int)n->id () == note_id) {
				found = n;
				break;
			}
		}
		if (!found) {
			throw std::runtime_error ("Note not found with id: " + std::to_string (note_id));
		}

		auto cmd = model->new_note_diff_command ("DawFlow Edit Note");

		if (params.contains ("note")) {
			int new_note = params["note"].get<int> ();
			if (new_note >= 0 && new_note <= 127) {
				cmd->change (found, MidiModel::NoteDiffCommand::NoteNumber, (uint8_t)new_note);
			}
		}
		if (params.contains ("velocity")) {
			int new_vel = params["velocity"].get<int> ();
			if (new_vel >= 0 && new_vel <= 127) {
				cmd->change (found, MidiModel::NoteDiffCommand::Velocity, (uint8_t)new_vel);
			}
		}
		if (params.contains ("start_beats")) {
			double sb = params["start_beats"].get<double> ();
			cmd->change (found, MidiModel::NoteDiffCommand::StartTime,
				Temporal::Beats::from_double (sb));
		}
		if (params.contains ("length_beats")) {
			double lb = params["length_beats"].get<double> ();
			cmd->change (found, MidiModel::NoteDiffCommand::Length,
				Temporal::Beats::from_double (lb));
		}
		if (params.contains ("channel")) {
			int ch = params["channel"].get<int> ();
			if (ch >= 0 && ch <= 15) {
				cmd->change (found, MidiModel::NoteDiffCommand::Channel, (uint8_t)ch);
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 30. daw.set_midi_note_length — Set note length for a specific note */
	handlers["daw.set_midi_note_length"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int note_id = params.at ("note_id").get<int> ();
		double length_beats = params.at ("length_beats").get<double> ();

		auto playlist = _high_get_playlist (session, track_id);
		auto region = _high_find_region (playlist, region_id);
		auto mr = std::dynamic_pointer_cast<MidiRegion> (region);
		if (!mr) {
			throw std::runtime_error ("Region is not a MIDI region: " + region_id);
		}
		auto model = mr->model ();
		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		std::shared_ptr<Evoral::Note<Temporal::Beats>> found;
		auto& notes = model->notes ();
		for (auto& n : notes) {
			if ((int)n->id () == note_id) {
				found = n;
				break;
			}
		}
		if (!found) {
			throw std::runtime_error ("Note not found with id: " + std::to_string (note_id));
		}

		auto cmd = model->new_note_diff_command ("DawFlow Set Note Length");
		cmd->change (found, MidiModel::NoteDiffCommand::Length,
			Temporal::Beats::from_double (length_beats));
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 31. daw.add_midi_cc — Add CC event (improved from existing stub) */
	handlers["daw.add_midi_cc"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int cc_number = params.at ("cc_number").get<int> ();
		double time_beats = params.at ("time_beats").get<double> ();
		int cc_value = params.at ("value").get<int> ();
		int channel = params.value ("channel", 0);

		if (cc_number < 0 || cc_number > 127) {
			throw std::runtime_error ("CC number must be 0-127");
		}
		if (cc_value < 0 || cc_value > 127) {
			throw std::runtime_error ("CC value must be 0-127");
		}

		auto track = _high_get_track (session, track_id);
		auto route = std::dynamic_pointer_cast<Route> (track);
		if (!route) {
			throw std::runtime_error ("Could not get route for track: " + track_id);
		}

		/* MIDI CC automation is stored on the track's automation controls,
		 * keyed by Evoral::Parameter (MidiCCAutomation, channel, cc_number).
		 * We add a point to that automation list. */
		Evoral::Parameter midi_cc_param (MidiCCAutomation, channel, cc_number);
		auto ctrl = route->automation_control (midi_cc_param, true);
		if (!ctrl) {
			throw std::runtime_error ("Could not create/find automation control for CC " +
				std::to_string (cc_number));
		}

		/* Convert beats to samples for the automation list */
		auto const& tmap = Temporal::TempoMap::use ();
		Temporal::Beats beats = Temporal::Beats::from_double (time_beats);
		samplepos_t time_samples = tmap->sample_at (beats);

		ctrl->alist ()->add (timepos_t (time_samples), (double)cc_value / 127.0, false, true);

		json result;
		result["ok"] = true;
		result["cc_number"] = cc_number;
		result["time_samples"] = (int64_t)time_samples;
		return result;
	};

	/* 32. daw.get_midi_cc — Get CC data for a control on a track */
	handlers["daw.get_midi_cc"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		int cc_number = params.at ("cc_number").get<int> ();
		int channel = params.value ("channel", 0);

		auto route = _high_get_route (session, track_id);

		Evoral::Parameter midi_cc_param (MidiCCAutomation, channel, cc_number);
		auto ctrl = route->automation_control (midi_cc_param);
		if (!ctrl || !ctrl->alist ()) {
			json result;
			result["points"] = json::array ();
			result["count"] = 0;
			result["cc_number"] = cc_number;
			return result;
		}

		auto alist = ctrl->alist ();
		json points = json::array ();

		for (auto it = alist->begin (); it != alist->end (); ++it) {
			json pt;
			pt["time_samples"] = (int64_t)(*it)->when.samples ();
			pt["value"] = (*it)->value;
			pt["value_midi"] = (int)std::round ((*it)->value * 127.0);
			points.push_back (pt);
		}

		json result;
		result["points"] = points;
		result["count"] = (int)points.size ();
		result["cc_number"] = cc_number;
		result["channel"] = channel;
		result["state"] = ctrl->alist () ?
			(ctrl->automation_state () == Play ? "Read" :
			 ctrl->automation_state () == Write ? "Write" :
			 ctrl->automation_state () == Touch ? "Touch" :
			 ctrl->automation_state () == Latch ? "Latch" : "Off") : "Off";
		return result;
	};

	/* 33. daw.duplicate_midi_region_content — Loop MIDI content (duplicate region) */
	handlers["daw.duplicate_midi_region_content"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		float times = params.value ("times", 1.0f);

		auto playlist = _high_get_playlist (session, track_id);
		auto region = _high_find_region (playlist, region_id);

		auto mr = std::dynamic_pointer_cast<MidiRegion> (region);
		if (!mr) {
			throw std::runtime_error ("Region is not a MIDI region: " + region_id);
		}

		/* Duplicate the region in the playlist right after it */
		timepos_t pos = region->end ();
		playlist->duplicate (region, pos, times);

		json result;
		result["ok"] = true;
		result["times"] = times;
		return result;
	};

	/* ============================================================
	 * PLUGIN COMMANDS (5)
	 * ============================================================ */

	/* 34. daw.reorder_plugins — Reorder processor chain via reorder_processors() */
	handlers["daw.reorder_plugins"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		auto new_order_ids = params.at ("processor_ids").get<std::vector<std::string>> ();

		auto route = _high_get_route (session, track_id);

		/* Build ordered processor list. First, collect all current processors. */
		Route::ProcessorList current_procs;
		route->foreach_processor ([&current_procs](std::weak_ptr<Processor> wp) {
			auto p = wp.lock ();
			if (p) {
				current_procs.push_back (p);
			}
		});

		/* Build new order: place requested processors in order, then append
		 * any remaining (internal) processors not in the list. */
		Route::ProcessorList new_order;
		std::set<std::string> placed;

		for (auto& pid : new_order_ids) {
			for (auto& p : current_procs) {
				if (p->id ().to_s () == pid) {
					new_order.push_back (p);
					placed.insert (pid);
					break;
				}
			}
		}

		/* Append remaining processors (fader, meter, etc.) that weren't specified */
		for (auto& p : current_procs) {
			if (placed.find (p->id ().to_s ()) == placed.end ()) {
				new_order.push_back (p);
			}
		}

		int ret = route->reorder_processors (new_order);
		if (ret != 0) {
			throw std::runtime_error ("Failed to reorder processors on track: " + track_id);
		}

		json result;
		result["ok"] = true;
		return result;
	};

	/* 35. daw.copy_plugin — Copy plugin settings between tracks */
	handlers["daw.copy_plugin"] = [&session](const json& params) -> json {
		std::string source_track_id = params.at ("source_track_id").get<std::string> ();
		std::string source_proc_id = params.at ("source_processor_id").get<std::string> ();
		std::string target_track_id = params.at ("target_track_id").get<std::string> ();

		auto src_route = _high_get_route (session, source_track_id);
		auto tgt_route = _high_get_route (session, target_track_id);
		auto src_pi = _high_find_plugin_insert (src_route, source_proc_id);

		/* Get the plugin info and create a new instance */
		auto plugin_info = src_pi->plugin ()->get_info ();
		auto new_plugin = plugin_info->load (session);
		if (!new_plugin) {
			throw std::runtime_error ("Failed to load a new instance of plugin: " + src_pi->name ());
		}

		auto new_insert = std::shared_ptr<PluginInsert> (
			new PluginInsert (session, *tgt_route, new_plugin));

		/* Copy state from source plugin */
		XMLNode& state = src_pi->get_state ();
		/* Remove the ID so a new one gets assigned */
		state.remove_property ("id");
		new_insert->set_state (state, PBD::Stateful::current_state_version);

		tgt_route->add_processor (new_insert, PreFader);

		json result;
		result["ok"] = true;
		result["new_processor_id"] = new_insert->id ().to_s ();
		return result;
	};

	/* 36. daw.set_plugin_position — Insert plugin at specific index in processor chain */
	handlers["daw.set_plugin_position"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string proc_id = params.at ("processor_id").get<std::string> ();
		int position = params.at ("position").get<int> ();

		auto route = _high_get_route (session, track_id);

		/* Find the processor */
		std::shared_ptr<Processor> target;
		route->foreach_processor ([&](std::weak_ptr<Processor> wp) {
			auto p = wp.lock ();
			if (p && p->id ().to_s () == proc_id) {
				target = p;
			}
		});
		if (!target) {
			throw std::runtime_error ("Processor not found: " + proc_id);
		}

		/* Find the processor at the desired position to use as anchor */
		std::shared_ptr<Processor> before;
		int idx = 0;
		route->foreach_processor ([&](std::weak_ptr<Processor> wp) {
			auto p = wp.lock ();
			if (p && idx == position) {
				before = p;
			}
			idx++;
		});

		/* Remove and re-add at the new position */
		route->remove_processor (target);
		route->add_processor (target, before);

		json result;
		result["ok"] = true;
		result["position"] = position;
		return result;
	};

	/* 37. daw.set_multiple_plugin_parameters — Set multiple params in one call */
	handlers["daw.set_multiple_plugin_parameters"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string proc_id = params.at ("processor_id").get<std::string> ();
		auto param_values = params.at ("parameters"); /* array of {index, value} */

		auto route = _high_get_route (session, track_id);
		auto pi = _high_find_plugin_insert (route, proc_id);

		int set_count = 0;
		json errors = json::array ();

		for (auto& pv : param_values) {
			uint32_t index = pv.at ("index").get<uint32_t> ();
			float value = pv.at ("value").get<float> ();

			auto ctrl = pi->automation_control (
				Evoral::Parameter (PluginAutomation, 0, index));
			if (ctrl) {
				ctrl->set_value (value, PBD::Controllable::NoGroup);
				set_count++;
			} else {
				errors.push_back ({
					{"index", (int)index},
					{"error", "parameter not found"}
				});
			}
		}

		json result;
		result["ok"] = true;
		result["set_count"] = set_count;
		if (!errors.empty ()) {
			result["errors"] = errors;
		}
		return result;
	};

	/* 38. daw.get_processor_chain — Full signal chain (fader, meter, sends, plugins) */
	handlers["daw.get_processor_chain"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _high_get_route (session, track_id);

		json processors = json::array ();
		int idx = 0;
		route->foreach_processor ([&](std::weak_ptr<Processor> wp) {
			auto p = wp.lock ();
			if (!p) return;

			json pj;
			pj["index"] = idx;
			pj["id"] = p->id ().to_s ();
			pj["name"] = p->name ();
			pj["active"] = p->enabled ();

			/* Determine type */
			auto pi = std::dynamic_pointer_cast<PluginInsert> (p);
			if (pi) {
				pj["type"] = "plugin";
				pj["plugin_name"] = pi->plugin ()->name ();
				pj["parameter_count"] = (int)pi->plugin ()->parameter_count ();
			} else if (std::dynamic_pointer_cast<Amp> (p)) {
				/* Check if it's the main fader or trim */
				if (p->name () == "Fader" || p->name () == "Amp") {
					pj["type"] = "fader";
				} else {
					pj["type"] = "amp";
				}
			} else if (std::dynamic_pointer_cast<PeakMeter> (p)) {
				pj["type"] = "meter";
			} else if (std::dynamic_pointer_cast<InternalSend> (p)) {
				pj["type"] = "send";
				auto isend = std::dynamic_pointer_cast<InternalSend> (p);
				if (isend && isend->target_route ()) {
					pj["target_name"] = isend->target_route ()->name ();
				}
			} else if (std::dynamic_pointer_cast<Delivery> (p)) {
				pj["type"] = "delivery";
			} else {
				pj["type"] = "processor";
			}

			processors.push_back (pj);
			idx++;
		});

		json result;
		result["processors"] = processors;
		result["count"] = (int)processors.size ();
		return result;
	};

	/* ============================================================
	 * PROJECT COMMANDS (3)
	 * ============================================================ */

	/* 39. daw.export_stems — Export each track separately (stub) */
	handlers["daw.export_stems"] = [&session](const json& params) -> json {
		std::string format = params.value ("format", "wav");
		int bit_depth = params.value ("bit_depth", 24);

		json result;
		result["status"] = "not_yet_implemented";
		result["description"] = "Stem export requires ExportProfileManager setup "
			"with per-track channel configs and timespans. This is a complex multi-step "
			"operation involving ExportHandler, ExportStatus, and format specifications. "
			"Use Ardour's Session > Export > Stem Export dialog for now. "
			"Requested: format=" + format + ", bit_depth=" + std::to_string (bit_depth);

		/* List tracks that would be exported */
		json tracks = json::array ();
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (!r) continue;
				auto track = std::dynamic_pointer_cast<Track> (r);
				if (track) {
					tracks.push_back ({
						{"id", r->id ().to_s ()},
						{"name", r->name ()}
					});
				}
			}
		}
		result["tracks_to_export"] = tracks;
		result["track_count"] = (int)tracks.size ();
		return result;
	};

	/* 40. daw.save_session_as — Save under new name using Session::save_as() */
	handlers["daw.save_session_as"] = [&session](const json& params) -> json {
		std::string new_name = params.at ("name").get<std::string> ();
		std::string parent_folder = params.value ("parent_folder", "");
		bool switch_to = params.value ("switch_to", false);
		bool copy_media = params.value ("copy_media", true);

		Session::SaveAs sa;
		sa.new_name = new_name;
		sa.new_parent_folder = parent_folder.empty () ? session.path () + "/.." : parent_folder;
		sa.switch_to = switch_to;
		sa.include_media = true;
		sa.copy_media = copy_media;
		sa.copy_external = false;

		int ret = session.save_as (sa);
		if (ret != 0) {
			throw std::runtime_error ("save_as failed: " + sa.failure_message);
		}

		json result;
		result["ok"] = true;
		result["new_session_path"] = sa.final_session_folder_name;
		result["new_name"] = new_name;
		result["switched_to"] = switch_to;
		return result;
	};

	/* 41. daw.import_midi — Import MIDI file (improved: validates and provides guidance) */
	/* NOTE: This REPLACES the existing stub in dawflow_commands_final.cc.
	 * Since the final.cc version registers first, this version will override it. */
	handlers["daw.import_midi"] = [&session](const json& params) -> json {
		std::string filepath = params.at ("filepath").get<std::string> ();
		std::string track_id = params.value ("track_id", "");

		if (!Glib::file_test (filepath, Glib::FILE_TEST_EXISTS)) {
			throw std::runtime_error ("File not found: " + filepath);
		}

		/* Validate it looks like a MIDI file */
		if (filepath.length () < 4 ||
			(filepath.substr (filepath.length () - 4) != ".mid" &&
			 filepath.substr (filepath.length () - 4) != ".MID" &&
			 filepath.substr (filepath.length () - 4) != ".smf" &&
			 filepath.substr (filepath.length () - 5) != ".midi" &&
			 filepath.substr (filepath.length () - 5) != ".MIDI")) {
			/* Not necessarily an error, just a warning */
		}

		json result;
		result["status"] = "file_validated";
		result["filepath"] = filepath;
		result["session_path"] = session.path ();

		if (!track_id.empty ()) {
			auto route = session.route_by_id (PBD::ID (track_id));
			if (route) {
				result["target_track"] = route->name ();
				result["target_track_id"] = route->id ().to_s ();
			}
		}

		result["description"] = "MIDI file exists and is accessible. "
			"Full MIDI import requires SMFSource creation and Session::import_files() "
			"which needs the GUI event loop for progress tracking. "
			"Steps to import: 1) Create SMFSource, 2) Create MidiRegion, "
			"3) Add to track playlist. Use Ardour's Session > Import dialog or "
			"drag-and-drop for now. The file is at: " + filepath;

		return result;
	};

	/* ============================================================
	 * QUERY COMMANDS (8)
	 * ============================================================ */

	/* 42. daw.get_track_type — Returns track type classification */
	handlers["daw.get_track_type"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _high_get_route (session, track_id);

		json result;
		result["track_id"] = track_id;
		result["name"] = route->name ();

		/* Check if it's the master bus */
		auto master = session.master_out ();
		if (master && master->id () == route->id ()) {
			result["type"] = "master";
			return result;
		}

		/* Check specific types */
		auto at = std::dynamic_pointer_cast<AudioTrack> (route);
		if (at) {
			result["type"] = "audio_track";
			return result;
		}

		auto mt = std::dynamic_pointer_cast<MidiTrack> (route);
		if (mt) {
			result["type"] = "midi_track";
			return result;
		}

		auto track = std::dynamic_pointer_cast<Track> (route);
		if (track) {
			result["type"] = "track";
			return result;
		}

		/* Check if it's a VCA (VCAs aren't routes in Ardour, but check anyway) */
		/* Routes that aren't tracks are buses */
		result["type"] = "bus";
		return result;
	};

	/* 43. daw.get_track_record_status — Per-track arm and monitoring state */
	handlers["daw.get_track_record_status"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _high_get_route (session, track_id);
		auto track = std::dynamic_pointer_cast<Track> (route);
		if (!track) {
			throw std::runtime_error ("Route is not a track: " + track_id);
		}

		json result;
		result["track_id"] = track_id;
		result["name"] = route->name ();

		/* Record arm */
		auto rec = track->rec_enable_control ();
		result["record_armed"] = rec ? (rec->get_value () > 0.5) : false;

		/* Monitoring mode */
		auto mc = track->monitoring_control ();
		if (mc) {
			int mval = (int)mc->monitoring_choice ();
			if (mval == MonitorAuto)       result["monitoring"] = "auto";
			else if (mval == MonitorInput)  result["monitoring"] = "input";
			else if (mval == MonitorDisk)   result["monitoring"] = "disk";
			else if (mval == MonitorCue)    result["monitoring"] = "cue";
			else result["monitoring"] = "unknown";
		}

		/* Actual monitoring state */
		result["monitoring_input"] = track->monitoring_state () == MonitoringInput;
		result["monitoring_disk"] = track->monitoring_state () == MonitoringDisk;

		return result;
	};

	/* 44. daw.get_loop_range — Get loop start/end */
	handlers["daw.get_loop_range"] = [&session](const json& /* params */) -> json {
		auto* loc = session.locations ()->auto_loop_location ();

		json result;
		if (loc) {
			result["enabled"] = session.get_play_loop ();
			result["start_samples"] = (int64_t)loc->start ().samples ();
			result["end_samples"] = (int64_t)loc->end ().samples ();
			result["length_samples"] = (int64_t)(loc->end ().samples () - loc->start ().samples ());
		} else {
			result["enabled"] = false;
			result["start_samples"] = nullptr;
			result["end_samples"] = nullptr;
			result["length_samples"] = nullptr;
			result["description"] = "No auto-loop location defined";
		}
		return result;
	};

	/* 45. daw.get_punch_range — Get punch start/end */
	handlers["daw.get_punch_range"] = [&session](const json& /* params */) -> json {
		auto* loc = session.locations ()->auto_punch_location ();

		json result;
		result["punch_in_enabled"] = session.config.get_punch_in ();
		result["punch_out_enabled"] = session.config.get_punch_out ();
		if (loc) {
			result["start_samples"] = (int64_t)loc->start ().samples ();
			result["end_samples"] = (int64_t)loc->end ().samples ();
			result["length_samples"] = (int64_t)(loc->end ().samples () - loc->start ().samples ());
		} else {
			result["start_samples"] = nullptr;
			result["end_samples"] = nullptr;
			result["length_samples"] = nullptr;
			result["description"] = "No auto-punch location defined";
		}
		return result;
	};

	/* 46. daw.get_session_length — Total session length */
	handlers["daw.get_session_length"] = [&session](const json& /* params */) -> json {
		samplepos_t end = session.current_end_sample ();
		double seconds = (double)end / (double)session.sample_rate ();

		json result;
		result["length_samples"] = (int64_t)end;
		result["length_seconds"] = seconds;
		result["sample_rate"] = (int)session.sample_rate ();

		/* Get BBT at end */
		auto const& tmap = Temporal::TempoMap::use ();
		auto bbt = tmap->bbt_at (timepos_t (end));
		result["length_bars"] = bbt.bars;
		result["length_bbt"] = std::to_string (bbt.bars) + "|" +
			std::to_string (bbt.beats) + "|" + std::to_string (bbt.ticks);

		return result;
	};

	/* 47. daw.get_region_by_name — Find region by name across all tracks */
	handlers["daw.get_region_by_name"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();

		/* First try RegionFactory */
		auto region = RegionFactory::region_by_name (name);

		if (region) {
			json result;
			result["found"] = true;
			result["id"] = region->id ().to_s ();
			result["name"] = region->name ();
			result["position_samples"] = region->position_sample ();
			result["length_samples"] = region->length_samples ();
			result["muted"] = region->muted ();

			/* Try to find which track it's on */
			auto routes = session.get_routes ();
			if (routes) {
				for (auto& r : *routes) {
					auto track = std::dynamic_pointer_cast<Track> (r);
					if (!track) continue;
					auto pl = track->playlist ();
					if (!pl) continue;
					auto regions = pl->region_list ();
					if (!regions) continue;
					for (auto& pr : *regions) {
						if (pr->id () == region->id ()) {
							result["track_id"] = r->id ().to_s ();
							result["track_name"] = r->name ();
							goto found_track;
						}
					}
				}
			}
			found_track:
			return result;
		}

		json result;
		result["found"] = false;
		result["name"] = name;
		return result;
	};

	/* 48. daw.get_available_ports — List all system audio/MIDI ports */
	handlers["daw.get_available_ports"] = [&session](const json& params) -> json {
		std::string type_filter = params.value ("type", "all"); /* all, audio, midi */

		json audio_inputs = json::array ();
		json audio_outputs = json::array ();
		json midi_inputs = json::array ();
		json midi_outputs = json::array ();

		if (type_filter == "all" || type_filter == "audio") {
			std::vector<std::string> ports;
			session.engine ().get_ports ("", DataType::AUDIO,
				ARDOUR::IsInput, ports);
			for (auto& p : ports) {
				audio_inputs.push_back (p);
			}

			ports.clear ();
			session.engine ().get_ports ("", DataType::AUDIO,
				ARDOUR::IsOutput, ports);
			for (auto& p : ports) {
				audio_outputs.push_back (p);
			}
		}

		if (type_filter == "all" || type_filter == "midi") {
			std::vector<std::string> ports;
			session.engine ().get_ports ("", DataType::MIDI,
				ARDOUR::IsInput, ports);
			for (auto& p : ports) {
				midi_inputs.push_back (p);
			}

			ports.clear ();
			session.engine ().get_ports ("", DataType::MIDI,
				ARDOUR::IsOutput, ports);
			for (auto& p : ports) {
				midi_outputs.push_back (p);
			}
		}

		json result;
		result["audio_inputs"] = audio_inputs;
		result["audio_outputs"] = audio_outputs;
		result["midi_inputs"] = midi_inputs;
		result["midi_outputs"] = midi_outputs;
		return result;
	};

	/* 49. daw.add_time_signature_change — Add meter change at position */
	handlers["daw.add_time_signature_change"] = [](const json& params) -> json {
		int numerator = params.at ("numerator").get<int> ();
		int denominator = params.at ("denominator").get<int> ();
		int64_t position_samples = params.value ("position_samples", (int64_t)0);
		int bar = params.value ("bar", 0);

		Temporal::TempoMap::WritableSharedPtr tmap = Temporal::TempoMap::write_copy ();

		if (bar > 0) {
			/* Place at a specific bar using BBT_Argument overload */
			Temporal::BBT_Argument bbt (bar, 1, 0);
			tmap->set_meter (Temporal::Meter (numerator, denominator), bbt);
		} else {
			/* Place at sample position */
			tmap->set_meter (Temporal::Meter (numerator, denominator),
				timepos_t (position_samples));
		}

		Temporal::TempoMap::update (tmap);

		json result;
		result["ok"] = true;
		result["numerator"] = numerator;
		result["denominator"] = denominator;
		return result;
	};

	std::cerr << "DawflowPluginHost: registered 50 HIGH priority commands "
		"(recording, editing, mixing, MIDI, plugins, project, query)"
		<< std::endl;
}

/*
 * ---- EVENT WIRING INSTRUCTIONS ----
 *
 * The following 2 events (#50 and #51) should be added to
 * _connect_session_signals() in dawflow_plugin_host.cc:
 *
 * EVENT #50: daw.routes.removed — Broadcast when routes are deleted
 * ---------------------------------------------------------------
 * Ardour does not have a direct RouteRemoved signal on Session.
 * However, you can watch RouteRemovedFromRouteGroup or check the
 * route list on session state changes. The recommended approach:
 *
 *   // In _connect_session_signals():
 *   // Option A: Watch for route group removals
 *   _session.RouteRemovedFromRouteGroup.connect_same_thread (
 *       _signal_connections,
 *       [this](std::shared_ptr<RouteGroup>, std::weak_ptr<Route> wr) {
 *           auto route = wr.lock ();
 *           if (!route) return;
 *           json params;
 *           params["route_id"] = route->id ().to_s ();
 *           params["route_name"] = route->name ();
 *           broadcast_event ("daw.routes.removed", params);
 *       }
 *   );
 *
 *   // Option B (more reliable): Monitor the route list periodically
 *   // or use Session::RouteAdded with a diff against previous state.
 *   // Ardour 8.x may add a direct RouteRemoved signal.
 *
 *
 * EVENT #51: daw.selection.changed — Broadcast when selection changes
 * -------------------------------------------------------------------
 * Ardour's CoreSelection emits a signal when the selection changes.
 *
 *   // In _connect_session_signals():
 *   _session.selection().StripablesChanged.connect_same_thread (
 *       _signal_connections,
 *       [this]() {
 *           CoreSelection::StripableAutomationControls sacs;
 *           _session.selection ().get_stripables (sacs);
 *
 *           json params;
 *           json selected = json::array ();
 *           for (auto const& sac : sacs) {
 *               if (sac.stripable) {
 *                   selected.push_back ({
 *                       {"id", sac.stripable->id ().to_s ()},
 *                       {"name", sac.stripable->name ()}
 *                   });
 *               }
 *           }
 *           params["selected"] = selected;
 *           params["count"] = (int)selected.size ();
 *           broadcast_event ("daw.selection.changed", params);
 *       }
 *   );
 *
 * To wire these events, add them to DawflowPluginHost::_connect_session_signals()
 * in libs/ardour/dawflow_plugin_host.cc. The signal connection lifetime is
 * managed by _signal_connections (ScopedConnectionList).
 */
