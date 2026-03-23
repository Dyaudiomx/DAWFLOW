import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ipc } from '../services/ipc';
import styles from './ArrangerTrack.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Section {
  id: string;
  name: string;
  startSamples: number;
  endSamples: number;
  color: string;
}

interface ArrangerTrackProps {
  pixelsPerSecond: number;
  scrollLeft: number;
  sampleRate: number;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTION_COLORS = [
  '#4a6b8a',
  '#6a4a8a',
  '#8a6a4a',
  '#4a8a6a',
  '#8a4a4a',
  '#4a8a8a',
  '#8a8a4a',
  '#6a8a4a',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ArrangerTrack: React.FC<ArrangerTrackProps> = ({
  pixelsPerSecond,
  scrollLeft,
  sampleRate,
  visible,
}) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sectionId: string;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    sectionId: string;
    mode: 'move' | 'resize-start' | 'resize-end';
    startMouseX: number;
    origStartSamples: number;
    origEndSamples: number;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Fetch sections from markers
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!visible) return;

    ipc
      .getMarkers()
      .then((data: any) => {
        const allMarkers = data.markers || data || [];
        const sectionMarkers = allMarkers.filter(
          (m: any) => m.is_section || m.type === 'section'
        );
        setSections(
          sectionMarkers.map((m: any, idx: number) => ({
            id: m.id,
            name: m.name || 'Section',
            startSamples: m.position ?? m.position_samples ?? m.start ?? 0,
            endSamples:
              m.end ?? m.end_samples ?? (m.position ?? 0) + sampleRate * 8,
            color:
              m.color || SECTION_COLORS[idx % SECTION_COLORS.length],
          }))
        );
      })
      .catch(() => {});
  }, [visible, sampleRate]);

  // -------------------------------------------------------------------------
  // Close context menu on outside click
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // -------------------------------------------------------------------------
  // Global mouse move/up for drag operations
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startMouseX;
      const deltaSamples = Math.round(
        (deltaPx / pixelsPerSecond) * sampleRate
      );

      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== dragState.sectionId) return s;

          if (dragState.mode === 'move') {
            const newStart = Math.max(0, dragState.origStartSamples + deltaSamples);
            const duration = dragState.origEndSamples - dragState.origStartSamples;
            return { ...s, startSamples: newStart, endSamples: newStart + duration };
          }

          if (dragState.mode === 'resize-start') {
            const newStart = Math.max(
              0,
              Math.min(dragState.origEndSamples - sampleRate, dragState.origStartSamples + deltaSamples)
            );
            return { ...s, startSamples: newStart };
          }

          if (dragState.mode === 'resize-end') {
            const newEnd = Math.max(
              dragState.origStartSamples + sampleRate,
              dragState.origEndSamples + deltaSamples
            );
            return { ...s, endSamples: newEnd };
          }

          return s;
        })
      );
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pixelsPerSecond, sampleRate]);

  // -------------------------------------------------------------------------
  // Interaction handlers
  // -------------------------------------------------------------------------

  /** Double-click empty area to create a section at the playhead. */
  const handleContentDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest(`.${styles.sectionBlock}`)) return;

      ipc
        .call('daw.editor.add_section_at_playhead')
        .then(() => ipc.getMarkers())
        .then((data: any) => {
          const allMarkers = data.markers || data || [];
          const sectionMarkers = allMarkers.filter(
            (m: any) => m.is_section || m.type === 'section'
          );
          setSections(
            sectionMarkers.map((m: any, idx: number) => ({
              id: m.id,
              name: m.name || 'Section',
              startSamples: m.position ?? m.position_samples ?? m.start ?? 0,
              endSamples:
                m.end ?? m.end_samples ?? (m.position ?? 0) + sampleRate * 8,
              color:
                m.color || SECTION_COLORS[idx % SECTION_COLORS.length],
            }))
          );
        })
        .catch((err) => console.warn('[ArrangerTrack] Add section failed:', err));
    },
    [sampleRate]
  );

  /** Double-click label to start inline rename. */
  const startRename = useCallback((section: Section) => {
    setEditingId(section.id);
    setEditingName(section.name);
    setContextMenu(null);
  }, []);

  /** Commit inline rename. */
  const commitRename = useCallback(
    (sectionId: string) => {
      const trimmed = editingName.trim();
      if (trimmed) {
        ipc
          .updateMarker(sectionId, { name: trimmed })
          .catch((err) => console.warn('[ArrangerTrack] Rename failed:', err));
        setSections((prev) =>
          prev.map((s) => (s.id === sectionId ? { ...s, name: trimmed } : s))
        );
      }
      setEditingId(null);
    },
    [editingName]
  );

  /** Delete a section. */
  const deleteSection = useCallback((sectionId: string) => {
    ipc
      .removeLocationMarker(sectionId)
      .catch((err) => console.warn('[ArrangerTrack] Delete section failed:', err));
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setContextMenu(null);
    if (selectedId === sectionId) setSelectedId(null);
  }, [selectedId]);

  /** Duplicate a section. */
  const duplicateSection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      const duration = section.endSamples - section.startSamples;
      const newStart = section.endSamples;
      const name = `${section.name} (Copy)`;

      ipc
        .addMarker(name, newStart)
        .then(() => ipc.getMarkers())
        .then((data: any) => {
          const allMarkers = data.markers || data || [];
          const sectionMarkers = allMarkers.filter(
            (m: any) => m.is_section || m.type === 'section'
          );
          setSections(
            sectionMarkers.map((m: any, idx: number) => ({
              id: m.id,
              name: m.name || 'Section',
              startSamples: m.position ?? m.position_samples ?? m.start ?? 0,
              endSamples:
                m.end ?? m.end_samples ?? (m.position ?? 0) + duration,
              color:
                m.color || SECTION_COLORS[idx % SECTION_COLORS.length],
            }))
          );
        })
        .catch((err) => console.warn('[ArrangerTrack] Duplicate failed:', err));

      setContextMenu(null);
    },
    [sections]
  );

  /** Change section color. */
  const changeSectionColor = useCallback(
    (sectionId: string, color: string) => {
      ipc
        .updateMarker(sectionId, { color: color.replace('#', '') + 'ff' })
        .catch((err) => console.warn('[ArrangerTrack] Set color failed:', err));
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, color } : s))
      );
      setContextMenu(null);
    },
    []
  );

  /** Begin dragging a section (move or resize). */
  const handleSectionMouseDown = useCallback(
    (e: React.MouseEvent, section: Section, mode: 'move' | 'resize-start' | 'resize-end') => {
      e.stopPropagation();
      e.preventDefault();
      setDragState({
        sectionId: section.id,
        mode,
        startMouseX: e.clientX,
        origStartSamples: section.startSamples,
        origEndSamples: section.endSamples,
      });
    },
    []
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (!visible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>Arranger</span>
      </div>
      <div
        ref={contentRef}
        className={styles.content}
        onDoubleClick={handleContentDoubleClick}
      >
        {sections.map((section) => {
          const startPx =
            (section.startSamples / sampleRate) * pixelsPerSecond - scrollLeft;
          const endPx =
            (section.endSamples / sampleRate) * pixelsPerSecond - scrollLeft;
          const widthPx = Math.max(0, endPx - startPx);

          const isSelected = selectedId === section.id;
          const isEditing = editingId === section.id;

          return (
            <div
              key={section.id}
              className={`${styles.sectionBlock} ${isSelected ? styles.sectionBlockSelected : ''}`}
              style={{
                left: `${startPx}px`,
                width: `${widthPx}px`,
                background: section.color,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(section.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(section);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  sectionId: section.id,
                });
              }}
              onMouseDown={(e) => handleSectionMouseDown(e, section, 'move')}
            >
              {/* Left resize handle */}
              <div
                className={styles.resizeHandle}
                style={{ left: 0 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleSectionMouseDown(e, section, 'resize-start');
                }}
              />

              {/* Label */}
              {isEditing ? (
                <input
                  autoFocus
                  className={styles.nameInput}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onBlur={() => commitRename(section.id)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <span className={styles.sectionLabel}>
                  {widthPx > 30 ? section.name : ''}
                </span>
              )}

              {/* Right resize handle */}
              <div
                className={styles.resizeHandle}
                style={{ right: 0 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleSectionMouseDown(e, section, 'resize-end');
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              const section = sections.find((s) => s.id === contextMenu.sectionId);
              if (section) startRename(section);
            }}
          >
            Rename
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => duplicateSection(contextMenu.sectionId)}
          >
            Duplicate
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={styles.contextMenuItem}
            onClick={() => colorInputRef.current?.click()}
          >
            Change Color
            <input
              ref={colorInputRef}
              type="color"
              className={styles.colorInput}
              defaultValue={
                sections.find((s) => s.id === contextMenu.sectionId)?.color ||
                SECTION_COLORS[0]
              }
              onChange={(e) =>
                changeSectionColor(contextMenu.sectionId, e.target.value)
              }
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => deleteSection(contextMenu.sectionId)}
          >
            Delete
          </div>
        </div>
      )}
    </div>
  );
};
