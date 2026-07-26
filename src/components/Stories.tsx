import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, Play, ShieldCheck, Video, X } from 'lucide-react';
import { demoNgos } from '@/data/demoNgos';
import SphereImageGrid, { SphereImage } from '@/components/ui/img-sphere';

interface StoriesProps {
  onOpenNGO: (ngoId: string) => void;
}

interface StoryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
  timestamp: number;
  ngoId: string;
  ngoName: string;
  ngoImage: string;
  verified: boolean;
}

const Stories: React.FC<StoriesProps> = ({ onOpenNGO }) => {
  const stories = useMemo<StoryItem[]>(() => demoNgos.flatMap((ngo) => ngo.posts.map((post) => ({ ...post, ngoId: ngo.id, ngoName: ngo.name, ngoImage: ngo.image, verified: ngo.verified }))).sort((a, b) => b.timestamp - a.timestamp), []);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeStory = activeIndex === null ? null : stories[activeIndex];
  const sphereImages = useMemo<SphereImage[]>(() => stories.map((story) => ({ id: story.id, src: story.url, alt: `${story.ngoName}: ${story.caption || 'história de impacto'}`, type: story.type })), [stories]);

  const move = (direction: -1 | 1) => {
    if (activeIndex === null || !stories.length) return;
    setActiveIndex((activeIndex + direction + stories.length) % stories.length);
  };

  return (
    <div className='mx-auto max-w-6xl px-4 pb-32 pt-8 md:pt-11'>
      <header className='max-w-2xl'><p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Histórias de impacto</p><h1 className='mt-1 font-display text-4xl font-semibold leading-tight md:text-5xl'>Veja o apoio ganhando vida.</h1><p className='mt-3 leading-7 text-muted-foreground'>Atualizações publicadas pelas organizações mostram como cada contribuição se transforma em cuidado real.</p></header>

      {stories.length > 0 && <section className='mt-5 grid items-center gap-4 overflow-hidden rounded-lg border border-white/10 bg-[#070809] p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]'><SphereImageGrid images={sphereImages} onImageSelect={(image) => setActiveIndex(stories.findIndex((story) => story.id === image.id))} autoRotate /><div className='px-3 pb-5 text-center text-white lg:text-left'><p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Conteúdos das ONGs</p><h2 className='mt-2 font-display text-2xl font-semibold'>Gire a esfera e entre nas histórias.</h2><p className='mt-3 text-sm leading-6 text-white/60'>Fotos e vídeos publicados pelas organizações para aproximar você das causas e das pessoas que elas cuidam.</p></div></section>}

      {stories.length ? <section className='mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>{stories.map((story, index) => <article key={story.id} className='overflow-hidden rounded-lg border-2 border-border bg-white'><button onClick={() => setActiveIndex(index)} className='group relative block aspect-[4/5] w-full overflow-hidden bg-secondary text-left'>{story.type === 'image' ? <img src={story.url} alt={story.caption || 'História de impacto'} className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105' /> : <><video src={story.url} className='h-full w-full object-cover' preload='metadata' /><span className='absolute inset-0 grid place-items-center bg-black/20'><Play size={38} className='fill-white text-white' /></span><Video size={20} className='absolute right-3 top-3 text-white' /></>}<span className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/90 to-transparent p-4 pt-20 text-white'><span className='flex items-center gap-2'><img src={story.ngoImage} alt='' className='h-9 w-9 rounded-full border-2 border-white object-cover' /><span className='min-w-0'><span className='flex items-center gap-1 text-sm font-bold'>{story.ngoName}{story.verified && <ShieldCheck size={14} className='text-brand-yellow' />}</span><span className='line-clamp-2 text-xs text-white/75'>{story.caption || 'Nova atualização de impacto'}</span></span></span></span></button><button onClick={() => onOpenNGO(story.ngoId)} className='flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-brand-blue'><span className='inline-flex items-center gap-2'><Heart size={16} />Conhecer a causa</span><ChevronRight size={17} /></button></article>)}</section> : <div className='mt-10 rounded-lg border-2 border-dashed border-border p-12 text-center text-muted-foreground'>As primeiras histórias aparecerão aqui.</div>}

      <AnimatePresence>
        {activeStory && <motion.div className='fixed inset-0 z-[130] grid place-items-center bg-brand-ink/95 p-3 backdrop-blur-md' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveIndex(null)}>
          <div className='absolute left-4 right-4 top-4 flex gap-1'>{stories.map((story, index) => <span key={story.id} className={`h-1 flex-1 rounded-full ${index <= (activeIndex ?? 0) ? 'bg-white' : 'bg-white/25'}`} />)}</div>
          <button onClick={() => setActiveIndex(null)} className='absolute right-4 top-8 grid h-10 w-10 place-items-center rounded-full bg-white text-brand-blue' aria-label='Fechar história'><X size={19} /></button>
          {stories.length > 1 && <><button onClick={(event) => { event.stopPropagation(); move(-1); }} className='absolute left-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur md:left-8' aria-label='História anterior'><ChevronLeft /></button><button onClick={(event) => { event.stopPropagation(); move(1); }} className='absolute right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur md:right-8' aria-label='Próxima história'><ChevronRight /></button></>}
          <motion.div key={activeStory.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className='relative h-[78vh] w-full max-w-md overflow-hidden rounded-lg bg-black shadow-2xl' onClick={(event) => event.stopPropagation()}>{activeStory.type === 'image' ? <img src={activeStory.url} alt='' className='h-full w-full object-contain' /> : <video src={activeStory.url} className='h-full w-full object-contain' controls autoPlay playsInline />}<div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-20 text-white'><button onClick={() => onOpenNGO(activeStory.ngoId)} className='flex items-center gap-3 text-left'><img src={activeStory.ngoImage} alt='' className='h-11 w-11 rounded-full border-2 border-white object-cover' /><span><span className='flex items-center gap-1.5 font-bold'>{activeStory.ngoName}{activeStory.verified && <ShieldCheck size={15} className='text-brand-yellow' />}</span><span className='mt-1 block text-sm text-white/75'>{activeStory.caption}</span></span></button></div></motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
};

export default Stories;
