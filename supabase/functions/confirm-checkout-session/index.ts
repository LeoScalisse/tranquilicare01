import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const appUrl = Deno.env.get('APP_URL');
const appOrigin = Deno.env.get('APP_ORIGIN') ?? appUrl;

if (!stripeSecret || !supabaseUrl || !supabaseServiceRoleKey || !appOrigin) {
  throw new Error('Missing checkout confirmation environment variables');
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
const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return fail('Method not allowed', 405);

  let body: { sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId.startsWith('cs_') || sessionId.length > 255) {
    return fail('Invalid checkout session');
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return fail('Checkout session not found', 404);
  }

  const donationId = session.metadata?.donation_id ?? session.client_reference_id;
  if (!donationId || session.mode !== 'payment') return fail('Donation not found', 404);

  const { data: donation, error } = await adminClient
    .from('donations')
    .select('id, ngo_id, amount_cents, created_at, stripe_checkout_session_id, status')
    .eq('id', donationId)
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Could not load checkout donation', error);
    return fail('Could not confirm donation', 500);
  }
  if (!donation) return fail('Donation not found', 404);

  if (donation.status === 'failed' || donation.status === 'refunded' || session.status === 'expired') {
    return json({ status: donation.status === 'refunded' ? 'refunded' : 'failed' });
  }

  if (session.payment_status !== 'paid' || donation.status !== 'succeeded') {
    return json({ status: 'pending' }, 202);
  }

  return json({
    status: 'succeeded',
    donation: {
      id: donation.id,
      ngo_id: donation.ngo_id,
      amount_cents: donation.amount_cents,
      created_at: donation.created_at,
      stripe_checkout_session_id: donation.stripe_checkout_session_id,
    },
  });
});
