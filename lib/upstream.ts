/**
 * OneAPI / NewAPI admin client for provisioning and topping up API tokens.
 *
 * Endpoints used (standard NewAPI / OneAPI token management API):
 *   POST /api/token/                 create token
 *   GET  /api/token/search?keyword=  search tokens by name (or &token= by key)
 *   GET  /api/token/:id              fetch a single token
 *   PUT  /api/token/                 update token (full object)
 *   POST /api/token/:id/key          (newer NewAPI) reveal the unmasked key
 *
 * Server-only. Requires UPSTREAM_URL and UPSTREAM_ADMIN_TOKEN.
 */

import { createHash } from "node:crypto";

export type UpstreamToken = {
  id: number;
  key: string;
  name: string;
  remain_quota: number;
  used_quota: number;
  unlimited_quota: boolean;
  expired_time: number;
  status: number;
  [extra: string]: unknown;
};

export type ProvisionInput = {
  /** Quota units to add (1 USD = 500,000 units). */
  quota: number;
  /** Customer email, used to build a recognisable token name. */
  email: string;
  /** Existing sk-... key to top up. Empty / undefined provisions a new key. */
  existingKey?: string | null;
  /** Known upstream token id for existingKey (skips a lookup when available). */
  existingTokenId?: number | null;
  /**
   * Stable per-payment id (the Stripe Checkout Session id). New tokens are
   * named from it, so a retried fulfillment reuses the token it already
   * created instead of minting a second one.
   */
  idempotencyKey: string;
};

export type ProvisionResult = {
  keySecret: string;
  upstreamTokenId: number;
  remainQuota: number;
  isTopup: boolean;
};

type UpstreamEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

function config() {
  const baseUrl = process.env.UPSTREAM_URL?.replace(/\/$/, "");
  const token = process.env.UPSTREAM_ADMIN_TOKEN;
  if (!baseUrl || !token) {
    throw new UpstreamError("UPSTREAM_URL and UPSTREAM_ADMIN_TOKEN must be set");
  }
  return { baseUrl, token, userId: process.env.UPSTREAM_ADMIN_USER_ID };
}

async function request<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T | undefined> {
  const { baseUrl, token, userId } = config();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // NewAPI requires the acting user id alongside an access token.
  if (userId) headers["New-Api-User"] = userId;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new UpstreamError(`Upstream ${method} ${path} failed: ${(err as Error).message}`);
  }

  const text = await res.text();
  let json: UpstreamEnvelope<T>;
  try {
    json = text ? (JSON.parse(text) as UpstreamEnvelope<T>) : {};
  } catch {
    throw new UpstreamError(`Upstream ${method} ${path} returned non-JSON (HTTP ${res.status})`, res.status);
  }

  if (!res.ok || json.success === false) {
    throw new UpstreamError(
      `Upstream ${method} ${path} failed (HTTP ${res.status}): ${json.message || "unknown error"}`,
      res.status,
    );
  }
  return json.data;
}

/** OneAPI/NewAPI store keys without the "sk-" prefix; normalise both ways. */
function withPrefix(key: string): string {
  return key.startsWith("sk-") ? key : `sk-${key}`;
}
function withoutPrefix(key: string): string {
  return key.startsWith("sk-") ? key.slice(3) : key;
}

/** List/search endpoints return either an array or a paginated { items } object. */
function asTokenList(data: unknown): UpstreamToken[] {
  if (Array.isArray(data)) return data as UpstreamToken[];
  if (data && typeof data === "object") {
    const obj = data as { items?: unknown; data?: unknown };
    if (Array.isArray(obj.items)) return obj.items as UpstreamToken[];
    if (Array.isArray(obj.data)) return obj.data as UpstreamToken[];
  }
  return [];
}

export async function getTokenById(id: number): Promise<UpstreamToken> {
  const data = await request<UpstreamToken>("GET", `/api/token/${id}`);
  if (!data || typeof data.id !== "number") {
    throw new UpstreamError(`Upstream token ${id} not found`);
  }
  return data;
}

async function searchTokens(params: Record<string, string>): Promise<UpstreamToken[]> {
  const qs = new URLSearchParams(params).toString();
  return asTokenList(await request<unknown>("GET", `/api/token/search?${qs}`));
}

/** Newer NewAPI builds mask keys in list responses; reveal the full key when needed. */
async function resolveFullKey(token: UpstreamToken): Promise<string> {
  if (token.key && !token.key.includes("*")) return withPrefix(token.key);
  const data = await request<{ key?: string } | string>("POST", `/api/token/${token.id}/key`);
  const key = typeof data === "string" ? data : data?.key;
  if (!key || key.includes("*")) {
    throw new UpstreamError(`Unable to reveal key for upstream token ${token.id}`);
  }
  return withPrefix(key);
}

