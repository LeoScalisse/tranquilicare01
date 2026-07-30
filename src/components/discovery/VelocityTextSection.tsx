import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import DiscoveryScrollContext from './DiscoveryScrollContext';

interface VelocityTextSectionProps {
  id?: string;
  eyebrow: string;
  text: string;
  tone?: 'light' | 'brand-blue';
}

interface TrackBounds {
  start: number;
  end: number;
}

const VelocityTextSection: React.FC<VelocityTextSectionProps> = ({
  id,
  eyebrow,
  text,
  tone = 'light',
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLParagraphElement>(null);
  const scrollContainerRef = useContext(DiscoveryScrollContext);
  const reducedMotion = useReducedMotion();
  const [bounds, setBounds] = useState<TrackBounds>({ start: 0, end: -1200 });

  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const scrollVelocity = useVelocity(scrollYProgress);
  const skewXRaw = useTransform(scrollVelocity, [-0.45, 0.45], ['9deg', '-9deg']);
  const skewX = useSpring(skewXRaw, { mass: 2.4, stiffness: 360, damping: 48 });
  const xRaw = useTransform(scrollYProgress, [0, 1], [bounds.start, bounds.end]);
  const x = useSpring(xRaw, { mass: 2.6, stiffness: 380, damping: 52 });
  const dark = tone === 'brand-blue';
  const sectionColor = dark ? 'bg-brand-blue' : 'bg-background';
  const eyebrowColor = dark ? 'text-brand-yellow' : 'text-brand-blue';
  const textColor = dark ? 'text-white' : 'text-brand-ink';

  useEffect(() => {
    const track = trackRef.current;
    const section = sectionRef.current;
    if (!track || !section) return;

    const updateBounds = () => {
      const viewportWidth = section.getBoundingClientRect().width;
      const trackWidth = track.scrollWidth;
      setBounds({
        start: viewportWidth * 0.82,
        end: Math.min(-trackWidth + viewportWidth * 0.18, -viewportWidth * 0.9),
      });
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(track);
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  if (reducedMotion) {
    return (
      <section id={id} className={`flex min-h-[82svh] items-center overflow-hidden px-5 py-24 sm:px-8 lg:px-12 ${sectionColor}`}>
        <div className='mx-auto w-full max-w-6xl'>
          <p className={`text-sm font-bold uppercase ${eyebrowColor}`}>{eyebrow}</p>
          <p className={`mt-8 max-w-5xl font-display text-5xl font-semibold leading-[1.08] sm:text-7xl sm:leading-[1.04] lg:text-8xl ${textColor}`}>
            {text}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id={id} ref={sectionRef} className={`relative h-[320svh] ${sectionColor}`}>
      <div className='sticky top-0 flex h-svh flex-col justify-center overflow-hidden'>
        <p className={`absolute left-5 top-10 z-10 text-sm font-bold uppercase sm:left-8 sm:top-14 lg:left-12 ${eyebrowColor}`}>
          {eyebrow}
        </p>
        <motion.p
          ref={trackRef}
          aria-label={text}
          style={{ skewX, x }}
          className={`origin-bottom-left whitespace-nowrap py-2 font-display text-5xl font-semibold leading-none will-change-transform sm:text-7xl lg:text-8xl ${textColor}`}
        >
          {text}
        </motion.p>
      </div>
    </section>
  );
};

export default VelocityTextSection;
