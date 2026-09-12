import { createClient } from "npm:@supabase/supabase-js@2.53.0";
import { PaymentError } from "../domain/payment.errors.ts";
import { SupabaseMercadoPagoOAuthRepository } from "../infrastructure/supabase-mercado-pago-oauth-repository.ts";
import { corsHeaders, jsonResponse, paymentHttpConfig } from "./http.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const mercadoPagoConnectionHandler = () => async (request: Request) => {
  const { appOrigin, allowedOrigins } = paymentHttpConfig();
  const headers = corsHeaders(appOrigin, request.headers.get("Origin"), allowedOrigins);
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Backend not configured" }, 503, headers);
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required" }, 401, headers);
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData } = await userClient.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!authData.user) {
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
  const action = body.action === "disconnect" ? "disconnect" : "status";
  if (!UUID_PATTERN.test(organizationId)) {
    return jsonResponse({ error: "Invalid organization" }, 400, headers);
  }
  const liveMode = Deno.env.get("MERCADO_PAGO_OAUTH_LIVEMODE") === "true";
  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const repository = new SupabaseMercadoPagoOAuthRepository(admin);
    if (!await repository.canManageOrganization(
      organizationId,
      authData.user.id,
    )) {
      throw new PaymentError(
        "mercado-pago-oauth-forbidden",
        "You cannot manage payments for this organization",
        403,
      );
    }
    if (action === "disconnect") {
      await repository.disconnect(organizationId, liveMode);
      return jsonResponse({ connected: false }, 200, headers);
    }
    const connection = await repository.getConnection(organizationId, liveMode);
    return jsonResponse({
      connected: connection.connected,
      readyToReceive: connection.readyToReceive ?? false,
      status: connection.status ?? null,
      liveMode: connection.liveMode ?? liveMode,
      expiresAt: connection.expiresAt ?? null,
    }, 200, headers);
  } catch (error) {
    const paymentError = error instanceof PaymentError
      ? error
      : new PaymentError(
        "mercado-pago-connection-load-failed",
        "Could not load Mercado Pago connection",
        500,
        { cause: error },
      );
    console.error("Mercado Pago connection request failed", {
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
