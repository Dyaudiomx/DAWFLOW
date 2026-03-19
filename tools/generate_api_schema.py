#!/usr/bin/env python3
"""
generate_api_schema.py — Extract DAWFLOW IPC API schema from C++ source files.

Reads all engine/libs/ardour/dawflow*.cc files and extracts:
  - Command handlers (handlers["daw.*"] and _command_handlers["daw.*"])
  - Signal broadcasts (broadcast_event("daw.*", ...))
  - Parameters (required via .at(), optional via .value()/.contains())
  - Return fields (result["xxx"] = ...)

Generates docs/api-schema.json with full API documentation.

Usage:
    cd "/Users/davidyousefi/dev/DAW FLOW"
    python3 tools/generate_api_schema.py
"""

import glob
import json
import os
import re
import sys
from collections import OrderedDict
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(PROJECT_ROOT, "engine", "libs", "ardour")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "docs", "api-schema.json")

# Prefixes that mark a command as destructive
DESTRUCTIVE_PREFIXES = (
    "set_", "add_", "remove_", "delete_", "move_", "split_", "trim_",
    "duplicate_", "create", "rename", "clear", "import", "export",
    "bounce", "freeze", "unfreeze", "normalize", "reverse", "bypass",
    "enable", "disable", "toggle", "reorder", "paste", "save", "close",
    "undo", "redo", "begin_", "commit_", "rollback_", "execute_",
)

