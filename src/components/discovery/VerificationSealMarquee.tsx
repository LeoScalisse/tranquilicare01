import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion';
import { verificationSeals } from '@/data/verificationSeals';
import { Marquee, MarqueeFade, MarqueeItem } from '@/components/ui/marquee';

interface VerificationSealMarqueeProps {
  onSealSelect?: (sealId: string) => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  lastX: number;
  lastAt: number;
  velocity: number;
  moved: boolean;
}

const AUTO_SPEED = 22;
const DRAG_THRESHOLD = 5;

const VerificationSealMarquee: React.FC<VerificationSealMarqueeProps> = ({ onSealSelect }) => {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const firstSetRef = useRef<HTMLDivElement>(null);
  const loopWidthRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const inertiaRef = useRef(0);
  const suppressClickUntilRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const normalizePosition = useCallback((position: number) => {
    const width = loopWidthRef.current;
    if (width <= 0) return position;

    let normalized = position;
    while (normalized <= -width) normalized += width;
    while (normalized > 0) normalized -= width;
    return normalized;
  }, []);

  useEffect(() => {
    const firstSet = firstSetRef.current;
    if (!firstSet) return;

    const measure = () => {
      loopWidthRef.current = firstSet.getBoundingClientRect().width;
      x.set(normalizePosition(x.get()));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(firstSet);
    return () => observer.disconnect();
  }, [normalizePosition, x]);

  useAnimationFrame((_, delta) => {
    if (dragRef.current || loopWidthRef.current <= 0) return;

    let movement = reducedMotion ? 0 : -(AUTO_SPEED * delta) / 1000;
    if (!reducedMotion && Math.abs(inertiaRef.current) > 0.002) {
      movement += inertiaRef.current * delta;
      inertiaRef.current *= Math.exp(-delta / 440);
    } else {
      inertiaRef.current = 0;
    }

    if (movement !== 0) x.set(normalizePosition(x.get() + movement));
  });

  const finishDrag = useCallback((pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) return;

    if (drag.moved) {
      suppressClickUntilRef.current = performance.now() + 280;
      inertiaRef.current = drag.velocity;
    }
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  return (
    <div className='w-full' aria-label='Selos de áreas verificadas pelo TranquiliCare'>
      <p className='sr-only'>{verificationSeals.map((seal) => seal.label).join(', ')}</p>
      <Marquee
        className={`touch-pan-y py-8 sm:py-12 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={(event) => {
          if (event.button !== 0 || dragRef.current) return;
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            lastX: event.clientX,
            lastAt: performance.now(),
            velocity: 0,
            moved: false,
          };
          inertiaRef.current = 0;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;

          const now = performance.now();
          const deltaX = event.clientX - drag.lastX;
          const elapsed = Math.max(now - drag.lastAt, 1);
          const totalDistance = event.clientX - drag.startX;

          if (!drag.moved && Math.abs(totalDistance) >= DRAG_THRESHOLD) {
            drag.moved = true;
            setIsDragging(true);
          }
          if (drag.moved) {
            event.preventDefault();
            const instantVelocity = deltaX / elapsed;
            drag.velocity = drag.velocity * 0.76 + instantVelocity * 0.24;
            x.set(normalizePosition(x.get() + deltaX));
          }

          drag.lastX = event.clientX;
          drag.lastAt = now;
        }}
        onPointerUp={(event) => finishDrag(event.pointerId)}
        onPointerCancel={(event) => finishDrag(event.pointerId)}
        onLostPointerCapture={(event) => finishDrag(event.pointerId)}
      >
        <MarqueeFade side='left' className='from-brand-blue' />
        <MarqueeFade side='right' className='from-brand-blue' />
        <motion.div className='flex w-max will-change-transform' style={{ x }}>
          {[0, 1, 2].map((copyIndex) => (
            <div
              key={copyIndex}
              ref={copyIndex === 0 ? firstSetRef : undefined}
              className='flex shrink-0'
              aria-hidden={copyIndex === 0 ? undefined : true}
            >
              {verificationSeals.map((seal) => (
                <MarqueeItem key={`${copyIndex}-${seal.id}`} className='h-32 w-32 sm:h-44 sm:w-44 lg:h-52 lg:w-52'>
                  <button
                    type='button'
                    tabIndex={copyIndex === 0 ? 0 : -1}
                    onClick={() => {
                      if (performance.now() < suppressClickUntilRef.current) return;
                      onSealSelect?.(seal.id);
                    }}
                    className='h-full w-full rounded-full transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-4 focus-visible:ring-offset-brand-blue'
                    aria-label={`Ver impacto em ${seal.label}`}
                  >
                    <img
                      src={seal.src}
                      alt=''
                      draggable={false}
                      className='pointer-events-none h-full w-full object-contain drop-shadow-[0_14px_24px_rgba(17,54,79,0.13)]'
                    />
                  </button>
                </MarqueeItem>
              ))}
            </div>
          ))}
        </motion.div>
      </Marquee>
    </div>
  );
};

export default VerificationSealMarquee;
