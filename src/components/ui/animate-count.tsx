import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const ANIMATE_COUNT_DURATION_MS = 420;

const EASING = [0.23, 0.88, 0.26, 0.92] as const;

interface AnimateCountProps {
  value: number | null;
  formatter?: (value: number) => string;
  emptyLabel?: string;
  className?: string;
}

const AnimateCount: React.FC<AnimateCountProps> = ({
  value,
  formatter = String,
  emptyLabel = '--',
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const displayValue = value === null ? emptyLabel : formatter(value);
  const animationDuration = reducedMotion ? 0 : ANIMATE_COUNT_DURATION_MS / 1000;

  return (
    <span
      className={cn(
        'grid place-items-center tabular-nums tracking-tight [&>*]:col-start-1 [&>*]:row-start-1',
        className,
      )}
      aria-hidden='true'
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={value === null ? 'empty' : value}
          initial={reducedMotion ? false : { opacity: 0, filter: 'blur(2px)', y: 9, scale: 0.985 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, filter: 'blur(2px)', y: -12, scale: 0.985 }}
          transition={{ duration: animationDuration, ease: EASING }}
          className='will-change-[transform,filter,opacity]'
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default AnimateCount;
