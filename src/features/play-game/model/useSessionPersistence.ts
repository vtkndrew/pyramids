import { useCallback, useRef, useState } from 'react';

import {
  InvalidSave,
  NewerSave,
  SaveConflict,
  SaveRepository,
  type Snapshot,
} from '@/entities/game';

import { SaveQueue } from './SaveQueue';

/** Owns storage availability and write ordering; the session owns the game. */
export function useSessionPersistence(onBlocked: () => void) {
  const [repository] = useState(() => new SaveRepository());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [incompatible, setIncompatible] = useState(false);
  const blocked = useRef(false);
  const onBlockedRef = useRef(onBlocked);

  onBlockedRef.current = onBlocked;
  const queue = useRef<SaveQueue | null>(null);
  const makeQueue = useCallback(
    () =>
      new SaveQueue(
        repository,
        (cause) => {
          if (cause instanceof SaveConflict || cause instanceof NewerSave) {
            blocked.current = true;
            setConflict(cause instanceof SaveConflict);
            setIncompatible(cause instanceof NewerSave);
            onBlockedRef.current();
          }

          setError(
            cause instanceof SaveConflict || cause instanceof NewerSave
              ? cause.message
              : 'Прогресс не сохраняется. Повторите сохранение.',
          );
        },
        () => setError(null),
      ),
    [repository],
  );

  const getQueue = useCallback(() => {
    queue.current ??= makeQueue();

    return queue.current;
  }, [makeQueue]);

  getQueue();

  const load = useCallback(async () => {
    setLoading(true);
    blocked.current = false;
    setConflict(false);
    setIncompatible(false);
    queue.current = makeQueue();

    try {
      const saved = await repository.load();

      setError(null);
      queue.current = makeQueue();

      return saved;
    } catch (cause) {
      if (cause instanceof NewerSave) {
        blocked.current = true;
        setIncompatible(true);
      }

      setError(
        cause instanceof InvalidSave || cause instanceof NewerSave
          ? cause.message
          : 'Прогресс не сохраняется. Хранилище недоступно.',
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, [repository, makeQueue]);
  const enqueue = useCallback((snapshot: Snapshot) => getQueue().enqueue(snapshot), [getQueue]);
  const flush = useCallback(() => getQueue().flush(), [getQueue]);
  const retryRead = useCallback(async () => {
    const saved = await repository.load();

    setError(null);

    return saved;
  }, [repository]);

  return {
    repository,
    loading,
    error,
    conflict,
    incompatible,
    blocked,
    load,
    enqueue,
    flush,
    retryRead,
  };
}
