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

  it.each([
    ['founder-code-not-found', 'O código de ONG fundadora não existe. Confira o código e tente novamente.'],
    ['founder-code-invalid', 'O código de ONG fundadora não existe. Confira o código e tente novamente.'],
    ['founder-code-already-used', 'Este código de ONG fundadora já foi utilizado.'],
    ['founder-code-unavailable', 'Este código de ONG fundadora já foi utilizado.'],
    ['founder-code-expired', 'Este código de ONG fundadora expirou.'],
    ['founder-code-revoked', 'Este código de ONG fundadora não está mais disponível.'],
  ])('maps %s to a specific founder-code message', (databaseMessage, expected) => {
    expect(organizationProfileSaveError({
      code: 'P0001',
      message: databaseMessage,
    }, { founderCodeProvided: true })).toBe(expected);
  });

  it('keeps founder-code validation actionable when PostgREST omits the raised message', () => {
    expect(organizationProfileSaveError({ code: 'P0001' }, { founderCodeProvided: true }))
      .toBe('Não foi possível validar o código de ONG fundadora. Confira o código e tente novamente.');
  });

  it('explains the legacy pgcrypto search-path failure', () => {
    expect(organizationProfileSaveError({
      code: '42883',
      message: 'function digest(text, unknown) does not exist',
    }, { founderCodeProvided: true })).toBe('A validação do código fundador precisa ser atualizada no banco de dados.');
  });

  it('keeps a safe database code in otherwise unknown errors', () => {
    expect(organizationProfileSaveError({ code: '42501', message: 'permission denied' }))
      .toBe('Não foi possível salvar o perfil. Código do banco: 42501.');
  });
});
