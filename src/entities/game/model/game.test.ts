import { describe, expect, it } from 'vitest';

import {
  createGame,
  currentBoard,
  DEFAULT_CONFIG,
  gameReducer,
  isWon,
  type Game,
  type GameMode,
} from './game';

function move(game: Game, from: number, to: number): Game {
  return gameReducer(gameReducer(game, { type: 'select', rod: from }), {
    type: 'select',
    rod: to,
  });
}

function solve(game: Game, n: number, from: number, to: number, spare: number): Game {
  if (n === 0) {
    return game;
  }

  const first = solve(game, n - 1, from, spare, to);
  const next = move(first, from, to);

  expect(next.error).toBeNull();

  return solve(next, n - 1, spare, to, from);
}

describe('rules and setup', () => {
  it.each([3, 4, 5, 6])('starts with a descending pyramid on the first of %i rods', (rods) => {
    const game = createGame({ mode: 'classic', rods, disks: 10 });

    expect(currentBoard(game)).toEqual([
      Array.from({ length: 10 }, (_, i) => 10 - i),
      ...Array.from({ length: rods - 1 }, () => []),
    ]);
    expect(game.cursor).toBe(0);
    expect(isWon(game)).toBe(false);
  });

  it.each([
    { rods: 2, disks: 5 },
    { rods: 7, disks: 5 },
    { rods: 3, disks: 2 },
    { rods: 3, disks: 11 },
    { rods: 3.5, disks: 5 },
    { rods: 3, disks: NaN },
  ])('rejects invalid settings: %o', (config) => {
    expect(() => createGame({ ...config, mode: 'classic' })).toThrow(RangeError);
  });

  it('moves only the top disk and allows a smaller disk onto a bigger one', () => {
    const initial = createGame({ mode: 'classic', rods: 3, disks: 3 });
    const first = move(initial, 0, 2);
    const second = move(first, 0, 1);
    const third = move(second, 2, 1);

    expect(currentBoard(first)).toEqual([[3, 2], [], [1]]);
    expect(currentBoard(third)).toEqual([[3], [2, 1], []]);
    expect(currentBoard(initial)).toEqual([[3, 2, 1], [], []]);
  });

  it('retains selection and history after a forbidden move', () => {
    const first = move(createGame(DEFAULT_CONFIG), 0, 2);
    const invalid = move(first, 0, 2);

    expect(invalid.error).toContain('Большой диск');
    expect(invalid.selected).toBe(0);
    expect(invalid.history).toBe(first.history);
    expect(invalid.cursor).toBe(1);
    const recovered = gameReducer(invalid, { type: 'select', rod: 1 });

    expect(recovered.error).toBeNull();
    expect(recovered.cursor).toBe(2);
  });

  it('handles an empty rod and deselection without adding moves', () => {
    const initial = createGame(DEFAULT_CONFIG);
    const empty = gameReducer(initial, { type: 'select', rod: 1 });

    expect(empty.error).toContain('нет дисков');
    expect(empty.selected).toBeNull();
    const selected = gameReducer(empty, { type: 'select', rod: 0 });
    const deselected = gameReducer(selected, { type: 'select', rod: 0 });

    expect(deselected.selected).toBeNull();
    expect(deselected.error).toBeNull();
    expect(deselected.history).toBe(initial.history);
  });
});

