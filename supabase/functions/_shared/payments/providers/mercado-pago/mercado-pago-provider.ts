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

type SandboxPayment = {
  id?: string;
  status?: string;
  payment_method?: { qr_code?: string; qr_code_base64?: string };
};
type SandboxOrder = {
  id: string;
  status?: string;
  external_reference?: string;
  transactions?: { payments?: SandboxPayment[] };
};
type LivePayment = {
  id: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string };
  };
};

export interface MercadoPagoProviderOptions {
  resolveAccessToken?: (
    recipientId: string,
    livemode: boolean,
  ) => Promise<string>;
  webhookUrl?: string;
}

const MERCADO_PAGO_PIX_TEST_EMAIL = "test_user_br@testuser.com";
const PIX_ORDER_POLL_ATTEMPTS = 16;
const PIX_ORDER_POLL_INTERVAL_MS = 750;

const sandboxPayment = (order: SandboxOrder) =>
  order.transactions?.payments?.[0] ?? {};

const sandboxStatus = (order: SandboxOrder): PaymentStatus => {
  const status = sandboxPayment(order).status ?? order.status ?? "";
  return ["approved", "processed"].includes(status)
    ? "paid"
    : ["rejected", "failed"].includes(status)
      ? "failed"
      : ["cancelled", "canceled", "expired"].includes(status)
        ? "canceled"
        : "pending";
};

