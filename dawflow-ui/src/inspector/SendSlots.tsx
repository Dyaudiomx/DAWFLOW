import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Fader } from '../shared/Fader';
import { Knob } from '../shared/Knob';
import { ipc } from '../services/ipc';
import { useUIStore } from '../stores/ui';
import styles from './SendSlots.module.css';

/* ---- Data shapes ---- */

interface SendSlotData {
  id: string;
  destination: string | null;
  destinationId: string | null;
  level: number;   // 0-1 normalized
  pan: number;     // 0-1 normalized (0.5 = center)
  enabled: boolean;
  preFader: boolean;
}

interface BusOption {
  id: string;
  name: string;
}

/* ---- Defaults ---- */

const EMPTY_SENDS: SendSlotData[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i),
  destination: null,
  destinationId: null,
  level: 0,
  pan: 0.5,
  enabled: false,
  preFader: true,
}));

/* ---- Props ---- */

interface Props {
  trackId?: string;
}

/* ---- Component ---- */

export const SendSlots: React.FC<Props> = ({ trackId: trackIdProp }) => {
  // If trackId is passed as a prop, use it. Otherwise read from the UI store.
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const trackId = trackIdProp ?? selectedTrackId ?? undefined;

  const [sends, setSends] = useState<SendSlotData[]>(EMPTY_SENDS);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ==================================================================
     1. Fetch sends from engine when trackId changes
     ================================================================== */
  useEffect(() => {
    if (!trackId) {
      setSends(EMPTY_SENDS);
      return;
    }

    ipc.call<{ sends: Array<Record<string, unknown>> }>('daw.get_sends', { track_id: trackId })
      .then((data: any) => {
        if (data?.sends && Array.isArray(data.sends)) {
          const mapped = data.sends.map((s: any, idx: number): SendSlotData => ({
            id: s.id != null ? String(s.id) : String(idx),
            destination: s.target_name || s.send_name || s.name || null,
            destinationId: s.target_id != null ? String(s.target_id) : null,
            level: s.gain ?? 0.75,     // raw coefficient from engine (0-1 range, 1.0 = 0 dB)
            pan: s.pan ?? 0.5,
            enabled: s.enabled ?? s.active ?? true,
            preFader: s.pre_fader ?? false,
          }));
          // Pad to 8 slots
          const padded = Array.from({ length: 8 }, (_, i) =>
            mapped[i] ?? {
              id: String(i),
              destination: null,
              destinationId: null,
              level: 0,
              pan: 0.5,
              enabled: false,
              preFader: true,
            },
          );
          setSends(padded);
        }
      })
      .catch(() => {
        // Keep empty sends if fetch fails — engine may not support this command yet
      });
  }, [trackId]);

  /* ==================================================================
     2. Fetch available buses for destination selector
     ================================================================== */
  useEffect(() => {
    // No dedicated get_buses command — use get_tracks and filter for bus type
    ipc.getTracks()
      .then((tracks) => {
        // Exclude master bus (sends to master create feedback loops) and self
        const busList = tracks.filter((t) => t.type === 'bus' && t.name.toLowerCase() !== 'master' && t.id !== trackId);
        setBuses(busList.map((b) => ({ id: b.id, name: b.name })));
      })
      .catch(() => {
        // Buses unavailable — destination dropdown will be empty
      });
  }, []);

  /* ==================================================================
     3. Close dropdown on outside click
     ================================================================== */
  useEffect(() => {
    if (openDropdownIndex === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownIndex]);

  /* ==================================================================
     4. Send level change — optimistic + engine call
     ================================================================== */
  const handleSendLevelChange = useCallback(
    (sendIndex: number, level: number) => {
      setSends((prev) => prev.map((s, i) => (i === sendIndex ? { ...s, level } : s)));
      if (trackId) {
        // Fader value is 0-1 normalized (0.75 = 0 dB). Convert to dB for engine.
        const db = level <= 0 ? -200 : 20 * Math.log10(level / 0.75);
        ipc.call('daw.set_send_level', { track_id: trackId, send_index: sendIndex, gain_db: db });
      }
    },
    [trackId],
  );

  /* ==================================================================
     5. Send pan change — optimistic + engine call
     ================================================================== */
  const handleSendPanChange = useCallback(
    (sendIndex: number, pan: number) => {
      setSends((prev) => prev.map((s, i) => (i === sendIndex ? { ...s, pan } : s)));
      if (trackId) {
        ipc.call('daw.send.set_pan', { track_id: trackId, send_index: sendIndex, pan });
      }
    },
    [trackId],
  );

  /* ==================================================================
     6. Pre/Post fader toggle — optimistic + engine call
     ================================================================== */
  const handlePrePostToggle = useCallback(
    (sendIndex: number) => {
      const newPre = !sends[sendIndex].preFader;
      setSends((prev) => prev.map((s, i) => (i === sendIndex ? { ...s, preFader: newPre } : s)));
      if (trackId) {
        ipc.call('daw.send.set_pre_fader', { track_id: trackId, send_index: sendIndex, pre_fader: newPre });
      }
    },
    [trackId, sends],
  );

  /* ==================================================================
     7. Send enable/disable toggle — optimistic + engine call
     ================================================================== */
  const handleSendToggle = useCallback(
    (sendIndex: number) => {
      const newEnabled = !sends[sendIndex].enabled;
      setSends((prev) => prev.map((s, i) => (i === sendIndex ? { ...s, enabled: newEnabled } : s)));
      if (trackId) {
        ipc.call('daw.set_send_enable', { track_id: trackId, send_index: sendIndex, enabled: newEnabled });
      }
    },
    [trackId, sends],
  );

  /* ==================================================================
     8. Destination selection — add or change send target
     ================================================================== */
  const handleDestinationClick = useCallback(
    (sendIndex: number) => {
      setOpenDropdownIndex((prev) => (prev === sendIndex ? null : sendIndex));
    },
    [],
  );

  const handleDestinationSelect = useCallback(
    (sendIndex: number, bus: BusOption) => {
      setSends((prev) =>
        prev.map((s, i) =>
          i === sendIndex
            ? { ...s, destination: bus.name, destinationId: bus.id, enabled: true }
            : s,
        ),
      );
      setOpenDropdownIndex(null);

      if (!trackId) return;

      const slot = sends[sendIndex];
      if (slot.destinationId) {
        // Existing send — remove old, then add new target
        ipc.call('daw.aux.remove_send_from', {
          bus_id: slot.destinationId,
          track_id: trackId,
        })
          .catch(() => {})
          .finally(() => {
            ipc.call('daw.add_send', { track_id: trackId, target_bus_id: bus.id }).catch(() => {});
          });
      } else {
        // Empty slot — add a new send
        ipc.call('daw.add_send', { track_id: trackId, target_bus_id: bus.id }).catch(() => {});
      }
    },
    [trackId, sends],
  );

  const handleRemoveDestination = useCallback(
    (sendIndex: number) => {
      const destId = sends[sendIndex].destinationId;
      setSends((prev) =>
        prev.map((s, i) =>
          i === sendIndex
            ? { ...s, destination: null, destinationId: null, enabled: false, level: 0, pan: 0.5 }
            : s,
        ),
      );
      setOpenDropdownIndex(null);

      if (trackId && destId) {
        ipc.call('daw.aux.remove_send_from', { bus_id: destId, track_id: trackId }).catch(() => {});
      }
    },
    [trackId, sends],
  );

  /* ==================================================================
     Render
     ================================================================== */
  return (
    <div className={styles.sendSlots}>
      {sends.map((slot, index) => (
        <div key={index} className={styles.slot} style={{ position: 'relative' }}>
          {/* Enable/disable dot */}
          <span
            className={`${styles.activeDot} ${slot.enabled ? styles.activeDotOn : ''}`}
            onClick={() => {
              if (slot.destination) handleSendToggle(index);
            }}
            style={{ cursor: slot.destination ? 'pointer' : 'default' }}
          />

          {/* Slot index */}
          <span className={styles.slotIndex}>{index + 1}</span>

          {/* Destination label — click to open bus selector */}
          <span
            className={`${styles.destination} ${slot.destination ? styles.destinationActive : ''}`}
            onClick={() => handleDestinationClick(index)}
          >
            {slot.destination || 'empty'}
          </span>

          {/* Destination dropdown */}
          {openDropdownIndex === index && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 20,
                zIndex: 100,
                background: 'var(--bg-surface, #2a2a2a)',
                border: '1px solid var(--border-medium, #555)',
                borderRadius: 'var(--border-radius-sm, 3px)',
                maxHeight: 160,
                overflowY: 'auto',
                minWidth: 120,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {/* "No Bus" / remove option */}
              {slot.destination && (
                <div
                  style={{
                    padding: '3px 8px',
                    fontSize: 'var(--font-size-xs, 10px)',
                    color: 'var(--text-secondary, #aaa)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle, #444)',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--bg-hover, #333)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  onClick={() => handleRemoveDestination(index)}
                >
                  No Bus
                </div>
              )}

              {buses.length === 0 && (
                <div
                  style={{
                    padding: '6px 8px',
                    fontSize: 'var(--font-size-xs, 10px)',
                    color: 'var(--text-dim, #666)',
                  }}
                >
                  No buses available
                </div>
              )}

              {buses.map((bus) => (
                <div
                  key={bus.id}
                  style={{
                    padding: '3px 8px',
                    fontSize: 'var(--font-size-xs, 10px)',
                    color: slot.destinationId === bus.id ? 'var(--accent-blue, #4A90D9)' : 'var(--text-primary, #ddd)',
                    cursor: 'pointer',
                    fontWeight: slot.destinationId === bus.id ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--bg-hover, #333)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  onClick={() => handleDestinationSelect(index, bus)}
                >
                  {bus.name}
                </div>
              ))}
            </div>
          )}

          {/* Level fader (tiny horizontal) */}
          <div className={styles.levelWrap}>
            <Fader
              value={slot.level}
              onChange={(v) => handleSendLevelChange(index, v)}
              orientation="horizontal"
              height={36}
              disabled={!slot.destination}
            />
          </div>

          {/* Pan knob */}
          <div className={styles.panWrap}>
            <Knob
              value={slot.pan}
              onChange={slot.destination ? (v) => handleSendPanChange(index, v) : undefined}
              size={16}
              bipolar
            />
          </div>

          {/* Pre/Post toggle */}
          <button
            className={`${styles.prePostBtn} ${!slot.preFader ? styles.prePostActive : ''}`}
            onClick={() => handlePrePostToggle(index)}
            title={slot.preFader ? 'Pre-Fader' : 'Post-Fader'}
            disabled={!slot.destination}
          >
            {slot.preFader ? 'Pre' : 'Pst'}
          </button>
        </div>
      ))}
    </div>
  );
};
