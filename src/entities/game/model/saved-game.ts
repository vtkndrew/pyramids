import type { ControlMode } from './controls';
import { createGame, moveError, type Board, type Config, type Game } from './game';

export const SAVE_VERSION = 1;
export type Summary = {
  id: string;
  order: number;
  startedAt: number;
  config: Config;
  elapsed: number;
  moves: number;
  status: 'active' | 'won' | 'abandoned';
};
export type Snapshot = {
  id: string;
  startedAt: number;
  game: Game;
  control: ControlMode;
  elapsed: number;
};
export type Head = {
  version: number;
  id: string;
  revision: number;
  order?: number;
  startedAt: number;
  config: Config;
  control: ControlMode;
  elapsed: number;
  cursor: number;
  length: number;
  paused: boolean;
};
export class SaveConflict extends Error {}
export class InvalidSave extends Error {}
export class NewerSave extends Error {}

export function validateSnapshot(head: Head, history: Board[]): Snapshot {
  if (head.version !== SAVE_VERSION) {
    throw new NewerSave('Неизвестная версия сохранения. Обновите приложение.');
  }

  try {
    const initial = createGame(head.config);

    if (
      typeof head.id !== 'string' ||
      !head.id ||
      !Number.isFinite(head.startedAt) ||
      head.startedAt < 0 ||
      !Number.isSafeInteger(head.revision) ||
      head.revision < 1 ||
      typeof head.paused !== 'boolean' ||
      !Number.isFinite(head.elapsed) ||
      head.elapsed < 0 ||
      head.elapsed > Number.MAX_SAFE_INTEGER ||
      !Number.isInteger(head.cursor) ||
      head.cursor < 0 ||
      head.cursor >= history.length ||
      head.length !== history.length ||
      !history.length ||
      !['tap', 'drag', 'swipe'].includes(head.control) ||
      (head.control === 'swipe' && head.config.mode !== 'hardcore')
    ) {
      throw new Error();
    }

    for (let i = 0; i < history.length; i++) {
      const board = history[i];

      if (!Array.isArray(board) || board.length !== head.config.rods) {
        throw new Error();
      }

      const disks = new Set<number>();

      for (const rod of board) {
        if (!Array.isArray(rod)) {
          throw new Error();
        }

        rod.forEach((disk, index) => {
          if (
            !Number.isInteger(disk) ||
            disk < 1 ||
            disk > head.config.disks ||
            disks.has(disk) ||
            (index > 0 && rod[index - 1] <= disk)
          ) {
            throw new Error();
          }

          disks.add(disk);
        });
      }

      if (disks.size !== head.config.disks) {
        throw new Error();
      }

      if (i === 0) {
        if (JSON.stringify(board) !== JSON.stringify(initial.history[0])) {
          throw new Error();
        }

        continue;
      }

      const previous = history[i - 1];
      const from = previous.findIndex((rod, r) => rod.length === board[r].length + 1);
      const to = previous.findIndex((rod, r) => rod.length + 1 === board[r].length);

      if (
        moveError(previous, from, to, head.config.mode) ||
        previous[previous.length - 1].length === head.config.disks
      ) {
        throw new Error();
      }

      const next = previous.map((rod) => [...rod]);

      const disk = next[from].pop();

      if (disk === undefined) {
        throw new Error('Missing source disk');
      }

      next[to].push(disk);

      if (JSON.stringify(next) !== JSON.stringify(board)) {
        throw new Error();
      }
    }

    return {
      id: head.id,
      startedAt: head.startedAt,
      control: head.control,
      elapsed: head.elapsed,
      game: { ...initial, history, cursor: head.cursor, paused: true },
    };
  } catch {
    throw new InvalidSave(
      'Последнее сохранение повреждено. Можно начать новую игру; история результатов сохранена.',
    );
  }
}