const liveStatus = (status = ""): PaymentStatus => {
  if (status === "approved") return "paid";
  if (["rejected", "failed"].includes(status)) return "failed";
  if (["cancelled", "canceled"].includes(status)) return "canceled";
  if (status === "refunded") return "refunded";
  if (status === "charged_back") return "disputed";
  return "pending";
};

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercado_pago" as const;
  readonly capabilities;

  constructor(
    private readonly token: string,
    private readonly secret: string | null,
    public readonly livemode: boolean,
    private readonly options: MercadoPagoProviderOptions = {},
  ) {
    this.capabilities = {
      card: false,
      pix: true,
      boleto: false,
      split: livemode,
      refunds: false,
      recipients: livemode,
    } as const;
  }

  private async api<T>(
    path: string,
    init: RequestInit,
    accessToken = this.token,
  ): Promise<T> {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const providerMessage =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : null;
      throw new PaymentProviderError(
        "mercado-pago-request-failed",
        "Could not communicate with the payment provider",
        { cause: { status: response.status, providerMessage } },
      );
    }
    return payload as T;
  }

  private async waitForPixPayload(order: SandboxOrder): Promise<SandboxOrder> {
    let current = order;
    for (let attempt = 0; attempt < PIX_ORDER_POLL_ATTEMPTS; attempt += 1) {
      if (sandboxPayment(current).payment_method?.qr_code) return current;
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, PIX_ORDER_POLL_INTERVAL_MS)
        );
      }
      current = await this.api<SandboxOrder>(
        `/v1/orders/${encodeURIComponent(order.id)}`,
        { method: "GET" },
      );
    }
    return current;
  }

  private async createLivePayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    if (!input.payerEmail) {
      throw new PaymentError(
        "mercado-pago-payer-email-required",
        "A payer email is required for Mercado Pago PIX",
        422,
      );
    }
    if (!input.payerIdentification) {
      throw new PaymentError(
        "mercado-pago-payer-identification-required",
        "A payer CPF is required for Mercado Pago PIX",
        422,
      );
    }
    if (!this.options.resolveAccessToken || !this.options.webhookUrl) {
      throw new PaymentError(
        "mercado-pago-marketplace-not-configured",
        "Mercado Pago marketplace routing is not configured",
        503,
      );
    }

    const sellerToken = await this.options.resolveAccessToken(
      input.recipient.id,
      true,
    );
    const payment = await this.api<LivePayment>(
      "/v1/payments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": input.donationId,
        },
        body: JSON.stringify({
          transaction_amount: input.amounts.totalAmountCents / 100,
          application_fee: input.amounts.platformFeeCents / 100,
          description: "Doacao TranquiliCare",
          payment_method_id: "pix",
          external_reference: input.donationId,
          payer: {
            email: input.payerEmail,
            identification: input.payerIdentification,
          },
          notification_url: this.options.webhookUrl,
          metadata: input.metadata ?? {},
        }),
      },
      sellerToken,
    );
    const qr = payment.point_of_interaction?.transaction_data;
    if (!qr?.qr_code) {
      throw new PaymentProviderError(
        "mercado-pago-pix-payload-missing",
        "Could not create PIX payment",
      );
    }
    const paymentId = String(payment.id);
    return {
      provider: this.name,
      status: liveStatus(payment.status),
      providerActionId: paymentId,
      providerPaymentId: paymentId,
      action: {
        type: "qr_code",
        ...(qr.qr_code_base64
          ? { qrCode: `data:image/png;base64,${qr.qr_code_base64}` }
          : {}),
        qrCodeText: qr.qr_code,
      },
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.method !== "pix") {
      throw new PaymentError(
        "mercado-pago-method-not-supported",
        "Mercado Pago PIX is the only enabled method",
        409,
      );
    }
    if (this.livemode) return await this.createLivePayment(input);

    const amount = (input.amounts.donationAmountCents / 100).toFixed(2);
    const createdOrder = await this.api<SandboxOrder>("/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.donationId,
      },
      body: JSON.stringify({
        type: "online",
        total_amount: amount,
        external_reference: input.donationId,
        payer: { email: MERCADO_PAGO_PIX_TEST_EMAIL, first_name: "APRO" },
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
    const order = await this.waitForPixPayload(createdOrder);
    const qr = sandboxPayment(order).payment_method;
    if (!qr?.qr_code) {
      throw new PaymentProviderError(
        "mercado-pago-pix-payload-missing",
        "Could not create PIX payment",
      );
    }
    return {
      provider: this.name,
      status: sandboxStatus(order),
      providerActionId: order.id,
      providerPaymentId: sandboxPayment(order).id ?? null,
      action: {
        type: "qr_code",
        ...(qr.qr_code_base64
          ? { qrCode: `data:image/png;base64,${qr.qr_code_base64}` }
          : {}),
        qrCodeText: qr.qr_code,
      },
    };
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<PaymentStatusResult> {
    if (this.livemode) {
      const paymentId = input.providerPaymentId ?? input.providerActionId;
      if (!paymentId || !input.recipientId || !this.options.resolveAccessToken) {
        throw new PaymentError(
          "missing-provider-reference",
          "Payment and recipient references are required",
        );
      }
      const sellerToken = await this.options.resolveAccessToken(
        input.recipientId,
        true,
      );
      const payment = await this.api<LivePayment>(
        `/v1/payments/${encodeURIComponent(paymentId)}`,
        { method: "GET" },
        sellerToken,
      );
      return {
        provider: this.name,
        status: liveStatus(payment.status),
        providerActionId: String(payment.id),
        providerPaymentId: String(payment.id),
        donationId: payment.external_reference ?? null,
      };
    }

    if (!input.providerActionId) {
      throw new PaymentError(
        "missing-provider-reference",
        "Payment reference is required",
      );
    }
    const order = await this.api<SandboxOrder>(
      `/v1/orders/${encodeURIComponent(input.providerActionId)}`,
      { method: "GET" },
    );
    return {
      provider: this.name,
      status: sandboxStatus(order),
      providerActionId: order.id,
      providerPaymentId: sandboxPayment(order).id ?? null,
      donationId: order.external_reference ?? null,
    };
  }

  async refundPayment(
    _input: RefundPaymentInput,
  ): Promise<RefundPaymentResult> {
    throw new PaymentError(
      "mercado-pago-refunds-not-configured",
      "Mercado Pago refunds are not configured yet",
      409,
    );
  }

  async parseWebhook(
    _input: ProviderWebhookInput,
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
  options: MercadoPagoProviderOptions = {},
) => new MercadoPagoProvider(token, secret, live, options);
