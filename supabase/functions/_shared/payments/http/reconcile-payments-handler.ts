import { createClient } from "npm:@supabase/supabase-js@2.53.0";
import { createPaymentConfirmationEvent } from "../domain/payment-confirmation-event.ts";
import type { PaymentProviderName, PaymentStatus } from "../domain/payment.types.ts";
import { createMercadoPagoProviderOptions } from "../infrastructure/mercado-pago-runtime.ts";
import { SupabasePaymentEventRepository } from "../infrastructure/supabase-payment-repository.ts";
import { createPaymentRuntime } from "../infrastructure/payment-runtime.ts";
import { authorizePaymentOperationsRequest } from "../security/payment-operations-auth.ts";
import { PaymentEventService } from "../services/payment-event-service.ts";
import { jsonResponse } from "./http.ts";

type ReconciliationPayment = {
  id: string;
  donation_id: string;
  provider: PaymentProviderName;
  provider_action_id: string;
  provider_payment_id: string | null;
  recipient_id: string | null;
  status: PaymentStatus;
};

const errorCode = (error: unknown): string => {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code).slice(0, 120);
  }
  return "payment-reconciliation-failed";
};

export const reconcilePaymentsHandler = () => async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const operationsSecret = Deno.env.get("PAYMENT_OPERATIONS_SECRET") ?? null;
  if (!await authorizePaymentOperationsRequest(request, operationsSecret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Payment backend is not configured" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data, error } = await admin
    .from("payments")
    .select("id, donation_id, provider, provider_action_id, provider_payment_id, recipient_id, status")
    .eq("provider", "mercado_pago")
    .in("status", ["created", "pending"])
    .not("provider_action_id", "is", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("Payment reconciliation load failed", { code: error.code });
    return jsonResponse({ error: "Could not load pending payments" }, 500);
  }

  const payments = (data ?? []) as ReconciliationPayment[];
  const runtime = createPaymentRuntime({
    mercadoPago: createMercadoPagoProviderOptions(admin),
  });
  const events = new PaymentEventService(new SupabasePaymentEventRepository(admin));
  let matched = 0;
  let repaired = 0;
  let failed = 0;

  for (const payment of payments) {
    try {
      const providerStatus = await runtime.service.getPaymentStatus({
        provider: payment.provider,
        providerActionId: payment.provider_action_id,
        providerPaymentId: payment.provider_payment_id ?? undefined,
        recipientId: payment.recipient_id ?? undefined,
      });
      const matches = providerStatus.status === payment.status;
      const event = createPaymentConfirmationEvent({
        status: providerStatus,
        actionId: payment.provider_action_id,
        donationId: payment.donation_id,
      });
      if (event && !matches) {
        await events.handle(event);
        repaired += 1;
      } else if (matches) {
        matched += 1;
      }
      await admin.from("payment_reconciliations").insert({
        payment_id: payment.id,
        provider: payment.provider,
        internal_status: payment.status,
        provider_status: providerStatus.status,
        matches,
        differences: matches
          ? []
          : [{ field: "status", internal: payment.status, provider: providerStatus.status }],
      });
    } catch (reconciliationError) {
      failed += 1;
      const code = errorCode(reconciliationError);
      console.error("Payment reconciliation item failed", { code, paymentId: payment.id });
      await admin.from("payment_reconciliations").insert({
        payment_id: payment.id,
        provider: payment.provider,
        internal_status: payment.status,
        provider_status: null,
        matches: false,
        differences: [{ field: "provider_status", error: code }],
        error_message: code,
      });
    }
  }

  return jsonResponse({ checked: payments.length, matched, repaired, failed });
};
