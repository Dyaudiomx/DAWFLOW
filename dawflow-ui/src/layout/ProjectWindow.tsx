import React, { useCallback } from 'react';
import { useUIStore } from '../stores/ui';
import { useSessionStore } from '../stores/session';
import { Toolbar } from './Toolbar';
import { LeftZone } from './LeftZone';
import { CenterZone } from './CenterZone';
import { RightZone } from './RightZone';
import { LowerZone } from './LowerZone';
import { TransportBar } from './TransportBar';
import { ZoneDivider } from './ZoneDivider';
import styles from './ProjectWindow.module.css';

export const ProjectWindow: React.FC = () => {
  const sessionName = useSessionStore((s) => s.sessionName);

  React.useEffect(() => {
    document.title = `${sessionName} — DAWFLOW`;
  }, [sessionName]);

  const leftZoneVisible = useUIStore((s) => s.leftZoneVisible);
  const rightZoneVisible = useUIStore((s) => s.rightZoneVisible);
  const lowerZoneVisible = useUIStore((s) => s.lowerZoneVisible);
  const transportBarVisible = useUIStore((s) => s.transportBarVisible);
  const statusLineVisible = useUIStore((s) => s.statusLineVisible);
  const leftZoneWidth = useUIStore((s) => s.leftZoneWidth);
  const rightZoneWidth = useUIStore((s) => s.rightZoneWidth);
  const lowerZoneHeight = useUIStore((s) => s.lowerZoneHeight);

  // Use getState() inside callbacks to always get fresh values during drag
  const handleLeftResize = useCallback((delta: number) => {
    const current = useUIStore.getState().leftZoneWidth;
    useUIStore.getState().setLeftZoneWidth(current + delta);
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    const current = useUIStore.getState().rightZoneWidth;
    useUIStore.getState().setRightZoneWidth(current - delta);
  }, []);

  const handleLowerResize = useCallback((delta: number) => {
    const current = useUIStore.getState().lowerZoneHeight;
    useUIStore.getState().setLowerZoneHeight(current - delta);
  }, []);

  return (
    <div className={styles.window}>
      <Toolbar />

      {statusLineVisible && (
        <div className={styles.statusLine}>
          <span>Audio Inputs</span><span className={styles.statusConnected}>Connected</span>
          <span>Audio Outputs</span><span className={styles.statusConnected}>Connected</span>
          <span>Control Room</span><span className={styles.statusDisabled}>Disabled</span>
          <span>Max. Record Time</span><span>1188 hours 38 mins</span>
          <span>Record Format</span><span>48 kHz - 24 bit</span>
          <span>Project Frame Rate</span><span>24 fps</span>
          <span>Buffer Size</span><span>512</span>
        </div>
      )}

      {/* Info Line — shows selected event properties (Cubase style) */}
      <div className={styles.infoLine}>
        <div className={styles.infoField}>
          <span className={styles.infoLabel}>Name</span>
          <span className={styles.infoValue}>No Object Selected</span>
        </div>
        <div className={styles.infoField}>
          <span className={styles.infoLabel}>Start</span>
          <span className={styles.infoValue}>-</span>
        </div>
        <div className={styles.infoField}>
          <span className={styles.infoLabel}>End</span>
          <span className={styles.infoValue}>-</span>
        </div>
        <div className={styles.infoField}>
          <span className={styles.infoLabel}>Length</span>
          <span className={styles.infoValue}>-</span>
        </div>
        <div className={styles.infoField}>
          <span className={styles.infoLabel}>Offset</span>
          <span className={styles.infoValue}>-</span>
        </div>
        <div className={styles.infoField}>
          <span className={styles.infoLabel}>Mute</span>
          <span className={styles.infoValue}>-</span>
        </div>
        <div className={styles.infoField}>
          <span className={styles.infoLabel}>Lock</span>
          <span className={styles.infoValue}>-</span>
        </div>
      </div>

      <div className={styles.mainArea}>
        {leftZoneVisible && (
          <>
            <div className={styles.leftZone} style={{ width: leftZoneWidth }}>
              <LeftZone />
            </div>
            <ZoneDivider orientation="vertical" onResize={handleLeftResize} />
          </>
        )}

        <div className={styles.centerArea}>
          <div className={styles.centerZone}>
            <CenterZone />
          </div>

          {lowerZoneVisible && (
            <>
              <ZoneDivider orientation="horizontal" onResize={handleLowerResize} />
              <div className={styles.lowerZone} style={{ height: lowerZoneHeight }}>
                <LowerZone />
              </div>
            </>
          )}
        </div>

        {rightZoneVisible && (
          <>
            <ZoneDivider orientation="vertical" onResize={handleRightResize} />
            <div className={styles.rightZone} style={{ width: rightZoneWidth }}>
              <RightZone />
            </div>
          </>
        )}
      </div>

      {transportBarVisible && <TransportBar />}
    </div>
  );
};
