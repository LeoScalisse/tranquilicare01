import React, { useContext, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import DiscoveryScrollContext from './DiscoveryScrollContext';
import GhostLottie from './GhostLottie';
import SearchLottie from './SearchLottie';
import StoryPunctuation from './StoryPunctuation';

interface NarrativePanel {
  id: string;
  lines: React.ReactNode;
  tone: 'sky' | 'white' | 'ink' | 'yellow' | 'mist' | 'green';
}

interface NarrativeHorizontalActProps {
  panels: NarrativePanel[];
  partLabel?: string;
  accessibleTitle?: string;
  visualPreset?: 'verification' | 'none';
}

const toneClasses: Record<NarrativePanel['tone'], string> = {
  sky: 'bg-[#eaf7ff] text-brand-ink',
  white: 'bg-background text-brand-ink',
  ink: 'bg-brand-ink text-white',
  yellow: 'bg-brand-yellow text-brand-ink',
  mist: 'bg-[#f3f5f6] text-brand-ink',
  green: 'bg-[#edf8f1] text-brand-ink',
};

const punctuationClass = (tone: NarrativePanel['tone']) => (
  tone === 'ink' ? 'text-brand-yellow' : 'text-brand-blue'
);

const SearchSweep: React.FC<{ className: string; reducedMotion: boolean }> = ({
  className,
  reducedMotion,
}) => (
  <motion.div
    aria-hidden='true'
    className='pointer-events-none absolute inset-0 z-30'
    animate={reducedMotion
      ? { x: 0, y: 0 }
      : {
          x: ['0vw', '52vw', '18vw', '0vw'],
          y: [0, -8, 5, 0],
        }}
    transition={reducedMotion
      ? { duration: 0 }
      : {
          duration: 14,
          times: [0, 0.46, 0.76, 1],
          ease: [0.45, 0, 0.2, 1],
          repeat: Infinity,
          repeatDelay: 1.2,
        }}
  >
    <SearchLottie className={className} />
  </motion.div>
);

const NarrativeHorizontalAct: React.FC<NarrativeHorizontalActProps> = ({
  panels,
  partLabel = '',
  accessibleTitle = 'Quando confiar vira uma investigação',
  visualPreset = 'verification',
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useContext(DiscoveryScrollContext);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const endX = -((panels.length - 1) / panels.length) * 100;
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `${endX}%`]);
  const progress = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  if (reducedMotion) {
    return (
      <section aria-labelledby='conflict-title' className='bg-background'>
        <div className='px-5 pb-12 pt-24 sm:px-8 lg:px-12'>
          {partLabel && <p className='text-xs font-bold uppercase text-brand-blue'>{partLabel}</p>}
          <h2 id='conflict-title' className='mt-3 font-display text-4xl font-semibold text-brand-ink sm:text-6xl'>
            {accessibleTitle}<span className='text-brand-blue'>.</span>
          </h2>
        </div>
        {panels.map((panel, index) => (
          <div key={panel.id} className={`relative flex min-h-[70svh] items-center overflow-hidden px-6 py-20 sm:px-12 ${toneClasses[panel.tone]}`}>
            {visualPreset === 'verification' && index === 0 && (
              <SearchSweep
                reducedMotion={Boolean(reducedMotion)}
                className='absolute left-[7%] top-1/2 h-28 w-28 -translate-y-1/2 drop-shadow-[0_12px_18px_rgba(20,72,105,0.16)] sm:h-40 sm:w-40'
              />
            )}
            {visualPreset === 'verification' && panel.id === 'lost-opportunities' && (
              <GhostLottie className='pointer-events-none absolute bottom-[14%] left-4 z-20 h-20 w-20 opacity-75 sm:left-auto sm:right-7 sm:h-28 sm:w-28' />
            )}
            <div className='font-narrative relative z-20 mx-auto w-full max-w-4xl text-3xl font-medium leading-tight sm:text-5xl'>
              <StoryPunctuation className={punctuationClass(panel.tone)}>
                {panel.lines}
              </StoryPunctuation>
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby='conflict-title'
      className='relative'
      style={{ height: `${Math.max(panels.length, 2) * 100}svh` }}
    >
      <div className='sticky top-0 h-svh overflow-hidden bg-background'>
        <div className='pointer-events-none absolute left-5 top-8 z-20 sm:left-8 lg:left-12'>
          {partLabel && <p className='text-xs font-bold uppercase text-brand-blue'>{partLabel}</p>}
          <h2 id='conflict-title' className='sr-only'>{accessibleTitle}</h2>
        </div>

        <motion.div className='flex h-full' style={{ width: `${panels.length * 100}%`, x }}>
          {panels.map((panel, index) => (
            <article
              id={panel.id}
              key={panel.id}
              className={`relative flex h-full items-center overflow-hidden px-6 py-24 sm:px-12 lg:px-20 ${toneClasses[panel.tone]}`}
              style={{ width: `${100 / panels.length}%` }}
            >
              {visualPreset === 'verification' && index === 0 && (
                <SearchSweep
                  reducedMotion={Boolean(reducedMotion)}
                  className='absolute left-[7%] top-1/2 h-[min(21vw,13rem)] w-[min(21vw,13rem)] -translate-y-1/2 drop-shadow-[0_14px_22px_rgba(20,72,105,0.18)]'
                />
              )}
              {visualPreset === 'verification' && panel.id === 'lost-opportunities' && (
                <GhostLottie className='pointer-events-none absolute bottom-[14%] left-5 z-20 h-24 w-24 opacity-75 sm:left-auto sm:right-8 sm:h-32 sm:w-32' />
              )}
              <div className='relative z-20 mx-auto w-full max-w-5xl'>
                <div className='font-narrative max-w-4xl text-4xl font-medium leading-[1.08] sm:text-6xl lg:text-7xl'>
                  <StoryPunctuation className={punctuationClass(panel.tone)}>
                    {panel.lines}
                  </StoryPunctuation>
                </div>
              </div>
            </article>
          ))}
        </motion.div>

        <div className='absolute bottom-0 left-0 right-0 z-20 h-1 bg-black/10'>
          <motion.div className='h-full bg-brand-blue' style={{ width: progress }} />
        </div>
      </div>
    </section>
  );
};

export default NarrativeHorizontalAct;
