import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { SuccessView } from "@/components/SuccessView";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Suspense
        fallback={
          <p className="flex items-center gap-2 text-ink-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        }
      >
        <SuccessView />
      </Suspense>
    </main>
  );
}
