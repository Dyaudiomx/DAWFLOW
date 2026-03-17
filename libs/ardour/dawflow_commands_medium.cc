/*
 * DawflowCommandsMedium - Medium & Low Priority API Commands
 *
 * Implements 62 IPC commands and 10 event signal connections for the
 * DAWFLOW Plugin Host API.
 *
 * Part of the DAWFLOW plugin system.
 */

#include "ardour/dawflow_commands_medium.h"
#include "ardour/dawflow_plugin_host.h"

#include "ardour/session.h"
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
#include "ardour/route_group.h"
#include "ardour/location.h"
#include "ardour/audioengine.h"
#include "ardour/port.h"
#include "ardour/io.h"
#include "ardour/rc_configuration.h"
#include "ardour/dB.h"
#include "ardour/types.h"
#include "ardour/recent_sessions.h"

#include "temporal/tempo.h"
#include "temporal/beats.h"
#include "evoral/Note.h"
#include "pbd/id.h"

#include <algorithm>
#include <cmath>
#include <iostream>

using namespace ARDOUR;
using namespace DawflowIPC;

/* ---- Helpers ---- */

static double
_med_beats_to_double (Temporal::Beats const & b)
{
	return (double)b.get_beats () + (double)b.get_ticks () / (double)Temporal::Beats::PPQN;
}

static std::shared_ptr<Route>
_med_get_route (Session& session, const std::string& id)
{
	auto route = session.route_by_id (PBD::ID (id));
	if (!route) {
		throw std::runtime_error ("Route not found: " + id);
	}
	return route;
}

static std::shared_ptr<Track>
_med_get_track (Session& session, const std::string& id)
{
	auto route = _med_get_route (session, id);
	auto track = std::dynamic_pointer_cast<Track> (route);
	if (!track) {
		throw std::runtime_error ("Route is not a track: " + id);
	}
	return track;
}

static std::shared_ptr<Playlist>
_med_get_playlist (Session& session, const std::string& track_id)
{
	auto track = _med_get_track (session, track_id);
	auto playlist = track->playlist ();
	if (!playlist) {
		throw std::runtime_error ("Track has no playlist: " + track_id);
	}
	return playlist;
}

static std::shared_ptr<Region>
_med_find_region (std::shared_ptr<Playlist> playlist, const std::string& region_id)
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

static std::shared_ptr<AudioRegion>
_med_to_audio_region (std::shared_ptr<Region> region)
{
	auto ar = std::dynamic_pointer_cast<AudioRegion> (region);
	if (!ar) {
		throw std::runtime_error ("Region is not an audio region: " + region->id ().to_s ());
	}
	return ar;
}

static std::shared_ptr<MidiRegion>
_med_to_midi_region (std::shared_ptr<Region> region)
{
	auto mr = std::dynamic_pointer_cast<MidiRegion> (region);
	if (!mr) {
		throw std::runtime_error ("Region is not a MIDI region: " + region->id ().to_s ());
	}
	return mr;
}

