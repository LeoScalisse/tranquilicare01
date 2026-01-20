import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&deno-std=0.132.0&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2024-12-18.acacia",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform fee percentage (e.g., 5% = 0.05)
const PLATFORM_FEE_PERCENTAGE = 0.05;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CREATE-DONATION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { ngoId, amount, returnUrl, ngoName } = await req.json();
    
    if (!ngoId) throw new Error("Missing ngoId");
    if (!amount || amount < 100) throw new Error("Minimum donation is R$1,00");
    if (!returnUrl) throw new Error("Missing returnUrl");
    
    logStep("Request params", { ngoId, amount, returnUrl, ngoName });

    // Get NGO's Stripe account
    const { data: stripeAccount, error: accountError } = await supabaseAdmin
      .from("ngo_stripe_accounts")
      .select("stripe_account_id, onboarding_complete")
      .eq("ngo_id", ngoId)
      .single();

    if (accountError || !stripeAccount) {
      throw new Error("NGO has not set up payment receiving");
    }

    if (!stripeAccount.onboarding_complete) {
      throw new Error("NGO has not completed payment setup");
    }

    logStep("Found NGO Stripe account", { 
      stripeAccountId: stripeAccount.stripe_account_id 
    });

    // Calculate platform fee (in cents)
    const applicationFeeAmount = Math.round(amount * PLATFORM_FEE_PERCENTAGE);
    logStep("Calculated fees", { 
      totalAmount: amount, 
      platformFee: applicationFeeAmount,
      ngoReceives: amount - applicationFeeAmount 
    });

    // Create checkout session with Connect
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Doação para ${ngoName || 'ONG'}`,
              description: "Sua doação faz a diferença! Obrigado por apoiar esta causa.",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
        },
      },
      return_url: `${returnUrl}?donation=complete&ngo_id=${ngoId}&session_id={CHECKOUT_SESSION_ID}`,
    });

    logStep("Created checkout session", { 
      sessionId: session.id,
      clientSecret: session.client_secret ? "present" : "missing"
    });

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
