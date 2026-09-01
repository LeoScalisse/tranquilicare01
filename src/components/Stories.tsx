import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, ChevronLeft, ChevronRight, LoaderCircle, Play, X } from 'lucide-react';
import { toast } from 'sonner';

import CircularStoryGallery from '@/components/ui/circular-story-gallery';
import ScrollExpand from '@/components/ui/scroll-expand';
import ScrollIdleCue from '@/components/ui/scroll-idle-cue';
import StoryComposerFab from '@/components/ui/story-composer-fab';
import StoryReportMenu from '@/components/ui/story-report-menu';
import StoryShareSheet from '@/components/ui/story-share-sheet';
import founderSeal from '@/assets/founder-ngo-seal.png';
import { demoNgos } from '@/data/demoNgos';
import {
  loadPublishedStories,
  loadStoryViewerState,
  publishStory,
  reportStory,
  setStorySaved,
  storyErrorMessage,
  type PublishedStory,
} from '@/lib/stories';

interface StoriesProps {
  onOpenNGO: (ngoId: string) => void;
  canTellStory?: boolean;
  onTellStory?: () => void;
}

interface StoryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption: string;
  timestamp: number;
  ngoId: string | null;
  ngoName: string;
  ngoImage: string;
  isFounder?: boolean;
  persisted?: boolean;
}

type DiscoveryLane = 'for-you' | 'saved';

const DISCOVERY_LANES: Array<{ id: DiscoveryLane; label: string }> = [
  { id: 'for-you', label: 'Para você' },
  { id: 'saved', label: 'Salvas' },
];

const DEMO_BATCH_SIZE = 6;
const INITIAL_DEMO_BATCHES = 2;
const DEMO_EPOCH = Date.now();
const DEMO_CAPTIONS = [
  'Mais uma etapa concluída com a participação de voluntários e pessoas da comunidade.',
  'Os recursos recebidos ajudaram a manter o cuidado chegando a quem mais precisa.',
  'Um novo encontro transformou apoio em escuta, presença e possibilidades.',
  'A equipe compartilhou os avanços da semana e os próximos passos desta causa.',
  'Pequenas contribuições se encontraram para tornar esta ação possível.',
  'Hoje foi dia de acolher pessoas e preparar a próxima atividade.',
];

const formatTimestamp = (timestamp: number) => {
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 60) return `${elapsedMinutes} min`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} h`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} d`;
};

const demoStories = (): StoryItem[] => demoNgos
  .flatMap((ngo) => ngo.posts.map((post) => ({
    id: post.id,
    url: post.url,
    type: post.type,
    caption: post.caption ?? '',
    timestamp: post.timestamp,
    ngoId: ngo.id,
    ngoName: ngo.name,
    ngoImage: ngo.image,
    isFounder: ngo.isFounder === true,
    persisted: false,
  })))
  .sort((a, b) => b.timestamp - a.timestamp);

const extendDemoStories = (base: StoryItem[], count: number): StoryItem[] => {
  if (!base.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const source = base[index % base.length];
    return {
      ...source,
      id: `demo-feed-${index}-${source.id}`,
      caption: DEMO_CAPTIONS[index % DEMO_CAPTIONS.length],
      timestamp: DEMO_EPOCH - (index + base.length + 1) * 1000 * 60 * 47,
      persisted: false,
    };
  });
};

interface StoryFeedProps {
  stories: StoryItem[];
  savedIds: Set<string>;
  canInteract: boolean;
  onOpenStory: (story: StoryItem) => void;
  onOpenNGO: (ngoId: string) => void;
  onToggleSaved: (story: StoryItem) => void;
  onReport: (story: StoryItem, reason: string) => Promise<void>;
  onRequireAuth: () => void;
  emptyText: string;
}

