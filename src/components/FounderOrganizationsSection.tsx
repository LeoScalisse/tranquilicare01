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
    const background = ngo.coverImage
      || ngo.posts.find((post) => post.type === 'image')?.url
      || '';

    return {
      id: ngo.id,
      label: ngo.name,
      content: (
        <motion.button
          type='button'
          onClick={() => onOpen(ngo)}
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          transition={{ duration: 0.16 }}
          className='group relative h-full w-full overflow-hidden rounded-[28px] bg-brand-ink text-left text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70 focus-visible:ring-offset-4'
          aria-label={`Conhecer ${ngo.name}`}
        >
          {background ? (
            <img src={background} alt='' loading='lazy' decoding='async' className='absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]' />
          ) : (
            <span className='absolute inset-0 bg-brand-blue' aria-hidden='true' />
          )}
          <span className='absolute inset-0 bg-brand-ink/75' aria-hidden='true' />

          <span className='relative z-10 flex h-full max-w-[92%] flex-col justify-between p-6 sm:max-w-[72%] sm:p-8'>
            <span className='flex items-center gap-3'>
              <span className='grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[18px] border border-white/70 bg-white p-1 shadow-lg sm:h-16 sm:w-16'>
                <img
                  src={ngo.image}
                  alt=''
                  decoding='async'
                  className='h-full w-full rounded-[14px] object-cover'
                />
              </span>
              <span className='min-w-0'>
                <span className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-yellow'>
                  <img
                    src={founderSeal}
                    alt='Selo de ONG fundadora'
                    className='h-7 w-7 shrink-0 object-contain'
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
              <span className='mt-5 inline-flex max-w-full items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-brand-blue shadow-sm transition-transform duration-150 group-hover:translate-x-1'>
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
            Quem acredita nessa história desde o começo
          </h2>
        </div>

        <CoverflowCarousel
          slides={slides}
          cardWidth='clamp(300px, 72vw, 760px)'
          cardHeight='clamp(340px, 48vw, 400px)'
          showNavigation
          className='relative z-10 mt-1'
        />
      </div>
    </section>
  );
});

export default FounderOrganizationsSection;
