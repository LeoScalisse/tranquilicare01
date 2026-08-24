import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  GetRecipientStatusInput,
  NormalizedPaymentEvent,
  PaymentProviderCapabilities,
  PaymentProviderName,
  PaymentStatusResult,
  ProviderWebhookInput,
  RecipientStatusResult,
  ReconcilePaymentInput,
  ReconciliationResult,
  RefundPaymentInput,
  RefundPaymentResult,
} from './payment.types.ts';

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  readonly livemode: boolean;
  readonly capabilities: PaymentProviderCapabilities;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(input: GetPaymentStatusInput): Promise<PaymentStatusResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
  getRecipientStatus?(input: GetRecipientStatusInput): Promise<RecipientStatusResult>;
  reconcilePayment?(input: ReconcilePaymentInput): Promise<ReconciliationResult>;
  parseWebhook?(input: ProviderWebhookInput): Promise<NormalizedPaymentEvent | null>;
}
