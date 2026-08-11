import React from 'react';
import { Check, ChevronDown, LockKeyhole } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import useMeasure from 'react-use-measure';

import { cn } from '@/lib/utils';

export interface JourneyStep {
  title: string;
  description: string;
  tone?: 'blue' | 'yellow' | 'azure';
}

interface HowItWorksProps {
  features: JourneyStep[];
  activeIndex: number;
  completedSteps?: number[];
  expandedIndex?: number | null;
  expandedContent?: React.ReactNode;
  onStepSelect: (index: number) => void;
  ariaLabel: string;
  className?: string;
}

const DETAILS_SPRING = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 22,
  mass: 1.2,
};

const alignments = [
  'self-start sm:ml-[8%]',
  'self-end sm:mr-[8%]',
  'self-start sm:ml-[16%]',
];

const toneClasses: Record<NonNullable<JourneyStep['tone']>, string> = {
  blue: 'bg-brand-blue/10 text-brand-blue',
  yellow: 'bg-brand-yellow/35 text-brand-ink',
  azure: 'bg-secondary text-brand-blue',
};

const JourneyPin = ({ active, complete }: { active: boolean; complete: boolean }) => (
  <span
    className={cn(
      'grid size-9 shrink-0 place-items-center rounded-full border',
      active && !complete && 'border-brand-blue bg-brand-blue text-white',
      complete && 'border-brand-yellow bg-brand-yellow text-brand-ink',
      !active && !complete && 'border-brand-ink/10 bg-secondary text-brand-ink/30',
    )}
    aria-hidden='true'
  >
    {complete ? <Check size={15} strokeWidth={3} /> : active ? (
      <span className='size-2 rounded-full bg-white' />
    ) : <LockKeyhole size={14} />}
  </span>
);

const JourneyConnector = ({ connected, order }: { connected: boolean; order: number }) => (
  <div className='pointer-events-none h-14 w-full sm:h-16' style={{ order }} aria-hidden='true'>
    <svg viewBox='0 0 1000 100' preserveAspectRatio='none' className='size-full overflow-visible'>
      <path
        d={order % 4 === 1 ? 'M 260 0 C 430 18, 600 82, 760 100' : 'M 760 0 C 600 18, 430 82, 260 100'}
        fill='none'
        stroke={connected ? '#ffd343' : 'rgba(17,54,79,0.18)'}
        strokeWidth={connected ? 3 : 2}
        strokeDasharray='7 9'
        strokeLinecap='round'
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  </div>
);

interface JourneyCardProps {
  step: JourneyStep;
  index: number;
  active: boolean;
  complete: boolean;
  expanded: boolean;
  available: boolean;
  content?: React.ReactNode;
  onToggle: () => void;
  order: number;
}

const JourneyCard = ({
  step,
  index,
  active,
  complete,
  expanded,
  available,
  content,
  onToggle,
  order,
}: JourneyCardProps) => {
  const reducedMotion = useReducedMotion();
  const [measureRef, bounds] = useMeasure({ offsetSize: true });
  const status = active ? 'Etapa atual' : complete ? 'Concluída' : 'Bloqueada';

  return (
    <motion.div
      layout='position'
      className={cn('relative z-10 max-w-full', expanded ? 'self-center' : alignments[index % alignments.length])}
      style={{ order }}
      transition={reducedMotion ? { duration: 0.01 } : { layout: DETAILS_SPRING }}
    >
      <motion.article
        initial={false}
        animate={{
          width: expanded ? 680 : 360,
          height: bounds.height > 0 ? bounds.height : 82,
          borderRadius: expanded ? 20 : 24,
        }}
        transition={reducedMotion ? { duration: 0.01 } : {
          height: { ...DETAILS_SPRING, delay: expanded ? 0.1 : 0 },
          width: { ...DETAILS_SPRING, delay: expanded ? 0 : 0.14 },
          borderRadius: DETAILS_SPRING,
        }}
        className={cn(
          'max-w-[calc(100vw-2rem)] overflow-hidden border bg-card text-brand-ink',
          'shadow-[0_10px_28px_rgba(17,54,79,0.08)]',
          expanded && 'border-brand-blue/25 shadow-[0_18px_42px_rgba(17,54,79,0.12)]',
          complete && !expanded && 'border-brand-yellow/75',
          available && !expanded && !complete && 'border-brand-blue/20',
          !available && 'cursor-not-allowed border-brand-ink/10 opacity-45 saturate-50',
        )}
      >
        <div ref={measureRef} className='relative w-full'>
          <motion.button
            layout='position'
            type='button'
            disabled={!available}
            onClick={onToggle}
            aria-expanded={available ? expanded : undefined}
            aria-label={`${status}: ${step.title}`}
            className={cn(
              'flex min-h-[82px] w-full items-center gap-3 px-4 py-3 text-left outline-none sm:px-5',
              'focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-blue/20',
              available ? 'cursor-pointer' : 'cursor-not-allowed',
            )}
          >
            <JourneyPin active={active} complete={complete} />

            <span className='min-w-0 flex-1'>
              <span className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-ink/45'>
                <span className={cn('rounded-full px-2 py-0.5', toneClasses[step.tone ?? 'blue'])}>0{index + 1}</span>
                <span className={cn(active && 'text-brand-blue', complete && 'text-brand-ink/60')}>{status}</span>
              </span>
              <strong className='mt-1 block truncate text-base font-semibold leading-tight text-brand-ink sm:text-lg'>
                {step.title}
              </strong>
            </span>

            {available && (
              <motion.span
                animate={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                transition={reducedMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className='grid size-8 shrink-0 place-items-center rounded-full text-brand-blue'
                aria-hidden='true'
              >
                <ChevronDown size={18} />
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence initial={false} mode='popLayout'>
            {expanded && (
              <motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)', transform: 'translateY(16px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)', transform: 'translateY(10px)' }}
                transition={reducedMotion ? { duration: 0.01 } : {
                  type: 'spring',
                  duration: 0.36,
                  bounce: 0,
                  delay: 0.12,
                }}
                className='overflow-hidden'
              >
                <div className='border-t border-brand-ink/10 px-5 pb-7 pt-5 sm:px-8 sm:pb-9 sm:pt-6'>
                  <p className='mb-6 max-w-xl text-sm leading-6 text-brand-ink/60'>{step.description}</p>
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>
    </motion.div>
  );
};

const HowItWorks: React.FC<HowItWorksProps> = ({
  features,
  activeIndex,
  completedSteps = [],
  expandedIndex = null,
  expandedContent,
  onStepSelect,
  ariaLabel,
  className,
}) => (
  <nav aria-label={ariaLabel} className={cn('relative mx-auto w-full max-w-5xl', className)}>
    <div className='relative flex flex-col py-6'>
      {features.map((step, index) => {
        const active = activeIndex === index;
        const complete = completedSteps.includes(index);
        const available = active || complete;
        const expanded = expandedIndex === index;

        return (
          <React.Fragment key={step.title}>
            <JourneyCard
              step={step}
              index={index}
              active={active}
              complete={complete}
              expanded={expanded}
              available={available}
              content={expanded ? expandedContent : undefined}
              onToggle={() => available && onStepSelect(index)}
              order={index * 2}
            />

            {index < features.length - 1 && (
              <JourneyConnector
                connected={completedSteps.includes(index) || activeIndex > index}
                order={index * 2 + 1}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </nav>
);

export default HowItWorks;
