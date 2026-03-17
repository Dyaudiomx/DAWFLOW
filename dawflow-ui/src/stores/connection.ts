import { create } from 'zustand';

interface ConnectionStore {
  wsConnected: boolean;
  ipcConnected: boolean;
  wsUrl: string;

  setWsConnected: (connected: boolean) => void;
  setIpcConnected: (connected: boolean) => void;
  setWsUrl: (url: string) => void;
}

export type { ConnectionStore };

export const useConnectionStore = create<ConnectionStore>((set) => ({
  wsConnected: false,
  ipcConnected: false,
  wsUrl: 'ws://localhost:3818',

  setWsConnected: (connected) => set({ wsConnected: connected }),
  setIpcConnected: (connected) => set({ ipcConnected: connected }),
  setWsUrl: (url) => set({ wsUrl: url }),
}));
