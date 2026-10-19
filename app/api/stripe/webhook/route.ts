import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  FulfillmentError,
  claimEvent,
  completeEvent,
  fulfillCheckoutSession,
  releaseEvent,
} from "@/lib/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Upstream provisioning + DB writes + email; give the function headroom.
export const maxDuration = 60;

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Raw body is required for signature verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.warn("[webhook] signature verification failed", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  let claim;
  try {
    claim = await claimEvent(event.id, event.type);
  } catch (err) {
    console.error("[webhook] idempotency claim failed", event.id, err);
    return NextResponse.json({ error: "Temporary failure" }, { status: 500 });
  }

  if (claim === "completed") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (claim === "in_progress") {
    // Another invocation holds the claim; ask Stripe to retry later.
    return NextResponse.json({ error: "Event is being processed" }, { status: 409 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // A previous attempt died mid-flight. New-key creation is idempotent (token
  // name derives from the session id), but a top-up is a read-modify-write we
  // cannot detect after the fact, so re-running it risks double-crediting.
  // Lock the event and hand it to manual reconciliation instead.
  if (claim === "reclaimed" && session.metadata?.existing_key) {
    console.error("[webhook] CRITICAL: abandoned top-up reclaimed; manual reconciliation required", {
      eventId: event.id,
      sessionId: session.id,
      upstreamTokenId: session.metadata.upstream_token_id,
      quota: session.metadata.quota,
    });
    try {
      await completeEvent(event.id);
    } catch (lockErr) {
      console.error("[webhook] CRITICAL: could not lock reclaimed top-up event", event.id, lockErr);
    }
    return NextResponse.json({ received: true, status: "needs_reconciliation" });
  }

  try {
    const outcome = await fulfillCheckoutSession(session);
    if (outcome.status === "not_paid") {
      // Async payment methods: wait for checkout.session.async_payment_succeeded.
      // Release so this event id holds no ledger entry for an unpaid session.
      await releaseEvent(event.id);
      return NextResponse.json({ received: true, pending: true });
    }
    await completeEvent(event.id);
    return NextResponse.json({ received: true, status: outcome.status });
  } catch (err) {
    const provisioned = err instanceof FulfillmentError && err.provisioned;
    console.error("[webhook] fulfillment failed", { eventId: event.id, sessionId: session.id, provisioned, err });
    if (!provisioned) {
      // Nothing was credited upstream, so a Stripe retry is safe.
      await releaseEvent(event.id);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
    // Quota was already granted upstream. Lock the event as completed so no
    // retry can credit it twice; the CRITICAL log carries reconciliation data.
    try {
      await completeEvent(event.id);
    } catch (lockErr) {
      console.error("[webhook] CRITICAL: could not lock provisioned event", event.id, lockErr);
    }
    return NextResponse.json({ received: true, status: "needs_reconciliation" });
  }
}
