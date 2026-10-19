import Stripe from "stripe";

let client: Stripe | null = null;

/** Server-only Stripe client. Uses the API version pinned by the installed SDK. */
export function getStripe(): Stripe {
  if (client) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY must be set");
  }

  client = new Stripe(secretKey, {
    appInfo: { name: "token-storefront", version: "1.0.0" },
    maxNetworkRetries: 2,
  });
  return client;
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
