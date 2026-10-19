"use client";

import { useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { Modal } from "@/components/Modal";
import { looksLikeApiKey } from "@/lib/pricing";
import { useTranslation } from "@/context/LanguageContext";

type Balance = {
  remainUsd: number;
  usedUsd: number;
  remainQuota: number;
  usedQuota: number;
  active: boolean;
};

export function BalanceChecker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const b = t.balance;
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBalance(null);
    const clean = key.trim();
    if (!looksLikeApiKey(clean)) return setError(t.pricing.invalidKey);

    setLoading(true);
    try {
      const res = await fetch("/api/key/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: clean }),
      });
      const data = (await res.json()) as Balance & { error?: string };
      if (!res.ok) throw new Error(data.error ?? b.failed);
      setBalance(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const total = balance ? balance.remainUsd + balance.usedUsd : 0;
  const pct = balance && total > 0 ? Math.min(100, (balance.usedUsd / total) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} title={b.title} description={b.description} closeLabel={t.common.close}>
      <form onSubmit={check} noValidate className="space-y-4">
        <div>
          <label htmlFor="balance-key" className="mb-1.5 block text-sm font-medium text-ink-body">
            {b.keyLabel}
          </label>
          <input
            id="balance-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="input-brand font-mono"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-secondary focus-brand w-full">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          {loading ? b.checking : b.submit}
        </button>
      </form>

      <div aria-live="polite" className="mt-4">
        {error && (
          <p role="alert" className="rounded-lg border border-brand-orange/50 bg-brand-orange/10 px-3 py-2 text-sm text-ink-body">
            {error}
          </p>
        )}
        {balance && (
          <div className="space-y-3 rounded-lg border border-navy-border bg-navy p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">{b.remaining}</span>
              <span className="text-2xl font-semibold text-ink-title">${balance.remainUsd.toFixed(2)}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-navy-border"
              role="progressbar"
              aria-label={b.used}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan" style={{ width: `${pct}%` }} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
              <dt>{b.used}</dt>
              <dd className="text-right text-ink-body">${balance.usedUsd.toFixed(2)}</dd>
              <dt>{b.unitsLeft}</dt>
              <dd className="text-right font-mono text-ink-body">{balance.remainQuota.toLocaleString("en-US")}</dd>
              <dt>{b.status}</dt>
              <dd className={`text-right ${balance.active ? "text-brand-mint" : "text-brand-orange"}`}>
                {balance.active ? b.active : b.inactive}
              </dd>
            </dl>
          </div>
        )}
      </div>
    </Modal>
  );
}
