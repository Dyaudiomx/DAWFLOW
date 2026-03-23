import { create } from 'zustand';

/**
 * Dedicated high-frequency meter store.
 *
 * Meter levels update at ~30-60 Hz per track via WebSocket strip_meter events.
 * Storing them OUTSIDE the session tracks array prevents the entire tracks
 * array from being replaced on every tick, which was causing all subscribed
 * components (CenterZone, LowerMixConsole, RightZone) to re-render hundreds
 * of times per second.
 *
 * Components subscribe to individual track meters:
 *   const level = useMeterStore(s => s.levels[trackId] ?? 0);
 */

interface MeterStore {
  /** Per-track meter level (0-1 normalized, with ballistic decay applied) */
  levels: Record<string, number>;
  /** Per-track peak hold level (0-1) */
  peaks: Record<string, number>;

  setLevel: (trackId: string, level: number) => void;
  resetPeak: (trackId: string) => void;
  resetAllPeaks: () => void;
}

export const useMeterStore = create<MeterStore>((set) => ({
  levels: {},
  peaks: {},

  setLevel: (trackId, level) => set((s) => {
    // Skip if level hasn't changed meaningfully (avoids unnecessary re-renders)
    const prev = s.levels[trackId] ?? 0;
    if (Math.abs(prev - level) < 0.002) return s;

    const prevPeak = s.peaks[trackId] ?? 0;
    return {
      levels: { ...s.levels, [trackId]: level },
      peaks: level > prevPeak
        ? { ...s.peaks, [trackId]: level }
        : s.peaks,
    };
  }),

  resetPeak: (trackId) => set((s) => ({
    peaks: { ...s.peaks, [trackId]: 0 },
  })),

  resetAllPeaks: () => set({ peaks: {} }),
}));
