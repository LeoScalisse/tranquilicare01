export interface StripeCheckoutSessionLike {
  id: string;
  url?: string | null;
  status?: 'open' | 'complete' | 'expired' | null;
  payment_status?: 'paid' | 'unpaid' | 'no_payment_required';
  payment_intent?: string | { id: string } | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
}

export interface StripePaymentIntentLike {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string> | null;
}

export interface StripeAccountLike {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  requirements?: { disabled_reason?: string | null } | null;
}

export interface StripeRefundLike {
  id: string;
  status?: string | null;
  amount: number;
}

export interface StripeEventLike {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}

export interface StripeClientPort {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>): Promise<StripeCheckoutSessionLike>;
      retrieve(id: string): Promise<StripeCheckoutSessionLike>;
    };
  };
  paymentIntents: {
    retrieve(id: string): Promise<StripePaymentIntentLike>;
  };
  accounts: {
    retrieve(id: string): Promise<StripeAccountLike>;
  };
  refunds: {
    create(
      params: Record<string, unknown>,
      options?: { idempotencyKey?: string },
    ): Promise<StripeRefundLike>;
  };
  webhooks: {
    constructEventAsync(payload: string, signature: string, secret: string): Promise<StripeEventLike>;
  };
}
