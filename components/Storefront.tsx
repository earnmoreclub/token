"use client";

import { useEffect, useState } from "react";
import { Check, Gauge, KeyRound, Zap } from "lucide-react";
import { CheckoutModal } from "@/components/CheckoutModal";
import { BalanceChecker } from "@/components/BalanceChecker";
import { TIERS, quotaForTier, quotaToUsd, type Tier } from "@/lib/pricing";
import { useTranslation } from "@/context/LanguageContext";

/** Pricing cards plus the checkout and balance dialogs. */
export function Storefront() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Tier | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "cancelled") setCancelled(true);
  }, []);

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="mx-auto max-w-6xl px-6 py-24">
      {cancelled && (
        <p role="status" className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Checkout was cancelled. You have not been charged.
        </p>
      )}

      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 id="pricing-heading" className="text-3xl font-semibold tracking-tight text-white">
            Prepaid credit. No subscriptions.
          </h2>
          <p className="mt-2 max-w-xl text-zinc-400">
            Buy once, use across every model. Credit never expires and you can top up the same key at any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBalanceOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <Gauge className="h-4 w-4" aria-hidden />
          Check key balance
        </button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const credit = quotaToUsd(quotaForTier(tier));
          return (
            <li
              key={tier.id}
              className={`relative flex flex-col rounded-xl border p-6 transition ${
                tier.highlighted
                  ? "border-violet-500/60 bg-gradient-to-b from-violet-500/10 to-transparent shadow-lg shadow-violet-900/30"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-violet-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {t.pricing.popular}
                </span>
              )}
              <h3 className="text-sm font-medium text-zinc-300">{tier.name}</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">${tier.amountUsd}</span>
                <span className="text-sm text-zinc-500">one-time</span>
              </p>
              <p className="mt-1 text-sm text-emerald-400">${credit.toFixed(2)} usable credit</p>
              <p className="mt-3 text-sm text-zinc-400">{tier.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-zinc-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setSelected(tier)}
                aria-label={`Buy ${tier.name} for $${tier.amountUsd}`}
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  tier.highlighted ? "bg-white text-black hover:bg-zinc-200" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {tier.highlighted ? <Zap className="h-4 w-4" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
                {t.pricing.buyNow}
              </button>
            </li>
          );
        })}
      </ul>

      <CheckoutModal tier={selected} onClose={() => setSelected(null)} />
      <BalanceChecker open={balanceOpen} onClose={() => setBalanceOpen(false)} />
    </section>
  );
}
