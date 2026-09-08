import { useEffect, useState } from 'react';

import { loadImpactTranslation } from '@/lib/impact-scale/repository';
import type { ImpactTranslation as Translation } from '@/lib/impact-scale/types';

interface ImpactTranslationProps {
  organizationId: string;
  category: string;
  amountCents: number;
  variant?: 'compact' | 'celebration' | 'campaign';
  onTranslation?: (translation: Translation | null) => void;
}

const ImpactTranslation = ({
  organizationId,
  category,
  amountCents,
  variant = 'compact',
  onTranslation,
}: ImpactTranslationProps) => {
  const [translation, setTranslation] = useState<Translation | null>(null);

  useEffect(() => {
    let active = true;
    setTranslation(null);
    if (!organizationId || amountCents <= 0) {
      onTranslation?.(null);
      return undefined;
    }
    void loadImpactTranslation(organizationId, category, amountCents)
      .then((result) => {
        if (!active) return;
        setTranslation(result);
        onTranslation?.(result);
      })
      .catch(() => {
        if (active) {
          setTranslation(null);
          onTranslation?.(null);
        }
      });
    return () => { active = false; };
  }, [amountCents, category, onTranslation, organizationId]);

  if (!translation) return null;

  if (variant === 'campaign') {
    return <p className='mt-3 text-xs font-semibold leading-5 text-white/80'>Em tamanho real: {translation.humanScale || translation.baseImpact}</p>;
  }

  if (variant === 'celebration') {
    return (
      <span className='block'>
        {translation.baseImpact}
        {translation.humanScale && <span className='mt-1 block text-sm font-medium opacity-80'>{translation.humanScale}</span>}
      </span>
    );
  }

  return (
    <aside className='mt-3 rounded-2xl border border-brand-blue/15 bg-brand-blue/[0.06] px-4 py-3' aria-label='Tradução estimada do impacto'>
      <p className='text-sm font-bold text-brand-ink'>Este valor pode tornar possível {translation.baseImpact}.</p>
      {translation.humanScale && <p className='mt-1 text-xs leading-5 text-muted-foreground'>{translation.humanScale}</p>}
      <p className='mt-1.5 text-[11px] leading-4 text-muted-foreground'>Com base na relação informada pela organização e verificada pelo TranquiliCare.</p>
    </aside>
  );
};

export default ImpactTranslation;