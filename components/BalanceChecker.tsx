"use client";

import { useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { Modal } from "@/components/Modal";
import { looksLikeApiKey } from "@/lib/pricing";

type Balance = {
  remainUsd: number;
  usedUsd: number;
  remainQuota: number;
  usedQuota: number;
  active: boolean;
};

export function BalanceChecker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBalance(null);
    const clean = key.trim();
    if (!looksLikeApiKey(clean)) return setError("API keys start with sk- followed by letters and numbers.");

    setLoading(true);
    try {
      const res = await fetch("/api/key/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: clean }),
      });
      const data = (await res.json()) as Balance & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
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
    <Modal open={open} onClose={onClose} title="Check key balance" description="See remaining credit and usage for a key.">
      <form onSubmit={check} noValidate className="space-y-4">
        <div>
          <label htmlFor="balance-key" className="mb-1.5 block text-sm font-medium text-zinc-300">
            API key
          </label>
          <input
            id="balance-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          {loading ? "Checking…" : "Check balance"}
        </button>
      </form>

      <div aria-live="polite" className="mt-4">
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {balance && (
          <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-400">Remaining</span>
              <span className="text-2xl font-semibold text-white">${balance.remainUsd.toFixed(2)}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Credit used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${pct}%` }} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <dt>Used</dt>
              <dd className="text-right text-zinc-200">${balance.usedUsd.toFixed(2)}</dd>
              <dt>Quota units left</dt>
              <dd className="text-right font-mono text-zinc-200">{balance.remainQuota.toLocaleString("en-US")}</dd>
              <dt>Status</dt>
              <dd className={`text-right ${balance.active ? "text-emerald-400" : "text-amber-400"}`}>
                {balance.active ? "Active" : "Inactive / exhausted"}
              </dd>
            </dl>
          </div>
        )}
      </div>
    </Modal>
  );
}
