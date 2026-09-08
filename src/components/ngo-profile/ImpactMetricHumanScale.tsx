import { useEffect, useState } from 'react';

import { loadMetricHumanScale } from '@/lib/impact-scale/repository';

interface Props {
  organizationId: string;
  category: string;
  impactUnitKey: string;
  quantity: number;
}

const ImpactMetricHumanScale = ({ organizationId, category, impactUnitKey, quantity }: Props) => {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadMetricHumanScale(organizationId, category, impactUnitKey, quantity)
      .then((result) => {
        if (active) setText(result);
      })
      .catch(() => {
        if (active) setText(null);
      });
    return () => { active = false; };
  }, [category, impactUnitKey, organizationId, quantity]);

  if (!text) return null;
  return <p className='mt-3 rounded-xl bg-brand-blue/[0.06] px-3 py-2 text-xs leading-5 text-brand-ink/75'><strong>Em tamanho real:</strong> {text}</p>;
};

export default ImpactMetricHumanScale;