import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import founderSeal from '@/assets/founder-ngo-seal.png';
import { CoverflowCarousel, type CoverflowSlide } from '@/components/ui/coverflow-carousel';
import type { NGO } from '@/types';

interface FounderOrganizationsSectionProps {
  ngos: NGO[];
  onOpen: (ngo: NGO) => void;
}

const FounderOrganizationsSection = memo(function FounderOrganizationsSection({
  ngos,
  onOpen,
}: FounderOrganizationsSectionProps) {
  const reduceMotion = useReducedMotion();
  const slides = useMemo<CoverflowSlide[]>(() => ngos.map((ngo) => {
    const stories = ngo.posts.filter((post) => post.type === 'image').slice(0, 2);

    return {
      id: ngo.id,
      label: ngo.name,
      content: (
      <motion.button
        type='button'
        onClick={() => onOpen(ngo)}
        whileHover={reduceMotion ? undefined : { transform: 'translate3d(0, -4px, 0)' }}
        whileTap={reduceMotion ? undefined : { transform: 'scale(0.985)' }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
        className='group relative h-full w-full overflow-hidden rounded-[28px] text-left text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70 focus-visible:ring-offset-4'
        aria-label={`Conhecer ${ngo.name}`}
      >
        <span className='founder-card-aurora absolute inset-0' aria-hidden='true' />
        <span
          aria-hidden='true'
          className='absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.4),transparent_32%),linear-gradient(115deg,rgba(0,126,190,0.12)_0%,rgba(0,126,190,0.34)_48%,rgba(0,67,115,0.68)_100%)]'
        />

        {stories.length > 0 && (
          <span className='absolute inset-y-0 right-0 w-[58%] opacity-55 sm:opacity-70' aria-hidden='true'>
            <span className='grid h-full grid-cols-2 gap-1.5 p-1.5'>
              {stories.map((story) => (
                <img
                  key={story.id}
                  src={story.url}
                  alt=''
                  loading='lazy'
                  decoding='async'
                  className='h-full min-h-0 w-full bg-white/10 object-contain'
                />
              ))}
            </span>
            <span className='absolute inset-0 bg-gradient-to-r from-brand-blue via-brand-blue/70 to-brand-blue/10' />
          </span>
        )}

        <span className='relative z-10 flex h-full max-w-[88%] flex-col justify-between p-6 sm:max-w-[76%] sm:p-8'>
          <span className='flex items-center gap-3'>
            <span className='grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/55 bg-white shadow-lg sm:h-16 sm:w-16'>
              <img
                src={ngo.image}
                alt=''
                decoding='async'
                className='h-full w-full object-contain'
              />
            </span>
            <span className='min-w-0'>
              <span className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/80'>
                <img
                  src={founderSeal}
                  alt='Selo de ONG fundadora'
                  className='h-9 w-9 shrink-0 object-contain drop-shadow-md'
                />
                ONG fundadora
              </span>
              <span className='mt-1 block truncate font-display text-2xl font-semibold sm:text-3xl'>
                {ngo.name}
              </span>
            </span>
          </span>

          <span>
            <span className='block max-w-lg text-sm font-semibold leading-6 text-white sm:text-base'>
              {ngo.description}
            </span>
            <span className='mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-brand-blue shadow-[0_12px_30px_-16px_rgba(4,62,94,0.9)] transition-transform duration-150 group-hover:translate-x-1'>
              <span className='truncate'>Conhecer {ngo.name}</span>
              <ArrowUpRight className='h-4 w-4 shrink-0' />
            </span>
          </span>
        </span>
      </motion.button>
      ),
    };
  }), [ngos, onOpen, reduceMotion]);

  return (
    <section
      aria-labelledby='founder-organizations-title'
      className='mx-auto w-full max-w-[1400px]'
      style={{ contentVisibility: 'auto', containIntrinsicSize: '560px' }}
    >
      <div className='founder-section-vibrant relative overflow-hidden rounded-[30px] px-3 py-7 sm:px-6 md:rounded-[38px] md:py-9'>
        <div className='relative z-10 px-2 sm:px-4'>
          <div className='founder-section-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em]'>
            <img src={founderSeal} alt='' className='h-5 w-5 object-contain' />
            ONGs fundadoras
          </div>
          <h2
            id='founder-organizations-title'
            className='mt-4 max-w-2xl text-balance font-display text-3xl font-semibold leading-tight text-brand-ink md:text-4xl'
          >
            Quem acreditou nessa história desde o começo
          </h2>
        </div>

        <CoverflowCarousel
          slides={slides}
          cardWidth='clamp(300px, 72vw, 760px)'
          cardHeight='clamp(390px, 52vw, 440px)'
          showNavigation
          className='relative z-10 mt-1'
        />
      </div>
    </section>
  );
});

export default FounderOrganizationsSection;