describe('hardcore mode', () => {
  it.each([3, 4, 5, 6])('allows both neighbours and rejects jumps with %i rods', (rods) => {
    const initial = createGame({ rods, disks: 3, mode: 'hardcore' });
    const jumped = move(initial, 0, 2);

    expect(jumped.error).toContain('соседний');
    expect(jumped.history).toBe(initial.history);
    expect(jumped.selected).toBe(0);
    const right = move(move(initial, 0, 1), 1, 2);

    expect(right.cursor).toBe(2);
    expect(currentBoard(right)[2]).toEqual([1]);
    const left = move(move(right, 2, 1), 1, 0);

    expect(left.cursor).toBe(4);
    expect(currentBoard(left)).toEqual(currentBoard(initial));
    let atEnd = initial;

    for (let from = 0; from < rods - 1; from++) {
      atEnd = move(atEnd, from, from + 1);
    }

    const wrap = move(atEnd, rods - 1, 0);

    expect(wrap.error).toContain('соседний');
    expect(wrap.history).toBe(atEnd.history);
  });

  it.each(['classic', 'hardcore'] as const)('still enforces disk sizes in %s mode', (mode) => {
    const first = move(createGame({ ...DEFAULT_CONFIG, mode }), 0, 1);
    const invalid = move(first, 0, 1);

    expect(invalid.error).toContain('Большой диск');
    expect(invalid.cursor).toBe(1);
    expect(invalid.selected).toBe(0);
  });

  it('preserves the future after invalid moves and discards it after a legal branch', () => {
    const first = move(createGame({ ...DEFAULT_CONFIG, mode: 'hardcore' }), 0, 1);
    const second = move(first, 1, 2);
    const undone = gameReducer(second, { type: 'undo' });
    const invalid = move(undone, 0, 2);

    expect(invalid.error).toContain('соседний');
    expect(invalid.history).toBe(second.history);
    const deselected = gameReducer(invalid, { type: 'select', rod: 0 });
    const branch = move(deselected, 1, 0);

    expect(branch.cursor).toBe(2);
    expect(branch.history).toHaveLength(3);
    expect(currentBoard(branch)[0]).toEqual([5, 4, 3, 2, 1]);
    expect(gameReducer(branch, { type: 'redo' }).cursor).toBe(2);
    const undo = gameReducer(branch, { type: 'undo' });

    expect(currentBoard(undo)).toEqual(currentBoard(first));
    expect(currentBoard(gameReducer(undo, { type: 'redo' }))).toEqual(currentBoard(branch));
  });

  it('rejects unknown modes', () => {
    expect(() => createGame({ ...DEFAULT_CONFIG, mode: 'unknown' as GameMode })).toThrow(
      RangeError,
    );
  });

  it.each([3, 10])(
    'solves %i disks and can undo and redo the entire hardcore game',
    (disks) => {
      const initial = createGame({ rods: 3, disks, mode: 'hardcore' });
      let game = initial;
      let moves = 0;

      const step = (from: number, to: number) => {
        game = move(game, from, to);

        if (game.error) {
          throw new Error(game.error);
        }

        moves++;
      };

      const solveAdjacent = (count: number, from: number, to: number): void => {
        if (count === 0) {
          return;
        }

        solveAdjacent(count - 1, from, to);
        step(from, 1);
        solveAdjacent(count - 1, to, from);
        step(1, to);
        solveAdjacent(count - 1, from, to);
      };

      solveAdjacent(disks, 0, 2);
      expect(moves).toBe(disks === 3 ? 26 : 59048);
      expect(game.cursor).toBe(moves);
      expect(game.history).toHaveLength(moves + 1);
      expect(isWon(game)).toBe(true);
      expect(gameReducer(game, { type: 'pause' })).toBe(game);

      for (let i = 0; i < moves; i++) {
        game = gameReducer(game, { type: 'undo' });
      }

      expect(currentBoard(game)).toEqual(currentBoard(initial));
      expect(isWon(game)).toBe(false);

      for (let i = 0; i < moves; i++) {
        game = gameReducer(game, { type: 'redo' });
      }

      expect(game.cursor).toBe(moves);
      expect(isWon(game)).toBe(true);
    },
    30_000,
  );
});

describe('manual pause', () => {
  it.each(['classic', 'hardcore'] as const)(
    'blocks board and history changes in %s mode',
    (mode) => {
      const initial = createGame({ ...DEFAULT_CONFIG, mode });
      const first = move(initial, 0, 1);
      const second = move(first, 1, 2);
      const undone = gameReducer(second, { type: 'undo' });
      const invalid = move(undone, 0, 1);

      expect(invalid.error).not.toBeNull();
      const paused = gameReducer(invalid, { type: 'pause' });

      expect(paused.paused).toBe(true);
      expect(paused.selected).toBeNull();
      expect(paused.error).toBeNull();
      expect(paused.history).toBe(second.history);
      expect(paused.cursor).toBe(1);
      expect(gameReducer(paused, { type: 'undo' })).toBe(paused);
      expect(gameReducer(paused, { type: 'redo' })).toBe(paused);
      expect(gameReducer(paused, { type: 'select', rod: 1 })).toBe(paused);
      const resumed = gameReducer(paused, { type: 'resume' });

      expect(resumed.paused).toBe(false);
      expect(resumed.history).toBe(paused.history);
      expect(currentBoard(gameReducer(resumed, { type: 'redo' }))).toEqual(currentBoard(second));
      expect(gameReducer(paused, { type: 'restart' })).toEqual(initial);
      const config = {
        rods: 6,
        disks: 10,
        mode: mode === 'classic' ? 'hardcore' : 'classic',
      } as const;

      expect(gameReducer(paused, { type: 'start', config })).toEqual(createGame(config));
    },
  );
});

