import type { NormalizedPaymentEvent } from '../domain/payment.types.ts';

export type PaymentEventClaim = 'claimed' | 'duplicate' | 'retry';

export interface PaymentEventRepository {
  claim(event: NormalizedPaymentEvent): Promise<PaymentEventClaim>;
  apply(event: NormalizedPaymentEvent): Promise<void>;
  markProcessed(provider: string, providerEventId: string): Promise<void>;
  markFailed(provider: string, providerEventId: string, message: string): Promise<void>;
}

export interface PaymentEventResult {
  processed: boolean;
  duplicate: boolean;
}

export class PaymentEventService {
  constructor(private readonly repository: PaymentEventRepository) {}

  async handle(event: NormalizedPaymentEvent): Promise<PaymentEventResult> {
    const claim = await this.repository.claim(event);
    if (claim === 'duplicate') return { processed: false, duplicate: true };

    try {
      await this.repository.apply(event);
      await this.repository.markProcessed(event.provider, event.providerEventId);
      return { processed: true, duplicate: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown payment event error';
      await this.repository.markFailed(event.provider, event.providerEventId, message.slice(0, 500));
      throw error;
    }
  }
}
