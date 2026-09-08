import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XOctagon } from 'lucide-react';

import { cn } from '@/lib/utils';

const alertToastVariants = cva(
  'relative flex w-full max-w-sm items-start gap-4 overflow-hidden rounded-lg p-4 shadow-lg',
  {
    variants: {
      variant: {
        success: '',
        warning: '',
        info: '',
        error: '',
      },
      styleVariant: {
        default: 'border bg-background',
        filled: 'text-white',
      },
    },
    compoundVariants: [
      { variant: 'success', styleVariant: 'default', className: 'border-emerald-200 text-emerald-950 dark:border-emerald-800 dark:text-emerald-100' },
      { variant: 'warning', styleVariant: 'default', className: 'border-amber-200 text-amber-950 dark:border-amber-800 dark:text-amber-100' },
      { variant: 'info', styleVariant: 'default', className: 'border-blue-200 text-blue-950 dark:border-blue-800 dark:text-blue-100' },
      { variant: 'error', styleVariant: 'default', className: 'border-red-200 text-red-950 dark:border-red-800 dark:text-red-100' },
      { variant: 'success', styleVariant: 'filled', className: 'bg-emerald-600' },
      { variant: 'warning', styleVariant: 'filled', className: 'bg-amber-500 text-amber-950' },
      { variant: 'info', styleVariant: 'filled', className: 'bg-blue-600' },
      { variant: 'error', styleVariant: 'filled', className: 'bg-destructive text-destructive-foreground' },
    ],
    defaultVariants: {
      variant: 'info',
      styleVariant: 'default',
    },
  },
);

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XOctagon,
};

const defaultIconClasses = {
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  error: 'text-red-500',
};

export interface AlertToastProps
  extends Omit<HTMLMotionProps<'div'>, 'title'>,
    VariantProps<typeof alertToastVariants> {
  title: string;
  description: string;
  onClose: () => void;
}

const AlertToast = React.forwardRef<HTMLDivElement, AlertToastProps>(
  (
    {
      className,
      variant = 'info',
      styleVariant = 'default',
      title,
      description,
      onClose,
      ...props
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'info';
    const resolvedStyle = styleVariant ?? 'default';
    const Icon = iconMap[resolvedVariant];

    return (
      <motion.div
        ref={ref}
        role={resolvedVariant === 'error' ? 'alert' : 'status'}
        aria-live={resolvedVariant === 'error' ? 'assertive' : 'polite'}
        layout
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className={cn(alertToastVariants({ variant: resolvedVariant, styleVariant: resolvedStyle }), className)}
        {...props}
      >
        <Icon
          className={cn(
            'mt-0.5 h-6 w-6 shrink-0',
            resolvedStyle === 'default' ? defaultIconClasses[resolvedVariant] : 'text-current',
          )}
          aria-hidden='true'
        />
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold'>{title}</p>
          <p className='mt-0.5 break-words text-sm opacity-90'>{description}</p>
        </div>
        <button
          type='button'
          onClick={onClose}
          aria-label='Fechar aviso'
          className={cn(
            'shrink-0 rounded-full p-1 opacity-75 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2',
            resolvedStyle === 'default' ? 'hover:bg-muted' : 'hover:bg-black/15',
          )}
        >
          <X className='h-5 w-5' aria-hidden='true' />
        </button>
      </motion.div>
    );
  },
);

AlertToast.displayName = 'AlertToast';

// eslint-disable-next-line react-refresh/only-export-components
export { AlertToast, alertToastVariants };
