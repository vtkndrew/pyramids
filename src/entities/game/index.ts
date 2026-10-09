export {
  createGame,
  currentBoard,
  DEFAULT_CONFIG,
  isWon,
  moveError,
  gameReducer,
} from './model/game';
export type { GameMode, Config, Board, Game, Action } from './model/game';
export { defaultControl, CONTROL_HINTS, CONTROL_LABELS } from './model/controls';
export type { ControlMode } from './model/controls';
export {
  SAVE_VERSION,
  SaveConflict,
  InvalidSave,
  NewerSave,
  validateSnapshot,
} from './model/saved-game';
export type { Summary, Snapshot } from './model/saved-game';
export { SaveRepository } from './api/saves';
export { default as BoardView } from './ui/BoardView';
export { default as Rules } from './ui/Rules';
export { Disk } from './ui/Disk';
