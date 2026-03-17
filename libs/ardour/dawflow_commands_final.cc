/*
 * DawflowCommandsFinal - Final batch of API commands for the DAWFLOW Plugin Host
 *
 * Implements 30 IPC commands for import/export, plugin presets, plugin search,
 * track properties, VCA, snapshots, time conversion, and audio analysis.
 *
 * Part of the DAWFLOW plugin system.
 */

#include "ardour/dawflow_commands_final.h"

#include "ardour/session.h"
#include "ardour/route.h"
#include "ardour/track.h"
#include "ardour/audio_track.h"
#include "ardour/midi_track.h"
#include "ardour/playlist.h"
#include "ardour/audioplaylist.h"
#include "ardour/region.h"
#include "ardour/audioregion.h"
#include "ardour/midi_region.h"
#include "ardour/plugin.h"
#include "ardour/plugin_insert.h"
#include "ardour/plugin_manager.h"
#include "ardour/processor.h"
#include "ardour/vca.h"
#include "ardour/vca_manager.h"
#include "ardour/source_factory.h"
#include "ardour/presentation_info.h"
#include "ardour/monitor_control.h"
#include "ardour/phase_control.h"
#include "ardour/dB.h"
#include "ardour/source.h"
#include "ardour/types.h"
#include "ardour/interthread_info.h"

#include "temporal/tempo.h"
#include "temporal/beats.h"
#include "temporal/bbt_time.h"
#include "pbd/id.h"

#include <glibmm/fileutils.h>

#include <algorithm>
#include <iostream>
#include <string>

using namespace ARDOUR;
using namespace DawflowIPC;

/* ---- Helpers ---- */

static double
_final_beats_to_double (Temporal::Beats const & b)
{
	return (double)b.get_beats () + (double)b.get_ticks () / (double)Temporal::Beats::PPQN;
}

static std::shared_ptr<Route>
_final_get_route (Session& session, const std::string& track_id)
{
	auto route = session.route_by_id (PBD::ID (track_id));
	if (!route) {
		throw std::runtime_error ("Track not found: " + track_id);
	}
	return route;
}

