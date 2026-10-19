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
  const { t } = useTranslation();
  const s = t.success;
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
      <div role="status" className="rounded-xl border border-navy-border bg-navy-card p-8 text-center">
        {timedOut ? (
          <>
            <Mail className="mx-auto h-8 w-8 text-brand-cyan" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold text-ink-title">{s.stillFinishing}</h1>
            <p className="mt-2 text-sm text-ink-muted">{s.stillFinishingBody}</p>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-brand-cyan" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold text-ink-title">
              {order?.status === "awaiting_payment" ? s.awaitingPayment : s.provisioning}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">{s.keepOpen}</p>
          </>
        )}
      </div>
    );
  }

  if (order.status !== "fulfilled") {
    return (
      <div role="alert" className="rounded-xl border border-brand-orange/50 bg-brand-orange/10 p-8 text-center">
        <CircleAlert className="mx-auto h-8 w-8 text-brand-orange" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-ink-title">{s.notFound}</h1>
        <p className="mt-2 text-sm text-ink-body">{order.status === "expired" ? s.expired : s.invalidLink}</p>
        <a href="/" className="focus-brand mt-6 inline-block rounded text-sm font-medium text-brand-cyan hover:underline">
          {s.back}
        </a>
      </div>
    );
  }

  return <KeyReveal order={order} />;
}

function KeyReveal({ order }: { order: FulfilledOrder }) {
  const { t } = useTranslation();
  const s = t.success;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <CircleCheck className="h-8 w-8 text-brand-mint" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold text-ink-title">{order.isTopup ? s.topupTitle : s.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          ${order.amountUsd.toFixed(2)} {s.paid} · ${order.creditUsd.toFixed(2)} {s.creditAdded}{" "}
          <span className="text-ink-body">{order.email}</span>.
        </p>
      </div>

      <section aria-labelledby="key-heading" className="rounded-xl border border-navy-border bg-navy-card p-5">
        <h2 id="key-heading" className="text-sm font-medium text-ink-body">{s.apiKey}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-md bg-navy px-3 py-2 font-mono text-sm text-ink-title">
            {revealed ? order.keySecret : mask(order.keySecret)}
          </code>
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            aria-label={`${revealed ? s.hide : s.reveal}: ${s.apiKey}`}
            className="focus-brand inline-flex items-center gap-1.5 rounded-md border border-navy-border bg-navy px-2.5 py-1.5 text-xs font-medium text-ink-body hover:border-brand-cyan hover:text-ink-title"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
            {revealed ? s.hide : s.reveal}
          </button>
          <CopyButton value={order.keySecret} label={s.copyKey} copiedLabel={s.copied} />
        </div>

        <h2 className="mt-5 text-sm font-medium text-ink-body">{s.baseUrl}</h2>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 break-all rounded-md bg-navy px-3 py-2 font-mono text-sm text-ink-title">{GATEWAY_BASE_URL}</code>
          <CopyButton value={GATEWAY_BASE_URL} label={t.common.copy} copiedLabel={s.copied} />
        </div>
        <p className="mt-4 text-xs text-brand-orange">{s.storeSafely}</p>
      </section>

      <section aria-labelledby="quickstart-heading">
        <h2 id="quickstart-heading" className="mb-3 text-sm font-medium text-ink-body">{s.quickstart}</h2>
        <CodeSwitcher baseUrl={GATEWAY_BASE_URL} apiKey={order.keySecret} />
      </section>

      <a href="/" className="focus-brand inline-block rounded text-sm font-medium text-brand-cyan hover:underline">
        ← {s.back}
      </a>
    </div>
  );
}
