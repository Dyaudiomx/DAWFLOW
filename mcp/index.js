#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import net from 'net';
import fs from 'fs';
import path from 'path';

// Find DAWFLOW socket
function findSocket() {
  const tmpDir = '/tmp';
  const files = fs.readdirSync(tmpDir);
  const socket = files.find(f => f.startsWith('dawflow-') && f.endsWith('.sock'));
  if (socket) return path.join(tmpDir, socket);
  return null;
}

// DAW Connection
class DawConnection {
  constructor() {
    this.socket = null;
    this.buffer = '';
    this.pendingRequests = new Map();
    this.nextId = 1;
    this.connected = false;
  }

  connect(socketPath) {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(socketPath, () => {
        this.connected = true;
        resolve();
      });

      this.socket.on('data', (data) => {
        this.buffer += data.toString();
        let newlineIdx;
        while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
          const line = this.buffer.substring(0, newlineIdx);
          this.buffer = this.buffer.substring(newlineIdx + 1);
          if (line.trim()) {
            try {
              const msg = JSON.parse(line);
              if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
                this.pendingRequests.get(msg.id).resolve(msg);
                this.pendingRequests.delete(msg.id);
              }
            } catch (e) {
              // Ignore malformed messages
            }
          }
        }
      });

      this.socket.on('error', reject);
      this.socket.on('close', () => { this.connected = false; });
    });
  }

  async call(method, params = {}) {
    if (!this.connected) throw new Error('Not connected to DAWFLOW');

    const id = this.nextId++;
    const msg = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id
    }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 10000);

      this.pendingRequests.set(id, {
        resolve: (response) => {
          clearTimeout(timeout);
          if (response.error) {
            resolve({ error: response.error });
          } else {
            resolve(response.result);
          }
        }
      });

      this.socket.write(msg);
    });
  }
}

const daw = new DawConnection();

// Create MCP server
const server = new Server(
  { name: 'dawflow-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'daw_command',
        description: 'Execute any DAWFLOW DAW command. Use daw.get_command_list to see all available commands. Common commands: daw.get_tracks, daw.add_audio_track, daw.load_plugin, daw.set_track_gain, daw.transport_play, daw.transport_stop, daw.add_midi_note, daw.execute_batch',
        inputSchema: {
          type: 'object',
          properties: {
            method: { type: 'string', description: 'The DAW command to execute (e.g., daw.get_tracks, daw.add_audio_track)' },
            params: { type: 'object', description: 'Parameters for the command (varies by command)', default: {} }
          },
          required: ['method']
        }
      },
      {
        name: 'daw_batch',
        description: 'Execute multiple DAW commands in sequence. More efficient than calling daw_command multiple times.',
        inputSchema: {
          type: 'object',
          properties: {
            commands: {
              type: 'array',
              description: 'Array of commands to execute',
              items: {
                type: 'object',
                properties: {
                  method: { type: 'string' },
                  params: { type: 'object', default: {} }
                },
                required: ['method']
              }
            }
          },
          required: ['commands']
        }
      },
      {
        name: 'daw_get_session',
        description: 'Get complete session overview: tracks, transport state, markers, tempo, and session info in one call',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'daw_get_mix',
        description: 'Get the complete mix state: all tracks with gain, pan, mute, solo, plugins, sends, colors',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'daw_command':
        result = await daw.call(args.method, args.params || {});
        break;

      case 'daw_batch':
        result = await daw.call('daw.execute_batch', { commands: args.commands });
        break;

      case 'daw_get_session': {
        const [session, tracks, transport, markers, position, tempo] = await Promise.all([
          daw.call('daw.get_session_details'),
          daw.call('daw.get_tracks'),
          daw.call('daw.get_transport_state'),
          daw.call('daw.get_markers'),
          daw.call('daw.get_position_info'),
          daw.call('daw.get_tempo_at', {})
        ]);
        result = { session, tracks, transport, markers, position, tempo };
        break;
      }

      case 'daw_get_mix':
        result = await daw.call('daw.get_mix_state');
        break;

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Connect and start
async function main() {
  const socketPath = findSocket();
  if (!socketPath) {
    console.error('DAWFLOW is not running. Start DAWFLOW first, then restart this MCP server.');
    process.exit(1);
  }

  console.error(`Connecting to DAWFLOW at ${socketPath}...`);
  await daw.connect(socketPath);
  console.error('Connected to DAWFLOW!');

  // Register as a plugin
  await daw.call('daw.plugin.register', { plugin_id: 'com.dawflow.mcp-server' });
  console.error('Registered as MCP plugin');

  // Get command count
  const cmds = await daw.call('daw.get_command_list');
  console.error(`${cmds.count} DAW commands available`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running on stdio');
}

main().catch(console.error);
