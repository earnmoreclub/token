"use client";

import { Server, Shield, Terminal, Zap } from "lucide-react";
import { MODEL_PRICES } from "@/lib/pricing";
import { useTranslation } from "@/context/LanguageContext";

const fmt = (n: number) => `$${n < 1 ? n.toFixed(2) : n.toFixed(n % 1 === 0 ? 0 : 2)}`;
const ICONS = [Terminal, Zap, Server, Shield];

export function Features() {
  const { t } = useTranslation();
  return (
    <section aria-label="Features" className="border-y border-navy-border bg-navy-card/40">
      <ul className="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {t.features.items.map(({ title, body }, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={title}>
              <Icon className="h-5 w-5 text-brand-cyan" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-ink-title">{title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ModelTable() {
  const { t } = useTranslation();
  const m = t.models;
  return (
    <section id="models" aria-labelledby="models-heading" className="mx-auto max-w-6xl px-6 pt-24">
      <h2 id="models-heading" className="text-3xl font-semibold tracking-tight text-ink-title">
        {m.heading}
      </h2>
      <p className="mt-2 text-ink-muted">{m.subtitle}</p>
      <div className="mt-8 overflow-x-auto rounded-xl border border-navy-border bg-navy-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{m.heading}</caption>
          <thead className="border-b border-navy-border text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">{m.model}</th>
              <th scope="col" className="px-4 py-3 font-medium">{m.listInput}</th>
              <th scope="col" className="px-4 py-3 font-medium">{m.listOutput}</th>
              <th scope="col" className="px-4 py-3 font-medium text-brand-cyan">{m.gatewayInput}</th>
              <th scope="col" className="px-4 py-3 font-medium text-brand-cyan">{m.gatewayOutput}</th>
              <th scope="col" className="px-4 py-3 font-medium">{m.savings}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-border">
            {MODEL_PRICES.map((p) => {
              const savings = Math.round((1 - p.gatewayOutput / p.listOutput) * 100);
              return (
                <tr key={p.model} className="hover:bg-navy-border/30">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="font-mono text-ink-title">{p.model}</span>
                    <span className="ml-2 text-xs text-ink-muted">{p.vendor}</span>
                  </th>
                  <td className="px-4 py-3 text-ink-muted line-through">{fmt(p.listInput)}</td>
                  <td className="px-4 py-3 text-ink-muted line-through">{fmt(p.listOutput)}</td>
                  <td className="px-4 py-3 font-medium text-ink-title">{fmt(p.gatewayInput)}</td>
                  <td className="px-4 py-3 font-medium text-ink-title">{fmt(p.gatewayOutput)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-mint/10 px-2 py-0.5 text-xs font-medium text-brand-mint">
                      −{savings}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SiteFooter({ baseUrl }: { baseUrl: string }) {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-navy-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-ink-muted sm:flex-row">
        <p>
          © {new Date().getFullYear()} METTO &amp; MIDALO. {t.footer.payments}
        </p>
        <p className="font-mono">{baseUrl}</p>
      </div>
    </footer>
  );
}
