"use client";

import { useState } from "react";
import { LoaderCircle, Lock } from "lucide-react";
import { Modal } from "@/components/Modal";
import { isValidEmail, looksLikeApiKey, quotaForTier, quotaToUsd, type Tier } from "@/lib/pricing";
import { useTranslation } from "@/context/LanguageContext";

export function CheckoutModal({ tier, onClose }: { tier: Tier | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [existingKey, setExistingKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tier) return;
    setError(null);

    const cleanEmail = email.trim();
    const cleanKey = existingKey.trim();
    if (!isValidEmail(cleanEmail)) return setError("Enter a valid email address.");
    if (cleanKey && !looksLikeApiKey(cleanKey)) return setError("API keys start with sk- followed by letters and numbers.");

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierAmount: tier.amountUsd, email: cleanEmail, existingKey: cleanKey }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to start checkout.");
      window.location.assign(data.url);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const credit = tier ? quotaToUsd(quotaForTier(tier)) : 0;

  return (
    <Modal
      open={tier !== null}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={tier ? `${tier.name} — $${tier.amountUsd}` : "Checkout"}
      description={tier ? `You get $${credit.toFixed(2)} of usable credit across every model.` : undefined}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="checkout-email" className="mb-1.5 block text-sm font-medium text-zinc-300">
            {t.pricing.enterEmail}
          </label>
          <input
            id="checkout-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Your key and receipt are sent here.</p>
        </div>

        <div>
          <label htmlFor="checkout-key" className="mb-1.5 block text-sm font-medium text-zinc-300">
            {t.pricing.enterKeyOptional}
          </label>
          <input
            id="checkout-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={existingKey}
            onChange={(e) => setExistingKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Leave blank to receive a brand-new key.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          {loading ? "Redirecting to Stripe…" : `Pay $${tier?.amountUsd ?? 0} with Stripe`}
        </button>
        <p className="text-center text-xs text-zinc-500">Secure checkout by Stripe. Keys are delivered instantly.</p>
      </form>
    </Modal>
  );
}
