import { create } from 'zustand';
import { engineTransportRoll, engineTransportRecord } from '../services/websocket';
import { ipc } from '../services/ipc';
import { useSessionStore } from './session';
import { useRegionStore } from './regions';

/** Convert seconds to BBT display (e.g. "5.2.1.0") */
function secondsToBBT(seconds: number, tempo: number): string {
  const beatsPerSecond = tempo / 60;
  const totalBeats = seconds * beatsPerSecond;
  const bar = Math.floor(totalBeats / 4) + 1;
  const beat = Math.floor(totalBeats % 4) + 1;
  const tick = Math.floor((totalBeats % 1) * 480);
  return `${bar}.${beat}.${tick}`;
}

interface TransportStore {
  playing: boolean;
  recording: boolean;
  looping: boolean;
  position: number;
  positionDisplay: string;
  tempo: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  leftLocator: number;
  rightLocator: number;
  leftLocatorDisplay: string;
  rightLocatorDisplay: string;
  timeFormat: 'barsBeats' | 'seconds' | 'timecode' | 'samples';
  recordMode: 'non_layered' | 'layered' | 'sound_on_sound';
  automationMode: 'touch' | 'autoLatch' | 'crossOver';
  metronomeEnabled: boolean;
  precountEnabled: boolean;
  punchIn: boolean;
  punchOut: boolean;
  syncEnabled: boolean;
  cpuLoad: number;
  diskLoad: number;
  midiInActivity: boolean;
  midiOutActivity: boolean;
  audioInActivity: boolean;
  audioOutActivity: boolean;
  bufferSize: number;
  engineRunning: boolean;

  // User-initiated actions (send commands to engine + update local state)
  play: () => void;
  stop: () => void;
  record: () => void;
  toggleLoop: () => void;
  toggleMetronome: () => void;
  setTempo: (tempo: number) => void;
  setPosition: (pos: number) => void;
  setPositionDisplay: (display: string) => void;
  setCpuLoad: (load: number) => void;
  setDiskLoad: (load: number) => void;
  setRecordMode: (mode: TransportStore['recordMode']) => void;
  setAutomationMode: (mode: TransportStore['automationMode']) => void;
  setBufferSize: (size: number) => void;
  setEngineRunning: (running: boolean) => void;
  setMidiInActivity: (active: boolean) => void;
  setMidiOutActivity: (active: boolean) => void;
  setAudioInActivity: (active: boolean) => void;
  setAudioOutActivity: (active: boolean) => void;
  setLeftLocator: (seconds: number) => void;
  setRightLocator: (seconds: number) => void;
  togglePunchIn: () => void;
  togglePunchOut: () => void;
  togglePrecount: () => void;
  updateFromEngine: (data: Partial<TransportStore>) => void;
}

export type { TransportStore };

/**
 * Debounce guard: after a user action (play/stop/record), ignore
 * incoming engine state updates for this many ms to prevent the
 * engine's "current state" broadcast from overriding our optimistic update.
 */
let userActionTimestamp = 0;
const USER_ACTION_DEBOUNCE_MS = 1500;

function isUserActionDebounced(): boolean {
  return Date.now() - userActionTimestamp < USER_ACTION_DEBOUNCE_MS;
}

function markUserAction() {
  userActionTimestamp = Date.now();
}

/**
 * Client-side position interpolation for smooth 60fps playhead.
 * Between engine updates (~10Hz), we linearly interpolate.
 * Position is in seconds. The engine sends BBT display separately.
 */
let lastEnginePositionTime = 0;
let lastEnginePosition = 0;
let interpolationFrame = 0;

function startInterpolation() {
  if (interpolationFrame) return;

  const tick = () => {
    const store = useTransportStore.getState();
    if (!store.playing) {
      interpolationFrame = 0;
      return;
    }

    const now = performance.now();
    const elapsed = (now - lastEnginePositionTime) / 1000;
    const interpolatedPos = lastEnginePosition + elapsed;

    // Only update position — BBT display comes from engine via transport_bbt
    useTransportStore.setState({ position: interpolatedPos });

    interpolationFrame = requestAnimationFrame(tick);
  };

  interpolationFrame = requestAnimationFrame(tick);
}

