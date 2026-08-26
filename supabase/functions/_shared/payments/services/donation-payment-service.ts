import { PaymentError } from '../domain/payment.errors.ts';
import {
  createPaymentConfirmationCredential,
  type PaymentConfirmationCredential,
} from '../domain/payment-confirmation.ts';
import type {
  CreatePaymentResult,
  PaymentMethod,
  PaymentProviderName,
  PaymentRecipient,
} from '../domain/payment.types.ts';
import { PaymentService } from './payment-service.ts';

export interface DonationPaymentAttempt {
  donationId: string;
  paymentId: string;
}

export interface CreateDonationAttemptInput {
  donationId: string;
  paymentId: string;
  donorId: string | null;
  organizationId: string;
  campaignId: string | null;
  provider: PaymentProviderName;
  method: PaymentMethod;
  recipient: PaymentRecipient;
  donationAmountCents: number;
  platformFeeCents: number;
  totalAmountCents: number;
  confirmationTokenHash: string;
  confirmationExpiresAt: string;
}

export interface DonationPaymentRepository {
  findRecipient(
    organizationId: string,
    provider: PaymentProviderName,
    livemode: boolean,
  ): Promise<PaymentRecipient | null>;
  createAttempt(input: CreateDonationAttemptInput): Promise<DonationPaymentAttempt>;
  markActionCreated(
    attempt: DonationPaymentAttempt,
    result: CreatePaymentResult,
  ): Promise<void>;
  markAttemptFailed(attempt: DonationPaymentAttempt, code: string): Promise<void>;
}

export interface StartDonationPaymentInput {
  provider?: PaymentProviderName;
  method?: PaymentMethod;
  organizationId: string;
  campaignId?: string | null;
  amountCents: number;
  payerEmail?: string;
  donor?: { id: string; email?: string } | null;
  successUrl: string;
  cancelUrl: string;
}

export interface StartDonationPaymentResult extends CreatePaymentResult {
  donationId: string;
  paymentId: string;
  confirmationToken: string;
}

export class DonationPaymentService {
  constructor(
    private readonly payments: PaymentService,
    private readonly repository: DonationPaymentRepository,
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly createConfirmationCredential: () => Promise<PaymentConfirmationCredential> = createPaymentConfirmationCredential,
  ) {}

  async start(input: StartDonationPaymentInput): Promise<StartDonationPaymentResult> {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 50 || input.amountCents > 10_000_000) {
      throw new PaymentError('invalid-donation-amount', 'Donation must be between R$ 0,50 and R$ 100.000,00');
    }
    const provider = this.payments.resolveProvider(input.provider);
    const recipient = await this.repository.findRecipient(input.organizationId, provider.name, provider.livemode);
    if (!recipient) throw new PaymentError('recipient-not-connected', 'This organization is not connected to payments yet', 409);
    if (recipient.status !== 'active') {
      throw new PaymentError('recipient-not-ready', 'This organization is not ready to receive donations yet', 409);
    }

    const donationId = this.newId();
    const paymentId = this.newId();
    const platformFeeCents = Math.round((input.amountCents * 5) / 100);
    const totalAmountCents = input.amountCents + platformFeeCents;
    const method = input.method ?? 'card';
    const confirmation = await this.createConfirmationCredential();
    const attempt = await this.repository.createAttempt({
      donationId,
      paymentId,
      donorId: input.donor?.id ?? null,
      organizationId: input.organizationId,
      campaignId: input.campaignId ?? null,
      provider: provider.name,
      method,
      recipient,
      donationAmountCents: input.amountCents,
      platformFeeCents,
      totalAmountCents,
      confirmationTokenHash: confirmation.tokenHash,
      confirmationExpiresAt: confirmation.expiresAt,
    });

    try {
      const result = await this.payments.createPayment({
        provider: provider.name,
        donationId,
        method,
        recipient,
        amounts: {
          donationAmountCents: input.amountCents,
          platformFeeCents,
          totalAmountCents,
          recipientAmountCents: input.amountCents,
          processingFeeCents: null,
          currency: 'brl',
        },
        allocations: [
          { recipientId: recipient.id, amountCents: input.amountCents, role: 'organization' },
          { recipientId: 'tranquilicare', amountCents: platformFeeCents, role: 'platform' },
        ],
        successUrl: `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}payment_confirmation_token=${encodeURIComponent(confirmation.token)}`,
        cancelUrl: input.cancelUrl,
        payerEmail: input.donor?.email ?? input.payerEmail,
        metadata: {
          payment_id: paymentId,
          organization_id: input.organizationId,
          ...(input.donor ? { donor_id: input.donor.id } : {}),
          ...(input.campaignId ? { campaign_id: input.campaignId } : {}),
        },
      });
      await this.repository.markActionCreated(attempt, result);
      return { ...result, donationId, paymentId, confirmationToken: confirmation.token };
    } catch (error) {
      const code = error instanceof PaymentError ? error.code : 'payment-start-failed';
      await this.repository.markAttemptFailed(attempt, code);
      throw error;
    }
  }
}
