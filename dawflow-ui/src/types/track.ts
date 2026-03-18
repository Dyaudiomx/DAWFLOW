export type TrackType =
  | 'audio' | 'instrument' | 'midi' | 'sampler'
  | 'group' | 'fx' | 'vca' | 'folder'
  | 'chord' | 'marker' | 'ruler' | 'signature'
  | 'tempo' | 'transpose' | 'arranger' | 'video';

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  height: number;
  muted: boolean;
  solo: boolean;
  recordEnabled: boolean;
  monitorEnabled: boolean;
  readAutomation: boolean;
  writeAutomation: boolean;
  frozen: boolean;
  locked: boolean;
  visible: boolean;
  volume: number; // 0-1
  pan: number; // -1 to 1
  inputRouting: string;
  outputRouting: string;
  meterLevel?: number; // 0-1 normalized meter level from engine
  children?: Track[]; // for folder tracks
}

export interface AudioTrack extends Track {
  type: 'audio';
  waveformData?: Float32Array;
}

export interface MidiTrack extends Track {
  type: 'midi';
  midiChannel: number;
  bankSelect: number;
  programChange: number;
  drumMap: string | null;
}

export interface InstrumentTrack extends Track {
  type: 'instrument';
  instrumentName: string;
  instrumentId: string;
  midiChannel: number;
}

// Also define Insert, Send, EQ Band types
export interface InsertSlot {
  index: number;
  pluginName: string | null;
  bypassed: boolean;
  active: boolean;
  isPreFader: boolean; // slots 1-6 pre, 7-8 post
}

export interface SendSlot {
  index: number;
  destination: string | null;
  level: number;
  pan: number;
  active: boolean;
  preFader: boolean;
}

export interface EQBand {
  index: number;
  frequency: number;
  gain: number;
  q: number;
  type: 'lowCut' | 'lowShelf' | 'peak' | 'highShelf' | 'highCut';
  active: boolean;
}

export interface ChannelStripModule {
  type: 'gate' | 'compressor' | 'eq' | 'tools' | 'saturation' | 'limiter';
  active: boolean;
  bypassed: boolean;
}
