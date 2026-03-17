/*
 * DawflowCommandsMedium - Medium & Low Priority API Commands
 *
 * Registers 62 additional commands and 10 event broadcasts covering:
 *   - Editing (7): reverse, fade shape, crossfade, snap, ripple, group/ungroup regions
 *   - MIDI (9): select notes, split by pitch/channel, set channel, clear CC,
 *               program change, swing quantize, legato, scale velocity
 *   - Arrangement (5): rename/move markers, remove tempo, tempo ramp, cue marker
 *   - Plugins (3): move plugin, plugin info, load by ID
 *   - Project (3): save template, restore snapshot, copy playlist
 *   - View (2): zoom to region, zoom to range (stubs)
 *   - Advanced (9): group mgmt, port connections, xrun, latency, metronome, speed
 *   - Low Priority (14): capture mode, last capture, opacity, raise/lower,
 *                         shuffle, track height, show mixer/editor, recent sessions,
 *                         latency report, invert/retrograde MIDI, sample rate
 *   - Events (10): signal broadcasts for routes, regions, markers, tempo, plugins, undo
 *
 * Part of the DAWFLOW plugin system.
 */

#ifndef ARDOUR_DAWFLOW_COMMANDS_MEDIUM_H
#define ARDOUR_DAWFLOW_COMMANDS_MEDIUM_H

#include "dawflow_ipc/message.h"
#include <unordered_map>
#include <functional>

namespace ARDOUR {

class Session;
class DawflowPluginHost;

void dawflow_register_medium_commands (
	DawflowPluginHost& host,
	Session& session,
	std::unordered_map<std::string, std::function<DawflowIPC::json(const DawflowIPC::json&)>>& handlers
);

} // namespace ARDOUR

#endif /* ARDOUR_DAWFLOW_COMMANDS_MEDIUM_H */
