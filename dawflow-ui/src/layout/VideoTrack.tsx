import React, { useMemo } from 'react';
import { useVideoStore } from '../stores/video';
import styles from './VideoTrack.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoTrackProps {
  pixelsPerSecond: number;
  scrollLeftPx: number;
  sampleRate: number;
  viewportWidth: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Desired width of each frame thumbnail in pixels */
const FRAME_THUMB_WIDTH = 120;
/** Height of frame thumbnails served by harvid */
const FRAME_THUMB_HEIGHT = 68;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract just the filename from an absolute path */
function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

// ---------------------------------------------------------------------------
// Sub-component: single frame thumbnail (or placeholder)
// ---------------------------------------------------------------------------

const FrameThumb: React.FC<{
  frameNum: number;
  leftPx: number;
  widthPx: number;
  harvidUrl: string;
  videoFile: string;
}> = React.memo(({ frameNum, leftPx, widthPx, harvidUrl, videoFile }) => {
  const [errored, setErrored] = React.useState(false);

  const src = `${harvidUrl}/?file=${encodeURIComponent(videoFile)}&frame=${frameNum}&w=${FRAME_THUMB_WIDTH}&h=${FRAME_THUMB_HEIGHT}`;

  return (
    <div
      className={styles.frameContainer}
      style={{ left: leftPx, width: widthPx }}
    >
      {!errored ? (
        <img
          className={styles.frameImage}
          src={src}
          alt=""
          loading="lazy"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className={styles.framePlaceholder}>
          FR: {frameNum}
        </div>
      )}
    </div>
  );
});

FrameThumb.displayName = 'FrameThumb';

// ---------------------------------------------------------------------------
// Sub-component: placeholder frames (when harvid is unavailable)
// ---------------------------------------------------------------------------

const PlaceholderFrame: React.FC<{
  frameNum: number;
  leftPx: number;
  widthPx: number;
}> = React.memo(({ frameNum, leftPx, widthPx }) => (
  <div
    className={styles.frameContainer}
    style={{ left: leftPx, width: widthPx }}
  >
    <div className={styles.framePlaceholder}>
      FR: {frameNum}
    </div>
  </div>
));

PlaceholderFrame.displayName = 'PlaceholderFrame';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const VideoTrack: React.FC<VideoTrackProps> = ({
  pixelsPerSecond,
  scrollLeftPx,
  sampleRate: _sampleRate,
  viewportWidth,
}) => {
  const videoFile = useVideoStore((s) => s.videoFile);
  const fps = useVideoStore((s) => s.fps);
  const harvidUrl = useVideoStore((s) => s.harvidUrl);
  const harvidAvailable = useVideoStore((s) => s.harvidAvailable);
  const syncEnabled = useVideoStore((s) => s.syncEnabled);

  // All hooks MUST be called before any conditional return (React rules of hooks)
  const frameDuration = videoFile ? 1 / fps : 1;
  const frameWidthPx = frameDuration * pixelsPerSecond;
  const step = Math.max(1, Math.ceil(FRAME_THUMB_WIDTH / frameWidthPx));
  const thumbWidthPx = step * frameWidthPx;
  const firstVisibleSec = scrollLeftPx / pixelsPerSecond;
  const firstVisibleFrame = Math.floor(firstVisibleSec * (videoFile ? fps : 1));
  const startFrame = firstVisibleFrame - (firstVisibleFrame % step);
  const visibleCount = Math.ceil(viewportWidth / Math.max(thumbWidthPx, 1)) + 2;

  const frames = useMemo(() => {
    if (!videoFile) return [];
    const result: { frameNum: number; leftPx: number }[] = [];
    for (let i = 0; i < visibleCount; i++) {
      const frameNum = startFrame + i * step;
      if (frameNum < 0) continue;
      const frameSec = frameNum / fps;
      const leftPx = frameSec * pixelsPerSecond - scrollLeftPx;
      result.push({ frameNum, leftPx });
    }
    return result;
  }, [videoFile, startFrame, step, visibleCount, fps, pixelsPerSecond, scrollLeftPx]);

  // -----------------------------------------------------------------------
  // No video loaded — collapsed bar
  // -----------------------------------------------------------------------
  if (!videoFile) {
    return (
      <div className={`${styles.container} ${styles.containerCollapsed}`}>
        <div className={`${styles.header} ${styles.headerCollapsed}`}>
          <span className={styles.movieIcon}>🎬</span>
          <span className={styles.headerLabel}>Video</span>
        </div>
        <div className={styles.timeline} />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className={`${styles.container} ${styles.containerExpanded}`}>
      {/* Track header */}
      <div className={`${styles.header} ${styles.headerExpanded}`}>
        <span className={styles.movieIcon}>🎬</span>
        <span className={styles.fileName} title={videoFile}>
          {basename(videoFile)}
        </span>
        <div className={styles.headerMeta}>
          <span className={styles.fpsBadge}>{fps} fps</span>
          <span
            className={`${styles.syncDot} ${
              syncEnabled ? styles.syncDotActive : styles.syncDotInactive
            }`}
            title={syncEnabled ? 'Sync active' : 'Sync inactive'}
          />
        </div>
      </div>

      {/* Timeline: frame thumbnails */}
      <div className={styles.timeline}>
        {frames.map(({ frameNum, leftPx }) =>
          harvidAvailable ? (
            <FrameThumb
              key={frameNum}
              frameNum={frameNum}
              leftPx={leftPx}
              widthPx={thumbWidthPx}
              harvidUrl={harvidUrl}
              videoFile={videoFile}
            />
          ) : (
            <PlaceholderFrame
              key={frameNum}
              frameNum={frameNum}
              leftPx={leftPx}
              widthPx={thumbWidthPx}
            />
          )
        )}
      </div>
    </div>
  );
};
