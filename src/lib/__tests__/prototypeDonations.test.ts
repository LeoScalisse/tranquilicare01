import { describe, expect, it } from "vitest";

import {
  confirmPrototypePixDonation,
  startPrototypePixDonation,
} from "@/lib/donations";

describe("doação PIX de demonstração", () => {
  it("cria e confirma uma doação local sem depender do provedor de pagamento", () => {
    const payment = startPrototypePixDonation({
      organizationId: "founder-tranquilicare",
      amountCents: 5000,
      payerEmail: "doador@exemplo.com",
    });

    expect(payment.actionId).toMatch(/^prototype-pix-/);
    expect(payment.qrCodeText).toContain("SIMULACAO-PIX");
    expect(payment.isPrototype).toBe(true);

    expect(confirmPrototypePixDonation(payment, "doador@exemplo.com")).toMatchObject({
      amount: 5000,
      donor_email: "doador@exemplo.com",
      ngo_id: "founder-tranquilicare",
      payment_action_id: payment.actionId,
    });
  });
});
