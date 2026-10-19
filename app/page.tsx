import { CodeSwitcher } from "@/components/CodeSwitcher";
import { Features, ModelTable, SiteFooter } from "@/components/HomeSections";
import { HeroCopy, SiteHeader } from "@/components/SiteHeader";
import { Storefront } from "@/components/Storefront";
import { GATEWAY_BASE_URL } from "@/lib/pricing";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(0,113,237,0.28),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <HeroCopy />
          <CodeSwitcher baseUrl={GATEWAY_BASE_URL} />
        </div>
      </section>

      <Features />
      <ModelTable />

      <Storefront />

      <SiteFooter baseUrl={GATEWAY_BASE_URL} />
    </main>
  );
}
