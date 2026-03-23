import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ipc } from '../services/ipc';
import styles from './MarkerTrack.module.css';

interface Marker {
  id: string;
  name: string;
  position: number; // samples
  color: string;
  type: string;
}

interface MarkerTrackProps {
  pixelsPerSecond: number;
  scrollLeft: number;
  sampleRate: number;
}

export const MarkerTrack: React.FC<MarkerTrackProps> = ({
  pixelsPerSecond,
  scrollLeft,
  sampleRate,
}) => {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    markerId: string;
  } | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Fetch markers on mount
  useEffect(() => {
    ipc
      .getMarkers()
      .then((data: any) => {
        setMarkers(
          ((data as any).markers || data || []).map((m: any) => ({
            id: m.id,
            name: m.name || 'Marker',
            position: m.position ?? m.position_samples ?? 0,
            color: m.color || '#ffa500',
            type: m.type || 'marker',
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

  // Seek to marker position
  const seekToMarker = useCallback(
    (positionSamples: number) => {
      ipc.transportLocate(positionSamples).catch((e) => console.warn('[IPC]', e));
    },
    []
  );

  // Start inline rename
  const startRename = useCallback((marker: Marker) => {
    setEditingId(marker.id);
    setEditingName(marker.name);
    setContextMenu(null);
  }, []);

  // Commit rename
  const commitRename = useCallback(
    (markerId: string) => {
      const trimmed = editingName.trim();
      if (trimmed) {
        ipc.updateMarker(markerId, { name: trimmed }).catch((e) =>
          console.warn('[IPC] Rename marker failed:', e)
        );
        setMarkers((prev) =>
          prev.map((m) => (m.id === markerId ? { ...m, name: trimmed } : m))
        );
      }
      setEditingId(null);
    },
    [editingName]
  );

  // Delete a marker
  const deleteMarker = useCallback((markerId: string) => {
    ipc.removeLocationMarker(markerId).catch((e) =>
      console.warn('[IPC] Delete marker failed:', e)
    );
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
    setContextMenu(null);
  }, []);

  // Set marker color
  const setMarkerColor = useCallback((markerId: string, color: string) => {
    ipc.updateMarker(markerId, { color: color.replace('#', '') + 'ff' }).catch((e) =>
      console.warn('[IPC] Set marker color failed:', e)
    );
    setMarkers((prev) =>
      prev.map((m) => (m.id === markerId ? { ...m, color } : m))
    );
    setContextMenu(null);
  }, []);

  // Double-click empty area to create a new marker
  const handleTimelineDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If double-clicking on an existing marker flag, don't create a new one
      if ((e.target as HTMLElement).closest(`.${styles.markerFlag}`)) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const offsetPx = e.clientX - rect.left + scrollLeft;
      const seconds = offsetPx / pixelsPerSecond;
      const positionSamples = Math.max(0, Math.floor(seconds * sampleRate));
      const name = `Marker ${markers.length + 1}`;

      ipc
        .addMarker(name, positionSamples)
        .then(() => {
          // Re-fetch to get the server-assigned ID
          return ipc.getMarkers();
        })
        .then((data: any) => {
          setMarkers(
            ((data as any).markers || data || []).map((m: any) => ({
              id: m.id,
              name: m.name || 'Marker',
              position: m.position ?? m.position_samples ?? 0,
              color: m.color || '#ffa500',
              type: m.type || 'marker',
            }))
          );
        })
        .catch((e) => console.warn('[IPC] Add marker failed:', e));
    },
    [pixelsPerSecond, scrollLeft, sampleRate, markers.length]
  );

  return (
    <div className={styles.markerTrack}>
      <div className={styles.markerTrackHeader}>
        <span>Markers</span>
      </div>
      <div
        className={styles.markerTimeline}
        onDoubleClick={handleTimelineDoubleClick}
      >
        {markers.map((marker) => {
          const leftPx = (marker.position / sampleRate) * pixelsPerSecond - scrollLeft;

          return (
            <div
              key={marker.id}
              className={styles.markerFlag}
              style={{ left: `${leftPx}px`, color: marker.color }}
              onClick={(e) => {
                e.stopPropagation();
                seekToMarker(marker.position);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(marker);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, markerId: marker.id });
              }}
            >
              <div className={styles.markerTriangle} />
              <div
                className={styles.markerLine}
                style={{ background: marker.color }}
              />
              {editingId === marker.id ? (
                <input
                  autoFocus
                  className={styles.markerNameInput}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => commitRename(marker.id)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <span
                  className={styles.markerLabel}
                  style={{ background: `${marker.color}33` }}
                >
                  {marker.name}
                </span>
              )}
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
              const marker = markers.find((m) => m.id === contextMenu.markerId);
              if (marker) startRename(marker);
            }}
          >
            Rename
          </div>
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => deleteMarker(contextMenu.markerId)}
          >
            Delete
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              colorInputRef.current?.click();
            }}
          >
            Set Color
            <input
              ref={colorInputRef}
              type="color"
              className={styles.colorInput}
              defaultValue={
                markers.find((m) => m.id === contextMenu.markerId)?.color || '#ffa500'
              }
              onChange={(e) => setMarkerColor(contextMenu.markerId, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
