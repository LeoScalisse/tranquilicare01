import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ImpactStatCard {
  id: string;
  title: string;
  value: string;
  description: string;
  color: string;
  icon: LucideIcon;
}

interface ImpactStatCarouselProps {
  cards: ImpactStatCard[];
  className?: string;
}

const spring = {
  type: 'spring' as const,
  stiffness: 330,
  damping: 34,
  mass: 0.82,
};

const ImpactStatCarousel: React.FC<ImpactStatCarouselProps> = ({ cards, className }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const instanceId = useId();
  const activeCard = cards.find((card) => card.id === activeId);
  const compactCards = activeCard ? cards.filter((card) => card.id !== activeId) : cards;
  const transition = reducedMotion ? { duration: 0.01 } : spring;

  return (
    <div className={cn('w-full', className)}>
      <motion.div layout className='flex flex-col gap-3' transition={transition}>
        <AnimatePresence initial={false} mode='popLayout'>
          {activeCard && (
            <motion.button
              key={activeCard.id}
              layoutId={`${instanceId}-${activeCard.id}`}
              type='button'
              onClick={() => setActiveId(null)}
              className={cn(
                'relative flex min-h-44 w-full flex-col justify-between overflow-hidden rounded-lg p-5 text-left text-white shadow-[0_18px_38px_rgba(17,54,79,0.17)]',
                'outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/45',
                activeCard.color,
              )}
              transition={transition}
              aria-label={`Fechar detalhes de ${activeCard.title}`}
            >
              <span className='flex items-start justify-between gap-4'>
                <span className='grid size-11 place-items-center rounded-full bg-white/16 backdrop-blur-sm'>
                  <activeCard.icon size={23} />
                </span>
                <span className='grid size-9 place-items-center rounded-full bg-white/14'>
                  <ChevronDown size={18} />
                </span>
              </span>
              <span className='mt-8 block'>
                <span className='block text-3xl font-bold tabular-nums'>{activeCard.value}</span>
                <span className='mt-1 block text-base font-semibold'>{activeCard.title}</span>
                <motion.span
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 0.72, y: 0 }}
                  transition={reducedMotion ? { duration: 0.01 } : { duration: 0.3, delay: 0.08 }}
                  className='mt-2 block max-w-lg text-sm leading-6'
                >
                  {activeCard.description}
                </motion.span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div
          layout
          className={cn('grid gap-3', activeCard ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4')}
          transition={transition}
        >
          {compactCards.map((card) => (
            <motion.button
              key={card.id}
              layoutId={`${instanceId}-${card.id}`}
              type='button'
              onClick={() => setActiveId(card.id)}
              className={cn(
                'relative flex min-w-0 flex-col justify-between overflow-hidden rounded-lg p-3 text-left text-white shadow-[0_10px_24px_rgba(17,54,79,0.12)]',
                'outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/45',
                activeCard ? 'h-24' : 'h-32',
                card.color,
              )}
              transition={transition}
              whileHover={reducedMotion ? undefined : { y: -2 }}
              whileTap={reducedMotion ? undefined : { scale: 0.985 }}
              aria-label={`Abrir detalhes de ${card.title}: ${card.value}`}
            >
              <card.icon size={activeCard ? 19 : 24} />
              <span className='min-w-0'>
                <span className={cn('block truncate font-bold tabular-nums', activeCard ? 'text-xs' : 'text-lg')}>{card.value}</span>
                <span className={cn('block truncate font-medium text-white/75', activeCard ? 'text-[10px]' : 'text-xs')}>{card.title}</span>
              </span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ImpactStatCarousel;
