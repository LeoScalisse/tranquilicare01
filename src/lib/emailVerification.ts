export const EMAIL_CODE_MIN_LENGTH = 6;
export const EMAIL_CODE_MAX_LENGTH = 8;

export const normalizeEmailCode = (value: string): string =>
  value.replace(/\D/g, '').slice(0, EMAIL_CODE_MAX_LENGTH);

export const isCompleteEmailCode = (value: string): boolean => {
  const code = normalizeEmailCode(value);
  return code.length >= EMAIL_CODE_MIN_LENGTH && code.length <= EMAIL_CODE_MAX_LENGTH;
};
