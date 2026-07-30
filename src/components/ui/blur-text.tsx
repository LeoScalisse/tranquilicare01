import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  stepDuration?: number;
  rootRef?: React.RefObject<Element>;
  onAnimationComplete?: () => void;
  punctuationClassName?: string;
}

const BlurText: React.FC<BlurTextProps> = ({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.35,
  rootRef,
  onAnimationComplete,
  punctuationClassName = '',
}) => {
  const elements = useMemo(
    () => (animateBy === 'words' ? text.split(' ') : text.split('')),
    [animateBy, text],
  );
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reducedMotion) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.unobserve(element);
      },
      {
        root: rootRef?.current ?? null,
        threshold,
        rootMargin,
      },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion, rootMargin, rootRef, threshold]);

  const offset = direction === 'top' ? -48 : 48;
  const initial = reducedMotion
    ? { opacity: 1, filter: 'blur(0px)', y: 0 }
    : { opacity: 0, filter: 'blur(12px)', y: offset };

  return (
    <p ref={ref} className={`flex flex-wrap ${className}`} aria-label={text}>
      {elements.map((segment, index) => (
        <motion.span
          aria-hidden='true'
          className={`inline-block will-change-[transform,filter,opacity] ${
            /[.!?…]/.test(segment) ? punctuationClassName : ''
          }`}
          key={`${segment}-${index}`}
          initial={initial}
          animate={inView
            ? {
                opacity: [initial.opacity, 0.55, 1],
                filter: [initial.filter, 'blur(5px)', 'blur(0px)'],
                y: [initial.y, direction === 'top' ? 5 : -5, 0],
              }
            : initial}
          transition={{
            duration: reducedMotion ? 0 : stepDuration * 2,
            times: [0, 0.5, 1],
            delay: reducedMotion ? 0 : (index * delay) / 1000,
            ease: [0.22, 1, 0.36, 1],
          }}
          onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
        >
          {animateBy === 'letters' && segment === ' ' ? '\u00A0' : segment}
          {animateBy === 'words' && index < elements.length - 1 ? '\u00A0' : null}
        </motion.span>
      ))}
    </p>
  );
};

export default BlurText;
