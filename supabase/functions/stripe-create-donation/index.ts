import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Allowed domains for return URL validation
const ALLOWED_DOMAINS = [
  "tranquilicare.lovable.app",
  "id-preview--332e5c94-0af4-41b8-8939-57816c07db83.lovable.app",
  "localhost",
  "127.0.0.1",
];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CREATE-DONATION] ${step}${detailsStr}`);
};

// Simple in-memory rate limiter
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!record || record.resetTime < now) {
    // First request or window expired
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

// Validate return URL to prevent open redirect
function validateReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    
    // Check if hostname matches any allowed domain
    return ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Rate limiting check
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    if (!checkRateLimit(clientIp)) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Por favor, aguarde um momento e tente novamente." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { ngoId, amount, returnUrl, ngoName, platformTipAmount } = await req.json();
    
    if (!ngoId) throw new Error("Missing ngoId");
    if (!amount || amount < 100) throw new Error("Minimum donation is R$1,00");
    if (!returnUrl) throw new Error("Missing returnUrl");
    
    // Validate return URL to prevent open redirect attacks
    if (!validateReturnUrl(returnUrl)) {
      logStep("Invalid return URL", { returnUrl });
      throw new Error("Invalid return URL");
    }
    
    logStep("Request params", { ngoId, amount, returnUrl: returnUrl.substring(0, 50), ngoName, platformTipAmount });

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
