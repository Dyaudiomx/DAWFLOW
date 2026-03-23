# DAWFLOW Extended API Reference

Comprehensive documentation for 382 IPC commands across five source files:
- `dawflow_commands_triggers.cc` (80 commands)
- `dawflow_commands_sidechain.cc` (52 commands)
- `dawflow_commands_routing_ext.cc` (96 commands)
- `dawflow_commands_safety.cc` (35 commands)
- `dawflow_commands_simulate.cc` (65 commands)

All commands use JSON-RPC 2.0 over IPC (`POST http://localhost:19100/api/command`).

---

## Table of Contents

1. [Trigger / Clip Launcher (25)](#trigger--clip-launcher)
2. [Mixer Scenes (10)](#mixer-scenes)
3. [Region FX (10)](#region-fx)
4. [Lua Scripting Bridge (8)](#lua-scripting-bridge)
5. [Editor State Bridge (15)](#editor-state-bridge)
6. [IO Plugins (5)](#io-plugins)
7. [Miscellaneous (7)](#miscellaneous)
8. [Sidechain Routing (9)](#sidechain-routing)
9. [Input Monitoring (7)](#input-monitoring)
10. [Rec-Safe (5)](#rec-safe)
11. [Processor Ordering (8)](#processor-ordering)
12. [Trim Control (5)](#trim-control)
13. [Phase Control (4)](#phase-control)
14. [Pan Azimuth / Elevation / Width (8)](#pan-azimuth--elevation--width)
15. [Plugin Latency (6)](#plugin-latency)
16. [Send Pre/Post (8)](#send-prepost)
17. [Aux Bus Management (8)](#aux-bus-management)
18. [MIDI Clock (6)](#midi-clock)
19. [MTC (6)](#mtc)
20. [LTC (8)](#ltc)
21. [Direct Outputs (7)](#direct-outputs)
22. [Solo Isolate / Safe (8)](#solo-isolate--safe)
23. [Track Templates (8)](#track-templates)
24. [Loop / Range Editing (8)](#loop--range-editing)
25. [Internal Routing (8)](#internal-routing)
26. [Auto-Connect (6)](#auto-connect)
27. [Click Track (7)](#click-track)
28. [Routing Ext Bonus (8)](#routing-ext-bonus)
29. [Command Metadata & Validation (10)](#command-metadata--validation)
30. [Transactional Execution (10)](#transactional-execution)
31. [Invariant Checks & Guards (15)](#invariant-checks--guards)
32. [Simulate: Region (15)](#simulate-region)
33. [Simulate: Track (10)](#simulate-track)
34. [Simulate: Routing (10)](#simulate-routing)
35. [Simulate: Export (10)](#simulate-export)
36. [Simulate: Session (15)](#simulate-session)
37. [Simulate: Additional (5)](#simulate-additional)

---

## Trigger / Clip Launcher

Source: `dawflow_commands_triggers.cc` (commands 1-25)

#### `daw.trigger.get_triggerbox_info`
Get triggerbox info for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| data_type | string | "audio" or "midi" |
| num_slots | int | Default triggers per box |
| order | int | TriggerBox order |
| empty | bool | Whether box has no content |
| record_enabled | bool | Whether box recording is enabled |
| currently_playing | int/null | Index of currently playing slot |

---

#### `daw.trigger.get_all_slots`
Get all trigger slots across all tracks with state.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| slots | array | Array of slot objects (see get_slot_info) with track_name added |
| count | int | Total slot count |

---

#### `daw.trigger.get_slot_info`
Get properties of a specific trigger slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| name | string | Slot name |
| state | string | "stopped", "running", "waiting_to_start", etc. |
| active | bool | Whether slot is active |
| playable | bool | Whether slot can play |
| armed | bool | Whether slot is armed for recording |
| launch_style | string | "oneshot", "retrigger", "gate", "toggle", "repeat" |
| gain | double | Slot gain value |
| color | uint32 | Slot color (RGBA) |
| stretch_mode | string | "crisp", "mixed", "smooth" |
| follow_count | int | Follow count |
| cue_isolated | bool | Whether slot is cue-isolated |
| legato | bool | Whether legato mode is on |
| follow_action0 | string | Follow action type for action 0 |
| follow_action1 | string | Follow action type for action 1 |
| follow_action_probability | int | Probability for follow action selection |
| quantization | object | {bars, beats, ticks} |
| region_id | string/null | Assigned region ID |
| region_name | string/null | Assigned region name |

---

#### `daw.trigger.bang`
Launch a trigger.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| velocity | float | no | 1.0 | Launch velocity |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |

---

#### `daw.trigger.unbang`
Stop a trigger.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |

---

#### `daw.trigger.stop_all`
Stop all triggers globally.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| stopped | int | Number of trigger boxes stopped |

---

#### `daw.trigger.stop_track`
Stop all triggers on a specific track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |

---

#### `daw.trigger.set_region`
Assign a region to a trigger slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| region_id | string | yes | — | Region ID to assign |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| region_name | string | Name of assigned region |

---

#### `daw.trigger.clear_slot`
Clear a trigger slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |

---

#### `daw.trigger.set_follow_action`
Set follow action for a slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| action | string | yes | — | "none","stop","again","forward","reverse","first","last","jump" |
| which | int | no | 0 | 0 or 1 (follow action index) |
| probability | int | no | — | Probability (0-100) for follow action selection |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| action | string | Action set |
| which | int | Which follow action |

---

#### `daw.trigger.get_follow_action`
Get follow action for a slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| follow_action0 | string | Follow action 0 type |
| follow_action1 | string | Follow action 1 type |
| probability | int | Follow action probability |

---

#### `daw.trigger.set_launch_style`
Set launch style.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| style | string | yes | — | "oneshot","retrigger","gate","toggle","repeat" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| style | string | Style set |

---

#### `daw.trigger.get_launch_style`
Get launch style.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| style | string | Current launch style |

---

#### `daw.trigger.set_quantization`
Set launch quantization.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| bars | int | no | 1 | Bar quantization |
| beats | int | no | 0 | Beat quantization |
| ticks | int | no | 0 | Tick quantization |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| quantization | object | {bars, beats, ticks} |

---

#### `daw.trigger.get_quantization`
Get launch quantization.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| quantization | object | {bars, beats, ticks} |

---

#### `daw.trigger.set_gain`
Set trigger gain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| gain | double | yes | — | Gain value (linear) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| gain | double | Gain set |

---

#### `daw.trigger.get_gain`
Get trigger gain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| gain | double | Current gain |

---

#### `daw.trigger.set_color`
Set trigger slot color.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| color | uint32 | yes | — | RGBA color value |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| color | uint32 | Color set |

---

#### `daw.trigger.set_name`
Set trigger slot name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| name | string | yes | — | New name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| name | string | Name set |

---

#### `daw.trigger.set_stretch_mode`
Set time stretch mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| mode | string | yes | — | "crisp", "mixed", "smooth" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| mode | string | Mode set |

---

#### `daw.trigger.get_stretch_mode`
Get stretch mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| mode | string | Current stretch mode |

---

#### `daw.trigger.set_follow_count`
Set follow count.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
| count | uint32 | yes | — | Number of repeats before follow action |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| count | uint32 | Count set |

---

#### `daw.trigger.is_active`
Check if a trigger is currently playing.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| track_id | string | Track ID |
| slot_index | int | Slot index |
| active | bool | Whether trigger is active |
| state | string | Current trigger state |

---

#### `daw.trigger.get_active_triggers`
List all currently active triggers.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| active_triggers | array | Array of {track_id, track_name, slot_index, name, state, position} |
| count | int | Number of active triggers |

---

#### `daw.trigger.arm_slot`
Arm a slot for recording.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| slot_index | int | yes | — | Slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| track_id | string | Track ID |
| slot_index | int | Slot index |
| armed | bool | Armed state after operation |

---

## Mixer Scenes

Source: `dawflow_commands_triggers.cc` (commands 26-35)

#### `daw.mixer_scene.list`
List all mixer scenes with names.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scenes | array | Array of {index, name, empty, stored} |
| count | int | Total scene slots |

---

#### `daw.mixer_scene.store`
Store current mix to a scene slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |

---

#### `daw.mixer_scene.recall`
Recall/apply a mixer scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| applied | bool | Whether scene was applied |

---

#### `daw.mixer_scene.clear`
Clear a mixer scene slot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |

---

#### `daw.mixer_scene.rename`
Rename a scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
| name | string | yes | — | New name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| name | string | New name |

---

#### `daw.mixer_scene.get_info`
Get detailed info about a scene.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| index | int | Scene index |
| name | string | Scene name |
| empty | bool | Whether scene is empty |
| stored | bool | Whether scene has content |

---

#### `daw.mixer_scene.get_count`
Get number of available scene slots.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| count | int | Total scene slots |
| stored_count | int | Number of stored scenes |

---

#### `daw.mixer_scene.is_stored`
Check if a scene slot has content.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| index | int | Scene index |
| stored | bool | Whether scene is stored |

---

#### `daw.mixer_scene.apply_to_routes`
Apply scene to specific routes only.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
| route_ids | string[] | yes | — | Array of route IDs to apply to |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| applied | bool | Whether scene was applied |
| route_count | int | Number of routes applied to |

---

#### `daw.mixer_scene.store_from_routes`
Store scene from specific routes only. Note: stores full scene (per-route selective store requires engine extension).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| index | int | yes | — | Scene slot index |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| index | int | Scene index |
| note | string | Implementation note |

---

## Region FX

Source: `dawflow_commands_triggers.cc` (commands 36-45)

#### `daw.region_fx.list`
List all region FX on a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| plugins | array | Array of {id, name, type, latency, tailtime} |
| count | int | Number of region FX |

---

#### `daw.region_fx.add`
Add a plugin as region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_uri | string | no | "" | Plugin URI (unique ID) |
| plugin_name | string | no | "" | Plugin name (alternative to URI) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| region_id | string | Region ID |
| plugin_id | string | New region FX ID |
| plugin_name | string | Plugin name |

---

#### `daw.region_fx.remove`
Remove a region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| region_id | string | Region ID |
| plugin_id | string | Removed plugin ID |

---

#### `daw.region_fx.enable`
Enable a region FX (note: region FX are always active when present).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | true |
| note | string | Explanation that region FX are always active |

---

#### `daw.region_fx.disable`
Disable/bypass a region FX (note: not supported, remove to disable).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | true |
| note | string | Explanation that bypass is not supported |

---

#### `daw.region_fx.get_parameters`
Get parameters of a region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| plugin_id | string | Plugin ID |
| parameters | array | Array of {index, name, value, min, max, default} |
| count | int | Number of parameters |

---

#### `daw.region_fx.set_parameter`
Set a parameter on a region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
| param_index | uint32 | yes | — | Parameter index |
| value | double | yes | — | New value |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| region_id | string | Region ID |
| plugin_id | string | Plugin ID |
| param_index | uint32 | Parameter index |
| value | double | Value set |

---

#### `daw.region_fx.get_info`
Get info about a specific region FX.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| plugin_id | string | yes | — | Region FX plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| plugin_id | string | Plugin ID |
| name | string | Plugin name |
| type | int | Plugin type enum |
| latency | int64 | Signal latency (samples) |
| tailtime | int64 | Signal tail time (samples) |
| input_streams | int | Audio input stream count |
| output_streams | int | Audio output stream count |

---

#### `daw.region_fx.reorder`
Reorder region FX chain (stub: not yet implemented).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| error | string | "not_yet_implemented" |
| note | string | Workaround suggestion |

---

#### `daw.region_fx.get_latency`
Get total region FX latency.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| region_id | string | Region ID |
| total_latency | int64 | Total latency (samples) |
| n_region_fx | int | Number of region FX |

---

## Lua Scripting Bridge

Source: `dawflow_commands_triggers.cc` (commands 46-53)

#### `daw.lua.run`
Execute Lua code in session context (stub: not yet implemented).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| code | string | yes | — | Lua code to execute |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| error | string | "not_yet_implemented" |
| code_length | int | Length of submitted code |

---

#### `daw.lua.list_action_scripts`
List registered action scripts.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scripts | array | Array of {name, path, unique_id, author, description, category} |
| count | int | Number of scripts |

---

#### `daw.lua.list_session_scripts`
List session scripts.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scripts | array | Array of {name} |
| count | int | Number of scripts |

---

#### `daw.lua.run_action_script`
Run a numbered action script (stub: not yet implemented).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| slot | int | no | -1 | Script slot number (1-9) |
| name | string | no | "" | Script name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| error | string | "not_yet_implemented" |

---

#### `daw.lua.add_session_script`
Add a Lua session script.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Script name |
| code | string | yes | — | Lua source code |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| name | string | Script name |
| count | int | Total registered script count |

---

#### `daw.lua.remove_session_script`
Remove a session script.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Script name to remove |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| name | string | Script name |
| count | int | Remaining script count |

---

#### `daw.lua.get_script_info`
Get info about a script by name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Script name |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| name | string | Script name |
| path | string | File path |
| unique_id | string | Unique identifier |
| type | string | Script type |
| author | string | Author |
| license | string | License |
| category | string | Category |
| description | string | Description |

---

#### `daw.lua.list_available_scripts`
List available Lua scripts from search paths.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | string | no | "" | Filter by type ("all", "DSP", "Session", "EditorHook", "EditorAction", "Snippet", "SessionInit") |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| scripts | array | Array of {name, path, unique_id, type, author, category, description} |
| count | int | Number of scripts |
| search_dir | string | User script directory |

---

## Editor State Bridge

Source: `dawflow_commands_triggers.cc` (commands 54-68)

#### `daw.editor.get_snap_mode_v2`
Get snap mode (stub: editor-only state, not accessible from engine).
**Returns:** `{error, note}`

#### `daw.editor.set_snap_mode_v2`
Set snap mode (stub). **Returns:** `{error, note}`

#### `daw.editor.get_grid_type`
Get grid type (stub). **Returns:** `{error, note}`

#### `daw.editor.set_grid_type`
Set grid type (stub). **Returns:** `{error, note}`

#### `daw.editor.get_edit_point`
Get edit point (stub). **Returns:** `{error, note}`

#### `daw.editor.set_edit_point`
Set edit point (stub). **Returns:** `{error, note}`

#### `daw.editor.get_ripple_mode`
Get ripple mode (accessible via RCConfiguration).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ripple_mode | string | "selected", "all", or "interview" |

---

#### `daw.editor.set_ripple_mode`
Set ripple mode.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| mode | string | yes | — | "selected", "all", or "interview" |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| ripple_mode | string | Mode set |

---

#### `daw.editor.get_draw_length`
Get draw length (stub). **Returns:** `{error, note}`

#### `daw.editor.set_draw_length`
Set draw length (stub). **Returns:** `{error, note}`

#### `daw.editor.get_draw_velocity`
Get draw velocity (stub). **Returns:** `{error, note}`

#### `daw.editor.set_draw_velocity`
Set draw velocity (stub). **Returns:** `{error, note}`

#### `daw.editor.get_zoom_focus`
Get zoom focus (stub). **Returns:** `{error, note}`

#### `daw.editor.set_zoom_focus`
Set zoom focus (stub). **Returns:** `{error, note}`

#### `daw.editor.get_mouse_mode`
Get mouse mode (stub). **Returns:** `{error, note}`

---

## IO Plugins

Source: `dawflow_commands_triggers.cc` (commands 69-73)

#### `daw.io_plugin.list`
List I/O plugins.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| *(none)* | — | — | — | — |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| io_plugins | array | Array of {id, name, is_pre, type, latency, plugin_name, plugin_uri} |
| count | int | Number of IO plugins |

---

#### `daw.io_plugin.add`
Add an I/O plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_uri | string | no | "" | Plugin URI |
| plugin_name | string | no | "" | Plugin name |
| is_pre | bool | no | true | Pre-processing (true) or post-processing (false) |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| id | string | New IO plugin ID |
| name | string | IO plugin name |
| plugin_name | string | Plugin name |
| is_pre | bool | Pre/post flag |

---

#### `daw.io_plugin.remove`
Remove an I/O plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_id | string | yes | — | IO plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | Success |
| plugin_id | string | Removed plugin ID |

---

#### `daw.io_plugin.enable`
Enable an I/O plugin (note: always active when loaded).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_id | string | yes | — | IO plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| ok | bool | true |
| note | string | Explanation |

---

#### `daw.io_plugin.get_parameters`
Get parameters of an I/O plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| plugin_id | string | yes | — | IO plugin ID |
**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| plugin_id | string | Plugin ID |
| parameters | array | Array of {index, name, value, min, max, default} |
| count | int | Number of parameters |

---

## Miscellaneous

Source: `dawflow_commands_triggers.cc` (commands 74-80)

#### `daw.archive_session`
Archive session to zip.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| output_path | string | yes | — | Output file path |
| name | string | no | session name | Archive name |
| only_used_sources | bool | no | false | Only include used sources |
**Returns:** `{ok, output_path, name, error_code?}`

#### `daw.get_control_surfaces`
List control surfaces.
**Returns:** `{control_surfaces: [{name, path, active, requested, automatic}], count}`

#### `daw.get_io_plugins`
Alias for `daw.io_plugin.list`.
**Returns:** `{io_plugins: [{id, name, is_pre, type}], count}`

#### `daw.crossfade.create`
Create crossfade between adjacent regions (stub: use region overlap instead).
**Returns:** `{error, note}`

#### `daw.crossfade.get_info`
Get crossfade details (stub).
**Returns:** `{error, note}`

#### `daw.session.cleanup`
Clean up session (remove unused files).
**Returns:** `{ok, space_freed, removed_files, removed_count}`

#### `daw.session.cleanup_peakfiles`
Clean up peak files.
**Returns:** `{ok, error_code?, note?}`

---

## Sidechain Routing

Source: `dawflow_commands_sidechain.cc` (commands 1-9)

#### `daw.sidechain.add`
Add a sidechain to a plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
| n_audio | uint32 | no | 1 | Number of audio sidechain channels |
| n_midi | uint32 | no | 0 | Number of MIDI sidechain channels |
**Returns:** `{success, has_sidechain}`

#### `daw.sidechain.remove`
Remove a sidechain from a plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{success, has_sidechain}`

#### `daw.sidechain.has`
Check if a plugin has a sidechain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain}`

#### `daw.sidechain.get_input`
Get sidechain input port connections.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain, connections: [{port, connected_to}]}`

#### `daw.sidechain.connect`
Connect a source port to sidechain input.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
| source_port | string | yes | — | Source port name |
| port_index | uint32 | no | 0 | Sidechain input port index |
**Returns:** `{success}`

#### `daw.sidechain.disconnect`
Disconnect all sidechain inputs.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{success, disconnected}`

#### `daw.sidechain.get_info`
Get sidechain channel count and connections.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain, sidechain_pins_audio, sidechain_pins_midi, sidechain_ports_audio, sidechain_ports_midi, n_audio, n_midi, n_total, connections: [{port_name, port_index, connections}]}`

#### `daw.sidechain.list_available_sources`
List ports that could feed sidechain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{has_sidechain, audio_sources, midi_sources, audio_count, midi_count}`

#### `daw.sidechain.get_all`
List all plugins with sidechains on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, plugins: [{processor_id, name, index, n_audio, n_midi}], count}`

---

## Input Monitoring

Source: `dawflow_commands_sidechain.cc` (commands 10-16)

#### `daw.monitoring.get_mode`
Get monitoring mode for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, mode, value}`

#### `daw.monitoring.set_mode`
Set monitoring mode for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| mode | string | yes | — | "auto", "input", "disk", "cue" |
**Returns:** `{success, track_id, mode}`

#### `daw.monitoring.get_all`
List monitoring modes for all tracks.
**Returns:** `{tracks: [{track_id, name, mode, value}], count}`

#### `daw.monitoring.set_all`
Set monitoring mode for all tracks.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| mode | string | yes | — | "auto", "input", "disk", "cue" |
**Returns:** `{success, mode, tracks_updated}`

#### `daw.monitoring.get_available_modes`
List available monitoring modes.
**Returns:** `{modes: [{name, value, description}]}`

#### `daw.monitoring.is_monitoring_input`
Check if a track is monitoring input.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, monitoring_input}`

#### `daw.monitoring.is_monitoring_disk`
Check if a track is monitoring disk.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, monitoring_disk}`

---

## Rec-Safe

Source: `dawflow_commands_sidechain.cc` (commands 17-21)

#### `daw.rec_safe.set`
Set rec-safe state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| safe | bool | yes | — | Rec-safe state |
**Returns:** `{success, track_id, safe}`

#### `daw.rec_safe.get`
Get rec-safe state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{track_id, safe}`

#### `daw.rec_safe.set_all`
Set rec-safe state for all tracks.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| safe | bool | yes | — | Rec-safe state |
**Returns:** `{success, safe, tracks_updated}`

#### `daw.rec_safe.get_all`
List rec-safe state for all tracks.
**Returns:** `{tracks: [{track_id, name, safe}], count}`

#### `daw.rec_safe.toggle`
Toggle rec-safe state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{success, track_id, safe}`

---

## Processor Ordering

Source: `dawflow_commands_sidechain.cc` (commands 22-29)

#### `daw.processor.get_at_index`
Get processor info at a position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| index | int | yes | — | Processor index |
**Returns:** `{id, name, active, type, index}`

#### `daw.processor.get_count`
Count processors on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, count}`

#### `daw.processor.move_to_index`
Move a processor to a new index position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Processor ID |
| new_index | int | yes | — | Target index |
**Returns:** `{success, old_index, new_index}`

#### `daw.processor.insert_at_index`
Insert a plugin at a position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| plugin_uri | string | yes | — | Plugin URI or name |
| index | int | yes | — | Target index |
**Returns:** `{success, processor_id, index}`

#### `daw.processor.replace`
Replace a processor with a new plugin.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Processor to replace |
| new_plugin_uri | string | yes | — | New plugin URI or name |
**Returns:** `{success, old_processor_id, new_processor_id}`

#### `daw.processor.get_all_ordered`
Full ordered list with types/names/active.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, processors: [{id, name, active, type, index}], count}`

#### `daw.processor.swap`
Swap two processors by index.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| index_a | int | yes | — | First processor index |
| index_b | int | yes | — | Second processor index |
**Returns:** `{success, index_a, index_b}`

#### `daw.processor.get_type`
Get type of a processor.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Processor ID |
**Returns:** `{processor_id, name, type, active}`

---

## Trim Control

Source: `dawflow_commands_sidechain.cc` (commands 30-34)

#### `daw.trim.get`
Get trim value for a track in dB.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, trim_gain, trim_db}`

#### `daw.trim.set`
Set trim value for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| trim_db | double | yes | — | Trim in dB |
**Returns:** `{success, track_id, trim_db, trim_gain}`

#### `daw.trim.get_all`
Get trim values for all tracks.
**Returns:** `{tracks: [{track_id, name, trim_gain, trim_db}], count}`

#### `daw.trim.reset`
Reset trim to 0 dB for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, trim_db}`

#### `daw.trim.reset_all`
Reset trim to 0 dB for all tracks.
**Returns:** `{success, tracks_reset}`

---

## Phase Control

Source: `dawflow_commands_sidechain.cc` (commands 35-38)

#### `daw.phase.get`
Get phase inversion state for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, channels: [{channel, inverted}], channel_count, any_inverted}`

#### `daw.phase.set`
Set phase inversion per channel.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| channel | uint32 | yes | — | Channel index |
| inverted | bool | yes | — | Inversion state |
**Returns:** `{success, track_id, channel, inverted}`

#### `daw.phase.invert_all`
Invert all channels on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, channels_inverted}`

#### `daw.phase.reset`
Reset phase to normal (no inversion) for a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, channels_reset}`

---

## Pan Azimuth / Elevation / Width

Source: `dawflow_commands_sidechain.cc` (commands 39-46)

#### `daw.pan.get_azimuth`
Get pan azimuth (L-R position, 0=left, 0.5=center, 1=right).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, azimuth}`

#### `daw.pan.set_azimuth`
Set pan azimuth.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| value | double | yes | — | 0.0-1.0 |
**Returns:** `{success, track_id, azimuth}`

#### `daw.pan.get_elevation`
Get pan elevation.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, elevation, note?}`

#### `daw.pan.set_elevation`
Set pan elevation (requires surround or VBAP panner).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| value | double | yes | — | Elevation value |
**Returns:** `{success, track_id, elevation}`

#### `daw.pan.get_width`
Get pan width (stereo spread).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, width, note?}`

#### `daw.pan.set_width`
Set pan width (requires stereo or wider panner).
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| value | double | yes | — | Width value |
**Returns:** `{success, track_id, width}`

#### `daw.pan.get_full_state`
Get all pan parameters at once.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, azimuth, elevation, width, frontback, has_azimuth, has_elevation, has_width, has_frontback}`

#### `daw.pan.reset`
Reset pan to center/default.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{success, track_id, controls_reset}`

---

## Plugin Latency

Source: `dawflow_commands_sidechain.cc` (commands 47-52)

#### `daw.plugin_latency.get`
Get a plugin's reported latency.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{processor_id, signal_latency, effective_latency, user_latency}`

#### `daw.plugin_latency.get_user_override`
Get manual latency override.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{processor_id, user_latency, has_override}`

#### `daw.plugin_latency.set_user_override`
Set manual latency override.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
| samples | int64 | yes | — | Latency in samples |
**Returns:** `{success, processor_id, user_latency}`

#### `daw.plugin_latency.clear_override`
Clear manual latency override.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
| processor_id | string | yes | — | Plugin insert ID |
**Returns:** `{success, processor_id, signal_latency, effective_latency}`

#### `daw.plugin_latency.get_signal_latency`
Total signal latency of a route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, signal_latency}`

#### `daw.plugin_latency.get_chain_latency`
Per-processor latency chain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, chain: [{index, id, name, type, signal_latency, effective_latency, user_latency, cumulative_latency}], processor_count, total_chain_latency, route_signal_latency}`

---

## Send Pre/Post

Source: `dawflow_commands_routing_ext.cc` (commands 1-8)

#### `daw.send.get_pre_fader`
Check if a send is pre-fader. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, pre_fader}`.

#### `daw.send.set_pre_fader`
Set send pre/post fader. Params: `track_id`, `send_index`, `pre_fader`. Returns: `{status, pre_fader}`.

#### `daw.send.get_target`
Get internal send target route. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, target_id, target_name}`.

#### `daw.send.get_all_details`
Get all sends with details. Params: `track_id`. Returns: `{track_id, sends: [{index, name, id, enabled, role, level_db, pre_fader, target_id?, target_name?}], count}`.

#### `daw.send.create_aux`
Create an aux send to a bus. Params: `track_id`, `bus_id`, `pre_fader` (default: true). Returns: `{status, track_id, bus_id, pre_fader}`.

#### `daw.send.get_level_db`
Get send level in dB. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, level_db}`.

#### `daw.send.set_level_db`
Set send level in dB. Params: `track_id`, `send_index`, `level_db`. Returns: `{status, level_db}`.

#### `daw.send.get_pan`
Get send panner info. Params: `track_id`, `send_index`. Returns: `{track_id, send_index, has_panner, panner_linked?}`.

---

## Aux Bus Management

Source: `dawflow_commands_routing_ext.cc` (commands 9-16)

#### `daw.aux.create_bus`
Create an aux bus. Params: `name`, `channels` (default: 2). Returns: `{status, bus_id, name, channels}`.

#### `daw.aux.delete_bus`
Delete an aux bus. Params: `bus_id`. Returns: `{status}`.

#### `daw.aux.list_buses`
List all buses. Returns: `{buses: [{id, name, inputs, outputs, muted, soloed}], count}`.

#### `daw.aux.get_sends_to`
Get all sends targeting a bus. Params: `bus_id`. Returns: `{bus_id, bus_name, senders: [{track_id, track_name, send_index, send_id, level_db, enabled}], count}`.

#### `daw.aux.add_send_from`
Add a send from a track to a bus. Params: `bus_id`, `track_id`, `pre_fader` (default: true). Returns: `{status, bus_id, track_id}`.

#### `daw.aux.remove_send_from`
Remove a send from a track to a bus. Params: `bus_id`, `track_id`. Returns: `{status}`.

#### `daw.aux.get_bus_info`
Get detailed bus info. Params: `bus_id`. Returns: `{id, name, inputs, outputs, muted, soloed, gain_db, sends, send_count, plugin_count}`.

#### `daw.aux.set_bus_gain`
Set bus gain. Params: `bus_id`, `gain_db`. Returns: `{status, gain_db}`.

---

## MIDI Clock

Source: `dawflow_commands_routing_ext.cc` (commands 17-22)

#### `daw.midi_clock.get_enabled`
Returns: `{enabled}`.

#### `daw.midi_clock.set_enabled`
Params: `enabled`. Returns: `{status, enabled}`.

#### `daw.midi_clock.get_port`
Returns: `{port_name, pretty_name, connected}`.

#### `daw.midi_clock.set_port`
Params: `port_name`. Returns: `{status, note, port_name}`.

#### `daw.midi_clock.get_state`
Returns: `{enabled, sets_tempo, resolution, port_name, port_connected}`.

#### `daw.midi_clock.is_synced`
Returns: `{synced, master_type?, master_name?, locked?}`.

---

## MTC

Source: `dawflow_commands_routing_ext.cc` (commands 23-28)

#### `daw.mtc.get_enabled`
Returns: `{enabled}`.

#### `daw.mtc.set_enabled`
Params: `enabled`. Returns: `{status, enabled}`.

#### `daw.mtc.get_port`
Returns: `{port_name, pretty_name, connected}`.

#### `daw.mtc.set_port`
Params: `port_name`. Returns: `{status, note, port_name}`.

#### `daw.mtc.get_state`
Returns: `{enabled, port_name, port_connected}`.

#### `daw.mtc.get_offset`
Returns: `{enabled, timecode_offset, timecode_offset_negative}`.

---

## LTC

Source: `dawflow_commands_routing_ext.cc` (commands 29-36)

#### `daw.ltc.get_send_enabled` / `daw.ltc.set_send_enabled`
Get/set LTC send. Returns/Params: `{enabled}`.

#### `daw.ltc.get_volume` / `daw.ltc.set_volume`
Get/set LTC output volume. Returns: `{volume, volume_db}`. Params: `volume`.

#### `daw.ltc.get_port` / `daw.ltc.set_port`
Get/set LTC output port. Returns: `{port_name}`. Params: `port_name`.

#### `daw.ltc.get_state`
Returns: `{enabled, volume, volume_db, port_name, port_connected}`.

#### `daw.ltc.get_generator_state`
Returns: `{enabled, port_name, port_exists, port_connected, volume, running}`.

---

## Direct Outputs

Source: `dawflow_commands_routing_ext.cc` (commands 37-43)

#### `daw.direct_out.get`
Get direct output info. Params: `track_id`. Returns: `{track_id, has_direct_out, connections: [{port, connected}]}`.

#### `daw.direct_out.enable` / `daw.direct_out.disable`
Enable/disable direct outputs. Params: `track_id`. Returns: `{status}`.

#### `daw.direct_out.is_enabled`
Params: `track_id`. Returns: `{track_id, exists, enabled}`.

#### `daw.direct_out.set_pre_fader`
Params: `track_id`, `pre_fader`. Returns: `{status, track_id, pre_fader, note}`.

#### `daw.direct_out.get_connection`
Params: `track_id`. Returns: `{track_id, connections}`.

#### `daw.direct_out.set_connection`
Params: `track_id`, `port_name`. Returns: `{status, port_name}`.

---

## Solo Isolate / Safe

Source: `dawflow_commands_routing_ext.cc` (commands 44-51)

#### `daw.solo_isolate.get` / `daw.solo_isolate.set` / `daw.solo_isolate.toggle`
Get/set/toggle solo isolate. Params: `track_id`, `isolated` (for set). Returns: `{track_id, isolated}` or `{status, isolated}`.

#### `daw.solo_isolate.get_all`
Returns: `{tracks: [{id, name, isolated}], count}`.

#### `daw.solo_safe.get` / `daw.solo_safe.set` / `daw.solo_safe.toggle`
Get/set/toggle solo safe. Params: `track_id`, `safe` (for set). Returns: `{track_id, safe}` or `{status, safe}`.

#### `daw.solo_safe.get_all`
Returns: `{tracks: [{id, name, safe}], count}`.

---

## Track Templates

Source: `dawflow_commands_routing_ext.cc` (commands 52-59)

#### `daw.track_template.list`
Returns: `{templates: [{name, path}], count}`.

#### `daw.track_template.save`
Params: `track_id`, `name`, `description` (optional). Returns: `{status, name, path}`.

#### `daw.track_template.load`
Params: `template_name`. Returns: `{status, track_id, track_name}`.

#### `daw.track_template.delete`
Params: `template_name`. Returns: `{status, deleted}`.

#### `daw.track_template.rename`
Params: `old_name`, `new_name`. Returns: `{status, old_name, new_name, new_path}`.

#### `daw.track_template.get_info`
Params: `template_name`. Returns: `{name, path, description, modified_with}`.

#### `daw.track_template.get_path`
Params: `template_name`. Returns: `{name, path}`.

#### `daw.track_template.list_with_details`
Returns: `{templates: [{name, path, description, modified_with}], count}`.

---

## Loop / Range Editing

Source: `dawflow_commands_routing_ext.cc` (commands 60-67)

#### `daw.range.get_active`
Returns: `{loop_start?, loop_end?, loop_enabled?, punch_start?, punch_end?, session_start?, session_end?}`.

#### `daw.range.set`
Create a range marker. Params: `start`, `end`. Returns: `{status, name, start, end}`.

#### `daw.range.play`
Play a range. Params: `start` (optional), `end` (optional). Falls back to loop range. Returns: `{status}`.

#### `daw.range.export`
Export a range (stub). Params: `start`, `end`, `format` (default: "wav"). Returns: `{status, start, end, format, note}`.

#### `daw.range.bounce`
Bounce a range to a new region. Params: `track_id`, `start`, `end`. Returns: `{status, region_name?, region_id?}`.

#### `daw.range.select`
Set selection range (uses loop location). Params: `start`, `end`. Returns: `{status, start, end}`.

#### `daw.range.get_selection`
Returns: `{has_selection, start?, end?, length?}`.

#### `daw.range.clear_selection`
Disable loop. Returns: `{status}`.

---

## Internal Routing

Source: `dawflow_commands_routing_ext.cc` (commands 68-75)

#### `daw.internal_send.add`
Params: `source_track_id`, `dest_track_id`, `pre_fader` (default: true). Returns: `{status, source_track_id, dest_track_id, pre_fader}`.

#### `daw.internal_send.remove`
Params: `source_track_id`, `send_id`. Returns: `{status}`.

#### `daw.internal_send.list`
Params: `track_id`. Returns: `{track_id, internal_sends: [{index, id, name, active, target_id, target_name, level_db, role, pre_fader}], count}`.

#### `daw.internal_send.get_target`
Params: `track_id`, `send_id`. Returns: `{status, target_id, target_name}`.

#### `daw.internal_send.set_level`
Params: `track_id`, `send_id`, `level_db`. Returns: `{status, level_db}`.

#### `daw.internal_send.set_enable`
Params: `track_id`, `send_id`, `enabled`. Returns: `{status, enabled}`.

#### `daw.internal_send.get_latency`
Params: `track_id`, `send_id`. Returns: `{status, delay_in, delay_out, signal_latency}`.

#### `daw.internal_send.get_all_routes`
Returns: `{connections: [{source_id, source_name, send_id, send_index, target_id, target_name, active, role, level_db}], count}`.

---

## Auto-Connect

Source: `dawflow_commands_routing_ext.cc` (commands 76-81)

#### `daw.auto_connect.get_input_policy` / `daw.auto_connect.set_input_policy`
Get/set input auto-connect policy. Params: `policy` ("manual", "physical", "master"). Returns: `{policy, policy_name}`.

#### `daw.auto_connect.get_output_policy` / `daw.auto_connect.set_output_policy`
Get/set output auto-connect policy. Same params/returns as input.

#### `daw.auto_connect.trigger_reconnect`
Trigger the auto-connect thread. Returns: `{status, note}`.

#### `daw.auto_connect.get_state`
Returns: `{input_policy, output_policy, input_policy_name, output_policy_name}`.

---

## Click Track

Source: `dawflow_commands_routing_ext.cc` (commands 82-88)

#### `daw.click.get_emphasis_gain` / `daw.click.set_emphasis_gain`
Get/set click emphasis gain. Params: `gain_db`. Returns: `{gain, gain_db, use_emphasis}`.

#### `daw.click.get_regular_gain` / `daw.click.set_regular_gain`
Get/set regular click gain. Params: `gain_db`. Returns: `{gain, gain_db}`.

#### `daw.click.get_record_only` / `daw.click.set_record_only`
Get/set click record-only mode. Params: `record_only`. Returns: `{record_only}`.

#### `daw.click.get_full_state`
Returns: `{gain, gain_db, record_only, use_emphasis, emphasis_sound, session_click_gain?, session_click_gain_db?}`.

---

## Routing Ext Bonus

Source: `dawflow_commands_routing_ext.cc` (commands 89-96)

#### `daw.send.set_pan`
Set send pan. Params: `track_id`, `send_index`, `pan`. Returns: `{status, send_index, pan, note}`.

#### `daw.aux.set_bus_mute`
Mute/unmute aux bus. Params: `bus_id`, `mute`. Returns: `{status, mute}`.

#### `daw.aux.set_bus_solo`
Solo/unsolo aux bus. Params: `bus_id`, `solo`. Returns: `{status, solo}`.

#### `daw.internal_send.set_pan`
Set internal send pan. Params: `track_id`, `send_id`, `pan`. Returns: `{status, pan}`.

#### `daw.ltc.set_send_continuously`
Enable continuous LTC send. Params: `enabled`. Returns: `{status, enabled, note}`.

#### `daw.midi_clock.set_tempo_from_clock`
Toggle midi clock sets tempo. Params: `enabled`. Returns: `{status, enabled}`.

#### `daw.midi_clock.get_resolution`
Get MIDI clock resolution. Returns: `{resolution}`.

#### `daw.click.set_emphasis_enabled`
Enable/disable click emphasis. Params: `enabled`. Returns: `{status, enabled}`.

---

## Command Metadata & Validation

Source: `dawflow_commands_safety.cc` (commands 1-10)

#### `daw.validate_params`
Check if a command exists.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name to validate |
**Returns:** `{valid, command_exists, method, error?}`

#### `daw.get_command_info`
Return info about a command.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, exists, category, is_destructive}`

#### `daw.get_command_schema`
Return JSON description of expected params.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, schema, note?}`

#### `daw.is_command_destructive`
Check if a command is destructive.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, destructive}`

#### `daw.get_destructive_commands`
List all destructive commands.
**Returns:** `{commands, count}`

#### `daw.get_read_only_commands`
List all non-destructive commands.
**Returns:** `{commands, count}`

#### `daw.get_command_categories`
Categorize all commands by namespace prefix.
**Returns:** `{categories: [{name, count, commands}]}`

#### `daw.get_command_help`
Return human-readable description for a command.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command name |
**Returns:** `{method, description}`

#### `daw.get_api_stats`
Return overall API statistics.
**Returns:** `{total_commands, destructive_count, read_only_count, categories_count, source_files}`

#### `daw.search_commands`
Search command names by substring.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | yes | — | Search substring |
**Returns:** `{query, matches, count}`

---

## Transactional Execution

Source: `dawflow_commands_safety.cc` (commands 11-20)

#### `daw.begin_transaction`
Begin a reversible command group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Transaction name (undo label) |
**Returns:** `{ok, transaction_name}`

#### `daw.commit_transaction`
Commit the current reversible command group.
**Returns:** `{ok}`

#### `daw.rollback_transaction`
Abort and undo the current transaction.
**Returns:** `{ok}`

#### `daw.execute_atomic`
Execute multiple commands as a single undo group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | yes | — | Undo group label |
| commands | array | yes | — | Array of {method, params} objects |
**Returns:** `{ok, results: [{method, result}], undo_label}`

#### `daw.execute_with_undo`
Execute a single command wrapped in an undo group.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| method | string | yes | — | Command to execute |
| params | object | yes | — | Command parameters |
| undo_label | string | yes | — | Undo label |
**Returns:** Command result + `{undo_label}`

#### `daw.get_transaction_status`
Check if we're in a transaction.
**Returns:** `{in_transaction, transaction_name}`

#### `daw.get_pending_changes_count`
Check dirty state and undo depth.
**Returns:** `{dirty, undo_depth}`

#### `daw.checkpoint`
Save session + create snapshot with auto name.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | no | auto-timestamped | Checkpoint name |
**Returns:** `{ok, checkpoint_name, timestamp}`

#### `daw.restore_checkpoint`
Restore a named snapshot.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| checkpoint_name | string | yes | — | Checkpoint name |
**Returns:** `{ok, restored}`

#### `daw.get_checkpoints`
List all snapshots as checkpoints.
**Returns:** `{checkpoints: [{name, timestamp}], count}`

---

## Invariant Checks & Guards

Source: `dawflow_commands_safety.cc` (commands 21-35)

#### `daw.can_modify_track`
Check if track can be modified.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{track_id, can_modify, reasons}`

#### `daw.can_delete_track`
Check if track can be deleted.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Returns:** `{track_id, can_delete, reasons, warnings}`

#### `daw.can_modify_region`
Check if a region can be modified.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
**Returns:** `{track_id, region_id, can_modify, reasons}`

#### `daw.can_modify_session`
Check if the session can be modified.
**Returns:** `{can_modify, reasons}`

#### `daw.check_session_health`
Run diagnostic checks on session.
**Returns:** `{healthy, issues: [{severity, category, description}]}`

#### `daw.check_route_health`
Diagnostic checks on a single route.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Route/track ID |
**Returns:** `{track_id, name, healthy, processor_count, issues: [{severity, category, description}]}`

#### `daw.get_session_locks`
Return all lock states in the session.
**Returns:** `{recording_tracks, frozen_tracks, locked_regions, exporting}`

#### `daw.get_modification_constraints`
What can't be modified right now and why.
**Returns:** `{constraints: [{object_type, object_id, reason}], count}`

#### `daw.is_session_busy`
Check if session is busy with an activity.
**Returns:** `{busy, activities}`

#### `daw.get_recording_state_detailed`
Detailed recording state.
**Returns:** `{recording, armed_tracks: [{id, name}], armed_count, capture_in_progress}`

#### `daw.is_export_in_progress`
Check export state.
**Returns:** `{exporting}`

#### `daw.get_frozen_tracks`
List all frozen tracks.
**Returns:** `{frozen_tracks: [{id, name, freeze_state, freeze_state_name}], count}`

#### `daw.get_locked_regions`
List all locked/position-locked regions.
**Returns:** `{locked_regions: [{id, name, track_id, track_name, locked, position_locked, position_samples, length_samples}], count}`

#### `daw.get_hidden_routes`
List all hidden routes.
**Returns:** `{hidden_routes: [{id, name, is_master, is_monitor, is_auditioner}], count}`

#### `daw.validate_routing_integrity`
Check for feedback loops and disconnected paths.
**Returns:** `{valid, feedback_detected, issues: [{severity, category, description}], routes_checked}`

---

## Simulate: Region

Source: `dawflow_commands_simulate.cc` (commands 1-15)

All simulation commands return a standard prediction envelope:
```json
{
  "safe": true/false,
  "warnings": [...],
  "impacts": {...},
  "affected_objects": [{type, id, name, change}, ...],
  "reversible": true/false,
  "estimated_disk_impact_bytes": 0,
  "estimated_latency_change_samples": 0
}
```

#### `daw.simulate.move_region`
Predict outcome of moving a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| new_position | int64 | yes | — | New position in samples |
**Impacts:** `old_position`, `new_position`, `region_length`. Checks overlaps, session end.

#### `daw.simulate.trim_region`
Predict outcome of trimming a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| new_start | int64 | no | current start | New start in samples |
| new_end | int64 | no | current end | New end in samples |
**Impacts:** old/new start/end/length. Checks source boundaries, gaps, overlaps.

#### `daw.simulate.split_region`
Predict outcome of splitting a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| split_position | int64 | yes | — | Split point in samples |
**Impacts:** left/right region names, starts, lengths.

#### `daw.simulate.delete_regions`
Predict outcome of deleting regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_ids | string[] | yes | — | Array of region IDs |
**Impacts:** `regions_deleted`. Checks orphaned sources.

#### `daw.simulate.duplicate_region`
Predict outcome of duplicating a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| count | int | no | 1 | Number of duplicates |
| gap | int64 | no | 0 | Gap between duplicates (samples) |
**Impacts:** `duplicates`, `gap_samples`, `stride`. Checks overlaps.

#### `daw.simulate.stretch_region`
Predict outcome of time-stretching a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| new_length | int64 | yes | — | New length in samples |
**Impacts:** old/new length, stretch_ratio, quality_note. Estimates disk impact.

#### `daw.simulate.move_region_to_track`
Predict outcome of moving a region to another track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| region_id | string | yes | — | Region ID |
| source_track_id | string | yes | — | Source track |
| dest_track_id | string | yes | — | Destination track |
**Impacts:** source/dest track names, channel counts. Checks channel compatibility, overlaps.

#### `daw.simulate.consolidate_regions`
Predict outcome of consolidating regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_ids | string[] | yes | — | Array of region IDs to merge |
**Impacts:** merged start/end/length, regions_consumed. Estimates disk impact.

#### `daw.simulate.normalize_region`
Predict outcome of normalizing a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| target_db | double | no | 0.0 | Target level in dB |
**Impacts:** current_scale_db, target_db, gain_change_db. Warns on clipping.

#### `daw.simulate.reverse_region`
Predict outcome of reversing a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
**Impacts:** new_source_file, region_length, channels. Estimates disk impact.

#### `daw.simulate.fade_region`
Predict outcome of applying fades to a region.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| fade_in_length | int64 | no | 0 | Fade-in length (samples) |
| fade_out_length | int64 | no | 0 | Fade-out length (samples) |
**Impacts:** fade_in/out_length, region_length. Checks combined fade vs region length, neighbor overlaps.

#### `daw.simulate.set_region_gain`
Predict outcome of changing region gain.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| region_id | string | yes | — | Region ID |
| gain_db | double | yes | — | Gain change in dB |
**Impacts:** current_scale_db, gain_change_db, estimated_peak_db. Warns on clipping.

#### `daw.simulate.quantize_regions`
Predict outcome of quantizing regions on a track.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| grid_type | string | no | "beat" | Grid type for quantization |
**Impacts:** grid_type, regions_affected, total_regions.

#### `daw.simulate.align_regions`
Predict outcome of aligning all regions to a reference position.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
| reference_position | int64 | yes | — | Reference position (samples) |
**Impacts:** reference_position, regions_affected.

#### `daw.simulate.remove_region_gaps`
Predict outcome of removing gaps between regions.
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| track_id | string | yes | — | Track ID |
**Impacts:** gaps_found, total_gap_samples, total_gap_seconds.

---

## Simulate: Track

Source: `dawflow_commands_simulate.cc` (commands 16-25)

#### `daw.simulate.delete_tracks`
Params: `track_ids` (string[]). Checks master/monitor, counts regions/plugins/incoming sends. Sets `reversible: false`.

#### `daw.simulate.freeze_track`
Params: `track_id`. Estimates disk impact and CPU savings.

#### `daw.simulate.add_track`
Params: `type` (default: "audio"), `channels`. Predicts name, order, ports.

#### `daw.simulate.duplicate_track`
Params: `track_id`, `with_playlist` (default: true). Estimates disk usage.

#### `daw.simulate.change_track_channels`
Params: `track_id`, `new_channel_count`. Checks plugin compatibility, panner changes.

#### `daw.simulate.reorder_tracks`
Params: `track_id`, `new_position`. Reports current/new position.

#### `daw.simulate.add_plugin_to_track`
Params: `track_id`, `plugin_id` (optional). Reports current latency and plugin count.

#### `daw.simulate.remove_plugin_from_track`
Params: `track_id`, `processor_id`. Reports latency reduction.

#### `daw.simulate.set_track_monitoring`
Params: `track_id`, `monitoring_mode`. Reports signal flow description.

#### `daw.simulate.arm_track_for_record`
Params: `track_id`, `duration_seconds` (default: 60.0). Checks available disk space.

---

## Simulate: Routing

Source: `dawflow_commands_simulate.cc` (commands 26-35)

#### `daw.simulate.connect_ports`
Params: `source_port`, `dest_port`. Checks existing connection, warns about feedback.

#### `daw.simulate.disconnect_ports`
Params: `source_port`, `dest_port`. Checks if only connection (signal loss).

#### `daw.simulate.add_send`
Params: `track_id`, `dest_track_id`. Checks channel compatibility, feedback loops.

#### `daw.simulate.remove_send`
Params: `track_id`, `send_index`. Reports destination signal loss.

#### `daw.simulate.change_routing`
Params: `track_id`, `new_input` (optional), `new_output` (optional). Reports current I/O.

#### `daw.simulate.set_io_configuration`
Params: `track_id`, `inputs` (optional), `outputs` (optional). Warns on port count changes.

#### `daw.simulate.add_bus`
Params: `name` (default: "Bus"), `channels` (default: 2). Predicts name.

#### `daw.simulate.remove_bus`
Params: `bus_id`. Checks master/monitor, finds orphaned sends. Sets `reversible: false`.

#### `daw.simulate.reconnect_defaults`
Params: `track_id`. Reports connections that would change.

#### `daw.simulate.swap_plugin_order`
Params: `track_id`, `proc_id_a`, `proc_id_b`. Checks channel compatibility after swap.

---

## Simulate: Export

Source: `dawflow_commands_simulate.cc` (commands 36-45)

#### `daw.simulate.export_session`
Params: `format` (default: "wav"), `sample_rate`, `bit_depth` (default: 24). Estimates file size.

#### `daw.simulate.export_stems`
Params: `format` (default: "wav"). Lists all stems with estimated sizes.

#### `daw.simulate.export_range`
Params: `start`, `end`, `format` (default: "wav"). Estimates file size.

#### `daw.simulate.bounce_range`
Params: `track_id`, `start`, `end`. Estimates file size.

#### `daw.simulate.bounce_track`
Params: `track_id`. Estimates file size, processing time.

#### `daw.simulate.export_midi`
Params: `track_id`. Estimates note count, file size.

#### `daw.simulate.render_offline`
Params: `start` (default: 0), `end` (default: session end). Estimates render time.

#### `daw.simulate.export_with_plugins`
Params: `track_id`. Lists all plugins in chain with latencies.

#### `daw.simulate.export_channel_config`
Params: `channels` (default: master bus channels). Reports channel layout.

#### `daw.simulate.normalize_export`
Params: `target_lufs` (default: -14.0). Warns on high LUFS targets.

---

## Simulate: Session

Source: `dawflow_commands_simulate.cc` (commands 46-60)

#### `daw.simulate.cleanup_unused`
No params. Lists unused sources, estimates space freed. Sets `reversible: false`.

#### `daw.simulate.tempo_change`
Params: `new_tempo`, `position` (default: 0). Reports current tempo, affected regions.

#### `daw.simulate.time_signature_change`
Params: `numerator`, `denominator`, `position` (default: 0). Reports grid changes.

#### `daw.simulate.save_session_as`
Params: `name`, `copy_media` (default: true). Estimates disk impact.

#### `daw.simulate.delete_playlists`
Params: `playlist_names` (string[]). Reports orphaned regions. Sets `reversible: false`.

#### `daw.simulate.clear_playlist`
Params: `track_id`. Lists all regions that would be removed.

#### `daw.simulate.import_audio`
Params: `file_path`, `channels` (default: 2), `sample_rate`. Checks sample rate conversion.

#### `daw.simulate.change_sample_rate`
Params: `new_rate`. Reports files to rewrite, estimated time. Sets `safe: false`, `reversible: false`.

#### `daw.simulate.change_buffer_size`
Params: `new_size`. Reports latency in ms. Warns on extreme sizes.

#### `daw.simulate.close_session`
No params. Checks unsaved changes, rolling transport. Sets `reversible: false`.

#### `daw.simulate.undo_steps`
Params: `count`. Reports available steps, operation labels.

#### `daw.simulate.redo_steps`
Params: `count`. Reports available steps, next redo label.

#### `daw.simulate.snapshot_restore`
Params: `snapshot_name`. Checks existence, unsaved changes. Sets `reversible: false`.

#### `daw.simulate.batch_operation`
Params: `operations` (array of {method, params}). Aggregates results from sub-simulations.

#### `daw.simulate.session_merge`
Params: `other_session_path` (optional). Stub for future implementation.

---

## Simulate: Additional

Source: `dawflow_commands_simulate.cc` (commands 61-65)

#### `daw.simulate.mute_tracks`
Params: `track_ids` (string[]), `mute` (default: true). Reports current/new mute state.

#### `daw.simulate.solo_tracks`
Params: `track_ids` (string[]), `solo` (default: true). Reports tracks muted by solo.

#### `daw.simulate.set_track_gain`
Params: `track_id`, `gain_db`. Reports current/new gain, warns on high levels.

#### `daw.simulate.set_track_pan`
Params: `track_id`, `pan_position` (0.0-1.0). Reports position description, output channels.

#### `daw.simulate.set_session_tempo_map`
No params. Reports all affected audio/MIDI regions. Sets `safe: false`.
