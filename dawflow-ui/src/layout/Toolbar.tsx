import React from 'react';
import { useUIStore } from '../stores/ui';
import { useTransportStore } from '../stores/transport';
import { useSessionStore } from '../stores/session';
import { ipc } from '../services/ipc';
import { SvgIcon } from '../shared/SvgIcon';
import styles from './Toolbar.module.css';

type ToolType = 'select' | 'range' | 'split' | 'glue' | 'erase' | 'zoom' | 'mute' | 'draw' | 'line' | 'play' | 'color' | 'comp' | 'timewarp';

const TOOLS: { id: ToolType; icon: string; key: string }[] = [
  { id: 'select', icon: 'select', key: '1' },
  { id: 'range', icon: 'range', key: '2' },
  { id: 'split', icon: 'split', key: '3' },
  { id: 'glue', icon: 'glue', key: '4' },
  { id: 'erase', icon: 'erase', key: '5' },
  { id: 'zoom', icon: 'zoom', key: '6' },
  { id: 'mute', icon: 'mute', key: '7' },
  { id: 'draw', icon: 'draw', key: '8' },
  { id: 'line', icon: 'line', key: '9' },
  { id: 'play', icon: 'play', key: '0' },
  { id: 'color', icon: 'color', key: '' },
  { id: 'comp', icon: 'comp', key: '' },
  { id: 'timewarp', icon: 'timewarp', key: '' },
];

const QUANTIZE_VALUES = [
  { value: '1/1', label: '1/1' },
  { value: '1/2', label: '1/2' },
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/16', label: '1/16' },
  { value: '1/32', label: '1/32' },
  { value: '1/64', label: '1/64' },
  { value: '1/128', label: '1/128' },
  { value: '1/2T', label: '1/2 Triplet' },
  { value: '1/4T', label: '1/4 Triplet' },
  { value: '1/8T', label: '1/8 Triplet' },
  { value: '1/16T', label: '1/16 Triplet' },
  { value: '1/32T', label: '1/32 Triplet' },
  { value: '1/64T', label: '1/64 Triplet' },
  { value: '1/2D', label: '1/2 Dotted' },
  { value: '1/4D', label: '1/4 Dotted' },
  { value: '1/8D', label: '1/8 Dotted' },
  { value: '1/16D', label: '1/16 Dotted' },
  { value: '1/32D', label: '1/32 Dotted' },
  { value: '1/64D', label: '1/64 Dotted' },
];

