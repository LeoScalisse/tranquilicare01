import { describe, expect, it } from 'vitest';

import { translateDashboardNumber } from '@/lib/dashboard-number-translator';

describe('translateDashboardNumber', () => {
  it('translates confirmed totals without inventing a universal impact unit', () => {
    const result = translateDashboardNumber({
      kind: 'community',
      amountCents: 115200,
      count: 29,
      milestoneCents: 250000,
    });
    expect(result.value).toContain('1.152,00');
    expect(result.shortText).toContain('46%');
    expect(result.detailText).toContain('29 doações confirmadas');
    expect(result.methodology).toContain('não é convertido');
  });

  it('describes verified organizations as an exact count', () => {
    const result = translateDashboardNumber({ kind: 'verified', count: 3 });
    expect(result.value).toBe('3');
    expect(result.methodology).toContain('Não é uma estimativa');
  });
});