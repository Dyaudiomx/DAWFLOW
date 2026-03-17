/*
 * DawflowPanelManager - Manages embedded WebView panels for plugin UIs
 *
 * Provides create / remove / lookup for WebView panels keyed by plugin id.
 *
 * Part of the DAWFLOW plugin system (Task 5).
 */

#ifndef DAWFLOW_PANEL_MANAGER_H
#define DAWFLOW_PANEL_MANAGER_H

#include "dawflow_webview_panel.h"

#include <memory>
#include <string>
#include <unordered_map>

namespace Dawflow {

class PanelManager {
public:
	PanelManager ();
	~PanelManager ();

	/** Create a web panel for a plugin and load the given URL.
	 *  Returns a non-owning pointer (the manager keeps ownership). */
	WebViewPanel* create_panel (const std::string& plugin_id,
	                            const std::string& title,
	                            const std::string& url);

	/** Destroy the panel for a plugin. */
	void remove_panel (const std::string& plugin_id);

	/** Destroy all panels. */
	void remove_all ();

	/** Lookup a panel by plugin id (returns nullptr if not found). */
	WebViewPanel* get_panel (const std::string& plugin_id);

	/** Read-only access to the full panel map. */
	const std::unordered_map<std::string, std::unique_ptr<WebViewPanel>>& panels () const {
		return _panels;
	}

private:
	std::unordered_map<std::string, std::unique_ptr<WebViewPanel>> _panels;
};

} /* namespace Dawflow */

#endif /* DAWFLOW_PANEL_MANAGER_H */
