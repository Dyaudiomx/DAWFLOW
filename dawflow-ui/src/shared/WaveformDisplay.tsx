import React, { useEffect, useRef } from 'react';
import { ipc } from '../services/ipc';

interface Props {
  trackId: string;
  regionId: string;
  color: string;
  width: number;
  height: number;
}

export const WaveformDisplay: React.FC<Props> = ({ trackId, regionId, color, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    const nPeaks = Math.min(Math.floor(width), 512);
    ipc.call<Array<{ min: number; max: number }>>('daw.get_audio_peaks', {
      track_id: trackId,
      region_id: regionId,
      n_peaks: nPeaks,
    }).then((peaks) => {
      const canvas = canvasRef.current;
      if (!canvas || !peaks || !Array.isArray(peaks) || peaks.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const mid = height / 2;
      const step = width / peaks.length;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < peaks.length; i++) {
        const p = peaks[i];
        const x = i * step;
        const top = mid - (p.max * mid);
        const bottom = mid - (p.min * mid);
        ctx.fillRect(x, top, Math.max(step, 1), bottom - top);
      }
    }).catch((e) => console.warn('[IPC]', e));
  }, [trackId, regionId, color, width, height]);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
};
