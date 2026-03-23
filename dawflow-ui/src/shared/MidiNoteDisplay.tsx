import React, { useEffect, useState, useCallback } from 'react';
import { ipc } from '../services/ipc';

interface MidiNote {
  note: number;
  velocity: number;
  start_beats: number;
  length_beats: number;
  id: number;
}

// Module-level cache to avoid re-fetching MIDI notes for the same region
const midiCache = new Map<string, MidiNote[]>();

interface Props {
  trackId: string;
  regionId: string;
  color: string;
  width: number;
  height: number;
  regionLengthSamples: number;
  sampleRate: number;
  tempo: number;
}

export const MidiNoteDisplay: React.FC<Props> = ({ trackId, regionId, color, width, height, regionLengthSamples, sampleRate, tempo }) => {
  const [notes, setNotes] = useState<MidiNote[]>([]);

  const fetchNotes = useCallback((invalidateCache = false) => {
    if (!trackId || !regionId) return;
    const cacheKey = `${trackId}:${regionId}`;

    // Return cached data if available (unless explicitly invalidated)
    if (!invalidateCache && midiCache.has(cacheKey)) {
      setNotes(midiCache.get(cacheKey)!);
      return;
    }

    ipc.getMidiNotes(regionId, trackId)
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : (data?.notes || []);
        console.log('[MidiNoteDisplay]', regionId, 'fetched', arr.length, 'notes');
        const mapped = (Array.isArray(arr) ? arr : []).map((n: any) => ({
          note: n.note ?? n.pitch ?? 60,
          velocity: n.velocity ?? 100,
          start_beats: n.start_beats ?? n.start ?? n.time ?? 0,
          length_beats: n.length_beats ?? n.length ?? 0.25,
          id: n.id ?? 0,
        }));
        setNotes(mapped);
        if (mapped.length > 0) {
          midiCache.set(cacheKey, mapped);
        }
        // Retry once after 500ms if empty (timing issue with engine)
        if (mapped.length === 0) {
          setTimeout(() => {
            ipc.getMidiNotes(regionId, trackId)
              .then((data2: any) => {
                const arr2 = Array.isArray(data2) ? data2 : (data2?.notes || []);
                if (arr2.length > 0) {
                  const retryMapped = arr2.map((n: any) => ({
                    note: n.note ?? n.pitch ?? 60,
                    velocity: n.velocity ?? 100,
                    start_beats: n.start_beats ?? n.start ?? n.time ?? 0,
                    length_beats: n.length_beats ?? n.length ?? 0.25,
                    id: n.id ?? 0,
                  }));
                  setNotes(retryMapped);
                  midiCache.set(cacheKey, retryMapped);
                }
              }).catch(() => {});
          }, 500);
        }
      }).catch(() => {});
  }, [trackId, regionId]);

  // Fetch on mount and listen for refresh events from MIDI editor
  useEffect(() => {
    fetchNotes();

    // Listen for custom event dispatched after MIDI editor adds/changes notes
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.regionId === regionId) fetchNotes(true); // invalidate cache on edit
    };
    window.addEventListener('dawflow:midi-notes-changed', handler);
    return () => window.removeEventListener('dawflow:midi-notes-changed', handler);
  }, [fetchNotes, regionId]);

  if (notes.length === 0 || width <= 0 || height <= 0) return null;

  const minNote = Math.min(...notes.map(n => n.note));
  const maxNote = Math.max(...notes.map(n => n.note));
  const noteRange = Math.max(maxNote - minNote + 1, 12);
  const regionLengthBeats = (regionLengthSamples / sampleRate) * (tempo / 60);
  const totalBeats = regionLengthBeats || 4;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height }}>
      {notes.map((n) => {
        const left = (n.start_beats / totalBeats) * width;
        const w = Math.max((n.length_beats / totalBeats) * width, 2);
        const top = ((maxNote - n.note) / noteRange) * height;
        const h = Math.max(height / noteRange, 1);
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left, top, width: w, height: h,
              background: `color-mix(in srgb, ${color} 60%, #000)`,
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
};
