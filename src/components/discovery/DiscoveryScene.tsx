import React, { useContext, useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import DiscoveryScrollContext from './DiscoveryScrollContext';
import ScrollFloat from './ScrollFloat';

interface DiscoverySceneProps {
  id: string;
  index: number;
  eyebrow: string;
  title: React.ReactNode;
  supporting?: React.ReactNode;
  visual: React.ReactNode;
  onActive: (index: number) => void;
  reverse?: boolean;
  centered?: boolean;
  children?: React.ReactNode;
  headingLevel?: 'h1' | 'h2';
  className?: string;
  dark?: boolean;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const DiscoveryScene: React.FC<DiscoverySceneProps> = ({
  id,
  index,
  eyebrow,
  title,
  supporting,
  visual,
  onActive,
  reverse = false,
  centered = false,
  children,
  headingLevel = 'h2',
  className = '',
  dark = false,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useContext(DiscoveryScrollContext);
  const inView = useInView(sectionRef, {
    root: scrollContainerRef,
    amount: 0.42,
    margin: '-8% 0px -28% 0px',
  });
  const reducedMotion = useReducedMotion();
  const [hasEntered, setHasEntered] = useState(index === 0);

  useEffect(() => {
    if (!inView) return;
    setHasEntered(true);
    onActive(index);
  }, [inView, index, onActive]);

  const reveal = reducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={`${id}-title`}
      className={`flex min-h-[108svh] scroll-mt-16 items-center overflow-hidden px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-36 ${className}`}
    >
      <div className={`mx-auto w-full max-w-7xl ${
        centered ? 'flex flex-col items-center text-center' : 'grid items-center gap-16 lg:grid-cols-2 lg:gap-24'
      }`}>
        <motion.div
          initial='hidden'
          animate={hasEntered ? 'visible' : 'hidden'}
          variants={reveal}
          transition={{ duration: reducedMotion ? 0.15 : 0.72, ease: EASE_OUT }}
          className={`min-w-0 w-full ${centered ? 'order-1 max-w-5xl' : reverse ? 'lg:order-2' : ''}`}
        >
          <p className={`text-xs font-bold uppercase tracking-[0.16em] ${dark ? 'text-brand-yellow' : 'text-brand-blue'}`}>
            {eyebrow}
          </p>
          <ScrollFloat
            as={headingLevel}
            id={`${id}-title`}
            tabIndex={headingLevel === 'h1' ? -1 : undefined}
            disabled={headingLevel === 'h1'}
            animationDuration={0.9}
            ease='power3.out'
            stagger={0.012}
            scrollStart={headingLevel === 'h1' ? 'top 96%' : 'top 88%'}
            scrollEnd={headingLevel === 'h1' ? 'center 54%' : 'center 46%'}
            scrollContainerRef={scrollContainerRef}
            containerClassName={`mt-5 max-w-full break-words font-display text-5xl font-semibold leading-[1.08] focus:outline-none sm:text-6xl sm:leading-[1.05] lg:text-8xl ${dark ? 'text-white' : 'text-brand-ink'}`}
          >
            {title}
          </ScrollFloat>
          {supporting && (
            <div className={`mt-8 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 lg:text-xl ${centered ? 'mx-auto' : ''} ${dark ? 'text-white/68' : 'text-muted-foreground'}`}>
              {supporting}
            </div>
          )}
          {children}
        </motion.div>

        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
          animate={hasEntered
            ? { opacity: 1, scale: 1, y: 0 }
            : reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: reducedMotion ? 0.15 : 0.78, delay: reducedMotion ? 0 : 0.08, ease: EASE_OUT }}
          className={`${centered ? 'order-2 mt-14 lg:mt-20' : reverse ? 'lg:order-1' : ''} min-w-0 w-full`}
        >
          {visual}
        </motion.div>
      </div>
    </section>
  );
};

export default DiscoveryScene;
