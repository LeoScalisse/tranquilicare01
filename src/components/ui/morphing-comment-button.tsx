import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { SmoothInput } from '@/components/ui/smooth-input';
import { cn } from '@/lib/utils';

export interface StoryComment {
  id: string;
  author: string;
  text: string;
  timestamp?: string;
  avatar?: string;
}

interface MorphingCommentButtonProps {
  count: number;
  expanded: boolean;
  comments?: StoryComment[];
  onExpandedChange: (expanded: boolean) => void;
  onSubmit?: (comment: string) => void;
  className?: string;
}

const INPUT_SPRING = {
  type: 'spring',
  stiffness: 240,
  damping: 18,
  mass: 1.1,
} as const;

const DISCLOSURE_SPRING = {
  type: 'spring',
  stiffness: 520,
  damping: 46,
  mass: 1.35,
} as const;

const LONG_PRESS_MS = 480;
const MOVE_TOLERANCE = 10;

const initialsFor = (name: string) => name
  .split(' ')
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

export const MorphingCommentButton: React.FC<MorphingCommentButtonProps> = ({
  count,
  expanded,
  comments = [],
  onExpandedChange,
  onSubmit,
  className,
}) => {
  const [comment, setComment] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [submittedComments, setSubmittedComments] = useState<StoryComment[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pressTimerRef = useRef<number | null>(null);
  const pressOriginRef = useRef({ x: 0, y: 0 });
  const longPressTriggeredRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0.01 } : INPUT_SPRING;
  const contentTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };

  const clearLongPress = useCallback(() => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
  }, []);

  useEffect(() => clearLongPress, [clearLongPress]);

  useEffect(() => {
    if (!expanded) return undefined;

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      onExpandedChange(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    if (!commentsOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeComments();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeComments, commentsOpen]);

  const submitComment = () => {
    const value = comment.trim();
    if (!value) {
      inputRef.current?.focus();
      return;
    }

    onSubmit?.(value);
    setSubmittedComments((current) => [
      ...current,
      {
        id: `submitted-${Date.now()}`,
        author: 'Você',
        text: value,
        timestamp: 'agora',
      },
    ]);
    setComment('');
    onExpandedChange(false);
  };

  const beginLongPress = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (
      expanded
      || commentsOpen
      || (event.pointerType === 'mouse' && event.button !== 0)
    ) return;

    clearLongPress();
    longPressTriggeredRef.current = false;
    pressOriginRef.current = { x: event.clientX, y: event.clientY };
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onExpandedChange(false);
      setCommentsOpen(true);
      pressTimerRef.current = null;
    }, LONG_PRESS_MS);
  };

  const cancelMovedPress = (event: React.PointerEvent<HTMLButtonElement>) => {
    const distance = Math.hypot(
      event.clientX - pressOriginRef.current.x,
      event.clientY - pressOriginRef.current.y,
    );
    if (distance > MOVE_TOLERANCE) clearLongPress();
  };

  const handleCommentClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    clearLongPress();
    if (longPressTriggeredRef.current) {
      event.preventDefault();
      event.stopPropagation();
      longPressTriggeredRef.current = false;
      return;
    }

    if (!expanded) {
      onExpandedChange(true);
      return;
    }
    submitComment();
  };

  const allComments = [...comments, ...submittedComments];

  return (
    <>
      <motion.div
        layout='position'
        transition={transition}
        className={cn('min-w-[3rem] shrink-0', expanded && 'flex-1', className)}
      >
        <motion.div
          ref={containerRef}
          layout
          transition={transition}
          className={cn(
            'relative flex h-10 min-w-0 items-center overflow-hidden rounded-lg border',
            expanded
              ? 'w-full border-brand-blue/25 bg-background p-0.5 shadow-[0_6px_18px_rgba(20,125,167,0.12)]'
              : 'w-auto border-transparent bg-transparent',
          )}
        >
          <AnimatePresence mode='popLayout' initial={false}>
            {expanded && (
              <motion.div
                key='comment-input'
                initial={{
                  opacity: 0,
                  transform: reduceMotion ? 'none' : 'translate3d(-8px, 0, 0)',
                }}
                animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
                exit={{
                  opacity: 0,
                  transform: reduceMotion ? 'none' : 'translate3d(-8px, 0, 0)',
                }}
                transition={contentTransition}
                className='min-w-0 flex-1'
              >
                <SmoothInput
                  ref={inputRef}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      onExpandedChange(false);
                    }
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitComment();
                    }
                  }}
                  placeholder='Escreva um comentário...'
                  aria-label='Escreva um comentário'
                  autoComplete='off'
                  maxLength={280}
                  wrapperClassName='min-w-0'
                  className='h-9 w-full min-w-0 bg-transparent px-3 text-sm font-medium text-brand-ink outline-none placeholder:text-muted-foreground'
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            layout='position'
            type='button'
            onPointerDown={beginLongPress}
            onPointerMove={cancelMovedPress}
            onPointerUp={clearLongPress}
            onPointerCancel={clearLongPress}
            onContextMenu={(event) => event.preventDefault()}
            onClick={handleCommentClick}
            transition={transition}
            whileTap={reduceMotion ? undefined : { transform: 'scale(0.97)' }}
            aria-label={expanded ? 'Enviar comentário' : 'Comentar'}
            className={cn(
              'relative inline-flex h-10 shrink-0 touch-pan-y items-center justify-center gap-1.5 rounded-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35',
              expanded
                ? 'h-9 w-10 bg-brand-blue text-white hover:bg-brand-blue/90'
                : 'px-2 text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-blue',
            )}
          >
            <AnimatePresence mode='popLayout' initial={false}>
              {expanded ? (
                <motion.span
                  key='send-comment'
                  initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.94)' }}
                  animate={{ opacity: 1, transform: 'scale(1)' }}
                  exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.94)' }}
                  transition={contentTransition}
                >
                  <Send size={17} aria-hidden='true' />
                </motion.span>
              ) : (
                <motion.span
                  key='open-comments'
                  layout='position'
                  initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.94)' }}
                  animate={{ opacity: 1, transform: 'scale(1)' }}
                  exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.94)' }}
                  transition={contentTransition}
                  className='inline-flex items-center gap-1.5'
                >
                  <MessageCircle size={19} aria-hidden='true' />
                  <span className='text-xs tabular-nums'>{count}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </motion.div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {commentsOpen && (
            <MotionConfig transition={reduceMotion ? { duration: 0.01 } : DISCLOSURE_SPRING}>
              <motion.div
                className='fixed inset-0 z-[140] flex items-end justify-center p-4 sm:items-center'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
              >
                <button
                  type='button'
                  tabIndex={-1}
                  className='absolute inset-0 cursor-default bg-brand-ink/35 backdrop-blur-[2px]'
                  onClick={closeComments}
                  aria-label='Fechar comentários'
                />
                <motion.section
                  role='dialog'
                  aria-modal='true'
                  aria-label='Comentários da história'
                  initial={reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, transform: 'translate3d(0, 18px, 0) scale(0.95)' }}
                  animate={{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }}
                  exit={reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, transform: 'translate3d(0, 12px, 0) scale(0.97)' }}
                  className='relative z-10 w-full max-w-sm rounded-2xl border border-border bg-background p-2 text-brand-ink shadow-[0_24px_80px_rgba(7,40,62,0.3)]'
                >
                  <div className='flex items-center justify-between px-4 pb-5 pt-3'>
                    <h2 className='font-display text-2xl font-semibold'>Comentários</h2>
                    <button
                      ref={closeRef}
                      type='button'
                      onClick={closeComments}
                      className='grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-brand-blue/15 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35'
                      aria-label='Fechar comentários'
                    >
                      <X size={19} aria-hidden='true' />
                    </button>
                  </div>

                  <div className='max-h-[min(58dvh,30rem)] space-y-3 overflow-y-auto px-2 pb-3'>
                    {allComments.length > 0 ? allComments.map((item, index) => (
                      <motion.article
                        key={item.id}
                        initial={reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, transform: 'translate3d(0, 10px, 0)' }}
                        animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
                        transition={reduceMotion
                          ? { duration: 0.01 }
                          : {
                              type: 'spring',
                              stiffness: 260,
                              damping: 22,
                              delay: 0.08 + index * 0.04,
                            }}
                        className='flex gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm'
                      >
                        {item.avatar ? (
                          <img src={item.avatar} alt='' className='h-10 w-10 shrink-0 rounded-full object-cover' />
                        ) : (
                          <span className='grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-blue/15 text-xs font-bold text-brand-blue'>
                            {initialsFor(item.author)}
                          </span>
                        )}
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-baseline justify-between gap-3'>
                            <h3 className='truncate text-sm font-bold'>{item.author}</h3>
                            {item.timestamp && <span className='shrink-0 text-[11px] text-muted-foreground'>{item.timestamp}</span>}
                          </div>
                          <p className='mt-1 text-sm leading-5 text-brand-ink/80'>{item.text}</p>
                        </div>
                      </motion.article>
                    )) : (
                      <p className='px-4 py-8 text-center text-sm text-muted-foreground'>Ainda não há comentários por aqui.</p>
                    )}
                  </div>

                  <div className='mx-2 mb-2 flex items-center justify-between border-t border-border px-2 pt-3'>
                    <span className='text-sm font-semibold text-muted-foreground'>{count} comentários</span>
                    <button
                      type='button'
                      onClick={() => {
                        closeComments();
                        onExpandedChange(true);
                      }}
                      className='rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-blue/90'
                    >
                      Comentar
                    </button>
                  </div>
                </motion.section>
              </motion.div>
            </MotionConfig>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
