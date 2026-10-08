import { describe, expect, it, vi } from 'vitest';
import { createGame, gameReducer } from './game';
import { InvalidSave, NewerSave, SaveQueue, type SaveRepository, type Snapshot, validateSnapshot } from './saves';

const initial = createGame({ rods: 3, disks: 3, mode: 'hardcore' });
const first = gameReducer(initial, { type: 'move', from: 0, to: 1 });
const head = { version: 1, id: 'test', revision: 1, startedAt: 1000, config: initial.config, control: 'swipe' as const, elapsed: 1234, cursor: 1, length: 2, paused: false };
describe('saved state validation and restoration', () => {
  it('preserves future moves and restores without a selection or error', () => {
    const saved = validateSnapshot({ ...head, cursor: 0 }, [...first.history]);
    expect(saved.game.cursor).toBe(0); expect(saved.game.history).toEqual(first.history);
    expect(saved.game.paused).toBe(true);
    const restored = gameReducer(first, { type: 'restore', game: { ...saved.game, selected: 0, error: 'old' } });
    expect(restored.selected).toBeNull(); expect(restored.error).toBeNull();
    expect(restored.paused).toBe(true); expect(saved.elapsed).toBe(1234);
  });
  it('rejects unknown versions without interpreting their data', () => {
    expect(() => validateSnapshot({ ...head, version: 2 }, [])).toThrow(NewerSave);
  });
  it.each([{ cursor: -1 }, { cursor: 2 }, { elapsed: NaN }, { elapsed: -1 }, { length: 1 }, { revision: 0 }, { startedAt: -1 }])('rejects invalid metadata %j', patch => {
    expect(() => validateSnapshot({ ...head, ...patch }, [...first.history])).toThrow(InvalidSave);
  });
  it('rejects duplicate disks, missing disks and impossible transitions', () => {
    for (const board of [[[3, 2], [1, 1], []], [[3, 2], [], []], [[3, 2], [], [1]], [[2, 3], [1], []]]) {
      expect(() => validateSnapshot(head, [initial.history[0], board])).toThrow(InvalidSave);
    }
  });
  it('rejects wrong starting positions and unavailable controls', () => {
    expect(() => validateSnapshot({ ...head, length: 1, cursor: 0 }, [first.history[1]])).toThrow(InvalidSave);
    expect(() => validateSnapshot({ ...head, config: { ...head.config, mode: 'classic' } }, [...first.history])).toThrow(InvalidSave);
  });
});


describe('save queue', () => {
  const snapshot = (id: string, elapsed: number): Snapshot => ({ id, elapsed, startedAt: 1, game: initial, control: 'swipe' });
  it('retains the last checkpoint of each game across a failed write and retry', async () => {
    const committed: Snapshot[] = [];
    let unavailable = true;
    const repository = { commit: async (value: Snapshot) => { if (unavailable) throw new Error('quota'); committed.push(value); } } as SaveRepository;
    const error = vi.fn();
    const queue = new SaveQueue(repository, error, () => {});
    queue.enqueue(snapshot('first', 1));
    await expect(queue.flush()).rejects.toThrow('quota');
    queue.enqueue(snapshot('first', 2)); queue.enqueue(snapshot('second', 0));
    unavailable = false; await queue.flush();
    expect(error).toHaveBeenCalledOnce();
    expect(committed.map(({ id, elapsed }) => [id, elapsed])).toEqual([['first', 2], ['second', 0]]);
  });
  it('serializes new checkpoints while an earlier transaction is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const committed: number[] = [];
    const repository = { commit: async (value: Snapshot) => { if (!committed.length) await gate; committed.push(value.elapsed); } } as SaveRepository;
    const queue = new SaveQueue(repository, () => {}, () => {});
    queue.enqueue(snapshot('first', 1)); queue.enqueue(snapshot('first', 2)); queue.enqueue(snapshot('first', 3));
    release(); await queue.flush(); expect(committed).toEqual([1, 3]);
  });
});
