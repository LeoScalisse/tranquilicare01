import { afterEach, describe, expect, it, vi } from "vitest";

import { createMercadoPagoProvider } from "../../../supabase/functions/_shared/payments/providers/mercado-pago/mercado-pago-provider.ts";
import type { CreatePaymentInput } from "../../../supabase/functions/_shared/payments/domain/payment.types.ts";

const input: CreatePaymentInput = {
  provider: "mercado_pago",
  donationId: "donation-test-1",
  method: "pix",
  amounts: {
    donationAmountCents: 5000,
    platformFeeCents: 250,
    totalAmountCents: 5250,
    recipientAmountCents: 5000,
    currency: "brl",
  },
  recipient: {
    id: "recipient-test-1",
    organizationId: "demo-abraco-sereno",
    provider: "mercado_pago",
    providerRecipientId: "recipient-test-1",
    status: "active",
    livemode: false,
  },
  allocations: [],
  successUrl: "https://example.test/success",
  cancelUrl: "https://example.test/cancel",
};

describe("MercadoPagoProvider PIX sandbox", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("waits for an asynchronous order to expose the PIX payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "ORD-1",
            status: "processing",
            transactions: { payments: [] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "ORD-1",
            status: "action_required",
            transactions: {
              payments: [
                {
                  id: "PAY-1",
                  status: "action_required",
                  payment_method: {
                    qr_code: "000201-test-pix",
                    qr_code_base64: "",
                  },
                },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const provider = createMercadoPagoProvider("APP_USR-test", null, false);
    const result = await provider.createPayment(input);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.mercadopago.com/v1/orders/ORD-1",
    );
    expect(result.action).toMatchObject({
      type: "qr_code",
      qrCodeText: "000201-test-pix",
    });
    expect(result.action.qrCode).toBeUndefined();
  });

  it("uses the exact predefined Mercado Pago sandbox buyer and amount", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "ORD-2",
          transactions: {
            payments: [
              {
                payment_method: {
                  qr_code: "000201-test-pix",
                  qr_code_base64: "base64-png",
                },
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const provider = createMercadoPagoProvider("APP_USR-test", null, false);
    await provider.createPayment(input);

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));
    expect(body.total_amount).toBe("50.00");
    expect(body.payer).toEqual({
      email: "test_user_br@testuser.com",
      first_name: "APRO",
    });
    expect(body.processing_mode).toBeUndefined();
    expect(body.transactions.payments[0].expiration_time).toBeUndefined();
  });
  it("keeps waiting when Mercado Pago exposes the PIX payload after the old polling window", async () => {
    vi.useFakeTimers();
    let getRequests = 0;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_url, request) => {
        if (request?.method === "POST") {
          return new Response(
            JSON.stringify({
              id: "ORD-SLOW",
              status: "processing",
              transactions: { payments: [] },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        getRequests += 1;
        const hasPixPayload = getRequests === 7;
        return new Response(
          JSON.stringify({
            id: "ORD-SLOW",
            status: hasPixPayload ? "action_required" : "processing",
            transactions: {
              payments: hasPixPayload
                ? [
                    {
                      id: "PAY-SLOW",
                      status: "action_required",
                      payment_method: { qr_code: "000201-delayed-pix" },
                    },
                  ]
                : [],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      });

    const outcome = createMercadoPagoProvider(
      "APP_USR-test",
      null,
      false,
    )
      .createPayment(input)
      .then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      );

    await vi.runAllTimersAsync();

    await expect(outcome).resolves.toMatchObject({
      ok: true,
      value: {
        action: { type: "qr_code", qrCodeText: "000201-delayed-pix" },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});
