type DatabaseError = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
  cause?: unknown;
};

type SaveErrorOptions = {
  founderCodeProvided?: boolean;
};

const errorContext = (error: unknown): string => {
  const databaseError = error && typeof error === 'object'
    ? error as DatabaseError
    : {};

  return [
    databaseError.code,
    databaseError.details,
    databaseError.hint,
    databaseError.message,
    databaseError.cause instanceof Error
      ? databaseError.cause.message
      : databaseError.cause,
    error instanceof Error ? error.message : error,
  ].map((value) => String(value ?? '')).join(' ').toLowerCase();
};

export const organizationProfileSaveError = (
  error: unknown,
  options: SaveErrorOptions = {},
): string => {
  const databaseError = error && typeof error === 'object'
    ? error as DatabaseError
    : {};
  const context = errorContext(error);
  const safeDatabaseCode = typeof databaseError.code === 'string'
    && /^[A-Z0-9]{3,10}$/i.test(databaseError.code)
    ? databaseError.code.toUpperCase()
    : '';

  if (databaseError.code === '23505' && context.includes('cnpj')) {
    return 'Este CNPJ já está vinculado a outra conta de ONG.';
  }
  if (context.includes('founder-code-not-found') || context.includes('founder-code-invalid')) {
    return 'O código de ONG fundadora não existe. Confira o código e tente novamente.';
  }
  if (context.includes('founder-code-already-used') || context.includes('founder-code-unavailable')) {
    return 'Este código de ONG fundadora já foi utilizado.';
  }
  if (context.includes('founder-code-expired')) {
    return 'Este código de ONG fundadora expirou.';
  }
  if (context.includes('founder-code-revoked')) {
    return 'Este código de ONG fundadora não está mais disponível.';
  }
  if (context.includes('founder-code-setup-only')) {
    return 'O código de ONG fundadora só pode ser usado durante a preparação inicial da organização.';
  }
  if (options.founderCodeProvided && databaseError.code === 'P0001') {
    return 'Não foi possível validar o código de ONG fundadora. Confira o código e tente novamente.';
  }

  if (context.includes('digest') && context.includes('does not exist')) {
    return 'A validação do código fundador precisa ser atualizada no banco de dados.';
  }

  if (context.includes('save_own_ngo_profile') || context.includes('organization-not-persisted')) {
    return 'O cadastro da organização precisa de uma atualização no banco. Tente novamente em alguns instantes.';
  }

  return safeDatabaseCode
    ? `Não foi possível salvar o perfil. Código do banco: ${safeDatabaseCode}.`
    : 'Não foi possível salvar o perfil. Tente novamente.';
};
