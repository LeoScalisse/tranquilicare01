import React from 'react';
import { Check, LockKeyhole } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export interface JourneyStep {
  title: string;
  description: string;
  tone?: 'blue' | 'yellow' | 'azure';
}

interface HowItWorksProps {
  features: JourneyStep[];
  activeIndex: number;
  completedSteps?: number[];
  onStepSelect: (index: number) => void;
  ariaLabel: string;
  className?: string;
}

const toneClasses: Record<NonNullable<JourneyStep['tone']>, string> = {
  blue: 'border-brand-blue/35 bg-brand-blue/15 text-brand-blue',
  yellow: 'border-brand-yellow/60 bg-brand-yellow/35 text-brand-ink',
  azure: 'border-brand-blue/20 bg-background text-brand-ink',
};

const positions = [
  'lg:absolute lg:left-[7%] lg:top-0 lg:-rotate-3',
  'lg:absolute lg:right-[7%] lg:top-[245px] lg:rotate-3',
  'lg:absolute lg:left-[17%] lg:top-[500px] lg:-rotate-2',
];

const Pin = ({ active, complete }: { active: boolean; complete: boolean }) => (
  <span
    className={`grid h-11 w-11 place-items-center rounded-full border shadow-sm transition-colors duration-500 ${
      active
        ? 'border-brand-blue/25 bg-brand-blue text-white'
        : complete
          ? 'border-brand-blue/20 bg-background text-brand-blue'
          : 'border-brand-ink/10 bg-secondary text-brand-ink/35'
    }`}
    aria-hidden='true'
  >
    {complete ? <Check size={20} strokeWidth={3} /> : active ? (
      <svg viewBox='0 0 24 24' className='h-5 w-5 fill-current'>
        <path d='M16 3a1 1 0 0 1 .117 1.993L16 5v4.764l1.894 3.789a1 1 0 0 1 .1.331L18 14v2a1 1 0 0 1-.883.993L17 17h-4v4a1 1 0 0 1-1.993.117L11 21v-4H7a1 1 0 0 1-.993-.883L6 16v-2a1 1 0 0 1 .06-.34l.046-.107L8 9.762V5a1 1 0 0 1-.117-1.993L8 3h8Z' />
      </svg>
    ) : <LockKeyhole size={18} />}
  </span>
);

const HowItWorks: React.FC<HowItWorksProps> = ({
  features,
  activeIndex,
  completedSteps = [],
  onStepSelect,
  ariaLabel,
  className = '',
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <nav aria-label={ariaLabel} className={`relative mx-auto w-full max-w-5xl ${className}`}>
      <div className='pointer-events-none absolute bottom-16 left-1/2 top-16 border-l-2 border-dashed border-brand-blue/20 lg:hidden' aria-hidden='true' />
      <svg
        className='pointer-events-none absolute inset-0 hidden h-full w-full lg:block'
        viewBox='0 0 1000 810'
        preserveAspectRatio='none'
        aria-hidden='true'
      >
        <motion.path
          d='M 280 125 C 540 120, 550 280, 720 345 C 850 405, 590 535, 350 625'
          fill='none'
          stroke='rgba(55, 181, 247, 0.3)'
          strokeWidth='2'
          strokeDasharray='9 8'
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
          animate={reducedMotion ? undefined : { strokeDashoffset: [0, -68] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      <div className='relative flex flex-col items-center gap-16 py-8 lg:block lg:min-h-[810px] lg:py-0'>
        {features.map((step, index) => {
          const active = activeIndex === index;
          const complete = completedSteps.includes(index);
          const tone = step.tone ?? 'blue';
          const status = active ? 'Etapa atual' : complete ? 'Concluída' : 'Próxima etapa';

          return (
            <motion.button
              key={step.title}
              type='button'
              onClick={() => onStepSelect(index)}
              aria-current={active ? 'step' : undefined}
              aria-label={`${status}: ${step.title}`}
              className={`group relative z-10 w-[min(88vw,370px)] rounded-xl border bg-card p-2 text-left shadow-[0_18px_42px_rgba(17,54,79,0.12)] outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30 ${positions[index]}`}
              initial={false}
              animate={{
                opacity: active ? 1 : complete ? 0.68 : 0.43,
                scale: active && !reducedMotion ? 1.055 : 0.97,
                filter: active ? 'saturate(1)' : 'saturate(0.42)',
              }}
              whileHover={reducedMotion ? undefined : { opacity: active ? 1 : 0.78, scale: active ? 1.055 : 1 }}
              whileTap={reducedMotion ? undefined : { scale: active ? 1.025 : 0.98 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className='absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2'>
                <Pin active={active} complete={complete} />
              </span>

              <span className={`flex min-h-[218px] flex-col rounded-lg border p-6 pt-8 ${toneClasses[tone]}`}>
                <span className='flex items-center justify-between gap-4'>
                  <span className='font-display text-4xl font-semibold tabular-nums'>0{index + 1}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${active ? 'bg-brand-yellow text-brand-ink' : 'bg-brand-ink/5 text-brand-ink/55'}`}>
                    {status}
                  </span>
                </span>
                <strong className='mt-6 font-display text-2xl font-semibold leading-tight text-brand-ink'>{step.title}</strong>
                <span className='mt-3 text-sm leading-6 text-brand-ink/65'>{step.description}</span>
                <span className={`mt-auto pt-5 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${active ? 'text-brand-blue' : 'text-brand-ink/45'}`}>
                  {active ? 'Continuar' : complete ? 'Revisar' : 'Conhecer etapa'}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default HowItWorks;
