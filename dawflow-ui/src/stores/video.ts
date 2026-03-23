import { create } from 'zustand';

interface VideoState {
  videoFile: string | null;
  fps: number;
  duration: number;
  aspectRatio: number;
  syncEnabled: boolean;
  pullup: number;
  offsetSamples: number;
  offsetNegative: boolean;
  offsetLocked: boolean;
  harvidUrl: string;
  harvidAvailable: boolean;
  xjadeoRunning: boolean;
  videoTrackVisible: boolean;

  setVideoFile: (file: string | null, fps?: number, duration?: number, aspectRatio?: number) => void;
  setSyncEnabled: (enabled: boolean) => void;
  setPullup: (pullup: number) => void;
  setOffset: (samples: number, negative: boolean) => void;
  setOffsetLocked: (locked: boolean) => void;
  setHarvidAvailable: (available: boolean) => void;
  setXjadeoRunning: (running: boolean) => void;
  setVideoTrackVisible: (visible: boolean) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videoFile: null,
  fps: 24,
  duration: 0,
  aspectRatio: 16/9,
  syncEnabled: false,
  pullup: 1.0,
  offsetSamples: 0,
  offsetNegative: false,
  offsetLocked: false,
  harvidUrl: 'http://localhost:5080',
  harvidAvailable: false,
  xjadeoRunning: false,
  videoTrackVisible: true,

  setVideoFile: (file, fps, duration, aspectRatio) => set({
    videoFile: file,
    ...(fps !== undefined ? { fps } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(aspectRatio !== undefined ? { aspectRatio } : {}),
  }),
  setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
  setPullup: (pullup) => set({ pullup }),
  setOffset: (samples, negative) => set({ offsetSamples: samples, offsetNegative: negative }),
  setOffsetLocked: (locked) => set({ offsetLocked: locked }),
  setHarvidAvailable: (available) => set({ harvidAvailable: available }),
  setXjadeoRunning: (running) => set({ xjadeoRunning: running }),
  setVideoTrackVisible: (visible) => set({ videoTrackVisible: visible }),
}));
