import React, { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AnimatedEllipsis from '@/components/ui/animated-ellipsis';
import './ScrollFloat.css';

gsap.registerPlugin(ScrollTrigger);

interface ScrollFloatProps {
  children: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  tabIndex?: number;
  disabled?: boolean;
  punctuationClassName?: string;
}

const ScrollFloat: React.FC<ScrollFloatProps> = ({
  children,
  scrollContainerRef,
  containerClassName = '',
  textClassName = '',
  animationDuration = 1,
  ease = 'power3.out',
  scrollStart = 'top 88%',
  scrollEnd = 'center 48%',
  stagger = 0.018,
  as: Heading = 'h2',
  id,
  tabIndex,
  disabled = false,
  punctuationClassName = '',
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const text = typeof children === 'string' ? children : '';

  const splitText = useMemo(
    () => text.split(' ').map((word, wordIndex, words) => {
      const wordParts = word.split(/(\.\.\.)/);

      return (
        <React.Fragment key={`${word}-${wordIndex}`}>
          <span className='scroll-float-word'>
            {wordParts.map((part, partIndex) => (
              part === '...' ? (
                <span
                  className={`scroll-float-char ${punctuationClassName}`}
                  key={`ellipsis-${partIndex}`}
                >
                  <AnimatedEllipsis />
                </span>
              ) : (
                part.split('').map((character, characterIndex) => (
                  <span
                    className={`scroll-float-char ${
                      /[.!?…]/.test(character) ? punctuationClassName : ''
                    }`}
                    key={`${partIndex}-${character}-${characterIndex}`}
                  >
                    {character}
                  </span>
                ))
              )
            ))}
          </span>
          {wordIndex < words.length - 1 ? ' ' : null}
        </React.Fragment>
      );
    }),
    [punctuationClassName, text],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element || disabled || reducedMotion || !text) return;

    const characters = element.querySelectorAll<HTMLElement>('.scroll-float-char');
    const context = gsap.context(() => {
      gsap.fromTo(
        characters,
        {
          autoAlpha: 0,
          yPercent: 95,
          scaleY: 1.45,
          scaleX: 0.88,
          transformOrigin: '50% 0%',
        },
        {
          autoAlpha: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          duration: animationDuration,
          ease,
          stagger,
          scrollTrigger: {
            trigger: element,
            scroller: scrollContainerRef?.current ?? undefined,
            start: scrollStart,
            end: scrollEnd,
            scrub: 0.65,
            invalidateOnRefresh: true,
          },
        },
      );
    }, element);

    return () => context.revert();
  }, [animationDuration, disabled, ease, reducedMotion, scrollContainerRef, scrollEnd, scrollStart, stagger, text]);

  return (
    <Heading
      ref={containerRef}
      id={id}
      tabIndex={tabIndex}
      className={`scroll-float ${containerClassName}`}
    >
      {text ? (
        <>
          <span className='sr-only'>{text}</span>
          <span aria-hidden='true' className={`scroll-float-text ${textClassName}`}>
            {splitText}
          </span>
        </>
      ) : (
        <span className={textClassName}>{children}</span>
      )}
    </Heading>
  );
};

export default ScrollFloat;
