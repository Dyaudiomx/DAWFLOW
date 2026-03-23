import React, { useEffect, useCallback, lazy, Suspense } from 'react';
import { ProjectWindow } from './layout/ProjectWindow';
import { AddTrackDialog } from './dialogs/AddTrackDialog';
import { ChannelSettingsDialog } from './dialogs/ChannelSettingsDialog';
import { VideoImportDialog } from './dialogs/VideoImportDialog';
import { RenderInPlaceDialog } from './dialogs/RenderInPlaceDialog';
import type { RenderSettings } from './dialogs/RenderInPlaceDialog';
import { FloatingWindow } from './components/FloatingWindow';
import { useConnectionStore } from './stores/connection';
import { useUIStore } from './stores/ui';
import { useRegionStore } from './stores/regions';
import { useSessionStore, resetFetchDebounce } from './stores/session';
import { ipc } from './services/ipc';
import { initKeyboardShortcuts } from './services/shortcuts';
import './tokens/cubase-theme.css';

// Lazy-load heavy editors for floating windows
const LowerMixConsole = lazy(() => import('./lower-zone/LowerMixConsole').then(m => ({ default: m.LowerMixConsole })));
const MidiEditor = lazy(() => import('./lower-zone/MidiEditor'));
const AudioEditor = lazy(() => import('./lower-zone/AudioEditor'));
const DrumEditor = lazy(() => import('./lower-zone/DrumEditor'));

// Import websocket service — triggers auto-connect on load
import './services/websocket';

