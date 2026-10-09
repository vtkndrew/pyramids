import { useCallback, type ComponentProps, useRef } from 'react';
import { createPortal } from 'react-dom';

import { BoardView, Disk } from '@/entities/game';

import { useBoardGestures } from '../model/useBoardGestures';

export default function InteractiveBoard({
  onMove,
  onClear,
  ...props
}: ComponentProps<typeof BoardView> & {
  onMove: (from: number, to: number) => void;
  onClear: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gestures = useBoardGestures({
    root,
    board: props.board,
    control: props.control ?? 'tap',
    enabled: Boolean(props.onRod) && !props.won,
    onMove,
    onClear,
  });
  const ghost = gestures.visual;

  const { down, update, up, cancel, allowClick } = gestures;
  const { onRod } = props;

  const getRodEvents = useCallback<NonNullable<ComponentProps<typeof BoardView>['rodEvents']>>(
    (rod) => ({
      onPointerDown: (event) => down(event, rod),
      onPointerMove: update,
      onPointerUp: up,
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onClick: (event) => {
        if (allowClick(event.detail)) onRod?.(rod);
      },
    }),
    [allowClick, cancel, down, onRod, up, update],
  );

  return (
    <>
      <BoardView {...props} root={root} gesture={ghost ?? undefined} rodEvents={getRodEvents} />
      {ghost &&
        props.control === 'drag' &&
        createPortal(
          <Disk
            size={ghost.disk}
            ghost
            style={{
              width: ghost.width,
              height: ghost.height,
              left: Math.max(
                0,
                Math.min(window.innerWidth - ghost.width, ghost.x - ghost.width / 2),
              ),
              top: Math.max(
                0,
                Math.min(window.innerHeight - ghost.height, ghost.y - ghost.height / 2),
              ),
            }}
          />,
          document.body,
        )}
    </>
  );
}
