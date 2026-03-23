import React, { useState, useEffect, useCallback, useRef } from 'react';
import { engine } from '../engine/registry';
import { ipc } from '../services/ipc';
import { useRegionStore } from '../stores/regions';
import { useSessionStore, resetFetchDebounce } from '../stores/session';
import styles from './TakeLanes.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaylistInfo {
  id: string;
  name: string;
  regionCount: number;
  isCurrent: boolean;
}

interface TakeLanesProps {
  trackId: string;
  trackColor: string;
  pixelsPerSecond: number;
  scrollLeftPx: number;
  sampleRate: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TakeLanes: React.FC<TakeLanesProps> = ({
  trackId,
  trackColor,
  pixelsPerSecond,
  scrollLeftPx,
  sampleRate,
}) => {
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    playlistId: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Regions for the current (active) playlist come from the region store
  const regionsByTrack = useRegionStore((s) => s.regionsByTrack);
  const currentRegions = regionsByTrack[trackId] || [];

  // -------------------------------------------------------------------------
  // Fetch playlists for this track
  // -------------------------------------------------------------------------

  const fetchPlaylists = useCallback(async () => {
    try {
      const data = await engine.playlist.getTrackPlaylists(trackId);
      const list: PlaylistInfo[] = (data.playlists || []).map((p) => ({
        id: p.id,
        name: p.name,
        regionCount: p.region_count ?? 0,
        isCurrent: p.is_current ?? false,
      }));
      setPlaylists(list);
    } catch {
      // Silently ignore — track may not have playlists yet
    }
  }, [trackId]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // -------------------------------------------------------------------------
  // Close context menu on outside click
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /** Switch to a different playlist (take). */
  const switchPlaylist = useCallback(
    async (playlistId: string) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (!target || target.isCurrent) return;

      try {
        // Use the playlist by name via the engine API
        await engine.playlist.setTrackPlaylist(trackId, target.name);

        // Update local state optimistically
        setPlaylists((prev) =>
          prev.map((p) => ({
            ...p,
            isCurrent: p.id === playlistId,
          }))
        );

        // Refetch regions for the track so CenterZone picks them up
        resetFetchDebounce();
        await useSessionStore.getState().fetchFromEngine();
      } catch (err) {
        console.warn('[TakeLanes] Switch playlist failed:', err);
      }
    },
    [trackId, playlists]
  );

  /** Create a new empty playlist. */
  const handleNewPlaylist = useCallback(async () => {
    setContextMenu(null);
    try {
      await engine.playlist.newTrackPlaylist(trackId);
      await fetchPlaylists();
      resetFetchDebounce();
      await useSessionStore.getState().fetchFromEngine();
    } catch (err) {
      console.warn('[TakeLanes] New playlist failed:', err);
    }
  }, [trackId, fetchPlaylists]);

  /** Duplicate (copy) the current playlist. */
  const handleCopyPlaylist = useCallback(async () => {
    setContextMenu(null);
    try {
      await engine.playlist.copyTrackPlaylist(trackId);
      await fetchPlaylists();
      resetFetchDebounce();
      await useSessionStore.getState().fetchFromEngine();
    } catch (err) {
      console.warn('[TakeLanes] Copy playlist failed:', err);
    }
  }, [trackId, fetchPlaylists]);

  /** Start inline rename. */
  const startRename = useCallback((playlist: PlaylistInfo) => {
    setEditingId(playlist.id);
    setEditingName(playlist.name);
    setContextMenu(null);
  }, []);

  /** Commit inline rename. */
  const commitRename = useCallback(
    async (playlistId: string) => {
      const trimmed = editingName.trim();
      if (trimmed) {
        // Update local state immediately
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId ? { ...p, name: trimmed } : p
          )
        );
        // Send rename to engine (not in typed registry, use raw ipc.call)
        try {
          await ipc.call('daw.rename_playlist', {
            track_id: trackId,
            name: trimmed,
          });
        } catch (err) {
          console.warn('[TakeLanes] Rename failed:', err);
        }
      }
      setEditingId(null);
    },
    [editingName, trackId]
  );

  /** Handle context menu on a lane header. */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, playlistId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, playlistId });
    },
    []
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (playlists.length === 0) {
    return (
      <div className={styles.empty}>No playlists</div>
    );
  }

  return (
    <div className={styles.container}>
      {playlists.map((playlist) => {
        const isActive = playlist.isCurrent;
        const isEditing = editingId === playlist.id;

        return (
          <div
            key={playlist.id}
            className={`${styles.lane} ${isActive ? styles.laneActive : styles.laneInactive}`}
            onClick={() => {
              if (!isActive) switchPlaylist(playlist.id);
            }}
          >
            {/* Lane header */}
            <div
              className={`${styles.laneHeader} ${isActive ? styles.laneHeaderActive : ''}`}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(playlist);
              }}
              onContextMenu={(e) => handleContextMenu(e, playlist.id)}
            >
              {/* Current indicator dot */}
              {isActive && <div className={styles.currentDot} />}

              {/* Name or inline edit */}
              {isEditing ? (
                <input
                  ref={inputRef}
                  className={styles.nameInput}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => commitRename(playlist.id)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <span className={styles.laneNameLabel}>{playlist.name}</span>
              )}

              {/* Region count badge */}
              <span className={styles.regionBadge}>
                {isActive ? currentRegions.length : playlist.regionCount}
              </span>
            </div>

            {/* Lane timeline — region blocks */}
            <div className={styles.laneTimeline}>
              {isActive ? (
                // Active playlist: render actual regions from the region store
                currentRegions.map((region) => {
                  const startSec = region.position / sampleRate;
                  const lengthSec = region.length / sampleRate;
                  const leftPx = startSec * pixelsPerSecond - scrollLeftPx;
                  const widthPx = Math.max(2, lengthSec * pixelsPerSecond);

                  return (
                    <div
                      key={region.id}
                      className={styles.takeRegion}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                        background: trackColor,
                      }}
                      title={region.name}
                    >
                      {widthPx > 36 && (
                        <span className={styles.regionLabel}>{region.name}</span>
                      )}
                    </div>
                  );
                })
              ) : (
                // Inactive playlist: show placeholder (can't fetch regions without switching)
                playlist.regionCount > 0 ? (
                  <div className={styles.noRegions}>
                    {playlist.regionCount} region{playlist.regionCount !== 1 ? 's' : ''}
                  </div>
                ) : (
                  <div className={styles.noRegions}>Empty</div>
                )
              )}
            </div>
          </div>
        );
      })}

      {/* Context menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={styles.contextMenuItem}
            onClick={handleNewPlaylist}
          >
            New Playlist
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={handleCopyPlaylist}
          >
            Duplicate Playlist
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              const pl = playlists.find((p) => p.id === contextMenu.playlistId);
              if (pl) startRename(pl);
            }}
          >
            Rename
          </div>
        </div>
      )}
    </div>
  );
};
