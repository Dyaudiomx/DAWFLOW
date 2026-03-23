import React from 'react';
import { useSessionStore, resetFetchDebounce } from '../stores/session';
import { useUIStore } from '../stores/ui';
import { useTransportStore } from '../stores/transport';
import { useRegionStore } from '../stores/regions';
import { ipc } from '../services/ipc';
import { ContextMenu } from '../shared/ContextMenu';
import type { ContextMenuItem } from '../shared/ContextMenu';
import { DawContextMenu } from '../shared/DawContextMenu';
import type { MenuItem } from '../shared/DawContextMenu';
import { WaveformDisplay } from '../shared/WaveformDisplay';
import { MidiNoteDisplay } from '../shared/MidiNoteDisplay';
import { TrackHeader } from '../components/TrackHeader';
import { AutomationLaneHeader } from '../components/AutomationLaneHeader';
import type { AutomationParam } from '../components/AutomationLaneHeader';
import { TrackColorPicker } from '../components/TrackColorPicker';
import { engine } from '../engine/registry';
import { AutomationLane } from './AutomationLane';
import { MarkerTrack } from './MarkerTrack';
import { VideoTrack } from './VideoTrack';
import { useVideoStore } from '../stores/video';
import { FadeEditorDialog } from '../dialogs/FadeEditorDialog';
import styles from './CenterZone.module.css';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.wmv', '.flv'];

/** Width of the track header panel in pixels. Keep in sync with CenterZone.module.css. */
const TRACK_HEADER_WIDTH = 300;

