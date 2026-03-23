import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ipc } from '../services/ipc';
import { useUIStore } from '../stores/ui';
import { useTransportStore } from '../stores/transport';
import { useSessionStore } from '../stores/session';
import styles from './MediaBrowser.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FolderNode {
  id: string;
  label: string;
  path: string | null; // null = virtual folder (e.g. "Recent Files")
  kind: 'session-audio' | 'session-midi' | 'recent' | 'favorites';
  expanded: boolean;
}

interface MediaFile {
  name: string;
  path: string;
  sampleRate: number | null; // null for MIDI
  format: string; // "WAV", "AIFF", "MIDI", etc.
  duration: number; // seconds
  size: number; // bytes
  isMidi: boolean;
}

type SortKey = 'name' | 'date' | 'size';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(sec: number): string {
  if (sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionToFormat(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    wav: 'WAV', aiff: 'AIFF', aif: 'AIFF', flac: 'FLAC',
    ogg: 'OGG', mp3: 'MP3', mid: 'MIDI', midi: 'MIDI',
    caf: 'CAF', w64: 'W64',
  };
  return map[ext] ?? ext.toUpperCase();
}

function isMidiFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'mid' || ext === 'midi';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MediaBrowser: React.FC = () => {
  // -- State -----------------------------------------------------------------

  const [sessionPath, setSessionPath] = useState<string>('');
  const [sessionName, setSessionName] = useState<string>('');

  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPreview, setAutoPreview] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(0.7);

  const prevSelectedRef = useRef<string | null>(null);

  // -- Fetch session info on mount -------------------------------------------

  useEffect(() => {
    ipc.getSessionInfo()
      .then((info) => {
        setSessionPath(info.path);
        setSessionName(info.name);
        setFolders([
          {
            id: 'session-audio',
            label: 'Session Audio',
            path: `${info.path}/interchange/${info.name}/audiofiles`,
            kind: 'session-audio',
            expanded: false,
          },
          {
            id: 'session-midi',
            label: 'Session MIDI',
            path: `${info.path}/interchange/${info.name}/midifiles`,
            kind: 'session-midi',
            expanded: false,
          },
          {
            id: 'recent',
            label: 'Recent Files',
            path: null,
            kind: 'recent',
            expanded: false,
          },
          {
            id: 'favorites',
            label: 'Favorites',
            path: null,
            kind: 'favorites',
            expanded: false,
          },
        ]);
      })
      .catch(() => {
        // Fallback empty state
        setFolders([
          { id: 'recent', label: 'Recent Files', path: null, kind: 'recent', expanded: false },
          { id: 'favorites', label: 'Favorites', path: null, kind: 'favorites', expanded: false },
        ]);
      });
  }, []);

  // -- Folder toggle ---------------------------------------------------------

  const toggleFolder = useCallback((folderId: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, expanded: !f.expanded } : f,
      ),
    );

    // If expanding, also load files for that folder
    setActiveFolder((prev) => (prev === folderId ? null : folderId));
  }, []);

  // -- File fetching ---------------------------------------------------------

  useEffect(() => {
    if (!activeFolder) {
      setFiles([]);
      return;
    }

    const folder = folders.find((f) => f.id === activeFolder);
    if (!folder) return;

    setLoading(true);

    if (folder.kind === 'recent') {
      // Fetch source files from engine -- last 20
      ipc.call<{ files: Array<{ path: string; name: string; sample_rate?: number; duration?: number; size?: number }> }>(
        'daw.get_source_files',
      )
        .then((data) => {
          const list = (data?.files ?? []).slice(0, 20);
          setFiles(
            list.map((f) => ({
              name: f.name || f.path.split('/').pop() || 'unknown',
              path: f.path,
              sampleRate: isMidiFile(f.name || f.path) ? null : (f.sample_rate ?? null),
              format: extensionToFormat(f.name || f.path),
              duration: f.duration ?? 0,
              size: f.size ?? 0,
              isMidi: isMidiFile(f.name || f.path),
            })),
          );
        })
        .catch(() => setFiles([]))
        .finally(() => setLoading(false));
    } else if (folder.path) {
      // List directory via engine IPC
      ipc.call<{ files: Array<{ path: string; name: string; sample_rate?: number; duration?: number; size?: number }> }>(
        'daw.get_source_files',
        { directory: folder.path },
      )
        .then((data) => {
          const list = data?.files ?? [];
          setFiles(
            list.map((f) => ({
              name: f.name || f.path.split('/').pop() || 'unknown',
              path: f.path,
              sampleRate: isMidiFile(f.name || f.path) ? null : (f.sample_rate ?? null),
              format: extensionToFormat(f.name || f.path),
              duration: f.duration ?? 0,
              size: f.size ?? 0,
              isMidi: isMidiFile(f.name || f.path),
            })),
          );
        })
        .catch(() => setFiles([]))
        .finally(() => setLoading(false));
    } else {
      // Favorites -- empty for now, could persist via localStorage
      setFiles([]);
      setLoading(false);
    }
  }, [activeFolder, folders]);

  // -- Filtering & sorting ---------------------------------------------------

  const filteredFiles = files
    .filter((f) => {
      if (!search) return true;
      return f.name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name);
        case 'size': return b.size - a.size;
        case 'date': return 0; // No date available, preserve order
        default: return 0;
      }
    });

  // -- Selection & preview ---------------------------------------------------

  const handleSelectFile = useCallback(
    (file: MediaFile) => {
      setSelectedFile(file);

      if (autoPreview && file.path !== prevSelectedRef.current) {
        // Stop any current audition, then start new one
        ipc.call('daw.stop_audition').catch(() => {});
        ipc.call('daw.audition_source', { path: file.path }).catch(() => {});
        setIsPlaying(true);
      }

      prevSelectedRef.current = file.path;
    },
    [autoPreview],
  );

  const handlePlay = useCallback(() => {
    if (!selectedFile) return;
    if (isPlaying) {
      ipc.call('daw.stop_audition').catch(() => {});
      setIsPlaying(false);
    } else {
      ipc.call('daw.audition_source', { path: selectedFile.path }).catch(() => {});
      setIsPlaying(true);
    }
  }, [selectedFile, isPlaying]);

  const handleStop = useCallback(() => {
    ipc.call('daw.stop_audition').catch(() => {});
    setIsPlaying(false);
  }, []);

  const handleImportToTrack = useCallback((file: MediaFile) => {
    const trackId = useUIStore.getState().selectedTrackId;
    const pos = useTransportStore.getState().position;
    const sr = useSessionStore.getState().sampleRate || 48000;
    if (trackId) {
      ipc.call('daw.import_audio', {
        path: file.path,
        track_id: trackId,
        position: Math.round(pos * sr),
      }).catch(() => {});
    }
  }, []);

  // -- Render ----------------------------------------------------------------

  return (
    <div className={styles.container}>
      {/* Search */}
      <div className={styles.searchSection}>
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className={styles.searchInput}
        />
      </div>

      {/* Folder tree */}
      <div className={styles.folderTree}>
        {folders.map((folder) => (
          <button
            key={folder.id}
            className={`${styles.folderItem} ${activeFolder === folder.id ? styles.folderActive : ''}`}
            onClick={() => toggleFolder(folder.id)}
          >
            <span className={styles.folderChevron}>
              {activeFolder === folder.id ? '\u25BC' : '\u25B6'}
            </span>
            <span className={styles.folderIcon}>
              {folder.kind === 'session-audio' ? '\uD83D\uDD0A' :
               folder.kind === 'session-midi' ? '\uD83C\uDFB9' :
               folder.kind === 'recent' ? '\uD83D\uDD52' :
               '\u2B50'}
            </span>
            <span className={styles.folderLabel}>{folder.label}</span>
          </button>
        ))}
      </div>

      {/* Sort bar */}
      <div className={styles.sortBar}>
        <span className={styles.sortLabel}>Sort</span>
        <select
          className={styles.sortSelect}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="name">Name</option>
          <option value="date">Date</option>
          <option value="size">Size</option>
        </select>
        <span className={styles.fileCount}>
          {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* File list */}
      <div className={styles.fileList}>
        {loading && (
          <div className={styles.loadingMessage}>Loading...</div>
        )}

        {!loading && filteredFiles.length === 0 && (
          <div className={styles.emptyMessage}>
            {activeFolder ? 'No files found' : 'Select a folder'}
          </div>
        )}

        {!loading && filteredFiles.map((file, idx) => (
          <div
            key={file.path}
            className={`${styles.fileRow} ${idx % 2 === 1 ? styles.fileRowAlt : ''} ${selectedFile?.path === file.path ? styles.fileRowSelected : ''}`}
            onClick={() => handleSelectFile(file)}
            onDoubleClick={() => handleImportToTrack(file)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', file.path);
            }}
          >
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileMeta}>
              {file.isMidi ? 'MIDI' : file.sampleRate ? `${(file.sampleRate / 1000).toFixed(1)}k` : file.format}
            </span>
            <span className={styles.fileDuration}>
              {file.duration > 0 ? formatDuration(file.duration) : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Preview bar */}
      <div className={styles.previewBar}>
        {selectedFile ? (
          <>
            <div className={styles.previewInfo}>
              <span className={styles.previewName}>{selectedFile.name}</span>
              {selectedFile.duration > 0 && (
                <span className={styles.previewDuration}>
                  {formatDuration(selectedFile.duration)}
                </span>
              )}
              {selectedFile.size > 0 && (
                <span className={styles.previewSize}>
                  {formatSize(selectedFile.size)}
                </span>
              )}
            </div>
            <div className={styles.previewControls}>
              <button
                className={`${styles.previewBtn} ${isPlaying ? styles.previewBtnActive : ''}`}
                onClick={handlePlay}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '\u25A0' : '\u25B6'}
              </button>
              <button
                className={styles.previewBtn}
                onClick={handleStop}
                title="Stop"
              >
                {'\u25A0\u25A0'}
              </button>
              <input
                type="range"
                className={styles.volumeSlider}
                min={0}
                max={1}
                step={0.01}
                value={previewVolume}
                onChange={(e) => setPreviewVolume(parseFloat(e.target.value))}
                title={`Volume: ${Math.round(previewVolume * 100)}%`}
              />
              <label className={styles.autoLabel}>
                <input
                  type="checkbox"
                  className={styles.autoCheck}
                  checked={autoPreview}
                  onChange={(e) => setAutoPreview(e.target.checked)}
                />
                Auto
              </label>
            </div>
          </>
        ) : (
          <div className={styles.previewEmpty}>No file selected</div>
        )}
      </div>
    </div>
  );
};

export default MediaBrowser;
