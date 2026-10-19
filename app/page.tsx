import { Server, Shield, Terminal, Zap } from "lucide-react";
import { CodeSwitcher } from "@/components/CodeSwitcher";
import { HeroCopy, SiteHeader } from "@/components/SiteHeader";
import { Storefront } from "@/components/Storefront";
import { GATEWAY_BASE_URL, MODEL_PRICES } from "@/lib/pricing";

const fmt = (n: number) => `$${n < 1 ? n.toFixed(2) : n.toFixed(n % 1 === 0 ? 0 : 2)}`;

const FEATURES = [
  { icon: Terminal, title: "Drop-in OpenAI compatible", body: "Change base_url and keep your existing SDK, tools and agents." },
  { icon: Zap, title: "Instant delivery", body: "Your key is provisioned the moment payment clears. No manual approval." },
  { icon: Server, title: "One key, every model", body: "Claude, GPT-4o, DeepSeek, Kimi and GLM behind a single endpoint." },
  { icon: Shield, title: "Prepaid and capped", body: "Spend is limited to your balance, so a leaked key can't run up a bill." },
];

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <HeroCopy />
          <CodeSwitcher baseUrl={GATEWAY_BASE_URL} />
        </div>
      </section>

      <section aria-label="Features" className="border-y border-white/5 bg-white/[0.01]">
        <ul className="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="h-5 w-5 text-violet-400" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="models" aria-labelledby="models-heading" className="mx-auto max-w-6xl px-6 pt-24">
        <h2 id="models-heading" className="text-3xl font-semibold tracking-tight text-white">
          Model price comparison
        </h2>
        <p className="mt-2 text-zinc-400">USD per 1M tokens. Billed from your prepaid balance at gateway rates.</p>
        <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">List price versus gateway price per million tokens</caption>
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Model</th>
                <th scope="col" className="px-4 py-3 font-medium">List input</th>
                <th scope="col" className="px-4 py-3 font-medium">List output</th>
                <th scope="col" className="px-4 py-3 font-medium text-violet-300">Gateway input</th>
                <th scope="col" className="px-4 py-3 font-medium text-violet-300">Gateway output</th>
                <th scope="col" className="px-4 py-3 font-medium">Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MODEL_PRICES.map((m) => {
                const savings = Math.round((1 - m.gatewayOutput / m.listOutput) * 100);
                return (
                  <tr key={m.model} className="hover:bg-white/[0.02]">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="font-mono text-white">{m.model}</span>
                      <span className="ml-2 text-xs text-zinc-500">{m.vendor}</span>
                    </th>
                    <td className="px-4 py-3 text-zinc-500 line-through">{fmt(m.listInput)}</td>
                    <td className="px-4 py-3 text-zinc-500 line-through">{fmt(m.listOutput)}</td>
                    <td className="px-4 py-3 font-medium text-white">{fmt(m.gatewayInput)}</td>
                    <td className="px-4 py-3 font-medium text-white">{fmt(m.gatewayOutput)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
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

      <Storefront />

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} TokenGate. Payments processed by Stripe.</p>
          <p className="font-mono">{GATEWAY_BASE_URL}</p>
        </div>
      </footer>
    </main>
  );
}
