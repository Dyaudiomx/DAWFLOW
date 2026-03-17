// WebSocket/OSC message types for Ardour communication
export type MessageType =
  | 'transport_state' | 'strip_state' | 'meter_level'
  | 'track_list' | 'session_info' | 'plugin_state'
  | 'command' | 'response' | 'error';

export interface WSMessage {
  type: MessageType;
  data: Record<string, unknown>;
}

export interface StripMessage {
  stripId: number;
  name?: string;
  mute?: boolean;
  solo?: boolean;
  recEnable?: boolean;
  fader?: number;
  pan?: number;
  meter?: number[];
}

export interface TransportMessage {
  state: 'playing' | 'stopped' | 'recording';
  position: number;
  tempo: number;
  timeSigNum: number;
  timeSigDen: number;
  loop: boolean;
}

// DAWFLOW IPC JSON-RPC types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: number | string;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: number | string;
}
