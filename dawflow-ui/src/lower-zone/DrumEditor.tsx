/**
 * DrumEditor — Cubase 15 Pro Drum Editor (Lower Zone)
 *
 * Grid-based drum editor with:
 *  - GM drum map (notes 36-57)
 *  - Instrument rows with hit diamonds/circles
 *  - Velocity-sized hits, color-coded
 *  - Velocity lane at bottom
 *  - Toolbar: tool select, quantize, grid
 *
 * Communication: IPC commands for CRUD.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './DrumEditor.module.css';
import { ipc } from '../services/ipc';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 24;
const MIN_PIXELS_PER_BEAT = 10;
const MAX_PIXELS_PER_BEAT = 200;
const DEFAULT_VELOCITY = 100;
const DRUM_CHANNEL = 9; // channel 10 in 1-indexed

// ---------------------------------------------------------------------------
// GM Drum Map
// ---------------------------------------------------------------------------

const GM_DRUMS = [
  { note: 36, name: 'Kick', short: 'BD' },
  { note: 37, name: 'Side Stick', short: 'SS' },
  { note: 38, name: 'Snare', short: 'SD' },
  { note: 39, name: 'Clap', short: 'CP' },
  { note: 40, name: 'E. Snare', short: 'ES' },
  { note: 41, name: 'Low Floor Tom', short: 'LT' },
  { note: 42, name: 'Closed HH', short: 'CH' },
  { note: 43, name: 'High Floor Tom', short: 'HT' },
  { note: 44, name: 'Pedal HH', short: 'PH' },
  { note: 45, name: 'Low Tom', short: 'LM' },
  { note: 46, name: 'Open HH', short: 'OH' },
  { note: 47, name: 'Low-Mid Tom', short: 'MT' },
  { note: 48, name: 'Hi Mid Tom', short: 'HM' },
  { note: 49, name: 'Crash 1', short: 'C1' },
  { note: 50, name: 'High Tom', short: 'HI' },
  { note: 51, name: 'Ride', short: 'RD' },
  { note: 52, name: 'China', short: 'CN' },
  { note: 53, name: 'Ride Bell', short: 'RB' },
  { note: 55, name: 'Splash', short: 'SP' },
  { note: 57, name: 'Crash 2', short: 'C2' },
];

const GM_NOTE_SET = new Set(GM_DRUMS.map(d => d.note));
const TOTAL_GRID_HEIGHT = GM_DRUMS.length * ROW_HEIGHT;

// Quantize values in beats
const QUANTIZE_OPTIONS: { label: string; beats: number }[] = [
  { label: '1/4', beats: 1 },
  { label: '1/8', beats: 0.5 },
  { label: '1/16', beats: 0.25 },
  { label: '1/32', beats: 0.125 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrumHit {
  id: string;
  note: number;    // MIDI note (36-57)
  velocity: number;
  time: number;    // beats
  length: number;  // beats (usually short, 0.25)
  channel: number;
}

type EditorTool = 'select' | 'draw' | 'erase';

interface DrumEditorProps {
  regionId: string;
  trackId: string;
  trackColor: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quantizeTime(time: number, grid: number): number {
  if (grid <= 0) return time;
  return Math.round(time / grid) * grid;
}

/** Velocity to color: low = blue (#3a7bd5), high = red (#e05050) */
function velocityToColor(velocity: number): string {
  const t = velocity / 127;
  const r = Math.round(58 + t * (224 - 58));
  const g = Math.round(123 + t * (80 - 123));
  const b = Math.round(213 + t * (80 - 213));
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DrumEditor: React.FC<DrumEditorProps> = ({ regionId, trackId, trackColor }) => {
  // ---- State ----
  const [hits, setHits] = useState<DrumHit[]>([]);
  const [selectedHitIds, setSelectedHitIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<EditorTool>('draw');
  const [scrollX, setScrollX] = useState(0);
  const [pixelsPerBeat, setPixelsPerBeat] = useState(40);
  const [velocityLaneHeight, setVelocityLaneHeight] = useState(60);
  const [quantizeValue, setQuantizeValue] = useState(0.25); // 1/16
  const [quantizeLabel, setQuantizeLabel] = useState('1/16');
  const [velDivDragging, setVelDivDragging] = useState(false);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  // Velocity drag state
  const [velDragging, setVelDragging] = useState<{ hitId: string } | null>(null);

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const velAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- Derived ----
  const totalBeats = useMemo(() => {
    if (hits.length === 0) return 64;
    const maxEnd = Math.max(...hits.map(h => h.time + h.length));
    return Math.max(64, Math.ceil(maxEnd / 4) * 4 + 16);
  }, [hits]);

  const gridWidth = totalBeats * pixelsPerBeat;

  // ---- Fetch notes on mount / region change ----
  useEffect(() => {
    ipc.getMidiNotes(regionId)
      .then((data: any) => {
        const raw = Array.isArray(data) ? data : (data?.notes || []);
        const allNotes = raw.map((n: any) => ({
          id: String(n.id ?? `${n.note ?? n.pitch}_${n.start ?? n.time}`),
          note: n.note ?? n.pitch ?? 36,
          velocity: n.velocity ?? 100,
          time: n.start ?? n.time ?? n.time_beats ?? 0,
          length: n.length ?? n.length_beats ?? 0.25,
          channel: n.channel ?? DRUM_CHANNEL,
        }));
        // Only show drum notes
        setHits(allNotes.filter((n: DrumHit) => GM_NOTE_SET.has(n.note)));
      })
      .catch(() => {
        setHits([]);
      });
    setSelectedHitIds(new Set());
  }, [regionId, trackId]);

  // ---- Scroll handling ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setPixelsPerBeat(prev => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        return Math.max(MIN_PIXELS_PER_BEAT, Math.min(MAX_PIXELS_PER_BEAT, prev * factor));
      });
    } else {
      setScrollX(prev => Math.max(0, prev + e.deltaY));
    }
  }, []);

  // ---- Grid cell interaction ----
  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;

    const rowIndex = Math.floor(y / ROW_HEIGHT);
    if (rowIndex < 0 || rowIndex >= GM_DRUMS.length) return;

    const drum = GM_DRUMS[rowIndex];
    const rawTime = x / pixelsPerBeat;
    const time = quantizeTime(rawTime, quantizeValue);

    if (tool === 'draw') {
      // Check if a hit already exists at this cell
      const existing = hits.find(h =>
        h.note === drum.note &&
        Math.abs(h.time - time) < quantizeValue * 0.5
      );

      if (existing) {
        // Remove existing hit
        setHits(prev => prev.filter(h => h.id !== existing.id));
        setSelectedHitIds(prev => {
          const next = new Set(prev);
          next.delete(existing.id);
          return next;
        });
        ipc.midiDeleteNote(trackId, regionId, Number(existing.id) || 0).catch(() => {});
      } else {
        // Add new hit
        const newHit: DrumHit = {
          id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          note: drum.note,
          velocity: DEFAULT_VELOCITY,
          time: Math.max(0, time),
          length: quantizeValue,
          channel: DRUM_CHANNEL,
        };
        setHits(prev => [...prev, newHit]);
        setSelectedHitIds(new Set([newHit.id]));
        ipc.midiAddNote(trackId, regionId, drum.note, newHit.time, newHit.length, newHit.velocity, DRUM_CHANNEL).catch(() => {});
      }
    } else if (tool === 'erase') {
      // Find and delete hit near click
      const hit = hits.find(h =>
        h.note === drum.note &&
        Math.abs(h.time - time) < quantizeValue * 0.5
      );
      if (hit) {
        setHits(prev => prev.filter(h => h.id !== hit.id));
        ipc.midiDeleteNote(trackId, regionId, Number(hit.id) || 0).catch(() => {});
      }
    } else if (tool === 'select') {
      const hit = hits.find(h =>
        h.note === drum.note &&
        Math.abs(h.time - time) < quantizeValue * 0.5
      );
      if (hit) {
        if (e.shiftKey) {
          setSelectedHitIds(prev => {
            const next = new Set(prev);
            if (next.has(hit.id)) next.delete(hit.id);
            else next.add(hit.id);
            return next;
          });
        } else {
          setSelectedHitIds(new Set([hit.id]));
        }
      } else {
        setSelectedHitIds(new Set());
      }
    }
  }, [tool, scrollX, pixelsPerBeat, quantizeValue, hits, trackId, regionId]);

  // ---- Grid mouse move for hover ----
  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;
    const rowIndex = Math.floor(y / ROW_HEIGHT);
    const rawTime = x / pixelsPerBeat;
    const col = Math.floor(rawTime / quantizeValue);
    setHoverCell({ row: rowIndex, col });
  }, [scrollX, pixelsPerBeat, quantizeValue]);

  const handleGridMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  // ---- Velocity lane mouse handling ----
  const handleVelocityMouseDown = useCallback((e: React.MouseEvent, hitId: string) => {
    e.stopPropagation();
    setVelDragging({ hitId });
  }, []);

  useEffect(() => {
    if (!velDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!velAreaRef.current) return;
      const rect = velAreaRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const vel = Math.max(1, Math.min(127, Math.round((1 - y / rect.height) * 127)));
      setHits(prev => prev.map(h =>
        h.id === velDragging.hitId ? { ...h, velocity: vel } : h
      ));
    };
    const handleUp = () => setVelDragging(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [velDragging]);

  // ---- Velocity divider drag (resize) ----
  useEffect(() => {
    if (!velDivDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const bottomY = containerRect.bottom;
      const newHeight = Math.max(30, Math.min(160, bottomY - e.clientY));
      setVelocityLaneHeight(newHeight);
    };
    const handleUp = () => setVelDivDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [velDivDragging]);

  // ---- Zoom ----
  const zoomIn = useCallback(() => {
    setPixelsPerBeat(prev => Math.min(MAX_PIXELS_PER_BEAT, prev * 1.25));
  }, []);
  const zoomOut = useCallback(() => {
    setPixelsPerBeat(prev => Math.max(MIN_PIXELS_PER_BEAT, prev * 0.8));
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedHitIds.size > 0) {
          const toDelete = new Set(selectedHitIds);
          setHits(prev => prev.filter(h => !toDelete.has(h.id)));
          toDelete.forEach(id => {
            ipc.midiDeleteNote(trackId, regionId, Number(id) || 0).catch(() => {});
          });
          setSelectedHitIds(new Set());
        }
      } else if (e.key === '1') setTool('select');
      else if (e.key === '2') setTool('draw');
      else if (e.key === '3') setTool('erase');
      else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSelectedHitIds(new Set(hits.map(h => h.id)));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedHitIds, hits, trackId, regionId]);

  // ---- Render: Ruler markers ----
  const rulerMarkers = useMemo(() => {
    const markers: React.ReactNode[] = [];
    const beatsPerBar = 4;
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * pixelsPerBeat;
      const isBar = beat % beatsPerBar === 0;
      const barNum = Math.floor(beat / beatsPerBar) + 1;

      if (isBar) {
        markers.push(
          <div key={`rb_${beat}`} className={styles.rulerBar} style={{ left: x }}>
            {barNum}
          </div>
        );
      } else if (pixelsPerBeat > 20) {
        markers.push(
          <div key={`rbt_${beat}`} className={styles.rulerBeat} style={{ left: x }} />
        );
      }
    }
    return markers;
  }, [totalBeats, pixelsPerBeat]);

  // ---- Render: Vertical grid lines ----
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const beatsPerBar = 4;
    let subDiv = quantizeValue;
    if (subDiv < 0.125) subDiv = 0.125;

    for (let beat = 0; beat <= totalBeats; beat += subDiv) {
      const x = beat * pixelsPerBeat;
      const isBar = Math.abs(beat % beatsPerBar) < 0.001;
      const isBeatLine = Math.abs(beat % 1) < 0.001;

      let className: string;
      if (isBar) className = styles.gridLineBar;
      else if (isBeatLine) className = styles.gridLineBeat;
      else className = styles.gridLineSub;

      lines.push(
        <div key={`gl_${beat}`} className={className} style={{ left: x }} />
      );
    }
    return lines;
  }, [totalBeats, pixelsPerBeat, quantizeValue]);

  // ---- Render: Drum rows ----
  const drumRows = useMemo(() => {
    return GM_DRUMS.map((drum, index) => (
      <div
        key={drum.note}
        className={`${styles.drumRow} ${index % 2 === 0 ? styles.drumRowEven : styles.drumRowOdd}`}
        style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
      />
    ));
  }, []);

  // ---- Cursor class ----
  const cursorClass = tool === 'draw'
    ? styles.cursorDraw
    : tool === 'erase'
      ? styles.cursorErase
      : styles.cursorSelect;

  // ---- Render ----
  return (
    <div className={styles.container} ref={containerRef}>
      {/* ---- Toolbar ---- */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <button
            className={`${styles.toolBtn} ${tool === 'select' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('select')}
            title="Select (1)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 1L2 10L5 7L8 10L8.5 9.5L5.5 6.5L10 6L2 1Z" fill="currentColor" />
            </svg>
          </button>
          <button
            className={`${styles.toolBtn} ${tool === 'draw' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('draw')}
            title="Draw (2)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 10L3 7L9 1L11 3L5 9L2 10Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <line x1="3" y1="7" x2="5" y2="9" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </button>
          <button
            className={`${styles.toolBtn} ${tool === 'erase' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('erase')}
            title="Erase (3)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="5" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" transform="rotate(-20 6 7)" />
              <line x1="2" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>

        <div className={styles.separator} />

        <span className={styles.toolLabel}>Q</span>
        <select
          className={styles.selectDropdown}
          value={quantizeLabel}
          onChange={(e) => {
            const opt = QUANTIZE_OPTIONS.find(o => o.label === e.target.value);
            if (opt) {
              setQuantizeValue(opt.beats);
              setQuantizeLabel(opt.label);
            }
          }}
        >
          {QUANTIZE_OPTIONS.map(opt => (
            <option key={opt.label} value={opt.label}>{opt.label}</option>
          ))}
        </select>

        <div className={styles.separator} />

        <span className={styles.toolLabel}>Grid</span>

        <div className={styles.zoomGroup}>
          <button className={styles.zoomBtn} onClick={zoomOut} title="Zoom out">-</button>
          <button className={styles.zoomBtn} onClick={zoomIn} title="Zoom in">+</button>
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

      {/* ---- Editor Area: Header + Grid ---- */}
      <div className={styles.editorArea} onWheel={handleWheel}>
        {/* Drum row headers */}
        <div className={styles.drumHeaders}>
          {GM_DRUMS.map((drum, index) => (
            <div
              key={drum.note}
              className={`${styles.drumHeader} ${index % 2 === 0 ? styles.drumHeaderEven : styles.drumHeaderOdd}`}
              style={{ height: ROW_HEIGHT }}
            >
              <span className={styles.drumShort}>{drum.short}</span>
              <span className={styles.drumName}>{drum.name}</span>
            </div>
          ))}
        </div>

        {/* Hit Grid */}
        <div
          ref={gridRef}
          className={`${styles.hitGrid} ${cursorClass}`}
          onClick={handleGridClick}
          onMouseMove={handleGridMouseMove}
          onMouseLeave={handleGridMouseLeave}
        >
          <div
            className={styles.hitGridInner}
            style={{
              transform: `translateX(${-scrollX}px)`,
              width: gridWidth,
              height: TOTAL_GRID_HEIGHT,
            }}
          >
            {/* Row backgrounds */}
            {drumRows}

            {/* Vertical grid lines */}
            {gridLines}

            {/* Hover cell indicator */}
            {hoverCell && hoverCell.row >= 0 && hoverCell.row < GM_DRUMS.length && tool !== 'select' && (
              <div
                className={styles.hoverCell}
                style={{
                  left: hoverCell.col * quantizeValue * pixelsPerBeat,
                  top: hoverCell.row * ROW_HEIGHT,
                  width: quantizeValue * pixelsPerBeat,
                  height: ROW_HEIGHT,
                }}
              />
            )}

            {/* Drum hits */}
            {hits.map(hit => {
              const drumIndex = GM_DRUMS.findIndex(d => d.note === hit.note);
              if (drumIndex < 0) return null;

              const selected = selectedHitIds.has(hit.id);
              const x = hit.time * pixelsPerBeat;
              const y = drumIndex * ROW_HEIGHT;

              // Size based on velocity: 6px min, 16px max
              const size = 6 + (hit.velocity / 127) * 10;

              return (
                <div
                  key={hit.id}
                  className={`${styles.drumHit} ${selected ? styles.drumHitSelected : ''}`}
                  style={{
                    left: x + (quantizeValue * pixelsPerBeat) / 2 - size / 2,
                    top: y + ROW_HEIGHT / 2 - size / 2,
                    width: size,
                    height: size,
                    background: trackColor,
                    borderColor: selected ? '#4fc3f7' : 'transparent',
                  }}
                />
              );
            })}
          </div>

          {/* Empty state */}
          {hits.length === 0 && (
            <div className={styles.emptyState}>
              No drum hits. Select the Draw tool and click to add hits.
            </div>
          )}
        </div>
      </div>

      {/* ---- Velocity Divider ---- */}
      <div
        className={styles.velocityDivider}
        onMouseDown={() => setVelDivDragging(true)}
      />

      {/* ---- Velocity Lane ---- */}
      <div className={styles.velocityLane} style={{ height: velocityLaneHeight }}>
        <div className={styles.velocityLabel}>Velocity</div>
        <div className={styles.velocityArea} ref={velAreaRef}>
          {/* Background grid lines */}
          <div className={styles.velocityGrid}>
            {[0.25, 0.5, 0.75].map(frac => (
              <div
                key={frac}
                className={styles.velocityGridLine}
                style={{ bottom: `${frac * 100}%` }}
              />
            ))}
          </div>

          <div
            className={styles.velocityAreaInner}
            style={{ transform: `translateX(${-scrollX}px)`, width: gridWidth }}
          >
            {hits.map(hit => {
              const barHeight = (hit.velocity / 127) * velocityLaneHeight;
              const selected = selectedHitIds.has(hit.id);
              return (
                <div
                  key={`vel_${hit.id}`}
                  className={`${styles.velBar} ${selected ? styles.velBarSelected : ''}`}
                  style={{
                    left: hit.time * pixelsPerBeat + (quantizeValue * pixelsPerBeat) / 2 - 2,
                    height: barHeight,
                    background: velocityToColor(hit.velocity),
                  }}
                  onMouseDown={(e) => handleVelocityMouseDown(e, hit.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrumEditor;
