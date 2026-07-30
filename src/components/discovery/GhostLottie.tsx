import React, { useEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import type { AnimationItem } from 'lottie-web';
import ghostAnimationUrl from '@/assets/lottie/fantasma/Suci_the_Ghost.json?url';
import ghostAnimationSvg from '@/assets/lottie/fantasma/Suci_the_Ghost.svg';

interface GhostLottieProps {
  className?: string;
}

const GhostLottie: React.FC<GhostLottieProps> = ({ className = '' }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const inView = useInView(hostRef, { once: true, margin: '180px' });

  useEffect(() => {
    if (reducedMotion || !inView || !hostRef.current) return;
    let animation: AnimationItem | undefined;
    let cancelled = false;

    Promise.all([
      fetch(ghostAnimationUrl).then((response) => response.json()),
      import('lottie-web'),
    ])
      .then(([animationData, lottieModule]) => {
        if (cancelled || !hostRef.current) return;
        animation = lottieModule.default.loadAnimation({
          container: hostRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        });
        animation.setSpeed(0.58);
      })
      .catch(() => {
        /* Decorative only: the slide remains complete without the animation. */
      });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [inView, reducedMotion]);

  if (reducedMotion) {
    return <img aria-hidden='true' alt='' className={className} src={ghostAnimationSvg} />;
  }

  return <div ref={hostRef} aria-hidden='true' className={className} />;
};

export default GhostLottie;