# Category classification — keyword-based approach.
# Maps keywords found anywhere in the command name to a category.
# Checked in order; first match wins. More specific rules come first.
CATEGORY_KEYWORD_RULES = [
    # --- Namespace prefixes (dotted) ---
    ("simulate.",           "simulation"),
    ("safety.",             "safety"),
    ("session.",            "session"),
    ("transport.",          "transport"),
    ("route_group.",        "route_groups"),
    ("route_group",         "route_groups"),
    ("routes.",             "routing"),
    ("route.",              "routing"),
    ("mix.",                "mixing"),
    ("plugin.",             "plugins"),
    ("plugins.",            "plugins"),
    ("playlist.",           "playlists"),
    ("location.",           "locations"),
    ("locations.",          "locations"),
    ("ports.",              "ports"),
    ("engine.",             "engine"),
    ("source.",             "sources"),
    ("record.",             "recording"),
    ("regions.",            "regions"),
    ("region.",             "regions"),
    ("track.",              "tracks"),
    ("tempo.",              "tempo"),
    ("vca.",                "vca"),
    ("marker.",             "markers"),
    ("editor.",             "editor"),

    # --- Simulation ---
    ("simulate",            "simulation"),

    # --- Transport & playback ---
    ("transport",           "transport"),
    ("playback_speed",      "transport"),
    ("playhead",            "transport"),
    ("play_range",          "transport"),
    ("play_region",         "transport"),
    ("loop_range",          "transport"),
    ("punch_range",         "transport"),
    ("toggle_loop",         "transport"),
    ("toggle_punch",        "transport"),
    ("toggle_record",       "transport"),
    ("count_in",            "transport"),
    ("set_tempo",           "transport"),
    ("time_signature",      "transport"),
    ("set_loop",            "transport"),
    ("set_punch",           "transport"),
    ("loop_enabled",        "transport"),
    ("punch_in",            "transport"),
    ("punch_out",           "transport"),
    ("pre_roll",            "transport"),
    ("post_roll",           "transport"),
    ("nudge_playhead",      "transport"),
    ("goto_",               "transport"),
    ("scroll_to",           "transport"),
    ("scroll_timeline",     "transport"),
    ("locate",              "transport"),

    # --- Session ---
    ("session",             "session"),
    ("snapshot",            "session"),
    ("new_session",         "session"),
    ("open_session",        "session"),
    ("save_as_",            "session"),
    ("save_template",       "session"),
    ("save_route_as",       "session"),
    ("rename_session",      "session"),
    ("config_",             "session"),
    ("_config",             "session"),
    ("get_build_info",      "session"),
    ("get_dawflow_version", "session"),
    ("get_ardour_version",  "session"),
    ("get_api_",            "session"),
    ("get_system_info",     "session"),
    ("get_data_dir",        "session"),
    ("get_cache_dir",       "session"),
    ("get_config_dir",      "session"),
    ("get_temp_dir",        "session"),
    ("get_template_dir",    "session"),
    ("get_interchange_dir", "session"),
    ("get_peak_dir",        "session"),
    ("recent_sessions",     "session"),
    ("is_session",          "session"),
    ("description",         "session"),
    ("metadata",            "session"),
    ("set_session_",        "session"),
    ("export_session",      "session"),

    # --- Tracks & buses ---
    ("track",               "tracks"),
    ("_bus",                "tracks"),
    ("add_bus",             "tracks"),
    ("bus_count",           "tracks"),
    ("bus_info",            "tracks"),
    ("master_bus",          "tracks"),
    ("monitor_bus",         "tracks"),
    ("route_count",         "tracks"),
    ("route_latenc",        "tracks"),
    ("route_meter",         "tracks"),
    ("hidden_route",        "tracks"),

    # --- Mixing ---
    ("gain",                "mixing"),
    ("mute",                "mixing"),
    ("solo",                "mixing"),
    ("pan",                 "mixing"),
    ("trim",                "mixing"),
    ("meter",               "mixing"),
    ("phase",               "mixing"),
    ("mid_side",            "mixing"),
    ("stereo_width",        "mixing"),
    ("stereo_corr",         "mixing"),
    ("phase_corr",          "mixing"),
    ("loudness",            "mixing"),
    ("lufs",                "mixing"),
    ("peak",                "mixing"),
    ("dsp_load",            "mixing"),
    ("cpu_load",            "mixing"),
    ("master_gain",         "mixing"),
    ("master_output",       "mixing"),
    ("master_meter",        "mixing"),
    ("master_peak",         "mixing"),
    ("master_lufs",         "mixing"),
    ("mix_state",           "mixing"),
    ("click_",              "mixing"),
    ("metronome",           "mixing"),
    ("audition",            "mixing"),

    # --- Regions ---
    ("region",              "regions"),

    # --- Plugins ---
    ("plugin",              "plugins"),
    ("processor",           "plugins"),
    ("signal_chain",        "plugins"),

    # --- Routing & I/O ---
    ("routing",             "routing"),
    ("route",               "routing"),
    ("send",                "routing"),
    ("_io_",                "routing"),
    ("connect_port",        "routing"),
    ("disconnect_port",     "routing"),
    ("connect_track",       "routing"),
    ("disconnect_track",    "routing"),
    ("connection_matrix",   "routing"),
    ("reconnect",           "routing"),
    ("group",               "route_groups"),

    # --- Automation ---
    ("automation",          "automation"),
    ("controllable",        "automation"),

    # --- MIDI ---
    ("midi",                "midi"),
    ("note",                "midi"),
    ("program_change",      "midi"),
    ("scene_change",        "midi"),

    # --- Playlists ---
    ("playlist",            "playlists"),

    # --- Markers & locations ---
    ("marker",              "markers"),
    ("location",            "locations"),
    ("cue_marker",          "markers"),

    # --- Undo / History ---
    ("undo",                "history"),
    ("redo",                "history"),
    ("history",             "history"),
    ("checkpoint",          "history"),
    ("transaction",         "history"),

    # --- Editing ---
    ("edit_mode",           "editing"),
    ("edit_point",          "editing"),
    ("grid",                "editing"),
    ("snap",                "editing"),
    ("zoom",                "editing"),
    ("ripple",              "editing"),
    ("quantize",            "editing"),
    ("humanize",            "editing"),
    ("transpose",           "editing"),
    ("consolidate",         "editing"),
    ("time_stretch",        "editing"),
    ("pitch_shift",         "editing"),
    ("insert_silence",      "editing"),
    ("insert_time",         "editing"),
    ("remove_time",         "editing"),
    ("section",             "editing"),
    ("separate_",           "editing"),
    ("strip_silence",       "editing"),
    ("detect_silence",      "editing"),
    ("fill_track",          "editing"),
    ("legato",              "editing"),
    ("retrograde",          "editing"),
    ("invert_",             "editing"),
    ("scale_midi",          "editing"),
    ("close_region_gaps",   "editing"),
    ("combine_",            "editing"),
    ("uncombine_",          "editing"),
    ("shuffle_",            "editing"),
    ("slip_",               "editing"),
    ("align_",              "editing"),
    ("mouse_mode",          "editing"),
    ("draw_",               "editing"),
    ("waveform",            "editing"),
    ("minimap",             "editing"),
    ("editor",              "editor"),
    ("show_editor",         "editor"),
    ("show_mixer",          "editor"),
    ("show_plugin_manager", "editor"),
    ("show_preferences",    "editor"),

    # --- Engine ---
    ("engine",              "engine"),
    ("backend",             "engine"),
    ("buffer_size",         "engine"),
    ("sample_rate",         "engine"),
    ("device",              "engine"),
    ("freewheel",           "engine"),
    ("latency",             "engine"),
    ("xrun",                "engine"),
    ("process_thread",      "engine"),
    ("usecs_per_cycle",     "engine"),
    ("butler_speed",        "engine"),
    ("disk_io",             "engine"),
    ("capture_buffer",      "engine"),
    ("playback_buffer",     "engine"),
    ("realtime",            "engine"),

    # --- Ports ---
    ("port",                "ports"),
    ("physical_audio",      "ports"),
    ("physical_midi",       "ports"),
    ("physical_port",       "ports"),

    # --- VCA ---
    ("vca",                 "vca"),

    # --- Tempo ---
    ("tempo",               "tempo"),
    ("bars_beats",          "tempo"),
    ("beats_to",            "tempo"),
    ("samples_to_beats",    "tempo"),
    ("timecode",            "tempo"),
    ("time_format",         "tempo"),
    ("time_to_",            "tempo"),
    ("samples_to_time",     "tempo"),
    ("sync_source",         "tempo"),

    # --- Sources ---
    ("source",              "sources"),

    # --- Recording ---
    ("record",              "recording"),
    ("arm",                 "recording"),
    ("disarm",              "recording"),
    ("capture",             "recording"),
    ("take",                "recording"),

    # --- Selection ---
    ("select",              "selection"),
    ("deselect",            "selection"),

    # --- Export / Import ---
    ("export",              "export"),
    ("import",              "import"),
    ("bounce",              "export"),
    ("freeze",              "export"),
    ("unfreeze",            "export"),
    ("stems",               "export"),

    # --- Analysis ---
    ("analyze",             "analysis"),
    ("detect_",             "analysis"),
    ("correlate",           "analysis"),
    ("compare_",            "analysis"),
    ("count_",              "analysis"),
    ("find_",               "analysis"),
    ("search_",             "analysis"),

    # --- Safety / Validation ---
    ("validate",            "safety"),
    ("can_",                "safety"),
    ("is_",                 "safety"),
    ("check_",              "safety"),
    ("modification_constraint", "safety"),
    ("pending_changes",     "safety"),

    # --- Batch ---
    ("batch",               "batch"),
    ("execute_atomic",      "batch"),
    ("execute_with",        "batch"),

    # --- Scripting ---
    ("lua",                 "scripting"),
    ("io_plugin",           "scripting"),
    ("midi_binding",        "scripting"),
    ("midi_learn",          "scripting"),
    ("generic_midi",        "scripting"),

    # --- Commands / API introspection ---
    ("command",             "introspection"),
    ("list_commands",       "introspection"),
    ("ping",                "introspection"),

    # --- Crossfade / Fades ---
    ("crossfade",           "editing"),
    ("fade_in",             "editing"),
    ("fade_out",            "editing"),
    ("fade_shape",          "editing"),

    # --- Auto-features (transport-adjacent) ---
    ("auto_input",          "transport"),
    ("auto_play",           "transport"),
    ("auto_return",         "transport"),
    ("follow_edits",        "transport"),

    # --- Audio file / format ---
    ("audio_file",          "sources"),
    ("audio_connection",    "routing"),
    ("channel_diff",        "routing"),

    # --- Position info ---
    ("position_info",       "transport"),
]


