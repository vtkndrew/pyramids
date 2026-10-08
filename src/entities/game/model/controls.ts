import type { GameMode } from "./game";

export type ControlMode = "tap" | "drag" | "swipe";
export const CONTROL_LABELS: Record<ControlMode, string> = {
  tap: "Нажатия",
  drag: "Перетаскивание",
  swipe: "Свайпы",
};
export const CONTROL_HINTS: Record<ControlMode, string> = {
  tap: "Нажмите на исходный стержень, затем на стержень назначения.",
  drag: "Потяните из любой части ячейки стержня и отпустите над нужным стержнем.",
  swipe:
    "Смахните по ячейке влево или вправо, чтобы перенести верхний диск к соседу.",
};
export const defaultControl = (mode: GameMode): ControlMode =>
  mode === "hardcore" ? "swipe" : "drag";
