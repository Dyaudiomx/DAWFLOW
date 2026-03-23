import React, { useEffect, useRef, useState } from 'react';
import { ipc } from '../services/ipc';

interface Props {
  trackId: string;
  regionId: string;
  color: string;
  width: number;
  height: number;
  fadeInPx?: number;
  fadeOutPx?: number;
}

type Peak = { min: number; max: number };

// ---------------------------------------------------------------------------
// Module-level peak cache — keyed by "trackId:regionId:nPeaks"
// Survives across component mounts so the same waveform is never fetched twice.
// ---------------------------------------------------------------------------
const peakCache = new Map<string, Peak[][]>();
const pendingFetches = new Map<string, Promise<Peak[][]>>();

// ---------------------------------------------------------------------------
// Module-level IPC fetch queue — limits concurrent peak requests to avoid
// overwhelming the Unix socket when hundreds of regions render at once.
// ---------------------------------------------------------------------------
let inFlight = 0;
const MAX_CONCURRENT = 4;
const fetchQueue: Array<() => void> = [];

function processQueue() {
  while (inFlight < MAX_CONCURRENT && fetchQueue.length > 0) {
    const next = fetchQueue.shift()!;
    inFlight++;
    next();
  }
}

/**
 * Fetch peaks for a region with caching and concurrency control.
 * - Returns cached data immediately if available.
 * - De-duplicates in-flight requests for the same key.
 * - Limits concurrency to MAX_CONCURRENT simultaneous IPC calls.
 */
async function fetchPeaksCached(
  trackId: string,
  regionId: string,
  nPeaks: number,
): Promise<Peak[][]> {
  const key = `${trackId}:${regionId}:${nPeaks}`;

  // 1. Already cached — instant return
  if (peakCache.has(key)) return peakCache.get(key)!;

  // 2. Already in-flight — piggyback on existing promise
  if (pendingFetches.has(key)) return pendingFetches.get(key)!;

  // 3. Enqueue a new fetch
  const promise = new Promise<Peak[][]>((resolve) => {
    const doFetch = async () => {
      try {
        // Detect stereo by probing channel 1
        let nCh = 1;
        const test = await ipc.call<Peak[]>('daw.get_audio_peaks', {
          track_id: trackId,
          region_id: regionId,
          n_peaks: 8,
          channel: 1,
        });
        if (Array.isArray(test) && test.length > 0) nCh = 2;

        const channels: Peak[][] = [];
        for (let ch = 0; ch < nCh; ch++) {
          const p = await ipc.call<Peak[]>('daw.get_audio_peaks', {
            track_id: trackId,
            region_id: regionId,
            n_peaks: nPeaks,
            channel: ch,
          });
          channels.push(Array.isArray(p) && p.length > 0 ? p : []);
        }

        if (channels.length > 0 && channels[0].length > 0) {
          peakCache.set(key, channels);
        }
        resolve(channels);
      } catch {
        resolve([]);
      } finally {
        inFlight--;
        pendingFetches.delete(key);
        processQueue();
      }
    };

    fetchQueue.push(doFetch);
    processQueue();
  });

  pendingFetches.set(key, promise);
  return promise;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16) || 100,
    parseInt(c.substring(2, 4), 16) || 140,
    parseInt(c.substring(4, 6), 16) || 180,
  ];
}

export const WaveformDisplay: React.FC<Props> = ({
  trackId, regionId, color, width, height,
  fadeInPx = 0, fadeOutPx = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<{ ch: Peak[][]; w: number }>({ ch: [], w: 0 });

  // Compute nPeaks from width (clamped to 2048) — used as a dependency
  const nPeaks = width > 0 ? Math.min(Math.floor(width), 2048) : 0;

  // Fetch peaks when region, track, or zoom level (nPeaks) changes
  useEffect(() => {
    if (nPeaks <= 0 || height <= 0) return;
    let cancelled = false;

    const fetchAll = async (attempt: number) => {
      if (cancelled) return;

      const channels = await fetchPeaksCached(trackId, regionId, nPeaks);

      if (cancelled) return;

      if (channels.length > 0 && channels[0].length > 0) {
        setPeaks({ ch: channels, w: width });
      } else if (attempt < 5) {
        // Retry with back-off (peaks may not be ready yet for new regions)
        setTimeout(() => fetchAll(attempt + 1), 800 * (attempt + 1));
      }
    };

    fetchAll(0);
    return () => { cancelled = true; };
  }, [trackId, regionId, nPeaks, height, width]);

  // Draw canvas via requestAnimationFrame — debounces to one paint per frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.ch.length === 0 || peaks.ch[0].length === 0) return;
    const drawW = peaks.w;
    if (drawW <= 0 || height <= 0) return;

    const rafId = requestAnimationFrame(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const [r, g, b] = hexToRgb(color);

      canvas.width = drawW;
      canvas.height = height;
      ctx.clearRect(0, 0, drawW, height);

      const nCh = peaks.ch.length;
      for (let ch = 0; ch < nCh; ch++) {
        const chData = peaks.ch[ch];
        const chH = nCh >= 2 ? (height - 1) / 2 : height;
        const chY = ch === 0 ? 0 : chH + 1;
        const mid = chY + chH / 2;
        const step = drawW / chData.length;

        for (let i = 0; i < chData.length; i++) {
          const p = chData[i];
          const x = i * step;

          // Fade envelope
          let fg = 1;
          if (fadeInPx > 0 && x < fadeInPx) fg = Math.max(0, x / fadeInPx);
          if (fadeOutPx > 0 && x > drawW - fadeOutPx) fg = Math.max(0, (drawW - x) / fadeOutPx);

          const top = mid - (p.max * (chH / 2) * fg);
          const bot = mid - (p.min * (chH / 2) * fg);
          const bh = Math.max(bot - top, 0.5);

          ctx.globalAlpha = 1.0;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, top, Math.max(step, 1), bh);
          if (bh > 2) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = `rgb(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)})`;
            ctx.fillRect(x, top, Math.max(step, 1), 1);
            ctx.fillRect(x, bot - 1, Math.max(step, 1), 1);
          }
        }
      }

      // Stereo divider
      if (nCh >= 2) {
        ctx.globalAlpha = 0.15; ctx.fillStyle = '#fff';
        ctx.fillRect(0, (height - 1) / 2, drawW, 1);
      }

      // Fade lines are drawn via CSS overlays in CenterZone (not canvas)
    });

    return () => cancelAnimationFrame(rafId);
  }, [peaks, color, height, fadeInPx, fadeOutPx]);

  // Canvas renders at original fetched width; parent clips via overflow:hidden
  const canvasW = peaks.w > 0 ? peaks.w : width;

  return (
    <canvas ref={canvasRef}
      style={{ display: 'block', width: `${canvasW}px`, minWidth: `${canvasW}px`, height: '100%', position: 'relative', zIndex: 1 }}
    />
  );
};