def categorize_command(name: str) -> str:
    """Determine category from command/signal name using keyword matching."""
    # Strip "daw." prefix for matching
    key = name[4:] if name.startswith("daw.") else name

    for keyword, category in CATEGORY_KEYWORD_RULES:
        if keyword in key:
            return category

    # Fallback: use the second dotted component if it exists
    parts = name.split(".")
    if len(parts) >= 3:
        return parts[1]
    return "general"


def is_destructive(name: str) -> bool:
    """Determine if a command is destructive based on its action verb."""
    # Strip the "daw." prefix and optional namespace
    parts = name.split(".")
    # The action is typically the last dotted component
    action = parts[-1] if len(parts) > 1 else name

    for prefix in DESTRUCTIVE_PREFIXES:
        if action.startswith(prefix):
            return True

    # Also check the full name without "daw." for things like "daw.undo"
    remainder = name[4:] if name.startswith("daw.") else name
    for prefix in DESTRUCTIVE_PREFIXES:
        if remainder.startswith(prefix):
            return True

    return False


def infer_type_from_value(val_str: str) -> str:
    """Try to infer a JSON type from a C++ default value string."""
    val_str = val_str.strip()
    if val_str in ("true", "false"):
        return "boolean"
    if val_str.startswith('"') or val_str.startswith("'"):
        return "string"
    # Check for int cast or number
    if re.match(r'^-?\d+$', val_str):
        return "number"
    if re.match(r'^-?\d+\.\d+', val_str):
        return "number"
    if val_str.endswith("f"):
        return "number"
    if "(int64_t)" in val_str or "(samplepos_t)" in val_str or "(int)" in val_str:
        return "number"
    return "string"


