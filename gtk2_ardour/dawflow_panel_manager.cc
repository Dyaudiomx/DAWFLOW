/*
 * DawflowPanelManager implementation
 *
 * Part of the DAWFLOW plugin system (Task 5).
 */

#include "dawflow_panel_manager.h"

namespace Dawflow {

PanelManager::PanelManager ()
{
}

PanelManager::~PanelManager ()
{
	remove_all ();
}

WebViewPanel*
PanelManager::create_panel (const std::string& plugin_id,
                            const std::string& title,
                            const std::string& url)
{
	/* If a panel already exists for this plugin, tear it down first. */
	remove_panel (plugin_id);

	auto panel = std::make_unique<WebViewPanel> (plugin_id, title);
	panel->load_url (url);

	WebViewPanel* raw = panel.get ();
	_panels[plugin_id] = std::move (panel);
	return raw;
}

void
PanelManager::remove_panel (const std::string& plugin_id)
{
	_panels.erase (plugin_id);
}

void
PanelManager::remove_all ()
{
	_panels.clear ();
}

WebViewPanel*
PanelManager::get_panel (const std::string& plugin_id)
{
	auto it = _panels.find (plugin_id);
	if (it != _panels.end ()) {
		return it->second.get ();
	}
	return nullptr;
}

} /* namespace Dawflow */