const StoryFeed: React.FC<StoryFeedProps> = ({
  stories,
  savedIds,
  canInteract,
  onOpenStory,
  onOpenNGO,
  onToggleSaved,
  onReport,
  onRequireAuth,
  emptyText,
}) => {
  const reduceMotion = useReducedMotion();
  if (!stories.length) return <p className='py-16 text-center text-sm text-muted-foreground'>{emptyText}</p>;

  return (
    <div className='divide-y divide-brand-ink/10 overflow-hidden rounded-[24px] border border-brand-ink/10 bg-background'>
      {stories.map((story, index) => {
        const saved = savedIds.has(story.id);
        return (
          <motion.article
            id={`story-${story.id}`}
            key={story.id}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '120px 0px' }}
            transition={{ duration: reduceMotion ? 0.01 : 0.38, delay: Math.min(index * 0.025, 0.12), ease: [0.22, 1, 0.36, 1] }}
            className='px-3 py-5 sm:px-5'
          >
            <header className='flex items-start gap-3'>
              <button type='button' disabled={!story.ngoId} onClick={() => story.ngoId && onOpenNGO(story.ngoId)} className='shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 disabled:cursor-default'>
                <img src={story.ngoImage} alt='' className='h-11 w-11 rounded-full border border-brand-ink/10 bg-secondary object-cover' />
              </button>
              <div className='min-w-0 flex-1 pt-0.5'>
                <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
                  <button type='button' disabled={!story.ngoId} onClick={() => story.ngoId && onOpenNGO(story.ngoId)} className='max-w-full truncate text-left text-sm font-bold text-brand-ink hover:text-brand-blue disabled:cursor-default disabled:hover:text-brand-ink'>{story.ngoName}</button>
                  {story.isFounder && <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-yellow/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-brand-ink' title='ONG fundadora'><img src={founderSeal} alt='' className='h-3.5 w-3.5 object-contain' />ONG fundadora</span>}
                </div>
                <span className='block text-xs text-muted-foreground'>{formatTimestamp(story.timestamp)}</span>
              </div>
              <StoryReportMenu canReport={canInteract} onRequireAuth={onRequireAuth} onReport={(reason) => onReport(story, reason)} />
            </header>

            {story.caption && <p className='ml-14 mt-1.5 pr-2 text-[15px] leading-6 text-brand-ink/80'>{story.caption}</p>}

            <button type='button' onClick={() => onOpenStory(story)} className='group relative ml-14 mt-3 block w-[calc(100%_-_3.5rem)] overflow-hidden rounded-[20px] border border-brand-ink/10 bg-secondary text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
              {story.type === 'image' ? (
                <img src={story.url} alt={story.caption || `História de ${story.ngoName}`} loading='lazy' decoding='async' className='block max-h-[38rem] w-full object-cover' />
              ) : (
                <div className='relative aspect-[16/10] w-full'>
                  <video src={story.url} className='h-full w-full object-cover' muted playsInline preload='metadata' />
                  <span className='absolute inset-0 grid place-items-center bg-brand-ink/15'><span className='grid h-12 w-12 place-items-center rounded-full bg-background/90 text-brand-blue shadow-lg'><Play size={21} className='ml-0.5 fill-current' /></span></span>
                </div>
              )}
            </button>

            <footer className='ml-14 mt-3 flex min-w-0 items-center justify-center gap-5 text-muted-foreground'>
              <StoryShareSheet storyId={story.id} storyTitle={story.caption || `História de ${story.ngoName}`} />
              <button type='button' onClick={() => onToggleSaved(story)} aria-pressed={saved} className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] transition-colors hover:bg-brand-yellow/25 ${saved ? 'text-brand-blue' : ''}`} aria-label={saved ? 'Remover dos salvos' : 'Salvar história'}>
                <Bookmark size={19} className={saved ? 'fill-current' : ''} />
              </button>
            </footer>
          </motion.article>
        );
      })}
    </div>
  );
};

const Stories: React.FC<StoriesProps> = ({ onOpenNGO, canTellStory = false, onTellStory }) => {
  const [discoveryLane, setDiscoveryLane] = useState<DiscoveryLane>('for-you');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [realStories, setRealStories] = useState<PublishedStory[]>([]);
  const [loadingRealStories, setLoadingRealStories] = useState(true);
  const [demoBatches, setDemoBatches] = useState(INITIAL_DEMO_BATCHES);
  const [expandProgress, setExpandProgress] = useState(0);
  const feedScrollerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const baseDemoStories = useMemo(demoStories, []);

  const refreshStories = async () => {
    const stories = await loadPublishedStories();
    setRealStories(stories);
    return stories;
  };

  useEffect(() => {
    let active = true;
    void Promise.all([loadPublishedStories(), loadStoryViewerState()])
      .then(([stories, viewer]) => {
        if (!active) return;
        setRealStories(stories);
        setSavedIds(viewer.savedStoryIds);
        setReportedIds(viewer.reportedStoryIds);
      })
      .catch(() => {
        if (active) toast.error('Não foi possível carregar as histórias reais agora.');
      })
      .finally(() => {
        if (active) setLoadingRealStories(false);
      });
    return () => { active = false; };
  }, []);

  const usingDemoFallback = !loadingRealStories && realStories.length === 0;
  const feedStories = useMemo<StoryItem[]>(() => {
    if (realStories.length) return realStories;
    return [...baseDemoStories, ...extendDemoStories(baseDemoStories, demoBatches * DEMO_BATCH_SIZE)];
  }, [baseDemoStories, demoBatches, realStories]);

  useEffect(() => {
    if (!usingDemoFallback) return undefined;
    const root = feedScrollerRef.current;
    const sentinel = loadMoreRef.current;
    if (!root || !sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    let waitingForLayout = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || waitingForLayout) return;
      waitingForLayout = true;
      setDemoBatches((current) => current + 1);
      requestAnimationFrame(() => { waitingForLayout = false; });
    }, { root, rootMargin: '700px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [discoveryLane, usingDemoFallback]);

  const availableStories = useMemo(() => feedStories.filter((story) => !reportedIds.has(story.id)), [feedStories, reportedIds]);
  const activeStory = activeIndex === null ? null : availableStories[activeIndex];
  const visibleStories = useMemo(() => {
    if (discoveryLane === 'saved') return availableStories.filter((story) => savedIds.has(story.id));
    return availableStories;
  }, [availableStories, discoveryLane, savedIds]);

  const openStory = (story: StoryItem) => setActiveIndex(availableStories.findIndex((item) => item.id === story.id));
  const move = (direction: -1 | 1) => {
    if (activeIndex === null || !availableStories.length) return;
    setActiveIndex((activeIndex + direction + availableStories.length) % availableStories.length);
  };

  const requireAuth = () => {
    toast.info('Entre para continuar.');
    onTellStory?.();
  };

  const handleToggleSaved = async (story: StoryItem) => {
    if (!canTellStory) {
      requireAuth();
      return;
    }
    const nextSaved = !savedIds.has(story.id);
    setSavedIds((current) => {
      const next = new Set(current);
      if (nextSaved) next.add(story.id); else next.delete(story.id);
      return next;
    });
    try {
      await setStorySaved(story.id, nextSaved);
    } catch {
      setSavedIds((current) => {
        const next = new Set(current);
        if (nextSaved) next.delete(story.id); else next.add(story.id);
        return next;
      });
      toast.error('Não foi possível atualizar as histórias salvas.');
    }
  };

  const handleReport = async (story: StoryItem, reason: string) => {
    await reportStory(story.id, reason);
    toast.success('Recebemos sua denúncia. O time do TranquiliCare vai investigar.');
    setActiveIndex(null);
    setReportedIds((current) => new Set(current).add(story.id));
  };

  const handlePublish = async (body: string, image: File | null) => {
    try {
      await publishStory(body, image);
      await refreshStories();
      toast.success('História publicada.');
    } catch (error) {
      throw new Error(storyErrorMessage(error));
    }
  };

  const unavailableComposer = () => {
    requireAuth();
  };

  return (
    <div className='w-full min-w-0 overflow-x-clip pb-24'>
      <section className='mx-auto w-full min-w-0 max-w-3xl overflow-hidden px-5 pb-8 pt-14 text-center sm:pb-12 sm:pt-20'>
        <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Histórias de impacto</p>
        <h1 className='mx-auto mt-3 max-w-full break-words font-display text-[2rem] font-semibold leading-tight text-brand-ink sm:text-5xl'>Histórias que aproximam.</h1>
        <p className='font-narrative mx-auto mt-4 max-w-[22rem] break-words text-base leading-7 text-muted-foreground sm:max-w-2xl sm:text-lg sm:leading-8'>Conheça de perto as pessoas, os momentos e as causas que estão acontecendo por aqui.</p>
      </section>

      <ScrollExpand contentPreview restingOverlay={<ScrollIdleCue active={expandProgress < 0.08} />} onProgressChange={setExpandProgress} startWidth={48} startHeight={48} startShape='circle' scrollDistance={0.68} holdDistance={0} smoothing={0.055} overlayScrim={0} useWindowScroll surround={<CircularStoryGallery items={availableStories} />}>
        <div ref={feedScrollerRef} className='h-full w-full overflow-y-hidden bg-background text-brand-ink'>
          <main className='mx-auto w-full max-w-2xl px-3 pb-28 pt-8 sm:px-5 sm:pt-10'>
            <div className='border-b border-brand-ink/10' role='tablist' aria-label='Formas de navegar pelas histórias'>
              <div className='grid grid-cols-2'>
                {DISCOVERY_LANES.map((lane) => {
                  const active = discoveryLane === lane.id;
                  return (
                    <button key={lane.id} type='button' role='tab' aria-selected={active} onClick={() => setDiscoveryLane(lane.id)} className={`relative min-h-12 px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue ${active ? 'text-brand-ink' : 'text-muted-foreground hover:text-brand-ink'}`}>
                      {lane.label}
                      {active && <motion.span layoutId='story-discovery-lane' className='absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-blue' transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <section className='mt-5' aria-live='polite'>
              {loadingRealStories ? (
                <div className='grid min-h-52 place-items-center text-brand-blue' role='status' aria-label='Carregando histórias'><LoaderCircle size={22} className='animate-spin' /></div>
              ) : (
                <StoryFeed stories={visibleStories} savedIds={savedIds} canInteract={canTellStory} onOpenStory={openStory} onOpenNGO={onOpenNGO} onToggleSaved={handleToggleSaved} onReport={handleReport} onRequireAuth={requireAuth} emptyText={discoveryLane === 'saved' ? 'As histórias que você salvar aparecerão aqui.' : 'Novas histórias estão a caminho.'} />
              )}
              {usingDemoFallback && discoveryLane !== 'saved' && <div ref={loadMoreRef} className='grid min-h-24 place-items-center text-brand-blue' role='status' aria-label='Carregando mais histórias'><LoaderCircle size={22} className='animate-spin' aria-hidden='true' /></div>}
            </section>
          </main>
        </div>
      </ScrollExpand>

      <StoryComposerFab visible canPublish={canTellStory} onUnavailable={unavailableComposer} onPublish={handlePublish} />

      <AnimatePresence>
        {activeStory && (
          <motion.div className='fixed inset-0 z-[130] grid place-items-center bg-brand-ink/95 p-3 backdrop-blur-md' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveIndex(null)}>
            <div className='absolute left-4 right-4 top-4 flex gap-1'>{availableStories.map((story, index) => <span key={story.id} className={`h-1 flex-1 rounded-full ${index <= (activeIndex ?? 0) ? 'bg-background' : 'bg-background/25'}`} />)}</div>
            <button type='button' onClick={() => setActiveIndex(null)} className='absolute right-4 top-8 grid h-10 w-10 place-items-center rounded-full bg-background text-brand-blue' aria-label='Fechar história'><X size={19} /></button>
            {availableStories.length > 1 && <><button type='button' onClick={(event) => { event.stopPropagation(); move(-1); }} className='absolute left-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:left-8' aria-label='História anterior'><ChevronLeft /></button><button type='button' onClick={(event) => { event.stopPropagation(); move(1); }} className='absolute right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:right-8' aria-label='Próxima história'><ChevronRight /></button></>}
            <motion.div key={activeStory.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className='relative h-[78vh] w-full max-w-md overflow-hidden rounded-[26px] bg-black shadow-2xl' onClick={(event) => event.stopPropagation()}>
              {activeStory.type === 'image' ? <img src={activeStory.url} alt='' className='h-full w-full object-contain' /> : <video src={activeStory.url} className='h-full w-full object-contain' controls autoPlay playsInline />}
              <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-20 text-white'>
                <button type='button' disabled={!activeStory.ngoId} onClick={() => activeStory.ngoId && onOpenNGO(activeStory.ngoId)} className='flex items-center gap-3 text-left disabled:cursor-default'><img src={activeStory.ngoImage} alt='' className='h-11 w-11 rounded-full border-2 border-white object-cover' /><span><span className='flex flex-wrap items-center gap-2 font-bold'>{activeStory.ngoName}{activeStory.isFounder && <img src={founderSeal} alt='ONG fundadora' className='h-5 w-5 object-contain' />}</span><span className='mt-1 block text-sm text-white/75'>{activeStory.caption}</span></span></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stories;
