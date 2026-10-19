/**
 * Shared pricing configuration. Safe to import from both client and server code.
 */

/** 1 USD = 500,000 standard OneAPI / NewAPI quota units. */
export const QUOTA_PER_USD = 500_000;

export type Tier = {
  id: "starter" | "builder" | "pro" | "scale";
  name: string;
  amountUsd: number;
  bonusPercent: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

export const TIERS: readonly Tier[] = [
  {
    id: "starter",
    name: "Starter",
    amountUsd: 20,
    bonusPercent: 0,
    tagline: "Prototype and evaluate models.",
    features: ["All models included", "OpenAI-compatible endpoint", "Never expires"],
  },
  {
    id: "builder",
    name: "Builder",
    amountUsd: 50,
    bonusPercent: 5,
    tagline: "Ship your first production feature.",
    features: ["+5% bonus quota", "All models included", "Top up any time"],
  },
  {
    id: "pro",
    name: "Pro",
    amountUsd: 100,
    bonusPercent: 10,
    tagline: "For teams running real traffic.",
    features: ["+10% bonus quota", "Priority routing", "Email support"],
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    amountUsd: 250,
    bonusPercent: 15,
    tagline: "High-volume agents and pipelines.",
    features: ["+15% bonus quota", "Priority routing", "Dedicated support channel"],
  },
] as const;

export function findTierByAmount(amountUsd: number): Tier | undefined {
  return TIERS.find((t) => t.amountUsd === amountUsd);
}

/** Quota units granted for a tier, including bonus. Always an integer. */
export function quotaForTier(tier: Tier): number {
  return Math.floor(tier.amountUsd * QUOTA_PER_USD * (1 + tier.bonusPercent / 100));
}

export function quotaToUsd(quota: number): number {
  return quota / QUOTA_PER_USD;
}

export type ModelPrice = {
  model: string;
  vendor: string;
  /** USD per 1M tokens, provider list price. */
  listInput: number;
  listOutput: number;
  /** USD per 1M tokens, gateway price. */
  gatewayInput: number;
  gatewayOutput: number;
};

export const MODEL_PRICES: readonly ModelPrice[] = [
  { model: "claude-3-5-sonnet", vendor: "Anthropic", listInput: 3, listOutput: 15, gatewayInput: 2.1, gatewayOutput: 10.5 },
  { model: "gpt-4o", vendor: "OpenAI", listInput: 2.5, listOutput: 10, gatewayInput: 1.75, gatewayOutput: 7 },
  { model: "deepseek-v3", vendor: "DeepSeek", listInput: 0.27, listOutput: 1.1, gatewayInput: 0.19, gatewayOutput: 0.77 },
  { model: "kimi-k2", vendor: "Moonshot", listInput: 0.6, listOutput: 2.5, gatewayInput: 0.42, gatewayOutput: 1.75 },
  { model: "glm-4.5", vendor: "Zhipu", listInput: 0.6, listOutput: 2.2, gatewayInput: 0.42, gatewayOutput: 1.54 },
] as const;

export const GATEWAY_BASE_URL =
  process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ?? "https://gateway.domain.com/v1";

/** Basic shape check for keys issued by OneAPI/NewAPI. */
export function looksLikeApiKey(value: string): boolean {
  return /^sk-[A-Za-z0-9]{16,128}$/.test(value);
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