def infer_type_from_context(param_name: str, access_line: str) -> str:
    """Infer JSON type from the C++ code context around a parameter access."""
    # Check .get<type>() calls
    get_match = re.search(r'\.get<(\w+)>\s*\(\)', access_line)
    if get_match:
        cpp_type = get_match.group(1)
        type_map = {
            "std::string": "string", "string": "string",
            "bool": "boolean",
            "int": "number", "int64_t": "number", "double": "number",
            "float": "number", "samplepos_t": "number", "samplecnt_t": "number",
            "uint32_t": "number", "int32_t": "number", "uint8_t": "number",
            "size_t": "number",
        }
        return type_map.get(cpp_type, "string")

    # Check for .is_array()
    if "is_array" in access_line:
        return "array"

    # Name-based heuristics
    if any(kw in param_name for kw in ("_id", "name", "path", "format", "mode",
                                        "type", "color", "comment", "reason",
                                        "tag", "label", "uri")):
        return "string"
    if any(kw in param_name for kw in ("mute", "solo", "arm", "active", "enable",
                                        "bypass", "lock", "visible", "relative",
                                        "is_", "switch_to", "copy_media",
                                        "selected", "recording", "playing",
                                        "dirty", "looping", "punch_in",
                                        "punch_out", "safe", "reversible",
                                        "connected", "added")):
        return "boolean"
    if any(kw in param_name for kw in ("_samples", "_sample", "position",
                                        "gain", "pan", "trim", "bpm",
                                        "numerator", "denominator", "speed",
                                        "count", "channel", "velocity",
                                        "note", "length", "start", "end",
                                        "ratio", "semitones", "threshold",
                                        "index", "order", "number", "depth",
                                        "size", "rate", "time", "beats",
                                        "db", "_db")):
        return "number"

    return "string"


