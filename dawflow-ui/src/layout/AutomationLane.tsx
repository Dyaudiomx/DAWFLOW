import React from 'react';
import { ipc } from '../services/ipc';
import { useSessionStore } from '../stores/session';
import styles from './AutomationLane.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AutomationPoint {
  time: number;  // samples
  value: number; // normalized 0-1
}

interface AutomationLaneProps {
  trackId: string;
  paramType: string;    // "gain", "pan", "mute", etc.
  paramLabel: string;   // "Volume", "Pan", "Mute"
  height: number;       // lane height in pixels (default 60)
  pixelsPerSecond: number;
  scrollLeft: number;
  color: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a normalized 0-1 value for display based on param type. */
function formatValue(paramType: string, value: number): string {
  if (paramType === 'gain') {
    // 0-1 mapped to roughly -inf..+6 dB (simple log approximation)
    if (value <= 0) return '-inf dB';
    const db = 20 * Math.log10(value);
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
  }
  if (paramType === 'pan') {
    const pct = Math.round((value - 0.5) * 200);
    if (pct === 0) return 'C';
    return pct < 0 ? `L${Math.abs(pct)}` : `R${pct}`;
  }
  if (paramType === 'mute') {
    return value >= 0.5 ? 'On' : 'Off';
  }
  return `${(value * 100).toFixed(0)}%`;
}

/** Map automation mode string to short indicator. */
function modeIndicator(mode: string): { label: string; color: string } {
  switch (mode.toLowerCase()) {
    case 'write':  return { label: 'W', color: '#e44' };
    case 'touch':  return { label: 'T', color: '#e94' };
    case 'latch':  return { label: 'L', color: '#ea4' };
    case 'read':   return { label: 'R', color: '#4c8' };
    default:       return { label: '-', color: '#666' };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AutomationLane: React.FC<AutomationLaneProps> = ({
  trackId,
  paramType,
  paramLabel,
  height = 60,
  pixelsPerSecond,
  scrollLeft,
  color,
  onClose,
}) => {
  const sampleRate = useSessionStore((s) => s.sampleRate) || 48000;

  const [points, setPoints] = React.useState<AutomationPoint[]>([]);
  const [selectedPointIdx, setSelectedPointIdx] = React.useState<number | null>(null);
  const [automationMode, setAutomationMode] = React.useState<string>('off');
  const [hoverInfo, setHoverInfo] = React.useState<{ x: number; y: number; value: number } | null>(null);
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [dragOrigTime, setDragOrigTime] = React.useState<number | null>(null);

  const svgRef = React.useRef<SVGSVGElement>(null);

  // Computed SVG width: generous enough to cover visible timeline
  const svgWidth = Math.max(2000, pixelsPerSecond * 600);

  // -----------------------------------------------------------------------
  // Fetch automation data on mount / when param changes
  // -----------------------------------------------------------------------
  React.useEffect(() => {
    ipc.getAutomationData(trackId, paramType)
      .then((data: any) => {
        setPoints(
          (data.points || []).map((p: any) => ({
            time: p.time ?? p.when ?? 0,
            value: p.value ?? 0,
          }))
        );
      })
      .catch(() => {});

    ipc.getAutomationMode(trackId)
      .then((data) => setAutomationMode(data.mode || 'off'))
      .catch(() => {});
  }, [trackId, paramType]);

  // -----------------------------------------------------------------------
  // Coordinate helpers
  // -----------------------------------------------------------------------
  const timeToX = React.useCallback(
    (timeSamples: number) => (timeSamples / sampleRate) * pixelsPerSecond - scrollLeft,
    [sampleRate, pixelsPerSecond, scrollLeft],
  );

  const valueToY = React.useCallback(
    (value: number) => (1 - value) * height,
    [height],
  );

  const xToTime = React.useCallback(
    (x: number) => Math.max(0, Math.round(((x + scrollLeft) / pixelsPerSecond) * sampleRate)),
    [sampleRate, pixelsPerSecond, scrollLeft],
  );

  const yToValue = React.useCallback(
    (y: number) => Math.max(0, Math.min(1, 1 - y / height)),
    [height],
  );

  // -----------------------------------------------------------------------
  // Build SVG path data
  // -----------------------------------------------------------------------
  const sortedPoints = React.useMemo(
    () => [...points].sort((a, b) => a.time - b.time),
    [points],
  );

  const polylineStr = React.useMemo(() => {
    if (sortedPoints.length === 0) return '';
    return sortedPoints.map((p) => `${timeToX(p.time)},${valueToY(p.value)}`).join(' ');
  }, [sortedPoints, timeToX, valueToY]);

  const fillPathD = React.useMemo(() => {
    if (sortedPoints.length === 0) return '';
    const pts = sortedPoints.map((p) => `${timeToX(p.time)},${valueToY(p.value)}`);
    const firstX = timeToX(sortedPoints[0].time);
    const lastX = timeToX(sortedPoints[sortedPoints.length - 1].time);
    return `M ${firstX},${height} L ${pts.join(' L ')} L ${lastX},${height} Z`;
  }, [sortedPoints, timeToX, valueToY, height]);

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /** Click empty SVG area to add a point. */
  const handleSvgClick = React.useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Don't add points if clicking on an existing dot
      if ((e.target as Element).classList.contains(styles.automationPoint)) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const timeSamples = xToTime(x);
      const value = yToValue(y);

      // Optimistic local update
      setPoints((prev) => [...prev, { time: timeSamples, value }]);
      setSelectedPointIdx(null);

      // Persist to engine
      ipc.addAutomationPoint(trackId, timeSamples, value, paramType).catch(() => {});
    },
    [trackId, paramType, xToTime, yToValue],
  );

  /** Click on a point to select it. */
  const handlePointClick = React.useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.stopPropagation();
      setSelectedPointIdx(idx);
    },
    [],
  );

  /** Double-click on a point to delete it. */
  const handlePointDoubleClick = React.useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.stopPropagation();
      const pt = sortedPoints[idx];
      if (!pt) return;

      setPoints((prev) => prev.filter((p) => !(p.time === pt.time && p.value === pt.value)));
      setSelectedPointIdx(null);

      ipc.call('daw.delete_automation_point', {
        track_id: trackId,
        control: paramType,
        time_samples: pt.time,
      }).catch(() => {});
    },
    [trackId, paramType, sortedPoints],
  );

  /** Begin dragging a point. */
  const handlePointMouseDown = React.useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.stopPropagation();
      e.preventDefault();
      setDragIdx(idx);
      setSelectedPointIdx(idx);
      // Capture original time for delete+add on mouseUp
      const sorted = [...points].sort((a, b) => a.time - b.time);
      if (sorted[idx]) {
        setDragOrigTime(sorted[idx].time);
      }
    },
    [points],
  );

  /** Global mouse move/up for point dragging. */
  React.useEffect(() => {
    if (dragIdx === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newTime = xToTime(x);
      const newValue = yToValue(y);

      setPoints((prev) => {
        const sorted = [...prev].sort((a, b) => a.time - b.time);
        if (!sorted[dragIdx]) return prev;
        sorted[dragIdx] = { time: newTime, value: newValue };
        return sorted;
      });
    };

    const handleMouseUp = () => {
      // Persist the moved point: delete old + add at new position
      const sorted = [...points].sort((a, b) => a.time - b.time);
      const pt = sorted[dragIdx];
      if (pt) {
        // Delete the old point first, then add the new one
        ipc.call('daw.delete_automation_point', {
          track_id: trackId,
          control: paramType,
          time_samples: dragOrigTime,
        }).then(() => {
          return ipc.addAutomationPoint(trackId, pt.time, pt.value, paramType);
        }).catch(() => {
          // Fallback: just try to add the new point
          ipc.addAutomationPoint(trackId, pt.time, pt.value, paramType).catch(() => {});
        });
      }
      setDragIdx(null);
      setDragOrigTime(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragIdx, dragOrigTime, points, trackId, paramType, xToTime, yToValue]);

  /** Delete key removes selected point. */
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedPointIdx === null) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;

      const sorted = [...points].sort((a, b) => a.time - b.time);
      const pt = sorted[selectedPointIdx];
      if (!pt) return;

      e.preventDefault();
      e.stopPropagation();

      setPoints((prev) => prev.filter((p) => !(p.time === pt.time && p.value === pt.value)));
      setSelectedPointIdx(null);

      ipc.call('daw.delete_automation_point', {
        track_id: trackId,
        control: paramType,
        time_samples: pt.time,
      }).catch(() => {});
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedPointIdx, points, trackId, paramType]);

  /** Hover value display. */
  const handleSvgMouseMove = React.useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (dragIdx !== null) return; // suppress tooltip while dragging
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = e.clientY - rect.top;
      const value = yToValue(y);
      setHoverInfo({ x: e.clientX - rect.left + 300, y: e.clientY - rect.top, value });
    },
    [yToValue, dragIdx],
  );

  const handleSvgMouseLeave = React.useCallback(() => {
    setHoverInfo(null);
  }, []);

  /** Mode change handler. */
  const handleModeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const mode = e.target.value;
      setAutomationMode(mode);
      ipc.setAutomationMode(trackId, mode).catch(() => {});
    },
    [trackId],
  );

  const modeInfo = modeIndicator(automationMode);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className={styles.lane} style={{ height }}>
      {/* Lane header */}
      <div className={styles.laneHeader}>
        <button className={styles.headerClose} onClick={onClose} title="Hide lane">
          X
        </button>
        <span className={styles.headerLabel}>{paramLabel}</span>
        <span className={styles.modeIndicator} style={{ color: modeInfo.color }}>
          {modeInfo.label}
        </span>
        <select
          className={styles.modeSelect}
          value={automationMode}
          onChange={handleModeChange}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="off">Off</option>
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="touch">Touch</option>
          <option value="latch">Latch</option>
        </select>
      </div>

      {/* SVG automation curve */}
      <svg
        ref={svgRef}
        className={styles.automationSvg}
        width={svgWidth}
        height={height}
        style={{ color }}
        onClick={handleSvgClick}
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={handleSvgMouseLeave}
      >
        {/* Horizontal grid lines at 25%, 50%, 75% */}
        <line className={styles.gridLineH} x1={0} y1={height * 0.25} x2={svgWidth} y2={height * 0.25} />
        <line className={styles.gridLineH} x1={0} y1={height * 0.5} x2={svgWidth} y2={height * 0.5} />
        <line className={styles.gridLineH} x1={0} y1={height * 0.75} x2={svgWidth} y2={height * 0.75} />

        {/* Fill below curve */}
        {fillPathD && (
          <path d={fillPathD} className={styles.automationFill} fill={color} />
        )}

        {/* Polyline through points */}
        {polylineStr && (
          <polyline className={styles.automationLine} points={polylineStr} />
        )}

        {/* Points */}
        {sortedPoints.map((pt, idx) => (
          <circle
            key={`${pt.time}-${idx}`}
            className={`${styles.automationPoint} ${selectedPointIdx === idx ? styles.automationPointSelected : ''}`}
            cx={timeToX(pt.time)}
            cy={valueToY(pt.value)}
            r={selectedPointIdx === idx ? 5 : 3.5}
            onClick={(e) => handlePointClick(e, idx)}
            onDoubleClick={(e) => handlePointDoubleClick(e, idx)}
            onMouseDown={(e) => handlePointMouseDown(e, idx)}
          />
        ))}
      </svg>

      {/* Hover value tooltip */}
      {hoverInfo && (
        <div
          className={styles.valueTooltip}
          style={{ left: hoverInfo.x + 8, top: hoverInfo.y - 18 }}
        >
          {formatValue(paramType, hoverInfo.value)}
        </div>
      )}
    </div>
  );
};
