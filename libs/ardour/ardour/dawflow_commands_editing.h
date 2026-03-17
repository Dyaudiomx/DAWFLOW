/*
 * DawflowCommandsEditing - Region/Audio & MIDI Editing Commands
 *
 * Extends the DAWFLOW Plugin Host API with 27 editing commands for
 * region manipulation, audio analysis, and MIDI note editing.
 *
 * Part of the DAWFLOW plugin system.
 */

#ifndef ARDOUR_DAWFLOW_COMMANDS_EDITING_H
#define ARDOUR_DAWFLOW_COMMANDS_EDITING_H

#include "dawflow_ipc/message.h"
#include <unordered_map>
#include <functional>

namespace ARDOUR {

class Session;

void dawflow_register_editing_commands (
	Session& session,
	std::unordered_map<std::string, std::function<DawflowIPC::json(const DawflowIPC::json&)>>& handlers
);

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_COMMANDS_EDITING_H */
