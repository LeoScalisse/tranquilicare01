import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DonationAmountWheelProps {
  id?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
}

const currencyNumber = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const DonationAmountWheel: React.FC<DonationAmountWheelProps> = ({
  id = 'donation-amount',
  value,
  onValueChange,
  min = 5,
  max = 100_000,
  step = 5,
  className,
  label = 'Valor da doação',
}) => {
  const [draft, setDraft] = useState(() => currencyNumber.format(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(currencyNumber.format(value));
  }, [editing, value]);

  const adjacentValues = useMemo(
    () => ({
      previous: clamp(value + step, min, max),
      next: clamp(value - step, min, max),
    }),
    [max, min, step, value],
  );

  const changeBy = (direction: 1 | -1) => {
    const nextValue = clamp(Math.round((value + direction * step) * 100) / 100, min, max);
    onValueChange(nextValue);
    setDraft(currencyNumber.format(nextValue));
  };

  const parseDraft = (raw: string) => {
    const sanitized = raw.replace(/[^\d.,]/g, '');
    let normalized = sanitized;
    if (sanitized.includes(',')) {
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      const dotParts = sanitized.split('.');
      normalized = dotParts.length === 2 && dotParts[1].length <= 2
        ? sanitized
        : sanitized.replace(/\./g, '');
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const commitDraft = () => {
    const parsed = parseDraft(draft);
    const nextValue = clamp(parsed ?? value, min, max);
    onValueChange(nextValue);
    setDraft(currencyNumber.format(nextValue));
    setEditing(false);
  };

  return (
    <motion.div
      className={cn(
        'relative mx-auto w-full max-w-sm touch-pan-x select-none overflow-hidden rounded-lg border-2 border-brand-blue/20 bg-background shadow-[0_22px_70px_rgba(16,108,154,0.14)]',
        className,
      )}
      drag='y'
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (info.offset.y < -24) changeBy(1);
        if (info.offset.y > 24) changeBy(-1);
      }}
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < 4) return;
        event.preventDefault();
        changeBy(event.deltaY > 0 ? -1 : 1);
      }}
      aria-label={`${label}: ${currencyNumber.format(value)} reais`}
    >
      <div className='pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-gradient-to-b from-background via-background/90 to-transparent' />
      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-background via-background/90 to-transparent' />

      <div className='grid h-44 grid-rows-[52px_72px_52px] items-center text-center'>
        <button
          type='button'
          onClick={() => changeBy(1)}
          onPointerDown={(event) => event.stopPropagation()}
          className='relative z-30 flex h-full items-center justify-center gap-2 text-sm font-bold text-brand-ink/35 transition-colors hover:text-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand-blue'
          aria-label={`Aumentar para ${currencyNumber.format(adjacentValues.previous)} reais`}
          title='Aumentar valor'
        >
          <ChevronUp size={16} aria-hidden='true' />
          R$ {currencyNumber.format(adjacentValues.previous)}
        </button>

        <div className='relative z-30 mx-3 flex h-[72px] items-center justify-center rounded-lg bg-brand-blue px-4 text-white shadow-[0_5px_0_#147da7]'>
          <span className='mr-2 text-lg font-bold' aria-hidden='true'>R$</span>
          <input
            id={id}
            value={draft}
            inputMode='decimal'
            autoComplete='off'
            onFocus={() => setEditing(true)}
            onBlur={commitDraft}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextDraft = event.target.value;
              setDraft(nextDraft);
              const parsed = parseDraft(nextDraft);
              if (parsed !== null && parsed >= min && parsed <= max) onValueChange(parsed);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                changeBy(1);
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                changeBy(-1);
              } else if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            aria-label={`${label} em reais`}
            className='min-w-0 max-w-[11rem] bg-transparent text-center text-3xl font-bold text-white outline-none placeholder:text-white/60'
          />
        </div>

        <button
          type='button'
          onClick={() => changeBy(-1)}
          onPointerDown={(event) => event.stopPropagation()}
          className='relative z-30 flex h-full items-center justify-center gap-2 text-sm font-bold text-brand-ink/35 transition-colors hover:text-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand-blue'
          aria-label={`Diminuir para ${currencyNumber.format(adjacentValues.next)} reais`}
          title='Diminuir valor'
        >
          <ChevronDown size={16} aria-hidden='true' />
          R$ {currencyNumber.format(adjacentValues.next)}
        </button>
      </div>
    </motion.div>
  );
};

export default DonationAmountWheel;
