import { mercadoPagoConnectHandler } from "../_shared/payments/http/mercado-pago-connect-handler.ts";

Deno.serve(mercadoPagoConnectHandler());
