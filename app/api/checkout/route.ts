import { NextResponse } from "next/server";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { findTierByAmount, isValidEmail, looksLikeApiKey, quotaForTier } from "@/lib/pricing";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  tierAmount?: unknown;
  email?: unknown;
  existingKey?: unknown;
};

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: Request) {
  // Checkout also reveals whether an existing key is known; limit probing.
  const limited = await enforceRateLimit(req, RATE_LIMITS.checkout);
  if (limited) return limited;

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Price is resolved server-side from the tier table; the client only picks a tier.
  const tier = typeof body.tierAmount === "number" ? findTierByAmount(body.tierAmount) : undefined;
  if (!tier) return badRequest("Unknown pricing tier");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) return badRequest("A valid email address is required");

  const existingKey = typeof body.existingKey === "string" ? body.existingKey.trim() : "";
  let upstreamTokenId = "";

  if (existingKey) {
    if (!looksLikeApiKey(existingKey)) return badRequest("That API key format is not valid");

    // Only keys issued by this storefront can be topped up. Validating before
    // payment avoids charging a customer for a key we cannot credit.
    const { data, error } = await getSupabaseAdmin()
      .from("api_keys")
      .select("upstream_token_id")
      .eq("key_secret", existingKey)
      .maybeSingle();

    if (error) {
      console.error("[checkout] api_keys lookup failed", error);
      return NextResponse.json({ error: "Unable to verify key, try again" }, { status: 500 });
    }
    if (!data) return badRequest("That API key was not found. Leave it blank to buy a new key.");
    upstreamTokenId = String(data.upstream_token_id);
  }

  const quota = quotaForTier(tier);
  const siteUrl = getSiteUrl();
  const metadata = {
    tier_id: tier.id,
    tier_amount_usd: String(tier.amountUsd),
    quota: String(quota),
    email,
    existing_key: existingKey,
    upstream_token_id: upstreamTokenId,
  };

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      customer_creation: "if_required",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: tier.amountUsd * 100,
            product_data: {
              name: `${tier.name} — $${tier.amountUsd} LLM credit${existingKey ? " (top-up)" : ""}`,
              description: `${quota.toLocaleString("en-US")} quota units for Claude, GPT-4o, DeepSeek, Kimi and GLM.`,
            },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
    });

    if (!session.url) throw new Error("Stripe returned a session without a URL");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe session creation failed", err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 502 });
  }
}
