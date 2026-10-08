import { describe, expect, it, vi } from "vitest";
import {
  createGame,
  type SaveRepository,
  type Snapshot,
} from "@/entities/game";
import { SaveQueue } from "./SaveQueue";
const initial = createGame({ rods: 3, disks: 3, mode: "hardcore" });
describe("save queue", () => {
  const snapshot = (id: string, elapsed: number): Snapshot => ({
    id,
    elapsed,
    startedAt: 1,
    game: initial,
    control: "swipe",
  });
  it("retains the last checkpoint of each game across a failed write and retry", async () => {
    const committed: Snapshot[] = [];
    let unavailable = true;
    const repository = {
      commit: async (value: Snapshot) => {
        if (unavailable) throw new Error("quota");
        committed.push(value);
      },
    } as SaveRepository;
    const error = vi.fn();
    const queue = new SaveQueue(repository, error, () => {});
    queue.enqueue(snapshot("first", 1));
    await expect(queue.flush()).rejects.toThrow("quota");
    queue.enqueue(snapshot("first", 2));
    queue.enqueue(snapshot("second", 0));
    unavailable = false;
    await queue.flush();
    expect(error).toHaveBeenCalledOnce();
    expect(committed.map(({ id, elapsed }) => [id, elapsed])).toEqual([
      ["first", 2],
      ["second", 0],
    ]);
  });
  it("serializes new checkpoints while an earlier transaction is in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const committed: number[] = [];
    const repository = {
      commit: async (value: Snapshot) => {
        if (!committed.length) await gate;
        committed.push(value.elapsed);
      },
    } as SaveRepository;
    const queue = new SaveQueue(
      repository,
      () => {},
      () => {},
    );
    queue.enqueue(snapshot("first", 1));
    queue.enqueue(snapshot("first", 2));
    queue.enqueue(snapshot("first", 3));
    release();
    await queue.flush();
    expect(committed).toEqual([1, 3]);
  });
});
