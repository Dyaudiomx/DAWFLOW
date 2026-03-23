import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '../stores/ui';
import { useMixerStore } from '../stores/mixer';
import { ipc } from '../services/ipc';
import { AIChatPanel } from '../right-zone/AIChatPanel';
import { PluginBrowser } from '../right-zone/PluginBrowser';
import MediaBrowser from '../right-zone/MediaBrowser';
import styles from './RightZone.module.css';

type RightZoneTab = 'vsti' | 'media' | 'cr' | 'meter' | 'ai';

const TABS: { id: RightZoneTab; label: string }[] = [
  { id: 'vsti', label: 'VS.' },
  { id: 'media', label: 'Me.' },
  { id: 'cr', label: 'CR' },
  { id: 'meter', label: 'Met.' },
  { id: 'ai' as const, label: 'AI' },
];


// -- Control Room tab (wired to engine monitor IPC) --

interface MonitorState {
  cutAll: boolean;
  dimAll: boolean;
  mono: boolean;
  dimLevel: number;
  soloBoostLevel: number;
  active: boolean;
}

type CRSource = 'mix' | 'ext1';

/** Convert a dB value (-60..+6) to a 0..1 ratio for the fader track. */
function dbToFaderRatio(db: number): number {
  const MIN_DB = -60;
  const MAX_DB = 6;
  return Math.max(0, Math.min(1, (db - MIN_DB) / (MAX_DB - MIN_DB)));
}

/** Convert a 0..1 ratio back to dB. */
function faderRatioToDb(ratio: number): number {
  const MIN_DB = -60;
  const MAX_DB = 6;
  return MIN_DB + ratio * (MAX_DB - MIN_DB);
}

