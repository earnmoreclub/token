"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";
import { useTranslation } from "@/context/LanguageContext";

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#08090a]/80 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 font-semibold text-white">
          <Sparkles className="h-5 w-5 text-violet-400" aria-hidden />
          TokenGate
        </a>
        <div className="flex items-center gap-4 text-sm text-zinc-400 sm:gap-6">
          <a href="#models" className="hidden hover:text-white sm:inline">
            {t.nav.models}
          </a>
          <a href="#pricing" className="hidden hover:text-white sm:inline">
            {t.nav.pricing}
          </a>
          <a href="#pricing" className="hidden hover:text-white md:inline">
            {t.nav.balance}
          </a>
          <LanguageToggle />
          <a href="#pricing" className="rounded-md bg-white px-3 py-1.5 font-medium text-black transition hover:bg-zinc-200">
            {t.nav.getKey}
          </a>
        </div>
      </nav>
    </header>
  );
}

export function HeroCopy() {
  const { t } = useTranslation();

  return (
    <div>
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        {t.hero.tag}
      </p>
      <h1 className="bg-gradient-to-r from-white via-violet-200 to-fuchsia-300 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
        {t.hero.title}
      </h1>
      <p className="mt-5 max-w-lg text-lg text-zinc-400">{t.hero.subtitle}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="#pricing"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          {t.hero.cta} <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
        <a
          href="#models"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          {t.hero.compare}
        </a>
      </div>
    </div>
  );
}
