import { create } from 'zustand';

export interface Region {
  id: string;
  trackId: string;
  name: string;
  position: number;  // samples
  length: number;    // samples
  start: number;     // samples (offset within source)
  type: string;      // audio, midi
}

interface RegionStore {
  regionsByTrack: Record<string, Region[]>;
  loading: boolean;
  setRegions: (trackId: string, regions: Region[]) => void;
  clearAll: () => void;
  setLoading: (loading: boolean) => void;
}

export const useRegionStore = create<RegionStore>((set) => ({
  regionsByTrack: {},
  loading: false,
  setRegions: (trackId, regions) => set((s) => ({
    regionsByTrack: { ...s.regionsByTrack, [trackId]: regions },
  })),
  clearAll: () => set({ regionsByTrack: {} }),
  setLoading: (loading) => set({ loading }),
}));
