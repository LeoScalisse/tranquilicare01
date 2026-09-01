export interface PaymentHttpConfig {
  appUrl: string;
  appOrigin: string;
  allowedOrigins: string[];
}

export const paymentHttpConfig = (): PaymentHttpConfig => {
  const appUrl = Deno.env.get('APP_URL');
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? appUrl;
  if (!appUrl || !appOrigin) throw new Error('Missing payment HTTP environment variables');
  const allowedOrigins = (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return { appUrl, appOrigin, allowedOrigins };
};

export { corsHeaders } from './cors.ts';

export const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
) => new Response(JSON.stringify(body), {
  status,
  headers: { ...headers, 'Content-Type': 'application/json' },
});
