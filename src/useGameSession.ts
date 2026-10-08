import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createGame, DEFAULT_CONFIG, gameReducer, isWon, type Action, type Config } from './game';
import { defaultControl, type ControlMode } from './controls';
import { InvalidSave, NewerSave, SaveConflict, SaveQueue, SaveRepository, type Snapshot } from './saves';
import { useGameTimer } from './useGameTimer';

export function useGameSession(screenActive: boolean) {
  const [repository] = useState(() => new SaveRepository());
  const [game, setGame] = useState(() => createGame(DEFAULT_CONFIG));
  const [control, setControlState] = useState<ControlMode>('drag');
  const [hasGame, setHasGame] = useState(false);
  const [latest, setLatest] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [incompatible, setIncompatible] = useState(false);
  const [session, setSession] = useState(0);
  const current = useRef<Snapshot | null>(null);
  const active = useRef(false);
  const blocked = useRef(false);
  const clock = useGameTimer();
  const clockRef = useRef(clock); clockRef.current = clock;
  const queue = useRef<SaveQueue | null>(null);
  const makeQueue = useCallback(() => new SaveQueue(repository, cause => {
    if (cause instanceof SaveConflict || cause instanceof NewerSave) {
      blocked.current = true; clockRef.current.setRunning(false);
      setConflict(cause instanceof SaveConflict); setIncompatible(cause instanceof NewerSave);
      if (current.current) { current.current = { ...current.current, game: gameReducer(current.current.game, { type: 'pause' }) }; setGame(current.current.game); }
    }
    setError(cause instanceof SaveConflict || cause instanceof NewerSave ? cause.message : 'Прогресс не сохраняется. Повторите сохранение.');
  }, () => setError(null)), [repository]);
  if (!queue.current) queue.current = makeQueue();

  const checkpoint = useCallback(() => {
    if (!active.current || !current.current || blocked.current) return;
    current.current = { ...current.current, elapsed: clockRef.current.read() };
    setLatest(current.current); queue.current!.enqueue(current.current);
  }, []);
  const load = useCallback(async () => {
    setLoading(true); clockRef.current.setRunning(false);
    current.current = null; active.current = false; blocked.current = false;
    setHasGame(false); setLatest(null); setConflict(false); setIncompatible(false);
    queue.current = makeQueue();
    try {
      const saved = await repository.load();
      current.current = saved; active.current = false; blocked.current = false;
      setHasGame(false); setLatest(saved); setConflict(false); setIncompatible(false); setError(null);
      queue.current = makeQueue();
      return saved;
    } catch (cause) {
      if (cause instanceof NewerSave) { blocked.current = true; setIncompatible(true); }
      setError(cause instanceof InvalidSave || cause instanceof NewerSave ? cause.message : 'Прогресс не сохраняется. Хранилище недоступно.');
      return null;
    } finally { setLoading(false); }
  }, [repository, makeQueue]);
  const boot = useRef<Promise<Snapshot | null> | null>(null);
  useEffect(() => { boot.current ??= load(); }, [load]);

  const running = hasGame && screenActive && !game.paused && !isWon(game) && !conflict && !incompatible;
  useLayoutEffect(() => { clock.setRunning(running); if (!running) checkpoint(); }, [running, session, clock.setRunning, checkpoint]);
  useEffect(() => {
    const interval = window.setInterval(() => { if (running) checkpoint(); }, 1000);
    return () => window.clearInterval(interval);
  }, [running, checkpoint]);

  const dispatch = useCallback((action: Action) => {
    if (!active.current || !current.current || blocked.current) return;
    const before = current.current.game;
    const next = gameReducer(before, action);
    if (next === before) return;
    if (next.paused || isWon(next)) clockRef.current.setRunning(false);
    current.current = { ...current.current, game: next };
    setGame(next);
    if (next.history !== before.history || next.cursor !== before.cursor || next.paused !== before.paused) checkpoint();
  }, [checkpoint]);
  useEffect(() => {
    const hide = () => { if (active.current) { dispatch({ type: 'pause' }); clockRef.current.setRunning(false); checkpoint(); } };
    const visibility = () => { if (document.visibilityState === 'hidden') hide(); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', hide);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', hide); };
  }, [dispatch, checkpoint]);

  const persistentRequested = useRef(false);
  const start = (config: Config, nextControl = defaultControl(config.mode)) => {
    if (loading || blocked.current) return false;
    clock.setRunning(false); checkpoint(); clock.restore(0);
    const next: Snapshot = { id: crypto.randomUUID(), startedAt: Date.now(), game: createGame(config), control: nextControl, elapsed: 0 };
    current.current = next; active.current = true; setLatest(next);
    setGame(next.game); setControlState(nextControl); setHasGame(true); setSession(value => value + 1);
    queue.current!.enqueue(next);
    if (!persistentRequested.current) {
      persistentRequested.current = true;
      try { void navigator.storage?.persist?.().catch(() => {}); } catch { /* Persistence is optional. */ }
    }
    return true;
  };
  const resume = () => {
    if (!current.current || blocked.current) return false;
    const saved = current.current;
    const restored = gameReducer(saved.game, { type: 'restore', game: saved.game });
    const next = isWon(restored) ? restored : gameReducer(restored, { type: 'resume' });
    clock.restore(saved.elapsed); active.current = true;
    current.current = { ...saved, game: next }; setGame(next); setControlState(saved.control); setHasGame(true); setSession(value => value + 1);
    checkpoint(); return true;
  };
  const setControl = (value: ControlMode) => {
    setControlState(value);
    if (current.current && active.current) { current.current = { ...current.current, control: value }; checkpoint(); }
  };
  const flush = async () => {
    if (blocked.current) throw new Error(error ?? 'Сохранение недоступно.');
    checkpoint(); await queue.current!.flush();
    if (error && !active.current) { const found = await repository.load(); current.current = found; setLatest(found); setError(null); }
  };
  return { game, dispatch, control, setControl, hasGame, latest, loading, error, conflict, incompatible,
    session, elapsed: clock.elapsed, start, resume, flush, beforeUpdate: async () => {
      // A newer save must remain untouched while updating the older app that cannot read it.
      if (incompatible && !active.current) return;
      await flush();
    }, reload: load, repository };
}
