/*
 * DawflowCommandsFinal - Final batch of API commands for the DAWFLOW Plugin Host
 *
 * Registers 30+ additional commands covering:
 *   - Import/Export (5): import audio/MIDI, get sources, export session/formats
 *   - Plugin Presets (3): get, load, save presets
 *   - Plugin Search (2): search by name, search by category
 *   - Track Properties (9): active, monitoring, phase, hidden, names, count,
 *                           solo exclusive, mute all, unsolo all
 *   - VCA (2): create, list
 *   - Snapshots (2): save, list
 *   - Time Conversion (3): samples to beats, beats to samples, position info
 *   - Audio Analysis (2): detect silence, get tempo at position
 *   - Crossfade/MIDI CC (2): stubs for future implementation
 *
 * Part of the DAWFLOW plugin system.
 */

#ifndef ARDOUR_DAWFLOW_COMMANDS_FINAL_H
#define ARDOUR_DAWFLOW_COMMANDS_FINAL_H

#include "dawflow_ipc/message.h"
#include <unordered_map>
#include <functional>

namespace ARDOUR {

class Session;

void dawflow_register_final_commands (
	Session& session,
	std::unordered_map<std::string, std::function<DawflowIPC::json(const DawflowIPC::json&)>>& handlers
);

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_COMMANDS_FINAL_H */
