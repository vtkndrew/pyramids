type IconName =
  | 'arrow'
  | 'undo'
  | 'redo'
  | 'restart'
  | 'settings'
  | 'check'
  | 'spark'
  | 'info'
  | 'pause'
  | 'play'
  | 'menu';

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    pause: 'M8 5v14M16 5v14',
    play: 'm8 4 12 8-12 8Z',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    undo: 'M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14',
    redo: 'm16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14',
    restart: 'M3 10a9 9 0 1 1 1.5 7M3 4v6h6',
    settings: 'M4 7h16M4 17h16M9 4v6m6 4v6',
    check: 'm5 12 4 4L19 6',
    spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
    info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
