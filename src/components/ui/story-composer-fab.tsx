import { ngoCategories } from '@/data/ngoCategories';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, ImagePlus, Link2, LoaderCircle, PenLine, Send, Trash2, X } from 'lucide-react';
import { resolveStorySocialEmbed, storySocialUrlError } from '@/lib/storySocialEmbed';
import { SmoothInput } from '@/components/ui/smooth-input';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';
import { CategoryDisclosure } from '@/components/ui/category-disclosure';

interface StoryComposerFabProps {
  visible: boolean;
  canPublish: boolean;
  onUnavailable: () => void;
  onPublish: (body: string, image: File | null, socialUrl: string | null, category: string | null) => Promise<void>;
}

const PANEL_WIDTH = 440;
const PANEL_HEIGHT = 560;
const GAP = 14;
const STORY_CATEGORIES = [{ id: '', label: 'TranquiliCare' }, ...ngoCategories];

const getPanelPosition = (rect: Pick<DOMRect, 'top' | 'right' | 'bottom'>) => {
  const width = Math.min(PANEL_WIDTH, window.innerWidth - GAP * 2);
  const height = Math.min(PANEL_HEIGHT, window.innerHeight - GAP * 2);
  const above = rect.top >= height + GAP;
  return {
    left: Math.min(Math.max(GAP, rect.right - width), window.innerWidth - width - GAP),
    top: above ? rect.top - height - GAP : Math.min(window.innerHeight - height - GAP, rect.bottom + GAP),
    above,
  };
};

