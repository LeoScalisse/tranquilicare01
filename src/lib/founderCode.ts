/**
 * Normalizes the human-friendly founder invitation input before transport.
 * Authorization still happens exclusively in the database against a hash.
 */
export const normalizeFounderCode = (value: string): string => {
  const compact = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  if (!compact) return '';
  return compact.startsWith('TC') && compact.length > 2
    ? `TC-${compact.slice(2)}`
    : compact;
};
