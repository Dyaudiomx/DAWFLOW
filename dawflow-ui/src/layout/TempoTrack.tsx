import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ipc } from '../services/ipc';
import { useTransportStore } from '../stores/transport';
import styles from './TempoTrack.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TempoPoint {
  positionSamples: number;
  bpm: number;
}

interface TempoTrackProps {
  pixelsPerSecond: number;
  scrollLeftPx: number;
  sampleRate: number;
  viewportWidth: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRACK_HEIGHT = 50;
const PADDING_Y = 6;
const DRAWABLE_HEIGHT = TRACK_HEIGHT - PADDING_Y * 2;
const BPM_MIN_ABSOLUTE = 20;
const BPM_MAX_ABSOLUTE = 300;
const DIAMOND_SIZE = 5;
const DIAMOND_SIZE_HOVER = 7;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TempoTrack: React.FC<TempoTrackProps> = ({
  pixelsPerSecond,
  scrollLeftPx,
  sampleRate,
  viewportWidth,
}) => {
  const [tempoPoints, setTempoPoints] = useState<TempoPoint[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    idx: number;
    startX: number;
    startY: number;
    origSamples: number;
    origBpm: number;
  } | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingBpm, setEditingBpm] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pointIdx: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Current transport position for BPM display
  const position = useTransportStore((s) => s.position);
  const transportTempo = useTransportStore((s) => s.tempo);

