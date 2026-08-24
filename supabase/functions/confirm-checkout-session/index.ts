import { confirmPaymentHandler } from '../_shared/payments/http/confirm-payment-handler.ts';

// Deprecated compatibility endpoint for clients deployed before the
// provider-agnostic payment API.
Deno.serve(confirmPaymentHandler({ legacyResponse: true }));
