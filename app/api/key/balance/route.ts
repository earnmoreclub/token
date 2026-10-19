import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getTokenBalance } from "@/lib/upstream";
import { looksLikeApiKey, quotaToUsd } from "@/lib/pricing";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Key holders check their remaining balance. POST so the key never lands in URLs or logs. */
export async function POST(req: Request) {
  // Tight limit: this endpoint confirms whether a guessed key exists.
  const limited = await enforceRateLimit(req, RATE_LIMITS.balance);
  if (limited) return limited;

  let key = "";
  try {
    const body = (await req.json()) as { key?: unknown };
    key = typeof body.key === "string" ? body.key.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: noStore });
  }
  if (!looksLikeApiKey(key)) {
    return NextResponse.json({ error: "That API key format is not valid" }, { status: 400, headers: noStore });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("api_keys")
    .select("upstream_token_id, quota_total, created_at")
    .eq("key_secret", key)
    .maybeSingle();

  if (error) {
    console.error("[key/balance] lookup failed", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500, headers: noStore });
  }
  if (!data) {
    return NextResponse.json({ error: "Key not found" }, { status: 404, headers: noStore });
  }

  try {
    const balance = await getTokenBalance(Number(data.upstream_token_id));
    return NextResponse.json(
      {
        remainQuota: balance.remainQuota,
        usedQuota: balance.usedQuota,
        totalPurchased: Number(data.quota_total),
        remainUsd: quotaToUsd(balance.remainQuota),
        usedUsd: quotaToUsd(balance.usedQuota),
        active: balance.status === 1,
        createdAt: data.created_at,
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[key/balance] upstream failed", err);
    return NextResponse.json({ error: "Gateway unavailable, try again shortly" }, { status: 502, headers: noStore });
  }
}
