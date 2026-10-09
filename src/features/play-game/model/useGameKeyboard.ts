import { useEffect } from 'react';

import type { Action } from '@/entities/game';

export function useGameKeyboard(
  enabled: boolean,
  rods: number,
  dispatch: (action: Action) => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;

      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable], dialog, [role="dialog"]')
      )
        return;

      if (event.key === 'Escape') dispatch({ type: 'clearSelection' });
      else if (/^[1-6]$/.test(event.key) && Number(event.key) <= rods) {
        event.preventDefault();
        dispatch({ type: 'select', rod: Number(event.key) - 1 });
      }
    };

    document.addEventListener('keydown', onKey);

    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, rods, dispatch]);
}
