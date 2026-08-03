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
import StoryPunctuation from './StoryPunctuation';

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
  const skewRaw = useTransform(velocity, [-0.45, 0.45], ['3deg', '-3deg']);
  const skewX = useSpring(skewRaw, { mass: 1.4, stiffness: 180, damping: 30 });
  const xRaw = useTransform(
    scrollYProgress,
    [0.34, 0.7],
    [bounds.start, bounds.end],
  );
  const x = useSpring(xRaw, { mass: 1.6, stiffness: 190, damping: 32 });

  const introOpacity = useTransform(scrollYProgress, [0.02, 0.1, 0.32, 0.39], [0, 1, 1, 0]);
  const introBlur = useTransform(scrollYProgress, [0.02, 0.1, 0.32, 0.39], ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(8px)']);
  const introY = useTransform(scrollYProgress, [0.02, 0.12, 0.36], [34, 0, -145]);

  const wordOpacity = useTransform(scrollYProgress, [0.32, 0.39, 0.63, 0.71], [0, 1, 1, 0]);
  const wordBlur = useTransform(scrollYProgress, [0.32, 0.39, 0.63, 0.71], ['blur(7px)', 'blur(0px)', 'blur(0px)', 'blur(7px)']);

  const outroOpacity = useTransform(scrollYProgress, [0.68, 0.77, 1], [0, 1, 1]);
  const outroBlur = useTransform(scrollYProgress, [0.68, 0.79], ['blur(8px)', 'blur(0px)']);
  const outroY = useTransform(scrollYProgress, [0.68, 0.8], [28, 0]);

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
          <h2 className='font-display text-5xl font-semibold leading-[1.08] sm:text-7xl'>
            <StoryPunctuation className='text-brand-yellow'>
              Mas entre a sua intenção e a organização existe um caminho loooooooooooooooongo.
            </StoryPunctuation>
          </h2>
          <p className='mt-8 font-narrative text-2xl'>
            <StoryPunctuation className='text-brand-yellow'>
              E nem sempre esse caminho é visível.
            </StoryPunctuation>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id='donation-long-road'
      ref={sectionRef}
      aria-label='O longo caminho entre a intenção e a organização.'
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
        <h2 className='sr-only'>O longo caminho</h2>

        <motion.p
          aria-hidden='true'
          style={{ opacity: introOpacity, filter: introBlur, y: introY }}
          className='absolute inset-x-5 top-[46%] mx-auto max-w-5xl -translate-y-1/2 text-center font-display text-5xl font-semibold leading-[1.08] sm:inset-x-8 sm:text-7xl lg:text-8xl'
        >
          <StoryPunctuation className='text-brand-yellow'>
            Mas entre a sua intenção e a organização existe um
          </StoryPunctuation>
        </motion.p>

        <motion.span
          ref={wordRef}
          aria-hidden='true'
          style={{ opacity: wordOpacity, filter: wordBlur, skewX, x }}
          className='absolute top-1/2 inline-block -translate-y-1/2 whitespace-nowrap font-display text-7xl font-semibold leading-none text-brand-yellow will-change-transform sm:text-9xl lg:text-[9rem]'
        >
          loooooooooooooooongo
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
