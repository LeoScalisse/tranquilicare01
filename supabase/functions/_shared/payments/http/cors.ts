const trustedBrowserOrigin = (
  configuredOrigin: string,
  requestOrigin?: string | null,
) => {
  if (!requestOrigin) return configuredOrigin;

  try {
    const configured = new URL(configuredOrigin);
    const candidate = new URL(requestOrigin);
    const isLocalDevelopment =
      candidate.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(candidate.hostname);
    const vercelSuffix = ".vercel.app";
    const projectSlug = configured.hostname.endsWith(vercelSuffix)
      ? configured.hostname.slice(0, -vercelSuffix.length)
      : "";
    const isProjectPreview =
      Boolean(projectSlug) &&
      candidate.protocol === "https:" &&
      candidate.hostname.endsWith(vercelSuffix) &&
      candidate.hostname.startsWith(`${projectSlug}-`);

    if (
      candidate.origin === configured.origin ||
      isLocalDevelopment ||
      isProjectPreview
    ) {
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
) => ({
  "Access-Control-Allow-Origin": trustedBrowserOrigin(
    configuredOrigin,
    requestOrigin,
  ),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});
