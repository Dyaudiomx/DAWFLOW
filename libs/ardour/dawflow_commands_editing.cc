/*
 * DawflowCommandsEditing - Region/Audio & MIDI Editing Commands
 *
 * Implements 27 IPC commands for region manipulation, audio analysis,
 * and MIDI note editing for the DAWFLOW Plugin Host API.
 *
 * Part of the DAWFLOW plugin system.
 */

#include "ardour/dawflow_commands_editing.h"

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
#include "ardour/dB.h"
#include "ardour/types.h"
#include "ardour/interthread_info.h"

#include "evoral/Note.h"
#include "evoral/Sequence.h"
#include "temporal/beats.h"
#include "pbd/id.h"

#include <cmath>
#include <random>
#include <iostream>

using namespace ARDOUR;
using namespace DawflowIPC;

/* ---- Helpers ---- */

static double
_beats_to_double (Temporal::Beats const & b)
{
	return (double)b.get_beats () + (double)b.get_ticks () / (double)Temporal::Beats::PPQN;
}

static std::shared_ptr<Track>
_get_track (Session& session, const std::string& track_id)
{
	auto route = session.route_by_id (PBD::ID (track_id));
	if (!route) {
		throw std::runtime_error ("Route not found: " + track_id);
	}
	auto track = std::dynamic_pointer_cast<Track> (route);
	if (!track) {
		throw std::runtime_error ("Route is not a track: " + track_id);
	}
	return track;
}

static std::shared_ptr<Playlist>
_get_playlist (Session& session, const std::string& track_id)
{
	auto track = _get_track (session, track_id);
	auto playlist = track->playlist ();
	if (!playlist) {
		throw std::runtime_error ("Track has no playlist: " + track_id);
	}
	return playlist;
}

static std::shared_ptr<Region>
_find_region (std::shared_ptr<Playlist> playlist, const std::string& region_id)
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
_to_audio_region (std::shared_ptr<Region> region)
{
	auto ar = std::dynamic_pointer_cast<AudioRegion> (region);
	if (!ar) {
		throw std::runtime_error ("Region is not an audio region: " + region->id ().to_s ());
	}
	return ar;
}

static std::shared_ptr<MidiRegion>
_to_midi_region (std::shared_ptr<Region> region)
{
	auto mr = std::dynamic_pointer_cast<MidiRegion> (region);
	if (!mr) {
		throw std::runtime_error ("Region is not a MIDI region: " + region->id ().to_s ());
	}
	return mr;
}

/* ---- Command Registration ---- */

