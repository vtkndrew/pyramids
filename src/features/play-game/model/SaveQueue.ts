import { SaveRepository, type Snapshot } from '@/entities/game';

/** Coalesce rapid checkpoints for one game, but retain each newly started game.
 * Failed writes stay queued for explicit retry; commit order never races. */
export class SaveQueue {
  private pending: Snapshot[] = [];
  private running?: Promise<void>;
  private failed = false;
  constructor(
    private repository: SaveRepository,
    private onError: (error: unknown) => void,
    private onSaved: () => void,
  ) {}
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

        try {
          await this.repository.commit(snapshot);
        } catch (error) {
          this.failed = true;
          this.onError(error);
          throw error;
        }

        // An in-flight checkpoint may have been replaced with a newer one.
        if (this.pending[0] === snapshot) this.pending.shift();

        this.onSaved();
      }
    })();

    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }
}
