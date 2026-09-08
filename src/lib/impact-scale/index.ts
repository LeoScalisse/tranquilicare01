import { calculateImpactQuantityMilli } from './calculator';
import { formatBaseImpact, formatImpactNumber } from './formatter';
import { selectHumanScale } from './scaleSelector';
import type { ImpactRate, ImpactRelation, ImpactTranslation, ImpactUnit } from './types';

export * from './types';
export * from './calculator';
export * from './formatter';
export * from './scaleSelector';
export * from './easterEggSelector';

export const translateImpact = (input: {
  amountCents: number;
  rate: ImpactRate;
  unit: ImpactUnit;
  relations?: ImpactRelation[];
}): ImpactTranslation | null => {
  const { amountCents, rate, unit, relations = [] } = input;
  if (!rate.isActive || !rate.isVerified || rate.category !== unit.category || rate.impactUnitKey !== unit.key) return null;
  const quantityMilli = calculateImpactQuantityMilli(amountCents, rate, unit);
  if (unit.unitType === 'discrete' && quantityMilli < 1000) return null;
  if (quantityMilli <= 0) return null;
  const scale = selectHumanScale(quantityMilli, relations.filter((relation) => (
    relation.category === unit.category && relation.impactUnitKey === unit.key
  )));
  return {
    amountCents,
    quantityMilli,
    formattedQuantity: formatImpactNumber(quantityMilli),
    baseImpact: formatBaseImpact(quantityMilli, unit),
    humanScale: scale?.text ?? null,
    sourceDescription: rate.sourceDescription,
    isEstimate: Boolean(scale?.isEstimate),
    unitKey: unit.key,
  };
};