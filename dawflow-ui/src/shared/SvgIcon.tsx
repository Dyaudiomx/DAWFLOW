import React from 'react';

interface SvgIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const SvgIcon: React.FC<SvgIconProps> = ({ name, size = 16, className }) => {
  const icon = getIcon(name, size);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        lineHeight: 1,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
};

function getIcon(name: string, size: number): React.ReactNode {
  switch (name) {
    /* ====================================================================
       PROJECT TOOLS
       ==================================================================== */

    // Select — pointer/cursor arrow
    case 'select':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M3 1L3 12L6 9L9 14L11 13L8 8L12 8L3 1Z" fill="currentColor" />
        </svg>
      );

    // Range — two vertical bars with horizontal arrows between
    case 'range':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="1.5" height="12" rx="0.5" fill="currentColor" />
          <rect x="12.5" y="2" width="1.5" height="12" rx="0.5" fill="currentColor" />
          <path d="M5 8H11" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 8L7 6M5 8L7 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 8L9 6M11 8L9 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Split — scissors
    case 'split':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="4.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="4.5" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6 5.5L13 12M6 10.5L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );

    // Glue — glue tube
    case 'glue':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="5" y="1" width="6" height="4" rx="1" fill="currentColor" />
          <rect x="6" y="5" width="4" height="8" rx="0.5" fill="currentColor" />
          <path d="M7 13L8 15L9 13" fill="currentColor" />
        </svg>
      );

    // Erase — eraser rectangle
    case 'erase':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path
            d="M10.5 2L14 5.5L7.5 12H3L2 11L10.5 2Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M6 8L10.5 3.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3 14H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    // Zoom — magnifying glass with +
    case 'zoom':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 7H9M7 5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    // Mute — X mark
    case 'mute':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // Draw — pencil at diagonal
    case 'draw':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path
            d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M9.5 3.5L12.5 6.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );

    // Line — diagonal line
    case 'line':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="2" cy="14" r="1.5" fill="currentColor" />
          <circle cx="14" cy="2" r="1.5" fill="currentColor" />
        </svg>
      );

    // Play (listen tool) — speaker with sound waves
    case 'play':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M2 6V10H4.5L8 13V3L4.5 6H2Z" fill="currentColor" />
          <path d="M10 5.5C11.3 6.5 11.3 9.5 10 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M11.5 3.5C14 5.5 14 10.5 11.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    // Color — paint bucket
    case 'color':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path
            d="M3 10L7 2L13 5L9 13L3 10Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M5 9L9 3.5" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="13" cy="12" rx="1.5" ry="2.5" fill="currentColor" />
        </svg>
      );

    // Comp — overlapping rectangles (lane/comp tool)
    case 'comp':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <rect x="5" y="5" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M5 8H11" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
        </svg>
      );

    // Timewarp — clock with curved arrow
    case 'timewarp':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 4V8L10.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2L14 4L12 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    /* ====================================================================
       TOOLBAR ACTION ICONS
       ==================================================================== */

    // Home — house shape
    case 'home':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M2 8L8 2L14 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 7V14H7V10H9V14H12V7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      );

    // Undo — curved arrow pointing left
    case 'undo':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M5 6L2 3L5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 3H10C12.2 3 14 5 14 7.5C14 10 12.2 12 10 12H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    // Redo — curved arrow pointing right
    case 'redo':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M11 6L14 3L11 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 3H6C3.8 3 2 5 2 7.5C2 10 3.8 12 6 12H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    // MediaBay — grid of squares
    case 'mediabay':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          <rect x="9" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          <rect x="9" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );

    // Pool — folder shape
    case 'pool':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path
            d="M1 4V13C1 13.6 1.4 14 2 14H14C14.6 14 15 13.6 15 13V6C15 5.4 14.6 5 14 5H8L6.5 3H2C1.4 3 1 3.4 1 4Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    // MixConsole — three vertical fader lines
    case 'mixconsole':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4 3V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M8 3V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M12 3V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="2.5" y="5" width="3" height="2.5" rx="0.5" fill="currentColor" />
          <rect x="6.5" y="8" width="3" height="2.5" rx="0.5" fill="currentColor" />
          <rect x="10.5" y="6" width="3" height="2.5" rx="0.5" fill="currentColor" />
        </svg>
      );

    // Control Room — speaker shape
    case 'controlroom':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M2 6V10H5L9 13V3L5 6H2Z" fill="currentColor" />
          <path d="M11 5C12.5 6.5 12.5 9.5 11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M12.5 3C15 5.5 15 10.5 12.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    // Auto-scroll — right arrow in a box
    case 'autoscroll':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 8H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M9 5.5L11.5 8L9 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // CDC — Constrain Delay Compensation (clock icon)
    case 'cdc':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Snap — magnet shape
    case 'snap':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path
            d="M3 9V6C3 3.2 5.2 1 8 1C10.8 1 13 3.2 13 6V9"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <rect x="2" y="9" width="4" height="5" rx="0.5" fill="currentColor" />
          <rect x="10" y="9" width="4" height="5" rx="0.5" fill="currentColor" />
        </svg>
      );

    /* ====================================================================
       ZONE TOGGLE ICONS
       ==================================================================== */

    // Zone Left — rectangle with left bar highlighted
    case 'zone-left':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="3" width="4" height="10" fill="currentColor" opacity="0.5" />
          <path d="M6 3V13" stroke="currentColor" strokeWidth="1" />
        </svg>
      );

    // Zone Bottom — rectangle with bottom bar highlighted
    case 'zone-bottom':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="9" width="12" height="4" fill="currentColor" opacity="0.5" />
          <path d="M2 9H14" stroke="currentColor" strokeWidth="1" />
        </svg>
      );

    // Zone Right — rectangle with right bar highlighted
    case 'zone-right':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <rect x="10" y="3" width="4" height="10" fill="currentColor" opacity="0.5" />
          <path d="M10 3V13" stroke="currentColor" strokeWidth="1" />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <text x="8" y="11" textAnchor="middle" fill="currentColor" fontSize="8" fontFamily="sans-serif">
            ?
          </text>
        </svg>
      );
  }
}
