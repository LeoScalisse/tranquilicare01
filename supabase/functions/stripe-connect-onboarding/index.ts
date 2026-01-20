import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARDING] ${step}${detailsStr}`);
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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { returnUrl, ngoId } = await req.json();
    if (!returnUrl) throw new Error("Missing returnUrl");
    if (!ngoId) throw new Error("Missing ngoId");
    logStep("Request params", { returnUrl, ngoId });

    // Verify user owns this NGO
    const { data: ngo, error: ngoError } = await supabaseAdmin
      .from("ngos")
      .select("id, name, email, owner_id")
      .eq("id", ngoId)
      .eq("owner_id", user.id)
      .single();

    if (ngoError || !ngo) {
      throw new Error("NGO not found or you don't have permission");
    }
    logStep("NGO verified", { ngoId: ngo.id, ngoName: ngo.name });

    // Check if NGO already has a Stripe account
    const { data: existingAccount } = await supabaseAdmin
      .from("ngo_stripe_accounts")
      .select("stripe_account_id, onboarding_complete")
      .eq("ngo_id", ngoId)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      stripeAccountId = existingAccount.stripe_account_id;
      logStep("Using existing Stripe account", { stripeAccountId });
    } else {
      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: "express",
        email: ngo.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          ngo_id: ngoId,
          ngo_name: ngo.name,
        },
      });

      stripeAccountId = account.id;
      logStep("Created Stripe account", { stripeAccountId });

      // Save to database
      const { error: insertError } = await supabaseAdmin
        .from("ngo_stripe_accounts")
        .insert({
          ngo_id: ngoId,
          stripe_account_id: stripeAccountId,
          onboarding_complete: false,
        });

      if (insertError) {
        logStep("Error saving Stripe account", { error: insertError.message });
        throw new Error("Failed to save Stripe account");
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      return_url: `${returnUrl}?stripe_onboarding=complete&ngo_id=${ngoId}`,
      refresh_url: `${returnUrl}?stripe_onboarding=refresh&ngo_id=${ngoId}`,
      type: "account_onboarding",
    });

    logStep("Created account link", { url: accountLink.url });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
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
