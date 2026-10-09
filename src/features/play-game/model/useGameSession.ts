import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  createGame,
  DEFAULT_CONFIG,
  gameReducer,
  isWon,
  type Action,
  type Config,
  defaultControl,
  type ControlMode,
  type Snapshot,
} from '@/entities/game';
import { useElapsedTimer } from '@/shared/lib/time';

import { useSessionLifecycle } from './useSessionLifecycle';
import { useSessionPersistence } from './useSessionPersistence';

export function useGameSession(screenActive: boolean) {
  const [game, setGame] = useState(() => createGame(DEFAULT_CONFIG));
  const [control, setControlState] = useState<ControlMode>('drag');
  const [hasGame, setHasGame] = useState(false);
  const [latest, setLatest] = useState<Snapshot | null>(null);
  const [session, setSession] = useState(0);
  const current = useRef<Snapshot | null>(null);
  const active = useRef(false);
  const clock = useElapsedTimer();
  const clockRef = useRef(clock);

  clockRef.current = clock;
  const persistence = useSessionPersistence(() => {
    clockRef.current.setRunning(false);

    if (current.current) {
      current.current = {
        ...current.current,
        game: gameReducer(current.current.game, { type: 'pause' }),
      };
      setGame(current.current.game);
    }
  });
  const {
    repository,
    loading,
    error,
    conflict,
    incompatible,
    blocked,
    enqueue,
    load: loadSave,
    flush: flushSave,
    retryRead,
  } = persistence;

  const checkpoint = useCallback(() => {
    if (!active.current || !current.current || blocked.current) return;

    current.current = { ...current.current, elapsed: clockRef.current.read() };
    setLatest(current.current);
    enqueue(current.current);
  }, [blocked, enqueue]);
  const load = useCallback(async () => {
    clockRef.current.setRunning(false);
    current.current = null;
    active.current = false;
    setHasGame(false);
    setLatest(null);
    const saved = await loadSave();

    current.current = saved;
    setLatest(saved);

    return saved;
  }, [loadSave]);
  const boot = useRef<Promise<Snapshot | null> | null>(null);

  useEffect(() => {
    boot.current ??= load();
  }, [load]);

  const running =
    hasGame && screenActive && !game.paused && !isWon(game) && !conflict && !incompatible;
  const { setRunning } = clock;

  useLayoutEffect(() => {
    setRunning(running);

    if (!running) checkpoint();
  }, [running, session, setRunning, checkpoint]);

  const dispatch = useCallback(
    (action: Action) => {
      if (!active.current || !current.current || blocked.current) return;

      const before = current.current.game;
      const next = gameReducer(before, action);

      if (next === before) return;

      if (next.paused || isWon(next)) clockRef.current.setRunning(false);

      current.current = { ...current.current, game: next };
      setGame(next);

      if (
        next.history !== before.history ||
        next.cursor !== before.cursor ||
        next.paused !== before.paused
      )
        checkpoint();
    },
    [checkpoint, blocked],
  );

  useSessionLifecycle({ running, checkpoint, dispatch, active, clockRef });

  const persistentRequested = useRef(false);

  const start = (config: Config, nextControl = defaultControl(config.mode)) => {
    if (loading || blocked.current) return false;

    clock.setRunning(false);
    checkpoint();
    clock.restore(0);
    const next: Snapshot = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      game: createGame(config),
      control: nextControl,
      elapsed: 0,
    };

    current.current = next;
    active.current = true;
    setLatest(next);
    setGame(next.game);
    setControlState(nextControl);
    setHasGame(true);
    setSession((value) => value + 1);
    enqueue(next);

    if (!persistentRequested.current) {
      persistentRequested.current = true;

      try {
        void navigator.storage?.persist?.().catch(() => {});
      } catch {
        /* Persistence is optional. */
      }
    }

    return true;
  };

  const resume = () => {
    if (!current.current || blocked.current) return false;

    const saved = current.current;
    const restored = gameReducer(saved.game, {
      type: 'restore',
      game: saved.game,
    });
    const next = isWon(restored) ? restored : gameReducer(restored, { type: 'resume' });

    clock.restore(saved.elapsed);
    active.current = true;
    current.current = { ...saved, game: next };
    setGame(next);
    setControlState(saved.control);
    setHasGame(true);
    setSession((value) => value + 1);
    checkpoint();

    return true;
  };

  const setControl = (value: ControlMode) => {
    setControlState(value);

    if (current.current && active.current) {
      current.current = { ...current.current, control: value };
      checkpoint();
    }
  };

  const flush = useCallback(async () => {
    if (blocked.current) throw new Error(error ?? 'Сохранение недоступно.');

    checkpoint();
    await flushSave();

    if (error && !active.current) {
      const found = await retryRead();

      current.current = found;
      setLatest(found);
    }
  }, [blocked, error, checkpoint, flushSave, retryRead]);

  return {
    game,
    dispatch,
    control,
    setControl,
    hasGame,
    latest,
    loading,
    error,
    conflict,
    incompatible,
    session,
    elapsed: clock.elapsed,
    start,
    resume,
    flush,
    beforeUpdate: async () => {
      // A newer save must remain untouched while updating the older app that cannot read it.
      if (incompatible && !active.current) return;

      await flush();
    },
    reload: load,
    repository,
  };
}
