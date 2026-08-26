import { PaymentError } from "../domain/payment.errors.ts";

export interface PaymentRateLimitInput {
  keyHash: string;
  scope: string;
  windowSeconds: number;
  limit: number;
}

export interface PaymentRateLimitRepository {
  consume(input: PaymentRateLimitInput): Promise<boolean>;
}

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

const firstHeaderValue = (value: string | null): string | null => {
  const first = value?.split(",", 1)[0]?.trim();
  return first && first.length <= 128 ? first : null;
};

export const paymentClientKey = (headers: Headers): string =>
  firstHeaderValue(headers.get("cf-connecting-ip")) ??
  firstHeaderValue(headers.get("x-real-ip")) ??
  firstHeaderValue(headers.get("x-forwarded-for")) ??
  "unidentified-client";

export class PaymentRateLimiter {
  constructor(
    private readonly repository: PaymentRateLimitRepository,
    private readonly pepper: string,
  ) {
    if (pepper.length < 16) {
      throw new PaymentError(
        "payment-rate-limit-not-configured",
        "Payment protection is not configured",
        503,
      );
    }
  }

  async assertCreatePaymentAllowed(input: {
    clientIdentity: string;
    organizationId: string;
    payerEmail: string | null;
  }): Promise<void> {
    const dimensions = [
      {
        value: `client:${input.clientIdentity}:organization:${input.organizationId}`,
        scope: "create-payment-client-organization",
        windowSeconds: 600,
        limit: 8,
      },
      ...(input.payerEmail
        ? [{
          value: `email:${input.payerEmail}:organization:${input.organizationId}`,
          scope: "create-payment-email-organization",
          windowSeconds: 600,
          limit: 8,
        }]
        : []),
    ];

    for (const dimension of dimensions) {
      const keyHash = await sha256Hex(`${this.pepper}:${dimension.value}`);
      const allowed = await this.repository.consume({
        keyHash,
        scope: dimension.scope,
        windowSeconds: dimension.windowSeconds,
        limit: dimension.limit,
      });
      if (!allowed) {
        throw new PaymentError(
          "payment-rate-limit-exceeded",
          "Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.",
          429,
        );
      }
    }
  }
}
