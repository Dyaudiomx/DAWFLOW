# Comprehensive DAWFLOW UI Fix — Design

**Date:** 2026-03-18
**Status:** Approved
**Goal:** Fix all critical blockers, match Cubase visual design, wire all functionality.

## Work Streams (Independent, Parallelizable)

### Stream 1: Fix IPC (Engine)
Revert the deadlocking Glib::signal_idle dispatch. Most commands work from background threads. For session-modifying commands, use Ardour's thread-safe APIs.

### Stream 2: CenterZone Visual Overhaul (React)
Cubase-style grid with blue-teal colors, clear beat/bar lines, locator range overlay, proper ruler.

### Stream 3: Right-Click Context Menu (React)
Full Cubase menu: 20+ track types with icons, keyboard shortcuts, dividers.

### Stream 4: Add Track Dialog Redesign (React)
Cubase-style: type icon, input routing, configuration, output routing, name, track color, count.

### Stream 5: General UI Polish (React)
Toolbar, left zone header, transport bar, tab styling, status line improvements.
