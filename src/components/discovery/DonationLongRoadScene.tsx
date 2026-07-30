import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import longRoadImage from '@/assets/donation-long-road.webp';
import DiscoveryScrollContext from './DiscoveryScrollContext';

interface TrackBounds {
  start: number;
  end: number;
}

const DonationLongRoadScene: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const scrollContainerRef = useContext(DiscoveryScrollContext);
  const reducedMotion = useReducedMotion();
  const [bounds, setBounds] = useState<TrackBounds>({ start: 300, end: -1100 });

  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const velocity = useVelocity(scrollYProgress);
  const skewRaw = useTransform(velocity, [-0.45, 0.45], ['8deg', '-8deg']);
  const skewX = useSpring(skewRaw, { mass: 2.5, stiffness: 360, damping: 48 });
  const xRaw = useTransform(
    scrollYProgress,
    [0.25, 0.66],
    [bounds.start, bounds.end],
  );
  const x = useSpring(xRaw, { mass: 2.7, stiffness: 370, damping: 50 });

  const introOpacity = useTransform(scrollYProgress, [0.02, 0.1, 0.25, 0.32], [0, 1, 1, 0]);
  const introBlur = useTransform(scrollYProgress, [0.02, 0.1, 0.25, 0.32], ['blur(14px)', 'blur(0px)', 'blur(0px)', 'blur(14px)']);
  const introY = useTransform(scrollYProgress, [0.02, 0.12, 0.3], [30, 0, -24]);

  const wordOpacity = useTransform(scrollYProgress, [0.25, 0.32, 0.59, 0.67], [0, 1, 1, 0]);
  const wordBlur = useTransform(scrollYProgress, [0.25, 0.32, 0.59, 0.67], ['blur(12px)', 'blur(0px)', 'blur(0px)', 'blur(12px)']);

  const outroOpacity = useTransform(scrollYProgress, [0.63, 0.72, 1], [0, 1, 1]);
  const outroBlur = useTransform(scrollYProgress, [0.63, 0.74], ['blur(14px)', 'blur(0px)']);
  const outroY = useTransform(scrollYProgress, [0.63, 0.76], [28, 0]);

  useEffect(() => {
    const section = sectionRef.current;
    const word = wordRef.current;
    if (!section || !word) return;

    const updateBounds = () => {
      const viewportWidth = section.getBoundingClientRect().width;
      setBounds({
        start: viewportWidth * 0.88,
        end: -word.scrollWidth + viewportWidth * 0.12,
      });
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(section);
    observer.observe(word);
    return () => observer.disconnect();
  }, []);

  if (reducedMotion) {
    return (
      <section id='donation-long-road' className='relative isolate flex min-h-svh items-center overflow-hidden px-5 py-28 text-white sm:px-8 lg:px-12'>
        <img src={longRoadImage} alt='' className='absolute inset-0 -z-20 h-full w-full object-cover' />
        <div className='absolute inset-0 -z-10 bg-brand-ink/55' />
        <div className='mx-auto max-w-5xl text-center'>
          <p className='text-xs font-bold uppercase text-brand-yellow'>Parte II</p>
          <h2 className='mt-8 font-display text-5xl font-semibold leading-[1.08] sm:text-7xl'>
            Mas entre a sua intenção e a organização existe um caminho looooooooooongo.
          </h2>
          <p className='mt-8 font-narrative text-2xl'>E nem sempre esse caminho é visível.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      id='donation-long-road'
      ref={sectionRef}
      aria-label='Parte II. O longo caminho entre a intenção e a organização.'
      className='relative isolate h-[330svh] bg-brand-ink'
    >
      <div className='sticky top-0 h-svh overflow-hidden text-white'>
        <img
          src={longRoadImage}
          alt=''
          className='absolute inset-0 -z-30 h-full w-full scale-[1.03] object-cover'
        />
        <div className='absolute inset-0 -z-20 bg-brand-ink/[0.42]' />
        <div className='absolute inset-0 -z-10 bg-gradient-to-b from-brand-ink/35 via-transparent to-brand-ink/55' />
        <p className='absolute left-5 top-10 text-xs font-bold uppercase text-brand-yellow sm:left-8 sm:top-14 lg:left-12'>
          Parte II
        </p>
        <h2 className='sr-only'>O longo caminho</h2>

        <motion.p
          aria-hidden='true'
          style={{ opacity: introOpacity, filter: introBlur, y: introY }}
          className='absolute inset-x-5 top-1/2 mx-auto max-w-5xl -translate-y-1/2 text-center font-display text-5xl font-semibold leading-[1.08] sm:inset-x-8 sm:text-7xl lg:text-8xl'
        >
          Mas entre a sua intenção e a organização existe um
        </motion.p>

        <motion.span
          ref={wordRef}
          aria-hidden='true'
          style={{ opacity: wordOpacity, filter: wordBlur, skewX, x }}
          className='absolute top-1/2 inline-block -translate-y-1/2 whitespace-nowrap font-display text-6xl font-semibold leading-none text-brand-yellow will-change-transform sm:text-8xl lg:text-9xl'
        >
          looooooooooongo
        </motion.span>

        <motion.div
          aria-hidden='true'
          style={{ opacity: outroOpacity, filter: outroBlur, y: outroY }}
          className='absolute inset-x-5 top-1/2 mx-auto max-w-5xl -translate-y-1/2 text-center sm:inset-x-8'
        >
          <p className='font-display text-6xl font-semibold leading-[1.08] sm:text-8xl'>caminho<span className='text-brand-yellow'>.</span></p>
          <p className='font-narrative mx-auto mt-8 max-w-3xl text-2xl font-medium leading-relaxed sm:text-4xl'>
            E nem sempre esse caminho é visível<span className='text-brand-yellow'>.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default DonationLongRoadScene;
