import { describe, expect, it } from 'vitest';

import { calculateImpactQuantityMilli, translateImpact } from '@/lib/impact-scale';
import type { ImpactRate, ImpactUnit } from '@/lib/impact-scale';

const unit = (unitType: 'discrete' | 'continuous' = 'discrete'): ImpactUnit => ({
  key: 'school_kit',
  category: 'education',
  singular: 'kit escolar',
  plural: 'kits escolares',
  unitType,
});

const rate = (overrides: Partial<ImpactRate> = {}): ImpactRate => ({
  id: 'rate',
  organizationId: 'org',
  category: 'education',
  impactUnitKey: 'school_kit',
  baseAmountCents: 1000,
  baseQuantityMilli: 1000,
  isActive: true,
  isVerified: true,
  sourceDescription: 'Custo real informado pela organização.',
  ...overrides,
});

describe('Impact Scale', () => {
  it.each([[1000, 1000], [2000, 2000], [10000, 10000]])('traduz %i centavos deterministicamente', (amount, expected) => {
    expect(calculateImpactQuantityMilli(amount, rate(), unit())).toBe(expected);
  });

  it('arredonda unidades discretas para baixo e não exibe frações', () => {
    expect(calculateImpactQuantityMilli(1999, rate(), unit())).toBe(1000);
    expect(translateImpact({ amountCents: 500, rate: rate(), unit: unit() })).toBeNull();
  });

  it('limita unidades contínuas a uma casa decimal', () => {
    expect(calculateImpactQuantityMilli(1550, rate(), unit('continuous'))).toBe(1500);
  });

  it('recusa taxa não aprovada e mistura de categorias', () => {
    expect(translateImpact({ amountCents: 1000, rate: rate({ isVerified: false }), unit: unit() })).toBeNull();
    expect(translateImpact({
      amountCents: 1000,
      rate: rate(),
      unit: { ...unit(), category: 'health' },
    })).toBeNull();
  });

  it('não cria escala humana sem relação elegível', () => {
    const result = translateImpact({ amountCents: 1000, rate: rate(), unit: unit(), relations: [] });
    expect(result?.humanScale).toBeNull();
  });

  it('usa apenas relação da mesma categoria e unidade', () => {
    const result = translateImpact({
      amountCents: 2000,
      rate: rate(),
      unit: unit(),
      relations: [{
        key: 'safe',
        category: 'education',
        impactUnitKey: 'school_kit',
        template: '{N} mochilas mais completas.',
        referenceKey: null,
        isEstimate: false,
        priority: 1,
      }],
    });
    expect(result?.humanScale).toBe('2 mochilas mais completas.');
  });
});