static std::shared_ptr<PluginInsert>
_find_plugin_insert (std::shared_ptr<Route> route, const std::string& proc_id)
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
ARDOUR::dawflow_register_final_commands (
	Session& session,
	std::unordered_map<std::string, std::function<json(const json&)>>& handlers)
{
	/* ============================================================
	 * IMPORT COMMANDS (3)
	 * ============================================================ */

	/* 1. daw.import_audio — Import audio file (stub: file validation + instructions) */
	handlers["daw.import_audio"] = [&session](const json& params) -> json {
		std::string filepath = params.at ("filepath").get<std::string> ();
		std::string track_id = params.value ("track_id", "");

		/* Check if file exists on disk */
		if (!Glib::file_test (filepath, Glib::FILE_TEST_EXISTS)) {
			throw std::runtime_error ("File not found: " + filepath);
		}

		/* Full import requires GUI thread involvement for source creation
		 * and region placement. Return file info for now. */
		json result;
		result["status"]      = "file_validated";
		result["filepath"]    = filepath;
		result["description"] = "Audio file exists and is accessible. "
			"Full import to track requires SourceFactory::createReadable() "
			"which needs the session's GUI thread. Use Ardour's import dialog for now.";
		if (!track_id.empty ()) {
			auto route = session.route_by_id (PBD::ID (track_id));
			if (route) {
				result["target_track"] = route->name ();
			}
		}
		return result;
	};

	/* 2. daw.import_midi — Import MIDI file (stub) */
	handlers["daw.import_midi"] = [](const json& params) -> json {
		std::string filepath = params.at ("filepath").get<std::string> ();

		if (!Glib::file_test (filepath, Glib::FILE_TEST_EXISTS)) {
			throw std::runtime_error ("File not found: " + filepath);
		}

		json result;
		result["status"]      = "file_validated";
		result["filepath"]    = filepath;
		result["description"] = "MIDI file exists and is accessible. "
			"Full MIDI import requires SMFSource creation and GUI thread. "
			"Use Ardour's import dialog for now.";
		return result;
	};

	/* 3. daw.get_source_files — Get audio/MIDI source files in session pool */
	handlers["daw.get_source_files"] = [&session](const json& /* params */) -> json {
		json sources = json::array ();
		/* Iterate the session's source list */
		session.foreach_source ([&sources](std::shared_ptr<Source> src) {
			json s;
			s["id"]       = src->id ().to_s ();
			s["name"]     = src->name ();
			s["length"]   = (int64_t)src->length ().samples ();
			s["writable"] = src->writable ();
			sources.push_back (s);
		});

		json result;
		result["sources"] = sources;
		result["count"]   = (int)sources.size ();
		return result;
	};

	/* ============================================================
	 * EXPORT COMMANDS (2)
	 * ============================================================ */

	/* 4. daw.export_session_info — Get session export info (formats available) */
	handlers["daw.get_export_formats"] = [](const json& /* params */) -> json {
		json formats = json::array ();
		formats.push_back ({{"name", "WAV 16-bit"}, {"extension", "wav"}, {"bit_depth", 16}});
		formats.push_back ({{"name", "WAV 24-bit"}, {"extension", "wav"}, {"bit_depth", 24}});
		formats.push_back ({{"name", "WAV 32-bit float"}, {"extension", "wav"}, {"bit_depth", 32}});
		formats.push_back ({{"name", "FLAC"}, {"extension", "flac"}, {"bit_depth", 24}});
		formats.push_back ({{"name", "OGG Vorbis"}, {"extension", "ogg"}, {"bit_depth", 0}});
		formats.push_back ({{"name", "MP3"}, {"extension", "mp3"}, {"bit_depth", 0}});

		json result;
		result["formats"] = formats;
		result["description"] = "Available export formats. Use Ardour's Export dialog "
			"to actually perform an export. Full ExportProfileManager integration coming soon.";
		return result;
	};

	/* 5. daw.get_session_path — Get session directory and file paths */
	handlers["daw.get_session_path"] = [&session](const json& /* params */) -> json {
		json result;
		result["session_path"]  = session.path ();
		result["session_name"]  = session.name ();
		result["snap_name"]     = session.snap_name ();
		result["sample_rate"]   = (int)session.sample_rate ();
		return result;
	};

	/* ============================================================
	 * PLUGIN PRESETS (3)
	 * ============================================================ */

	/* 6. daw.get_plugin_presets — Get available presets for a plugin */
	handlers["daw.get_plugin_presets"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string proc_id  = params.at ("processor_id").get<std::string> ();

		auto route = _final_get_route (session, track_id);
		auto pi = _find_plugin_insert (route, proc_id);
		auto plugin = pi->plugin ();

		json presets = json::array ();
		auto preset_list = plugin->get_presets ();
		for (auto& preset : preset_list) {
			presets.push_back ({
				{"uri", preset.uri},
				{"label", preset.label},
				{"user", preset.user}
			});
		}

		json result;
		result["presets"] = presets;
		result["count"]   = (int)presets.size ();
		return result;
	};

	/* 7. daw.load_plugin_preset — Load a preset onto a plugin */
	handlers["daw.load_plugin_preset"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string proc_id    = params.at ("processor_id").get<std::string> ();
		std::string preset_uri = params.value ("preset_uri", "");
		std::string preset_name = params.value ("preset_name", "");

		if (preset_uri.empty () && preset_name.empty ()) {
			throw std::runtime_error ("Must specify preset_uri or preset_name");
		}

		auto route = _final_get_route (session, track_id);
		auto pi = _find_plugin_insert (route, proc_id);
		auto plugin = pi->plugin ();

		auto preset_list = plugin->get_presets ();
		for (auto& preset : preset_list) {
			if ((!preset_uri.empty () && preset.uri == preset_uri) ||
			    (!preset_name.empty () && preset.label == preset_name)) {
				plugin->load_preset (preset);
				json result;
				result["ok"]     = true;
				result["loaded"] = preset.label;
				result["uri"]    = preset.uri;
				return result;
			}
		}

		throw std::runtime_error ("Preset not found");
	};

	/* 8. daw.save_plugin_preset — Save current plugin state as a user preset */
	handlers["daw.save_plugin_preset"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string proc_id  = params.at ("processor_id").get<std::string> ();
		std::string name     = params.at ("name").get<std::string> ();

		auto route = _final_get_route (session, track_id);
		auto pi = _find_plugin_insert (route, proc_id);
		auto plugin = pi->plugin ();

		auto preset = plugin->save_preset (name);

		json result;
		result["ok"]         = true;
		result["preset_uri"] = preset.uri;
		result["label"]      = preset.label;
		return result;
	};

	/* ============================================================
	 * PLUGIN SEARCH (2)
	 * ============================================================ */

	/* 9. daw.search_plugins — Search plugins by name */
	handlers["daw.search_plugins"] = [](const json& params) -> json {
		std::string query = params.at ("query").get<std::string> ();
		std::string query_lower = query;
		std::transform (query_lower.begin (), query_lower.end (), query_lower.begin (), ::tolower);

		auto& pm = PluginManager::instance ();
		json results = json::array ();

		auto search = [&](const PluginInfoList& list, const std::string& type) {
			for (auto& pi : list) {
				std::string name_lower = pi->name;
				std::transform (name_lower.begin (), name_lower.end (), name_lower.begin (), ::tolower);
				if (name_lower.find (query_lower) != std::string::npos) {
					results.push_back ({
						{"name", pi->name},
						{"type", type},
						{"category", pi->category},
						{"creator", pi->creator},
						{"unique_id", pi->unique_id}
					});
				}
			}
		};

		search (pm.lv2_plugin_info (), "LV2");
		search (pm.au_plugin_info (), "AU");
		search (pm.vst3_plugin_info (), "VST3");
		search (pm.mac_vst_plugin_info (), "VST");
		search (pm.ladspa_plugin_info (), "LADSPA");
		search (pm.lua_plugin_info (), "Lua");

		json result;
		result["results"] = results;
		result["count"]   = (int)results.size ();
		return result;
	};

	/* 10. daw.search_plugins_by_category — Search plugins by category */
	handlers["daw.search_plugins_by_category"] = [](const json& params) -> json {
		std::string category = params.at ("category").get<std::string> ();
		std::string cat_lower = category;
		std::transform (cat_lower.begin (), cat_lower.end (), cat_lower.begin (), ::tolower);

		auto& pm = PluginManager::instance ();
		json results = json::array ();

		auto search = [&](const PluginInfoList& list, const std::string& type) {
			for (auto& pi : list) {
				std::string c = pi->category;
				std::transform (c.begin (), c.end (), c.begin (), ::tolower);
				if (c.find (cat_lower) != std::string::npos) {
					results.push_back ({
						{"name", pi->name},
						{"type", type},
						{"category", pi->category},
						{"creator", pi->creator},
						{"unique_id", pi->unique_id}
					});
				}
			}
		};

		search (pm.lv2_plugin_info (), "LV2");
		search (pm.au_plugin_info (), "AU");
		search (pm.vst3_plugin_info (), "VST3");
		search (pm.mac_vst_plugin_info (), "VST");
		search (pm.ladspa_plugin_info (), "LADSPA");
		search (pm.lua_plugin_info (), "Lua");

		json result;
		result["results"] = results;
		result["count"]   = (int)results.size ();
		return result;
	};

	/* ============================================================
	 * TRACK PROPERTIES (9)
	 * ============================================================ */

	/* 11. daw.set_track_hidden — Hide or show a track in the UI */
	handlers["daw.set_track_hidden"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		bool hidden          = params.at ("hidden").get<bool> ();

		auto route = _final_get_route (session, track_id);
		route->presentation_info ().set_hidden (hidden);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 12. daw.get_track_names — Get all track IDs and names (lightweight) */
	handlers["daw.get_track_names"] = [&session](const json& /* params */) -> json {
		json tracks = json::array ();
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (!r) continue;
				tracks.push_back ({
					{"id", r->id ().to_s ()},
					{"name", r->name ()},
					{"is_track", (bool)std::dynamic_pointer_cast<Track> (r)},
					{"active", r->active ()},
					{"hidden", r->presentation_info ().hidden ()}
				});
			}
		}

		json result;
		result["tracks"] = tracks;
		result["count"]  = (int)tracks.size ();
		return result;
	};

	/* 13. daw.get_track_count — Get count of tracks, audio tracks, buses */
	handlers["daw.get_track_count"] = [&session](const json& /* params */) -> json {
		json result;
		result["total"]        = (int)session.nroutes ();
		result["audio_tracks"] = (int)session.naudiotracks ();
		result["buses"]        = (int)session.nbusses ();
		return result;
	};

	/* 14. daw.solo_exclusive — Solo one track, unsolo all others */
	handlers["daw.solo_exclusive"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto target = _final_get_route (session, track_id);

		/* Unsolo everything first */
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (r && r->solo_control ()) {
					r->solo_control ()->set_value (0.0, PBD::Controllable::NoGroup);
				}
			}
		}

		/* Solo the target */
		if (target->solo_control ()) {
			target->solo_control ()->set_value (1.0, PBD::Controllable::NoGroup);
		}

		json result;
		result["ok"] = true;
		return result;
	};

	/* 15. daw.mute_all — Mute or unmute all tracks */
	handlers["daw.mute_all"] = [&session](const json& params) -> json {
		bool mute = params.value ("mute", true);

		int count = 0;
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (r && r->mute_control ()) {
					r->mute_control ()->set_value (mute ? 1.0 : 0.0, PBD::Controllable::NoGroup);
					count++;
				}
			}
		}

		json result;
		result["ok"]    = true;
		result["count"] = count;
		return result;
	};

	/* 16. daw.unsolo_all — Unsolo all tracks */
	handlers["daw.unsolo_all"] = [&session](const json& /* params */) -> json {
		int count = 0;
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (r && r->solo_control ()) {
					r->solo_control ()->set_value (0.0, PBD::Controllable::NoGroup);
					count++;
				}
			}
		}

		json result;
		result["ok"]    = true;
		result["count"] = count;
		return result;
	};

	/* 17. daw.unmute_all — Unmute all tracks */
	handlers["daw.unmute_all"] = [&session](const json& /* params */) -> json {
		int count = 0;
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (r && r->mute_control ()) {
					r->mute_control ()->set_value (0.0, PBD::Controllable::NoGroup);
					count++;
				}
			}
		}

		json result;
		result["ok"]    = true;
		result["count"] = count;
		return result;
	};

	/* 18. daw.get_track_details — Get comprehensive info for a single track */
	handlers["daw.get_track_details"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _final_get_route (session, track_id);
		auto track = std::dynamic_pointer_cast<Track> (route);

		json result;
		result["id"]       = route->id ().to_s ();
		result["name"]     = route->name ();
		result["active"]   = route->active ();
		result["hidden"]   = route->presentation_info ().hidden ();
		result["is_track"] = (bool)track;
		result["muted"]    = route->mute_control () ? (route->mute_control ()->get_value () > 0.5) : false;
		result["soloed"]   = route->solo_control () ? (route->solo_control ()->get_value () > 0.5) : false;

		/* Gain info */
		if (route->gain_control ()) {
			double gain = route->gain_control ()->get_value ();
			result["gain"]    = gain;
			result["gain_db"] = (gain > 0.0) ? accurate_coefficient_to_dB (gain) : -INFINITY;
		}

		/* Trim info */
		if (route->trim_control ()) {
			double trim = route->trim_control ()->get_value ();
			result["trim"]    = trim;
			result["trim_db"] = (trim > 0.0) ? accurate_coefficient_to_dB (trim) : -INFINITY;
		}

		/* Track-specific info */
		if (track) {
			result["rec_enabled"] = track->rec_enable_control () ?
				(track->rec_enable_control ()->get_value () > 0.5) : false;

			auto mc = track->monitoring_control ();
			if (mc) {
				int mval = (int)mc->monitoring_choice ();
				if (mval == MonitorAuto)       result["monitoring"] = "auto";
				else if (mval == MonitorInput)  result["monitoring"] = "input";
				else if (mval == MonitorDisk)   result["monitoring"] = "disk";
				else if (mval == MonitorCue)    result["monitoring"] = "cue";
				else result["monitoring"] = "unknown";
			}

			auto playlist = track->playlist ();
			if (playlist) {
				result["playlist_name"]   = playlist->name ();
				result["region_count"]    = (int)playlist->n_regions ();
			}

			/* Audio track specifics */
			auto at = std::dynamic_pointer_cast<AudioTrack> (route);
			if (at) {
				result["type"] = "audio";
			}

			/* MIDI track specifics */
			auto mt = std::dynamic_pointer_cast<MidiTrack> (route);
			if (mt) {
				result["type"] = "midi";
			}
		} else {
			result["type"] = "bus";
		}

		/* Processor (plugin) chain */
		json processors = json::array ();
		route->foreach_processor ([&processors](std::weak_ptr<Processor> wp) {
			auto p = wp.lock ();
			if (p) {
				json pj;
				pj["id"]     = p->id ().to_s ();
				pj["name"]   = p->name ();
				pj["active"] = p->enabled ();
				auto pi = std::dynamic_pointer_cast<PluginInsert> (p);
				if (pi) {
					pj["is_plugin"] = true;
					pj["plugin_name"] = pi->plugin ()->name ();
				} else {
					pj["is_plugin"] = false;
				}
				processors.push_back (pj);
			}
		});
		result["processors"] = processors;

		return result;
	};

	/* 19. daw.set_track_color — Set track color (presentation info) */
	handlers["daw.set_track_color"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		uint32_t color       = params.at ("color").get<uint32_t> ();

		auto route = _final_get_route (session, track_id);
		route->presentation_info ().set_color (color);

		json result;
		result["ok"] = true;
		return result;
	};

	/* ============================================================
	 * VCA COMMANDS (2)
	 * ============================================================ */

	/* 20. daw.create_vca — Create one or more VCA masters */
	handlers["daw.create_vca"] = [&session](const json& params) -> json {
		std::string name  = params.value ("name", "VCA");
		uint32_t count    = params.value ("count", 1);

		auto vcas = session.vca_manager ().create_vca (count, name);

		json vca_list = json::array ();
		for (auto& v : vcas) {
			vca_list.push_back ({
				{"id", v->id ().to_s ()},
				{"name", v->name ()},
				{"number", v->number ()}
			});
		}

		json result;
		result["vcas"]  = vca_list;
		result["count"] = (int)vca_list.size ();
		return result;
	};

	/* 21. daw.get_vcas — List all VCA masters */
	handlers["daw.get_vcas"] = [&session](const json& /* params */) -> json {
		json vca_list = json::array ();
		for (auto& v : session.vca_manager ().vcas ()) {
			vca_list.push_back ({
				{"id", v->id ().to_s ()},
				{"name", v->name ()},
				{"number", v->number ()}
			});
		}

		json result;
		result["vcas"]  = vca_list;
		result["count"] = (int)vca_list.size ();
		return result;
	};

	/* ============================================================
	 * SNAPSHOT COMMANDS (2)
	 * ============================================================ */

	/* 22. daw.save_snapshot — Save session state as a named snapshot */
	handlers["daw.save_snapshot"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();

		int ret = session.save_state (name);
		if (ret != 0) {
			throw std::runtime_error ("Failed to save snapshot: " + name);
		}

		json result;
		result["ok"]       = true;
		result["snapshot"] = name;
		return result;
	};

	/* 23. daw.get_snapshots — Get current snapshot name and session info */
	handlers["daw.get_snapshots"] = [&session](const json& /* params */) -> json {
		json result;
		result["current_snapshot"] = session.snap_name ();
		result["session_name"]     = session.name ();
		result["session_path"]     = session.path ();
		result["description"]      = "To list all snapshots, enumerate .ardour files "
			"in the session directory. Current snapshot is returned.";
		return result;
	};

	/* ============================================================
	 * TIME CONVERSION COMMANDS (3)
	 * ============================================================ */

	/* 24. daw.samples_to_beats — Convert sample position to beats */
	handlers["daw.samples_to_beats"] = [](const json& params) -> json {
		int64_t samples = params.at ("samples").get<int64_t> ();

		auto const& tmap = Temporal::TempoMap::use ();
		auto beats = tmap->quarters_at_sample (samples);
		auto bbt = tmap->bbt_at (timepos_t (samples));

		json result;
		result["samples"] = samples;
		result["beats"]   = _final_beats_to_double (beats);
		result["bar"]     = bbt.bars;
		result["beat"]    = bbt.beats;
		result["tick"]    = bbt.ticks;
		result["bbt_string"] = std::to_string (bbt.bars) + "|" +
			std::to_string (bbt.beats) + "|" + std::to_string (bbt.ticks);
		return result;
	};

	/* 25. daw.beats_to_samples — Convert beat position to samples */
	handlers["daw.beats_to_samples"] = [](const json& params) -> json {
		double beat_val = params.at ("beats").get<double> ();

		auto const& tmap = Temporal::TempoMap::use ();
		Temporal::Beats beats = Temporal::Beats::from_double (beat_val);
		auto samples = tmap->sample_at (beats);

		json result;
		result["samples"] = (int64_t)samples;
		result["beats"]   = beat_val;
		return result;
	};

	/* 26. daw.get_position_info — Get current transport position in all formats */
	handlers["daw.get_position_info"] = [&session](const json& /* params */) -> json {
		samplepos_t pos = session.transport_sample ();

		auto const& tmap = Temporal::TempoMap::use ();
		auto beats = tmap->quarters_at_sample (pos);
		auto bbt = tmap->bbt_at (timepos_t (pos));
		auto tempo = tmap->tempo_at (timepos_t (pos));

		json result;
		result["samples"]     = (int64_t)pos;
		result["beats"]       = _final_beats_to_double (beats);
		result["bar"]         = bbt.bars;
		result["beat"]        = bbt.beats;
		result["tick"]        = bbt.ticks;
		result["bbt_string"]  = std::to_string (bbt.bars) + "|" +
			std::to_string (bbt.beats) + "|" + std::to_string (bbt.ticks);
		result["seconds"]     = (double)pos / (double)session.sample_rate ();
		result["tempo_bpm"]   = tempo.quarter_notes_per_minute ();
		result["sample_rate"] = (int)session.sample_rate ();
		return result;
	};

	/* ============================================================
	 * AUDIO ANALYSIS COMMANDS (2)
	 * ============================================================ */

	/* 27. daw.detect_silence — Detect silent sections in a track region */
	handlers["daw.detect_silence"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		double threshold_db    = params.value ("threshold_db", -60.0);
		int64_t min_length     = params.value ("min_length_samples", (int64_t)1000);

		auto route = _final_get_route (session, track_id);
		auto track = std::dynamic_pointer_cast<Track> (route);
		if (!track) {
			throw std::runtime_error ("Not a track: " + track_id);
		}

		auto playlist = track->playlist ();
		if (!playlist) {
			throw std::runtime_error ("Track has no playlist: " + track_id);
		}

		/* Find the region */
		std::shared_ptr<Region> region;
		auto regions = playlist->region_list ();
		if (regions) {
			for (auto& r : *regions) {
				if (r->id ().to_s () == region_id) {
					region = r;
					break;
				}
			}
		}
		if (!region) {
			throw std::runtime_error ("Region not found: " + region_id);
		}

		auto ar = std::dynamic_pointer_cast<AudioRegion> (region);
		if (!ar) {
			throw std::runtime_error ("Region is not an audio region: " + region_id);
		}

		Sample threshold = dB_to_coefficient (threshold_db);
		InterThreadInfo itt;

		auto silence_result = ar->find_silence (threshold, min_length,
			session.sample_rate () / 10, itt);

		json silent_ranges = json::array ();
		for (auto& interval : silence_result) {
			silent_ranges.push_back ({
				{"start_samples", interval.first},
				{"end_samples", interval.second}
			});
		}

		json result;
		result["silent_ranges"]  = silent_ranges;
		result["count"]          = (int)silent_ranges.size ();
		result["threshold_db"]   = threshold_db;
		result["min_length"]     = min_length;
		return result;
	};

	/* 28. daw.get_tempo_at — Get tempo at a specific position */
	handlers["daw.get_tempo_at"] = [&session](const json& params) -> json {
		int64_t pos = params.value ("position", (int64_t)session.transport_sample ());

		auto const& tmap = Temporal::TempoMap::use ();
		auto tempo = tmap->tempo_at (timepos_t (pos));
		auto bbt = tmap->bbt_at (timepos_t (pos));

		json result;
		result["bpm"]        = tempo.quarter_notes_per_minute ();
		result["position"]   = pos;
		result["bar"]        = bbt.bars;
		result["beat"]       = bbt.beats;
		result["bbt_string"] = std::to_string (bbt.bars) + "|" +
			std::to_string (bbt.beats) + "|" + std::to_string (bbt.ticks);
		return result;
	};

	/* ============================================================
	 * MIDI CC / CROSSFADE STUBS (2)
	 * ============================================================ */

	/* 29. daw.add_midi_cc — Add MIDI CC event to a region (stub) */
	handlers["daw.add_midi_cc"] = [](const json& /* params */) -> json {
		json result;
		result["status"]      = "not_yet_implemented";
		result["description"] = "MIDI CC editing requires AutomationList "
			"manipulation on MidiTrack automation parameters. Coming soon.";
		return result;
	};

	/* 30. daw.set_crossfade — Set crossfade between adjacent regions (stub) */
	handlers["daw.set_crossfade"] = [](const json& /* params */) -> json {
		json result;
		result["status"]      = "not_yet_implemented";
		result["description"] = "Crossfades in Ardour are handled by overlapping "
			"regions with fade_in and fade_out. Use daw.set_region_fade_in and "
			"daw.set_region_fade_out on overlapping regions to create crossfades.";
		return result;
	};

	std::cerr << "DawflowPluginHost: registered 30 final commands "
		"(import, export, presets, search, VCA, snapshots, time, analysis)"
		<< std::endl;
}

/*
 * ---- WIRE-UP INSTRUCTIONS ----
 *
 * To integrate these commands into the DawflowPluginHost, add the following
 * to dawflow_plugin_host.cc:
 *
 * 1. At the top, add the include:
 *
 *    #include "ardour/dawflow_commands_final.h"
 *
 * 2. At the end of DawflowPluginHost::_register_commands(), add:
 *
 *    dawflow_register_final_commands (_session, _command_handlers);
 *
 * This will register all 30 final commands into the plugin host's
 * command dispatch table alongside the existing commands.
 */
