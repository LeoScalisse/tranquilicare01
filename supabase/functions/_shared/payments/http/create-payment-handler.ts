import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { PaymentError } from '../domain/payment.errors.ts';
import { PAYMENT_PROVIDER_NAMES, type PaymentMethod, type PaymentProviderName } from '../domain/payment.types.ts';
import { SupabaseDonationPaymentRepository } from '../infrastructure/supabase-payment-repository.ts';
import { createPaymentRuntime } from '../infrastructure/payment-runtime.ts';
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
  const { appUrl, appOrigin } = paymentHttpConfig();
  const headers = corsHeaders(appOrigin, request.headers.get('Origin'));
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
  if (!organizationId || organizationId.length > 100 || amountCents === null) {
    return jsonResponse({ error: 'Invalid payment input' }, 400, headers);
  }
  if (body.provider && !provider) return jsonResponse({ error: 'Invalid payment provider' }, 400, headers);
  if (!['card', 'pix', 'boleto'].includes(method)) return jsonResponse({ error: 'Invalid payment method' }, 400, headers);

  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let donor: { id: string; email?: string } | null = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await userClient.auth.getUser(authHeader.slice('Bearer '.length));
    if (data.user) donor = { id: data.user.id, ...(data.user.email ? { email: data.user.email } : {}) };
  }

  try {
    const runtime = createPaymentRuntime();
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
