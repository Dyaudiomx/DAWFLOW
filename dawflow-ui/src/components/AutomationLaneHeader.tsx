import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { engine } from '../engine/registry';
import styles from './AutomationLaneHeader.module.css';

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

export interface AutomationParam {
  type: string;
  label: string;
  group?: string;
  /** If this param belongs to a plugin, store the processorId */
  processorId?: string;
}

export interface AutomationLaneHeaderProps {
  trackId: string;
  trackColor: string;
  paramType: string;
  paramLabel: string;
  value: number;
  readEnabled: boolean;
  writeEnabled: boolean;
  availableParams: AutomationParam[];
  onParamChange: (paramType: string) => void;
  onValueChange: (value: number) => void;
  onReadToggle: () => void;
  onWriteToggle: () => void;
  onClose: () => void;
  onLock?: () => void;
}

/* ---------------------------------------------------------------------------
   Inline SVG icons
   --------------------------------------------------------------------------- */

const CurveIcon: React.FC = () => (
  <svg
    className={styles.curveIcon}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12 C4 12, 5 4, 8 4 S12 10, 14 6" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <line x1="2" y1="2" x2="8" y2="8" />
    <line x1="8" y1="2" x2="2" y2="8" />
  </svg>
);

const LockIcon: React.FC<{ locked?: boolean }> = ({ locked }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {locked ? (
      <>
        <rect x="2" y="5" width="6" height="4" rx="0.5" />
        <path d="M3 5V3.5a2 2 0 0 1 4 0V5" />
      </>
    ) : (
      <>
        <rect x="2" y="5" width="6" height="4" rx="0.5" />
        <path d="M3 5V3.5a2 2 0 0 1 4 0" />
      </>
    )}
  </svg>
);

const TriangleIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    width="8"
    height="8"
    viewBox="0 0 8 8"
    fill="currentColor"
    className={styles.triangleIcon}
    style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
  >
    <path d="M2 1 L6 4 L2 7 Z" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <circle cx="5" cy="5" r="3.5" />
    <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" />
  </svg>
);

/* ---------------------------------------------------------------------------
   Expandable group names for the bottom section
   --------------------------------------------------------------------------- */
const EXPANDABLE_GROUPS = [
  'Input Filter',
  'Standard Panner',
  'Inserts',
  'Sends',
  'Direct Routing',
];

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */

