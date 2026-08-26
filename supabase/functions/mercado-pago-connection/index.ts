import { mercadoPagoConnectionHandler } from "../_shared/payments/http/mercado-pago-connection-handler.ts";

Deno.serve(mercadoPagoConnectionHandler());