  // -----------------------------------------------------------------------
  // Fetch tempo points on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    ipc
      .getAllTempoPoints()
      .then((data) => {
        setTempoPoints(
          (data.points || []).map((p) => ({
            positionSamples: p.position_samples ?? 0,
            bpm: p.bpm ?? 120,
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Focus the inline BPM input when it appears
  useEffect(() => {
    if (editingIdx !== null) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingIdx]);

  // -----------------------------------------------------------------------
  // Derived: sorted points
  // -----------------------------------------------------------------------
  const sortedPoints = useMemo(
    () => [...tempoPoints].sort((a, b) => a.positionSamples - b.positionSamples),
    [tempoPoints]
  );

  // -----------------------------------------------------------------------
  // Auto-scale BPM range: fit data +/-20%, clamped to [20, 300]
  // -----------------------------------------------------------------------
  const { minBpm, maxBpm } = useMemo(() => {
    if (sortedPoints.length === 0) {
      return { minBpm: 80, maxBpm: 160 };
    }
    const bpms = sortedPoints.map((p) => p.bpm);
    const dataMin = Math.min(...bpms);
    const dataMax = Math.max(...bpms);

    if (dataMin === dataMax) {
      // Single value — show +/- 20 BPM
      return {
        minBpm: Math.max(BPM_MIN_ABSOLUTE, dataMin - 20),
        maxBpm: Math.min(BPM_MAX_ABSOLUTE, dataMax + 20),
      };
    }

    const range = dataMax - dataMin;
    const margin = range * 0.2;
    return {
      minBpm: Math.max(BPM_MIN_ABSOLUTE, Math.floor(dataMin - margin)),
      maxBpm: Math.min(BPM_MAX_ABSOLUTE, Math.ceil(dataMax + margin)),
    };
  }, [sortedPoints]);

  const bpmRange = maxBpm - minBpm || 1;

  // -----------------------------------------------------------------------
  // Current BPM at playhead
  // -----------------------------------------------------------------------
  const currentBpm = useMemo(() => {
    if (sortedPoints.length === 0) return transportTempo;
    const playheadSamples = position * (sampleRate || 48000);
    // Find the last tempo point at or before the playhead
    let bpm = sortedPoints[0].bpm;
    for (const pt of sortedPoints) {
      if (pt.positionSamples <= playheadSamples) {
        bpm = pt.bpm;
      } else {
        break;
      }
    }
    return bpm;
  }, [sortedPoints, position, sampleRate, transportTempo]);

  // -----------------------------------------------------------------------
  // Coordinate helpers
  // -----------------------------------------------------------------------
  const samplesToX = useCallback(
    (samples: number) =>
      (samples / (sampleRate || 48000)) * pixelsPerSecond - scrollLeftPx,
    [sampleRate, pixelsPerSecond, scrollLeftPx]
  );

  const xToSamples = useCallback(
    (x: number) =>
      Math.max(
        0,
        Math.floor(((x + scrollLeftPx) / pixelsPerSecond) * (sampleRate || 48000))
      ),
    [sampleRate, pixelsPerSecond, scrollLeftPx]
  );

  const bpmToY = useCallback(
    (bpm: number) => {
      const normalized = (bpm - minBpm) / bpmRange;
      // Invert: high BPM = top = low Y
      return TRACK_HEIGHT - PADDING_Y - normalized * DRAWABLE_HEIGHT;
    },
    [minBpm, bpmRange]
  );

  const yToBpm = useCallback(
    (y: number) => {
      const normalized = (TRACK_HEIGHT - PADDING_Y - y) / DRAWABLE_HEIGHT;
      const bpm = minBpm + normalized * bpmRange;
      return Math.max(BPM_MIN_ABSOLUTE, Math.min(BPM_MAX_ABSOLUTE, bpm));
    },
    [minBpm, bpmRange]
  );

  // -----------------------------------------------------------------------
  // Visible-only filter: only render points within viewport + margin
  // -----------------------------------------------------------------------
  const visiblePoints = useMemo(() => {
    const margin = 40; // px margin outside viewport
    return sortedPoints
      .map((pt, idx) => ({ ...pt, sortedIdx: idx }))
      .filter((pt) => {
        const x = samplesToX(pt.positionSamples);
        return x >= -margin && x <= viewportWidth + margin;
      });
  }, [sortedPoints, samplesToX, viewportWidth]);

  // -----------------------------------------------------------------------
  // Horizontal BPM grid lines
  // -----------------------------------------------------------------------
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    // Generate nice round BPM values within visible range
    const step = bpmRange > 100 ? 40 : bpmRange > 50 ? 20 : 10;
    const start = Math.ceil(minBpm / step) * step;
    for (let bpm = start; bpm <= maxBpm; bpm += step) {
      lines.push(bpm);
    }
    return lines;
  }, [minBpm, maxBpm, bpmRange]);

  // -----------------------------------------------------------------------
  // Build SVG path for tempo line + fill
  // -----------------------------------------------------------------------
  const { linePath, fillPath } = useMemo(() => {
    if (sortedPoints.length === 0) return { linePath: '', fillPath: '' };

    const segments: string[] = [];

    for (let i = 0; i < sortedPoints.length; i++) {
      const pt = sortedPoints[i];
      const x = samplesToX(pt.positionSamples);
      const y = bpmToY(pt.bpm);

      if (i === 0) {
        segments.push(`M ${x},${y}`);
      }

      // If there's a next point with a different BPM, that's a ramp (angled line)
      // Otherwise (same BPM), it's a flat line
      if (i < sortedPoints.length - 1) {
        const next = sortedPoints[i + 1];
        const nextX = samplesToX(next.positionSamples);
        const nextY = bpmToY(next.bpm);
        // Draw angled line directly to next point (ramp)
        segments.push(`L ${nextX},${nextY}`);
      }
    }

    // Extend last point to the far right edge
    const lastPt = sortedPoints[sortedPoints.length - 1];
    const lastY = bpmToY(lastPt.bpm);
    const rightEdge = viewportWidth + scrollLeftPx;
    const rightEdgeX = samplesToX(rightEdge > 0 ? rightEdge * (sampleRate || 48000) : 0);
    const farRightX = Math.max(viewportWidth + 100, rightEdgeX);
    segments.push(`L ${farRightX},${lastY}`);

    const lineD = segments.join(' ');

    // Build fill: same path but close at bottom
    const firstPt = sortedPoints[0];
    const firstX = samplesToX(firstPt.positionSamples);
    const fillD = `${lineD} L ${farRightX},${TRACK_HEIGHT} L ${firstX},${TRACK_HEIGHT} Z`;

    return { linePath: lineD, fillPath: fillD };
  }, [sortedPoints, samplesToX, bpmToY, viewportWidth, scrollLeftPx, sampleRate]);

  // -----------------------------------------------------------------------
  // Diamond path for a point
  // -----------------------------------------------------------------------
  const diamondPath = useCallback((cx: number, cy: number, size: number) => {
    return `M ${cx},${cy - size} L ${cx + size},${cy} L ${cx},${cy + size} L ${cx - size},${cy} Z`;
  }, []);

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /** Click empty SVG area to add a new tempo point */
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Skip if clicking an existing diamond
      if ((e.target as Element).closest('[data-tempo-point]')) return;
      // Skip if we were dragging
      if (dragState) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const positionSamples = xToSamples(x);
      const bpm = Math.round(yToBpm(y) * 10) / 10;

      // Optimistic local update
      setTempoPoints((prev) => [...prev, { positionSamples, bpm }]);

      // Persist to engine
      ipc.addTempoChange(positionSamples, bpm).catch(() => {});
    },
    [xToSamples, yToBpm, dragState]
  );

  /** Double-click a point to inline-edit BPM */
  const handlePointDoubleClick = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.stopPropagation();
      e.preventDefault();
      const pt = sortedPoints[idx];
      if (!pt) return;
      setEditingIdx(idx);
      setEditingBpm(String(Math.round(pt.bpm * 10) / 10));
    },
    [sortedPoints]
  );

