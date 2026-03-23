import { create } from 'zustand';
import type { Track, TrackType } from '../types/track';
import { ipc, type EngineTrack } from '../services/ipc';
import { useRegionStore } from './regions';
import { useConnectionStore } from './connection';
// Throttle for volume/pan IPC calls (fader fires on every pixel)
let _volPanTimer: ReturnType<typeof setTimeout> | null = null;
function throttledIpc(fn: () => Promise<unknown>) {
  if (_volPanTimer) clearTimeout(_volPanTimer);
  _volPanTimer = setTimeout(() => { fn().catch(() => {}); }, 50);
}

// ---------------------------------------------------------------------------
// Engine → UI track conversion
// ---------------------------------------------------------------------------

const DEFAULT_COLORS: Record<string, string> = {
  audio: '#5B7FA5', midi: '#3A8C8C', instrument: '#B8963A',
  bus: '#6A9FD4', vca: '#8A6AAE', fx: '#8A6AAE', group: '#6A9FD4',
};

function engineColorToCSS(hex: string | undefined): string | null {
  // Engine sends RRGGBBAA (e.g. "50b050ff"). Convert to CSS #RRGGBB.
  if (!hex || hex.length < 6) return null;
  const css = '#' + hex.substring(0, 6);
  // Skip Ardour's ugly defaults (pinks/salmons like ffaaaa, aa3939)
  if (css === '#ffaaaa' || css === '#aa3939' || css === '#000000') return null;
  return css;
}

function engineTrackToTrack(et: EngineTrack, _index: number, existing?: Track): Track {
  const type = (et.type || 'audio') as TrackType;
  // Color: prefer existing local color if set (user may have changed it and engine hasn't confirmed yet)
  const engineColor = engineColorToCSS(et.color);
  const color = existing?.color || engineColor || DEFAULT_COLORS[type] || '#5B7FA5';
  return {
    id: et.id,
    name: et.name,
    type,
    color,
    height: existing?.height || 65,
    // Use engine values for mute/solo (these are confirmed server state)
    muted: et.muted,                                       // full mute (any reason)
    mutedBySelf: (et as any).muted_by_self ?? et.muted,    // explicit user mute only
    mutedByOthers: (et as any).muted_by_others ?? false,   // solo-implied mute
    solo: et.soloed,
    // Preserve local record/monitor state — engine may lag behind optimistic updates
    recordEnabled: existing?.recordEnabled ?? (et.record_enabled || false),
    monitorEnabled: existing?.monitorEnabled || false,
    readAutomation: existing?.readAutomation || false,
    writeAutomation: existing?.writeAutomation || false,
    frozen: false,
    locked: false,
    visible: existing?.visible ?? true,
    volume: et.gain_db !== undefined ? Math.pow(10, et.gain_db / 20) * 0.75 : (existing?.volume ?? 0.75),
    pan: existing?.pan ?? 0,
    inputRouting: existing?.inputRouting || '',
    outputRouting: existing?.outputRouting || '',
  };
}

// ---------------------------------------------------------------------------
// Route groups (used for folder hierarchy)
// ---------------------------------------------------------------------------

export interface RouteGroup {
  id: string;
  name: string;
  memberIds?: string[];
}

interface SessionStore {
  sessionName: string;
  sampleRate: number;
  bitDepth: number;
  tracks: Track[];
  routeGroups: RouteGroup[];
  collapsedFolders: string[];
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
  /** @deprecated Use useMeterStore instead — meter levels are in a separate store for performance */
  setTrackMeterLevel: (id: string, level: number) => void;
  updateTracks: (tracks: Track[]) => void;
  getTrackById: (id: string) => Track | undefined;
  toggleFolderCollapsed: (trackId: string) => void;
}

export type { SessionStore };

// Debounce guard: skip fetchFromEngine if called within 1 second of last fetch
let _lastFetchTime = 0;

