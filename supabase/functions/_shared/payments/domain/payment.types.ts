export const PAYMENT_PROVIDER_NAMES = ['stripe', 'mercado_pago', 'pagarme'] as const;

export type PaymentProviderName = (typeof PAYMENT_PROVIDER_NAMES)[number];
export type PaymentMethod = 'card' | 'pix' | 'boleto';
export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export type RecipientStatus = 'pending' | 'active' | 'restricted' | 'disabled';
export type PaymentEventType =
  | 'payment.created'
  | 'payment.pending'
  | 'payment.paid'
  | 'payment.failed'
  | 'payment.canceled'
  | 'payment.refunded'
  | 'payment.disputed'
  | 'recipient.updated';

export interface PaymentProviderCapabilities {
  card: boolean;
  pix: boolean;
  boleto: boolean;
  split: boolean;
  refunds: boolean;
  recipients: boolean;
}

export interface PaymentAmounts {
  donationAmountCents: number;
  platformFeeCents: number;
  processingFeeCents?: number | null;
  totalAmountCents: number;
  recipientAmountCents: number;
  currency: 'brl';
}

export interface SplitAllocation {
  recipientId: string;
  amountCents?: number;
  percentage?: number;
  role: 'organization' | 'platform';
}

export interface PaymentRecipient {
  id: string;
  organizationId: string;
  provider: PaymentProviderName;
  providerRecipientId: string;
  status: RecipientStatus;
  livemode: boolean;
}

export interface PaymentAction {
  type: 'redirect' | 'qr_code' | 'client_secret' | 'completed';
  redirectUrl?: string;
  qrCode?: string;
  qrCodeText?: string;
  clientSecret?: string;
}

export interface CreatePaymentInput {
  provider?: PaymentProviderName;
  donationId: string;
  method: PaymentMethod;
  amounts: PaymentAmounts;
  recipient: PaymentRecipient;
  allocations: SplitAllocation[];
  successUrl: string;
  cancelUrl: string;
  payerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  provider: PaymentProviderName;
  status: PaymentStatus;
  providerPaymentId?: string | null;
  providerActionId?: string | null;
  action: PaymentAction;
}

export interface GetPaymentStatusInput {
  provider?: PaymentProviderName;
  providerPaymentId?: string;
  providerActionId?: string;
}

export interface PaymentStatusResult {
  provider: PaymentProviderName;
  status: PaymentStatus;
  providerPaymentId?: string | null;
  providerActionId?: string | null;
  donationId?: string | null;
  amounts?: Partial<PaymentAmounts>;
}

export interface RefundPaymentInput {
  provider?: PaymentProviderName;
  providerPaymentId: string;
  amountCents?: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundPaymentResult {
  provider: PaymentProviderName;
  providerRefundId: string;
  status: PaymentStatus;
  amountCents: number;
}

export interface GetRecipientStatusInput {
  provider?: PaymentProviderName;
  providerRecipientId: string;
}

export interface RecipientStatusResult {
  provider: PaymentProviderName;
  providerRecipientId: string;
  status: RecipientStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export interface ProviderWebhookInput {
  payload: string;
  signature?: string | null;
  requestId?: string | null;
  providerEventId?: string | null;
  providerActionId?: string | null;

}
export interface NormalizedPaymentEvent {
  provider: PaymentProviderName;
  providerEventId: string;
  type: PaymentEventType;
  providerPaymentId?: string | null;
  providerActionId?: string | null;
  providerRecipientId?: string | null;
  donationId?: string | null;
  occurredAt: string;
  status?: PaymentStatus;
  sanitizedPayload?: Record<string, unknown>;
}

export interface ReconcilePaymentInput extends GetPaymentStatusInput {
  expectedStatus: PaymentStatus;
  expectedAmounts?: Partial<PaymentAmounts>;
}

export interface ReconciliationDifference {
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface ReconciliationResult {
  provider: PaymentProviderName;
  matches: boolean;
  status: PaymentStatusResult;
  differences: ReconciliationDifference[];
}
