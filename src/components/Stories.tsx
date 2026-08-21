import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  LoaderCircle,
  MoreHorizontal,
  PenLine,
  Play,
  Send,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';

import ScrollExpand from '@/components/ui/scroll-expand';
import ScrollIdleCue from '@/components/ui/scroll-idle-cue';
import CircularStoryGallery from '@/components/ui/circular-story-gallery';
import {
  MorphingCommentButton,
  type StoryComment,
} from '@/components/ui/morphing-comment-button';
import StoryShareSheet from '@/components/ui/story-share-sheet';
import { demoNgos } from '@/data/demoNgos';

interface StoriesProps {
  onOpenNGO: (ngoId: string) => void;
  canTellStory?: boolean;
  storytellerType?: 'donor' | 'ngo' | null;
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
  simulated?: boolean;
}

type DiscoveryLane = 'for-you' | 'following' | 'saved';

const DISCOVERY_LANES: Array<{ id: DiscoveryLane; label: string }> = [
  { id: 'for-you', label: 'Para você' },
  { id: 'following', label: 'Seguindo' },
  { id: 'saved', label: 'Salvas' },
];

const SIMULATED_BATCH_SIZE = 6;
const INITIAL_SIMULATED_BATCHES = 2;
const SIMULATION_EPOCH = Date.now();
const SIMULATED_CAPTIONS = [
  'Mais uma etapa concluída com a participação de voluntários e pessoas da comunidade.',
  'Os recursos recebidos ajudaram a manter o cuidado chegando a quem mais precisa.',
  'Um novo encontro transformou apoio em escuta, presença e possibilidades.',
  'A equipe compartilhou os avanços da semana e os próximos passos desta causa.',
  'Pequenas contribuições se encontraram para tornar esta ação possível.',
  'Hoje foi dia de acompanhar resultados, acolher pessoas e preparar a próxima atividade.',
  'A comunidade esteve presente em mais uma ação construída de forma coletiva.',
  'O apoio continua se transformando em experiências que fortalecem vínculos.',
];

const SIMULATED_COMMENTS: StoryComment[] = [
  {
    id: 'comment-marina',
    author: 'Marina Costa',
    text: 'É muito bonito acompanhar esse cuidado acontecendo de perto.',
    timestamp: '12 min',
  },
  {
    id: 'comment-rafael',
    author: 'Rafael Lima',
    text: 'Obrigado por compartilharem os próximos passos com tanta clareza.',
    timestamp: '38 min',
  },
  {
    id: 'comment-luiza',
    author: 'Luiza Martins',
    text: 'Essa história me ajudou a conhecer melhor a causa.',
    timestamp: '1 h',
  },
];

const createSimulatedStories = (
  templates: StoryItem[],
  count: number,
): StoryItem[] => {
  if (!templates.length) return [];

  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    return {
      ...template,
      id: 'simulated-' + String(index + 1) + '-' + template.id,
      caption: SIMULATED_CAPTIONS[index % SIMULATED_CAPTIONS.length],
      timestamp: SIMULATION_EPOCH - (index + 4) * 2_700_000,
      simulated: true,
    };
  });
};

const storyAge = (timestamp: number) => {
  const hours = Math.max(1, Math.round((Date.now() - timestamp) / 3_600_000));
  return hours < 24 ? String(hours) + 'h' : String(Math.round(hours / 24)) + 'd';
};

const BRAND_HEART_SRC = '/tranquilicare-heart.png';
const STORY_ACTION_SPRING = {
  type: 'spring',
  stiffness: 240,
  damping: 18,
  mass: 1.1,
} as const;

