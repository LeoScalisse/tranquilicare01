import type { SupabaseClient } from "npm:@supabase/supabase-js@2.53.0";
import { PaymentError } from "../domain/payment.errors.ts";
import type {
  PaymentRateLimitInput,
  PaymentRateLimitRepository,
} from "../security/payment-rate-limit.ts";

export class SupabasePaymentRateLimitRepository
  implements PaymentRateLimitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async consume(input: PaymentRateLimitInput): Promise<boolean> {
    const { data, error } = await this.client.rpc(
      "consume_payment_rate_limit",
      {
        p_key_hash: input.keyHash,
        p_scope: input.scope,
        p_window_seconds: input.windowSeconds,
        p_limit: input.limit,
      },
    );
    if (error) {
      throw new PaymentError(
        "payment-rate-limit-check-failed",
        "Could not validate payment attempt",
        503,
        { cause: error },
      );
    }
    return data === true;
  }
}
