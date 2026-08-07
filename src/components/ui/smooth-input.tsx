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

const PASSWORD_CHAR = /firefox|fxios/i.test(navigator.userAgent) ? '\u25cf' : '\u2022';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const caretX = useMotionValue(0);
  const caretOpacity = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const springCaretX = useSpring(caretX, reducedMotion
    ? { stiffness: 10_000, damping: 100, mass: 0.1 }
    : { stiffness: 480, damping: 34, mass: 0.48 });
  const supportsAnimatedCaret = ['text', 'password', 'search', 'tel', 'url'].includes(type);

  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  const updateCaret = (target: HTMLInputElement) => {
    const measure = measureRef.current;
    if (!measure || target.disabled || !supportsAnimatedCaret) {
      caretOpacity.set(0);
      return;
    }

    const selectionStart = target.selectionStart ?? 0;
    const selectionEnd = target.selectionEnd ?? selectionStart;
    if (selectionStart !== selectionEnd) {
      caretOpacity.set(0);
      return;
    }

    const styles = window.getComputedStyle(target);
    measure.style.font = styles.font;
    measure.style.fontFeatureSettings = styles.fontFeatureSettings;
    measure.style.fontVariationSettings = styles.fontVariationSettings;
    measure.style.letterSpacing = styles.letterSpacing;
    measure.textContent = type === 'password'
      ? PASSWORD_CHAR.repeat(selectionStart)
      : target.value.slice(0, selectionStart);

    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const absoluteX = paddingLeft + measure.getBoundingClientRect().width;
    const visibleLeft = target.scrollLeft + paddingLeft;
    const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;

    if (absoluteX > visibleRight) {
      target.scrollLeft = Math.min(
        absoluteX - target.clientWidth + paddingRight,
        Math.max(0, target.scrollWidth - target.clientWidth),
      );
    } else if (absoluteX < visibleLeft) {
      target.scrollLeft = Math.max(0, absoluteX - paddingLeft);
    }

    const localX = absoluteX - target.scrollLeft;
    caretX.set(Math.min(Math.max(localX, paddingLeft - 1), target.clientWidth - paddingRight));
    caretOpacity.set(1);
  };

  const scheduleCaretUpdate = (target: HTMLInputElement) => {
    window.requestAnimationFrame(() => {
      if (document.activeElement === target) updateCaret(target);
    });
  };

  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) scheduleCaretUpdate(input);
    // The rendered value can be controlled by a parent form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, value]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return undefined;

    const syncIfFocused = () => {
      if (document.activeElement === input) updateCaret(input);
    };
    const observer = new ResizeObserver(syncIfFocused);
    observer.observe(input);
    document.fonts.addEventListener('loadingdone', syncIfFocused);
    void document.fonts.ready.then(syncIfFocused);

    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', syncIfFocused);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className={cn('relative block min-w-0', wrapperClassName)}>
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
      <span className='pointer-events-none absolute inset-x-0 inset-y-0 z-[2] flex items-center overflow-hidden' aria-hidden='true'>
        <motion.span
          className={cn('smooth-input-caret block h-[1.05em] w-0.5 rounded-full bg-brand-blue', caretClassName)}
          style={{ x: springCaretX, opacity: caretOpacity }}
        />
      </span>
    </span>
  );
});

SmoothInput.displayName = 'SmoothInput';

export { SmoothInput };
