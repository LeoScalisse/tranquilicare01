import { AnimatePresence, motion, useReducedMotion, useSpring } from 'framer-motion';
import { Play, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface YouTubeVideoPopoverProps {
  videoId: string;
  title: string;
}

const PLAYER_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

export const YouTubeVideoPopover: React.FC<YouTubeVideoPopoverProps> = ({ videoId, title }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const pointerX = useSpring(0, { stiffness: 420, damping: 34, mass: 0.45 });
  const pointerY = useSpring(0, { stiffness: 420, damping: 34, mass: 0.45 });
  const pointerOpacity = useSpring(0, { stiffness: 420, damping: 34, mass: 0.45 });

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, open]);

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - bounds.left - 56);
    pointerY.set(event.clientY - bounds.top - 22);
    pointerOpacity.set(1);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type='button'
        onClick={() => setOpen(true)}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => pointerOpacity.set(0)}
        className='group relative aspect-video w-full overflow-hidden rounded-lg bg-brand-ink text-left shadow-[0_24px_60px_-32px_rgba(12,48,72,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue'
        aria-label={`Assistir ao vídeo: ${title}`}
      >
        <img
          src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
          alt=''
          className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]'
        />
        <span className='absolute inset-0 bg-[linear-gradient(to_top,rgba(11,31,50,0.74),rgba(11,31,50,0.05)_60%)]' />
        <span className='absolute bottom-5 left-5 right-5 text-white md:bottom-7 md:left-7'>
          <span className='block text-xs font-bold uppercase tracking-[0.12em] text-white/75'>Nossa história</span>
          <span className='mt-1 block max-w-xl font-display text-xl font-semibold md:text-3xl'>{title}</span>
        </span>
        <span className='absolute left-1/2 top-[34%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-brand-ink shadow-lg transition-opacity md:top-1/2 md:group-hover:opacity-0 md:group-focus-visible:opacity-100'>
          <Play size={17} className='fill-brand-blue text-brand-blue' aria-hidden='true' />
          Assistir
        </span>
        <motion.span
          style={{ x: pointerX, y: pointerY, opacity: pointerOpacity }}
          className='pointer-events-none absolute left-0 top-0 hidden items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-brand-ink shadow-xl md:flex'
          aria-hidden='true'
        >
          <Play size={17} className='fill-brand-blue text-brand-blue' />
          Assistir
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className='fixed inset-0 z-[120] grid place-items-center p-4 sm:p-8'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.2 }}
          >
            <button
              type='button'
              className='absolute inset-0 bg-brand-ink/88 backdrop-blur-xl'
              onClick={close}
              aria-label='Fechar vídeo'
            />
            <motion.div
              role='dialog'
              aria-modal='true'
              aria-label={title}
              initial={reducedMotion ? { opacity: 0 } : { clipPath: 'inset(42% 42% 42% 42% round 24px)', opacity: 0 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0% round 8px)', opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { clipPath: 'inset(42% 42% 42% 42% round 24px)', opacity: 0 }}
              transition={reducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 120, damping: 22, mass: 0.9 }}
              className='relative z-10 aspect-video w-full max-w-6xl overflow-hidden rounded-lg bg-black shadow-2xl'
            >
              <iframe
                className='h-full w-full border-0'
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title={title}
                allow={PLAYER_ALLOW}
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
              />
              <button
                type='button'
                onClick={close}
                className='absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                aria-label='Fechar vídeo'
              >
                <X size={21} aria-hidden='true' />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default YouTubeVideoPopover;
