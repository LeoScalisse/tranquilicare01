import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';

import { cn } from '@/lib/utils';

type SmoothInputProps = React.ComponentPropsWithoutRef<'input'> & {
  wrapperClassName?: string;
  caretClassName?: string;
};

const isFirefox = typeof navigator !== 'undefined' && /firefox|fxios/i.test(navigator.userAgent);
const isChromium = typeof navigator !== 'undefined' && /chrome|chromium|crios/i.test(navigator.userAgent);
const PASSWORD_CHAR = isFirefox ? '\u25cf' : '\u2022';
const ANIMATED_TYPES = new Set(['text', 'password', 'email', 'search', 'tel', 'url']);

const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(({
  className,
  wrapperClassName,
  caretClassName,
  onBlur,
  onChange,
  onClick,
  onFocus,
  onKeyUp,
  onScroll,
  onSelect,
  style,
  type = 'text',
  value,
  ...props
}, forwardedRef) => {
  const rootRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const caretX = useMotionValue(0);
  const caretTop = useMotionValue(0);
  const caretHeight = useMotionValue(16);
  const caretOpacity = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const springCaretX = useSpring(caretX, reducedMotion
    ? { stiffness: 10_000, damping: 100, mass: 0.1 }
    : { stiffness: 720, damping: 38, mass: 0.34 });
  const supportsAnimatedCaret = ANIMATED_TYPES.has(type);
  const updateCaretRef = useRef<(target: HTMLInputElement) => void>(() => undefined);

  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  const syncMeasure = (target: HTMLInputElement, measure: HTMLSpanElement) => {
    const styles = window.getComputedStyle(target);
    let fontSize = styles.fontSize;

    if (PASSWORD_CHAR === '\u2022' && target.type === 'password' && !isChromium) {
      fontSize = `${Number.parseFloat(fontSize) + 6.25}px`;
    }

    measure.style.font = styles.font;
    measure.style.fontSize = fontSize;
    measure.style.letterSpacing = styles.letterSpacing;
    measure.style.fontFeatureSettings = styles.fontFeatureSettings;
    measure.style.fontVariationSettings = styles.fontVariationSettings;
    measure.style.fontKerning = styles.fontKerning;
    measure.style.fontStretch = styles.fontStretch;
    measure.style.textTransform = styles.textTransform;
    return styles;
  };

  const updateCaret = (target: HTMLInputElement) => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure || target.disabled || !supportsAnimatedCaret) {
      caretOpacity.set(0);
      return;
    }

    const selectionStart = target.selectionStart ?? 0;
    const selectionEnd = target.selectionEnd ?? selectionStart;
    const hasSelection = selectionStart !== selectionEnd;
    const caretIndex = hasSelection && target.selectionDirection !== 'backward'
      ? selectionEnd
      : selectionStart;
    const textBeforeCaret = target.type === 'password'
      ? PASSWORD_CHAR.repeat(caretIndex)
      : target.value.slice(0, caretIndex);
    const styles = syncMeasure(target, measure);
    measure.textContent = textBeforeCaret;

    const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const prefixWidth = textBeforeCaret.length > 0 ? measure.getBoundingClientRect().width : 0;
    const absoluteWidth = paddingLeft + prefixWidth;
    const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
    const visibleLeft = target.scrollLeft + paddingLeft;
    const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;

    if (absoluteWidth > visibleRight) {
      target.scrollLeft = Math.min(absoluteWidth - target.clientWidth + paddingRight, maxScroll);
    } else if (absoluteWidth < visibleLeft) {
      target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
    }

    const rootRect = root.getBoundingClientRect();
    const inputRect = target.getBoundingClientRect();
    const localX = absoluteWidth - target.scrollLeft;
    const minX = paddingLeft - 1;
    const maxX = target.clientWidth - paddingRight;
    const visible = localX >= minX && localX <= maxX + 1;
    const fontSize = Number.parseFloat(styles.fontSize) || 16;
    const lineHeight = Number.parseFloat(styles.lineHeight);
    const desiredHeight = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.25;
    const height = Math.max(14, Math.min(desiredHeight, fontSize * 1.35, inputRect.height - 10));

    caretX.set(inputRect.left - rootRect.left + borderLeft + Math.min(Math.max(localX, minX), maxX));
    caretTop.set(inputRect.top - rootRect.top + (inputRect.height - height) / 2);
    caretHeight.set(height);
    caretOpacity.set(!hasSelection && visible ? 1 : 0);
  };

  updateCaretRef.current = updateCaret;

  const scheduleCaretUpdate = (target: HTMLInputElement) => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      if (document.activeElement === target) updateCaretRef.current(target);
    });
  };

  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) scheduleCaretUpdate(input);
  }, [type, value]);

  useEffect(() => {
    const input = inputRef.current;
    const root = rootRef.current;
    if (!input || !root) return undefined;

    const syncIfFocused = () => {
      if (document.activeElement === input) updateCaretRef.current(input);
    };
    const handleSelectionChange = () => {
      if (document.activeElement === input) scheduleCaretUpdate(input);
    };
    const observer = new ResizeObserver(syncIfFocused);
    observer.observe(input);
    observer.observe(root);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.fonts.addEventListener('loadingdone', syncIfFocused);
    input.addEventListener('scroll', syncIfFocused);
    void document.fonts.ready.then(syncIfFocused);

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.fonts.removeEventListener('loadingdone', syncIfFocused);
      input.removeEventListener('scroll', syncIfFocused);
    };
  }, []);

  return (
    <span ref={rootRef} className={cn('relative block min-w-0', wrapperClassName)}>
      <input
        {...props}
        ref={inputRef}
        type={type}
        value={value}
        className={cn('relative z-[1]', className)}
        style={supportsAnimatedCaret ? { ...style, caretColor: 'transparent' } : style}
        onFocus={(event) => {
          scheduleCaretUpdate(event.currentTarget);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          caretOpacity.set(0);
          onBlur?.(event);
        }}
        onChange={(event) => {
          onChange?.(event);
          scheduleCaretUpdate(event.currentTarget);
        }}
        onClick={(event) => {
          scheduleCaretUpdate(event.currentTarget);
          onClick?.(event);
        }}
        onKeyUp={(event) => {
          scheduleCaretUpdate(event.currentTarget);
          onKeyUp?.(event);
        }}
        onSelect={(event) => {
          scheduleCaretUpdate(event.currentTarget);
          onSelect?.(event);
        }}
        onScroll={(event) => {
          scheduleCaretUpdate(event.currentTarget);
          onScroll?.(event);
        }}
      />
      <span
        ref={measureRef}
        aria-hidden='true'
        className='pointer-events-none invisible absolute left-0 top-0 whitespace-pre'
      />
      <motion.span
        aria-hidden='true'
        className={cn('smooth-input-caret pointer-events-none absolute left-0 top-0 z-[2] w-0.5 rounded-full bg-brand-blue will-change-transform', caretClassName)}
        style={{ x: springCaretX, y: caretTop, height: caretHeight, opacity: caretOpacity }}
      />
    </span>
  );
});

SmoothInput.displayName = 'SmoothInput';

export { SmoothInput };