function stopInterpolation() {
  if (interpolationFrame) {
    cancelAnimationFrame(interpolationFrame);
    interpolationFrame = 0;
  }
}

export const useTransportStore = create<TransportStore>((set) => ({
  playing: false,
  recording: false,
  looping: false,
  position: 0,
  positionDisplay: '1.1.1.0',
  tempo: 120,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  leftLocator: 0,
  rightLocator: 0,
  leftLocatorDisplay: '1.1.1.0',
  rightLocatorDisplay: '5.1.1.0',
  timeFormat: 'barsBeats',
  recordMode: 'non_layered',
  automationMode: 'touch',
  metronomeEnabled: false,
  precountEnabled: false,
  punchIn: false,
  punchOut: false,
  syncEnabled: false,
  cpuLoad: 0,
  diskLoad: 0,
  midiInActivity: false,
  midiOutActivity: false,
  audioInActivity: false,
  audioOutActivity: false,
  bufferSize: 512,
  engineRunning: false,

  play: () => {
    markUserAction();
    // Anchor interpolation from current displayed position
    const currentPos = useTransportStore.getState().position;
    lastEnginePosition = currentPos;
    lastEnginePositionTime = performance.now();
    engineTransportRoll(true);
    set({ playing: true });
    startInterpolation();
  },
  stop: () => {
    markUserAction();
    const wasRecording = useTransportStore.getState().recording;
    engineTransportRoll(false);
    stopInterpolation();
    set({ playing: false, recording: false });
    // Fetch regions directly (fast path — skip tracks/session/groups)
    const fetchRegionsOnly = () => {
      const tracks = useSessionStore.getState().tracks;
      for (const t of tracks) {
        if (t.type === 'bus' || t.type === 'vca') continue;
        ipc.getRegions(t.id).then((regions) => {
          useRegionStore.getState().setRegions(t.id, regions.map((r) => ({
            ...r, trackId: t.id, type: t.type || 'audio',
          })));
        }).catch(() => {});
      }
    };
    if (wasRecording) {
      // Immediate region fetch + retries
      setTimeout(fetchRegionsOnly, 50);
      setTimeout(fetchRegionsOnly, 500);
      setTimeout(() => useSessionStore.getState().fetchFromEngine(), 1500);
    } else {
      setTimeout(fetchRegionsOnly, 50);
    }
  },
  record: () => {
    markUserAction();
    // Anchor interpolation from current displayed position
    const currentPos = useTransportStore.getState().position;
    lastEnginePosition = currentPos;
    lastEnginePositionTime = performance.now();
    engineTransportRecord(true);
    engineTransportRoll(true);
    set({ recording: true, playing: true });
    startInterpolation();
    // Poll regions during recording so user sees them grow
    // (CenterZone also polls armed-track regions at 2500ms — keep this slower to avoid duplicate load)
    const recPoll = setInterval(() => {
      if (!useTransportStore.getState().recording) {
        clearInterval(recPoll);
        return;
      }
      useSessionStore.getState().fetchFromEngine();
    }, 3000);
  },
  toggleLoop: () => {
    const newState = !useTransportStore.getState().looping;
    ipc.call('daw.set_loop_enabled', { enabled: newState }).catch((e) => console.warn('[IPC]', e));
    set({ looping: newState });
  },
  toggleMetronome: () => {
    const newState = !useTransportStore.getState().metronomeEnabled;
    ipc.call('daw.set_click_enabled', { enabled: newState }).catch((e) => console.warn('[IPC]', e));
    set({ metronomeEnabled: newState });
  },
  setTempo: (tempo) => {
    ipc.setTempo(tempo).catch((e) => console.warn('[IPC]', e));
    set({ tempo });
  },
  setPosition: (pos) => {
    // User-initiated seek — anchor interpolation and debounce engine updates
    markUserAction();
    lastEnginePosition = pos;
    lastEnginePositionTime = performance.now();
    set({ position: pos });
  },
  setPositionDisplay: (display) => set({ positionDisplay: display }),
  setCpuLoad: (load) => set({ cpuLoad: load }),
  setDiskLoad: (load) => set({ diskLoad: load }),
  setRecordMode: (mode) => set({ recordMode: mode }),
  setAutomationMode: (mode) => set({ automationMode: mode }),
  setBufferSize: (size) => set({ bufferSize: size }),
  setEngineRunning: (running) => set({ engineRunning: running }),
  setMidiInActivity: (active) => set({ midiInActivity: active }),
  setMidiOutActivity: (active) => set({ midiOutActivity: active }),
  setAudioInActivity: (active) => set({ audioInActivity: active }),
  setAudioOutActivity: (active) => set({ audioOutActivity: active }),
  setLeftLocator: (seconds) => {
    const sr = useSessionStore?.getState?.()?.sampleRate || 48000;
    const tempo = useTransportStore.getState().tempo || 120;
    set({
      leftLocator: seconds,
      leftLocatorDisplay: secondsToBBT(seconds, tempo),
    });
    ipc.setLoopRange(
      Math.floor(seconds * sr),
      Math.floor(useTransportStore.getState().rightLocator * sr),
    ).catch((e) => console.warn('[IPC]', e));
  },
  setRightLocator: (seconds) => {
    const sr = useSessionStore?.getState?.()?.sampleRate || 48000;
    const tempo = useTransportStore.getState().tempo || 120;
    set({
      rightLocator: seconds,
      rightLocatorDisplay: secondsToBBT(seconds, tempo),
    });
    ipc.setLoopRange(
      Math.floor(useTransportStore.getState().leftLocator * sr),
      Math.floor(seconds * sr),
    ).catch((e) => console.warn('[IPC]', e));
  },
  togglePunchIn: () => {
    const newState = !useTransportStore.getState().punchIn;
    ipc.setPunchIn(newState).catch((e) => console.warn('[IPC]', e));
    set({ punchIn: newState });
  },
  togglePunchOut: () => {
    const newState = !useTransportStore.getState().punchOut;
    ipc.setPunchOut(newState).catch((e) => console.warn('[IPC]', e));
    set({ punchOut: newState });
  },
  togglePrecount: () => {
    ipc.toggleCountIn().then((res) => {
      set({ precountEnabled: res.enabled });
    }).catch((e) => console.warn('[IPC]', e));
  },
  updateFromEngine: (data) => {
    const debounced = isUserActionDebounced();

    // Always accept position from engine — it's authoritative.
    if (data.position !== undefined) {
      const currentPos = useTransportStore.getState().position;
      const diff = Math.abs(data.position - currentPos);

      if (useTransportStore.getState().playing) {
        // During playback: smoothly re-anchor interpolation.
        // Small drifts (<0.5s) are normal — just update anchor silently.
        // Large jumps (>0.5s) mean engine relocated — snap immediately.
        lastEnginePosition = data.position;
        lastEnginePositionTime = performance.now();
        if (diff > 0.5) {
          set({ position: data.position });
        }
        // Otherwise interpolation will naturally converge
      } else {
        // When stopped: engine position is the truth, set directly
        lastEnginePosition = data.position;
        lastEnginePositionTime = performance.now();
        set({ position: data.position });
      }
    }

    // During debounce, ignore play/stop/record state changes from engine
    // to prevent old engine state from reverting optimistic UI updates
    if (debounced) {
      const { playing, recording, position, ...safe } = data;
      if (Object.keys(safe).length > 0) {
        set(safe as Partial<TransportStore>);
      }
      return;
    }

    // Apply all state outside debounce window
    const { position: _pos, ...rest } = data;
    set(rest as Partial<TransportStore>);

    // Start/stop interpolation based on engine state
    if (data.playing === true) {
      startInterpolation();
    } else if (data.playing === false) {
      stopInterpolation();
    }
  },
}));
