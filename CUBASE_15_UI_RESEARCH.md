# Cubase 15 Pro - Comprehensive UI Research Document

> **Released:** November 2025 | **Price:** $579.99 (Pro)
> **Research Date:** March 2026
> **Purpose:** Complete UI layout and design reference for faithful recreation

---

## TABLE OF CONTENTS

1. [Project Window - Main Layout](#1-project-window---main-layout)
2. [Toolbar - Complete Button/Control Reference](#2-toolbar---complete-buttoncontrol-reference)
3. [Left Zone - Inspector Panel](#3-left-zone---inspector-panel)
4. [Lower Zone - Tabs and Contents](#4-lower-zone---tabs-and-contents)
5. [Right Zone - VSTi, Media, CR, Meter](#5-right-zone---vsti-media-cr-meter)
6. [MixConsole Window](#6-mixconsole-window)
7. [Key Editor (MIDI Editor)](#7-key-editor-midi-editor)
8. [Sample Editor / Audio Editor](#8-sample-editor--audio-editor)
9. [Score Editor](#9-score-editor)
10. [MediaBay / Media Browser](#10-mediabay--media-browser)
11. [Control Room](#11-control-room)
12. [Transport Panel / Transport Bar](#12-transport-panel--transport-bar)
13. [Track Types and Visual Representation](#13-track-types-and-visual-representation)
14. [Color Scheme and Visual Design Language](#14-color-scheme-and-visual-design-language)
15. [Metering and Level Display](#15-metering-and-level-display)
16. [Plugin Window Integration](#16-plugin-window-integration)
17. [Chord, Marker, Tempo, Signature Tracks](#17-chord-marker-tempo-signature-tracks)
18. [Channel Settings Window](#18-channel-settings-window)
19. [Cubase 15 Specific UI Changes](#19-cubase-15-specific-ui-changes)
20. [Design System Reference](#20-design-system-reference)

---

## 1. PROJECT WINDOW - MAIN LAYOUT

The Project Window is the primary workspace. It is divided into **5 major zones**:

```
+-------------------------------------------------------------------+
|                         TOOLBAR                                    |
+-------------------------------------------------------------------+
|          |                              |                          |
|  LEFT    |       PROJECT ZONE           |    RIGHT ZONE            |
|  ZONE    |       (Center)               |                          |
|          |                              |    - VSTi tab            |
| Inspector|  +-- Track List --+-- Event  |    - Media tab           |
| or       |  |  Track Headers |  Display |    - CR tab (Pro)        |
| Visibility|  |  (controls)   | (timeline)|    - Meter tab (Pro)    |
|          |  |               |          |                          |
|          |  +---------------+----------+                          |
|          |                              |                          |
+----------+------------------------------+--------------------------+
|                      LOWER ZONE                                    |
|  [MixConsole] [Editor] [Sampler Control] [Chord Pads] [MIDI Remote]|
+-------------------------------------------------------------------+
|                    TRANSPORT BAR (optional)                         |
+-------------------------------------------------------------------+
```

### Zone Structure

- **Toolbar** - Fixed horizontal bar at the top. Contains all project tools, transport, snap, grid, quantize, etc.
- **Left Zone** - Collapsible. Contains the **Inspector** (Track tab / Editor tab) and **Visibility** tab. Toggle: "Show/Hide Left Zone" button on toolbar.
- **Project Zone (Center)** - Always visible. Contains:
  - **Track List** (left half): Track headers with controls (name, mute, solo, record, monitor, color, volume slider in C15, pan)
  - **Event Display** (right half): Timeline/arranger area showing events, parts, waveforms, MIDI blocks
  - **Ruler** at top showing bars/beats or timecode
- **Right Zone** - Collapsible. Contains 4 tabs at top: VSTi, Media, CR (Control Room, Pro only), Meter (Pro only)
- **Lower Zone** - Collapsible. Tabs: MixConsole, Editor, Sampler Control, Chord Pads, MIDI Remote

### Optional Display Elements (via "Set up Window Layout")

- **Status Line** - Below toolbar. Shows project info.
- **Info Line** - Shows details of selected event/part.
- **Overview Line** - Miniature overview of entire project for navigation.
- **Transport Bar** - Compact transport controls at bottom.

---

## 2. TOOLBAR - COMPLETE BUTTON/CONTROL REFERENCE

The toolbar is a single horizontal strip. Sections can be shown/hidden via the gear icon (Set Up Toolbar) on the far right. Items can be collapsed/expanded via three vertical dots.

### Toolbar Sections (Left to Right)

#### 2.1 Activate Project
- Button to activate current project (only visible with multiple projects open)

#### 2.2 Project History
- **Undo** button
- **Redo** button

#### 2.3 Constrain Delay Compensation
- Single toggle button to minimize latency effects

#### 2.4 LEFT DIVIDER
- Items to the left of this divider are always shown

#### 2.5 Media & Windows Buttons
- **Open MediaBay** (F5)
- **Open Pool**
- **Open MixConsole** (F3)
- **Open Control Room Mixer** (Pro only)

#### 2.6 Track Visibility Configurations
- Dropdown to create/switch between visibility setups

#### 2.7 State Buttons
- **Deactivate All Mute States** - Shows if any tracks are muted
- **Deactivate All Solo States** - Shows if any tracks are soloed
- **Deactivate All Listen States** - Shows if any tracks have listen enabled
- **Suspend All Read/Write Automation** - Global automation state

#### 2.8 Automation Mode
- Shows current automation mode (Touch, Auto-Latch, Cross-Over)
- Button to open Automation Panel

#### 2.9 Auto-Scroll
- Toggle to keep project cursor visible during playback
- Dropdown for scroll mode (Page Scroll, Stationary Cursor)

#### 2.10 Transport Buttons
- **Go to Previous Marker/Zero**
- **Rewind**
- **Forward**
- **Go to Next Marker/End**
- **Activate Cycle** (loop)
- **Stop**
- **Play**
- **Record**

#### 2.11 External Sync
- Toggle for external synchronization
- Opens Project Synchronization Setup

#### 2.12 Locators
- **Go to Left Locator**
- **Left Locator Position** (numeric display)
- **Right Locator Position** (numeric display)
- **Go to Right Locator**

#### 2.13 Time Display
- Shows project cursor position
- Click to toggle between time formats (Bars+Beats, Seconds, Timecode, Samples)

#### 2.14 Markers
- **Set/Go to Marker** buttons

#### 2.15 Arranger Controls
- Controls for the arranger track playback

#### 2.16 Tool Buttons (Project Window Tools)
1. **Object Selection** (arrow) - Key 1
2. **Range Selection** - Key 2
3. **Split/Scissors** - Key 3
4. **Glue** - Key 4
5. **Erase** - Key 5
6. **Zoom** - Key 6
7. **Mute** - Key 7
8. **Draw/Pencil** - Key 8
9. **Line** - Key 9
10. **Play/Scrub** (speaker icon)
11. **Color** tool
12. **Comp** tool (for lane comping)
13. **Time Warp** tool

#### 2.17 Color Menu
- Defines project colors

#### 2.18 Nudge Palette
- Nudge Left, Nudge Right
- Nudge Start Left, Nudge Start Right
- Nudge End Left, Nudge End Right

#### 2.19 Project Root Key
- Dropdown to change root key

#### 2.20 Snap to Zero Crossing
- Toggle button

#### 2.21 Snap Controls
- **Snap On/Off** toggle
- **Snap Type** dropdown (Grid, Grid Relative, Events, Shuffle, Magnetic Cursor)
- **Grid Type** dropdown (Bar, Beat, Use Quantize)
- **Quantize** preset dropdown (1/1, 1/2, 1/4, 1/8, 1/16, 1/32, 1/64, Triplet, Dotted)

#### 2.22 Performance Meter
- **ASIO Time Usage** meter (horizontal bar)
- **Disk Transfer** meter (horizontal bar)

#### 2.23 RIGHT DIVIDER
- Items to the right are always shown

#### 2.24 Window Zone Controls
- **Show/Hide Left Zone** button
- **Show/Hide Lower Zone** button
- **Show/Hide Right Zone** button
- **Set up Window Layout** (toggles: Status Line, Info Line, Overview Line, Transport)
- **Set up Toolbar** (gear icon) - configures which toolbar sections are visible

#### 2.25 Quick Audio Export (NEW in C15)
- Direct export button at top right

#### 2.26 Hub Access (NEW in C15)
- Quick access to the Hub from toolbar

---

## 3. LEFT ZONE - INSPECTOR PANEL

The Left Zone has two modes, toggled by tabs at the bottom:

### 3.1 Track Tab (Track Inspector)

The Track Inspector is context-sensitive -- it shows different sections depending on the selected track type. All sections are **accordion-style** (click header to expand, opening one closes others; Ctrl-click to open multiple simultaneously; Alt-click to open all).

#### Audio Track Inspector Sections:
1. **Basic Track Settings** (always visible):
   - Track name (double-click to rename)
   - **e** button (opens Channel Settings window)
   - **M** (Mute), **S** (Solo) buttons
   - **R** (Read Automation), **W** (Write Automation)
   - Audio Fades button
   - Record Enable button
   - Monitor button
   - Musical/Linear Timebase toggle
   - Lock Track toggle
   - Input Routing dropdown
   - Output Routing dropdown
   - Volume fader (horizontal)
   - Pan knob
2. **Track Versions**
3. **Chord Track** (chord following settings)
4. **Inserts** (8 insert slots, 6 pre-fader + 2 post-fader)
5. **Channel Strip** (Gate, Compressor, EQ, Tools, Saturation, Limit)
6. **Equalizers** (4-band parametric EQ with curve display)
7. **Sends** (8 send slots to FX channels)
8. **Cue Sends** (up to 4 cue sends, Pro only)
9. **Direct Routing** (Pro only)
10. **Surround Pan / Panner**
11. **Quick Controls**
12. **Channel** (miniature MixConsole channel fader)
13. **Notepad**
14. **Device Panels**

#### MIDI Track Inspector Sections:
1. **Basic Track Settings**:
   - Track name
   - **e** button, **M**, **S**, **R**, **W** buttons
   - Input Transformer button
   - Record Enable, Monitor
   - MIDI Output routing dropdown
   - MIDI Channel selector
   - Bank Select
   - Program Change
   - Drum Map selector
   - Volume, Pan (MIDI CC)
2. **Track Versions**
3. **Chord Track**
4. **Expression Map** (articulation control)
5. **Note Expression**
6. **MIDI Modifiers** (transpose, velocity shift, length compression, random)
7. **MIDI Inserts** (4 MIDI insert effect slots)
8. **MIDI Sends** (4 MIDI send effect slots)
9. **MIDI Fader** (miniature channel)
10. **Notepad**

#### Instrument Track Inspector Sections:
1. **Basic Track Settings** (combines audio + MIDI controls)
   - Instrument Edit button (opens VST instrument UI)
   - Same M/S/R/W/Record/Monitor buttons
   - MIDI Input/Output routing
   - MIDI Channel selector
2. **Track Versions**
3. **Chord Track**
4. **Expression Map**
5. **Note Expression**
6. **MIDI Modifiers**
7. **MIDI Inserts**
8. **Audio Inserts**
9. **Audio EQ**
10. **Audio Sends**
11. **Cue Sends** (Pro only)
12. **Direct Routing** (Pro only)
13. **Notepad**

#### Other Track Type Inspectors:
- **Folder Track**: Minimal -- name, mute, solo, record enable, group editing toggle
- **Group Channel Track**: Similar to Audio Track but without Record Enable
- **FX Channel Track**: Similar to Audio Track
- **VCA Fader Track** (Pro only): Name, mute, solo, read/write automation
- **Marker Track**: Marker list, Add Marker button
- **Chord Track**: Chord audition settings, voicing settings
- **Tempo Track**: Tempo settings
- **Signature Track**: Time signature settings
- **Arranger Track**: Arranger chain controls

### 3.2 Editor Tab (Editor Inspector)

Shown when the Lower Zone has an editor open. Contains context-sensitive inspector for the active editor (Key Editor, Score Editor, Sample Editor, etc.).

### 3.3 Visibility Tab

Toggle track visibility in the track list. Checkboxes for each track. Filter by track type. Visibility Agents for quick selection patterns.

---

## 4. LOWER ZONE - TABS AND CONTENTS

The Lower Zone occupies the bottom section of the Project Window and contains 5 tabs (Cubase Pro 15):

### Tab Order (customizable):
1. **MixConsole** - Compact mixer view
2. **Editor** - Key Editor, Score Editor, Sample Editor, Drum Editor (context-dependent on selected event)
3. **Sampler Control** - Sample playback/editing zone for Sampler Tracks
4. **Chord Pads** - Interactive chord pads for triggering chords
5. **MIDI Remote** - MIDI controller mapping interface

### Lower Zone MixConsole Layout:
- Shows channel faders in a horizontal strip
- Per-channel: Fader, Pan knob, Mute (M), Solo (S), Record Enable (R), Monitor
- Channel name at bottom
- Meter next to fader
- No rack section (simplified view)
- Linked to Project Window track visibility (independent from full MixConsole window visibility)

### Lower Zone Editor:
- Opens Key Editor, Drum Editor, Score Editor, or Sample Editor depending on selected event
- Shares the same tools and layout as the standalone editor windows
- The Editor Inspector appears in the Left Zone under the "Editor" tab

### Chord Pads:
- Grid of colored pads (configurable count)
- Each pad displays chord name (e.g., "Cmaj", "Am7")
- Keyboard graphic at top showing MIDI note assignments
- Controls for voicing, adaptive voicing, chord complexity
- Drag chords to Chord Track or MIDI parts

### Sampler Control:
- Waveform display
- Playback controls (one-shot, loop)
- Filter section (cutoff, resonance)
- Amp envelope (ADSR)
- Pitch controls

---

## 5. RIGHT ZONE - VSTi, MEDIA, CR, METER

The Right Zone has 4 tabs across the top:

### 5.1 VSTi Tab (VST Instruments Rack)
- List of all loaded VST instruments in the project
- Each instrument slot shows:
  - Instrument name
  - Edit button (opens instrument GUI)
  - Activate/Deactivate
  - Freeze button
  - Up to 8 Quick Controls per instrument
- "Add Track Instrument" button at top
- Instrument selector/finder

### 5.2 Media Tab (MediaBay / Media Rack)
- **Home Page** with tile navigation:
  - **VST Instruments** tile
  - **Loops & Samples** tile (audio loops, MIDI loops, instrument sounds)
  - **Presets** tile (track presets, strip presets, pattern banks, FX chain presets, VST FX presets)
  - **Favorites** tile
  - **File Browser** tile
- Search bar at top
- Results list with drag-and-drop to project
- Previewer at bottom (with play button, volume, auto-play)

### 5.3 CR Tab (Control Room - Pro Only)
- Compact Control Room mixer
- Source selectors (Mix sources)
- Monitor controls
- Dim, Reference Level
- Talkback
- Click (metronome) routing
- Cue mix controls
- Insert slots for CR processing

### 5.4 Meter Tab (Pro Only)
- Master level meter
- Loudness meter (EBU R128)
- Momentary Max, Short-Term, Integrated loudness
- True Peak display
- Scale selector (Digital, DIN, EBU, British, Nordic, K-20, K-14, K-12)

---

## 6. MIXCONSOLE WINDOW

The full MixConsole opens in a separate window (F3). Up to 4 separate MixConsole windows can be configured independently.

### Window Structure:

```
+-------------------------------------------------------------------+
|                      MIXCONSOLE TOOLBAR                            |
+-------------------------------------------------------------------+
|          |              CHANNEL OVERVIEW (optional)                 |
|          +----------------------------------------------------------+
| LEFT     |              METER BRIDGE (optional)                     |
| ZONE     +----------------------------------------------------------+
|          |              EQ CURVES (optional)                        |
| -Visibility+----------------------------------------------------------+
| -History |              CHANNEL RACKS (upper zone)                  |
| -Snapshots|  [Routing] [Pre] [Inserts] [EQ] [Strip] [Sends]        |
|          |  [Cue Sends] [Direct Routing] [Quick Controls]           |
|          +----------------------------------------------------------+
|          |              FADER SECTION (always visible)              |  RIGHT
|          |  Per channel:                                            |  ZONE
|          |  - Channel name                                          |
|          |  - Input routing indicator                               |  -Control
|          |  - Inserts indicator                                     |   Room
|          |  - EQ indicator                                          |  -Meter
|          |  - Send indicator                                        |
|          |  - Pan knob                                              |
|          |  - Fader (vertical)                                      |
|          |  - Level meter (vertical, alongside fader)               |
|          |  - Solo (S), Mute (M) buttons                           |
|          |  - Listen (L), Monitor, Record Enable buttons            |
|          |  - Edit (e) button                                       |
|          |  - Read/Write automation buttons                         |
|          |  - Output routing indicator                              |
|          |  - Channel color strip at bottom                         |
+----------+----------------------------------------------------------+
```

### MixConsole Toolbar Elements:
- **Search Channel** field
- **History** (Undo/Redo for MixConsole)
- **Channel Visibility Configurations** (4 config slots + star save button)
- **Filter Channel Types** dropdown (Audio, Instrument, MIDI, Group, FX, VCA, Input, Output)
- **Separator**
- **Select Rack Types** button (shows/hides racks)
- **Channel Zoom** (narrow/wide: G/H keys)
- **Rack Zoom** (increase/decrease rack height)
- **EQ/Channel Strip display options**
- **Link/Unlink channels**
- **Bypass Inserts/EQ/Sends globally**
- **Show/Hide Left Zone**
- **Show/Hide Channel Racks (Upper Zone)**
- **Show/Hide Right Zone**
- **Set up Window Layout** (Pictures, Notepad, Channel Latencies, Meter Bridge, EQ Curves, Channel Overview)
- **Set up Toolbar** (gear icon)

### MixConsole Rack Types (Upper Zone):
1. **Hardware** - Hardware effects control (if supported)
2. **Routing** - Input/Output routing selectors
3. **Pre (Filters/Gain/Phase)** - High-Cut/Low-Cut filters, Pre-Gain, Phase invert
4. **Inserts** - 8 insert slots per channel (6 pre-fader, 2 post-fader)
5. **Equalizers** - 4-band parametric EQ with curve display
6. **Channel Strip** - Gate, Compressor, EQ, Tools (De-esser/Envelope Shaper), Saturation, Limiter
7. **Sends** - 8 send slots with level/pan
8. **Cue Sends** (Pro only) - 4 cue sends for Control Room
9. **Direct Routing** (Pro only) - Main output + 7 additional routing destinations
10. **Quick Controls** - 8 quick control slots

### Fader Section Per Channel:
- **Channel color strip** - Thin colored bar at top or bottom
- **Input indicator** - Small icon showing input source
- **Inserts indicator** - Dots showing active inserts
- **EQ indicator** - Small EQ curve thumbnail (when EQ active)
- **Sends indicator** - Dots showing active sends
- **Channel name** - Rotated 90 degrees or horizontal (depending on zoom)
- **Pan control** - Rotary knob or horizontal slider
- **Volume fader** - Vertical slider
- **Level meter** - Vertical bar meter alongside fader
- **Peak hold indicator** - Thin line showing peak level
- **dB readout** - Shows current fader value
- **Solo (S)** - Yellow when active
- **Mute (M)** - Orange/red when active
- **Listen (L)** - Green when active
- **Monitor** - Speaker icon
- **Record Enable** - Red circle
- **Edit Channel Settings (e)** - Opens Channel Settings window
- **Read Automation (R)** - Green when active
- **Write Automation (W)** - Red when active
- **Output routing** - Small text showing destination

### Channel Width Modes:
- **Narrow** - Shows minimal controls, compact fader
- **Wide** - Shows full controls, wider fader, readable text

---

## 7. KEY EDITOR (MIDI EDITOR)

The Key Editor is the primary MIDI editor, showing a piano-roll style display.

### Layout Structure:

```
+-------------------------------------------------------------------+
|                     KEY EDITOR TOOLBAR                              |
+-------------------------------------------------------------------+
|          STATUS LINE (optional)                                     |
+-------------------------------------------------------------------+
|          INFO LINE (optional) - selected note properties            |
+-------------------------------------------------------------------+
|      |                                                              |
| PIANO|              NOTE DISPLAY                                    |
| KEYS |   (Grid with MIDI notes as horizontal bars)                 |
|      |                                                              |
| C5---|---[====]-------[========]---                                |
| B4---|----------[==]----------------------------------------------|
| A4---|------[======]----[====]---                                  |
|      |                                                              |
|      |              RULER (timeline)                                |
+------+--------------------------------------------------------------+
|          CONTROLLER LANE(S)                                        |
|   (Velocity bars, CC data, pitch bend, etc.)                       |
+-------------------------------------------------------------------+
```

### Key Editor Toolbar Tools:
1. **Object Selection** (arrow) - 1
2. **Range Selection** - 2
3. **Split/Scissors** - 3
4. **Glue** - 4
5. **Erase** - 5
6. **Zoom** - 6
7. **Mute** - 7
8. **Draw/Pencil** - 8
9. **Line** - 9
   - Sub-tools: Line, Parabola, Sine, Triangle, Square, Paint
10. **Play/Scrub** - 0

### Key Editor Toolbar Additional Controls:
- **Solo Editor** toggle
- **Acoustic Feedback** (hear notes when clicking/moving)
- **Step Input** toggle
- **MIDI Input** toggle
- **Snap On/Off** and Snap Type
- **Grid Type** and **Quantize** value
- **Quantize buttons** (Apply Quantize, Undo Quantize)
- **Length Quantize**
- **Nudge Palette** (left/right)
- **Transpose Palette** (up/down by semitone or octave)
- **Velocity** insert value
- **MIDI Channel filter**
- **Global Tracks** (show/hide tempo, chord, marker tracks above note display)
- **Chord Editing** toggle
- **Scale Assistant** toggle

### Piano Keyboard (Left Side):
- Vertical piano keys from low to high
- White and black keys rendered graphically
- Note names labeled (C-1 through G9)
- Click to preview/audition notes
- Black keys are narrower and darker
- Horizontal lines extend from each key across the grid
- White key rows have slightly lighter background
- Black key rows have slightly darker background

### Note Display:
- Notes are **horizontal colored bars/rectangles**
- Length = duration, vertical position = pitch
- Color can be: velocity-based, channel-based, pitch-based, or track color
- Selected notes are highlighted (brighter/different outline)
- Grid lines: vertical lines aligned to beats/bars, horizontal lines aligned to piano keys
- Snap grid visualization

### Controller Lanes (Below Note Display):
- Default: **Velocity** bars (vertical bars per note)
- Can add multiple controller lanes:
  - Velocity
  - Pitch Bend
  - Aftertouch
  - Any CC (CC1 Modulation, CC11 Expression, CC7 Volume, etc.)
  - Program Change
  - Poly Pressure
  - System Exclusive
- Each lane has its own header with controller name
- Lane height is resizable by dragging the divider

---

## 8. SAMPLE EDITOR / AUDIO EDITOR

Opens when double-clicking an audio event.

### Layout Structure:

```
+-------------------------------------------------------------------+
|                    SAMPLE EDITOR TOOLBAR                           |
+-------------------------------------------------------------------+
|          OVERVIEW LINE (miniature of full clip)                     |
+-------------------------------------------------------------------+
|          RULER (timeline)                                           |
+-------------------------------------------------------------------+
|                                                                    |
|  LEVEL |          WAVEFORM DISPLAY                                 |
|  AXIS  |                                                           |
|  (dB/  |   ~~~^^^^^vvvv^^^^^^^^^vvvvvvv~~~~~                     |
|   %)   |                                                           |
|        |                                                           |
+--------+-----------------------------------------------------------+
|          REGIONS / HITPOINTS (optional)                             |
+-------------------------------------------------------------------+
```

### Toolbar Tools:
- Object Selection
- Range Selection
- Zoom
- Draw tool (for redrawing waveform at sample level)
- Play/Scrub
- Snap controls
- Musical Mode toggle
- VariAudio controls (Cubase Pro)
- AudioWarp controls
- Hitpoint detection controls

### Waveform Display Features:
- Waveform rendered as filled area (positive and negative amplitude)
- Level axis on left (dB or percentage)
- Half-level axis (optional)
- Tempo grid overlay
- Event start/end handles (draggable triangles)
- Fade-in/fade-out curve handles
- Hitpoint lines (vertical markers at transients)
- VariAudio pitch segments (colored blocks overlaying waveform, Pro only)

### VariAudio (Pro Only):
- Pitch segments displayed as colored blocks
- Each segment shows detected pitch
- Segments can be moved (pitch correction) or resized (time stretch)
- Color coding: can be set to show pitch deviation, segment type, or event color
- Straighten Pitch tool for pitch correction

---

## 9. SCORE EDITOR

The Score Editor displays MIDI as traditional music notation.

### Layout Structure:

```
+-------------------------------------------------------------------+
|                    SCORE EDITOR TOOLBAR                            |
+-------------------------------------------------------------------+
| LEFT ZONE        |                              | RIGHT ZONE       |
| (Symbols tab /   |    SCORE DISPLAY              | (only in         |
|  Inspector tab)  |                              |  separate window) |
|                  |    Standard music notation    |                  |
| - Notes symbols  |    with staves, clefs,        |                  |
| - Dynamics       |    notes, rests, barlines,     |                  |
| - Articulations  |    dynamics, expressions       |                  |
| - Text           |                              |                  |
| - Lines          |    Multiple staves for         |                  |
| - Other symbols  |    multi-track scores          |                  |
+------------------+------------------------------+------------------+
```

### Key Features (Cubase 14/15 - Dorico-Based Engine):
- **Page View** - Traditional page layout with margins
- **Fill View** - Music re-flows to fill editor window width
- Staves, clefs, key signatures, time signatures
- Note heads, stems, beams, ties, slurs
- Dynamic markings (pp, mp, mf, f, ff, etc.)
- Articulations (staccato, accent, tenuto, etc.)
- Text blocks, lyrics, rehearsal marks
- Chord symbols
- Multi-voice support
- Part extraction from full score

### Insert Layers:
1. **Note Layer** - For note-related objects
2. **Project Layer** - For project-wide objects
3. **Layout Layer** - For layout-specific objects

### Score Settings Dialog Tabs:
- **Project** tab: fonts, styles
- **Layout** tab: page layout settings
- **Staff** tab: staff-specific settings

---

## 10. MEDIABAY / MEDIA BROWSER

### Full MediaBay Window (F5):

```
+-------------------------------------------------------------------+
|                    MEDIABAY TOOLBAR                                |
+-------------------------------------------------------------------+
| FILE BROWSER  |  RESULTS       |  PREVIEWER                       |
| (tree view)   |  LIST          |  (waveform preview,              |
|               |                |   play button,                    |
| - Favorites   |  Columns:      |   volume control,                |
| - Computer    |  - Name        |   auto-play toggle)              |
| - User        |  - Type        |                                  |
|   Content     |  - Rating      |  FILTERS                         |
| - Factory     |  - Media Type  |  (attribute filters,             |
|   Content     |  - Family      |   tag filtering)                |
|               |  - Sub Category|                                  |
+---------------+----------------+----------------------------------+
```

### Right Zone Media Rack (Compact Version):
- Home Page with tiles:
  - **VST Instruments** tile
  - **Loops & Samples** tile (organized by content set)
  - **Presets** tile (Track, Strip, FX Chain, Pattern Bank, VST FX)
  - **Favorites** tile
  - **File Browser** tile
- Search bar at top
- Back/Home navigation
- Results list with columns
- Previewer at bottom
- Drag-and-drop to project

---

## 11. CONTROL ROOM

The Control Room (Cubase Pro only) emulates a studio monitor section.

### Control Room Mixer Sections:

The CR Mixer is accessed via **Studio > Control Room** or via the **CR tab** in the Right Zone.

1. **External** - External audio routing
2. **Channels** - Defined studio channels
3. **Cue Channels** (up to 4):
   - Source selector
   - Level control
   - Pan
   - Talkback routing
   - Click routing
4. **Monitors** (up to 4 monitor outputs):
   - Output level
   - Source selection
   - Solo monitor
   - Downmix preset
5. **Phones** - Headphone output controls
6. **Control Room Channel** (main):
   - Signal Level fader (does not affect mix or export)
   - Source Selectors (Mix, External inputs)
   - Dim button (reduces level by fixed amount)
   - Reference Level button
   - Mono button
   - Talkback button
   - Click level
   - Insert slots for metering/processing
7. **Downmix Presets** - Format conversion

### Control Room Layout:
- **Mixer tab** at bottom: All regularly used controls for recording/mixing/mastering
- Collapsible sections (click header to expand/collapse)
- Ctrl/Cmd-click to open multiple sections simultaneously
- Insert effects can be added to any CR channel

---

## 12. TRANSPORT PANEL / TRANSPORT BAR

### Transport Panel (F2 - Floating Window)

```
+-------------------------------------------------------------------+
| Perf | RecMode | Locators | Punch | Main Transport | Arranger     |
+-------------------------------------------------------------------+
| PreRoll/PostRoll | Tempo/TimeSig | Markers | MIDI/Audio Activity  |
+-------------------------------------------------------------------+
```

#### Transport Panel Sections:

1. **Performance Meter**
   - ASIO processing load bar
   - Disk transfer rate bar

2. **Record Mode**
   - Normal, Merge, Replace, Punch on lane
   - Auto MIDI record quantize

3. **Locators**
   - Left Locator position (numeric, editable)
   - Right Locator position (numeric, editable)
   - Go to Left/Right Locator buttons

4. **Punch Points**
   - Punch In toggle
   - Punch Out toggle
   - Punch In/Out positions (numeric)
   - Lock Punch Points to Locators toggle

5. **Main Transport Controls**
   - **|<** Go to Start
   - **<<** Rewind
   - **>>** Forward
   - **>|** Go to End
   - **O** Cycle/Loop toggle
   - **Stop**
   - **Play** (triangle)
   - **Record** (red circle)
   - **Time Display** (large numeric readout, switchable format)

6. **Arranger**
   - Arranger chain selector
   - Previous/Next arranger event
   - Activate arranger mode

7. **Pre-roll / Post-roll**
   - Pre-roll toggle + value
   - Post-roll toggle + value

8. **Tempo & Time Signature**
   - Tempo Track On/Off toggle
   - Tempo value (numeric, editable)
   - Time Signature display
   - Click/Metronome On/Off
   - Click Precount On/Off
   - Sync toggle

9. **Markers**
   - Previous/Next Marker
   - Add Marker buttons

10. **MIDI Activity**
    - MIDI In indicator (flashes on input)
    - MIDI Out indicator (flashes on output)

11. **Audio Activity**
    - Audio In indicator
    - Audio Out indicator

12. **Audio Level Control**
    - Clipping indicators
    - Output level control

### Transport Bar (Bottom of Project Window)
- Same controls as the Transport Panel but in a single-line strip
- Can be expanded by dragging divider handles to show more sections

---

## 13. TRACK TYPES AND VISUAL REPRESENTATION

### Complete List of Track Types in Cubase Pro 15:

| Track Type | Visual Cues | Icon |
|---|---|---|
| **Audio Track** | Waveform display, colored event blocks | Speaker/waveform icon |
| **Instrument Track** | MIDI block display (like piano-roll preview), colored | Keyboard icon |
| **MIDI Track** | MIDI block display, colored | MIDI plug icon |
| **Sampler Track** | Waveform in event, special icon | Sampler icon |
| **Group Channel Track** | No events on timeline, used for routing | Folder-like icon |
| **FX Channel Track** | No events on timeline, used for effects | FX text icon |
| **VCA Fader Track** (Pro) | Automation lanes, green fader cap in MixConsole | VCA text |
| **Folder Track** | Expandable, shows nested track overview | Folder icon |
| **Chord Track** | Chord symbols displayed in events (e.g., "Cmaj7") | Music note icon |
| **Marker Track** | Colored markers along timeline | Flag icon |
| **Ruler Track** | Independent timeline ruler | Ruler icon |
| **Signature Track** | Time signature events (e.g., "4/4", "3/4") | Time sig icon |
| **Tempo Track** | Tempo curve/events (e.g., "120 BPM") | Metronome icon |
| **Transpose Track** | Transpose events | Up/Down arrow icon |
| **Arranger Track** | Colored arranger events with section names | Arranger icon |
| **Video Track** | Video thumbnail frames | Film strip icon |

### Track Header Controls (Per Track):
Default controls always visible:
- **Track Color Bar** - Thin vertical color stripe at left edge
- **Track Icon** - Small icon indicating track type
- **Track Name** - Editable text label
- **Mute (M)** button
- **Solo (S)** button

Additional configurable controls:
- **Record Enable** (red dot)
- **Monitor** (speaker icon)
- **Read Automation (R)**
- **Write Automation (W)**
- **Freeze** button
- **Edit Channel Settings (e)**
- **Lock** toggle
- **Show Lanes** toggle
- **Timebase** toggle (musical/linear)
- **Volume slider** (horizontal, NEW in Cubase 15)
- **Pan control** (NEW in Cubase 15)

### Track Height:
- Tracks can be resized vertically
- Minimum: 1 line (just name and M/S buttons)
- At larger heights: waveforms, MIDI previews, automation curves become visible
- Very small heights: only color bar and name visible

### Event/Part Appearance:
- **Audio Events**: Show waveform in track color, outlined rectangle
- **MIDI Parts**: Show miniature piano-roll preview (small lines representing notes)
- **Audio Parts** (containers): Show multiple audio events within a container
- Events have rounded corners on the header area
- Fade in/out shown as curved lines at event edges
- Crossfades shown where events overlap
- Volume handle on top of events (small square, draggable)

---

## 14. COLOR SCHEME AND VISUAL DESIGN LANGUAGE

### Default Dark Theme Characteristics:

**Background Colors (approximate - extracted from screenshots):**
- Main background: Dark charcoal grey (~#2D2D2D to #3A3A3A range)
- Toolbar background: Slightly darker grey (~#282828 to #303030)
- Left/Right Zone backgrounds: Similar to main background
- Inspector section headers: Slightly lighter grey
- Track list background: Dark grey with alternating subtle contrast
- Event display background: Dark grey (~#353535)
- Grid lines: Very subtle, slightly lighter than background (~#404040)
- Lower Zone tab bar: Dark grey with active tab highlighted
- MixConsole background: Very dark grey (~#252525)

**Text Colors:**
- Primary text: Light grey/white (#CCCCCC to #FFFFFF)
- Secondary text: Medium grey (#888888 to #AAAAAA)
- Disabled text: Dark grey (#555555)
- Active button text: White

**Accent/Highlight Colors:**
- Selection highlight: Blue tone (similar to #4A90D9 or #5B9BD5)
- Active/Engaged buttons: Often a blue-ish or orange tint
- Solo button active: **Yellow**
- Mute button active: **Orange/Amber**
- Record enable: **Red**
- Monitor active: **Orange**
- Read automation (R): **Green**
- Write automation (W): **Red**
- Listen button active: **Green**
- VCA fader cap: **Green**
- Cycle/Loop active: **Purple/Blue bar** on ruler

**Track Type Default Colors (factory defaults are muted/desaturated):**
- Audio: Steel blue
- Instrument: Warm amber/golden
- MIDI: Teal/cyan
- Group: Light blue
- FX: Purple/lavender
- Folder: Grey
- Marker: Light green/lime
- Chord: Golden/yellow
- VCA: Green

**Event Appearance:**
- Events take on track color
- Waveforms rendered in darker shade of track color
- MIDI parts show small note lines in track color
- Selected events: Brighter with highlight border
- Muted events: Desaturated/dimmed

### Color Management System (Cubase 14/15):

**Customizable Areas (via Preferences > User Interface > Color Schemes):**
1. **General** - Focus zones, desktop cover
2. **Track Type Defaults** - Per-type default colors
3. **Project** - Project window colors
4. **Editors** - Can use Project colors or separate colors
5. **Rulers** - Ruler colors
6. **MixConsole Faders** - Per-channel-type fader colors
7. **MixConsole Racks** - Rack section colors
8. **MixConsole Channel Strip** - Channel strip colors

**Color Scheme System (C14/15):**
- User Color Scheme automatically applies **darker backgrounds** while accent colors remain brighter
- **Limited hue range** for backgrounds (brown to green to teal) prevents overly saturated backgrounds
- Forced desaturation of background colors prevents visual conflicts
- Bright saturated colors reserved for **foreground elements** (buttons, indicators)
- Cannot set background to pure black (darkest is a medium-dark grey)
- Color picker has limited range for overall scheme color
- Track colors have 16+ color palette (expandable, user-customizable)

**Auto Track/Channel Color Mode Options:**
- Use Track's Default Color
- Use Previous Track Color
- Use Previous Track Color +1 (next in palette)
- Use Last Applied Color
- Use Random Track Color

**Color Intensity Controls:**
- Color Strength slider
- Selected Channel Brightness
- Show Color for Selected Channel toggle

### Typography:
- Cubase uses its own internal fonts
- Clean sans-serif typeface throughout
- Track names: Regular weight, medium size
- Inspector headers: Bold/semi-bold, slightly smaller
- Toolbar labels: Small caps or small text
- MixConsole channel names: Can be horizontal (wide) or rotated vertically (narrow)
- Time display: Monospace/fixed-width for numeric readouts
- Cubase 15 increased font sizes in Media Browser and Plugin Manager
- Increased padding/negative space between text elements

### Icon Style:
- Monochrome icons (light grey on dark background)
- Simple, geometric shapes
- Small in size (~16x16 to 20x20px)
- Tool icons: Minimal line-art style (arrow, pencil, scissors, eraser, magnifying glass, etc.)
- Track type icons: Simple symbolic representations
- Button states: Normal (grey), Hover (slightly lighter), Active (colored - blue/yellow/red depending on function)

---

## 15. METERING AND LEVEL DISPLAY

### Channel Level Meters:
- **Type**: Digital peak meters
- **Display**: Vertical plasma-column bars
- **Colors (bottom to top)**:
  - Green (low level, safe zone)
  - Yellow/Amber (approaching 0dB)
  - Orange (near clipping)
  - Red (clipping)
- **Clip indicator**: Virtual LED at top of meter (stays red after clipping until reset)
- **Peak hold**: Static horizontal line showing highest peak
- **4 color zones** with customizable turnover points (Preferences > Metering > Appearance)

### Master Meter (True Peak):
- Multi-channel true peak meter
- Scale options: Digital, DIN, EBU, British, Nordic, K-20, K-14, K-12
- Red headroom lines in meter scale
- Alignment level offset (default -18 dBFS for broadcast scales)
- RMS display: Blue lines for RMS/peak hold values
- Peak display: Grey lines for peak values
- AES17 mode: +3dB offset to RMS

### Loudness Meter (EBU R128):
- **Momentary Max** (M): 400ms integration time
- **Short-Term** (S): 3 second integration time
- **Integrated** (I): Average from start to stop
- **Loudness Range** (LRA)
- **True Peak Level** (TP)
- Target: -23 LUFS (0 LU relative)
- Max true peak: -1 dB TP
- Scale: EBU +9 or EBU +18

### Meter Customization:
- **Waveform Brightness** slider
- **Waveform Outline Intensity** slider
- **Background Color Modulation** (reflects waveform dynamics in background)
- Meter fallback time: 12 dB/s default, up to 80 dB/s in C15
- Channel meter characteristics: PPM or Wave
- Per-meter-zone color customization (4 colors + clip)

---

## 16. PLUGIN WINDOW INTEGRATION

### Plugin Window Design:
- Plugins open in **floating windows** with a thin Cubase frame/toolbar
- Plugin toolbar at top of window contains:
  - Plugin name
  - Preset selector (dropdown)
  - Previous/Next preset arrows
  - Save/Load preset buttons
  - A/B comparison
  - Bypass toggle
  - Read/Write automation
  - Pin/Unpin window
  - VST2/VST3 indicator
  - Switch to Generic Editor option
  - Window resize handle (for DPI-unaware plugins)

### Scaling (Cubase 15):
- All stock Cubase effects support UI scaling
- VST3 plugins with proper HiDPI support scale automatically
- Per-monitor DPI awareness (Windows 11)
- Resize option in plugin toolbar for DPI-unaware plugins
- macOS: Application-wide scaling via Preferences (new in C15)

### Plugin Categories (Stock):
- **Dynamics**: Compressor, Limiter, Gate, Expander, De-Esser, UltraShaper (new C15)
- **EQ**: StudioEQ, GEQ-10, GEQ-30
- **Reverb**: REVerence, RoomWorks, RoomWorks SE
- **Delay**: StereoDelay, MonoDelay, PingPongDelay
- **Modulation**: Chorus, Flanger, Phaser, Rotary, Vibrato, Tremolo
- **Distortion**: Distortion, Saturation, AmpSimulator, Magneto II
- **Pitch**: PitchCorrect, PitchShifter (new C15), Octaver
- **Tools**: Tuner, TestGenerator, StereoEnhancer
- **Instruments**: HALion Sonic SE, Groove Agent SE 6 (new C15), Retrologue, Padshop

---

## 17. CHORD, MARKER, TEMPO, SIGNATURE TRACKS

### Chord Track:
- Events display chord names (e.g., "Cmaj", "Dm7", "G7")
- Events are rectangular blocks on the timeline
- Default height: 2 rows
- Inspector: Chord audition settings, voicing settings, Follow Chord Track options
- Can influence pitch of other tracks via "Follow Chord Track" settings

### Marker Track:
- Up to 10 marker tracks per project
- Two types:
  - **Position Markers**: Single point markers (flag/triangle at position)
  - **Cycle Markers**: Ranged markers (colored bar spanning a range)
- Markers display names (e.g., "Intro", "Verse 1", "Chorus")
- Color-coded
- Markers can optionally shade the arrangement area below them

### Tempo Track:
- Displays tempo curve or tempo events
- Default height: 2 rows
- Tempo values shown as points on a curve
- Default: 120 BPM
- Can be opened in a dedicated **Tempo Editor** window
- Tempo Editor: Similar to graphical editors (Key Editor style)
  - Ruler at top
  - Signature editor along the top (below ruler)
  - Tempo curve in main area
  - Draw/Edit tempo changes with pencil tool

### Signature Track:
- Displays time signature events (e.g., "4/4", "3/4", "6/8")
- Default height: 1 row
- Events shown as text blocks at their position
- Default: 4/4 at start of project

### Transpose Track:
- Displays transpose events (semitone offsets)
- Events shown as numbered blocks (e.g., "+3", "-2")

### Arranger Track:
- Only one per project
- Events are colored blocks with section names
- Each event has a unique color
- Events can be any length and can overlap
- Arranger chain displayed in a list view in the Inspector or Arranger Editor

### Global Tracks in Editors:
- Global tracks (Tempo, Signature, Chord, Ruler, Arranger, Video, Marker, Transpose) can be shown above the note display in the Key Editor
- Default heights: Tempo = 2 rows, Chord = 2 rows, Video = 3 rows, others = 1 row

---

## 18. CHANNEL SETTINGS WINDOW

Opens when clicking the **e** button on any channel.

### Layout Structure:

```
+-------------------------------------------------------------------+
|  Channel Settings Toolbar                                          |
+-------------------------------------------------------------------+
| LEFT PANE          | CENTER PANE             | RIGHT PANE          |
|                    |                         |                     |
| Tab: Inserts       | Tab: Channel Strip      | Tab: Sends          |
| Tab: Strip (signal)| Tab: Equalizer          | Tab: Cue Sends      |
|                    |                         |                     |
| Insert slots 1-8   | Large EQ curve display  | Send slots 1-8      |
| (with plugin names | with interactive bands   | (with routing,      |
|  and bypass)       |                         |  level, pan)        |
|                    | OR                      |                     |
| OR                 |                         | OR                  |
|                    | Channel Strip modules:   |                     |
| Strip signal flow  | - Gate controls          | Cue Send controls   |
| (draggable order)  | - Compressor controls    |                     |
|                    | - EQ controls            |                     |
|                    | - Tools controls         |                     |
|                    | - Saturation controls    |                     |
|                    | - Limiter controls       |                     |
+--------------------+-------------------------+---------------------+
|               FADER (at far right or bottom)                       |
|  Fader + Meter + Solo/Mute + Channel name                         |
+-------------------------------------------------------------------+
```

### Three-Pane Design:
1. **Left Pane**: Toggle between Inserts view and Strip signal chain view
   - Inserts: 8 slots showing plugin name, bypass, edit buttons
   - Strip: Draggable signal flow modules
2. **Center Pane**: Toggle between Channel Strip and Equalizer
   - Channel Strip: Large, detailed controls for each module (Gate, Compressor, EQ, Tools, Saturation, Limiter)
   - Equalizer: Large interactive EQ curve with 4 bands + high/low-cut filters
     - Three display modes: Sliders, Knobs, or Curve-only (larger view)
     - Live spectrum analyzer overlay
3. **Right Pane**: Toggle between Sends and Cue Sends
   - Sends: 8 slots with routing, level, pan, pre/post toggle
   - Cue Sends: 4 cue send controls

### Channel Strip Modules (Expandable):
Each has an **e** button for expanded controls with visual feedback/metering:
1. **Gate** - Threshold, Attack, Hold, Release, Range, Side-chain filter
2. **Compressor** - Threshold, Ratio, Attack, Release, Make-up Gain, Knee
3. **EQ** - 4-band parametric (same as Equalizer tab)
4. **Tools** (De-esser OR Envelope Shaper):
   - De-esser: Reduction, Threshold, Frequency
   - Envelope Shaper: Attack Gain, Release Gain, Attack Length
5. **Saturation** (Magneto II, Tape, Tube):
   - Drive, Output, Tone
6. **Limiter** (Brickwall, Maximizer, Standard):
   - Threshold, Release, Output

### Signal Flow Order:
Inserts -> Strip -> Sends (fixed, but modules within Strip can be reordered via drag-and-drop)

---

## 19. CUBASE 15 SPECIFIC UI CHANGES

### New / Changed in Cubase 15 vs. Cubase 14:

1. **Redesigned Hub**
   - Resizable sections
   - Audio setup helper with waveform icon for device testing
   - Project preview without opening (if preview file exists)
   - Search and filter tools
   - Accessible from toolbar

2. **Track Header Volume & Pan**
   - Volume sliders can now be added directly to track headers
   - Horizontal slider format
   - Customizable per track type via Track Control Settings
   - Pan control also available on track header
   - Four new presets: Standard, Simple, Recording, Mixing

3. **Quick Audio Export Button**
   - New button at top-right of toolbar
   - Eliminates need to set locator points manually

4. **Automation Improvements**
   - "Last-touched parameter" shortcut
   - Simplified automation parameter menu
   - Automation appears as top lane when touching parameters

5. **Typography & Spacing**
   - Larger fonts in Media Browser
   - Increased padding between text elements
   - More negative space in accordion items
   - Increased font sizes in Plugin Manager

6. **Color System Refinements**
   - Reduced high-contrast black backgrounds (behind "Editor" and "Chord Pads" text)
   - Removed "Gray" preset that broke color consistency
   - Arranger arrow buttons no longer default to green
   - Clearer color logic system
   - User Color Scheme: darker backgrounds with brighter accent colors
   - Limited hue range (brown-green-teal) for backgrounds
   - Forced desaturation prevents background/foreground visual conflicts

7. **Plugin Scaling**
   - All stock effects support user-interface scaling
   - Can be used full screen
   - macOS application-wide scaling via Preferences

8. **VST Plugin Manager Overhaul**
   - Complete visual redesign aligning with sequencer aesthetics
   - New filter: "Show Plug-ins Used in Active Project"
   - Separator elements in Custom Collections

9. **macOS Full-Screen Support**
   - Native full-screen mode for Project and MixConsole windows
   - Pinch-to-zoom gestures on compatible devices

10. **Scrolling Behavior**
    - Unified horizontal scrolling between Windows and macOS
    - Windows direction reversed to match macOS/native OS
    - SHIFT + mouse wheel standardized across editors
    - New "Invert Direction for Horizontal Scrolling" preference

11. **Metering**
    - Meter fallback time parameter increased to 80 dB/s (from 40 dB/s max)

12. **Toolbar Enhancements**
    - Items can be collapsed/expanded via three vertical dots
    - Hub access from toolbar
    - Quick Audio Export button

13. **Application Setup Reorganization**
    - macOS: Audio Settings and Key Commands moved to application menu
    - Windows: moved to bottom of Edit menu
    - New consolidated Audio Settings window

14. **Score Editor Updates**
    - New tools and enhanced workflows
    - Dorico 6 engine integration
    - Note fade in/out for lead sheets
    - Improved voice separation for choral work

15. **Expression Maps (Redesigned)**
    - Streamlined setup
    - Deep integration with Key Editor and Score Editor
    - Automatic keyswitch importing
    - Per-articulation attack compensation
    - Grouping capabilities
    - Per-articulation MIDI modifiers (timing offset, transposition)

16. **Melodic Pattern Editor**
    - Monophonic and polyphonic modes
    - Step input with arrow-key navigation
    - Custom scales, shape generators
    - Smart randomizer
    - Chord-dragging from Chord Track
    - Patterns save as presets within pattern banks

17. **New Instruments / Effects**
    - **UltraShaper**: Dynamics processor (transient shaping, clip limiting, EQ)
    - **PitchShifter**: Real-time +/-24 semitones, formant control, saturation
    - **Groove Agent SE 6**: Scalable UI, new mixer, enhanced effects, dual kit/player interface, detachable windows
    - **Omnivocal (Beta)**: Yamaha vocal synthesis engine
    - **Cubase Drum Machine**: 40 new kits (electronic, hip-hop, trap)
    - **6 New Modulators**: Random generator, sample & hold, wavefold LFO, etc.

18. **Stem Separation**
    - AI-powered audio separation
    - Audio menu > "Separate Stems..."
    - Extracts 4 stems: vocals, drums, bass, other

---

## 20. DESIGN SYSTEM REFERENCE

### Visual Hierarchy:

```
LEVEL 1: Window chrome / outer frame (darkest)
  LEVEL 2: Zone backgrounds (dark grey)
    LEVEL 3: Section headers / tab bars (slightly lighter grey)
      LEVEL 4: Content areas (medium-dark grey)
        LEVEL 5: Input fields / slots (slightly lighter)
          LEVEL 6: Hover states (subtle lightening)
            LEVEL 7: Active/selected states (colored or light)
```

### Component Patterns:

**Buttons:**
- Flat design, minimal borders
- Normal: Dark grey background, light grey icon/text
- Hover: Slightly lighter background
- Active/Engaged: Colored background (blue, yellow, red, green depending on function)
- Toggle buttons have distinct on/off states

**Faders (MixConsole):**
- Vertical orientation in MixConsole
- Horizontal orientation in Inspector/Track Header
- Grey track/groove
- Lighter grey or colored handle/cap
- VCA fader cap: Green
- Standard fader cap: Light grey
- Scale markings: Subtle grey text (-inf to +12 dB)

**Knobs:**
- Small rotary knobs for Pan, Quick Controls
- Arc-style indicator around knob
- Current value shown as highlighted portion of arc
- Center detent for Pan (center position marked)

**Dropdown/Selectors:**
- Dark grey background
- Light text
- Subtle border or edge
- Down arrow indicator
- Opens a popup list

**Accordion Sections (Inspector):**
- Header bar with section name (bold)
- Click to expand/collapse
- Expanded section shows controls
- Thin separator lines between sections
- Active/expanded header may have subtle highlight

**Tabs:**
- Dark background
- Active tab: Slightly lighter or with accent underline
- Tab text: Light grey (inactive) / White (active)
- Lower Zone tabs: Horizontal row at top of lower zone
- Right Zone tabs: Horizontal row at top of right zone

**Scrollbars:**
- Thin, dark
- Appear on hover or when scrolling
- Minimal visual presence

**Meters:**
- Vertical bars (MixConsole, Right Zone)
- Plasma column style (gradient from green to red)
- Dark background behind meter
- Clip LED at top
- Peak hold line (thin horizontal)
- Scale markings on side (dB values)

**Grid:**
- Subtle lines on dark background
- Beat lines slightly more visible than subdivision lines
- Bar lines most visible
- Horizontal pitch lines in Key Editor alternate between white/black key shading

**Waveforms:**
- Filled area shape
- Color derived from track color
- Positive and negative amplitude shown
- Background modulation option (background reflects dynamics)
- Outline can be adjusted for intensity

### Spacing & Proportions:
- Inspector width: ~220-280px (resizable)
- Right Zone width: ~250-350px (resizable)
- Track header width: ~200-300px (configurable)
- Toolbar height: ~30-35px
- Lower Zone height: ~200-400px (resizable)
- Channel width in MixConsole: ~40px (narrow) to ~120px (wide)
- Fader height in MixConsole: ~200-400px (resizable)
- Transport bar height: ~30px

### Border/Separator Styles:
- Thin 1px lines between zones
- Zone dividers can be dragged to resize
- Subtle shadow/gradient at zone boundaries
- No heavy borders or outlines
- Clean, minimal separation

---

## SOURCES

- [Cubase 15 Release Notes](https://www.steinberg.net/cubase/release-notes/15/)
- [New in Cubase 15: Designed to Inspire](https://www.steinberg.net/cubase/new-features/)
- [Cubase 15 Released - Attack Magazine](https://www.attackmagazine.com/news/cubase-15-released-heres-whats-new/)
- [Steinberg Cubase 15 - SYNTH ANATOMY](https://synthanatomy.com/2025/11/steinberg-cubase-15-daw-receives-a-major-update-with-new-features.html)
- [Cubase 15 - Everything You Need to Know - MusicTech](https://musictech.com/news/music/cubase-15-everything-you-need-to-know/)
- [Steinberg Cubase 15 Pro Review - ProAudio.tech](https://www.proaudio.tech/reviews/steinberg-cubase-15-pro)
- [Subtle UI Changes in Cubase 15 - Steinberg Forums](https://forums.steinberg.net/t/subtle-ui-changes-in-cubase-15-that-can-add-up-to-great-change/1014481)
- [Cubase 15 Volume/Pan on Track Header - Steinberg Forums](https://forums.steinberg.net/t/cubase-15-volume-pan-on-track-header/997243)
- [Project Window Toolbar - Cubase Pro 15.0](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/project_window/project_window_toolbar_r.html)
- [MixConsole Window - Cubase Pro 11](https://steinberg.help/cubase_pro/v11/en/cubase_nuendo/topics/mixconsole/mixconsole_mixconsole_window_r.html)
- [Channel Strip Modules - Cubase Pro 11](https://archive.steinberg.help/cubase_pro/v11/en/cubase_nuendo/topics/mixconsole/mixconsole_channel_strip_modules_r.html)
- [Key Editor - Cubase Pro](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/midi_editors/midi_editors_key_editor_r.html)
- [Sample Editor - Cubase Artist 15.0](https://www.steinberg.help/r/cubase-artist/15.0/en/cubase_nuendo/topics/sample_editor_window/sample_editor_overview_r.html)
- [Score Editor - Cubase Pro Score](https://archive.steinberg.help/cubase_pro_score/v11/en/cubase_nuendo_score/topics/score_editor_window/score_editor_window_r.html)
- [Cubase 14 Score Editor - Scoring Notes](https://www.scoringnotes.com/reviews/cubase-14-score-editor/)
- [Media Rack in Right Zone - Cubase Pro 12](https://steinberg.help/cubase_pro/v12/en/cubase_nuendo/topics/mediabay/mediabay_in_right_zone_r.html)
- [Control Room Mixer - Cubase Pro](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/control_room/control_room_mixer_c.html)
- [Transport Panel Sections - Cubase Pro](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/playback/playback_transport_panel_sections_r.html)
- [Channel Settings Workflow - Sound On Sound](https://www.soundonsound.com/techniques/cubase-10-channel-settings-workflow)
- [MixConsole Workflow Wins - Sound On Sound](https://www.soundonsound.com/techniques/cubase-mixconsole-workflow-wins)
- [Using MixConsole Rack - Sound On Sound](https://www.soundonsound.com/techniques/using-cubases-mixconsole-rack)
- [Track Control Settings - Cubase Pro](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/tracks_about/tracks_about_customizing_track_controls_r.html)
- [Inspector Sections - Cubase Pro 12](https://archive.steinberg.help/cubase_pro/v12/en/cubase_nuendo/topics/tracks_about/tracks_about_inspector_sections_r.html)
- [Metering and Loudness - Cubase Pro](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/loudness/loudness_c.html)
- [Color Management in Cubase 14 - Steinberg Help Center](https://helpcenter.steinberg.de/hc/en-us/articles/25087469001874-Color-Management-in-Cubase-14-Nuendo-14)
- [Track & MixConsole Channel Colors - Cubase Pro 10.5](https://archive.steinberg.help/cubase_pro/v10.5/en/cubase_nuendo/topics/preferences/preferences_user_interface_track_channel_colors_r.html)
- [Cubase Pro 14 Operation Manual (Scribd)](https://www.scribd.com/document/824362631/Cubase-Pro-14-0-Operation-Manual-En)
- [Cubase 15 on macOS Audio](https://www.macosaudio.com/2025/11/cubase-15-unlocks-new-features-and-workflows/)
