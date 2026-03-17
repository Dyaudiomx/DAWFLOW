# Cubase 15 Pro UI Design Reference

**Purpose:** Comprehensive visual design reference for implementing a Cubase-accurate look in DAW FLOW within GTK2 constraints. All details below are derived from official Steinberg documentation, professional reviews, community analysis, and Cubase Pro 15 screenshots.

**Last Updated:** 2026-03-17

---

## Table of Contents

1. [Overall Color Palette & Theme](#1-overall-color-palette--theme)
2. [Project Window Layout](#2-project-window-layout)
3. [Toolbar](#3-toolbar)
4. [Track Headers](#4-track-headers)
5. [Timeline Ruler](#5-timeline-ruler)
6. [Event Display (Arrangement Area)](#6-event-display-arrangement-area)
7. [Inspector (Left Zone)](#7-inspector-left-zone)
8. [Lower Zone](#8-lower-zone)
9. [MixConsole](#9-mixconsole)
10. [Transport Bar](#10-transport-bar)
11. [Typography](#11-typography)
12. [Icons & Visual Elements](#12-icons--visual-elements)
13. [Interactive Element Patterns](#13-interactive-element-patterns)
14. [GTK2 Implementation Notes](#14-gtk2-implementation-notes)

---

## 1. Overall Color Palette & Theme

### Default Dark Theme ("Steinberg Dark")

Cubase 15 ships with four built-in color schemes: **Steinberg Dark**, **Steinberg Light**, **Steinberg Dark HD**, and **Steinberg Light HD**. The default and most commonly used is Steinberg Dark.

#### Primary Background Colors (Approximate Hex)

These values are derived from community eyedropper sampling of the default Steinberg Dark theme:

| Element                        | Approximate Hex | Description                           |
|--------------------------------|-----------------|---------------------------------------|
| Main window frame/border       | `#1A1A1A`       | Near-black, "midnight black" outer frame |
| Toolbar background             | `#2A2A2A`       | Very dark gray                        |
| Track list background          | `#2D2D2D`       | Dark neutral gray                     |
| Event display / arrangement bg | `#333333`       | Medium-dark gray                      |
| Inspector background           | `#2B2B2B`       | Slightly darker than track list       |
| MixConsole background          | `#252525`       | Dark gray, slightly warm              |
| Lower zone background          | `#2E2E2E`       | Consistent with main arrangement      |
| Transport bar background       | `#222222`       | Very dark, near frame color           |
| Selected track highlight       | `#3C3C3C`       | Lighter gray for selection            |
| Hover state                    | `#383838`       | Subtle highlight on mouse-over        |
| Divider/separator lines        | `#404040`       | Thin 1px separators                   |
| Panel borders                  | `#1E1E1E`       | Near-black panel outlines             |

#### Text Colors

| Element                  | Approximate Hex | Description                 |
|--------------------------|-----------------|------------------------------|
| Primary text             | `#CCCCCC`       | Light gray, not pure white   |
| Secondary/dimmed text    | `#888888`       | Medium gray for labels       |
| Disabled text            | `#555555`       | Dark gray for inactive items |
| Selected text            | `#FFFFFF`       | Pure white on selection      |
| Value displays           | `#E0E0E0`       | Bright but not harsh         |

#### Accent & State Colors

| Element                    | Approximate Hex | Description                          |
|----------------------------|-----------------|--------------------------------------|
| Solo button (active)       | `#CC3333`       | Red - matches hardware convention    |
| Mute button (active)       | `#CCAA00`       | Yellow - standard DAW convention     |
| Record arm (active)        | `#CC0000`       | Bright red - "hot" / armed           |
| Record arm (inactive)      | `#666666`       | Dimmed gray circle                   |
| Monitor button (active)    | `#CC8800`       | Orange                               |
| Playback cursor            | `#FFFFFF`       | White vertical line                  |
| Loop/cycle range           | `#4A6A8A`       | Muted blue/teal overlay on ruler     |
| Selection highlight        | `#3A5070`       | Blue tint for selected regions       |
| Snap/grid lines            | `#3A3A3A`       | Very subtle dark lines               |
| Active tool highlight      | `#5588BB`       | Blue accent for active tool          |
| Automation: Volume         | `#88BB44`       | Green                                |
| Automation: Pan            | `#4488CC`       | Blue                                 |
| Automation: Generic        | `#CC8844`       | Orange                               |

#### Default Track Color Palette

Cubase provides a palette of 16 standard track colors (expandable to 128 in custom palettes). The defaults are muted, desaturated tones designed to avoid foreground/background conflicts:

| Color Name     | Approximate Hex | Usage Example          |
|----------------|-----------------|------------------------|
| Default Gray   | `#808080`       | Uncolored tracks       |
| Red            | `#CC5555`       | Vocals, leads          |
| Orange         | `#CC8844`       | Guitars, pads          |
| Yellow         | `#CCBB44`       | Brass, synths          |
| Green          | `#55AA55`       | Strings                |
| Teal           | `#44AAAA`       | FX channels            |
| Blue           | `#5577CC`       | Bass, rhythm           |
| Purple         | `#8855AA`       | Keyboards, MIDI        |
| Pink           | `#CC5588`       | Backing vocals         |
| Light Green    | `#88CC66`       | Ambient, textures      |
| Cyan           | `#55CCCC`       | Percussion             |
| Light Blue     | `#6699CC`       | Pads, atmosphere       |
| Magenta        | `#AA55AA`       | FX returns             |
| Brown          | `#997744`       | Acoustic instruments   |
| Olive          | `#889944`       | Group channels         |
| Slate          | `#667788`       | Utility tracks         |

**Cubase 15 note:** Colors are intentionally desaturated. Hue range is constrained (brown through green through teal), with purples and certain reds limited. User color schemes are automatically made darker with accent colors pushed to brighter ranges. This prevents foreground/background conflicts and preserves visual hierarchy.

---

## 2. Project Window Layout

### Overall Structure

The Cubase Project Window is organized into zones:

```
+-----------------------------------------------------------------------+
|                          TOOLBAR (fixed top)                          |
+-----------------------------------------------------------------------+
|          |                                              |             |
|          |            TIMELINE RULER                    |             |
|          |                                              |             |
|  LEFT    +----------------------------------------------+   RIGHT    |
|  ZONE    |                                              |   ZONE     |
|          |                                              |             |
| (Inspec- |         EVENT DISPLAY                        | (VSTi      |
|  tor /   |         (Arrangement)                        |  Rack /    |
|  Visibi- |                                              |  MediaBay) |
|  lity)   |                                              |             |
|          |                                              |             |
|          +----------------------------------------------+             |
|          |                                              |             |
|          |         LOWER ZONE                           |             |
|          |    (Editor / MixConsole / Chord Pads)        |             |
|          |                                              |             |
+----------+----------------------------------------------+-------------+
|                       TRANSPORT BAR (fixed bottom)                    |
+-----------------------------------------------------------------------+
```

### Proportions (at 1920x1080)

- **Left Zone (Inspector):** ~250-300px wide, collapsible
- **Right Zone:** ~250-300px wide, collapsible
- **Toolbar:** ~40-48px tall
- **Ruler:** ~24-28px tall
- **Transport Bar:** ~40-44px tall, fixed at bottom
- **Lower Zone:** User-resizable, typically 200-400px tall, can expand up to ~4/5 of project zone
- **Event Display:** Fills remaining space

### Track List & Event Display Split

The project window has two main vertical columns:
- **Track List** (left, ~180-250px): Contains track headers with controls
- **Event Display** (right, fills remaining): Shows parts, events, waveforms on timeline

The track list can be optionally divided into an upper and lower section (e.g., video/marker tracks pinned to top).

---

## 3. Toolbar

### Layout (Left to Right)

The toolbar spans the full width of the project window. Elements are grouped into logical sections separated by thin vertical dividers:

1. **Zone Toggles:** Three buttons to show/hide Left Zone, Lower Zone, Right Zone
2. **Window Layout:** "Set up Window Layout" button (toggles Status Line, Info Line, Overview Line, Transport)
3. **Tool Selection:** Row of tool icons
   - Object Selection (arrow pointer)
   - Range Selection (crosshair range)
   - Draw (pencil)
   - Erase (eraser)
   - Split (scissors)
   - Glue (glue tube)
   - Mute (X)
   - Zoom (magnifying glass)
   - Line (diagonal line)
   - Color (paint brush)
   - Play (speaker)
4. **Snap Controls:**
   - Snap on/off toggle (magnet icon)
   - Snap Type dropdown (Grid, Grid Relative, Events, Shuffle, etc.)
   - Grid Type dropdown (Bar, Beat, Use Quantize, Adapt to Zoom)
   - Quantize Preset dropdown (1/4, 1/8, 1/16, 1/32, etc.)
5. **Autoscroll:** Toggle button for auto-scroll during playback
6. **Color & State Buttons:** Automation read/write, mute/solo/listen state indicators
7. **Arranger Controls:** Arranger track controls (when arranger track exists)

### Visual Style

- **Background:** `#2A2A2A` dark gray bar
- **Buttons:** Small (approximately 24x24px icon area), flat style with no visible borders in default state
- **Active tool:** Highlighted with a subtle blue accent (`#5588BB`) or slight brightness increase
- **Dropdowns:** Dark background with light text, small downward arrow indicator
- **Dividers:** 1px `#404040` vertical separators between groups
- **Icons:** Monochrome light gray (`#AAAAAA`), brightening to white on hover/active
- **Spacing:** ~2-4px padding between adjacent buttons within a group

---

## 4. Track Headers

### Structure (per track)

Each track header sits in the track list column, left of the event display. From left to right:

```
+--------+------+------------------------------------------------+
| COLOR  | ICON |  Track Name              [M] [S] [R] [E] [W]  |
| STRIP  |      |  [Volume Slider]  [Pan]  [Input] [Output]      |
+--------+------+------------------------------------------------+
```

### Color Strip

- **Position:** Far-left edge of track header
- **Width:** ~4-6px vertical strip
- **Color:** Matches assigned track color from palette
- **Opacity:** Full when track is visible/selected, dimmer when track is in background
- **Purpose:** Quick visual scanning for track type/group identification

### Track Controls

| Control      | Appearance When Inactive             | Appearance When Active        |
|-------------|--------------------------------------|-------------------------------|
| Mute [M]    | Small dark button, "M" text          | Yellow background `#CCAA00`   |
| Solo [S]    | Small dark button, "S" text          | Red background `#CC3333`      |
| Record [R]  | Small circle, dim gray              | Bright red filled circle `#CC0000` |
| Edit [E]    | Small "e" text button               | Blue highlight                |
| Automation Write [W] | Small "W" text button       | Red glow when writing         |
| Monitor     | Small speaker icon                  | Orange `#CC8800` when active  |

### Track Name

- **Font:** System sans-serif (platform-dependent, appears to be Segoe UI on Windows, San Francisco/Helvetica on Mac)
- **Size:** ~11-12px
- **Color:** Light gray `#CCCCCC`, white `#FFFFFF` when selected
- **Behavior:** Editable on double-click, truncated with ellipsis if too long

### Track Height

- **Minimum height:** ~20-24px (name + basic controls only)
- **Default height:** ~48-60px (name + controls + volume/pan)
- **Expanded:** Variable, user-draggable, can show waveform preview

### Track Type Differentiation

Different track types show slightly different control sets and have distinct default icons:

| Track Type    | Default Icon      | Unique Controls           |
|---------------|-------------------|---------------------------|
| Audio         | Waveform icon     | Input monitoring, record  |
| MIDI          | MIDI plug icon    | MIDI channel selector     |
| Instrument    | Keyboard icon     | VSTi selector, MIDI ch    |
| Group         | Folder with waves | No input routing          |
| FX Channel    | "FX" text badge   | No input routing          |
| Folder        | Folder icon       | Collapse/expand arrow     |
| Marker        | Flag icon         | No audio controls         |
| Tempo         | Metronome icon    | Tempo display/edit        |
| Signature     | Time sig icon     | Time signature display    |
| Arranger      | Chain link icon   | Arranger chain controls   |
| VCA Fader     | "VCA" badge       | Linked fader control      |
| Chord         | Chord symbol      | Chord display             |
| Ruler         | Ruler icon        | Time format selector      |

### Selected Track

- Background shifts from `#2D2D2D` to `#3C3C3C` (lighter gray)
- Track name text becomes brighter/white
- Color strip becomes more vivid
- In Cubase 13+, selection background is dark gray with white text (changed from the older white-background selection)

---

## 5. Timeline Ruler

### Structure

```
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
| 1     | 2     | 3     | 4     | 5     | 6     | 7     | 8
+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
```

### Visual Details

- **Background:** Slightly darker than event display, approximately `#2A2A2A`
- **Height:** ~24-28px
- **Bar numbers:** Light gray text `#AAAAAA`, positioned at bar start lines
- **Beat subdivisions:** Thin tick marks extending downward
  - Bar lines: Full-height, slightly brighter (`#555555`)
  - Beat lines: ~60% height, dimmer (`#444444`)
  - Sub-beat lines: ~30% height, very faint (`#3A3A3A`)
- **Current position cursor:** White vertical line spanning full arrangement height
- **Locator markers:** Small triangles at top, colored for L (left) and R (right)
  - Left locator: Blue/teal triangle
  - Right locator: Blue/teal triangle
- **Loop/Cycle range:** Blue-tinted overlay between locators on ruler (`#4A6A8A` at ~30% opacity)
- **Marker flags:** Small colored triangles/flags along the ruler for marker positions

### Display Formats

Ruler format is user-selectable (click arrow at right end):
- **Bars+Beats:** Default for music. Shows bar numbers, beat subdivisions, 120 ticks per sixteenth
- **Time (HMS):** Hours:Minutes:Seconds.Milliseconds
- **Timecode:** Hours:Minutes:Seconds:Frames (fps set in Project Setup)
- **Samples:** Sample position numbers

Multiple rulers can coexist (via Project > Add Track > Ruler) showing different formats simultaneously.

---

## 6. Event Display (Arrangement Area)

### Background

- **Color:** Medium-dark gray `#333333`
- **Grid lines (vertical):** Very subtle, `#3A3A3A`
  - Bar lines: Slightly more visible `#444444`
  - Beat lines: Barely visible `#393939`
- **Grid lines (horizontal):** Track lane separators, `#3A3A3A`, 1px

### Audio Events/Parts

- **Container:** Rounded rectangle with track color as fill, reduced opacity (~60-70%)
- **Waveform rendering:**
  - Filled waveform shape inside the event container
  - Color: Slightly brighter/lighter version of track color
  - Outline: Optional waveform outline (controlled by "Waveform Outline Intensity" preference)
  - Brightness: Adjustable via "Waveform Brightness" preference
  - Style: Solid fill, no transparency within waveform shape
- **Event name:** Small text at top-left of event, track color or white
- **Fade handles:** Small triangles at top corners for fade in/out
- **Selected event:** Brighter, increased saturation, border becomes more visible

### MIDI Parts

- **Container:** Rounded rectangle with track color as fill
- **MIDI notes rendered inside:** Small horizontal lines/rectangles showing note positions
  - Width: Proportional to note duration
  - Height: Fixed thin lines (~1-2px)
  - Color: Brighter version of track color, or white when selected
  - Density: Notes visually stack to show pitch distribution
- **Selected MIDI part:** Brighter, border more visible

### MIDI Note Coloring Modes (in Key Editor)

When editing MIDI in the Key Editor, notes can be colored by:
- **Velocity:** Gradient from cool (blue/green for low velocity) to warm (red/yellow for high velocity)
- **Pitch:** Each pitch class gets a distinct color
- **MIDI Channel:** Each channel (1-16) gets a distinct color
- **Part Color:** Notes match their parent part's track color
- **Time Position:** Colors vary by beat position
- **Expression Map / Articulation:** Colors match articulation assignments

### MIDI Note Appearance Settings

- **Note Brightness:** Adjustable preference for note event brightness
- **Controller Brightness:** Adjustable for CC event brightness
- **Opacity:** Event opacity can be reduced; compensate with Note/Waveform Brightness

---

## 7. Inspector (Left Zone)

### Structure

The Inspector lives in the Left Zone and uses an accordion-style layout. Clicking a section header expands that section and may collapse others.

### Sections (Top to Bottom, for Audio Track)

1. **Track Name & Basic Controls**
   - Track name (editable)
   - Mute, Solo, Record Arm, Monitor buttons
   - Volume fader (horizontal slider)
   - Pan knob
   - Input/Output bus selectors (dropdown)
   - Edit Channel Settings button ("e")

2. **Inserts**
   - Header: "INSERTS" text
   - 8 insert slots (6 pre-fader, 2 post-fader)
   - Each slot: Dropdown to select plugin, bypass toggle, edit button
   - Empty slots: Dimmed, "Click to add insert" style

3. **EQ**
   - Header: "EQUALIZER" text
   - Mini EQ curve display
   - 4-band parametric controls (gain, frequency, Q for each band)

4. **Channel Strip**
   - Header: "STRIP" text
   - Modules in order: Gate, Compressor, EQ Position, Tools, Saturation, Limiter
   - Each module has on/off toggle and preset selector

5. **Sends**
   - Header: "SENDS" text
   - 8 send slots
   - Each slot: Destination selector, level knob, pre/post fader toggle, on/off

6. **Quick Controls**
   - 8 assignable parameter slots with knobs

7. **Notepad**
   - Free text area for track notes

### Visual Style

- **Background:** `#2B2B2B`
- **Section headers:** Text labels in uppercase, `#888888`, with expand/collapse arrow
- **Active section header:** Slightly brighter text, `#AAAAAA`
- **Section content:** Inset from edges by ~8-12px padding
- **Slot items:** Dark rounded rectangles, `#353535`
- **Empty slots:** Even darker, `#303030`
- **Width:** ~250-300px, can be resized
- **Spacing between sections:** ~2px divider lines

---

## 8. Lower Zone

### Structure

The Lower Zone is a resizable panel at the bottom of the project window. It contains multiple tabs:

```
+------------------------------------------------------------------+
| [Editor] [MixConsole] [Sampler Control] [Chord Pads]             |
+------------------------------------------------------------------+
|                                                                  |
|   Content of selected tab                                        |
|                                                                  |
+------------------------------------------------------------------+
```

### Tabs

- **Editor:** Shows Key Editor, Score Editor, Drum Editor, or Sample Editor depending on selected event type
- **MixConsole:** Simplified mixer with Inserts and Sends racks only
- **Sampler Control:** Sampler track controls
- **Chord Pads:** Chord pad grid

### Tab Bar Design

- **Background:** `#252525`
- **Tab text:** Light gray, ~10-11px
- **Active tab:** Brighter text, subtle underline or highlight
- **Tab height:** ~28-32px

### Lower Zone MixConsole

- Simplified version of the full MixConsole
- Shows only Inserts and Sends racks
- Faders are shorter due to vertical space constraints
- Otherwise follows same visual language as full MixConsole

### Resize Handle

- Thin horizontal bar at the boundary between lower zone and event display
- Cursor changes to resize icon on hover
- Drag to resize, can expand up to ~4/5 of project zone height

---

## 9. MixConsole

### Overall Layout

The full MixConsole window (opened via F3) has this structure:

```
+-----------------------------------------------------------------------+
|  TOOLBAR                                                              |
+--------+-----------------------------------------------------+--------+
|        |                                                     |        |
| LEFT   |                   CHANNEL STRIPS                    | RIGHT  |
| ZONE   |                                                     | ZONE   |
| (Chan- |  +------+ +------+ +------+ +------+ +------+     | (Meter |
|  nel   |  | Rack | | Rack | | Rack | | Rack | | Rack |     |  Brdg/ |
|  Sel-  |  |      | |      | |      | |      | |      |     |  Ctrl  |
|  ector)|  | Fdr  | | Fdr  | | Fdr  | | Fdr  | | Fdr  |     |  Room) |
|        |  +------+ +------+ +------+ +------+ +------+     |        |
+--------+-----------------------------------------------------+--------+
```

### Channel Rack Sections (Top to Bottom)

When racks are visible above the fader section, they appear in this order:

1. **Routing** - Input/output bus dropdowns
2. **Pre/Filters** - Input gain, phase, high/low cut filter controls
3. **Inserts** - 8 insert effect slots (6 pre-fader + 2 post-fader)
4. **EQ** - Built-in 4-band parametric EQ with curve editor
5. **Channel Strip** - Gate, Compressor, EQ, Tools, Saturation, Limiter modules
6. **Sends** - 8 send effect slots with level and routing
7. **Cue Sends** - (Pro only) cue mix sends

### Fader Section (Per Channel)

The fader section is the heart of the MixConsole. Per channel strip:

```
+-----------+
|  [pan]    |    <-- Pan control (rotary knob)
|           |
|  [input]  |    <-- Input routing label
|           |
| +-+  +-+  |
| |M|  |M|  |    <-- Meter (left) + Fader (right)
| |e|  |F|  |
| |t|  |a|  |
| |e|  |d|  |
| |r|  |e|  |
| | |  |r|  |
| +-+  +-+  |
|           |
| [M][S][R] |    <-- Mute/Solo/Record buttons
| [E]       |    <-- Edit Channel Settings
|  Track    |    <-- Track/channel name
|  Name     |
+-----------+
```

### Fader Design

- **Style:** Vertical thin fader track with cap/thumb
- **Track:** Narrow dark groove, ~3-4px wide, `#1A1A1A`
- **Cap/thumb:** Small horizontal rectangle, ~20px wide x ~8px tall
  - Inactive: Dark gray `#555555`
  - Active/dragging: Lighter gray `#888888`
  - Fader cap color can be customized to match track color
- **Scale markings:** dB values on the side: +12, +6, 0, -6, -12, -18, -24, -36, -48, -inf
  - Text color: `#666666`
- **Default position:** 0 dB for audio, off for MIDI
- **Slider modes:** Click-anywhere (default), Touch (drag-only), Ramp (smooth animation)

### Level Meters

- **Type:** Virtual plasma column style
- **Position:** Adjacent to fader (left side of fader)
- **Width:** ~8-12px per meter (stereo = 2 side-by-side meters)
- **Color scheme (bottom to top):**
  - Green: Low levels (below ~-12dB), approximately `#44AA44`
  - Yellow: Medium levels (~-12dB to ~-3dB), approximately `#CCAA00`
  - Red: High/peak levels (above ~-3dB), approximately `#CC3333`
  - Clip LED: Small red square at very top that illuminates on clipping
- **Transitions:** Color crossover points are configurable in Preferences > Metering > Appearance
- **Peak hold:** Small bright line that holds at peak position (configurable hold time: 500ms to 30,000ms, or infinite)
- **Background:** Very dark, near-black `#1A1A1A`
- **Meter modes:**
  - Post-Fader (default)
  - Post-Panner (also reflects pan)
  - Input (pre-processing signal)

### Pan Control

- **Standard:** Stereo Balance Panner - single rotary knob, positions sound left-to-right
- **Alternative:** Stereo Dual Panner - separate left/right controls
- **Alternative:** Stereo Combined Panner - linked controls with blue fill showing width (turns red if channels cross/invert)
- **Visual:** Small circular knob, ~16-20px diameter, dark with lighter indicator line
- **Center dot:** When panned to center (default position)

### Mute/Solo/Record Buttons (in MixConsole)

- **Size:** Small square/rectangular buttons, ~18-20px
- **Layout:** Horizontal row below fader
- Same color conventions as track headers:
  - Mute: Yellow `#CCAA00` when active
  - Solo: Red `#CC3333` when active
  - Record: Red circle `#CC0000` when armed
- **Solo Defeat:** Displayed in red when activated (Alt/Option-click)
- **Solo Exclusive:** Ctrl-click isolates single channel

### Channel Name

- **Position:** Bottom of channel strip
- **Orientation:** Horizontal text (can be configured)
- **Font:** Small, ~9-10px
- **Color:** Track color or default light gray
- **Background:** Can show track color behind name

### Channel Width

- **Narrow:** ~48-60px per channel
- **Wide:** ~80-100px when zoomed
- **Zoomable:** Standard Cubase zoom functions apply

### Meter Bridge

- Optional larger meter display above channel strips
- Scalable meter size
- Includes loudness metering mode

### Q-Link (Linked Channels)

- Channels that are Q-Linked show **light gray shading** as visual indicator
- Grouped channel editing is visually distinct

---

## 10. Transport Bar

### Position & Structure

- Fixed at the bottom of the Project window
- Full width
- Height: ~40-44px
- Background: `#222222` very dark gray
- Divided into configurable sections separated by thin dividers

### Sections (Left to Right)

All sections are individually show/hide configurable. Default layout:

1. **Constrain Delay Compensation**
   - Single toggle button

2. **Record Modes**
   - Common Record Modes dropdown
   - Audio Record Modes dropdown
   - MIDI Record Modes dropdown

3. **MIDI Auto Quantize**
   - Toggle button

4. **Audio Performance Meter**
   - Dual horizontal bar display
   - Upper bar: Real-time peak / ASIO-Guard load
   - Lower bar: Disk transfer load
   - Colors: Green when OK, yellow when moderate, red when overloaded

5. **Locators**
   - "Go to Left Locator" button
   - Left locator position display (numeric, e.g., "1.1.1.0")
   - "Go to Right Locator" button
   - Right locator position display

6. **Locator Range Duration**
   - Range assign button
   - Duration display

7. **Punch Points**
   - Punch In toggle
   - Punch Out toggle
   - Lock to Locators button
   - Punch In/Out position fields (collapsible)

8. **Transport Controls** (most prominent section)
   - Previous Marker button (|<<)
   - Next Marker button (>>|)
   - Rewind button (<<)
   - Forward button (>>)
   - Cycle/Loop toggle button
   - **Stop** button (square icon)
   - **Play/Start** button (triangle icon, most prominent)
   - **Record** button (circle icon, red when active)

   Button sizes: ~24-28px, slightly larger than toolbar buttons
   Play button may be slightly larger/more prominent
   Record button: Red circle `#CC0000` when recording

9. **Retrospective Record**
   - Single button to recover MIDI from stop/playback

10. **Time Displays**
    - Primary time display: Large numeric readout (bars.beats.ticks or timecode)
    - Secondary time display: Smaller numeric readout in alternate format
    - Format selector dropdown for each
    - **Font:** Monospaced/digital style, larger than other text (~14-16px)
    - **Color:** Bright `#E0E0E0` on dark background

11. **Markers**
    - Jump-to-marker dropdown
    - Open Marker window button

12. **Pre-roll & Post-roll**
    - Pre-roll toggle + position field
    - Post-roll toggle + position field

13. **Tempo & Time Signature**
    - Tempo Track on/off toggle
    - Tempo value display (e.g., "120.000 BPM") - editable
    - Time signature display (e.g., "4/4") - editable

14. **External Sync**
    - Sync activation button
    - Open Sync Setup button

15. **Click & Count-in (Metronome)**
    - Metronome click on/off toggle
    - Count-in on/off toggle
    - Click pattern selector (collapsible)
    - Metronome setup button

16. **Input/Output Activity**
    - MIDI In activity indicator (flashes on input)
    - MIDI Out activity indicator
    - Audio activity indicator
    - Clipping indicator
    - Output level meter (small horizontal)
    - Output level fader (small)

### Expandable Sections

- Some sections have a "triple dot" (three dots / grip handle) that can be clicked and dragged to reveal additional controls
- Tools to the right of the "Right Divider" are always visible

---

## 11. Typography

### Font Families

Cubase uses platform-native system fonts:
- **Windows:** Segoe UI (primary), Tahoma (fallback)
- **macOS:** San Francisco / Helvetica Neue (primary)
- **Cross-platform:** The rendering is subpixel-antialiased

### Font Sizes (Approximate)

| Element                          | Size    | Weight     |
|----------------------------------|---------|------------|
| Toolbar labels                   | 10-11px | Regular    |
| Track names                      | 11-12px | Regular    |
| Inspector section headers        | 10-11px | Bold/Caps  |
| Inspector content                | 10-11px | Regular    |
| MixConsole channel names         | 9-10px  | Regular    |
| Transport time display           | 14-16px | Bold/Mono  |
| Transport tempo                  | 12-13px | Regular    |
| Ruler bar numbers                | 9-10px  | Regular    |
| Event names (on parts)           | 9-10px  | Regular    |
| Dialog titles                    | 13-14px | Bold       |
| Menu items                       | 11-12px | Regular    |
| Tooltip text                     | 10-11px | Regular    |
| Media Browser text (Cubase 15)   | 12-13px | Regular    |

### Cubase 15 Typography Changes

- **Larger font size** in Media Browser for improved readability
- **Increased padding** around text in Media Browser and Plugin Manager
- **More negative space** between accordion/list items
- Overall trend toward more generous spacing and slightly larger text

---

## 12. Icons & Visual Elements

### Icon Style

- **Type:** Flat, monochrome line icons
- **Color:** Light gray `#AAAAAA` (inactive), white `#FFFFFF` (active/hover)
- **Size:** Typically 16x16px or 20x20px within 24x24px hit areas
- **Style:** Thin stroke, 1-2px line weight, geometric/clean
- **No gradients:** Pure flat design since Cubase 10+

### Tool Icons (Toolbar)

| Tool              | Icon Description                                    |
|-------------------|-----------------------------------------------------|
| Object Selection  | Arrow pointer                                       |
| Range Selection   | Crosshair / rectangle selection outline              |
| Draw              | Pencil                                              |
| Erase             | Eraser block                                        |
| Split             | Scissors                                            |
| Glue              | Glue tube / bottle                                  |
| Mute              | "X" or speaker with X                               |
| Zoom              | Magnifying glass                                    |
| Line              | Diagonal line tool                                  |
| Color             | Paint brush / color dropper                         |
| Play              | Small speaker / triangle                            |
| Time Warp         | Clock with bend arrow                               |
| Comp              | Layered rectangles                                  |

### Status/Indicator Icons

| Element           | Description                                         |
|-------------------|-----------------------------------------------------|
| MIDI activity     | Small MIDI plug that flashes/pulses                 |
| Audio activity    | Small waveform/speaker that flashes                 |
| Clipping          | Small red dot/square                                |
| Snap (magnet)     | Horseshoe magnet shape                              |
| Autoscroll        | Horizontal arrow with vertical bar                  |
| Record arm        | Filled circle (red when active)                     |
| Monitor           | Speaker icon (orange when active)                   |

### Visual Patterns

- **Rounded corners:** Events and parts use small corner radius (~2-4px)
- **Subtle shadows:** Minimal, mostly rely on background contrast
- **Dividers:** 1px lines, slightly lighter than background
- **Scrollbars:** Thin, dark, appear on hover (overlay style)
- **Resize handles:** Small dots or grip patterns at panel borders
- **Focus rings:** No prominent focus rings, selection indicated by brightness

---

## 13. Interactive Element Patterns

### Buttons

- **Flat style:** No visible borders in default state
- **Hover:** Subtle brightness increase (~10%)
- **Pressed:** Slightly darker than hover
- **Toggle active:** Color change (blue accent for tools, colored for state buttons)
- **Disabled:** Reduced opacity (~40%)

### Dropdowns / Selectors

- **Appearance:** Dark rounded rectangle with text and small downward chevron
- **Background:** `#353535`
- **Border:** `#454545`, 1px
- **Text:** `#CCCCCC`
- **Hover:** Lighter background `#404040`
- **Popup menu:** Dark background `#2A2A2A`, lighter hover rows `#3A3A3A`

### Sliders / Faders

- **Horizontal sliders (Inspector):** Thin track `#1A1A1A`, small thumb `#666666`
- **Vertical faders (MixConsole):** Narrow groove with rectangular cap
- **Knobs:** Small circular, dark body with lighter indicator line/dot

### Scrollbars

- **Style:** Thin overlay scrollbars
- **Thumb:** `#555555`, rounded, ~6-8px wide
- **Track:** Transparent or very dark
- **Appear on hover/scroll, fade out when idle**

### Context Menus

- **Background:** `#2A2A2A`
- **Text:** `#CCCCCC`
- **Hover highlight:** `#3A5070` (blue tint)
- **Separator:** 1px `#404040` horizontal line
- **Keyboard shortcut text:** Right-aligned, `#888888`
- **Submenu arrow:** Small right-pointing chevron

### Track Color Application

When track color is applied to track controls:
- Track header background takes on a desaturated version of the track color
- Color intensity is adjustable via preferences slider
- Color strip on the left edge remains at full saturation
- MixConsole channel can also reflect track color on fader cap and name background
- Event/part colors in arrangement can match track color or be independently set

### Selection Highlighting

- **Track selection:** Background lightens from `#2D2D2D` to `#3C3C3C`
- **Event selection:** Border brightens, fill becomes more saturated
- **MIDI note selection (Key Editor):** Notes turn black (selected color is always black)
- **MixConsole channel selection:** Brightness increase on selected channel, edit channel settings panel appears
- **Multiple selection:** All selected items show the selection style simultaneously

---

## 14. GTK2 Implementation Notes

### Mapping Cubase Design to GTK2 Constraints

GTK2 has significant limitations compared to Cubase's custom rendering engine. Here are practical mappings:

#### Colors

GTK2 supports theming via `gtkrc` files. The Cubase dark palette maps well:

```
# Cubase-style dark theme for GTK2
style "cubase-default" {
    bg[NORMAL]      = "#2D2D2D"
    bg[PRELIGHT]    = "#383838"
    bg[ACTIVE]      = "#3C3C3C"
    bg[SELECTED]    = "#3A5070"
    bg[INSENSITIVE] = "#2A2A2A"

    fg[NORMAL]      = "#CCCCCC"
    fg[PRELIGHT]    = "#FFFFFF"
    fg[ACTIVE]      = "#FFFFFF"
    fg[SELECTED]    = "#FFFFFF"
    fg[INSENSITIVE] = "#555555"

    base[NORMAL]    = "#333333"
    base[PRELIGHT]  = "#383838"
    base[ACTIVE]    = "#3A5070"
    base[SELECTED]  = "#3A5070"
    base[INSENSITIVE] = "#2A2A2A"

    text[NORMAL]    = "#CCCCCC"
    text[PRELIGHT]  = "#FFFFFF"
    text[ACTIVE]    = "#FFFFFF"
    text[SELECTED]  = "#FFFFFF"
    text[INSENSITIVE] = "#555555"
}
```

#### Faders and Meters

- GTK2's GtkScale can approximate faders but lacks the precision look
- **Recommendation:** Custom-draw faders using Cairo within GtkDrawingArea
- Meter rendering must be custom (Cairo): draw filled rectangles with green/yellow/red gradient stops
- Peak hold: Draw a single bright pixel line at peak position

#### Track Headers

- Use GtkTreeView or custom GtkDrawingArea for track list
- Color strip: Draw a 4-6px colored rectangle at row left edge
- Mute/Solo/Record: GtkToggleButton with custom colors via style properties

#### Toolbar

- GtkToolbar with GtkToolButton items
- Custom drawing for active tool highlight
- GtkComboBox for snap/grid/quantize dropdowns

#### Transport Bar

- Fixed GtkHBox at window bottom
- Custom-drawn play/stop/record buttons for visual accuracy
- GtkLabel with monospace font for time displays
- Cairo rendering for activity meters

#### Inspector

- GtkExpander widgets for accordion sections
- Custom styling to match Cubase's section headers
- GtkComboBox for slot selectors

#### Rounded Corners

- GTK2 does not natively support rounded corners on widgets
- Use Cairo path drawing for custom widgets (events, parts)
- For standard widgets, accept square corners as a GTK2 limitation

#### Font Rendering

- Match Cubase sizing: 10-12px for most UI, 14-16px for transport time
- Use system sans-serif: "Sans" in GTK2 font specification
- Enable antialiasing in fontconfig

#### Scrollbars

- GTK2 scrollbars are always visible (no overlay mode)
- Style them dark via gtkrc to minimize visual weight
- Set trough color to near-background, slider to `#555555`

---

## Sources

### Official Steinberg Documentation
- [Cubase Pro 15.0 - Transport Bar](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/project_window/project_window_transport_r.html)
- [Cubase Pro 15.0 - Transport Bar Sections](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/playback/playback_transport_sections_c.html)
- [Cubase Pro 15.0 - Track Inspector](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/project_window/project_window_inspector_opening_track_inspector_t.html)
- [Cubase Pro 15.0 - Project Window Lower Zone](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/project_window/project_window_lower_zone_c.html)
- [Cubase Pro 15.0 - General Colors](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/preferences/preferences_general_colors_r.html)
- [Cubase Pro 15.0 - Event Colors to Track Colors](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/project_window/project_window_setting_event_colors_to_track_colors_t.html)
- [Cubase Pro 15.0 - Project Window Toolbar](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/project_window/project_window_toolbar_r.html)
- [New in Cubase 15: Designed to Inspire](https://www.steinberg.net/cubase/new-features/)
- [Cubase 15 Release Notes](https://www.steinberg.net/cubase/release-notes/15/)
- [Steinberg Help - Meter Colors](https://archive.steinberg.help/cubase_pro/v10/en/cubase_nuendo/topics/mixconsole/mixconsole_meter_colors_setting_up_t.html)
- [Steinberg Help - Fader Section](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/mixconsole/mixconsole_fader_section_c.html)
- [Steinberg Help - Channel Racks](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/mixconsole/mixconsole_channel_racks_r.html)
- [Steinberg Help - Ruler Display Formats](https://archive.steinberg.help/cubase_pro_artist/v9/en/cubase_nuendo/topics/project_window/project_window_ruler_display_formats_r.html)

### Reviews & Analysis
- [Sound On Sound - Steinberg Cubase Pro 15 Review](https://www.soundonsound.com/reviews/steinberg-cubase-pro-15)
- [MusicTech - Cubase 15 Review](https://musictech.com/reviews/digital-audio-workstations/cubase-15-review/)
- [CDM - Cubase 15: Expression Maps, patterns, Modulators, plug-ins](https://cdm.link/cubase-15/)
- [ProAudio.tech - Steinberg Cubase 15 Pro Review](https://www.proaudio.tech/reviews/steinberg-cubase-15-pro)
- [Attack Magazine - Cubase 15 Released](https://www.attackmagazine.com/news/cubase-15-released-heres-whats-new/)
- [Sound On Sound - Cubase MixConsole Rack](https://www.soundonsound.com/techniques/using-cubases-mixconsole-rack)
- [Sound On Sound - Cubase Mixer Controls](https://www.soundonsound.com/techniques/cubase-mixer-controls)

### Community & Forum Discussions
- [Steinberg Forums - Subtle UI Changes in Cubase 15](https://forums.steinberg.net/t/subtle-ui-changes-in-cubase-15-that-can-add-up-to-great-change/1014481)
- [Steinberg Forums - Color Schemes for Cubase 15](https://forums.steinberg.net/t/color-schemes-for-cubase-15/1006283)
- [Steinberg Forums - Cubase 15 Custom Colors](https://forums.steinberg.net/t/cubase-15-custom-colors-nerfed/1014295)
- [Steinberg Forums - Full Track Header Color](https://forums.steinberg.net/t/full-track-header-color/633629)
- [VI-Control - Cubase 13 Colors Scheme Customization Thread](https://vi-control.net/community/threads/cubase-13-colors-scheme-customization-thread.145436/)
- [Steinberg Forums - Solo/Mute Color Brightness](https://forums.steinberg.net/t/is-there-a-way-to-customize-solo-mute-color-brightness/876342)
