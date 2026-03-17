/*
 * DawflowCommandsHigh - HIGH priority API gap-fill for the DAWFLOW Plugin Host
 *
 * Registers 50 production-critical commands covering:
 *   - Recording (8): pre/post-roll, record state, transport_record, discard take, playlists
 *   - Editing (8): move to track, nudge, snap mode, consolidate, time stretch, pitch shift,
 *                   region at position, select regions in range
 *   - Mixing (12): pan width, get pan, send enable, get sends, gain relative,
 *                    master gain, bypass/enable all plugins, master LUFS
 *   - MIDI (5): edit note, set note length, add/get CC, duplicate MIDI content
 *   - Plugins (5): reorder, copy, set position, batch params, processor chain
 *   - Project (3): export stems, save-as, import MIDI (improved)
 *   - Query (7): track type, record status, loop/punch range, session length,
 *                 region by name, available ports, time signature change
 *
 * Part of the DAWFLOW plugin system.
 */

#ifndef ARDOUR_DAWFLOW_COMMANDS_HIGH_H
#define ARDOUR_DAWFLOW_COMMANDS_HIGH_H

#include "dawflow_ipc/message.h"
#include <unordered_map>
#include <functional>

namespace ARDOUR {

class Session;

void dawflow_register_high_commands (
	Session& session,
	std::unordered_map<std::string, std::function<DawflowIPC::json(const DawflowIPC::json&)>>& handlers
);

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_COMMANDS_HIGH_H */
