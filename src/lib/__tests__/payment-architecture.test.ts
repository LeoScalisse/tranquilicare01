import { describe, expect, it, vi } from 'vitest';
import type { PaymentProvider } from '../../../supabase/functions/_shared/payments/domain/payment-provider';
import { createPaymentConfirmationEvent } from '../../../supabase/functions/_shared/payments/domain/payment-confirmation-event';
import {
  authorizePaymentConfirmation,
  hashPaymentConfirmationToken,
} from '../../../supabase/functions/_shared/payments/domain/payment-confirmation';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  NormalizedPaymentEvent,
  PaymentRecipient,
} from '../../../supabase/functions/_shared/payments/domain/payment.types';
import { StripeProvider } from '../../../supabase/functions/_shared/payments/providers/stripe/stripe-provider';
import type { StripeClientPort } from '../../../supabase/functions/_shared/payments/providers/stripe/stripe.types';
import { DonationPaymentService, type DonationPaymentRepository } from '../../../supabase/functions/_shared/payments/services/donation-payment-service';
import { PaymentEventService, type PaymentEventRepository } from '../../../supabase/functions/_shared/payments/services/payment-event-service';
import { PaymentProviderRegistry } from '../../../supabase/functions/_shared/payments/services/payment-provider-registry';
import { PaymentService } from '../../../supabase/functions/_shared/payments/services/payment-service';

const recipient: PaymentRecipient = {
  id: 'recipient-internal',
  organizationId: 'ngo-1',
  provider: 'stripe',
  providerRecipientId: 'acct_test',
  status: 'active',
  livemode: false,
};

const createInput = (): CreatePaymentInput => ({
  provider: 'stripe',
  donationId: 'donation-1',
  method: 'card',
  recipient,
  amounts: {
    donationAmountCents: 10_000,
    platformFeeCents: 500,
    totalAmountCents: 10_500,
    recipientAmountCents: 10_000,
    currency: 'brl',
  },
  allocations: [
    { recipientId: recipient.id, role: 'organization', amountCents: 10_000 },
    { recipientId: 'tranquilicare', role: 'platform', amountCents: 500 },
  ],
  successUrl: 'https://app.test/?payment_action_id={PAYMENT_ACTION_ID}',
  cancelUrl: 'https://app.test/?payment=cancelled',
});

const fakeProvider = (createPayment = vi.fn()): PaymentProvider => ({
  name: 'stripe',
  livemode: false,
  capabilities: { card: true, pix: false, boleto: false, split: true, refunds: true, recipients: true },
  createPayment,
  getPaymentStatus: vi.fn(),
  refundPayment: vi.fn(),
});

