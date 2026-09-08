import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface FounderCarouselSlide {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface FounderCarouselProps {
  slides: FounderCarouselSlide[];
  className?: string;
  label?: string;
}

export default function FounderCarousel({ slides, className, label = 'Carrossel de organizações fundadoras' }: FounderCarouselProps) {
  const [current, setCurrent] = React.useState(0);
  const [pointer, setPointer] = React.useState({ x: 0, y: 0 });
  const reduceMotion = React.useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const count = slides.length;

  React.useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  if (!count) return null;
  const move = (step: number) => {
    setPointer({ x: 0, y: 0 });
    setCurrent((value) => (value + step + count) % count);
  };

  const relativeIndex = (index: number) => {
    let distance = index - current;
    if (distance > count / 2) distance -= count;
    if (distance < -count / 2) distance += count;
    return distance;
  };

  return (
    <div
      className={cn('relative mx-auto w-full overflow-hidden rounded-[32px] bg-transparent py-4 sm:py-6', className)}
      role='region'
      aria-roledescription='carousel'
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') move(-1);
        if (event.key === 'ArrowRight') move(1);
      }}
    >
      <div className='relative h-[clamp(330px,70vmin,620px)] w-full [perspective:1200px]'>
        <ul className='absolute inset-0 m-0 list-none p-0'>
          {slides.map((slide, index) => {
            const distance = relativeIndex(index);
            const active = distance === 0;
            const visible = Math.abs(distance) <= 1;
            return (
              <li
                key={slide.id}
                aria-hidden={!active}
                className='absolute inset-y-0 left-1/2 w-[clamp(260px,70vmin,620px)] [transform-style:preserve-3d]'
                style={{
                  zIndex: active ? 20 : 10 - Math.abs(distance),
                  opacity: visible ? (active ? 1 : 0.48) : 0,
                  pointerEvents: visible ? 'auto' : 'none',
                  transform: `translateX(calc(-50% + ${distance * 86}%)) scale(${active ? 1 : 0.94}) rotateX(${active ? 0 : 7}deg)`,
                  transformOrigin: 'bottom',
                  transition: reduceMotion ? 'opacity 1ms linear' : 'transform 700ms cubic-bezier(0.22,1,0.36,1), opacity 420ms ease',
                }}
              >
                <div
                  onPointerMove={(event) => {
                    if (!active || reduceMotion) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    setPointer({
                      x: (event.clientX - bounds.left - bounds.width / 2) / 34,
                      y: (event.clientY - bounds.top - bounds.height / 2) / 34,
                    });
                  }}
                  onPointerLeave={() => setPointer({ x: 0, y: 0 })}
                  onClick={() => {
                    if (!active) {
                      setPointer({ x: 0, y: 0 });
                      setCurrent(index);
                    }
                  }}
                  className='h-full overflow-hidden rounded-[28px]'
                  style={{
                    transform: active ? `translate3d(${pointer.x}px,${pointer.y}px,0)` : undefined,
                    transition: reduceMotion ? 'none' : 'transform 160ms ease-out',
                  }}
                >
                  {slide.content}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {count > 1 && (
        <div className='mt-5 flex flex-col items-center'>
          <div className='flex items-center justify-center gap-3'>
            <button type='button' onClick={() => move(-1)} aria-label='Organização anterior' className='grid h-11 w-11 place-items-center rounded-full border border-brand-blue/15 bg-background text-brand-ink shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30'><ChevronRight className='h-5 w-5 rotate-180' /></button>
            <button type='button' onClick={() => move(1)} aria-label='Próxima organização' className='grid h-11 w-11 place-items-center rounded-full border border-brand-blue/15 bg-background text-brand-ink shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30'><ChevronRight className='h-5 w-5' /></button>
          </div>
          <div className='mt-4 flex items-center justify-center gap-2' aria-label='Progresso do carrossel'>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type='button'
                onClick={() => {
                  setPointer({ x: 0, y: 0 });
                  setCurrent(index);
                }}
                aria-label={`Ir para ${slide.label}`}
                aria-current={index === current ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background ${index === current ? 'w-7 bg-brand-yellow' : 'w-2.5 bg-brand-ink/20 hover:bg-brand-blue/45'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
