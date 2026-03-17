import type { TrackType, InsertSlot, SendSlot, EQBand, ChannelStripModule } from './track';

export interface MixerChannel {
  id: string;
  trackId: string;
  name: string;
  type: TrackType;
  color: string;
  volume: number; // dB value
  volumeNormalized: number; // 0-1
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  listen: boolean;
  recordEnabled: boolean;
  monitorEnabled: boolean;
  readAutomation: boolean;
  writeAutomation: boolean;
  meterLevel: number[]; // per-channel levels (L, R)
  peakLevel: number[];
  clipping: boolean[];
  inserts: InsertSlot[];
  sends: SendSlot[];
  eq: EQBand[];
  channelStrip: ChannelStripModule[];
  inputRouting: string;
  outputRouting: string;
  width: 'narrow' | 'wide';
}

export type MixerRackType =
  | 'routing' | 'pre' | 'inserts' | 'equalizers'
  | 'strip' | 'sends' | 'cueSends' | 'directRouting' | 'quickControls';

export interface MixerState {
  channels: MixerChannel[];
  visibleRacks: MixerRackType[];
  channelFilter: TrackType[];
  soloMode: boolean;
  globalBypassInserts: boolean;
  globalBypassEQ: boolean;
  globalBypassSends: boolean;
}
