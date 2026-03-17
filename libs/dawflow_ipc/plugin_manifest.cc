/*
 * DawflowIPC - Plugin Manifest Implementation
 *
 * Parses manifest.json from DAWFLOW plugin packages and resolves
 * platform-specific entry points.
 */

#include "dawflow_ipc/plugin_manifest.h"

#include <algorithm>
#include <stdexcept>

namespace DawflowIPC {

using json = nlohmann::json;

static std::string
current_platform_string ()
{
#if defined(__APPLE__)
#  if defined(__aarch64__)
	return "macos-arm64";
#  elif defined(__x86_64__)
	return "macos-x86_64";
#  else
	return "macos-unknown";
#  endif
#elif defined(__linux__)
#  if defined(__x86_64__)
	return "linux-x86_64";
#  elif defined(__aarch64__)
	return "linux-arm64";
#  else
	return "linux-unknown";
#  endif
#else
	return "unknown";
#endif
}

static std::string
replace_all_occurrences (const std::string& str, const std::string& from, const std::string& to)
{
	std::string result = str;
	size_t pos = 0;
	while ((pos = result.find (from, pos)) != std::string::npos) {
		result.replace (pos, from.length (), to);
		pos += to.length ();
	}
	return result;
}

PluginManifest
PluginManifest::from_json (const std::string& json_str)
{
	json j = json::parse (json_str);
	PluginManifest m;

	if (!j.contains ("id") || !j["id"].is_string ()) {
		throw std::runtime_error ("Plugin manifest missing required field: id");
	}
	if (!j.contains ("name") || !j["name"].is_string ()) {
		throw std::runtime_error ("Plugin manifest missing required field: name");
	}
	if (!j.contains ("version") || !j["version"].is_string ()) {
		throw std::runtime_error ("Plugin manifest missing required field: version");
	}
	if (!j.contains ("api_version") || !j["api_version"].is_string ()) {
		throw std::runtime_error ("Plugin manifest missing required field: api_version");
	}
	if (!j.contains ("entry_point") || !j["entry_point"].is_string ()) {
		throw std::runtime_error ("Plugin manifest missing required field: entry_point");
	}

	m.id          = j["id"].get<std::string> ();
	m.name        = j["name"].get<std::string> ();
	m.version     = j["version"].get<std::string> ();
	m.api_version = j["api_version"].get<std::string> ();
	m.entry_point = j["entry_point"].get<std::string> ();

	if (j.contains ("author") && j["author"].is_string ()) {
		m.author = j["author"].get<std::string> ();
	}
	if (j.contains ("description") && j["description"].is_string ()) {
		m.description = j["description"].get<std::string> ();
	}

	/* Parse capabilities array */
	if (j.contains ("capabilities") && j["capabilities"].is_array ()) {
		for (const auto& cap : j["capabilities"]) {
			if (cap.is_string ()) {
				m.capabilities.push_back (cap.get<std::string> ());
			}
		}
	}

	/* Parse UI panels - may be nested under "ui.panels" or top-level "panels" */
	json panels_arr;
	if (j.contains ("ui") && j["ui"].is_object () && j["ui"].contains ("panels") && j["ui"]["panels"].is_array ()) {
		panels_arr = j["ui"]["panels"];
	} else if (j.contains ("panels") && j["panels"].is_array ()) {
		panels_arr = j["panels"];
	}

	if (!panels_arr.is_null () && panels_arr.is_array ()) {
		for (const auto& p : panels_arr) {
			if (!p.is_object ()) {
				continue;
			}
			UIPanel panel;
			if (p.contains ("id") && p["id"].is_string ()) {
				panel.id = p["id"].get<std::string> ();
			}
			if (p.contains ("title") && p["title"].is_string ()) {
				panel.title = p["title"].get<std::string> ();
			}
			if (p.contains ("location") && p["location"].is_string ()) {
				panel.location = p["location"].get<std::string> ();
			}
			if (p.contains ("url") && p["url"].is_string ()) {
				panel.url = p["url"].get<std::string> ();
			}
			m.panels.push_back (panel);
		}
	}

	/* Parse actions array */
	if (j.contains ("actions") && j["actions"].is_array ()) {
		for (const auto& a : j["actions"]) {
			if (!a.is_object ()) {
				continue;
			}
			ActionDef action;
			if (a.contains ("id") && a["id"].is_string ()) {
				action.id = a["id"].get<std::string> ();
			}
			if (a.contains ("label") && a["label"].is_string ()) {
				action.label = a["label"].get<std::string> ();
			}
			m.actions.push_back (action);
		}
	}

	return m;
}

std::string
PluginManifest::resolved_entry_point () const
{
	return replace_all_occurrences (entry_point, "{platform}", current_platform_string ());
}

bool
PluginManifest::has_capability (const std::string& cap) const
{
	return std::find (capabilities.begin (), capabilities.end (), cap) != capabilities.end ();
}

} /* namespace DawflowIPC */
