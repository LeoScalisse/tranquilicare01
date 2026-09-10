import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const snapshot = () => typeof window.matchMedia !== 'function' || window.matchMedia(query).matches;
const subscribe = (notify: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(query);
  media.addEventListener?.('change', notify);
  return () => media.removeEventListener?.('change', notify);
};

/** Also responds when the OS preference changes during an open session. */
export function useLiveReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
