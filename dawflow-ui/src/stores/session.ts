import { create } from 'zustand';
import type { Track, TrackType } from '../types/track';
import { ipc, type EngineTrack } from '../services/ipc';
import { useRegionStore } from './regions';
import { useConnectionStore } from './connection';

// ---------------------------------------------------------------------------
// Engine → UI track conversion
// ---------------------------------------------------------------------------

function engineTrackToTrack(et: EngineTrack, _index: number): Track {
  const COLORS: Record<string, string> = {
    audio: '#5B7FA5', midi: '#3A8C8C', instrument: '#B8963A',
    bus: '#6A9FD4', vca: '#8A6AAE', fx: '#8A6AAE', group: '#6A9FD4',
  };
  const type = (et.type || 'audio') as TrackType;
  return {
    id: et.id,
    name: et.name,
    type,
    color: COLORS[type] || '#5B7FA5',
    height: 65,
    muted: et.muted,
    solo: et.soloed,
    recordEnabled: et.record_enabled || false,
    monitorEnabled: false,
    readAutomation: false,
    writeAutomation: false,
    frozen: false,
    locked: false,
    visible: true,
    volume: et.gain_db !== undefined ? Math.pow(10, et.gain_db / 20) * 0.75 : 0.75,
    pan: 0,
    inputRouting: '',
    outputRouting: '',
  };
}

interface SessionStore {
  sessionName: string;
  sampleRate: number;
  bitDepth: number;
  tracks: Track[];
  loading: boolean;

  // Actions
  fetchFromEngine: () => Promise<void>;
  setSessionName: (name: string) => void;
  setTrackMute: (id: string, muted: boolean) => void;
  setTrackSolo: (id: string, solo: boolean) => void;
  setTrackRecord: (id: string, enabled: boolean) => void;
  setTrackMonitor: (id: string, enabled: boolean) => void;
  setTrackVolume: (id: string, volume: number) => void;
  setTrackPan: (id: string, pan: number) => void;
  setTrackName: (id: string, name: string) => void;
  setTrackHeight: (id: string, height: number) => void;
  setTrackColor: (id: string, color: string) => void;
  setTrackMeterLevel: (id: string, level: number) => void;
  updateTracks: (tracks: Track[]) => void;
  getTrackById: (id: string) => Track | undefined;
}

export type { SessionStore };

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionName: 'DAWFLOW Project',
  sampleRate: 48000,
  bitDepth: 24,
  tracks: [],
  loading: true,

  fetchFromEngine: async () => {
    if (!useConnectionStore.getState().wsConnected) return;
    try {
      const [engineTracks, sessionInfo] = await Promise.all([
        ipc.getTracks(),
        ipc.getSessionInfo(),
      ]);
      set({
        tracks: engineTracks.map(engineTrackToTrack),
        sessionName: sessionInfo.name || 'Untitled',
        sampleRate: sessionInfo.sample_rate || 48000,
        loading: false,
      });

      // Fetch regions for each track (non-blocking, don't await all)
      for (const et of engineTracks) {
        ipc.getRegions(et.id).then((regions) => {
          useRegionStore.getState().setRegions(et.id, regions.map((r) => ({
            ...r,
            trackId: et.id,
            type: et.type || 'audio',
          })));
        }).catch(() => {
          // Track may not have regions -- that's fine
        });
      }
    } catch (e) {
      console.error('[DAWFLOW] Failed to fetch session data:', e);
      set({ loading: false });
    }
  },

  setSessionName: (name) => set({ sessionName: name }),
  setTrackMute: (id, muted) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, muted } : t)
  })),
  setTrackSolo: (id, solo) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, solo } : t)
  })),
  setTrackRecord: (id, enabled) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, recordEnabled: enabled } : t)
  })),
  setTrackMonitor: (id, enabled) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, monitorEnabled: enabled } : t)
  })),
  setTrackVolume: (id, volume) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, volume } : t)
  })),
  setTrackPan: (id, pan) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, pan } : t)
  })),
  setTrackName: (id, name) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, name } : t)
  })),
  setTrackHeight: (id, height) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, height } : t)
  })),
  setTrackColor: (id, color) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, color } : t)
  })),
  setTrackMeterLevel: (id, level) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, meterLevel: level } : t)
  })),
  updateTracks: (tracks) => set({ tracks }),
  getTrackById: (id) => get().tracks.find((t) => t.id === id),
}));
