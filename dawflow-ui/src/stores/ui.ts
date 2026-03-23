import { create } from 'zustand';

export type LowerZoneTab = 'mixconsole' | 'editor' | 'sampler' | 'chordpads' | 'midiremote';
export type RightZoneTab = 'vsti' | 'media' | 'cr' | 'meter' | 'ai';
export type InspectorTab = 'track' | 'editor' | 'visibility';
export type ToolType = 'select' | 'range' | 'split' | 'glue' | 'erase' | 'zoom' | 'mute' | 'draw' | 'line' | 'play' | 'color' | 'comp' | 'timewarp';

const STORAGE_KEY = 'dawflow-ui-layout';

interface PersistedLayout {
  leftZoneVisible?: boolean;
  rightZoneVisible?: boolean;
  lowerZoneVisible?: boolean;
  leftZoneWidth?: number;
  rightZoneWidth?: number;
  lowerZoneHeight?: number;
  lowerZoneTab?: LowerZoneTab;
  rightZoneTab?: RightZoneTab;
  inspectorTab?: InspectorTab;
  snapEnabled?: boolean;
  gridType?: 'bar' | 'beat' | 'useQuantize';
  quantizeValue?: string;
}

function getInitialLayout(): PersistedLayout {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as PersistedLayout;
  } catch { /* ignore parse errors */ }
  return {};
}

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

  // Ripple edit mode
  rippleMode: 'off' | 'one' | 'all';
  setRippleMode: (mode: 'off' | 'one' | 'all') => void;

  // Auto scroll
  autoScrollEnabled: boolean;
  autoScrollMode: 'pageScroll' | 'stationaryCursor';

  // Selected track(s) / region
  selectedTrackId: string | null;       // first selected (backward compat)
  selectedTrackIds: string[];           // multi-selection
  selectedRegionId: string | null;

  // Range selection (range tool)
  rangeSelection: { startSample: number; endSample: number; trackIds?: string[] } | null;
  setRangeSelection: (range: { startSample: number; endSample: number; trackIds?: string[] } | null) => void;

  // Dialogs
  addTrackDialogOpen: boolean;
  addTrackDialogType: string | null;
  exportDialogOpen: boolean;
  projectSettingsDialogOpen: boolean;
  videoImportDialogOpen: boolean;

  // Global automation indicator (R/W/A toolbar buttons)
  globalAutomationState: 'off' | 'read' | 'write' | 'touch';
  setGlobalAutomationState: (state: UIState['globalAutomationState']) => void;

  // Channel settings dialog
  channelSettingsTrackId: string | null;
  setChannelSettingsTrackId: (trackId: string | null) => void;

  // Undo history panel
  undoHistoryVisible: boolean;
  toggleUndoHistory: () => void;

  // Group manager panel
  groupManagerVisible: boolean;
  toggleGroupManager: () => void;

  // Render in Place dialog
  renderInPlace: { open: boolean; trackIds: string[]; regionIds: string[]; trackNames: string[] } | null;
  setRenderInPlace: (data: { open: boolean; trackIds: string[]; regionIds: string[]; trackNames: string[] } | null) => void;

  // Plugin editor
  pluginEditor: { open: boolean; trackId: string; pluginId: string; pluginName: string } | null;
  setPluginEditor: (editor: { open: boolean; trackId: string; pluginId: string; pluginName: string } | null) => void;

  // Floating windows (separate from lower zone)
  floatingWindows: {
    mixer: boolean;
    midiEditor: boolean;
    audioEditor: boolean;
    drumEditor: boolean;
  };
  toggleFloatingWindow: (window: keyof UIState['floatingWindows']) => void;

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
  /** Add/remove/range-select tracks. mode: 'replace' (click), 'toggle' (cmd+click), 'range' (shift+click) */
  selectTrack: (id: string, mode: 'replace' | 'toggle' | 'range', allTrackIds?: string[]) => void;
  setSelectedRegionId: (id: string | null) => void;
  setAutoScrollEnabled: (enabled: boolean) => void;
  openAddTrackDialog: (type?: string) => void;
  closeAddTrackDialog: () => void;
  setExportDialogOpen: (open: boolean) => void;
  setProjectSettingsDialogOpen: (open: boolean) => void;
  setVideoImportDialogOpen: (open: boolean) => void;
}

export type { UIState };

const initial = getInitialLayout();

