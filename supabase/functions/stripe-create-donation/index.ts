import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TranquiliCare product price ID for optional tips
const PLATFORM_TIP_PRICE_ID = "price_1SrUC5LUm31fFfq0B7MaGSE0";

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

    const { ngoId, amount, returnUrl, ngoName, platformTipAmount } = await req.json();
    
    if (!ngoId) throw new Error("Missing ngoId");
    if (!amount || amount < 100) throw new Error("Minimum donation is R$1,00");
    if (!returnUrl) throw new Error("Missing returnUrl");
    
    logStep("Request params", { ngoId, amount, returnUrl, ngoName, platformTipAmount });

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

    // Build line items - NGO donation goes 100% to NGO via Connect
    const lineItems: Array<{
      price_data?: { currency: string; product_data: { name: string; description: string }; unit_amount: number };
      price?: string;
      quantity: number;
    }> = [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: `Doação para ${ngoName || 'ONG'}`,
            description: "100% desta doação vai diretamente para a ONG.",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ];

    // Optional platform tip - goes to TranquiliCare
    const hasPlatformTip = platformTipAmount && platformTipAmount >= 100;
    if (hasPlatformTip) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: "Contribuição para TranquiliCare",
            description: "Obrigado por apoiar a plataforma!",
          },
          unit_amount: platformTipAmount,
        },
        quantity: 1,
      });
    }

    logStep("Creating checkout session", { 
      ngoAmount: amount, 
      platformTip: hasPlatformTip ? platformTipAmount : 0,
      ngoReceives: amount 
    });

    // Create checkout session - NGO receives 100% of their donation
    // Platform tip (if any) stays with TranquiliCare (no transfer_data for that item)
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: lineItems,
      payment_intent_data: {
        // Only transfer the NGO donation amount, not the platform tip
        application_fee_amount: hasPlatformTip ? platformTipAmount : 0,
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
