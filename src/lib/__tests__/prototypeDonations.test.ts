import { describe, expect, it } from "vitest";

import {
  confirmPrototypePixDonation,
  startSimulatedPixDonation,
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

  it("prepara uma simulação persistível sem criar uma cobrança", () => {
    const payment = startSimulatedPixDonation({
      organizationId: "organization-id",
      amountCents: 7500,
    });

    expect(payment.actionId).toMatch(/^simulated-pix-/);
    expect(payment.qrCodeText).toContain("SIMULACAO-PIX");
    expect(payment.isSimulation).toBe(true);
    expect(payment.simulatedDonation).toMatchObject({
      organizationId: "organization-id",
      amountCents: 7500,
    });
  });
});
