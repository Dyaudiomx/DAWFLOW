import React from 'react';
import { useTransportStore } from '../stores/transport';
import styles from './TransportBar.module.css';

export const TransportBar: React.FC = () => {
  const transport = useTransportStore();

  return (
    <div className={styles.bar}>
      {/* ===== LEFT ZONE (flex: 1, aligns right toward center) ===== */}
      <div className={styles.leftZone}>
        {/* Small utility icons */}
        <div className={styles.utilIcons}>
          <button className={styles.utilBtn} title="Settings">⚙</button>
          <button className={styles.utilBtn} title="Performance">⊙</button>
          <button className={styles.utilBtn} title="Audio Connections">⇆</button>
          <button className={styles.utilBtn} title="MIDI Filter">♪</button>
          <button className={styles.utilBtn} title="Auto Quantize">AQ</button>
        </div>

        <div className={styles.sep} />

        {/* ASIO / Disk */}
        <div className={styles.section}>
          <div className={styles.perfGroup}>
            <span className={styles.perfLabel}>ASIO</span>
            <div className={styles.perfBar}>
              <div className={styles.perfFill} style={{ width: `${transport.cpuLoad}%` }} />
            </div>
          </div>
          <div className={styles.perfGroup}>
            <span className={styles.perfLabel}>DISK</span>
            <div className={styles.perfBar}>
              <div className={styles.perfFill} style={{ width: `${transport.diskLoad}%` }} />
            </div>
          </div>
        </div>

        <div className={styles.sep} />

        {/* Record Mode */}
        <select className={styles.select} value={transport.recordMode} onChange={() => {}}>
          <option value="normal">Normal</option>
          <option value="merge">Merge</option>
          <option value="replace">Replace</option>
          <option value="punchOnLane">Punch</option>
        </select>

        <div className={styles.sep} />

        {/* Left Locators */}
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>L</span>
          <span className={styles.locValue}>{transport.leftLocatorDisplay}</span>
        </div>
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>R</span>
          <span className={styles.locValue}>{transport.rightLocatorDisplay}</span>
        </div>
      </div>

      {/* ===== CENTER: Transport Buttons (fixed, always centered) ===== */}
      <div className={styles.transportCluster}>
        <button className={styles.tBtn} title="Go to Start" onClick={() => transport.setPosition(0)}>
          <span className={styles.iconSkipBack}><span className={styles.iconLine}/><span className={styles.iconTriLeft}/></span>
        </button>
        <button className={styles.tBtn} title="Rewind">
          <span className={styles.iconRewind}><span className={styles.iconTriLeft}/><span className={styles.iconTriLeft}/></span>
        </button>
        <button className={`${styles.tBtn} ${transport.looping ? styles.loopActive : ''}`} title="Cycle" onClick={transport.toggleLoop}>
          <span className={styles.iconLoop} />
        </button>
        <button className={styles.tBtn} title="Return to Zero" onClick={() => transport.setPosition(0)}>
          <span className={styles.iconReturnZero}><span className={styles.iconTriLeft}/><span className={styles.iconLine}/></span>
        </button>
        <button className={`${styles.tBtnBig} ${!transport.playing ? styles.stopActive : ''}`} title="Stop" onClick={transport.stop}>
          <span className={styles.iconStop} />
        </button>
        <button className={`${styles.tBtnBig} ${transport.playing && !transport.recording ? styles.playActive : ''}`} title="Play" onClick={transport.play}>
          <span className={styles.iconPlay} />
        </button>
        <button className={`${styles.tBtnBig} ${transport.recording ? styles.recordActive : ''}`} title="Record" onClick={transport.record}>
          <span className={styles.iconRecord} />
        </button>
        <button className={styles.tBtn} title="Forward">
          <span className={styles.iconForward}><span className={styles.iconTriRight}/><span className={styles.iconTriRight}/></span>
        </button>
        <button className={styles.tBtn} title="Go to End">
          <span className={styles.iconSkipFwd}><span className={styles.iconTriRight}/><span className={styles.iconLine}/></span>
        </button>
      </div>

      {/* ===== RIGHT ZONE (flex: 1, aligns left away from center) ===== */}
      <div className={styles.rightZone}>
        {/* Right Locators */}
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>♪</span>
          <span className={styles.locValue}>{transport.leftLocatorDisplay}</span>
        </div>
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>R</span>
          <span className={styles.locValue}>{transport.rightLocatorDisplay}</span>
        </div>

        <div className={styles.sep} />

        {/* Time display (single, matching size to Cubase) */}
        <div className={styles.timeDisplay}>
          {transport.positionDisplay}
        </div>

        <div className={styles.sep} />

        {/* Tempo + Tap + Time Sig + Click */}
        <div className={styles.section}>
          <div className={styles.tempoField}>
            <span className={styles.tempoVal}>{transport.tempo.toFixed(3)}</span>
            <span className={styles.tempoUpDown}>
              <button className={styles.tempoArrow}>▲</button>
              <button className={styles.tempoArrow}>▼</button>
            </span>
          </div>
          <button className={styles.tapBtn}>Tap</button>
          <div className={styles.timeSigField}>
            {transport.timeSignatureNumerator}/{transport.timeSignatureDenominator}
          </div>
          <button
            className={`${styles.clickBtn} ${transport.metronomeEnabled ? styles.clickActive : ''}`}
            onClick={transport.toggleMetronome}
            title="Click/Metronome"
          >
            <span className={styles.iconMetronome} />
          </button>
        </div>

        <div className={styles.sep} />

        <div className={styles.activityGroup}>
          <span className={styles.actText}>MI MO AI AO</span>
        </div>
      </div>
    </div>
  );
};
