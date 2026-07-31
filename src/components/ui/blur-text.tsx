import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  stepDuration?: number;
  rootRef?: React.RefObject<Element>;
  onAnimationComplete?: () => void;
  punctuationClassName?: string;
}

const BlurText: React.FC<BlurTextProps> = ({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.35,
  rootRef,
  onAnimationComplete,
  punctuationClassName = '',
}) => {
  const elements = useMemo(() => text.split(' '), [text]);
  const letterGroups = useMemo(() => {
    let characterIndex = 0;
    return text.split(/(\s+)/).map((token) => {
      if (/^\s+$/.test(token)) return { token, characters: [], startIndex: characterIndex };
      const startIndex = characterIndex;
      const characters = token.split('');
      characterIndex += characters.length;
      return { token, characters, startIndex };
    });
  }, [text]);
  const animatedCharacterCount = useMemo(
    () => letterGroups.reduce((total, group) => total + group.characters.length, 0),
    [letterGroups],
  );
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reducedMotion) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.unobserve(element);
      },
      {
        root: rootRef?.current ?? null,
        threshold,
        rootMargin,
      },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion, rootMargin, rootRef, threshold]);

  const offset = direction === 'top' ? -28 : 28;
  const initial = reducedMotion
    ? { opacity: 1, filter: 'blur(0px)', y: 0 }
    : { opacity: 0, filter: 'blur(9px)', y: offset };
  const animatedState = inView
    ? { opacity: 1, filter: 'blur(0px)', y: 0 }
    : initial;
  const transitionFor = (index: number) => ({
    duration: reducedMotion ? 0 : stepDuration,
    delay: reducedMotion ? 0 : (index * delay) / 1000,
    ease: [0.22, 1, 0.36, 1] as const,
  });

  return (
    <p ref={ref} className={`flex flex-wrap ${className}`} aria-label={text}>
      {animateBy === 'words'
        ? elements.map((segment, index) => (
            <motion.span
              aria-hidden='true'
              className={`inline-block will-change-[transform,filter,opacity] ${
                /[.,!?;:…]/.test(segment) ? punctuationClassName : ''
              }`}
              key={`${segment}-${index}`}
              initial={initial}
              animate={animatedState}
              transition={transitionFor(index)}
              onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
            >
              {segment}
              {index < elements.length - 1 ? '\u00A0' : null}
            </motion.span>
          ))
        : letterGroups.map((group, groupIndex) => (
            group.characters.length === 0
              ? <span aria-hidden='true' key={`space-${groupIndex}`}>&nbsp;</span>
              : (
                <span
                  aria-hidden='true'
                  className='inline-flex whitespace-nowrap'
                  key={`${group.token}-${groupIndex}`}
                >
                  {group.characters.map((character, characterIndex) => {
                    const animationIndex = group.startIndex + characterIndex;
                    return (
                      <motion.span
                        className={`inline-block will-change-[transform,filter,opacity] ${
                          /[.,!?;:…]/.test(character) ? punctuationClassName : ''
                        }`}
                        key={`${character}-${characterIndex}`}
                        initial={initial}
                        animate={animatedState}
                        transition={transitionFor(animationIndex)}
                        onAnimationComplete={
                          animationIndex === animatedCharacterCount - 1
                            ? onAnimationComplete
                            : undefined
                        }
                      >
                        {character}
                      </motion.span>
                    );
                  })}
                </span>
              )
          ))}
    </p>
  );
};

export default BlurText;