def infer_return_type(field_name: str, value_expr: str) -> str:
    """Infer the JSON type of a return field from its assignment expression."""
    val = value_expr.strip()

    # Boolean patterns
    if val in ("true", "false"):
        return "boolean"
    if "rolling" in val or "recording" in val or "dirty" in val or "muted" in val:
        return "boolean"
    if "soloed" in val or "active" in val or "locked" in val:
        return "boolean"
    if "get_value" in val and (">" in val or "bool" in val):
        return "boolean"
    # get_punch_in(), get_punch_out(), get_record_enabled(), etc.
    if re.search(r'get_\w+\s*\(\s*\)', val) and any(kw in val for kw in
            ("punch", "record", "loop", "mute", "solo", "enable", "active",
             "dirty", "play", "monitor")):
        return "boolean"

    # Number patterns
    if "sample" in val or "rate" in val or "dB" in val or "coefficient" in val:
        return "number"
    if "(int)" in val or "(int64_t)" in val or "(double)" in val or "(float)" in val:
        return "number"
    if re.match(r'^-?\d+(\.\d+)?$', val):
        return "number"
    if "size()" in val or "count" in field_name:
        return "number"

    # String patterns
    if "name" in val or "to_s" in val or "id" in val:
        return "string"
    if val.startswith('"'):
        return "string"
    if "hex" in val:
        return "string"

    # Array patterns
    if "json::array" in val or val == "routes" or val == "tracks":
        return "array"

    # Object patterns
    if "json::object" in val:
        return "object"

    # Name-based heuristics for the field itself
    if field_name in ("ok", "success"):
        return "boolean"
    if field_name in ("routes", "tracks", "markers", "regions", "plugins",
                      "vcas", "warnings", "affected_objects", "armed_tracks",
                      "ports", "selected", "list", "items", "groups",
                      "sources", "playlists"):
        return "array"
    if field_name in ("impacts",):
        return "object"
    if any(kw in field_name for kw in ("_id", "name", "path", "format", "type",
                                        "status", "comment", "reason",
                                        "snapshot", "color", "tag")):
        return "string"
    if any(kw in field_name for kw in ("position", "sample", "rate", "gain",
                                        "bpm", "count", "depth", "size",
                                        "numerator", "denominator", "speed",
                                        "channel", "velocity", "note",
                                        "length", "index", "order", "number",
                                        "start", "end", "time", "beats")):
        return "number"
    if any(kw in field_name for kw in ("playing", "recording", "dirty",
                                        "muted", "soloed", "active",
                                        "armed", "looping", "running",
                                        "locked", "is_mark", "connected",
                                        "added", "record_enabled",
                                        "reversible", "safe",
                                        "punch_in", "punch_out")):
        return "boolean"

    return "string"


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def read_source_files():
    """Read all dawflow*.cc files and return list of (filename, content) tuples."""
    pattern = os.path.join(SOURCE_DIR, "dawflow*.cc")
    files = sorted(glob.glob(pattern))
    result = []
    for fpath in files:
        with open(fpath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        result.append((os.path.basename(fpath), content))
    return result


def strip_block_comments(text: str) -> str:
    """Remove C-style block comments /* ... */ so we don't parse commented-out code."""
    return re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)


def strip_line_comments(text: str) -> str:
    """Remove C++ line comments // ... from each line."""
    return re.sub(r'//.*', '', text)


def extract_handlers(sources):
    """
    Extract all handler registrations from source files.
    Returns dict: command_name -> {source_file, handler_body_text}
    """
    commands = {}

    for filename, raw_content in sources:
        content = strip_block_comments(raw_content)

        # Find all handler registrations:
        #   handlers["daw.xxx"] = ...
        #   _command_handlers["daw.xxx"] = ...
        # We capture the command name and then extract the handler body (lambda).
        handler_pattern = re.compile(
            r'(?:_command_)?handlers\s*\[\s*"(daw\.[^"]+)"\s*\]'
        )

        for m in handler_pattern.finditer(content):
            cmd_name = m.group(1)
            start_pos = m.start()

            # Extract the handler body: find the lambda and its closing brace.
            # The handler is typically: handlers["daw.xxx"] = [...](...) -> json { ... };
            # We need to find the balanced braces of the lambda body.
            # Start from the '=' after the handler name.
            eq_pos = content.find("=", m.end())
            if eq_pos == -1:
                continue

            # Find the opening '{' of the lambda body
            brace_pos = content.find("{", eq_pos)
            if brace_pos == -1:
                continue

            # Balance braces to find the end of the lambda
            depth = 0
            end_pos = brace_pos
            for i in range(brace_pos, min(brace_pos + 10000, len(content))):
                if content[i] == "{":
                    depth += 1
                elif content[i] == "}":
                    depth -= 1
                    if depth == 0:
                        end_pos = i + 1
                        break

            handler_body = content[eq_pos:end_pos]

            # Avoid duplicates — prefer first occurrence
            if cmd_name not in commands:
                commands[cmd_name] = {
                    "source_file": filename,
                    "body": handler_body,
                }

    return commands


