import { useEffect, type RefObject } from 'react';

import type { Action } from '@/entities/game';
import type { useElapsedTimer } from '@/shared/lib/time';

export function useSessionLifecycle({
  running,
  checkpoint,
  dispatch,
  active,
  clockRef,
}: {
  running: boolean;
  checkpoint: () => void;
  dispatch: (action: Action) => void;
  active: RefObject<boolean>;
  clockRef: RefObject<ReturnType<typeof useElapsedTimer>>;
}) {
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (running) {
        checkpoint();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running, checkpoint]);
  useEffect(() => {
    const hide = () => {
      if (active.current) {
        dispatch({ type: 'pause' });
        clockRef.current.setRunning(false);
        checkpoint();
      }
    };

    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        hide();
      }
    };

    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);

    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide);
    };
  }, [dispatch, checkpoint, active, clockRef]);
}
