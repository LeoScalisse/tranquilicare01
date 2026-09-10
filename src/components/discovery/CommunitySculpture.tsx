import { useEffect, useRef } from 'react';
import { useLiveReducedMotion } from '@/hooks/use-live-reduced-motion';

/** Decorative only: community profiles and actions stay in accessible HTML. */
export default function CommunitySculpture() {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useLiveReducedMotion();

  useEffect(() => {
    const node = host.current;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!node || reduced !== false || connection?.saveData
      || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
    let disposed = false;
    let started = false;
    let teardown: (() => void) | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      started = true;
      void import('./community-sculpture-scene').then(({ mountCommunitySculpture }) => {
        if (!disposed) teardown = mountCommunitySculpture(node);
      }).catch(() => { /* The brand illustration remains visible if loading fails. */ });
    }, { rootMargin: '80px' });
    observer.observe(node);
    return () => { disposed = true; observer.disconnect(); teardown?.(); };
  }, [reduced]);

  return <div ref={host} className='community-sculpture' aria-hidden='true'>
    <div className='community-sculpture-fallback' />
  </div>;
}