def extract_params_from_body(body: str):
    """
    Extract parameter info from a handler body.
    Returns dict: param_name -> {type, required, default}
    """
    params = OrderedDict()
    clean_body = strip_line_comments(body)

    # Pattern 1: params.at("xxx") — required parameter
    for m in re.finditer(r'params\s*\.\s*at\s*\(\s*"([^"]+)"\s*\)', clean_body):
        pname = m.group(1)
        if pname not in params:
            # Try to get the type from the surrounding .get<T>() call
            # Look at the rest of the line from this match
            line_end = clean_body.find("\n", m.end())
            if line_end == -1:
                line_end = len(clean_body)
            context = clean_body[m.start():line_end]
            ptype = infer_type_from_context(pname, context)
            params[pname] = {"type": ptype, "required": True}

    # Pattern 2: params.value("xxx", default) — optional parameter with default
    for m in re.finditer(
        r'params\s*\.\s*value\s*\(\s*"([^"]+)"\s*,\s*([^)]+)\)',
        clean_body
    ):
        pname = m.group(1)
        default_raw = m.group(2).strip()
        if pname not in params:
            ptype = infer_type_from_value(default_raw)
            entry = {"type": ptype, "required": False}
            # Clean up default value for JSON
            default_clean = default_raw.strip().rstrip("f")
            # Remove C++ casts
            default_clean = re.sub(r'\([^)]*\)\s*', '', default_clean).strip()
            if default_clean.startswith('"') and default_clean.endswith('"'):
                entry["default"] = default_clean[1:-1]
            elif default_clean in ("true", "false"):
                entry["default"] = default_clean == "true"
            elif re.match(r'^-?\d+$', default_clean):
                entry["default"] = int(default_clean)
            elif re.match(r'^-?\d+\.?\d*$', default_clean):
                entry["default"] = float(default_clean)
            else:
                entry["default"] = default_clean
            params[pname] = entry

    # Pattern 3: params.contains("xxx") — optional parameter (no default)
    for m in re.finditer(r'params\s*\.\s*contains\s*\(\s*"([^"]+)"\s*\)', clean_body):
        pname = m.group(1)
        if pname not in params:
            # Try to get the type from how it's used after the contains check
            # Look a few lines after the contains
            after_start = m.end()
            after_end = min(after_start + 300, len(clean_body))
            context = clean_body[after_start:after_end]
            # Look for params["xxx"].get<T>()
            get_match = re.search(
                r'params\s*\[\s*"' + re.escape(pname) + r'"\s*\]\s*\.\s*get<(\w+)>',
                context
            )
            if get_match:
                ptype = infer_type_from_context(pname, get_match.group(0))
            else:
                ptype = infer_type_from_context(pname, "")
            params[pname] = {"type": ptype, "required": False}

    # Pattern 4: params["xxx"] used directly (not on left side of assignment)
    # This catches things like: params["xxx"].get<bool>()
    # But we need to exclude result["xxx"] = and params["xxx"] = (which are assignments)
    for m in re.finditer(r'params\s*\[\s*"([^"]+)"\s*\]', clean_body):
        pname = m.group(1)
        if pname in params:
            continue
        # Check if this is an assignment (left side of =)
        after = clean_body[m.end():m.end() + 20].strip()
        if after.startswith("=") and not after.startswith("=="):
            continue  # This is an assignment, not a read
        # Check it's actually from params, not result or something else
        before_start = max(0, m.start() - 50)
        before_text = clean_body[before_start:m.start()]
        # If there's a result or r or p or obj prefix, skip
        if re.search(r'\b(result|r|p|obj|track|route|region|marker)\s*$', before_text.rstrip()):
            continue
        # It's a read from params
        line_end = clean_body.find("\n", m.end())
        if line_end == -1:
            line_end = len(clean_body)
        context = clean_body[m.start():line_end]
        ptype = infer_type_from_context(pname, context)
        params[pname] = {"type": ptype, "required": False}

    return params


