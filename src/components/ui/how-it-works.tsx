import React from 'react';
import { Check, ChevronDown, LockKeyhole } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import {
  Expandable,
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardHeader,
  ExpandableContent,
  ExpandableTrigger,
} from '@/components/ui/expandable';
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

const alignments = [
  'self-start sm:ml-[8%]',
  'self-end sm:mr-[8%]',
  'self-start sm:ml-[16%]',
];

const toneClasses: Record<NonNullable<JourneyStep['tone']>, string> = {
  blue: 'bg-brand-blue/[0.11]',
  yellow: 'bg-brand-yellow/25',
  azure: 'bg-background/80',
};

const JourneyPin = ({ active, complete }: { active: boolean; complete: boolean }) => (
  <span
    className={cn(
      'grid size-9 place-items-center rounded-full border-2',
      active && 'border-background bg-brand-blue text-white',
      complete && 'border-background bg-brand-yellow text-brand-ink',
      !active && !complete && 'border-background bg-secondary text-brand-ink/30',
    )}
    aria-hidden='true'
  >
    {complete ? <Check size={16} strokeWidth={3} /> : active ? (
      <span className='size-2 rounded-full bg-white' />
    ) : <LockKeyhole size={14} />}
  </span>
);

const JourneyConnector = ({ connected, order }: { connected: boolean; order: number }) => (
  <div className='pointer-events-none h-16 w-full sm:h-20' style={{ order }} aria-hidden='true'>
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

interface StepSummaryProps {
  step: JourneyStep;
  index: number;
  active: boolean;
  complete: boolean;
  expanded: boolean;
  available: boolean;
}

const StepSummary = ({ step, index, active, complete, expanded, available }: StepSummaryProps) => (
  <>
    <span className='flex items-start justify-between gap-4'>
      <span className='font-display text-3xl font-semibold tabular-nums text-brand-blue'>0{index + 1}</span>
      <span className={cn(
        'pt-1 text-[10px] font-bold uppercase tracking-[0.14em]',
        active && 'text-brand-blue',
        complete && 'text-brand-ink/65',
        !available && 'text-brand-ink/35',
      )}>
        {active ? 'Etapa atual' : complete ? 'Concluída' : 'Bloqueada'}
      </span>
    </span>
    <strong className='mt-5 block font-display text-2xl font-semibold leading-tight text-brand-ink'>
      {step.title}
    </strong>
    <span className='mt-2 block text-sm leading-6 text-brand-ink/60'>
      {step.description}
    </span>
    <span className={cn(
      'mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-[0.13em]',
      available ? 'text-brand-blue' : 'text-brand-ink/35',
    )}>
      {active ? (expanded ? 'Fechar etapa' : 'Continuar') : complete ? (expanded ? 'Fechar revisão' : 'Revisar') : 'Conclua a etapa anterior'}
      {available && (
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={16} />
        </motion.span>
      )}
    </span>
  </>
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
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (contentRef.current) contentRef.current.inert = !expanded;
  }, [expanded]);

  return (
    <Expandable
      expanded={expanded}
      onToggle={onToggle}
      expandDirection='both'
      expandBehavior='replace'
      transitionDuration={reducedMotion ? 0.01 : 0.46}
      className={cn('relative z-10', expanded ? 'self-center' : alignments[index % alignments.length])}
      style={{ order }}
    >
      <ExpandableCard
        collapsedSize={{ width: 360, height: 210 }}
        expandedSize={{ width: 680 }}
        hoverToExpand={false}
        className={cn(
          'relative max-w-[calc(100vw-2rem)] rounded-2xl border bg-card text-brand-ink',
          'shadow-[0_12px_34px_rgba(17,54,79,0.10)]',
          expanded && 'border-brand-blue/30 shadow-[0_22px_54px_rgba(17,54,79,0.14)]',
          complete && !expanded && 'border-brand-yellow/70',
          !available && 'border-brand-ink/10 opacity-45 saturate-50',
          available && !expanded && 'border-brand-ink/10',
        )}
      >
        <span className='absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2'>
          <JourneyPin active={active} complete={complete} />
        </span>

        <ExpandableTrigger
          disabled={!available}
          aria-label={`${active ? 'Etapa atual' : complete ? 'Concluída' : 'Bloqueada'}: ${step.title}`}
          className={cn(
            'rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25',
            available ? 'cursor-pointer' : 'cursor-not-allowed',
          )}
        >
          <ExpandableCardHeader className={cn('min-h-[210px] rounded-2xl p-6 pt-8', toneClasses[step.tone ?? 'blue'])}>
            <StepSummary
              step={step}
              index={index}
              active={active}
              complete={complete}
              expanded={expanded}
              available={available}
            />
          </ExpandableCardHeader>
        </ExpandableTrigger>

        <ExpandableCardContent className='px-0 pb-0'>
          <ExpandableContent ref={contentRef} keepMounted preset='blur-sm'>
            <div className='border-t border-brand-ink/10 px-6 pb-8 pt-7 sm:px-9 sm:pb-10 sm:pt-8'>
              {content}
            </div>
          </ExpandableContent>
        </ExpandableCardContent>
      </ExpandableCard>
    </Expandable>
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
}) => {
  return (
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
};

export default HowItWorks;
