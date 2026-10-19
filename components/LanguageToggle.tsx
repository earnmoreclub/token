"use client";

import { useTranslation } from "@/context/LanguageContext";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/locales/dictionaries";

/** Accessible names announced in each target language. */
const SWITCH_LABELS: Record<Locale, string> = {
  en: "Switch to English",
  "zh-TW": "切換至繁體中文",
  es: "Cambiar a español",
};

/** Segmented EN | 繁中 | ES switcher. Choice is persisted by LanguageProvider. */
export default function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center rounded-full border border-navy-border bg-navy-card p-0.5 text-xs font-medium"
    >
      {LOCALES.map((l, i) => {
        const active = l === locale;
        return (
          <span key={l} className="flex items-center">
            {i > 0 && (
              <span className="px-0.5 text-navy-border" aria-hidden>
                |
              </span>
            )}
            <button
              type="button"
              lang={l}
              onClick={() => setLocale(l)}
              aria-pressed={active}
              aria-label={SWITCH_LABELS[l]}
              className={`focus-brand rounded-full px-2.5 py-1 transition-colors ${
                active ? "bg-brand-blue font-bold text-white" : "text-ink-muted hover:text-brand-cyan"
              }`}
            >
              {LOCALE_LABELS[l]}
            </button>
          </span>
        );
      })}
    </div>
  );
}