describe('provider-agnostic payment domain', () => {
  it('runs donation rules with a fake provider and keeps the provider behind the service', async () => {
    const providerResult: CreatePaymentResult = {
      provider: 'stripe',
      status: 'pending',
      providerActionId: 'external-action',
      action: { type: 'redirect', redirectUrl: 'https://pay.test' },
    };
    const createPayment = vi.fn().mockResolvedValue(providerResult);
    const service = new PaymentService(new PaymentProviderRegistry([fakeProvider(createPayment)]), 'stripe');
    const repository: DonationPaymentRepository = {
      findRecipient: vi.fn().mockResolvedValue(recipient),
      createAttempt: vi.fn().mockImplementation(async (input) => ({ donationId: input.donationId, paymentId: input.paymentId })),
      markActionCreated: vi.fn(),
      markAttemptFailed: vi.fn(),
    };
    const ids = ['donation-1', 'payment-1'];
    const donations = new DonationPaymentService(service, repository, () => ids.shift()!);

    const result = await donations.start({
      organizationId: 'ngo-1',
      amountCents: 10_000,
      successUrl: createInput().successUrl,
      cancelUrl: createInput().cancelUrl,
    });

    expect(result.action).toEqual({ type: 'redirect', redirectUrl: 'https://pay.test' });
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({
      donationId: 'donation-1',
      amounts: expect.objectContaining({
        donationAmountCents: 10_000,
        platformFeeCents: 500,
        totalAmountCents: 10_500,
        recipientAmountCents: 10_000,
      }),
    }));
    expect(repository.markActionCreated).toHaveBeenCalledOnce();
  });

  it('does not authorize a payment confirmation for another donor', async () => {
    await expect(authorizePaymentConfirmation({
      donorId: 'victim-user',
      requesterId: 'attacker-user',
      confirmationToken: null,
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
    })).rejects.toMatchObject({ code: 'payment-confirmation-forbidden', httpStatus: 403 });
  });

  it('authorizes an anonymous payment only with its unexpired confirmation token', async () => {
    const token = 'anonymous-confirmation-token-with-enough-entropy';
    const confirmationTokenHash = await hashPaymentConfirmationToken(token);

    await expect(authorizePaymentConfirmation({
      donorId: null,
      requesterId: null,
      confirmationToken: token,
      confirmationTokenHash,
      confirmationExpiresAt: '2099-01-01T00:00:00.000Z',
      now: new Date('2026-08-22T12:00:00.000Z'),
    })).resolves.toBe('anonymous');

    await expect(authorizePaymentConfirmation({
      donorId: null,
      requesterId: null,
      confirmationToken: 'wrong-token-with-enough-entropy-to-validate',
      confirmationTokenHash,
      confirmationExpiresAt: '2099-01-01T00:00:00.000Z',
      now: new Date('2026-08-22T12:00:00.000Z'),
    })).rejects.toMatchObject({ code: 'payment-confirmation-forbidden', httpStatus: 403 });

    await expect(authorizePaymentConfirmation({
      donorId: null,
      requesterId: null,
      confirmationToken: token,
      confirmationTokenHash,
      confirmationExpiresAt: '2026-08-22T11:59:59.000Z',
      now: new Date('2026-08-22T12:00:00.000Z'),
    })).rejects.toMatchObject({ code: 'payment-confirmation-forbidden', httpStatus: 403 });
  });

  it('turns a terminal provider confirmation into an idempotent payment event', () => {
    expect(createPaymentConfirmationEvent({
      status: {
        provider: 'mercado_pago',
        status: 'paid',
        providerActionId: 'ORD-1',
        providerPaymentId: 'PAY-1',
        donationId: 'donation-1',
      },
      actionId: 'ORD-1',
      donationId: 'donation-1',
      occurredAt: '2026-08-24T12:00:00.000Z',
    })).toEqual({
      provider: 'mercado_pago',
      providerEventId: 'confirmation:mercado_pago:ORD-1:paid',
      type: 'payment.paid',
      status: 'paid',
      providerActionId: 'ORD-1',
      providerPaymentId: 'PAY-1',
      donationId: 'donation-1',
      occurredAt: '2026-08-24T12:00:00.000Z',
      sanitizedPayload: { source: 'provider-status-confirmation' },
    });

    expect(createPaymentConfirmationEvent({
      status: { provider: 'mercado_pago', status: 'pending' },
      actionId: 'ORD-1',
      donationId: 'donation-1',
    })).toBeNull();
  });

  it('does not process the same normalized provider event twice', async () => {
    let claimed = false;
    const repository: PaymentEventRepository = {
      claim: vi.fn().mockImplementation(async () => claimed ? 'duplicate' : (claimed = true, 'claimed')),
      apply: vi.fn(),
      markProcessed: vi.fn(),
      markFailed: vi.fn(),
    };
    const events = new PaymentEventService(repository);
    const event: NormalizedPaymentEvent = {
      provider: 'stripe',
      providerEventId: 'evt_1',
      type: 'payment.paid',
      status: 'paid',
      donationId: 'donation-1',
      occurredAt: new Date().toISOString(),
    };

    expect(await events.handle(event)).toEqual({ processed: true, duplicate: false });
    expect(await events.handle(event)).toEqual({ processed: false, duplicate: true });
    expect(repository.apply).toHaveBeenCalledOnce();
  });
});

describe('StripeProvider adapter', () => {
  const stripeClient = () => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test_1',
          url: 'https://checkout.stripe.test',
          status: 'open',
          payment_status: 'unpaid',
          payment_intent: null,
          metadata: { donation_id: 'donation-1' },
        }),
        retrieve: vi.fn(),
      },
    },
    paymentIntents: { retrieve: vi.fn() },
    accounts: { retrieve: vi.fn() },
    refunds: { create: vi.fn() },
    webhooks: { constructEventAsync: vi.fn() },
  }) as unknown as StripeClientPort;

  it('translates neutral amounts and split into a Stripe destination charge', async () => {
    const client = stripeClient();
    const provider = new StripeProvider(client, 'whsec_test', false);
    const result = await provider.createPayment(createInput());

    expect(result).toEqual(expect.objectContaining({
      provider: 'stripe',
      status: 'pending',
      providerActionId: 'cs_test_1',
      action: { type: 'redirect', redirectUrl: 'https://checkout.stripe.test' },
    }));
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      success_url: 'https://app.test/?payment_action_id={CHECKOUT_SESSION_ID}',
      payment_intent_data: expect.objectContaining({
        application_fee_amount: 500,
        transfer_data: { destination: 'acct_test' },
      }),
    }));
  });

  it('normalizes a successful Stripe webhook before domain processing', async () => {
    const client = stripeClient();
    vi.mocked(client.webhooks.constructEventAsync).mockResolvedValue({
      id: 'evt_paid',
      type: 'payment_intent.succeeded',
      created: 1_700_000_000,
      data: {
        object: {
          id: 'pi_1',
          status: 'succeeded',
          metadata: { donation_id: 'donation-1' },
        },
      },
    });
    const provider = new StripeProvider(client, 'whsec_test', false);

    await expect(provider.parseWebhook({ payload: '{}', signature: 'signed' })).resolves.toEqual(
      expect.objectContaining({
        provider: 'stripe',
        providerEventId: 'evt_paid',
        providerPaymentId: 'pi_1',
        donationId: 'donation-1',
        type: 'payment.paid',
        status: 'paid',
      }),
    );
  });

  it('returns a neutral error without leaking the Stripe response', async () => {
    const client = stripeClient();
    vi.mocked(client.checkout.sessions.create).mockRejectedValue(new Error('card and request internals'));
    const provider = new StripeProvider(client, 'whsec_test', false);

    await expect(provider.createPayment(createInput())).rejects.toMatchObject({
      code: 'provider-create-payment-failed',
      message: 'Could not start payment',
    });
  });
});
