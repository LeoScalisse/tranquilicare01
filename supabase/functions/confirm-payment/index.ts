import { confirmPaymentHandler } from '../_shared/payments/http/confirm-payment-handler.ts';

Deno.serve(confirmPaymentHandler());
