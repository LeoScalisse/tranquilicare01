import type {
  NormalizedPaymentEvent,
  PaymentEventType,
  PaymentStatus,
  PaymentStatusResult,
} from "./payment.types.ts";

const CONFIRMABLE_EVENT_TYPES: Partial<Record<PaymentStatus, PaymentEventType>> = {
  paid: "payment.paid",
  failed: "payment.failed",
  canceled: "payment.canceled",
  refunded: "payment.refunded",
  partially_refunded: "payment.refunded",
  disputed: "payment.disputed",
};

interface PaymentConfirmationEventInput {
  status: PaymentStatusResult;
  actionId: string;
  donationId: string;
  occurredAt?: string;
}

export const createPaymentConfirmationEvent = ({
  status,
  actionId,
  donationId,
  occurredAt = new Date().toISOString(),
}: PaymentConfirmationEventInput): NormalizedPaymentEvent | null => {
  const type = CONFIRMABLE_EVENT_TYPES[status.status];
  if (!type) return null;

  return {
    provider: status.provider,
    providerEventId: `confirmation:${status.provider}:${actionId}:${status.status}`,
    type,
    status: status.status,
    providerActionId: status.providerActionId ?? actionId,
    providerPaymentId: status.providerPaymentId ?? null,
    donationId: status.donationId ?? donationId,
    occurredAt,
    sanitizedPayload: { source: "provider-status-confirmation" },
  };
};