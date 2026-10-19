import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { provisionOrTopupKey } from "@/lib/upstream";
import { sendOnboardingEmail } from "@/lib/email";
import { findTierByAmount, quotaForTier } from "@/lib/pricing";

/** A claim stuck in "processing" longer than this is considered abandoned. */
const STALE_CLAIM_MS = 10 * 60 * 1000;

/**
 * claimed     -> first attempt, safe to fulfill
 * reclaimed   -> a previous attempt was abandoned mid-flight; its upstream
 *                side effects are unknown
 * completed   -> already fulfilled
 * in_progress -> another invocation currently holds the claim
 */
export type ClaimResult = "claimed" | "reclaimed" | "completed" | "in_progress";

/**
 * Atomically claim a Stripe event. The primary key on processed_stripe_events
 * guarantees only one concurrent invocation wins the insert.
 */
export async function claimEvent(eventId: string, eventType: string): Promise<ClaimResult> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("processed_stripe_events")
    .insert({ id: eventId, event_type: eventType, status: "processing" });

  if (!error) return "claimed";
  if (error.code !== "23505") throw new Error(`Event claim failed: ${error.message}`);

  const { data, error: readErr } = await db
    .from("processed_stripe_events")
    .select("status, processed_at")
    .eq("id", eventId)
    .single();
  if (readErr || !data) throw new Error(`Event claim lookup failed: ${readErr?.message}`);
  if (data.status === "completed") return "completed";

  // Reclaim an abandoned claim (e.g. the function timed out before provisioning).
  const age = Date.now() - new Date(data.processed_at as string).getTime();
  if (age > STALE_CLAIM_MS) {
    const { data: reclaimed, error: updErr } = await db
      .from("processed_stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("status", "processing")
      .eq("processed_at", data.processed_at)
      .select("id");
    if (updErr) throw new Error(`Event reclaim failed: ${updErr.message}`);
    if (reclaimed && reclaimed.length === 1) return "reclaimed";
  }
  return "in_progress";
}

export async function completeEvent(eventId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("processed_stripe_events")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) throw new Error(`Marking event completed failed: ${error.message}`);
}

/** Release a claim so Stripe's retry can process it. Only safe before provisioning. */
export async function releaseEvent(eventId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("processed_stripe_events")
    .delete()
    .eq("id", eventId)
    .eq("status", "processing");
  if (error) console.error("[fulfillment] releasing claim failed", eventId, error);
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`[fulfillment] ${label} attempt ${i + 1} failed`, err);
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 250 * 2 ** i));
    }
  }
  throw lastErr;
}

export class FulfillmentError extends Error {
  constructor(
    message: string,
    /** True once upstream quota has been granted; retrying would double-credit. */
    readonly provisioned: boolean,
  ) {
    super(message);
    this.name = "FulfillmentError";
  }
}

export type FulfillmentOutcome =
  | { status: "fulfilled"; keySecret: string; isTopup: boolean }
  | { status: "already_fulfilled" }
  | { status: "not_paid" };

/**
 * Provision/top-up the key for a paid Checkout Session and persist the order.
 * Safe to call more than once per session: an existing order short-circuits.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<FulfillmentOutcome> {
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { status: "not_paid" };
  }

  const db = getSupabaseAdmin();

  const { data: existingOrder, error: orderLookupErr } = await db
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (orderLookupErr) throw new FulfillmentError(`Order lookup failed: ${orderLookupErr.message}`, false);
  if (existingOrder) return { status: "already_fulfilled" };

  const meta = session.metadata ?? {};
  const tier = findTierByAmount(Number(meta.tier_amount_usd));
  if (!tier) throw new FulfillmentError(`Unknown tier in session metadata: ${meta.tier_amount_usd}`, false);

  // Recompute quota server-side and cross-check against what Stripe charged.
  const quota = quotaForTier(tier);
  if (session.amount_total === null || session.amount_total < tier.amountUsd * 100) {
    throw new FulfillmentError(`Amount mismatch: charged ${session.amount_total}, tier ${tier.amountUsd}`, false);
  }

  const email = (meta.email || session.customer_details?.email || session.customer_email || "").toLowerCase();
  if (!email) throw new FulfillmentError("Session has no customer email", false);

  const existingKey = meta.existing_key?.trim() || null;
  const existingTokenId = meta.upstream_token_id ? Number(meta.upstream_token_id) : null;

  let result;
  try {
    result = await provisionOrTopupKey({
      quota,
      email,
      existingKey,
      existingTokenId,
      idempotencyKey: session.id,
    });
  } catch (err) {
    throw new FulfillmentError(`Upstream provisioning failed: ${(err as Error).message}`, false);
  }

  // From here on quota has been granted upstream. Never re-provision.
  try {
    await withRetry("insert order", async () => {
      const { error } = await db.from("orders").insert({
        stripe_session_id: session.id,
        user_email: email,
        amount_usd: tier.amountUsd,
        quota_granted: quota,
        key_secret: result.keySecret,
        is_topup: result.isTopup,
      });
      if (error && error.code !== "23505") throw new Error(error.message);
    });

    await withRetry("persist api_key", async () => {
      if (result.isTopup) {
        const { error } = await db.rpc("increment_key_quota", {
          p_key_secret: result.keySecret,
          p_quota: quota,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("api_keys").insert({
          key_secret: result.keySecret,
          user_email: email,
          quota_total: quota,
          upstream_token_id: result.upstreamTokenId,
        });
        if (error && error.code !== "23505") throw new Error(error.message);
      }
    });
  } catch (err) {
    console.error(
      "[fulfillment] CRITICAL: upstream credited but DB persistence failed; manual reconciliation required",
      { sessionId: session.id, upstreamTokenId: result.upstreamTokenId, quota, isTopup: result.isTopup },
    );
    throw new FulfillmentError(`Persistence failed after provisioning: ${(err as Error).message}`, true);
  }

  try {
    await sendOnboardingEmail({
      to: email,
      keySecret: result.keySecret,
      amountUsd: tier.amountUsd,
      quotaGranted: quota,
      isTopup: result.isTopup,
    });
  } catch (err) {
    // The key is still shown on the success page, so email failure is non-fatal.
    console.error("[fulfillment] onboarding email failed", session.id, err);
  }

  return { status: "fulfilled", keySecret: result.keySecret, isTopup: result.isTopup };
}
