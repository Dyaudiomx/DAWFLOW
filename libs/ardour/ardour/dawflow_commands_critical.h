/*
 * DawflowCommandsCritical - 23 CRITICAL API gap-fill commands
 *
 * Registers commands without which the AI agent cannot function:
 *   - Section editing (4): cut/copy/delete/insert sections
 *   - Region clipboard (2): copy/paste regions
 *   - Arrangement (3): insert/remove time, add range marker
 *   - Transport (1): toggle punch
 *   - Mixing (2): set send level, get full mix state
 *   - MIDI (1): create MIDI region from scratch
 *   - Tempo (2): add tempo change, get full tempo map
 *   - Time conversion (2): position to bars/beats and back
 *   - Export (2): improved export stubs
 *   - View (3): improved view command stubs
 *   - Import (1): improved import_audio
 *
 * Part of the DAWFLOW plugin system.
 */

#ifndef ARDOUR_DAWFLOW_COMMANDS_CRITICAL_H
#define ARDOUR_DAWFLOW_COMMANDS_CRITICAL_H

#include "dawflow_ipc/message.h"
#include <unordered_map>
#include <functional>

namespace ARDOUR {

class Session;

void dawflow_register_critical_commands (
	Session& session,
	std::unordered_map<std::string, std::function<DawflowIPC::json(const DawflowIPC::json&)>>& handlers
);

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_COMMANDS_CRITICAL_H */
