import React from 'react';
import { AnimatedTooltip } from '@/components/ui/animated-tooltip';
import { verificationSeals } from '@/data/verificationSeals';

interface SealImpactShowcaseProps {
  onSelect: (sealId: string) => void;
}

const SealImpactShowcase: React.FC<SealImpactShowcaseProps> = ({ onSelect }) => (
  <section aria-labelledby='seal-impact-title' className='mx-auto mt-14 max-w-4xl border-y border-border py-10 sm:mt-20 sm:py-12'>
    <p id='seal-impact-title' className='text-sm font-bold text-brand-ink'>
      Explore o impacto por área
    </p>
    <p className='mt-1 text-sm text-muted-foreground'>Passe o cursor ou toque em um selo para conhecer os resultados acompanhados.</p>
    <AnimatedTooltip
      className='mt-8'
      onSelect={onSelect}
      items={verificationSeals.map((seal) => ({
        id: seal.id,
        name: seal.label,
        designation: seal.impact,
        detail: seal.detail,
        image: seal.src,
      }))}
    />
  </section>
);

export default SealImpactShowcase;