// Error boundary to catch and display React rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; errorInfo: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[DAWFLOW] React render error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || '' });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 20, background: '#1a1a1a', color: '#ff6b6b',
          fontFamily: 'monospace', fontSize: 12, height: '100vh', overflow: 'auto',
        }}>
          <h2 style={{ color: '#ff6b6b', margin: '0 0 10px' }}>DAWFLOW UI Crashed</h2>
          <pre style={{ color: '#ffaa00', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ color: '#888', whiteSpace: 'pre-wrap', fontSize: 10, marginTop: 10 }}>
            {this.state.error.stack}
          </pre>
          <pre style={{ color: '#666', whiteSpace: 'pre-wrap', fontSize: 10, marginTop: 10 }}>
            {this.state.errorInfo}
          </pre>
          <button
            onClick={() => this.setState({ error: null, errorInfo: '' })}
            style={{ marginTop: 16, padding: '8px 16px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: 4, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  // Register global keyboard shortcuts once on mount
  useEffect(() => {
    const cleanup = initKeyboardShortcuts();
    return cleanup;
  }, []);

  const wsConnected = useConnectionStore((s) => s.wsConnected);

  const floatingWindows = useUIStore((s) => s.floatingWindows);
  const toggleFloating = useUIStore((s) => s.toggleFloatingWindow);
  const selectedRegionId = useUIStore((s) => s.selectedRegionId);
  const selectedTrackId = useUIStore((s) => s.selectedTrackId);
  const regionsByTrack = useRegionStore((s) => s.regionsByTrack);

  // Render in Place
  const renderInPlace = useUIStore((s) => s.renderInPlace);
  const setRenderInPlace = useUIStore((s) => s.setRenderInPlace);

  const handleRenderInPlace = useCallback(async (settings: RenderSettings) => {
    if (!renderInPlace) return;
    const { trackIds, regionIds } = renderInPlace;
    try {
      const result = await ipc.renderInPlace({
        track_ids: trackIds,
        region_ids: regionIds || [],
        processing: settings.processing,
        mode: settings.mode,
        tail_ms: settings.tailMs,
        bit_depth: settings.bitDepth,
        source_action: settings.sourceAction,
        mix_down: settings.mixDown,
        name: settings.name,
      });
      if (result?.ok) {
        resetFetchDebounce();
        await useSessionStore.getState().fetchFromEngine();
        setRenderInPlace(null);
      } else {
        alert('Render in Place failed: ' + ((result as any)?.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Render in Place failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [renderInPlace, setRenderInPlace]);

  const handleCloseRenderInPlace = useCallback(() => {
    setRenderInPlace(null);
  }, [setRenderInPlace]);

  // Find selected region for editors
  let selectedRegion: { id: string; type: string } | null = null;
  if (selectedRegionId && selectedTrackId) {
    const regions = regionsByTrack[selectedTrackId] || [];
    selectedRegion = regions.find((r) => r.id === selectedRegionId) ?? null;
  }

  return (
    <ErrorBoundary>
      <ProjectWindow />
      <AddTrackDialog />
      <ChannelSettingsDialog />
      <VideoImportDialog />

      {/* Floating MixConsole window */}
      {floatingWindows.mixer && (
        <FloatingWindow
          title="MixConsole"
          onClose={() => toggleFloating('mixer')}
          defaultWidth={1200}
          defaultHeight={500}
          defaultY={window.innerHeight - 550}
        >
          <Suspense fallback={<div style={{ padding: 20, color: '#666' }}>Loading MixConsole...</div>}>
            <LowerMixConsole />
          </Suspense>
        </FloatingWindow>
      )}

      {/* Floating MIDI Editor window */}
      {floatingWindows.midiEditor && selectedRegion?.type === 'midi' && selectedTrackId && (
        <FloatingWindow
          title={`MIDI Editor — ${selectedRegion.id}`}
          onClose={() => toggleFloating('midiEditor')}
          defaultWidth={1000}
          defaultHeight={500}
        >
          <Suspense fallback={<div style={{ padding: 20, color: '#666' }}>Loading MIDI Editor...</div>}>
            <MidiEditor regionId={selectedRegion.id} trackId={selectedTrackId} trackColor="#e05070" />
          </Suspense>
        </FloatingWindow>
      )}

      {/* Floating Audio Editor window */}
      {floatingWindows.audioEditor && selectedRegion?.type === 'audio' && selectedTrackId && (
        <FloatingWindow
          title={`Audio Editor — ${selectedRegion.id}`}
          onClose={() => toggleFloating('audioEditor')}
          defaultWidth={1000}
          defaultHeight={400}
        >
          <Suspense fallback={<div style={{ padding: 20, color: '#666' }}>Loading Audio Editor...</div>}>
            <AudioEditor regionId={selectedRegion.id} trackId={selectedTrackId} trackColor="#5090d0" />
          </Suspense>
        </FloatingWindow>
      )}

      {/* Floating Drum Editor window */}
      {floatingWindows.drumEditor && selectedRegion?.type === 'midi' && selectedTrackId && (
        <FloatingWindow
          title={`Drum Editor — ${selectedRegion.id}`}
          onClose={() => toggleFloating('drumEditor')}
          defaultWidth={1000}
          defaultHeight={500}
        >
          <Suspense fallback={<div style={{ padding: 20, color: '#666' }}>Loading Drum Editor...</div>}>
            <DrumEditor regionId={selectedRegion.id} trackId={selectedTrackId} trackColor="#e05070" />
          </Suspense>
        </FloatingWindow>
      )}

      {/* Render in Place dialog */}
      {renderInPlace?.open && (
        <RenderInPlaceDialog
          trackIds={renderInPlace.trackIds}
          regionIds={renderInPlace.regionIds.length > 0 ? renderInPlace.regionIds : undefined}
          trackNames={renderInPlace.trackNames}
          onRender={handleRenderInPlace}
          onClose={handleCloseRenderInPlace}
        />
      )}

      {/* Connection indicator (bottom-right corner) */}
      <div style={{
        position: 'fixed',
        bottom: 4,
        right: 8,
        fontSize: 9,
        color: wsConnected ? '#4CAF50' : '#C43030',
        fontFamily: 'var(--font-mono)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {wsConnected ? '● Engine Connected' : '○ Engine Disconnected'}
      </div>
    </ErrorBoundary>
  );
}

export default App;
