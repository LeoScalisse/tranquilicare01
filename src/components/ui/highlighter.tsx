import React, { useLayoutEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { annotate } from 'rough-notation';
import type { RoughAnnotation } from 'rough-notation/lib/model';

type AnnotationAction =
  | 'highlight'
  | 'underline'
  | 'box'
  | 'circle'
  | 'strike-through'
  | 'crossed-off'
  | 'bracket';

interface HighlighterProps {
  children: React.ReactNode;
  action?: AnnotationAction;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  isView?: boolean;
  className?: string;
}

const Highlighter: React.FC<HighlighterProps> = ({
  children,
  action = 'highlight',
  color = '#ffdd58',
  strokeWidth = 1.5,
  animationDuration = 850,
  iterations = 1,
  padding = 3,
  multiline = true,
  isView = false,
  className = '',
}) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const isInView = useInView(elementRef, { once: true, margin: '-10%' });
  const shouldShow = !isView || isInView;

  useLayoutEffect(() => {
    const element = elementRef.current;
    let annotation: RoughAnnotation | null = null;
    let resizeObserver: ResizeObserver | null = null;

    if (shouldShow && element) {
      annotation = annotate(element, {
        type: action,
        color,
        strokeWidth,
        animationDuration: reducedMotion ? 0 : animationDuration,
        iterations,
        padding,
        multiline,
      });
      annotation.show();

      resizeObserver = new ResizeObserver(() => {
        annotation?.hide();
        annotation?.show();
      });
      resizeObserver.observe(element);
    }

    return () => {
      annotation?.remove();
      resizeObserver?.disconnect();
    };
  }, [
    action,
    animationDuration,
    color,
    iterations,
    multiline,
    padding,
    reducedMotion,
    shouldShow,
    strokeWidth,
  ]);

  return (
    <span ref={elementRef} className={`relative inline-block bg-transparent ${className}`}>
      {children}
    </span>
  );
};

export default Highlighter;