def extract_returns_from_body(body: str):
    """
    Extract return field info from a handler body.
    Returns dict: field_name -> type_string
    """
    returns = OrderedDict()
    clean_body = strip_line_comments(body)

    # Pattern: result["xxx"] = expr
    for m in re.finditer(r'result\s*\[\s*"([^"]+)"\s*\]\s*=\s*([^;]+)', clean_body):
        fname = m.group(1)
        value_expr = m.group(2).strip()
        if fname not in returns:
            returns[fname] = infer_return_type(fname, value_expr)

    # Also match inline return patterns like: return {{"ok", true}, {"status", "queued"}};
    inline_match = re.search(r'return\s*\{\{([^}]+\}\s*(?:,\s*\{[^}]+\}\s*)*)\}', clean_body)
    if inline_match:
        pairs_text = inline_match.group(0)
        for pm in re.finditer(r'\{\s*"([^"]+)"\s*,\s*([^}]+)\s*\}', pairs_text):
            fname = pm.group(1)
            val = pm.group(2).strip()
            if fname not in returns:
                returns[fname] = infer_return_type(fname, val)

    return returns


def extract_signals(sources):
    """
    Extract signal broadcasts from source files.
    Returns dict: signal_name -> {category, params}
    """
    signals = {}

    for filename, raw_content in sources:
        content = strip_block_comments(raw_content)

        # Find broadcast_event("daw.xxx", ...) calls
        broadcast_pattern = re.compile(
            r'broadcast_event\s*\(\s*"(daw\.[^"]+)"\s*,\s*([^)]+)\)'
        )

        for m in broadcast_pattern.finditer(content):
            signal_name = m.group(1)
            params_var = m.group(2).strip()

            if signal_name in signals:
                continue

            signal_params = OrderedDict()

            if params_var.startswith("json{"):
                # Inline JSON: json{} or json{{"key", value}, ...}
                for pm in re.finditer(r'\{\s*"([^"]+)"\s*,\s*([^}]+)\s*\}', params_var):
                    fname = pm.group(1)
                    val = pm.group(2).strip()
                    signal_params[fname] = infer_return_type(fname, val)
            elif params_var != "json{}":
                # Variable-based params — look backwards from the broadcast_event call
                # to find params["xxx"] = ... assignments
                # Search the 80 lines before the broadcast call
                before_text = content[max(0, m.start() - 3000):m.start()]

                # Find the nearest lambda or function scope start (opening {)
                # to limit our search to the relevant scope
                scope_start = before_text.rfind("{")
                if scope_start != -1:
                    scope_text = before_text[scope_start:]
                else:
                    scope_text = before_text[-2000:]

                # Find params["xxx"] = ... or p["xxx"] = ... assignments
                var_name = params_var.strip()
                # The variable could be 'params', 'p', or whatever
                escaped_var = re.escape(var_name)
                for pm in re.finditer(
                    escaped_var + r'\s*\[\s*"([^"]+)"\s*\]\s*=\s*([^;]+)',
                    scope_text
                ):
                    fname = pm.group(1)
                    val = pm.group(2).strip()
                    if fname not in signal_params:
                        signal_params[fname] = infer_return_type(fname, val)

                # Also look for json array construction: var_name = json::array()
                # and .push_back patterns — mark those as array type
                if re.search(escaped_var + r'\s*=\s*json::array', scope_text):
                    # The var itself is an array — find what key it's assigned to in the params
                    pass

            signals[signal_name] = {
                "category": categorize_command(signal_name),
                "params": signal_params,
                "source_file": filename,
            }

    return signals


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("DAWFLOW API Schema Generator")
    print("=" * 70)
    print()

    # Read source files
    sources = read_source_files()
    print(f"Source files found: {len(sources)}")
    for fname, content in sources:
        print(f"  - {fname} ({len(content):,} bytes)")
    print()

    # Extract commands
    commands_raw = extract_handlers(sources)
    print(f"Commands extracted: {len(commands_raw)}")

    # Extract signals
    signals_raw = extract_signals(sources)
    print(f"Signals extracted: {len(signals_raw)}")
    print()

    # Build command entries
    commands = OrderedDict()
    parse_issues = []
    categories = set()

    for cmd_name in sorted(commands_raw.keys()):
        info = commands_raw[cmd_name]
        body = info["body"]

        params = extract_params_from_body(body)
        returns = extract_returns_from_body(body)
        category = categorize_command(cmd_name)
        destructive = is_destructive(cmd_name)

        categories.add(category)

        # Build param schema
        param_schema = OrderedDict()
        for pname, pinfo in params.items():
            entry = {"type": pinfo["type"], "required": pinfo["required"]}
            if "default" in pinfo:
                entry["default"] = pinfo["default"]
            param_schema[pname] = entry

        # Build return schema
        return_schema = OrderedDict()
        for fname, ftype in returns.items():
            return_schema[fname] = ftype

        commands[cmd_name] = {
            "category": category,
            "description": "",
            "destructive": destructive,
            "params": param_schema,
            "returns": return_schema,
            "source_file": info["source_file"],
        }

        # Track issues
        if not params and not returns:
            # Check if the handler actually has a params argument
            if "/* params */" not in body and "params" in body:
                parse_issues.append(f"{cmd_name}: no params or returns extracted")

    # Build signal entries
    signals = OrderedDict()
    for sig_name in sorted(signals_raw.keys()):
        info = signals_raw[sig_name]
        categories.add(info["category"])

        signals[sig_name] = {
            "category": info["category"],
            "params": info["params"],
        }

    # Count stats
    destructive_count = sum(1 for c in commands.values() if c["destructive"])
    read_only_count = len(commands) - destructive_count

    # Build final schema
    schema = OrderedDict()
    schema["version"] = "1.0"
    schema["generated"] = datetime.now(timezone.utc).isoformat()
    schema["stats"] = {
        "total_commands": len(commands),
        "total_signals": len(signals),
        "destructive_commands": destructive_count,
        "read_only_commands": read_only_count,
        "categories": len(categories),
    }
    schema["commands"] = commands
    schema["signals"] = signals

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    # Write JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)

    # Print summary
    print("-" * 70)
    print("SCHEMA GENERATED SUCCESSFULLY")
    print("-" * 70)
    print(f"  Output:              {OUTPUT_FILE}")
    print(f"  Total commands:      {len(commands)}")
    print(f"  Total signals:       {len(signals)}")
    print(f"  Destructive:         {destructive_count}")
    print(f"  Read-only:           {read_only_count}")
    print(f"  Categories:          {len(categories)}")
    print()

    # Category breakdown
    cat_counts = {}
    for c in commands.values():
        cat_counts[c["category"]] = cat_counts.get(c["category"], 0) + 1
    for s in signals.values():
        cat_counts[s["category"]] = cat_counts.get(s["category"], 0) + 1

    print("  Category breakdown:")
    for cat in sorted(cat_counts.keys()):
        print(f"    {cat:30s} {cat_counts[cat]:4d}")
    print()

    # Commands with most params
    print("  Top 10 commands by parameter count:")
    by_params = sorted(commands.items(), key=lambda x: len(x[1]["params"]), reverse=True)
    for cmd_name, cmd_info in by_params[:10]:
        print(f"    {cmd_name:50s} {len(cmd_info['params']):3d} params")
    print()

    # Commands with no params extracted (potential issues)
    no_params = [name for name, info in commands.items()
                 if not info["params"] and not info["returns"]]
    if no_params:
        print(f"  Commands with no params/returns extracted: {len(no_params)}")
        for name in no_params[:20]:
            print(f"    - {name}")
        if len(no_params) > 20:
            print(f"    ... and {len(no_params) - 20} more")
        print()

    # Parse issues
    if parse_issues:
        print(f"  Parsing notes ({len(parse_issues)}):")
        for issue in parse_issues[:10]:
            print(f"    - {issue}")
        if len(parse_issues) > 10:
            print(f"    ... and {len(parse_issues) - 10} more")
        print()

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
