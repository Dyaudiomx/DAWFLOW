# Nuclear UI Fix Plan — 2026-03-20

## Audit Results: 247 UI elements checked

### Critical Fixes Needed (Broken/Dead/Placeholder)

#### 1. Pan not working (CRITICAL)
- `setTrackPan()` calls `ipc.setPanPosition(id, position)` — need to verify this IPC command exists and works
- Inspector pan fader, mixer pan knob both route through this

#### 2. Tool cursors in CenterZone
- 13 tools defined in Toolbar but CenterZone CSS only maps some via `data-tool` attribute
- Missing cursors for: color, comp, timewarp, play, line tools

#### 3. Dead/Placeholder buttons
- Toolbar: Configurations dropdown, CDC button, Listen button
- TransportBar: Settings, Performance, Audio Connections, MIDI Filter, Auto Quantize (5 buttons)
- Inspector: Musical Mode, Add/Remove Bus buttons (4 buttons)
- These should either be wired or removed

#### 4. Volume dB conversion may be wrong
- `setTrackVolume` converts: `gainDb = volume <= 0 ? -100 : 20 * Math.log10(volume / 0.75)`
- The `/0.75` factor is suspicious — Ardour expects raw gain in dB where 0dB = unity gain
- If `volume=1.0` in UI means unity gain, the conversion should be `20 * Math.log10(volume)` not `volume/0.75`

#### 5. MidiEditor remaining issues
- Line tool doesn't draw in CC lanes
- Alt+drag duplicate needs verification after rewrite
- First note (ID 0) fix needs verification

#### 6. IPC command name verification
- Send slots use `daw.set_send_level`, `daw.send.set_pan`, etc. — need to verify against api-schema.json
- Some commands may have wrong names

### Fix Waves

**Wave 1: Pan + Volume + Core track controls**
**Wave 2: Tool cursors everywhere**
**Wave 3: Dead buttons → wire or remove**
**Wave 4: IPC command verification**
**Wave 5: Self-test verification**
