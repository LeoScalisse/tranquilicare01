const onlyDigits = (value: string): string => value.replace(/\D/g, '');

export const normalizeCnpj = (value: string): string => onlyDigits(value).slice(0, 14);

export const formatCnpj = (value: string): string => {
  const digits = normalizeCnpj(value);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const cnpjCheckDigit = (base: string, weights: number[]): number => {
  const total = base
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCnpj = (value: string): boolean => {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const first = cnpjCheckDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = cnpjCheckDigit(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${first}${second}`);
};

export const normalizePhone = (value: string): string => onlyDigits(value).slice(0, 11);

export const formatPhone = (value: string): string => {
  const digits = normalizePhone(value);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const isValidPhone = (value: string): boolean => {
  const digits = onlyDigits(value);
  return digits.length === 0 || ((digits.length === 10 || digits.length === 11) && !/^(\d)\1+$/.test(digits));
};

export const isValidAddress = (value: string): boolean => {
  const address = value.trim().replace(/\s+/g, ' ');
  return address.length >= 10 && /[A-Za-zÀ-ÿ]/.test(address);
};

export const isValidInstagram = (value: string): boolean => {
  const instagram = value.trim();
  if (!instagram) return true;
  return /^@?[A-Za-z0-9._]{1,30}$/.test(instagram)
    || /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/i.test(instagram);
};
