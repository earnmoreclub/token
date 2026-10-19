"use client";

import { ArrowRight } from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { useTranslation } from "@/context/LanguageContext";

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-border bg-navy/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="/" className="focus-brand flex items-center gap-2 rounded-md font-semibold text-ink-title">
          <Logo />
          <span>METTO &amp; MIDALO</span>
        </a>
        <div className="flex items-center gap-4 text-sm text-ink-muted sm:gap-6">
          <a href="#models" className="focus-brand hidden rounded hover:text-brand-cyan sm:inline">
            {t.nav.models}
          </a>
          <a href="#pricing" className="focus-brand hidden rounded hover:text-brand-cyan sm:inline">
            {t.nav.pricing}
          </a>
          <a href="#pricing" className="focus-brand hidden rounded hover:text-brand-cyan md:inline">
            {t.nav.balance}
          </a>
          <LanguageToggle />
          <a href="#pricing" className="btn-primary focus-brand hidden px-3 py-1.5 sm:inline-flex">
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
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-navy-border bg-navy-card px-3 py-1 text-xs text-ink-body">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-mint" aria-hidden />
        {t.hero.tag}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-ink-title sm:text-5xl">
        {t.hero.title}
      </h1>
      <p className="mt-5 max-w-lg text-lg text-ink-body">{t.hero.subtitle}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#pricing" className="btn-primary focus-brand px-5">
          {t.hero.cta} <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
        <a
          href="#models"
          className="btn-secondary focus-brand px-5"
        >
          {t.hero.compare}
        </a>
      </div>
    </div>
  );
}
