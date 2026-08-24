import { createPaymentHandler } from '../_shared/payments/http/create-payment-handler.ts';

// Deprecated compatibility endpoint for clients deployed before the
// provider-agnostic payment API.
Deno.serve(createPaymentHandler({ legacyResponse: true }));
