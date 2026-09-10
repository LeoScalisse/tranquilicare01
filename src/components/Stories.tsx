import StoryBody from '@/components/ui/story-body';
import { ngoCategories } from '@/data/ngoCategories';
import './stories-feed.css';
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, ChevronLeft, ChevronRight, LoaderCircle, Play, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import CircularStoryGallery from '@/components/ui/circular-story-gallery';
import ScrollExpand from '@/components/ui/scroll-expand';
import ScrollIdleCue from '@/components/ui/scroll-idle-cue';
import StoryComposerFab from '@/components/ui/story-composer-fab';
import BrandLikeButton from '@/components/ui/brand-like-button';
import SocialStoryEmbed from '@/components/ui/social-story-embed';
import StoryReportMenu from '@/components/ui/story-report-menu';
import StoryShareSheet from '@/components/ui/story-share-sheet';
import { SmoothInput } from '@/components/ui/smooth-input';
import founderSeal from '@/assets/founder-ngo-seal.png';
import { curatedStoryMedia } from '@/data/curatedStoryMedia';
import { demoNgos } from '@/data/demoNgos';
import { loadPublicStoryImages, type PublicStoryImage } from '@/lib/publicStoryImages';
import {
  deleteOwnStory,
  loadPublishedStories,
  loadStoryViewerState,
  publishStory,
  reportStory,
  setStoryLiked,
  setStorySaved,
  storyErrorMessage,
  type PublishedStory,
} from '@/lib/stories';
import { demoDataEnabled } from '@/lib/demoData';
import type { StoryAttribution, StoryPresentationType } from '@/types/storyPresentation';

interface StoriesProps {
  onOpenNGO: (ngoId: string) => void;
  onOpenProfile?: (profileId: string) => void;
  canTellStory?: boolean;
  onTellStory?: () => void;
  onPreviewActiveChange?: (active: boolean) => void;
}

interface StoryItem {
  category?: string | null;
  id: string;
  url: string;
  type: StoryPresentationType;
  caption: string;
  timestamp: number;
  ngoId: string | null;
  authorProfileId?: string | null;
  ngoName: string;
  ngoImage: string;
  isFounder?: boolean;
  persisted?: boolean;
  attribution?: StoryAttribution;
}

type DiscoveryLane = 'for-you' | 'saved';