export const Toolbar: React.FC = () => {
  const {
    activeTool, setActiveTool,
    snapEnabled, setSnapEnabled,
    gridType, setGridType,
    quantizeValue, setQuantizeValue,
    leftZoneVisible, toggleLeftZone,
    rightZoneVisible, toggleRightZone,
    lowerZoneVisible, toggleLowerZone,
    autoScrollEnabled,
  } = useUIStore();

  const transport = useTransportStore();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        ipc.undo().then(() => useSessionStore.getState().fetchFromEngine());
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        ipc.redo().then(() => useSessionStore.getState().fetchFromEngine());
      } else if (e.key === 's') {
        e.preventDefault();
        ipc.saveSession();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={styles.toolbar}>

      {/* Home */}
      <button className={styles.btn} title="Home">
        <SvgIcon name="home" size={16} />
      </button>

      {/* Undo / Redo */}
      <div className={styles.section}>
        <button className={styles.btn} title="Undo (Ctrl+Z)"
          onClick={() => ipc.undo().then(() => useSessionStore.getState().fetchFromEngine())}>
          <SvgIcon name="undo" size={16} />
        </button>
        <button className={styles.btn} title="Redo (Ctrl+Shift+Z)"
          onClick={() => ipc.redo().then(() => useSessionStore.getState().fetchFromEngine())}>
          <SvgIcon name="redo" size={16} />
        </button>
        <button className={styles.btn} title="Add Track"
          onClick={() => useUIStore.getState().openAddTrackDialog()}>+</button>
      </div>

      <div className={styles.separator} />

      {/* Configurations */}
      <button className={`${styles.btn} ${styles.dropdownBtn}`} title="Configurations">
        Configurations
        <span className={styles.dropdownArrow} />
      </button>

      <div className={styles.separator} />

      {/* Media & Windows icons */}
      <div className={styles.section}>
        <button className={styles.btn} title="Open MediaBay (F5)"><SvgIcon name="mediabay" size={16} /></button>
        <button className={styles.btn} title="Open Pool"><SvgIcon name="pool" size={16} /></button>
        <button className={styles.btn} title="Open MixConsole (F3)"><SvgIcon name="mixconsole" size={16} /></button>
        <button className={styles.btn} title="Open Control Room"><SvgIcon name="controlroom" size={16} /></button>
      </div>

      <div className={styles.separator} />

      {/* State Buttons */}
      <div className={styles.section}>
        <button className={styles.stateBtn} title="Mute">M</button>
        <button className={styles.stateBtn} title="Solo">S</button>
        <button className={styles.stateBtn} title="Listen">L</button>
        <button className={styles.stateBtn} title="Read">R</button>
        <button className={styles.stateBtn} title="Write">W</button>
        <button className={styles.stateBtn} title="Automation">A</button>
      </div>

      <div className={styles.separator} />

      {/* Auto-scroll, CDC */}
      <div className={styles.section}>
        <button className={`${styles.btn} ${autoScrollEnabled ? styles.active : ''}`} title="Auto-Scroll">
          <SvgIcon name="autoscroll" size={16} />
        </button>
        <button className={styles.btn} title="Constrain Delay Compensation">
          <SvgIcon name="cdc" size={16} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Locators */}
      <div className={styles.section}>
        <div className={styles.locatorDisplay}>
          <span className={styles.locatorLabel}>L</span>
          <span className={styles.locatorValue}>{transport.leftLocatorDisplay}</span>
        </div>
        <div className={styles.locatorDisplay}>
          <span className={styles.locatorLabel}>R</span>
          <span className={styles.locatorValue}>{transport.rightLocatorDisplay}</span>
        </div>
      </div>

      <div className={styles.separator} />

      {/* Tool Buttons — bigger icons */}
      <div className={styles.section}>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`${styles.toolBtn} ${activeTool === tool.id ? styles.toolActive : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.id.charAt(0).toUpperCase() + tool.id.slice(1)}${tool.key ? ` (${tool.key})` : ''}`}
          >
            <SvgIcon name={tool.icon} size={16} />
          </button>
        ))}
      </div>

      <div className={styles.separator} />

      {/* Snap + Grid + Quantize */}
      <div className={styles.section}>
        <button
          className={`${styles.btn} ${snapEnabled ? styles.active : ''}`}
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="Snap On/Off"
        >
          <SvgIcon name="snap" size={16} />
        </button>
        <select
          className={styles.select}
          value={gridType}
          onChange={(e) => setGridType(e.target.value as typeof gridType)}
          title="Grid Type"
        >
          <option value="bar">Bar</option>
          <option value="beat">Beat</option>
          <option value="useQuantize">Use Quantize</option>
        </select>
        <select
          className={`${styles.select} ${styles.selectWide}`}
          value={quantizeValue}
          onChange={(e) => setQuantizeValue(e.target.value)}
          title="Quantize"
        >
          {QUANTIZE_VALUES.map((q) => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.separator} />

      {/* Performance meters */}
      <div className={styles.section}>
        <div className={styles.perfMeter}>
          <div className={styles.perfBar}>
            <div className={styles.perfFill} style={{ width: `${transport.cpuLoad}%` }} />
          </div>
        </div>
        <div className={styles.perfMeter}>
          <div className={styles.perfBar}>
            <div className={styles.perfFill} style={{ width: `${transport.diskLoad}%` }} />
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className={styles.spacer} />

      {/* Zone toggles */}
      <div className={styles.section}>
        <button className={`${styles.zoneBtn} ${leftZoneVisible ? styles.zoneActive : ''}`}
          onClick={toggleLeftZone} title="Show/Hide Left Zone">
          <SvgIcon name="zone-left" size={14} />
        </button>
        <button className={`${styles.zoneBtn} ${lowerZoneVisible ? styles.zoneActive : ''}`}
          onClick={toggleLowerZone} title="Show/Hide Lower Zone">
          <SvgIcon name="zone-bottom" size={14} />
        </button>
        <button className={`${styles.zoneBtn} ${rightZoneVisible ? styles.zoneActive : ''}`}
          onClick={toggleRightZone} title="Show/Hide Right Zone">
          <SvgIcon name="zone-right" size={14} />
        </button>
      </div>
    </div>
  );
};
