import { useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import './founder-carousel.css';

export interface FounderCarouselSlide { id: string; label: string; content: ReactNode; preview?: ReactNode; }
interface FounderCarouselProps { slides: FounderCarouselSlide[]; className?: string; label?: string; }
const SPRING = { type: 'spring', duration: 0.5, bounce: 0.2 } as const;
const wrap = (index: number, count: number) => ((index % count) + count) % count;

export default function FounderCarousel({ slides, className, label = 'Carrossel de organizações fundadoras' }: FounderCarouselProps) {
  // Virtual positions keep a thumbnail's identity as it travels into the feature,
  // including across the last/first boundary, without cloning interactive content.
  const [position, setPosition] = useState(0);
  const [instant, setInstant] = useState(false);
  const [direction, setDirection] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const dragX = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const count = slides.length;
  const active = count ? wrap(position, count) : 0;
  const still = reduceMotion || instant;
  const transition = still ? { duration: 0 } : SPRING;

  const move = (step: number, keyboard = false) => {
    if (count < 2) return;
    setInstant(keyboard);
    setDirection(Math.sign(step));
    setPosition((value) => value + step);
  };

  if (!count) return null;
  const offsets = count === 1 ? [0] : count <= 3 ? [-1, 0, 1] : [-1, 0, 1, 2];

  return (
    <div ref={root} role='region' aria-roledescription='carousel' aria-label={label} tabIndex={0}
      className={cn('founder-carousel py-6 outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30', className)}
      data-count={Math.min(count, 4)}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if ((event.target as HTMLElement).closest('.founder-carousel-copy')) root.current?.focus({ preventScroll: true });
        if (event.key === 'Home') move(-active, true);
        else if (event.key === 'End') move(count - 1 - active, true);
        else move(event.key === 'ArrowLeft' ? -1 : 1, true);
      }}>
      <div className='founder-carousel-viewport'
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || count < 2) return;
          suppressClick.current = false;
          gesture.current = { x: event.clientX, y: event.clientY, dragging: false };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (!start.dragging && Math.abs(dy) > Math.max(8, Math.abs(dx))) { gesture.current = null; return; }
          if (!start.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
            start.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (start.dragging && !reduceMotion) dragX.set(Math.max(-80, Math.min(80, dx * 0.3)));
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          if (!start) return;
          gesture.current = null;
          suppressClick.current = start.dragging;
          if (start.dragging && Math.abs(event.clientX - start.x) > 45) move(event.clientX < start.x ? 1 : -1);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          animate(dragX, 0, reduceMotion ? { duration: 0 } : SPRING);
        }}
        onPointerCancel={() => { gesture.current = null; suppressClick.current = false; animate(dragX, 0, { duration: 0.15 }); }}>
        <motion.div className='founder-carousel-stage' style={{ x: dragX }}>
          <div className='founder-carousel-panel' />
          <div className='founder-carousel-copy' role='group' aria-roledescription='slide' aria-label={`${active + 1} de ${count}: ${slides[active].label}`}>
            <motion.div key={slides[active].id} className='h-full'
              initial={still ? false : { opacity: 0, transform: `translateX(${direction * 16}px)` }}
              animate={{ opacity: 1, transform: 'translateX(0px)' }}
              transition={still ? { duration: 0 } : { duration: 0.25, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}>
              {slides[active].content}
            </motion.div>
          </div>
          <AnimatePresence initial={false}>
            {offsets.map((offset) => {
              const virtualIndex = position + offset;
              const slide = slides[wrap(virtualIndex, count)];
              const selected = offset === 0;
              return (
                <motion.div key={`${slide.id}:${virtualIndex}`} layout={!still}
                  data-slot={offset}
                  className='founder-carousel-photo'
                  initial={still ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: still ? 0 : 0.15 } }}
                  transition={transition}
                  style={{ borderRadius: 24 }}>
                  {slide.preview}
                  {!selected && !(count === 2 && offset === -1) && <button type='button' aria-label={`Ver ${slide.label}`}
                    className='founder-carousel-preview absolute inset-0 rounded-[24px] text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-yellow'
                    onClick={(event) => {
                      root.current?.focus({ preventScroll: true });
                      move(offset, event.detail === 0);
                    }}>
                    <span className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-20 text-sm font-semibold text-white'>{slide.label}</span>
                  </button>}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
      <p className='sr-only' aria-live='polite' aria-atomic='true'>{active + 1} de {count}: {slides[active].label}</p>
      {count > 1 && <div className='mt-5 flex justify-end gap-2 px-1'>
        <button type='button' onClick={(event) => move(-1, event.detail === 0)} aria-label='Organização anterior' className='founder-carousel-arrow grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-brand-ink focus-visible:ring-4 focus-visible:ring-brand-blue/30'><ChevronLeft size={20} /></button>
        <button type='button' onClick={(event) => move(1, event.detail === 0)} aria-label='Próxima organização' className='founder-carousel-arrow grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-brand-ink focus-visible:ring-4 focus-visible:ring-brand-blue/30'><ChevronRight size={20} /></button>
      </div>}
    </div>
  );
}
