import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Board } from "@/entities/game";
import type { ControlMode } from "@/entities/game";

type Gesture = {
  id: number;
  from: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  moved: boolean;
  disk: number;
  width: number;
  height: number;
  element: HTMLElement;
  target: number | null;
};

export function useBoardGestures({
  root,
  board,
  control,
  enabled,
  onMove,
  onClear,
}: {
  root: RefObject<HTMLDivElement | null>;
  board: Board;
  control: ControlMode;
  enabled: boolean;
  onMove?: (from: number, to: number) => void;
  onClear?: () => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [visual, setVisual] = useState<Gesture | null>(null);
  const callbacks = useRef({ onMove, onClear });
  callbacks.current = { onMove, onClear };

  const cancel = useCallback(() => {
    const current = gesture.current;
    if (!current) return;
    suppressClick.current = true;
    gesture.current = null;
    setVisual(null);
    if (current.element.hasPointerCapture(current.id))
      current.element.releasePointerCapture(current.id);
  }, []);

  useEffect(() => {
    const extraPointer = (event: PointerEvent) => {
      if (gesture.current && event.pointerId !== gesture.current.id) cancel();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" || /^[1-6]$/.test(event.key)) cancel();
    };
    let previousSize = "";
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const size = `${width}:${height}`;
      if (previousSize && size !== previousSize) cancel();
      previousSize = size;
    });
    if (root.current) observer.observe(root.current);
    document.addEventListener("pointerdown", extraPointer, true);
    document.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", extraPointer, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      cancel();
    };
  }, [cancel, root]);
  useEffect(() => {
    cancel();
  }, [board, control, enabled, cancel]);

  function targetAt(x: number, y: number): number | null {
    const cells = root.current?.querySelectorAll<HTMLElement>("[data-rod]");
    for (const cell of cells ?? []) {
      const rect = cell.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      )
        return Number(cell.dataset.rod);
    }
    return null;
  }

  function down(event: ReactPointerEvent<HTMLElement>, from: number) {
    if (!event.isPrimary) return;
    suppressClick.current = false;
    if (!enabled || control === "tap" || event.button !== 0) return;
    const disk = board[from].at(-1);
    if (disk === undefined) return;
    const rect = event.currentTarget
      .querySelector("[data-disk]:last-child")!
      .getBoundingClientRect();
    gesture.current = {
      id: event.pointerId,
      from,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      disk,
      width: rect.width,
      height: rect.height,
      active: false,
      moved: false,
      element: event.currentTarget,
      target: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function update(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    current.x = event.clientX;
    current.y = event.clientY;
    const dx = current.x - current.startX;
    const dy = current.y - current.startY;
    if (Math.hypot(dx, dy) >= 8) {
      current.moved = true;
      suppressClick.current = true;
    }
    const recognized =
      control === "drag"
        ? current.moved
        : Math.abs(dx) >= 24 && Math.abs(dx) >= Math.abs(dy) * 1.5;
    if (recognized && !current.active) {
      current.active = true;
      callbacks.current.onClear?.();
    }
    if (current.active) {
      current.target =
        control === "drag"
          ? targetAt(current.x, current.y)
          : recognized
            ? current.from + Math.sign(dx)
            : null;
      setVisual({ ...current });
    }
  }

  function up(event: ReactPointerEvent<HTMLElement>) {
    update(event);
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    setVisual(null);
    if (current.element.hasPointerCapture(current.id))
      current.element.releasePointerCapture(current.id);
    if (
      current.active &&
      current.target !== null &&
      current.target !== current.from
    ) {
      callbacks.current.onMove?.(current.from, current.target);
    }
  }

  return {
    visual,
    down,
    update,
    up,
    cancel,
    allowClick: (detail: number) => detail === 0 || !suppressClick.current,
  };
}
