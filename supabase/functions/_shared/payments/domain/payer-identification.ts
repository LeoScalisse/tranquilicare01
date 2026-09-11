import type { PayerIdentification } from './payment.types.ts';

const hasValidCpfChecksum = (digits: string): boolean => {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return checkDigit(9) === Number(digits[9])
    && checkDigit(10) === Number(digits[10]);
};

export const normalizePayerIdentification = (
  value: unknown,
): PayerIdentification | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (String(record.type ?? '').toUpperCase() !== 'CPF') return null;
  const number = typeof record.number === 'string'
    ? record.number.replace(/\D/g, '')
    : '';
  return hasValidCpfChecksum(number) ? { type: 'CPF', number } : null;
};

export const isValidCpf = (value: string): boolean =>
  hasValidCpfChecksum(value.replace(/\D/g, ''));
