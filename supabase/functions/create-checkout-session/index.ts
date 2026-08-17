import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const appUrl = Deno.env.get('APP_URL');
const appOrigin = Deno.env.get('APP_ORIGIN') ?? appUrl;

if (!stripeSecret || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !appUrl || !appOrigin) {
  throw new Error('Missing payment function environment variables');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fail = (message: string, status = 400) => json({ error: message }, status);

const stripe = new Stripe(stripeSecret);
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return fail('Method not allowed', 405);

  const authHeader = request.headers.get('Authorization');
  let donor: { id: string; email?: string } | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    const { data: userData } = await userClient.auth.getUser(token);
    if (userData.user) {
      donor = {
        id: userData.user.id,
        ...(userData.user.email ? { email: userData.user.email } : {}),
      };
    }
  }

  let body: { ngoId?: unknown; campaignId?: unknown; amountCents?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const ngoId = typeof body.ngoId === 'string' ? body.ngoId.trim() : '';
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : null;
  const amountCents = toPositiveInteger(body.amountCents);

  if (!ngoId || ngoId.length > 100) return fail('Invalid NGO');
  if (amountCents === null || amountCents < 50 || amountCents > 10_000_000) {
    return fail('Donation must be between R$ 0,50 and R$ 100.000,00');
  }

  const { data: paymentAccount, error: accountError } = await adminClient
    .from('ngo_payment_accounts')
    .select('stripe_account_id, onboarding_complete, charges_enabled, payouts_enabled')
    .eq('ngo_id', ngoId)
    .maybeSingle();

  if (accountError) return fail('Could not load NGO payment account', 500);
  if (!paymentAccount) return fail('This NGO is not connected to Stripe yet', 409);

  // Stripe test accounts can run sandbox payments before every capability is
  // marked active. Retrieving the account with the current API key already
  // verifies that it belongs to the same Stripe environment. Live payments
  // always require both charges and payouts to be enabled.
  const isTestMode = stripeSecret.startsWith('sk_test_');
  let connectedAccount: Stripe.Account;
  try {
    connectedAccount = await stripe.accounts.retrieve(paymentAccount.stripe_account_id);
  } catch (error) {
    console.error('Could not retrieve connected Stripe account', error);
    return fail('Could not verify NGO payment account', 409);
  }

  const liveAccountReady = Boolean(connectedAccount.charges_enabled && connectedAccount.payouts_enabled);
  if (!isTestMode && !liveAccountReady) {
    return fail('This NGO is not ready to receive donations yet', 409);
  }

  const platformFeeCents = Math.round((amountCents * 5) / 100);
  const donationId = crypto.randomUUID();
  const metadata = {
    donation_id: donationId,
    ...(donor ? { donor_id: donor.id } : {}),
    ngo_id: ngoId,
    ...(campaignId ? { campaign_id: campaignId } : {}),
    donation_amount_cents: String(amountCents),
    platform_fee_cents: String(platformFeeCents),
  };

  const { error: donationError } = await adminClient.from('donations').insert({
    id: donationId,
    donor_id: donor?.id ?? null,
    ngo_id: ngoId,
    campaign_id: campaignId,
    stripe_account_id: paymentAccount.stripe_account_id,
    amount_cents: amountCents,
    platform_fee_cents: platformFeeCents,
    status: 'pending',
  });

  if (donationError) return fail('Could not create donation record', 500);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: donationId,
      ...(donor?.email ? { customer_email: donor.email } : {}),
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: 'Doação para a causa' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'brl',
            product_data: { name: 'Taxa TranquiliCare (5%)' },
            unit_amount: platformFeeCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: paymentAccount.stripe_account_id },
        metadata,
      },
      metadata,
      success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?payment=cancelled`,
    });

    const { error: updateError } = await adminClient
      .from('donations')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', donationId);

    if (updateError || !session.url) {
      await adminClient.from('donations').update({ status: 'failed' }).eq('id', donationId);
      return fail('Could not prepare checkout', 500);
    }

    return json({ url: session.url });
  } catch (error) {
    await adminClient.from('donations').update({ status: 'failed' }).eq('id', donationId);
    console.error('Stripe Checkout error', error);
    return fail('Could not start checkout', 502);
  }
});
