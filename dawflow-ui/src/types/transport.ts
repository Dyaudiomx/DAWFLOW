export type TimeFormat = 'barsBeats' | 'seconds' | 'timecode' | 'samples';

export type RecordMode = 'normal' | 'merge' | 'replace' | 'punchOnLane';

export type AutomationMode = 'touch' | 'autoLatch' | 'crossOver';

export interface TransportState {
  playing: boolean;
  recording: boolean;
  looping: boolean;
  position: number; // in samples or ticks
  positionDisplay: string; // formatted string
  tempo: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  leftLocator: number;
  rightLocator: number;
  leftLocatorDisplay: string;
  rightLocatorDisplay: string;
  timeFormat: TimeFormat;
  recordMode: RecordMode;
  automationMode: AutomationMode;
  metronomeEnabled: boolean;
  precountEnabled: boolean;
  punchIn: boolean;
  punchOut: boolean;
  syncEnabled: boolean;
  preRoll: number;
  postRoll: number;
  preRollEnabled: boolean;
  postRollEnabled: boolean;
  soloActive: boolean;
  muteActive: boolean;
  listenActive: boolean;
  // Performance
  cpuLoad: number; // 0-100
  diskLoad: number; // 0-100
  // Activity
  midiInActivity: boolean;
  midiOutActivity: boolean;
  audioInActivity: boolean;
  audioOutActivity: boolean;
}
