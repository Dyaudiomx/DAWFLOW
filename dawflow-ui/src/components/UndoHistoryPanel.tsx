import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores/ui';
import { ipc } from '../services/ipc';
import type { UndoEntry } from '../services/ipc';
import styles from './UndoHistoryPanel.module.css';

// ---------------------------------------------------------------------------
// UndoHistoryPanel — floating panel showing undo/redo stacks
// ---------------------------------------------------------------------------

export const UndoHistoryPanel: React.FC = () => {
  const visible = useUIStore((s) => s.undoHistoryVisible);
  const toggle = useUIStore((s) => s.toggleUndoHistory);

  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const [busy, setBusy] = useState(false);

  // Dialog position (centered on first open)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const undoListRef = useRef<HTMLDivElement>(null);

  // ── Center on first open ──────────────────────────────────────

  useEffect(() => {
    if (visible && !position) {
      setPosition({
        x: Math.round((window.innerWidth - 280) / 2),
        y: Math.round((window.innerHeight - 400) / 2),
      });
    }
    if (!visible) {
      setPosition(null);
    }
  }, [visible]);

  // ── Poll undo history every 2s while panel is open ──────────

  const fetchHistory = useCallback(() => {
    ipc.getUndoHistory()
      .then((data) => {
        setUndoStack(data?.undo ?? []);
        setRedoStack(data?.redo ?? []);
      })
      .catch(() => {
        // Engine may not be connected yet — keep existing state
      });
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Fetch immediately
    fetchHistory();
    // Then poll every 2 seconds
    const interval = setInterval(fetchHistory, 2000);
    return () => clearInterval(interval);
  }, [visible, fetchHistory]);

  // Auto-scroll undo list to bottom (most recent entry)
  useEffect(() => {
    if (undoListRef.current) {
      undoListRef.current.scrollTop = undoListRef.current.scrollHeight;
    }
  }, [undoStack]);

  // ── Drag handling (title bar) ─────────────────────────────────

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = position ?? { x: 0, y: 0 };
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const onMove = (me: MouseEvent) => setPosition({ x: me.clientX - startX, y: me.clientY - startY });
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [position]);

  // ── Click undo entry → undo N times from current ─────────────

  const handleUndoClick = useCallback(async (clickedIndex: number) => {
    // undoStack is ordered oldest-first; clickedIndex is in that array.
    // We need to undo from current state back to (and including) clickedIndex.
    // Number of undo calls = undoStack.length - clickedIndex
    const count = undoStack.length - clickedIndex;
    if (count <= 0 || busy) return;
    setBusy(true);
    try {
      await ipc.undo(count);
      fetchHistory();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [undoStack, busy, fetchHistory]);

  // ── Click redo entry → redo N times ───────────────────────────

  const handleRedoClick = useCallback(async (clickedIndex: number) => {
    // redoStack is ordered; clicking index N means redo (N + 1) times.
    const count = clickedIndex + 1;
    if (count <= 0 || busy) return;
    setBusy(true);
    try {
      await ipc.redo(count);
      fetchHistory();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [busy, fetchHistory]);

  // ── Clear history ─────────────────────────────────────────────

  const handleClear = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ipc.call('daw.clear_undo_history');
      setUndoStack([]);
      setRedoStack([]);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [busy]);

  // ── Keyboard shortcut (Cmd+Z / Cmd+Shift+Z) ──────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only respond if no input/textarea is focused
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        ipc.undo().then(fetchHistory).catch(() => {});
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        ipc.redo().then(fetchHistory).catch(() => {});
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fetchHistory]);

  // ── Early return ──────────────────────────────────────────────

  if (!visible) return null;

  const hasHistory = undoStack.length > 0 || redoStack.length > 0;

  return (
    <div className={styles.overlay}>
      <div
        ref={panelRef}
        className={styles.panel}
        style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
      >
        {/* ===== TITLE BAR ===== */}
        <div className={styles.titleBar} onMouseDown={handleTitleMouseDown}>
          <span className={styles.titleText}>Undo History</span>
          <span className={styles.titleSpacer} />
          <button className={styles.closeBtn} onClick={toggle}>x</button>
        </div>

        {/* ===== CONTENT ===== */}
        <div className={styles.content}>
          {!hasHistory ? (
            <div className={styles.emptyState}>No history available</div>
          ) : (
            <>
              {/* ── Undo section ── */}
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Undo</span>
                <span className={styles.sectionCount}>{undoStack.length}</span>
              </div>
              <div className={styles.entryList} ref={undoListRef}>
                {undoStack.map((entry, i) => (
                  <button
                    key={`undo-${i}`}
                    className={styles.entry}
                    onClick={() => handleUndoClick(i)}
                    disabled={busy}
                    title={`Undo to "${entry.label}" (${undoStack.length - i} step${undoStack.length - i > 1 ? 's' : ''})`}
                  >
                    <span className={styles.entryIndex}>{i + 1}</span>
                    <span className={styles.entryLabel}>{entry.label}</span>
                  </button>
                ))}
              </div>

              {/* ── Current state marker ── */}
              <div className={styles.currentMarker}>
                <span className={styles.currentDot} />
                <span className={styles.currentLabel}>Current State</span>
              </div>

              {/* ── Redo section ── */}
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>Redo</span>
                <span className={styles.sectionCount}>{redoStack.length}</span>
              </div>
              <div className={styles.entryList}>
                {redoStack.map((entry, i) => (
                  <button
                    key={`redo-${i}`}
                    className={`${styles.entry} ${styles.entryRedo}`}
                    onClick={() => handleRedoClick(i)}
                    disabled={busy}
                    title={`Redo to "${entry.label}" (${i + 1} step${i + 1 > 1 ? 's' : ''})`}
                  >
                    <span className={styles.entryIndex}>{i + 1}</span>
                    <span className={styles.entryLabel}>{entry.label}</span>
                  </button>
                ))}
                {redoStack.length === 0 && (
                  <div className={styles.emptyState}>Nothing to redo</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ===== BOTTOM BAR ===== */}
        <div className={styles.bottomBar}>
          <button
            className={styles.clearBtn}
            onClick={handleClear}
            disabled={busy || !hasHistory}
            title="Clear all undo/redo history"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};
