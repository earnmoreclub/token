import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export type RateLimitRule = {
  /** Route identifier, e.g. "balance". */
  name: string;
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export const RATE_LIMITS = {
  // Success page polls every 2s (30/min); leave headroom for refreshes.
  orderStatus: { name: "order-status", limit: 60, windowSeconds: 60 },
  balance: { name: "balance", limit: 10, windowSeconds: 60 },
  checkout: { name: "checkout", limit: 10, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/** Client IP as reported by Vercel's edge (first x-forwarded-for hop). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Records a hit for this client and returns a 429 response when over the limit,
 * or null when the request may proceed. Fails open if the database is
 * unavailable so a Supabase blip doesn't block paying customers.
 */
export async function enforceRateLimit(req: Request, rule: RateLimitRule): Promise<NextResponse | null> {
  const ipHash = createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 32);
  const bucket = `${rule.name}:${ipHash}`;

  const { data, error } = await getSupabaseAdmin().rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] check failed, allowing request", rule.name, error.message);
    return null;
  }

  const hits = typeof data === "number" ? data : Number(data);
  if (!Number.isFinite(hits) || hits <= rule.limit) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const retryAfter = rule.windowSeconds - (nowSec % rule.windowSeconds);
  return NextResponse.json(
    { status: "rate_limited", error: "Too many requests, please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
    },
  );
}
