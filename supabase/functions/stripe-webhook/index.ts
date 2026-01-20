import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    logStep("Missing signature");
    return new Response("Missing signature", { status: 400 });
  }

  if (!endpointSecret) {
    logStep("Webhook secret not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  try {
    const body = await req.text();
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: String(err) });
      return new Response(`Webhook signature verification failed`, { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Only process completed checkout sessions
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      logStep("Processing checkout session", { 
        sessionId: session.id,
        paymentStatus: session.payment_status 
      });

      // Only record if payment was successful
      if (session.payment_status !== "paid") {
        logStep("Payment not completed, skipping");
        return new Response("Payment not completed", { status: 200 });
      }

      // Extract ngo_id from return URL parameters
      const returnUrl = session.return_url || "";
      const ngoIdMatch = returnUrl.match(/ngo_id=([a-f0-9-]+)/);
      const ngoId = ngoIdMatch ? ngoIdMatch[1] : null;

      if (!ngoId) {
        logStep("Could not extract ngo_id from return URL", { returnUrl });
        return new Response("Missing ngo_id", { status: 200 });
      }

      // Get line items to calculate amounts
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      
      let donationAmount = 0;
      let platformTip = 0;

      for (const item of lineItems.data) {
        const description = item.description || "";
        const amount = item.amount_total || 0;
        
        if (description.includes("Doação para")) {
          donationAmount = amount;
        } else if (description.includes("TranquiliCare")) {
          platformTip = amount;
        }
      }

      logStep("Calculated amounts", { donationAmount, platformTip });

      // Create Supabase client with service role for inserting
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Check if donation already exists (idempotency)
      const { data: existingDonation } = await supabaseAdmin
        .from("donations")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existingDonation) {
        logStep("Donation already recorded", { donationId: existingDonation.id });
        return new Response("Donation already recorded", { status: 200 });
      }

      // Insert donation record
      const { data: donation, error } = await supabaseAdmin
        .from("donations")
        .insert({
          ngo_id: ngoId,
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          amount: donationAmount,
          platform_tip: platformTip,
          donor_email: session.customer_details?.email || null,
          donor_name: session.customer_details?.name || null,
          status: "completed",
        })
        .select()
        .single();

      if (error) {
        logStep("Error inserting donation", { error: error.message });
        return new Response(`Database error: ${error.message}`, { status: 500 });
      }

      logStep("Donation recorded successfully", { donationId: donation.id });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(`Webhook error: ${errorMessage}`, { status: 500 });
  }
});
