const trustedBrowserOrigin = (
  configuredOrigin: string,
  requestOrigin?: string | null,
  additionalOrigins: readonly string[] = [],
) => {
  if (!requestOrigin) return configuredOrigin;

  try {
    const configured = new URL(configuredOrigin);
    const candidate = new URL(requestOrigin);
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
    const isLocalDevelopment =
      candidate.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(candidate.hostname);

    if (allowedOrigins.has(candidate.origin) || isLocalDevelopment) {
      return candidate.origin;
    }
  } catch {
    // Invalid and untrusted origins fall back to the configured production origin.
  }

  return configuredOrigin;
};

export const corsHeaders = (
  configuredOrigin: string,
  requestOrigin?: string | null,
  additionalOrigins: readonly string[] = [],
) => ({
  "Access-Control-Allow-Origin": trustedBrowserOrigin(
    configuredOrigin,
    requestOrigin,
    additionalOrigins,
  ),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});
