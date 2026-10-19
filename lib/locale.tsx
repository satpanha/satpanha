"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, getContent, type Content, type Locale } from "@/lib/content";

const STORAGE_KEY = "mc-locale";

type Ctx = { locale: Locale; content: Content; setLocale: (l: Locale) => void };
const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "en" || saved === "km") setLocaleState(saved);
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "km" ? "km" : "en";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, content: getContent(locale), setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
