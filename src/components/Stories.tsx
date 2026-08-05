import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  PenLine,
  Play,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import { demoNgos } from '@/data/demoNgos';
import SphereImageGrid, { type SphereImage } from '@/components/ui/img-sphere';

interface StoriesProps {
  onOpenNGO: (ngoId: string) => void;
  canTellStory?: boolean;
  onTellStory?: () => void;
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

type StoryPath = 'discover' | 'tell';

const Stories: React.FC<StoriesProps> = ({
  onOpenNGO,
  canTellStory = false,
  onTellStory,
}) => {
  const reducedMotion = useReducedMotion();
  const [storyPath, setStoryPath] = useState<StoryPath>('discover');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const stories = useMemo<StoryItem[]>(
    () => demoNgos
      .flatMap((ngo) => ngo.posts.map((post) => ({
        ...post,
        ngoId: ngo.id,
        ngoName: ngo.name,
        ngoImage: ngo.image,
        verified: ngo.verified,
      })))
      .sort((a, b) => b.timestamp - a.timestamp),
    [],
  );
  const activeStory = activeIndex === null ? null : stories[activeIndex];
  const sphereImages = useMemo<SphereImage[]>(
    () => stories.map((story) => ({
      id: story.id,
      src: story.url,
      alt: `${story.ngoName}: ${story.caption || 'história de impacto'}`,
      type: story.type,
    })),
    [stories],
  );
  const previewStories = stories.slice(0, 3);

  const move = (direction: -1 | 1) => {
    if (activeIndex === null || !stories.length) return;
    setActiveIndex((activeIndex + direction + stories.length) % stories.length);
  };

  const panelMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
      initial: { opacity: 0, y: 14 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    };

  return (
    <div className='mx-auto w-full min-w-0 max-w-6xl overflow-x-clip px-4 pb-32 pt-7 md:pt-10'>
      <div className='flex justify-center'>
        <div
          role='tablist'
          aria-label='Caminhos de histórias'
          className='relative grid w-full max-w-md grid-cols-2 overflow-hidden rounded-xl border border-brand-blue/15 bg-brand-blue/[0.08] p-1.5 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.8),inset_-1px_-1px_5px_rgba(17,54,79,0.12),0_8px_24px_rgba(17,54,79,0.08)] backdrop-blur-xl'
        >
          <span
            aria-hidden='true'
            className={`absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%_-_6px)] rounded-lg bg-brand-yellow shadow-[0_8px_22px_rgba(255,211,67,0.28),inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform duration-500 ${storyPath === 'tell' ? 'translate-x-full' : 'translate-x-0'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          <button
            id='story-path-discover'
            type='button'
            role='tab'
            aria-selected={storyPath === 'discover'}
            aria-controls='story-panel-discover'
            onClick={() => setStoryPath('discover')}
            className='relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-brand-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 sm:gap-2 sm:px-3 sm:text-sm'
          >
            <BookOpen size={17} />
            Conhecer histórias
          </button>
          <button
            id='story-path-tell'
            type='button'
            role='tab'
            aria-selected={storyPath === 'tell'}
            aria-controls='story-panel-tell'
            onClick={() => setStoryPath('tell')}
            className='relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-brand-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 sm:gap-2 sm:px-3 sm:text-sm'
          >
            <PenLine size={17} />
            Contar histórias
          </button>
        </div>
      </div>

      <AnimatePresence mode='wait' initial={false}>
        {storyPath === 'discover' ? (
          <motion.div
            key='discover'
            id='story-panel-discover'
            role='tabpanel'
            aria-labelledby='story-path-discover'
            className='w-full min-w-0'
            {...panelMotion}
            transition={{ duration: reducedMotion ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className='mt-12 max-w-2xl'>
              <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Histórias de impacto</p>
              <h1 className='mt-1 font-display text-4xl font-semibold leading-tight md:text-5xl'>Veja o apoio ganhando vida.</h1>
              <p className='mt-3 leading-7 text-muted-foreground'>Atualizações publicadas pelas organizações mostram como cada contribuição se transforma em cuidado real.</p>
            </header>

            {stories.length > 0 && (
              <section className='mt-5 grid min-w-0 items-center gap-4 overflow-hidden rounded-lg border border-white/10 bg-[#070809] p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]'>
                <div className='min-w-0 overflow-hidden'>
                  <SphereImageGrid
                    images={sphereImages}
                    onImageSelect={(image) => setActiveIndex(stories.findIndex((story) => story.id === image.id))}
                    autoRotate
                  />
                </div>
                <div className='px-3 pb-5 text-center text-white lg:text-left'>
                  <p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Conteúdos das ONGs</p>
                  <h2 className='mt-2 font-display text-2xl font-semibold'>Gire a esfera e entre nas histórias.</h2>
                  <p className='mt-3 text-sm leading-6 text-white/60'>Fotos e vídeos publicados pelas organizações para aproximar você das causas e das pessoas que elas cuidam.</p>
                </div>
              </section>
            )}

            {stories.length ? (
              <section className='mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                {stories.map((story, index) => (
                  <article key={story.id} className='overflow-hidden rounded-lg border-2 border-border bg-background'>
                    <button
                      type='button'
                      onClick={() => setActiveIndex(index)}
                      className='group relative block aspect-[4/5] w-full overflow-hidden bg-secondary text-left'
                    >
                      {story.type === 'image' ? (
                        <img src={story.url} alt={story.caption || 'História de impacto'} className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105' />
                      ) : (
                        <>
                          <video src={story.url} className='h-full w-full object-cover' preload='metadata' />
                          <span className='absolute inset-0 grid place-items-center bg-black/20'><Play size={38} className='fill-white text-white' /></span>
                          <Video size={20} className='absolute right-3 top-3 text-white' />
                        </>
                      )}
                      <span className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/90 to-transparent p-4 pt-20 text-white'>
                        <span className='flex items-center gap-2'>
                          <img src={story.ngoImage} alt='' className='h-9 w-9 rounded-full border-2 border-white object-cover' />
                          <span className='min-w-0'>
                            <span className='flex items-center gap-1 text-sm font-bold'>
                              {story.ngoName}
                              {story.verified && <ShieldCheck size={14} className='text-brand-yellow' />}
                            </span>
                            <span className='line-clamp-2 text-xs text-white/75'>{story.caption || 'Nova atualização de impacto'}</span>
                          </span>
                        </span>
                      </span>
                    </button>
                    <button
                      type='button'
                      onClick={() => onOpenNGO(story.ngoId)}
                      className='flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-brand-blue'
                    >
                      <span className='inline-flex items-center gap-2'><Heart size={16} />Conhecer a causa</span>
                      <ChevronRight size={17} />
                    </button>
                  </article>
                ))}
              </section>
            ) : (
              <div className='mt-10 rounded-lg border-2 border-dashed border-border p-12 text-center text-muted-foreground'>As primeiras histórias aparecerão aqui.</div>
            )}
          </motion.div>
        ) : (
          <motion.section
            key='tell'
            id='story-panel-tell'
            role='tabpanel'
            aria-labelledby='story-path-tell'
            className='mt-12 grid min-h-[65vh] items-center gap-12 border-y border-brand-blue/15 py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:py-24'
            {...panelMotion}
            transition={{ duration: reducedMotion ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className='max-w-xl'>
              <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Para organizações</p>
              <h1 className='mt-3 font-display text-4xl font-semibold leading-tight text-brand-ink sm:text-6xl'>Conte como o apoio virou impacto.</h1>
              <p className='font-narrative mt-6 max-w-lg text-lg leading-8 text-muted-foreground sm:text-xl'>Compartilhe o caminho percorrido, aproxime pessoas da causa e torne cada transformação visível.</p>
              <button
                type='button'
                onClick={onTellStory}
                className='tc-button-3d mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue'
              >
                {canTellStory ? 'Abrir perfil da ONG' : 'Entrar como organização'}
                <ArrowRight size={18} />
              </button>
            </div>

            <div className='relative mx-auto h-[430px] w-full max-w-xl' aria-hidden='true'>
              {previewStories.map((story, index) => (
                <div
                  key={story.id}
                  className='absolute left-1/2 top-1/2 aspect-[4/5] w-[52%] overflow-hidden rounded-lg border-4 border-background shadow-[0_24px_55px_rgba(17,54,79,0.2)]'
                  style={{
                    transform: `translate(-50%, -50%) translateX(${(index - 1) * 42}%) rotate(${(index - 1) * 7}deg)`,
                    zIndex: index === 1 ? 3 : 2,
                  }}
                >
                  {story.type === 'image' ? (
                    <img src={story.url} alt='' className='h-full w-full object-cover' />
                  ) : (
                    <video src={story.url} className='h-full w-full object-cover' muted playsInline preload='metadata' />
                  )}
                  <span className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/90 to-transparent p-4 pt-16 text-sm font-bold text-white'>{story.ngoName}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeStory && (
          <motion.div
            className='fixed inset-0 z-[130] grid place-items-center bg-brand-ink/95 p-3 backdrop-blur-md'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIndex(null)}
          >
            <div className='absolute left-4 right-4 top-4 flex gap-1'>
              {stories.map((story, index) => <span key={story.id} className={`h-1 flex-1 rounded-full ${index <= (activeIndex ?? 0) ? 'bg-background' : 'bg-background/25'}`} />)}
            </div>
            <button type='button' onClick={() => setActiveIndex(null)} className='absolute right-4 top-8 grid h-10 w-10 place-items-center rounded-full bg-background text-brand-blue' aria-label='Fechar história'><X size={19} /></button>
            {stories.length > 1 && (
              <>
                <button type='button' onClick={(event) => { event.stopPropagation(); move(-1); }} className='absolute left-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:left-8' aria-label='História anterior'><ChevronLeft /></button>
                <button type='button' onClick={(event) => { event.stopPropagation(); move(1); }} className='absolute right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:right-8' aria-label='Próxima história'><ChevronRight /></button>
              </>
            )}
            <motion.div
              key={activeStory.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className='relative h-[78vh] w-full max-w-md overflow-hidden rounded-lg bg-black shadow-2xl'
              onClick={(event) => event.stopPropagation()}
            >
              {activeStory.type === 'image'
                ? <img src={activeStory.url} alt='' className='h-full w-full object-contain' />
                : <video src={activeStory.url} className='h-full w-full object-contain' controls autoPlay playsInline />}
              <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-20 text-white'>
                <button type='button' onClick={() => onOpenNGO(activeStory.ngoId)} className='flex items-center gap-3 text-left'>
                  <img src={activeStory.ngoImage} alt='' className='h-11 w-11 rounded-full border-2 border-white object-cover' />
                  <span>
                    <span className='flex items-center gap-1.5 font-bold'>{activeStory.ngoName}{activeStory.verified && <ShieldCheck size={15} className='text-brand-yellow' />}</span>
                    <span className='mt-1 block text-sm text-white/75'>{activeStory.caption}</span>
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stories;
