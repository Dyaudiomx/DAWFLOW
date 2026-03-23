import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ipc } from '../services/ipc';
import styles from './SignatureTrack.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeterPoint {
  positionSamples: number;
  numerator: number;
  denominator: number;
}

interface SignatureTrackProps {
  pixelsPerSecond: number;
  scrollLeft: number;
  sampleRate: number;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SignatureTrack: React.FC<SignatureTrackProps> = ({
  pixelsPerSecond,
  scrollLeft,
  sampleRate,
  visible,
}) => {
  const [meterPoints, setMeterPoints] = useState<MeterPoint[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pointIdx: number;
  } | null>(null);
  const [addDialog, setAddDialog] = useState<{
    x: number;
    y: number;
    positionSamples: number;
  } | null>(null);
  const [addNum, setAddNum] = useState('4');
  const [addDen, setAddDen] = useState('4');

  const numInputRef = useRef<HTMLInputElement>(null);

  // -----------------------------------------------------------------------
  // Fetch meter points
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!visible) return;
    ipc
      .call('daw.tempo_map.get_all_meter_points')
      .then((data: any) => {
        setMeterPoints(
          (data.points || []).map((p: any) => ({
            positionSamples: p.position_samples ?? p.position ?? 0,
            numerator: p.numerator ?? 4,
            denominator: p.denominator ?? 4,
          }))
        );
      })
      .catch(() => {});
  }, [visible]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Close add dialog on outside click
  useEffect(() => {
    if (!addDialog) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(`.${styles.addDialog}`)) return;
      setAddDialog(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [addDialog]);

  // Focus numerator input when add dialog opens
  useEffect(() => {
    if (addDialog) {
      numInputRef.current?.focus();
      numInputRef.current?.select();
    }
  }, [addDialog]);

  // -----------------------------------------------------------------------
  // Sorted points
  // -----------------------------------------------------------------------
  const sortedPoints = React.useMemo(
    () => [...meterPoints].sort((a, b) => a.positionSamples - b.positionSamples),
    [meterPoints]
  );

  // -----------------------------------------------------------------------
  // Coordinate helpers
  // -----------------------------------------------------------------------
  const timeToX = useCallback(
    (positionSamples: number) =>
      (positionSamples / sampleRate) * pixelsPerSecond - scrollLeft,
    [sampleRate, pixelsPerSecond, scrollLeft]
  );

  const xToTime = useCallback(
    (x: number) =>
      Math.max(0, Math.round(((x + scrollLeft) / pixelsPerSecond) * sampleRate)),
    [sampleRate, pixelsPerSecond, scrollLeft]
  );

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /** Click empty content area to add a new meter change. */
  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't trigger if clicking an existing meter label
      if ((e.target as HTMLElement).closest(`.${styles.meterLabel}`)) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const positionSamples = xToTime(x);

      setAddNum('4');
      setAddDen('4');
      setAddDialog({ x: e.clientX, y: e.clientY, positionSamples });
    },
    [xToTime]
  );

  /** Commit the add-meter dialog. */
  const commitAdd = useCallback(() => {
    if (!addDialog) return;

    const numerator = parseInt(addNum, 10);
    const denominator = parseInt(addDen, 10);
    if (
      isNaN(numerator) ||
      isNaN(denominator) ||
      numerator < 1 ||
      numerator > 32 ||
      denominator < 1 ||
      denominator > 32
    ) {
      setAddDialog(null);
      return;
    }

    const positionSamples = addDialog.positionSamples;

    // Optimistic local update
    setMeterPoints((prev) => [...prev, { positionSamples, numerator, denominator }]);

    // Persist to engine
    ipc
      .call('daw.editor.add_meter_at_position', {
        position_samples: positionSamples,
        numerator,
        denominator,
      })
      .catch(() => {});

    setAddDialog(null);
  }, [addDialog, addNum, addDen]);

  /** Right-click meter label to show delete menu. */
  const handleMeterContextMenu = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, pointIdx: idx });
    },
    []
  );

  /** Delete a meter point. */
  const deleteMeterPoint = useCallback(
    (idx: number) => {
      const pt = sortedPoints[idx];
      if (!pt) return;

      // Don't allow deleting the first meter point (always at position 0)
      if (pt.positionSamples === 0) {
        setContextMenu(null);
        return;
      }

      setMeterPoints((prev) =>
        prev.filter((p) => p.positionSamples !== pt.positionSamples)
      );

      ipc
        .call('daw.editor.edit_meter_at_position', {
          position_samples: pt.positionSamples,
        })
        .catch(() => {});

      setContextMenu(null);
    },
    [sortedPoints]
  );

  // -----------------------------------------------------------------------
  // Don't render when hidden
  // -----------------------------------------------------------------------
  if (!visible) return null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className={styles.container}>
      {/* Track header */}
      <div className={styles.header}>
        <span>Signature</span>
      </div>

      {/* Timeline content */}
      <div className={styles.content} onClick={handleContentClick}>
        {sortedPoints.map((pt, idx) => {
          const leftPx = timeToX(pt.positionSamples);
          return (
            <div
              key={`${pt.positionSamples}-${idx}`}
              className={styles.meterLabel}
              style={{ left: `${leftPx}px` }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => handleMeterContextMenu(e, idx)}
            >
              {pt.numerator}/{pt.denominator}
            </div>
          );
        })}
      </div>

      {/* Context menu (right-click on meter label) */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => deleteMeterPoint(contextMenu.pointIdx)}
          >
            {sortedPoints[contextMenu.pointIdx]?.positionSamples === 0
              ? 'Delete (initial - disabled)'
              : 'Delete'}
          </div>
        </div>
      )}

      {/* Add meter dialog */}
      {addDialog && (
        <div
          className={styles.addDialog}
          style={{ left: addDialog.x, top: addDialog.y + 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.addDialogTitle}>Add Time Signature</div>
          <div className={styles.addDialogRow}>
            <span className={styles.addDialogLabel}>Num</span>
            <input
              ref={numInputRef}
              className={styles.addDialogInput}
              type="number"
              min={1}
              max={32}
              value={addNum}
              onChange={(e) => setAddNum(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') commitAdd();
                if (e.key === 'Escape') setAddDialog(null);
              }}
            />
            <span className={styles.addDialogLabel}>/</span>
            <input
              className={styles.addDialogInput}
              type="number"
              min={1}
              max={32}
              value={addDen}
              onChange={(e) => setAddDen(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') commitAdd();
                if (e.key === 'Escape') setAddDialog(null);
              }}
            />
          </div>
          <div className={styles.addDialogButtons}>
            <button
              className={styles.addDialogBtn}
              onClick={() => setAddDialog(null)}
            >
              Cancel
            </button>
            <button
              className={`${styles.addDialogBtn} ${styles.addDialogBtnPrimary}`}
              onClick={commitAdd}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
