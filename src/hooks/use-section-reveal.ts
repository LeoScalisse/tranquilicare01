import { useRef } from 'react';
import { useLiveReducedMotion } from './use-live-reduced-motion';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

/** Short, once-per-mount entrances; content is never hidden awaiting JS. */
export function useSectionReveal() {
  const root = useRef<HTMLElement>(null);
  const reduced = useLiveReducedMotion();
  useGSAP((_context, contextSafe) => {
    const node = root.current;
    if (!node || reduced || !('IntersectionObserver' in window)) return;
    const animate = contextSafe!((elements: Element[]) => {
      const mobile = window.matchMedia('(max-width: 639px)').matches;
      gsap.fromTo(elements, { opacity: 0.3, y: mobile ? 8 : 16 }, {
        opacity: 1, y: 0, duration: mobile ? 0.38 : 0.5,
        stagger: 0.065, ease: 'power3.out', clearProps: 'opacity,transform',
      });
    });
    const observer = new IntersectionObserver(entries => {
      const entering = entries.filter(entry => entry.isIntersecting);
      const elements = entering.map(entry => entry.target);
      if (elements.length) animate(elements);
      entering.forEach(entry => observer.unobserve(entry.target));
    }, { threshold: 0.12 });
    node.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, { scope: root, dependencies: [reduced], revertOnUpdate: true });
  return root;
}
