"use client";

import { useTranslation } from "@/context/LanguageContext";

export default function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const next = locale === "en" ? "zh-TW" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      aria-label={next === "en" ? "Switch to English" : "切換至繁體中文"}
    >
      <span className={locale === "en" ? "font-bold text-violet-300" : "text-zinc-500"}>EN</span>
      <span className="text-zinc-600" aria-hidden>
        |
      </span>
      <span className={locale === "zh-TW" ? "font-bold text-emerald-300" : "text-zinc-500"}>繁中</span>
    </button>
  );
}
