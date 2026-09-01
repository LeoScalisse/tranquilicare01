const trustedOrigin = (
  configuredOrigin: string,
  requestOrigin: string | null,
  additionalOrigins: readonly string[] = [],
) => {
  if (!requestOrigin) return configuredOrigin;
  try {
    const candidate = new URL(requestOrigin);
    const configured = new URL(configuredOrigin);
    const allowedOrigins = new Set([
      configured.origin,
      ...additionalOrigins.flatMap((origin) => {
        try {
          return [new URL(origin).origin];
        } catch {
          return [];
        }
      }),
    ]);
    const local = candidate.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(candidate.hostname);
    if (allowedOrigins.has(candidate.origin) || local) return candidate.origin;
  } catch {
    // Untrusted or malformed origins fall back to the configured application.
  }
  return configuredOrigin;
};

export const visualMediaCorsHeaders = (
  configuredOrigin: string,
  requestOrigin: string | null,
  additionalOrigins: readonly string[] = [],
) => ({
  'Access-Control-Allow-Origin': trustedOrigin(configuredOrigin, requestOrigin, additionalOrigins),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});

export const visualMediaJsonResponse = (
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) => new Response(JSON.stringify(body), {
  status,
  headers: { ...headers, 'Content-Type': 'application/json' },
});
