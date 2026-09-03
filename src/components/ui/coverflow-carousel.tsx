import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const useIsoLayoutEffect = typeof window !== 'undefined'
  ? React.useLayoutEffect
  : React.useEffect;

export interface CoverflowSlide {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface CoverflowCarouselProps {
  slides: CoverflowSlide[];
  rotate?: number;
  depth?: number;
  perspective?: number;
  falloff?: number;
  fade?: number;
  cardWidth?: string;
  cardHeight?: string;
  gap?: number;
  loop?: boolean;
  showNavigation?: boolean;
  label?: string;
  className?: string;
  cardClassName?: string;
}

export function CoverflowCarousel({
  slides,
  rotate = 38,
  depth = 0.52,
  perspective = 3.5,
  falloff = 0.58,
  fade = 0.14,
  cardWidth = 'clamp(300px, 70vw, 760px)',
  cardHeight = 'clamp(390px, 52vw, 440px)',
  gap = 0.08,
  loop = true,
  showNavigation = true,
  label = 'Carrossel de organizações fundadoras',
  className,
  cardClassName,
}: CoverflowCarouselProps) {
  const count = slides.length;
  const safeCount = Math.max(count, 1);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const posRef = React.useRef(0);
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    x: number;
    pos: number;
    velocity: number;
    time: number;
    moved: boolean;
  } | null>(null);
  const suppressClickUntilRef = React.useRef(0);
  const reducedMotionRef = React.useRef(false);
  const [selected, setSelected] = React.useState(0);
  const selectedRef = React.useRef(0);

  const select = React.useCallback((index: number) => {
    selectedRef.current = index;
    setSelected(index);
  }, []);

  const indexAt = React.useCallback(
    (position: number) => ((Math.round(position) % safeCount) + safeCount) % safeCount,
    [safeCount],
  );

  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width || count === 0) return;

    const pitch = width * (1 + gap);
    const position = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      let offset = index - position;
      if (loop && count > 1) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 80) * Math.sign(offset);
      const edge = loop && count > 1
        ? Math.min(1, Math.max(0, count / 2 - distance))
        : 1;

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) `
        + `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
      const isActive = indexAt(position) === index;
      card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      card.inert = !isActive;
    });
  }, [count, depth, fade, falloff, gap, indexAt, loop, rotate]);

  const clamp = React.useCallback(
    (position: number) => (
      loop && count > 1
        ? position
        : Math.max(0, Math.min(Math.max(0, count - 1), position))
    ),
    [count, loop],
  );

  const settle = React.useCallback((target: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    targetRef.current = target;
    select(indexAt(target));

    if (reducedMotionRef.current || count < 2) {
      posRef.current = target;
      paint();
      rafRef.current = null;
      return;
    }

    const step = () => {
      const remaining = target - posRef.current;
      if (Math.abs(remaining) < 0.0004) {
        const normalizedTarget = loop && count > 1 ? indexAt(target) : target;
        posRef.current = normalizedTarget;
        targetRef.current = normalizedTarget;
        paint();
        rafRef.current = null;
        return;
      }

      posRef.current += remaining * 0.16;
      paint();
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [count, indexAt, loop, paint, select]);

  const nudge = React.useCallback((by: number) => {
    settle(clamp(Math.round(targetRef.current) + by));
  }, [clamp, settle]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    suppressClickUntilRef.current = 0;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      velocity: 0,
      time: performance.now(),
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    const delta = event.clientX - drag.x;
    if (Math.abs(delta) > 6) drag.moved = true;

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clamp(drag.pos - delta / pitch);
    drag.velocity = ((posRef.current - previous) / Math.max(now - drag.time, 1)) * 1000;
    drag.time = now;

    const nextIndex = indexAt(posRef.current);
    if (nextIndex !== selectedRef.current) select(nextIndex);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    suppressClickUntilRef.current = drag.moved ? performance.now() + 240 : 0;
    const carried = Math.max(-2, Math.min(2, drag.velocity * 0.18));
    settle(clamp(Math.round(posRef.current + carried)));
  };

  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || count === 0) return undefined;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncReducedMotion = () => {
      reducedMotionRef.current = media.matches;
    };
    syncReducedMotion();
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    media.addEventListener('change', syncReducedMotion);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', syncReducedMotion);
    };
  }, [count, paint]);

  React.useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  if (count === 0) return null;

  return (
    <div
      className={cn('w-full', className)}
      style={{
        ['--cf-card' as string]: cardWidth,
        ['--cf-card-height' as string]: cardHeight,
      }}
      role='region'
      aria-roledescription='carousel'
      aria-label={label}
    >
      <div className='relative'>
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onClickCapture={(event) => {
            if (performance.now() >= suppressClickUntilRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntilRef.current = 0;
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              nudge(1);
            }
          }}
          className={cn(
            'overflow-hidden py-7 outline-none ring-brand-blue/30 focus-visible:ring-4',
            count > 1 && 'cursor-grab active:cursor-grabbing',
          )}
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            touchAction: 'pan-y',
          }}
        >
          <div
            className='relative select-none'
            style={{ height: 'var(--cf-card-height)', transformStyle: 'preserve-3d' }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                role='group'
                aria-roledescription='slide'
                aria-label={`${index + 1} de ${count}: ${slide.label}`}
                className={cn(
                  'absolute left-1/2 top-0 overflow-hidden rounded-[28px] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_22px_54px_-38px_rgba(4,62,94,0.4)] will-change-transform',
                  cardClassName,
                )}
                style={{ width: 'var(--cf-card)', height: 'var(--cf-card-height)' }}
              >
                {slide.content}
              </div>
            ))}
          </div>
        </div>

        {showNavigation && count > 1 && (
          <>
            <button
              type='button'
              aria-label='Organização anterior'
              onClick={() => nudge(-1)}
              className='absolute left-2 top-1/2 z-[110] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-brand-blue/15 bg-background/90 text-brand-ink shadow-lg backdrop-blur transition-[transform,background-color] duration-150 hover:bg-background active:scale-[0.97] sm:left-5'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>
            <button
              type='button'
              aria-label='Próxima organização'
              onClick={() => nudge(1)}
              className='absolute right-2 top-1/2 z-[110] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-brand-blue/15 bg-background/90 text-brand-ink shadow-lg backdrop-blur transition-[transform,background-color] duration-150 hover:bg-background active:scale-[0.97] sm:right-5'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className='mt-1 flex items-center justify-center gap-2' aria-label='Paginação do carrossel'>
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type='button'
              aria-label={`Ir para ${slide.label}`}
              aria-current={index === selected}
              onClick={() => {
                const target = loop
                  ? index + Math.round((targetRef.current - index) / count) * count
                  : index;
                settle(clamp(target));
              }}
              className='grid h-6 w-6 place-items-center rounded-full outline-none ring-brand-blue/30 focus-visible:ring-4'
            >
              <span
                className={cn(
                  'block h-2 w-6 origin-center rounded-full bg-brand-blue transition-[transform,opacity] duration-200',
                  index === selected ? 'scale-x-100 opacity-100' : 'scale-x-[0.34] opacity-30',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
