import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing webhook environment variables');
}

const stripe = new Stripe(stripeSecret);
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const donationIdFrom = (object: Stripe.Checkout.Session | Stripe.PaymentIntent): string | null => {
  const metadata = object.metadata ?? {};
  return typeof metadata.donation_id === 'string' ? metadata.donation_id : null;
};

const markDonation = async (
  donationId: string,
  status: 'succeeded' | 'failed',
  sessionId?: string | null,
  paymentIntentId?: string | null,
) => {
  const update: Record<string, unknown> = { status };
  if (sessionId) update.stripe_checkout_session_id = sessionId;
  if (paymentIntentId) update.stripe_payment_intent_id = paymentIntentId;
  const { error } = await adminClient.from('donations').update(update).eq('id', donationId);
  if (error) throw error;
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const signature = request.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'Missing Stripe-Signature' }, 400);

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Invalid Stripe webhook signature', error);
    return json({ error: 'Invalid signature' }, 400);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const donationId = donationIdFrom(session);
      if (donationId && (session.payment_status === 'paid' || event.type.endsWith('succeeded'))) {
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
        await markDonation(donationId, 'succeeded', session.id, paymentIntentId);
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const donationId = donationIdFrom(session);
      if (donationId) await markDonation(donationId, 'failed', session.id);
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const donationId = donationIdFrom(paymentIntent);
      if (donationId) await markDonation(donationId, 'succeeded', null, paymentIntent.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const donationId = donationIdFrom(paymentIntent);
      if (donationId) await markDonation(donationId, 'failed', null, paymentIntent.id);
    }
  } catch (error) {
    console.error('Could not process Stripe event', event.id, error);
    return json({ error: 'Could not process event' }, 500);
  }

  // Record the event only after the donation update succeeds. If a transient
  // database error occurs above, Stripe will retry the event instead of seeing
  // a duplicate row and treating an unfinished donation as complete.
  const { error: eventInsertError } = await adminClient.from('stripe_webhook_events').insert({
    id: event.id,
    event_type: event.type,
  });

  if (eventInsertError?.code === '23505') return json({ received: true });
  if (eventInsertError) return json({ error: 'Could not record event' }, 500);

  return json({ received: true });
});
