// Run with: npm test (starts tests/mock-upstream.mjs, then this file).
import assert from "node:assert/strict";

process.env.UPSTREAM_URL = `http://localhost:${process.env.MOCK_PORT ?? 4010}`;
process.env.UPSTREAM_ADMIN_TOKEN = "admin";

const { provisionOrTopupKey, getTokenBalance } = await import("../lib/upstream.ts");

async function calls(): Promise<{ create: number; put: number }> {
  const res = await fetch(`${process.env.UPSTREAM_URL}/__calls`, { headers: { authorization: "Bearer admin" } });
  return ((await res.json()) as { data: { create: number; put: number } }).data;
}

// 1. New key. Search results are masked, so the reveal endpoint must be used.
const a = await provisionOrTopupKey({ quota: 10_000_000, email: "dev@example.com", idempotencyKey: "cs_test_A" });
assert.equal(a.isTopup, false);
assert.match(a.keySecret, /^sk-abcdefghijklmnopqrstuvwx\d+$/);
assert.equal(a.remainQuota, 10_000_000);
console.log("ok  new key provisioned, id", a.upstreamTokenId);

// 2. Retry for the same session reuses the token instead of creating a second one.
const a2 = await provisionOrTopupKey({ quota: 10_000_000, email: "dev@example.com", idempotencyKey: "cs_test_A" });
assert.equal(a2.upstreamTokenId, a.upstreamTokenId);
assert.equal(a2.keySecret, a.keySecret);
assert.equal((await calls()).create, 1);
console.log("ok  retried session reused token (1 create call)");

// 3. Top-up by key lookup.
const b = await provisionOrTopupKey({
  quota: 5_000_000,
  email: "dev@example.com",
  existingKey: a.keySecret,
  idempotencyKey: "cs_test_B",
});
assert.equal(b.isTopup, true);
assert.equal(b.remainQuota, 15_000_000);
console.log("ok  top-up via key lookup -> 15,000,000");

// 4. Top-up with a known token id.
const c = await provisionOrTopupKey({
  quota: 1_000_000,
  email: "dev@example.com",
  existingKey: a.keySecret,
  existingTokenId: a.upstreamTokenId,
  idempotencyKey: "cs_test_C",
});
assert.equal(c.remainQuota, 16_000_000);
assert.equal((await getTokenBalance(a.upstreamTokenId)).remainQuota, 16_000_000);
console.log("ok  top-up via known id -> balance 16,000,000");

// 5. A key that doesn't belong to the given token id is rejected.
const other = await provisionOrTopupKey({ quota: 500_000, email: "x@example.com", idempotencyKey: "cs_test_D" });
await assert.rejects(
  provisionOrTopupKey({
    quota: 1,
    email: "x@example.com",
    existingKey: other.keySecret,
    existingTokenId: a.upstreamTokenId,
    idempotencyKey: "cs_test_E",
  }),
  /does not match/,
);
assert.equal((await getTokenBalance(a.upstreamTokenId)).remainQuota, 16_000_000);
console.log("ok  mismatched key/id rejected, balance unchanged");

// 6. Unknown key and invalid quota are rejected.
await assert.rejects(
  provisionOrTopupKey({ quota: 1, email: "x@example.com", existingKey: "sk-doesnotexist1234567890", idempotencyKey: "cs_test_F" }),
  /not found/,
);
await assert.rejects(provisionOrTopupKey({ quota: 0, email: "x@example.com", idempotencyKey: "cs_test_G" }), /Invalid quota/);
console.log("ok  unknown key and zero quota rejected");

console.log("ALL UPSTREAM TESTS PASSED");