/** Locate an upstream token by its secret key (handles masked list responses). */
export async function findTokenByKey(key: string): Promise<UpstreamToken | null> {
  const raw = withoutPrefix(key.trim());
  const results = await searchTokens({ keyword: "", token: raw });
  for (const t of results) {
    if (!t.key) continue;
    if (!t.key.includes("*")) {
      if (withoutPrefix(t.key) === raw) return t;
      continue;
    }
    const full = await resolveFullKey(t);
    if (withoutPrefix(full) === raw) return { ...t, key: raw };
  }
  return null;
}

function buildTokenName(email: string, idempotencyKey: string): string {
  const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "user";
  // Deterministic suffix: locates the token after creation (POST /api/token/
  // does not return the key on most builds) and makes creation idempotent.
  const suffix = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 12);
  return `shop-${local}-${suffix}`;
}

async function toResult(token: UpstreamToken, fallbackQuota: number): Promise<ProvisionResult> {
  return {
    keySecret: await resolveFullKey(token),
    upstreamTokenId: token.id,
    remainQuota: token.remain_quota ?? fallbackQuota,
    isTopup: false,
  };
}

async function createToken(quota: number, email: string, idempotencyKey: string): Promise<ProvisionResult> {
  const name = buildTokenName(email, idempotencyKey);

  // A previous attempt for this payment may have created the token before dying.
  const prior = (await searchTokens({ keyword: name })).find((t) => t.name === name);
  if (prior) return toResult(prior, quota);

  const created = await request<UpstreamToken | undefined>("POST", "/api/token/", {
    name,
    remain_quota: quota,
    expired_time: -1,
    unlimited_quota: false,
  });

  let token: UpstreamToken | undefined =
    created && typeof created === "object" && typeof created.id === "number" ? created : undefined;

  if (!token) {
    const matches = await searchTokens({ keyword: name });
    token = matches.find((t) => t.name === name);
  }
  if (!token) {
    throw new UpstreamError(`Token "${name}" was created but could not be located upstream`);
  }

  return toResult(token, quota);
}

async function topupToken(existingKey: string, quota: number, knownId?: number | null): Promise<ProvisionResult> {
  const raw = withoutPrefix(existingKey.trim());

  let tokenId = knownId ?? null;
  if (!tokenId) {
    const found = await findTokenByKey(raw);
    if (!found) throw new UpstreamError("Existing API key was not found on the upstream gateway");
    tokenId = found.id;
  }

  // Re-read the authoritative record right before updating.
  const current = await getTokenById(tokenId);
  const currentKey = withoutPrefix(await resolveFullKey(current));
  if (currentKey !== raw) {
    throw new UpstreamError("Upstream token id does not match the provided key");
  }

  const newRemain = (current.remain_quota ?? 0) + quota;
  // PUT expects the full token object; send it back with the updated quota.
  await request<unknown>("PUT", "/api/token/", {
    ...current,
    key: current.key,
    remain_quota: newRemain,
    unlimited_quota: false,
    // Re-enable a token that was exhausted (status 4 in NewAPI/OneAPI).
    status: current.status === 4 ? 1 : current.status,
  });

  return {
    keySecret: withPrefix(raw),
    upstreamTokenId: current.id,
    remainQuota: newRemain,
    isTopup: true,
  };
}

/**
 * Provision a fresh key, or add quota to an existing one.
 * The read-modify-write top-up is not atomic upstream; callers must
 * guarantee single execution per payment (see webhook idempotency claim).
 */
export async function provisionOrTopupKey(input: ProvisionInput): Promise<ProvisionResult> {
  if (!Number.isInteger(input.quota) || input.quota <= 0) {
    throw new UpstreamError(`Invalid quota: ${input.quota}`);
  }
  if (!input.idempotencyKey) {
    throw new UpstreamError("idempotencyKey is required");
  }
  const existing = input.existingKey?.trim();
  return existing
    ? topupToken(existing, input.quota, input.existingTokenId)
    : createToken(input.quota, input.email, input.idempotencyKey);
}

export type TokenBalance = {
  remainQuota: number;
  usedQuota: number;
  status: number;
  name: string;
};

export async function getTokenBalance(tokenId: number): Promise<TokenBalance> {
  const t = await getTokenById(tokenId);
  return {
    remainQuota: t.remain_quota ?? 0,
    usedQuota: t.used_quota ?? 0,
    status: t.status,
    name: t.name,
  };
}
