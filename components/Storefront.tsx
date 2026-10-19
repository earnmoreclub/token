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
        <p role="status" className="mb-8 rounded-lg border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-ink-body">
          {t.pricing.cancelled}
        </p>
      )}

      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 id="pricing-heading" className="text-3xl font-semibold tracking-tight text-ink-title">
            {t.pricing.heading}
          </h2>
          <p className="mt-2 max-w-xl text-ink-muted">{t.pricing.subtitle}</p>
        </div>
        <button type="button" onClick={() => setBalanceOpen(true)} className="btn-secondary focus-brand">
          <Gauge className="h-4 w-4" aria-hidden />
          {t.nav.balance}
        </button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const credit = quotaToUsd(quotaForTier(tier));
          return (
            <li
              key={tier.id}
              className={`relative flex flex-col rounded-xl border bg-navy-card p-6 transition ${
                tier.highlighted
                  ? "border-brand-cyan shadow-lg shadow-brand-blue/20"
                  : "border-navy-border hover:border-brand-cyan/60"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-orange px-2.5 py-0.5 text-xs font-semibold text-white">
                  {t.pricing.popular}
                </span>
              )}
              <h3 className="text-sm font-medium text-ink-body">{tier.name}</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-ink-title">${tier.amountUsd}</span>
                <span className="text-sm text-ink-muted">{t.pricing.oneTime}</span>
              </p>
              <p className="mt-1 text-sm text-brand-mint">
                ${credit.toFixed(2)} {t.pricing.usableCredit}
              </p>
              <p className="mt-3 text-sm text-ink-muted">{tier.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-body">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-mint" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setSelected(tier)}
                aria-label={`${t.pricing.buyNow}: ${tier.name} ($${tier.amountUsd})`}
                className={`mt-6 focus-brand ${tier.highlighted ? "btn-primary" : "btn-secondary"}`}
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
