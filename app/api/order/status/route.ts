import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { quotaToUsd } from "@/lib/pricing";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

const noStore = { "Cache-Control": "no-store" };

/**
 * Resolve a Checkout Session to its provisioned key.
 * The session id is an unguessable value only the paying customer receives
 * (via Stripe's success redirect), so it acts as a bearer credential.
 */
export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.orderStatus);
  if (limited) return limited;

  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!SESSION_ID_RE.test(sessionId)) {
    return NextResponse.json({ status: "invalid", error: "Invalid session id" }, { status: 400, headers: noStore });
  }

  const { data: order, error } = await getSupabaseAdmin()
    .from("orders")
    .select("key_secret, user_email, amount_usd, quota_granted, is_topup, created_at")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("[order/status] lookup failed", error);
    return NextResponse.json({ status: "error", error: "Lookup failed" }, { status: 500, headers: noStore });
  }

  if (order) {
    return NextResponse.json(
      {
        status: "fulfilled",
        keySecret: order.key_secret,
        email: order.user_email,
        amountUsd: Number(order.amount_usd),
        quotaGranted: Number(order.quota_granted),
        creditUsd: quotaToUsd(Number(order.quota_granted)),
        isTopup: order.is_topup,
        createdAt: order.created_at,
      },
      { headers: noStore },
    );
  }

  // No order yet: tell the client whether to keep polling.
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (session.status === "expired") {
      return NextResponse.json({ status: "expired" }, { headers: noStore });
    }
    return NextResponse.json(
      { status: paid ? "processing" : "awaiting_payment", email: session.customer_details?.email ?? null },
      { headers: noStore },
    );
  } catch (err) {
    console.warn("[order/status] session retrieve failed", (err as Error).message);
    return NextResponse.json({ status: "not_found" }, { status: 404, headers: noStore });
  }
}
