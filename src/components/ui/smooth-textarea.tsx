import { motion, useReducedMotion } from 'framer-motion';
import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

type SmoothTextareaProps = ComponentPropsWithoutRef<'textarea'> & {
  wrapperClassName?: string;
};

const SmoothTextarea = forwardRef<HTMLTextAreaElement, SmoothTextareaProps>(({ className, wrapperClassName, onFocus, onBlur, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className={cn('relative block min-w-0 rounded-[inherit]', wrapperClassName)}
      animate={focused && !reduceMotion ? { scale: 1.003 } : { scale: 1 }}
      transition={reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <textarea
        {...props}
        ref={ref}
        className={cn('relative z-[1]', className)}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      <motion.span
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-brand-blue/20'
        animate={{ opacity: focused ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
      />
    </motion.span>
  );
});

SmoothTextarea.displayName = 'SmoothTextarea';

export { SmoothTextarea };