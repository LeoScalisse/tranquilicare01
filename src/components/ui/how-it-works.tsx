import React from 'react';
import { Check, ChevronDown, LockKeyhole } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import useMeasure from 'react-use-measure';

import { cn } from '@/lib/utils';

export interface JourneyStep {
  title: string;
  description: string;
  tone?: 'blue' | 'yellow' | 'azure';
  numberLabel?: string;
}

interface HowItWorksProps {
  features: JourneyStep[];
  activeIndex: number;
  completedSteps?: number[];
  expandedIndex?: number | null;
  expandedContent?: React.ReactNode;
  onStepSelect: (index: number) => void;
  ariaLabel: string;
  layout?: 'staggered' | 'ngo-onboarding';
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

type ConnectorDirection = 'down-right' | 'down-left' | 'down-center';

interface JourneyConnectorProps {
  connected: boolean;
  from: number;
  to: number;
  direction: ConnectorDirection;
}

const connectorPaths: Record<ConnectorDirection, string> = {
  'down-right': 'M 250 2 C 250 44, 690 42, 750 96',
  'down-left': 'M 750 2 C 750 44, 310 42, 250 96',
  'down-center': 'M 750 2 C 750 48, 570 46, 500 96',
};

const JourneyPath = ({ connected, path, markerId }: { connected: boolean; path: string; markerId: string }) => (
  <>
    <defs>
      <marker id={markerId} viewBox='0 0 10 10' refX='8' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'>
        <path d='M 0 1 L 9 5 L 0 9 z' fill={connected ? '#ffd343' : 'rgba(17,54,79,0.26)'} />
      </marker>
    </defs>
    <path
      d={path}
      fill='none'
      stroke={connected ? '#ffd343' : 'rgba(17,54,79,0.22)'}
      strokeWidth={connected ? 3 : 2}
      strokeDasharray='5 8'
      strokeLinecap='round'
      vectorEffect='non-scaling-stroke'
      markerEnd={`url(#${markerId})`}
    />
  </>
);

const JourneyConnector = ({ connected, from, to, direction }: JourneyConnectorProps) => {
  const markerId = React.useId().replace(/:/g, '');
  return (
    <div
      data-journey-connection={`${from}-${to}`}
      className='pointer-events-none h-16 w-full sm:h-20'
      aria-hidden='true'
    >
      <svg viewBox='0 0 1000 100' preserveAspectRatio='none' className='size-full overflow-visible'>
        <JourneyPath connected={connected} path={connectorPaths[direction]} markerId={`journey-arrow-${markerId}`} />
      </svg>
    </div>
  );
};

const InlineJourneyConnector = ({ connected, from, to }: Omit<JourneyConnectorProps, 'direction'>) => {
  const markerId = React.useId().replace(/:/g, '');
  return (
    <div
      data-journey-connection={`${from}-${to}`}
      className='pointer-events-none grid h-14 w-full place-items-center sm:h-full sm:w-14'
      aria-hidden='true'
    >
      <svg viewBox='0 0 100 100' preserveAspectRatio='none' className='h-full w-10 overflow-visible sm:hidden'>
        <JourneyPath
          connected={connected}
          path='M 50 4 L 50 94'
          markerId={`journey-mobile-arrow-${markerId}`}
        />
      </svg>
      <svg viewBox='0 0 100 100' preserveAspectRatio='none' className='hidden h-10 w-full overflow-visible sm:block'>
        <JourneyPath
          connected={connected}
          path='M 4 50 L 94 50'
          markerId={`journey-desktop-arrow-${markerId}`}
        />
      </svg>
    </div>
  );
};

interface JourneyCardProps {
  step: JourneyStep;
  index: number;
  active: boolean;
  complete: boolean;
  expanded: boolean;
  available: boolean;
  content?: React.ReactNode;
  onToggle: () => void;
  compact?: boolean;
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
  compact = false,
}: JourneyCardProps) => {
  const reducedMotion = useReducedMotion();
  const [measureRef, bounds] = useMeasure({ offsetSize: true });
  const status = active ? 'Etapa atual' : complete ? 'Concluída' : 'Bloqueada';

  return (
    <motion.div
      data-journey-step={index}
      layout='position'
      className={cn(
        'relative z-10 max-w-full',
        compact ? 'w-full' : expanded ? 'self-center' : alignments[index % alignments.length],
      )}
      transition={reducedMotion ? { duration: 0.01 } : { layout: DETAILS_SPRING }}
    >
      <motion.article
        initial={false}
        animate={{
          width: expanded ? (compact ? '100%' : 680) : compact ? '100%' : 360,
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
                <span className={cn('rounded-full px-2 py-0.5', toneClasses[step.tone ?? 'blue'])}>{step.numberLabel ?? `0${index + 1}`}</span>
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
  layout = 'staggered',
  className,
}) => {
  const card = (step: JourneyStep, index: number, compact = false) => {
        const active = activeIndex === index;
        const complete = completedSteps.includes(index);
        const available = active || complete;
        const expanded = expandedIndex === index;

        return (
          <JourneyCard
            key={step.title}
            step={step}
            index={index}
            active={active}
            complete={complete}
            expanded={expanded}
            available={available}
            content={expanded ? expandedContent : undefined}
            onToggle={() => available && onStepSelect(index)}
            compact={compact}
          />
        );
  };

  if (layout === 'ngo-onboarding' && features.length >= 5) {
    return (
      <nav aria-label={ariaLabel} className={cn('relative mx-auto w-full max-w-5xl', className)}>
        <div className='relative flex flex-col py-6'>
          {card(features[0], 0)}
          <JourneyConnector
            connected={completedSteps.includes(0) || activeIndex > 0}
            from={0}
            to={1}
            direction='down-right'
          />
          {card(features[1], 1)}

          <JourneyConnector
            connected={completedSteps.includes(1) || activeIndex > 1}
            from={1}
            to={2}
            direction='down-left'
          />

          <div data-journey-branch='cause-visual' className='grid grid-cols-1 items-stretch sm:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)]'>
            {card(features[2], 2, true)}
            <InlineJourneyConnector
              connected={completedSteps.includes(2) || activeIndex > 2}
              from={2}
              to={3}
            />
            {card(features[3], 3, true)}
          </div>

          <JourneyConnector
            connected={completedSteps.includes(3) || activeIndex > 3}
            from={3}
            to={4}
            direction='down-center'
          />

          <div data-journey-final='preparation' className='flex justify-center [&>[data-journey-step]]:!mr-0'>
            {card(features[4], 4)}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label={ariaLabel} className={cn('relative mx-auto w-full max-w-5xl', className)}>
      <div className='relative flex flex-col py-6'>
        {features.map((step, index) => (
          <React.Fragment key={step.title}>
            {card(step, index)}
            {index < features.length - 1 && (
              <JourneyConnector
                connected={completedSteps.includes(index) || activeIndex > index}
                from={index}
                to={index + 1}
                direction={index % 2 === 0 ? 'down-right' : 'down-left'}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default HowItWorks;