  /** Commit inline BPM edit */
  const commitBpmEdit = useCallback(() => {
    if (editingIdx === null) return;
    const pt = sortedPoints[editingIdx];
    if (!pt) {
      setEditingIdx(null);
      return;
    }
    const newBpm = parseFloat(editingBpm);
    if (isNaN(newBpm) || newBpm < BPM_MIN_ABSOLUTE || newBpm > BPM_MAX_ABSOLUTE) {
      setEditingIdx(null);
      return;
    }

    // Optimistic update
    setTempoPoints((prev) =>
      prev.map((p) =>
        p.positionSamples === pt.positionSamples ? { ...p, bpm: newBpm } : p
      )
    );

    // Persist: remove old + add new at same position
    ipc.removeTempo(pt.positionSamples).catch(() => {});
    ipc.addTempoChange(pt.positionSamples, newBpm).catch(() => {});

    setEditingIdx(null);
  }, [editingIdx, editingBpm, sortedPoints]);

  /** Right-click a point to show context menu */
  const handlePointContextMenu = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, pointIdx: idx });
    },
    []
  );

  /** Delete a tempo point */
  const deletePoint = useCallback(
    (idx: number) => {
      const pt = sortedPoints[idx];
      if (!pt) return;

      setTempoPoints((prev) =>
        prev.filter((p) => p.positionSamples !== pt.positionSamples)
      );

      ipc.removeTempo(pt.positionSamples).catch(() => {});

      setContextMenu(null);
      setSelectedIdx(null);
    },
    [sortedPoints]
  );

  /** Begin dragging a point (horizontal + vertical) */
  const handlePointMouseDown = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.stopPropagation();
      e.preventDefault();
      const pt = sortedPoints[idx];
      if (!pt) return;
      setDragState({
        idx,
        startX: e.clientX,
        startY: e.clientY,
        origSamples: pt.positionSamples,
        origBpm: pt.bpm,
      });
      setSelectedIdx(idx);
    },
    [sortedPoints]
  );

  /** Global mouse move/up for point dragging */
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newSamples = xToSamples(x);
      const newBpm = Math.round(yToBpm(y) * 10) / 10;

      setTempoPoints((prev) => {
        const sorted = [...prev].sort(
          (a, b) => a.positionSamples - b.positionSamples
        );
        if (!sorted[dragState.idx]) return prev;
        sorted[dragState.idx] = {
          ...sorted[dragState.idx],
          positionSamples: Math.max(0, newSamples),
          bpm: newBpm,
        };
        return sorted;
      });
    };

    const handleMouseUp = () => {
      // Persist the moved point
      const sorted = [...tempoPoints].sort(
        (a, b) => a.positionSamples - b.positionSamples
      );
      const pt = sorted[dragState.idx];
      if (pt) {
        // Remove old position, add at new position + BPM
        ipc.removeTempo(dragState.origSamples).catch(() => {});
        ipc.addTempoChange(pt.positionSamples, pt.bpm).catch(() => {});
      }
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, tempoPoints, xToSamples, yToBpm]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className={styles.container}>
      {/* Track header */}
      <div className={styles.header}>
        <span className={styles.headerLabel}>Tempo</span>
        <span className={styles.headerBpm}>
          {currentBpm.toFixed(1)} BPM
        </span>
      </div>

      {/* SVG canvas */}
      <div className={styles.canvas}>
        <svg
          ref={svgRef}
          className={styles.tempoSvg}
          viewBox={`0 0 ${viewportWidth} ${TRACK_HEIGHT}`}
          preserveAspectRatio="none"
          onClick={handleSvgClick}
        >
          {/* Horizontal BPM grid lines */}
          {gridLines.map((bpm) => {
            const y = bpmToY(bpm);
            return (
              <g key={bpm}>
                <line
                  className={styles.gridLine}
                  x1={0}
                  y1={y}
                  x2={viewportWidth}
                  y2={y}
                />
                <text
                  className={styles.gridLabel}
                  x={4}
                  y={y - 2}
                >
                  {bpm}
                </text>
              </g>
            );
          })}

          {/* Fill below tempo curve */}
          {fillPath && <path d={fillPath} className={styles.tempoFill} />}

          {/* Tempo curve line */}
          {linePath && (
            <path d={linePath} className={styles.tempoLine} />
          )}

          {/* Diamond tempo points */}
          {visiblePoints.map((pt) => {
            const cx = samplesToX(pt.positionSamples);
            const cy = bpmToY(pt.bpm);
            const isSelected = selectedIdx === pt.sortedIdx;
            const isDragging =
              dragState !== null && dragState.idx === pt.sortedIdx;
            const size =
              isSelected || isDragging ? DIAMOND_SIZE_HOVER : DIAMOND_SIZE;

            return (
              <path
                key={`${pt.positionSamples}-${pt.sortedIdx}`}
                data-tempo-point
                d={diamondPath(cx, cy, size)}
                className={`${styles.tempoPoint} ${
                  isSelected ? styles.tempoPointSelected : ''
                } ${isDragging ? styles.tempoPointDragging : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIdx(pt.sortedIdx);
                }}
                onDoubleClick={(e) =>
                  handlePointDoubleClick(e, pt.sortedIdx)
                }
                onMouseDown={(e) =>
                  handlePointMouseDown(e, pt.sortedIdx)
                }
                onContextMenu={(e) =>
                  handlePointContextMenu(e, pt.sortedIdx)
                }
              />
            );
          })}
        </svg>

        {/* Inline BPM edit input */}
        {editingIdx !== null && sortedPoints[editingIdx] && (
          <input
            ref={inputRef}
            className={styles.bpmInput}
            style={{
              left: Math.max(
                4,
                samplesToX(sortedPoints[editingIdx].positionSamples) - 27
              ),
              top: Math.max(
                2,
                bpmToY(sortedPoints[editingIdx].bpm) - 22
              ),
            }}
            value={editingBpm}
            onChange={(e) => setEditingBpm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitBpmEdit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditingIdx(null);
            }}
          />
        )}
      </div>

      {/* Context menu (right-click on point) */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              const pt = sortedPoints[contextMenu.pointIdx];
              if (pt) {
                setEditingIdx(contextMenu.pointIdx);
                setEditingBpm(String(Math.round(pt.bpm * 10) / 10));
              }
              setContextMenu(null);
            }}
          >
            Edit BPM...
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => deletePoint(contextMenu.pointIdx)}
          >
            Remove Tempo Point
          </div>
        </div>
      )}
    </div>
  );
};
