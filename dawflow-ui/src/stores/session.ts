import { create } from 'zustand';
import type { Track } from '../types/track';

// Demo tracks to show the UI working
const DEMO_TRACKS: Track[] = [
  { id: '1', name: 'Kick', type: 'audio', color: '#5B7FA5', height: 65, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.75, pan: 0, inputRouting: 'Audio 1', outputRouting: 'Stereo Out' },
  { id: '2', name: 'Snare', type: 'audio', color: '#5B7FA5', height: 65, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.7, pan: 0, inputRouting: 'Audio 2', outputRouting: 'Stereo Out' },
  { id: '3', name: 'Hi-Hat', type: 'audio', color: '#5B7FA5', height: 65, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.6, pan: 0.3, inputRouting: 'Audio 3', outputRouting: 'Stereo Out' },
  { id: '4', name: 'Bass Synth', type: 'instrument', color: '#B8963A', height: 65, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.8, pan: 0, inputRouting: 'All MIDI', outputRouting: 'Stereo Out' },
  { id: '5', name: 'Lead Synth', type: 'instrument', color: '#B8963A', height: 65, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.65, pan: -0.2, inputRouting: 'All MIDI', outputRouting: 'Stereo Out' },
  { id: '6', name: 'Pad', type: 'midi', color: '#3A8C8C', height: 65, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.5, pan: 0, inputRouting: 'All MIDI', outputRouting: 'Stereo Out' },
  { id: '7', name: 'Vocals', type: 'audio', color: '#AE6A8A', height: 80, muted: false, solo: false, recordEnabled: true, monitorEnabled: true, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.85, pan: 0, inputRouting: 'Audio 4', outputRouting: 'Stereo Out' },
  { id: '8', name: 'FX Return', type: 'fx', color: '#8A6AAE', height: 40, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.6, pan: 0, inputRouting: '', outputRouting: 'Stereo Out' },
  { id: '9', name: 'Drum Bus', type: 'group', color: '#6A9FD4', height: 40, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.75, pan: 0, inputRouting: '', outputRouting: 'Stereo Out' },
  { id: '10', name: 'Stereo Out', type: 'group', color: '#6A9FD4', height: 65, muted: false, solo: false, recordEnabled: false, monitorEnabled: false, readAutomation: false, writeAutomation: false, frozen: false, locked: false, visible: true, volume: 0.9, pan: 0, inputRouting: '', outputRouting: '' },
];

interface SessionStore {
  sessionName: string;
  sampleRate: number;
  bitDepth: number;
  tracks: Track[];

  // Actions
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
  updateTracks: (tracks: Track[]) => void;
  getTrackById: (id: string) => Track | undefined;
}

export type { SessionStore };

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionName: 'DAWFLOW Project',
  sampleRate: 48000,
  bitDepth: 24,
  tracks: DEMO_TRACKS,

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
  updateTracks: (tracks) => set({ tracks }),
  getTrackById: (id) => get().tracks.find((t) => t.id === id),
}));
