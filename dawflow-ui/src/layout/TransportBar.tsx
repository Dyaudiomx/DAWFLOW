import React from 'react';
import { useTransportStore } from '../stores/transport';
import { useSessionStore } from '../stores/session';
import { ipc } from '../services/ipc';
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
        <select className={styles.select} value={transport.recordMode} onChange={(e) => useTransportStore.setState({ recordMode: e.target.value as 'normal' | 'merge' | 'replace' | 'punchOnLane' })}>
          <option value="normal">Normal</option>
          <option value="merge">Merge</option>
          <option value="replace">Replace</option>
          <option value="punchOnLane">Punch</option>
        </select>

        <div className={styles.sep} />

        {/* Left Locators */}
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>L</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.leftLocatorDisplay}
            key={`L-${transport.leftLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setLeftLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>R</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.rightLocatorDisplay}
            key={`R-${transport.rightLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setRightLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      </div>

      {/* ===== CENTER: Transport Buttons (fixed, always centered) ===== */}
      <div className={styles.transportCluster}>
        <button className={styles.tBtn} title="Go to Start" onClick={() => { ipc.transportLocate(0).catch((e) => console.warn('[IPC]', e)); transport.setPosition(0); }}>
          <span className={styles.iconSkipBack}><span className={styles.iconLine}/><span className={styles.iconTriLeft}/></span>
        </button>
        <button className={styles.tBtn} title="Rewind" onClick={() => {
          const pos = useTransportStore.getState().position;
          const sr = useSessionStore.getState().sampleRate || 48000;
          const newPos = Math.max(0, pos - 5);
          ipc.transportLocate(Math.floor(newPos * sr)).catch((e) => console.warn('[IPC]', e));
          useTransportStore.getState().setPosition(newPos);
        }}>
          <span className={styles.iconRewind}><span className={styles.iconTriLeft}/><span className={styles.iconTriLeft}/></span>
        </button>
        <button className={`${styles.tBtn} ${transport.looping ? styles.loopActive : ''}`} title="Cycle" onClick={transport.toggleLoop}>
          <span className={styles.iconLoop} />
        </button>
        <button className={styles.tBtn} title="Return to Zero" onClick={() => { ipc.transportLocate(0).catch((e) => console.warn('[IPC]', e)); transport.setPosition(0); }}>
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
        <button className={styles.tBtn} title="Forward" onClick={() => {
          const pos = useTransportStore.getState().position;
          const sr = useSessionStore.getState().sampleRate || 48000;
          const newPos = pos + 5;
          ipc.transportLocate(Math.floor(newPos * sr)).catch((e) => console.warn('[IPC]', e));
          useTransportStore.getState().setPosition(newPos);
        }}>
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
          <span className={styles.locIcon}>&#9834;</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.leftLocatorDisplay}
            key={`L2-${transport.leftLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setLeftLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        <div className={styles.locatorField}>
          <span className={styles.locIcon}>R</span>
          <input
            type="text"
            className={styles.locValue}
            defaultValue={transport.rightLocatorDisplay}
            key={`R2-${transport.rightLocator}`}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) transport.setRightLocator(v);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
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
            <input
              type="text"
              className={styles.tempoVal}
              defaultValue={transport.tempo.toFixed(2)}
              key={Math.round(transport.tempo * 100)}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (v >= 20 && v <= 300) transport.setTempo(v);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
            <span className={styles.tempoUpDown}>
              <button className={styles.tempoArrow} onClick={() => transport.setTempo(Math.min(300, transport.tempo + 1))}>▲</button>
              <button className={styles.tempoArrow} onClick={() => transport.setTempo(Math.max(20, transport.tempo - 1))}>▼</button>
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
