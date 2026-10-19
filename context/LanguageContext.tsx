"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, isLocale, type Dictionary, type Locale } from "@/locales/dictionaries";

const STORAGE_KEY = "app_locale";
const DEFAULT_LOCALE: Locale = "zh-TW";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Restore the saved choice after hydration. Validate it so a stale or
  // tampered value can't make dictionaries[locale] undefined.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) setLocaleState(saved);
    } catch {
      // localStorage can be unavailable (privacy mode); keep the default.
    }
  }, []);

  // Keep <html lang> in sync for screen readers and browser translation.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // Ignore persistence failures; the in-memory choice still applies.
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale, t: dictionaries[locale] }), [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
};
