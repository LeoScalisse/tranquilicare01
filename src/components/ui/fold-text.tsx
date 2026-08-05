import React, { useEffect, useMemo, useRef, type CSSProperties, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './fold-text.css';

gsap.registerPlugin(ScrollTrigger);

type FoldSplit = 'char' | 'word' | 'line';
type FoldHinge = 'top' | 'bottom' | 'left' | 'right';

interface FoldTextProps {
  text: string;
  splitBy?: FoldSplit;
  hinge?: FoldHinge;
  duration?: number;
  stagger?: number;
  ease?: string;
  perspective?: number;
  creaseShading?: number;
  fontSize?: string | number;
  fontWeight?: string | number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  scrollContainerRef?: RefObject<HTMLElement>;
}

const HINGE_CONFIG: Record<FoldHinge, { origin: string; rotateX: number; rotateY: number }> = {
  top: { origin: '50% 0%', rotateX: -92, rotateY: 0 },
  bottom: { origin: '50% 100%', rotateX: 92, rotateY: 0 },
  left: { origin: '0% 50%', rotateX: 0, rotateY: 92 },
  right: { origin: '100% 50%', rotateX: 0, rotateY: -92 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const renderWhitespace = (value: string, key: string) => value.split(/(\n)/).map((part, index) => {
  if (part === '\n') return <br key={`${key}-br-${index}`} />;
  if (!part) return null;

  return (
    <span className='fold-text-whitespace' key={`${key}-space-${index}`}>
      {part.replace(/ /g, '\u00A0')}
    </span>
  );
});

const FoldText: React.FC<FoldTextProps> = ({
  text,
  splitBy = 'char',
  hinge = 'top',
  duration = 0.65,
  stagger = 0.045,
  ease = 'power3.out',
  perspective = 700,
  creaseShading = 0.55,
  fontSize = 'inherit',
  fontWeight = 'inherit',
  color = 'currentColor',
  className = '',
  style = {},
  scrollContainerRef,
}) => {
  const rootRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hingeConfig = HINGE_CONFIG[hinge];
  const safeCrease = clamp(creaseShading, 0, 1);
  const safePerspective = Math.max(120, perspective);

  const segments = useMemo(() => {
    const renderSegment = (content: string, key: string, split: FoldSplit = splitBy) => (
      <span
        className='fold-text-segment'
        data-fold-split={split}
        key={key}
        style={{ '--fold-perspective': `${safePerspective}px` } as CSSProperties}
      >
        <span
          className='fold-text-piece'
          data-fold-hinge={hinge}
          style={{
            transformOrigin: hingeConfig.origin,
            '--fold-crease': 0,
          } as CSSProperties}
        >
          {content || '\u00A0'}
        </span>
      </span>
    );

    if (splitBy === 'line') {
      return text.split('\n').map((line, index) => (
        <span className='fold-text-line' key={`line-${index}`}>
          {renderSegment(line || '\u00A0', `segment-line-${index}`, 'line')}
        </span>
      ));
    }

    if (splitBy === 'word') {
      return text.split(/(\s+)/).flatMap((part, index) => {
        if (!part) return [];
        if (/^\s+$/.test(part)) return renderWhitespace(part, `ws-${index}`);
        return renderSegment(part, `segment-word-${index}`);
      });
    }

    return Array.from(text).map((character, index) => {
      if (character === '\n') return <br key={`br-${index}`} />;
      return renderSegment(character === ' ' ? '\u00A0' : character, `segment-char-${index}`);
    });
  }, [hinge, hingeConfig.origin, safePerspective, splitBy, text]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const pieces = Array.from(root.querySelectorAll<HTMLElement>('.fold-text-piece'));
    if (!pieces.length) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fromVars = {
      opacity: 0,
      rotateX: reduceMotion ? 0 : hingeConfig.rotateX,
      rotateY: reduceMotion ? 0 : hingeConfig.rotateY,
      '--fold-crease': reduceMotion ? 0 : safeCrease,
      transformOrigin: hingeConfig.origin,
      force3D: true,
    };
    const toVars = {
      opacity: 1,
      rotateX: 0,
      rotateY: 0,
      '--fold-crease': 0,
      duration: reduceMotion ? 0.2 : duration,
      ease: reduceMotion ? 'power1.out' : ease,
      stagger: reduceMotion ? 0.015 : stagger,
      clearProps: 'willChange',
    };

    gsap.set(pieces, fromVars);
    const scrollTrigger = ScrollTrigger.create({
      trigger: root,
      scroller: scrollContainerRef?.current ?? undefined,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        timelineRef.current?.kill();
        timelineRef.current = gsap.timeline().fromTo(pieces, fromVars, toVars);
      },
    });

    return () => {
      scrollTrigger.kill();
      timelineRef.current?.kill();
      timelineRef.current = null;
      gsap.killTweensOf(pieces);
    };
  }, [duration, ease, hingeConfig.origin, hingeConfig.rotateX, hingeConfig.rotateY, safeCrease, scrollContainerRef, stagger, text]);

  const rootStyle = {
    '--fold-text-font-size': typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
    '--fold-text-font-weight': fontWeight,
    '--fold-text-color': color,
    ...style,
  } as CSSProperties;

  return (
    <span ref={rootRef} className={`fold-text ${className}`.trim()} style={rootStyle}>
      <span className='fold-text-sr-only'>{text}</span>
      <span className='fold-text-visual' aria-hidden='true'>
        {segments}
      </span>
    </span>
  );
};

export default FoldText;
