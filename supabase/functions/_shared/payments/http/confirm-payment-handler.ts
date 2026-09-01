import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { PaymentError } from '../domain/payment.errors.ts';
import { authorizePaymentConfirmation } from '../domain/payment-confirmation.ts';
import { createPaymentConfirmationEvent } from '../domain/payment-confirmation-event.ts';
import { SupabasePaymentEventRepository } from '../infrastructure/supabase-payment-repository.ts';
import { createMercadoPagoProviderOptions } from '../infrastructure/mercado-pago-runtime.ts';
import { PaymentEventService } from '../services/payment-event-service.ts';
import type { PaymentProviderName, PaymentStatus } from '../domain/payment.types.ts';
import { createPaymentRuntime } from '../infrastructure/payment-runtime.ts';
import { corsHeaders, jsonResponse, paymentHttpConfig } from './http.ts';

export interface ConfirmPaymentHandlerOptions {
  legacyResponse?: boolean;
}

const publicStatus = (status: PaymentStatus) => {
  if (status === 'paid') return 'paid';
  if (status === 'failed' || status === 'canceled' || status === 'refunded' || status === 'partially_refunded' || status === 'disputed') return status;
  return 'pending';
};

export const confirmPaymentHandler = (options: ConfirmPaymentHandlerOptions = {}) => async (request: Request) => {
  const { appOrigin, allowedOrigins } = paymentHttpConfig();
  const headers = corsHeaders(appOrigin, request.headers.get('Origin'), allowedOrigins);
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, headers);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Payment backend is not configured' }, 503, headers);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
  }
  const actionId = typeof body.actionId === 'string'
    ? body.actionId.trim()
    : typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const confirmationToken = typeof body.confirmationToken === 'string' ? body.confirmationToken.trim() : null;
  if (!actionId || actionId.length > 255) return jsonResponse({ error: 'Invalid payment reference' }, 400, headers);

  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('id, donation_id, provider, provider_action_id, provider_payment_id, recipient_id, status, confirmation_token_hash, confirmation_expires_at')
    .eq('provider_action_id', actionId)
    .maybeSingle();
  if (paymentError) return jsonResponse({ error: 'Could not load payment' }, 500, headers);
  if (!payment) return jsonResponse({ status: 'pending' }, 200, headers);

  try {
    const { data: donation, error: donationError } = await admin
      .from('donations')
      .select('id, donor_id, ngo_id, amount_cents, created_at, provider_action_id')
      .eq('id', payment.donation_id)
      .single();
    if (donationError) return jsonResponse({ error: 'Could not load donation' }, 500, headers);

    let requesterId: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data } = await userClient.auth.getUser(authHeader.slice('Bearer '.length));
      requesterId = data.user?.id ?? null;
    }
    await authorizePaymentConfirmation({
      donorId: donation.donor_id,
      requesterId,
      confirmationToken,
      confirmationTokenHash: payment.confirmation_token_hash,
      confirmationExpiresAt: payment.confirmation_expires_at,
    });

    const runtime = createPaymentRuntime({
      mercadoPago: createMercadoPagoProviderOptions(admin),
    });
    const providerStatus = await runtime.service.getPaymentStatus({
      provider: payment.provider as PaymentProviderName,
      providerActionId: actionId,
      providerPaymentId: payment.provider_payment_id ?? undefined,
      recipientId: payment.recipient_id ?? undefined,
    });
    const internalStatus = payment.status as PaymentStatus;
    const confirmationEvent = createPaymentConfirmationEvent({
      status: providerStatus,
      actionId,
      donationId: donation.id,
    });
    if (confirmationEvent && confirmationEvent.status !== internalStatus) {
      const events = new PaymentEventService(new SupabasePaymentEventRepository(admin));
      await events.handle(confirmationEvent);
    }
    const terminalStatuses: PaymentStatus[] = ['paid', 'failed', 'canceled', 'refunded', 'partially_refunded', 'disputed'];
    const status = terminalStatuses.includes(internalStatus)
      ? publicStatus(internalStatus)
      : publicStatus(providerStatus.status);

    if (options.legacyResponse) {
      const legacyStatus = status === 'paid' ? 'succeeded' : status === 'canceled' ? 'failed' : status;
      return jsonResponse({
        status: legacyStatus,
        ...(status === 'paid' ? {
          donation: {
            id: donation.id,
            ngo_id: donation.ngo_id,
            amount_cents: donation.amount_cents,
            created_at: donation.created_at,
            stripe_checkout_session_id: donation.provider_action_id,
          },
        } : {}),
      }, 200, headers);
    }

    return jsonResponse({
      status,
      ...(status === 'paid' ? {
        donation: {
          id: donation.id,
          organizationId: donation.ngo_id,
          amountCents: donation.amount_cents,
          createdAt: donation.created_at,
          paymentActionId: donation.provider_action_id,
        },
      } : {}),
    }, 200, headers);
  } catch (error) {
    const paymentFailure = error instanceof PaymentError
      ? error
      : new PaymentError('payment-confirmation-failed', 'Could not verify payment', 500);
    console.error('Payment confirmation failed', { code: paymentFailure.code, actionId });
    return jsonResponse({ error: paymentFailure.message, code: paymentFailure.code }, paymentFailure.httpStatus, headers);
  }
};
