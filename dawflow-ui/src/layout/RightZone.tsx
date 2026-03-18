import React from 'react';
import { useUIStore } from '../stores/ui';
import { AIChatPanel } from '../right-zone/AIChatPanel';
import styles from './RightZone.module.css';

type RightZoneTab = 'vsti' | 'media' | 'cr' | 'meter' | 'ai';

const TABS: { id: RightZoneTab; label: string }[] = [
  { id: 'vsti', label: 'VS.' },
  { id: 'media', label: 'Me.' },
  { id: 'cr', label: 'CR' },
  { id: 'meter', label: 'Met.' },
  { id: 'ai' as const, label: 'AI' },
];

const MEDIA_TILES = [
  { id: 'vsti', label: 'VST Instruments', icon: '♪' },
  { id: 'loops', label: 'Loops & Samples', icon: '≋' },
  { id: 'presets', label: 'Presets', icon: '≡' },
  { id: 'favorites', label: 'Favorites', icon: '★' },
  { id: 'browser', label: 'File Browser', icon: '▸' },
];

const VSTiTab: React.FC = () => (
  <div className={styles.tabContent}>
    <div className={styles.rackHeader}>
      <span>VST Instruments</span>
      <button className={styles.addBtn} title="Add Track Instrument">+</button>
    </div>
    <div className={styles.instrumentList}>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>1</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>2</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>3</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>4</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>5</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>6</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>7</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
      <div className={styles.instrumentSlot}>
        <span className={styles.slotNumber}>8</span>
        <span className={styles.slotEmpty}>empty</span>
      </div>
    </div>
  </div>
);

const MediaTab: React.FC = () => (
  <div className={styles.tabContent}>
    <div className={styles.searchBar}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Search Media..."
      />
    </div>
    <div className={styles.mediaTiles}>
      {MEDIA_TILES.map((tile) => (
        <button key={tile.id} className={styles.mediaTile}>
          <span className={styles.tileIcon}>{tile.icon}</span>
          <span className={styles.tileLabel}>{tile.label}</span>
        </button>
      ))}
    </div>
    <div className={styles.previewer}>
      <div className={styles.previewerLabel}>Previewer</div>
      <div className={styles.previewerControls}>
        <button className={styles.previewBtn}>▶</button>
        <div className={styles.previewVolume}>
          <div className={styles.previewVolumeFill} />
        </div>
        <label className={styles.autoPlayLabel}>
          <input type="checkbox" className={styles.autoPlayCheck} />
          Auto
        </label>
      </div>
    </div>
  </div>
);

const CRTab: React.FC = () => (
  <div className={styles.tabContent}>
    <div className={styles.placeholder}>
      <div className={styles.placeholderTitle}>Control Room</div>
      <div className={styles.crSection}>
        <div className={styles.crSectionHeader}>Sources</div>
        <div className={styles.crRow}>
          <span>Mix</span>
          <button className={`${styles.crBtn} ${styles.crBtnActive}`}>●</button>
        </div>
        <div className={styles.crRow}>
          <span>External 1</span>
          <button className={styles.crBtn}>○</button>
        </div>
      </div>
      <div className={styles.crSection}>
        <div className={styles.crSectionHeader}>Monitor</div>
        <div className={styles.crControls}>
          <button className={styles.crToggle}>Dim</button>
          <button className={styles.crToggle}>Ref</button>
          <button className={styles.crToggle}>Mono</button>
        </div>
        <div className={styles.crFader}>
          <div className={styles.crFaderTrack}>
            <div className={styles.crFaderThumb} style={{ bottom: '75%' }} />
          </div>
          <span className={styles.crFaderValue}>0.0 dB</span>
        </div>
      </div>
      <div className={styles.crSection}>
        <div className={styles.crSectionHeader}>Talkback / Click</div>
        <div className={styles.crControls}>
          <button className={styles.crToggle}>Talk</button>
          <button className={styles.crToggle}>Click</button>
        </div>
      </div>
    </div>
  </div>
);

const MeterTab: React.FC = () => (
  <div className={styles.tabContent}>
    <div className={styles.meterPanel}>
      <div className={styles.meterTitle}>Master Meter</div>
      <div className={styles.masterMeter}>
        <div className={styles.meterChannel}>
          <div className={styles.meterBar}>
            <div className={styles.meterFillGreen} style={{ height: '60%' }} />
          </div>
          <span className={styles.meterLabel}>L</span>
        </div>
        <div className={styles.meterChannel}>
          <div className={styles.meterBar}>
            <div className={styles.meterFillGreen} style={{ height: '55%' }} />
          </div>
          <span className={styles.meterLabel}>R</span>
        </div>
      </div>
      <div className={styles.meterScale}>
        <span>0</span>
        <span>-6</span>
        <span>-12</span>
        <span>-24</span>
        <span>-48</span>
        <span>-∞</span>
      </div>
      <div className={styles.loudnessSection}>
        <div className={styles.loudnessTitle}>Loudness (EBU R128)</div>
        <div className={styles.loudnessRow}>
          <span className={styles.loudnessLabel}>M</span>
          <span className={styles.loudnessValue}>-18.2 LUFS</span>
        </div>
        <div className={styles.loudnessRow}>
          <span className={styles.loudnessLabel}>S</span>
          <span className={styles.loudnessValue}>-19.5 LUFS</span>
        </div>
        <div className={styles.loudnessRow}>
          <span className={styles.loudnessLabel}>I</span>
          <span className={styles.loudnessValue}>-20.1 LUFS</span>
        </div>
        <div className={styles.loudnessRow}>
          <span className={styles.loudnessLabel}>LRA</span>
          <span className={styles.loudnessValue}>8.3 LU</span>
        </div>
        <div className={styles.loudnessRow}>
          <span className={styles.loudnessLabel}>TP</span>
          <span className={styles.loudnessValue}>-1.2 dB</span>
        </div>
      </div>
    </div>
  </div>
);

export const RightZone: React.FC = () => {
  const rightZoneTab = useUIStore((s) => s.rightZoneTab);
  const setRightZoneTab = useUIStore((s) => s.setRightZoneTab);

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${rightZoneTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setRightZoneTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {rightZoneTab === 'vsti' && <VSTiTab />}
        {rightZoneTab === 'media' && <MediaTab />}
        {rightZoneTab === 'cr' && <CRTab />}
        {rightZoneTab === 'meter' && <MeterTab />}
        {rightZoneTab === 'ai' && <AIChatPanel />}
      </div>
    </div>
  );
};
