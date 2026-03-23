import { useCallback } from 'react';
import { create } from 'zustand';

export interface Region {
  id: string;
  trackId: string;
  name: string;
  position: number;  // samples
  length: number;    // samples
  start: number;     // samples (offset within source)
  sourceLength?: number; // samples — max possible length of the source audio
  type: string;      // audio, midi
  muted?: boolean;
  locked?: boolean;
  fadeInLength?: number;  // samples
  fadeOutLength?: number; // samples
  fadeInShape?: string;
  fadeOutShape?: string;
}

interface RegionStore {
  regionsByTrack: Record<string, Region[]>;
  loading: boolean;
  setRegions: (trackId: string, regions: Region[]) => void;
  clearAll: () => void;
  setLoading: (loading: boolean) => void;

  // Mutation actions
  removeRegion: (trackId: string, regionId: string) => void;
  updateRegionPosition: (trackId: string, regionId: string, newPosition: number) => void;
  updateRegionName: (trackId: string, regionId: string, name: string) => void;
}

/** Stable empty array reference — avoids allocating a new [] on every selector call */
const EMPTY_REGIONS: Region[] = [];

/**
 * Shallow-compare two region arrays.
 * Returns true when they are semantically identical (same length, same id + position + length
 * for every element), meaning we can skip the store update entirely.
 */
function regionsEqual(prev: Region[] | undefined, next: Region[]): boolean {
  if (!prev) return next.length === 0;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (
      a.id !== b.id ||
      a.position !== b.position ||
      a.length !== b.length ||
      a.start !== b.start ||
      a.name !== b.name ||
      a.fadeInLength !== b.fadeInLength ||
      a.fadeOutLength !== b.fadeOutLength
    ) {
      return false;
    }
  }
  return true;
}

export const useRegionStore = create<RegionStore>((set) => ({
  regionsByTrack: {},
  loading: false,

  setRegions: (trackId, regions) => set((s) => {
    const prev = s.regionsByTrack[trackId];
    // Skip update if nothing actually changed — prevents cascading re-renders
    if (regionsEqual(prev, regions)) return s;
    return { regionsByTrack: { ...s.regionsByTrack, [trackId]: regions } };
  }),

  clearAll: () => set({ regionsByTrack: {} }),
  setLoading: (loading) => set({ loading }),

  removeRegion: (trackId, regionId) => set((s) => {
    const prev = s.regionsByTrack[trackId] || [];
    const next = prev.filter((r) => r.id !== regionId);
    // Skip if nothing was actually removed
    if (next.length === prev.length) return s;
    return {
      regionsByTrack: { ...s.regionsByTrack, [trackId]: next },
    };
  }),

  updateRegionPosition: (trackId, regionId, newPosition) => set((s) => {
    const prev = s.regionsByTrack[trackId] || [];
    const idx = prev.findIndex((r) => r.id === regionId);
    // Skip if region not found or position unchanged
    if (idx === -1 || prev[idx].position === newPosition) return s;
    return {
      regionsByTrack: {
        ...s.regionsByTrack,
        [trackId]: prev.map((r) =>
          r.id === regionId ? { ...r, position: newPosition } : r
        ),
      },
    };
  }),

  updateRegionName: (trackId, regionId, name) => set((s) => {
    const prev = s.regionsByTrack[trackId] || [];
    const idx = prev.findIndex((r) => r.id === regionId);
    // Skip if region not found or name unchanged
    if (idx === -1 || prev[idx].name === name) return s;
    return {
      regionsByTrack: {
        ...s.regionsByTrack,
        [trackId]: prev.map((r) =>
          r.id === regionId ? { ...r, name } : r
        ),
      },
    };
  }),
}));

/**
 * Per-track region subscription hook.
 * Only triggers a re-render when the specific track's regions change —
 * not when other tracks update. Returns a stable empty array for unknown tracks.
 *
 * Usage:
 *   const regions = useTrackRegions(track.id);
 */
export function useTrackRegions(trackId: string | undefined): Region[] {
  return useRegionStore(
    useCallback(
      (s: RegionStore) => (trackId ? s.regionsByTrack[trackId] || EMPTY_REGIONS : EMPTY_REGIONS),
      [trackId],
    ),
  );
}
