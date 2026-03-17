/*
 * DawflowPluginHost Extended Commands
 *
 * Registers additional IPC commands for transport, markers, undo/redo,
 * session, routing, and route groups. Kept in a separate file to avoid
 * merge conflicts with the core command registration.
 *
 * Part of the DAWFLOW plugin system.
 */

#ifndef ARDOUR_DAWFLOW_PLUGIN_HOST_EXTENDED_H
#define ARDOUR_DAWFLOW_PLUGIN_HOST_EXTENDED_H

#include "ardour/dawflow_plugin_host.h"

namespace ARDOUR {

/** Register extended DAW commands (transport, markers, undo, session, routing, groups).
 *
 * Called from DawflowPluginHost::_register_commands() to add 25+ additional
 * IPC command handlers without modifying the core registration file.
 */
void dawflow_register_extended_commands (
	DawflowPluginHost& host,
	Session& session,
	std::unordered_map<std::string, std::function<DawflowIPC::json(const DawflowIPC::json&)>>& handlers
);

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_PLUGIN_HOST_EXTENDED_H */