describe('direct moves from gestures', () => {
  it.each(['classic', 'hardcore'] as const)(
    'shares validation and history with taps in %s mode',
    (mode) => {
      const initial = createGame({ ...DEFAULT_CONFIG, mode });
      const direct = gameReducer(initial, { type: 'move', from: 0, to: 1 });

      expect(direct).toEqual(move(initial, 0, 1));
      expect(direct.history).toHaveLength(2);
      const invalid = gameReducer(direct, { type: 'move', from: 0, to: 1 });

      expect(invalid.error).toContain('Большой диск');
      expect(invalid.history).toBe(direct.history);
      const paused = gameReducer(direct, { type: 'pause' });

      expect(gameReducer(paused, { type: 'move', from: 1, to: 2 })).toBe(paused);
      const next = gameReducer(direct, { type: 'move', from: 1, to: 2 });
      const undo = gameReducer(next, { type: 'undo' });

      expect(gameReducer(undo, { type: 'move', from: 0, to: 1 }).history).toBe(next.history);
      const branch = gameReducer(undo, { type: 'move', from: 1, to: 0 });

      expect(branch.history).toHaveLength(3);
      expect(currentBoard(branch)).toEqual(currentBoard(initial));
      expect(gameReducer(branch, { type: 'redo' }).cursor).toBe(2);
    },
  );

  it('rejects non-neighbours and out-of-bounds targets without changing history', () => {
    const game = createGame({ ...DEFAULT_CONFIG, mode: 'hardcore' });

    for (const to of [-1, 2, 3]) {
      const invalid = gameReducer(game, { type: 'move', from: 0, to });

      expect(invalid.error).not.toBeNull();
      expect(invalid.history).toBe(game.history);
      expect(invalid.cursor).toBe(0);
    }
  });

  it('blocks direct moves after victory and clears selection without changing history', () => {
    const game = createGame({ ...DEFAULT_CONFIG, disks: 3 });
    const selected = gameReducer(game, { type: 'select', rod: 0 });
    const cleared = gameReducer(selected, { type: 'clearSelection' });

    expect(cleared.selected).toBeNull();
    expect(cleared.history).toBe(game.history);
    const won = solve(game, 3, 0, 2, 1);

    expect(gameReducer(won, { type: 'move', from: 2, to: 1 })).toBe(won);
  });
});

describe('history and victory', () => {
  it('undoes and redoes a complete game, including victory, at bounded endpoints', () => {
    const initial = createGame({ mode: 'classic', rods: 3, disks: 3 });
    const complete = solve(initial, 3, 0, 2, 1);

    expect(complete.cursor).toBe(7);
    expect(isWon(complete)).toBe(true);
    expect(gameReducer(complete, { type: 'select', rod: 2 })).toBe(complete);
    let game = gameReducer(complete, { type: 'undo' });

    expect(isWon(game)).toBe(false);

    for (let i = 0; i < 8; i++) {
      game = gameReducer(game, { type: 'undo' });
    }

    expect(game.cursor).toBe(0);
    expect(currentBoard(game)).toEqual(currentBoard(initial));

    for (let i = 0; i < 8; i++) {
      game = gameReducer(game, { type: 'redo' });
    }

    expect(game.cursor).toBe(7);
    expect(isWon(game)).toBe(true);
    expect(game.history).toBe(complete.history);
  });

  it('discards the future only when a valid manual move creates a new branch', () => {
    const first = move(createGame(DEFAULT_CONFIG), 0, 2);
    const second = move(first, 0, 1);
    const undone = gameReducer(second, { type: 'undo' });
    const invalid = move(undone, 0, 2);

    expect(invalid.history).toBe(second.history);
    const deselected = gameReducer(invalid, { type: 'select', rod: 0 });

    expect(deselected.history).toBe(second.history);
    const branched = move(deselected, 2, 1);

    expect(branched.history).toHaveLength(3);
    expect(currentBoard(branched)).toEqual([[5, 4, 3, 2], [1], []]);
    expect(gameReducer(branched, { type: 'redo' }).cursor).toBe(2);
    expect(currentBoard(gameReducer(branched, { type: 'undo' }))).toEqual(currentBoard(first));
  });

  it('branches after a partial redo, and clears selection on undo/redo', () => {
    let game = move(move(move(createGame(DEFAULT_CONFIG), 0, 2), 0, 1), 2, 1);

    game = gameReducer(gameReducer(game, { type: 'undo' }), { type: 'undo' });
    game = gameReducer(game, { type: 'select', rod: 0 });
    game = gameReducer(game, { type: 'redo' });
    expect(game.selected).toBeNull();
    game = move(game, 1, 0);
    expect(game.cursor).toBe(3);
    expect(game.history).toHaveLength(4);
    expect(currentBoard(game)).toEqual([[5, 4, 3, 2], [], [1]]);
    game = gameReducer(game, { type: 'select', rod: 2 });
    expect(gameReducer(game, { type: 'undo' }).selected).toBeNull();
  });

  it.each([3, 4, 5, 6])('requires the last rod for victory with %i rods', (rods) => {
    const initial = createGame({ mode: 'classic', rods, disks: 3 });
    const nonTarget = solve(initial, 3, 0, 1, rods - 1);

    expect(isWon(nonTarget)).toBe(false);
    const complete = solve(initial, 3, 0, rods - 1, 1);

    expect(isWon(complete)).toBe(true);
  });

  it('restarts with the same config and starts a new game with changed config', () => {
    let game = move(createGame({ mode: 'classic', rods: 6, disks: 10 }), 0, 5);

    game = gameReducer(game, { type: 'select', rod: 0 });
    const restart = gameReducer(game, { type: 'restart' });

    expect(restart).toEqual(createGame({ mode: 'classic', rods: 6, disks: 10 }));
    const changed = gameReducer(game, {
      type: 'start',
      config: { mode: 'classic', rods: 4, disks: 3 },
    });

    expect(changed).toEqual(createGame({ mode: 'classic', rods: 4, disks: 3 }));
  });
});
