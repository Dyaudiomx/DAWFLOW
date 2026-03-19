import React, { useEffect, useState } from 'react';
import { ipc } from '../services/ipc';

interface MidiNote {
  note: number;
  velocity: number;
  start_beats: number;
  length_beats: number;
  id: number;
}

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

  useEffect(() => {
    ipc.call<MidiNote[]>('daw.get_midi_notes', {
      track_id: trackId,
      region_id: regionId,
    }).then((data) => {
      if (Array.isArray(data)) setNotes(data);
    }).catch((e) => console.warn('[IPC]', e));
  }, [trackId, regionId]);

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
              background: color,
              opacity: 0.5 + (n.velocity / 127) * 0.5,
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
};
