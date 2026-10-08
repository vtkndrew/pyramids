import { useRef, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { BoardView, Disk } from "@/entities/game";
import { useBoardGestures } from "../model/useBoardGestures";

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
    control: props.control ?? "tap",
    enabled: !!props.onRod && !props.won,
    onMove,
    onClear,
  });
  const ghost = gestures.visual;
  return (
    <>
      <BoardView
        {...props}
        root={root}
        gesture={ghost ?? undefined}
        rodEvents={(rod) => ({
          onPointerDown: (event) => gestures.down(event, rod),
          onPointerMove: gestures.update,
          onPointerUp: gestures.up,
          onPointerCancel: gestures.cancel,
          onLostPointerCapture: gestures.cancel,
          onClick: (event) => {
            if (gestures.allowClick(event.detail)) props.onRod?.(rod);
          },
        })}
      />
      {ghost &&
        props.control === "drag" &&
        createPortal(
          <Disk
            size={ghost.disk}
            ghost
            style={{
              width: ghost.width,
              height: ghost.height,
              left: Math.max(
                0,
                Math.min(
                  window.innerWidth - ghost.width,
                  ghost.x - ghost.width / 2,
                ),
              ),
              top: Math.max(
                0,
                Math.min(
                  window.innerHeight - ghost.height,
                  ghost.y - ghost.height / 2,
                ),
              ),
            }}
          />,
          document.body,
        )}
    </>
  );
}
