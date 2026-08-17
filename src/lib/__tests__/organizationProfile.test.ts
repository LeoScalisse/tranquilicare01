import { describe, expect, it } from 'vitest';

import {
  formatCnpj,
  formatPhone,
  isValidAddress,
  isValidCnpj,
  isValidPhone,
} from '@/lib/organizationProfile';

describe('organization profile validation', () => {
  it('formats and validates a CNPJ with correct check digits', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
    expect(isValidCnpj('112223330001811')).toBe(false);
  });

  it('keeps phone optional and validates Brazilian numbers when provided', () => {
    expect(isValidPhone('')).toBe(true);
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(isValidPhone('(11) 98765-4321')).toBe(true);
    expect(isValidPhone('1234')).toBe(false);
    expect(isValidPhone('119876543210')).toBe(false);
  });

  it('rejects blank or implausibly short addresses', () => {
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('Rua A')).toBe(false);
    expect(isValidAddress('Rua das Flores, 120 - Centro, Sao Paulo - SP')).toBe(true);
  });
});
