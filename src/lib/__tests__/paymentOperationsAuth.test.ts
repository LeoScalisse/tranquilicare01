import { describe, expect, it } from "vitest";

import { authorizePaymentOperationsRequest } from "../../../supabase/functions/_shared/payments/security/payment-operations-auth";

describe("payment operations authentication", () => {
  const secret = "a-production-secret-with-more-than-32-characters";

  it("accepts only the exact bearer secret", async () => {
    await expect(authorizePaymentOperationsRequest(
      new Request("https://example.test", {
        headers: { Authorization: `Bearer ${secret}` },
      }),
      secret,
    )).resolves.toBe(true);

    await expect(authorizePaymentOperationsRequest(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
      secret,
    )).resolves.toBe(false);
  });

  it("fails closed when the configured secret is missing or weak", async () => {
    const request = new Request("https://example.test");
    await expect(authorizePaymentOperationsRequest(request, null)).resolves.toBe(false);
    await expect(authorizePaymentOperationsRequest(request, "short")).resolves.toBe(false);
  });
});
