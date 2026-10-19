import en from "@/content/en.json";
import km from "@/content/km.json";

export type Locale = "en" | "km";
export type Content = typeof en;

export const LOCALES: Locale[] = ["en", "km"];
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, Content> = { en, km: km as Content };

export function getContent(locale: Locale): Content {
  return dictionaries[locale];
}

const PLACEHOLDER = /\{\{TODO:[^}]*\}\}/;

export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER.test(value);
}

/** Collect every string leaf in a content tree (used by tests and checks). */
export function collectStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => collectStrings(n, out));
  else if (node && typeof node === "object")
    Object.values(node).forEach((n) => collectStrings(n, out));
  return out;
}
