import { PaymentError, PaymentProviderError } from '../../domain/payment.errors.ts';
import type { PaymentProvider } from '../../domain/payment-provider.ts';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  GetRecipientStatusInput,
  NormalizedPaymentEvent,
  PaymentStatusResult,
  ProviderWebhookInput,
  RecipientStatusResult,
  RefundPaymentInput,
  RefundPaymentResult,
} from '../../domain/payment.types.ts';
import {
  normalizeStripeEvent,
  stripeCheckoutStatus,
  stripePaymentIntentStatus,
  stripeRecipientStatus,
} from './stripe.mapper.ts';
import type { StripeClientPort } from './stripe.types.ts';

const externalId = (value: string | { id: string } | null | undefined) =>
  typeof value === 'string' ? value : value?.id ?? null;

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  readonly capabilities = {
    card: true,
    pix: false,
    boleto: false,
    split: true,
    refunds: true,
    recipients: true,
  } as const;

  constructor(
    private readonly client: StripeClientPort,
    private readonly webhookSecret: string | null,
    public readonly livemode: boolean,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.method !== 'card') {
      throw new PaymentError('stripe-method-not-supported', 'Stripe provider currently supports card only', 409);
    }
    const organizationAllocation = input.allocations.find((item) => item.role === 'organization');
    if (!organizationAllocation || organizationAllocation.amountCents !== input.amounts.donationAmountCents) {
      throw new PaymentError('invalid-split', 'Organization allocation must match donation amount');
    }

    const metadata = {
      donation_id: input.donationId,
      donation_amount_cents: String(input.amounts.donationAmountCents),
      platform_fee_cents: String(input.amounts.platformFeeCents),
      ...input.metadata,
    };

    try {
      const session = await this.client.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: input.donationId,
        ...(input.payerEmail ? { customer_email: input.payerEmail } : {}),
        line_items: [
          {
            price_data: {
              currency: input.amounts.currency,
              product_data: { name: 'Doacao para a causa' },
              unit_amount: input.amounts.donationAmountCents,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: input.amounts.currency,
              product_data: { name: 'Apoio ao TranquiliCare (5%)' },
              unit_amount: input.amounts.platformFeeCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: input.amounts.platformFeeCents,
          transfer_data: { destination: input.recipient.providerRecipientId },
          metadata,
        },
        metadata,
        success_url: input.successUrl.replace('{PAYMENT_ACTION_ID}', '{CHECKOUT_SESSION_ID}'),
        cancel_url: input.cancelUrl,
      });

      if (!session.url) throw new Error('Provider did not return a redirect URL');
      return {
        provider: this.name,
        status: stripeCheckoutStatus(session),
        providerPaymentId: externalId(session.payment_intent),
        providerActionId: session.id,
        action: { type: 'redirect', redirectUrl: session.url },
      };
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentProviderError('provider-create-payment-failed', 'Could not start payment', { cause: error });
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<PaymentStatusResult> {
    try {
      if (input.providerActionId) {
        const session = await this.client.checkout.sessions.retrieve(input.providerActionId);
        return {
          provider: this.name,
          status: stripeCheckoutStatus(session),
          providerActionId: session.id,
          providerPaymentId: externalId(session.payment_intent),
          donationId: session.metadata?.donation_id ?? null,
        };
      }
      if (input.providerPaymentId) {
        const intent = await this.client.paymentIntents.retrieve(input.providerPaymentId);
        return {
          provider: this.name,
          status: stripePaymentIntentStatus(intent),
          providerPaymentId: intent.id,
          donationId: intent.metadata?.donation_id ?? null,
        };
      }
      throw new PaymentError('missing-provider-reference', 'Payment reference is required');
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentProviderError('provider-payment-status-failed', 'Could not verify payment', { cause: error });
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    try {
      const refund = await this.client.refunds.create(
        {
          payment_intent: input.providerPaymentId,
          ...(input.amountCents ? { amount: input.amountCents } : {}),
          ...(input.reason ? { metadata: { reason: input.reason } } : {}),
        },
        input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
      );
      return {
        provider: this.name,
        providerRefundId: refund.id,
        status: refund.status === 'failed' || refund.status === 'canceled' ? 'failed' : 'refunded',
        amountCents: refund.amount,
      };
    } catch (error) {
      throw new PaymentProviderError('provider-refund-failed', 'Could not refund payment', { cause: error });
    }
  }

  async getRecipientStatus(input: GetRecipientStatusInput): Promise<RecipientStatusResult> {
    try {
      const account = await this.client.accounts.retrieve(input.providerRecipientId);
      return {
        provider: this.name,
        providerRecipientId: account.id,
        status: stripeRecipientStatus(account),
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
      };
    } catch (error) {
      throw new PaymentProviderError('provider-recipient-status-failed', 'Could not verify recipient', { cause: error });
    }
  }

  async parseWebhook(input: ProviderWebhookInput): Promise<NormalizedPaymentEvent | null> {
    if (!this.webhookSecret || !input.signature) {
      throw new PaymentError('invalid-webhook-signature', 'Missing webhook signature', 400);
    }
    try {
      const event = await this.client.webhooks.constructEventAsync(
        input.payload,
        input.signature,
        this.webhookSecret,
      );
      return normalizeStripeEvent(event);
    } catch (error) {
      throw new PaymentError('invalid-webhook-signature', 'Invalid webhook signature', 400, { cause: error });
    }
  }
}
