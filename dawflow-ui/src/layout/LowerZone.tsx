import React from 'react';
import { useUIStore } from '../stores/ui';
import type { LowerZoneTab } from '../stores/ui';
import { LowerMixConsole } from '../lower-zone/LowerMixConsole';
import { EditorHost } from '../lower-zone/EditorHost';
import { SamplerControl } from '../lower-zone/SamplerControl';
import { ChordPads } from '../lower-zone/ChordPads';
import { MidiRemote } from '../lower-zone/MidiRemote';
import styles from './LowerZone.module.css';

const TABS: { id: LowerZoneTab; label: string }[] = [
  { id: 'mixconsole', label: 'MixConsole' },
  { id: 'editor', label: 'Editor' },
  { id: 'sampler', label: 'Sampler Control' },
  { id: 'chordpads', label: 'Chord Pads' },
  { id: 'midiremote', label: 'MIDI Remote' },
];

export const LowerZone: React.FC = () => {
  const lowerZoneTab = useUIStore((s) => s.lowerZoneTab);
  const setLowerZoneTab = useUIStore((s) => s.setLowerZoneTab);

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${lowerZoneTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setLowerZoneTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {lowerZoneTab === 'mixconsole' && <LowerMixConsole />}
        {lowerZoneTab === 'editor' && <EditorHost />}
        {lowerZoneTab === 'sampler' && <SamplerControl />}
        {lowerZoneTab === 'chordpads' && <ChordPads />}
        {lowerZoneTab === 'midiremote' && <MidiRemote />}
      </div>
    </div>
  );
};
