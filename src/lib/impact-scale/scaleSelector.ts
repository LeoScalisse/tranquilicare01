import { formatImpactNumber } from './formatter';
import type { ImpactRelation } from './types';

export const selectHumanScale = (
  quantityMilli: number,
  relations: ImpactRelation[],
): { text: string; isEstimate: boolean } | null => {
  if (quantityMilli < 1000) return null;
  const eligible = relations
    .filter((relation) => !relation.referenceKey)
    .sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));
  const selected = eligible[0];
  if (!selected) return null;
  return {
    text: selected.template.replace(/\{N\}/g, formatImpactNumber(quantityMilli)),
    isEstimate: selected.isEstimate,
  };
};