import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { AnimationItem } from 'lottie-web';

import scrollAnimation from '@/assets/lottie/scroll/BoFd17MsdT.json';

interface ScrollIdleCueProps {
  active: boolean;
  delayMs?: number;
}

const ScrollIdleCue: React.FC<ScrollIdleCueProps> = ({ active, delayMs = 3000 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!containerRef.current) return undefined;
    if (import.meta.env.MODE === 'test') return undefined;
    let cancelled = false;
    const container = containerRef.current;
    void import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (cancelled) return;
      animationRef.current = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: scrollAnimation,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      });
    });
    return () => {
      cancelled = true;
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }

    let timer = window.setTimeout(() => setVisible(true), delayMs);
    const registerActivity = () => {
      setVisible(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(true), delayMs);
    };
    const events: Array<keyof WindowEventMap> = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'];
    events.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
    };
  }, [active, delayMs]);

  return (
    <motion.div
      className='grid size-24 place-items-center rounded-full bg-background/92 p-3 shadow-[0_12px_34px_rgba(15,42,67,0.2)] backdrop-blur-md sm:size-28'
      initial={false}
      animate={active && visible
        ? { opacity: 1, y: 0, scale: 1 }
        : reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.92 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.24 }}
      aria-hidden='true'
      data-scroll-idle-cue
      data-visible={String(active && visible)}
    >
      <div ref={containerRef} className='size-full' />
    </motion.div>
  );
};

export default ScrollIdleCue;
