import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { PaymentError } from '../domain/payment.errors.ts';
import { normalizePayerEmail } from '../domain/payer-email.ts';
import { normalizePayerIdentification } from '../domain/payer-identification.ts';
import { PAYMENT_PROVIDER_NAMES, type PaymentMethod, type PaymentProviderName } from '../domain/payment.types.ts';
import { SupabaseDonationPaymentRepository } from '../infrastructure/supabase-payment-repository.ts';
import { SupabasePaymentRateLimitRepository } from '../infrastructure/supabase-payment-rate-limit-repository.ts';
import { createMercadoPagoProviderOptions } from '../infrastructure/mercado-pago-runtime.ts';
import { createPaymentRuntime } from '../infrastructure/payment-runtime.ts';
import { PaymentRateLimiter, paymentClientKey } from '../security/payment-rate-limit.ts';
import { isLiveOrganizationAllowed } from '../security/payment-production-rollout.ts';
import { DonationPaymentService } from '../services/donation-payment-service.ts';
import { corsHeaders, jsonResponse, paymentHttpConfig } from './http.ts';

export interface CreatePaymentHandlerOptions {
  legacyResponse?: boolean;
}

const integer = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseProvider = (value: unknown): PaymentProviderName | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return PAYMENT_PROVIDER_NAMES.includes(value as PaymentProviderName) ? value as PaymentProviderName : undefined;
};

export const createPaymentHandler = (options: CreatePaymentHandlerOptions = {}) => async (request: Request) => {
  const { appUrl, appOrigin, allowedOrigins } = paymentHttpConfig();
  const headers = corsHeaders(appOrigin, request.headers.get('Origin'), allowedOrigins);
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, headers);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Payment backend is not configured' }, 503, headers);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
  }

  const organizationId = typeof body.organizationId === 'string'
    ? body.organizationId.trim()
    : typeof body.ngoId === 'string' ? body.ngoId.trim() : '';
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : null;
  const amountCents = integer(body.amountCents);
  const provider = parseProvider(body.provider);
  const method = (body.method ?? 'card') as PaymentMethod;
  const suppliedPayerEmail = body.payerEmail === undefined ? null : normalizePayerEmail(body.payerEmail);
  const payerIdentification = body.payerIdentification === undefined
    ? null
    : normalizePayerIdentification(body.payerIdentification);
  if (!organizationId || organizationId.length > 100 || amountCents === null) {
    return jsonResponse({ error: 'Invalid payment input' }, 400, headers);
  }
  if (body.provider && !provider) return jsonResponse({ error: 'Invalid payment provider' }, 400, headers);
  if (!['card', 'pix', 'boleto'].includes(method)) return jsonResponse({ error: 'Invalid payment method' }, 400, headers);
  if (body.payerEmail !== undefined && !suppliedPayerEmail) {
    return jsonResponse({ error: 'Invalid payer email', code: 'payer-email-invalid' }, 400, headers);
  }
  if (body.payerIdentification !== undefined && !payerIdentification) {
    return jsonResponse({ error: 'Invalid payer identification', code: 'payer-identification-invalid' }, 400, headers);
  }

  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let donor: { id: string; email?: string } | null = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await userClient.auth.getUser(authHeader.slice('Bearer '.length));
    if (data.user) donor = { id: data.user.id, ...(data.user.email ? { email: data.user.email } : {}) };
  }

  const payerEmail = normalizePayerEmail(donor?.email) ?? suppliedPayerEmail;
  const mercadoPagoLive = Deno.env.get('MERCADO_PAGO_LIVEMODE') === 'true';
  if (provider === 'mercado_pago' && method === 'pix' && !payerEmail) {
    return jsonResponse({ error: 'Payer email is required for PIX', code: 'payer-email-required' }, 400, headers);
  }
  if (provider === 'mercado_pago' && method === 'pix' && mercadoPagoLive && !payerIdentification) {
    return jsonResponse({ error: 'Payer CPF is required for PIX', code: 'payer-identification-required' }, 400, headers);
  }
  if (provider === 'mercado_pago' && !isLiveOrganizationAllowed(
    organizationId,
    mercadoPagoLive,
    Deno.env.get('MERCADO_PAGO_LIVE_ORGANIZATION_ALLOWLIST') ?? null,
  )) {
    return jsonResponse({
      error: 'Real payments are not enabled for this organization yet',
      code: 'mercado-pago-live-rollout-blocked',
    }, 409, headers);
  }

  try {
    const rateLimiter = new PaymentRateLimiter(
      new SupabasePaymentRateLimitRepository(adminClient),
      Deno.env.get('PAYMENT_RATE_LIMIT_PEPPER') ?? serviceRoleKey,
    );
    await rateLimiter.assertCreatePaymentAllowed({
      clientIdentity: paymentClientKey(request.headers),
      organizationId,
      payerEmail: payerEmail ?? null,
    });

    const runtime = createPaymentRuntime({
      mercadoPago: createMercadoPagoProviderOptions(adminClient),
    });
    const donations = new DonationPaymentService(
      runtime.service,
      new SupabaseDonationPaymentRepository(adminClient),
    );
    const result = await donations.start({
      provider,
      method,
      organizationId,
      campaignId,
      amountCents,
      payerEmail: payerEmail ?? undefined,
      payerIdentification: payerIdentification ?? undefined,
      donor,
      successUrl: `${appUrl}/?payment=success&payment_action_id={PAYMENT_ACTION_ID}`,
      cancelUrl: `${appUrl}/?payment=cancelled`,
    });
    if (options.legacyResponse) {
      return jsonResponse({ url: result.action.redirectUrl ?? null }, 200, headers);
    }
    return jsonResponse({
      paymentId: result.paymentId,
      donationId: result.donationId,
      status: result.status,
      actionId: result.providerActionId ?? null,
      action: result.action,
      ...(result.action.type === 'qr_code' ? { confirmationToken: result.confirmationToken } : {}),
    }, 200, headers);
  } catch (error) {
    const paymentError = error instanceof PaymentError
      ? error
      : new PaymentError('payment-start-failed', 'Could not start payment', 500, { cause: error });
    console.error('Payment start failed', { code: paymentError.code, organizationId });
    return jsonResponse({ error: paymentError.message, code: paymentError.code }, paymentError.httpStatus, headers);
  }
};