const StoryComposerFab: React.FC<StoryComposerFabProps> = ({ visible, canPublish, onUnavailable, onPublish }) => {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showSocialInput, setShowSocialInput] = useState(false);
  const [socialUrl, setSocialUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [panelPosition, setPanelPosition] = useState({ left: 16, top: 16, above: true });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socialInputRef = useRef<HTMLInputElement>(null);
  const draggedRef = useRef(false);
  const anchorRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!open) return undefined;
    const positionPanel = () => {
      const rect = anchorRectRef.current;
      if (!rect) return;
      setPanelPosition(getPanelPosition(rect));
    };
    positionPanel();
    window.addEventListener('resize', positionPanel);
    return () => window.removeEventListener('resize', positionPanel);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !publishing) {
        setOpen(false);
        window.setTimeout(() => triggerRef.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, publishing]);

  const openComposer = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    if (!canPublish) {
      onUnavailable();
      return;
    }
    if (open) {
      setOpen(false);
    } else {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        anchorRectRef.current = rect;
        setPanelPosition(getPanelPosition(rect));
      }
      setOpen(true);
    }
    setError('');
  };

  const closeComposer = () => {
    if (publishing) return;
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) {
      setError('Escreva algo antes de publicar.');
      return;
    }
    const socialError = storySocialUrlError(socialUrl);
    if (showSocialInput && socialError) {
      setError(socialError);
      socialInputRef.current?.focus();
      return;
    }
    setPublishing(true);
    setError('');
    try {
      await onPublish(draft, imageFile, showSocialInput ? socialUrl.trim() || null : null, category);
      setDraft('');
      setCategory(null);
      setImageFile(null);
      setSocialUrl('');
      setShowSocialInput(false);
      setOpen(false);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Não foi possível publicar.');
    } finally {
      setPublishing(false);
    }
  };

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role='dialog'
            aria-modal='false'
            aria-labelledby='story-composer-title'
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ left: panelPosition.left, top: panelPosition.top, transformOrigin: panelPosition.above ? 'bottom right' : 'top right' }}
            className='fixed z-[181] flex h-[min(560px,calc(100vh-1.75rem))] w-[min(440px,calc(100vw-1.75rem))] flex-col overflow-hidden rounded-[30px] border border-white/75 bg-background/95 shadow-[0_30px_90px_-28px_rgba(15,36,60,0.62)] backdrop-blur-2xl'
          >
            <form onSubmit={submit} className='flex min-h-0 flex-1 flex-col'>
              <header className='flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Nova história</p>
                  <h2 id='story-composer-title' className='mt-1 font-display text-2xl font-semibold text-brand-ink'>O que aconteceu por aí?</h2>
                </div>
                <button
                  type='button'
                  onClick={closeComposer}
                  disabled={publishing}
                  aria-label='Fechar nova história'
                  className='grid h-11 w-11 shrink-0 place-items-center rounded-full border border-brand-blue/25 bg-background text-brand-blue transition-colors hover:bg-brand-blue/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <X size={21} aria-hidden='true' />
                </button>
              </header>

              <div className='min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6'>
                <label htmlFor='floating-story-composer' className='sr-only'>Escreva sua história</label>
                <SmoothTextarea id='floating-story-composer' autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={5} placeholder='Conte um momento, uma conquista ou um novo capítulo da causa.' className='w-full resize-none bg-transparent text-base leading-7 text-brand-ink outline-none placeholder:text-muted-foreground' />

                <fieldset disabled={publishing} className='mt-4'>
                  <legend className='text-sm font-semibold'>Categoria da história</legend>
                  <p className='mt-1 text-xs text-muted-foreground'>Ajude as pessoas a encontrar esta história. Use TranquiliCare para uma publicação geral.</p>
                  <CategoryDisclosure
                    id='story-cause-category'
                    items={STORY_CATEGORIES}
                    value={category ?? ''}
                    onChange={(value) => setCategory(value || null)}
                    disabled={publishing}
                    aria-label='Categoria da história'
                  />
                </fieldset>
                {previewUrl ? (
                  <div className='relative mt-3 overflow-hidden rounded-[20px] bg-secondary'>
                    <img src={previewUrl} alt='Prévia da foto escolhida' className='max-h-44 w-full object-cover' />
                    <button type='button' onClick={() => setImageFile(null)} className='absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-red-600 shadow-md backdrop-blur' aria-label='Remover foto'><Trash2 size={16} /></button>
                  </div>
                ) : null}
                {!previewUrl && (
                  <div className='mt-3 grid grid-cols-2 gap-3'>
                    <button type='button' onClick={() => fileInputRef.current?.click()} className='flex min-h-20 flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-brand-blue/35 bg-brand-blue/[0.045] px-3 text-center text-sm font-bold text-brand-blue transition hover:border-brand-blue hover:bg-brand-blue/[0.08] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
                      <ImagePlus size={23} /> Adicionar foto
                    </button>
                    <button type='button' aria-expanded={showSocialInput} onClick={() => { setShowSocialInput((current) => !current); setError(''); window.setTimeout(() => socialInputRef.current?.focus(), 40); }} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-[20px] border px-3 text-center text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 ${showSocialInput ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-dashed border-brand-blue/35 bg-brand-blue/[0.045] text-brand-blue hover:border-brand-blue hover:bg-brand-blue/[0.08]'}`}>
                      <Link2 size={23} /> Adicionar post
                    </button>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {showSocialInput && !previewUrl && (
                    <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} className='overflow-hidden'>
                      <label htmlFor='story-social-url' className='mt-4 block text-sm font-bold text-brand-ink'>Link da publicação</label>
                      <div className='relative mt-2'>
                        <SmoothInput ref={socialInputRef} id='story-social-url' type='url' inputMode='url' autoComplete='url' value={socialUrl} onChange={(event) => { setSocialUrl(event.target.value); setError(''); }} placeholder='https://…' aria-describedby='story-social-help' className='min-h-12 w-full rounded-[16px] border border-brand-ink/15 bg-background px-4 pr-11 text-sm text-brand-ink outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10' />
                        {resolveStorySocialEmbed(socialUrl) && <CheckCircle2 className='absolute right-4 top-3.5 h-5 w-5 text-green-600' aria-hidden='true' />}
                      </div>
                      <p id='story-social-help' className='mt-2 text-xs leading-5 text-muted-foreground'>Aceitamos publicações públicas do Instagram, TikTok, Threads e Substack.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp' className='sr-only' aria-label='Escolher foto da história' onChange={(event) => { setImageFile(event.target.files?.[0] ?? null); setShowSocialInput(false); setSocialUrl(''); }} />
                {error && <p role='alert' className='mt-3 text-sm font-semibold text-red-600'>{error}</p>}
              </div>

              <footer className='flex items-center justify-end gap-3 border-t border-brand-ink/10 px-5 py-4 sm:px-6'>
                {draft.length > 4500 && <span className='mr-auto text-xs text-muted-foreground'>{draft.length}/5000</span>}
                <button type='submit' disabled={publishing || !draft.trim()} className='tc-button-3d text-white rounded-xl inline-flex min-h-11 items-center gap-2 px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0'>{publishing ? <LoaderCircle size={17} className='animate-spin' /> : <Send size={16} />}{publishing ? 'Publicando' : 'Publicar'}</button>
              </footer>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!open && (
          <motion.div
            key='story-composer-trigger'
            drag
            dragConstraints={{
              left: -(window.innerWidth - 88),
              right: 0,
              top: -(window.innerHeight - 150),
              bottom: 0,
            }}
            dragMomentum={false}
            dragElastic={0.08}
            onDragStart={() => {
              draggedRef.current = true;
            }}
            onDragEnd={() => window.setTimeout(() => { draggedRef.current = false; }, 80)}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className='fixed bottom-24 right-5 z-[182] touch-none sm:bottom-8 sm:right-8'
          >
            <motion.button
              ref={triggerRef}
              type='button'
              onClick={openComposer}
              aria-label='Criar nova história'
              aria-expanded='false'
              className='relative grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-brand-blue text-white shadow-[0_18px_42px_-13px_rgba(55,181,247,0.9)] outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70'
              whileHover={reduceMotion ? undefined : { scale: 1.04 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            >
              <PenLine size={23} aria-hidden='true' />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
};

export default StoryComposerFab;
