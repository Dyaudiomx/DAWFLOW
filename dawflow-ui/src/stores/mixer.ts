import { create } from 'zustand';

export interface MixerChannel {
  id: string;
  trackId: string;
  meterLevel: [number, number]; // L, R (0-1)
  peakLevel: [number, number];
  clipping: [boolean, boolean];
}

export type RackType = 'routing' | 'pre' | 'inserts' | 'equalizers' | 'strip' | 'sends' | 'cueSends' | 'directRouting' | 'quickControls';

interface MixerStore {
  channels: MixerChannel[];
  visibleRacks: RackType[];
  channelWidth: 'narrow' | 'wide';
  meterBridgeVisible: boolean;
  eqCurvesVisible: boolean;
  channelOverviewVisible: boolean;

  setMeterLevel: (id: string, level: [number, number]) => void;
  setPeakLevel: (id: string, peak: [number, number]) => void;
  toggleRack: (rack: RackType) => void;
  setChannelWidth: (width: 'narrow' | 'wide') => void;
  toggleMeterBridge: () => void;
  updateChannels: (channels: MixerChannel[]) => void;
}

export type { MixerStore };

export const useMixerStore = create<MixerStore>((set) => ({
  channels: [],
  visibleRacks: ['inserts', 'sends'],
  channelWidth: 'narrow',
  meterBridgeVisible: false,
  eqCurvesVisible: false,
  channelOverviewVisible: false,

  setMeterLevel: (id, level) => set((s) => ({
    channels: s.channels.map((c) => c.id === id ? { ...c, meterLevel: level } : c)
  })),
  setPeakLevel: (id, peak) => set((s) => ({
    channels: s.channels.map((c) => c.id === id ? { ...c, peakLevel: peak } : c)
  })),
  toggleRack: (rack) => set((s) => ({
    visibleRacks: s.visibleRacks.includes(rack)
      ? s.visibleRacks.filter((r) => r !== rack)
      : [...s.visibleRacks, rack]
  })),
  setChannelWidth: (width) => set({ channelWidth: width }),
  toggleMeterBridge: () => set((s) => ({ meterBridgeVisible: !s.meterBridgeVisible })),
  updateChannels: (channels) => set({ channels }),
}));