const BrandHeartReaction: React.FC<{ liked: boolean }> = ({ liked }) => (
  <span className='relative grid h-6 w-6 shrink-0 place-items-center'>
    <AnimatePresence mode='popLayout' initial={false}>
      {liked ? (
        <motion.img
          key='brand-heart'
          src={BRAND_HEART_SRC}
          alt=''
          className='h-6 w-6 object-contain'
          initial={{ opacity: 0, scale: 0.25, rotate: -16 }}
          animate={{
            opacity: 1,
            scale: [0.25, 1.4, 0.9, 1],
            rotate: [-16, 8, -3, 0],
          }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : (
        <motion.span
          key='outline-heart'
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.16 }}
        >
          <Heart size={19} />
        </motion.span>
      )}
    </AnimatePresence>
    <AnimatePresence>
      {liked && (
        <motion.span
          key='heart-pop-ring'
          className='pointer-events-none absolute inset-0 rounded-full border-2 border-brand-yellow'
          initial={{ opacity: 0.85, scale: 0.35 }}
          animate={{ opacity: 0, scale: 1.9 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.52, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  </span>
);

interface StoryFeedProps {
  stories: StoryItem[];
  savedIds: Set<string>;
  likedIds: Set<string>;
  onOpenStory: (story: StoryItem) => void;
  onOpenNGO: (ngoId: string) => void;
  onToggleSaved: (storyId: string) => void;
  onToggleLiked: (storyId: string) => void;
  emptyText?: string;
  className?: string;
}

const StoryFeed: React.FC<StoryFeedProps> = ({
  stories,
  savedIds,
  likedIds,
  onOpenStory,
  onOpenNGO,
  onToggleSaved,
  onToggleLiked,
  emptyText = 'As primeiras histórias aparecerão aqui.',
  className = '',
}) => {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentIncrements, setCommentIncrements] = useState<Record<string, number>>({});
  const reduceMotion = useReducedMotion();
  const actionTransition = reduceMotion ? { duration: 0.01 } : STORY_ACTION_SPRING;
  const actionVisibilityTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.16, ease: [0.23, 1, 0.32, 1] as const };

  if (!stories.length) {
    return (
      <div className={'px-6 py-16 text-center text-sm text-muted-foreground ' + className}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={'overflow-hidden border-y border-brand-ink/10 bg-background/35 sm:border-x ' + className}>
      {stories.map((story, index) => {
        const liked = likedIds.has(story.id);
        const saved = savedIds.has(story.id);
        const commenting = activeCommentId === story.id;
        const commentCount = 3 + index + (commentIncrements[story.id] ?? 0);

        return (
          <article id={`story-${story.id}`} key={story.id} className='scroll-mt-24 border-b border-brand-ink/10 px-4 py-5 last:border-b-0 sm:px-6'>
            <header className='flex items-start gap-3'>
              <button
                type='button'
                onClick={() => onOpenNGO(story.ngoId)}
                className='shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'
              >
                <img
                  src={story.ngoImage}
                  alt={'Perfil de ' + story.ngoName}
                  className='h-11 w-11 rounded-full border border-brand-blue/15 object-cover'
                />
              </button>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-1.5 text-sm'>
                  <button
                    type='button'
                    onClick={() => onOpenNGO(story.ngoId)}
                    className='truncate font-bold text-brand-ink hover:underline'
                  >
                    {story.ngoName}
                  </button>
                  {story.verified && (
                    <ShieldCheck
                      size={15}
                      className='shrink-0 text-brand-blue'
                      aria-label='Organização verificada'
                    />
                  )}
                  <span className='text-muted-foreground'>· {storyAge(story.timestamp)}</span>
                  {story.simulated && (
                    <span className='rounded-full bg-brand-yellow/35 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-ink/75'>
                      Simulação
                    </span>
                  )}
                </div>
                <p className='mt-1 whitespace-pre-line text-[15px] leading-6 text-brand-ink/85'>
                  {story.caption || 'Uma nova atualização de impacto chegou.'}
                </p>
              </div>
              <button
                type='button'
                className='grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-ink'
                aria-label='Mais opções'
              >
                <MoreHorizontal size={19} />
              </button>
            </header>

            <button
              type='button'
              onClick={() => onOpenStory(story)}
              className='group relative ml-14 mt-3 block aspect-[16/10] w-[calc(100%_-_3.5rem)] overflow-hidden rounded-lg border border-brand-ink/10 bg-secondary text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'
            >
              {story.type === 'image' ? (
                <img
                  src={story.url}
                  alt={story.caption || 'História de impacto'}
                  className='h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]'
                />
              ) : (
                <>
                  <video src={story.url} className='h-full w-full object-cover' muted playsInline preload='metadata' />
                  <span className='absolute inset-0 grid place-items-center bg-brand-ink/15'>
                    <span className='grid h-12 w-12 place-items-center rounded-full bg-background/90 text-brand-blue shadow-lg'>
                      <Play size={21} className='ml-0.5 fill-current' />
                    </span>
                  </span>
                </>
              )}
            </button>

            <LayoutGroup id={'story-actions-' + story.id}>
              <motion.footer
                layout
                transition={actionTransition}
                className='ml-14 mt-3 flex min-w-0 items-center gap-1 overflow-visible text-muted-foreground sm:gap-2'
              >
                <AnimatePresence mode='popLayout' initial={false}>
                  {!commenting && (
                    <motion.div
                      key='like-action'
                      layout='position'
                      initial={{
                        opacity: 0,
                        transform: reduceMotion ? 'none' : 'scale(0.97)',
                      }}
                      animate={{ opacity: 1, transform: 'scale(1)' }}
                      exit={{
                        opacity: 0,
                        transform: reduceMotion ? 'none' : 'scale(0.97)',
                      }}
                      transition={actionVisibilityTransition}
                    >
                      <button
                        type='button'
                        onClick={() => onToggleLiked(story.id)}
                        aria-pressed={liked}
                        className={'relative inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-brand-blue/10 ' + (liked ? 'text-brand-blue' : '')}
                        aria-label={liked ? 'Remover curtida' : 'Curtir história'}
                      >
                        <BrandHeartReaction liked={liked} />
                        <span className='text-xs tabular-nums'>{24 + index * 7 + (liked ? 1 : 0)}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <MorphingCommentButton
                  count={commentCount}
                  comments={SIMULATED_COMMENTS}
                  expanded={commenting}
                  onExpandedChange={(expanded) => {
                    setActiveCommentId((current) => (
                      expanded ? story.id : current === story.id ? null : current
                    ));
                  }}
                  onSubmit={() => {
                    setCommentIncrements((current) => ({
                      ...current,
                      [story.id]: (current[story.id] ?? 0) + 1,
                    }));
                  }}
                />

                <AnimatePresence mode='popLayout' initial={false}>
                  {!commenting && (
                    <motion.div
                      key='sharing-actions'
                      layout='position'
                      initial={{
                        opacity: 0,
                        transform: reduceMotion ? 'none' : 'scale(0.97)',
                      }}
                      animate={{ opacity: 1, transform: 'scale(1)' }}
                      exit={{
                        opacity: 0,
                        transform: reduceMotion ? 'none' : 'scale(0.97)',
                      }}
                      transition={actionVisibilityTransition}
                      className='flex items-center gap-1 sm:gap-2'
                    >
                      <StoryShareSheet storyId={story.id} storyTitle={story.caption || `História de ${story.ngoName}`} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  layout='position'
                  type='button'
                  onClick={() => onToggleSaved(story.id)}
                  aria-pressed={saved}
                  transition={actionTransition}
                  className={'ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-brand-yellow/25 ' + (saved ? 'text-brand-blue' : '')}
                  aria-label={saved ? 'Remover dos salvos' : 'Salvar história'}
                >
                  <Bookmark size={19} className={saved ? 'fill-current' : ''} />
                </motion.button>
              </motion.footer>
            </LayoutGroup>
          </article>
        );
      })}
    </div>
  );
};

const Stories: React.FC<StoriesProps> = ({
  onOpenNGO,
  canTellStory = false,
  storytellerType = null,
  onTellStory,
}) => {
  const [discoveryLane, setDiscoveryLane] = useState<DiscoveryLane>('for-you');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState('');
  const [simulatedBatches, setSimulatedBatches] = useState(INITIAL_SIMULATED_BATCHES);
  const [expandProgress, setExpandProgress] = useState(0);
  const feedScrollerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const composerPlaceholder = storytellerType === 'donor'
    ? 'O que essa causa despertou ou transformou em você?'
    : storytellerType === 'ngo'
      ? 'O que mudou hoje na sua causa?'
      : 'Entre para compartilhar uma história.';

  const stories = useMemo<StoryItem[]>(
    () => demoNgos
      .flatMap((ngo) => ngo.posts.map((post) => ({
        ...post,
        ngoId: ngo.id,
        ngoName: ngo.name,
        ngoImage: ngo.image,
        verified: ngo.verified,
        simulated: true,
      })))
      .sort((a, b) => b.timestamp - a.timestamp),
    [],
  );

  const feedStories = useMemo(
    () => [
      ...stories,
      ...createSimulatedStories(stories, simulatedBatches * SIMULATED_BATCH_SIZE),
    ],
    [simulatedBatches, stories],
  );

  useEffect(() => {
    const root = feedScrollerRef.current;
    const sentinel = loadMoreRef.current;
    if (!root || !sentinel || typeof IntersectionObserver === 'undefined') return;

    let waitingForLayout = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || waitingForLayout) return;
      waitingForLayout = true;
      setSimulatedBatches((current) => current + 1);
      requestAnimationFrame(() => {
        waitingForLayout = false;
      });
    }, {
      root,
      rootMargin: '700px 0px',
      threshold: 0.01,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [discoveryLane]);

  const activeStory = activeIndex === null ? null : feedStories[activeIndex];
  const visibleStories = useMemo(() => {
    if (discoveryLane === 'following') return feedStories.filter((_, index) => index % 2 === 0);
    if (discoveryLane === 'saved') return feedStories.filter((story) => savedIds.has(story.id));
    return feedStories;
  }, [discoveryLane, feedStories, savedIds]);

  const toggleInSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openStory = (story: StoryItem) => {
    setActiveIndex(feedStories.findIndex((item) => item.id === story.id));
  };

  const move = (direction: -1 | 1) => {
    if (activeIndex === null || !feedStories.length) return;
    setActiveIndex((activeIndex + direction + feedStories.length) % feedStories.length);
  };

  return (
    <div className='w-full min-w-0 overflow-x-clip pb-24'>
      <section className='mx-auto max-w-3xl px-5 pb-8 pt-14 text-center sm:pb-12 sm:pt-20'>
        <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Histórias de impacto</p>
        <h1 className='mt-3 font-display text-4xl font-semibold leading-tight text-brand-ink sm:text-5xl'>
          Histórias aproximam quem transforma.
        </h1>
        <p className='font-narrative mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground'>
          Um só lugar para acompanhar mudanças reais e compartilhar como cada causa continua ganhando vida.
        </p>
      </section>

      <ScrollExpand
        contentPreview
        restingOverlay={<ScrollIdleCue active={expandProgress < 0.08} />}
        onProgressChange={setExpandProgress}
        startWidth={48}
        startHeight={48}
        startShape='circle'
        scrollDistance={0.68}
        holdDistance={0}
        smoothing={0.055}
        overlayScrim={0}
        useWindowScroll
        surround={<CircularStoryGallery items={feedStories} />}
      >
        <div ref={feedScrollerRef} className='h-full w-full overflow-y-hidden bg-background text-brand-ink'>
          <header className='sticky top-0 z-20 border-b border-brand-ink/10 bg-background/95 backdrop-blur-xl'>
            <div className='mx-auto flex min-h-16 max-w-2xl items-center gap-3 px-4 sm:px-6'>
              <span className='grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-yellow text-brand-ink'>
                <PenLine size={17} />
              </span>
              <div className='min-w-0'>
                <p className='truncate font-display text-lg font-semibold'>Histórias</p>
                <p className='text-xs text-muted-foreground'>Impactos e vozes da comunidade</p>
              </div>
            </div>
          </header>

          <main className='mx-auto w-full max-w-2xl px-3 pb-28 pt-5 sm:px-5'>
            <section className='overflow-hidden rounded-lg border border-brand-ink/10 bg-background shadow-sm' aria-label='Compartilhar uma história'>
              <div className='flex items-start gap-3 p-4 sm:p-5'>
                <div className='grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-blue/10 text-brand-blue'>
                  <PenLine size={18} />
                </div>
                <div className='min-w-0 flex-1'>
                  <label htmlFor='story-composer' className='sr-only'>Conte uma nova história</label>
                  <textarea
                    id='story-composer'
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={composerPlaceholder}
                    disabled={!canTellStory}
                    rows={2}
                    className='w-full resize-none bg-transparent text-[15px] leading-6 text-brand-ink outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'
                  />
                  <div className='mt-3 flex items-center justify-between border-t border-brand-ink/10 pt-3'>
                    <div className='flex items-center gap-1 text-brand-blue'>
                      <button type='button' onClick={onTellStory} className='grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-brand-blue/10' aria-label='Adicionar imagem'>
                        <ImageIcon size={19} />
                      </button>
                      <button type='button' onClick={onTellStory} className='grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-brand-blue/10' aria-label='Adicionar vídeo'>
                        <Video size={19} />
                      </button>
                    </div>
                    <button type='button' onClick={onTellStory} className='inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-blue px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(55,181,247,0.24)] transition-transform hover:-translate-y-0.5'>
                      {canTellStory ? 'Publicar' : 'Entrar'} <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className='mt-6 border-b border-brand-ink/10' role='tablist' aria-label='Formas de navegar pelas histórias'>
              <div className='grid grid-cols-3'>
                {DISCOVERY_LANES.map((lane) => {
                  const active = discoveryLane === lane.id;
                  return (
                    <button
                      key={lane.id}
                      type='button'
                      role='tab'
                      aria-selected={active}
                      onClick={() => setDiscoveryLane(lane.id)}
                      className={'relative min-h-12 px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue ' + (active ? 'text-brand-ink' : 'text-muted-foreground hover:text-brand-ink')}
                    >
                      {lane.label}
                      {active && (
                        <motion.span
                          layoutId='story-discovery-lane'
                          className='absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-blue'
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <section className='mt-5' aria-live='polite'>
              <StoryFeed
                stories={visibleStories}
                savedIds={savedIds}
                likedIds={likedIds}
                onOpenStory={openStory}
                onOpenNGO={onOpenNGO}
                onToggleSaved={(id) => toggleInSet(setSavedIds, id)}
                onToggleLiked={(id) => toggleInSet(setLikedIds, id)}
                emptyText={discoveryLane === 'saved'
                  ? 'As histórias que você salvar aparecerão aqui.'
                  : 'Novas histórias estão a caminho.'}
                className='rounded-lg'
              />
              {discoveryLane !== 'saved' && (
                <div
                  ref={loadMoreRef}
                  className='grid min-h-24 place-items-center text-brand-blue'
                  role='status'
                  aria-label='Carregando mais histórias'
                >
                  <LoaderCircle size={22} className='animate-spin' aria-hidden='true' />
                </div>
              )}
            </section>
          </main>
        </div>
      </ScrollExpand>

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
              {feedStories.map((story, index) => (
                <span
                  key={story.id}
                  className={'h-1 flex-1 rounded-full ' + (index <= (activeIndex ?? 0) ? 'bg-background' : 'bg-background/25')}
                />
              ))}
            </div>
            <button
              type='button'
              onClick={() => setActiveIndex(null)}
              className='absolute right-4 top-8 grid h-10 w-10 place-items-center rounded-full bg-background text-brand-blue'
              aria-label='Fechar história'
            >
              <X size={19} />
            </button>
            {feedStories.length > 1 && (
              <>
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    move(-1);
                  }}
                  className='absolute left-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:left-8'
                  aria-label='História anterior'
                >
                  <ChevronLeft />
                </button>
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    move(1);
                  }}
                  className='absolute right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:right-8'
                  aria-label='Próxima história'
                >
                  <ChevronRight />
                </button>
              </>
            )}
            <motion.div
              key={activeStory.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className='relative h-[78vh] w-full max-w-md overflow-hidden rounded-lg bg-black shadow-2xl'
              onClick={(event) => event.stopPropagation()}
            >
              {activeStory.type === 'image' ? (
                <img src={activeStory.url} alt='' className='h-full w-full object-contain' />
              ) : (
                <video src={activeStory.url} className='h-full w-full object-contain' controls autoPlay playsInline />
              )}
              <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-20 text-white'>
                <button type='button' onClick={() => onOpenNGO(activeStory.ngoId)} className='flex items-center gap-3 text-left'>
                  <img src={activeStory.ngoImage} alt='' className='h-11 w-11 rounded-full border-2 border-white object-cover' />
                  <span>
                    <span className='flex items-center gap-1.5 font-bold'>
                      {activeStory.ngoName}
                      {activeStory.verified && <ShieldCheck size={15} className='text-brand-yellow' />}
                    </span>
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