const CRTab: React.FC = () => {
  const rightZoneTab = useUIStore((s) => s.rightZoneTab);
  const masterMeterL = useMixerStore((s) => s.masterMeterL);
  const masterMeterR = useMixerStore((s) => s.masterMeterR);
  const masterPeakL = useMixerStore((s) => s.masterPeakL);
  const masterPeakR = useMixerStore((s) => s.masterPeakR);

  const [monitorState, setMonitorState] = useState<MonitorState>({
    cutAll: false,
    dimAll: false,
    mono: false,
    dimLevel: -20,
    soloBoostLevel: 0,
    active: false,
  });

  const [activeSource, setActiveSource] = useState<CRSource>('mix');
  const [monitorLevel, setMonitorLevel] = useState(0); // dB
  const [clickEnabled, setClickEnabled] = useState(false);
  const [talkbackActive, setTalkbackActive] = useState(false);

  // Fader drag refs
  const faderTrackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const monitorBusIdRef = useRef<string | null>(null);

  // Fetch current monitor state when the CR tab becomes active
  useEffect(() => {
    if (rightZoneTab !== 'cr') return;

    // Try the comprehensive full-state endpoint first, fall back to individual queries
    ipc.call<{
      exists: boolean;
      monitor_active: boolean;
      cut_all: boolean;
      dim_all: boolean;
      mono: boolean;
      dim_level: number;
      solo_boost_level: number;
    }>('daw.monitor.get_full_state').then((state) => {
      setMonitorState({
        cutAll: state.cut_all ?? false,
        dimAll: state.dim_all ?? false,
        mono: state.mono ?? false,
        dimLevel: state.dim_level ?? -20,
        soloBoostLevel: state.solo_boost_level ?? 0,
        active: state.monitor_active ?? false,
      });
    }).catch(() => {
      // Fallback: individual queries with correct return key names
      Promise.all([
        ipc.getMonitorCutAll().catch(() => ({ cut_all: false })),
        ipc.getMonitorDimAll().catch(() => ({ dim_all: false })),
        ipc.getMonitorMono().catch(() => ({ mono: false })),
        ipc.getMonitorDimLevel().catch(() => ({ dim_level: -20 })),
        ipc.call<{ active: boolean }>('daw.monitor.is_active').catch(() => ({ active: false })),
      ]).then(([cut, dim, mono, dimLvl, active]) => {
        setMonitorState({
          cutAll: (cut as any).cut_all ?? false,
          dimAll: (dim as any).dim_all ?? false,
          mono: (mono as any).mono ?? false,
          dimLevel: (dimLvl as any).dim_level ?? -20,
          soloBoostLevel: 0,
          active: (active as { active: boolean }).active ?? false,
        });
      });
    });

    // Fetch monitor bus ID for the fader
    ipc.call<{ exists: boolean; id?: string; gain_db?: number }>('daw.get_monitor_bus_info').then((info) => {
      if (info.exists && info.id) {
        monitorBusIdRef.current = info.id;
        if (info.gain_db !== undefined) {
          setMonitorLevel(info.gain_db);
        }
      }
    }).catch(() => {});

    // Fetch metronome state
    ipc.getMetronomeState().then((state: Record<string, unknown>) => {
      setClickEnabled(!!(state.click_enabled ?? state.enabled));
    }).catch(() => {});
  }, [rightZoneTab]);

  // -- Button handlers --

  const handleDim = useCallback(() => {
    const newVal = !monitorState.dimAll;
    setMonitorState((prev) => ({ ...prev, dimAll: newVal }));
    ipc.setMonitorDimAll(newVal);
  }, [monitorState.dimAll]);

  const handleCut = useCallback(() => {
    const newVal = !monitorState.cutAll;
    setMonitorState((prev) => ({ ...prev, cutAll: newVal }));
    ipc.setMonitorCutAll(newVal);
  }, [monitorState.cutAll]);

  const handleMono = useCallback(() => {
    const newVal = !monitorState.mono;
    setMonitorState((prev) => ({ ...prev, mono: newVal }));
    ipc.setMonitorMono(newVal);
  }, [monitorState.mono]);

  const handleClick = useCallback(() => {
    const newVal = !clickEnabled;
    setClickEnabled(newVal);
    ipc.setClickEnabled(newVal).catch(() => {});
  }, [clickEnabled]);

  const handleTalkback = useCallback(() => {
    setTalkbackActive((prev) => !prev);
    // Talkback is UI-only for now — no engine endpoint exists
  }, []);

  const handleSourceSelect = useCallback((source: CRSource) => {
    setActiveSource(source);
  }, []);

  // -- Fader drag logic --

  const updateLevelFromPointer = useCallback((clientY: number) => {
    const track = faderTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    // Vertical fader: bottom = min, top = max
    const ratio = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const db = faderRatioToDb(ratio);
    const rounded = Math.round(db * 10) / 10;
    setMonitorLevel(rounded);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateLevelFromPointer(e.clientY);
    },
    [updateLevelFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updateLevelFromPointer(e.clientY);
    },
    [updateLevelFromPointer],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const busId = monitorBusIdRef.current;
    if (busId) {
      ipc.setTrackGain(busId, monitorLevel);
    }
  }, [monitorLevel]);

  // Cmd+click resets fader to 0 dB
  const handleFaderDoubleClick = useCallback(() => {
    setMonitorLevel(0);
    const busId = monitorBusIdRef.current;
    if (busId) {
      ipc.setTrackGain(busId, 0);
    }
  }, []);

  const faderPercent = dbToFaderRatio(monitorLevel) * 100;

  // Derive output level display from master meters (dB)
  const outLevelL = masterMeterL > 0 ? (20 * Math.log10(masterMeterL)).toFixed(1) : '-\u221E';
  const outLevelR = masterMeterR > 0 ? (20 * Math.log10(masterMeterR)).toFixed(1) : '-\u221E';
  const outPeakL = masterPeakL > 0 ? (20 * Math.log10(masterPeakL)).toFixed(1) : '-\u221E';
  const outPeakR = masterPeakR > 0 ? (20 * Math.log10(masterPeakR)).toFixed(1) : '-\u221E';

  // Mini meter bar percentage (0-1 to 0-100)
  const miniMeterLPct = Math.max(0, Math.min(100, masterMeterL * 100));
  const miniMeterRPct = Math.max(0, Math.min(100, masterMeterR * 100));

  return (
    <div className={styles.tabContent}>
      <div className={styles.crContainer}>
        <div className={styles.crTitle}>Control Room</div>

        {/* Sources */}
        <div className={styles.crSection}>
          <div className={styles.crSectionHeader}>Sources</div>
          <div className={styles.crRow}>
            <span>Mix</span>
            <button
              className={`${styles.crBtn} ${activeSource === 'mix' ? styles.crBtnActive : ''}`}
              onClick={() => handleSourceSelect('mix')}
            >
              {activeSource === 'mix' ? '\u25CF' : '\u25CB'}
            </button>
          </div>
          <div className={styles.crRow}>
            <span>External 1</span>
            <button
              className={`${styles.crBtn} ${activeSource === 'ext1' ? styles.crBtnActive : ''}`}
              onClick={() => handleSourceSelect('ext1')}
            >
              {activeSource === 'ext1' ? '\u25CF' : '\u25CB'}
            </button>
          </div>
        </div>

        {/* Monitor Controls */}
        <div className={styles.crSection}>
          <div className={styles.crSectionHeader}>Monitor</div>
          <div className={styles.crControls}>
            <button
              className={`${styles.crToggle} ${monitorState.dimAll ? styles.crToggleDim : ''}`}
              onClick={handleDim}
              title={`Dim output by ${monitorState.dimLevel} dB`}
            >
              Dim
            </button>
            <button
              className={`${styles.crToggle} ${monitorState.cutAll ? styles.crToggleRef : ''}`}
              onClick={handleCut}
              title="Mute monitor output"
            >
              Mute
            </button>
            <button
              className={`${styles.crToggle} ${monitorState.mono ? styles.crToggleMono : ''}`}
              onClick={handleMono}
              title="Sum to mono"
            >
              Mono
            </button>
          </div>

          {/* Vertical Monitor Level Fader */}
          <div className={styles.crFaderVertical}>
            <span className={styles.crFaderLabel}>Monitor Level</span>
            <div className={styles.crFaderColumn}>
              <div
                className={styles.crFaderTrackV}
                ref={faderTrackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={handleFaderDoubleClick}
              >
                <div
                  className={styles.crFaderFill}
                  style={{ height: `${faderPercent}%` }}
                />
                <div
                  className={styles.crFaderThumbV}
                  style={{ bottom: `${faderPercent}%` }}
                />
              </div>
              <span className={styles.crFaderValue}>
                {monitorLevel <= -60 ? '-\u221E' : monitorLevel.toFixed(1)} dB
              </span>
            </div>
          </div>
        </div>

        {/* Output Level Display */}
        <div className={styles.crSection}>
          <div className={styles.crSectionHeader}>Output Level</div>
          <div className={styles.crMiniMeters}>
            <div className={styles.crMiniMeterRow}>
              <span className={styles.crMiniLabel}>L</span>
              <div className={styles.crMiniBar}>
                <div
                  className={styles.crMiniFill}
                  style={{ width: `${miniMeterLPct}%` }}
                />
              </div>
              <span className={styles.crMiniValue}>{outLevelL}</span>
            </div>
            <div className={styles.crMiniMeterRow}>
              <span className={styles.crMiniLabel}>R</span>
              <div className={styles.crMiniBar}>
                <div
                  className={styles.crMiniFill}
                  style={{ width: `${miniMeterRPct}%` }}
                />
              </div>
              <span className={styles.crMiniValue}>{outLevelR}</span>
            </div>
          </div>
          <div className={styles.crPeakRow}>
            <span className={styles.crPeakLabel}>Peak</span>
            <span className={styles.crPeakValue}>L {outPeakL}</span>
            <span className={styles.crPeakValue}>R {outPeakR}</span>
          </div>
        </div>

        {/* Talkback / Click */}
        <div className={styles.crSection}>
          <div className={styles.crSectionHeader}>Talkback / Click</div>
          <div className={styles.crControls}>
            <button
              className={`${styles.crToggle} ${talkbackActive ? styles.crToggleTalk : ''}`}
              onClick={handleTalkback}
              title="Talkback (UI only)"
            >
              Talk
            </button>
            <button
              className={`${styles.crToggle} ${clickEnabled ? styles.crToggleClick : ''}`}
              onClick={handleClick}
              title="Metronome click"
            >
              Click
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Convert a dB value (-60..0+) to a 0-100% height for the meter bar. */
function dbToPercent(db: number): number {
  return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
}

/** Pick a meter fill CSS class name based on the dB level. */
function meterFillClass(db: number): string {
  if (db > -3) return styles.meterFillRed;
  if (db > -12) return styles.meterFillYellow;
  return styles.meterFillGreen;
}

const MeterTab: React.FC = () => {
  const rightZoneTab = useUIStore((s) => s.rightZoneTab);
  const masterPeakL = useMixerStore((s) => s.masterPeakL);
  const masterPeakR = useMixerStore((s) => s.masterPeakR);
  const resetMasterPeak = useMixerStore((s) => s.resetMasterPeak);

  const [masterMeter, setMasterMeter] = useState({ left: -100, right: -100 });
  const [peakHold, setPeakHold] = useState({ left: -100, right: -100 });
  // Running LUFS estimate: derived from peak levels with rolling average
  const lufsHistory = useRef<number[]>([]);
  const [lufsEstimate, setLufsEstimate] = useState({
    momentary: -100,   // ~400ms window
    shortTerm: -100,   // ~3s window
    integrated: -100,  // running total
  });

  useEffect(() => {
    if (rightZoneTab !== 'meter') return;

    // Poll master meter every 200ms for smoother response
    const meterInterval = setInterval(() => {
      ipc.getMasterMeter().then((data) => {
        const chs = data.channels ?? [];
        const leftDb = chs[0]?.peak_db ?? -100;
        const rightDb = chs[1]?.peak_db ?? chs[0]?.peak_db ?? -100;

        setMasterMeter({ left: leftDb, right: rightDb });

        // Update peak hold (only rises, requires manual reset)
        setPeakHold((prev) => ({
          left: Math.max(prev.left, leftDb),
          right: Math.max(prev.right, rightDb),
        }));

        // Approximate LUFS from peak dB:
        // LUFS roughly = peak_dB - 10 for typical program material (ITU-R BS.1770 approximation)
        // Use the louder channel as the reference
        const peakDb = Math.max(leftDb, rightDb);
        if (peakDb > -90) {
          const instantLufs = peakDb - 10;
          lufsHistory.current.push(instantLufs);
          // Keep at most 150 samples (~30s at 200ms interval)
          if (lufsHistory.current.length > 150) {
            lufsHistory.current = lufsHistory.current.slice(-150);
          }
          const h = lufsHistory.current;
          // Momentary: last 2 samples (~400ms)
          const momSlice = h.slice(-2);
          const momentary = momSlice.reduce((a, b) => a + b, 0) / momSlice.length;
          // Short-term: last 15 samples (~3s)
          const stSlice = h.slice(-15);
          const shortTerm = stSlice.reduce((a, b) => a + b, 0) / stSlice.length;
          // Integrated: full history
          const integrated = h.reduce((a, b) => a + b, 0) / h.length;
          setLufsEstimate({ momentary, shortTerm, integrated });
        }
      }).catch(() => {});
    }, 200);

    return () => {
      clearInterval(meterInterval);
    };
  }, [rightZoneTab]);

  const handleReset = () => {
    setPeakHold({ left: -100, right: -100 });
    lufsHistory.current = [];
    setLufsEstimate({ momentary: -100, shortTerm: -100, integrated: -100 });
    resetMasterPeak();
  };

  const leftDb = masterMeter.left;
  const rightDb = masterMeter.right;

  // True peak from mixer store (converted to dB)
  const truePeakDb = Math.max(
    masterPeakL > 0 ? 20 * Math.log10(masterPeakL) : -100,
    masterPeakR > 0 ? 20 * Math.log10(masterPeakR) : -100,
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.meterPanel}>
        <div className={styles.meterTitle}>Master Meter</div>
        <div className={styles.masterMeter}>
          {/* Scale markers on the left side */}
          <div className={styles.meterScaleV}>
            <span>0</span>
            <span>-6</span>
            <span>-12</span>
            <span>-24</span>
            <span>-48</span>
            <span>{'\u2212\u221E'}</span>
          </div>
          <div className={styles.meterChannel}>
            <div className={styles.meterBar}>
              <div
                className={meterFillClass(leftDb)}
                style={{ height: `${dbToPercent(leftDb)}%` }}
              />
              {/* Peak hold indicator */}
              {peakHold.left > -90 && (
                <div
                  className={styles.meterPeakHold}
                  style={{ bottom: `${dbToPercent(peakHold.left)}%` }}
                />
              )}
            </div>
            <span className={styles.meterLabel}>L</span>
          </div>
          <div className={styles.meterChannel}>
            <div className={styles.meterBar}>
              <div
                className={meterFillClass(rightDb)}
                style={{ height: `${dbToPercent(rightDb)}%` }}
              />
              {/* Peak hold indicator */}
              {peakHold.right > -90 && (
                <div
                  className={styles.meterPeakHold}
                  style={{ bottom: `${dbToPercent(peakHold.right)}%` }}
                />
              )}
            </div>
            <span className={styles.meterLabel}>R</span>
          </div>
        </div>

        {/* dB readout */}
        <div className={styles.meterReadout}>
          <div className={styles.meterReadoutChannel}>
            <span className={styles.meterReadoutLabel}>L</span>
            <span className={styles.meterReadoutValue}>
              {leftDb > -90 ? leftDb.toFixed(1) : '-\u221E'}
            </span>
          </div>
          <div className={styles.meterReadoutChannel}>
            <span className={styles.meterReadoutLabel}>R</span>
            <span className={styles.meterReadoutValue}>
              {rightDb > -90 ? rightDb.toFixed(1) : '-\u221E'}
            </span>
          </div>
        </div>

        {/* Peak hold display */}
        <div className={styles.meterPeakDisplay}>
          <span className={styles.meterPeakDisplayLabel}>Peak Hold</span>
          <div className={styles.meterPeakDisplayValues}>
            <span
              className={styles.meterPeakDisplayValue}
              style={peakHold.left > -1.0 ? { color: 'var(--meter-red)' } : undefined}
            >
              L {peakHold.left > -90 ? peakHold.left.toFixed(1) : '-\u221E'}
            </span>
            <span
              className={styles.meterPeakDisplayValue}
              style={peakHold.right > -1.0 ? { color: 'var(--meter-red)' } : undefined}
            >
              R {peakHold.right > -90 ? peakHold.right.toFixed(1) : '-\u221E'}
            </span>
          </div>
        </div>

        {/* Loudness section */}
        <div className={styles.loudnessSection}>
          <div className={styles.loudnessTitle}>Loudness (EBU R128 Est.)</div>
          <div className={styles.loudnessRow}>
            <span className={styles.loudnessLabel}>M</span>
            <span className={styles.loudnessValue}>
              {lufsEstimate.momentary > -90 ? lufsEstimate.momentary.toFixed(1) : '---'} LUFS
            </span>
          </div>
          <div className={styles.loudnessRow}>
            <span className={styles.loudnessLabel}>S</span>
            <span className={styles.loudnessValue}>
              {lufsEstimate.shortTerm > -90 ? lufsEstimate.shortTerm.toFixed(1) : '---'} LUFS
            </span>
          </div>
          <div className={styles.loudnessRow}>
            <span className={styles.loudnessLabel}>I</span>
            <span className={styles.loudnessValue}>
              {lufsEstimate.integrated > -90 ? lufsEstimate.integrated.toFixed(1) : '---'} LUFS
            </span>
          </div>
          <div className={styles.loudnessRow}>
            <span className={styles.loudnessLabel}>TP</span>
            <span
              className={styles.loudnessValue}
              style={truePeakDb > -1.0 ? { color: 'var(--meter-red, #e53935)' } : undefined}
            >
              {truePeakDb > -90 ? truePeakDb.toFixed(1) : '---'} dBTP
            </span>
          </div>
          <button className={styles.loudnessReset} onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

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
        {rightZoneTab === 'vsti' && <PluginBrowser />}
        {rightZoneTab === 'media' && <MediaBrowser />}
        {rightZoneTab === 'cr' && <CRTab />}
        {rightZoneTab === 'meter' && <MeterTab />}
        {rightZoneTab === 'ai' && <AIChatPanel />}
      </div>
    </div>
  );
};
