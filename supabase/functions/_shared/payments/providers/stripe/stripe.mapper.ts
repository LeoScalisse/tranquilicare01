import type {
  NormalizedPaymentEvent,
  PaymentStatus,
  RecipientStatus,
} from '../../domain/payment.types.ts';
import type {
  StripeAccountLike,
  StripeCheckoutSessionLike,
  StripeEventLike,
  StripePaymentIntentLike,
} from './stripe.types.ts';

const objectId = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id;
  }
  return null;
};

const objectMetadata = (object: Record<string, unknown>): Record<string, string> => {
  const metadata = object.metadata;
  if (!metadata || typeof metadata !== 'object') return {};
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
};

export const stripeCheckoutStatus = (session: StripeCheckoutSessionLike): PaymentStatus => {
  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') return 'paid';
  if (session.status === 'expired') return 'canceled';
  return 'pending';
};

export const stripePaymentIntentStatus = (intent: StripePaymentIntentLike): PaymentStatus => {
  switch (intent.status) {
    case 'succeeded': return 'paid';
    case 'canceled': return 'canceled';
    case 'requires_payment_method': return 'failed';
    case 'processing': return 'pending';
    default: return 'pending';
  }
};

export const stripeRecipientStatus = (account: StripeAccountLike): RecipientStatus => {
  if (account.charges_enabled && account.payouts_enabled) return 'active';
  if (account.requirements?.disabled_reason) return 'restricted';
  return 'pending';
};

export const normalizeStripeEvent = (event: StripeEventLike): NormalizedPaymentEvent | null => {
  const object = event.data.object;
  const metadata = objectMetadata(object);
  const common = {
    provider: 'stripe' as const,
    providerEventId: event.id,
    occurredAt: new Date(event.created * 1000).toISOString(),
    donationId: metadata.donation_id ?? null,
  };

  if (event.type.startsWith('checkout.session.')) {
    const session = object as unknown as StripeCheckoutSessionLike;
    const paymentId = objectId(session.payment_intent);
    if (event.type === 'checkout.session.async_payment_failed') {
      return {
        ...common,
        type: 'payment.failed',
        status: 'failed',
        providerActionId: session.id,
        providerPaymentId: paymentId,
        sanitizedPayload: { checkoutStatus: session.status, paymentStatus: session.payment_status },
      };
    }
    const status = stripeCheckoutStatus(session);
    return {
      ...common,
      type: status === 'paid' ? 'payment.paid' : status === 'canceled' ? 'payment.canceled' : 'payment.pending',
      status,
      providerActionId: session.id,
      providerPaymentId: paymentId,
      sanitizedPayload: { checkoutStatus: session.status, paymentStatus: session.payment_status },
    };
  }

  if (event.type.startsWith('payment_intent.')) {
    const intent = object as unknown as StripePaymentIntentLike;
    const status = event.type === 'payment_intent.payment_failed'
      ? 'failed'
      : stripePaymentIntentStatus(intent);
    return {
      ...common,
      type: status === 'paid' ? 'payment.paid' : status === 'canceled' ? 'payment.canceled' : status === 'failed' ? 'payment.failed' : 'payment.pending',
      status,
      providerPaymentId: intent.id,
      sanitizedPayload: { paymentStatus: intent.status },
    };
  }

  if (event.type === 'charge.refunded') {
    return {
      ...common,
      type: 'payment.refunded',
      status: 'refunded',
      providerPaymentId: objectId(object.payment_intent),
      sanitizedPayload: { refunded: true },
    };
  }

  if (event.type === 'charge.dispute.created') {
    return {
      ...common,
      type: 'payment.disputed',
      status: 'disputed',
      providerPaymentId: objectId(object.payment_intent),
      sanitizedPayload: { disputeStatus: object.status ?? null },
    };
  }

  if (event.type === 'account.updated') {
    const account = object as unknown as StripeAccountLike;
    return {
      ...common,
      type: 'recipient.updated',
      providerRecipientId: account.id,
      sanitizedPayload: {
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
      },
    };
  }

  return null;
};