/** Reset the debounce guard so the next fetchFromEngine() runs immediately. */
export function resetFetchDebounce() {
  _lastFetchTime = 0;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionName: 'DAWFLOW Project',
  sampleRate: 48000,
  bitDepth: 24,
  tracks: [],
  routeGroups: [],
  collapsedFolders: [],
  loading: true,

  fetchFromEngine: async () => {
    const conn = useConnectionStore.getState();
    // Allow fetch if WebSocket OR IPC is connected, or native bridge exists (WKWebView)
    if (!conn.wsConnected && !conn.ipcConnected && typeof (window as any).__dawflow_call !== 'function') return;

    const now = Date.now();
    if (now - _lastFetchTime < 1000) return;
    _lastFetchTime = now;

    const attempt = async () => {
      const [engineTracks, sessionInfo] = await Promise.all([
        ipc.getTracks(),
        ipc.getSessionInfo(),
      ]);
      const existingTracks = get().tracks;
      const existingMap = new Map(existingTracks.map(t => [t.id, t]));
      set({
        tracks: engineTracks.map((et, i) => engineTrackToTrack(et, i, existingMap.get(et.id))),
        sessionName: sessionInfo.name || 'Untitled',
        sampleRate: sessionInfo.sample_rate || 48000,
        loading: false,
      });

      // Fetch route groups (used for folder hierarchy)
      ipc.getRouteGroups().then((data: { groups: Array<Record<string, unknown>> }) => {
        const groups = data.groups || [];
        set({ routeGroups: groups.map((g: Record<string, unknown>) => ({
          id: g.id as string,
          name: g.name as string,
          memberIds: ((g.members as Array<Record<string, unknown>>) || []).map((m) => m.id as string),
        }))});
      }).catch(() => {});

      // Fetch pan positions for all tracks in one batch, then update once
      Promise.all(
        engineTracks.map(et =>
          ipc.call('daw.get_track_pan', { track_id: et.id })
            .then((raw: unknown) => {
              const data = raw as Record<string, unknown>;
              const azimuth = Number(data.pan ?? data.azimuth ?? 0.5);
              return { id: et.id, pan: (azimuth * 2) - 1 };
            })
            .catch(() => null)
        )
      ).then(results => {
        const panMap = new Map(results.filter(Boolean).map(r => [r!.id, r!.pan]));
        if (panMap.size > 0) {
          set((s) => ({
            tracks: s.tracks.map(t => panMap.has(t.id) ? { ...t, pan: panMap.get(t.id)! } : t)
          }));
        }
      });

      // Fetch regions for audio/midi tracks only (buses don't have playlists)
      for (const et of engineTracks) {
        if (et.type === 'bus' || et.type === 'vca') continue;
        ipc.getRegions(et.id).then((regions) => {
          console.log(`[DAWFLOW] Regions for ${et.name} (${et.id}):`, regions.length, 'regions');
          useRegionStore.getState().setRegions(et.id, regions.map((r) => ({
            ...r,
            trackId: et.id,
            type: et.type || 'audio',
          })));
        }).catch((err) => {
          console.warn(`[DAWFLOW] Failed to fetch regions for ${et.name}:`, err);
        });
      }
    };

    try {
      await attempt();
    } catch (e) {
      // Retry once after 1 second
      await new Promise(r => setTimeout(r, 1000));
      try {
        await attempt();
      } catch (e2) {
        console.error('[DAWFLOW] Failed to fetch session data:', e2);
      }
    }
    set({ loading: false });
  },

  setSessionName: (name) => set({ sessionName: name }),
  setTrackMute: (id, muted) => {
    ipc.setTrackMute(id, muted).catch((e) => console.warn('[IPC] setTrackMute:', e));
    set((s) => ({ tracks: s.tracks.map((t) => t.id === id ? { ...t, muted, mutedBySelf: muted } : t) }));
  },
  setTrackSolo: (id, solo) => {
    ipc.setTrackSolo(id, solo).catch((e) => console.warn('[IPC]', e));
    set((s) => ({ tracks: s.tracks.map((t) => t.id === id ? { ...t, solo } : t) }));
    // Re-fetch after Ardour processes the solo — it mutes non-soloed tracks internally
    setTimeout(() => get().fetchFromEngine(), 100);
  },
  setTrackRecord: (id, enabled) => {
    ipc.setTrackRecord(id, enabled).catch((e) => console.warn('[IPC]', e));
    set((s) => ({
      tracks: s.tracks.map((t) => t.id === id ? { ...t, recordEnabled: enabled } : t),
    }));
  },
  setTrackMonitor: (id, enabled) => {
    ipc.setTrackMonitor(id, enabled).catch((e) => console.warn('[IPC]', e));
    set((s) => ({
      tracks: s.tracks.map((t) => t.id === id ? { ...t, monitorEnabled: enabled } : t),
    }));
  },
  setTrackVolume: (id, volume) => {
    // Convert linear 0-1 to dB for the IPC call (throttled to avoid flooding)
    const gainDb = volume <= 0 ? -100 : 20 * Math.log10(volume / 0.75);
    throttledIpc(() => ipc.setTrackGain(id, gainDb));
    set((s) => ({ tracks: s.tracks.map((t) => t.id === id ? { ...t, volume } : t) }));
  },
  setTrackPan: (id, pan) => {
    // Convert -1..+1 to 0..1 for engine (0=L, 0.5=C, 1=R)
    const panValue = (pan + 1) / 2;
    throttledIpc(() => ipc.call('daw.set_track_pan', { track_id: id, pan: panValue }));
    set((s) => ({ tracks: s.tracks.map((t) => t.id === id ? { ...t, pan } : t) }));
  },
  setTrackName: (id, name) => {
    ipc.renameTrack(id, name).catch((e) => console.warn('[IPC]', e));
    set((s) => ({
      tracks: s.tracks.map((t) => t.id === id ? { ...t, name } : t)
    }));
  },
  setTrackHeight: (id, height) => set((s) => ({
    tracks: s.tracks.map((t) => t.id === id ? { ...t, height } : t)
  })),
  setTrackColor: (id, color) => {
    ipc.setTrackColor(id, color.replace('#', '') + 'ff').catch((e) => console.warn('[IPC]', e));
    set((s) => ({
      tracks: s.tracks.map((t) => t.id === id ? { ...t, color } : t),
    }));
  },
  setTrackMeterLevel: (_id, _level) => {
    // NO-OP: Meter levels are now in useMeterStore for performance.
    // This method is kept for backward compatibility but does nothing.
  },
  updateTracks: (tracks) => set({ tracks }),
  getTrackById: (id) => get().tracks.find((t) => t.id === id),
  toggleFolderCollapsed: (trackId) => set((s) => ({
    collapsedFolders: s.collapsedFolders.includes(trackId)
      ? s.collapsedFolders.filter(id => id !== trackId)
      : [...s.collapsedFolders, trackId],
  })),
}));

// ---------------------------------------------------------------------------
// Derived: build a tree of tracks using route groups as folder membership
// ---------------------------------------------------------------------------

export function buildTrackTree(tracks: Track[], routeGroups: RouteGroup[]): Track[] {
  const groupsByName = new Map<string, RouteGroup>();
  routeGroups.forEach(g => groupsByName.set(g.name, g));

  const nestedTrackIds = new Set<string>();
  const result: Track[] = [];

  // First pass: identify folder tracks that have a matching route group
  for (const track of tracks) {
    if (
      (track.type === 'group' || track.type === 'folder' || track.type === 'bus') &&
      groupsByName.has(track.name)
    ) {
      const group = groupsByName.get(track.name)!;
      const children = tracks.filter(t => group.memberIds?.includes(t.id));
      children.forEach(c => nestedTrackIds.add(c.id));
      result.push({ ...track, children });
    }
  }

  // Second pass: add non-nested tracks that aren't already in result
  for (const track of tracks) {
    if (!nestedTrackIds.has(track.id) && !result.find(r => r.id === track.id)) {
      result.push(track);
    }
  }

  return result;
}
