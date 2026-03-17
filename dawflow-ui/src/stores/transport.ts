import { create } from 'zustand';

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

  // Actions
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

  play: () => set({ playing: true }),
  stop: () => set({ playing: false, recording: false }),
  record: () => set({ recording: true, playing: true }),
  toggleLoop: () => set((s) => ({ looping: !s.looping })),
  toggleMetronome: () => set((s) => ({ metronomeEnabled: !s.metronomeEnabled })),
  setTempo: (tempo) => set({ tempo }),
  setPosition: (pos) => set({ position: pos }),
  setPositionDisplay: (display) => set({ positionDisplay: display }),
  setCpuLoad: (load) => set({ cpuLoad: load }),
  setDiskLoad: (load) => set({ diskLoad: load }),
  updateFromEngine: (data) => set(data),
}));
