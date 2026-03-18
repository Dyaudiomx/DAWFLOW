import { create } from 'zustand';
import { engineTransportRoll, engineTransportRecord, engineSetTempo } from '../services/websocket';

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
  recordMode: 'normal' | 'merge' | 'replace' | 'punchOnLane';
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
  updateFromEngine: (data: Partial<TransportStore>) => void;
}

export type { TransportStore };

/**
 * Debounce guard: after a user action (play/stop/record), ignore
 * incoming engine state updates for this many ms to prevent the
 * engine's "current state" broadcast from overriding our optimistic update.
 */
let userActionTimestamp = 0;
const USER_ACTION_DEBOUNCE_MS = 800;

function isUserActionDebounced(): boolean {
  return Date.now() - userActionTimestamp < USER_ACTION_DEBOUNCE_MS;
}

function markUserAction() {
  userActionTimestamp = Date.now();
}

/**
 * Client-side position interpolation for smooth 60fps playhead.
 * Between engine updates (10Hz), we interpolate based on tempo.
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
    const elapsed = (now - lastEnginePositionTime) / 1000; // seconds
    const interpolatedPos = lastEnginePosition + elapsed;

    // Update position and display without triggering engine commands
    const totalBeats = (interpolatedPos / 60) * store.tempo;
    const bar = Math.floor(totalBeats / store.timeSignatureNumerator) + 1;
    const beat = Math.floor(totalBeats % store.timeSignatureNumerator) + 1;
    const subtick = Math.floor((totalBeats % 1) * 480);

    useTransportStore.setState({
      position: interpolatedPos,
      positionDisplay: `${bar}.${beat}.${subtick.toString().padStart(3, '0')}`,
    });

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
  recordMode: 'normal',
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

  play: () => {
    markUserAction();
    engineTransportRoll(true);
    set({ playing: true });
    startInterpolation();
  },
  stop: () => {
    markUserAction();
    engineTransportRoll(false);
    set({ playing: false, recording: false });
    stopInterpolation();
  },
  record: () => {
    markUserAction();
    engineTransportRecord(true);
    engineTransportRoll(true);
    set({ recording: true, playing: true });
    startInterpolation();
  },
  toggleLoop: () => set((s) => ({ looping: !s.looping })),
  toggleMetronome: () => set((s) => ({ metronomeEnabled: !s.metronomeEnabled })),
  setTempo: (tempo) => {
    engineSetTempo(tempo);
    set({ tempo });
  },
  setPosition: (pos) => {
    // Called from engine updates — anchor the interpolation
    lastEnginePosition = pos;
    lastEnginePositionTime = performance.now();
    // Don't set state here — interpolation handles smooth updates
  },
  setPositionDisplay: (display) => set({ positionDisplay: display }),
  setCpuLoad: (load) => set({ cpuLoad: load }),
  setDiskLoad: (load) => set({ diskLoad: load }),
  updateFromEngine: (data) => {
    // Ignore play/stop/record state from engine during debounce period
    if (isUserActionDebounced()) {
      const { playing, recording, ...rest } = data;
      if (Object.keys(rest).length > 0) {
        set(rest as Partial<TransportStore>);
      }
      return;
    }
    set(data);
    // Start/stop interpolation based on engine state
    if (data.playing === true) {
      startInterpolation();
    } else if (data.playing === false) {
      stopInterpolation();
    }
  },
}));
