import { createGame, isWon, moveError, type Board, type Config, type Game } from './game';
import type { ControlMode } from './controls';

export const SAVE_VERSION = 1;
export type Summary = { id: string; order: number; startedAt: number; config: Config; elapsed: number; moves: number; status: 'active' | 'won' | 'abandoned' };
export type Snapshot = { id: string; startedAt: number; game: Game; control: ControlMode; elapsed: number };
type Head = { version: number; id: string; revision: number; order?: number; startedAt: number; config: Config; control: ControlMode; elapsed: number; cursor: number; length: number; paused: boolean };
export class SaveConflict extends Error {}
export class InvalidSave extends Error {}
export class NewerSave extends Error {}
const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const complete = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted')); tx.onerror = () => { /* onabort settles the transaction */ }; });

export function validateSnapshot(head: Head, history: Board[]): Snapshot {
  if (head.version !== SAVE_VERSION) throw new NewerSave('Неизвестная версия сохранения. Обновите приложение.');
  try {
    const initial = createGame(head.config);
    if (typeof head.id !== 'string' || !head.id || !Number.isFinite(head.startedAt) || head.startedAt < 0
      || !Number.isSafeInteger(head.revision) || head.revision < 1 || typeof head.paused !== 'boolean'
      || !Number.isFinite(head.elapsed) || head.elapsed < 0 || head.elapsed > Number.MAX_SAFE_INTEGER
      || !Number.isInteger(head.cursor) || head.cursor < 0 || head.cursor >= history.length
      || head.length !== history.length || !history.length
      || !['tap', 'drag', 'swipe'].includes(head.control) || head.control === 'swipe' && head.config.mode !== 'hardcore') throw new Error();
    for (let i = 0; i < history.length; i++) {
      const board = history[i];
      if (!Array.isArray(board) || board.length !== head.config.rods) throw new Error();
      const disks = new Set<number>();
      for (const rod of board) {
        if (!Array.isArray(rod)) throw new Error();
        rod.forEach((disk, index) => {
          if (!Number.isInteger(disk) || disk < 1 || disk > head.config.disks || disks.has(disk) || index > 0 && rod[index - 1] <= disk) throw new Error();
          disks.add(disk);
        });
      }
      if (disks.size !== head.config.disks) throw new Error();
      if (i === 0) { if (JSON.stringify(board) !== JSON.stringify(initial.history[0])) throw new Error(); continue; }
      const previous = history[i - 1];
      const from = previous.findIndex((rod, r) => rod.length === board[r].length + 1);
      const to = previous.findIndex((rod, r) => rod.length + 1 === board[r].length);
      if (moveError(previous, from, to, head.config.mode) || previous.at(-1)!.length === head.config.disks) throw new Error();
      const next = previous.map(rod => [...rod]);
      next[to].push(next[from].pop()!);
      if (JSON.stringify(next) !== JSON.stringify(board)) throw new Error();
    }
    return { id: head.id, startedAt: head.startedAt, control: head.control, elapsed: head.elapsed,
      game: { ...initial, history, cursor: head.cursor, paused: true } };
  } catch { throw new InvalidSave('Последнее сохранение повреждено. Можно начать новую игру; история результатов сохранена.'); }
}

