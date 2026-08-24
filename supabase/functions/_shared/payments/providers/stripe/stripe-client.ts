import Stripe from 'npm:stripe@18.5.0';
import { StripeProvider } from './stripe-provider.ts';
import type { StripeClientPort } from './stripe.types.ts';

export const createStripeProvider = (
  secretKey: string,
  webhookSecret: string | null = null,
): StripeProvider => {
  const client = new Stripe(secretKey) as unknown as StripeClientPort;
  return new StripeProvider(client, webhookSecret, secretKey.startsWith('sk_live_'));
};
