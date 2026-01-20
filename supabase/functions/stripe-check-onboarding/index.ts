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

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CHECK-ONBOARDING] ${step}${detailsStr}`);
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

    const { ngoId } = await req.json();
    if (!ngoId) throw new Error("Missing ngoId");
    logStep("Checking onboarding for NGO", { ngoId });

    // Get NGO's Stripe account
    const { data: stripeAccount, error: accountError } = await supabaseAdmin
      .from("ngo_stripe_accounts")
      .select("stripe_account_id, onboarding_complete")
      .eq("ngo_id", ngoId)
      .single();

    if (accountError || !stripeAccount) {
      logStep("No Stripe account found");
      return new Response(
        JSON.stringify({ hasAccount: false, onboardingComplete: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If already marked complete, return cached status
    if (stripeAccount.onboarding_complete) {
      logStep("Onboarding already complete (cached)");
      return new Response(
        JSON.stringify({ hasAccount: true, onboardingComplete: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check with Stripe if onboarding is complete
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);
    const isComplete = account.charges_enabled && account.payouts_enabled;
    logStep("Stripe account status", { 
      chargesEnabled: account.charges_enabled, 
      payoutsEnabled: account.payouts_enabled,
      isComplete 
    });

    // Update database if onboarding is now complete
    if (isComplete && !stripeAccount.onboarding_complete) {
      await supabaseAdmin
        .from("ngo_stripe_accounts")
        .update({ onboarding_complete: true })
        .eq("ngo_id", ngoId);
      logStep("Updated onboarding status to complete");
    }

    return new Response(
      JSON.stringify({ 
        hasAccount: true, 
        onboardingComplete: isComplete,
        stripeAccountId: stripeAccount.stripe_account_id
      }),
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
