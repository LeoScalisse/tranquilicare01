import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Building2 } from 'lucide-react';

import founderSeal from '@/assets/founder-ngo-seal.png';
import FounderCarousel, { type FounderCarouselSlide } from '@/components/ui/founder-carousel';
import type { NGO } from '@/types';
import { useSectionReveal } from '@/hooks/use-section-reveal';

interface FounderOrganizationsSectionProps {
  ngos: NGO[];
  onOpen: (ngo: NGO) => void;
}

const FounderOrganizationsSection = memo(function FounderOrganizationsSection({
  ngos,
  onOpen,
}: FounderOrganizationsSectionProps) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useSectionReveal();

  const slides = useMemo<FounderCarouselSlide[]>(() => ngos.map((ngo) => {
    const background = ngo.coverImage
      || ngo.posts.find((post) => post.type === 'image')?.url
      || '';

    return {
      id: ngo.id,
      label: ngo.name,
      preview: <>
        {background || ngo.image ? <img src={background || ngo.image} alt='' loading='lazy' decoding='async' draggable={false} className={`h-full w-full ${background ? 'object-cover' : 'object-contain p-5'}`} /> : <div className='grid h-full place-items-center text-brand-blue'><Building2 size={48} aria-hidden='true' /></div>}
        <span className='pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent' aria-hidden='true' />
        {ngo.image && <img src={ngo.image} alt='' draggable={false} className='pointer-events-none absolute left-4 top-4 h-11 w-11 rounded-2xl border border-white/80 bg-white object-contain p-1' />}
      </>,
      content: (
        <article className='h-full'>
          <div className='flex h-full min-w-0 flex-col items-start p-5 sm:p-6 lg:p-7'>
            <span className='flex items-center gap-2 text-xs font-semibold text-brand-ink'><img src={founderSeal} alt='Selo de ONG fundadora' className='h-6 w-6' />ONG fundadora</span>
            <h3 className='mt-4 line-clamp-2 font-display text-2xl font-semibold leading-tight text-brand-ink'>{ngo.name}</h3>
            <p className='mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground'>{ngo.description}</p>
            <motion.button type='button' aria-label={`Conhecer ${ngo.name}`} onClick={() => onOpen(ngo)} whileTap={reduceMotion ? undefined : { scale: 0.98 }} className='tc-button-3d mt-auto inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30'>Conhecer esta ONG<ArrowUpRight size={17} aria-hidden='true' /></motion.button>
          </div>

        </article>
      ),
    };
  }), [ngos, onOpen, reduceMotion]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby='founder-organizations-title'
      className='mx-auto w-full max-w-[1400px]'
    >
      <div className='relative overflow-hidden rounded-[30px] border border-white/80 bg-gradient-to-br from-white/80 to-secondary/50 px-3 py-7 shadow-[0_24px_64px_-52px_#176fa655] sm:px-6 md:rounded-[38px] md:py-9'>
        <div data-reveal className='relative z-10 px-2 sm:px-4'>
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

        <FounderCarousel slides={slides} className='relative z-10 mt-1' />
      </div>
    </section>
  );
});

export default FounderOrganizationsSection;
