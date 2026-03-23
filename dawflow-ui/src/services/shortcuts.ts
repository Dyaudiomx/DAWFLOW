/**
 * Global Keyboard Shortcut Service
 *
 * Registers document-level keyboard shortcuts that work everywhere in the app.
 * This service handles shortcuts NOT already handled by:
 *   - Toolbar.tsx: Space, R, Home, comma, L, Shift+A, Ctrl+Z, Ctrl+Shift+Z, Ctrl+S
 *   - This file also handles: Ctrl+Shift+S (save-as)
 *   - CenterZone.tsx: Delete/Backspace, D, M, S (region/track-specific)
 *
 * Call initKeyboardShortcuts() once at app startup.
 */

import { ipc } from './ipc';
import { useTransportStore } from '../stores/transport';
import { useSessionStore } from '../stores/session';
import { useUIStore } from '../stores/ui';

let initialized = false;
let cleanupFn: (() => void) | null = null;

export function initKeyboardShortcuts(): () => void {
  // Guard against double-initialization (React strict mode calls useEffect twice)
  if (initialized && cleanupFn) return cleanupFn;
  initialized = true;

  const handler = (e: KeyboardEvent) => {
    // Skip if the user is typing in an input, textarea, or select
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // ----- Modifier shortcuts (Ctrl/Cmd held) -----
    if (ctrl) {
      // Save As: Ctrl+Shift+S
      if (shift && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const name = prompt('Save session as:');
        if (name) {
          ipc.saveSessionAs(name)
            .catch((err: unknown) => console.warn('[DAWFLOW] Save-as failed:', err));
        }
        return;
      }

      switch (e.key) {
        // Zoom in: Ctrl + =  /  Ctrl + +
        case '=':
        case '+':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('dawflow:zoom-in'));
          return;

        // Zoom out: Ctrl + -
        case '-':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('dawflow:zoom-out'));
          return;

        // Cut selected region: Ctrl+X
        case 'x':
        case 'X': {
          e.preventDefault();
          const regionId = useUIStore.getState().selectedRegionId;
          if (regionId) {
            ipc.call('daw.editor.cut_region', { region_id: regionId })
              .then(() => useSessionStore.getState().fetchFromEngine())
              .catch((err: unknown) => console.warn('[DAWFLOW] Cut region failed:', err));
          }
          return;
        }

        // Copy selected region: Ctrl+C
        case 'c':
        case 'C': {
          e.preventDefault();
          const regionId = useUIStore.getState().selectedRegionId;
          if (regionId) {
            ipc.call('daw.editor.copy_region', { region_id: regionId })
              .catch((err: unknown) => console.warn('[DAWFLOW] Copy region failed:', err));
          }
          return;
        }

        // Paste: Ctrl+V
        case 'v':
        case 'V':
          e.preventDefault();
          ipc.call('daw.paste_region')
            .then(() => useSessionStore.getState().fetchFromEngine())
            .catch((err: unknown) => console.warn('[DAWFLOW] Paste failed:', err));
          return;

        // Ctrl+N is reserved for future "New Session"
        default:
          return;
      }
    }

    // ----- Shift shortcuts (no Ctrl/Cmd) -----
    if (shift && !ctrl) {
      // Render in Place: Shift+R
      if (e.key === 'R') {
        e.preventDefault();
        const uiState = useUIStore.getState();
        const selectedIds = uiState.selectedTrackIds;
        if (selectedIds.length > 0) {
          const tracks = useSessionStore.getState().tracks;
          const trackNames = selectedIds.map((id) => {
            const t = tracks.find((tr: { id: string; name?: string }) => tr.id === id);
            return t?.name || 'Track';
          });
          uiState.setRenderInPlace({
            open: true,
            trackIds: selectedIds,
            regionIds: [],
            trackNames,
          });
        }
        return;
      }
    }

    // ----- Function keys (work with or without modifiers) -----
    if (e.key === 'F3') {
      e.preventDefault();
      useUIStore.getState().toggleFloatingWindow('mixer');
      return;
    }

    // ----- Non-modifier shortcuts -----
    switch (e.key) {
      // Go to start of session: Home
      case 'Home':
        e.preventDefault();
        ipc.transportLocate(0)
          .catch((err: unknown) => console.warn('[DAWFLOW] Goto start failed:', err));
        useTransportStore.getState().setPosition(0);
        break;

      // Go to end of session: End
      case 'End':
        e.preventDefault();
        ipc.call('daw.transport_goto_end')
          .catch((err: unknown) => console.warn('[DAWFLOW] Goto end failed:', err));
        break;

      // Nudge playhead forward: . (period)
      case '.': {
        e.preventDefault();
        const pos = useTransportStore.getState().position;
        const sr = useSessionStore.getState().sampleRate || 48000;
        const newSamples = Math.round((pos + 1) * sr);
        ipc.transportLocate(newSamples)
          .catch((err: unknown) => console.warn('[DAWFLOW] Nudge forward failed:', err));
        useTransportStore.getState().setPosition(pos + 1);
        break;
      }

      // Nudge playhead backward: , (comma) — if not handled by Toolbar
      case ',': {
        e.preventDefault();
        const pos2 = useTransportStore.getState().position;
        const sr2 = useSessionStore.getState().sampleRate || 48000;
        const newPos = Math.max(0, pos2 - 1);
        ipc.transportLocate(Math.round(newPos * sr2))
          .catch((err: unknown) => console.warn('[DAWFLOW] Nudge back failed:', err));
        useTransportStore.getState().setPosition(newPos);
        break;
      }

      // Toggle click/metronome: C
      case 'c':
      case 'C':
        e.preventDefault();
        useTransportStore.getState().toggleMetronome();
        break;

      // Zoom to fit: F
      case 'f':
      case 'F':
        if (!shift) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('dawflow:zoom-fit'));
        }
        break;

      // Toggle snap: J (Cubase standard)
      case 'j':
      case 'J':
        e.preventDefault();
        useUIStore.getState().setSnapEnabled(!useUIStore.getState().snapEnabled);
        break;

      // Zoom out: G
      case 'g':
      case 'G':
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('dawflow:zoom-out'));
        break;

      // Zoom in: H
      case 'h':
      case 'H':
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('dawflow:zoom-in'));
        break;

      // Tool selection: 1-9
      case '1':
        e.preventDefault();
        useUIStore.getState().setActiveTool('select');
        break;
      case '2':
        e.preventDefault();
        useUIStore.getState().setActiveTool('range');
        break;
      case '3':
        e.preventDefault();
        useUIStore.getState().setActiveTool('split');
        break;
      case '4':
        e.preventDefault();
        useUIStore.getState().setActiveTool('glue');
        break;
      case '5':
        e.preventDefault();
        useUIStore.getState().setActiveTool('erase');
        break;
      case '6':
        e.preventDefault();
        useUIStore.getState().setActiveTool('zoom');
        break;
      case '7':
        e.preventDefault();
        useUIStore.getState().setActiveTool('mute');
        break;
      case '8':
        e.preventDefault();
        useUIStore.getState().setActiveTool('draw');
        break;
      case '9':
        e.preventDefault();
        useUIStore.getState().setActiveTool('comp');
        break;

      // Add marker at playhead: Insert or I
      case 'Insert':
      case 'i':
      case 'I':
        if (!ctrl) {
          e.preventDefault();
          const posSamples = Math.floor(useTransportStore.getState().position * (useSessionStore.getState().sampleRate || 48000));
          ipc.addMarker('Marker', posSamples)
            .catch((err: unknown) => console.warn('[DAWFLOW] Add marker failed:', err));
        }
        break;

      // Navigate to previous marker: B
      case 'b':
      case 'B':
        e.preventDefault();
        ipc.call('daw.goto_next_marker', { forward: false })
          .catch((err: unknown) => console.warn('[DAWFLOW] Goto previous marker failed:', err));
        break;

      // Navigate to next marker: N
      case 'n':
      case 'N':
        if (!shift) {
          e.preventDefault();
          ipc.call('daw.goto_next_marker', { forward: true })
            .catch((err: unknown) => console.warn('[DAWFLOW] Goto next marker failed:', err));
        }
        break;

      // Toggle loop: / (numpad divide) or L handled by Toolbar
      case '/':
        e.preventDefault();
        useTransportStore.getState().toggleLoop();
        break;

      default:
        break;
    }
  };

  document.addEventListener('keydown', handler);

  cleanupFn = () => {
    document.removeEventListener('keydown', handler);
    initialized = false;
    cleanupFn = null;
  };

  return cleanupFn;
}

// HMR cleanup: remove listener when this module is replaced during development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (cleanupFn) cleanupFn();
  });
}
