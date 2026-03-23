import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { engine } from '../engine/registry';
import styles from './GroupManager.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupInfo {
  id: string;
  name: string;
  active: boolean;
  gain: boolean;
  mute: boolean;
  solo: boolean;
  member_count: number;
  members: Array<{ id: string; name: string }>;
  color?: string;
}

// Deterministic color from group name (hue derived from char codes)
function groupColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 50%, 55%)`;
}

// ---------------------------------------------------------------------------
// GroupManager — floating panel for managing route groups
// ---------------------------------------------------------------------------

export const GroupManager: React.FC = () => {
  const visible = useUIStore((s) => s.groupManagerVisible);
  const toggle = useUIStore((s) => s.toggleGroupManager);
  const tracks = useSessionStore((s) => s.tracks);

  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Drag position (centered on first open)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Center on first open ──────────────────────────────────────

  useEffect(() => {
    if (visible && !position) {
      setPosition({
        x: Math.round((window.innerWidth - 300) / 2),
        y: Math.round((window.innerHeight - 400) / 2),
      });
    }
    if (!visible) {
      setPosition(null);
      setExpandedGroup(null);
      setCreating(false);
      setConfirmDelete(null);
    }
  }, [visible]);

  // ── Fetch groups ──────────────────────────────────────────────

  const fetchGroups = useCallback(async () => {
    try {
      // getDetailed returns { groups: [...], count }
      const detailed = await engine.group.getDetailed();
      // getAll returns { groups: [{name, active, members: [{id, name}]}] }
      const all = await engine.group.getAll();

      // Merge: getDetailed has properties, getAll has member details
      const memberMap = new Map<string, Array<{ id: string; name: string }>>();
      for (const g of all.groups) {
        memberMap.set(g.name, g.members || []);
      }

      const merged: GroupInfo[] = detailed.groups.map((g) => ({
        id: g.id,
        name: g.name,
        active: g.active,
        gain: g.gain,
        mute: g.mute,
        solo: g.solo,
        member_count: g.member_count,
        members: memberMap.get(g.name) || [],
      }));

      setGroups(merged);
    } catch {
      // Engine not connected — keep existing state
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    fetchGroups();
    const interval = setInterval(fetchGroups, 3000);
    return () => clearInterval(interval);
  }, [visible, fetchGroups]);

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

  // ── Create group ──────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await engine.group.create(name);
      setNewName('');
      setCreating(false);
      await fetchGroups();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [newName, busy, fetchGroups]);

  const handleCreateKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setCreating(false);
      setNewName('');
    }
  }, [handleCreate]);

  // Focus input when creating
  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creating]);

  // ── Delete group ──────────────────────────────────────────────

  const handleDelete = useCallback(async (groupName: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await engine.group.delete(groupName);
      setConfirmDelete(null);
      if (expandedGroup === groupName) setExpandedGroup(null);
      await fetchGroups();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [busy, expandedGroup, fetchGroups]);

  // ── Toggle track membership ───────────────────────────────────

  const handleToggleTrack = useCallback(async (trackId: string, groupName: string, isMember: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (isMember) {
        await engine.group.removeTrack(trackId, groupName);
      } else {
        await engine.group.addTrack(trackId, groupName);
      }
      await fetchGroups();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [busy, fetchGroups]);

  // ── Toggle group property ─────────────────────────────────────

  const handleToggleProp = useCallback(async (groupName: string, prop: 'gain' | 'mute' | 'solo', current: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await engine.group.setProperties(groupName, { [prop]: !current });
      await fetchGroups();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [busy, fetchGroups]);

  // ── Early return ──────────────────────────────────────────────

  if (!visible) return null;

  return (
    <div className={styles.overlay}>
      <div
        ref={panelRef}
        className={styles.panel}
        style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
      >
        {/* ===== TITLE BAR ===== */}
        <div className={styles.titleBar} onMouseDown={handleTitleMouseDown}>
          <span className={styles.titleText}>Group Manager</span>
          <span className={styles.titleSpacer} />
          <button className={styles.closeBtn} onClick={toggle}>x</button>
        </div>

        {/* ===== CONTENT ===== */}
        <div className={styles.content}>
          {groups.length === 0 && !creating ? (
            <div className={styles.emptyState}>No route groups</div>
          ) : (
            groups.map((group) => {
              const isExpanded = expandedGroup === group.name;
              const memberIds = new Set(group.members.map((m) => m.id));

              return (
                <React.Fragment key={group.id || group.name}>
                  {/* ── Group row ── */}
                  <div
                    className={`${styles.groupRow} ${isExpanded ? styles.groupRowExpanded : ''}`}
                    onClick={() => setExpandedGroup(isExpanded ? null : group.name)}
                  >
                    <span
                      className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}
                    >
                      &#9654;
                    </span>
                    <span
                      className={styles.colorSwatch}
                      style={{ background: group.color || groupColor(group.name) }}
                    />
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.memberBadge}>{group.member_count}</span>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(confirmDelete === group.name ? null : group.name);
                      }}
                      title="Delete group"
                    >
                      &#x2715;
                    </button>
                  </div>

                  {/* ── Expanded detail ── */}
                  {isExpanded && (
                    <div className={styles.groupDetail}>
                      {/* Delete confirmation */}
                      {confirmDelete === group.name && (
                        <div className={styles.confirmOverlay}>
                          <span className={styles.confirmText}>Delete "{group.name}"?</span>
                          <button
                            className={`${styles.confirmBtn} ${styles.confirmYes}`}
                            onClick={() => handleDelete(group.name)}
                            disabled={busy}
                          >
                            Delete
                          </button>
                          <button
                            className={`${styles.confirmBtn} ${styles.confirmNo}`}
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Properties toggles */}
                      <div className={styles.detailLabel}>Link Properties</div>
                      <div className={styles.propsRow}>
                        <button
                          className={`${styles.propToggle} ${group.gain ? styles.propToggleActive : ''}`}
                          onClick={() => handleToggleProp(group.name, 'gain', group.gain)}
                          disabled={busy}
                        >
                          Gain
                        </button>
                        <button
                          className={`${styles.propToggle} ${group.mute ? styles.propToggleActive : ''}`}
                          onClick={() => handleToggleProp(group.name, 'mute', group.mute)}
                          disabled={busy}
                        >
                          Mute
                        </button>
                        <button
                          className={`${styles.propToggle} ${group.solo ? styles.propToggleActive : ''}`}
                          onClick={() => handleToggleProp(group.name, 'solo', group.solo)}
                          disabled={busy}
                        >
                          Solo
                        </button>
                      </div>

                      {/* Track membership */}
                      <div className={styles.detailLabel}>Member Tracks</div>
                      <div className={styles.trackList}>
                        {tracks.map((track) => {
                          const isMember = memberIds.has(track.id);
                          return (
                            <label
                              key={track.id}
                              className={styles.trackCheckRow}
                            >
                              <input
                                type="checkbox"
                                className={styles.trackCheckbox}
                                checked={isMember}
                                onChange={() => handleToggleTrack(track.id, group.name, isMember)}
                                disabled={busy}
                              />
                              <span
                                className={styles.trackCheckColor}
                                style={{ background: track.color }}
                              />
                              <span className={styles.trackCheckName}>{track.name}</span>
                            </label>
                          );
                        })}
                        {tracks.length === 0 && (
                          <div className={styles.emptyState}>No tracks in session</div>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* ===== BOTTOM BAR ===== */}
        <div className={styles.bottomBar}>
          {creating ? (
            <>
              <input
                ref={inputRef}
                className={styles.newGroupInput}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                placeholder="Group name..."
                disabled={busy}
              />
              <button
                className={styles.cancelBtn}
                onClick={() => { setCreating(false); setNewName(''); }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className={styles.newGroupBtn}
              onClick={() => setCreating(true)}
            >
              + New Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
