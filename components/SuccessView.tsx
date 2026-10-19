"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { CodeSwitcher } from "@/components/CodeSwitcher";
import { GATEWAY_BASE_URL } from "@/lib/pricing";
import { useTranslation } from "@/context/LanguageContext";

type FulfilledOrder = {
  status: "fulfilled";
  keySecret: string;
  email: string;
  amountUsd: number;
  creditUsd: number;
  isTopup: boolean;
};

type OrderStatus =
  | FulfilledOrder
  | { status: "processing" | "awaiting_payment"; email?: string | null }
  | { status: "expired" | "not_found" | "invalid" | "error"; error?: string };

const POLL_MS = 2000;
const MAX_POLLS = 60; // ~2 minutes

function mask(key: string) {
  return key.length <= 10 ? "•".repeat(key.length) : `${key.slice(0, 6)}${"•".repeat(24)}${key.slice(-4)}`;
}

export function SuccessView() {
  const sessionId = useSearchParams().get("session_id") ?? "";
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setOrder({ status: "invalid" });
      return;
    }
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      polls++;
      try {
        const res = await fetch(`/api/order/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        if (res.status === 429) {
          // Rate limited: back off for the server-suggested time and keep polling.
          const wait = Number(res.headers.get("Retry-After")) || 5;
          if (!cancelled) timer = setTimeout(poll, wait * 1000);
          return;
        }
        const data = (await res.json()) as OrderStatus;
        if (cancelled) return;
        setOrder(data);
        if (data.status !== "processing" && data.status !== "awaiting_payment") return;
      } catch {
        // Network blip: keep polling.
      }
      if (cancelled) return;
      if (polls >= MAX_POLLS) setTimedOut(true);
      else timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (!order || order.status === "processing" || order.status === "awaiting_payment") {
    return (
      <div role="status" className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
        {timedOut ? (
          <>
            <Mail className="mx-auto h-8 w-8 text-violet-400" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold text-white">Still finishing up</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your payment went through. Your key will be emailed as soon as it is ready. You can also refresh this page.
            </p>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-violet-400" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold text-white">
              {order?.status === "awaiting_payment" ? "Waiting for payment confirmation…" : "Provisioning your API key…"}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">This usually takes a few seconds. Keep this page open.</p>
          </>
        )}
      </div>
    );
  }

  if (order.status !== "fulfilled") {
    return (
      <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <CircleAlert className="mx-auto h-8 w-8 text-red-400" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-white">We couldn&apos;t find that order</h1>
        <p className="mt-2 text-sm text-zinc-300">
          {order.status === "expired" ? "This checkout session expired before payment." : "The link may be invalid or incomplete."}
        </p>
        <a href="/" className="mt-6 inline-block text-sm font-medium text-violet-300 hover:text-violet-200">
          Back to storefront
        </a>
      </div>
    );
  }

  return <KeyReveal order={order} />;
}

function KeyReveal({ order }: { order: FulfilledOrder }) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <CircleCheck className="h-8 w-8 text-emerald-400" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold text-white">
          {order.isTopup ? t.success.topupTitle : t.success.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          ${order.amountUsd.toFixed(2)} paid · ${order.creditUsd.toFixed(2)} credit added. A copy was sent to{" "}
          <span className="text-zinc-200">{order.email}</span>.
        </p>
      </div>

      <section aria-labelledby="key-heading" className="rounded-xl border border-white/10 bg-[#0e0f11] p-5">
        <h2 id="key-heading" className="text-sm font-medium text-zinc-300">API key</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-md bg-black/40 px-3 py-2 font-mono text-sm text-white">
            {revealed ? order.keySecret : mask(order.keySecret)}
          </code>
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            aria-label={revealed ? "Hide API key" : "Reveal API key"}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
            {revealed ? "Hide" : "Reveal"}
          </button>
          <CopyButton value={order.keySecret} label={t.success.copyKey} copiedLabel={t.success.copied} />
        </div>

        <h2 className="mt-5 text-sm font-medium text-zinc-300">Base URL</h2>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 break-all rounded-md bg-black/40 px-3 py-2 font-mono text-sm text-white">{GATEWAY_BASE_URL}</code>
          <CopyButton value={GATEWAY_BASE_URL} />
        </div>
        <p className="mt-4 text-xs text-amber-300/80">Store this key somewhere safe. Treat it like a password.</p>
      </section>

      <section aria-labelledby="quickstart-heading">
        <h2 id="quickstart-heading" className="mb-3 text-sm font-medium text-zinc-300">Quickstart</h2>
        <CodeSwitcher baseUrl={GATEWAY_BASE_URL} apiKey={order.keySecret} />
      </section>

      <a href="/" className="inline-block text-sm font-medium text-violet-300 hover:text-violet-200">
        ← Back to storefront
      </a>
    </div>
  );
}
