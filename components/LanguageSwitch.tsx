"use client";

import { useLocale } from "@/lib/locale";

export function LanguageSwitch() {
  const { locale, setLocale, content } = useLocale();
  const btn = (l: "en" | "km", label: string) => (
    <button
      type="button"
      onClick={() => setLocale(l)}
      aria-pressed={locale === l}
      lang={l}
      className={`micro border px-3 py-1 ${
        locale === l ? "border-accent bg-accent/10" : "border-transparent text-muted"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label={content.ui.language} className="flex gap-1">
      {btn("en", "EN")}
      {btn("km", "ខ្មែរ")}
    </div>
  );
}
