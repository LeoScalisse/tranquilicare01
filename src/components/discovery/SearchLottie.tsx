import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { AnimationItem } from 'lottie-web';
import searchAnimationData from '@/assets/lottie/lupa/search.json';

interface SearchLottieProps {
  className?: string;
}

const BRAND_BLUE = [0.2196, 0.7137, 1];
const BRAND_YELLOW = [1, 0.8706, 0.349];

const recolorSearchAnimation = () => {
  const animationData = structuredClone(searchAnimationData) as Record<string, unknown>;
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (node.ty === 'st' && node.c && typeof node.c === 'object') {
      const color = node.c as { k?: number[] };
      if (Array.isArray(color.k)) {
        const [red = 0, green = 0] = color.k;
        color.k = red > green * 2 ? BRAND_YELLOW : BRAND_BLUE;
      }
    }
    Object.values(node).forEach(visit);
  };
  visit(animationData);
  return animationData;
};

const SearchLottie: React.FC<SearchLottieProps> = ({ className = '' }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !hostRef.current) return;
    let animation: AnimationItem | undefined;
    let cancelled = false;

    import('lottie-web/build/player/lottie_light')
      .then((lottieModule) => {
        if (cancelled || !hostRef.current) return;
        animation = lottieModule.default.loadAnimation({
          container: hostRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: recolorSearchAnimation(),
        });
        animation.setSpeed(0.62);
      })
      .catch(() => {
        /* The narrative remains readable if the decorative animation fails. */
      });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <svg aria-hidden='true' className={className} viewBox='0 0 160 160'>
        <circle cx='66' cy='66' r='45' fill='none' stroke='#38b6ff' strokeWidth='8' />
        <circle cx='66' cy='66' r='34' fill='none' stroke='#ffde59' strokeWidth='7' />
        <path d='M98 99 137 145' fill='none' stroke='#38b6ff' strokeLinecap='round' strokeWidth='10' />
        <path d='m108 111 11 13' fill='none' stroke='#ffde59' strokeLinecap='round' strokeWidth='6' />
      </svg>
    );
  }

  return <div ref={hostRef} aria-hidden='true' className={className} />;
};

export default SearchLottie;