const DISCOVERY_LANES: Array<{ id: DiscoveryLane; label: string }> = [
  { id: 'for-you', label: 'Para você' },
  { id: 'saved', label: 'Salvas' },
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

const publicImageStories = (images: PublicStoryImage[]): StoryItem[] => images.map((image, index) => ({
  id: `openverse-${image.id}`,
  url: image.imageUrl,
  type: 'image',
  caption: image.title,
  timestamp: Date.now() - (index + curatedStoryMedia.length + 1) * 60_000,
  ngoId: null,
  ngoName: 'Acervo aberto',
  ngoImage: '/images/tranquilicare-heart-transparent.png',
  persisted: false,
  attribution: image.attribution,
}));

interface StoryFeedProps {
  stories: StoryItem[];
  savedIds: Set<string>;
  likedIds: Set<string>;
  canInteract: boolean;
  currentProfileId: string | null;
  onOpenStory: (story: StoryItem) => void;
  onOpenNGO: (ngoId: string) => void;
  onOpenProfile?: (profileId: string) => void;
  onToggleSaved: (story: StoryItem) => void;
  onToggleLike: (story: StoryItem) => void;
  onDelete: (story: StoryItem) => Promise<void>;
  onReport: (story: StoryItem, reason: string) => Promise<void>;
  onRequireAuth: () => void;
  emptyText: string;
}

export const StoryFeed: React.FC<StoryFeedProps> = ({
  stories,
  savedIds,
  likedIds,
  canInteract,
  currentProfileId,
  onOpenStory,
  onOpenNGO,
  onOpenProfile,
  onToggleSaved,
  onToggleLike,
  onDelete,
  onReport,
  onRequireAuth,
  emptyText,
}) => {
  if (!stories.length) return <p className='py-16 text-center text-sm text-muted-foreground'>{emptyText}</p>;

  return (
    <div className='space-y-4'>
      {stories.map((story) => {
        const category = ngoCategories.find((item) => item.id === story.category);
        const saved = savedIds.has(story.id);
        const liked = likedIds.has(story.id);
        const canOpenAuthor = Boolean(story.ngoId || story.authorProfileId);
        const canDelete = Boolean(story.persisted && currentProfileId && story.authorProfileId === currentProfileId);
        const openAuthor = () => {
          if (story.ngoId) onOpenNGO(story.ngoId);
          else if (story.authorProfileId) onOpenProfile?.(story.authorProfileId);
        };
        return (
          <article
            id={`story-${story.id}`}
            key={story.id}
            data-category={category?.id}
            className='story-feed-card rounded-[24px] border border-brand-ink/10 bg-background px-4 py-5 sm:px-5'
          >
            <header className='flex items-start gap-3'>
              <button type='button' disabled={!canOpenAuthor} onClick={openAuthor} className='shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 disabled:cursor-default' aria-label={canOpenAuthor ? 'Abrir perfil de ' + story.ngoName : undefined}>
                <img src={story.ngoImage} alt='' className='h-11 w-11 rounded-full border border-brand-ink/10 bg-secondary object-cover' />
              </button>
              <div className='min-w-0 flex-1 pt-0.5'>
                <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
                  <button type='button' disabled={!canOpenAuthor} onClick={openAuthor} className='max-w-full truncate text-left text-sm font-bold text-brand-ink hover:text-brand-blue disabled:cursor-default disabled:hover:text-brand-ink'>{story.ngoName}</button>
                  {story.isFounder && <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-yellow/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-brand-ink' title='ONG fundadora'><img src={founderSeal} alt='' className='h-3.5 w-3.5 object-contain' />ONG fundadora</span>}
                </div>
                <span className='block text-xs text-muted-foreground'>{formatTimestamp(story.timestamp)}</span>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                <StoryReportMenu canReport={canInteract} canDelete={canDelete} onDelete={() => onDelete(story)} onRequireAuth={onRequireAuth} onReport={(reason) => onReport(story, reason)} />
              </div>
            </header>

            {category && <span className={`ml-0 mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:ml-14 ${category.theme.chipBg} ${category.theme.chipText}`}><img src={category.sealSrc} alt='' className='h-5 w-5 object-contain' />{category.label}</span>}
            <StoryBody text={story.caption} />

            {story.url && <div role={story.type === 'image' || story.type === 'video' ? 'button' : undefined} tabIndex={story.type === 'image' || story.type === 'video' ? 0 : undefined} onClick={() => { if (story.type === 'image' || story.type === 'video') onOpenStory(story); }} onKeyDown={(event) => { if ((story.type === 'image' || story.type === 'video') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpenStory(story); } }} className='group relative ml-14 mt-3 block w-[calc(100%_-_3.5rem)] overflow-hidden rounded-[20px] border border-brand-ink/10 bg-secondary text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
              {story.type === 'image' ? (
                <img src={story.url} alt={story.caption || `História de ${story.ngoName}`} loading='lazy' decoding='async' className='block max-h-[38rem] w-full object-cover' />
              ) : story.type === 'video' ? (
                <div className='relative aspect-[16/10] w-full'>
                  <video src={story.url} className='h-full w-full object-cover' muted playsInline preload='none' />
                  <span className='absolute inset-0 grid place-items-center bg-brand-ink/15'><span className='grid h-12 w-12 place-items-center rounded-full bg-background/90 text-brand-blue shadow-lg'><Play size={21} className='ml-0.5 fill-current' /></span></span>
                </div>
              ) : (
                <div className='h-[min(620px,74vh)] min-h-[28rem] w-full bg-white'>
                  <SocialStoryEmbed src={story.url} provider={story.type} title={`Publicação de ${story.ngoName} no ${story.type}`} />
                </div>
              )}
            </div>}

            {story.attribution && <a href={story.attribution.href} target='_blank' rel='noreferrer' className='ml-14 mt-2 block w-[calc(100%_-_3.5rem)] truncate text-xs font-semibold text-brand-blue underline-offset-4 hover:underline'>{story.attribution.label}</a>}

            <footer className='ml-14 mt-3 flex min-w-0 items-center justify-center gap-5 text-muted-foreground'>
              <BrandLikeButton liked={liked} onChange={() => onToggleLike(story)} />
              <StoryShareSheet storyId={story.id} storyTitle={story.caption || `História de ${story.ngoName}`} />
              <button type='button' onClick={() => onToggleSaved(story)} aria-pressed={saved} className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] transition-colors hover:bg-brand-yellow/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 ${saved ? 'text-brand-blue' : ''}`} aria-label={saved ? 'Remover dos salvos' : 'Salvar história'}>
                <Bookmark size={19} className={saved ? 'fill-current' : ''} />
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
};

const Stories: React.FC<StoriesProps> = ({ onOpenNGO, onOpenProfile, canTellStory = false, onTellStory, onPreviewActiveChange }) => {
  const reduceMotion = useReducedMotion();
  const [discoveryLane, setDiscoveryLane] = useState<DiscoveryLane>('for-you');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [realStories, setRealStories] = useState<PublishedStory[]>([]);
  const [publicImages, setPublicImages] = useState<PublicStoryImage[]>([]);
  const [loadingRealStories, setLoadingRealStories] = useState(true);
  const [expandProgress, setExpandProgress] = useState(0);
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
        setCurrentProfileId(viewer.currentProfileId ?? null);
        setSavedIds(viewer.savedStoryIds);
        setLikedIds(viewer.likedStoryIds ?? new Set());
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

  useEffect(() => {
    let active = true;
    if (!demoDataEnabled) return undefined;
    void loadPublicStoryImages().then((images) => {
      if (active) setPublicImages(images);
    });
    return () => { active = false; };
  }, []);

  const feedStories = useMemo<StoryItem[]>(() => {
    const databaseOrDemoStories: StoryItem[] = realStories.length
      ? realStories
      : demoDataEnabled ? baseDemoStories.slice(0, 12) : [];
    return [
      ...(demoDataEnabled ? curatedStoryMedia.map((story) => ({ ...story, persisted: false })) : []),
      ...(demoDataEnabled ? publicImageStories(publicImages) : []),
      ...databaseOrDemoStories,
    ];
  }, [baseDemoStories, publicImages, realStories]);

  const availableStories = useMemo(() => feedStories.filter((story) => !reportedIds.has(story.id)), [feedStories, reportedIds]);
  const activeIndex = activeStoryId === null ? -1 : availableStories.findIndex((story) => story.id === activeStoryId);
  const activeStory = activeIndex < 0 ? null : availableStories[activeIndex];
  const visibleStories = useMemo(() => {
    const laneStories = discoveryLane === 'saved' ? availableStories.filter((story) => savedIds.has(story.id)) : availableStories;
    const normalizedQuery = searchQuery.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    if (!normalizedQuery) return laneStories;
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    return laneStories.filter((story) => {
      const searchable = (story.ngoName + ' ' + story.caption).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
      return terms.every((term) => searchable.includes(term));
    });
  }, [availableStories, discoveryLane, savedIds, searchQuery]);

  useEffect(() => {
    if (!activeStory) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveStoryId(null);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [activeStory]);
  const openStory = (story: StoryItem) => setActiveStoryId(story.id);
  const move = (direction: -1 | 1) => {
    if (activeIndex < 0 || !availableStories.length) return;
    setActiveStoryId(availableStories[(activeIndex + direction + availableStories.length) % availableStories.length].id);
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

  const handleToggleLike = async (story: StoryItem) => {
    if (!canTellStory) {
      requireAuth();
      return;
    }
    const nextLiked = !likedIds.has(story.id);
    setLikedIds((current) => {
      const next = new Set(current);
      if (nextLiked) next.add(story.id); else next.delete(story.id);
      return next;
    });
    try {
      await setStoryLiked(story.id, nextLiked);
    } catch {
      setLikedIds((current) => {
        const next = new Set(current);
        if (nextLiked) next.delete(story.id); else next.add(story.id);
        return next;
      });
      toast.error('Não foi possível atualizar sua curtida. Tente novamente.');
    }
  };

  const handleDelete = async (story: StoryItem) => {
    try {
      await deleteOwnStory(story.id);
      setRealStories((current) => current.filter((item) => item.id !== story.id));
      setActiveStoryId((current) => current === story.id ? null : current);
      toast.success('História excluída.');
    } catch {
      toast.error('Não foi possível excluir a história. Ela continua publicada.');
      throw new Error('story-delete-failed');
    }
  };
  const handleReport = async (story: StoryItem, reason: string) => {
    await reportStory(story.id, reason);
    toast.success('Recebemos sua denúncia. O time do TranquiliCare vai investigar.');
    setActiveStoryId(null);
    setReportedIds((current) => new Set(current).add(story.id));
  };

  const handlePublish = async (body: string, image: File | null, socialUrl: string | null, category: string | null = null) => {
    try {
      await publishStory(body, image, socialUrl, category);
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

      <ScrollExpand
        contentPreview
        restingOverlay={<ScrollIdleCue active={expandProgress < 0.08} />}
        onProgressChange={setExpandProgress}
        onActiveChange={onPreviewActiveChange}
        startWidth={48}
        startHeight={48}
        startShape='circle'
        scrollDistance={0.68}
        holdDistance={0}
        smoothing={0.055}
        overlayScrim={0}
        useWindowScroll
        surround={<CircularStoryGallery items={availableStories.filter((story) => Boolean(story.url))} />}
        aria-label='Prévia circular das histórias'
      >
      <div className='h-full w-full overflow-y-hidden bg-background text-brand-ink'>
          <main className='mx-auto w-full max-w-2xl px-3 pb-28 pt-8 sm:px-5 sm:pt-10'>
            <div className='sticky top-0 z-30 -mx-3 bg-background/95 px-3 pt-4 backdrop-blur sm:-mx-5 sm:px-5' data-testid='story-feed-tabs'>
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
              <div className='pb-3 pt-3'>
                <label htmlFor='story-search' className='sr-only'>Pesquisar histórias por pessoa ou palavra-chave</label>
                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground' size={18} aria-hidden='true' />
                  <SmoothInput id='story-search' type='search' value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder='Buscar por pessoa ou palavra-chave' className='h-11 w-full rounded-2xl border border-brand-ink/10 bg-secondary/70 pl-10 pr-4 text-sm text-brand-ink outline-none transition focus:border-brand-blue/50 focus:bg-background focus:ring-4 focus:ring-brand-blue/10' autoComplete='off' />
                </div>
                {searchQuery.trim() && <p className='mt-2 text-xs text-muted-foreground' role='status'>{visibleStories.length} {visibleStories.length === 1 ? 'história encontrada' : 'histórias encontradas'}</p>}
              </div>
            </div>

            <section className='mt-5' aria-live='polite'>
              {loadingRealStories ? (
                <div className='grid min-h-52 place-items-center text-brand-blue' role='status' aria-label='Carregando histórias'><LoaderCircle size={22} className='animate-spin' /></div>
              ) : (
                <StoryFeed stories={visibleStories} savedIds={savedIds} likedIds={likedIds} canInteract={canTellStory} currentProfileId={currentProfileId} onOpenStory={openStory} onOpenNGO={onOpenNGO} onOpenProfile={onOpenProfile} onToggleSaved={handleToggleSaved} onToggleLike={handleToggleLike} onDelete={handleDelete} onReport={handleReport} onRequireAuth={requireAuth} emptyText={searchQuery.trim() ? 'Nenhuma história corresponde à sua busca.' : discoveryLane === 'saved' ? 'As histórias que você salvar aparecerão aqui.' : 'Novas histórias estão a caminho.'} />
              )}
            </section>
          </main>
        </div>
      </ScrollExpand>

      <StoryComposerFab visible canPublish={canTellStory} onUnavailable={unavailableComposer} onPublish={handlePublish} />

      <AnimatePresence>
        {activeStory && (
          <motion.div className='fixed inset-0 z-[130] grid place-items-center bg-brand-ink/75 p-3 backdrop-blur-md' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveStoryId(null)}>
            <button type='button' onClick={() => setActiveStoryId(null)} className='absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-background text-brand-blue shadow-lg' aria-label='Fechar história'><X size={19} /></button>
            {availableStories.length > 1 && <><button type='button' onClick={(event) => { event.stopPropagation(); move(-1); }} className='absolute left-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:left-8' aria-label='História anterior'><ChevronLeft /></button><button type='button' onClick={(event) => { event.stopPropagation(); move(1); }} className='absolute right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/15 text-white backdrop-blur md:right-8' aria-label='Próxima história'><ChevronRight /></button></>}
            <motion.div key={activeStory.id} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }} animate={{ opacity: 1, transform: 'scale(1)' }} transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: [0.22, 1, 0.36, 1] }} className={`relative max-h-[86dvh] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl ${!activeStory.url ? 'h-[70vh] w-[min(90vw,28rem)] bg-background' : ['instagram', 'tiktok', 'threads', 'substack'].includes(activeStory.type) ? 'h-[78vh] w-[min(90vw,28rem)] bg-white' : 'w-fit'}`} onClick={(event) => event.stopPropagation()}>
              {!activeStory.url ? <div className='h-full overflow-y-auto bg-background p-6'><h2 className='mb-4 font-semibold'>{activeStory.ngoName}</h2><p className='whitespace-pre-wrap break-words leading-7'>{activeStory.caption}</p></div> : activeStory.type === 'image' ? <img src={activeStory.url} alt='' className='block h-auto max-h-[86dvh] w-auto max-w-[90vw] rounded-2xl' /> : activeStory.type === 'video' ? <video src={activeStory.url} className='block h-auto max-h-[86dvh] w-auto max-w-[90vw] rounded-2xl' controls autoPlay playsInline /> : <SocialStoryEmbed src={activeStory.url} provider={activeStory.type} title={`Publicação de ${activeStory.ngoName} no ${activeStory.type}`} className='h-full bg-white' />}
              <div hidden={!activeStory.url} className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-20 text-white ${['instagram', 'tiktok', 'threads', 'substack'].includes(activeStory.type) ? 'pointer-events-none' : ''}`}>
                <button type='button' disabled={!activeStory.ngoId && !activeStory.authorProfileId} onClick={() => activeStory.ngoId ? onOpenNGO(activeStory.ngoId) : activeStory.authorProfileId && onOpenProfile?.(activeStory.authorProfileId)} className='flex items-center gap-3 text-left disabled:cursor-default'><img src={activeStory.ngoImage} alt='' className='h-11 w-11 rounded-full border-2 border-white object-cover' /><span><span className='flex flex-wrap items-center gap-2 font-bold'>{activeStory.ngoName}{activeStory.isFounder && <img src={founderSeal} alt='ONG fundadora' className='h-5 w-5 object-contain' />}</span><span className='mt-1 block text-sm text-white/75'>{activeStory.caption}</span></span></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stories;