export const CenterZone: React.FC = () => {
  const tracks = useSessionStore((s) => s.tracks);
  const sampleRate = useSessionStore((s) => s.sampleRate);
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const selectedTrackIds = useUIStore((s) => s.selectedTrackIds);
  const setSelectedTrackId = useUIStore((s) => s.setSelectedTrackId);
  const selectTrack = useUIStore((s) => s.selectTrack);
  const selectedRegionId = useUIStore((s) => s.selectedRegionId);
  const setSelectedRegionId = useUIStore((s) => s.setSelectedRegionId);
  const setTrackMute = useSessionStore((s) => s.setTrackMute);
  const setTrackSolo = useSessionStore((s) => s.setTrackSolo);
  const setTrackRecord = useSessionStore((s) => s.setTrackRecord);
  const setTrackHeight = useSessionStore((s) => s.setTrackHeight);
  const setTrackMonitor = useSessionStore((s) => s.setTrackMonitor);
  const setTrackColor = useSessionStore((s) => s.setTrackColor);
  const setTrackName = useSessionStore((s) => s.setTrackName);
  const regionsByTrack = useRegionStore((s) => s.regionsByTrack);
  const removeRegion = useRegionStore((s) => s.removeRegion);
  const activeTool = useUIStore((s) => s.activeTool);
  const rangeSelection = useUIStore((s) => s.rangeSelection);
  const setRangeSelection = useUIStore((s) => s.setRangeSelection);
  const position = useTransportStore((s) => s.position);
  const recording = useTransportStore((s) => s.recording);
  const leftLocator = useTransportStore((s) => s.leftLocator);
  const rightLocator = useTransportStore((s) => s.rightLocator);

  // Automation lanes state: trackId -> array of paramTypes currently shown
  const [automationLanes, setAutomationLanes] = React.useState<Record<string, string[]>>({});
  // Context menu for automation param picker (right-click on A button)
  const [_autoParamMenu, setAutoParamMenu] = React.useState<{ trackId: string; x: number; y: number } | null>(null);

  // Color picker popup state
  const [colorPicker, setColorPicker] = React.useState<{ trackId: string; x: number; y: number } | null>(null);

  // Take lanes visibility per track
  const [takeLanes, setTakeLanes] = React.useState<Record<string, boolean>>({});

  // Ghost region preview for draw tool drag
  const [drawingGhost, setDrawingGhost] = React.useState<{ trackId: string; startSec: number; endSec: number } | null>(null);

  // Range tool drag state (local during drag, committed to zustand store on mouseUp)
  const [rangeDrag, setRangeDrag] = React.useState<{
    startSample: number; endSample: number;
  } | null>(null);

  // Time warp drag state
  const [timeWarpDrag, setTimeWarpDrag] = React.useState<{
    regionId: string; trackId: string; side: 'start' | 'end';
    origLengthSec: number; origWidthPx: number; startX: number;
    currentWidthPx: number; leftPx: number;
  } | null>(null);

  // Previously selected track ID (for auto-arm toggling)
  const prevSelectedTrackRef = React.useRef<string | null>(null);
  // Clipboard for Cmd+C/X/V region operations
  const clipboardRef = React.useRef<{ regionId: string; trackId: string; cut: boolean } | null>(null);

  const AUTOMATION_PARAMS: AutomationParam[] = [
    { type: 'gain', label: 'Volume' },
    { type: 'mute', label: 'Mute' },
    { type: 'pan', label: 'Linked Panner' },
    { type: 'output_enable', label: 'Enable Output 1' },
  ];

  const toggleAutomationLane = React.useCallback((trackId: string, paramType: string) => {
    setAutomationLanes((prev) => {
      const current = prev[trackId] || [];
      if (current.includes(paramType)) {
        const next = current.filter((p) => p !== paramType);
        if (next.length === 0) {
          const { [trackId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [trackId]: next };
      }
      return { ...prev, [trackId]: [...current, paramType] };
    });
  }, []);

  const removeAutomationLane = React.useCallback((trackId: string, paramType: string) => {
    setAutomationLanes((prev) => {
      const current = prev[trackId] || [];
      const next = current.filter((p) => p !== paramType);
      if (next.length === 0) {
        const { [trackId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [trackId]: next };
    });
  }, []);

  // Track where recording started (for the growing region visual)
  const [recordStartPos, setRecordStartPos] = React.useState<number>(0);
  React.useEffect(() => {
    if (recording) setRecordStartPos(position);
  }, [recording]);

  // Context menu state (existing Cubase-style menu for track area background)
  const [contextMenu, setContextMenu] = React.useState<{x: number; y: number; trackId?: string} | null>(null);

  // DAW context menu state (track header, region, empty timeline)
  const [dawContextMenu, setDawContextMenu] = React.useState<{x: number; y: number; items: MenuItem[]} | null>(null);

  // Tool cursor — use data attribute (CSS module class names are hashed)

  // Track rename state (context menu uses this; TrackHeader handles its own inline editing)
  const [editingTrackId, setEditingTrackId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const openAddTrack = useUIStore((s) => s.openAddTrackDialog);

  // Fade editor dialog state (Shift+X)
  const [fadeEditor, setFadeEditor] = React.useState<{
    trackId: string; regionId: string; regionName: string;
    side: 'in' | 'out'; lengthSamples: number; shape: string;
  } | null>(null);

  // File drag-over state (for visual feedback when dragging audio files)
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [dropIndicatorX, setDropIndicatorX] = React.useState<number | null>(null);
  const dragCounterRef = React.useRef(0);

  // Drag state for region move (select tool)
  const [draggingRegion, setDraggingRegion] = React.useState<{
    trackId: string; regionId: string; startX: number; origPosition: number;
  } | null>(null);

  // === B. Zoom state ===
  const [pixelsPerSecond, setPixelsPerSecond] = React.useState(20);
  const ZOOM_MIN = 5;
  const ZOOM_MAX = 200;

  // Vertical zoom (track height scale): 0.5x to 3x
  const [trackHeightScale, setTrackHeightScale] = React.useState(1);
  const VSCALE_MIN = 0.5;
  const VSCALE_MAX = 6;

  // Scroll positions for custom scrollbars
  const trackAreaRef = React.useRef<HTMLDivElement>(null);
  const vScrollTrackRef = React.useRef<HTMLDivElement>(null);
  const [hScrollFraction, setHScrollFraction] = React.useState(0);
  const [vScrollFraction, setVScrollFraction] = React.useState(0);

  // === TRACK VIRTUALIZATION ===
  // Only render tracks visible in the viewport + a small buffer above/below.
  const [trackScrollTop, setTrackScrollTop] = React.useState(0);
  const [trackViewportHeight, setTrackViewportHeight] = React.useState(800);

  // Pre-compute cumulative Y positions and heights for each track (including automation lanes)
  const trackPositions = React.useMemo(() => {
    let y = 0;
    return tracks.map((t) => {
      const trackH = Math.round((t.height || 80) * trackHeightScale);
      const resizeHandleH = 6; // approximate height of the resize handle between tracks
      const autoLaneCount = (automationLanes[t.id] || []).length;
      const autoLaneH = autoLaneCount * (28 + 60); // header (28px) + lane (60px) per automation lane
      const totalH = trackH + resizeHandleH + autoLaneH;
      const pos = { top: y, height: totalH };
      y += totalH;
      return pos;
    });
  }, [tracks, trackHeightScale, automationLanes]);

  const totalTrackListHeight = trackPositions.length > 0
    ? trackPositions[trackPositions.length - 1].top + trackPositions[trackPositions.length - 1].height
    : 0;

  // Determine which tracks are visible in the viewport
  const visibleTrackRange = React.useMemo(() => {
    const BUFFER = 3; // render 3 extra tracks above and below for smooth scrolling
    let startIdx = trackPositions.findIndex((p) => p.top + p.height > trackScrollTop);
    let endIdx = trackPositions.findIndex((p) => p.top > trackScrollTop + trackViewportHeight);
    if (startIdx < 0) startIdx = 0;
    if (endIdx < 0) endIdx = tracks.length;
    return {
      start: Math.max(0, startIdx - BUFFER),
      end: Math.min(tracks.length, endIdx + BUFFER),
    };
  }, [trackPositions, trackScrollTop, trackViewportHeight, tracks.length]);

  // Track the scroll position of the track area for virtualization
  React.useEffect(() => {
    const el = trackAreaRef.current;
    if (!el) return;
    const onVirtScroll = () => {
      setTrackScrollTop(el.scrollTop);
    };
    el.addEventListener('scroll', onVirtScroll, { passive: true });
    return () => el.removeEventListener('scroll', onVirtScroll);
  }, []);

  // Track the viewport height via ResizeObserver for virtualization
  React.useEffect(() => {
    const el = trackAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTrackViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Horizontal scroll: total timeline width adapts to content
  // Find the furthest region end across all tracks (in seconds)
  const contentEndSec = React.useMemo(() => {
    let maxEnd = 0;
    for (const trackId of Object.keys(regionsByTrack)) {
      for (const r of regionsByTrack[trackId] || []) {
        const endSec = (r.position + r.length) / (sampleRate || 48000);
        if (endSec > maxEnd) maxEnd = endSec;
      }
    }
    return maxEnd;
  }, [regionsByTrack, sampleRate]);

  // Empty session: 3 minutes of scrollable timeline.
  // With content: extend to 1.5x past the furthest region (minimum 3 min).
  const viewportWidthForCalc = typeof window !== 'undefined' ? window.innerWidth - TRACK_HEADER_WIDTH - 22 : 800;
  const MIN_DURATION_SEC = 180;
  const TIMELINE_DURATION_SEC = contentEndSec > 0
    ? Math.max(contentEndSec * 1.5, MIN_DURATION_SEC)
    : MIN_DURATION_SEC;
  const totalTimelineWidthPx = TIMELINE_DURATION_SEC * pixelsPerSecond;

  // Horizontal scroll offset in pixels (from hScrollFraction)
  const maxScrollLeftPx = Math.max(0, totalTimelineWidthPx - viewportWidthForCalc);
  const scrollLeftPx = hScrollFraction * maxScrollLeftPx;

  const handleZoomIn = React.useCallback(() => {
    setPixelsPerSecond((prev) => Math.min(ZOOM_MAX, prev * 1.25));
  }, []);

  const handleZoomOut = React.useCallback(() => {
    setPixelsPerSecond((prev) => Math.max(ZOOM_MIN, prev / 1.25));
  }, []);

  // Listen for G/H zoom events from global shortcuts
  React.useEffect(() => {
    const onZoomIn = () => handleZoomIn();
    const onZoomOut = () => handleZoomOut();
    window.addEventListener('dawflow:zoom-in', onZoomIn);
    window.addEventListener('dawflow:zoom-out', onZoomOut);
    return () => {
      window.removeEventListener('dawflow:zoom-in', onZoomIn);
      window.removeEventListener('dawflow:zoom-out', onZoomOut);
    };
  }, [handleZoomIn, handleZoomOut]);

  // === B2. Default locators at bar 1 (L) and bar 5 (R) ===
  React.useEffect(() => {
    // Only set defaults if both locators are at 0 (initial state)
    const state = useTransportStore.getState();
    if (state.leftLocator === 0 && state.rightLocator === 0) {
      const t = state.tempo || 120;
      const barDuration = (60 / t) * 4; // 4 beats per bar
      state.setLeftLocator(0); // bar 1 = position 0
      state.setRightLocator(barDuration * 4); // bar 5 = 4 bars from start
    }
  }, []);

  // === B3. Sync custom scrollbar with trackArea native scroll ===
  React.useEffect(() => {
    const el = trackAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const maxScrollTop = el.scrollHeight - el.clientHeight;
      if (maxScrollTop > 0) {
        setVScrollFraction(el.scrollTop / maxScrollTop);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [tracks.length, trackHeightScale]);

  // Scrollbar drag helpers
  const handleHScrollThumbDrag = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const track = (e.currentTarget.parentElement as HTMLElement);
    const trackRect = track.getBoundingClientRect();
    const thumbWidth = Math.max(24, trackRect.width * (trackRect.width / totalTimelineWidthPx));
    const maxOffset = trackRect.width - thumbWidth;

    const startX = e.clientX;
    const startFrac = hScrollFraction;

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const newFrac = Math.max(0, Math.min(1, startFrac + dx / maxOffset));
      setHScrollFraction(newFrac);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [hScrollFraction, totalTimelineWidthPx]);

  const handleVScrollThumbDrag = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const trackEl = (e.currentTarget.parentElement as HTMLElement);
    const trackRect = trackEl.getBoundingClientRect();
    const areaEl = trackAreaRef.current;
    if (!areaEl) return;
    const totalH = areaEl.scrollHeight;
    const visH = areaEl.clientHeight;
    const thumbH = Math.max(16, trackRect.height * (visH / totalH));
    const maxOffset = trackRect.height - thumbH;

    const startY = e.clientY;
    const startFrac = vScrollFraction;

    const onMove = (me: MouseEvent) => {
      const dy = me.clientY - startY;
      const newFrac = Math.max(0, Math.min(1, startFrac + dy / maxOffset));
      setVScrollFraction(newFrac);
      if (areaEl) {
        const maxScroll = areaEl.scrollHeight - areaEl.clientHeight;
        areaEl.scrollTop = newFrac * maxScroll;
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [vScrollFraction]);

  // Middle-mouse-button drag for panning (scroll both axes)
  const handleMiddleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (e.button !== 1) return; // only middle button
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startHFrac = hScrollFraction;
    const startScrollTop = trackAreaRef.current?.scrollTop ?? 0;

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      // Horizontal pan
      if (maxScrollLeftPx > 0) {
        setHScrollFraction(Math.max(0, Math.min(1, startHFrac - dx / maxScrollLeftPx)));
      }
      // Vertical pan
      const el = trackAreaRef.current;
      if (el) {
        el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, startScrollTop - dy));
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [hScrollFraction, maxScrollLeftPx]);

  // === C. Fade handle state ===
  const [hoveredRegionId, setHoveredRegionId] = React.useState<string | null>(null);
  const [fadeDrag, setFadeDrag] = React.useState<{
    trackId: string; regionId: string; side: 'in' | 'out'; startX: number; startLength: number;
  } | null>(null);
  const [fadeInLengths, setFadeInLengths] = React.useState<Record<string, number>>({});
  const [fadeOutLengths, setFadeOutLengths] = React.useState<Record<string, number>>({});
  // Store applied fade shapes so handle drags preserve them
  const fadeShapesRef = React.useRef<Record<string, { in: string; out: string }>>({});
  // Guard: prevent region-move drag when edge drag is active
  const edgeDragActiveRef = React.useRef(false);

  // === C2. Trim handle state ===
  const [trimDrag, setTrimDrag] = React.useState<{
    trackId: string; regionId: string; side: 'start' | 'end';
    startX: number; origPosition: number; origLength: number;
    maxLength: number; // source audio's full length (can't extend beyond this)
  } | null>(null);

  // === D. Keyboard shortcuts ===
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts while typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const currentSelectedRegionId = useUIStore.getState().selectedRegionId;
      const currentSelectedTrackId = useUIStore.getState().selectedTrackId;

      // Escape: clear range selection
      if (e.key === 'Escape') {
        const rs = useUIStore.getState().rangeSelection;
        if (rs) {
          e.preventDefault();
          useUIStore.getState().setRangeSelection(null);
          return;
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedRegionId) {
        e.preventDefault();
        // Find which track contains this region
        const allRegions = useRegionStore.getState().regionsByTrack;
        for (const [trackId, regions] of Object.entries(allRegions)) {
          if (regions.some((r) => r.id === currentSelectedRegionId)) {
            ipc.call('daw.delete_region', { track_id: trackId, region_id: currentSelectedRegionId })
              .then(() => {
                removeRegion(trackId, currentSelectedRegionId);
                setSelectedRegionId(null);
                resetFetchDebounce();
                useSessionStore.getState().fetchFromEngine();
              })
              .catch((err: unknown) => console.warn('[DAWFLOW] Delete region failed:', err));
            break;
          }
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !currentSelectedRegionId) {
        // Delete selected tracks (batch)
        const selIds = useUIStore.getState().selectedTrackIds;
        if (selIds.length > 0) {
          e.preventDefault();
          (async () => {
            for (const id of selIds) {
              await ipc.removeTrack(id).catch(() => {});
            }
            useUIStore.getState().setSelectedTrackId(null);
            resetFetchDebounce();
            useSessionStore.getState().fetchFromEngine();
          })();
        }
      }

      if (e.key === 'd' && !e.metaKey && !e.ctrlKey && currentSelectedRegionId) {
        e.preventDefault();
        // Find which track contains this region
        const allRegions = useRegionStore.getState().regionsByTrack;
        for (const [trackId, regions] of Object.entries(allRegions)) {
          if (regions.some((r) => r.id === currentSelectedRegionId)) {
            ipc.call('daw.duplicate_region', { track_id: trackId, region_id: currentSelectedRegionId })
              .then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
              .catch((err: unknown) => console.warn('[DAWFLOW] Duplicate region failed:', err));
            break;
          }
        }
      }

      // M = toggle mute on all selected tracks
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
        const selIds = useUIStore.getState().selectedTrackIds;
        if (selIds.length > 0) {
          e.preventDefault();
          const allTracks = useSessionStore.getState().tracks;
          const allMuted = selIds.every(id => allTracks.find(t => t.id === id)?.muted);
          for (const id of selIds) useSessionStore.getState().setTrackMute(id, !allMuted);
        }
      }

      // S = toggle solo on all selected tracks
      if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
        const selIds = useUIStore.getState().selectedTrackIds;
        if (selIds.length > 0) {
          e.preventDefault();
          const allTracks = useSessionStore.getState().tracks;
          const allSoloed = selIds.every(id => allTracks.find(t => t.id === id)?.solo);
          for (const id of selIds) useSessionStore.getState().setTrackSolo(id, !allSoloed);
        }
      }

      // Cmd+D = duplicate selected tracks
      if (e.key === 'd' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const selIds = useUIStore.getState().selectedTrackIds;
        if (selIds.length > 0) {
          e.preventDefault();
          (async () => {
            for (const id of selIds) {
              await ipc.call('daw.duplicate_track', { track_id: id }).catch(() => {});
            }
            resetFetchDebounce();
            useSessionStore.getState().fetchFromEngine();
          })();
        }
      }

      // Cmd+C = copy selected region to clipboard
      if (e.key === 'c' && (e.metaKey || e.ctrlKey) && currentSelectedRegionId) {
        e.preventDefault();
        // Store region ID and source track in our clipboard ref
        const allRegions = useRegionStore.getState().regionsByTrack;
        for (const [trackId] of Object.entries(allRegions)) {
          const regions = allRegions[trackId] || [];
          if (regions.some((r) => r.id === currentSelectedRegionId)) {
            clipboardRef.current = { regionId: currentSelectedRegionId, trackId, cut: false };
            break;
          }
        }
      }

      // Cmd+X = cut selected region (copy + delete)
      if (e.key === 'x' && (e.metaKey || e.ctrlKey) && !e.shiftKey && currentSelectedRegionId) {
        e.preventDefault();
        const allRegions = useRegionStore.getState().regionsByTrack;
        for (const [trackId, regions] of Object.entries(allRegions)) {
          if (regions.some((r) => r.id === currentSelectedRegionId)) {
            clipboardRef.current = { regionId: currentSelectedRegionId, trackId, cut: true };
            ipc.call('daw.delete_region', { track_id: trackId, region_id: currentSelectedRegionId })
              .then(() => { removeRegion(trackId, currentSelectedRegionId); setSelectedRegionId(null); resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
              .catch((err: unknown) => console.warn('[DAWFLOW] Cut failed:', err));
            break;
          }
        }
      }

      // Cmd+V = paste at playhead position on selected track
      if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const clip = clipboardRef.current;
        if (clip) {
          const pos = useTransportStore.getState().position;
          const sr = useSessionStore.getState().sampleRate || 48000;
          const posSamples = Math.floor(pos * sr);
          // Paste to selected track, or original track if none selected
          const targetTrackId = currentSelectedTrackId || clip.trackId;
          ipc.call('daw.paste_region', { track_id: targetTrackId, region_id: clip.regionId, position_samples: posSamples })
            .then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
            .catch((err: unknown) => console.warn('[DAWFLOW] Paste failed:', err));
        }
      }

      // Cmd+A = select all regions on current track
      if (e.key === 'a' && (e.metaKey || e.ctrlKey) && currentSelectedTrackId) {
        e.preventDefault();
        const regions = useRegionStore.getState().regionsByTrack[currentSelectedTrackId] || [];
        if (regions.length > 0) {
          setSelectedRegionId(regions[0].id);
        }
      }

      // Shift+X → open fade editor for selected region
      if (e.key === 'X' && e.shiftKey && !e.metaKey && !e.ctrlKey && currentSelectedRegionId) {
        e.preventDefault();
        const allRegions = useRegionStore.getState().regionsByTrack;
        for (const [tId, regions] of Object.entries(allRegions)) {
          const reg = regions.find((r) => r.id === currentSelectedRegionId);
          if (reg) {
            const shapes = fadeShapesRef.current[currentSelectedRegionId];
            setFadeEditor({
              trackId: tId, regionId: reg.id, regionName: reg.name,
              side: 'in',
              lengthSamples: fadeInLengths[currentSelectedRegionId] ?? reg.fadeInLength ?? 0,
              shape: shapes?.in || reg.fadeInShape || 'linear',
            });
            break;
          }
        }
        return;
      }

      if (e.key === 's' && !e.shiftKey && !e.metaKey && !e.ctrlKey && currentSelectedTrackId) {
        e.preventDefault();
        const track = useSessionStore.getState().tracks.find((t) => t.id === currentSelectedTrackId);
        if (track) {
          useSessionStore.getState().setTrackSolo(currentSelectedTrackId, !track.solo);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [removeRegion, setSelectedRegionId]);

  // === E. Real-time waveform during recording ===
  const recRegionCacheRef = React.useRef<Map<string, { count: number; lastId: string; lastLen: number }>>(new Map());
  React.useEffect(() => {
    if (!recording) {
      recRegionCacheRef.current.clear();
      return;
    }

    const intervalId = setInterval(() => {
      const armedTracks = useSessionStore.getState().tracks.filter((t) => t.recordEnabled);
      for (const track of armedTracks) {
        ipc.getRegions(track.id)
          .then((regions) => {
            // Diff check: only update store if regions actually changed
            const prev = recRegionCacheRef.current.get(track.id);
            const lastRegion = regions[regions.length - 1];
            const cur = {
              count: regions.length,
              lastId: lastRegion?.id ?? '',
              lastLen: lastRegion?.length ?? 0,
            };
            if (prev && prev.count === cur.count && prev.lastId === cur.lastId && prev.lastLen === cur.lastLen) {
              return; // No change — skip setState
            }
            recRegionCacheRef.current.set(track.id, cur);
            useRegionStore.getState().setRegions(
              track.id,
              regions.map((r) => ({ ...r, trackId: track.id, type: track.type || 'audio' }))
            );
          })
          .catch((err: unknown) => console.warn('[DAWFLOW] Recording region fetch failed:', err));
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [recording]);

  // Fade drag is now handled inline in the mouseDown handlers (no useEffect needed)

  // Time warp drag global mouse handlers
  React.useEffect(() => {
    if (!timeWarpDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - timeWarpDrag.startX;
      const newWidthPx = Math.max(10, timeWarpDrag.origWidthPx + (timeWarpDrag.side === 'end' ? dx : -dx));
      setTimeWarpDrag(prev => prev ? { ...prev, currentWidthPx: newWidthPx } : null);
    };

    const handleMouseUp = () => {
      if (!timeWarpDrag) return;
      const newLengthSec = timeWarpDrag.currentWidthPx / pixelsPerSecond;
      const ratio = newLengthSec / timeWarpDrag.origLengthSec;

      if (Math.abs(ratio - 1.0) > 0.01) {
        ipc.call('daw.editor.time_stretch_region', {
          region_id: timeWarpDrag.regionId,
          ratio,
        }).then(() => {
          resetFetchDebounce();
          useSessionStore.getState().fetchFromEngine();
        }).catch(err => console.warn('[DAWFLOW] Time stretch:', err));
      }

      setTimeWarpDrag(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [timeWarpDrag, pixelsPerSecond, sampleRate]);

  // Trim drag global mouse handlers
  React.useEffect(() => {
    if (!trimDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - trimDrag.startX;
      const deltaSamples = Math.floor((deltaPx / pixelsPerSecond) * sampleRate);

      const store = useRegionStore.getState();
      const regions = store.regionsByTrack[trimDrag.trackId] || [];

      if (trimDrag.side === 'start') {
        // Trimming from left: move position forward, shrink length
        // Don't allow trimming past the end or before position 0
        const clampedDelta = Math.min(deltaSamples, trimDrag.origLength - 256);
        const newPosition = Math.max(0, trimDrag.origPosition + clampedDelta);
        const newLength = Math.max(256, trimDrag.origLength - clampedDelta);
        const updated = regions.map(r =>
          r.id === trimDrag.regionId ? { ...r, position: newPosition, length: newLength } : r
        );
        useRegionStore.setState({
          regionsByTrack: { ...store.regionsByTrack, [trimDrag.trackId]: updated }
        });
      } else {
        // Trimming from right: can extend back up to source audio length, but never beyond
        const maxLen = trimDrag.maxLength > 0 ? trimDrag.maxLength : trimDrag.origLength;
        const newLength = Math.max(256, Math.min(maxLen, trimDrag.origLength + deltaSamples));
        const updated = regions.map(r =>
          r.id === trimDrag.regionId ? { ...r, length: newLength } : r
        );
        useRegionStore.setState({
          regionsByTrack: { ...store.regionsByTrack, [trimDrag.trackId]: updated }
        });
      }
    };

    const handleMouseUp = () => {
      const regions = useRegionStore.getState().regionsByTrack[trimDrag.trackId] || [];
      const region = regions.find(r => r.id === trimDrag.regionId);
      if (region) {
        if (trimDrag.side === 'start' && region.position !== trimDrag.origPosition) {
          ipc.call('daw.trim_region_start', {
            track_id: trimDrag.trackId,
            region_id: trimDrag.regionId,
            position_samples: region.position,
          }).then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
            .catch((err: unknown) => console.warn('[DAWFLOW] Trim start failed:', err));
        } else if (trimDrag.side === 'end' && region.length !== trimDrag.origLength) {
          const endPosition = region.position + region.length;
          ipc.call('daw.trim_region_end', {
            track_id: trimDrag.trackId,
            region_id: trimDrag.regionId,
            position_samples: endPosition,
          }).then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
            .catch((err: unknown) => console.warn('[DAWFLOW] Trim end failed:', err));
        }
      }
      setTrimDrag(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimDrag, pixelsPerSecond, sampleRate]);

  // Build Cubase-style context menu items
  const buildContextMenuItems = React.useCallback((): ContextMenuItem[] => {
    const trackItems: ContextMenuItem[] = [
      { label: 'Add Audio Track', icon: '\u266B', shortcut: 'Shift+A', onClick: () => openAddTrack('audio') },
      { label: 'Add Instrument Track', icon: '\u2161\u2161\u2161', shortcut: '\u21E7\u2318T', onClick: () => openAddTrack('instrument') },
      { label: 'Add Sampler Track', icon: '\u266A', onClick: () => openAddTrack('sampler') },
      { label: 'Add Drum Track', icon: '\u7530', onClick: () => openAddTrack('drum') },
      { label: 'Add MIDI Track', icon: '\u25CF', dividerAfter: true, onClick: () => openAddTrack('midi') },
      { label: 'Add Effect Track', icon: 'FX', onClick: () => openAddTrack('effect') },
      { label: 'Add Group Track', icon: '\u03C8', onClick: () => openAddTrack('group') },
      { label: 'Add VCA Track', icon: '\u25B6\u25A0', dividerAfter: true, onClick: () => openAddTrack('vca') },
      { label: 'Add Folder Track', icon: '\uD83D\uDCC1', onClick: () => openAddTrack('group') },
      { label: 'Add Marker Track', icon: '\u2193', onClick: () => openAddTrack('audio') },
      { label: 'Add Ruler Track', icon: '\uD83C\uDFB9', dividerAfter: true, onClick: () => openAddTrack('audio') },
      { label: 'Using Track Preset...', icon: '\uD83C\uDF10', submenu: true, dividerAfter: true, onClick: () => openAddTrack() },
      { label: 'Add Arranger Track', icon: '\u21BB', onClick: () => openAddTrack('audio') },
      { label: 'Add Chord Track', icon: '\u2261', onClick: () => openAddTrack('midi') },
      { label: 'Add Signature Track', icon: '=', onClick: () => openAddTrack('midi') },
      { label: 'Add Tempo Track', icon: '\u2669', onClick: () => openAddTrack('midi') },
      { label: 'Add Transpose Track', icon: '\u266A', onClick: () => openAddTrack('midi') },
      { label: 'Add Video Track', icon: '\uD83C\uDFAC', dividerAfter: true, onClick: () => {
        // Open the video import dialog — video is managed at session level
        useUIStore.getState().setVideoImportDialogOpen(true);
      } },
      { label: 'Show All Used Automation', onClick: () => {} },
      { label: 'Hide All Automation', onClick: () => {} },
    ];

    // If right-clicked on a track, prepend track-specific items
    if (contextMenu?.trackId) {
      const tid = contextMenu.trackId;
      const sel = useUIStore.getState().selectedTrackIds;
      const multiSelected = sel.length > 1 && sel.includes(tid);
      const targetIds = multiSelected ? sel : [tid];
      const countLabel = multiSelected ? ` (${targetIds.length} tracks)` : '';

      const trackSpecificItems: ContextMenuItem[] = [
        {
          label: `Duplicate${countLabel}`,
          onClick: async () => {
            for (const id of targetIds) {
              await ipc.call('daw.duplicate_track', { track_id: id }).catch(() => {});
            }
            useSessionStore.getState().fetchFromEngine();
          },
        },
        {
          label: `Remove${countLabel}`,
          danger: true,
          dividerAfter: true,
          onClick: async () => {
            for (const id of targetIds) {
              await ipc.removeTrack(id).catch(() => {});
            }
            useSessionStore.getState().fetchFromEngine();
          },
        },
        {
          label: `Mute${countLabel}`,
          onClick: () => {
            const allMuted = targetIds.every(id => tracks.find(t => t.id === id)?.muted);
            for (const id of targetIds) setTrackMute(id, !allMuted);
          },
        },
        {
          label: `Solo${countLabel}`,
          onClick: () => {
            const allSoloed = targetIds.every(id => tracks.find(t => t.id === id)?.solo);
            for (const id of targetIds) setTrackSolo(id, !allSoloed);
          },
        },
        ...(multiSelected ? [
          {
            label: `Set Color${countLabel}`,
            dividerAfter: true,
            onClick: () => {
              setColorPicker({ trackId: tid, x: contextMenu.x, y: contextMenu.y });
            },
          },
        ] : [
          { label: 'Toggle Solo', dividerAfter: true, onClick: () => setTrackSolo(tid, !tracks.find(t => t.id === tid)?.solo) },
        ]),
      ];
      return [...trackSpecificItems, ...trackItems];
    }

    return trackItems;
  }, [contextMenu, openAddTrack, setTrackMute, setTrackSolo, tracks]);

  // --- Helper: start renaming a track (for context menu) ---
  const startRename = React.useCallback((trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) {
      setEditingTrackId(trackId);
      setEditingName(track.name);
    }
  }, [tracks]);

  // --- Build DAW context menu items for track header right-click ---
  const buildTrackHeaderMenu = React.useCallback((trackId: string): MenuItem[] => {
    return [
      { label: 'Rename Track', onClick: () => startRename(trackId) },
      { label: 'Duplicate Track', onClick: () => { ipc.duplicateTrack(trackId).then(() => useSessionStore.getState().fetchFromEngine()); } },
      { label: 'Set Track Color...', onClick: () => { /* color picker placeholder */ } },
      { label: '', separator: true, onClick: () => {} },
      { label: 'Add Audio Track', onClick: () => openAddTrack('audio') },
      { label: 'Add MIDI Track', onClick: () => openAddTrack('midi') },
      { label: 'Add Video Track', onClick: () => {
        useUIStore.getState().setVideoImportDialogOpen(true);
      } },
      { label: '', separator: true, onClick: () => {} },
      { label: (() => { const t = tracks.find((tr) => tr.id === trackId); return t?.frozen ? 'Unfreeze Track' : 'Freeze Track'; })(), onClick: () => { const t = tracks.find((tr) => tr.id === trackId); const call = t?.frozen ? ipc.unfreezeTrack(trackId) : ipc.freezeTrack(trackId); call.then(() => useSessionStore.getState().fetchFromEngine()).catch((err: unknown) => console.warn('[DAWFLOW] Freeze/unfreeze failed:', err)); } },
      { label: 'Bounce Track', onClick: () => { ipc.call('daw.bounce_range', { track_id: trackId, start_samples: 0, end_samples: -1 }).then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); }).catch((err: unknown) => console.warn('[DAWFLOW] Bounce track failed:', err)); } },
      { label: 'Hide Track', onClick: () => { ipc.call('daw.editor.hide_track', { track_id: trackId }).catch((err: unknown) => console.warn('[DAWFLOW] Hide track failed:', err)); } },
      { label: '', separator: true, onClick: () => {} },
      { label: 'Remove Track', onClick: () => { ipc.removeTrack(trackId).then(() => useSessionStore.getState().fetchFromEngine()); } },
    ];
  }, [startRename, openAddTrack, tracks]);

  // --- Build DAW context menu items for region right-click ---
  const buildRegionMenu = React.useCallback((trackId: string, region: { id: string; name: string; type: string; muted?: boolean; locked?: boolean }): MenuItem[] => {
    const refetch = () => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); };
    return [
      { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => {
        ipc.call('daw.editor.cut_region', { region_id: region.id }).then(refetch).catch((err: unknown) => console.warn('[DAWFLOW]', err));
      } },
      { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => {
        ipc.call('daw.editor.copy_region', { region_id: region.id }).catch((err: unknown) => console.warn('[DAWFLOW]', err));
      } },
      { label: 'Delete', shortcut: 'Del', onClick: () => {
        ipc.call('daw.delete_region', { track_id: trackId, region_id: region.id }).then(() => { removeRegion(trackId, region.id); refetch(); }).catch((err: unknown) => console.warn('[DAWFLOW]', err));
      } },
      { label: '', separator: true, onClick: () => {} },
      { label: 'Duplicate', shortcut: 'D', onClick: () => {
        ipc.call('daw.duplicate_region', { track_id: trackId, region_id: region.id }).then(refetch).catch((err: unknown) => console.warn('[DAWFLOW]', err));
      } },
      { label: 'Split at Cursor', onClick: () => {
        const posSamples = Math.floor(position * sampleRate);
        ipc.call('daw.split_region', { track_id: trackId, region_id: region.id, position_samples: posSamples }).then(refetch).catch((err: unknown) => console.warn('[DAWFLOW]', err));
      } },
      { label: '', separator: true, onClick: () => {} },
      { label: region.muted ? 'Unmute Region' : 'Mute Region', onClick: () => {
        ipc.call('daw.set_region_muted', { track_id: trackId, region_id: region.id, muted: !(region.muted ?? false) }).then(refetch).catch((err: unknown) => console.warn('[DAWFLOW]', err));
      } },
      { label: region.locked ? 'Unlock Region' : 'Lock Region', onClick: () => {
        ipc.call('daw.set_region_locked', { track_id: trackId, region_id: region.id, locked: !(region.locked ?? false) }).then(refetch).catch((err: unknown) => console.warn('[DAWFLOW]', err));
      } },
      { label: '', separator: true, onClick: () => {} },
      { label: 'Normalize...', onClick: () => {
        ipc.normalizeRegion(trackId, region.id)
          .then((res: any) => { console.log('[DAWFLOW] Normalize result:', res); setTimeout(refetch, 300); })
          .catch((err: unknown) => console.warn('[DAWFLOW] Normalize failed:', err));
      } },
      { label: 'Reverse', onClick: () => {
        ipc.call('daw.reverse_region', { track_id: trackId, region_id: region.id })
          .then((res: any) => { console.log('[DAWFLOW] Reverse result:', res); setTimeout(refetch, 300); })
          .catch((err: unknown) => console.warn('[DAWFLOW] Reverse failed:', err));
      } },
      { label: 'Bounce Region', onClick: () => {
        ipc.call('daw.bounce_region', { track_id: trackId, region_id: region.id })
          .then((res: any) => { console.log('[DAWFLOW] Bounce result:', res); setTimeout(refetch, 500); })
          .catch((err: unknown) => console.warn('[DAWFLOW] Bounce region failed:', err));
      } },
      { label: '', separator: true, onClick: () => {} },
      {
        label: region.type === 'midi' ? 'Open in MIDI Editor' : 'Open in Audio Editor',
        onClick: () => {
          // Set both track and region so EditorHost can find the region
          useUIStore.getState().setSelectedTrackId(trackId);
          setSelectedRegionId(region.id);
          useUIStore.getState().setLowerZoneTab('editor');
          // Ensure lower zone is visible
          if (!useUIStore.getState().lowerZoneVisible) {
            useUIStore.getState().toggleLowerZone();
          }
        },
      },
    ];
  }, [removeRegion, sampleRate, position, setSelectedRegionId]);

  // --- Build DAW context menu items for empty timeline right-click ---
  const buildEmptyTimelineMenu = React.useCallback((trackId: string, clickXPx: number): MenuItem[] => {
    const positionSeconds = Math.max(0, clickXPx / pixelsPerSecond);
    const posSamples = Math.floor(positionSeconds * sampleRate);
    return [
      { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => { ipc.call('daw.paste_region').catch((err: unknown) => console.warn('[DAWFLOW]', err)); } },
      { label: '', separator: true, onClick: () => {} },
      { label: 'Add Marker Here', onClick: () => { ipc.addMarker('Marker', posSamples).catch((err: unknown) => console.warn('[DAWFLOW]', err)); } },
      { label: 'Set Left Locator', onClick: () => { useTransportStore.getState().setLeftLocator(positionSeconds); } },
      { label: 'Set Right Locator', onClick: () => { useTransportStore.getState().setRightLocator(positionSeconds); } },
      { label: '', separator: true, onClick: () => {} },
      { label: 'Insert Time...', onClick: () => { ipc.call('daw.editor.insert_time', { position: posSamples, duration: sampleRate }).catch((err: unknown) => console.warn('[DAWFLOW]', err)); } },
      { label: 'Select All in Track', onClick: () => { ipc.call('daw.editor.select_all_regions_in_track', { track_id: trackId }).catch((err: unknown) => console.warn('[DAWFLOW]', err)); } },
    ];
  }, [pixelsPerSecond, sampleRate]);

  // === TrackHeader callbacks ===
  const handleTrackSelect = React.useCallback((trackId: string, e?: React.MouseEvent) => {
    const allIds = useSessionStore.getState().tracks.map(t => t.id);
    const mode = e?.shiftKey ? 'range' : (e?.metaKey || e?.ctrlKey) ? 'toggle' : 'replace';

    if (mode === 'replace') {
      const prevId = prevSelectedTrackRef.current;
      if (prevId && prevId !== trackId) {
        setTrackRecord(prevId, false);
      }
      // Auto-arm new track if recordable
      const track = useSessionStore.getState().tracks.find((t) => t.id === trackId);
      if (track && (track.type === 'audio' || track.type === 'midi' || track.type === 'instrument' || track.type === 'sampler')) {
        setTrackRecord(trackId, true);
      }
      prevSelectedTrackRef.current = trackId;
    }

    selectTrack(trackId, mode, allIds);
  }, [selectTrack, setTrackRecord]);

  const handleNameChange = React.useCallback((trackId: string, name: string) => {
    setTrackName(trackId, name);
  }, [setTrackName]);

  const handleColorPickerOpen = React.useCallback((trackId: string) => {
    // Position the color picker near the track header
    const trackEl = document.querySelector(`[data-track-id="${trackId}"]`);
    const rect = trackEl?.getBoundingClientRect();
    setColorPicker({
      trackId,
      x: rect ? rect.left + 30 : 100,
      y: rect ? rect.top + 30 : 100,
    });
  }, []);

  const handleColorSelect = React.useCallback((color: string) => {
    if (!colorPicker) return;
    // Apply to all selected tracks if the target is part of multi-selection
    const sel = useUIStore.getState().selectedTrackIds;
    const targets = sel.length > 1 && sel.includes(colorPicker.trackId) ? sel : [colorPicker.trackId];
    for (const id of targets) setTrackColor(id, color);
  }, [colorPicker, setTrackColor]);

  const handleEditChannel = React.useCallback((trackId: string) => {
    useUIStore.getState().setChannelSettingsTrackId(trackId);
  }, []);

  const handleToggleAutomation = React.useCallback((trackId: string) => {
    toggleAutomationLane(trackId, 'gain');
  }, [toggleAutomationLane]);

  const handleToggleLanes = React.useCallback((trackId: string) => {
    setTakeLanes((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  }, []);

  const handleAutomationModeChange = React.useCallback((trackId: string, mode: 'off' | 'read' | 'write') => {
    // Update local state immediately so buttons visually toggle
    useSessionStore.setState((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              readAutomation: mode === 'read',
              writeAutomation: mode === 'write',
            }
          : t
      ),
    }));
    // Send to engine
    const engineMode = mode === 'off' ? 'Manual' : mode === 'read' ? 'Play' : 'Write';
    engine.automation.setMode(trackId, engineMode).catch(() => {});
  }, []);

  const handleFreezeToggle = React.useCallback((trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const call = track.frozen
      ? ipc.unfreezeTrack(trackId)
      : ipc.freezeTrack(trackId);
    call
      .then(() => useSessionStore.getState().fetchFromEngine())
      .catch((err: unknown) => console.warn('[DAWFLOW] Freeze/unfreeze failed:', err));
  }, [tracks]);

  const handleTrackContextMenu = React.useCallback((trackId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDawContextMenu({ x: e.clientX, y: e.clientY, items: buildTrackHeaderMenu(trackId) });
  }, [buildTrackHeaderMenu]);

  // === Locator drag state ===
  const [locatorDrag, setLocatorDrag] = React.useState<{
    type: 'range' | 'left' | 'right';
    startX: number;
    rulerLeft: number;
  } | null>(null);

  const rulerTimelineRef = React.useRef<HTMLDivElement>(null);

  // Locator drag handlers (global mouse events)
  React.useEffect(() => {
    if (!locatorDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentSec = Math.max(0, (e.clientX - locatorDrag.rulerLeft + scrollLeftPx) / pixelsPerSecond);
      const sr = sampleRate || 48000;

      if (locatorDrag.type === 'left') {
        useTransportStore.getState().setLeftLocator(currentSec);
      } else if (locatorDrag.type === 'right') {
        useTransportStore.getState().setRightLocator(currentSec);
      } else {
        // Range drag: startX determines L, current determines R (or vice versa)
        const startSec = Math.max(0, (locatorDrag.startX - locatorDrag.rulerLeft + scrollLeftPx) / pixelsPerSecond);
        const l = Math.min(startSec, currentSec);
        const r = Math.max(startSec, currentSec);
        // Update local state without sending IPC on every pixel
        useTransportStore.setState({
          leftLocator: l,
          rightLocator: r,
          leftLocatorDisplay: l.toFixed(1) + 's',
          rightLocatorDisplay: r.toFixed(1) + 's',
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const sr = sampleRate || 48000;
      const state = useTransportStore.getState();
      // Send final IPC call with the set range
      ipc.setLoopRange(
        Math.floor(state.leftLocator * sr),
        Math.floor(state.rightLocator * sr)
      ).catch((err) => console.warn('[IPC] setLoopRange:', err));
      setLocatorDrag(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [locatorDrag, pixelsPerSecond, sampleRate, scrollLeftPx]);

  // Compute ruler tick spacing based on zoom level
  const tempo = useTransportStore.getState().tempo || 120;
  const beatDurationSec = 60 / tempo;
  const beatWidthPx = beatDurationSec * pixelsPerSecond;

  // Dynamic label interval: at low zoom, show every Nth bar so labels never overlap
  // Target: bar labels should be at least ~60px apart
  const barWidthPx = beatWidthPx * 4;
  const labelEveryNBars = barWidthPx < 15 ? 16
    : barWidthPx < 30 ? 8
    : barWidthPx < 60 ? 4
    : barWidthPx < 120 ? 2
    : 1;

  // Number of ticks to cover the entire scrollable timeline
  const rulerTickCount = Math.max(200, Math.ceil(totalTimelineWidthPx / Math.max(1, beatWidthPx)) + 4);

  // Snap helper: snap seconds to nearest beat boundary
  const snapEnabled = useUIStore((s) => s.snapEnabled);
  const snapToGrid = React.useCallback((seconds: number): number => {
    if (!snapEnabled) return seconds;
    const beats = seconds / beatDurationSec;
    const snappedBeats = Math.round(beats);
    return snappedBeats * beatDurationSec;
  }, [snapEnabled, beatDurationSec]);

  // Locator positions in pixels (relative to ruler timeline start)
  const leftLocPx = leftLocator * pixelsPerSecond;
  const rightLocPx = rightLocator * pixelsPerSecond;
  const hasLocatorRange = rightLocator > leftLocator && (rightLocator - leftLocator) > 0.01;

  return (
    <div className={styles.container}>
      {/* Ruler */}
      <div className={styles.ruler}>
        <div className={styles.rulerTrackHeader}>
          <span className={styles.rulerLabel}>Bars+Beats</span>
        </div>
        <div
          ref={rulerTimelineRef}
          className={styles.rulerTimeline}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', position: 'relative', transform: `translateX(${-scrollLeftPx}px)`, width: `${totalTimelineWidthPx}px`, minWidth: `${totalTimelineWidthPx}px` }}>
          {/* Beat/bar tick marks — dynamic density based on zoom */}
          {Array.from({ length: rulerTickCount }, (_, i) => {
            const isBar = i % 4 === 0;
            const isHalfBar = i % 2 === 0 && !isBar;
            const barIndex = Math.floor(i / 4);
            const showLabel = isBar && (barIndex % labelEveryNBars === 0);
            // At very low zoom, hide beat-level ticks entirely
            const hideTick = beatWidthPx < 8 && !isBar;
            if (hideTick) return <div key={i} style={{ flex: `0 0 ${beatWidthPx}px` }} />;
            return (
              <div
                key={i}
                className={`${styles.rulerMark} ${isBar ? styles.rulerMarkBar : ''} ${isHalfBar ? styles.rulerMarkHalfBar : ''}`}
                style={{ flex: `0 0 ${beatWidthPx}px` }}
              >
                {showLabel && <span className={styles.barNumber}>{barIndex + 1}</span>}
                <span className={`${styles.beatTick} ${isBar ? styles.barTick : ''} ${isHalfBar ? styles.halfBarTick : ''}`} />
              </div>
            );
          })}

          {/* Locator range highlight on ruler */}
          {hasLocatorRange && (
            <div
              className={styles.rulerLocatorRange}
              style={{
                left: `${leftLocPx}px`,
                width: `${rightLocPx - leftLocPx}px`,
              }}
            />
          )}

          {/* Left locator flag */}
          {(leftLocator > 0 || hasLocatorRange) && (
            <div
              className={`${styles.locatorFlag} ${styles.locatorFlagL}`}
              style={{ left: `${leftLocPx}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = rulerTimelineRef.current?.getBoundingClientRect();
                if (rect) setLocatorDrag({ type: 'left', startX: e.clientX, rulerLeft: rect.left });
              }}
              title={`Left Locator: ${leftLocator.toFixed(2)}s`}
            >
              <span className={styles.locatorFlagLabel}>L</span>
            </div>
          )}

          {/* Right locator flag */}
          {(rightLocator > 0 || hasLocatorRange) && (
            <div
              className={`${styles.locatorFlag} ${styles.locatorFlagR}`}
              style={{ left: `${rightLocPx}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = rulerTimelineRef.current?.getBoundingClientRect();
                if (rect) setLocatorDrag({ type: 'right', startX: e.clientX, rulerLeft: rect.left });
              }}
              title={`Right Locator: ${rightLocator.toFixed(2)}s`}
            >
              <span className={styles.locatorFlagLabel}>R</span>
            </div>
          )}

          {/* Locator drag interaction zone — click to seek, drag to set range, ctrl+click for right locator */}
          <div
            className={styles.rulerLocatorZone}
            onMouseDown={(e) => {
              // Ctrl/Cmd+click: set right locator at click position
              const rect = rulerTimelineRef.current?.getBoundingClientRect();
              if (!rect) return;
              const clickSec = Math.max(0, (e.clientX - rect.left + scrollLeftPx) / pixelsPerSecond);

              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                useTransportStore.getState().setRightLocator(clickSec);
                return;
              }

              if (e.altKey) {
                // Alt+click: set left locator without dragging
                e.preventDefault();
                useTransportStore.getState().setLeftLocator(clickSec);
                return;
              }

              // Upper half of ruler: start range drag
              const relY = e.clientY - rect.top;
              if (relY < rect.height * 0.5) {
                e.preventDefault();
                setLocatorDrag({ type: 'range', startX: e.clientX, rulerLeft: rect.left });
                // Set initial L position at click
                useTransportStore.setState({
                  leftLocator: clickSec,
                  rightLocator: clickSec,
                  leftLocatorDisplay: clickSec.toFixed(1) + 's',
                  rightLocatorDisplay: clickSec.toFixed(1) + 's',
                });
                return;
              }

              // Lower half: seek playhead (snap to grid if enabled) + scrub on drag
              const snappedSec = snapToGrid(clickSec);
              const samples = Math.floor(snappedSec * sampleRate);
              ipc.transportLocate(samples).catch((err) => console.warn('[IPC]', err));
              useTransportStore.getState().setPosition(snappedSec);

              // Scrub: continuously seek while dragging
              e.preventDefault();
              const onScrubMove = (me: MouseEvent) => {
                const r = rulerTimelineRef.current?.getBoundingClientRect();
                if (!r) return;
                const xPx = me.clientX - r.left + scrollLeftPx;
                const sec = snapToGrid(Math.max(0, xPx / pixelsPerSecond));
                const s = Math.floor(sec * (sampleRate || 48000));
                ipc.transportLocate(s).catch((err) => console.warn('[IPC] scrub:', err));
                useTransportStore.getState().setPosition(sec);
              };
              const onScrubUp = () => {
                window.removeEventListener('mousemove', onScrubMove);
                window.removeEventListener('mouseup', onScrubUp);
              };
              window.addEventListener('mousemove', onScrubMove);
              window.addEventListener('mouseup', onScrubUp);
            }}
          />
          </div>{/* end ruler inner scroll wrapper */}
        </div>
      </div>

      {/* Marker track */}
      <MarkerTrack
        pixelsPerSecond={pixelsPerSecond}
        scrollLeft={0}
        sampleRate={sampleRate}
      />

      {/* Video track */}
      <VideoTrack
        pixelsPerSecond={pixelsPerSecond}
        scrollLeftPx={scrollLeftPx}
        sampleRate={sampleRate}
        viewportWidth={viewportWidthForCalc}
      />

      {/* Track area wrapper: track list + right scrollbar */}
      <div className={styles.trackAreaWrapper}>
      {/* Track list + Event display */}
      <div
        ref={trackAreaRef}
        className={`${styles.trackArea} ${isDragOver ? styles.trackAreaDragOver : ''}`}
        data-tool={activeTool}
        style={{ position: 'relative', overflowX: 'hidden', overflowY: 'auto' }}
        onMouseDown={(e) => {
          if (e.button === 1) handleMiddleMouseDown(e);
        }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+scroll = horizontal zoom
            e.preventDefault();
            setPixelsPerSecond((prev) => {
              const factor = e.deltaY < 0 ? 1.1 : 0.9;
              return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev * factor));
            });
            return;
          }
          // Horizontal scroll: two-finger swipe (deltaX) OR shift+scroll (deltaY as horizontal)
          const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
          if (dx !== 0 && maxScrollLeftPx > 0) {
            e.preventDefault();
            setHScrollFraction((prev) => Math.max(0, Math.min(1, prev + dx / maxScrollLeftPx)));
          }
          // Vertical scroll: regular scroll wheel or two-finger vertical
          const dy = e.shiftKey ? 0 : e.deltaY;
          if (dy !== 0) {
            const el = trackAreaRef.current;
            if (el) {
              el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + dy));
            }
          }
        }}
        onClick={(e) => {
          if (draggingRegion) return; // Don't seek while dragging
          // Only seek if clicking on empty space (not on a track control)
          if ((e.target as HTMLElement).closest(`.${styles.trackHeader}`)) return;
          // If clicking on a region block, don't deselect (region click handler handles it)
          if ((e.target as HTMLElement).closest(`.${styles.regionBlock}`)) return;
          // Deselect region when clicking empty area
          setSelectedRegionId(null);
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetPx = e.clientX - rect.left - TRACK_HEADER_WIDTH + scrollLeftPx; // track header width + scroll offset
          if (offsetPx < 0) return;
          const seconds = snapToGrid(offsetPx / pixelsPerSecond);
          const samples = Math.floor(seconds * sampleRate);
          ipc.transportLocate(samples).catch((e) => console.warn('[IPC]', e));
          useTransportStore.getState().setPosition(seconds);
        }}
        onMouseMove={(e) => {
          if (!draggingRegion) return;
          const deltaPx = e.clientX - draggingRegion.startX;
          const deltaSamples = Math.floor((deltaPx / pixelsPerSecond) * sampleRate);
          const newPos = Math.max(0, draggingRegion.origPosition + deltaSamples);
          // Live preview: update local region position
          const store = useRegionStore.getState();
          const regions = store.regionsByTrack[draggingRegion.trackId] || [];
          const updated = regions.map(r =>
            r.id === draggingRegion.regionId ? { ...r, position: newPos } : r
          );
          useRegionStore.setState({
            regionsByTrack: { ...store.regionsByTrack, [draggingRegion.trackId]: updated }
          });
        }}
        onMouseUp={() => {
          if (!draggingRegion) return;
          const regions = useRegionStore.getState().regionsByTrack[draggingRegion.trackId] || [];
          const region = regions.find(r => r.id === draggingRegion.regionId);
          if (region && region.position !== draggingRegion.origPosition) {
            ipc.call('daw.move_region', {
              track_id: draggingRegion.trackId,
              region_id: draggingRegion.regionId,
              position_samples: region.position,
            }).then(() => {
              resetFetchDebounce();
              useSessionStore.getState().fetchFromEngine();
              // Auto-create crossfade if the moved region now overlaps an adjacent region
              const trackId = draggingRegion.trackId;
              const allRegs = useRegionStore.getState().regionsByTrack[trackId] || [];
              const sorted = [...allRegs].sort((a, b) => a.position - b.position);
              for (let i = 0; i < sorted.length - 1; i++) {
                const a = sorted[i];
                const b = sorted[i + 1];
                if (a.position + a.length > b.position) {
                  if (a.id === region.id || b.id === region.id) {
                    ipc.call('daw.create_crossfade', {
                      track_id: trackId,
                      region_id_a: a.id,
                      region_id_b: b.id,
                    }).catch(() => {/* crossfade may not be supported yet */});
                  }
                }
              }
            });
          }
          setDraggingRegion(null);
        }}
        onMouseLeave={() => {
          if (draggingRegion) setDraggingRegion(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounterRef.current++;
          if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          // Update drop position indicator
          const rect = e.currentTarget.getBoundingClientRect();
          const rawOffsetPx = e.clientX - rect.left - TRACK_HEADER_WIDTH;
          if (rawOffsetPx >= 0) {
            const rawSec = rawOffsetPx / pixelsPerSecond;
            const snappedSec = snapEnabled ? snapToGrid(rawSec) : rawSec;
            setDropIndicatorX(TRACK_HEADER_WIDTH + snappedSec * pixelsPerSecond);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounterRef.current--;
          if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            setIsDragOver(false);
            setDropIndicatorX(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragCounterRef.current = 0;
          setIsDragOver(false);
          setDropIndicatorX(null);
          const files = e.dataTransfer.files;
          if (files.length === 0) return;

          // Native WKWebView passes real file paths via window.__dawflow_drop_files
          // (set by native draggingEntered: in DawflowMainWebView)
          const nativePaths: string[] = (window as any).__dawflow_drop_files || [];
          (window as any).__dawflow_drop_files = null;

          // Find which track the drop landed on
          const trackEl = (e.target as HTMLElement).closest('[data-track-id]');
          const targetTrackId = trackEl?.getAttribute('data-track-id') || '';

          // Calculate position from drop X coordinate, snapped to grid if enabled
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetPx = e.clientX - rect.left - TRACK_HEADER_WIDTH;
          const rawSeconds = Math.max(0, offsetPx / pixelsPerSecond);
          const seconds = snapEnabled ? snapToGrid(rawSeconds) : rawSeconds;
          const positionSamples = Math.floor(seconds * sampleRate);

          const importFileToTrack = async (file: File, fileIndex: number) => {
            // Resolve file path: native WKWebView paths → Chromium path → filename fallback
            const filepath =
              nativePaths.find(p => p.endsWith('/' + file.name)) ||
              nativePaths[fileIndex] ||
              (file as any).path ||
              file.name;
            const filename = filepath.split('/').pop() || 'Audio';
            const trackName = filename.replace(/\.[^.]+$/, ''); // Strip extension

            // Video file detection — handle before audio import
            const isVideo = VIDEO_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
            if (isVideo) {
              // Register video with the engine and in the store
              await ipc.call('daw.import_video', { file_path: filepath }).catch(() => {});

              // Try to get actual metadata from engine (falls back to defaults)
              let detectedFps = 24;
              try {
                const meta = await ipc.call<Record<string, unknown>>('daw.video.get_metadata', { file_path: filepath });
                if (meta?.fps) detectedFps = Number(meta.fps);
                const dur = Number(meta?.duration_seconds ?? 0);
                useVideoStore.getState().setVideoFile(filepath, detectedFps, dur);
              } catch {
                useVideoStore.getState().setVideoFile(filepath, 24, 0);
              }

              // Set session FPS to match video and enable sync
              await ipc.call('daw.video.set_session_fps', { fps: detectedFps }).catch(() => {});
              await ipc.call('daw.video.set_sync_enabled', { enabled: true }).catch(() => {});

              // Check if harvid is running so we can show real frame thumbnails
              try {
                const resp = await fetch('http://localhost:5080/status');
                if (resp.ok) useVideoStore.getState().setHarvidAvailable(true);
              } catch { /* harvid not running — placeholders will show */ }

              // Extract audio from video using ffmpeg (engine-side), then import the WAV
              const audioTrackName = trackName + ' (Audio)';
              try {
                const extractResult = await ipc.call<Record<string, unknown>>(
                  'daw.extract_audio_from_video',
                  { file_path: filepath, track_name: audioTrackName }
                );
                const extractedWav = extractResult?.extracted_audio as string;
                if (extractedWav) {
                  // Create audio track and import the extracted WAV onto it
                  await ipc.call('daw.add_audio_track', { name: audioTrackName });
                  await new Promise(r => setTimeout(r, 800));
                  const currentTracks = await ipc.getTracks();
                  const audioTrack = currentTracks.find(t => t.name === audioTrackName);
                  if (audioTrack) {
                    await ipc.call('daw.import_audio', {
                      file_path: extractedWav,
                      track_id: audioTrack.id,
                      position_samples: 0,
                    });
                  }
                }
              } catch {
                // Audio extraction may fail if video has no audio or ffmpeg not installed
              }

              resetFetchDebounce();
              await useSessionStore.getState().fetchFromEngine();
              return; // skip the normal audio import for this file
            }

            if (targetTrackId) {
              // Drop on existing track → import directly
              await ipc.call('daw.import_audio', {
                filepath,
                track_id: targetTrackId,
                position_samples: positionSamples,
              });
            } else {
              // Drop on empty space → create new audio track, then import onto it
              await ipc.call('daw.add_audio_track', { name: trackName });
              // Wait for fire-and-forget track creation to complete
              await new Promise(r => setTimeout(r, 800));
              // Find the newly created track
              const currentTracks = await ipc.getTracks();
              const newTrack = currentTracks.find(t => t.name === trackName)
                || currentTracks[currentTracks.length - 1];
              if (newTrack) {
                await ipc.call('daw.import_audio', {
                  filepath,
                  track_id: newTrack.id,
                  position_samples: positionSamples,
                });
              } else {
                console.error('[DAWFLOW] Could not find newly created track for import');
                return;
              }
            }
            // Force refresh (bypass debounce) to show the imported region + waveform
            resetFetchDebounce();
            await useSessionStore.getState().fetchFromEngine();
          };

          // Import each file sequentially (each may need a new track)
          (async () => {
            for (let i = 0; i < files.length; i++) {
              try {
                await importFileToTrack(files[i], i);
              } catch (err) {
                console.error('[DAWFLOW] Import failed:', err);
              }
            }
            // Second refresh after a delay — catches regions/waveforms that need time to build
            setTimeout(() => {
              resetFetchDebounce();
              useSessionStore.getState().fetchFromEngine();
            }, 1500);
          })();
        }}
      >
        {/* Left sidebar background — fills below tracks to match header column */}
        <div className={styles.leftSidebarFill} />

        {/* Background grid — only render visible lines (virtual scroll) */}
        <div className={styles.backgroundGrid}>
          {(() => {
            if (beatWidthPx <= 0) return null;
            const firstVisible = Math.max(0, Math.floor(scrollLeftPx / beatWidthPx) - 1);
            const visibleCount = Math.ceil(viewportWidthForCalc / beatWidthPx) + 3;
            return Array.from({ length: visibleCount }, (_, idx) => {
              const i = firstVisible + idx;
              const x = i * beatWidthPx - scrollLeftPx;
              return (
                <div
                  key={i}
                  className={`${styles.gridLine} ${i % 4 === 0 ? styles.gridLineBar : ''}`}
                  style={{ left: `${x}px` }}
                />
              );
            });
          })()}
        </div>

        <div className={styles.trackList}>
          {/* Top spacer for virtualized tracks above the visible range */}
          <div style={{ height: trackPositions[visibleTrackRange.start]?.top || 0, flexShrink: 0 }} />
          {tracks.slice(visibleTrackRange.start, visibleTrackRange.end).map((track) => {
            const trackAutoLanes = automationLanes[track.id] || [];
            return (
            <div key={track.id} data-track-id={track.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className={`${styles.trackRow} ${selectedTrackIds.includes(track.id) ? styles.trackSelected : ''}`}
              style={{ height: Math.round((track.height || 80) * trackHeightScale) }}
              onClick={(e) => handleTrackSelect(track.id, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, trackId: track.id });
              }}
            >
              {/* Track header — Cubase-style component */}
              <div className={styles.trackHeader}>
                <TrackHeader
                  track={{
                    id: track.id,
                    name: track.name,
                    type: track.type,
                    color: track.color || '#4fc3f7',
                    muted: track.muted,
                    mutedByOthers: track.mutedByOthers,
                    solo: track.solo,
                    recordEnabled: track.recordEnabled,
                    monitorEnabled: track.monitorEnabled,
                    readAutomation: track.readAutomation ?? false,
                    writeAutomation: track.writeAutomation ?? false,
                    frozen: track.frozen ?? false,
                    index: tracks.indexOf(track),
                  }}
                  selected={selectedTrackIds.includes(track.id)}
                  onSelect={handleTrackSelect}
                  onMuteToggle={(id) => setTrackMute(id, !track.mutedBySelf)}
                  onSoloToggle={(id) => setTrackSolo(id, !track.solo)}
                  onRecordToggle={(id) => setTrackRecord(id, !track.recordEnabled)}
                  onMonitorToggle={(id) => setTrackMonitor(id, !track.monitorEnabled)}
                  onFreezeToggle={handleFreezeToggle}
                  onNameChange={handleNameChange}
                  onColorPickerOpen={handleColorPickerOpen}
                  onEditChannel={handleEditChannel}
                  onToggleAutomation={handleToggleAutomation}
                  onToggleLanes={handleToggleLanes}
                  onAutomationModeChange={handleAutomationModeChange}
                  onContextMenu={handleTrackContextMenu}
                />
              </div>

              {/* Event display area (timeline) */}
              <div className={styles.eventDisplay}
                onMouseDown={(e) => {
                  // Draw tool: create a MIDI region on MIDI/instrument tracks via drag
                  if (activeTool === 'draw' && (track.type === 'midi' || track.type === 'instrument')) {
                    e.stopPropagation();
                    e.preventDefault();
                    const eventDisplayEl = e.currentTarget;
                    const rect = eventDisplayEl.getBoundingClientRect();
                    const startXPx = e.clientX - rect.left;
                    const startSec = snapToGrid(startXPx / pixelsPerSecond);

                    setDrawingGhost({ trackId: track.id, startSec, endSec: startSec + 4 * beatDurationSec });

                    const onMove = (me: MouseEvent) => {
                      const moveRect = eventDisplayEl.getBoundingClientRect();
                      const curXPx = me.clientX - moveRect.left;
                      const curSec = snapToGrid(curXPx / pixelsPerSecond);
                      setDrawingGhost({ trackId: track.id, startSec: Math.min(startSec, curSec), endSec: Math.max(startSec, curSec) });
                    };

                    const onUp = (me: MouseEvent) => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                      setDrawingGhost(null);

                      const upRect = eventDisplayEl.getBoundingClientRect();
                      const endXPx = me.clientX - upRect.left;
                      const endSec = snapToGrid(endXPx / pixelsPerSecond);
                      const regionStartSec = Math.min(startSec, endSec);
                      const regionLengthSec = Math.abs(endSec - startSec);

                      // Minimum 1 beat length, default to 1 bar if just a click
                      const minLength = beatDurationSec;
                      const finalLength = regionLengthSec < minLength ? (4 * beatDurationSec) : regionLengthSec;

                      const positionSamples = Math.floor(regionStartSec * sampleRate);
                      const lengthSamples = Math.floor(finalLength * sampleRate);

                      engine.midi.createRegion(track.id, positionSamples, lengthSamples).then(() => {
                        ipc.getRegions(track.id).then((regions) => {
                          useRegionStore.getState().setRegions(track.id, regions.map((r) => ({
                            ...r, trackId: track.id, type: track.type || 'midi',
                          })));
                        });
                      }).catch((err) => console.warn('[DAWFLOW] Create MIDI region failed:', err));
                    };

                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  } else if (activeTool === 'draw' && track.type === 'audio') {
                    // Draw tool on audio track: create an empty audio region
                    e.stopPropagation();
                    e.preventDefault();
                    const eventDisplayEl = e.currentTarget;
                    const aRect = eventDisplayEl.getBoundingClientRect();
                    const aStartXPx = e.clientX - aRect.left;
                    const aStartSec = snapToGrid(aStartXPx / pixelsPerSecond);
                    setDrawingGhost({ trackId: track.id, startSec: aStartSec, endSec: aStartSec + 4 * beatDurationSec });
                    const aOnMove = (me: MouseEvent) => {
                      const mr = eventDisplayEl.getBoundingClientRect();
                      const cs = snapToGrid((me.clientX - mr.left) / pixelsPerSecond);
                      setDrawingGhost({ trackId: track.id, startSec: Math.min(aStartSec, cs), endSec: Math.max(aStartSec, cs) });
                    };
                    const aOnUp = (me: MouseEvent) => {
                      window.removeEventListener('mousemove', aOnMove);
                      window.removeEventListener('mouseup', aOnUp);
                      setDrawingGhost(null);
                      const ur = eventDisplayEl.getBoundingClientRect();
                      const endS = snapToGrid((me.clientX - ur.left) / pixelsPerSecond);
                      const rs = Math.min(aStartSec, endS);
                      const rl = Math.max(Math.abs(endS - aStartSec), 4 * beatDurationSec);
                      ipc.call('daw.create_audio_region', {
                        track_id: track.id,
                        position_samples: Math.floor(rs * sampleRate),
                        length_samples: Math.floor(rl * sampleRate),
                      }).then(() => {
                        ipc.getRegions(track.id).then((regions) => {
                          useRegionStore.getState().setRegions(track.id, regions.map((r) => ({
                            ...r, trackId: track.id, type: 'audio',
                          })));
                        });
                      }).catch((err) => console.warn('[DAWFLOW] Create audio region:', err));
                    };
                    window.addEventListener('mousemove', aOnMove);
                    window.addEventListener('mouseup', aOnUp);
                  } else if (activeTool === 'draw') {
                    // Draw tool on other track types — prevent default to avoid XML errors
                    e.stopPropagation();
                    e.preventDefault();
                  } else if (activeTool === 'range') {
                    // Range tool: marquee drag to select a time range
                    e.stopPropagation();
                    e.preventDefault();
                    const eventDisplayEl = e.currentTarget;
                    const rect = eventDisplayEl.getBoundingClientRect();
                    const clickXPx = e.clientX - rect.left + scrollLeftPx;
                    const startSample = Math.max(0, Math.floor((clickXPx / pixelsPerSecond) * sampleRate));

                    setRangeDrag({ startSample, endSample: startSample });
                    // Clear any previous committed range
                    setRangeSelection(null);

                    const onMove = (me: MouseEvent) => {
                      const moveRect = eventDisplayEl.getBoundingClientRect();
                      const curXPx = me.clientX - moveRect.left + scrollLeftPx;
                      const curSample = Math.max(0, Math.floor((curXPx / pixelsPerSecond) * sampleRate));
                      setRangeDrag({
                        startSample: Math.min(startSample, curSample),
                        endSample: Math.max(startSample, curSample),
                      });
                    };

                    const onUp = (me: MouseEvent) => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                      const upRect = eventDisplayEl.getBoundingClientRect();
                      const endXPx = me.clientX - upRect.left + scrollLeftPx;
                      const endSample = Math.max(0, Math.floor((endXPx / pixelsPerSecond) * sampleRate));
                      const lo = Math.min(startSample, endSample);
                      const hi = Math.max(startSample, endSample);
                      setRangeDrag(null);
                      // Only commit if the range is at least a few samples wide
                      if (hi - lo > 64) {
                        setRangeSelection({ startSample: lo, endSample: hi });
                      }
                    };

                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickXPx = e.clientX - rect.left;
                  setDawContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    items: buildEmptyTimelineMenu(track.id, clickXPx),
                  });
                }}
              >
                {/* Time warp stretch preview */}
                {timeWarpDrag && timeWarpDrag.trackId === track.id && (
                  <div
                    className={styles.regionBlock}
                    style={{
                      left: `${timeWarpDrag.leftPx - scrollLeftPx}px`,
                      width: `${Math.max(4, timeWarpDrag.currentWidthPx)}px`,
                      opacity: 0.35,
                      background: '#ff9800',
                      border: '1px dashed #ff9800',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Ghost region preview during draw tool drag */}
                {drawingGhost && drawingGhost.trackId === track.id && (
                  <div
                    className={styles.regionBlock}
                    style={{
                      left: `${drawingGhost.startSec * pixelsPerSecond - scrollLeftPx}px`,
                      width: `${Math.max(4, (drawingGhost.endSec - drawingGhost.startSec) * pixelsPerSecond)}px`,
                      opacity: 0.4,
                      background: track.color || '#4fc3f7',
                      border: `1px dashed ${track.color || '#4fc3f7'}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Recording region visual (grows in real-time) */}
                {recording && track.recordEnabled && (
                  <div
                    className={styles.regionBlock}
                    style={{
                      left: `${recordStartPos * pixelsPerSecond - scrollLeftPx}px`,
                      width: `${Math.max(4, (position - recordStartPos) * pixelsPerSecond)}px`,
                      opacity: 0.7,
                    }}
                  >
                    <div className={styles.eventTop} style={{ background: '#C43030' }}>
                      <span className={styles.eventLabel}>Recording...</span>
                    </div>
                    <div className={styles.eventBody} style={{ background: '#C43030', opacity: 0.4 }} />
                  </div>
                )}
                {/* Real regions from engine */}
                {(regionsByTrack[track.id] || []).map((region) => {
                  const startSec = region.position / sampleRate;
                  const lengthSec = region.length / sampleRate;
                  const leftPx = startSec * pixelsPerSecond - scrollLeftPx;
                  const widthPx = Math.max(4, lengthSec * pixelsPerSecond);
                  const isSelected = selectedRegionId === region.id;
                  const showFadeHandles = isSelected && activeTool === 'select';
                  const fadeInSamples = fadeInLengths[region.id] ?? region.fadeInLength ?? 0;
                  const fadeOutSamples = fadeOutLengths[region.id] ?? region.fadeOutLength ?? 0;
                  const fadeInPx = fadeInSamples / sampleRate * pixelsPerSecond;
                  const fadeOutPx = fadeOutSamples / sampleRate * pixelsPerSecond;

                  return (
                    <div
                      key={region.id}
                      className={styles.regionBlock}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                        ...(isSelected ? {
                          boxShadow: '0 0 0 2px #4fc3f7',
                          zIndex: 4,
                        } : {}),
                      }}
                      onMouseEnter={() => setHoveredRegionId(region.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedRegionId(region.id);
                        // Double-click always opens floating editor window
                        const winType = region.type === 'midi' ? 'midiEditor' : 'audioEditor';
                        const fw = useUIStore.getState().floatingWindows;
                        if (!fw[winType]) useUIStore.getState().toggleFloatingWindow(winType);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'split') {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickOffsetPx = e.clientX - rect.left;
                          const clickFraction = clickOffsetPx / widthPx;
                          const splitSample = Math.floor(region.position + clickFraction * region.length);
                          ipc.call('daw.split_region', {
                            track_id: track.id,
                            region_id: region.id,
                            position_samples: splitSample,
                          }).then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); });
                        } else if (activeTool === 'erase') {
                          ipc.call('daw.delete_region', {
                            track_id: track.id,
                            region_id: region.id,
                          }).then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); });
                        } else if (activeTool === 'mute') {
                          // Toggle region mute
                          ipc.call('daw.set_region_muted', { region_id: region.id, muted: !(region as any).muted })
                            .then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
                            .catch(err => console.warn('[DAWFLOW] Mute region:', err));
                        } else if (activeTool === 'glue') {
                          // Merge with next adjacent region on same track
                          const trackRegs = (regionsByTrack[track.id] || []).sort((a, b) => a.position - b.position);
                          const idx = trackRegs.findIndex(r => r.id === region.id);
                          if (idx >= 0 && idx < trackRegs.length - 1) {
                            ipc.call('daw.editor.combine_regions', { region_ids: [region.id, trackRegs[idx + 1].id] })
                              .then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
                              .catch(err => console.warn('[DAWFLOW] Glue regions:', err));
                          }
                        } else if (activeTool === 'zoom') {
                          if (e.altKey) {
                            setPixelsPerSecond(prev => Math.max(ZOOM_MIN, prev / 1.4));
                          } else {
                            setPixelsPerSecond(prev => Math.min(ZOOM_MAX, prev * 1.4));
                          }
                        } else if (activeTool === 'color') {
                          ipc.call('daw.set_region_color', { region_id: region.id, color: (track.color || '#5B7FA5').replace('#', '') + 'ff' })
                            .catch(err => console.warn('[DAWFLOW] Color region:', err));
                        } else if (activeTool === 'play') {
                          // Locate to click position and start playback
                          const playRect = e.currentTarget.getBoundingClientRect();
                          const clickSec = Math.max(0, (e.clientX - playRect.left) / pixelsPerSecond);
                          ipc.transportLocate(Math.floor(clickSec * sampleRate)).catch(() => {});
                          ipc.call('daw.transport_roll', { roll: true }).catch(() => {});
                        } else if (activeTool === 'timewarp') {
                          // Select the region — the actual stretching starts from onMouseDown below
                          setSelectedRegionId(region.id);
                        } else {
                          // Default: Select this region
                          setSelectedRegionId(region.id);
                          if (useUIStore.getState().lowerZoneVisible && useUIStore.getState().lowerZoneTab === 'editor') {
                            // Already showing editor — selection change triggers re-render
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        if (activeTool === 'timewarp') {
                          // Time warp: drag from anywhere on the region to stretch
                          e.stopPropagation();
                          e.preventDefault();
                          const regionRect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - regionRect.left;
                          const isRightHalf = clickX >= regionRect.width / 2;
                          const lengthSec = region.length / sampleRate;
                          setTimeWarpDrag({
                            regionId: region.id, trackId: track.id,
                            side: isRightHalf ? 'end' : 'start',
                            origLengthSec: lengthSec, origWidthPx: widthPx,
                            startX: e.clientX, currentWidthPx: widthPx,
                            leftPx: leftPx,
                          });
                          return;
                        }
                        if (activeTool !== 'select') return;
                        // Don't start region-move if an edge drag (fade/trim) is active
                        if (edgeDragActiveRef.current) return;
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggingRegion({
                          trackId: track.id,
                          regionId: region.id,
                          startX: e.clientX,
                          origPosition: region.position,
                        });
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDawContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          items: buildRegionMenu(track.id, region),
                        });
                      }}
                    >
                      <div className={styles.eventTop} style={{ background: track.color }}>
                        <span className={styles.eventLabel}>{region.name}</span>
                      </div>
                      <div className={styles.eventBody} style={{ background: `color-mix(in srgb, ${track.color} 50%, #101418)` }}>
                        {track.type === 'audio' && (
                          <WaveformDisplay
                            trackId={track.id}
                            regionId={region.id}
                            color={track.color}
                            width={widthPx}
                            height={Math.max(10, Math.round((track.height || 80) * trackHeightScale) - 20)}
                            fadeInPx={fadeInPx}
                            fadeOutPx={fadeOutPx}
                          />
                        )}
                        {(track.type === 'midi' || track.type === 'instrument') && (
                          <MidiNoteDisplay
                            trackId={track.id}
                            regionId={region.id}
                            color={track.color}
                            width={widthPx}
                            height={Math.round((track.height || 80) * trackHeightScale) - 20}
                            regionLengthSamples={region.length}
                            sampleRate={sampleRate}
                            tempo={useTransportStore.getState().tempo}
                          />
                        )}
                      </div>
                      {/* Fade overlays — CSS-based for instant visual feedback */}
                      {fadeInPx > 0 && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0,
                          width: `${Math.min(fadeInPx, widthPx)}px`, height: '100%',
                          background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
                          pointerEvents: 'none', zIndex: 2, borderRadius: '3px 0 0 3px',
                        }} />
                      )}
                      {fadeOutPx > 0 && (
                        <div style={{
                          position: 'absolute', top: 0, right: 0,
                          width: `${Math.min(fadeOutPx, widthPx)}px`, height: '100%',
                          background: 'linear-gradient(to left, rgba(0,0,0,0.1), transparent)',
                          pointerEvents: 'none', zIndex: 2, borderRadius: '0 3px 3px 0',
                        }} />
                      )}
                      {/* Fade curve lines */}
                      {fadeInPx > 1 && (() => {
                        const shp = fadeShapesRef.current[region.id]?.in || 'linear';
                        const w = Math.min(fadeInPx, widthPx);
                        // Generate SVG polyline points (absolute coords in 0-100 viewBox)
                        const pts: string[] = [];
                        for (let i = 0; i <= 40; i++) {
                          const t = i / 40;
                          let g: number;
                          if (shp === 'fast') g = 1 - Math.pow(1 - t, 3);
                          else if (shp === 'slow') g = Math.pow(t, 3);
                          else if (shp === 'constant_power') g = Math.sqrt(t);
                          else if (shp === 'symmetric') g = t * t * (3 - 2 * t);
                          else g = t;
                          pts.push(`${(t * 100).toFixed(1)},${((1 - g) * 100).toFixed(1)}`);
                        }
                        return (
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                            style={{ position: 'absolute', top: 0, left: 0, width: `${w}px`, height: '100%', pointerEvents: 'none', zIndex: 3 }}>
                            <polyline points={pts.join(' ')} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                          </svg>
                        );
                      })()}
                      {fadeOutPx > 1 && (() => {
                        const shp = fadeShapesRef.current[region.id]?.out || 'linear';
                        const w = Math.min(fadeOutPx, widthPx);
                        const pts: string[] = [];
                        for (let i = 0; i <= 40; i++) {
                          const t = i / 40;
                          let g: number;
                          if (shp === 'fast') g = 1 - Math.pow(1 - t, 3);
                          else if (shp === 'slow') g = Math.pow(t, 3);
                          else if (shp === 'constant_power') g = Math.sqrt(t);
                          else if (shp === 'symmetric') g = t * t * (3 - 2 * t);
                          else g = t;
                          g = 1 - g; // Invert for fade-out
                          pts.push(`${(t * 100).toFixed(1)},${((1 - g) * 100).toFixed(1)}`);
                        }
                        return (
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                            style={{ position: 'absolute', top: 0, right: 0, width: `${w}px`, height: '100%', pointerEvents: 'none', zIndex: 3 }}>
                            <polyline points={pts.join(' ')} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                          </svg>
                        );
                      })()}
                      {/* Edge handles: upper half = fade, lower half = trim */}
                      {isSelected && activeTool === 'select' && (() => {
                        // Inline fade drag — no useEffect, no stale closures
                        const startFadeDrag = (side: 'in' | 'out', startX: number) => {
                          const rid = region.id;
                          const tid = track.id;
                          const startLen = side === 'in'
                            ? (fadeInLengths[rid] ?? region.fadeInLength ?? 0)
                            : (fadeOutLengths[rid] ?? region.fadeOutLength ?? 0);
                          const shapes = fadeShapesRef.current[rid];
                          const shp = side === 'in' ? (shapes?.in || 'linear') : (shapes?.out || 'linear');
                          let currentLen = startLen;

                          const onMove = (me: MouseEvent) => {
                            const dp = me.clientX - startX;
                            const ds = side === 'in' ? dp / pixelsPerSecond : -dp / pixelsPerSecond;
                            currentLen = Math.max(0, startLen + Math.floor(ds * sampleRate));
                            if (side === 'in') {
                              setFadeInLengths(prev => ({ ...prev, [rid]: currentLen }));
                            } else {
                              setFadeOutLengths(prev => ({ ...prev, [rid]: currentLen }));
                            }
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                            edgeDragActiveRef.current = false;
                            const method = side === 'in' ? 'daw.audio_region.set_fade_in' : 'daw.audio_region.set_fade_out';
                            const fallback = side === 'in' ? 'daw.editor.set_region_fade_in' : 'daw.editor.set_region_fade_out';
                            ipc.call(method, { region_id: rid, length: currentLen, shape: shp })
                              .catch(() => ipc.call(fallback, { region_id: rid, length_samples: currentLen, shape: shp }))
                              .catch((err: unknown) => console.warn('[DAWFLOW] Fade:', err));
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        };

                        const handleEdge = (e: React.MouseEvent, side: 'left' | 'right') => {
                          e.stopPropagation(); e.preventDefault();
                          edgeDragActiveRef.current = true;
                          const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                          const yRatio = (e.clientY - rect.top) / rect.height;
                          if (yRatio < 0.5) {
                            startFadeDrag(side === 'left' ? 'in' : 'out', e.clientX);
                          } else {
                            setTrimDrag({
                              trackId: track.id, regionId: region.id,
                              side: side === 'left' ? 'start' : 'end',
                              startX: e.clientX, origPosition: region.position, origLength: region.length,
                              maxLength: region.sourceLength || region.length,
                            });
                          }
                        };

                        return (
                          <>
                            {/* LEFT EDGE */}
                            <div onMouseDown={(e) => handleEdge(e, 'left')}
                              style={{ position: 'absolute', top: 0, left: 0, width: '7px', height: '100%', cursor: 'ew-resize', zIndex: 6 }}
                              title="Upper: Fade In / Lower: Trim Start"
                            >
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '50%',
                                borderLeft: '2px solid rgba(79, 195, 247, 0.6)', background: 'rgba(79, 195, 247, 0.15)', pointerEvents: 'none' }} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%',
                                borderLeft: '2px solid rgba(255, 180, 80, 0.6)', background: 'rgba(255, 180, 80, 0.1)', pointerEvents: 'none' }} />
                            </div>
                            {/* RIGHT EDGE */}
                            <div onMouseDown={(e) => handleEdge(e, 'right')}
                              style={{ position: 'absolute', top: 0, right: 0, width: '7px', height: '100%', cursor: 'ew-resize', zIndex: 6 }}
                              title="Upper: Fade Out / Lower: Trim End"
                            >
                              <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '50%',
                                borderRight: '2px solid rgba(79, 195, 247, 0.6)', background: 'rgba(79, 195, 247, 0.15)', pointerEvents: 'none' }} />
                              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: '50%',
                                borderRight: '2px solid rgba(255, 180, 80, 0.6)', background: 'rgba(255, 180, 80, 0.1)', pointerEvents: 'none' }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
                {/* Crossfade zone overlays for overlapping regions */}
                {(() => {
                  const regions = regionsByTrack[track.id] || [];
                  if (regions.length < 2) return null;
                  const sorted = [...regions].sort((a, b) => a.position - b.position);
                  const crossfades: Array<{ startPx: number; widthPx: number; regionA: string; regionB: string; regionAName: string; regionBName: string }> = [];
                  for (let i = 0; i < sorted.length - 1; i++) {
                    const a = sorted[i];
                    const b = sorted[i + 1];
                    const aEndSamples = a.position + a.length;
                    if (aEndSamples > b.position) {
                      const startSec = b.position / sampleRate;
                      const endSec = aEndSamples / sampleRate;
                      crossfades.push({
                        startPx: startSec * pixelsPerSecond - scrollLeftPx,
                        widthPx: (endSec - startSec) * pixelsPerSecond,
                        regionA: a.id,
                        regionB: b.id,
                        regionAName: a.name,
                        regionBName: b.name,
                      });
                    }
                  }
                  if (crossfades.length === 0) return null;
                  return crossfades.map((xf, idx) => (
                    <div
                      key={`xfade-${idx}`}
                      className={styles.crossfadeZone}
                      style={{ left: `${xf.startPx}px`, width: `${xf.widthPx}px` }}
                      title={`Crossfade: ${xf.regionAName} / ${xf.regionBName}`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        // Open fade editor for the earlier region's fade-out
                        const shapes = fadeShapesRef.current[xf.regionA];
                        const allRegs = useRegionStore.getState().regionsByTrack;
                        const trackRegs = allRegs[track.id] || [];
                        const regA = trackRegs.find((r) => r.id === xf.regionA);
                        if (regA) {
                          setFadeEditor({
                            trackId: track.id,
                            regionId: regA.id,
                            regionName: regA.name,
                            side: 'out',
                            lengthSamples: fadeOutLengths[regA.id] ?? regA.fadeOutLength ?? 0,
                            shape: shapes?.out || (regA as any).fadeOutShape || 'linear',
                          });
                        }
                      }}
                    />
                  ));
                })()}
                {/* Grid lines — virtual scroll: only visible lines */}
                {(() => {
                  if (beatWidthPx <= 0) return null;
                  const firstVisible = Math.max(0, Math.floor(scrollLeftPx / beatWidthPx) - 1);
                  const visibleCount = Math.ceil(viewportWidthForCalc / beatWidthPx) + 3;
                  return Array.from({ length: visibleCount }, (_, idx) => {
                    const i = firstVisible + idx;
                    const x = i * beatWidthPx - scrollLeftPx;
                    return (
                      <div
                        key={i}
                        className={`${styles.gridLine} ${i % 4 === 0 ? styles.gridLineBar : ''}`}
                        style={{ left: `${x}px` }}
                      />
                    );
                  });
                })()}
              </div>
            </div>
            {/* Track height resize handle */}
            <div
              className={styles.trackResizeHandle}
              onPointerDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startHeight = track.height || 80;
                const onMove = (me: PointerEvent) => {
                  const delta = me.clientY - startY;
                  const newHeight = Math.max(30, Math.min(300, startHeight + delta));
                  setTrackHeight(track.id, newHeight);
                };
                const onUp = () => {
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }}
            />
            {/* Automation lanes below the track's region area */}
            {trackAutoLanes.map((paramType) => {
              const paramInfo = AUTOMATION_PARAMS.find((p) => p.type === paramType);
              return (
                <div key={paramType} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', height: 28 }}>
                    <div style={{ width: TRACK_HEADER_WIDTH, minWidth: TRACK_HEADER_WIDTH, flexShrink: 0 }}>
                      <AutomationLaneHeader
                        trackId={track.id}
                        trackColor={track.color || '#4fc3f7'}
                        paramType={paramType}
                        paramLabel={paramInfo?.label ?? paramType}
                        value={paramType === 'gain' ? track.volume : paramType === 'pan' ? (track.pan + 1) / 2 : 0}
                        readEnabled={track.readAutomation ?? false}
                        writeEnabled={track.writeAutomation ?? false}
                        availableParams={AUTOMATION_PARAMS}
                        onParamChange={(newParam) => {
                          removeAutomationLane(track.id, paramType);
                          toggleAutomationLane(track.id, newParam);
                        }}
                        onValueChange={(val) => {
                          if (paramType === 'gain') {
                            useSessionStore.getState().setTrackVolume(track.id, val);
                          } else if (paramType === 'pan') {
                            useSessionStore.getState().setTrackPan(track.id, val * 2 - 1);
                          }
                        }}
                        onReadToggle={() => {
                          const newMode = track.readAutomation ? 'Manual' : 'Play';
                          engine.automation.setMode(track.id, newMode).catch(() => {});
                        }}
                        onWriteToggle={() => {
                          const newMode = track.writeAutomation ? 'Manual' : 'Write';
                          engine.automation.setMode(track.id, newMode).catch(() => {});
                        }}
                        onClose={() => removeAutomationLane(track.id, paramType)}
                      />
                    </div>
                  </div>
                  <AutomationLane
                    trackId={track.id}
                    paramType={paramType}
                    paramLabel={paramInfo?.label ?? paramType}
                    height={60}
                    pixelsPerSecond={pixelsPerSecond}
                    scrollLeft={0}
                    color={track.color || '#4fc3f7'}
                    onClose={() => removeAutomationLane(track.id, paramType)}
                  />
                </div>
              );
            })}
            </div>
            );
          })}
          {/* Bottom spacer for virtualized tracks below the visible range */}
          <div style={{ height: Math.max(0, totalTrackListHeight - ((trackPositions[visibleTrackRange.end - 1]?.top ?? 0) + (trackPositions[visibleTrackRange.end - 1]?.height ?? 0))), flexShrink: 0 }} />
        </div>

        {/* Range tool drag overlay (local state during drag — pointer-events: none) */}
        {rangeDrag && activeTool === 'range' && rangeDrag.endSample > rangeDrag.startSample && (() => {
          const rLeftPx = TRACK_HEADER_WIDTH + (rangeDrag.startSample / sampleRate) * pixelsPerSecond - scrollLeftPx;
          const rWidthPx = ((rangeDrag.endSample - rangeDrag.startSample) / sampleRate) * pixelsPerSecond;
          return (
            <div
              className={styles.rangeOverlay}
              style={{ left: `${rLeftPx}px`, width: `${Math.max(2, rWidthPx)}px` }}
            />
          );
        })()}

        {/* Committed range selection overlay (from zustand store — interactive for right-click) */}
        {!rangeDrag && rangeSelection && rangeSelection.endSample > rangeSelection.startSample && (() => {
          const rLeftPx = TRACK_HEADER_WIDTH + (rangeSelection.startSample / sampleRate) * pixelsPerSecond - scrollLeftPx;
          const rWidthPx = ((rangeSelection.endSample - rangeSelection.startSample) / sampleRate) * pixelsPerSecond;
          return (
            <div
              className={styles.rangeOverlayCommitted}
              style={{ left: `${rLeftPx}px`, width: `${Math.max(2, rWidthPx)}px` }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rangeMenuItems: MenuItem[] = [
                  {
                    label: 'Bounce Selection',
                    onClick: () => {
                      ipc.call('daw.bounce_range', {
                        track_id: selectedTrackId || '',
                        start_samples: rangeSelection.startSample,
                        end_samples: rangeSelection.endSample,
                      }).then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
                        .catch((err: unknown) => console.warn('[DAWFLOW] Bounce range:', err));
                    },
                  },
                  {
                    label: 'Consolidate',
                    onClick: () => {
                      ipc.call('daw.consolidate_range', {
                        track_id: selectedTrackId || '',
                        start_samples: rangeSelection.startSample,
                        end_samples: rangeSelection.endSample,
                      }).then(() => { resetFetchDebounce(); useSessionStore.getState().fetchFromEngine(); })
                        .catch((err: unknown) => console.warn('[DAWFLOW] Consolidate range:', err));
                    },
                  },
                  { label: '', separator: true, onClick: () => {} },
                  {
                    label: 'Set Loop from Selection',
                    onClick: () => {
                      ipc.call('daw.set_loop_range', {
                        start_sample: rangeSelection.startSample,
                        end_sample: rangeSelection.endSample,
                      }).then(() => {
                        const startSec = rangeSelection.startSample / sampleRate;
                        const endSec = rangeSelection.endSample / sampleRate;
                        useTransportStore.getState().setLeftLocator(startSec);
                        useTransportStore.getState().setRightLocator(endSec);
                      }).catch((err: unknown) => console.warn('[DAWFLOW] Set loop range:', err));
                    },
                  },
                  {
                    label: 'Crop to Selection',
                    onClick: () => {
                      const startSec = rangeSelection.startSample / sampleRate;
                      const endSec = rangeSelection.endSample / sampleRate;
                      useTransportStore.getState().setLeftLocator(startSec);
                      useTransportStore.getState().setRightLocator(endSec);
                    },
                  },
                ];
                setDawContextMenu({ x: e.clientX, y: e.clientY, items: rangeMenuItems });
              }}
            />
          );
        })()}

        {/* Locator range overlay */}
        {hasLocatorRange && (
          <div
            className={styles.locatorRange}
            style={{
              left: `${TRACK_HEADER_WIDTH + leftLocPx - scrollLeftPx}px`,
              width: `${rightLocPx - leftLocPx}px`,
            }}
          />
        )}

        {/* Left locator vertical line */}
        {(leftLocator > 0 || hasLocatorRange) && (
          <div
            className={`${styles.locatorLine} ${styles.locatorLineL}`}
            style={{ left: `${TRACK_HEADER_WIDTH + leftLocPx - scrollLeftPx}px` }}
          />
        )}

        {/* Right locator vertical line */}
        {(rightLocator > 0 || hasLocatorRange) && (
          <div
            className={`${styles.locatorLine} ${styles.locatorLineR}`}
            style={{ left: `${TRACK_HEADER_WIDTH + rightLocPx - scrollLeftPx}px` }}
          />
        )}

        {/* Drop position indicator */}
        {isDragOver && dropIndicatorX !== null && (
          <div
            className={styles.dropIndicator}
            style={{ left: `${dropIndicatorX}px` }}
          />
        )}

        {/* Playhead */}
        <div
          className={styles.playhead}
          style={{ left: `${TRACK_HEADER_WIDTH + position * pixelsPerSecond - scrollLeftPx}px` }}
        />
      </div>

      {/* Right vertical scrollbar */}
      <div className={styles.rightScrollBar}>
        {/* Tool indicator */}
        <button className={`${styles.scrollBtn} ${styles.vScrollBtn}`} title="Draw tool">
          <span style={{ fontSize: 9 }}>&#9998;</span>
        </button>
        {/* Snap indicator */}
        <button className={`${styles.scrollBtn} ${styles.vScrollBtn}`} title="Snap">
          <span style={{ fontSize: 8 }}>&#9679;</span>
        </button>
        {/* Up arrow */}
        <button
          className={`${styles.scrollBtn} ${styles.vScrollBtn}`}
          title="Scroll Up"
          onClick={() => {
            const el = trackAreaRef.current;
            if (el) el.scrollTop = Math.max(0, el.scrollTop - el.clientHeight * 0.25);
          }}
        >&#9652;</button>
        {/* Vertical scroll track + thumb */}
        <div
          ref={vScrollTrackRef}
          className={styles.vScrollTrack}
          onMouseDown={(e) => {
            // Click on track: jump to position
            const el = trackAreaRef.current;
            if (!el) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickY = (e.clientY - rect.top) / rect.height;
            const maxScroll = el.scrollHeight - el.clientHeight;
            el.scrollTop = clickY * maxScroll;
            setVScrollFraction(clickY);
          }}
        >
          {(() => {
            const el = trackAreaRef.current;
            const scrollTrackEl = vScrollTrackRef.current;
            const totalH = el ? el.scrollHeight : 1;
            const visH = el ? el.clientHeight : 1;
            const trackH = scrollTrackEl ? scrollTrackEl.clientHeight : 100;
            const thumbH = Math.max(16, (visH / Math.max(totalH, 1)) * trackH);
            const thumbTop = vScrollFraction * (trackH - thumbH);
            return (
              <div
                className={styles.vScrollThumb}
                style={{ top: `${Math.max(0, thumbTop)}px`, height: `${thumbH}px` }}
                onMouseDown={handleVScrollThumbDrag}
              />
            );
          })()}
        </div>
        {/* Down arrow */}
        <button
          className={`${styles.scrollBtn} ${styles.vScrollBtn}`}
          title="Scroll Down"
          onClick={() => {
            const el = trackAreaRef.current;
            if (el) el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + el.clientHeight * 0.25);
          }}
        >&#9662;</button>
        {/* Dropdown */}
        <button className={`${styles.scrollBtn} ${styles.vScrollBtn}`} title="Options">&#9660;</button>
        {/* Vertical zoom */}
        <div className={styles.vZoomArea}>
          <button
            className={styles.zoomBtn}
            onClick={() => setTrackHeightScale((prev) => Math.max(VSCALE_MIN, prev - 0.25))}
            title="Zoom Out Vertically"
          >&minus;</button>
          <input
            type="range"
            className={styles.vZoomSlider}
            min={VSCALE_MIN * 100}
            max={VSCALE_MAX * 100}
            value={trackHeightScale * 100}
            onChange={(e) => setTrackHeightScale(Number(e.target.value) / 100)}
            title={`Track zoom: ${Math.round(trackHeightScale * 100)}%`}
          />
          <button
            className={styles.zoomBtn}
            onClick={() => setTrackHeightScale((prev) => Math.min(VSCALE_MAX, prev + 0.25))}
            title="Zoom In Vertically"
          >+</button>
        </div>
      </div>
      </div>{/* end trackAreaWrapper */}

      {/* Bottom horizontal scrollbar row */}
      <div className={styles.bottomScrollBarRow}>
        <div className={styles.bottomScrollBar}>
          {/* Left arrow */}
          <button
            className={`${styles.scrollBtn} ${styles.hScrollBtn}`}
            onClick={() => setHScrollFraction((prev) => Math.max(0, prev - 0.05))}
            title="Scroll Left"
          >&#9666;</button>
          {/* Horizontal scroll track + thumb */}
          <div
            className={styles.hScrollTrack}
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = (e.clientX - rect.left) / rect.width;
              setHScrollFraction(Math.max(0, Math.min(1, clickX)));
            }}
          >
            {(() => {
              // Compute thumb width and position
              const visibleFraction = 1 / Math.max(1, totalTimelineWidthPx / (typeof window !== 'undefined' ? window.innerWidth - TRACK_HEADER_WIDTH - 22 : 800));
              const thumbWidthPercent = Math.max(4, Math.min(100, visibleFraction * 100));
              const maxLeftPercent = 100 - thumbWidthPercent;
              const thumbLeftPercent = hScrollFraction * maxLeftPercent;
              return (
                <div
                  className={styles.hScrollThumb}
                  style={{
                    left: `${thumbLeftPercent}%`,
                    width: `${thumbWidthPercent}%`,
                  }}
                  onMouseDown={handleHScrollThumbDrag}
                />
              );
            })()}
          </div>
          {/* Right arrow */}
          <button
            className={`${styles.scrollBtn} ${styles.hScrollBtn}`}
            onClick={() => setHScrollFraction((prev) => Math.min(1, prev + 0.05))}
            title="Scroll Right"
          >&#9656;</button>
          {/* Dropdown */}
          <button className={`${styles.scrollBtn} ${styles.hScrollBtn}`} title="Options">&#9660;</button>
          {/* Horizontal zoom controls */}
          <div className={styles.hZoomArea}>
            <button
              className={styles.zoomBtn}
              onClick={handleZoomOut}
              title="Zoom Out"
            >&minus;</button>
            <input
              type="range"
              className={styles.hZoomSlider}
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              value={pixelsPerSecond}
              onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
              title={`Zoom: ${Math.round(pixelsPerSecond)}px/s`}
            />
            <button
              className={styles.zoomBtn}
              onClick={handleZoomIn}
              title="Zoom In"
            >+</button>
          </div>
        </div>
        {/* Corner filler */}
        <div className={styles.scrollCorner} />
      </div>

      {/* Context Menu (existing Cubase-style for track area background) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* DAW Context Menu (track header, region, empty timeline) */}
      {dawContextMenu && (
        <DawContextMenu
          x={dawContextMenu.x}
          y={dawContextMenu.y}
          items={dawContextMenu.items}
          onClose={() => setDawContextMenu(null)}
        />
      )}

      {/* Track Color Picker popup */}
      {colorPicker && (
        <TrackColorPicker
          x={colorPicker.x}
          y={colorPicker.y}
          currentColor={
            tracks.find((t) => t.id === colorPicker.trackId)?.color || ''
          }
          onColorSelect={handleColorSelect}
          onClose={() => setColorPicker(null)}
        />
      )}

      {/* Fade Editor Dialog (Shift+X) */}
      {fadeEditor && (
        <FadeEditorDialog
          trackId={fadeEditor.trackId}
          regionId={fadeEditor.regionId}
          regionName={fadeEditor.regionName}
          side={fadeEditor.side}
          currentLengthSamples={fadeEditor.lengthSamples}
          currentShape={fadeEditor.shape}
          sampleRate={sampleRate}
          onApply={(side, lengthSamples, shape) => {
            // Update local fade state so waveform redraws with fade
            if (side === 'in') {
              setFadeInLengths((prev) => ({ ...prev, [fadeEditor.regionId]: lengthSamples }));
            } else {
              setFadeOutLengths((prev) => ({ ...prev, [fadeEditor.regionId]: lengthSamples }));
            }
            // Store the shape so handle drags preserve it
            const prev = fadeShapesRef.current[fadeEditor.regionId] || { in: 'linear', out: 'linear' };
            fadeShapesRef.current[fadeEditor.regionId] = { ...prev, [side]: shape };
          }}
          onClose={() => {
            // If we just closed fade-in, open fade-out next
            if (fadeEditor.side === 'in') {
              const shapes = fadeShapesRef.current[fadeEditor.regionId];
              // Find region to get stored fade data
              const allRegs = useRegionStore.getState().regionsByTrack;
              let reg: any = null;
              for (const regs of Object.values(allRegs)) {
                reg = regs.find((r: any) => r.id === fadeEditor.regionId);
                if (reg) break;
              }
              setFadeEditor({
                ...fadeEditor,
                side: 'out',
                lengthSamples: fadeOutLengths[fadeEditor.regionId] ?? reg?.fadeOutLength ?? 0,
                shape: shapes?.out || reg?.fadeOutShape || 'linear',
              });
              return;
            }
            setFadeEditor(null);
          }}
        />
      )}
    </div>
  );
};
