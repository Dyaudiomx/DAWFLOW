import React, { useState } from 'react';
import { useUIStore } from '../stores/ui';
import { Inspector } from '../inspector/Inspector';
import { VisibilityTab } from '../inspector/VisibilityTab';
import { ChannelView } from '../inspector/ChannelView';
import styles from './LeftZone.module.css';

type TopTab = 'channel' | 'inspector' | 'visibility';
type BottomTab = 'track' | 'editor';

const TOP_TABS: { id: TopTab; label: string }[] = [
  { id: 'channel', label: 'Channel' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'visibility', label: 'Visibility' },
];

const BOTTOM_TABS: { id: BottomTab; label: string }[] = [
  { id: 'track', label: 'Track' },
  { id: 'editor', label: 'Editor' },
];

export const LeftZone: React.FC = () => {
  const setInspectorTab = useUIStore((s) => s.setInspectorTab);
  const [topTab, setTopTab] = useState<TopTab>('inspector');
  const [bottomTab, setBottomTab] = useState<BottomTab>('track');

  const handleTopTab = (tab: TopTab) => {
    setTopTab(tab);
    if (tab === 'visibility') {
      setInspectorTab('visibility');
    } else {
      // When switching to channel or inspector top tab, respect bottom tab
      setInspectorTab(bottomTab === 'editor' ? 'editor' : 'track');
    }
  };

  const handleBottomTab = (tab: BottomTab) => {
    setBottomTab(tab);
    if (topTab !== 'visibility') {
      setInspectorTab(tab);
    }
  };

  const renderContent = () => {
    if (topTab === 'visibility') {
      return <VisibilityTab />;
    }
    if (topTab === 'channel') {
      return <ChannelView />;
    }
    return <Inspector />;
  };

  return (
    <div className={styles.container}>
      {/* TOP tab bar: Channel | Inspector | Visibility */}
      <div className={styles.topTabBar}>
        <button className={styles.settingsIcon} title="Inspector Settings">
          =
        </button>
        {TOP_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${topTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => handleTopTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className={styles.content}>
        {renderContent()}
      </div>

      {/* BOTTOM tab bar: Track | Editor */}
      <div className={styles.bottomTabBar}>
        {BOTTOM_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${bottomTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => handleBottomTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