static std::shared_ptr<PluginInsert>
_med_find_plugin_insert (std::shared_ptr<Route> route, const std::string& proc_id)
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
ARDOUR::dawflow_register_medium_commands (
	DawflowPluginHost& host,
	Session& session,
	std::unordered_map<std::string, std::function<json(const json&)>>& handlers)
{
	/* ============================================================
	 * EDITING COMMANDS (7)
	 * ============================================================ */

	/* 1. daw.reverse_region — Reverse audio region */
	handlers["daw.reverse_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		(void) _med_to_audio_region (region); /* Validate it's audio */

		json result;
		result["status"]      = "not_yet_implemented";
		result["description"] = "In-place audio reversal requires creating a reversed "
			"source via SourceFactory, then replacing the region's source. "
			"This is a complex operation best done through Ardour's Editor actions. "
			"Consider using daw.bounce_range followed by external processing.";
		result["region_id"]   = region_id;
		return result;
	};

	/* 2. daw.set_fade_shape — Set fade curve shape */
	handlers["daw.set_fade_shape"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		std::string fade_type = params.at ("fade").get<std::string> ();
		std::string shape_s   = params.at ("shape").get<std::string> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto ar       = _med_to_audio_region (region);

		FadeShape shape;
		if (shape_s == "linear")           shape = FadeLinear;
		else if (shape_s == "fast")        shape = FadeFast;
		else if (shape_s == "slow")        shape = FadeSlow;
		else if (shape_s == "constant")    shape = FadeConstantPower;
		else if (shape_s == "symmetric")   shape = FadeSymmetric;
		else throw std::runtime_error ("Unknown fade shape: " + shape_s +
			" (valid: linear, fast, slow, constant, symmetric)");

		if (fade_type == "in") {
			ar->set_fade_in_shape (shape);
		} else if (fade_type == "out") {
			ar->set_fade_out_shape (shape);
		} else {
			throw std::runtime_error ("fade must be 'in' or 'out'");
		}

		json result;
		result["ok"] = true;
		return result;
	};

	/* 3. daw.create_crossfade — Create crossfade between overlapping regions */
	handlers["daw.create_crossfade"] = [&session](const json& params) -> json {
		std::string track_id    = params.at ("track_id").get<std::string> ();
		std::string region_id_a = params.at ("region_id_a").get<std::string> ();
		std::string region_id_b = params.at ("region_id_b").get<std::string> ();
		samplecnt_t length      = params.value ("crossfade_samples", (samplecnt_t)4410);

		auto playlist = _med_get_playlist (session, track_id);
		auto region_a = _med_find_region (playlist, region_id_a);
		auto region_b = _med_find_region (playlist, region_id_b);
		auto ar_a     = _med_to_audio_region (region_a);
		auto ar_b     = _med_to_audio_region (region_b);

		ar_a->set_fade_out_active (true);
		ar_a->set_fade_out_length (length);
		ar_b->set_fade_in_active (true);
		ar_b->set_fade_in_length (length);

		json result;
		result["ok"] = true;
		result["description"] = "Set fade_out on region A and fade_in on region B. "
			"For proper crossfades, ensure the regions overlap by the crossfade length.";
		return result;
	};

	/* 4. daw.get_snap_mode — Get current snap settings */
	handlers["daw.get_snap_mode"] = [](const json& /* params */) -> json {
		json result;
		result["status"]      = "gui_only";
		result["description"] = "Snap mode is a GUI-side (Editor) setting. "
			"It is not accessible from the plugin host.";
		return result;
	};

	/* 5. daw.ripple_region — Move region and push subsequent regions */
	handlers["daw.ripple_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		samplepos_t new_pos   = params.at ("position_samples").get<samplepos_t> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);

		samplepos_t old_pos = region->position_sample ();
		sampleoffset_t delta = new_pos - old_pos;

		if (delta == 0) {
			json result;
			result["ok"] = true;
			result["moved"] = 0;
			return result;
		}

		region->set_position (timepos_t (new_pos));

		int moved = 1;
		auto regions = playlist->region_list ();
		if (regions) {
			for (auto& r : *regions) {
				if (r == region) continue;
				if (r->position_sample () >= old_pos) {
					samplepos_t rp = r->position_sample ();
					samplepos_t np = rp + delta;
					if (np >= 0) {
						r->set_position (timepos_t (np));
						moved++;
					}
				}
			}
		}

		json result;
		result["ok"]    = true;
		result["moved"] = moved;
		return result;
	};

	/* 6. daw.group_regions — Group regions to move/edit together */
	handlers["daw.group_regions"] = [](const json& /* params */) -> json {
		json result;
		result["status"]      = "gui_only";
		result["description"] = "Region grouping is handled by the Editor (gtk2_ardour). "
			"Consider using route groups (daw.create_group) as an alternative.";
		return result;
	};

	/* 7. daw.ungroup_regions — Ungroup regions */
	handlers["daw.ungroup_regions"] = [](const json& /* params */) -> json {
		json result;
		result["status"]      = "gui_only";
		result["description"] = "Region ungrouping is handled by the Editor (gtk2_ardour).";
		return result;
	};

	/* ============================================================
	 * MIDI COMMANDS (9)
	 * ============================================================ */

	/* 8. daw.select_midi_notes — Select notes by criteria */
	handlers["daw.select_midi_notes"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int note_min = params.value ("note_min", 0);
		int note_max = params.value ("note_max", 127);
		int vel_min  = params.value ("velocity_min", 0);
		int vel_max  = params.value ("velocity_max", 127);
		double start_beats = params.value ("start_beats", 0.0);
		double end_beats   = params.value ("end_beats", 999999.0);

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		json selected = json::array ();
		auto& notes = model->notes ();
		for (auto& note : notes) {
			double t = _med_beats_to_double (note->time ());
			if (note->note () >= note_min && note->note () <= note_max &&
			    note->velocity () >= vel_min && note->velocity () <= vel_max &&
			    t >= start_beats && t <= end_beats) {
				json nj;
				nj["note"]         = (int)note->note ();
				nj["velocity"]     = (int)note->velocity ();
				nj["channel"]      = (int)note->channel ();
				nj["start_beats"]  = t;
				nj["length_beats"] = _med_beats_to_double (note->length ());
				nj["id"]           = (int)note->id ();
				selected.push_back (nj);
			}
		}

		json result;
		result["notes"] = selected;
		result["count"] = (int)selected.size ();
		return result;
	};

	/* 9. daw.split_midi_by_pitch — Split MIDI by pitch range */
	handlers["daw.split_midi_by_pitch"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int split_note        = params.at ("split_note").get<int> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		int below = 0, above = 0;
		auto& notes = model->notes ();
		for (auto& n : notes) {
			if (n->note () < split_note) below++;
			else above++;
		}

		auto cmd = model->new_note_diff_command ("DawFlow Split By Pitch");
		for (auto& n : notes) {
			if (n->note () >= split_note) {
				cmd->remove (n);
			}
		}
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"]             = true;
		result["kept_below"]     = below;
		result["removed_above"]  = above;
		result["description"]    = "Notes below split_note kept in this region. "
			"Create a new MIDI region on another track and add the upper notes there "
			"using daw.add_midi_note for complete pitch splitting.";
		return result;
	};

	/* 10. daw.split_midi_by_channel — Split MIDI by channel */
	handlers["daw.split_midi_by_channel"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int keep_channel      = params.at ("keep_channel").get<int> ();

		if (keep_channel < 0 || keep_channel > 15) {
			throw std::runtime_error ("Channel must be 0-15");
		}

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		int kept = 0, removed = 0;
		auto cmd = model->new_note_diff_command ("DawFlow Split By Channel");
		auto& notes = model->notes ();
		for (auto& n : notes) {
			if (n->channel () == (uint8_t)keep_channel) {
				kept++;
			} else {
				cmd->remove (n);
				removed++;
			}
		}
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"]      = true;
		result["kept"]    = kept;
		result["removed"] = removed;
		return result;
	};

	/* 11. daw.set_midi_channel — Set MIDI channel for notes */
	handlers["daw.set_midi_channel"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int channel           = params.at ("channel").get<int> ();

		if (channel < 0 || channel > 15) {
			throw std::runtime_error ("Channel must be 0-15");
		}

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		auto cmd = model->new_note_diff_command ("DawFlow Set Channel");
		int changed = 0;
		auto& notes = model->notes ();
		for (auto& note : notes) {
			if (note->channel () != (uint8_t)channel) {
				cmd->change (note, MidiModel::NoteDiffCommand::Channel, (uint8_t)channel);
				changed++;
			}
		}
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"]      = true;
		result["changed"] = changed;
		return result;
	};

	/* 12. daw.clear_midi_cc — Clear CC data for controller (stub) */
	handlers["daw.clear_midi_cc"] = [](const json& params) -> json {
		int cc = params.at ("cc").get<int> ();

		json result;
		result["status"]      = "not_yet_implemented";
		result["description"] = "Clearing MIDI CC data requires AutomationList "
			"manipulation on MidiTrack parameters for CC " + std::to_string (cc) +
			". This will be implemented when CC automation editing is added.";
		return result;
	};

	/* 13. daw.add_program_change — Insert program change (stub) */
	handlers["daw.add_program_change"] = [](const json& params) -> json {
		int program = params.at ("program").get<int> ();
		double beat = params.at ("beat").get<double> ();

		json result;
		result["status"]      = "not_yet_implemented";
		result["description"] = "Program change insertion requires adding a "
			"MIDI event directly to the MidiModel's event list. "
			"Program " + std::to_string (program) + " at beat " +
			std::to_string (beat) + " noted for future implementation.";
		return result;
	};

	/* 14. daw.quantize_midi_swing — Quantize with swing */
	handlers["daw.quantize_midi_swing"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		double grid_beats      = params.value ("grid_beats", 0.5);
		double swing           = params.value ("swing", 0.6);
		double strength        = params.value ("strength", 1.0);

		if (swing < 0.0 || swing > 1.0) {
			throw std::runtime_error ("Swing must be 0.0-1.0 (0.5 = straight)");
		}

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		auto cmd = model->new_note_diff_command ("DawFlow Swing Quantize");

		auto& notes = model->notes ();
		for (auto& note : notes) {
			double t = _med_beats_to_double (note->time ());

			if (grid_beats <= 0.0) continue;

			double grid_index = t / grid_beats;
			double rounded = std::floor (grid_index);

			int beat_in_pair = (int)rounded % 2;
			double target;

			if (beat_in_pair == 0) {
				target = rounded * grid_beats;
			} else {
				double pair_start = (rounded - 1) * grid_beats;
				target = pair_start + (2.0 * grid_beats * swing);
			}

			double new_val = t + (target - t) * strength;
			new_val = std::max (0.0, new_val);

			Temporal::Beats new_time = Temporal::Beats::from_double (new_val);
			if (new_time != note->time ()) {
				cmd->change (note, MidiModel::NoteDiffCommand::StartTime, new_time);
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 15. daw.legato_midi — Extend notes to meet next note */
	handlers["daw.legato_midi"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		double gap_beats      = params.value ("gap_beats", 0.0);

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		struct NoteInfo {
			std::shared_ptr<Evoral::Note<Temporal::Beats>> note;
			double start;
		};
		std::vector<NoteInfo> sorted_notes;
		auto& notes = model->notes ();
		for (auto& n : notes) {
			sorted_notes.push_back ({n, _med_beats_to_double (n->time ())});
		}
		std::sort (sorted_notes.begin (), sorted_notes.end (),
			[](const NoteInfo& a, const NoteInfo& b) { return a.start < b.start; });

		auto cmd = model->new_note_diff_command ("DawFlow Legato");
		int changed = 0;

		for (size_t i = 0; i < sorted_notes.size (); i++) {
			double next_start = -1.0;
			for (size_t j = i + 1; j < sorted_notes.size (); j++) {
				if (sorted_notes[j].note->note () == sorted_notes[i].note->note ()) {
					next_start = sorted_notes[j].start;
					break;
				}
			}

			if (next_start < 0.0) {
				if (i + 1 < sorted_notes.size ()) {
					next_start = sorted_notes[i + 1].start;
				}
			}

			if (next_start > 0.0) {
				double new_length = next_start - sorted_notes[i].start - gap_beats;
				if (new_length > 0.0) {
					Temporal::Beats new_len = Temporal::Beats::from_double (new_length);
					if (new_len != sorted_notes[i].note->length ()) {
						cmd->change (sorted_notes[i].note,
							MidiModel::NoteDiffCommand::Length, new_len);
						changed++;
					}
				}
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"]      = true;
		result["changed"] = changed;
		return result;
	};

	/* 16. daw.scale_midi_velocity — Scale velocities by percentage */
	handlers["daw.scale_midi_velocity"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		double scale_percent  = params.at ("scale_percent").get<double> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		double factor = scale_percent / 100.0;
		auto cmd = model->new_note_diff_command ("DawFlow Scale Velocity");

		auto& notes = model->notes ();
		for (auto& note : notes) {
			int new_vel = std::clamp ((int)std::round ((double)note->velocity () * factor), 1, 127);
			if (new_vel != (int)note->velocity ()) {
				cmd->change (note, MidiModel::NoteDiffCommand::Velocity, (uint8_t)new_vel);
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* ============================================================
	 * ARRANGEMENT COMMANDS (5)
	 * ============================================================ */

	/* 17. daw.rename_marker — Rename existing marker */
	handlers["daw.rename_marker"] = [&session](const json& params) -> json {
		std::string old_name = params.at ("name").get<std::string> ();
		std::string new_name = params.at ("new_name").get<std::string> ();

		auto& locs = *session.locations ();
		for (auto* loc : locs.list ()) {
			if (!loc) continue;
			if (loc->name () == old_name && (loc->is_mark () || loc->is_range_marker ())) {
				loc->set_name (new_name);
				json result;
				result["ok"] = true;
				return result;
			}
		}
		throw std::runtime_error ("Marker not found: " + old_name);
	};

	/* 18. daw.move_marker — Move marker to new position */
	handlers["daw.move_marker"] = [&session](const json& params) -> json {
		std::string name       = params.at ("name").get<std::string> ();
		samplepos_t new_pos    = params.at ("position_samples").get<samplepos_t> ();

		auto& locs = *session.locations ();
		for (auto* loc : locs.list ()) {
			if (!loc) continue;
			if (loc->name () == name) {
				if (loc->is_mark ()) {
					loc->set (timepos_t (new_pos), timepos_t (new_pos));
				} else {
					samplepos_t dur = loc->end ().samples () - loc->start ().samples ();
					loc->set (timepos_t (new_pos), timepos_t (new_pos + dur));
				}
				json result;
				result["ok"] = true;
				return result;
			}
		}
		throw std::runtime_error ("Marker not found: " + name);
	};

	/* 19. daw.remove_tempo_change — Remove tempo at position */
	handlers["daw.remove_tempo_change"] = [](const json& params) -> json {
		int64_t pos = params.at ("position_samples").get<int64_t> ();

		Temporal::TempoMap::WritableSharedPtr tmap = Temporal::TempoMap::write_copy ();
		auto& tempi = tmap->tempos ();

		bool found = false;
		for (auto it = tempi.begin (); it != tempi.end (); ++it) {
			if (it->sample () == pos || std::abs ((int64_t)it->sample () - pos) < 64) {
				if (it == tempi.begin ()) {
					throw std::runtime_error ("Cannot remove the initial tempo point");
				}
				tmap->remove_tempo (*it);
				found = true;
				break;
			}
		}

		if (!found) {
			throw std::runtime_error ("No tempo point found near position " + std::to_string (pos));
		}

		Temporal::TempoMap::update (tmap);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 20. daw.add_tempo_ramp — Gradual tempo change between two points */
	handlers["daw.add_tempo_ramp"] = [](const json& params) -> json {
		double start_bpm  = params.at ("start_bpm").get<double> ();
		double end_bpm    = params.at ("end_bpm").get<double> ();
		int64_t start_pos = params.at ("start_position_samples").get<int64_t> ();
		int64_t end_pos   = params.at ("end_position_samples").get<int64_t> ();

		Temporal::TempoMap::WritableSharedPtr tmap = Temporal::TempoMap::write_copy ();

		Temporal::Tempo ramped_tempo (start_bpm, end_bpm, 4);
		tmap->set_tempo (ramped_tempo, Temporal::timepos_t (start_pos));

		Temporal::Tempo end_tempo (end_bpm, end_bpm, 4);
		tmap->set_tempo (end_tempo, Temporal::timepos_t (end_pos));

		auto& tempi = tmap->tempos ();
		for (auto it = tempi.begin (); it != tempi.end (); ++it) {
			if (std::abs ((int64_t)it->sample () - start_pos) < 64) {
				auto& tp = const_cast<Temporal::TempoPoint&> (*it);
				tmap->set_ramped (tp, true);
				break;
			}
		}

		Temporal::TempoMap::update (tmap);

		json result;
		result["ok"]        = true;
		result["start_bpm"] = start_bpm;
		result["end_bpm"]   = end_bpm;
		return result;
	};

	/* 21. daw.add_cue_marker — Add cue marker */
	handlers["daw.add_cue_marker"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();
		int64_t pos_val  = params.value ("position", (int64_t)session.transport_sample ());

		auto* loc = new Location (
			session,
			timepos_t ((samplepos_t)pos_val),
			timepos_t ((samplepos_t)pos_val),
			name,
			Location::Flags (Location::IsMark | Location::IsCueMarker)
		);
		session.locations ()->add (loc);

		json result;
		result["ok"]       = true;
		result["name"]     = name;
		result["position"] = pos_val;
		return result;
	};

	/* ============================================================
	 * PLUGIN COMMANDS (3)
	 * ============================================================ */

	/* 22. daw.move_plugin — Move plugin between tracks */
	handlers["daw.move_plugin"] = [&session](const json& params) -> json {
		std::string src_track_id  = params.at ("source_track_id").get<std::string> ();
		std::string dst_track_id  = params.at ("dest_track_id").get<std::string> ();
		std::string proc_id       = params.at ("processor_id").get<std::string> ();

		auto src_route = _med_get_route (session, src_track_id);
		auto dst_route = _med_get_route (session, dst_track_id);
		auto pi = _med_find_plugin_insert (src_route, proc_id);

		auto plugin = pi->plugin ();
		auto plugin_info = plugin->get_info ();
		auto state = pi->get_state ();

		src_route->remove_processor (pi);

		auto new_plugin = plugin_info->load (session);
		if (!new_plugin) {
			throw std::runtime_error ("Failed to reload plugin for move");
		}
		auto new_insert = std::shared_ptr<PluginInsert> (
			new PluginInsert (session, *dst_route, new_plugin));

		new_insert->set_state (state, Stateful::current_state_version);
		dst_route->add_processor (new_insert, PreFader);

		json result;
		result["ok"]               = true;
		result["new_processor_id"] = new_insert->id ().to_s ();
		return result;
	};

	/* 23. daw.get_plugin_info — Detailed plugin info */
	handlers["daw.get_plugin_info"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		std::string proc_id  = params.at ("processor_id").get<std::string> ();

		auto route = _med_get_route (session, track_id);
		auto pi = _med_find_plugin_insert (route, proc_id);
		auto plugin = pi->plugin ();
		auto info = plugin->get_info ();

		json result;
		result["processor_id"] = proc_id;
		result["name"]         = plugin->name ();
		result["maker"]        = info->creator;
		result["category"]     = info->category;
		result["unique_id"]    = info->unique_id;
		result["enabled"]      = pi->enabled ();

		std::string type_s;
		switch (info->type) {
			case AudioUnit:   type_s = "AudioUnit"; break;
			case LV2:         type_s = "LV2"; break;
			case VST3:        type_s = "VST3"; break;
			case Windows_VST:
			case MacVST:
			case LXVST:       type_s = "VST"; break;
			case LADSPA:      type_s = "LADSPA"; break;
			case Lua:         type_s = "Lua"; break;
			default:          type_s = "Unknown"; break;
		}
		result["type"] = type_s;

		result["parameter_count"] = (int)plugin->parameter_count ();
		result["audio_inputs"]    = (int)info->n_inputs.n_audio ();
		result["audio_outputs"]   = (int)info->n_outputs.n_audio ();
		result["midi_inputs"]     = (int)info->n_inputs.n_midi ();
		result["midi_outputs"]    = (int)info->n_outputs.n_midi ();

		auto presets = plugin->get_presets ();
		result["preset_count"] = (int)presets.size ();

		return result;
	};

	/* 24. daw.load_plugin_by_id — Load by unique_id not name */
	handlers["daw.load_plugin_by_id"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string unique_id = params.at ("unique_id").get<std::string> ();

		auto route = _med_get_route (session, track_id);
		auto& pm = PluginManager::instance ();
		PluginInfoPtr found;

		auto search = [&](const PluginInfoList& list) {
			for (auto& pi : list) {
				if (pi->unique_id == unique_id) {
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
			throw std::runtime_error ("Plugin not found with unique_id: " + unique_id);
		}

		auto plugin = found->load (session);
		if (!plugin) {
			throw std::runtime_error ("Failed to load plugin: " + unique_id);
		}

		auto insert = std::shared_ptr<PluginInsert> (
			new PluginInsert (session, *route, plugin));
		route->add_processor (insert, PreFader);

		json result;
		result["ok"]           = true;
		result["processor_id"] = insert->id ().to_s ();
		result["name"]         = found->name;
		return result;
	};

	/* ============================================================
	 * PROJECT COMMANDS (3)
	 * ============================================================ */

	/* 25. daw.save_template — Save session as template */
	handlers["daw.save_template"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();
		std::string desc = params.value ("description", "");

		int ret = session.save_template (name, desc);
		if (ret != 0) {
			throw std::runtime_error ("Failed to save template: " + name);
		}

		json result;
		result["ok"]   = true;
		result["name"] = name;
		return result;
	};

	/* 26. daw.restore_snapshot — Restore saved snapshot */
	handlers["daw.restore_snapshot"] = [&session](const json& params) -> json {
		std::string name = params.at ("name").get<std::string> ();

		int ret = session.restore_state (name);
		if (ret != 0) {
			throw std::runtime_error ("Failed to restore snapshot: " + name);
		}

		json result;
		result["ok"]       = true;
		result["snapshot"] = name;
		return result;
	};

	/* 27. daw.copy_track_playlist — Copy playlist for comping */
	handlers["daw.copy_track_playlist"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto track = _med_get_track (session, track_id);
		int ret = track->use_copy_playlist ();
		if (ret != 0) {
			throw std::runtime_error ("Failed to copy playlist for track: " + track_id);
		}

		auto new_playlist = track->playlist ();
		json result;
		result["ok"]            = true;
		result["playlist_name"] = new_playlist ? new_playlist->name () : "unknown";
		return result;
	};

	/* ============================================================
	 * VIEW COMMANDS (2) — GUI-only stubs
	 * ============================================================ */

	/* 28. daw.zoom_to_region — Zoom to fit a region */
	handlers["daw.zoom_to_region"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.zoom_to_region is not available from the plugin host. "
			"View/zoom commands require access to the Editor (gtk2_ardour).");
	};

	/* 29. daw.zoom_to_range — Zoom to time range */
	handlers["daw.zoom_to_range"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.zoom_to_range is not available from the plugin host. "
			"View/zoom commands require access to the Editor (gtk2_ardour).");
	};

	/* ============================================================
	 * ADVANCED COMMANDS (9)
	 * ============================================================ */

	/* 30. daw.remove_track_from_group — Remove from group */
	handlers["daw.remove_track_from_group"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string group_name = params.at ("group_name").get<std::string> ();

		auto route = _med_get_route (session, track_id);
		auto group = session.route_group_by_name (group_name);
		if (!group) {
			throw std::runtime_error ("Group not found: " + group_name);
		}

		group->remove (route);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 31. daw.set_group_properties — Set group gain/mute/solo linking */
	handlers["daw.set_group_properties"] = [&session](const json& params) -> json {
		std::string group_name = params.at ("group_name").get<std::string> ();

		auto group = session.route_group_by_name (group_name);
		if (!group) {
			throw std::runtime_error ("Group not found: " + group_name);
		}

		if (params.contains ("gain"))     group->set_gain (params["gain"].get<bool> ());
		if (params.contains ("mute"))     group->set_mute (params["mute"].get<bool> ());
		if (params.contains ("solo"))     group->set_solo (params["solo"].get<bool> ());
		if (params.contains ("active"))   group->set_active (params["active"].get<bool> (), nullptr);
		if (params.contains ("relative")) group->set_relative (params["relative"].get<bool> (), nullptr);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 32. daw.delete_group — Delete route group */
	handlers["daw.delete_group"] = [&session](const json& params) -> json {
		std::string group_name = params.at ("group_name").get<std::string> ();

		auto group = session.route_group_by_name (group_name);
		if (!group) {
			throw std::runtime_error ("Group not found: " + group_name);
		}

		session.remove_route_group (group);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 33. daw.connect_ports — Connect ports directly */
	handlers["daw.connect_ports"] = [&session](const json& params) -> json {
		std::string source = params.at ("source_port").get<std::string> ();
		std::string dest   = params.at ("dest_port").get<std::string> ();

		int ret = session.engine ().connect (source, dest);
		if (ret != 0) {
			throw std::runtime_error ("Failed to connect " + source + " -> " + dest);
		}

		json result;
		result["ok"] = true;
		return result;
	};

	/* 34. daw.disconnect_ports — Disconnect ports */
	handlers["daw.disconnect_ports"] = [&session](const json& params) -> json {
		std::string source = params.at ("source_port").get<std::string> ();
		std::string dest   = params.at ("dest_port").get<std::string> ();

		int ret = session.engine ().disconnect (source, dest);
		if (ret != 0) {
			throw std::runtime_error ("Failed to disconnect " + source + " -> " + dest);
		}

		json result;
		result["ok"] = true;
		return result;
	};

	/* 35. daw.get_xrun_count — Get dropout count */
	handlers["daw.get_xrun_count"] = [&session](const json& /* params */) -> json {
		json result;
		result["xrun_count"] = (int)session.get_xrun_count ();
		return result;
	};

	/* 36. daw.get_track_latency — Get track latency info */
	handlers["daw.get_track_latency"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();

		auto route = _med_get_route (session, track_id);

		json result;
		result["track_id"]         = track_id;
		result["signal_latency"]   = (int64_t)route->signal_latency ();
		result["playback_latency"] = (int64_t)route->playback_latency (false);
		return result;
	};

	/* 37. daw.get_metronome_state — Get click state */
	handlers["daw.get_metronome_state"] = [&session](const json& /* params */) -> json {
		json result;
		result["enabled"]  = Config->get_clicking ();
		result["gain"]     = Config->get_click_gain ();
		result["count_in"] = session.config.get_count_in ();
		return result;
	};

	/* 38. daw.get_transport_speed — Get current speed */
	handlers["daw.get_transport_speed"] = [&session](const json& /* params */) -> json {
		json result;
		result["speed"]   = session.transport_speed ();
		result["playing"] = session.transport_rolling ();
		return result;
	};

	/* ============================================================
	 * LOW PRIORITY COMMANDS (14)
	 * ============================================================ */

	/* 49. daw.set_capture_mode — Destructive vs non-destructive */
	handlers["daw.set_capture_mode"] = [](const json& /* params */) -> json {
		json result;
		result["status"]      = "deprecated";
		result["description"] = "Destructive recording mode has been removed "
			"in modern Ardour (7+). All recording is now non-destructive.";
		return result;
	};

	/* 50. daw.get_last_capture_info — Info about last recording */
	handlers["daw.get_last_capture_info"] = [&session](const json& /* params */) -> json {
		json result;
		result["status"]      = "limited";
		result["description"] = "Last capture info is tracked by the Editor. "
			"Use daw.get_regions on the recording track to find "
			"the most recently created region.";
		result["recording"]   = session.actively_recording ();
		return result;
	};

	/* 51. daw.set_region_opacity — Region transparency (opaque flag) */
	handlers["daw.set_region_opacity"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		bool opaque           = params.at ("opaque").get<bool> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);

		region->set_opaque (opaque);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 52. daw.raise_region — Raise region layer */
	handlers["daw.raise_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);

		playlist->raise_region (region);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 53. daw.lower_region — Lower region layer */
	handlers["daw.lower_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);

		playlist->lower_region (region);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 54. daw.shuffle_region — Shuffle region position */
	handlers["daw.shuffle_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int direction         = params.at ("direction").get<int> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);

		playlist->shuffle (region, direction);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 55. daw.set_track_height — Visual track height (GUI-only) */
	handlers["daw.set_track_height"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.set_track_height is not available from the plugin host. "
			"Track height is a GUI-side (Editor) property.");
	};

	/* 56. daw.show_mixer — Show mixer window (GUI-only) */
	handlers["daw.show_mixer"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.show_mixer is not available from the plugin host. "
			"Window management requires access to ARDOUR_UI (gtk2_ardour).");
	};

	/* 57. daw.show_editor — Show editor window (GUI-only) */
	handlers["daw.show_editor"] = [](const json& /* params */) -> json {
		throw std::runtime_error (
			"daw.show_editor is not available from the plugin host. "
			"Window management requires access to ARDOUR_UI (gtk2_ardour).");
	};

	/* 58. daw.get_recent_sessions — List recent sessions */
	handlers["daw.get_recent_sessions"] = [](const json& /* params */) -> json {
		RecentSessions rs;
		int ret = read_recent_sessions (rs);
		if (ret != 0) {
			throw std::runtime_error ("Failed to read recent sessions");
		}

		json sessions = json::array ();
		for (auto const& s : rs) {
			sessions.push_back ({
				{"name", s.first},
				{"path", s.second}
			});
		}

		json result;
		result["sessions"] = sessions;
		result["count"]    = (int)sessions.size ();
		return result;
	};

	/* 59. daw.get_latency_report — Full latency report */
	handlers["daw.get_latency_report"] = [&session](const json& /* params */) -> json {
		json tracks = json::array ();
		auto routes = session.get_routes ();
		if (routes) {
			for (auto& r : *routes) {
				if (!r) continue;
				json t;
				t["id"]               = r->id ().to_s ();
				t["name"]             = r->name ();
				t["signal_latency"]   = (int64_t)r->signal_latency ();
				t["playback_latency"] = (int64_t)r->playback_latency (false);
				tracks.push_back (t);
			}
		}

		json result;
		result["tracks"]      = tracks;
		result["sample_rate"] = (int)session.sample_rate ();
		result["block_size"]  = (int)session.get_block_size ();
		result["xrun_count"]  = (int)session.get_xrun_count ();
		return result;
	};

	/* 60. daw.invert_midi_notes — Melodic inversion around a pivot */
	handlers["daw.invert_midi_notes"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int pivot             = params.value ("pivot", 60);

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		auto cmd = model->new_note_diff_command ("DawFlow Invert Notes");
		auto& notes = model->notes ();
		for (auto& note : notes) {
			int inverted = pivot - ((int)note->note () - pivot);
			inverted = std::clamp (inverted, 0, 127);
			if (inverted != (int)note->note ()) {
				cmd->change (note, MidiModel::NoteDiffCommand::NoteNumber, (uint8_t)inverted);
			}
		}
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"]    = true;
		result["pivot"] = pivot;
		return result;
	};

	/* 61. daw.retrograde_midi — Reverse note order (retrograde) */
	handlers["daw.retrograde_midi"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _med_get_playlist (session, track_id);
		auto region   = _med_find_region (playlist, region_id);
		auto mr       = _med_to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		struct NoteData {
			std::shared_ptr<Evoral::Note<Temporal::Beats>> note;
			double start;
			double length;
		};
		std::vector<NoteData> note_data;
		auto& notes = model->notes ();
		double max_end = 0.0;

		for (auto& n : notes) {
			double s = _med_beats_to_double (n->time ());
			double l = _med_beats_to_double (n->length ());
			note_data.push_back ({n, s, l});
			if (s + l > max_end) max_end = s + l;
		}

		auto cmd = model->new_note_diff_command ("DawFlow Retrograde");
		for (auto& nd : note_data) {
			double new_start = max_end - nd.start - nd.length;
			if (new_start < 0.0) new_start = 0.0;
			Temporal::Beats new_time = Temporal::Beats::from_double (new_start);
			if (new_time != nd.note->time ()) {
				cmd->change (nd.note, MidiModel::NoteDiffCommand::StartTime, new_time);
			}
		}
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 62. daw.get_sample_rate — Dedicated sample rate query */
	handlers["daw.get_sample_rate"] = [&session](const json& /* params */) -> json {
		json result;
		result["sample_rate"] = (int)session.sample_rate ();
		return result;
	};

	/* ============================================================
	 * EVENT BROADCASTS (10)
	 *
	 * Connect to Ardour session signals and broadcast notifications
	 * to all connected plugin clients.
	 * ============================================================ */

	static PBD::ScopedConnectionList _medium_signal_connections;

	/* 39. routes.removed — Track/bus removal from group event */
	session.RouteRemovedFromRouteGroup.connect_same_thread (
		_medium_signal_connections,
		[&host](std::shared_ptr<RouteGroup> /* group */, std::weak_ptr<Route> wr) {
			auto r = wr.lock ();
			if (r) {
				json params;
				params["route_id"]   = r->id ().to_s ();
				params["route_name"] = r->name ();
				host.broadcast_event ("daw.routes.removed_from_group", params);
			}
		}
	);

	/* 40. route.property_changed — via RouteAdded proxy */
	session.RouteAdded.connect_same_thread (
		_medium_signal_connections,
		[&host](RouteList& rl) {
			for (auto& route : rl) {
				if (!route) continue;
				json params;
				params["route_id"]   = route->id ().to_s ();
				params["route_name"] = route->name ();
				host.broadcast_event ("daw.route.added", params);
			}
		}
	);

	/* 41. region.added — New region creation */
	RegionFactory::CheckNewRegion.connect_same_thread (
		_medium_signal_connections,
		[&host](std::shared_ptr<Region> region) {
			if (region) {
				json params;
				params["region_id"]   = region->id ().to_s ();
				params["region_name"] = region->name ();
				host.broadcast_event ("daw.region.added", params);
			}
		}
	);

	/* 42-43. marker.added / marker.removed / marker.changed */
	session.locations ()->added.connect_same_thread (
		_medium_signal_connections,
		[&host](Location* loc) {
			if (loc) {
				json params;
				params["name"]      = loc->name ();
				params["start"]     = (int64_t)loc->start ().samples ();
				params["is_mark"]   = loc->is_mark ();
				host.broadcast_event ("daw.marker.added", params);
			}
		}
	);

	session.locations ()->removed.connect_same_thread (
		_medium_signal_connections,
		[&host](Location* loc) {
			if (loc) {
				json params;
				params["name"] = loc->name ();
				host.broadcast_event ("daw.marker.removed", params);
			}
		}
	);

	/* 44. marker.changed */
	Location::name_changed.connect_same_thread (
		_medium_signal_connections,
		[&host](Location* loc) {
			if (loc) {
				json params;
				params["name"]  = loc->name ();
				params["start"] = (int64_t)loc->start ().samples ();
				host.broadcast_event ("daw.marker.changed", params);
			}
		}
	);

	/* 45. tempo.changed */
	Temporal::TempoMap::MapChanged.connect_same_thread (
		_medium_signal_connections,
		[&host]() {
			auto const& tmap = Temporal::TempoMap::use ();
			auto tempo = tmap->tempo_at (Temporal::timepos_t (0));
			json params;
			params["bpm"] = tempo.quarter_notes_per_minute ();
			host.broadcast_event ("daw.tempo.changed", params);
		}
	);

	/* 46-47. plugin.added / plugin.removed — via processors_changed */
	auto wire_processor_signals = [&host, &_medium_signal_connections](std::shared_ptr<Route> route) {
		route->processors_changed.connect_same_thread (
			_medium_signal_connections,
			[&host, weak_route = std::weak_ptr<Route>(route)](RouteProcessorChange /* rpc */) {
				auto r = weak_route.lock ();
				if (r) {
					json params;
					params["route_id"]   = r->id ().to_s ();
					params["route_name"] = r->name ();
					host.broadcast_event ("daw.plugin.changed", params);
				}
			}
		);
	};

	auto routes = session.get_routes ();
	if (routes) {
		for (auto& r : *routes) {
			if (r) wire_processor_signals (r);
		}
	}

	/* Wire future routes */
	session.RouteAdded.connect_same_thread (
		_medium_signal_connections,
		[wire_processor_signals](RouteList& rl) {
			for (auto& r : rl) {
				if (r) wire_processor_signals (r);
			}
		}
	);

	/* 48. undo.performed — No direct signal; cascades through DirtyChanged.
	 * Clients should monitor daw.session.dirty_changed events. */

	std::cerr << "DawflowPluginHost: registered 62 medium/low priority commands + 10 event broadcasts"
		<< std::endl;
}
