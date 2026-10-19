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
    if (!isValidEmail(cleanEmail)) return setError(t.pricing.invalidEmail);
    if (cleanKey && !looksLikeApiKey(cleanKey)) return setError(t.pricing.invalidKey);

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierAmount: tier.amountUsd, email: cleanEmail, existingKey: cleanKey }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t.pricing.checkoutFailed);
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
      title={tier ? `${tier.name} · $${tier.amountUsd}` : t.pricing.buyNow}
      description={tier ? `$${credit.toFixed(2)} ${t.pricing.creditDescription}` : undefined}
      closeLabel={t.common.close}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="checkout-email" className="mb-1.5 block text-sm font-medium text-ink-body">
            {t.pricing.enterEmail}
          </label>
          <input
            id="checkout-email"
            type="email"
            autoComplete="email"
            required
            aria-describedby="checkout-email-hint"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="input-brand"
          />
          <p id="checkout-email-hint" className="mt-1 text-xs text-ink-muted">{t.pricing.emailHint}</p>
        </div>

        <div>
          <label htmlFor="checkout-key" className="mb-1.5 block text-sm font-medium text-ink-body">
            {t.pricing.enterKeyOptional}
          </label>
          <input
            id="checkout-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="checkout-key-hint"
            value={existingKey}
            onChange={(e) => setExistingKey(e.target.value)}
            placeholder="sk-..."
            className="input-brand font-mono"
          />
          <p id="checkout-key-hint" className="mt-1 text-xs text-ink-muted">{t.pricing.keyHint}</p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-brand-orange/50 bg-brand-orange/10 px-3 py-2 text-sm text-ink-body">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary focus-brand w-full">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          {loading ? t.pricing.redirecting : `${t.pricing.pay} · $${tier?.amountUsd ?? 0}`}
        </button>
        <p className="text-center text-xs text-ink-muted">{t.pricing.secure}</p>
      </form>
    </Modal>
  );
}
