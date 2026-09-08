import type { ImpactUnit } from './types';

export const formatImpactNumber = (quantityMilli: number) => {
  const value = quantityMilli / 1000;
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(value);
};

export const formatBaseImpact = (quantityMilli: number, unit: ImpactUnit) => {
  const value = quantityMilli / 1000;
  const label = value === 1 ? unit.singular : unit.plural;
  return formatImpactNumber(quantityMilli) + ' ' + label;
};