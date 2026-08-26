import { describe, expect, it, vi } from "vitest";

import {
  PaymentRateLimiter,
  paymentClientKey,
  type PaymentRateLimitRepository,
} from "../../../supabase/functions/_shared/payments/security/payment-rate-limit";

describe("PaymentRateLimiter", () => {
  it("hashes the client identity before sending it to persistence", async () => {
    const repository: PaymentRateLimitRepository = { consume: vi.fn().mockResolvedValue(true) };
    const limiter = new PaymentRateLimiter(repository, "production-pepper");

    await limiter.assertCreatePaymentAllowed({
      clientIdentity: "203.0.113.10",
      organizationId: "ngo-1",
      payerEmail: "doador@exemplo.com",
    });

    expect(repository.consume).toHaveBeenCalledTimes(2);
    for (const [input] of vi.mocked(repository.consume).mock.calls) {
      expect(input.keyHash).toMatch(/^[0-9a-f]{64}$/);
      expect(input.keyHash).not.toContain("203.0.113.10");
      expect(input.keyHash).not.toContain("doador@exemplo.com");
    }
  });

  it("fails with HTTP 429 when the atomic repository rejects an attempt", async () => {
    const repository: PaymentRateLimitRepository = { consume: vi.fn().mockResolvedValue(false) };
    const limiter = new PaymentRateLimiter(repository, "production-pepper");

    await expect(limiter.assertCreatePaymentAllowed({
      clientIdentity: "203.0.113.10",
      organizationId: "ngo-1",
      payerEmail: null,
    })).rejects.toMatchObject({ code: "payment-rate-limit-exceeded", httpStatus: 429 });
  });

  it("prefers trusted proxy headers and normalizes the first forwarded address", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.10, 10.0.0.1 " });
    expect(paymentClientKey(headers)).toBe("203.0.113.10");
  });
});
