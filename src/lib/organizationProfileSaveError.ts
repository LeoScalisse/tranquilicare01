type DatabaseError = {
  code?: unknown;
  details?: unknown;
  message?: unknown;
};

export const organizationProfileSaveError = (error: unknown): string => {
  const databaseError = error && typeof error === 'object'
    ? error as DatabaseError
    : {};
  const context = `${String(databaseError.details ?? '')} ${String(databaseError.message ?? '')}`.toLowerCase();

  if (databaseError.code === '23505' && context.includes('cnpj')) {
    return 'Este CNPJ já está vinculado a outra conta de ONG.';
  }
  if (context.includes('founder-code-invalid') || context.includes('founder-code-unavailable')) {
    return 'Este código de ONG fundadora é inválido, expirou ou já foi utilizado.';
  }

  if (context.includes('save_own_ngo_profile') || context.includes('organization-not-persisted')) {
    return 'O cadastro da organização precisa de uma atualização no banco. Tente novamente em alguns instantes.';
  }

  return 'Não foi possível salvar o perfil. Tente novamente.';
};
