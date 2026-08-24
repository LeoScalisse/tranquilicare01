import { paymentWebhookHandler } from '../_shared/payments/http/payment-webhook-handler.ts';

// Deprecated compatibility endpoint. Existing Stripe Workbench endpoints can
// keep delivering here while production migrates to payment-webhook?provider=stripe.
Deno.serve(paymentWebhookHandler({ provider: 'stripe' }));
