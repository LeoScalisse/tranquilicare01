import { useEffect, useRef, type PointerEvent } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';
import { useLiveReducedMotion } from './use-live-reduced-motion';

/** React Bits TiltedCard pattern, adapted for small, readable cause cards.
 * Source and license: docs/vendor/react-bits-LICENSE.md.
 */
export function useCardDepth(disabled = false) {
  const reduced = useLiveReducedMotion();
  const bounds = useRef<DOMRect | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 220, damping: 28, mass: 0.8 });
  const rotateY = useSpring(y, { stiffness: 220, damping: 28, mass: 0.8 });
  const reset = () => { x.set(0); y.set(0); bounds.current = null; };

  useEffect(() => {
    if (reduced || disabled) {
      x.set(0); y.set(0);
      rotateX.jump(0); rotateY.jump(0);
    }
  }, [reduced, disabled, x, y, rotateX, rotateY]);

  return {
    style: { rotateX, rotateY, transformPerspective: 1000 },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (disabled || reduced || event.pointerType !== 'mouse'
        || !window.matchMedia('(hover: hover) and (pointer: fine)').matches
        || event.currentTarget.matches(':focus-within')) return;
      const rect = bounds.current ?? (bounds.current = event.currentTarget.getBoundingClientRect());
      x.set((0.5 - (event.clientY - rect.top) / rect.height) * 5);
      y.set(((event.clientX - rect.left) / rect.width - 0.5) * 5);
    },
    onPointerLeave: reset,
    onPointerCancel: reset,
    onFocusCapture: reset,
  };
}
