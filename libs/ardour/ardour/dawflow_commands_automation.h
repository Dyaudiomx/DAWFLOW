/*
 * DawflowCommandsAutomation - Extended API commands for the DAWFLOW Plugin Host
 *
 * Registers 33 additional commands covering automation, selection, metering,
 * export, track properties, metronome, and batch/macro operations.
 *
 * Part of the DAWFLOW plugin system.
 */

#ifndef ARDOUR_DAWFLOW_COMMANDS_AUTOMATION_H
#define ARDOUR_DAWFLOW_COMMANDS_AUTOMATION_H

#include "dawflow_ipc/message.h"
#include <unordered_map>
#include <functional>

namespace ARDOUR {

class Session;

void dawflow_register_automation_commands (
	Session& session,
	std::unordered_map<std::string, std::function<DawflowIPC::json(const DawflowIPC::json&)>>& handlers
);

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_COMMANDS_AUTOMATION_H */
