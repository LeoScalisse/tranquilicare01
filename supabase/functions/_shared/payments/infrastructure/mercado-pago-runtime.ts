import type { SupabaseClient } from "npm:@supabase/supabase-js@2.53.0";
import { PaymentError } from "../domain/payment.errors.ts";
import type { MercadoPagoProviderOptions } from "../providers/mercado-pago/mercado-pago-provider.ts";
import { createMercadoPagoOAuthClient } from "../providers/mercado-pago/mercado-pago-oauth-client.ts";
import { MercadoPagoCredentialService } from "../services/mercado-pago-credential-service.ts";
import { SupabaseMercadoPagoOAuthRepository } from "./supabase-mercado-pago-oauth-repository.ts";

export const createMercadoPagoProviderOptions = (
  adminClient: SupabaseClient,
): MercadoPagoProviderOptions => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const webhookUrl = Deno.env.get("MERCADO_PAGO_WEBHOOK_URL") ??
    (supabaseUrl
      ? `${supabaseUrl}/functions/v1/payment-webhook?provider=mercado_pago`
      : undefined);
  if (Deno.env.get("MERCADO_PAGO_LIVEMODE") !== "true") {
    return { ...(webhookUrl ? { webhookUrl } : {}) };
  }

  const clientId = Deno.env.get("MERCADO_PAGO_CLIENT_ID");
  const clientSecret = Deno.env.get("MERCADO_PAGO_CLIENT_SECRET");
  const redirectUri = Deno.env.get("MERCADO_PAGO_OAUTH_REDIRECT_URI");
  const encryptionKey = Deno.env.get("PAYMENT_CREDENTIALS_ENCRYPTION_KEY");
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey || !webhookUrl) {
    throw new PaymentError(
      "mercado-pago-marketplace-not-configured",
      "Mercado Pago marketplace is not configured",
      503,
    );
  }
  const credentialService = new MercadoPagoCredentialService(
    new SupabaseMercadoPagoOAuthRepository(adminClient),
    createMercadoPagoOAuthClient({ clientId, clientSecret, redirectUri }),
    encryptionKey,
  );
  return {
    webhookUrl,
    resolveAccessToken: (recipientId, livemode) =>
      credentialService.resolveAccessToken(recipientId, livemode),
  };
};
