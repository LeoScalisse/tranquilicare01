import { paymentWebhookHandler } from '../_shared/payments/http/payment-webhook-handler.ts';

Deno.serve(paymentWebhookHandler());
