import { createClient } from "npm:@supabase/supabase-js@2.53.0";
import { PaymentError } from "../domain/payment.errors.ts";
import {
  PAYMENT_PROVIDER_NAMES,
  type PaymentProviderName,
} from "../domain/payment.types.ts";
import { SupabasePaymentEventRepository } from "../infrastructure/supabase-payment-repository.ts";
import { createMercadoPagoProviderOptions } from "../infrastructure/mercado-pago-runtime.ts";
import { createPaymentRuntime } from "../infrastructure/payment-runtime.ts";
import { PaymentEventService } from "../services/payment-event-service.ts";
import { jsonResponse } from "./http.ts";
const mercadoEvent = async (
  payload: string,
  request: Request,
  runtime: ReturnType<typeof createPaymentRuntime>,
  admin: ReturnType<typeof createClient>,
) => {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  const body = JSON.parse(payload) as { id?: string; data?: { id?: string } };
  const url = new URL(request.url);
  const orderId = url.searchParams.get("data.id") ?? body.data?.id;
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");
  if (!secret || !orderId || !signature)
    throw new PaymentError(
      "mercado-pago-webhook-input-missing",
      "Missing Mercado Pago webhook signature",
      400,
    );
  const fields = Object.fromEntries(
      signature.split(",").map((item) => item.trim().split("=", 2)),
    ) as Record<string, string>,
    ts = fields.ts,
    received = fields.v1;
  if (!ts || !received)
    throw new PaymentError(
      "mercado-pago-webhook-signature-malformed",
      "Invalid Mercado Pago webhook signature",
      400,
    );
  const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ),
    data = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`id:${orderId};ts:${ts};`),
    ),
    expected = Array.from(new Uint8Array(data), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join("");
  let diff = expected.length ^ received.length;
  for (
    let index = 0;
    index < Math.max(expected.length, received.length);
    index += 1
  )
    diff |=
      (expected.charCodeAt(index) || 0) ^ (received.charCodeAt(index) || 0);
  if (diff !== 0 && requestId) {
    const withRequestIdData = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(
          `id:${orderId};request-id:${requestId};ts:${ts};`,
        ),
      ),
      withRequestIdExpected = Array.from(
        new Uint8Array(withRequestIdData),
        (value) => value.toString(16).padStart(2, "0"),
      ).join("");
    diff = withRequestIdExpected.length ^ received.length;
    for (
      let index = 0;
      index < Math.max(withRequestIdExpected.length, received.length);
      index += 1
    )
      diff |=
        (withRequestIdExpected.charCodeAt(index) || 0) ^
        (received.charCodeAt(index) || 0);
  }
  if (diff !== 0)
    throw new PaymentError(
      "mercado-pago-webhook-signature-mismatch",
      "Invalid Mercado Pago webhook signature",
      400,
    );
  let localPayment: { recipient_id: string | null } | null = null;
  for (const field of ["provider_payment_id", "provider_action_id"] as const) {
    if (localPayment) break;
    const { data, error } = await admin
      .from("payments")
      .select("recipient_id")
      .eq("provider", "mercado_pago")
      .eq(field, orderId)
      .maybeSingle();
    if (error) throw error;
    localPayment = data;
  }
  if (runtime.service.resolveProvider("mercado_pago").livemode && !localPayment?.recipient_id) {
    throw new PaymentError(
      "mercado-pago-webhook-payment-unknown",
      "Payment is not registered yet",
      409,
    );
  }
  const status = await runtime.service.getPaymentStatus({
    provider: "mercado_pago",
    providerActionId: orderId,
    providerPaymentId: orderId,
    recipientId: localPayment?.recipient_id ?? undefined,
  });
  return {
    provider: "mercado_pago" as const,
    providerEventId: body.id ?? `${orderId}:${ts}`,
    providerActionId: orderId,
    providerPaymentId: status.providerPaymentId ?? null,
    donationId: status.donationId ?? null,
    occurredAt: new Date().toISOString(),
    status: status.status,
    type:
      status.status === "paid"
        ? "payment.paid"
        : status.status === "failed"
          ? "payment.failed"
          : status.status === "canceled"
            ? "payment.canceled"
            : status.status === "refunded"
              ? "payment.refunded"
              : "payment.pending",
    sanitizedPayload: { orderId },
  };
};

export interface PaymentWebhookHandlerOptions {
  provider?: PaymentProviderName;
}

export const paymentWebhookHandler =
  (options: PaymentWebhookHandlerOptions = {}) =>
  async (request: Request) => {
    if (request.method !== "POST")
      return jsonResponse({ error: "Method not allowed" }, 405);
    const providerParam =
      options.provider ?? new URL(request.url).searchParams.get("provider");
    if (
      !PAYMENT_PROVIDER_NAMES.includes(providerParam as PaymentProviderName)
    ) {
      return jsonResponse({ error: "Invalid payment provider" }, 400);
    }
    const provider = providerParam as PaymentProviderName;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey)
      return jsonResponse({ error: "Payment backend is not configured" }, 503);

    try {
      const payload = await request.text();
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const runtime = createPaymentRuntime({
        mercadoPago: createMercadoPagoProviderOptions(admin),
      });
      const event =
        provider === "mercado_pago"
          ? await mercadoEvent(payload, request, runtime, admin)
          : await runtime.service.parseWebhook(provider, {
              payload,
              signature: request.headers.get("Stripe-Signature"),
            });
      if (!event) return jsonResponse({ received: true, ignored: true });
      const events = new PaymentEventService(
        new SupabasePaymentEventRepository(admin),
      );
      const result = await events.handle(event);
      return jsonResponse({ received: true, duplicate: result.duplicate });
    } catch (error) {
      const paymentError =
        error instanceof PaymentError
          ? error
          : new PaymentError(
              "payment-event-failed",
              "Could not process payment event",
              500,
              { cause: error },
            );
      console.error("Payment webhook failed", {
        provider,
        code: paymentError.code,
      });
      return jsonResponse(
        { error: paymentError.message, code: paymentError.code },
        paymentError.httpStatus,
      );
    }
  };
