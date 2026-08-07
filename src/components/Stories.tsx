import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Play,
  Repeat2,
  Send,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
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
}

type StoryPath = 'discover' | 'tell';
type DiscoveryLane = 'for-you' | 'following' | 'saved';

const DISCOVERY_LANES: Array<{ id: DiscoveryLane; label: string }> = [
  { id: 'for-you', label: 'Para você' },
  { id: 'following', label: 'Seguindo' },
  { id: 'saved', label: 'Salvas' },
];

const storyAge = (timestamp: number) => {
  const hours = Math.max(1, Math.round((Date.now() - timestamp) / 3_600_000));
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};

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
  if (!stories.length) {
    return <div className={`px-6 py-16 text-center text-sm text-muted-foreground ${className}`}>{emptyText}</div>;
  }

  return (
    <div className={`overflow-hidden border-y border-brand-ink/10 bg-background/35 sm:border-x ${className}`}>
      {stories.map((story, index) => {
        const liked = likedIds.has(story.id);
        const saved = savedIds.has(story.id);
        return (
          <article key={story.id} className='border-b border-brand-ink/10 px-4 py-5 last:border-b-0 sm:px-6'>
            <header className='flex items-start gap-3'>
              <button type='button' onClick={() => onOpenNGO(story.ngoId)} className='shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
                <img src={story.ngoImage} alt={`Perfil de ${story.ngoName}`} className='h-11 w-11 rounded-full border border-brand-blue/15 object-cover' />
              </button>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-1.5 text-sm'>
                  <button type='button' onClick={() => onOpenNGO(story.ngoId)} className='truncate font-bold text-brand-ink hover:underline'>{story.ngoName}</button>
                  {story.verified && <ShieldCheck size={15} className='shrink-0 text-brand-blue' aria-label='Organização verificada' />}
                  <span className='text-muted-foreground'>· {storyAge(story.timestamp)}</span>
                </div>
                <p className='mt-1 whitespace-pre-line text-[15px] leading-6 text-brand-ink/85'>{story.caption || 'Uma nova atualização de impacto chegou.'}</p>
              </div>
              <button type='button' className='grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-ink' aria-label='Mais opções'>
                <MoreHorizontal size={19} />
              </button>
            </header>

            <button type='button' onClick={() => onOpenStory(story)} className='group relative ml-14 mt-3 block aspect-[16/10] w-[calc(100%-3.5rem)] overflow-hidden rounded-lg border border-brand-ink/10 bg-secondary text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
              {story.type === 'image' ? (
                <img src={story.url} alt={story.caption || 'História de impacto'} className='h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]' />
              ) : (
                <>
                  <video src={story.url} className='h-full w-full object-cover' muted playsInline preload='metadata' />
                  <span className='absolute inset-0 grid place-items-center bg-brand-ink/15'><span className='grid h-12 w-12 place-items-center rounded-full bg-background/90 text-brand-blue shadow-lg'><Play size={21} className='ml-0.5 fill-current' /></span></span>
                </>
              )}
            </button>

            <footer className='ml-14 mt-3 flex items-center justify-between text-muted-foreground'>
              <div className='flex items-center gap-1 sm:gap-3'>
                <button type='button' onClick={() => onToggleLiked(story.id)} aria-pressed={liked} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 transition-colors hover:bg-brand-blue/10 ${liked ? 'text-brand-blue' : ''}`} aria-label={liked ? 'Remover curtida' : 'Curtir história'}>
                  <Heart size={19} className={liked ? 'fill-current' : ''} /><span className='text-xs tabular-nums'>{24 + index * 7 + (liked ? 1 : 0)}</span>
                </button>
                <button type='button' className='inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue' aria-label='Comentar'><MessageCircle size={19} /><span className='text-xs'>{3 + index}</span></button>
                <button type='button' className='hidden min-h-10 items-center gap-1.5 rounded-full px-2 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue sm:inline-flex' aria-label='Recompartilhar'><Repeat2 size={19} /></button>
                <button type='button' className='grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-brand-blue/10 hover:text-brand-blue' aria-label='Compartilhar'><Send size={18} /></button>
              </div>
              <button type='button' onClick={() => onToggleSaved(story.id)} aria-pressed={saved} className={`grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-brand-yellow/25 ${saved ? 'text-brand-blue' : ''}`} aria-label={saved ? 'Remover dos salvos' : 'Salvar história'}>
                <Bookmark size={19} className={saved ? 'fill-current' : ''} />
              </button>
            </footer>
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
  const reducedMotion = useReducedMotion();
  const [storyPath, setStoryPath] = useState<StoryPath>('discover');
  const [discoveryLane, setDiscoveryLane] = useState<DiscoveryLane>('for-you');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState('');
  const isDonorStoryteller = canTellStory && storytellerType === 'donor';
  const storytellerCopy = isDonorStoryteller
    ? {
        eyebrow: 'Para quem apoia',
        title: 'Conte como uma causa encontrou lugar na sua história.',
        description: 'Compartilhe encontros, escolhas e transformações com outras pessoas que também querem fazer parte.',
        action: 'Abrir meu perfil',
        placeholder: 'O que essa causa despertou ou transformou em você?',
      }
    : canTellStory
      ? {
          eyebrow: 'Para organizações',
          title: 'Conte como o apoio virou impacto.',
          description: 'Compartilhe atualizações, fotos e vídeos com uma comunidade que escolheu acompanhar a causa.',
          action: 'Abrir perfil da ONG',
          placeholder: 'O que mudou hoje na sua causa?',
        }
      : {
          eyebrow: 'Para toda a comunidade',
          title: 'Toda pessoa pode fazer parte de uma história de impacto.',
          description: 'Entre como doador ou organização para compartilhar uma experiência, uma conquista ou uma transformação.',
          action: 'Entrar para contar uma história',
          placeholder: 'Entre para compartilhar uma história.',
        };
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
  const visibleStories = useMemo(() => {
    if (discoveryLane === 'following') return stories.filter((_, index) => index % 2 === 0);
    if (discoveryLane === 'saved') return stories.filter((story) => savedIds.has(story.id));
    return stories;
  }, [discoveryLane, savedIds, stories]);

  const toggleInSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openStory = (story: StoryItem) => setActiveIndex(stories.findIndex((item) => item.id === story.id));

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
            className={`absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%_-_6px)] rounded-lg transition-[transform,background-color,box-shadow] duration-500 ${storyPath === 'tell' ? 'translate-x-full bg-brand-yellow shadow-[0_8px_22px_rgba(255,211,67,0.28),inset_0_1px_0_rgba(255,255,255,0.6)]' : 'translate-x-0 bg-brand-blue shadow-[0_8px_22px_rgba(55,181,247,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          <button
            id='story-path-discover'
            type='button'
            role='tab'
            aria-selected={storyPath === 'discover'}
            aria-controls='story-panel-discover'
            onClick={() => setStoryPath('discover')}
            className={`relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 sm:gap-2 sm:px-3 sm:text-sm ${storyPath === 'discover' ? 'text-white' : 'text-brand-ink/70'}`}
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
            className={`relative z-10 flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 sm:gap-2 sm:px-3 sm:text-sm ${storyPath === 'tell' ? 'text-brand-ink' : 'text-brand-ink/70'}`}
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

            <div className='mx-auto mt-8 max-w-2xl border-b border-brand-ink/10' role='tablist' aria-label='Formas de navegar pelas histórias'>
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
                      className={`relative min-h-12 px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue ${active ? 'text-brand-ink' : 'text-muted-foreground hover:text-brand-ink'}`}
                    >
                      {lane.label}
                      {active && <motion.span layoutId='story-discovery-lane' className='absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-blue' transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <section className='mx-auto mt-5 max-w-2xl' aria-live='polite'>
              <StoryFeed
                stories={visibleStories}
                savedIds={savedIds}
                likedIds={likedIds}
                onOpenStory={openStory}
                onOpenNGO={onOpenNGO}
                onToggleSaved={(id) => toggleInSet(setSavedIds, id)}
                onToggleLiked={(id) => toggleInSet(setLikedIds, id)}
                emptyText={discoveryLane === 'saved' ? 'As histórias que você salvar aparecerão aqui.' : 'Novas histórias estão a caminho.'}
              />
            </section>
          </motion.div>
        ) : (
          <motion.section
            key='tell'
            id='story-panel-tell'
            role='tabpanel'
            aria-labelledby='story-path-tell'
            className='mt-12 grid min-h-[65vh] items-start gap-10 border-y border-brand-blue/15 py-12 lg:grid-cols-[260px_minmax(0,680px)] lg:justify-center lg:py-16'
            {...panelMotion}
            transition={{ duration: reducedMotion ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <aside className='max-w-xl lg:sticky lg:top-28'>
              <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>{storytellerCopy.eyebrow}</p>
              <h1 className='mt-3 font-display text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl'>{storytellerCopy.title}</h1>
              <p className='font-narrative mt-5 text-lg leading-8 text-muted-foreground'>{storytellerCopy.description}</p>
              <button
                type='button'
                onClick={onTellStory}
                className='tc-button-3d mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue'
              >
                {storytellerCopy.action}
                <ArrowRight size={18} />
              </button>
            </aside>

            <main className='min-w-0 overflow-hidden border-y border-brand-ink/10 bg-background/35 sm:rounded-lg sm:border-x'>
              <div className='border-b border-brand-ink/10 p-4 sm:p-6'>
                <div className='flex items-start gap-3'>
                  <div className='grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-yellow text-brand-ink'><PenLine size={19} /></div>
                  <div className='min-w-0 flex-1'>
                    <label htmlFor='story-composer' className='sr-only'>Conte uma nova história</label>
                    <textarea
                      id='story-composer'
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={storytellerCopy.placeholder}
                      disabled={!canTellStory}
                      rows={3}
                      className='w-full resize-none bg-transparent text-[15px] leading-6 text-brand-ink outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'
                    />
                    <div className='mt-3 flex items-center justify-between border-t border-brand-ink/10 pt-3'>
                      <div className='flex items-center gap-1 text-brand-blue'>
                        <button type='button' onClick={onTellStory} className='grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-brand-blue/10' aria-label='Adicionar imagem'><ImageIcon size={19} /></button>
                        <button type='button' onClick={onTellStory} className='grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-brand-blue/10' aria-label='Adicionar vídeo'><Video size={19} /></button>
                      </div>
                      <button type='button' onClick={onTellStory} className='inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-blue px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(55,181,247,0.24)] transition-transform hover:-translate-y-0.5'>
                        Publicar <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <StoryFeed
                stories={stories}
                savedIds={savedIds}
                likedIds={likedIds}
                onOpenStory={openStory}
                onOpenNGO={onOpenNGO}
                onToggleSaved={(id) => toggleInSet(setSavedIds, id)}
                onToggleLiked={(id) => toggleInSet(setLikedIds, id)}
                className='border-0 bg-transparent'
              />
            </main>
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
