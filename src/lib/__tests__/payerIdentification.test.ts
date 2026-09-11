import { describe, expect, it } from 'vitest';

import { formatCpf, isValidCpf } from '@/lib/payerIdentification';
import { normalizePayerIdentification } from '../../../supabase/functions/_shared/payments/domain/payer-identification';

describe('payer identification', () => {
  it('formats and accepts a CPF with a valid checksum', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(normalizePayerIdentification({ type: 'cpf', number: '529.982.247-25' })).toEqual({
      type: 'CPF',
      number: '52998224725',
    });
  });

  it('rejects repeated or invalid CPF numbers', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(normalizePayerIdentification({ type: 'CPF', number: '52998224724' })).toBeNull();
  });
});
