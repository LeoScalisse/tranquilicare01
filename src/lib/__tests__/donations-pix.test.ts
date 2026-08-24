import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke } },
}));

import {
  startMercadoPagoPixDonation,
  waitForDonationConfirmation,
} from "@/lib/donations";

describe("startMercadoPagoPixDonation", () => {
  beforeEach(() => invoke.mockReset());
  afterEach(() => vi.useRealTimers());

  it("accepts a valid PIX response without a Base64 image", async () => {
    invoke.mockResolvedValue({
      error: null,
      data: {
        actionId: "ORD-1",
        confirmationToken: "token-1",
        action: {
          type: "qr_code",
          qrCodeText: "000201-test-pix",
        },
      },
    });

    await expect(
      startMercadoPagoPixDonation({
        organizationId: "demo-abraco-sereno",
        amountCents: 5000,
      }),
    ).resolves.toEqual({
      actionId: "ORD-1",
      confirmationToken: "token-1",
      qrCode: undefined,
      qrCodeText: "000201-test-pix",
    });
  });

  it("consulta o backend para confirmar o PIX mesmo com o doador autenticado", async () => {
    invoke.mockResolvedValue({
      error: null,
      data: {
        status: "paid",
        donation: {
          id: "donation-1",
          organizationId: "demo-abraco-sereno",
          amountCents: 5000,
          createdAt: "2026-08-24T12:00:00.000Z",
          paymentActionId: "ORD-1",
        },
      },
    });

    await expect(
      waitForDonationConfirmation(
        "ORD-1",
        "doador@exemplo.com",
        "confirmation-token-with-at-least-32-characters",
        1_000,
      ),
    ).resolves.toMatchObject({
      id: "donation-1",
      amount: 5000,
      donor_email: "doador@exemplo.com",
      payment_action_id: "ORD-1",
    });

    expect(invoke).toHaveBeenCalledWith("confirm-payment", {
      body: {
        actionId: "ORD-1",
        confirmationToken: "confirmation-token-with-at-least-32-characters",
      },
    });
  });
  it("encerra a verificação pendente no prazo configurado", async () => {
    vi.useFakeTimers();
    invoke.mockResolvedValue({ error: null, data: { status: "pending" } });

    const confirmation = expect(
      waitForDonationConfirmation(
        "ORD-1",
        null,
        "confirmation-token-with-at-least-32-characters",
        1_000,
      ),
    ).rejects.toThrow("payment-confirmation-timeout");

    await vi.advanceTimersByTimeAsync(1_000);
    await confirmation;
  });});
