import { describe, expect, it } from "vitest";

import { isLiveOrganizationAllowed } from "../../../supabase/functions/_shared/payments/security/payment-production-rollout";

describe("payment production rollout", () => {
  it("does not restrict sandbox payments", () => {
    expect(isLiveOrganizationAllowed("ngo-any", false, null)).toBe(true);
  });

  it("fails closed in live mode without an explicit organization allowlist", () => {
    expect(isLiveOrganizationAllowed("ngo-1", true, null)).toBe(false);
    expect(isLiveOrganizationAllowed("ngo-1", true, "")).toBe(false);
  });

  it("allows only exact, comma-separated organization IDs", () => {
    expect(isLiveOrganizationAllowed("ngo-2", true, "ngo-1, ngo-2")).toBe(true);
    expect(isLiveOrganizationAllowed("ngo", true, "ngo-1, ngo-2")).toBe(false);
  });
});
