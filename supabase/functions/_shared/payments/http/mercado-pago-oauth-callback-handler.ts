import { createClient } from "npm:@supabase/supabase-js@2.53.0";
import { PaymentError } from "../domain/payment.errors.ts";
import { SupabaseMercadoPagoOAuthRepository } from "../infrastructure/supabase-mercado-pago-oauth-repository.ts";
import { createMercadoPagoOAuthClient } from "../providers/mercado-pago/mercado-pago-oauth-client.ts";
import { MercadoPagoOAuthService } from "../services/mercado-pago-oauth-service.ts";

const profileRedirect = (appUrl: string, status: string): Response => {
  const url = new URL("/ngo/profile", appUrl);
  url.searchParams.set("mercado_pago", status);
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), "Cache-Control": "no-store" },
  });
};

export const mercadoPagoOAuthCallbackHandler = () =>
  async (request: Request) => {
    const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) return new Response("Backend not configured", { status: 503 });
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }
    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.has("error")) {
      return profileRedirect(appUrl, "denied");
    }
    const code = requestUrl.searchParams.get("code") ?? "";
    const state = requestUrl.searchParams.get("state") ?? "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientId = Deno.env.get("MERCADO_PAGO_CLIENT_ID");
    const clientSecret = Deno.env.get("MERCADO_PAGO_CLIENT_SECRET");
    const redirectUri = Deno.env.get("MERCADO_PAGO_OAUTH_REDIRECT_URI");
    const encryptionKey = Deno.env.get("PAYMENT_CREDENTIALS_ENCRYPTION_KEY");
    if (
      !supabaseUrl || !serviceRoleKey || !clientId || !clientSecret ||
      !redirectUri || !encryptionKey
    ) {
      return profileRedirect(appUrl, "configuration_error");
    }

    try {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const service = new MercadoPagoOAuthService(
        new SupabaseMercadoPagoOAuthRepository(admin),
        createMercadoPagoOAuthClient({ clientId, clientSecret, redirectUri }),
        encryptionKey,
      );
      await service.complete({ code, state });
      return profileRedirect(appUrl, "connected");
    } catch (error) {
      const code = error instanceof PaymentError
        ? error.code
        : "mercado-pago-oauth-callback-failed";
      console.error("Mercado Pago OAuth callback failed", { code });
      return profileRedirect(appUrl, "connection_error");
    }
  };
