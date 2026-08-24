import { PaymentError } from '../domain/payment.errors.ts';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  NormalizedPaymentEvent,
  PaymentProviderName,
  PaymentStatusResult,
  ProviderWebhookInput,
  ReconcilePaymentInput,
  ReconciliationDifference,
  ReconciliationResult,
  RefundPaymentInput,
  RefundPaymentResult,
} from '../domain/payment.types.ts';
import { PaymentProviderRegistry } from './payment-provider-registry.ts';

const isPositiveInteger = (value: number) => Number.isSafeInteger(value) && value >= 0;

export class PaymentService {
  constructor(
    private readonly providers: PaymentProviderRegistry,
    private readonly defaultProvider: PaymentProviderName,
  ) {}

  resolveProvider(name?: PaymentProviderName) {
    return this.providers.get(name ?? this.defaultProvider);
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const { amounts } = input;
    if (!isPositiveInteger(amounts.donationAmountCents) || amounts.donationAmountCents < 50) {
      throw new PaymentError('invalid-donation-amount', 'Donation must be at least R$ 0,50');
    }
    if (!isPositiveInteger(amounts.platformFeeCents)) {
      throw new PaymentError('invalid-platform-fee', 'Invalid platform fee');
    }
    if (amounts.totalAmountCents !== amounts.donationAmountCents + amounts.platformFeeCents) {
      throw new PaymentError('invalid-payment-total', 'Payment total does not match its components');
    }
    if (amounts.recipientAmountCents !== amounts.donationAmountCents) {
      throw new PaymentError('invalid-recipient-amount', 'Recipient amount must match the donation amount');
    }

    const provider = this.resolveProvider(input.provider);
    if (!provider.capabilities[input.method]) {
      throw new PaymentError('payment-method-not-supported', 'Payment method is not supported', 409);
    }
    if (provider.livemode !== input.recipient.livemode) {
      throw new PaymentError('recipient-environment-mismatch', 'Recipient environment does not match payment environment', 409);
    }
    return provider.createPayment({ ...input, provider: provider.name });
  }

  getPaymentStatus(input: GetPaymentStatusInput): Promise<PaymentStatusResult> {
    return this.resolveProvider(input.provider).getPaymentStatus(input);
  }

  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return this.resolveProvider(input.provider).refundPayment(input);
  }

  parseWebhook(
    providerName: PaymentProviderName,
    input: ProviderWebhookInput,
  ): Promise<NormalizedPaymentEvent | null> {
    const provider = this.resolveProvider(providerName);
    if (!provider.parseWebhook) {
      throw new PaymentError('webhook-not-supported', 'Provider does not support webhooks', 409);
    }
    return provider.parseWebhook(input);
  }

  async reconcilePayment(input: ReconcilePaymentInput): Promise<ReconciliationResult> {
    const provider = this.resolveProvider(input.provider);
    if (provider.reconcilePayment) return provider.reconcilePayment(input);

    const status = await provider.getPaymentStatus(input);
    const differences: ReconciliationDifference[] = [];
    if (status.status !== input.expectedStatus) {
      differences.push({ field: 'status', expected: input.expectedStatus, actual: status.status });
    }
    return { provider: provider.name, matches: differences.length === 0, status, differences };
  }
}
