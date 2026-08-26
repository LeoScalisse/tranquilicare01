import { mercadoPagoOAuthCallbackHandler } from "../_shared/payments/http/mercado-pago-oauth-callback-handler.ts";

Deno.serve(mercadoPagoOAuthCallbackHandler());
