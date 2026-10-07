import { useEffect, useRef, useState } from 'react';

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const parts = [minutes, seconds % 60].map(value => String(value).padStart(2, '0'));
  if (hours > 0) parts.unshift(String(hours).padStart(2, '0'));
  return parts.join(':');
}

export function useGameTimer(running: boolean, session: number): number {
  const [elapsed, setElapsed] = useState(0);
  const accumulated = useRef(0);
  const previousSession = useRef(session);

  useEffect(() => {
    if (previousSession.current !== session) {
      previousSession.current = session;
      accumulated.current = 0;
      setElapsed(0);
    }
    if (!running) return;

    // Measure actual elapsed time: throttled background intervals must not lose seconds.
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setElapsed(accumulated.current + performance.now() - startedAt);
    }, 250);

    return () => {
      window.clearInterval(interval);
      accumulated.current += performance.now() - startedAt;
      setElapsed(accumulated.current);
    };
  }, [running, session]);

  return elapsed;
}
