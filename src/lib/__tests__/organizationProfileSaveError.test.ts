import { describe, expect, it } from 'vitest';

import { organizationProfileSaveError } from '@/lib/organizationProfileSaveError';

describe('organizationProfileSaveError', () => {
  it('explains when a CNPJ is already linked to another organization account', () => {
    expect(organizationProfileSaveError({
      code: '23505',
      details: 'Key (cnpj)=(14380200000121) already exists.',
      message: 'duplicate key value violates unique constraint ngo_profiles_cnpj_unique',
    })).toBe('Este CNPJ já está vinculado a outra conta de ONG.');
  });

  it('keeps an actionable fallback without exposing database internals', () => {
    expect(organizationProfileSaveError(new Error('network request failed')))
      .toBe('Não foi possível salvar o perfil. Tente novamente.');
  });
});
