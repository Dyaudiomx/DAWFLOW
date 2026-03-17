# DAWFLOW Feature Priority Roadmap

**Date:** 2026-03-17
**Vision:** The world's first true AI-native DAW — forked from Ardour, competing with Cubase and Ableton Live.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Findings](#research-findings)
3. [Phase 1: Foundation](#phase-1-foundation--build-system-branding-get-it-running)
4. [Phase 2: UI Modernization](#phase-2-ui-modernization)
5. [Phase 3: AI Integration Core](#phase-3-ai-integration-core)
6. [Phase 4: AI Features](#phase-4-ai-features)
7. [Phase 5: Competitive Features](#phase-5-competitive-features)
8. [Phase 6: Polish & Ship](#phase-6-polish--ship)
9. [Architecture Reference](#architecture-reference)

---

## Executive Summary

DAWFLOW is a fork of Ardour 9.x that aims to become the first DAW where AI is not bolted on, but woven into the architecture from day one. The user talks to their DAW. The DAW listens, understands, and acts.

The competitive landscape is clear: ReaperAgent (Reagent) has proven the concept works — natural language control of a DAW via a bridge pattern. DAWZY (NeurIPS 2025) validated it academically with 100% task success using GPT-5. MIDI Agent proved the VST plugin approach works for generation. But none of these are built into the DAW itself. They are all external tools bolting onto closed systems.

DAWFLOW's advantage: we own the source code. We can expose every internal API, embed the AI runtime, and design the UX from scratch. No bridge hacks. No plugin workarounds. Native.

---

## Research Findings

### 1. How ReaperAgent (Reagent) Works

**Architecture:** Reagent is a desktop companion app that connects to REAPER via a persistent Bridge. The Bridge maintains low-latency, bidirectional communication with the REAPER instance. All interaction occurs through a web-based chat interface.

**Bridge Pattern:**
- Reagent connects directly to REAPER's API via the Bridge
- It can execute ReaScript directly from conversations
- It has access to markers, regions, media items, plugin parameters, and automation
- Audio analysis (peak detection, silence detection, transient detection, spectral analysis, UCS classification) runs locally on the user's machine — audio never leaves the machine

**Key Capabilities:**
- Natural language to DAW action translation
- Context-aware operation (sees what the user is looking at)
- Multi-step action execution
- Plugin parameter control and automation
- Local audio analysis with auto-calculated thresholds

**Limitation:** It is an external application. It cannot modify REAPER's UI, cannot add new views, and is constrained by what ReaScript exposes.

### 2. DAWZY (NeurIPS 2025 Research)

**Architecture — Three Layers:**
1. **User Interaction:** Electron.js host with chat window and minimal controls
2. **Processing:** Whisper (speech-to-text), BasicPitch (hum-to-MIDI), GPT-5 (intent-to-script), MCP tools
3. **Execution:** State serialization, atomic script execution via ReaPy, utility scripts

**Key Findings:**
- GPT-5 achieved 100% task success on objective music production tasks
- Open-source models (Qwen3-Coder-480B) achieved only 25-50%, failing on script validation and state tracking
- DAWZY outperformed Ableton-MCP on qualitative tasks because REAPER's scripting API is well-documented and present in LLM training data
- MCP (Model Context Protocol) is the emerging standard for exposing DAW capabilities to AI agents
- All edits are reversible — critical for user trust

### 3. Other AI DAW Tools

| Tool | Approach | Strength | Weakness |
|------|----------|----------|----------|
| **Reagent** | External desktop app + Bridge | Full REAPER control, local analysis | External, REAPER-only |
| **DAWZY** | Electron + MCP + ReaPy | Academic rigor, voice/hum input | Research prototype, REAPER-only |
| **MIDI Agent** | VST3/AU plugin | Works in any DAW, cloud LLM | MIDI only, no DAW control |
| **REAPER MCP Server** | MCP server + Lua bridge | 129 tools, full DAW control | Requires external MCP client |
| **Ableton MCP** | MCP server + Remote Script | Session manipulation | Limited by Ableton's newer/smaller API |
| **Suno/Udio** | Cloud generation | Full song generation | No DAW integration, finished audio only |
| **AIVA** | Cloud + MIDI export | Orchestral composition, MIDI editing | Limited to composition, no mixing |
| **LANDR/iZotope** | Cloud/local mastering | AI mastering | Single-purpose |
| **Cubase 15 Stem Separation** | Built-in AI | Native integration | Single feature, not conversational |

**Key Insight:** The biggest gap in the market is seamless, native AI integration inside the DAW. Every existing solution is external. DAWFLOW can be the first to close this gap.

### 4. What Cubase and Ableton Offer That Ardour Lacks

#### Cubase Exclusive Features (Not in Ardour)
- **HALion Sonic** — Workstation synth with 3,000+ sounds
- **Groove Agent SE** — MPC-style drum sampler with pattern playback
- **Retrologue** — Virtual analog synthesizer
- **Padshop** — Granular synthesis instrument
- **VariAudio** — Integrated pitch correction and vocal editing
- **Chord Track & Chord Pads** — Intelligent composition tools with harmonic analysis
- **Score Editor** — Professional notation with full symbol support
- **Expression Maps** — Articulation management for orchestral work
- **Melodic Pattern Sequencer** (v15) — Generative melodic patterns
- **Stem Separation** (v15) — AI-powered stem extraction
- **Modulators** (v15) — Six creative modulators for sound design

#### Ableton Live Exclusive Features (Not in Ardour)
- **Session View / Clip Launcher** — Ardour has basic clip launching since v7, but Ableton's is vastly more mature with dynamic slot creation, complex follow actions, and deep controller integration
- **Operator** — FM synthesizer
- **Wavetable** — Wavetable synthesizer
- **Drift** — Subtractive synthesizer
- **Analog** — Virtual analog synth (physical modeling)
- **Sampler/Simpler** — Advanced sampling instruments
- **Tension, Collision, Electric** — Physical modeling instruments
- **Poli** — Virtual analog + FM hybrid
- **Drum Rack** — Flexible drum programming environment
- **Max for Live** — Visual programming for custom instruments/effects
- **Audio-to-MIDI** — Convert audio recordings to MIDI
- **Groove Pool** — Timing/feel extraction and application
- **Capture** — Background MIDI recording

#### What Ardour 9.x Already Has
- Clip launching with cue markers (basic, improving)
- Region FX (offline per-region effects)
- Recording into cue slots (new in 9.0)
- Dedicated pianoroll window
- Lua scripting API (deep C++ bindings)
- Cross-platform (Linux, macOS, Windows)
- Open source (GPL)
- Professional audio engine (32-bit/384kHz)
- LV2, VST, VST3, AU plugin support
- MIDI and audio recording/editing
- Automation, tempo mapping, arrangement sections

### 5. DAW UI Frameworks

| Framework | Used By | Pros | Cons |
|-----------|---------|------|------|
| **JUCE** | Tracktion/Waveform, most plugins | Industry standard, audio-specific, cross-platform | Commercial license for closed-source |
| **GTK2/YTK** | Ardour (forked as YTK) | Already in codebase, battle-tested | Aging, limited modern UI patterns |
| **GTK4** | Zrythm | Modern, GPU-accelerated | Major porting effort from GTK2 |
| **Qt/QML** | Some DAWs explored it | Powerful, fluid UIs | Not audio-specific, heavy |
| **Custom/OpenGL** | Ableton, FL Studio, Logic | Total control, maximum performance | Massive engineering effort |
| **Electron/Web** | DAWZY (chat UI only) | Rapid development, modern UI | Too heavy for real-time audio |

**Recommendation for DAWFLOW:** Keep YTK (Ardour's GTK2 fork) for the core DAW UI in the short term. Introduce a modern embedded web view (CEF or similar) exclusively for the AI chat panel and AI-specific interfaces. Long-term, evaluate incremental migration of custom widgets to a GPU-accelerated canvas (building on Ardour's existing Cairo Canvas system).

### 6. Best Practices for Exposing DAW Internals to AI

**The MCP Pattern (Model Context Protocol):**
- Emerging standard for AI-to-tool communication
- Exposes discrete, well-documented actions as "tools"
- Each tool has a name, description, parameter schema, and return type
- AI agents discover available tools and call them by name

**Action Registry Design:**
- Narrow, well-labeled endpoints (one action per tool)
- Rich examples for every action
- Consistent response structures (JSON)
- Semantic discovery (descriptions indexed for LLM understanding)

**Security:**
- Least-privilege access — AI only gets permissions the user grants
- Human-in-the-loop for destructive actions (delete track, overwrite recording)
- Rate limiting on agent API calls
- State management with undo/rollback for every AI action

**Multi-Interface Design:**
- Same action registry accessible via: built-in chat, MCP server (for external agents), Lua scripting, HTTP API
- Protocol-independent core ensures resilience

---

## Phase 1: Foundation — Build System, Branding, Get It Running

**Timeline:** Weeks 1-6
**Goal:** Fork Ardour cleanly, rebrand, establish CI/CD, and have a buildable DAWFLOW binary on all three platforms.

### 1.1 Fork & Repository Setup
- Create clean fork from Ardour 9.x (latest stable tag)
- Establish Git branching strategy (main, develop, feature branches)
- Set up GitHub/GitLab repository with issue tracking
- Document upstream merge strategy for pulling Ardour updates

### 1.2 Branding & Identity
- Replace all Ardour branding: application name, window titles, about dialog, icons, splash screen
- New application identifier: "DAWFLOW" (or "DAW FLOW")
- Design logo and icon set
- Update desktop entry files, macOS Info.plist, Windows installer metadata
- Choose accent color palette and typography for marketing

### 1.3 Build System Modernization
- Audit existing WAF build system (wscript files throughout the tree)
- Ensure clean builds on Linux (Ubuntu/Fedora), macOS (Apple Silicon + Intel), Windows (MSVC)
- Set up CI/CD pipeline (GitHub Actions) for automated builds on all three platforms
- Create reproducible build environments (Docker for Linux, documented steps for macOS/Windows)
- Generate installable packages: .deb/.rpm (Linux), .dmg (macOS), .msi (Windows)

### 1.4 Dependency Audit
- Catalog all ~40+ build dependencies (libboost, libsndfile, fftw3, rubberband, aubio, etc.)
- Identify which can be vendored vs. system-provided
- Evaluate adding new dependencies needed for later phases (e.g., libcurl for API calls, nlohmann/json or similar for JSON, an embedded web view library)
- Pin dependency versions for reproducible builds

### 1.5 Codebase Orientation
- Document the source tree layout (gtk2_ardour, libs/ardour, libs/pbd, libs/evoral, etc.)
- Map the signal/callback architecture and MVC patterns
- Identify key entry points: session creation, track management, transport control, plugin hosting, audio engine
- Document Lua scripting API surface area and binding generation process
- Identify the ~175,000 lines of GTK UI code and ~160,000 lines of backend code

### 1.6 Licensing Strategy
- Ardour is GPL — all DAWFLOW code must also be GPL
- AI integration components that call external APIs are fine (API calls are not linking)
- Evaluate dual-licensing strategy if commercial plugins or proprietary AI features are desired
- Note: per Thaler v. Perlmutter (2025), LLM-generated code cannot be copyrighted in the USA — factor this into IP strategy

---

## Phase 2: UI Modernization

**Timeline:** Weeks 7-18
**Goal:** Modernize the visual identity without rewriting the core UI framework. Add the foundational UI elements needed for AI integration.

### 2.1 Theme & Visual Refresh
- Design a modern dark theme with DAWFLOW branding (Ardour's current theme is functional but dated)
- Update color palette: backgrounds, accent colors, selection highlights, meter colors
- Refine icon set — replace generic icons with DAWFLOW-branded equivalents
- Improve font rendering and typography choices
- Add theme switching support (dark/light/custom)

### 2.2 Toolbar & Layout Refinement
- Reorganize the application toolbar for cleaner visual hierarchy
- Improve the transport controls design
- Add a collapsible sidebar architecture (left: browser/AI, right: properties/inspector)
- Implement a modern tab system for switching between Editor, Mixer, Cue, and new AI views

### 2.3 Embedded Web View Panel (for AI Chat)
- Integrate CEF (Chromium Embedded Framework) or a lightweight web view (e.g., webview/webview library) into the GTK/YTK shell
- This panel will host the AI chat interface, rendered in HTML/CSS/JS for rapid iteration
- Establish a bidirectional bridge between the web view (JS) and the C++ backend
- The web view is dockable: can be a sidebar panel, a floating window, or a bottom panel
- This avoids rewriting Ardour's entire UI while still allowing a modern chat experience

### 2.4 Welcome Screen & Project Browser
- Design a modern welcome/start screen (recent projects, templates, new project wizard)
- Add a project browser with search and tagging
- Include "AI Quick Start" templates (e.g., "Start a vocal session", "Create a beat")

### 2.5 Mixer Modernization
- Visual refresh of mixer strips (Ardour's mixer is already solid functionally)
- Add channel strip presets
- Improve drag-and-drop for plugin reordering
- Add visual meters with modern styling (peak hold, gradient fills, loudness metering)

### 2.6 Piano Roll Improvements
- Build on Ardour 9's new dedicated pianoroll window
- Add velocity editor improvements
- Improve note coloring options (by velocity, by pitch, by channel)
- Add ghost notes from other tracks (like Ableton/Cubase)

---

## Phase 3: AI Integration Core

**Timeline:** Weeks 19-36
**Goal:** Build the foundational AI architecture. This is the heart of DAWFLOW — the command API, the agent bridge, and the chat window.

### 3.1 DAW Action Registry (The Command API)
- Design and implement a centralized Action Registry that catalogs every controllable action in DAWFLOW
- Each action is a discrete, well-documented function with:
  - Unique string identifier (e.g., `track.create`, `track.set_volume`, `plugin.load`, `transport.play`)
  - Human-readable description (for LLM consumption)
  - Typed parameter schema (JSON Schema)
  - Return type schema
  - Category and tags (for discovery)
  - Destructiveness flag (safe / needs-confirmation / destructive)
  - Example invocations with expected results
- Initially wrap existing Ardour C++ APIs and Lua bindings into this registry
- Target: 200+ registered actions covering tracks, routing, plugins, MIDI, audio, transport, markers, automation, mixing, and project management

**Action Categories:**

| Category | Example Actions |
|----------|----------------|
| **Transport** | play, stop, record, loop, set_position, set_tempo, set_time_signature |
| **Tracks** | create_audio_track, create_midi_track, create_bus, rename, delete, set_color, duplicate |
| **Routing** | connect_output, disconnect, create_send, create_return, solo, mute, arm |
| **Levels** | set_volume, set_pan, set_gain, trim, normalize |
| **Plugins** | load_plugin, remove_plugin, bypass, set_parameter, get_parameter_list, reorder |
| **MIDI** | create_note, delete_note, transpose, quantize, humanize, set_velocity, generate_pattern |
| **Audio** | trim_region, split, crossfade, reverse, normalize, strip_silence, time_stretch |
| **Automation** | create_automation_lane, add_point, set_mode, clear, copy_automation |
| **Markers** | add_marker, add_cue_marker, set_range, create_arrangement_section |
| **Project** | save, export, import_audio, import_midi, get_session_info, undo, redo |
| **Analysis** | detect_peaks, detect_silence, detect_transients, spectral_analysis, loudness_measurement |
| **Mixing** | get_mix_state, apply_preset, balance_levels, set_stereo_width |

### 3.2 AI Agent Bridge
- Build the bridge layer that connects external AI models to the Action Registry
- Support multiple AI providers via API key configuration:
  - OpenAI (GPT-4o, GPT-5)
  - Anthropic (Claude Opus, Sonnet)
  - Google (Gemini 3 Flash/Pro)
  - Local models (Ollama, llama.cpp)
  - Custom endpoints (any OpenAI-compatible API)
- The bridge translates natural language intent into Action Registry calls
- Implement a system prompt framework that:
  - Describes DAWFLOW's capabilities to the LLM
  - Includes the full action registry as available tools
  - Provides context about the current session state (tracks, plugins, tempo, selection, etc.)
  - Follows MCP (Model Context Protocol) patterns

### 3.3 Session State Serialization
- Build a real-time session state serializer that generates a compact summary of the current project
- Includes: track list with properties, plugin chains, current selection, transport state, tempo map, marker positions, automation state
- This state is sent as context with every AI request so the LLM understands what it is working with
- Differential updates: only send changes since last query to minimize token usage
- Privacy controls: user can choose what session data is shared with the AI

### 3.4 AI Chat Window
- Implement the chat UI in the embedded web view panel (from Phase 2.3)
- Features:
  - Text input with auto-complete for common commands
  - Conversation history with session persistence
  - Action confirmation dialogs for destructive operations
  - Inline display of AI-generated results (MIDI previews, waveform thumbnails, parameter changes)
  - Voice input support (via Whisper or browser Web Speech API)
  - "Hum-to-MIDI" input (record a short audio clip, transcribe to MIDI via BasicPitch or similar)
  - Status indicators (thinking, executing, done, error)
  - Token usage and cost display
  - Multi-turn conversation with context retention

### 3.5 Undo/Redo Integration
- Every AI action must go through Ardour's existing undo system
- Group multi-step AI operations into a single undo point (e.g., "AI: loaded compressor and EQ on vocals")
- Add an "AI Action History" panel showing what the AI did, when, and allowing selective undo
- Implement a "rollback to before AI session" function

### 3.6 MCP Server (External Access)
- Expose the Action Registry as an MCP server so external AI clients (Claude Desktop, Cursor, etc.) can control DAWFLOW
- This gives DAWFLOW the best of both worlds: built-in AI chat AND external agent support
- Run on localhost with configurable port
- Support both the built-in chat and external MCP clients simultaneously

### 3.7 API Key Management & Settings
- Secure, encrypted storage of API keys (OS keychain integration)
- Settings panel for:
  - Choosing default AI provider and model
  - Setting token/cost limits per session
  - Configuring which actions require confirmation
  - Privacy settings (what data is sent to the AI)
  - Local model configuration (Ollama endpoint, model selection)

---

## Phase 4: AI Features

**Timeline:** Weeks 37-60
**Goal:** Build the AI-powered features that make DAWFLOW transformative. Each feature leverages the Action Registry and Agent Bridge from Phase 3.

### 4.1 Natural Language DAW Control
- The baseline capability: users type (or speak) commands and the AI executes them
- Examples:
  - "Create 4 audio tracks named Kick, Snare, HiHat, Overhead"
  - "Load ReaComp on the vocal bus"
  - "Lower all drum tracks by 3dB"
  - "Set the tempo to 128 BPM"
  - "Solo the bass and guitars"
  - "Export the project as WAV, 48kHz, 24-bit"
- Multi-step operations: "Set up a sidechain from the kick to the bass using a compressor"
- Contextual understanding: "Make that louder" (AI knows what "that" refers to based on selection)

### 4.2 AI Mixing Assistant
- Analyze the current mix and suggest improvements
- Auto-gain-staging: set initial levels based on audio analysis
- Frequency balance analysis: identify masking, suggest EQ moves
- Dynamic range analysis: suggest compression settings
- Stereo field analysis: suggest panning adjustments
- Reference track comparison: "Make this sound like [uploaded reference]"
- Genre-aware presets: "Mix this like a modern pop track"
- The AI explains its reasoning: "I'm cutting 400Hz on the vocals because they're masking the guitar"

### 4.3 Audio Analysis Engine
- **Peak Detection:** Identify loudest moments, true peak vs. sample peak
- **Silence Detection:** Find and mark silent regions with configurable thresholds (like Reagent's auto-calculated thresholds)
- **Transient Detection:** Identify attack points for drum replacement, alignment, or editing
- **Spectral Analysis:** Real-time and offline frequency analysis with AI interpretation ("this vocal has excessive sibilance around 7kHz")
- **Loudness Measurement:** LUFS metering (integrated, short-term, momentary) per track and master
- **Noise Profiling:** Identify and characterize background noise for removal suggestions
- All analysis runs locally — audio never leaves the machine
- Results are accessible to the AI for informed decision-making

### 4.4 AI-Powered Strip Silence
- Natural language: "Analyze this vocal and cut empty spaces"
- Intelligent threshold detection (not just dB-based — considers context, noise floor, room tone)
- Preview mode: shows proposed cuts before committing
- Configurable: minimum region length, pre-roll, post-roll, crossfade type
- Works on multiple tracks simultaneously

### 4.5 MIDI Generation & Composition
- Natural language to MIDI: "Generate a walking bass line in E minor, 120 BPM, jazz style"
- Chord progression generation: "Give me a chord progression for a sad ballad in D major"
- Melody generation: "Write a violin melody over these chords"
- Drum pattern generation: "Create a four-on-the-floor house beat"
- Hum-to-MIDI: user hums or sings, AI transcribes to MIDI notes
- MIDI continuation: user provides 2-4 bars, AI extends it in the same style
- Style-aware: can match genre, complexity, and feel to existing content
- All generated MIDI is editable — dropped directly into MIDI tracks as regions

### 4.6 AI Mastering Assistant
- Analyze the master bus and suggest mastering chain
- Auto-apply basic mastering: EQ, compression, limiting, stereo enhancement
- LUFS targeting: "Master this to -14 LUFS for streaming"
- Reference matching: compare spectral balance against reference tracks
- Genre presets: "Master this for vinyl release" vs "Master for Spotify"
- A/B comparison: instant toggle between processed and unprocessed
- Export presets for different distribution targets

### 4.7 Vocal Processing Pipeline
- Detect vocal tracks automatically
- Suggest processing chain: de-esser, compressor, EQ, reverb, delay
- Pitch analysis and correction suggestions (leverage Ardour's existing signal processing)
- Breath removal / reduction
- Double tracking suggestions
- Harmony generation: "Add a third above the lead vocal"

### 4.8 Smart Audio Editing
- "Clean up this recording" — AI identifies and fixes common issues (clicks, pops, background noise, clipping)
- "Tighten the drums" — quantize/align audio transients to grid
- "Make this guitar part fit the tempo" — intelligent time-stretching
- "Remove the bleed from this mic" — spectral editing suggestions
- Crossfade optimization: AI suggests best crossfade points and curves

### 4.9 AI Prompt Templates & Macros
- Pre-built prompt templates for common workflows:
  - "Set up a vocal recording session"
  - "Create a beat from scratch"
  - "Prepare this mix for mastering"
  - "Clean up and organize this session"
- Users can create and share their own prompt templates
- Macro recording: record a series of AI actions and replay them

---

## Phase 5: Competitive Features

**Timeline:** Weeks 61-90
**Goal:** Close the feature gap with Cubase and Ableton. These are the non-AI features that users expect from a professional DAW.

### 5.1 Built-In Instruments
- **DAWFLOW Synth** — A wavetable/subtractive hybrid synthesizer (consider embedding Vital, Surge XT, or Dexed, all of which are open-source)
  - Surge XT: GPL-3, full-featured, wavetable + FM + subtractive
  - Vital: GPL-3, modern wavetable synth with visual UI
  - Dexed: GPL-3, DX7-style FM synth
- **DAWFLOW Sampler** — Sample-based instrument with key mapping, velocity layers, and loop modes
- **DAWFLOW Drums** — Drum machine / pattern sequencer with built-in kits
- Bundle high-quality free sample packs and presets

### 5.2 Enhanced Clip Launcher
- Expand Ardour 9's clip launching capabilities:
  - Dynamic slot/scene addition (Ardour currently limited to 16 slots)
  - Complex follow actions (like Ableton's probability-based follow)
  - Per-clip effects
  - Scene naming and color coding
  - MIDI clip launching
  - Grid controller support (Launchpad, Push, APC)
  - Live recording into slots with auto-quantize

### 5.3 Chord Track & Scale Tools
- Implement a chord track (like Cubase's) that provides harmonic context across the timeline
- Scale lock: constrain MIDI input and editing to a selected scale
- Chord detection: analyze audio/MIDI and display detected chords
- Chord suggestions: AI-powered "what chord comes next?" suggestions
- Chord pads: trigger chords from a pad interface with voicing options

### 5.4 Notation / Score View
- Basic score editor for MIDI tracks
- Display standard notation alongside the piano roll
- Print/export to PDF
- Lead sheet generation
- Tab notation for guitar

### 5.5 Audio-to-MIDI
- Monophonic and polyphonic audio-to-MIDI conversion
- Drum transcription (audio drums to MIDI drum map)
- Melody extraction from mixed audio
- Leverage open-source models (BasicPitch by Spotify, Omnizart, or CREPE)

### 5.6 VariAudio-Style Vocal Editor
- Integrated pitch correction directly in the audio editor
- Note-by-note pitch and timing adjustment
- Formant preservation
- Vibrato editing
- Direct integration with the AI vocal processing pipeline (Phase 4.7)

### 5.7 AI-Powered Stem Separation
- Separate mixed audio into stems (vocals, drums, bass, other) using open-source models (Demucs by Meta, Open-Unmix)
- Runs locally, no cloud required
- Results are placed on separate tracks, ready for mixing
- Natural language: "Separate this track into stems"

### 5.8 Cloud Collaboration (Optional)
- Real-time session sharing between DAWFLOW users
- Version control for sessions (git-based)
- Comment and annotation system
- Shared AI chat (multiple users can interact with the AI in the same session)
- Asset sharing: plugin presets, templates, sample packs
- This is optional/premium — DAWFLOW works fully offline

### 5.9 Groove & Feel Tools
- Groove extraction: analyze timing/velocity of a performance and extract a groove template
- Groove application: apply extracted groove to other tracks
- Humanize: add natural timing/velocity variation to quantized MIDI
- Swing control per track

### 5.10 Content Browser
- Unified browser for samples, loops, presets, instruments, and effects
- Preview (audition) directly in the browser before loading
- Tagging and search (including AI-powered search: "find a dark pad sound")
- Integration with online sound libraries

---

## Phase 6: Polish & Ship

**Timeline:** Weeks 91-108
**Goal:** Production-ready release. Performance, stability, documentation, and distribution.

### 6.1 Performance Optimization
- Profile and optimize AI integration overhead (ensure zero impact on audio when AI is idle)
- Optimize session state serialization for large projects (500+ tracks)
- Memory profiling and leak detection
- GPU acceleration for UI rendering where applicable
- Benchmark against Ardour 9 baseline — DAWFLOW must not regress

### 6.2 Stability & Testing
- Comprehensive test suite for the Action Registry (every action tested programmatically)
- Integration tests: AI command -> Action Registry -> DAW state change -> verify
- Stress testing: rapid AI commands, large sessions, many plugins
- Cross-platform QA: Linux (Ubuntu, Fedora, Arch), macOS (Intel + Apple Silicon), Windows 10/11
- Plugin compatibility testing with popular LV2, VST3, and AU plugins

### 6.3 Documentation
- User manual (building on Ardour's excellent manual framework)
- AI-specific documentation: how to use the chat, prompt writing tips, action reference
- Developer documentation: Action Registry API reference, MCP server spec, plugin development guide
- Video tutorials: "Your First AI Session", "AI Mixing Walkthrough", "Building a Track with Voice Commands"

### 6.4 Installer & Distribution
- Polished installers for all platforms
- Auto-update mechanism
- First-run experience: guided setup wizard (choose AI provider, configure API key, import settings)
- Plugin scanner and compatibility report on first launch

### 6.5 Community & Ecosystem
- DAWFLOW community forum / Discord
- Plugin/extension marketplace (for AI prompt templates, action macros, themes)
- Open API documentation for third-party AI agent integration
- Contributor guidelines and development setup documentation

### 6.6 Pricing & Business Model
- Core DAW: open source (GPL), free to build from source
- Pre-built binaries: paid download (like Ardour's model) or free with optional donation
- AI features: work with user's own API keys (no DAWFLOW subscription required for basic AI)
- Optional DAWFLOW AI subscription: managed API access, premium prompt templates, cloud features
- Built-in instruments and sample packs: bundled free, premium packs available

### 6.7 Launch
- Beta program with limited users
- Public beta with feedback collection
- 1.0 release targeting major DAW review outlets
- Launch demo video showcasing AI capabilities that no other DAW has

---

## Architecture Reference

### System Architecture Diagram (Text)

```
+------------------------------------------------------------------+
|                        DAWFLOW Application                        |
|                                                                   |
|  +------------------+  +------------------+  +-----------------+  |
|  |   GTK/YTK UI     |  |  Embedded Web    |  |  MCP Server     |  |
|  |  (Editor, Mixer,  |  |  View (Chat UI)  |  |  (localhost)    |  |
|  |   Cue, Piano Roll)|  |                  |  |                 |  |
|  +--------+---------+  +--------+---------+  +--------+--------+  |
|           |                      |                     |          |
|           v                      v                     v          |
|  +---------------------------------------------------------------+|
|  |                    ACTION REGISTRY                             ||
|  |  200+ registered actions with schemas, descriptions,          ||
|  |  examples, destructiveness flags                              ||
|  +---------------------------------------------------------------+|
|           |                      |                     |          |
|           v                      v                     v          |
|  +------------------+  +------------------+  +-----------------+  |
|  |  AI Agent Bridge  |  |  Lua Scripting   |  |  Direct C++    |  |
|  |  (LLM API calls)  |  |  API             |  |  API           |  |
|  +------------------+  +------------------+  +-----------------+  |
|           |                      |                     |          |
|           v                      v                     v          |
|  +---------------------------------------------------------------+|
|  |                 LIBARDOUR (Audio Backend)                      ||
|  |  Session, Tracks, Routing, Plugins, MIDI, Audio Engine        ||
|  +---------------------------------------------------------------+|
|           |                                                       |
|           v                                                       |
|  +---------------------------------------------------------------+|
|  |              Audio I/O (JACK, PulseAudio, CoreAudio, WASAPI)  ||
|  +---------------------------------------------------------------+|
+------------------------------------------------------------------+

External:
  +------------------+     +------------------+
  | AI Providers     |     | External MCP     |
  | (OpenAI, Claude, |     | Clients          |
  |  Gemini, Ollama) |     | (Claude Desktop, |
  +------------------+     |  Cursor, etc.)   |
                           +------------------+
```

### Key Architectural Decisions

1. **Action Registry as the single point of control.** Every way to modify the DAW — UI, AI, Lua, MCP — goes through the same registry. This ensures consistency, undo support, and auditability.

2. **Embedded web view for AI UI only.** The core DAW UI stays native (YTK/Cairo) for performance. Only the AI chat panel uses a web view, giving us modern UI capabilities (React/Svelte) where we need rapid iteration without touching 175K lines of C++.

3. **AI runs out-of-process for safety.** LLM API calls and heavy analysis happen in a separate thread/process. A crashed AI agent never takes down the audio engine.

4. **Local-first, cloud-optional.** All audio analysis runs locally. AI providers are user-configured. DAWFLOW works fully offline with local models (Ollama). Cloud features (collaboration, managed AI) are optional add-ons.

5. **MCP as the external protocol.** By implementing MCP, DAWFLOW is instantly compatible with the growing ecosystem of AI agents and clients, without building bespoke integrations for each one.

### Technology Stack Summary

| Component | Technology |
|-----------|-----------|
| Audio Backend | libardour (C++), existing Ardour engine |
| Core UI | YTK (GTK2 fork), Cairo Canvas |
| AI Chat UI | Embedded web view (CEF or webview), React/Svelte |
| AI Agent Bridge | C++ with HTTP client (libcurl), JSON (nlohmann/json) |
| Action Registry | C++ with Lua bindings, JSON Schema |
| MCP Server | C++ HTTP server on localhost |
| Scripting | Lua 5.3 (existing), extended with AI bindings |
| Audio Analysis | C++ (FFTW, aubio, rubberband — already dependencies) |
| Build System | WAF (existing), CI/CD via GitHub Actions |
| AI Providers | OpenAI, Anthropic, Google, local (Ollama) via REST APIs |

---

## Milestone Summary

| Phase | Timeline | Key Deliverable |
|-------|----------|-----------------|
| **Phase 1** | Weeks 1-6 | Buildable, branded DAWFLOW binary on all platforms |
| **Phase 2** | Weeks 7-18 | Visually refreshed DAW with embedded web view panel |
| **Phase 3** | Weeks 19-36 | Working AI chat with 200+ actions, natural language control |
| **Phase 4** | Weeks 37-60 | AI mixing, analysis, MIDI generation, mastering |
| **Phase 5** | Weeks 61-90 | Built-in instruments, enhanced clip launcher, stem separation |
| **Phase 6** | Weeks 91-108 | Production-ready 1.0 release |

**Total estimated timeline: ~24 months** (with parallel work on later phases beginning earlier where possible).

---

## Research Sources

- [Reagent (ReaperAgent)](https://www.reaperagent.com/) — Commercial AI agent for REAPER
- [DAWZY: NeurIPS 2025 Paper](https://arxiv.org/abs/2512.03289) — Academic research on AI-powered DAW control
- [REAPER MCP Server](https://playbooks.com/mcp/itsuzef/reaper-mcp) — Open-source MCP bridge for REAPER
- [Ableton MCP](https://github.com/ahujasid/ableton-mcp) — MCP bridge for Ableton Live
- [MIDI Agent](https://www.midiagent.com/) — AI MIDI generation VST plugin
- [Ardour Development](https://ardour.org/development.html) — Ardour source code and architecture
- [Ardour Lua Scripting](https://manual.ardour.org/lua-scripting/) — Lua scripting API documentation
- [Ardour Source Tree Layout](https://ardour.org/files/doxygen/) — Doxygen documentation
- [Ardour 9.0 Release](https://www.linuxcompatible.org/story/ardour-90-released/) — Latest features
- [Ardour Clip Launching vs Ableton](https://ardour.org/clip_differences.html) — Feature comparison
- [Ardour YTK (GTK2 Fork)](https://www.phoronix.com/news/Ardour-Removes-GTK-Option) — UI framework transition
- [Cubase Features](https://www.steinberg.net/cubase/features/) — Built-in instruments and tools
- [Cubase 15 Release](https://thebeatcommunity.com/2025/11/05/steinberg-release-cubase-15/) — Latest features including stem separation
- [Ableton Live Instruments](https://www.ableton.com/en/manual/live-instrument-reference/) — Built-in instrument reference
- [JUCE Framework](https://juce.com/) — Industry-standard audio UI framework
- [DAW Frontend Development Struggles](https://billydm.github.io/blog/daw-frontend-development-struggles/) — UI framework challenges
- [Modular Architecture for Generative Music in DAWs (MDPI)](https://www.mdpi.com/1999-5903/17/10/469) — Academic research on VST-based AI architecture
- [AI Music Generators 2026 Comparison](https://jam.com/resources/best-ai-music-generators-2026) — Suno, Udio, AIVA landscape
- [Best AI Tools for Musicians 2026](https://kraftgeek.com/blogs/musician-guide/top-25-ai-tools-for-musicians-2025) — Market overview
