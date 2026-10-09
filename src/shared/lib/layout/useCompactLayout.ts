import { useSyncExternalStore } from 'react';

// Keep this query in sync with the compact layout rules in styles.css.
const QUERY = '(max-width: 760px), (max-width: 1024px) and (max-height: 500px)';

const subscribe = (notify: () => void) => {
  const media = window.matchMedia(QUERY);

  media.addEventListener('change', notify);

  return () => media.removeEventListener('change', notify);
};

export function useCompactLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
