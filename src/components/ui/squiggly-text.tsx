import React, { useId, useMemo } from 'react';
import { motion, useReducedMotion, useTime, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SquigglyTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  steps?: number;
  stepDuration?: number;
  scale?: number | [number, number];
  baseFrequency?: number;
  numOctaves?: number;
  as?: 'span' | 'div';
}

export const SquigglyText: React.FC<SquigglyTextProps> = ({
  children,
  steps = 5,
  stepDuration = 80,
  scale = [6, 8],
  baseFrequency = 0.02,
  numOctaves = 3,
  as = 'span',
  className,
  style,
}) => {
  const reactId = useId();
  const safeId = reactId.replace(/[:_]/g, '');
  const reducedMotion = useReducedMotion();
  const filters = useMemo(
    () => Array.from({ length: steps }, (_, index) => `url(#squiggly-${safeId}-${index})`),
    [safeId, steps],
  );
  const time = useTime();
  const filter = useTransform(
    time,
    (value) => filters[Math.floor(value / stepDuration) % filters.length],
  );
  const scaleAt = (index: number) => (
    Array.isArray(scale) ? scale[index % scale.length] : scale
  );
  const content = (
    <>
      <svg
        aria-hidden='true'
        className='pointer-events-none absolute h-0 w-0 overflow-hidden'
        xmlns='http://www.w3.org/2000/svg'
      >
        <defs>
          {Array.from({ length: steps }).map((_, index) => (
            <filter id={`squiggly-${safeId}-${index}`} key={index}>
              <feTurbulence
                baseFrequency={baseFrequency}
                numOctaves={numOctaves}
                result='noise'
                seed={index}
              />
              <feDisplacementMap
                in='SourceGraphic'
                in2='noise'
                scale={scaleAt(index)}
              />
            </filter>
          ))}
        </defs>
      </svg>
      {children}
    </>
  );
  const motionStyle = reducedMotion ? { ...style, filter: 'none' } : { ...style, filter };
  const classes = cn('relative inline-block', className);

  return as === 'div'
    ? <motion.div style={motionStyle} className={classes}>{content}</motion.div>
    : <motion.span style={motionStyle} className={classes}>{content}</motion.span>;
};