export const AutomationLaneHeader: React.FC<AutomationLaneHeaderProps> = ({
  trackId,
  trackColor,
  paramType,
  paramLabel,
  value,
  readEnabled,
  writeEnabled,
  availableParams,
  onParamChange,
  onValueChange,
  onReadToggle,
  onWriteToggle,
  onClose,
  onLock,
}) => {
  /* ---- Parameter dropdown state ---- */
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ---- Search state ---- */
  const [searchQuery, setSearchQuery] = useState('');

  /* ---- Expanded groups state ---- */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  /* ---- Plugin params loaded from engine ---- */
  const [pluginParams, setPluginParams] = useState<AutomationParam[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(false);

  /* ---- Lock state (local) ---- */
  const [locked, setLocked] = useState(false);

  /* ---- Value input state ---- */
  const [editingValue, setEditingValue] = useState<string | null>(null);

  const displayValue = editingValue ?? value.toFixed(4);

  /* ---- Fetch plugin parameters when dropdown opens ---- */
  useEffect(() => {
    if (!dropdownOpen) return;
    let cancelled = false;

    const fetchPluginParams = async () => {
      setLoadingPlugins(true);
      try {
        const { plugins } = await engine.plugin.getTrackPlugins(trackId);
        const allParams: AutomationParam[] = [];

        for (const plugin of plugins) {
          try {
            const { parameters } = await engine.plugin.getParameters(trackId, plugin.processor_id);
            for (const param of parameters) {
              allParams.push({
                type: `plugin:${plugin.processor_id}:${param.index}`,
                label: param.name,
                group: plugin.name,
                processorId: plugin.processor_id,
              });
            }
          } catch {
            // Plugin might not expose parameters — skip silently
          }
        }

        if (!cancelled) {
          setPluginParams(allParams);
        }
      } catch {
        // Track might not have plugins — that's fine
      } finally {
        if (!cancelled) {
          setLoadingPlugins(false);
        }
      }
    };

    fetchPluginParams();
    return () => { cancelled = true; };
  }, [dropdownOpen, trackId]);

  /* ---- Focus search when dropdown opens ---- */
  useEffect(() => {
    if (dropdownOpen) {
      setSearchQuery('');
      // Small delay to allow DOM to render
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [dropdownOpen]);

  /* ---- Close dropdown on outside click ---- */
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  /* ---- Close dropdown on Escape ---- */
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dropdownOpen]);

  /* ---- Parameter selection ---- */
  const handleParamSelect = useCallback(
    (type: string) => {
      onParamChange(type);
      setDropdownOpen(false);
    },
    [onParamChange],
  );

  /* ---- Toggle expandable group ---- */
  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  /* ---- Value spinner ---- */
  const handleValueInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  }, []);

  const commitValue = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onValueChange(parsed);
      }
      setEditingValue(null);
    },
    [onValueChange],
  );

  const handleValueBlur = useCallback(() => {
    if (editingValue !== null) {
      commitValue(editingValue);
    }
  }, [editingValue, commitValue]);

  const handleValueKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (editingValue !== null) {
          commitValue(editingValue);
        }
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setEditingValue(null);
        (e.target as HTMLInputElement).blur();
      }
    },
    [editingValue, commitValue],
  );

  const stepValue = useCallback(
    (direction: 1 | -1) => {
      const step = 0.01;
      onValueChange(Math.round((value + direction * step) * 10000) / 10000);
    },
    [value, onValueChange],
  );

  /* ---- Lock toggle ---- */
  const handleLock = useCallback(() => {
    setLocked((prev) => !prev);
    onLock?.();
  }, [onLock]);

  /* ---- Build the combined param list ---- */
  const allParams = useMemo(() => {
    // Merge static availableParams with dynamic pluginParams
    // availableParams contains basic track params (Volume, Pan, Mute, Solo)
    // pluginParams contains params fetched from engine
    return [...availableParams, ...pluginParams];
  }, [availableParams, pluginParams]);

  /* ---- Group and filter params for display ---- */
  const menuSections = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // Separate basic params (no group) from plugin params (have group)
    const basicParams = allParams.filter((p) => !p.group);
    const grouped = allParams.filter((p) => !!p.group);

    // Group plugin params by plugin name
    const pluginGroups = new Map<string, AutomationParam[]>();
    for (const p of grouped) {
      const key = p.group!;
      if (!pluginGroups.has(key)) {
        pluginGroups.set(key, []);
      }
      pluginGroups.get(key)!.push(p);
    }

    // Apply search filter
    const filterParam = (p: AutomationParam) =>
      !query || p.label.toLowerCase().includes(query) || (p.group && p.group.toLowerCase().includes(query));

    const filteredBasic = basicParams.filter(filterParam);
    const filteredPluginGroups = new Map<string, AutomationParam[]>();

    for (const [groupName, params] of pluginGroups) {
      const filtered = params.filter(filterParam);
      if (filtered.length > 0) {
        filteredPluginGroups.set(groupName, filtered);
      }
    }

    return { basic: filteredBasic, plugins: filteredPluginGroups };
  }, [allParams, searchQuery]);

  /* ---- Expand/collapse all for search ---- */
  const handleExpandAll = useCallback(() => {
    const allGroupNames = new Set<string>();
    for (const key of menuSections.plugins.keys()) {
      allGroupNames.add(key);
    }
    for (const g of EXPANDABLE_GROUPS) {
      allGroupNames.add(g);
    }
    setExpandedGroups(allGroupNames);
  }, [menuSections.plugins]);

  const handleCollapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  return (
    <div
      className={styles.laneHeader}
      style={{ '--lane-tint': trackColor } as React.CSSProperties}
    >
      {/* ---- Left section ---- */}
      <div className={styles.left}>
        <CurveIcon />

        <button
          className={`${styles.rwButton} ${readEnabled ? styles.readActive : ''}`}
          onClick={onReadToggle}
          title="Read automation"
        >
          R
        </button>

        <button
          className={`${styles.rwButton} ${writeEnabled ? styles.writeActive : ''}`}
          onClick={onWriteToggle}
          title="Write automation"
        >
          W
        </button>
      </div>

      {/* ---- Middle section ---- */}
      <div className={styles.middle}>
        {/* Parameter dropdown */}
        <div
          className={`${styles.paramSelect} ${dropdownOpen ? styles.paramSelectOpen : ''}`}
          ref={dropdownRef}
        >
          <button
            className={styles.paramTrigger}
            onClick={() => setDropdownOpen((prev) => !prev)}
            title={paramLabel}
          >
            <span className={styles.paramLabel}>{paramLabel}</span>
            <span className={styles.paramArrow}>{'\u25BC'}</span>
          </button>

          {dropdownOpen && (
            <div className={styles.paramMenu}>
              {/* ---- Search bar ---- */}
              <div className={styles.searchBar}>
                <button
                  className={styles.searchActionBtn}
                  onClick={handleExpandAll}
                  title="Expand all"
                >
                  +
                </button>
                <button
                  className={styles.searchActionBtn}
                  onClick={handleCollapseAll}
                  title="Collapse all"
                >
                  -
                </button>
                <div className={styles.searchInputWrap}>
                  <SearchIcon />
                  <input
                    ref={searchInputRef}
                    className={styles.searchInput}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search parameters..."
                  />
                </div>
              </div>

              <div className={styles.menuSeparator} />

              {/* ---- Scrollable content ---- */}
              <div className={styles.menuScrollArea}>
                {/* ---- Plugin parameters (grouped) ---- */}
                {loadingPlugins && (
                  <div className={styles.loadingRow}>Loading plugins...</div>
                )}

                {Array.from(menuSections.plugins.entries()).map(([pluginName, params]) => (
                  <div key={`pg-${pluginName}`} className={styles.pluginGroup}>
                    <button
                      className={styles.pluginGroupHeader}
                      onClick={() => toggleGroup(pluginName)}
                    >
                      <TriangleIcon expanded={expandedGroups.has(pluginName)} />
                      <span className={styles.pluginGroupName}>{pluginName}</span>
                    </button>
                    {expandedGroups.has(pluginName) &&
                      params.map((p) => (
                        <button
                          key={p.type}
                          className={`${styles.paramOption} ${p.type === paramType ? styles.paramOptionSelected : ''}`}
                          onClick={() => handleParamSelect(p.type)}
                        >
                          <span className={styles.paramOptionIndent}>
                            {p.label}
                          </span>
                        </button>
                      ))}
                  </div>
                ))}

                {menuSections.plugins.size > 0 && menuSections.basic.length > 0 && (
                  <div className={styles.menuSeparator} />
                )}

                {/* ---- Basic track parameters ---- */}
                {menuSections.basic.map((p) => (
                  <button
                    key={p.type}
                    className={`${styles.paramOption} ${p.type === paramType ? styles.paramOptionSelected : ''}`}
                    onClick={() => handleParamSelect(p.type)}
                  >
                    {p.label}
                  </button>
                ))}

                {/* ---- Expandable groups (structural categories) ---- */}
                {EXPANDABLE_GROUPS.filter(
                  (g) => !searchQuery || g.toLowerCase().includes(searchQuery.toLowerCase()),
                ).length > 0 && (
                  <>
                    <div className={styles.menuSeparator} />
                    {EXPANDABLE_GROUPS.filter(
                      (g) => !searchQuery || g.toLowerCase().includes(searchQuery.toLowerCase()),
                    ).map((groupName) => (
                      <div key={`eg-${groupName}`}>
                        <button
                          className={styles.expandableGroupHeader}
                          onClick={() => toggleGroup(groupName)}
                        >
                          <TriangleIcon expanded={expandedGroups.has(groupName)} />
                          <span>{groupName}</span>
                        </button>
                        {expandedGroups.has(groupName) && (
                          <div className={styles.expandableGroupContent}>
                            <span className={styles.expandableEmpty}>No parameters</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* ---- Empty state ---- */}
                {!loadingPlugins &&
                  menuSections.plugins.size === 0 &&
                  menuSections.basic.length === 0 && (
                    <div className={styles.emptyRow}>No matching parameters</div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Value spinner */}
        <div className={styles.valueSpinner}>
          <input
            className={styles.valueInput}
            type="text"
            value={displayValue}
            onChange={handleValueInputChange}
            onBlur={handleValueBlur}
            onKeyDown={handleValueKeyDown}
            onFocus={() => setEditingValue(value.toFixed(4))}
            title="Automation value"
          />
          <div className={styles.spinButtons}>
            <button
              className={`${styles.spinBtn} ${styles.spinBtnUp}`}
              onClick={() => stepValue(1)}
              tabIndex={-1}
              title="Increase"
            >
              {'\u25B2'}
            </button>
            <button
              className={styles.spinBtn}
              onClick={() => stepValue(-1)}
              tabIndex={-1}
              title="Decrease"
            >
              {'\u25BC'}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Right section ---- */}
      <div className={styles.right}>
        <button
          className={`${styles.iconButton} ${locked ? styles.lockActive : ''}`}
          onClick={handleLock}
          title={locked ? 'Unlock lane' : 'Lock lane'}
        >
          <LockIcon locked={locked} />
        </button>

        <button
          className={styles.iconButton}
          onClick={onClose}
          title="Remove automation lane"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};
