import { describe, expect, it } from 'vitest';

import { createGame, gameReducer } from './game';
import { InvalidSave, NewerSave, validateSnapshot } from './saved-game';

const initial = createGame({ rods: 3, disks: 3, mode: 'hardcore' });
const first = gameReducer(initial, { type: 'move', from: 0, to: 1 });
const head = {
  version: 1,
  id: 'test',
  revision: 1,
  startedAt: 1000,
  config: initial.config,
  control: 'swipe' as const,
  elapsed: 1234,
  cursor: 1,
  length: 2,
  paused: false,
};

describe('saved state validation and restoration', () => {
  it('preserves future moves and restores without a selection or error', () => {
    const saved = validateSnapshot({ ...head, cursor: 0 }, [...first.history]);

    expect(saved.game.cursor).toBe(0);
    expect(saved.game.history).toEqual(first.history);
    expect(saved.game.paused).toBe(true);
    const restored = gameReducer(first, {
      type: 'restore',
      game: { ...saved.game, selected: 0, error: 'old' },
    });

    expect(restored.selected).toBeNull();
    expect(restored.error).toBeNull();
    expect(restored.paused).toBe(true);
    expect(saved.elapsed).toBe(1234);
  });
  it('rejects unknown versions without interpreting their data', () => {
    expect(() => validateSnapshot({ ...head, version: 2 }, [])).toThrow(NewerSave);
  });
  it.each([
    { cursor: -1 },
    { cursor: 2 },
    { elapsed: NaN },
    { elapsed: -1 },
    { length: 1 },
    { revision: 0 },
    { startedAt: -1 },
  ])('rejects invalid metadata %j', (patch) => {
    expect(() => validateSnapshot({ ...head, ...patch }, [...first.history])).toThrow(InvalidSave);
  });
  it('rejects duplicate disks, missing disks and impossible transitions', () => {
    for (const board of [
      [[3, 2], [1, 1], []],
      [[3, 2], [], []],
      [[3, 2], [], [1]],
      [[2, 3], [1], []],
    ]) {
      expect(() => validateSnapshot(head, [initial.history[0], board])).toThrow(InvalidSave);
    }
  });
  it('rejects wrong starting positions and unavailable controls', () => {
    expect(() => validateSnapshot({ ...head, length: 1, cursor: 0 }, [first.history[1]])).toThrow(
      InvalidSave,
    );
    expect(() =>
      validateSnapshot({ ...head, config: { ...head.config, mode: 'classic' } }, [
        ...first.history,
      ]),
    ).toThrow(InvalidSave);
  });
});

// Captured from the pre-FSD production build through native IndexedDB.
// Keeping the serialized fixture prevents the test from regenerating a new format.
it('reads a pre-refactor v1 save including its redo branch and exact elapsed time', async () => {
  const { default: fixture } = await import('./fixtures/save-v1.json');
  const saved = validateSnapshot(fixture.head as import('./saved-game').Head, fixture.boards);

  expect(saved.id).toBe('9e4f957d-30dd-413c-9969-8002b22c9d77');
  expect(saved.control).toBe('tap');
  expect(saved.elapsed).toBe(215.09999990463257);
  expect(saved.game.config).toEqual({ rods: 3, disks: 5, mode: 'classic' });
  expect(saved.game.cursor).toBe(1);
  expect(saved.game.history).toHaveLength(3);
  expect(saved.game.history[1]).toEqual([[5, 4, 3, 2], [], [1]]);
  const resumed = gameReducer(saved.game, { type: 'resume' });

  expect(gameReducer(resumed, { type: 'redo' }).cursor).toBe(2);
  expect(gameReducer(resumed, { type: 'undo' }).cursor).toBe(0);
});
