import type { ImpactRate, ImpactUnit } from './types';

const assertPositiveInteger = (value: number, field: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('invalid-' + field);
};

export const calculateImpactQuantityMilli = (
  amountCents: number,
  rate: ImpactRate,
  unit: ImpactUnit,
): number => {
  assertPositiveInteger(amountCents, 'amount');
  assertPositiveInteger(rate.baseAmountCents, 'rate-amount');
  assertPositiveInteger(rate.baseQuantityMilli, 'rate-quantity');

  const raw = (BigInt(amountCents) * BigInt(rate.baseQuantityMilli)) / BigInt(rate.baseAmountCents);
  const rounded = unit.unitType === 'discrete'
    ? (raw / 1000n) * 1000n
    : (raw / 100n) * 100n;

  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('impact-overflow');
  return Number(rounded);
};