import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, Send } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SmoothInput } from '@/components/ui/smooth-input';

interface MorphingCommentButtonProps {
  count: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSubmit?: (comment: string) => void;
  className?: string;
}

const SPRING = {
  type: 'spring',
  stiffness: 240,
  damping: 18,
  mass: 1.1,
} as const;

export const MorphingCommentButton: React.FC<MorphingCommentButtonProps> = ({
  count,
  expanded,
  onExpandedChange,
  onSubmit,
  className,
}) => {
  const [comment, setComment] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0.01 } : SPRING;
  const contentTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };

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

  const submitComment = () => {
    const value = comment.trim();
    if (!value) {
      inputRef.current?.focus();
      return;
    }

    onSubmit?.(value);
    setComment('');
    onExpandedChange(false);
  };

  return (
    <motion.div
      layout='position'
      transition={transition}
      className={cn('min-w-0 shrink-0', expanded && 'flex-1', className)}
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
          onClick={() => {
            if (!expanded) {
              onExpandedChange(true);
              return;
            }
            submitComment();
          }}
          transition={transition}
          whileTap={reduceMotion ? undefined : { transform: 'scale(0.97)' }}
          aria-label={expanded ? 'Enviar comentário' : 'Comentar'}
          className={cn(
            'relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35',
            expanded
              ? 'h-9 w-10 bg-brand-blue text-white hover:bg-brand-blue/90'
              : 'px-2 text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-blue',
          )}
        >
          <AnimatePresence mode='popLayout' initial={false}>
            {expanded ? (
              <motion.span
                key='send-comment'
                initial={{
                  opacity: 0,
                  transform: reduceMotion ? 'none' : 'scale(0.94)',
                }}
                animate={{ opacity: 1, transform: 'scale(1)' }}
                exit={{
                  opacity: 0,
                  transform: reduceMotion ? 'none' : 'scale(0.94)',
                }}
                transition={contentTransition}
              >
                <Send size={17} aria-hidden='true' />
              </motion.span>
            ) : (
              <motion.span
                key='open-comments'
                layout='position'
                initial={{
                  opacity: 0,
                  transform: reduceMotion ? 'none' : 'scale(0.94)',
                }}
                animate={{ opacity: 1, transform: 'scale(1)' }}
                exit={{
                  opacity: 0,
                  transform: reduceMotion ? 'none' : 'scale(0.94)',
                }}
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
  );
};
