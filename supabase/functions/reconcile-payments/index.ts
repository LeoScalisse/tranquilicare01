import { reconcilePaymentsHandler } from "../_shared/payments/http/reconcile-payments-handler.ts";

Deno.serve(reconcilePaymentsHandler());
