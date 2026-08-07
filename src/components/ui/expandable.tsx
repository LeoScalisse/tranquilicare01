import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  type HTMLMotionProps,
  type TargetAndTransition,
} from 'framer-motion';
import useMeasure from 'react-use-measure';

import { cn } from '@/lib/utils';

const springConfig = { stiffness: 190, damping: 24, mass: 0.72 };

type ExpandDirection = 'vertical' | 'horizontal' | 'both';
type ExpandBehavior = 'replace' | 'push';
type EaseType = 'easeInOut' | 'easeIn' | 'easeOut' | 'linear' | [number, number, number, number];

interface ExpandableContextValue {
  isExpanded: boolean;
  toggleExpand: () => void;
  expandDirection: ExpandDirection;
  expandBehavior: ExpandBehavior;
  transitionDuration: number;
  easeType: EaseType;
}

const ExpandableContext = createContext<ExpandableContextValue>({
  isExpanded: false,
  toggleExpand: () => undefined,
  expandDirection: 'vertical',
  expandBehavior: 'replace',
  transitionDuration: 0.4,
  easeType: 'easeInOut',
});

const useExpandable = () => useContext(ExpandableContext);

interface ExpandableProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode | ((props: { isExpanded: boolean }) => ReactNode);
  expanded?: boolean;
  onToggle?: () => void;
  transitionDuration?: number;
  easeType?: EaseType;
  expandDirection?: ExpandDirection;
  expandBehavior?: ExpandBehavior;
  initialDelay?: number;
  onExpandStart?: () => void;
  onExpandEnd?: () => void;
  onCollapseStart?: () => void;
  onCollapseEnd?: () => void;
}

const Expandable = React.forwardRef<HTMLDivElement, ExpandableProps>(({
  children,
  expanded,
  onToggle,
  transitionDuration = 0.4,
  easeType = [0.22, 1, 0.36, 1],
  expandDirection = 'vertical',
  expandBehavior = 'replace',
  initialDelay = 0,
  onExpandStart,
  onExpandEnd,
  onCollapseStart,
  onCollapseEnd,
  ...props
}, ref) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const toggleExpand = onToggle ?? (() => setInternalExpanded((current) => !current));
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (isExpanded) onExpandStart?.();
    else onCollapseStart?.();

    const timer = window.setTimeout(() => {
      if (isExpanded) onExpandEnd?.();
      else onCollapseEnd?.();
    }, (transitionDuration + initialDelay) * 1000);

    return () => window.clearTimeout(timer);
  }, [initialDelay, isExpanded, onCollapseEnd, onCollapseStart, onExpandEnd, onExpandStart, transitionDuration]);

  const context = useMemo<ExpandableContextValue>(() => ({
    isExpanded,
    toggleExpand,
    expandDirection,
    expandBehavior,
    transitionDuration,
    easeType,
  }), [easeType, expandBehavior, expandDirection, isExpanded, toggleExpand, transitionDuration]);

  return (
    <ExpandableContext.Provider value={context}>
      <motion.div
        ref={ref}
        initial={false}
        transition={{ duration: transitionDuration, ease: easeType, delay: initialDelay }}
        {...props}
      >
        {typeof children === 'function' ? children({ isExpanded }) : children}
      </motion.div>
    </ExpandableContext.Provider>
  );
});

Expandable.displayName = 'Expandable';

const animationPresets = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },
  'blur-sm': {
    initial: { opacity: 0, filter: 'blur(5px)', y: 8 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
    exit: { opacity: 0, filter: 'blur(4px)', y: 4 },
  },
  'blur-md': {
    initial: { opacity: 0, filter: 'blur(9px)', y: 10 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
    exit: { opacity: 0, filter: 'blur(7px)', y: 6 },
  },
} satisfies Record<string, {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}>;

type AnimationPreset = keyof typeof animationPresets;

interface ExpandableContentProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  preset?: AnimationPreset;
  keepMounted?: boolean;
}