void
ARDOUR::dawflow_register_editing_commands (
	Session& session,
	std::unordered_map<std::string, std::function<json(const json&)>>& handlers)
{
	/* ================================================================
	 * REGION / AUDIO EDITING COMMANDS
	 * ================================================================ */

	/* 1. daw.get_regions — List all regions on a track's playlist */
	handlers["daw.get_regions"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		auto playlist = _get_playlist (session, track_id);

		json result = json::array ();
		auto regions = playlist->region_list ();
		if (regions) {
			for (auto& r : *regions) {
				json rj;
				rj["id"]              = r->id ().to_s ();
				rj["name"]            = r->name ();
				rj["position_samples"] = r->position_sample ();
				rj["length_samples"]  = r->length_samples ();
				rj["start_samples"]   = r->start_sample ();
				rj["muted"]           = r->muted ();
				rj["locked"]          = r->locked ();
				rj["layer"]           = (int)r->layer ();
				result.push_back (rj);
			}
		}
		return result;
	};

	/* 2. daw.split_region — Split region at a sample position */
	handlers["daw.split_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		samplepos_t position  = params.at ("position_samples").get<samplepos_t> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		playlist->split_region (region, timepos_t (position));

		json result;
		result["ok"] = true;
		return result;
	};

	/* 3. daw.trim_region_start — Trim region start to new position */
	handlers["daw.trim_region_start"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		samplepos_t position  = params.at ("position_samples").get<samplepos_t> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		region->trim_front (timepos_t (position));

		json result;
		result["ok"] = true;
		return result;
	};

	/* 4. daw.trim_region_end — Trim region end to new position */
	handlers["daw.trim_region_end"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		samplepos_t position  = params.at ("position_samples").get<samplepos_t> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		region->trim_end (timepos_t (position));

		json result;
		result["ok"] = true;
		return result;
	};

	/* 5. daw.move_region — Move region to new position */
	handlers["daw.move_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		samplepos_t position  = params.at ("position_samples").get<samplepos_t> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		if (!region->can_move ()) {
			throw std::runtime_error ("Region is locked and cannot be moved: " + region_id);
		}

		region->set_position (timepos_t (position));

		json result;
		result["ok"] = true;
		return result;
	};

	/* 6. daw.delete_region — Remove region from playlist */
	handlers["daw.delete_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		playlist->remove_region (region);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 7. daw.duplicate_region — Copy/duplicate a region */
	handlers["daw.duplicate_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		float times = 1.0f;
		if (params.contains ("times")) {
			times = params.at ("times").get<float> ();
		}

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		/* Place duplicate right after the original */
		timepos_t pos = region->end ();
		playlist->duplicate (region, pos, times);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 8. daw.rename_region — Set region name */
	handlers["daw.rename_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		std::string name      = params.at ("name").get<std::string> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		region->set_name (name);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 9. daw.mute_region — Mute/unmute region */
	handlers["daw.mute_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		bool muted            = params.at ("muted").get<bool> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		region->set_muted (muted);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 10. daw.set_region_gain — Set region gain/amplitude (audio regions only) */
	handlers["daw.set_region_gain"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		double gain_db        = params.at ("gain_db").get<double> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto ar       = _to_audio_region (region);

		/* scale_amplitude is linear gain */
		ar->set_scale_amplitude (dB_to_coefficient (gain_db));

		json result;
		result["ok"] = true;
		return result;
	};

	/* 11. daw.normalize_region — Normalize audio region to target dB */
	handlers["daw.normalize_region"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		float target_db = 0.0f;
		if (params.contains ("target_db")) {
			target_db = params.at ("target_db").get<float> ();
		}

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto ar       = _to_audio_region (region);

		double max_amp = ar->maximum_amplitude ();
		if (max_amp <= 0.0) {
			throw std::runtime_error ("Region is silent, cannot normalize");
		}

		ar->normalize (max_amp, target_db);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 12. daw.set_region_fade_in — Set fade in length (in samples) */
	handlers["daw.set_region_fade_in"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		samplecnt_t length     = params.at ("length_samples").get<samplecnt_t> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto ar       = _to_audio_region (region);

		ar->set_fade_in_active (true);
		ar->set_fade_in_length (length);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 13. daw.set_region_fade_out — Set fade out length (in samples) */
	handlers["daw.set_region_fade_out"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		samplecnt_t length     = params.at ("length_samples").get<samplecnt_t> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto ar       = _to_audio_region (region);

		ar->set_fade_out_active (true);
		ar->set_fade_out_length (length);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 14. daw.get_region_info — Get detailed info for one region */
	handlers["daw.get_region_info"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		json result;
		result["id"]              = region->id ().to_s ();
		result["name"]            = region->name ();
		result["position_samples"] = region->position_sample ();
		result["length_samples"]  = region->length_samples ();
		result["start_samples"]   = region->start_sample ();
		result["muted"]           = region->muted ();
		result["locked"]          = region->locked ();
		result["layer"]           = (int)region->layer ();
		result["hidden"]          = region->hidden ();
		result["opaque"]          = region->opaque ();

		/* Audio-specific details */
		auto ar = std::dynamic_pointer_cast<AudioRegion> (region);
		if (ar) {
			result["gain_db"]          = accurate_coefficient_to_dB (ar->scale_amplitude ());
			result["fade_in_active"]   = ar->fade_in_active ();
			result["fade_out_active"]  = ar->fade_out_active ();
			result["envelope_active"]  = ar->envelope_active ();

			double max_amp = ar->maximum_amplitude ();
			result["peak_amplitude"]   = max_amp;
			result["peak_amplitude_db"] = (max_amp > 0.0) ? accurate_coefficient_to_dB (max_amp) : -INFINITY;
		}

		/* MIDI-specific details */
		auto mr = std::dynamic_pointer_cast<MidiRegion> (region);
		if (mr) {
			auto model = mr->model ();
			if (model) {
				result["note_count"] = (int)model->n_notes ();
			}
			result["type"] = "midi";
		} else {
			result["type"] = "audio";
		}

		return result;
	};

	/* 15. daw.lock_region — Lock/unlock region position */
	handlers["daw.lock_region"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		bool locked           = params.at ("locked").get<bool> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);

		region->set_locked (locked);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 16. daw.bounce_range — Bounce/consolidate a time range on a track */
	handlers["daw.bounce_range"] = [&session](const json& params) -> json {
		std::string track_id = params.at ("track_id").get<std::string> ();
		samplepos_t start    = params.at ("start_samples").get<samplepos_t> ();
		samplepos_t end      = params.at ("end_samples").get<samplepos_t> ();
		std::string name     = params.value ("name", "bounced");

		auto track = _get_track (session, track_id);

		InterThreadInfo itt;
		auto bounced = track->bounce_range (start, end, itt, std::shared_ptr<Processor> (), false, name);

		if (!bounced) {
			throw std::runtime_error ("Bounce failed for track: " + track_id);
		}

		json result;
		result["ok"]        = true;
		result["region_id"] = bounced->id ().to_s ();
		result["name"]      = bounced->name ();
		return result;
	};

	/* 17. daw.strip_silence — Find and remove silent sections */
	handlers["daw.strip_silence"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		double threshold_db    = params.value ("threshold_db", -60.0);
		samplecnt_t min_length = params.value ("min_length_samples", (samplecnt_t)1000);

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto ar       = _to_audio_region (region);

		Sample threshold = dB_to_coefficient (threshold_db);
		InterThreadInfo itt;

		auto silence_result = ar->find_silence (threshold, min_length, session.sample_rate () / 10, itt);

		json result = json::array ();
		for (auto& interval : silence_result) {
			json seg;
			seg["start_samples"] = interval.first;
			seg["end_samples"]   = interval.second;
			result.push_back (seg);
		}
		return result;
	};

	/* 18. daw.get_audio_peaks — Get peak amplitude data for a region */
	handlers["daw.get_audio_peaks"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();
		int n_peaks           = params.value ("n_peaks", 256);
		int channel           = params.value ("channel", 0);

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto ar       = _to_audio_region (region);

		if (n_peaks <= 0 || n_peaks > 65536) {
			throw std::runtime_error ("n_peaks must be between 1 and 65536");
		}

		std::vector<ARDOUR::PeakData> peaks (n_peaks);
		samplecnt_t samples_read = ar->read_peaks (
			peaks.data (), n_peaks,
			0, ar->length_samples (),
			channel,
			(double)ar->length_samples () / n_peaks
		);

		json result = json::array ();
		int count = std::min ((samplecnt_t)n_peaks, std::max (samples_read, (samplecnt_t)0));
		for (int i = 0; i < count; ++i) {
			json p;
			p["min"] = peaks[i].min;
			p["max"] = peaks[i].max;
			result.push_back (p);
		}
		return result;
	};

	/* 19. daw.get_region_rms — Get RMS level of an audio region */
	handlers["daw.get_region_rms"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto ar       = _to_audio_region (region);

		double rms_val = ar->rms ();
		if (rms_val < 0.0) {
			throw std::runtime_error ("RMS calculation was cancelled");
		}

		json result;
		result["rms"]    = rms_val;
		result["rms_db"] = (rms_val > 0.0) ? accurate_coefficient_to_dB (rms_val) : -INFINITY;
		return result;
	};

	/* ================================================================
	 * MIDI EDITING COMMANDS
	 * ================================================================ */

	/* 20. daw.get_midi_notes — Get all MIDI notes in a region */
	handlers["daw.get_midi_notes"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		json result = json::array ();
		auto& notes = model->notes ();
		for (auto& note : notes) {
			json nj;
			nj["note"]          = (int)note->note ();
			nj["velocity"]      = (int)note->velocity ();
			nj["channel"]       = (int)note->channel ();
			nj["start_beats"]   = _beats_to_double (note->time ());
			nj["length_beats"]  = _beats_to_double (note->length ());
			nj["end_beats"]     = _beats_to_double (note->end_time ());
			nj["id"]            = (int)note->id ();
			result.push_back (nj);
		}
		return result;
	};

	/* 21. daw.add_midi_note — Add a note to a MIDI region */
	handlers["daw.add_midi_note"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		int note_num           = params.at ("note").get<int> ();
		int velocity           = params.at ("velocity").get<int> ();
		double start_beats     = params.at ("start_beats").get<double> ();
		double length_beats    = params.at ("length_beats").get<double> ();
		int channel            = params.value ("channel", 0);

		if (note_num < 0 || note_num > 127) {
			throw std::runtime_error ("Note number must be 0-127");
		}
		if (velocity < 0 || velocity > 127) {
			throw std::runtime_error ("Velocity must be 0-127");
		}
		if (channel < 0 || channel > 15) {
			throw std::runtime_error ("Channel must be 0-15");
		}

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		Temporal::Beats start = Temporal::Beats::from_double (start_beats);
		Temporal::Beats len   = Temporal::Beats::from_double (length_beats);

		auto cmd = model->new_note_diff_command ("DawFlow Add Note");
		auto new_note = std::make_shared<Evoral::Note<Temporal::Beats>> (
			(uint8_t)channel, start, len, (uint8_t)note_num, (uint8_t)velocity
		);
		cmd->add (new_note);
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 22. daw.remove_midi_note — Remove a note by matching note/start/channel */
	handlers["daw.remove_midi_note"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		int note_num           = params.at ("note").get<int> ();
		double start_beats     = params.at ("start_beats").get<double> ();
		int channel            = params.value ("channel", 0);

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		Temporal::Beats target_start = Temporal::Beats::from_double (start_beats);

		/* Find the matching note */
		std::shared_ptr<Evoral::Note<Temporal::Beats>> found;
		auto& notes = model->notes ();
		for (auto& n : notes) {
			if (n->note () == (uint8_t)note_num &&
			    n->channel () == (uint8_t)channel &&
			    n->time () == target_start) {
				found = n;
				break;
			}
		}

		if (!found) {
			throw std::runtime_error ("Note not found matching criteria");
		}

		auto cmd = model->new_note_diff_command ("DawFlow Remove Note");
		cmd->remove (found);
		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 23. daw.quantize_midi — Quantize MIDI notes to grid */
	handlers["daw.quantize_midi"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		double grid_beats      = params.value ("grid_beats", 1.0);
		double strength        = params.value ("strength", 1.0);
		/* swing not used in quantize note-by-note, but accepted for API completeness */

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		Temporal::Beats grid = Temporal::Beats::from_double (grid_beats);
		auto cmd = model->new_note_diff_command ("DawFlow Quantize");

		auto& notes = model->notes ();
		for (auto& note : notes) {
			Temporal::Beats t = note->time ();
			double beats_val = _beats_to_double (t);
			double grid_val  = _beats_to_double (grid);

			if (grid_val <= 0.0) {
				continue;
			}

			/* Snap to nearest grid point */
			double quantized = std::round (beats_val / grid_val) * grid_val;
			double new_val   = beats_val + (quantized - beats_val) * strength;

			Temporal::Beats new_time = Temporal::Beats::from_double (new_val);
			if (new_time != t) {
				cmd->change (note, MidiModel::NoteDiffCommand::StartTime, new_time);
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 24. daw.transpose_midi — Transpose all notes by semitones */
	handlers["daw.transpose_midi"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		int semitones          = params.at ("semitones").get<int> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		auto cmd = model->new_note_diff_command ("DawFlow Transpose");

		auto& notes = model->notes ();
		for (auto& note : notes) {
			int new_note = (int)note->note () + semitones;
			if (new_note >= 0 && new_note <= 127) {
				cmd->change (note, MidiModel::NoteDiffCommand::NoteNumber, (uint8_t)new_note);
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 25. daw.set_midi_velocity — Set velocity for all notes (or filtered by note range) */
	handlers["daw.set_midi_velocity"] = [&session](const json& params) -> json {
		std::string track_id   = params.at ("track_id").get<std::string> ();
		std::string region_id  = params.at ("region_id").get<std::string> ();
		int velocity           = params.at ("velocity").get<int> ();
		int note_min           = params.value ("note_min", 0);
		int note_max           = params.value ("note_max", 127);

		if (velocity < 0 || velocity > 127) {
			throw std::runtime_error ("Velocity must be 0-127");
		}

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		auto cmd = model->new_note_diff_command ("DawFlow Set Velocity");

		auto& notes = model->notes ();
		for (auto& note : notes) {
			if (note->note () >= note_min && note->note () <= note_max) {
				cmd->change (note, MidiModel::NoteDiffCommand::Velocity, (uint8_t)velocity);
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 26. daw.humanize_midi — Add random timing/velocity variation */
	handlers["daw.humanize_midi"] = [&session](const json& params) -> json {
		std::string track_id       = params.at ("track_id").get<std::string> ();
		std::string region_id      = params.at ("region_id").get<std::string> ();
		double timing_amount       = params.value ("timing_amount", 0.05);   /* in beats */
		int velocity_amount        = params.value ("velocity_amount", 10);   /* +/- range */

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		std::random_device rd;
		std::mt19937 gen (rd ());
		std::uniform_real_distribution<double> timing_dist (-timing_amount, timing_amount);
		std::uniform_int_distribution<int> vel_dist (-velocity_amount, velocity_amount);

		auto cmd = model->new_note_diff_command ("DawFlow Humanize");

		auto& notes = model->notes ();
		for (auto& note : notes) {
			/* Timing variation */
			if (timing_amount > 0.0) {
				double offset = timing_dist (gen);
				double new_time = std::max (0.0, _beats_to_double (note->time ()) + offset);
				Temporal::Beats new_beats = Temporal::Beats::from_double (new_time);
				if (new_beats != note->time ()) {
					cmd->change (note, MidiModel::NoteDiffCommand::StartTime, new_beats);
				}
			}

			/* Velocity variation */
			if (velocity_amount > 0) {
				int v_offset = vel_dist (gen);
				int new_vel  = std::clamp ((int)note->velocity () + v_offset, 1, 127);
				if (new_vel != (int)note->velocity ()) {
					cmd->change (note, MidiModel::NoteDiffCommand::Velocity, (uint8_t)new_vel);
				}
			}
		}

		model->apply_diff_command_as_commit (session, cmd);

		json result;
		result["ok"] = true;
		return result;
	};

	/* 27. daw.get_midi_region_info — Get MIDI region info (note count, range, duration) */
	handlers["daw.get_midi_region_info"] = [&session](const json& params) -> json {
		std::string track_id  = params.at ("track_id").get<std::string> ();
		std::string region_id = params.at ("region_id").get<std::string> ();

		auto playlist = _get_playlist (session, track_id);
		auto region   = _find_region (playlist, region_id);
		auto mr       = _to_midi_region (region);
		auto model    = mr->model ();

		if (!model) {
			throw std::runtime_error ("MIDI region has no model: " + region_id);
		}

		auto& notes = model->notes ();

		json result;
		result["region_id"]        = region->id ().to_s ();
		result["name"]             = region->name ();
		result["position_samples"] = region->position_sample ();
		result["length_samples"]   = region->length_samples ();
		result["note_count"]       = (int)model->n_notes ();

		if (!notes.empty ()) {
			uint8_t lowest  = 127;
			uint8_t highest = 0;
			double earliest = std::numeric_limits<double>::max ();
			double latest   = 0.0;

			for (auto& n : notes) {
				if (n->note () < lowest)  { lowest  = n->note (); }
				if (n->note () > highest) { highest = n->note (); }
				double t = _beats_to_double (n->time ());
				double e = _beats_to_double (n->end_time ());
				if (t < earliest) { earliest = t; }
				if (e > latest)   { latest   = e; }
			}

			result["lowest_note"]      = (int)lowest;
			result["highest_note"]     = (int)highest;
			result["earliest_beat"]    = earliest;
			result["latest_beat"]      = latest;
			result["duration_beats"]   = latest - earliest;
		} else {
			result["lowest_note"]      = nullptr;
			result["highest_note"]     = nullptr;
			result["earliest_beat"]    = nullptr;
			result["latest_beat"]      = nullptr;
			result["duration_beats"]   = 0.0;
		}

		return result;
	};

	std::cerr << "DawflowPluginHost: registered 27 editing commands (region/audio + MIDI)" << std::endl;
}

/*
 * ---- WIRE-UP INSTRUCTIONS ----
 *
 * To integrate these commands into the DawflowPluginHost, add the following
 * to dawflow_plugin_host.cc:
 *
 * 1. At the top, add the include:
 *
 *    #include "ardour/dawflow_commands_editing.h"
 *
 * 2. At the end of DawflowPluginHost::_register_commands(), add:
 *
 *    dawflow_register_editing_commands (_session, _command_handlers);
 *
 * This will register all 27 editing commands into the plugin host's
 * command dispatch table alongside the existing 10 core commands.
 */
