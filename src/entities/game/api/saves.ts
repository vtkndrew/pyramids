import { createGame, isWon, type Board } from '../model/game';
import {
  SAVE_VERSION,
  SaveConflict,
  NewerSave,
  validateSnapshot,
  type Head,
  type Snapshot,
  type Summary,
} from '../model/saved-game';

const request = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const complete = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));

    tx.onerror = () => {
      /* onabort settles the transaction */
    };
  });

export class SaveRepository {
  private db?: IDBDatabase;
  private opening?: Promise<IDBDatabase>;
  private head: Head | undefined;
  private persisted?: Snapshot;
  private initialized = false;
  private incompatible = false;
  constructor(private name = `pyramids-saves:${import.meta.env.BASE_URL}`) {}
  private open() {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    if (this.opening) {
      return this.opening;
    }

    this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.name, 1);

      req.onupgradeneeded = () => {
        req.result.createObjectStore('meta');
        const summaries = req.result.createObjectStore('summaries', {
          keyPath: 'id',
        });

        summaries.createIndex('order', 'order');
        req.result.createObjectStore('boards');
      };

      req.onerror = () => reject(req.error);
      req.onblocked = () =>
        reject(new Error('Хранилище занято другим окном. Закройте его и повторите.'));

      req.onsuccess = () => {
        this.db = req.result;

        this.db.onversionchange = () => {
          this.db?.close();
          this.db = undefined;
          this.opening = undefined;
        };

        resolve(req.result);
      };
    }).catch((error) => {
      this.opening = undefined;
      throw error;
    });

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
    } catch (error) {
      await done.catch(() => {});
      throw error;
    }

    this.head = head;
    this.initialized = true;
    this.persisted = undefined;
    this.incompatible = head !== undefined && head.version !== SAVE_VERSION;

    if (!head) {
      return null;
    }

    const snapshot = validateSnapshot(head, boards);

    this.persisted = snapshot;

    return snapshot;
  }
  async commit(snapshot: Snapshot) {
    if (!this.initialized) {
      await this.load();
    }

    if (this.incompatible) {
      throw new NewerSave('Обновите приложение, чтобы прочитать сохранение.');
    }

    const db = await this.open();
    const tx = db.transaction(['meta', 'boards', 'summaries'], 'readwrite');
    const done = complete(tx);

    try {
      const meta = tx.objectStore('meta');
      const actual = await request<Head | undefined>(meta.get('latest'));

      if (actual?.id !== this.head?.id || actual?.revision !== this.head?.revision) {
        throw new SaveConflict('Партия изменена в другом окне.');
      }

      const boards = tx.objectStore('boards');
      const summaries = tx.objectStore('summaries');
      const sameGame = actual?.id === snapshot.id;
      const previous = sameGame ? this.persisted?.game : undefined;

      if (!sameGame) {
        if (actual) {
          const old = await request<Summary | undefined>(summaries.get(actual.id));

          if (old) {
            summaries.put({
              ...old,
              status: old.status === 'won' ? 'won' : 'abandoned',
            });
          }
        }

        boards.clear();
      }

      const history = snapshot.game.history;

      if (!previous) {
        if (sameGame) {
          boards.clear();
        }

        history.forEach((board, index) => {
          boards.put(board, index);
        });
      } else if (previous.history !== history) {
        // Shared board references identify the unchanged prefix. Ordinary moves
        // and cursor/time updates never serialize the complete history.
        let prefix = Math.min(previous.history.length, history.length);

        while (prefix > 0 && previous.history[prefix - 1] !== history[prefix - 1]) {
          prefix--;
        }

        boards.delete(IDBKeyRange.lowerBound(prefix));

        for (let i = prefix; i < history.length; i++) {
          boards.put(history[i], i);
        }
      }

      const order = sameGame ? (actual.order ?? actual.revision) : (actual?.revision ?? 0) + 1;
      const head: Head = {
        version: SAVE_VERSION,
        id: snapshot.id,
        revision: (actual?.revision ?? 0) + 1,
        order,
        startedAt: snapshot.startedAt,
        config: snapshot.game.config,
        control: snapshot.control,
        elapsed: snapshot.elapsed,
        cursor: snapshot.game.cursor,
        length: history.length,
        paused: snapshot.game.paused,
      };

      meta.put(head, 'latest');
      summaries.put({
        id: snapshot.id,
        order,
        startedAt: snapshot.startedAt,
        config: snapshot.game.config,
        elapsed: snapshot.elapsed,
        moves: snapshot.game.cursor,
        status: isWon(snapshot.game) ? 'won' : 'active',
      } satisfies Summary);
      await done;
      this.head = head;
      this.persisted = snapshot;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* transaction already completed/aborted */
      }

      await done.catch(() => {});
      throw error;
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

        if (!entry || records.length === limit) {
          resolve({ records, more: Boolean(entry) });

          return;
        }

        const record = entry.value as Summary;

        // A damaged summary must not prevent reading the other games.
        try {
          createGame(record.config);

          if (
            typeof record.id === 'string' &&
            Number.isFinite(record.startedAt) &&
            !Number.isNaN(new Date(record.startedAt).getTime()) &&
            Number.isFinite(record.elapsed) &&
            record.elapsed >= 0 &&
            Number.isSafeInteger(record.moves) &&
            record.moves >= 0 &&
            ['active', 'won', 'abandoned'].includes(record.status)
          ) {
            records.push(record);
          }
        } catch {
          /* Skip unreadable summary; never delete it. */
        }

        entry.continue();
      };
    });
  }
}
