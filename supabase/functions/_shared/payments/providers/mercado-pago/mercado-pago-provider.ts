import {
  PaymentError,
  PaymentProviderError,
} from "../../domain/payment.errors.ts";
import type { PaymentProvider } from "../../domain/payment-provider.ts";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  NormalizedPaymentEvent,
  PaymentStatus,
  PaymentStatusResult,
  ProviderWebhookInput,
  RefundPaymentInput,
  RefundPaymentResult,
} from "../../domain/payment.types.ts";
type P = {
  id?: string;
  status?: string;
  payment_method?: { qr_code?: string; qr_code_base64?: string };
};
type O = {
  id: string;
  status?: string;
  external_reference?: string;
  transactions?: { payments?: P[] };
};
const MERCADO_PAGO_PIX_TEST_EMAIL = "test_user_br@testuser.com";
const PIX_ORDER_POLL_ATTEMPTS = 16;
const PIX_ORDER_POLL_INTERVAL_MS = 750;
const p = (o: O) => o.transactions?.payments?.[0] ?? {};
const s = (o: O): PaymentStatus => {
  const v = p(o).status ?? o.status ?? "";
  return ["approved", "processed"].includes(v)
    ? "paid"
    : ["rejected", "failed"].includes(v)
      ? "failed"
      : ["cancelled", "canceled", "expired"].includes(v)
        ? "canceled"
        : "pending";
};
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercado_pago" as const;
  readonly capabilities = {
    card: false,
    pix: true,
    boleto: false,
    split: false,
    refunds: false,
    recipients: false,
  } as const;
  constructor(
    private token: string,
    private secret: string | null,
    public readonly livemode: boolean,
  ) {}
  private async api<T>(path: string, init: RequestInit) {
    const r = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...init.headers,
      },
    });
    const payload = await r.json().catch(() => null);
    if (!r.ok) {
      const providerMessage =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : null;
      throw new PaymentProviderError(
        "mercado-pago-request-failed",
        "Could not communicate with the payment provider",
        { cause: { status: r.status, providerMessage } },
      );
    }
    return payload as T;
  }
  private async waitForPixPayload(order: O): Promise<O> {
    let current = order;
    for (let attempt = 0; attempt < PIX_ORDER_POLL_ATTEMPTS; attempt += 1) {
      if (p(current).payment_method?.qr_code) return current;
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, PIX_ORDER_POLL_INTERVAL_MS),
        );
      }
      current = await this.api<O>(
        `/v1/orders/${encodeURIComponent(order.id)}`,
        { method: "GET" },
      );
    }
    return current;
  }
  async createPayment(i: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (i.method !== "pix")
      throw new PaymentError(
        "mercado-pago-method-not-supported",
        "Mercado Pago PIX is the only enabled method",
        409,
      );
    if (this.livemode)
      throw new PaymentError(
        "mercado-pago-marketplace-not-configured",
        "Mercado Pago live marketplace routing is not configured yet",
        409,
      );
    // Orders sandbox uses a predefined buyer. Custom test-account emails can
    // produce a valid order without the PIX action payload.
    const email = this.livemode ? i.payerEmail : MERCADO_PAGO_PIX_TEST_EMAIL;
    if (!email)
      throw new PaymentError(
        "mercado-pago-payer-email-required",
        "A payer email is required for Mercado Pago PIX",
        422,
      );
    // Mercado Pago's PIX sandbox only authorizes the documented R$ 50,00 test
    // order. The platform fee remains visible in the checkout but is not
    // collected in the sandbox; production remains intentionally blocked.
    const amount = (
      (this.livemode
        ? i.amounts.totalAmountCents
        : i.amounts.donationAmountCents) / 100
    ).toFixed(2);
    // Mercado Pago's PIX sandbox accepts its documented predefined test buyer.
    // Production stays blocked until marketplace routing has been implemented.
    const createdOrder = await this.api<O>("/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": i.donationId,
      },
      body: JSON.stringify({
        type: "online",
        total_amount: amount,
        external_reference: i.donationId,
        payer: { email, first_name: "APRO" },
        transactions: {
          payments: [
            {
              amount,
              payment_method: { id: "pix", type: "bank_transfer" },
            },
          ],
        },
      }),
    });
    // Order creation may be asynchronous. Mercado Pago documents that the
    // first response can omit transaction details and recommends a GET by ID.
    const order = await this.waitForPixPayload(createdOrder);
    const q = p(order).payment_method;
    if (!q?.qr_code)
      throw new PaymentProviderError(
        "mercado-pago-pix-payload-missing",
        "Could not create PIX payment",
      );
    return {
      provider: this.name,
      status: s(order),
      providerActionId: order.id,
      providerPaymentId: p(order).id ?? null,
      action: {
        type: "qr_code",
        ...(q.qr_code_base64
          ? { qrCode: `data:image/png;base64,${q.qr_code_base64}` }
          : {}),
        qrCodeText: q.qr_code,
      },
    };
  }
  async getPaymentStatus(
    i: GetPaymentStatusInput,
  ): Promise<PaymentStatusResult> {
    if (!i.providerActionId)
      throw new PaymentError(
        "missing-provider-reference",
        "Payment reference is required",
      );
    const o = await this.api<O>(
      `/v1/orders/${encodeURIComponent(i.providerActionId)}`,
      { method: "GET" },
    );
    return {
      provider: this.name,
      status: s(o),
      providerActionId: o.id,
      providerPaymentId: p(o).id ?? null,
      donationId: o.external_reference ?? null,
    };
  }
  async refundPayment(_i: RefundPaymentInput): Promise<RefundPaymentResult> {
    throw new PaymentError(
      "mercado-pago-refunds-not-configured",
      "Mercado Pago refunds are not configured yet",
      409,
    );
  }
  async parseWebhook(
    _i: ProviderWebhookInput,
  ): Promise<NormalizedPaymentEvent | null> {
    throw new PaymentError(
      "mercado-pago-webhook-not-configured",
      "Mercado Pago webhook validation is not configured yet",
      409,
    );
  }
}
export const createMercadoPagoProvider = (
  token: string,
  secret: string | null,
  live: boolean,
) => new MercadoPagoProvider(token, secret, live);
