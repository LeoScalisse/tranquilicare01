import React, { useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AnimatedTooltipItem {
  id: string;
  name: string;
  designation: string;
  detail: string;
  image: string;
}

interface AnimatedTooltipProps {
  items: AnimatedTooltipItem[];
  onSelect?: (id: string) => void;
  className?: string;
}

export const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({
  items,
  onSelect,
  className,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-100, 100], [-4, 4]), { stiffness: 95, damping: 22 });
  const translateX = useSpring(useTransform(x, [-100, 100], [-14, 14]), { stiffness: 95, damping: 22 });

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      const rect = event.currentTarget.getBoundingClientRect();
      x.set(event.clientX - rect.left - rect.width / 2);
    });
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-y-4 pl-4', className)}>
      {items.map((item) => (
        <div className='group relative -ml-4' key={item.id}>
          <AnimatePresence>
            {hoveredId === item.id && (
              <motion.div
                role='tooltip'
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 7, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ translateX, rotate }}
                className='pointer-events-none absolute bottom-[calc(100%+14px)] left-1/2 z-50 hidden w-64 -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-3 text-left shadow-[0_18px_50px_rgba(16,48,69,0.18)] sm:block'
              >
                <span className='block text-xs font-bold uppercase text-brand-blue'>{item.name}</span>
                <span className='mt-1 block text-base font-bold text-brand-ink'>{item.designation}</span>
                <span className='mt-1 block text-xs leading-5 text-muted-foreground'>{item.detail}</span>
                <span aria-hidden='true' className='absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-border bg-background' />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type='button'
            onClick={() => onSelect?.(item.id)}
            onPointerMove={handlePointerMove}
            onPointerEnter={() => setHoveredId(item.id)}
            onPointerLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(item.id)}
            onBlur={() => setHoveredId(null)}
            className='relative m-0 h-16 w-16 rounded-full border-2 border-white bg-background p-0 shadow-[0_8px_22px_rgba(17,54,79,0.16)] transition duration-300 hover:z-30 hover:-translate-y-1 hover:scale-105 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 sm:h-20 sm:w-20'
            aria-label={`Conhecer o impacto em ${item.name}`}
          >
            <img src={item.image} alt='' className='h-full w-full rounded-full object-contain' />
          </button>
        </div>
      ))}
    </div>
  );
};
