import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface BrandLikeButtonProps {
  liked: boolean;
  onChange: (liked: boolean) => void;
}

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
      <span className='relative grid size-7 place-items-center' aria-hidden='true'>
        <motion.span
          className='absolute inset-0 grid place-items-center'
          animate={{ opacity: liked ? 0 : 1, scale: liked ? 0.72 : 1 }}
          transition={iconTransition}
        >
          <Heart size={20} />
        </motion.span>
        <motion.span
          className='absolute inset-0 grid place-items-center text-brand-blue'
          animate={{
            opacity: liked ? 1 : 0,
            scale: liked ? 1 : 0.58,
            rotate: reduceMotion || !liked ? 0 : [0, -10, 7, 0],
          }}
          transition={reduceMotion ? { duration: 0.01 } : {
            opacity: { duration: 0.14 },
            scale: { type: 'spring', stiffness: 430, damping: 19, mass: 0.72 },
            rotate: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
          }}
        ><Heart size={23} className='fill-current' strokeWidth={2.4} /></motion.span>
        <AnimatePresence initial={false}>
          {liked && !reduceMotion && (
            <motion.span
              key='heart-feedback-ring'
              className='pointer-events-none absolute inset-0 rounded-full border-2 border-brand-yellow'
              initial={{ opacity: 0.75, scale: 0.64 }}
              animate={{ opacity: 0, scale: 1.72 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
};

export default BrandLikeButton;
