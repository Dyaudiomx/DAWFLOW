import { create } from 'zustand';

export type LowerZoneTab = 'mixconsole' | 'editor' | 'sampler' | 'chordpads' | 'midiremote';
export type RightZoneTab = 'vsti' | 'media' | 'cr' | 'meter' | 'ai';
export type InspectorTab = 'track' | 'editor' | 'visibility';
export type ToolType = 'select' | 'range' | 'split' | 'glue' | 'erase' | 'zoom' | 'mute' | 'draw' | 'line' | 'play' | 'color' | 'comp' | 'timewarp';

interface UIState {
  // Zone visibility
  leftZoneVisible: boolean;
  rightZoneVisible: boolean;
  lowerZoneVisible: boolean;
  transportBarVisible: boolean;
  statusLineVisible: boolean;
  infoLineVisible: boolean;
  overviewLineVisible: boolean;

  // Zone sizes (for resize)
  leftZoneWidth: number;
  rightZoneWidth: number;
  lowerZoneHeight: number;

  // Active tabs
  lowerZoneTab: LowerZoneTab;
  rightZoneTab: RightZoneTab;
  inspectorTab: InspectorTab;

  // Tools
  activeTool: ToolType;

  // Snap
  snapEnabled: boolean;
  snapType: 'grid' | 'gridRelative' | 'events' | 'shuffle' | 'magneticCursor';
  gridType: 'bar' | 'beat' | 'useQuantize';
  quantizeValue: string;

  // Auto scroll
  autoScrollEnabled: boolean;
  autoScrollMode: 'pageScroll' | 'stationaryCursor';

  // Selected track
  selectedTrackId: string | null;

  // Dialogs
  addTrackDialogOpen: boolean;

  // Actions
  toggleLeftZone: () => void;
  toggleRightZone: () => void;
  toggleLowerZone: () => void;
  toggleTransportBar: () => void;
  toggleStatusLine: () => void;
  toggleInfoLine: () => void;
  setLeftZoneWidth: (w: number) => void;
  setRightZoneWidth: (w: number) => void;
  setLowerZoneHeight: (h: number) => void;
  setLowerZoneTab: (tab: LowerZoneTab) => void;
  setRightZoneTab: (tab: RightZoneTab) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setActiveTool: (tool: ToolType) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapType: (type: UIState['snapType']) => void;
  setGridType: (type: UIState['gridType']) => void;
  setQuantizeValue: (value: string) => void;
  setSelectedTrackId: (id: string | null) => void;
  openAddTrackDialog: () => void;
  closeAddTrackDialog: () => void;
}

export type { UIState };

export const useUIStore = create<UIState>((set) => ({
  leftZoneVisible: true,
  rightZoneVisible: false,
  lowerZoneVisible: true,
  transportBarVisible: true,
  statusLineVisible: false,
  infoLineVisible: false,
  overviewLineVisible: false,

  leftZoneWidth: 220,
  rightZoneWidth: 300,
  lowerZoneHeight: 380,

  lowerZoneTab: 'mixconsole',
  rightZoneTab: 'vsti',
  inspectorTab: 'track',

  activeTool: 'select',

  snapEnabled: true,
  snapType: 'grid',
  gridType: 'bar',
  quantizeValue: '1/16',

  autoScrollEnabled: true,
  autoScrollMode: 'pageScroll',

  selectedTrackId: null,

  addTrackDialogOpen: false,

  toggleLeftZone: () => set((s) => ({ leftZoneVisible: !s.leftZoneVisible })),
  toggleRightZone: () => set((s) => ({ rightZoneVisible: !s.rightZoneVisible })),
  toggleLowerZone: () => set((s) => ({ lowerZoneVisible: !s.lowerZoneVisible })),
  toggleTransportBar: () => set((s) => ({ transportBarVisible: !s.transportBarVisible })),
  toggleStatusLine: () => set((s) => ({ statusLineVisible: !s.statusLineVisible })),
  toggleInfoLine: () => set((s) => ({ infoLineVisible: !s.infoLineVisible })),
  setLeftZoneWidth: (w) => set({ leftZoneWidth: Math.max(200, Math.min(500, w)) }),
  setRightZoneWidth: (w) => set({ rightZoneWidth: Math.max(200, Math.min(500, w)) }),
  setLowerZoneHeight: (h) => set({ lowerZoneHeight: Math.max(300, Math.min(700, h)) }),
  setLowerZoneTab: (tab) => set({ lowerZoneTab: tab }),
  setRightZoneTab: (tab) => set({ rightZoneTab: tab }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setSnapType: (type) => set({ snapType: type }),
  setGridType: (type) => set({ gridType: type }),
  setQuantizeValue: (value) => set({ quantizeValue: value }),
  setSelectedTrackId: (id) => set({ selectedTrackId: id }),
  openAddTrackDialog: () => set({ addTrackDialogOpen: true }),
  closeAddTrackDialog: () => set({ addTrackDialogOpen: false }),
}));
