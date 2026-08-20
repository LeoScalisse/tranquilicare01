import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ExpandableVideoPlayerProps {
  src: string;
  title: string;
  triggerLabel: string;
  poster?: string;
}

const SPRING = {
  type: 'spring',
  duration: 0.5,
  bounce: 0.12,
} as const;

const ExpandableVideoPlayer: React.FC<ExpandableVideoPlayerProps> = ({
  src,
  title,
  triggerLabel,
  poster,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <motion.button
        ref={triggerRef}
        type='button'
        onClick={() => setOpen(true)}
        whileTap={reducedMotion ? undefined : { transform: 'scale(0.97)' }}
        transition={SPRING}
        className='group relative aspect-video w-full max-w-[18rem] overflow-hidden rounded-lg bg-brand-ink text-left shadow-[0_18px_42px_-24px_rgba(12,48,72,0.68)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue'
        aria-label={triggerLabel}
      >
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload='metadata'
          className='absolute inset-0 h-full w-full object-cover'
          aria-hidden='true'
        />
        <span className='absolute inset-0 bg-black/15 transition-colors duration-200 group-hover:bg-black/25' aria-hidden='true' />
        <span className='absolute inset-0 grid place-items-center' aria-hidden='true'>
          <span className='inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-bold text-brand-ink shadow-lg backdrop-blur-sm'>
            <Play size={16} className='fill-brand-blue text-brand-blue' />
            Assistir
          </span>
        </span>
      </motion.button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            data-video-overlay
            className='fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-8'
            onKeyDown={(event) => {
              if (event.key === 'Escape') close();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.2 }}
          >
            <button
              type='button'
              className='absolute inset-0 cursor-default bg-brand-ink/90 backdrop-blur-xl'
              onClick={close}
              aria-label='Fechar vídeo'
            />
            <motion.div
              role='dialog'
              aria-modal='true'
              aria-label={title}
              initial={reducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    clipPath: 'inset(38% 38% 38% 38% round 18px)',
                    transform: 'scale(0.96)',
                  }}
              animate={{
                opacity: 1,
                clipPath: 'inset(0% 0% 0% 0% round 8px)',
                transform: 'scale(1)',
              }}
              exit={reducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    clipPath: 'inset(38% 38% 38% 38% round 18px)',
                    transform: 'scale(0.96)',
                  }}
              transition={reducedMotion ? { duration: 0.01 } : SPRING}
              className='relative z-10 aspect-video w-full max-w-6xl overflow-hidden rounded-lg bg-black shadow-2xl'
              onClick={(event) => event.stopPropagation()}
            >
              <video
                src={src}
                poster={poster}
                controls
                autoPlay
                playsInline
                preload='metadata'
                className='h-full w-full object-contain'
              />
              <button
                ref={closeRef}
                type='button'
                onClick={close}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') close();
                }}
                className='absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                aria-label='Fechar vídeo'
              >
                <X size={21} aria-hidden='true' />
              </button>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default ExpandableVideoPlayer;