export const useUIStore = create<UIState>((set) => ({
  leftZoneVisible: initial.leftZoneVisible ?? true,
  rightZoneVisible: initial.rightZoneVisible ?? false,
  lowerZoneVisible: initial.lowerZoneVisible ?? true,
  transportBarVisible: true,
  statusLineVisible: false,
  infoLineVisible: false,
  overviewLineVisible: false,

  leftZoneWidth: initial.leftZoneWidth ?? 220,
  rightZoneWidth: initial.rightZoneWidth ?? 300,
  lowerZoneHeight: initial.lowerZoneHeight ?? 380,

  lowerZoneTab: initial.lowerZoneTab ?? 'mixconsole',
  rightZoneTab: initial.rightZoneTab ?? 'vsti',
  inspectorTab: initial.inspectorTab ?? 'track',

  activeTool: 'select',

  snapEnabled: initial.snapEnabled ?? true,
  snapType: 'grid',
  gridType: initial.gridType ?? 'bar',
  quantizeValue: initial.quantizeValue ?? '1/16',

  rippleMode: 'off',
  setRippleMode: (mode) => set({ rippleMode: mode }),

  autoScrollEnabled: true,
  autoScrollMode: 'pageScroll',

  selectedTrackId: null,
  selectedTrackIds: [],
  selectedRegionId: null,

  rangeSelection: null,
  setRangeSelection: (range) => set({ rangeSelection: range }),

  addTrackDialogOpen: false,
  addTrackDialogType: null,
  exportDialogOpen: false,
  projectSettingsDialogOpen: false,
  videoImportDialogOpen: false,

  globalAutomationState: 'off',
  setGlobalAutomationState: (state) => set({ globalAutomationState: state }),

  channelSettingsTrackId: null,
  setChannelSettingsTrackId: (trackId) => set({ channelSettingsTrackId: trackId }),

  undoHistoryVisible: false,
  toggleUndoHistory: () => set((s) => ({ undoHistoryVisible: !s.undoHistoryVisible })),

  groupManagerVisible: false,
  toggleGroupManager: () => set((s) => ({ groupManagerVisible: !s.groupManagerVisible })),

  renderInPlace: null,
  setRenderInPlace: (data) => set({ renderInPlace: data }),

  pluginEditor: null,
  setPluginEditor: (editor) => set({ pluginEditor: editor }),

  floatingWindows: { mixer: false, midiEditor: false, audioEditor: false, drumEditor: false },
  toggleFloatingWindow: (w) => set((s) => ({
    floatingWindows: { ...s.floatingWindows, [w]: !s.floatingWindows[w] },
  })),

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
  setSelectedTrackId: (id) => set({ selectedTrackId: id, selectedTrackIds: id ? [id] : [] }),
  selectTrack: (id, mode, allTrackIds) => set((s) => {
    if (mode === 'replace') {
      return { selectedTrackId: id, selectedTrackIds: [id] };
    }
    if (mode === 'toggle') {
      const has = s.selectedTrackIds.includes(id);
      const next = has ? s.selectedTrackIds.filter(x => x !== id) : [...s.selectedTrackIds, id];
      return { selectedTrackId: next[next.length - 1] ?? null, selectedTrackIds: next };
    }
    if (mode === 'range' && allTrackIds) {
      const anchor = s.selectedTrackId;
      if (!anchor) return { selectedTrackId: id, selectedTrackIds: [id] };
      const anchorIdx = allTrackIds.indexOf(anchor);
      const targetIdx = allTrackIds.indexOf(id);
      if (anchorIdx === -1 || targetIdx === -1) return { selectedTrackId: id, selectedTrackIds: [id] };
      const lo = Math.min(anchorIdx, targetIdx);
      const hi = Math.max(anchorIdx, targetIdx);
      const range = allTrackIds.slice(lo, hi + 1);
      return { selectedTrackId: id, selectedTrackIds: range };
    }
    return {};
  }),
  setSelectedRegionId: (id) => set({ selectedRegionId: id }),
  setAutoScrollEnabled: (enabled) => set({ autoScrollEnabled: enabled }),
  openAddTrackDialog: (type?: string) => set({ addTrackDialogOpen: true, addTrackDialogType: type ?? null }),
  closeAddTrackDialog: () => set({ addTrackDialogOpen: false, addTrackDialogType: null }),
  setExportDialogOpen: (open) => set({ exportDialogOpen: open }),
  setProjectSettingsDialogOpen: (open) => set({ projectSettingsDialogOpen: open }),
  setVideoImportDialogOpen: (open) => set({ videoImportDialogOpen: open }),
}));

// Persist layout-related fields to localStorage on every state change
useUIStore.subscribe((state) => {
  const layoutFields: PersistedLayout = {
    leftZoneVisible: state.leftZoneVisible,
    rightZoneVisible: state.rightZoneVisible,
    lowerZoneVisible: state.lowerZoneVisible,
    leftZoneWidth: state.leftZoneWidth,
    rightZoneWidth: state.rightZoneWidth,
    lowerZoneHeight: state.lowerZoneHeight,
    lowerZoneTab: state.lowerZoneTab,
    rightZoneTab: state.rightZoneTab,
    inspectorTab: state.inspectorTab,
    snapEnabled: state.snapEnabled,
    gridType: state.gridType,
    quantizeValue: state.quantizeValue,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutFields));
  } catch { /* quota exceeded or unavailable — ignore */ }
});
