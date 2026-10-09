import { useCallback, useEffect, useRef, useState } from 'react';

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const parts = [minutes, seconds % 60].map((value) => String(value).padStart(2, '0'));

  if (hours > 0) {
    parts.unshift(String(hours).padStart(2, '0'));
  }

  return parts.join(':');
}

export function useElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef({ accumulated: 0, started: null as number | null });
  const read = useCallback(
    () =>
      clock.current.accumulated +
      (clock.current.started === null ? 0 : performance.now() - clock.current.started),
    [],
  );
  const setRunning = useCallback(
    (running: boolean) => {
      const value = read();

      clock.current = {
        accumulated: value,
        started: running ? performance.now() : null,
      };
      setElapsed(value);
    },
    [read],
  );
  const restore = useCallback((value: number) => {
    clock.current = { accumulated: value, started: null };
    setElapsed(value);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (clock.current.started !== null) {
        setElapsed(read());
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [read]);

  return { elapsed, read, setRunning, restore };
}
