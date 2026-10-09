import type { CSSProperties } from 'react';

import { bindClasses } from '@/shared/lib/styles';

import styles from './BoardView.module.css';
import { DISK_COLORS } from './diskPalette';

const css = bindClasses(styles);

export function Disk({
  size,
  ghost,
  style,
}: {
  size: number;
  ghost?: boolean;
  style: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ ...style, backgroundColor: DISK_COLORS[size - 1] }}
      className={css(`disk ${ghost ? 'drag-ghost' : ''}`)}
      data-testid={ghost ? 'drag-ghost' : 'disk'}
    >
      <span>{size}</span>
    </div>
  );
}
