import { createPaymentHandler } from '../_shared/payments/http/create-payment-handler.ts';

Deno.serve(createPaymentHandler());
