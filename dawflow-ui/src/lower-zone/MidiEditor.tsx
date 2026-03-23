/**
 * MidiEditor — Cubase 15 Pro Key Editor
 *
 * Full piano-roll MIDI editor with:
 *  - Piano keyboard (left, 60px)
 *  - Note grid with semitone rows + beat/bar grid lines
 *  - Colored note blocks (trackColor) with velocity-based opacity
 *  - Velocity / CC lane (bottom, resizable, switchable)
 *  - Stackable CC lanes with random colors
 *  - Full Cubase tool set with right-click tool popup
 *  - Scoped keyboard shortcuts
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './MidiEditor.module.css';
import { ipc } from '../services/ipc';
import { useTransportStore } from '../stores/transport';
import { useSessionStore } from '../stores/session';
import { useRegionStore } from '../stores/regions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTE_HEIGHT = 14;
const TOTAL_KEYS = 128;
const TOTAL_HEIGHT = TOTAL_KEYS * NOTE_HEIGHT;
const MIN_PIXELS_PER_BEAT = 10;
const MAX_PIXELS_PER_BEAT = 200;
const DEFAULT_VELOCITY = 100;
const DEFAULT_NOTE_LENGTH = 1;

const CC_NAMES: Record<number, string> = {
  1: 'Modulation', 7: 'Volume', 10: 'Pan', 11: 'Expression',
  64: 'Sustain', 74: 'Filter Cutoff',
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10]);

const QUANTIZE_OPTIONS: { label: string; beats: number }[] = [
  { label: '1/1', beats: 4 }, { label: '1/2', beats: 2 }, { label: '1/4', beats: 1 },
  { label: '1/8', beats: 0.5 }, { label: '1/16', beats: 0.25 }, { label: '1/32', beats: 0.125 },
];

// Cubase lane type options
const LANE_TYPE_OPTIONS = [
  { value: 'velocity', label: 'Velocity' },
  { value: 'cc1', label: 'CC 1 - Modulation', cc: 1 },
  { value: 'cc7', label: 'CC 7 - Volume', cc: 7 },
  { value: 'cc10', label: 'CC 10 - Pan', cc: 10 },
  { value: 'cc11', label: 'CC 11 - Expression', cc: 11 },
  { value: 'cc64', label: 'CC 64 - Sustain', cc: 64 },
  { value: 'cc74', label: 'CC 74 - Cutoff', cc: 74 },
  { value: 'pitchbend', label: 'Pitchbend' },
];

// Random distinct colors for CC lanes
const CC_LANE_COLORS = [
  '#e05050', '#50b050', '#5080e0', '#e0a030', '#a050d0',
  '#50c0c0', '#d060a0', '#80b040', '#c07030', '#6070c0',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MidiNote {
  id: string;
  pitch: number;
  velocity: number;
  time: number;
  length: number;
  channel: number;
  muted?: boolean;
}

type EditorTool = 'select' | 'range' | 'draw' | 'line' | 'trim' | 'glue' | 'erase' | 'timewarp' | 'zoom' | 'mute' | 'play';

interface MidiEditorProps {
  regionId: string;
  trackId: string;
  trackColor: string;
}

interface CcLane {
  id: string;
  type: string; // 'velocity' | 'cc1' | 'cc7' | etc
  cc?: number;
  color: string;
  height: number;
  data: { time: number; value: number }[];
}

// ---------------------------------------------------------------------------
// Tool definitions with SVG icons
// ---------------------------------------------------------------------------

const TOOLS: { id: EditorTool; label: string; key: string; icon: React.ReactNode }[] = [
  { id: 'select', label: 'Object Selection', key: '1', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1L3 11L6 8L9 11.5L10 10.5L7 7L11 6.5L3 1Z" fill="currentColor"/></svg>
  )},
  { id: 'range', label: 'Range Selection', key: '2', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="2" width="1.5" height="10" fill="currentColor"/><rect x="9.5" y="2" width="1.5" height="10" fill="currentColor"/><rect x="4.5" y="5" width="5" height="4" fill="currentColor" opacity="0.4"/></svg>
  )},
  { id: 'draw', label: 'Draw', key: '3', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12L3.5 8.5L10 2L12 4L5.5 10.5L2 12Z" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
  )},
  { id: 'line', label: 'Line', key: '4', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="11" x2="12" y2="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="2" cy="11" r="1.5" fill="currentColor"/><circle cx="12" cy="3" r="1.5" fill="currentColor"/></svg>
  )},
  { id: 'trim', label: 'Trim', key: '5', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="5" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/><line x1="5" y1="3" x2="5" y2="11" stroke="currentColor" strokeWidth="1.2"/></svg>
  )},
  { id: 'glue', label: 'Glue', key: '6', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2L5 6L3 8L3 12L11 12L11 8L9 6L9 2Z" stroke="currentColor" strokeWidth="1.2" fill="none"/><line x1="3" y1="9.5" x2="11" y2="9.5" stroke="currentColor" strokeWidth="0.8"/></svg>
  )},
  { id: 'erase', label: 'Erase', key: '7', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="5" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" transform="rotate(-15 7 7.5)"/><line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1"/></svg>
  )},
  { id: 'timewarp', label: 'Time Warp', key: '8', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2C6 5 8 9 11 12" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M1 7L4 5L4 9Z" fill="currentColor"/><path d="M13 7L10 5L10 9Z" fill="currentColor"/></svg>
  )},
  { id: 'zoom', label: 'Zoom', key: '9', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/><line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.3"/><line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1"/><line x1="6" y1="4" x2="6" y2="8" stroke="currentColor" strokeWidth="1"/></svg>
  )},
  { id: 'mute', label: 'Mute', key: '0', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5"/></svg>
  )},
  { id: 'play', label: 'Play', key: '', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 2L12 7L4 12Z" fill="currentColor"/></svg>
  )},
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function midiNoteToName(pitch: number): string {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}
function isBlackKey(pitch: number): boolean { return BLACK_KEY_INDICES.has(pitch % 12); }
function isCNote(pitch: number): boolean { return pitch % 12 === 0; }
function pitchToY(pitch: number): number { return (127 - pitch) * NOTE_HEIGHT; }
function yToPitch(y: number): number { return Math.max(0, Math.min(127, 127 - Math.floor(y / NOTE_HEIGHT))); }
function quantizeTime(time: number, grid: number): number {
  if (grid <= 0) return time;
  return Math.round(time / grid) * grid;
}
function darkenColor(hex: string, factor: number): string {
  const c = hex.replace('#', '');
  const r = Math.round(parseInt(c.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(c.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(c.substring(4, 6), 16) * factor);
  return `rgb(${r},${g},${b})`;
}
function velocityToColor(velocity: number): string {
  const t = velocity / 127;
  return `rgb(${Math.round(58 + t * 166)},${Math.round(123 + t * -43)},${Math.round(213 + t * -133)})`;
}
function randomLaneColor(): string {
  return CC_LANE_COLORS[Math.floor(Math.random() * CC_LANE_COLORS.length)];
}

// Cursor data URIs per tool
const TOOL_CURSORS: Record<EditorTool, string> = {
  select: 'default',
  range: 'text',
  draw: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\'%3E%3Cpath d=\'M12.1 1.3l2.6 2.6-9.7 9.7L2 15l1.4-3z\' fill=\'%23fff\' stroke=\'%23000\' stroke-width=\'.5\'/%3E%3C/svg%3E") 0 16, crosshair',
  line: 'crosshair',
  trim: 'col-resize',
  glue: 'copy',
  erase: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\'%3E%3Crect x=\'2\' y=\'2\' width=\'12\' height=\'12\' rx=\'1\' fill=\'%23c43030\' opacity=\'.8\'/%3E%3Cline x1=\'5\' y1=\'5\' x2=\'11\' y2=\'11\' stroke=\'white\' stroke-width=\'1.5\'/%3E%3Cline x1=\'11\' y1=\'5\' x2=\'5\' y2=\'11\' stroke=\'white\' stroke-width=\'1.5\'/%3E%3C/svg%3E") 8 8, crosshair',
  timewarp: 'ew-resize',
  zoom: 'zoom-in',
  mute: 'pointer',
  play: 'pointer',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MidiEditor: React.FC<MidiEditorProps> = ({ regionId, trackId, trackColor }) => {
  const transportPosition = useTransportStore((s) => s.position);
  const sampleRate = useSessionStore((s) => s.sampleRate) || 48000;
  const tempo = useTransportStore((s) => s.tempo) || 120;
  const allRegions = useRegionStore((s) => s.regionsByTrack[trackId]);
  const regionData = allRegions?.find((r) => r.id === regionId);
  const regionStartSamples = regionData?.position || 0;
  const regionStartSeconds = regionStartSamples / sampleRate;

  // ---- State ----
  const [notes, setNotes] = useState<MidiNote[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<EditorTool>('draw');
  const [scrollY, setScrollY] = useState(60 * NOTE_HEIGHT);
  const [scrollX, setScrollX] = useState(0);
  const [pixelsPerBeat, setPixelsPerBeat] = useState(40);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [quantizeValue, setQuantizeValue] = useState(0.25);
  const [quantizeLabel, setQuantizeLabel] = useState('1/16');

  // Drag state
  const [dragging, setDragging] = useState<{
    type: 'move' | 'resize' | 'draw' | 'velocity-paint' | 'marquee' | 'cc-draw';
    noteId?: string;
    startX: number;
    startY: number;
    origTime?: number;
    origPitch?: number;
    origLength?: number;
    altDuplicate?: boolean;
    currentX?: number;
    currentY?: number;
    laneId?: string;
  } | null>(null);

  // Bottom lanes: first lane is always present (defaults to velocity)
  const [bottomLanes, setBottomLanes] = useState<CcLane[]>([
    { id: 'lane-0', type: 'velocity', color: '#e05050', height: 80, data: [] },
  ]);

  // Line tool sub-mode
  type LineMode = 'line' | 'parabola' | 'sine' | 'triangle' | 'square' | 'paint';
  const [lineMode, setLineMode] = useState<LineMode>('line');
  const [lineDropdownOpen, setLineDropdownOpen] = useState(false);

  // Transform dropdown
  const [transformDropdownOpen, setTransformDropdownOpen] = useState(false);

  // Right-click tool popup
  const [toolPopup, setToolPopup] = useState<{ x: number; y: number; hoveredTool: EditorTool | null } | null>(null);
  const toolPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lane divider resize
  const [laneDivDrag, setLaneDivDrag] = useState<{ laneId: string; startY: number; origHeight: number } | null>(null);

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- Derived ----
  const totalBeats = useMemo(() => {
    if (notes.length === 0) return 64;
    const maxEnd = Math.max(...notes.map(n => n.time + n.length));
    return Math.max(64, Math.ceil(maxEnd / 4) * 4 + 16);
  }, [notes]);
  const gridWidth = totalBeats * pixelsPerBeat;

  // ---- Parse + Fetch ----
  const parseEngineNotes = useCallback((data: any): MidiNote[] => {
    const raw = Array.isArray(data) ? data : (data?.notes || []);
    return raw.map((n: any) => ({
      id: String(n.id ?? `${n.note ?? n.pitch}_${n.start_beats ?? n.start ?? n.time}`),
      pitch: n.note ?? n.pitch ?? 60,
      velocity: n.velocity ?? 100,
      time: n.start_beats ?? n.start ?? n.time ?? 0,
      length: n.length_beats ?? n.length ?? 0.25,
      channel: n.channel ?? 0,
      muted: n.muted ?? false,
    }));
  }, []);

  const refetchNotes = useCallback(() => {
    ipc.getMidiNotes(regionId, trackId)
      .then((data: any) => setNotes(parseEngineNotes(data)))
      .catch(() => setNotes([]));
  }, [regionId, trackId, parseEngineNotes]);

  useEffect(() => { refetchNotes(); setSelectedNoteIds(new Set()); }, [refetchNotes]);

  // Cross-editor sync
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.regionId === regionId) refetchNotes();
    };
    window.addEventListener('dawflow:midi-notes-changed', handler);
    return () => window.removeEventListener('dawflow:midi-notes-changed', handler);
  }, [regionId, refetchNotes]);

  const dispatchChanged = useCallback(() => {
    window.dispatchEvent(new CustomEvent('dawflow:midi-notes-changed', { detail: { regionId } }));
  }, [regionId]);

  // Close line dropdown on outside click
  useEffect(() => {
    if (!lineDropdownOpen) return;
    const handler = () => setLineDropdownOpen(false);
    // Delay to avoid closing immediately on the click that opened it
    const timer = setTimeout(() => document.addEventListener('click', handler, { once: true }), 100);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [lineDropdownOpen]);

  // Close transform dropdown on outside click
  useEffect(() => {
    if (!transformDropdownOpen) return;
    const handler = () => setTransformDropdownOpen(false);
    const timer = setTimeout(() => document.addEventListener('click', handler, { once: true }), 100);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [transformDropdownOpen]);

  // ---- Scroll ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      setScrollX(prev => Math.max(0, prev + e.deltaY));
    } else if (e.ctrlKey || e.metaKey) {
      setPixelsPerBeat(prev => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        return Math.max(MIN_PIXELS_PER_BEAT, Math.min(MAX_PIXELS_PER_BEAT, prev * factor));
      });
    } else {
      setScrollY(prev => Math.max(0, Math.min(TOTAL_HEIGHT - 200, prev + e.deltaY)));
    }
  }, []);

  // ---- Grid click (draw/erase/select/mute/glue/zoom) ----
  const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top + scrollY;
    const pitch = yToPitch(y);
    const rawTime = x / pixelsPerBeat;
    const time = snapEnabled ? quantizeTime(rawTime, quantizeValue) : rawTime;

    if (tool === 'draw') {
      const newNote: MidiNote = {
        id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        pitch, velocity: DEFAULT_VELOCITY, time: Math.max(0, time),
        length: DEFAULT_NOTE_LENGTH, channel: 0,
      };
      setNotes(prev => [...prev, newNote]);
      setSelectedNoteIds(new Set([newNote.id]));
      setDragging({ type: 'draw', noteId: newNote.id, startX: e.clientX, startY: e.clientY, origTime: newNote.time, origLength: DEFAULT_NOTE_LENGTH });
    } else if (tool === 'select') {
      if (!e.shiftKey) setSelectedNoteIds(new Set());
      setDragging({ type: 'marquee', startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
    } else if (tool === 'zoom') {
      if (e.altKey) {
        setPixelsPerBeat(prev => Math.max(MIN_PIXELS_PER_BEAT, prev * 0.7));
      } else {
        setPixelsPerBeat(prev => Math.min(MAX_PIXELS_PER_BEAT, prev * 1.4));
      }
    } else if (tool === 'line' || tool === 'trim' || tool === 'range') {
      // These tools don't interact with the note grid directly — no-op to avoid crash
    }
  }, [tool, scrollX, scrollY, pixelsPerBeat, snapEnabled, quantizeValue]);

  // ---- Note click handlers ----
  const handleNoteMouseDown = useCallback((e: React.MouseEvent, note: MidiNote) => {
    e.stopPropagation();

    if (tool === 'erase') {
      setNotes(prev => prev.filter(n => n.id !== note.id));
      setSelectedNoteIds(prev => { const next = new Set(prev); next.delete(note.id); return next; });
      const engineId = Number(note.id);
      if (!isNaN(engineId) && engineId >= 0) {
        ipc.midiDeleteNote(trackId, regionId, engineId).then(() => dispatchChanged()).catch(() => {});
      }
      return;
    }

    if (tool === 'mute') {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, muted: !n.muted } : n));
      return;
    }

    if (tool === 'glue') {
      // Glue: merge with the next note of same pitch
      const sorted = [...notes].filter(n => n.pitch === note.pitch).sort((a, b) => a.time - b.time);
      const idx = sorted.findIndex(n => n.id === note.id);
      if (idx >= 0 && idx < sorted.length - 1) {
        const next = sorted[idx + 1];
        const newLength = (next.time + next.length) - note.time;
        setNotes(prev => prev.filter(n => n.id !== next.id).map(n => n.id === note.id ? { ...n, length: newLength } : n));
        const nextEngineId = Number(next.id);
        if (!isNaN(nextEngineId) && nextEngineId > 0) {
          ipc.midiDeleteNote(trackId, regionId, nextEngineId).catch(() => {});
        }
        const noteEngineId = Number(note.id);
        if (!isNaN(noteEngineId) && noteEngineId >= 0) {
          ipc.midiMoveNote(trackId, regionId, noteEngineId, { new_length_beats: newLength }).then(() => dispatchChanged()).catch(() => {});
        }
      }
      return;
    }

    if (tool === 'select' || tool === 'draw') {
      if (e.shiftKey) {
        setSelectedNoteIds(prev => {
          const next = new Set(prev);
          if (next.has(note.id)) next.delete(note.id); else next.add(note.id);
          return next;
        });
      } else {
        if (!selectedNoteIds.has(note.id)) setSelectedNoteIds(new Set([note.id]));
      }

      if (e.altKey) {
        // Alt+drag: duplicate — create a clone immediately, drag the clone
        const cloneId = `clone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const clone: MidiNote = { ...note, id: cloneId };
        setNotes(prev => [...prev, clone]);
        setSelectedNoteIds(new Set([cloneId]));
        setDragging({
          type: 'move', noteId: cloneId, startX: e.clientX, startY: e.clientY,
          origTime: note.time, origPitch: note.pitch, altDuplicate: true,
        });
      } else {
        setDragging({
          type: 'move', noteId: note.id, startX: e.clientX, startY: e.clientY,
          origTime: note.time, origPitch: note.pitch,
        });
      }
    }
  }, [tool, selectedNoteIds, trackId, regionId, notes, dispatchChanged]);

  // ---- Resize handle ----
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, note: MidiNote) => {
    e.stopPropagation();
    if (tool !== 'select' && tool !== 'draw' && tool !== 'trim') return;
    setDragging({ type: 'resize', noteId: note.id, startX: e.clientX, startY: e.clientY, origLength: note.length });
  }, [tool]);

  // ---- Global mouse move/up for dragging ----
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.type === 'move' && dragging.noteId != null) {
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        const dBeats = dx / pixelsPerBeat;
        const dPitch = -Math.round(dy / NOTE_HEIGHT);

        setNotes(prev => prev.map(n => {
          if (n.id !== dragging.noteId) return n;
          let newTime = (dragging.origTime ?? n.time) + dBeats;
          let newPitch = (dragging.origPitch ?? n.pitch) + dPitch;
          if (snapEnabled) newTime = quantizeTime(newTime, quantizeValue);
          return { ...n, time: Math.max(0, newTime), pitch: Math.max(0, Math.min(127, newPitch)) };
        }));
      } else if ((dragging.type === 'resize' || dragging.type === 'draw') && dragging.noteId != null) {
        const dx = e.clientX - dragging.startX;
        const dBeats = dx / pixelsPerBeat;
        const newLength = Math.max(snapEnabled ? quantizeValue : 0.0625, (dragging.origLength ?? DEFAULT_NOTE_LENGTH) + dBeats);
        setNotes(prev => prev.map(n =>
          n.id === dragging.noteId ? { ...n, length: snapEnabled ? quantizeTime(newLength, quantizeValue) || quantizeValue : newLength } : n
        ));
      } else if (dragging.type === 'marquee') {
        setDragging(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      } else if (dragging.type === 'velocity-paint') {
        // Paint velocity — trigger only at the note whose vel bar start is under cursor
        const velAreaEl = containerRef.current?.querySelector('[data-lane-id="lane-0"]') as HTMLElement;
        if (!velAreaEl) return;
        const velRect = velAreaEl.getBoundingClientRect();
        const y = e.clientY - velRect.top;
        const vel = Math.max(1, Math.min(127, Math.round((1 - y / velRect.height) * 127)));
        const x = e.clientX - velRect.left + scrollX;
        // Use functional update so we read current notes, not stale closure
        setNotes(prev => {
          // Find note whose velocity bar start position is closest to cursor X
          // Vel bars are rendered at note.time * pixelsPerBeat, width 4px
          let closestId: string | null = null;
          let closestDist = Infinity;
          prev.forEach(n => {
            const barX = n.time * pixelsPerBeat;
            const dist = Math.abs(x - barX);
            if (dist < 12 && dist < closestDist) {
              closestDist = dist;
              closestId = n.id;
            }
          });
          if (!closestId) return prev;
          return prev.map(n => n.id === closestId ? { ...n, velocity: vel } : n);
        });
      } else if (dragging.type === 'cc-draw' && dragging.laneId) {
        // Freehand CC drawing — add point at cursor, replace nearby
        try {
          const laneEl = containerRef.current?.querySelector(`[data-lane-id="${dragging.laneId}"]`) as HTMLElement;
          if (!laneEl) return;
          const rect = laneEl.getBoundingClientRect();
          if (rect.height <= 0) return;
          const x = e.clientX - rect.left + scrollX;
          const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
          let time = x / pixelsPerBeat;
          time = Math.max(0, time);
          const value = Math.max(0, Math.min(127, Math.round((1 - y / rect.height) * 127)));

          setBottomLanes(prev => prev.map(lane => {
            if (lane.id !== dragging.laneId) return lane;
            // Replace any point very close in time, add new point
            const threshold = 0.05; // ~3px at typical zoom
            const filtered = lane.data.filter(p => Math.abs(p.time - time) > threshold);
            const updated = [...filtered, { time, value }];
            // Keep sorted, cap at 800
            updated.sort((a, b) => a.time - b.time);
            if (updated.length > 800) {
              // Thin out: keep every other point in the middle
              const keep = [updated[0]];
              for (let i = 1; i < updated.length - 1; i += 2) keep.push(updated[i]);
              keep.push(updated[updated.length - 1]);
              return { ...lane, data: keep };
            }
            return { ...lane, data: updated };
          }));
        } catch { /* guard */ }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragging.type === 'draw' && dragging.noteId) {
        const drawnNote = notes.find(n => n.id === dragging.noteId);
        if (drawnNote) {
          ipc.midiAddNote(trackId, regionId, drawnNote.pitch, drawnNote.time, drawnNote.length, drawnNote.velocity, drawnNote.channel)
            .then(() => ipc.getMidiNotes(regionId, trackId))
            .then((data: any) => { setNotes(parseEngineNotes(data)); dispatchChanged(); })
            .catch(() => {});
        }
      } else if (dragging.type === 'resize' && dragging.noteId) {
        const resizedNote = notes.find(n => n.id === dragging.noteId);
        if (resizedNote) {
          const engineId = Number(resizedNote.id);
          if (!isNaN(engineId) && engineId >= 0) {
            ipc.midiMoveNote(trackId, regionId, engineId, { new_length_beats: resizedNote.length })
              .then(() => dispatchChanged()).catch(() => {});
          }
        }
      } else if (dragging.type === 'move' && dragging.noteId) {
        // Commit the moved note — use functional update to read latest state
        setNotes(currentNotes => {
          const movedNote = currentNotes.find(n => n.id === dragging.noteId);
          if (!movedNote) return currentNotes;

          if (dragging.altDuplicate) {
            // It's a clone — add to engine, then refetch
            ipc.midiAddNote(trackId, regionId, movedNote.pitch, movedNote.time, movedNote.length, movedNote.velocity, movedNote.channel)
              .then(() => { refetchNotes(); dispatchChanged(); })
              .catch(() => {});
          } else {
            // Regular move — commit to engine
            const engineId = Number(movedNote.id);
            if (!isNaN(engineId) && engineId >= 0) {
              ipc.midiMoveNote(trackId, regionId, engineId, { new_note: movedNote.pitch, new_time_beats: movedNote.time })
                .then(() => dispatchChanged()).catch(() => {});
            }
          }
          return currentNotes;
        });
      } else if (dragging.type === 'marquee' && gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const x1 = Math.min(dragging.startX, e.clientX) - rect.left + scrollX;
        const x2 = Math.max(dragging.startX, e.clientX) - rect.left + scrollX;
        const y1 = Math.min(dragging.startY, e.clientY) - rect.top + scrollY;
        const y2 = Math.max(dragging.startY, e.clientY) - rect.top + scrollY;
        const selected = new Set<string>();
        notes.forEach(n => {
          const nx = n.time * pixelsPerBeat;
          const ny = pitchToY(n.pitch);
          const nw = n.length * pixelsPerBeat;
          if (nx + nw > x1 && nx < x2 && ny + NOTE_HEIGHT > y1 && ny < y2) selected.add(n.id);
        });
        setSelectedNoteIds(selected);
      } else if (dragging.type === 'velocity-paint') {
        // Commit velocity changes — read latest notes via functional trick
        // Don't dispatch changed immediately — the IPC calls need time to reach the engine
        // before a refetch would overwrite our local state with stale engine data
        setNotes(currentNotes => {
          const calls: Promise<unknown>[] = [];
          currentNotes.forEach(n => {
            const engineId = Number(n.id);
            if (!isNaN(engineId) && engineId >= 0) {
              calls.push(ipc.midiSetNoteVelocity(trackId, regionId, engineId, n.velocity).catch(() => {}));
            }
          });
          // Dispatch changed only after all IPC calls complete
          Promise.all(calls).then(() => dispatchChanged());
          return currentNotes; // don't modify, just read
        });
      } else if (dragging.type === 'cc-draw' && dragging.laneId) {
        // Commit CC data to engine — send only key points (first, last, and sampled)
        // to avoid flooding the engine with hundreds of IPC calls
        const lane = bottomLanes.find(l => l.id === dragging.laneId);
        if (lane && lane.cc != null && lane.data.length > 0) {
          // Downsample to max 15 points
          let pts = lane.data;
          if (pts.length > 15) {
            const step = Math.ceil(pts.length / 13);
            const sampled = [pts[0]];
            for (let i = step; i < pts.length - 1; i += step) sampled.push(pts[i]);
            sampled.push(pts[pts.length - 1]);
            pts = sampled;
          }
          // Send one at a time, chained with promises
          let chain = Promise.resolve();
          for (const p of pts) {
            chain = chain.then(() =>
              ipc.call('daw.midi.add_cc_event', {
                track_id: trackId, region_id: regionId, cc_number: lane.cc,
                time_beats: Math.round(p.time * 100) / 100, value: p.value,
              }).catch(() => {})
            ).then(() => new Promise(r => setTimeout(r, 30)));
          }
        }
      }
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [dragging, pixelsPerBeat, snapEnabled, quantizeValue, notes, selectedNoteIds, scrollX, scrollY, trackId, regionId, parseEngineNotes, refetchNotes, dispatchChanged, bottomLanes]);

  // ---- Lane divider resize ----
  useEffect(() => {
    if (!laneDivDrag) return;
    const handleMove = (e: MouseEvent) => {
      // Divider is above the lane: dragging UP (negative dy) should INCREASE height
      const dy = laneDivDrag.startY - e.clientY;
      const newHeight = Math.max(40, Math.min(250, laneDivDrag.origHeight + dy));
      setBottomLanes(prev => prev.map(l => l.id === laneDivDrag.laneId ? { ...l, height: newHeight } : l));
    };
    const handleUp = () => setLaneDivDrag(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [laneDivDrag]);

  // ---- Right-click tool popup ----
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Quick right-click: toggle back to select
    if (tool !== 'select') {
      // Show popup at mouse position, but also set up quick-toggle
      setToolPopup({ x: e.clientX, y: e.clientY, hoveredTool: null });
      toolPopupTimerRef.current = setTimeout(() => {
        // If popup is still open and no tool hovered after 200ms, it was a quick click
      }, 200);
    } else {
      setToolPopup({ x: e.clientX, y: e.clientY, hoveredTool: null });
    }
  }, [tool]);

  // Handle tool popup mouseup (release to select hovered tool)
  useEffect(() => {
    if (!toolPopup) return;
    const handleMouseUp = () => {
      if (toolPopup.hoveredTool) {
        setTool(toolPopup.hoveredTool);
      } else {
        // Quick click — toggle to select
        if (tool !== 'select') setTool('select');
      }
      setToolPopup(null);
    };
    const handleMouseMove = () => {};
    // Small delay to avoid instant close
    const timer = setTimeout(() => {
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }, 50);
    return () => { clearTimeout(timer); window.removeEventListener('mouseup', handleMouseUp); };
  }, [toolPopup, tool]);

  // ---- Zoom buttons ----
  const zoomIn = useCallback(() => setPixelsPerBeat(prev => Math.min(MAX_PIXELS_PER_BEAT, prev * 1.25)), []);
  const zoomOut = useCallback(() => setPixelsPerBeat(prev => Math.max(MIN_PIXELS_PER_BEAT, prev * 0.8)), []);

  // ---- MIDI Transformation handlers ----
  const handleQuantize = useCallback(() => {
    ipc.midiQuantize(trackId, regionId, quantizeValue, 1.0).then(() => refetchNotes()).catch(() => {});
  }, [trackId, regionId, quantizeValue, refetchNotes]);

  const handleTranspose = useCallback((semitones: number) => {
    ipc.midiTranspose(trackId, regionId, semitones).then(() => {
      setNotes(prev => prev.map(n => ({ ...n, pitch: Math.max(0, Math.min(127, n.pitch + semitones)) })));
      dispatchChanged();
    }).catch(() => {});
  }, [trackId, regionId, dispatchChanged]);

  const handleVelocityScale = useCallback((delta: number) => {
    const scalePercent = 100 + delta;
    ipc.midiScaleVelocity(trackId, regionId, scalePercent).then(() => {
      const factor = scalePercent / 100;
      setNotes(prev => prev.map(n => ({ ...n, velocity: Math.max(1, Math.min(127, Math.round(n.velocity * factor))) })));
    }).catch(() => {});
  }, [trackId, regionId]);

  const handleHumanize = useCallback(() => {
    ipc.midiHumanize(trackId, regionId).then(() => refetchNotes()).catch(() => {});
  }, [trackId, regionId, refetchNotes]);

  // ---- Transform handlers ----
  const handleLegato = useCallback(() => {
    ipc.midiLegato(trackId, regionId).then(() => refetchNotes()).catch(() => {});
    setTransformDropdownOpen(false);
  }, [trackId, regionId, refetchNotes]);

  const handleStrum = useCallback(() => {
    ipc.midiStrum(trackId, regionId, 15).then(() => refetchNotes()).catch(() => {});
    setTransformDropdownOpen(false);
  }, [trackId, regionId, refetchNotes]);

  const handleInvert = useCallback(() => {
    ipc.midiInvert(trackId, regionId, 60).then(() => refetchNotes()).catch(() => {});
    setTransformDropdownOpen(false);
  }, [trackId, regionId, refetchNotes]);

  const handleTransformHumanize = useCallback(() => {
    ipc.midiHumanize(trackId, regionId, 20, 10).then(() => refetchNotes()).catch(() => {});
    setTransformDropdownOpen(false);
  }, [trackId, regionId, refetchNotes]);

  // ---- Keyboard shortcuts (scoped to editor) ----
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Stop propagation so global shortcuts don't fire
    e.stopPropagation();

    const hasSelected = selectedNoteIds.size > 0;

    // Tool shortcuts
    const toolKey = TOOLS.find(t => t.key === e.key);
    if (toolKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setTool(toolKey.id);
      return;
    }

    // Arrow keys: move selected notes
    if (hasSelected && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      const semitones = e.shiftKey ? delta * 12 : delta;
      setNotes(prev => prev.map(n => {
        if (!selectedNoteIds.has(n.id)) return n;
        return { ...n, pitch: Math.max(0, Math.min(127, n.pitch + semitones)) };
      }));
      // Commit to engine
      notes.filter(n => selectedNoteIds.has(n.id)).forEach(n => {
        const engineId = Number(n.id);
        if (!isNaN(engineId) && engineId >= 0) {
          ipc.midiMoveNote(trackId, regionId, engineId, { new_note: Math.max(0, Math.min(127, n.pitch + semitones)) }).catch(() => {});
        }
      });
      dispatchChanged();
      return;
    }

    // Arrow left/right: move in time
    if (hasSelected && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? quantizeValue : -quantizeValue;
      setNotes(prev => prev.map(n => {
        if (!selectedNoteIds.has(n.id)) return n;
        return { ...n, time: Math.max(0, n.time + delta) };
      }));
      notes.filter(n => selectedNoteIds.has(n.id)).forEach(n => {
        const engineId = Number(n.id);
        if (!isNaN(engineId) && engineId >= 0) {
          ipc.midiMoveNote(trackId, regionId, engineId, { new_time_beats: Math.max(0, n.time + delta) }).catch(() => {});
        }
      });
      dispatchChanged();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (hasSelected) {
        const toDelete = new Set(selectedNoteIds);
        setNotes(prev => prev.filter(n => !toDelete.has(n.id)));
        toDelete.forEach(id => {
          const engineId = Number(id);
          if (!isNaN(engineId) && engineId >= 0) ipc.midiDeleteNote(trackId, regionId, engineId).catch(() => {});
        });
        setSelectedNoteIds(new Set());
        dispatchChanged();
      }
    } else if (e.key === 'q' && !e.metaKey && !e.ctrlKey) {
      handleQuantize();
    } else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSelectedNoteIds(new Set(notes.map(n => n.id)));
    } else if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSelectedNoteIds(new Set());
    } else if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
      // G = zoom out
      e.preventDefault();
      setPixelsPerBeat(prev => Math.max(MIN_PIXELS_PER_BEAT, prev * 0.75));
    } else if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
      // H = zoom in
      e.preventDefault();
      setPixelsPerBeat(prev => Math.min(MAX_PIXELS_PER_BEAT, prev * 1.33));
    }
  }, [selectedNoteIds, notes, trackId, regionId, quantizeValue, handleQuantize, dispatchChanged]);

  // ---- Add CC lane ----
  const addCcLane = useCallback(() => {
    const usedColors = new Set(bottomLanes.map(l => l.color));
    let color = randomLaneColor();
    let attempts = 0;
    while (usedColors.has(color) && attempts < 20) { color = randomLaneColor(); attempts++; }
    setBottomLanes(prev => [...prev, {
      id: `lane-${Date.now()}`, type: 'cc11', cc: 11, color, height: 80, data: [],
    }]);
  }, [bottomLanes]);

  const removeCcLane = useCallback((laneId: string) => {
    setBottomLanes(prev => prev.length > 1 ? prev.filter(l => l.id !== laneId) : prev);
  }, []);

  const changeLaneType = useCallback((laneId: string, newType: string) => {
    const opt = LANE_TYPE_OPTIONS.find(o => o.value === newType);
    setBottomLanes(prev => prev.map(l => {
      if (l.id !== laneId) return l;
      const cc = opt?.cc;
      return { ...l, type: newType, cc, data: [] };
    }));
    // Fetch CC data if applicable
    if (opt?.cc) {
      ipc.call('daw.midi.get_cc_data', { track_id: trackId, region_id: regionId, cc_number: opt.cc })
        .then((data: any) => {
          const events = (data.events || []).map((ev: any) => ({ time: ev.time_beats ?? ev.time ?? 0, value: ev.value ?? 0 }));
          setBottomLanes(prev => prev.map(l => l.id === laneId ? { ...l, data: events } : l));
        }).catch(() => {});
    }
  }, [trackId, regionId]);

  // ---- Render: Piano Keys ----
  const pianoKeys = useMemo(() => {
    const keys: React.ReactNode[] = [];
    for (let pitch = 127; pitch >= 0; pitch--) {
      const black = isBlackKey(pitch);
      const isC = isCNote(pitch);
      const octave = Math.floor(pitch / 12) - 1;
      keys.push(
        <div key={pitch} className={black ? styles.blackKey : styles.whiteKey}>
          {black && <div className={styles.blackKeyOverlay} />}
          {isC && <span className={styles.cLabel}>C{octave}</span>}
        </div>
      );
    }
    return keys;
  }, []);

  // ---- Render: Grid rows ----
  const gridRows = useMemo(() => {
    const rows: React.ReactNode[] = [];
    for (let pitch = 127; pitch >= 0; pitch--) {
      const black = isBlackKey(pitch);
      const isC = isCNote(pitch);
      let className = styles.gridRow;
      className += black ? ` ${styles.gridRowBlack}` : ` ${styles.gridRowWhite}`;
      if (isC) className += ` ${styles.gridRowC}`;
      rows.push(<div key={pitch} className={className} style={{ top: pitchToY(pitch) }} />);
    }
    return rows;
  }, []);

  // ---- Dynamic grid subdivision based on zoom level (Cubase-style) ----
  const dynamicGridSubdiv = useMemo(() => {
    // At high zoom, show finer grid. At low zoom, show coarser grid.
    const pxPerBeat = pixelsPerBeat;
    if (pxPerBeat >= 120) return 0.125;  // 1/32
    if (pxPerBeat >= 60) return 0.25;    // 1/16
    if (pxPerBeat >= 30) return 0.5;     // 1/8
    if (pxPerBeat >= 15) return 1;       // 1/4
    return 2;                             // 1/2
  }, [pixelsPerBeat]);

  // ---- Render: Vertical grid lines ----
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const subDiv = dynamicGridSubdiv;
    for (let beat = 0; beat <= totalBeats; beat += subDiv) {
      const x = beat * pixelsPerBeat;
      const isBar = Math.abs(beat % 4) < 0.001;
      const isBeatLine = Math.abs(beat % 1) < 0.001;
      let className = isBar ? styles.gridLineBar : isBeatLine ? styles.gridLineBeat : styles.gridLineSub;
      lines.push(<div key={`gl_${beat}`} className={className} style={{ left: x }} />);
    }
    return lines;
  }, [totalBeats, pixelsPerBeat, dynamicGridSubdiv]);

  // ---- Render: Ruler markers ----
  const rulerMarkers = useMemo(() => {
    const markers: React.ReactNode[] = [];
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * pixelsPerBeat;
      const isBar = beat % 4 === 0;
      if (isBar) {
        markers.push(<div key={`rb_${beat}`} className={styles.rulerBar} style={{ left: x }}>{Math.floor(beat / 4) + 1}</div>);
      } else if (pixelsPerBeat > 20) {
        markers.push(<div key={`rbt_${beat}`} className={styles.rulerBeat} style={{ left: x }} />);
      }
    }
    return markers;
  }, [totalBeats, pixelsPerBeat]);

  // ---- Marquee rect ----
  const marqueeRect = useMemo(() => {
    if (!dragging || dragging.type !== 'marquee' || !gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x1 = Math.min(dragging.startX, dragging.currentX ?? dragging.startX) - rect.left;
    const x2 = Math.max(dragging.startX, dragging.currentX ?? dragging.startX) - rect.left;
    const y1 = Math.min(dragging.startY, dragging.currentY ?? dragging.startY) - rect.top;
    const y2 = Math.max(dragging.startY, dragging.currentY ?? dragging.startY) - rect.top;
    return { left: x1, top: y1, width: x2 - x1, height: y2 - y1 };
  }, [dragging]);

  // ---- Playhead ----
  const beatsPerSecond = tempo / 60;
  const relativeSeconds = transportPosition - regionStartSeconds;
  const playheadBeat = relativeSeconds * beatsPerSecond;
  const playheadX = playheadBeat * pixelsPerBeat;

  // ---- Render ----
  return (
    <div
      className={styles.container}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      {/* ---- Toolbar ---- */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          {TOOLS.filter(t => t.id !== 'play').map(t => (
            <div key={t.id} style={{ position: 'relative' }}>
              <button
                className={`${styles.toolBtn} ${tool === t.id ? styles.toolBtnActive : ''}`}
                onClick={() => { setTool(t.id); if (t.id === 'line') setLineDropdownOpen(prev => !prev); else setLineDropdownOpen(false); }}
                title={`${t.label} (${t.key})`}
              >
                {t.icon}
              </button>
              {/* Line tool sub-mode dropdown */}
              {t.id === 'line' && lineDropdownOpen && tool === 'line' && (
                <div className={styles.lineDropdown}>
                  {(['line', 'parabola', 'sine', 'triangle', 'square', 'paint'] as const).map(mode => (
                    <button
                      key={mode}
                      className={`${styles.lineDropdownItem} ${lineMode === mode ? styles.lineDropdownItemActive : ''}`}
                      onClick={(e) => { e.stopPropagation(); setLineMode(mode); setLineDropdownOpen(false); }}
                    >
                      {lineMode === mode && <span style={{ marginRight: 4 }}>{'\u2713'}</span>}
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.separator} />

        <span className={styles.toolLabel}>Q</span>
        <select
          className={styles.selectDropdown}
          value={quantizeLabel}
          onChange={(e) => {
            const opt = QUANTIZE_OPTIONS.find(o => o.label === e.target.value);
            if (opt) { setQuantizeValue(opt.beats); setQuantizeLabel(opt.label); }
          }}
        >
          {QUANTIZE_OPTIONS.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
        </select>

        <div className={styles.separator} />

        <button
          className={`${styles.snapToggle} ${snapEnabled ? styles.toolBtnActive : ''}`}
          onClick={() => setSnapEnabled(prev => !prev)}
          title="Snap to grid"
        >
          Snap
        </button>

        <div className={styles.separator} />

        <div className={styles.toolGroup}>
          <button className={styles.toolBtn} onClick={handleQuantize} title="Quantize (Q)">Qtz</button>
          <button className={styles.toolBtn} onClick={handleHumanize} title="Humanize">Hum</button>
        </div>

        <div className={styles.separator} />

        <div className={styles.transformWrapper}>
          <button
            className={styles.toolBtn}
            onClick={(e) => { e.stopPropagation(); setTransformDropdownOpen(prev => !prev); }}
            title="MIDI Transforms"
          >
            Transform
          </button>
          {transformDropdownOpen && (
            <div className={styles.transformDropdown} onClick={(e) => e.stopPropagation()}>
              <button className={styles.transformItem} onClick={handleLegato}>
                Legato <span className={styles.transformHint}>close gaps</span>
              </button>
              <button className={styles.transformItem} onClick={handleStrum}>
                Strum <span className={styles.transformHint}>15ms</span>
              </button>
              <button className={styles.transformItem} onClick={handleInvert}>
                Invert <span className={styles.transformHint}>pivot C4</span>
              </button>
              <button className={styles.transformItem} onClick={handleTransformHumanize}>
                Humanize <span className={styles.transformHint}>vel/time</span>
              </button>
            </div>
          )}
        </div>

        <div className={styles.separator} />

        <span className={styles.toolLabel}>Transpose</span>
        <div className={styles.toolGroup}>
          <button className={styles.toolBtn} onClick={() => handleTranspose(-1)} title="Down 1 semitone">-1</button>
          <button className={styles.toolBtn} onClick={() => handleTranspose(1)} title="Up 1 semitone">+1</button>
        </div>

        <div className={styles.separator} />

        <span className={styles.toolLabel}>Vel</span>
        <div className={styles.toolGroup}>
          <button className={styles.toolBtn} onClick={() => handleVelocityScale(-10)}>-10</button>
          <button className={styles.toolBtn} onClick={() => handleVelocityScale(10)}>+10</button>
        </div>

        <div className={styles.zoomGroup}>
          <button className={styles.zoomBtn} onClick={zoomOut}>-</button>
          <button className={styles.zoomBtn} onClick={zoomIn}>+</button>
        </div>
      </div>

      {/* ---- Ruler ---- */}
      <div className={styles.ruler}>
        <div className={styles.rulerCorner} />
        <div className={styles.rulerTrack} style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: -scrollX, top: 0, width: gridWidth, height: '100%' }}>
            {rulerMarkers}
          </div>
        </div>
      </div>

      {/* ---- Editor Area: Piano + Grid ---- */}
      <div className={styles.editorArea} onWheel={handleWheel}>
        <div className={styles.pianoKeys}>
          <div className={styles.pianoInner} style={{ transform: `translateY(${-scrollY}px)`, height: TOTAL_HEIGHT }}>
            {pianoKeys}
          </div>
        </div>

        <div
          ref={gridRef}
          className={styles.noteGrid}
          style={{ cursor: TOOL_CURSORS[tool] }}
          onMouseDown={handleGridMouseDown}
        >
          <div
            className={styles.noteGridInner}
            style={{ transform: `translate(${-scrollX}px, ${-scrollY}px)`, width: gridWidth, height: TOTAL_HEIGHT }}
          >
            {gridRows}
            {gridLines}

            {/* Note blocks */}
            {notes.map(note => {
              const selected = selectedNoteIds.has(note.id);
              const opacity = note.muted ? 0.25 : (0.4 + (note.velocity / 127) * 0.6);
              const noteWidth = Math.max(4, note.length * pixelsPerBeat);
              const showLabel = noteWidth > 24;
              return (
                <div
                  key={note.id}
                  className={`${styles.noteBlock} ${selected ? styles.noteBlockSelected : ''}`}
                  style={{
                    left: note.time * pixelsPerBeat,
                    top: pitchToY(note.pitch),
                    width: noteWidth,
                    height: NOTE_HEIGHT - 1,
                    background: note.muted ? '#555' : trackColor,
                    opacity,
                    borderColor: selected ? '#4fc3f7' : darkenColor(trackColor, 0.5),
                  }}
                  onMouseDown={(e) => handleNoteMouseDown(e, note)}
                >
                  {showLabel && <span className={styles.noteLabel}>{midiNoteToName(note.pitch)}</span>}
                  <div className={styles.noteResizeHandle} onMouseDown={(e) => handleResizeMouseDown(e, note)} />
                </div>
              );
            })}

            {/* Marquee */}
            {marqueeRect && (
              <div className={styles.selectionRect} style={{
                left: marqueeRect.left + scrollX, top: marqueeRect.top + scrollY,
                width: marqueeRect.width, height: marqueeRect.height,
              }} />
            )}

            {/* Playhead */}
            {playheadX >= -10 && playheadX <= gridWidth + 10 && (
              <div style={{
                position: 'absolute', left: playheadX, top: 0, width: 1, height: TOTAL_HEIGHT,
                background: 'rgba(220, 240, 255, 0.85)', zIndex: 20, pointerEvents: 'none',
                boxShadow: '0 0 4px rgba(120, 180, 220, 0.3)',
              }} />
            )}
          </div>

          {notes.length === 0 && <div className={styles.emptyState}>No MIDI notes. Use the Draw tool to add notes.</div>}
        </div>
      </div>

      {/* ---- Bottom Lanes (Velocity / CC) ---- */}
      {bottomLanes.map((lane, laneIdx) => (
        <React.Fragment key={lane.id}>
          {/* Divider */}
          <div
            className={styles.velocityDivider}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLaneDivDrag({ laneId: lane.id, startY: e.clientY, origHeight: lane.height });
            }}
          />
          <div className={styles.velocityLane} style={{ height: lane.height }}>
            {/* Lane header — clickable type selector */}
            <div className={styles.velocityLabel}>
              <select
                className={styles.laneTypeSelect}
                value={lane.type}
                onChange={(e) => changeLaneType(lane.id, e.target.value)}
                title="Lane type"
              >
                {LANE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {laneIdx > 0 && (
                <button className={styles.ccLaneClose} onClick={() => removeCcLane(lane.id)} title="Remove lane">&times;</button>
              )}
            </div>

            {/* Lane content */}
            <div
              className={styles.velocityArea}
              data-lane-id={lane.id}
              style={{ cursor: lane.type === 'velocity' ? 'ns-resize' : TOOL_CURSORS['draw'] }}
              onMouseDown={(e) => {
                if (lane.type === 'velocity') {
                  // Start velocity paint
                  setDragging({ type: 'velocity-paint', startX: e.clientX, startY: e.clientY });
                  // Immediate: set velocity on the note whose bar is under click
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const vel = Math.max(1, Math.min(127, Math.round((1 - y / rect.height) * 127)));
                  const x = e.clientX - rect.left + scrollX;
                  setNotes(prev => {
                    let closestId: string | null = null;
                    let closestDist = Infinity;
                    prev.forEach(n => {
                      const barX = n.time * pixelsPerBeat;
                      const dist = Math.abs(x - barX);
                      if (dist < 12 && dist < closestDist) {
                        closestDist = dist; closestId = n.id;
                      }
                    });
                    if (!closestId) return prev;
                    return prev.map(n => n.id === closestId ? { ...n, velocity: vel } : n);
                  });
                } else {
                  // Start CC draw (point-based)
                  setDragging({ type: 'cc-draw', startX: e.clientX, startY: e.clientY, laneId: lane.id });
                  try {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (rect.height <= 0) return;
                    const x = e.clientX - rect.left + scrollX;
                    const y = e.clientY - rect.top;
                    let time = x / pixelsPerBeat;
                    if (snapEnabled) time = quantizeTime(time, quantizeValue);
                    time = Math.max(0, time);
                    const value = Math.max(0, Math.min(127, Math.round((1 - Math.max(0, Math.min(rect.height, y)) / rect.height) * 127)));
                    setBottomLanes(prev => prev.map(l => {
                      if (l.id !== lane.id) return l;
                      return { ...l, data: [...l.data.filter(p => Math.abs(p.time - time) > 0.02), { time, value }].sort((a, b) => a.time - b.time) };
                    }));
                  } catch { /* guard */ }
                }
              }}
            >
              {/* Background grid */}
              <div className={styles.velocityGrid}>
                {[0.25, 0.5, 0.75].map(frac => (
                  <div key={frac} className={styles.velocityGridLine} style={{ bottom: `${frac * 100}%` }} />
                ))}
              </div>

              <div className={styles.velocityAreaInner} style={{ transform: `translateX(${-scrollX}px)`, width: gridWidth }}>
                {lane.type === 'velocity' ? (
                  /* Velocity bars */
                  notes.map(note => {
                    const barHeight = (note.velocity / 127) * lane.height;
                    const selected = selectedNoteIds.has(note.id);
                    return (
                      <div
                        key={`vel_${note.id}`}
                        className={`${styles.velBar} ${selected ? styles.velBarSelected : ''}`}
                        style={{ left: note.time * pixelsPerBeat, height: barHeight, background: velocityToColor(note.velocity) }}
                      />
                    );
                  })
                ) : (
                  /* CC curve */
                  <svg width={gridWidth} height={lane.height} style={{ position: 'absolute', top: 0, left: 0 }}>
                    {lane.data.length > 0 && (
                      <>
                        <path
                          d={`M ${lane.data[0].time * pixelsPerBeat},${lane.height} L ${lane.data.map(p => `${p.time * pixelsPerBeat},${lane.height - (p.value / 127) * (lane.height - 4)}`).join(' L ')} L ${lane.data[lane.data.length - 1].time * pixelsPerBeat},${lane.height} Z`}
                          fill={lane.color}
                          opacity={0.15}
                        />
                        <polyline
                          points={lane.data.map(p => `${p.time * pixelsPerBeat},${lane.height - (p.value / 127) * (lane.height - 4)}`).join(' ')}
                          fill="none" stroke={lane.color} strokeWidth={1.5}
                        />
                        {lane.data.map((p, i) => (
                          <circle key={i} cx={p.time * pixelsPerBeat} cy={lane.height - (p.value / 127) * (lane.height - 4)} r={2.5} fill={lane.color} />
                        ))}
                      </>
                    )}
                  </svg>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      ))}

      {/* ---- Add Lane button ---- */}
      <div className={styles.addLaneBar}>
        <button className={styles.addLaneBtn} onClick={addCcLane} title="Add CC lane">+ Add Lane</button>
      </div>

      {/* ---- Right-click Tool Popup ---- */}
      {toolPopup && (
        <div
          className={styles.toolPopup}
          style={{ left: toolPopup.x - 20, top: toolPopup.y - 30 }}
          onMouseLeave={() => setToolPopup(null)}
        >
          {TOOLS.filter(t => t.id !== 'play').map(t => (
            <div
              key={t.id}
              className={`${styles.toolPopupItem} ${toolPopup.hoveredTool === t.id ? styles.toolPopupItemHover : ''} ${tool === t.id ? styles.toolPopupItemActive : ''}`}
              onMouseEnter={() => setToolPopup(prev => prev ? { ...prev, hoveredTool: t.id } : null)}
              onMouseUp={() => { setTool(t.id); setToolPopup(null); }}
              title={`${t.label} (${t.key})`}
            >
              {t.icon}
            </div>
          ))}
          {toolPopup.hoveredTool && (
            <div className={styles.toolPopupLabel}>
              {TOOLS.find(t => t.id === toolPopup.hoveredTool)?.label} ({TOOLS.find(t => t.id === toolPopup.hoveredTool)?.key})
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MidiEditor;
