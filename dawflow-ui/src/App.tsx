import { ProjectWindow } from './layout/ProjectWindow';
import { AddTrackDialog } from './dialogs/AddTrackDialog';
import { useConnectionStore } from './stores/connection';
import './tokens/cubase-theme.css';

// Import websocket service — triggers auto-connect on load
import './services/websocket';

function App() {
  const wsConnected = useConnectionStore((s) => s.wsConnected);

  return (
    <>
      <ProjectWindow />
      <AddTrackDialog />
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
    </>
  );
}

export default App;
