import React from 'react';

const ICON_MAP: Record<string, string> = {
  undo: '\u21A9',
  redo: '\u21AA',
  play: '\u25B6',
  stop: '\u25A0',
  record: '\u23FA',
  rewind: '\u23EA',
  forward: '\u23E9',
  previous: '\u23EE',
  next: '\u23ED',
  loop: '\uD83D\uDD01',
  metronome: '\uD83D\uDD14',
  select: '\u2196',
  range: '\u21D4',
  split: '\u2702',
  glue: '\uD83D\uDD17',
  erase: '\u2715',
  zoom: '\uD83D\uDD0D',
  'mute-tool': '\u2716',
  draw: '\u270E',
  line: '\u2572',
  snap: '\uD83E\uDDF2',
  'left-zone': '\u25E7',
  'right-zone': '\u25E8',
  'lower-zone': '\u2B12',
  gear: '\u2699',
  speaker: '\uD83D\uDD0A',
  folder: '\uD83D\uDCC1',
  midi: '\u266A',
  audio: '\uD83D\uDD0A',
  instrument: '\uD83C\uDFB9',
  'chevron-right': '\u203A',
  'chevron-down': '\u2304',
};

const SIZE_VAR: Record<string, string> = {
  sm: 'var(--icon-size-sm)',
  md: 'var(--icon-size)',
  lg: 'var(--icon-size-lg)',
};

interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 'md', className }) => {
  const character = ICON_MAP[name] || '?';
  const dimension = SIZE_VAR[size];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dimension,
        height: dimension,
        fontSize: dimension,
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {character}
    </span>
  );
};
