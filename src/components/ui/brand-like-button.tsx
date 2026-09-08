import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface BrandLikeButtonProps {
  liked: boolean;
  onChange: (liked: boolean) => void;
}

const BRAND_HEART_SRC = '/tranquilicare-heart.png';

const BrandLikeButton: React.FC<BrandLikeButtonProps> = ({ liked, onChange }) => {
  const reduceMotion = useReducedMotion();
  const iconTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };

  return (
    <motion.button
      type='button'
      data-click-spark='off'
      onClick={() => onChange(!liked)}
      aria-pressed={liked}
      aria-label={liked ? 'Remover curtida' : 'Curtir história'}
      whileTap={reduceMotion ? undefined : { transform: 'scale(0.97)' }}
      transition={{ duration: reduceMotion ? 0.01 : 0.16, ease: [0.23, 1, 0.32, 1] }}
      className={'relative grid size-10 shrink-0 place-items-center rounded-full bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 ' + (liked ? 'text-brand-blue' : 'text-muted-foreground hover:text-brand-blue')}
    >
      <span className='relative grid size-6 place-items-center' aria-hidden='true'>
        <AnimatePresence mode='popLayout' initial={false}>
          {liked ? (
            <motion.img
              key='brand-heart'
              src={BRAND_HEART_SRC}
              alt=''
              draggable={false}
              className='size-6 select-none object-contain'
              initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.9)' }}
              animate={{ opacity: 1, transform: 'scale(1)' }}
              exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.94)' }}
              transition={iconTransition}
            />
          ) : (
            <motion.span
              key='outline-heart'
              className='grid size-6 place-items-center'
              initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.94)' }}
              animate={{ opacity: 1, transform: 'scale(1)' }}
              exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.94)' }}
              transition={iconTransition}
            >
              <Heart size={19} />
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {liked && !reduceMotion && (
            <motion.span
              key='heart-feedback-ring'
              className='pointer-events-none absolute inset-0 rounded-full border border-brand-yellow'
              initial={{ opacity: 0.7, transform: 'scale(0.72)' }}
              animate={{ opacity: 0, transform: 'scale(1.45)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            />
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
};

export default BrandLikeButton;