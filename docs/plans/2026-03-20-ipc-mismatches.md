# IPC Command Mismatches — 54 commands in React UI that DON'T exist in engine

These commands are called from the React UI but have no handler in the engine.
They silently fail, making features appear broken.

## Pan/Panner (6)
- `daw.set_pan_position` → FIXED: use `daw.set_panning` with `azimuth` param
- `daw.get_pan_position` → use `daw.get_panning` (returns azimuth/width/elevation)
- `daw.get_pan_width` → use `daw.get_panning` (returns width field)
- `daw.set_pan_width` → use `daw.set_panning` with `width` param
- `daw.set_pan_bypassed` → use `daw.set_panning` or not available
- `daw.reset_pan` → use `daw.set_panning` with `azimuth: 0.5`

## Route Groups (6)
- `daw.add_route_to_group` → need to check correct name
- `daw.remove_route_from_group` → need to check
- `daw.get_route_group_details` → need to check
- `daw.set_route_group_active` → need to check
- `daw.set_route_group_color` → need to check
- `daw.set_route_group_gain/mute/solo` → need to check

## Tempo/Meter (4)
- `daw.set_tempo_bpm` → need to check (might be `daw.set_tempo`)
- `daw.remove_tempo` → need to check
- `daw.get_all_tempo_points` → need to check
- `daw.get_all_meter_points` → need to check

## MIDI (5)
- `daw.midi.get_channels_present` → need to check
- `daw.midi.remove_duplicate_notes` → need to check
- `daw.midi.remove_overlapping_notes` → need to check
- `daw.midi.shift_notes` → need to check
- `daw.midi.trim_overlapping_notes` → need to check

## Editor/Selection (4)
- `daw.editor.paste` → need to check (might be `daw.paste`)
- `daw.select_range` → need to check
- `daw.zoom_to_selection` → need to check
- `daw.get_visible_range` → need to check

## Automation (4)
- `daw.clear_automation_range` → need to check
- `daw.get_automation_interpolation` → need to check
- `daw.set_automation_interpolation` → need to check
- `daw.thin_automation` → need to check

## Playlist/Comp (3)
- `daw.delete_playlist` → need to check
- `daw.duplicate_playlist` → need to check
- `daw.playlist.comp_region` → need to check

## Regions (5)
- `daw.normalize_region_by_id` → need to check
- `daw.get_region_loudness` → need to check
- `daw.get_region_peak` → need to check
- `daw.set_region_fade_in_active` → need to check
- `daw.set_region_fade_out_active` → need to check

## Other (17)
- `daw.ai.chat` → plugin-specific, not engine
- `daw.assign_group_to_vca` → need to check
- `daw.bbt_to_samples` → need to check
- `daw.samples_to_bbt` → need to check
- `daw.control_protocol.list` → need to check
- `daw.destroy_subgroup` → need to check
- `daw.make_subgroup` → need to check
- `daw.get_available_panners` → need to check
- `daw.get_buses` → need to check
- `daw.get_loudness_integrated` → need to check
- `daw.get_master_spectrum` → need to check
- `daw.get_meter_at` → need to check
- `daw.editor.remove_meter_at_position` → need to check
- `daw.reset_loudness_analysis` → need to check
- `daw.select_panner` → need to check
- `daw.set_constrain_delay_compensation` → doesn't exist, skip
