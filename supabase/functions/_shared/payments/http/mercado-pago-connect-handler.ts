import { createClient } from "npm:@supabase/supabase-js@2.53.0";
import { PaymentError } from "../domain/payment.errors.ts";
import { SupabaseMercadoPagoOAuthRepository } from "../infrastructure/supabase-mercado-pago-oauth-repository.ts";
import { createMercadoPagoOAuthClient } from "../providers/mercado-pago/mercado-pago-oauth-client.ts";
import { MercadoPagoOAuthService } from "../services/mercado-pago-oauth-service.ts";
import { corsHeaders, jsonResponse, paymentHttpConfig } from "./http.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const mercadoPagoConnectHandler = () => async (request: Request) => {
  const { appOrigin, allowedOrigins } = paymentHttpConfig();
  const headers = corsHeaders(appOrigin, request.headers.get("Origin"), allowedOrigins);
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("MERCADO_PAGO_CLIENT_ID");
  const clientSecret = Deno.env.get("MERCADO_PAGO_CLIENT_SECRET");
  const redirectUri = Deno.env.get("MERCADO_PAGO_OAUTH_REDIRECT_URI");
  const encryptionKey = Deno.env.get("PAYMENT_CREDENTIALS_ENCRYPTION_KEY");
  if (
    !supabaseUrl || !anonKey || !serviceRoleKey || !clientId ||
    !clientSecret || !redirectUri || !encryptionKey
  ) {
    return jsonResponse(
      { error: "Mercado Pago connection is not configured" },
      503,
      headers,
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required" }, 401, headers);
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (authError || !authData.user) {
    return jsonResponse({ error: "Authentication required" }, 401, headers);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, headers);
  }
  const organizationId = typeof body.organizationId === "string"
    ? body.organizationId.trim()
    : "";
  if (!UUID_PATTERN.test(organizationId)) {
    return jsonResponse({ error: "Invalid organization" }, 400, headers);
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
    const result = await service.begin({
      organizationId,
      userId: authData.user.id,
      requestedLiveMode:
        Deno.env.get("MERCADO_PAGO_OAUTH_LIVEMODE") === "true",
      redirectUri,
    });
    return jsonResponse({ authorizationUrl: result.authorizationUrl }, 200, headers);
  } catch (error) {
    const paymentError = error instanceof PaymentError
      ? error
      : new PaymentError(
        "mercado-pago-oauth-start-failed",
        "Could not start Mercado Pago connection",
        500,
        { cause: error },
      );
    console.error("Mercado Pago OAuth start failed", {
      code: paymentError.code,
      organizationId,
    });
    return jsonResponse(
      { error: paymentError.message, code: paymentError.code },
      paymentError.httpStatus,
      headers,
    );
  }
};