export class SaveRepository {
  private db?: IDBDatabase;
  private opening?: Promise<IDBDatabase>;
  private head: Head | undefined;
  private persisted?: Snapshot;
  private initialized = false;
  private incompatible = false;
  constructor(private name = `pyramids-saves:${import.meta.env.BASE_URL}`) {}
  private open() {
    if (this.db) return Promise.resolve(this.db);
    if (this.opening) return this.opening;
    this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.name, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('meta');
        const summaries = req.result.createObjectStore('summaries', { keyPath: 'id' });
        summaries.createIndex('order', 'order');
        req.result.createObjectStore('boards');
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Хранилище занято другим окном. Закройте его и повторите.'));
      req.onsuccess = () => {
        this.db = req.result;
        this.db.onversionchange = () => { this.db?.close(); this.db = undefined; this.opening = undefined; };
        resolve(req.result);
      };
    }).catch(error => { this.opening = undefined; throw error; });
    return this.opening;
  }
  async load(): Promise<Snapshot | null> {
    const db = await this.open();
    const tx = db.transaction(['meta', 'boards']);
    const done = complete(tx);
    let head: Head | undefined;
    let boards: Board[];
    try {
      head = await request<Head | undefined>(tx.objectStore('meta').get('latest'));
      boards = head ? await request<Board[]>(tx.objectStore('boards').getAll()) : [];
      await done;
    } catch (error) { await done.catch(() => {}); throw error; }
    this.head = head; this.initialized = true; this.persisted = undefined;
    this.incompatible = !!head && head.version !== SAVE_VERSION;
    if (!head) return null;
    const snapshot = validateSnapshot(head, boards);
    this.persisted = snapshot;
    return snapshot;
  }
  async commit(snapshot: Snapshot) {
    if (!this.initialized) await this.load();
    if (this.incompatible) throw new NewerSave('Обновите приложение, чтобы прочитать сохранение.');
    const db = await this.open();
    const tx = db.transaction(['meta', 'boards', 'summaries'], 'readwrite');
    const done = complete(tx);
    try {
      const meta = tx.objectStore('meta');
      const actual = await request<Head | undefined>(meta.get('latest'));
      if (actual?.id !== this.head?.id || actual?.revision !== this.head?.revision) throw new SaveConflict('Партия изменена в другом окне.');
      const boards = tx.objectStore('boards');
      const summaries = tx.objectStore('summaries');
      const sameGame = actual?.id === snapshot.id;
      const previous = sameGame ? this.persisted?.game : undefined;
      if (!sameGame) {
        if (actual) {
          const old = await request<Summary | undefined>(summaries.get(actual.id));
          if (old) summaries.put({ ...old, status: old.status === 'won' ? 'won' : 'abandoned' });
        }
        boards.clear();
      }
      const history = snapshot.game.history;
      if (!previous) {
        if (sameGame) boards.clear();
        history.forEach((board, index) => boards.put(board, index));
      } else if (previous.history !== history) {
        // Shared board references identify the unchanged prefix. Ordinary moves
        // and cursor/time updates never serialize the complete history.
        let prefix = Math.min(previous.history.length, history.length);
        while (prefix > 0 && previous.history[prefix - 1] !== history[prefix - 1]) prefix--;
        boards.delete(IDBKeyRange.lowerBound(prefix));
        for (let i = prefix; i < history.length; i++) boards.put(history[i], i);
      }
      const head: Head = { version: SAVE_VERSION, id: snapshot.id, revision: (actual?.revision ?? 0) + 1, order: sameGame ? actual.order ?? actual.revision : (actual?.revision ?? 0) + 1,
        startedAt: snapshot.startedAt, config: snapshot.game.config, control: snapshot.control, elapsed: snapshot.elapsed,
        cursor: snapshot.game.cursor, length: history.length, paused: snapshot.game.paused };
      meta.put(head, 'latest');
      summaries.put({ id: snapshot.id, order: head.order!, startedAt: snapshot.startedAt, config: snapshot.game.config, elapsed: snapshot.elapsed,
        moves: snapshot.game.cursor, status: isWon(snapshot.game) ? 'won' : 'active' } satisfies Summary);
      await done;
      this.head = head; this.persisted = snapshot;
    } catch (error) {
      try { tx.abort(); } catch { /* transaction already completed/aborted */ }
      await done.catch(() => {}); throw error;
    }
  }
  async list(limit: number): Promise<{ records: Summary[]; more: boolean }> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('summaries');
      tx.onabort = () => reject(tx.error ?? new Error('Не удалось прочитать историю.'));
      const cursor = tx.objectStore('summaries').index('order').openCursor(null, 'prev');
      const records: Summary[] = [];
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry || records.length === limit) { resolve({ records, more: !!entry }); return; }
        const record = entry.value as Summary;
        // A damaged summary must not prevent reading the other games.
        try {
          createGame(record.config);
          if (typeof record.id === 'string' && Number.isFinite(record.startedAt) && !Number.isNaN(new Date(record.startedAt).getTime())
            && Number.isFinite(record.elapsed) && record.elapsed >= 0 && Number.isSafeInteger(record.moves) && record.moves >= 0
            && ['active', 'won', 'abandoned'].includes(record.status)) records.push(record);
        } catch { /* Skip unreadable summary; never delete it. */ }
        entry.continue();
      };
    });
  }
}

/** Coalesce rapid checkpoints for one game, but retain each newly started game.
 * Failed writes stay queued for explicit retry; commit order never races. */
export class SaveQueue {
  private pending: Snapshot[] = [];
  private running?: Promise<void>;
  private failed = false;
  constructor(private repository: SaveRepository, private onError: (error: unknown) => void, private onSaved: () => void) {}
  enqueue(snapshot: Snapshot) {
    if (this.pending.at(-1)?.id === snapshot.id) this.pending[this.pending.length - 1] = snapshot;
    else this.pending.push(snapshot);
    if (!this.failed) void this.flush().catch(() => {});
  }
  async flush() {
    if (this.running) return this.running;
    this.failed = false;
    this.running = (async () => {
      while (this.pending.length) {
        const snapshot = this.pending[0];
        try { await this.repository.commit(snapshot); }
        catch (error) { this.failed = true; this.onError(error); throw error; }
        // An in-flight checkpoint may have been replaced with a newer one.
        if (this.pending[0] === snapshot) this.pending.shift();
        this.onSaved();
      }
    })();
    try { await this.running; } finally { this.running = undefined; }
  }
}