const ExpandableContent = React.forwardRef<HTMLDivElement, ExpandableContentProps>(({
  children,
  preset = 'fade',
  keepMounted = false,
  className,
  ...props
}, forwardedRef) => {
  const { isExpanded, transitionDuration, easeType } = useExpandable();

  return (
    <motion.div
      ref={forwardedRef}
      className={cn('overflow-hidden', className)}
      initial={false}
      animate={{ height: isExpanded ? 'auto' : 0 }}
      transition={{ duration: transitionDuration, ease: easeType }}
      aria-hidden={!isExpanded}
      {...props}
    >
      <AnimatePresence initial={false}>
        {(isExpanded || keepMounted) && (
          <motion.div
            initial={animationPresets[preset].initial}
            animate={isExpanded ? animationPresets[preset].animate : animationPresets[preset].exit}
            exit={animationPresets[preset].exit}
            transition={{ duration: transitionDuration, ease: easeType }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

ExpandableContent.displayName = 'ExpandableContent';

interface ExpandableCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  collapsedSize?: { width?: number; height?: number };
  expandedSize?: { width?: number; height?: number };
  hoverToExpand?: boolean;
  expandDelay?: number;
  collapseDelay?: number;
}

const ExpandableCard = React.forwardRef<HTMLDivElement, ExpandableCardProps>(({
  children,
  className,
  collapsedSize = { width: 360, height: 208 },
  expandedSize = { width: 680 },
  hoverToExpand = false,
  expandDelay = 0,
  collapseDelay = 0,
  style,
  ...props
}, forwardedRef) => {
  const { isExpanded, toggleExpand, expandDirection } = useExpandable();
  const [measureRef, bounds] = useMeasure();
  const widthTarget = useMotionValue(collapsedSize.width ?? bounds.width);
  const width = useSpring(widthTarget, springConfig);
  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    widthTarget.set(isExpanded ? expandedSize.width ?? bounds.width : collapsedSize.width ?? bounds.width);
  }, [bounds.width, collapsedSize.width, expandedSize.width, isExpanded, widthTarget]);

  useEffect(() => () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
  }, []);

  const scheduleToggle = (delay: number) => {
    if (!hoverToExpand) return;
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(toggleExpand, delay);
  };

  return (
    <motion.div
      ref={forwardedRef}
      className={cn('max-w-full overflow-hidden', className)}
      style={{
        ...style,
        width: expandDirection === 'vertical' ? collapsedSize.width : width,
        height: expandDirection === 'horizontal'
          ? collapsedSize.height
          : isExpanded
            ? expandedSize.height ?? 'auto'
            : collapsedSize.height,
      }}
      transition={springConfig}
      onHoverStart={() => !isExpanded && scheduleToggle(expandDelay)}
      onHoverEnd={() => isExpanded && scheduleToggle(collapseDelay)}
      {...props}
    >
      <div ref={measureRef} className='flex min-h-full w-full flex-col'>
        {children}
      </div>
    </motion.div>
  );
});

ExpandableCard.displayName = 'ExpandableCard';

const ExpandableTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({
  children,
  className,
  type = 'button',
  ...props
}, ref) => {
  const { isExpanded, toggleExpand } = useExpandable();

  return (
    <button
      ref={ref}
      type={type}
      onClick={toggleExpand}
      aria-expanded={isExpanded}
      className={cn('w-full text-left', className)}
      {...props}
    >
      {children}
    </button>
  );
});

ExpandableTrigger.displayName = 'ExpandableTrigger';

const ExpandableCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <motion.div ref={ref} layout className={cn('p-6', className)} {...props} />
));
ExpandableCardHeader.displayName = 'ExpandableCardHeader';

const ExpandableCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1 overflow-hidden px-6 pb-6', className)} {...props} />
));
ExpandableCardContent.displayName = 'ExpandableCardContent';

const ExpandableCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center px-6 pb-6', className)} {...props} />
));
ExpandableCardFooter.displayName = 'ExpandableCardFooter';

export {
  Expandable,
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardFooter,
  ExpandableCardHeader,
  ExpandableContent,
  ExpandableContext,
  ExpandableTrigger,
  useExpandable,
};
